package com.micesign.service.email;

import com.micesign.domain.ApprovalLine;
import com.micesign.domain.Document;
import com.micesign.domain.NotificationLog;
import com.micesign.domain.User;
import com.micesign.domain.enums.ApprovalLineStatus;
import com.micesign.domain.enums.NotificationEventType;
import com.micesign.domain.enums.NotificationStatus;
import com.micesign.repository.ApprovalLineRepository;
import com.micesign.repository.NotificationLogRepository;
import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Lazy;
import org.springframework.mail.MailAuthenticationException;
import org.springframework.mail.MailException;
import org.springframework.mail.MailParseException;
import org.springframework.mail.MailSendException;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.retry.annotation.Backoff;
import org.springframework.retry.annotation.Recover;
import org.springframework.retry.annotation.Retryable;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.thymeleaf.context.Context;
import org.thymeleaf.spring6.SpringTemplateEngine;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Phase 29 결재 알림 SMTP 발송 빈 — @Retryable/@Recover 격리 (D-B1).
 * EmailService 리스너에서 호출되는 별도 빈으로 Spring AOP 프록시 체인 보장 (Pitfall 1 회피).
 *
 * <p>Plan 29-01 에서 스켈레톤 + @Retryable/@Recover 시그니처가 확정되었고,
 * Plan 29-03 (본 파일) 에서 send/findOrCreatePendingLog 실 로직을 채웠다.
 *
 * <p>설계 결정:
 * <ul>
 *   <li>D-A1: PENDING-first 3단계 (PENDING insert → send → SUCCESS/FAILED UPDATE)</li>
 *   <li>D-A5: MailSendException → RETRY, MailAuthentication/MailParse → 즉시 FAILED</li>
 *   <li>D-A6: persistLog/findOrCreatePendingLog 는 REQUIRES_NEW 로 독립 commit</li>
 *   <li>D-A8: PENDING insert 시 recipientEmail 스냅샷</li>
 *   <li>D-A9: @Retryable 재시도 전 RETRY UPDATE + retry_count++</li>
 *   <li>D-B2: maxAttempts=3, backoff=5분(test 환경에서 0 override)</li>
 *   <li>D-B3: @Recover 시그니처 = (MailException, Document, User, NotificationEventType)</li>
 *   <li>D-B4: send() 자체에는 @Transactional 없음 — REQUIRES_NEW helper 만 commit</li>
 *   <li>D-C1: subject = [MiceSign] {actionLabel}: {docNumber} {title}</li>
 *   <li>D-C5: From = MiceSign &lt;${spring.mail.username}&gt;</li>
 *   <li>D-C6: REJECT 본문에 approvalLine.comment(rejectComment) 노출</li>
 *   <li>D-D7: JavaMailSender null-safe — MAIL_HOST 미설정 시 stub 모드</li>
 * </ul>
 */
@Component
public class ApprovalEmailSender {
    private static final Logger log = LoggerFactory.getLogger(ApprovalEmailSender.class);
    private static final int ERROR_MESSAGE_MAX = 255;

    private final JavaMailSender mailSender;    // null-safe (D-D7) — MAIL_HOST 미설정 시 stub 모드
    private final SpringTemplateEngine templateEngine;
    private final NotificationLogRepository notificationLogRepository;
    private final ApprovalLineRepository approvalLineRepository;
    private final ApprovalEmailSender self;     // @Lazy self-injection for REQUIRES_NEW proxy boundary

    @Value("${app.base-url:http://localhost:5173}")
    private String baseUrl;

    @Value("${spring.mail.username:noreply@micesign.com}")
    private String fromAddress;

    public ApprovalEmailSender(
            @Autowired(required = false) JavaMailSender mailSender,
            SpringTemplateEngine templateEngine,
            NotificationLogRepository notificationLogRepository,
            ApprovalLineRepository approvalLineRepository,
            @Lazy ApprovalEmailSender self) {
        this.mailSender = mailSender;
        this.templateEngine = templateEngine;
        this.notificationLogRepository = notificationLogRepository;
        this.approvalLineRepository = approvalLineRepository;
        this.self = self;
    }

    /**
     * 결재 이벤트별 이메일 발송. PENDING-first 3단계 로깅 + @Retryable 경로 (D-A1/D-B2).
     *
     * <ol>
     *   <li>self.findOrCreatePendingLog — PENDING row 조회 or 생성 (idempotent)</li>
     *   <li>mailSender == null → [EMAIL STUB] 로그 + SUCCESS UPDATE (D-D7)</li>
     *   <li>Thymeleaf render + MimeMessageHelper(message, true, "UTF-8") + mailSender.send</li>
     *   <li>SUCCESS / RETRY / FAILED UPDATE</li>
     * </ol>
     */
    @Retryable(
            retryFor = { MailSendException.class },
            noRetryFor = { MailAuthenticationException.class, MailParseException.class },
            maxAttempts = 3,
            // FSD "2회 재시도 5분 간격" = 초기 1 + retry 2 = 총 3 attempts. test profile에서 app.mail.retry.delay-ms=0 으로 override.
            backoff = @Backoff(delayExpression = "#{${app.mail.retry.delay-ms:300000}}")
    )
    public void send(Document doc, User recipient, NotificationEventType eventType) {
        // Step 1: PENDING row 획득 (idempotent — 같은 dedup key 존재하면 기존 row 재사용)
        NotificationLog notifLog = self.findOrCreatePendingLog(doc, recipient, eventType);

        // Step 2: stub mode (D-D7 null-safe) — MAIL_HOST 미설정 개발 환경
        if (mailSender == null) {
            log.info("[EMAIL STUB] To: {}, Subject: {}", recipient.getEmail(), notifLog.getSubject());
            notifLog.setStatus(NotificationStatus.SUCCESS);
            notifLog.setSentAt(LocalDateTime.now());
            self.persistLog(notifLog);
            return;
        }

        // Step 3: Thymeleaf render + MimeMessage 조립 + 실 SMTP send
        try {
            String templateName = "email/approval-" + toTemplateSlug(eventType);
            Context ctx = buildContext(doc, recipient, eventType);
            String html = templateEngine.process(templateName, ctx);

            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");  // Pitfall 3
            helper.setFrom("MiceSign <" + fromAddress + ">");                          // D-C5
            helper.setTo(recipient.getEmail());
            helper.setSubject(notifLog.getSubject());                                   // [MiceSign] 포맷 — buildSubject가 PENDING 생성 시 기록
            helper.setText(html, true);                                                 // HTML body

            mailSender.send(message);                                                   // may throw MailSendException/MailAuthenticationException/MailParseException

            // 성공 UPDATE (D-A1 step 3)
            notifLog.setStatus(NotificationStatus.SUCCESS);
            notifLog.setSentAt(LocalDateTime.now());
            self.persistLog(notifLog);

        } catch (MailSendException e) {
            // Transient — @Retryable 가 재진입. 재시도 직전에 RETRY 상태로 UPDATE (D-A9).
            notifLog.setStatus(NotificationStatus.RETRY);
            notifLog.setRetryCount(notifLog.getRetryCount() + 1);
            self.persistLog(notifLog);
            throw e;  // trigger @Retryable

        } catch (MailAuthenticationException | MailParseException e) {
            // Permanent — noRetryFor 이므로 @Retryable 이 건너뜀. 즉시 FAILED (D-A5).
            notifLog.setStatus(NotificationStatus.FAILED);
            notifLog.setErrorMessage(truncate(e.getClass().getSimpleName() + ": " + e.getMessage()));
            self.persistLog(notifLog);
            log.error("Permanent mail failure (no retry): to={}, docId={}, event={}, error={}",
                    recipient.getEmail(), doc.getId(), eventType, e.getMessage());
            // do NOT rethrow — recovery inline

        } catch (MessagingException e) {
            // MimeMessageHelper setters 에서 발생 — 영구 실패로 간주
            notifLog.setStatus(NotificationStatus.FAILED);
            notifLog.setErrorMessage(truncate("MessagingException: " + e.getMessage()));
            self.persistLog(notifLog);
            log.error("Unexpected messaging failure: to={}, docId={}, event={}, error={}",
                    recipient.getEmail(), doc.getId(), eventType, e.getMessage());
        }
    }

    /**
     * @Retryable 최종 실패 recovery. maxAttempts=3 소진 후 호출 (D-B3).
     * 시그니처 규칙: (Throwable 슈퍼타입, 원 메서드 args 동일 순서·타입, 반환 타입 void).
     *
     * <p>send() 내부 MailSendException catch 가 이미 RETRY 상태로 UPDATE 한 row 를 최종
     * FAILED 로 마감한다 (PENDING 고아 행 없음 — Phase 29 success criteria 3).
     */
    @Recover
    public void recover(MailException e, Document doc, User recipient, NotificationEventType eventType) {
        NotificationLog notifLog = self.findOrCreatePendingLog(doc, recipient, eventType);
        notifLog.setStatus(NotificationStatus.FAILED);
        notifLog.setErrorMessage(truncate(e.getClass().getSimpleName() + ": " + e.getMessage()));
        self.persistLog(notifLog);
        log.error("Approval email failed after 3 retries: to={}, docId={}, event={}, error={}",
                recipient.getEmail(), doc.getId(), eventType, e.getMessage());
    }

    /**
     * NotificationLog 영속화 helper. REQUIRES_NEW로 각 상태 전이를 독립 commit (D-A6).
     * send() 전체를 Tx로 묶으면 send 실패 시 PENDING까지 롤백되어 재시도 응답성 손실 (D-B4).
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public NotificationLog persistLog(NotificationLog logRow) {
        return notificationLogRepository.save(logRow);
    }

    /**
     * Idempotent PENDING row 조회 or 생성. UNIQUE 제약(uk_notification_dedup, D-A2) 만족 진입점.
     *
     * <p>D-A8: PENDING insert 시 recipient.getEmail() 을 recipientEmail 컬럼에 스냅샷.
     * 이후 User.email 가 변경되어도 audit 목적으로 발송 시점 주소가 유지된다.
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public NotificationLog findOrCreatePendingLog(Document doc, User recipient, NotificationEventType type) {
        return notificationLogRepository
                .findByDocumentIdAndEventTypeAndRecipientId(doc.getId(), type.name(), recipient.getId())
                .orElseGet(() -> {
                    NotificationLog fresh = new NotificationLog();
                    fresh.setRecipient(recipient);
                    fresh.setRecipientEmail(recipient.getEmail());      // D-A8: 발송 시점 email 스냅샷
                    fresh.setDocumentId(doc.getId());
                    fresh.setEventType(type.name());                    // String 저장 (NotificationLog.eventType = String, Plan 01 SUMMARY 확정)
                    fresh.setSubject(buildSubject(doc, type));
                    fresh.setStatus(NotificationStatus.PENDING);
                    fresh.setRetryCount(0);
                    return notificationLogRepository.save(fresh);
                });
    }

    /**
     * Subject 포맷 (D-C1): [MiceSign] {actionLabel}: {docNumber} {title}.
     * 미번호부여(DRAFT — 상신 직전 publishEvent 가 호출되는 시나리오 등) 시 docNumber=DRAFT.
     */
    private String buildSubject(Document doc, NotificationEventType type) {
        String actionLabel = switch (type) {
            case SUBMIT -> "결재 요청";
            case APPROVE -> "승인";
            case FINAL_APPROVE -> "최종 승인";
            case REJECT -> "반려";
            case WITHDRAW -> "회수";
        };
        String docNo = doc.getDocNumber() != null ? doc.getDocNumber() : "DRAFT";
        return "[MiceSign] " + actionLabel + ": " + docNo + " " + doc.getTitle();
    }

    /**
     * Plan 02 템플릿(approval-{slug}.html)이 기대하는 Thymeleaf 변수 set.
     *
     * <p>핵심 변수 8개 + REJECT 한정 rejectComment.
     * 본문에 doc.content 를 노출하지 않는다 (T-29-03-01 PII 방어).
     */
    private Context buildContext(Document doc, User recipient, NotificationEventType type) {
        Context ctx = new Context();
        ctx.setVariable("docNumber", doc.getDocNumber() != null ? doc.getDocNumber() : "DRAFT");
        ctx.setVariable("docTitle", doc.getTitle());
        ctx.setVariable("drafterName", doc.getDrafter().getName());
        ctx.setVariable("drafterDepartment",
                doc.getDrafter().getDepartment() != null ? doc.getDrafter().getDepartment().getName() : "");
        ctx.setVariable("recipientName", recipient.getName());

        String actionLabel = switch (type) {
            case SUBMIT -> "결재 요청";
            case APPROVE -> "승인";
            case FINAL_APPROVE -> "최종 승인";
            case REJECT -> "반려";
            case WITHDRAW -> "회수";
        };
        ctx.setVariable("actionLabel", actionLabel);

        ctx.setVariable("eventTime", LocalDateTime.now());
        // T-29-03-02: 토큰 미주입 — baseUrl + "/documents/" + id 만
        ctx.setVariable("approvalUrl", baseUrl + "/documents/" + doc.getId());

        // REJECT 전용 — approval_line 중 REJECTED 상태의 comment (D-C6, FSD FN-APR-005 필수 입력)
        if (type == NotificationEventType.REJECT) {
            List<ApprovalLine> lines = approvalLineRepository
                    .findByDocumentIdOrderByStepOrderAsc(doc.getId());
            lines.stream()
                    .filter(l -> l.getStatus() == ApprovalLineStatus.REJECTED)
                    .findFirst()
                    .ifPresent(l -> ctx.setVariable("rejectComment", l.getComment()));
        }
        return ctx;
    }

    /**
     * Plan 02 템플릿 파일명 slug 매핑.
     * 각 enum 값 → templates/email/approval-{slug}.html.
     */
    private String toTemplateSlug(NotificationEventType type) {
        return switch (type) {
            case SUBMIT -> "submit";
            case APPROVE -> "approve";
            case FINAL_APPROVE -> "final-approve";
            case REJECT -> "reject";
            case WITHDRAW -> "withdraw";
        };
    }

    private String truncate(String s) {
        if (s == null) return null;
        return s.length() > ERROR_MESSAGE_MAX ? s.substring(0, ERROR_MESSAGE_MAX) : s;
    }
}

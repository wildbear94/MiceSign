package com.micesign.service.email;

import com.micesign.domain.Document;
import com.micesign.domain.NotificationLog;
import com.micesign.domain.User;
import com.micesign.domain.enums.NotificationEventType;
import com.micesign.domain.enums.NotificationStatus;
import com.micesign.repository.NotificationLogRepository;
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
import org.springframework.retry.annotation.Backoff;
import org.springframework.retry.annotation.Recover;
import org.springframework.retry.annotation.Retryable;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.thymeleaf.spring6.SpringTemplateEngine;

/**
 * Phase 29 결재 알림 SMTP 발송 빈 — @Retryable/@Recover 격리 (D-B1).
 * EmailService 리스너에서 호출되는 별도 빈으로 Spring AOP 프록시 체인 보장 (Pitfall 1 회피).
 *
 * <p>이 파일의 스켈레톤은 Plan 29-01에서 작성되고, 실제 send/render 로직은 Plan 29-03에서 완성됨.
 *
 * <p>설계 결정:
 * <ul>
 *   <li>D-A1: PENDING-first 3단계 (PENDING insert → send → SUCCESS/FAILED UPDATE)</li>
 *   <li>D-A6: persistLog/findOrCreatePendingLog 는 REQUIRES_NEW 로 독립 commit</li>
 *   <li>D-B2: @Retryable(retryFor=MailSendException, noRetryFor={MailAuthenticationException, MailParseException}, maxAttempts=3, backoff=5분)</li>
 *   <li>D-B3: @Recover 시그니처 = (MailException e, Document, User, NotificationEventType)</li>
 *   <li>D-B4: send() 자체에는 @Transactional 없음 — REQUIRES_NEW helper 만 commit</li>
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
    private final ApprovalEmailSender self;     // @Lazy self-injection for REQUIRES_NEW proxy boundary (RESEARCH Pitfall 4 권장안)

    @Value("${app.base-url:http://localhost:5173}")
    private String baseUrl;

    @Value("${spring.mail.username:noreply@micesign.com}")
    private String fromAddress;

    public ApprovalEmailSender(
            @Autowired(required = false) JavaMailSender mailSender,
            SpringTemplateEngine templateEngine,
            NotificationLogRepository notificationLogRepository,
            @Lazy ApprovalEmailSender self) {
        this.mailSender = mailSender;
        this.templateEngine = templateEngine;
        this.notificationLogRepository = notificationLogRepository;
        this.self = self;
    }

    /**
     * 결재 이벤트별 이메일 발송. PENDING-first 3단계 로깅 + @Retryable 경로 (D-A1/D-B2).
     *
     * <p>실 로직은 Plan 29-03 Task 2에서 완성 — 현재는 스켈레톤으로 UnsupportedOperationException 만 throw.
     * Plan 29-03 구현 사항:
     * <ol>
     *   <li>self.findOrCreatePendingLog(doc, recipient, eventType) — PENDING insert or existing 조회</li>
     *   <li>mailSender == null → [EMAIL STUB] 로그 + SUCCESS 기록 후 return</li>
     *   <li>templateEngine.process("email/approval-" + slug, ctx) 로 HTML 렌더</li>
     *   <li>MimeMessageHelper(message, true, "UTF-8") + setFrom/setTo/setSubject/setText</li>
     *   <li>mailSender.send(message) + SUCCESS UPDATE</li>
     *   <li>MailSendException catch → RETRY UPDATE + rethrow (재시도 트리거)</li>
     *   <li>MailAuthenticationException/MailParseException catch → FAILED UPDATE (no rethrow)</li>
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
        throw new UnsupportedOperationException(
                "ApprovalEmailSender.send() — Plan 29-03 Task 2에서 구현 예정");
    }

    /**
     * @Retryable 최종 실패 recovery. maxAttempts=3 소진 후 호출 (D-B3).
     * 시그니처 규칙: (Throwable 슈퍼타입, 원 메서드 args 동일 순서·타입, 반환 타입 void).
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
     * Idempotent PENDING row 조회 or 생성. UNIQUE 제약(D-A2)을 만족하는 진입점.
     *
     * <p>실 구현은 Plan 29-03 Task 2에서 완성 — recipientEmail snapshot(D-A8), subject 생성 등.
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public NotificationLog findOrCreatePendingLog(Document doc, User recipient, NotificationEventType type) {
        throw new UnsupportedOperationException(
                "ApprovalEmailSender.findOrCreatePendingLog() — Plan 29-03 Task 2에서 구현 예정");
    }

    private String truncate(String s) {
        if (s == null) return null;
        return s.length() > ERROR_MESSAGE_MAX ? s.substring(0, ERROR_MESSAGE_MAX) : s;
    }
}

package com.micesign.service;

import com.micesign.domain.ApprovalLine;
import com.micesign.domain.Document;
import com.micesign.domain.User;
import com.micesign.domain.enums.ApprovalLineType;
import com.micesign.domain.enums.NotificationEventType;
import com.micesign.domain.enums.UserStatus;
import com.micesign.event.ApprovalNotificationEvent;
import com.micesign.repository.ApprovalLineRepository;
import com.micesign.repository.DocumentRepository;
import com.micesign.service.email.ApprovalEmailSender;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;
import java.util.stream.Stream;

/**
 * Approval notification dispatcher (Phase 29 retrofit).
 *
 * <p>Listens for {@link ApprovalNotificationEvent} after the producing transaction commits and
 * fans out to {@link ApprovalEmailSender#send} for each eligible recipient. PENDING-first
 * 3단계 로깅 / @Retryable / @Recover / template render 는 모두 ApprovalEmailSender 가 담당
 * (D-B1 Spring AOP 프록시 체인 보장 — Pitfall 1 회피).
 *
 * <p>본 클래스의 책임은:
 * <ol>
 *   <li>이벤트 디스패치 (after-commit + async)</li>
 *   <li>수신자 결정 (D-C2 REFERENCE 제외, NOTIF-04 ACTIVE only, D-A7 distinct by User.id)</li>
 * </ol>
 *
 * <p>NFR-03 준수 — 본 리스너는 audit_log 에 INSERT 하지 않는다. audit 기록은 producer
 * (ApprovalService / DocumentService) 가 동기적으로 수행한다.
 */
@Service
public class EmailService {

    private static final Logger log = LoggerFactory.getLogger(EmailService.class);

    private final DocumentRepository documentRepository;
    private final ApprovalLineRepository approvalLineRepository;
    private final ApprovalEmailSender approvalEmailSender;

    public EmailService(DocumentRepository documentRepository,
                        ApprovalLineRepository approvalLineRepository,
                        ApprovalEmailSender approvalEmailSender) {
        this.documentRepository = documentRepository;
        this.approvalLineRepository = approvalLineRepository;
        this.approvalEmailSender = approvalEmailSender;
    }

    // ──────────────────────────────────────────────
    // sendNotification (event listener)
    // ──────────────────────────────────────────────

    /**
     * Approval 이벤트 5종을 수신해 이메일 발송 디스패치.
     *
     * <p>리스너 내부 try-catch 는 이벤트 루프 안정화 목적 — 실 발송 실패는
     * ApprovalEmailSender 가 notification_log 에 FAILED/RETRY 로 기록한다.
     */
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    @Async
    public void sendNotification(ApprovalNotificationEvent event) {
        try {
            Document document = documentRepository.findByIdWithDrafter(event.getDocumentId())
                    .orElse(null);
            if (document == null) {
                log.warn("Document not found for notification: id={}", event.getDocumentId());
                return;
            }

            NotificationEventType type = NotificationEventType.valueOf(event.getEventType());
            List<User> recipients = determineRecipients(document, type);

            if (recipients.isEmpty()) {
                log.debug("No recipients for notification: docId={}, event={}",
                        event.getDocumentId(), type);
                return;
            }

            for (User recipient : recipients) {
                // 별도 빈 호출 — Spring 프록시 체인 보장 (D-B1, Pitfall 1 회피)
                approvalEmailSender.send(document, recipient, type);
            }
        } catch (Exception e) {
            log.error("Failed to dispatch approval notification: docId={}, event={}, error={}",
                    event.getDocumentId(), event.getEventType(), e.getMessage(), e);
        }
    }

    // ──────────────────────────────────────────────
    // sendEmail (legacy stub for non-approval callers)
    // ──────────────────────────────────────────────

    /**
     * Legacy log-only stub used by callers outside the approval flow
     * (BudgetIntegrationService 의 super-admin 알림, NotificationLogController 의 resend).
     *
     * <p>Phase 29 의 approval 이벤트 5종은 본 메서드를 거치지 않고
     * {@link ApprovalEmailSender#send} 를 호출한다. 본 메서드는 NotificationLog 에 INSERT
     * 하지 않으며 audit_log 도 만지지 않는다 (NFR-03). 실제 SMTP 발송 통합은 Phase 33
     * 운영 런북 / NotificationLog resend 리팩터에서 정리한다.
     */
    public void sendEmail(String to, String subject, String templateName,
                          Map<String, Object> variables) {
        log.info("[EMAIL STUB] To: {}, Subject: {}, Template: {}, Variables: {}",
                to, subject, templateName, variables);
    }

    // ──────────────────────────────────────────────
    // Private helpers
    // ──────────────────────────────────────────────

    /**
     * 이벤트별 수신자 결정.
     *
     * <ul>
     *   <li>SUBMIT / APPROVE — currentStep 의 non-REFERENCE 승인자 (D-C2)</li>
     *   <li>FINAL_APPROVE / REJECT — 기안자</li>
     *   <li>WITHDRAW — 결재선 전원 (REFERENCE 포함)</li>
     * </ul>
     *
     * <p>공통 후처리: User.status == ACTIVE 만 통과 (NOTIF-04), User.id 기준 distinct
     * (D-A7 — User entity 의 equals/hashCode 미구현 방어). insertion order 보존.
     */
    private List<User> determineRecipients(Document document, NotificationEventType type) {
        List<ApprovalLine> lines = approvalLineRepository
                .findByDocumentIdOrderByStepOrderAsc(document.getId());

        Stream<User> baseStream = switch (type) {
            case SUBMIT, APPROVE -> {
                if (document.getCurrentStep() == null) {
                    yield Stream.empty();
                }
                yield lines.stream()
                        .filter(l -> l.getStepOrder().equals(document.getCurrentStep()))
                        .filter(l -> l.getLineType() != ApprovalLineType.REFERENCE)
                        .map(ApprovalLine::getApprover);
            }
            case FINAL_APPROVE, REJECT -> Stream.of(document.getDrafter());
            case WITHDRAW -> lines.stream().map(ApprovalLine::getApprover);
        };

        return baseStream
                .filter(u -> u != null && u.getStatus() == UserStatus.ACTIVE)
                .collect(Collectors.toMap(
                        User::getId,
                        Function.identity(),
                        (a, b) -> a,
                        LinkedHashMap::new))
                .values().stream().toList();
    }
}

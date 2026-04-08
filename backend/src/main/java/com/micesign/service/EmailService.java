package com.micesign.service;

import com.micesign.domain.ApprovalLine;
import com.micesign.domain.Document;
import com.micesign.domain.NotificationLog;
import com.micesign.domain.User;
import com.micesign.domain.enums.ApprovalLineType;
import com.micesign.domain.enums.NotificationEventType;
import com.micesign.domain.enums.NotificationStatus;
import com.micesign.event.ApprovalNotificationEvent;
import com.micesign.repository.ApprovalLineRepository;
import com.micesign.repository.DocumentRepository;
import com.micesign.repository.NotificationLogRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * Email notification service.
 * Listens for ApprovalNotificationEvent after transaction commit.
 * Runs asynchronously to avoid blocking the main thread.
 *
 * SMTP is deferred to Phase 1-B. Currently logs emails instead of sending.
 * When SMTP is configured, add spring-boot-starter-mail dependency and
 * inject JavaMailSender to replace the log-only implementation.
 */
@Service
public class EmailService {

    private static final Logger log = LoggerFactory.getLogger(EmailService.class);

    private final DocumentRepository documentRepository;
    private final ApprovalLineRepository approvalLineRepository;
    private final NotificationLogRepository notificationLogRepository;

    public EmailService(DocumentRepository documentRepository,
                        ApprovalLineRepository approvalLineRepository,
                        NotificationLogRepository notificationLogRepository) {
        this.documentRepository = documentRepository;
        this.approvalLineRepository = approvalLineRepository;
        this.notificationLogRepository = notificationLogRepository;
    }

    // ──────────────────────────────────────────────
    // sendNotification (event listener)
    // ──────────────────────────────────────────────

    /**
     * Handle approval notification events after transaction commit.
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

            String eventType = event.getEventType();
            List<User> recipients = determineRecipients(document, eventType);

            if (recipients.isEmpty()) {
                log.debug("No recipients for notification: docId={}, event={}",
                        event.getDocumentId(), eventType);
                return;
            }

            String actionLabel = getActionLabel(eventType);
            String docNo = document.getDocNumber() != null ? document.getDocNumber() : "DRAFT";
            String subject = "[MiceSign] " + actionLabel + ": " + docNo + " " + document.getTitle();

            for (User recipient : recipients) {
                sendToRecipient(recipient, subject, eventType, document);
            }
        } catch (Exception e) {
            log.error("Failed to process notification event: docId={}, event={}, error={}",
                    event.getDocumentId(), event.getEventType(), e.getMessage(), e);
        }
    }

    // ──────────────────────────────────────────────
    // sendEmail (simple, used by budget integration etc.)
    // ──────────────────────────────────────────────

    /**
     * Send a templated email.
     * Currently logs only (SMTP not configured until Phase 1-B).
     */
    public void sendEmail(String to, String subject, String templateName,
                          Map<String, Object> variables) {
        // SMTP not yet configured. Log the email for now.
        log.info("[EMAIL STUB] To: {}, Subject: {}, Template: {}, Variables: {}",
                to, subject, templateName, variables);
    }

    // ──────────────────────────────────────────────
    // Private helpers
    // ──────────────────────────────────────────────

    private List<User> determineRecipients(Document document, String eventType) {
        List<ApprovalLine> allLines = approvalLineRepository
                .findByDocumentIdOrderByStepOrderAsc(document.getId());
        List<User> recipients = new ArrayList<>();

        NotificationEventType type = NotificationEventType.valueOf(eventType);

        switch (type) {
            case SUBMIT -> {
                // First step approver(s)
                if (document.getCurrentStep() != null) {
                    allLines.stream()
                            .filter(l -> l.getStepOrder().equals(document.getCurrentStep()))
                            .filter(l -> l.getLineType() != ApprovalLineType.REFERENCE)
                            .map(ApprovalLine::getApprover)
                            .forEach(recipients::add);
                }
            }
            case APPROVE -> {
                // Next step approver(s)
                if (document.getCurrentStep() != null) {
                    allLines.stream()
                            .filter(l -> l.getStepOrder().equals(document.getCurrentStep()))
                            .filter(l -> l.getLineType() != ApprovalLineType.REFERENCE)
                            .map(ApprovalLine::getApprover)
                            .forEach(recipients::add);
                }
            }
            case FINAL_APPROVE -> {
                // Drafter
                recipients.add(document.getDrafter());
            }
            case REJECT -> {
                // Drafter
                recipients.add(document.getDrafter());
            }
            case WITHDRAW -> {
                // All approval line members
                allLines.stream()
                        .map(ApprovalLine::getApprover)
                        .forEach(recipients::add);
            }
        }

        return recipients;
    }

    private void sendToRecipient(User recipient, String subject, String eventType,
                                  Document document) {
        NotificationLog notifLog = new NotificationLog();
        notifLog.setRecipient(recipient);
        notifLog.setRecipientEmail(recipient.getEmail());
        notifLog.setEventType(eventType);
        notifLog.setDocumentId(document.getId());
        notifLog.setSubject(subject);

        try {
            // Log-only mode until SMTP is configured
            log.info("[EMAIL STUB] To: {}, Subject: {}", recipient.getEmail(), subject);
            notifLog.setStatus(NotificationStatus.SUCCESS);
            notifLog.setSentAt(LocalDateTime.now());
        } catch (Exception e) {
            log.error("Failed to send notification: to={}, error={}",
                    recipient.getEmail(), e.getMessage());
            notifLog.setStatus(notifLog.getRetryCount() < 2
                    ? NotificationStatus.RETRY : NotificationStatus.FAILED);
            notifLog.setErrorMessage(e.getMessage());
        }

        notificationLogRepository.save(notifLog);
    }

    private String getActionLabel(String eventType) {
        return switch (eventType) {
            case "SUBMIT" -> "결재 요청";
            case "APPROVE" -> "승인";
            case "FINAL_APPROVE" -> "최종 승인";
            case "REJECT" -> "반려";
            case "WITHDRAW" -> "회수";
            default -> eventType;
        };
    }
}

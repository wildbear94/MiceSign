package com.micesign.service;

import com.micesign.domain.ApprovalLine;
import com.micesign.domain.Document;
import com.micesign.domain.NotificationLog;
import com.micesign.domain.User;
import com.micesign.domain.enums.ApprovalLineStatus;
import com.micesign.domain.enums.ApprovalLineType;
import com.micesign.domain.enums.DocumentStatus;
import com.micesign.domain.enums.NotificationEventType;
import com.micesign.domain.enums.NotificationStatus;
import com.micesign.event.ApprovalNotificationEvent;
import com.micesign.repository.ApprovalLineRepository;
import com.micesign.repository.DocumentRepository;
import com.micesign.repository.NotificationLogRepository;
import com.micesign.repository.UserRepository;
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

@Service
public class NotificationService {

    private static final Logger log = LoggerFactory.getLogger(NotificationService.class);

    private static final int MAX_RETRIES = 2;
    private static final long[] RETRY_DELAYS = {1000L, 3000L};

    private final EmailService emailService;
    private final NotificationLogRepository notificationLogRepository;
    private final ApprovalLineRepository approvalLineRepository;
    private final UserRepository userRepository;
    private final DocumentRepository documentRepository;

    public NotificationService(EmailService emailService,
                               NotificationLogRepository notificationLogRepository,
                               ApprovalLineRepository approvalLineRepository,
                               UserRepository userRepository,
                               DocumentRepository documentRepository) {
        this.emailService = emailService;
        this.notificationLogRepository = notificationLogRepository;
        this.approvalLineRepository = approvalLineRepository;
        this.userRepository = userRepository;
        this.documentRepository = documentRepository;
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    @Async
    public void handleNotificationEvent(ApprovalNotificationEvent event) {
        try {
            // Re-fetch with JOIN FETCH to eagerly load drafter — avoids LazyInitializationException
            // (the original entity's Hibernate session is already closed in this @Async thread)
            Document document = documentRepository.findByIdWithDrafter(event.getDocument().getId())
                    .orElse(null);
            if (document == null) {
                log.warn("Document not found for notification: id={}", event.getDocument().getId());
                return;
            }
            ApprovalNotificationEvent freshEvent = new ApprovalNotificationEvent(
                    document, event.getEventType(), event.getActorUserId(), event.getComment());

            List<Long> recipientIds = resolveRecipientIds(freshEvent);
            List<User> recipients = userRepository.findAllById(recipientIds);
            for (User recipient : recipients) {
                sendWithRetry(recipient, freshEvent);
            }
        } catch (Exception e) {
            log.error("Failed to process notification event: type={}, documentId={}, error={}",
                    event.getEventType(), event.getDocument().getId(), e.getMessage(), e);
        }
    }

    public List<Long> resolveRecipientIds(ApprovalNotificationEvent event) {
        Document document = event.getDocument();
        NotificationEventType eventType = event.getEventType();

        switch (eventType) {
            case SUBMIT: {
                // All approval line members with type APPROVE or AGREE (not REFERENCE)
                List<ApprovalLine> lines = approvalLineRepository
                        .findByDocumentIdOrderByStepOrderAsc(document.getId());
                return lines.stream()
                        .filter(line -> line.getLineType() == ApprovalLineType.APPROVE
                                || line.getLineType() == ApprovalLineType.AGREE)
                        .map(line -> line.getApprover().getId())
                        .toList();
            }
            case APPROVE: {
                // Check if final approval or intermediate
                if (document.getStatus() == DocumentStatus.APPROVED) {
                    // Final approval -> notify drafter
                    return List.of(document.getDrafter().getId());
                } else {
                    // Intermediate -> notify next pending approver
                    List<ApprovalLine> lines = approvalLineRepository
                            .findByDocumentIdOrderByStepOrderAsc(document.getId());
                    return lines.stream()
                            .filter(line -> line.getStatus() == ApprovalLineStatus.PENDING)
                            .filter(line -> line.getStepOrder() > 0)
                            .filter(line -> line.getLineType() == ApprovalLineType.APPROVE
                                    || line.getLineType() == ApprovalLineType.AGREE)
                            .findFirst()
                            .map(line -> List.of(line.getApprover().getId()))
                            .orElse(List.of());
                }
            }
            case REJECT:
            case WITHDRAW: {
                // Notify drafter only
                return List.of(document.getDrafter().getId());
            }
            default:
                return List.of();
        }
    }

    public void resend(NotificationLog notificationLog) {
        NotificationEventType eventType = NotificationEventType.valueOf(notificationLog.getEventType());
        String templateName = emailService.getTemplateName(eventType);

        // Build template variables from available data
        Map<String, Object> variables = new java.util.HashMap<>();
        variables.put("documentId", notificationLog.getDocumentId());

        if (notificationLog.getDocumentId() != null) {
            documentRepository.findById(notificationLog.getDocumentId()).ifPresent(doc -> {
                variables.put("documentTitle", doc.getTitle());
                variables.put("docNumber", doc.getDocNumber() != null ? doc.getDocNumber() : "");
                variables.put("drafterName", doc.getDrafter().getName());
            });
        }

        String statusLabel = switch (eventType) {
            case SUBMIT -> "결재 요청";
            case APPROVE -> "승인 완료";
            case REJECT -> "반려";
            case WITHDRAW -> "회수";
        };
        variables.put("statusLabel", statusLabel);

        // Reset status to PENDING and attempt resend
        notificationLog.setStatus(NotificationStatus.PENDING);
        notificationLog.setErrorMessage(null);
        notificationLogRepository.save(notificationLog);

        try {
            emailService.sendEmail(
                    notificationLog.getRecipientEmail(),
                    notificationLog.getSubject(),
                    templateName,
                    variables);

            notificationLog.setStatus(NotificationStatus.SUCCESS);
            notificationLog.setSentAt(LocalDateTime.now());
            notificationLog.setRetryCount(notificationLog.getRetryCount() + 1);
            notificationLogRepository.save(notificationLog);
        } catch (Exception e) {
            String errorMsg = e.getMessage();
            if (errorMsg != null && errorMsg.length() > 1000) {
                errorMsg = errorMsg.substring(0, 1000);
            }
            notificationLog.setStatus(NotificationStatus.FAILED);
            notificationLog.setRetryCount(notificationLog.getRetryCount() + 1);
            notificationLog.setErrorMessage(errorMsg);
            notificationLogRepository.save(notificationLog);

            log.warn("Failed to resend notification email to {}: id={}", notificationLog.getRecipientEmail(), notificationLog.getId(), e);
        }
    }

    public void sendWithRetry(User recipient, ApprovalNotificationEvent event) {
        Document document = event.getDocument();
        NotificationEventType eventType = event.getEventType();

        String subject = emailService.buildSubject(eventType, document.getTitle());
        String templateName = emailService.getTemplateName(eventType);
        Map<String, Object> variables = emailService.buildTemplateVariables(document, eventType, event.getComment());

        // Create initial log entry with PENDING status
        NotificationLog notificationLog = new NotificationLog();
        notificationLog.setRecipientId(recipient.getId());
        notificationLog.setRecipientEmail(recipient.getEmail());
        notificationLog.setEventType(eventType.name());
        notificationLog.setDocumentId(document.getId());
        notificationLog.setSubject(subject);
        notificationLog.setStatus(NotificationStatus.PENDING);
        notificationLog.setRetryCount(0);
        notificationLog = notificationLogRepository.save(notificationLog);

        for (int attempt = 0; attempt <= MAX_RETRIES; attempt++) {
            try {
                emailService.sendEmail(recipient.getEmail(), subject, templateName, variables);

                // Success
                notificationLog.setStatus(NotificationStatus.SUCCESS);
                notificationLog.setSentAt(LocalDateTime.now());
                notificationLog.setRetryCount(attempt);
                notificationLogRepository.save(notificationLog);
                return;

            } catch (Exception e) {
                if (attempt < MAX_RETRIES) {
                    // Retry
                    notificationLog.setStatus(NotificationStatus.RETRY);
                    notificationLog.setRetryCount(attempt + 1);
                    notificationLogRepository.save(notificationLog);

                    try {
                        Thread.sleep(RETRY_DELAYS[attempt]);
                    } catch (InterruptedException ie) {
                        Thread.currentThread().interrupt();
                        break;
                    }
                } else {
                    // Final failure
                    String errorMsg = e.getMessage();
                    if (errorMsg != null && errorMsg.length() > 1000) {
                        errorMsg = errorMsg.substring(0, 1000);
                    }
                    notificationLog.setStatus(NotificationStatus.FAILED);
                    notificationLog.setRetryCount(attempt);
                    notificationLog.setErrorMessage(errorMsg);
                    notificationLogRepository.save(notificationLog);

                    log.warn("Failed to send notification email to {} after {} retries: type={}, documentId={}",
                            recipient.getEmail(), MAX_RETRIES, eventType, document.getId(), e);
                }
            }
        }
    }
}

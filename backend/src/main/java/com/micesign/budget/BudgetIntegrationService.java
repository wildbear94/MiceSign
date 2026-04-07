package com.micesign.budget;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.micesign.domain.ApprovalTemplate;
import com.micesign.domain.BudgetIntegrationLog;
import com.micesign.domain.Document;
import com.micesign.domain.DocumentContent;
import com.micesign.domain.User;
import com.micesign.domain.enums.UserRole;
import com.micesign.domain.enums.UserStatus;
import com.micesign.event.BudgetCancellationEvent;
import com.micesign.event.BudgetIntegrationEvent;
import com.micesign.repository.ApprovalTemplateRepository;
import com.micesign.repository.BudgetIntegrationLogRepository;
import com.micesign.repository.DocumentContentRepository;
import com.micesign.repository.DocumentRepository;
import com.micesign.repository.UserRepository;
import com.micesign.service.EmailService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

/**
 * Budget integration service.
 * Listens for BudgetIntegrationEvent and BudgetCancellationEvent after transaction commit.
 * Extracts expense data from the document, calls the budget API, and logs the result.
 * On final failure, notifies SUPER_ADMIN users.
 */
@Service
public class BudgetIntegrationService {

    private static final Logger log = LoggerFactory.getLogger(BudgetIntegrationService.class);

    private final BudgetApiClient budgetApiClient;
    private final BudgetDataExtractor budgetDataExtractor;
    private final BudgetIntegrationLogRepository logRepository;
    private final DocumentRepository documentRepository;
    private final DocumentContentRepository documentContentRepository;
    private final ApprovalTemplateRepository templateRepository;
    private final UserRepository userRepository;
    private final EmailService emailService;
    private final ObjectMapper objectMapper;

    public BudgetIntegrationService(BudgetApiClient budgetApiClient,
                                     BudgetDataExtractor budgetDataExtractor,
                                     BudgetIntegrationLogRepository logRepository,
                                     DocumentRepository documentRepository,
                                     DocumentContentRepository documentContentRepository,
                                     ApprovalTemplateRepository templateRepository,
                                     UserRepository userRepository,
                                     EmailService emailService,
                                     ObjectMapper objectMapper) {
        this.budgetApiClient = budgetApiClient;
        this.budgetDataExtractor = budgetDataExtractor;
        this.logRepository = logRepository;
        this.documentRepository = documentRepository;
        this.documentContentRepository = documentContentRepository;
        this.templateRepository = templateRepository;
        this.userRepository = userRepository;
        this.emailService = emailService;
        this.objectMapper = objectMapper;
    }

    // ──────────────────────────────────────────────
    // Handle budget integration (submit)
    // ──────────────────────────────────────────────

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    @Async
    public void handleBudgetEvent(BudgetIntegrationEvent event) {
        try {
            // Check if template has budget_enabled
            ApprovalTemplate template = templateRepository.findByCode(event.getTemplateCode())
                    .orElse(null);
            if (template == null || !template.isBudgetEnabled()) {
                log.debug("Skipping budget integration for template: {}", event.getTemplateCode());
                return;
            }

            // Re-fetch document with drafter (avoid LazyInitializationException)
            Document document = documentRepository.findByIdWithDrafter(event.getDocumentId())
                    .orElse(null);
            if (document == null) {
                log.warn("Document not found for budget integration: id={}", event.getDocumentId());
                return;
            }

            // Get document content for formData
            DocumentContent content = documentContentRepository.findByDocumentId(event.getDocumentId())
                    .orElse(null);
            if (content == null || content.getFormData() == null) {
                log.warn("Document content/formData not found: documentId={}", event.getDocumentId());
                return;
            }

            // Extract budget data
            User drafter = document.getDrafter();
            String departmentName = drafter.getDepartment() != null
                    ? drafter.getDepartment().getName() : "";
            BudgetExpenseRequest request = budgetDataExtractor.extract(
                    event.getTemplateCode(),
                    content.getFormData(),
                    event.getDocNumber(),
                    drafter.getName(),
                    departmentName,
                    document.getSubmittedAt()
            );

            // Call budget API (@Retryable is on BudgetApiClient)
            String requestJson = objectMapper.writeValueAsString(request);
            BudgetApiResponse response = budgetApiClient.sendExpenseData(request);

            // Log result
            BudgetIntegrationLog budgetLog = new BudgetIntegrationLog();
            budgetLog.setDocumentId(event.getDocumentId());
            budgetLog.setTemplateCode(event.getTemplateCode());
            budgetLog.setDocNumber(event.getDocNumber());
            budgetLog.setEventType("SUBMIT");
            budgetLog.setRequestPayload(requestJson);

            if (response != null && response.success()) {
                budgetLog.setStatus("SUCCESS");
                budgetLog.setResponsePayload(objectMapper.writeValueAsString(response));
                budgetLog.setAttemptCount(1);
            } else {
                budgetLog.setStatus("FAILED");
                budgetLog.setErrorMessage(response != null
                        ? response.message() : "No response (null) - all retries exhausted");
                budgetLog.setResponsePayload(response != null
                        ? objectMapper.writeValueAsString(response) : null);
                notifySuperAdmins(event.getDocNumber(), event.getTemplateCode(),
                        response != null ? response.message() : "All retries exhausted");
            }
            budgetLog.setCompletedAt(LocalDateTime.now());
            logRepository.save(budgetLog);

        } catch (Exception e) {
            log.error("Budget integration failed: documentId={}, templateCode={}, error={}",
                    event.getDocumentId(), event.getTemplateCode(), e.getMessage(), e);
            saveErrorLog(event.getDocumentId(), event.getTemplateCode(),
                    event.getDocNumber(), "SUBMIT", e.getMessage());
            notifySuperAdmins(event.getDocNumber(), event.getTemplateCode(), e.getMessage());
        }
    }

    // ──────────────────────────────────────────────
    // Handle budget cancellation (withdraw/reject)
    // ──────────────────────────────────────────────

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    @Async
    public void handleCancellationEvent(BudgetCancellationEvent event) {
        try {
            // Check budget_enabled
            ApprovalTemplate template = templateRepository.findByCode(event.getTemplateCode())
                    .orElse(null);
            if (template == null || !template.isBudgetEnabled()) {
                return;
            }

            BudgetCancellationRequest request = new BudgetCancellationRequest(
                    event.getDocNumber(), event.getTemplateCode());

            String requestJson = objectMapper.writeValueAsString(request);
            BudgetApiResponse response = budgetApiClient.sendCancellation(request);

            BudgetIntegrationLog budgetLog = new BudgetIntegrationLog();
            budgetLog.setDocumentId(event.getDocumentId());
            budgetLog.setTemplateCode(event.getTemplateCode());
            budgetLog.setDocNumber(event.getDocNumber());
            budgetLog.setEventType("CANCEL");
            budgetLog.setRequestPayload(requestJson);

            if (response != null && response.success()) {
                budgetLog.setStatus("SUCCESS");
                budgetLog.setResponsePayload(objectMapper.writeValueAsString(response));
            } else {
                budgetLog.setStatus("FAILED");
                budgetLog.setErrorMessage(response != null
                        ? response.message() : "All retries exhausted");
                notifySuperAdmins(event.getDocNumber(), event.getTemplateCode(),
                        "Cancellation failed: " + (response != null
                                ? response.message() : "All retries exhausted"));
            }
            budgetLog.setCompletedAt(LocalDateTime.now());
            logRepository.save(budgetLog);

        } catch (Exception e) {
            log.error("Budget cancellation failed: documentId={}, error={}",
                    event.getDocumentId(), e.getMessage(), e);
            saveErrorLog(event.getDocumentId(), event.getTemplateCode(),
                    event.getDocNumber(), "CANCEL", e.getMessage());
            notifySuperAdmins(event.getDocNumber(), event.getTemplateCode(), e.getMessage());
        }
    }

    // ──────────────────────────────────────────────
    // Private helpers
    // ──────────────────────────────────────────────

    private void saveErrorLog(Long documentId, String templateCode, String docNumber,
                              String eventType, String errorMessage) {
        try {
            BudgetIntegrationLog errorLog = new BudgetIntegrationLog();
            errorLog.setDocumentId(documentId);
            errorLog.setTemplateCode(templateCode);
            errorLog.setDocNumber(docNumber);
            errorLog.setEventType(eventType);
            errorLog.setStatus("FAILED");
            errorLog.setErrorMessage(errorMessage);
            errorLog.setCompletedAt(LocalDateTime.now());
            logRepository.save(errorLog);
        } catch (Exception logError) {
            log.error("Failed to save budget integration error log: {}", logError.getMessage());
        }
    }

    private void notifySuperAdmins(String docNumber, String templateCode, String errorMessage) {
        try {
            List<User> superAdmins = userRepository.findByRoleAndStatus(
                    UserRole.SUPER_ADMIN, UserStatus.ACTIVE);
            Map<String, Object> variables = Map.of(
                    "docNumber", docNumber != null ? docNumber : "N/A",
                    "templateCode", templateCode,
                    "errorMessage", errorMessage != null ? errorMessage : "Unknown error",
                    "timestamp", LocalDateTime.now().toString()
            );
            for (User admin : superAdmins) {
                try {
                    emailService.sendEmail(admin.getEmail(),
                            "[MiceSign] 예산 시스템 연동 실패 - " + docNumber,
                            "budget-failure-notification", variables);
                } catch (Exception e) {
                    log.error("Failed to send budget failure notification to {}: {}",
                            admin.getEmail(), e.getMessage());
                }
            }
        } catch (Exception e) {
            log.error("Failed to notify super admins about budget failure: {}", e.getMessage());
        }
    }
}

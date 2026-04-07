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

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    @Async
    public void handleBudgetEvent(BudgetIntegrationEvent event) {
        try {
            // 1. Check if template has budget_enabled
            ApprovalTemplate template = templateRepository.findByCode(event.getTemplateCode()).orElse(null);
            if (template == null || !template.isBudgetEnabled()) {
                log.debug("Skipping budget integration for template: {}", event.getTemplateCode());
                return;
            }

            // 2. Re-fetch document with drafter (avoid LazyInitializationException)
            Document document = documentRepository.findByIdWithDrafter(event.getDocumentId()).orElse(null);
            if (document == null) {
                log.warn("Document not found for budget integration: id={}", event.getDocumentId());
                return;
            }

            // 3. Get document content for formData
            DocumentContent content = documentContentRepository.findByDocumentId(event.getDocumentId()).orElse(null);
            if (content == null || content.getFormData() == null) {
                log.warn("Document content/formData not found: documentId={}", event.getDocumentId());
                return;
            }

            // 4. Extract budget data
            User drafter = document.getDrafter();
            String departmentName = drafter.getDepartment() != null ? drafter.getDepartment().getName() : "";
            BudgetExpenseRequest request = budgetDataExtractor.extract(
                    event.getTemplateCode(),
                    content.getFormData(),
                    event.getDocNumber(),
                    drafter.getEmployeeNo(),
                    drafter.getName(),
                    departmentName,
                    document.getSubmittedAt()
            );

            // 5. Call budget API (@Retryable is on BudgetApiClient, not here)
            String requestJson = objectMapper.writeValueAsString(request);
            BudgetApiResponse response = budgetApiClient.sendExpenseData(request);

            // 6. Log result
            BudgetIntegrationLog budgetLog = new BudgetIntegrationLog();
            budgetLog.setDocumentId(event.getDocumentId());
            budgetLog.setTemplateCode(event.getTemplateCode());
            budgetLog.setDocNumber(event.getDocNumber());
            budgetLog.setEventType("SUBMIT");
            budgetLog.setRequestPayload(requestJson);

            if (response != null && response.isSuccess()) {
                budgetLog.setStatus("SUCCESS");
                budgetLog.setResponsePayload(objectMapper.writeValueAsString(response));
                budgetLog.setAttemptCount(1);
            } else {
                budgetLog.setStatus("FAILED");
                budgetLog.setErrorMessage(response != null ? response.getMessage() : "No response (null) - all retries exhausted");
                budgetLog.setResponsePayload(response != null ? objectMapper.writeValueAsString(response) : null);
                // Send failure notification to SUPER_ADMINs
                notifySuperAdmins(event.getDocNumber(), event.getTemplateCode(),
                        response != null ? response.getMessage() : "All retries exhausted");
            }
            budgetLog.setCompletedAt(LocalDateTime.now());
            logRepository.save(budgetLog);

        } catch (Exception e) {
            // Catch all exceptions to prevent @Async thread exception loss
            log.error("Budget integration failed: documentId={}, templateCode={}, error={}",
                    event.getDocumentId(), event.getTemplateCode(), e.getMessage(), e);
            try {
                BudgetIntegrationLog errorLog = new BudgetIntegrationLog();
                errorLog.setDocumentId(event.getDocumentId());
                errorLog.setTemplateCode(event.getTemplateCode());
                errorLog.setDocNumber(event.getDocNumber());
                errorLog.setEventType("SUBMIT");
                errorLog.setStatus("FAILED");
                errorLog.setErrorMessage(e.getMessage());
                errorLog.setCompletedAt(LocalDateTime.now());
                logRepository.save(errorLog);
                notifySuperAdmins(event.getDocNumber(), event.getTemplateCode(), e.getMessage());
            } catch (Exception logError) {
                log.error("Failed to save budget integration error log: {}", logError.getMessage());
            }
        }
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    @Async
    public void handleCancellationEvent(BudgetCancellationEvent event) {
        try {
            // Check budget_enabled
            ApprovalTemplate template = templateRepository.findByCode(event.getTemplateCode()).orElse(null);
            if (template == null || !template.isBudgetEnabled()) {
                return;
            }

            BudgetCancellationRequest request = new BudgetCancellationRequest();
            request.setDocumentNumber(event.getDocNumber());
            request.setTemplateCode(event.getTemplateCode());
            request.setReason(event.getReason());
            request.setCancelledAt(LocalDateTime.now());

            String requestJson = objectMapper.writeValueAsString(request);
            BudgetApiResponse response = budgetApiClient.sendCancellation(request);

            BudgetIntegrationLog budgetLog = new BudgetIntegrationLog();
            budgetLog.setDocumentId(event.getDocumentId());
            budgetLog.setTemplateCode(event.getTemplateCode());
            budgetLog.setDocNumber(event.getDocNumber());
            budgetLog.setEventType("CANCEL");
            budgetLog.setRequestPayload(requestJson);

            if (response != null && response.isSuccess()) {
                budgetLog.setStatus("SUCCESS");
                budgetLog.setResponsePayload(objectMapper.writeValueAsString(response));
            } else {
                budgetLog.setStatus("FAILED");
                budgetLog.setErrorMessage(response != null ? response.getMessage() : "All retries exhausted");
                notifySuperAdmins(event.getDocNumber(), event.getTemplateCode(),
                        "Cancellation failed: " + (response != null ? response.getMessage() : "All retries exhausted"));
            }
            budgetLog.setCompletedAt(LocalDateTime.now());
            logRepository.save(budgetLog);

        } catch (Exception e) {
            log.error("Budget cancellation failed: documentId={}, error={}",
                    event.getDocumentId(), e.getMessage(), e);
            try {
                BudgetIntegrationLog errorLog = new BudgetIntegrationLog();
                errorLog.setDocumentId(event.getDocumentId());
                errorLog.setTemplateCode(event.getTemplateCode());
                errorLog.setDocNumber(event.getDocNumber());
                errorLog.setEventType("CANCEL");
                errorLog.setStatus("FAILED");
                errorLog.setErrorMessage(e.getMessage());
                errorLog.setCompletedAt(LocalDateTime.now());
                logRepository.save(errorLog);
            } catch (Exception logError) {
                log.error("Failed to save cancellation error log: {}", logError.getMessage());
            }
        }
    }

    private void notifySuperAdmins(String docNumber, String templateCode, String errorMessage) {
        try {
            List<User> superAdmins = userRepository.findByRoleAndStatus(UserRole.SUPER_ADMIN, UserStatus.ACTIVE);
            Map<String, Object> variables = Map.of(
                    "docNumber", docNumber != null ? docNumber : "N/A",
                    "templateCode", templateCode,
                    "errorMessage", errorMessage != null ? errorMessage : "Unknown error",
                    "timestamp", LocalDateTime.now().toString()
            );
            for (User admin : superAdmins) {
                try {
                    emailService.sendEmail(admin.getEmail(),
                            "[MiceSign] \uc608\uc0b0 \uc2dc\uc2a4\ud15c \uc5f0\ub3d9 \uc2e4\ud328 - " + docNumber,
                            "budget-failure-notification", variables);
                } catch (Exception e) {
                    log.error("Failed to send budget failure notification to {}: {}", admin.getEmail(), e.getMessage());
                }
            }
        } catch (Exception e) {
            log.error("Failed to notify super admins about budget failure: {}", e.getMessage());
        }
    }
}

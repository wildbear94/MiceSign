package com.micesign.budget;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.micesign.domain.ApprovalTemplate;
import com.micesign.domain.BudgetIntegrationLog;
import com.micesign.domain.Department;
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
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class BudgetIntegrationServiceTest {

    @Mock private BudgetApiClient budgetApiClient;
    @Mock private BudgetDataExtractor budgetDataExtractor;
    @Mock private BudgetIntegrationLogRepository logRepository;
    @Mock private DocumentRepository documentRepository;
    @Mock private DocumentContentRepository documentContentRepository;
    @Mock private ApprovalTemplateRepository templateRepository;
    @Mock private UserRepository userRepository;
    @Mock private EmailService emailService;

    private BudgetIntegrationService service;
    private final ObjectMapper objectMapper = new ObjectMapper().registerModule(new JavaTimeModule());

    @BeforeEach
    void setUp() {
        service = new BudgetIntegrationService(
                budgetApiClient, budgetDataExtractor, logRepository,
                documentRepository, documentContentRepository,
                templateRepository, userRepository, emailService, objectMapper);
    }

    @Test
    void shouldSkipNonBudgetTemplate() {
        ApprovalTemplate template = new ApprovalTemplate();
        template.setBudgetEnabled(false);
        when(templateRepository.findByCode("GENERAL")).thenReturn(Optional.of(template));

        BudgetIntegrationEvent event = new BudgetIntegrationEvent(1L, "GENERAL", "GEN-2026-0001", 1L);
        service.handleBudgetEvent(event);

        verify(budgetApiClient, never()).sendExpenseData(any());
        verify(logRepository, never()).save(any());
    }

    @Test
    void shouldSkipTemplateNotFound() {
        when(templateRepository.findByCode("NONEXIST")).thenReturn(Optional.empty());

        BudgetIntegrationEvent event = new BudgetIntegrationEvent(1L, "NONEXIST", "NON-2026-0001", 1L);
        service.handleBudgetEvent(event);

        verify(budgetApiClient, never()).sendExpenseData(any());
        verify(logRepository, never()).save(any());
    }

    @Test
    void shouldSendExpenseDataOnSubmit() {
        // Setup budget-enabled template
        ApprovalTemplate template = new ApprovalTemplate();
        template.setBudgetEnabled(true);
        when(templateRepository.findByCode("EXPENSE")).thenReturn(Optional.of(template));

        // Setup document with drafter
        Document document = createTestDocument();
        when(documentRepository.findByIdWithDrafter(1L)).thenReturn(Optional.of(document));

        // Setup document content
        DocumentContent content = new DocumentContent();
        content.setFormData("{\"totalAmount\": 50000, \"items\": []}");
        when(documentContentRepository.findByDocumentId(1L)).thenReturn(Optional.of(content));

        // Setup extractor
        BudgetExpenseRequest request = new BudgetExpenseRequest();
        request.setDocumentNumber("EXP-2026-0001");
        when(budgetDataExtractor.extract(anyString(), anyString(), anyString(),
                anyString(), anyString(), anyString(), any())).thenReturn(request);

        // Setup API success response
        BudgetApiResponse response = new BudgetApiResponse(true, "Success", "REF-001");
        when(budgetApiClient.sendExpenseData(any())).thenReturn(response);

        // Execute
        BudgetIntegrationEvent event = new BudgetIntegrationEvent(1L, "EXPENSE", "EXP-2026-0001", 1L);
        service.handleBudgetEvent(event);

        // Verify
        verify(budgetApiClient).sendExpenseData(any());
        ArgumentCaptor<BudgetIntegrationLog> logCaptor = ArgumentCaptor.forClass(BudgetIntegrationLog.class);
        verify(logRepository).save(logCaptor.capture());
        assertThat(logCaptor.getValue().getStatus()).isEqualTo("SUCCESS");
        assertThat(logCaptor.getValue().getEventType()).isEqualTo("SUBMIT");
    }

    @Test
    void shouldLogFailedWhenApiReturnsNull() {
        // Setup budget-enabled template
        ApprovalTemplate template = new ApprovalTemplate();
        template.setBudgetEnabled(true);
        when(templateRepository.findByCode("EXPENSE")).thenReturn(Optional.of(template));

        // Setup document
        Document document = createTestDocument();
        when(documentRepository.findByIdWithDrafter(1L)).thenReturn(Optional.of(document));

        // Setup content
        DocumentContent content = new DocumentContent();
        content.setFormData("{\"totalAmount\": 50000}");
        when(documentContentRepository.findByDocumentId(1L)).thenReturn(Optional.of(content));

        // Setup extractor
        BudgetExpenseRequest request = new BudgetExpenseRequest();
        request.setDocumentNumber("EXP-2026-0001");
        when(budgetDataExtractor.extract(anyString(), anyString(), anyString(),
                anyString(), anyString(), anyString(), any())).thenReturn(request);

        // API returns null (all retries exhausted)
        when(budgetApiClient.sendExpenseData(any())).thenReturn(null);

        // Setup super admin for notification
        User admin = new User();
        admin.setEmail("admin@test.com");
        when(userRepository.findByRoleAndStatus(UserRole.SUPER_ADMIN, UserStatus.ACTIVE))
                .thenReturn(List.of(admin));

        // Execute
        BudgetIntegrationEvent event = new BudgetIntegrationEvent(1L, "EXPENSE", "EXP-2026-0001", 1L);
        service.handleBudgetEvent(event);

        // Verify FAILED log
        ArgumentCaptor<BudgetIntegrationLog> logCaptor = ArgumentCaptor.forClass(BudgetIntegrationLog.class);
        verify(logRepository).save(logCaptor.capture());
        assertThat(logCaptor.getValue().getStatus()).isEqualTo("FAILED");

        // Verify notification
        verify(userRepository).findByRoleAndStatus(UserRole.SUPER_ADMIN, UserStatus.ACTIVE);
        verify(emailService).sendEmail(eq("admin@test.com"), anyString(), eq("budget-failure-notification"), any());
    }

    @Test
    void shouldLogFailedOnException() {
        // Setup budget-enabled template
        ApprovalTemplate template = new ApprovalTemplate();
        template.setBudgetEnabled(true);
        when(templateRepository.findByCode("EXPENSE")).thenReturn(Optional.of(template));

        // Setup document
        Document document = createTestDocument();
        when(documentRepository.findByIdWithDrafter(1L)).thenReturn(Optional.of(document));

        // Setup content
        DocumentContent content = new DocumentContent();
        content.setFormData("{\"totalAmount\": 50000}");
        when(documentContentRepository.findByDocumentId(1L)).thenReturn(Optional.of(content));

        // Setup extractor
        BudgetExpenseRequest request = new BudgetExpenseRequest();
        request.setDocumentNumber("EXP-2026-0001");
        when(budgetDataExtractor.extract(anyString(), anyString(), anyString(),
                anyString(), anyString(), anyString(), any())).thenReturn(request);

        // API throws exception
        when(budgetApiClient.sendExpenseData(any())).thenThrow(new RuntimeException("Connection refused"));

        // Setup for notification
        when(userRepository.findByRoleAndStatus(UserRole.SUPER_ADMIN, UserStatus.ACTIVE))
                .thenReturn(List.of());

        // Execute
        BudgetIntegrationEvent event = new BudgetIntegrationEvent(1L, "EXPENSE", "EXP-2026-0001", 1L);
        service.handleBudgetEvent(event);

        // Verify error log saved
        ArgumentCaptor<BudgetIntegrationLog> logCaptor = ArgumentCaptor.forClass(BudgetIntegrationLog.class);
        verify(logRepository).save(logCaptor.capture());
        assertThat(logCaptor.getValue().getStatus()).isEqualTo("FAILED");
        assertThat(logCaptor.getValue().getErrorMessage()).contains("Connection refused");
    }

    @Test
    void shouldSendCancellationOnReject() {
        ApprovalTemplate template = new ApprovalTemplate();
        template.setBudgetEnabled(true);
        when(templateRepository.findByCode("EXPENSE")).thenReturn(Optional.of(template));

        BudgetApiResponse response = new BudgetApiResponse(true, "Cancelled", "CANCEL-001");
        when(budgetApiClient.sendCancellation(any())).thenReturn(response);

        BudgetCancellationEvent event = new BudgetCancellationEvent(
                1L, "EXPENSE", "EXP-2026-0001", 2L, "REJECTED");
        service.handleCancellationEvent(event);

        verify(budgetApiClient).sendCancellation(any());
        ArgumentCaptor<BudgetIntegrationLog> logCaptor = ArgumentCaptor.forClass(BudgetIntegrationLog.class);
        verify(logRepository).save(logCaptor.capture());
        assertThat(logCaptor.getValue().getStatus()).isEqualTo("SUCCESS");
        assertThat(logCaptor.getValue().getEventType()).isEqualTo("CANCEL");
    }

    @Test
    void shouldSendCancellationOnWithdraw() {
        ApprovalTemplate template = new ApprovalTemplate();
        template.setBudgetEnabled(true);
        when(templateRepository.findByCode("EXPENSE")).thenReturn(Optional.of(template));

        BudgetApiResponse response = new BudgetApiResponse(true, "Cancelled", "CANCEL-002");
        when(budgetApiClient.sendCancellation(any())).thenReturn(response);

        BudgetCancellationEvent event = new BudgetCancellationEvent(
                1L, "EXPENSE", "EXP-2026-0001", 1L, "WITHDRAWN");
        service.handleCancellationEvent(event);

        verify(budgetApiClient).sendCancellation(any());
        ArgumentCaptor<BudgetIntegrationLog> logCaptor = ArgumentCaptor.forClass(BudgetIntegrationLog.class);
        verify(logRepository).save(logCaptor.capture());
        assertThat(logCaptor.getValue().getEventType()).isEqualTo("CANCEL");
    }

    @Test
    void shouldSkipCancellationForNonBudgetTemplate() {
        ApprovalTemplate template = new ApprovalTemplate();
        template.setBudgetEnabled(false);
        when(templateRepository.findByCode("GENERAL")).thenReturn(Optional.of(template));

        BudgetCancellationEvent event = new BudgetCancellationEvent(
                1L, "GENERAL", "GEN-2026-0001", 2L, "REJECTED");
        service.handleCancellationEvent(event);

        verify(budgetApiClient, never()).sendCancellation(any());
        verify(logRepository, never()).save(any());
    }

    // --- Helper ---

    private Document createTestDocument() {
        User drafter = new User();
        drafter.setId(1L);
        drafter.setEmployeeNo("E001");
        drafter.setName("Test Drafter");
        drafter.setEmail("drafter@test.com");
        drafter.setDepartmentId(1L);

        Document document = new Document();
        document.setId(1L);
        document.setDrafter(drafter);
        document.setTemplateCode("EXPENSE");
        document.setDocNumber("EXP-2026-0001");
        document.setSubmittedAt(LocalDateTime.now());
        return document;
    }
}

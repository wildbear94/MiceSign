package com.micesign.budget;

import com.micesign.config.RetryConfig;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.ApplicationContext;
import org.springframework.retry.annotation.EnableRetry;
import org.springframework.test.context.ActiveProfiles;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Integration test verifying Spring Retry infrastructure is properly configured
 * and BudgetApiClient bean is available.
 */
@SpringBootTest
@ActiveProfiles("test")
class BudgetRetryIntegrationTest {

    @Autowired
    private ApplicationContext applicationContext;

    @Autowired
    private BudgetApiClient budgetApiClient;

    @Test
    void shouldHaveRetryConfigured() {
        // Verify @EnableRetry configuration is present
        RetryConfig retryConfig = applicationContext.getBean(RetryConfig.class);
        assertThat(retryConfig).isNotNull();
        assertThat(RetryConfig.class.isAnnotationPresent(EnableRetry.class)).isTrue();
    }

    @Test
    void shouldInjectMockBudgetApiClientInTestProfile() {
        // In test profile (!prod), MockBudgetApiClient should be injected
        assertThat(budgetApiClient).isNotNull();
        assertThat(budgetApiClient).isInstanceOf(MockBudgetApiClient.class);
    }

    @Test
    void shouldReturnSuccessFromMockClient() {
        // MockBudgetApiClient always returns success
        BudgetExpenseRequest request = new BudgetExpenseRequest();
        request.setDocumentNumber("TEST-2026-0001");
        request.setTemplateCode("EXPENSE");

        BudgetApiResponse response = budgetApiClient.sendExpenseData(request);

        assertThat(response).isNotNull();
        assertThat(response.isSuccess()).isTrue();
        assertThat(response.getMessage()).contains("Mock");
    }

    @Test
    void shouldReturnCancellationSuccessFromMockClient() {
        BudgetCancellationRequest request = new BudgetCancellationRequest();
        request.setDocumentNumber("TEST-2026-0001");
        request.setReason("REJECTED");

        BudgetApiResponse response = budgetApiClient.sendCancellation(request);

        assertThat(response).isNotNull();
        assertThat(response.isSuccess()).isTrue();
    }
}

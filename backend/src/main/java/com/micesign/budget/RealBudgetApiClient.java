package com.micesign.budget;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Profile;
import org.springframework.retry.annotation.Backoff;
import org.springframework.retry.annotation.Recover;
import org.springframework.retry.annotation.Retryable;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

@Component
@Profile("prod")
public class RealBudgetApiClient implements BudgetApiClient {

    private static final Logger log = LoggerFactory.getLogger(RealBudgetApiClient.class);

    private final RestClient budgetRestClient;
    private final String apiKey;

    public RealBudgetApiClient(
            @Qualifier("budgetRestClient") RestClient budgetRestClient,
            @Value("${budget.api.api-key}") String apiKey) {
        this.budgetRestClient = budgetRestClient;
        this.apiKey = apiKey;
    }

    @Override
    @Retryable(
        retryFor = {RestClientException.class},
        maxAttempts = 3,
        backoff = @Backoff(delay = 2000, multiplier = 1.5)
    )
    public BudgetApiResponse sendExpenseData(BudgetExpenseRequest request) {
        log.info("Sending expense data to budget API: docNumber={}", request.getDocumentNumber());
        return budgetRestClient.post()
            .uri("/api/budget/expenses")
            .header("X-API-Key", apiKey)
            .body(request)
            .retrieve()
            .body(BudgetApiResponse.class);
    }

    @Recover
    public BudgetApiResponse recoverSendExpenseData(RestClientException e, BudgetExpenseRequest request) {
        log.error("Budget API sendExpenseData failed after all retries: docNumber={}, error={}",
                request.getDocumentNumber(), e.getMessage());
        return null; // caller handles null as failure
    }

    @Override
    @Retryable(
        retryFor = {RestClientException.class},
        maxAttempts = 3,
        backoff = @Backoff(delay = 2000, multiplier = 1.5)
    )
    public BudgetApiResponse sendCancellation(BudgetCancellationRequest request) {
        log.info("Sending cancellation to budget API: docNumber={}", request.getDocumentNumber());
        return budgetRestClient.post()
            .uri("/api/budget/cancellations")
            .header("X-API-Key", apiKey)
            .body(request)
            .retrieve()
            .body(BudgetApiResponse.class);
    }

    @Recover
    public BudgetApiResponse recoverSendCancellation(RestClientException e, BudgetCancellationRequest request) {
        log.error("Budget API sendCancellation failed after all retries: docNumber={}, error={}",
                request.getDocumentNumber(), e.getMessage());
        return null;
    }
}

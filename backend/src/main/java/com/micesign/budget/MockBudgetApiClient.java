package com.micesign.budget;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

/**
 * Mock budget API client for non-production environments.
 * Always returns success.
 */
@Component
@Profile("!prod")
public class MockBudgetApiClient implements BudgetApiClient {

    private static final Logger log = LoggerFactory.getLogger(MockBudgetApiClient.class);

    @Override
    public BudgetApiResponse sendExpenseData(BudgetExpenseRequest request) {
        log.info("[MOCK] Budget API sendExpenseData called: docNumber={}, templateCode={}, totalAmount={}",
                request.docNumber(), request.templateCode(), request.totalAmount());
        return new BudgetApiResponse(true, "Mock success", "MOCK-" + System.currentTimeMillis());
    }

    @Override
    public BudgetApiResponse sendCancellation(BudgetCancellationRequest request) {
        log.info("[MOCK] Budget API sendCancellation called: docNumber={}, templateCode={}",
                request.docNumber(), request.templateCode());
        return new BudgetApiResponse(true, "Mock cancellation success",
                "MOCK-CANCEL-" + System.currentTimeMillis());
    }
}

package com.micesign.budget;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

@Component
@Profile("!prod")
public class MockBudgetApiClient implements BudgetApiClient {

    private static final Logger log = LoggerFactory.getLogger(MockBudgetApiClient.class);

    @Override
    public BudgetApiResponse sendExpenseData(BudgetExpenseRequest request) {
        log.info("[MOCK] Budget API sendExpenseData called: docNumber={}, templateCode={}, totalAmount={}",
                request.getDocumentNumber(), request.getTemplateCode(), request.getTotalAmount());
        BudgetApiResponse response = new BudgetApiResponse();
        response.setSuccess(true);
        response.setMessage("Mock success");
        response.setReferenceId("MOCK-" + System.currentTimeMillis());
        return response;
    }

    @Override
    public BudgetApiResponse sendCancellation(BudgetCancellationRequest request) {
        log.info("[MOCK] Budget API sendCancellation called: docNumber={}, reason={}",
                request.getDocumentNumber(), request.getReason());
        BudgetApiResponse response = new BudgetApiResponse();
        response.setSuccess(true);
        response.setMessage("Mock cancellation success");
        response.setReferenceId("MOCK-CANCEL-" + System.currentTimeMillis());
        return response;
    }
}

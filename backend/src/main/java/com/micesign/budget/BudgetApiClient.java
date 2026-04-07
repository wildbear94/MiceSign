package com.micesign.budget;

public interface BudgetApiClient {

    BudgetApiResponse sendExpenseData(BudgetExpenseRequest request);

    BudgetApiResponse sendCancellation(BudgetCancellationRequest request);
}

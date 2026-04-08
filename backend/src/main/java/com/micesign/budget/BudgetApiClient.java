package com.micesign.budget;

/**
 * Interface for budget system API calls.
 * Implementations: MockBudgetApiClient (non-prod), RealBudgetApiClient (prod).
 */
public interface BudgetApiClient {

    /**
     * Submit expense data to the budget system.
     * @return response, or null if all retries exhausted
     */
    BudgetApiResponse sendExpenseData(BudgetExpenseRequest request);

    /**
     * Send cancellation to the budget system.
     * @return response, or null if all retries exhausted
     */
    BudgetApiResponse sendCancellation(BudgetCancellationRequest request);
}

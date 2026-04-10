package com.micesign.budget;

import java.time.LocalDateTime;
import java.util.List;

public record BudgetExpenseRequest(
    String docNumber,
    String templateCode,
    String drafterName,
    String departmentName,
    List<ExpenseItem> items,
    long totalAmount,
    LocalDateTime submittedAt
) {
    public record ExpenseItem(String description, int quantity, long unitPrice, long amount) {}
}

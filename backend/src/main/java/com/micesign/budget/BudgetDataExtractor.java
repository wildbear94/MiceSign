package com.micesign.budget;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

/**
 * Utility to extract budget expense data from document formData JSON.
 * Parses formData by template code to build BudgetExpenseRequest.
 */
@Component
public class BudgetDataExtractor {

    private static final Logger log = LoggerFactory.getLogger(BudgetDataExtractor.class);
    private final ObjectMapper objectMapper;

    public BudgetDataExtractor(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    /**
     * Extract budget expense data from a document's formData.
     *
     * @param templateCode   the template code (EXPENSE, PURCHASE, BUSINESS_TRIP, etc.)
     * @param formDataJson   the form data JSON string
     * @param docNumber      the document number
     * @param drafterName    the drafter's name
     * @param departmentName the drafter's department name
     * @param submittedAt    when the document was submitted
     * @return a BudgetExpenseRequest; never null (returns zeroed data on parse failure)
     */
    public BudgetExpenseRequest extract(String templateCode, String formDataJson,
                                         String docNumber, String drafterName,
                                         String departmentName, LocalDateTime submittedAt) {
        try {
            @SuppressWarnings("unchecked")
            Map<String, Object> formData = objectMapper.readValue(formDataJson, Map.class);

            long totalAmount = 0L;
            List<BudgetExpenseRequest.ExpenseItem> items = List.of();

            switch (templateCode) {
                case "EXPENSE" -> {
                    totalAmount = toLong(formData.get("totalAmount"));
                    items = extractExpenseItems(formData);
                }
                case "PURCHASE" -> {
                    totalAmount = toLong(formData.get("totalAmount"));
                    items = extractExpenseItems(formData);
                }
                case "BUSINESS_TRIP" -> {
                    totalAmount = toLong(formData.get("totalExpense"));
                    items = extractExpenseItems(formData);
                }
                case "OVERTIME" -> {
                    // OVERTIME has no monetary total
                    totalAmount = 0L;
                }
                default -> log.warn("No budget data mapper found for templateCode: {}", templateCode);
            }

            return new BudgetExpenseRequest(docNumber, templateCode, drafterName,
                    departmentName, items, totalAmount, submittedAt);

        } catch (Exception e) {
            log.error("Failed to extract budget data: templateCode={}, error={}",
                    templateCode, e.getMessage());
            return new BudgetExpenseRequest(docNumber, templateCode, drafterName,
                    departmentName, List.of(), 0L, submittedAt);
        }
    }

    // ──────────────────────────────────────────────
    // Private helpers
    // ──────────────────────────────────────────────

    @SuppressWarnings("unchecked")
    private List<BudgetExpenseRequest.ExpenseItem> extractExpenseItems(Map<String, Object> formData) {
        Object itemsObj = formData.get("items");
        if (itemsObj instanceof List<?> rawItems) {
            return rawItems.stream()
                    .filter(item -> item instanceof Map)
                    .map(item -> {
                        Map<String, Object> m = (Map<String, Object>) item;
                        return new BudgetExpenseRequest.ExpenseItem(
                                (String) m.getOrDefault("description",
                                        m.getOrDefault("name", "")),
                                toInt(m.get("quantity")),
                                toLong(m.get("unitPrice")),
                                toLong(m.get("amount"))
                        );
                    })
                    .toList();
        }
        return List.of();
    }

    private long toLong(Object value) {
        if (value == null) return 0L;
        if (value instanceof Number n) return n.longValue();
        try {
            return Long.parseLong(value.toString());
        } catch (NumberFormatException e) {
            return 0L;
        }
    }

    private int toInt(Object value) {
        if (value == null) return 0;
        if (value instanceof Number n) return n.intValue();
        try {
            return Integer.parseInt(value.toString());
        } catch (NumberFormatException e) {
            return 0;
        }
    }
}

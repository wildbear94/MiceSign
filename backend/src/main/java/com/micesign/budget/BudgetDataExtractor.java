package com.micesign.budget;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

@Component
public class BudgetDataExtractor {

    private static final Logger log = LoggerFactory.getLogger(BudgetDataExtractor.class);
    private final ObjectMapper objectMapper;

    @FunctionalInterface
    interface BudgetDataMapper {
        void extract(Map<String, Object> formData, BudgetExpenseRequest request);
    }

    private final Map<String, BudgetDataMapper> mappers = Map.of(
        "EXPENSE", this::extractExpense,
        "PURCHASE", this::extractPurchase,
        "BUSINESS_TRIP", this::extractBusinessTrip,
        "OVERTIME", this::extractOvertime
    );

    public BudgetDataExtractor(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    public BudgetExpenseRequest extract(String templateCode, String formDataJson,
                                         String docNumber, String drafterEmployeeNo,
                                         String drafterName, String departmentName,
                                         LocalDateTime submittedAt) {
        BudgetExpenseRequest request = new BudgetExpenseRequest();
        request.setDocumentNumber(docNumber);
        request.setTemplateCode(templateCode);
        request.setDrafterEmployeeNo(drafterEmployeeNo);
        request.setDrafterName(drafterName);
        request.setDepartmentName(departmentName);
        request.setSubmittedAt(submittedAt);

        try {
            @SuppressWarnings("unchecked")
            Map<String, Object> formData = objectMapper.readValue(formDataJson, Map.class);
            BudgetDataMapper mapper = mappers.get(templateCode);
            if (mapper != null) {
                mapper.extract(formData, request);
            } else {
                log.warn("No budget data mapper found for templateCode: {}", templateCode);
                request.setTotalAmount(0L);
                request.setDetails(Map.of());
            }
        } catch (Exception e) {
            log.error("Failed to extract budget data: templateCode={}, error={}", templateCode, e.getMessage());
            request.setTotalAmount(0L);
            request.setDetails(Map.of("error", e.getMessage()));
        }

        return request;
    }

    private void extractExpense(Map<String, Object> formData, BudgetExpenseRequest request) {
        request.setTotalAmount(toLong(formData.get("totalAmount")));
        Map<String, Object> details = new HashMap<>();
        details.put("items", formData.get("items"));
        request.setDetails(details);
    }

    private void extractPurchase(Map<String, Object> formData, BudgetExpenseRequest request) {
        request.setTotalAmount(toLong(formData.get("totalAmount")));
        Map<String, Object> details = new HashMap<>();
        details.put("items", formData.get("items"));
        details.put("supplier", formData.get("supplier"));
        details.put("deliveryDate", formData.get("deliveryDate"));
        request.setDetails(details);
    }

    private void extractBusinessTrip(Map<String, Object> formData, BudgetExpenseRequest request) {
        request.setTotalAmount(toLong(formData.get("totalExpense")));
        Map<String, Object> details = new HashMap<>();
        details.put("expenses", formData.get("expenses"));
        details.put("destination", formData.get("destination"));
        details.put("startDate", formData.get("startDate"));
        details.put("endDate", formData.get("endDate"));
        request.setDetails(details);
    }

    private void extractOvertime(Map<String, Object> formData, BudgetExpenseRequest request) {
        // OVERTIME has no totalAmount field in formData (Pitfall 4)
        // Send hours only; budget system calculates cost
        request.setTotalAmount(null);
        Map<String, Object> details = new HashMap<>();
        details.put("hours", formData.get("hours"));
        details.put("workDate", formData.get("workDate"));
        details.put("startTime", formData.get("startTime"));
        details.put("endTime", formData.get("endTime"));
        request.setDetails(details);
    }

    private Long toLong(Object value) {
        if (value == null) return 0L;
        if (value instanceof Number) return ((Number) value).longValue();
        try {
            return Long.parseLong(value.toString());
        } catch (NumberFormatException e) {
            return 0L;
        }
    }
}

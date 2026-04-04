package com.micesign.service.validation;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.micesign.common.exception.BusinessException;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

@Component
public class BusinessTripFormValidator implements FormValidationStrategy {

    private final ObjectMapper objectMapper;

    public BusinessTripFormValidator(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    @Override
    public String getTemplateCode() {
        return "BUSINESS_TRIP";
    }

    @Override
    public void validate(String bodyHtml, String formDataJson) {
        if (!StringUtils.hasText(formDataJson)) {
            throw new BusinessException("DOC_INVALID_FORM_DATA", "출장 보고서는 양식 데이터가 필요합니다.");
        }

        JsonNode root;
        try {
            root = objectMapper.readTree(formDataJson);
        } catch (Exception e) {
            throw new BusinessException("DOC_INVALID_FORM_DATA", "양식 데이터 JSON 파싱에 실패했습니다.");
        }

        // destination
        JsonNode destination = root.get("destination");
        if (destination == null || !destination.isTextual() || destination.asText().isBlank()) {
            throw new BusinessException("DOC_INVALID_FORM_DATA", "출장지(destination)가 필요합니다.");
        }

        // startDate
        JsonNode startDate = root.get("startDate");
        if (startDate == null || !startDate.isTextual() || startDate.asText().isBlank()) {
            throw new BusinessException("DOC_INVALID_FORM_DATA", "출장 시작일(startDate)이 필요합니다.");
        }

        // endDate
        JsonNode endDate = root.get("endDate");
        if (endDate == null || !endDate.isTextual() || endDate.asText().isBlank()) {
            throw new BusinessException("DOC_INVALID_FORM_DATA", "출장 종료일(endDate)이 필요합니다.");
        }

        // purpose
        JsonNode purpose = root.get("purpose");
        if (purpose == null || !purpose.isTextual() || purpose.asText().isBlank()) {
            throw new BusinessException("DOC_INVALID_FORM_DATA", "출장 목적(purpose)이 필요합니다.");
        }

        // itinerary array
        JsonNode itinerary = root.get("itinerary");
        if (itinerary == null || !itinerary.isArray()) {
            throw new BusinessException("DOC_INVALID_FORM_DATA", "일정(itinerary) 배열이 필요합니다.");
        }
        if (itinerary.isEmpty()) {
            throw new BusinessException("DOC_INVALID_FORM_DATA", "일정이 최소 1개 이상 필요합니다.");
        }

        for (int i = 0; i < itinerary.size(); i++) {
            validateItineraryItem(itinerary.get(i), i);
        }

        // expenses array (optional, can be empty)
        JsonNode expenses = root.get("expenses");
        if (expenses != null && expenses.isArray() && !expenses.isEmpty()) {
            for (int i = 0; i < expenses.size(); i++) {
                validateExpenseItem(expenses.get(i), i);
            }

            // totalExpense required when expenses present
            JsonNode totalExpense = root.get("totalExpense");
            if (totalExpense == null || !totalExpense.isNumber()) {
                throw new BusinessException("DOC_INVALID_FORM_DATA", "총 경비(totalExpense)가 필요합니다.");
            }
            if (totalExpense.asLong() < 0) {
                throw new BusinessException("DOC_INVALID_FORM_DATA", "총 경비는 0 이상이어야 합니다.");
            }
        }

        // result is optional
    }

    private void validateItineraryItem(JsonNode item, int index) {
        String prefix = "일정[" + index + "]";

        JsonNode date = item.get("date");
        if (date == null || !date.isTextual() || date.asText().isBlank()) {
            throw new BusinessException("DOC_INVALID_FORM_DATA", prefix + ": 날짜(date)가 필요합니다.");
        }

        JsonNode location = item.get("location");
        if (location == null || !location.isTextual() || location.asText().isBlank()) {
            throw new BusinessException("DOC_INVALID_FORM_DATA", prefix + ": 장소(location)가 필요합니다.");
        }
    }

    private void validateExpenseItem(JsonNode item, int index) {
        String prefix = "경비[" + index + "]";

        JsonNode category = item.get("category");
        if (category == null || !category.isTextual() || category.asText().isBlank()) {
            throw new BusinessException("DOC_INVALID_FORM_DATA", prefix + ": 항목(category)이 필요합니다.");
        }

        JsonNode amount = item.get("amount");
        if (amount == null || !amount.isNumber() || amount.asLong() < 0) {
            throw new BusinessException("DOC_INVALID_FORM_DATA", prefix + ": 금액(amount)은 0 이상이어야 합니다.");
        }
    }
}

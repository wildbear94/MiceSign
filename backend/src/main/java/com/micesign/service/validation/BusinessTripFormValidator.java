package com.micesign.service.validation;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.micesign.common.exception.BusinessException;
import com.micesign.common.exception.FormValidationException;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Validator for BUSINESS_TRIP template.
 * Validates: destination, startDate, endDate, purpose, itinerary array.
 */
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

        Map<String, String> errors = new LinkedHashMap<>();

        // destination
        JsonNode destination = root.get("destination");
        if (destination == null || !destination.isTextual() || destination.asText().isBlank()) {
            errors.put("destination", "출장지가 필요합니다.");
        }

        // startDate
        LocalDate start = null;
        JsonNode startDate = root.get("startDate");
        if (startDate == null || !startDate.isTextual() || startDate.asText().isBlank()) {
            errors.put("startDate", "출장 시작일이 필요합니다.");
        } else {
            try {
                start = LocalDate.parse(startDate.asText());
            } catch (DateTimeParseException e) {
                errors.put("startDate", "날짜 형식이 올바르지 않습니다. (yyyy-MM-dd)");
            }
        }

        // endDate
        LocalDate end = null;
        JsonNode endDate = root.get("endDate");
        if (endDate == null || !endDate.isTextual() || endDate.asText().isBlank()) {
            errors.put("endDate", "출장 종료일이 필요합니다.");
        } else {
            try {
                end = LocalDate.parse(endDate.asText());
            } catch (DateTimeParseException e) {
                errors.put("endDate", "날짜 형식이 올바르지 않습니다. (yyyy-MM-dd)");
            }
        }

        // end >= start
        if (start != null && end != null && end.isBefore(start)) {
            errors.put("endDate", "종료일은 시작일 이후여야 합니다.");
        }

        // purpose
        JsonNode purpose = root.get("purpose");
        if (purpose == null || !purpose.isTextual() || purpose.asText().isBlank()) {
            errors.put("purpose", "출장 목적이 필요합니다.");
        }

        // itinerary array
        JsonNode itinerary = root.get("itinerary");
        if (itinerary == null || !itinerary.isArray()) {
            errors.put("itinerary", "일정(itinerary) 배열이 필요합니다.");
        } else if (itinerary.isEmpty()) {
            errors.put("itinerary", "일정이 최소 1개 이상 필요합니다.");
        } else {
            for (int i = 0; i < itinerary.size(); i++) {
                JsonNode item = itinerary.get(i);
                String prefix = "itinerary[" + i + "]";

                JsonNode date = item.get("date");
                if (date == null || !date.isTextual() || date.asText().isBlank()) {
                    errors.put(prefix + ".date", "날짜가 필요합니다.");
                }

                JsonNode location = item.get("location");
                if (location == null || !location.isTextual() || location.asText().isBlank()) {
                    errors.put(prefix + ".location", "장소가 필요합니다.");
                }
            }
        }

        // expenses array (optional, validate if present)
        JsonNode expenses = root.get("expenses");
        if (expenses != null && expenses.isArray() && !expenses.isEmpty()) {
            for (int i = 0; i < expenses.size(); i++) {
                JsonNode item = expenses.get(i);
                String prefix = "expenses[" + i + "]";

                JsonNode category = item.get("category");
                if (category == null || !category.isTextual() || category.asText().isBlank()) {
                    errors.put(prefix + ".category", "경비 항목이 필요합니다.");
                }

                JsonNode amount = item.get("amount");
                if (amount == null || !amount.isNumber() || amount.asLong() < 0) {
                    errors.put(prefix + ".amount", "경비 금액은 0 이상이어야 합니다.");
                }
            }

            // totalExpense required when expenses present
            JsonNode totalExpense = root.get("totalExpense");
            if (totalExpense == null || !totalExpense.isNumber()) {
                errors.put("totalExpense", "총 경비가 필요합니다.");
            } else if (totalExpense.asLong() < 0) {
                errors.put("totalExpense", "총 경비는 0 이상이어야 합니다.");
            }
        }

        if (!errors.isEmpty()) {
            throw new FormValidationException(errors);
        }
    }
}

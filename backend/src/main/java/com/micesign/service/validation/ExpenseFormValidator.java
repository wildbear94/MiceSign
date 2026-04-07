package com.micesign.service.validation;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.micesign.common.exception.BusinessException;
import com.micesign.common.exception.FormValidationException;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Validator for EXPENSE template.
 * Validates: items array with description/quantity/unitPrice/amount, totalAmount matches sum.
 */
@Component
public class ExpenseFormValidator implements FormValidationStrategy {

    private final ObjectMapper objectMapper;

    public ExpenseFormValidator(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    @Override
    public String getTemplateCode() {
        return "EXPENSE";
    }

    @Override
    public void validate(String bodyHtml, String formDataJson) {
        if (!StringUtils.hasText(formDataJson)) {
            throw new BusinessException("DOC_INVALID_FORM_DATA", "지출 결의서는 양식 데이터가 필요합니다.");
        }

        JsonNode root;
        try {
            root = objectMapper.readTree(formDataJson);
        } catch (Exception e) {
            throw new BusinessException("DOC_INVALID_FORM_DATA", "양식 데이터 JSON 파싱에 실패했습니다.");
        }

        Map<String, String> errors = new LinkedHashMap<>();

        // items array validation
        JsonNode items = root.get("items");
        if (items == null || !items.isArray()) {
            errors.put("items", "지출 항목(items) 배열이 필요합니다.");
        } else if (items.isEmpty()) {
            errors.put("items", "지출 항목이 최소 1개 이상 필요합니다.");
        } else {
            long calculatedSum = 0;
            for (int i = 0; i < items.size(); i++) {
                JsonNode item = items.get(i);
                String prefix = "items[" + i + "]";

                JsonNode description = item.get("description");
                if (description == null && item.has("name")) {
                    description = item.get("name");
                }
                if (description == null || !description.isTextual() || description.asText().isBlank()) {
                    errors.put(prefix + ".description", "항목 설명이 필요합니다.");
                }

                JsonNode quantity = item.get("quantity");
                if (quantity == null || !quantity.isNumber() || quantity.asInt() <= 0) {
                    errors.put(prefix + ".quantity", "수량은 1 이상이어야 합니다.");
                }

                JsonNode unitPrice = item.get("unitPrice");
                if (unitPrice == null || !unitPrice.isNumber() || unitPrice.asLong() < 0) {
                    errors.put(prefix + ".unitPrice", "단가는 0 이상이어야 합니다.");
                }

                JsonNode amount = item.get("amount");
                if (amount == null || !amount.isNumber() || amount.asLong() < 0) {
                    errors.put(prefix + ".amount", "금액은 0 이상이어야 합니다.");
                } else {
                    calculatedSum += amount.asLong();
                }
            }

            // totalAmount validation
            JsonNode totalAmount = root.get("totalAmount");
            if (totalAmount == null || !totalAmount.isNumber()) {
                errors.put("totalAmount", "총액(totalAmount)이 필요합니다.");
            } else if (totalAmount.asLong() < 0) {
                errors.put("totalAmount", "총액은 0 이상이어야 합니다.");
            } else if (totalAmount.asLong() != calculatedSum) {
                errors.put("totalAmount",
                        "총액(" + totalAmount.asLong() + ")이 항목 합계(" + calculatedSum + ")와 일치하지 않습니다.");
            }
        }

        if (!errors.isEmpty()) {
            throw new FormValidationException(errors);
        }
    }
}

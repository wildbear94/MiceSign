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
 * Validator for PURCHASE template.
 * Validates: items array with description/quantity/unitPrice/amount, totalAmount.
 */
@Component
public class PurchaseFormValidator implements FormValidationStrategy {

    private final ObjectMapper objectMapper;

    public PurchaseFormValidator(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    @Override
    public String getTemplateCode() {
        return "PURCHASE";
    }

    @Override
    public void validate(String bodyHtml, String formDataJson) {
        if (!StringUtils.hasText(formDataJson)) {
            throw new BusinessException("DOC_INVALID_FORM_DATA", "구매 요청서는 양식 데이터가 필요합니다.");
        }

        JsonNode root;
        try {
            root = objectMapper.readTree(formDataJson);
        } catch (Exception e) {
            throw new BusinessException("DOC_INVALID_FORM_DATA", "양식 데이터 JSON 파싱에 실패했습니다.");
        }

        Map<String, String> errors = new LinkedHashMap<>();

        // supplier
        JsonNode supplier = root.get("supplier");
        if (supplier == null || !supplier.isTextual() || supplier.asText().isBlank()) {
            errors.put("supplier", "납품업체명이 필요합니다.");
        }

        // deliveryDate
        JsonNode deliveryDate = root.get("deliveryDate");
        if (deliveryDate == null || !deliveryDate.isTextual() || deliveryDate.asText().isBlank()) {
            errors.put("deliveryDate", "희망 납품일이 필요합니다.");
        }

        // purchaseReason
        JsonNode purchaseReason = root.get("purchaseReason");
        if (purchaseReason == null || !purchaseReason.isTextual() || purchaseReason.asText().isBlank()) {
            errors.put("purchaseReason", "구매 사유가 필요합니다.");
        }

        // items array
        JsonNode items = root.get("items");
        if (items == null || !items.isArray()) {
            errors.put("items", "구매 품목(items) 배열이 필요합니다.");
        } else if (items.isEmpty()) {
            errors.put("items", "구매 품목이 최소 1개 이상 필요합니다.");
        } else {
            long calculatedSum = 0;
            for (int i = 0; i < items.size(); i++) {
                JsonNode item = items.get(i);
                String prefix = "items[" + i + "]";

                JsonNode name = item.get("name");
                if (name == null || !name.isTextual() || name.asText().isBlank()) {
                    errors.put(prefix + ".name", "품목명이 필요합니다.");
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

            // totalAmount
            JsonNode totalAmount = root.get("totalAmount");
            if (totalAmount == null || !totalAmount.isNumber()) {
                errors.put("totalAmount", "총액이 필요합니다.");
            } else if (totalAmount.asLong() < 0) {
                errors.put("totalAmount", "총액은 0 이상이어야 합니다.");
            }
        }

        if (!errors.isEmpty()) {
            throw new FormValidationException(errors);
        }
    }
}

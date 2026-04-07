package com.micesign.service.validation;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.micesign.common.exception.BusinessException;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

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

        // supplier
        JsonNode supplier = root.get("supplier");
        if (supplier == null || !supplier.isTextual() || supplier.asText().isBlank()) {
            throw new BusinessException("DOC_INVALID_FORM_DATA", "납품업체명(supplier)이 필요합니다.");
        }

        // deliveryDate
        JsonNode deliveryDate = root.get("deliveryDate");
        if (deliveryDate == null || !deliveryDate.isTextual() || deliveryDate.asText().isBlank()) {
            throw new BusinessException("DOC_INVALID_FORM_DATA", "희망 납품일(deliveryDate)이 필요합니다.");
        }

        // purchaseReason
        JsonNode purchaseReason = root.get("purchaseReason");
        if (purchaseReason == null || !purchaseReason.isTextual() || purchaseReason.asText().isBlank()) {
            throw new BusinessException("DOC_INVALID_FORM_DATA", "구매 사유(purchaseReason)가 필요합니다.");
        }

        // items array
        JsonNode items = root.get("items");
        if (items == null || !items.isArray()) {
            throw new BusinessException("DOC_INVALID_FORM_DATA", "구매 품목(items) 배열이 필요합니다.");
        }
        if (items.isEmpty()) {
            throw new BusinessException("DOC_INVALID_FORM_DATA", "구매 품목이 최소 1개 이상 필요합니다.");
        }

        for (int i = 0; i < items.size(); i++) {
            validatePurchaseItem(items.get(i), i);
        }

        // totalAmount
        JsonNode totalAmount = root.get("totalAmount");
        if (totalAmount == null || !totalAmount.isNumber()) {
            throw new BusinessException("DOC_INVALID_FORM_DATA", "총액(totalAmount)이 필요합니다.");
        }
        if (totalAmount.asLong() < 0) {
            throw new BusinessException("DOC_INVALID_FORM_DATA", "총액은 0 이상이어야 합니다.");
        }
    }

    private void validatePurchaseItem(JsonNode item, int index) {
        String prefix = "구매 품목[" + index + "]";

        JsonNode name = item.get("name");
        if (name == null || !name.isTextual() || name.asText().isBlank()) {
            throw new BusinessException("DOC_INVALID_FORM_DATA", prefix + ": 품목명(name)이 필요합니다.");
        }

        // spec is optional

        JsonNode quantity = item.get("quantity");
        if (quantity == null || !quantity.isInt() || quantity.asInt() <= 0) {
            throw new BusinessException("DOC_INVALID_FORM_DATA", prefix + ": 수량(quantity)은 1 이상이어야 합니다.");
        }

        JsonNode unitPrice = item.get("unitPrice");
        if (unitPrice == null || !unitPrice.isNumber() || unitPrice.asLong() < 0) {
            throw new BusinessException("DOC_INVALID_FORM_DATA", prefix + ": 단가(unitPrice)는 0 이상이어야 합니다.");
        }

        JsonNode amount = item.get("amount");
        if (amount == null || !amount.isNumber() || amount.asLong() < 0) {
            throw new BusinessException("DOC_INVALID_FORM_DATA", prefix + ": 금액(amount)은 0 이상이어야 합니다.");
        }
    }
}

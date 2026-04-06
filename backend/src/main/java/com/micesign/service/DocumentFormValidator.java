package com.micesign.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.micesign.common.exception.BusinessException;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

@Component
public class DocumentFormValidator {

    private final ObjectMapper objectMapper;

    public DocumentFormValidator(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    public void validate(String templateCode, String bodyHtml, String formDataJson, String schemaDefinition) {
        switch (templateCode) {
            case "GENERAL" -> validateGeneralFormData(bodyHtml);
            case "EXPENSE" -> validateExpenseFormData(formDataJson);
            case "LEAVE" -> validateLeaveFormData(formDataJson);
            default -> {
                if (schemaDefinition != null) {
                    validateDynamicFormData(templateCode, formDataJson, schemaDefinition);
                } else {
                    throw new BusinessException("TPL_UNKNOWN", "알 수 없는 양식 코드입니다: " + templateCode);
                }
            }
        }
    }

    private void validateDynamicFormData(String templateCode, String formDataJson, String schemaDefinition) {
        if (!StringUtils.hasText(formDataJson)) {
            throw new BusinessException("DOC_INVALID_FORM_DATA", templateCode + " 양식은 양식 데이터가 필요합니다.");
        }

        JsonNode schema;
        JsonNode formData;
        try {
            schema = objectMapper.readTree(schemaDefinition);
            formData = objectMapper.readTree(formDataJson);
        } catch (Exception e) {
            throw new BusinessException("DOC_INVALID_FORM_DATA", "JSON 파싱에 실패했습니다.");
        }

        JsonNode fields = schema.get("fields");
        if (fields == null || !fields.isArray()) {
            return; // No fields to validate
        }

        for (JsonNode field : fields) {
            boolean required = field.has("required") && field.get("required").asBoolean(false);
            if (!required) continue;

            String fieldId = field.get("id").asText();
            String fieldType = field.get("type").asText();
            JsonNode value = formData.get(fieldId);

            if ("table".equals(fieldType)) {
                // Table: must be array with minRows
                if (value == null || !value.isArray()) {
                    throw new BusinessException("DOC_INVALID_FORM_DATA",
                            fieldId + " 필드는 배열이어야 합니다.");
                }
                int minRows = 0;
                if (field.has("config") && field.get("config").has("minRows")) {
                    minRows = field.get("config").get("minRows").asInt(0);
                }
                if (value.size() < minRows) {
                    throw new BusinessException("DOC_INVALID_FORM_DATA",
                            fieldId + " 필드는 최소 " + minRows + "개 행이 필요합니다.");
                }
            } else {
                // Non-table required field: must exist and not be empty string
                if (value == null || value.isNull()) {
                    throw new BusinessException("DOC_INVALID_FORM_DATA",
                            fieldId + " 필드는 필수입니다.");
                }
                if (value.isTextual() && value.asText().isBlank()) {
                    throw new BusinessException("DOC_INVALID_FORM_DATA",
                            fieldId + " 필드는 필수입니다.");
                }
            }
        }
    }

    private void validateGeneralFormData(String bodyHtml) {
        if (!StringUtils.hasText(bodyHtml)) {
            throw new BusinessException("DOC_INVALID_FORM_DATA", "일반 기안은 본문 내용이 필요합니다.");
        }
    }

    private void validateExpenseFormData(String formDataJson) {
        if (!StringUtils.hasText(formDataJson)) {
            throw new BusinessException("DOC_INVALID_FORM_DATA", "지출 결의서는 양식 데이터가 필요합니다.");
        }

        JsonNode root;
        try {
            root = objectMapper.readTree(formDataJson);
        } catch (Exception e) {
            throw new BusinessException("DOC_INVALID_FORM_DATA", "양식 데이터 JSON 파싱에 실패했습니다.");
        }

        // items array validation
        JsonNode items = root.get("items");
        if (items == null || !items.isArray()) {
            throw new BusinessException("DOC_INVALID_FORM_DATA", "지출 항목(items) 배열이 필요합니다.");
        }
        if (items.isEmpty()) {
            throw new BusinessException("DOC_INVALID_FORM_DATA", "지출 항목이 최소 1개 이상 필요합니다.");
        }

        for (int i = 0; i < items.size(); i++) {
            JsonNode item = items.get(i);
            validateExpenseItem(item, i);
        }

        // totalAmount validation
        JsonNode totalAmount = root.get("totalAmount");
        if (totalAmount == null || !totalAmount.isNumber()) {
            throw new BusinessException("DOC_INVALID_FORM_DATA", "총액(totalAmount)이 필요합니다.");
        }
        if (totalAmount.asLong() < 0) {
            throw new BusinessException("DOC_INVALID_FORM_DATA", "총액은 0 이상이어야 합니다.");
        }
    }

    private void validateExpenseItem(JsonNode item, int index) {
        String prefix = "지출 항목[" + index + "]";

        JsonNode name = item.get("name");
        if (name == null || !name.isTextual() || name.asText().isBlank()) {
            throw new BusinessException("DOC_INVALID_FORM_DATA", prefix + ": 항목명(name)이 필요합니다.");
        }

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

    private void validateLeaveFormData(String formDataJson) {
        if (!StringUtils.hasText(formDataJson)) {
            throw new BusinessException("DOC_INVALID_FORM_DATA", "휴가 신청서는 양식 데이터가 필요합니다.");
        }

        JsonNode root;
        try {
            root = objectMapper.readTree(formDataJson);
        } catch (Exception e) {
            throw new BusinessException("DOC_INVALID_FORM_DATA", "양식 데이터 JSON 파싱에 실패했습니다.");
        }

        // leaveTypeId
        JsonNode leaveTypeId = root.get("leaveTypeId");
        if (leaveTypeId == null || !leaveTypeId.isNumber() || leaveTypeId.asLong() <= 0) {
            throw new BusinessException("DOC_INVALID_FORM_DATA", "휴가 유형(leaveTypeId)이 필요합니다.");
        }

        // startDate
        JsonNode startDate = root.get("startDate");
        if (startDate == null || !startDate.isTextual() || startDate.asText().isBlank()) {
            throw new BusinessException("DOC_INVALID_FORM_DATA", "시작일(startDate)이 필요합니다.");
        }

        // days
        JsonNode days = root.get("days");
        if (days == null || !days.isNumber() || days.asDouble() <= 0) {
            throw new BusinessException("DOC_INVALID_FORM_DATA", "사용일수(days)는 0보다 커야 합니다.");
        }

        // reason
        JsonNode reason = root.get("reason");
        if (reason == null || !reason.isTextual() || reason.asText().isBlank()) {
            throw new BusinessException("DOC_INVALID_FORM_DATA", "사유(reason)가 필요합니다.");
        }
    }
}

package com.micesign.service.validation;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.micesign.common.exception.BusinessException;
import com.micesign.common.exception.FormValidationException;
import com.micesign.domain.ApprovalTemplate;
import com.micesign.repository.ApprovalTemplateRepository;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Dynamic form validator that validates formData against a JSON schema definition.
 * Checks required fields, type matching, min/max for numbers, minLength/maxLength for strings.
 */
@Component
public class DynamicFormValidator {

    private final ApprovalTemplateRepository templateRepository;
    private final ObjectMapper objectMapper;

    public DynamicFormValidator(ApprovalTemplateRepository templateRepository,
                                ObjectMapper objectMapper) {
        this.templateRepository = templateRepository;
        this.objectMapper = objectMapper;
    }

    /**
     * Validate formData against the template's schema definition.
     * Throws FormValidationException on field-level errors.
     */
    public void validate(String templateCode, String formDataJson) {
        ApprovalTemplate template = templateRepository.findByCode(templateCode)
                .orElseThrow(() -> new BusinessException("TPL_NOT_FOUND", "양식을 찾을 수 없습니다."));

        if (template.getSchemaDefinition() == null) {
            // No schema defined -- skip validation
            return;
        }

        try {
            JsonNode schema = objectMapper.readTree(template.getSchemaDefinition());
            JsonNode formData = (formDataJson != null && !formDataJson.isBlank())
                    ? objectMapper.readTree(formDataJson) : objectMapper.createObjectNode();
            Map<String, List<String>> errors = new LinkedHashMap<>();

            JsonNode fields = schema.get("fields");
            if (fields != null && fields.isArray()) {
                for (JsonNode field : fields) {
                    String fieldId = field.get("id").asText();
                    String type = field.get("type").asText();
                    boolean required = field.has("required") && field.get("required").asBoolean();
                    JsonNode config = field.get("config");
                    JsonNode value = formData.get(fieldId);

                    validateField(fieldId, type, required, config, value, errors);
                }
            }

            if (!errors.isEmpty()) {
                throw FormValidationException.fromMultiErrors(errors);
            }
        } catch (FormValidationException e) {
            throw e;
        } catch (Exception e) {
            throw new BusinessException("SCHEMA_PARSE_ERROR",
                    "스키마 검증 중 오류가 발생했습니다: " + e.getMessage());
        }
    }

    /**
     * Validate formData against a provided schema definition string (for snapshot validation).
     */
    public void validateAgainstSchema(String schemaDefinition, String formDataJson) {
        if (schemaDefinition == null) {
            return;
        }

        try {
            JsonNode schema = objectMapper.readTree(schemaDefinition);
            JsonNode formData = (formDataJson != null && !formDataJson.isBlank())
                    ? objectMapper.readTree(formDataJson) : objectMapper.createObjectNode();
            Map<String, List<String>> errors = new LinkedHashMap<>();

            JsonNode fields = schema.get("fields");
            if (fields != null && fields.isArray()) {
                for (JsonNode field : fields) {
                    String fieldId = field.get("id").asText();
                    String type = field.get("type").asText();
                    boolean required = field.has("required") && field.get("required").asBoolean();
                    JsonNode config = field.get("config");
                    JsonNode value = formData.get(fieldId);

                    validateField(fieldId, type, required, config, value, errors);
                }
            }

            if (!errors.isEmpty()) {
                throw FormValidationException.fromMultiErrors(errors);
            }
        } catch (FormValidationException e) {
            throw e;
        } catch (Exception e) {
            throw new BusinessException("SCHEMA_PARSE_ERROR",
                    "스키마 검증 중 오류가 발생했습니다: " + e.getMessage());
        }
    }

    private void validateField(String fieldId, String type, boolean required,
                               JsonNode config, JsonNode value,
                               Map<String, List<String>> errors) {
        boolean isEmpty = (value == null || value.isNull()
                || (value.isTextual() && value.asText().isBlank()));

        // staticText, hidden are not user input -- skip
        if ("staticText".equals(type) || "hidden".equals(type)) return;

        // Required check
        if (required && isEmpty) {
            addError(errors, fieldId, "필수 입력 항목입니다.");
            return;
        }
        if (isEmpty) return;

        // Type-specific validation
        switch (type) {
            case "text", "textarea" -> validateText(fieldId, config, value, errors);
            case "number" -> validateNumber(fieldId, config, value, errors);
            case "date" -> validateDate(fieldId, value, errors);
            case "select" -> validateSelect(fieldId, value, errors);
            case "table" -> validateTable(fieldId, config, value, errors);
        }
    }

    private void validateText(String fieldId, JsonNode config, JsonNode value,
                              Map<String, List<String>> errors) {
        if (!value.isTextual()) {
            addError(errors, fieldId, "텍스트 형식이어야 합니다.");
            return;
        }
        String text = value.asText();
        if (config != null) {
            if (config.has("minLength") && text.length() < config.get("minLength").asInt()) {
                addError(errors, fieldId, "최소 " + config.get("minLength").asInt() + "자 이상 입력해주세요.");
            }
            if (config.has("maxLength") && text.length() > config.get("maxLength").asInt()) {
                addError(errors, fieldId, "최대 " + config.get("maxLength").asInt() + "자까지 입력 가능합니다.");
            }
        }
    }

    private void validateNumber(String fieldId, JsonNode config, JsonNode value,
                                Map<String, List<String>> errors) {
        if (!value.isNumber()) {
            try {
                Long.parseLong(value.asText());
            } catch (NumberFormatException e) {
                addError(errors, fieldId, "숫자 형식이어야 합니다.");
                return;
            }
        }
        long numValue = value.asLong();
        if (config != null) {
            if (config.has("min") && numValue < config.get("min").asLong()) {
                addError(errors, fieldId, "최소값은 " + config.get("min").asLong() + "입니다.");
            }
            if (config.has("max") && numValue > config.get("max").asLong()) {
                addError(errors, fieldId, "최대값은 " + config.get("max").asLong() + "입니다.");
            }
        }
    }

    private void validateDate(String fieldId, JsonNode value,
                              Map<String, List<String>> errors) {
        if (!value.isTextual()) {
            addError(errors, fieldId, "날짜 형식이어야 합니다.");
            return;
        }
        try {
            LocalDate.parse(value.asText());
        } catch (DateTimeParseException e) {
            addError(errors, fieldId, "날짜 형식이 올바르지 않습니다. (yyyy-MM-dd)");
        }
    }

    private void validateSelect(String fieldId, JsonNode value,
                                Map<String, List<String>> errors) {
        if (!value.isTextual()) {
            addError(errors, fieldId, "선택 값은 텍스트여야 합니다.");
        }
    }

    private void validateTable(String fieldId, JsonNode config, JsonNode value,
                               Map<String, List<String>> errors) {
        if (!value.isArray()) {
            addError(errors, fieldId, "테이블 데이터는 배열이어야 합니다.");
            return;
        }
        ArrayNode rows = (ArrayNode) value;

        if (config != null) {
            if (config.has("minRows") && rows.size() < config.get("minRows").asInt()) {
                addError(errors, fieldId, "최소 " + config.get("minRows").asInt() + "행이 필요합니다.");
            }
            if (config.has("maxRows") && rows.size() > config.get("maxRows").asInt()) {
                addError(errors, fieldId, "최대 " + config.get("maxRows").asInt() + "행까지 입력 가능합니다.");
            }

            // Column-level cell validation
            JsonNode columns = config.get("columns");
            if (columns != null && columns.isArray()) {
                for (int rowIdx = 0; rowIdx < rows.size(); rowIdx++) {
                    JsonNode row = rows.get(rowIdx);
                    for (JsonNode col : columns) {
                        String colId = col.get("id").asText();
                        String colType = col.get("type").asText();
                        boolean colRequired = col.has("required") && col.get("required").asBoolean();
                        JsonNode colConfig = col.get("config");
                        JsonNode cellValue = row != null ? row.get(colId) : null;

                        String cellKey = fieldId + ".rows[" + rowIdx + "]." + colId;
                        validateField(cellKey, colType, colRequired, colConfig, cellValue, errors);
                    }
                }
            }
        }
    }

    private void addError(Map<String, List<String>> errors, String fieldId, String message) {
        errors.computeIfAbsent(fieldId, k -> new ArrayList<>()).add(message);
    }
}

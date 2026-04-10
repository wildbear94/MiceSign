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
 * Validator for OVERTIME template.
 * Validates: date (workDate), startTime, endTime, hours (> 0), reason.
 */
@Component
public class OvertimeFormValidator implements FormValidationStrategy {

    private final ObjectMapper objectMapper;

    public OvertimeFormValidator(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    @Override
    public String getTemplateCode() {
        return "OVERTIME";
    }

    @Override
    public void validate(String bodyHtml, String formDataJson) {
        if (!StringUtils.hasText(formDataJson)) {
            throw new BusinessException("DOC_INVALID_FORM_DATA", "연장 근무 신청서는 양식 데이터가 필요합니다.");
        }

        JsonNode root;
        try {
            root = objectMapper.readTree(formDataJson);
        } catch (Exception e) {
            throw new BusinessException("DOC_INVALID_FORM_DATA", "양식 데이터 JSON 파싱에 실패했습니다.");
        }

        Map<String, String> errors = new LinkedHashMap<>();

        // workDate
        JsonNode workDate = root.get("workDate");
        if (workDate == null || !workDate.isTextual() || workDate.asText().isBlank()) {
            errors.put("workDate", "근무 날짜가 필요합니다.");
        }

        // startTime
        JsonNode startTime = root.get("startTime");
        if (startTime == null || !startTime.isTextual() || startTime.asText().isBlank()) {
            errors.put("startTime", "시작 시간이 필요합니다.");
        }

        // endTime
        JsonNode endTime = root.get("endTime");
        if (endTime == null || !endTime.isTextual() || endTime.asText().isBlank()) {
            errors.put("endTime", "종료 시간이 필요합니다.");
        }

        // hours > 0
        JsonNode hours = root.get("hours");
        if (hours == null || !hours.isNumber() || hours.asDouble() <= 0) {
            errors.put("hours", "근무 시간은 0보다 커야 합니다.");
        }

        // reason
        JsonNode reason = root.get("reason");
        if (reason == null || !reason.isTextual() || reason.asText().isBlank()) {
            errors.put("reason", "사유가 필요합니다.");
        }

        if (!errors.isEmpty()) {
            throw new FormValidationException(errors);
        }
    }
}

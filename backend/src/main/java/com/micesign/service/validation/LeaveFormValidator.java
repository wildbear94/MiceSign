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
 * Validator for LEAVE template.
 * Validates: leaveType, startDate, endDate (end >= start), days > 0.
 */
@Component
public class LeaveFormValidator implements FormValidationStrategy {

    private final ObjectMapper objectMapper;

    public LeaveFormValidator(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    @Override
    public String getTemplateCode() {
        return "LEAVE";
    }

    @Override
    public void validate(String bodyHtml, String formDataJson) {
        if (!StringUtils.hasText(formDataJson)) {
            throw new BusinessException("DOC_INVALID_FORM_DATA", "휴가 신청서는 양식 데이터가 필요합니다.");
        }

        JsonNode root;
        try {
            root = objectMapper.readTree(formDataJson);
        } catch (Exception e) {
            throw new BusinessException("DOC_INVALID_FORM_DATA", "양식 데이터 JSON 파싱에 실패했습니다.");
        }

        Map<String, String> errors = new LinkedHashMap<>();

        // leaveType (leaveTypeId)
        JsonNode leaveTypeId = root.get("leaveTypeId");
        if (leaveTypeId == null || !leaveTypeId.isNumber() || leaveTypeId.asLong() <= 0) {
            errors.put("leaveTypeId", "휴가 유형을 선택해주세요.");
        }

        // startDate
        LocalDate start = null;
        JsonNode startDate = root.get("startDate");
        if (startDate == null || !startDate.isTextual() || startDate.asText().isBlank()) {
            errors.put("startDate", "시작일이 필요합니다.");
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
        if (endDate != null && endDate.isTextual() && !endDate.asText().isBlank()) {
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

        // days > 0
        JsonNode days = root.get("days");
        if (days == null || !days.isNumber() || days.asDouble() <= 0) {
            errors.put("days", "사용일수는 0보다 커야 합니다.");
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

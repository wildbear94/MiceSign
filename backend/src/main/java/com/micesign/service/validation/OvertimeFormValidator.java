package com.micesign.service.validation;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.micesign.common.exception.BusinessException;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

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

        // workDate
        JsonNode workDate = root.get("workDate");
        if (workDate == null || !workDate.isTextual() || workDate.asText().isBlank()) {
            throw new BusinessException("DOC_INVALID_FORM_DATA", "근무 날짜(workDate)가 필요합니다.");
        }

        // startTime
        JsonNode startTime = root.get("startTime");
        if (startTime == null || !startTime.isTextual() || startTime.asText().isBlank()) {
            throw new BusinessException("DOC_INVALID_FORM_DATA", "시작 시간(startTime)이 필요합니다.");
        }

        // endTime
        JsonNode endTime = root.get("endTime");
        if (endTime == null || !endTime.isTextual() || endTime.asText().isBlank()) {
            throw new BusinessException("DOC_INVALID_FORM_DATA", "종료 시간(endTime)이 필요합니다.");
        }

        // hours
        JsonNode hours = root.get("hours");
        if (hours == null || !hours.isNumber() || hours.asDouble() <= 0) {
            throw new BusinessException("DOC_INVALID_FORM_DATA", "근무 시간(hours)은 0보다 커야 합니다.");
        }

        // reason
        JsonNode reason = root.get("reason");
        if (reason == null || !reason.isTextual() || reason.asText().isBlank()) {
            throw new BusinessException("DOC_INVALID_FORM_DATA", "사유(reason)가 필요합니다.");
        }
    }
}

package com.micesign.service.validation;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.micesign.common.exception.BusinessException;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

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

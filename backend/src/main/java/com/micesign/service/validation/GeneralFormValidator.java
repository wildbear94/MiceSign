package com.micesign.service.validation;

import com.micesign.common.exception.BusinessException;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

@Component
public class GeneralFormValidator implements FormValidationStrategy {

    @Override
    public String getTemplateCode() {
        return "GENERAL";
    }

    @Override
    public void validate(String bodyHtml, String formDataJson) {
        if (!StringUtils.hasText(bodyHtml)) {
            throw new BusinessException("DOC_INVALID_FORM_DATA", "일반 기안은 본문 내용이 필요합니다.");
        }
    }
}

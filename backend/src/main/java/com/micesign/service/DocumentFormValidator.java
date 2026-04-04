package com.micesign.service;

import com.micesign.common.exception.BusinessException;
import com.micesign.service.validation.FormValidationStrategy;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

@Component
public class DocumentFormValidator {

    private final Map<String, FormValidationStrategy> strategies;

    public DocumentFormValidator(List<FormValidationStrategy> strategyList) {
        this.strategies = strategyList.stream()
            .collect(Collectors.toMap(
                FormValidationStrategy::getTemplateCode,
                Function.identity()
            ));
    }

    public void validate(String templateCode, String bodyHtml, String formDataJson) {
        FormValidationStrategy strategy = strategies.get(templateCode);
        if (strategy == null) {
            throw new BusinessException("TPL_UNKNOWN", "알 수 없는 양식 코드입니다: " + templateCode);
        }
        strategy.validate(bodyHtml, formDataJson);
    }
}

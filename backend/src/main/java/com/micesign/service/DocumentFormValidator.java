package com.micesign.service;

import com.micesign.service.validation.DynamicFormValidator;
import com.micesign.service.validation.FormValidationStrategy;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

@Component
public class DocumentFormValidator {

    private final Map<String, FormValidationStrategy> strategies;
    private final DynamicFormValidator dynamicFormValidator;

    public DocumentFormValidator(List<FormValidationStrategy> strategyList,
                                 DynamicFormValidator dynamicFormValidator) {
        this.strategies = strategyList.stream()
            .collect(Collectors.toMap(
                FormValidationStrategy::getTemplateCode,
                Function.identity()
            ));
        this.dynamicFormValidator = dynamicFormValidator;
    }

    public void validate(String templateCode, String bodyHtml, String formDataJson) {
        FormValidationStrategy strategy = strategies.get(templateCode);
        if (strategy != null) {
            // 기존 하드코딩 양식: 기존 검증 그대로 사용
            strategy.validate(bodyHtml, formDataJson);
        } else {
            // 동적 템플릿: DynamicFormValidator로 fallback
            dynamicFormValidator.validate(templateCode, formDataJson);
        }
    }
}

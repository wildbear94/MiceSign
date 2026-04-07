package com.micesign.service;

import com.micesign.service.validation.DynamicFormValidator;
import com.micesign.service.validation.FormValidationStrategy;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * Strategy-based form validation dispatcher.
 * Routes validation to hardcoded validators by template code,
 * or falls back to DynamicFormValidator for custom/dynamic templates.
 */
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

    /**
     * Validate form data for a given template.
     *
     * @param templateCode  the template code (e.g., GENERAL, EXPENSE, LEAVE)
     * @param bodyHtml      the document body HTML (used by some validators like GENERAL)
     * @param formDataJson  the form data JSON string
     */
    public void validate(String templateCode, String bodyHtml, String formDataJson) {
        FormValidationStrategy strategy = strategies.get(templateCode);
        if (strategy != null) {
            // Hardcoded form: use registered validator
            strategy.validate(bodyHtml, formDataJson);
        } else {
            // Dynamic template: delegate to DynamicFormValidator
            dynamicFormValidator.validate(templateCode, formDataJson);
        }
    }
}

package com.micesign.service.validation;

public interface FormValidationStrategy {
    String getTemplateCode();
    void validate(String bodyHtml, String formDataJson);
}

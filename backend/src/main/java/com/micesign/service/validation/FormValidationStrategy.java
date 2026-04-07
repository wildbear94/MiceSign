package com.micesign.service.validation;

/**
 * Interface for hardcoded form validators.
 * Each implementation validates form data for a specific template code.
 */
public interface FormValidationStrategy {

    /**
     * Returns the template code this validator handles (e.g., "GENERAL", "EXPENSE").
     */
    String getTemplateCode();

    /**
     * Validate the form data.
     *
     * @param bodyHtml     the document body HTML content
     * @param formDataJson the form data as a JSON string
     * @throws com.micesign.common.exception.BusinessException       on validation failure
     * @throws com.micesign.common.exception.FormValidationException on field-level errors
     */
    void validate(String bodyHtml, String formDataJson);
}

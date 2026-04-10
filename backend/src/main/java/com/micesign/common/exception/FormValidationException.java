package com.micesign.common.exception;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

public class FormValidationException extends RuntimeException {

    private final Map<String, String> fieldErrors;

    public FormValidationException(Map<String, String> fieldErrors) {
        super("Form validation failed");
        this.fieldErrors = fieldErrors;
    }

    /**
     * Convenience constructor that accepts multi-error map (used by DynamicFormValidator).
     * Joins multiple messages per field with "; ".
     */
    public static FormValidationException fromMultiErrors(Map<String, List<String>> multiErrors) {
        Map<String, String> flat = multiErrors.entrySet().stream()
            .collect(Collectors.toMap(
                Map.Entry::getKey,
                e -> String.join("; ", e.getValue())
            ));
        return new FormValidationException(flat);
    }

    public Map<String, String> getFieldErrors() {
        return fieldErrors;
    }
}

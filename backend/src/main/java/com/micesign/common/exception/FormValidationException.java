package com.micesign.common.exception;

import java.util.List;
import java.util.Map;

public class FormValidationException extends RuntimeException {

    private final Map<String, List<String>> fieldErrors;

    public FormValidationException(Map<String, List<String>> fieldErrors) {
        super("Form validation failed");
        this.fieldErrors = fieldErrors;
    }

    public Map<String, List<String>> getFieldErrors() {
        return fieldErrors;
    }
}

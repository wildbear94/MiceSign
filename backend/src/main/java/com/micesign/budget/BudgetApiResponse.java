package com.micesign.budget;

public class BudgetApiResponse {

    private boolean success;
    private String message;
    private String referenceId; // budget system's reference ID

    public BudgetApiResponse() {
    }

    public BudgetApiResponse(boolean success, String message, String referenceId) {
        this.success = success;
        this.message = message;
        this.referenceId = referenceId;
    }

    public boolean isSuccess() {
        return success;
    }

    public void setSuccess(boolean success) {
        this.success = success;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }

    public String getReferenceId() {
        return referenceId;
    }

    public void setReferenceId(String referenceId) {
        this.referenceId = referenceId;
    }
}

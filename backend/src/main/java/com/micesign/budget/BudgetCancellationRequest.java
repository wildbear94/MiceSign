package com.micesign.budget;

import java.time.LocalDateTime;

public class BudgetCancellationRequest {

    private String documentNumber;
    private String templateCode;
    private String reason; // "REJECTED" or "WITHDRAWN"
    private LocalDateTime cancelledAt;

    public BudgetCancellationRequest() {
    }

    public BudgetCancellationRequest(String documentNumber, String templateCode,
                                      String reason, LocalDateTime cancelledAt) {
        this.documentNumber = documentNumber;
        this.templateCode = templateCode;
        this.reason = reason;
        this.cancelledAt = cancelledAt;
    }

    public String getDocumentNumber() {
        return documentNumber;
    }

    public void setDocumentNumber(String documentNumber) {
        this.documentNumber = documentNumber;
    }

    public String getTemplateCode() {
        return templateCode;
    }

    public void setTemplateCode(String templateCode) {
        this.templateCode = templateCode;
    }

    public String getReason() {
        return reason;
    }

    public void setReason(String reason) {
        this.reason = reason;
    }

    public LocalDateTime getCancelledAt() {
        return cancelledAt;
    }

    public void setCancelledAt(LocalDateTime cancelledAt) {
        this.cancelledAt = cancelledAt;
    }
}

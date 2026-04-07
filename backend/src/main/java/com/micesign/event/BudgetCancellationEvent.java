package com.micesign.event;

/**
 * Event for budget cancellation on document withdrawal or rejection.
 * Published after transaction commit; consumed by BudgetIntegrationService.
 */
public class BudgetCancellationEvent {

    private final Long documentId;
    private final String templateCode;
    private final String docNumber;

    public BudgetCancellationEvent(Long documentId, String templateCode, String docNumber) {
        this.documentId = documentId;
        this.templateCode = templateCode;
        this.docNumber = docNumber;
    }

    public Long getDocumentId() {
        return documentId;
    }

    public String getTemplateCode() {
        return templateCode;
    }

    public String getDocNumber() {
        return docNumber;
    }
}

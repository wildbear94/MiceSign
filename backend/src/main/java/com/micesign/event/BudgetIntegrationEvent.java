package com.micesign.event;

/**
 * Event for budget integration on document submission.
 * Published after transaction commit; consumed by BudgetIntegrationService.
 */
public class BudgetIntegrationEvent {

    private final Long documentId;
    private final String templateCode;
    private final String docNumber;
    private final Long drafterId;

    public BudgetIntegrationEvent(Long documentId, String templateCode,
                                  String docNumber, Long drafterId) {
        this.documentId = documentId;
        this.templateCode = templateCode;
        this.docNumber = docNumber;
        this.drafterId = drafterId;
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

    public Long getDrafterId() {
        return drafterId;
    }
}

package com.micesign.event;

public class BudgetCancellationEvent {

    private final Long documentId;
    private final String templateCode;
    private final String docNumber;
    private final Long actorUserId;
    private final String reason; // "REJECTED" or "WITHDRAWN"

    public BudgetCancellationEvent(Long documentId, String templateCode, String docNumber,
                                    Long actorUserId, String reason) {
        this.documentId = documentId;
        this.templateCode = templateCode;
        this.docNumber = docNumber;
        this.actorUserId = actorUserId;
        this.reason = reason;
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

    public Long getActorUserId() {
        return actorUserId;
    }

    public String getReason() {
        return reason;
    }
}

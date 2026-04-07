package com.micesign.event;

/**
 * Spring event for approval-related email notifications.
 * Published after transaction commit; consumed by notification handlers.
 * Does not extend ApplicationEvent (Spring 4.2+ supports POJO events).
 */
public class ApprovalNotificationEvent {

    private final Long documentId;
    private final String eventType;
    private final Long actorId;

    public ApprovalNotificationEvent(Long documentId, String eventType, Long actorId) {
        this.documentId = documentId;
        this.eventType = eventType;
        this.actorId = actorId;
    }

    public Long getDocumentId() {
        return documentId;
    }

    public String getEventType() {
        return eventType;
    }

    public Long getActorId() {
        return actorId;
    }
}

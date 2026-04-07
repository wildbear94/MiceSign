package com.micesign.event;

import com.micesign.domain.Document;
import com.micesign.domain.enums.NotificationEventType;

/**
 * Single event class for all approval notification types.
 * Published after transaction commit; consumed by NotificationService.
 * Does not extend ApplicationEvent (Spring 4.2+ supports POJO events).
 */
public class ApprovalNotificationEvent {

    private final Document document;
    private final NotificationEventType eventType;
    private final Long actorUserId;
    private final String comment;

    public ApprovalNotificationEvent(Document document, NotificationEventType eventType,
                                     Long actorUserId, String comment) {
        this.document = document;
        this.eventType = eventType;
        this.actorUserId = actorUserId;
        this.comment = comment;
    }

    public Document getDocument() {
        return document;
    }

    public NotificationEventType getEventType() {
        return eventType;
    }

    public Long getActorUserId() {
        return actorUserId;
    }

    public String getComment() {
        return comment;
    }
}

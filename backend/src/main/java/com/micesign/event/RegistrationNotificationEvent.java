package com.micesign.event;

/**
 * Spring event for registration-related email notifications.
 * Published after transaction commit; consumed by RegistrationEmailService.
 * Does not extend ApplicationEvent (Spring 4.2+ supports POJO events).
 */
public class RegistrationNotificationEvent {

    private final Long registrationRequestId;
    private final RegistrationEventType eventType;

    public RegistrationNotificationEvent(Long registrationRequestId, RegistrationEventType eventType) {
        this.registrationRequestId = registrationRequestId;
        this.eventType = eventType;
    }

    public Long getRegistrationRequestId() {
        return registrationRequestId;
    }

    public RegistrationEventType getEventType() {
        return eventType;
    }
}

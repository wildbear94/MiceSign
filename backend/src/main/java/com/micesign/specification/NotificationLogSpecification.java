package com.micesign.specification;

import com.micesign.domain.NotificationLog;
import com.micesign.domain.enums.NotificationStatus;
import org.springframework.data.jpa.domain.Specification;

import java.time.LocalDateTime;

public class NotificationLogSpecification {

    private NotificationLogSpecification() {
    }

    public static Specification<NotificationLog> withRecipientId(Long recipientId) {
        return (root, query, cb) ->
                recipientId == null ? null : cb.equal(root.get("recipientId"), recipientId);
    }

    public static Specification<NotificationLog> withEventType(String eventType) {
        return (root, query, cb) ->
                (eventType == null || eventType.isBlank()) ? null : cb.equal(root.get("eventType"), eventType);
    }

    public static Specification<NotificationLog> withStatus(NotificationStatus status) {
        return (root, query, cb) ->
                status == null ? null : cb.equal(root.get("status"), status);
    }

    public static Specification<NotificationLog> withDocumentId(Long documentId) {
        return (root, query, cb) ->
                documentId == null ? null : cb.equal(root.get("documentId"), documentId);
    }

    public static Specification<NotificationLog> withDateFrom(LocalDateTime from) {
        return (root, query, cb) ->
                from == null ? null : cb.greaterThanOrEqualTo(root.get("createdAt"), from);
    }

    public static Specification<NotificationLog> withDateTo(LocalDateTime to) {
        return (root, query, cb) ->
                to == null ? null : cb.lessThanOrEqualTo(root.get("createdAt"), to);
    }
}

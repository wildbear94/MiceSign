package com.micesign.specification;

import com.micesign.domain.AuditLog;
import org.springframework.data.jpa.domain.Specification;

import java.time.LocalDateTime;

public class AuditLogSpecification {

    private AuditLogSpecification() {
    }

    public static Specification<AuditLog> withUserId(Long userId) {
        return (root, query, cb) ->
                userId == null ? null : cb.equal(root.get("userId"), userId);
    }

    public static Specification<AuditLog> withAction(String action) {
        return (root, query, cb) ->
                (action == null || action.isBlank()) ? null : cb.equal(root.get("action"), action);
    }

    public static Specification<AuditLog> withTargetType(String targetType) {
        return (root, query, cb) ->
                (targetType == null || targetType.isBlank()) ? null : cb.equal(root.get("targetType"), targetType);
    }

    public static Specification<AuditLog> withDateFrom(LocalDateTime from) {
        return (root, query, cb) ->
                from == null ? null : cb.greaterThanOrEqualTo(root.get("createdAt"), from);
    }

    public static Specification<AuditLog> withDateTo(LocalDateTime to) {
        return (root, query, cb) ->
                to == null ? null : cb.lessThanOrEqualTo(root.get("createdAt"), to);
    }
}

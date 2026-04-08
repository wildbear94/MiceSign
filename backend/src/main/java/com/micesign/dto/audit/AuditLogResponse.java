package com.micesign.dto.audit;

import java.time.LocalDateTime;

public record AuditLogResponse(
    Long id,
    Long userId,
    String userName,
    String action,
    String targetType,
    Long targetId,
    String detail,
    String ipAddress,
    LocalDateTime createdAt
) {}

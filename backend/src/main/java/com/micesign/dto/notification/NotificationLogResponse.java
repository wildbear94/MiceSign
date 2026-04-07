package com.micesign.dto.notification;

import java.time.LocalDateTime;

public record NotificationLogResponse(
    Long id,
    Long recipientId,
    String recipientName,
    String recipientEmail,
    String eventType,
    Long documentId,
    String docNumber,
    String subject,
    String status,
    int retryCount,
    String errorMessage,
    LocalDateTime sentAt,
    LocalDateTime createdAt
) {}

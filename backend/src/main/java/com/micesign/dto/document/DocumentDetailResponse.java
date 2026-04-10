package com.micesign.dto.document;

import java.time.LocalDateTime;

public record DocumentDetailResponse(
    Long id,
    String docNumber,
    String templateCode,
    String templateName,
    String title,
    String status,
    DrafterInfo drafter,
    String bodyHtml,
    String formData,
    LocalDateTime submittedAt,
    LocalDateTime completedAt,
    LocalDateTime createdAt,
    LocalDateTime updatedAt
) {
    public record DrafterInfo(
        Long id,
        String name,
        String departmentName,
        String positionName
    ) {}
}

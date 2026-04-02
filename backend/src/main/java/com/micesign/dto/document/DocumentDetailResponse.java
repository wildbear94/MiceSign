package com.micesign.dto.document;

import java.time.LocalDateTime;
import java.util.List;

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
    List<ApprovalLineResponse> approvalLines,
    Long sourceDocId,
    Integer currentStep,
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

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
    Long drafterId,
    String drafterName,
    String departmentName,
    String positionName,
    Integer currentStep,
    Long sourceDocId,
    String bodyHtml,
    String formData,
    Integer schemaVersion,
    String schemaDefinitionSnapshot,
    List<ApprovalLineResponse> approvalLines,
    List<AttachmentResponse> attachments,
    LocalDateTime submittedAt,
    LocalDateTime completedAt,
    LocalDateTime createdAt
) {}

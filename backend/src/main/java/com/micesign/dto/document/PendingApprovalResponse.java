package com.micesign.dto.document;

import java.time.LocalDateTime;

public record PendingApprovalResponse(
    Long documentId,
    String docNumber,
    String templateCode,
    String templateName,
    String title,
    Long drafterId,
    String drafterName,
    String drafterDepartmentName,
    LocalDateTime submittedAt
) {}

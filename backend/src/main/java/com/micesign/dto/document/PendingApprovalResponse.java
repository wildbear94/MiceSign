package com.micesign.dto.document;

import java.time.LocalDateTime;

public record PendingApprovalResponse(
    Long approvalLineId,
    Long documentId,
    String docNumber,
    String templateCode,
    String title,
    String drafterName,
    String departmentName,
    Integer stepOrder,
    String lineType,
    LocalDateTime createdAt
) {}

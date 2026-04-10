package com.micesign.dto.document;

import java.time.LocalDateTime;

public record ApprovalLineResponse(
    Long id,
    Long approverId,
    String approverName,
    String departmentName,
    String positionName,
    String lineType,
    Integer stepOrder,
    String status,
    String comment,
    LocalDateTime actedAt
) {}

package com.micesign.dto.document;

import java.time.LocalDateTime;

public record ApprovalLineResponse(
    Long id,
    String lineType,
    int stepOrder,
    String status,
    String comment,
    LocalDateTime actedAt,
    ApproverInfo approver
) {
    public record ApproverInfo(
        Long id,
        String name,
        String departmentName,
        String positionName
    ) {}
}

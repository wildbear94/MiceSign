package com.micesign.dto.document;

import com.micesign.domain.enums.ApprovalLineType;
import jakarta.validation.constraints.NotNull;

public record ApprovalLineRequest(
    @NotNull Long approverId,
    @NotNull ApprovalLineType lineType
) {}

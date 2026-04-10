package com.micesign.dto.document;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record ApprovalLineRequest(
    @NotNull Long approverId,
    @NotBlank String lineType,   // APPROVE, AGREE, REFERENCE
    @NotNull Integer stepOrder
) {}

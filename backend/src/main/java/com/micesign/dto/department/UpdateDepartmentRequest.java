package com.micesign.dto.department;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record UpdateDepartmentRequest(
    @NotBlank @Size(max = 100) String name,
    Long parentId,
    int sortOrder
) {}

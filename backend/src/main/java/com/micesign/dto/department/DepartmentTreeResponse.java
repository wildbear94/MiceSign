package com.micesign.dto.department;

import java.util.List;

public record DepartmentTreeResponse(
    Long id,
    String name,
    Long parentId,
    int sortOrder,
    boolean isActive,
    int memberCount,
    List<DepartmentTreeResponse> children
) {}

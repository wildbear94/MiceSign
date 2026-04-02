package com.micesign.dto.leavetype;

public record LeaveTypeResponse(
    Long id,
    String code,
    String name,
    boolean isHalfDay,
    int sortOrder
) {}

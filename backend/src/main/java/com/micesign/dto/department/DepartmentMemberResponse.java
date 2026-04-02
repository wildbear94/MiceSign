package com.micesign.dto.department;

public record DepartmentMemberResponse(
    Long id,
    String employeeNo,
    String name,
    String positionName,
    String status
) {}

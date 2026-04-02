package com.micesign.dto.user;

public record UserListResponse(
    Long id,
    String employeeNo,
    String name,
    String email,
    String departmentName,
    String positionName,
    String role,
    String status
) {}

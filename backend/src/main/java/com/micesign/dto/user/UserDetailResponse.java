package com.micesign.dto.user;

import java.time.LocalDateTime;

public record UserDetailResponse(
    Long id,
    String employeeNo,
    String name,
    String email,
    Long departmentId,
    String departmentName,
    Long positionId,
    String positionName,
    String role,
    String status,
    String phone,
    LocalDateTime lastLoginAt,
    LocalDateTime createdAt,
    boolean isLocked,
    boolean mustChangePassword
) {}

package com.micesign.dto.registration;

import com.micesign.domain.enums.RegistrationStatus;
import java.time.LocalDateTime;

public record RegistrationListResponse(
    Long id,
    String name,
    String email,
    RegistrationStatus status,
    String rejectionReason,
    LocalDateTime createdAt,
    LocalDateTime processedAt,
    // Assignment info for APPROVED registrations (per D-11)
    String employeeNo,
    String departmentName,
    String positionName
) {}

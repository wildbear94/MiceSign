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
    LocalDateTime processedAt
) {}

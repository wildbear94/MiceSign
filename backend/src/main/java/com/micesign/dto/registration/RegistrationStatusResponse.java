package com.micesign.dto.registration;

import com.micesign.domain.enums.RegistrationStatus;
import java.time.LocalDateTime;

public record RegistrationStatusResponse(
    Long id,
    String name,
    String email,
    RegistrationStatus status,
    String rejectionReason,
    String trackingToken,
    LocalDateTime createdAt,
    LocalDateTime processedAt
) {}

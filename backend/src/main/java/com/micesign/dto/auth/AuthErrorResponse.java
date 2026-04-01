package com.micesign.dto.auth;

import java.time.LocalDateTime;

/**
 * Extended error response for auth endpoints that need extra fields
 * beyond the standard ApiResponse.ErrorDetail (e.g., remainingAttempts, lockedUntil).
 */
public record AuthErrorResponse(
        String code,
        String message,
        Integer remainingAttempts,
        LocalDateTime lockedUntil
) {
}

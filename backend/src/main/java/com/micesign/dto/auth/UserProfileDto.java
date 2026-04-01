package com.micesign.dto.auth;

public record UserProfileDto(
        Long id,
        String name,
        String email,
        String role,
        Long departmentId,
        boolean mustChangePassword
) {
}

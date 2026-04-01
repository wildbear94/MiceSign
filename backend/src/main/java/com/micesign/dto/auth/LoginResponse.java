package com.micesign.dto.auth;

public record LoginResponse(
        String accessToken,
        UserProfileDto user
) {
}

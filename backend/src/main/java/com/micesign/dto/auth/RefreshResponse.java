package com.micesign.dto.auth;

public record RefreshResponse(
        String accessToken,
        UserProfileDto user
) {
}

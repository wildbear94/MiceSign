package com.micesign.dto.auth;

public record UserProfileDto(
        Long id,
        String name,
        String email,
        String role,
        Long departmentId,
        boolean mustChangePassword,
        /** Phase 34 (D-F1) — login/refresh 응답에 라이브 부서명. orphan-safe nullable. */
        String departmentName,
        /** Phase 34 (D-F1) — 라이브 직위·직책. User.positionId nullable 이므로 nullable. */
        String positionName
) {
}

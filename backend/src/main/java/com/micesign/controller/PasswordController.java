package com.micesign.controller;

import com.micesign.common.dto.ApiResponse;
import com.micesign.dto.auth.AdminPasswordResetRequest;
import com.micesign.dto.auth.PasswordChangeRequest;
import com.micesign.security.CustomUserDetails;
import com.micesign.service.PasswordService;
import com.micesign.service.PasswordService.PasswordResult;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
public class PasswordController {

    private final PasswordService passwordService;

    public PasswordController(PasswordService passwordService) {
        this.passwordService = passwordService;
    }

    /**
     * PUT /api/v1/auth/password — User changes their own password (D-31).
     */
    @PutMapping("/api/v1/auth/password")
    public ResponseEntity<?> changePassword(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @Valid @RequestBody PasswordChangeRequest request,
            @CookieValue(name = "refreshToken", required = false) String refreshToken) {

        // Hash the current cookie token to match stored token_hash
        String currentTokenHash = refreshToken != null ? PasswordService.hashToken(refreshToken) : null;

        PasswordResult result = passwordService.changePassword(
                userDetails.getUserId(), request, currentTokenHash);

        if (!result.success()) {
            int status = "AUTH_FORBIDDEN".equals(result.errorCode()) ? 403 : 400;
            return ResponseEntity.status(status)
                    .body(ApiResponse.error(result.errorCode(), result.errorMessage()));
        }

        return ResponseEntity.ok(ApiResponse.ok("비밀번호가 변경되었습니다."));
    }

    /**
     * POST /api/v1/admin/users/{id}/reset-password — Admin resets target user's password (D-29).
     */
    @PostMapping("/api/v1/admin/users/{id}/reset-password")
    public ResponseEntity<?> adminResetPassword(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable("id") Long targetUserId,
            @Valid @RequestBody AdminPasswordResetRequest request) {

        PasswordResult result = passwordService.adminResetPassword(
                userDetails.getUserId(), targetUserId, request);

        if (!result.success()) {
            int status = "AUTH_FORBIDDEN".equals(result.errorCode()) ? 403 : 400;
            return ResponseEntity.status(status)
                    .body(ApiResponse.error(result.errorCode(), result.errorMessage()));
        }

        return ResponseEntity.ok(ApiResponse.ok("비밀번호가 초기화되었습니다."));
    }

    /**
     * POST /api/v1/admin/users/{id}/unlock — Admin unlocks a locked account (D-38).
     */
    @PostMapping("/api/v1/admin/users/{id}/unlock")
    public ResponseEntity<?> unlockAccount(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable("id") Long targetUserId) {

        PasswordResult result = passwordService.unlockAccount(
                userDetails.getUserId(), targetUserId);

        if (!result.success()) {
            int status = "AUTH_FORBIDDEN".equals(result.errorCode()) ? 403 : 400;
            return ResponseEntity.status(status)
                    .body(ApiResponse.error(result.errorCode(), result.errorMessage()));
        }

        return ResponseEntity.ok(ApiResponse.ok("계정 잠금이 해제되었습니다."));
    }
}

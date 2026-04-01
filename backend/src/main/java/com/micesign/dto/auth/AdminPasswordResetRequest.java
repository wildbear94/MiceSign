package com.micesign.dto.auth;

import jakarta.validation.constraints.NotBlank;

public record AdminPasswordResetRequest(
        @NotBlank(message = "새 비밀번호는 필수 입력입니다.")
        String newPassword
) {
}

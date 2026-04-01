package com.micesign.dto.auth;

import jakarta.validation.constraints.NotBlank;

public record PasswordChangeRequest(
        @NotBlank(message = "현재 비밀번호는 필수 입력입니다.")
        String currentPassword,

        @NotBlank(message = "새 비밀번호는 필수 입력입니다.")
        String newPassword,

        @NotBlank(message = "비밀번호 확인은 필수 입력입니다.")
        String confirmPassword
) {
}

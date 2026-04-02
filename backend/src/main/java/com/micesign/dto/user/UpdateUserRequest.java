package com.micesign.dto.user;

import com.micesign.domain.enums.UserRole;
import com.micesign.domain.enums.UserStatus;
import jakarta.validation.constraints.*;

public record UpdateUserRequest(
    @NotBlank @Size(max = 50) String name,
    @NotBlank @Email @Size(max = 150) String email,
    @NotNull Long departmentId,
    Long positionId,
    @NotNull UserRole role,
    @NotNull UserStatus status,
    @Size(max = 20) String phone
) {}

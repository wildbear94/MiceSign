package com.micesign.dto.user;

import com.micesign.domain.enums.UserRole;
import jakarta.validation.constraints.*;

public record CreateUserRequest(
    @NotBlank @Size(max = 20) String employeeNo,
    @NotBlank @Size(max = 50) String name,
    @NotBlank @Email @Size(max = 150) String email,
    @NotNull Long departmentId,
    Long positionId,
    @NotNull UserRole role,
    @Size(max = 20) String phone,
    @NotBlank @Size(min = 8, max = 100) String password
) {}

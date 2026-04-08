package com.micesign.dto.registration;

import jakarta.validation.constraints.*;

public record ApproveRegistrationRequest(
    @NotBlank @Size(max = 20) String employeeNo,
    @NotNull Long departmentId,
    @NotNull Long positionId
) {}

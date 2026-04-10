package com.micesign.dto.registration;

import jakarta.validation.constraints.*;

public record RegistrationSubmitRequest(
    @NotBlank @Size(max = 50) String name,
    @NotBlank @Email @Size(max = 150) String email,
    @NotBlank @Size(min = 8, max = 100) String password
) {}

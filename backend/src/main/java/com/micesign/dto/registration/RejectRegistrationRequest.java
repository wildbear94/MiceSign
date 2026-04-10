package com.micesign.dto.registration;

import jakarta.validation.constraints.*;

public record RejectRegistrationRequest(
    @NotBlank @Size(max = 500) String rejectionReason
) {}

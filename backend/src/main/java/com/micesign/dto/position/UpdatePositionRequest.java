package com.micesign.dto.position;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record UpdatePositionRequest(
    @NotBlank @Size(max = 50) String name
) {}

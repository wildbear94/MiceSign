package com.micesign.dto.position;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CreatePositionRequest(
    @NotBlank @Size(max = 50) String name
) {}

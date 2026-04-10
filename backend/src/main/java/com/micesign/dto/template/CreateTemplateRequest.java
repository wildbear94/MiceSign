package com.micesign.dto.template;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CreateTemplateRequest(
    @NotBlank @Size(max = 100) String name,
    @Size(max = 500) String description,
    @NotBlank @Size(max = 10) String prefix,
    String schemaDefinition,  // JSON string
    String category,
    String icon
) {}

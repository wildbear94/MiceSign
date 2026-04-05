package com.micesign.dto.template;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record CreateTemplateRequest(
    @NotBlank String name,
    @NotBlank @Size(max = 10) String prefix,
    @Size(max = 500) String description,
    @Size(max = 50) String category,
    @Size(max = 50) String icon,
    @NotNull SchemaDefinition schemaDefinition
) {}

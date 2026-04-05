package com.micesign.dto.template;

import jakarta.validation.constraints.Size;

public record UpdateTemplateRequest(
    String name,
    @Size(max = 500) String description,
    @Size(max = 50) String category,
    @Size(max = 50) String icon,
    SchemaDefinition schemaDefinition
) {}

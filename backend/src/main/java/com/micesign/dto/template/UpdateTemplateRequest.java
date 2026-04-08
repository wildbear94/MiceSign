package com.micesign.dto.template;

import jakarta.validation.constraints.Size;

public record UpdateTemplateRequest(
    @Size(max = 100) String name,
    @Size(max = 500) String description,
    String schemaDefinition,
    Boolean isActive,
    Integer sortOrder,
    String category,
    String icon,
    Boolean budgetEnabled
) {}

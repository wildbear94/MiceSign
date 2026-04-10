package com.micesign.dto.template;

import java.time.LocalDateTime;

public record TemplateDetailResponse(
    Long id,
    String code,
    String name,
    String description,
    String prefix,
    boolean isActive,
    int sortOrder,
    String schemaDefinition,
    int schemaVersion,
    boolean isCustom,
    String category,
    String icon,
    Long createdBy,
    boolean budgetEnabled,
    LocalDateTime createdAt,
    LocalDateTime updatedAt
) {}

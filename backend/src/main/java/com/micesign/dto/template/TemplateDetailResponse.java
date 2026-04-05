package com.micesign.dto.template;

import com.fasterxml.jackson.annotation.JsonInclude;

import java.time.LocalDateTime;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record TemplateDetailResponse(
    Long id,
    String code,
    String name,
    String description,
    String prefix,
    boolean isActive,
    boolean isCustom,
    int schemaVersion,
    String category,
    String icon,
    SchemaDefinition schemaDefinition,
    LocalDateTime createdAt,
    LocalDateTime updatedAt
) {}

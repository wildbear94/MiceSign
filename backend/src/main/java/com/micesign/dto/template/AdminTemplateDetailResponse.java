package com.micesign.dto.template;

import java.time.LocalDateTime;
import java.util.List;

public record AdminTemplateDetailResponse(
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
    List<SchemaVersionResponse> versionHistory,
    LocalDateTime createdAt,
    LocalDateTime updatedAt
) {
    public record SchemaVersionResponse(int version, String changeDescription, LocalDateTime createdAt) {}
}

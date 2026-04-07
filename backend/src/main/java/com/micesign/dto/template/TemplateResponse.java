package com.micesign.dto.template;

public record TemplateResponse(
    Long id,
    String code,
    String name,
    String description,
    String prefix,
    boolean isActive,
    int sortOrder,
    boolean isCustom,
    String category,
    String icon,
    boolean budgetEnabled
) {}

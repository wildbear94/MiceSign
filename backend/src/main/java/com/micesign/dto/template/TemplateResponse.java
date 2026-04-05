package com.micesign.dto.template;

public record TemplateResponse(
    Long id,
    String code,
    String name,
    String description,
    String prefix
) {}

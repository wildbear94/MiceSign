package com.micesign.dto.template;

import com.fasterxml.jackson.annotation.JsonInclude;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record FieldDefinition(
    String id,
    String type,       // text, textarea, number, date, select, table, staticText, hidden
    String label,
    boolean required,
    FieldConfig config
) {}

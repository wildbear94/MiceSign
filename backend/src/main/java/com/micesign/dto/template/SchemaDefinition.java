package com.micesign.dto.template;

import com.fasterxml.jackson.annotation.JsonInclude;

import java.util.List;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record SchemaDefinition(
    int version,
    List<FieldDefinition> fields,
    List<Object> conditionalRules,  // Phase 15 will define concrete type
    List<Object> calculationRules   // Phase 15 will define concrete type
) {}

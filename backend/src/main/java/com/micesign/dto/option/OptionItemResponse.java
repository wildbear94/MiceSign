package com.micesign.dto.option;

import com.fasterxml.jackson.annotation.JsonInclude;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record OptionItemResponse(
    Long id,
    String value,
    String label,
    int sortOrder,
    boolean isActive
) {}

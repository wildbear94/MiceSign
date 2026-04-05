package com.micesign.dto.option;

import com.fasterxml.jackson.annotation.JsonInclude;

import java.util.List;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record OptionSetResponse(
    Long id,
    String name,
    String description,
    boolean isActive,
    List<OptionItemResponse> items
) {}

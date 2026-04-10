package com.micesign.dto.option;

import java.util.List;

public record OptionSetResponse(
    Long id,
    String name,
    String description,
    boolean isActive,
    List<OptionItemResponse> items
) {}

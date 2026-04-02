package com.micesign.dto.position;

public record PositionResponse(
    Long id,
    String name,
    int sortOrder,
    boolean isActive,
    int userCount
) {}

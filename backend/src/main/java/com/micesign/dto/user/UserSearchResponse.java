package com.micesign.dto.user;

public record UserSearchResponse(
    Long id,
    String name,
    String departmentName
) {}

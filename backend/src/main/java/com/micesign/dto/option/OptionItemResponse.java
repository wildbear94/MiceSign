package com.micesign.dto.option;

public record OptionItemResponse(Long id, String value, String label, int sortOrder, boolean isActive) {}

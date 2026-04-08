package com.micesign.dto.option;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.util.List;

public record CreateOptionSetRequest(
    @NotBlank @Size(max = 100) String name,
    @Size(max = 500) String description,
    List<OptionItemRequest> items
) {
    public record OptionItemRequest(@NotBlank String value, @NotBlank String label, int sortOrder) {}
}

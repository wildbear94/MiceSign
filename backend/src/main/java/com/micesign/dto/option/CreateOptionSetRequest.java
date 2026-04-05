package com.micesign.dto.option;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;

import java.util.List;

public record CreateOptionSetRequest(
    @NotBlank @Size(max = 100) String name,
    @Size(max = 500) String description,
    @NotEmpty @Valid List<OptionItemRequest> items
) {
    public record OptionItemRequest(
        @NotBlank @Size(max = 100) String value,
        @NotBlank @Size(max = 200) String label
    ) {}
}

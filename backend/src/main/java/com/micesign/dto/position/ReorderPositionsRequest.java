package com.micesign.dto.position;

import jakarta.validation.constraints.NotEmpty;
import java.util.List;

public record ReorderPositionsRequest(
    @NotEmpty List<Long> orderedIds
) {}

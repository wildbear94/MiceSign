package com.micesign.dto.document;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record UpdateDocumentRequest(
    @NotBlank @Size(max = 300) String title,
    String bodyHtml,
    String formData
) {}

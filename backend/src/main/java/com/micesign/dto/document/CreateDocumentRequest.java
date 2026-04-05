package com.micesign.dto.document;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CreateDocumentRequest(
    @NotBlank String templateCode,
    @NotBlank @Size(max = 300) String title,
    String bodyHtml,
    String formData
) {}

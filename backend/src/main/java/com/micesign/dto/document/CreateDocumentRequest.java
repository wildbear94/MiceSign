package com.micesign.dto.document;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.util.List;

public record CreateDocumentRequest(
    @NotBlank String templateCode,
    @NotBlank @Size(max = 300) String title,
    String bodyHtml,
    String formData,  // JSON string
    List<ApprovalLineRequest> approvalLines
) {}

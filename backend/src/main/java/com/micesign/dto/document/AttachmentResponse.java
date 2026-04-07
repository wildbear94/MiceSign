package com.micesign.dto.document;

import java.time.LocalDateTime;

public record AttachmentResponse(
    Long id,
    Long documentId,
    String originalName,
    Long fileSize,
    String mimeType,
    String gdriveFileId,
    LocalDateTime createdAt
) {}

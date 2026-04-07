package com.micesign.dto.document;

import java.time.LocalDateTime;

public record DocumentResponse(
    Long id,
    String docNumber,
    String templateCode,
    String templateName,
    String title,
    String status,
    String drafterName,
    String drafterDepartmentName,
    LocalDateTime createdAt,
    LocalDateTime updatedAt
) {}

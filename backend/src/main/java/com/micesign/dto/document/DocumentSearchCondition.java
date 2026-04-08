package com.micesign.dto.document;

import java.time.LocalDate;

public record DocumentSearchCondition(
    String keyword,        // search title, docNumber, drafterName
    String status,         // filter by DocumentStatus
    String templateCode,   // filter by template
    LocalDate dateFrom,
    LocalDate dateTo,
    String tab             // 'my', 'department', 'all'
) {}

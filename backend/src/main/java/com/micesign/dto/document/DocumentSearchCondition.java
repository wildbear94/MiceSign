package com.micesign.dto.document;

import com.micesign.domain.enums.DocumentStatus;
import java.time.LocalDate;

public record DocumentSearchCondition(
    SearchTab tab,
    String keyword,
    DocumentStatus status,
    String templateCode,
    LocalDate startDate,
    LocalDate endDate
) {
    public enum SearchTab { MY, APPROVAL, ALL }
}

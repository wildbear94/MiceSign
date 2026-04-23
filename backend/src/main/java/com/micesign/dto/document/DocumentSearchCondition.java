package com.micesign.dto.document;

import com.micesign.domain.enums.DocumentStatus;

import java.time.LocalDate;
import java.util.Collections;
import java.util.List;

public record DocumentSearchCondition(
    String keyword,                  // search title, docNumber, drafterName
    List<DocumentStatus> statuses,   // D-B4: String → List<Enum> — null/빈 목록은 필터 미적용
    String templateCode,             // filter by template
    LocalDate dateFrom,
    LocalDate dateTo,
    String tab,                      // 'my', 'department', 'all'
    Long drafterId                   // D-B4/B7: 신규, nullable
) {
    public DocumentSearchCondition {
        if (statuses == null) {
            statuses = Collections.emptyList();
        }
    }
}

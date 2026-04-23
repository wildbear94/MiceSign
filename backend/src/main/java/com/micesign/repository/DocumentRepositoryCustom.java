package com.micesign.repository;

import com.micesign.dto.document.DocumentResponse;
import com.micesign.dto.document.DocumentSearchCondition;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;

public interface DocumentRepositoryCustom {

    /**
     * Phase 31 D-A9 Option 1 — ADMIN predicate 계층 재귀 확장.
     * descendantDeptIds: role=ADMIN 또는 tab∈(department,all) 일 때 소비자가 미리 계산해
     * 전달. null/empty 일 경우 해당 branch 는 기존 단일 부서 (departmentId.eq) 로 fallback
     * (Phase 30 backward-compat — USER/SUPER_ADMIN 의미 보존).
     */
    Page<DocumentResponse> searchDocuments(
            DocumentSearchCondition condition,
            Long userId,
            String role,
            Long departmentId,
            List<Long> descendantDeptIds,
            Pageable pageable);
}

package com.micesign.repository;

import com.micesign.dto.document.DocumentResponse;
import com.micesign.dto.document.DocumentSearchCondition;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface DocumentRepositoryCustom {

    Page<DocumentResponse> searchDocuments(DocumentSearchCondition condition, Long userId, String role, Long departmentId, Pageable pageable);
}

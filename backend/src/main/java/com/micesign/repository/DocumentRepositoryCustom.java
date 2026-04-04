package com.micesign.repository;

import com.micesign.domain.Document;
import com.micesign.dto.document.DocumentSearchCondition;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface DocumentRepositoryCustom {

    Page<Document> searchDocuments(DocumentSearchCondition condition, Long userId, Pageable pageable);
}

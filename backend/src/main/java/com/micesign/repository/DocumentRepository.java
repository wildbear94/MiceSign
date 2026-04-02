package com.micesign.repository;

import com.micesign.domain.Document;
import com.micesign.domain.enums.DocumentStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface DocumentRepository extends JpaRepository<Document, Long> {

    Page<Document> findByDrafterIdAndStatusIn(Long drafterId, List<DocumentStatus> statuses, Pageable pageable);

    Page<Document> findByDrafterId(Long drafterId, Pageable pageable);
}

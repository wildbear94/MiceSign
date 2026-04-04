package com.micesign.repository;

import com.micesign.domain.Document;
import com.micesign.domain.enums.DocumentStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface DocumentRepository extends JpaRepository<Document, Long>, DocumentRepositoryCustom {

    Page<Document> findByDrafterIdAndStatusIn(Long drafterId, List<DocumentStatus> statuses, Pageable pageable);

    Page<Document> findByDrafterId(Long drafterId, Pageable pageable);

    long countByDrafterIdAndStatus(Long drafterId, DocumentStatus status);

    @Query("SELECT d FROM Document d JOIN FETCH d.drafter WHERE d.id = :id")
    Optional<Document> findByIdWithDrafter(@Param("id") Long id);
}

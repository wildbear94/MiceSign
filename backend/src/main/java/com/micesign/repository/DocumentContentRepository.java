package com.micesign.repository;

import com.micesign.domain.DocumentContent;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface DocumentContentRepository extends JpaRepository<DocumentContent, Long> {

    Optional<DocumentContent> findByDocumentId(Long documentId);
}

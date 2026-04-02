package com.micesign.repository;

import com.micesign.domain.DocumentAttachment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface DocumentAttachmentRepository extends JpaRepository<DocumentAttachment, Long> {

    List<DocumentAttachment> findByDocumentId(Long documentId);

    int countByDocumentId(Long documentId);

    @Query("SELECT COALESCE(SUM(da.fileSize), 0) FROM DocumentAttachment da WHERE da.documentId = :documentId")
    long sumFileSizeByDocumentId(@Param("documentId") Long documentId);
}

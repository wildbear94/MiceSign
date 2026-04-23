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

    Optional<Document> findByIdAndDrafterId(Long id, Long drafterId);

    List<Document> findByDrafterIdAndStatusOrderByCreatedAtDesc(Long drafterId, DocumentStatus status);

    List<Document> findByDrafterIdOrderByCreatedAtDesc(Long drafterId);

    Page<Document> findByDrafterId(Long drafterId, Pageable pageable);

    Optional<Document> findByDocNumber(String docNumber);

    Page<Document> findByDrafterIdAndStatusIn(Long drafterId, List<DocumentStatus> statuses, Pageable pageable);

    long countByDrafterIdAndStatus(Long drafterId, DocumentStatus status);

    // Phase 31 D-A4 ADMIN 스코프 — 부서 계층으로 수집한 drafter id 집합의 상태별 문서 카운트
    long countByDrafterIdInAndStatus(List<Long> drafterIds, DocumentStatus status);

    // Phase 31 D-A4 SUPER_ADMIN 스코프 — 전사 drafter 필터 zero, 상태별 문서 카운트
    long countByStatus(DocumentStatus status);

    @Query("SELECT d FROM Document d JOIN FETCH d.drafter WHERE d.id = :id")
    Optional<Document> findByIdWithDrafter(@Param("id") Long id);

    // Phase 29 — drafter + drafter.department 까지 eager-fetch (EmailService listener 가
    // detached 상태에서 buildContext 의 drafter.getDepartment() lazy-load 시
    // LazyInitializationException 회피, NotificationLog 발송 흐름 전용)
    @Query("SELECT d FROM Document d JOIN FETCH d.drafter dr LEFT JOIN FETCH dr.department WHERE d.id = :id")
    Optional<Document> findByIdWithDrafterAndDepartment(@Param("id") Long id);

    Page<Document> findByIdInAndStatusIn(List<Long> ids, List<DocumentStatus> statuses, Pageable pageable);
}

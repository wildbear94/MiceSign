package com.micesign.repository;

import com.micesign.domain.ApprovalLine;
import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.micesign.domain.enums.ApprovalLineStatus;

import java.util.List;
import java.util.Optional;

public interface ApprovalLineRepository extends JpaRepository<ApprovalLine, Long> {

    List<ApprovalLine> findByDocumentIdOrderByStepOrderAsc(Long documentId);

    // Phase 29 — approver + approver.department 까지 eager-fetch (EmailService listener 가
    // detached 상태에서 line.getApprover()/getDepartment() lazy-load 시
    // LazyInitializationException 회피, NotificationLog 발송 흐름 전용)
    @Query("SELECT al FROM ApprovalLine al JOIN FETCH al.approver ap LEFT JOIN FETCH ap.department " +
           "WHERE al.document.id = :documentId ORDER BY al.stepOrder ASC")
    List<ApprovalLine> findByDocumentIdWithApproverOrderByStepOrderAsc(@Param("documentId") Long documentId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT al FROM ApprovalLine al WHERE al.id = :id")
    Optional<ApprovalLine> findByIdForUpdate(@Param("id") Long id);

    boolean existsByDocumentIdAndApproverId(Long documentId, Long approverId);

    @Query("SELECT al FROM ApprovalLine al JOIN al.document d " +
           "WHERE al.approver.id = :userId " +
           "AND al.status = com.micesign.domain.enums.ApprovalLineStatus.PENDING " +
           "AND al.lineType IN (com.micesign.domain.enums.ApprovalLineType.APPROVE, com.micesign.domain.enums.ApprovalLineType.AGREE) " +
           "AND d.status = com.micesign.domain.enums.DocumentStatus.SUBMITTED " +
           "AND d.currentStep = al.stepOrder " +
           "ORDER BY d.submittedAt ASC")
    Page<ApprovalLine> findPendingByApproverId(@Param("userId") Long userId, Pageable pageable);

    @Query("SELECT COUNT(al) FROM ApprovalLine al JOIN al.document d " +
           "WHERE al.approver.id = :userId " +
           "AND al.status = com.micesign.domain.enums.ApprovalLineStatus.PENDING " +
           "AND al.lineType IN (com.micesign.domain.enums.ApprovalLineType.APPROVE, com.micesign.domain.enums.ApprovalLineType.AGREE) " +
           "AND d.status = com.micesign.domain.enums.DocumentStatus.SUBMITTED " +
           "AND d.currentStep = al.stepOrder")
    long countPendingByApproverId(@Param("userId") Long userId);

    List<ApprovalLine> findByApproverIdAndStatus(Long approverId, ApprovalLineStatus status);

    Optional<ApprovalLine> findByDocumentIdAndApproverId(Long documentId, Long approverId);

    void deleteByDocumentId(Long documentId);

    List<ApprovalLine> findByDocumentIdAndStepOrder(Long documentId, Integer stepOrder);
}

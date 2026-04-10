package com.micesign.repository;

import com.micesign.domain.ApprovalLine;
import com.micesign.domain.enums.ApprovalLineStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ApprovalLineRepository extends JpaRepository<ApprovalLine, Long> {

    List<ApprovalLine> findByApproverIdAndStatusIn(Long approverId, List<ApprovalLineStatus> statuses);

    List<ApprovalLine> findByDocumentIdOrderByStepOrder(Long documentId);
}

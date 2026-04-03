package com.micesign.service;

import com.micesign.domain.enums.DocumentStatus;
import com.micesign.dto.dashboard.DashboardSummaryResponse;
import com.micesign.repository.ApprovalLineRepository;
import com.micesign.repository.DocumentRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
public class DashboardService {

    private final ApprovalLineRepository approvalLineRepository;
    private final DocumentRepository documentRepository;

    public DashboardService(ApprovalLineRepository approvalLineRepository,
                            DocumentRepository documentRepository) {
        this.approvalLineRepository = approvalLineRepository;
        this.documentRepository = documentRepository;
    }

    public DashboardSummaryResponse getSummary(Long userId) {
        long pendingCount = approvalLineRepository.countPendingByApproverId(userId);
        long draftCount = documentRepository.countByDrafterIdAndStatus(userId, DocumentStatus.DRAFT);
        long completedCount = documentRepository.countByDrafterIdAndStatus(userId, DocumentStatus.APPROVED);
        return new DashboardSummaryResponse(pendingCount, draftCount, completedCount);
    }
}

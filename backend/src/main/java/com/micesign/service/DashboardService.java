package com.micesign.service;

import com.micesign.domain.ApprovalLine;
import com.micesign.domain.ApprovalTemplate;
import com.micesign.domain.Document;
import com.micesign.domain.enums.DocumentStatus;
import com.micesign.dto.dashboard.DashboardSummaryResponse;
import com.micesign.dto.document.DocumentResponse;
import com.micesign.dto.document.PendingApprovalResponse;
import com.micesign.mapper.DocumentMapper;
import com.micesign.repository.ApprovalLineRepository;
import com.micesign.repository.ApprovalTemplateRepository;
import com.micesign.repository.DocumentRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@Transactional(readOnly = true)
public class DashboardService {

    private final ApprovalLineRepository approvalLineRepository;
    private final DocumentRepository documentRepository;
    private final ApprovalTemplateRepository approvalTemplateRepository;
    private final DocumentMapper documentMapper;

    public DashboardService(ApprovalLineRepository approvalLineRepository,
                            DocumentRepository documentRepository,
                            ApprovalTemplateRepository approvalTemplateRepository,
                            DocumentMapper documentMapper) {
        this.approvalLineRepository = approvalLineRepository;
        this.documentRepository = documentRepository;
        this.approvalTemplateRepository = approvalTemplateRepository;
        this.documentMapper = documentMapper;
    }

    public DashboardSummaryResponse getDashboardSummary(Long userId) {
        // Counts
        long pendingCount = approvalLineRepository.countPendingByApproverId(userId);
        long draftCount = documentRepository.countByDrafterIdAndStatus(userId, DocumentStatus.DRAFT);
        long submittedCount = documentRepository.countByDrafterIdAndStatus(userId, DocumentStatus.SUBMITTED);
        long completedCount = documentRepository.countByDrafterIdAndStatus(userId, DocumentStatus.APPROVED)
                + documentRepository.countByDrafterIdAndStatus(userId, DocumentStatus.REJECTED);

        // Latest 5 pending approvals
        Page<ApprovalLine> pendingPage = approvalLineRepository
                .findPendingByApproverId(userId, PageRequest.of(0, 5));
        List<PendingApprovalResponse> recentPending = pendingPage.getContent().stream()
                .map(line -> {
                    Document doc = line.getDocument();
                    return new PendingApprovalResponse(
                            line.getId(),
                            doc.getId(),
                            doc.getDocNumber(),
                            doc.getTemplateCode(),
                            doc.getTitle(),
                            doc.getDrafter().getName(),
                            doc.getDrafter().getDepartment() != null
                                    ? doc.getDrafter().getDepartment().getName() : null,
                            line.getStepOrder(),
                            line.getLineType().name(),
                            doc.getCreatedAt()
                    );
                })
                .toList();

        // Latest 5 user's documents
        Map<String, String> templateNameMap = approvalTemplateRepository
                .findByIsActiveTrueOrderBySortOrder().stream()
                .collect(Collectors.toMap(ApprovalTemplate::getCode, ApprovalTemplate::getName));

        Page<Document> docPage = documentRepository.findByDrafterId(userId, PageRequest.of(0, 5));
        List<DocumentResponse> recentDocuments = docPage.getContent().stream()
                .map(doc -> documentMapper.toResponse(doc,
                        templateNameMap.getOrDefault(doc.getTemplateCode(), doc.getTemplateCode())))
                .toList();

        return new DashboardSummaryResponse(
                pendingCount, draftCount, submittedCount, completedCount,
                recentPending, recentDocuments
        );
    }

    /**
     * Backward-compat alias.
     */
    public DashboardSummaryResponse getSummary(Long userId) {
        return getDashboardSummary(userId);
    }
}

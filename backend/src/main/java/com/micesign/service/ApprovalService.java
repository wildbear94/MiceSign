package com.micesign.service;

import com.micesign.domain.ApprovalLine;
import com.micesign.domain.Document;
import com.micesign.domain.enums.ApprovalLineStatus;
import com.micesign.domain.enums.DocumentStatus;
import com.micesign.dto.document.DocumentResponse;
import com.micesign.mapper.DocumentMapper;
import com.micesign.repository.ApprovalLineRepository;
import com.micesign.repository.ApprovalTemplateRepository;
import com.micesign.repository.DocumentRepository;
import com.micesign.domain.ApprovalTemplate;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@Transactional(readOnly = true)
public class ApprovalService {

    private final ApprovalLineRepository approvalLineRepository;
    private final DocumentRepository documentRepository;
    private final ApprovalTemplateRepository approvalTemplateRepository;
    private final DocumentMapper documentMapper;

    public ApprovalService(ApprovalLineRepository approvalLineRepository,
                           DocumentRepository documentRepository,
                           ApprovalTemplateRepository approvalTemplateRepository,
                           DocumentMapper documentMapper) {
        this.approvalLineRepository = approvalLineRepository;
        this.documentRepository = documentRepository;
        this.approvalTemplateRepository = approvalTemplateRepository;
        this.documentMapper = documentMapper;
    }

    /**
     * Returns documents where the user acted as approver (APPROVED or REJECTED),
     * NOT documents the user drafted.
     */
    public Page<DocumentResponse> getCompletedApprovals(Long userId, Pageable pageable) {
        // Find approval lines where this user acted (APPROVED or REJECTED)
        List<ApprovalLine> actedLines = approvalLineRepository.findByApproverIdAndStatusIn(
                userId, List.of(ApprovalLineStatus.APPROVED, ApprovalLineStatus.REJECTED));

        // Extract distinct document IDs from acted lines
        List<Long> docIds = actedLines.stream()
                .map(line -> line.getDocument().getId())
                .distinct()
                .toList();

        // Handle empty case to avoid empty IN clause
        if (docIds.isEmpty()) {
            return Page.empty(pageable);
        }

        // Query documents by IDs with completed statuses
        Page<Document> documents = documentRepository.findByIdInAndStatusIn(
                docIds, List.of(DocumentStatus.APPROVED, DocumentStatus.REJECTED), pageable);

        // Build template name lookup
        Map<String, String> templateNameMap = approvalTemplateRepository.findByIsActiveTrueOrderBySortOrder()
                .stream()
                .collect(Collectors.toMap(ApprovalTemplate::getCode, ApprovalTemplate::getName));

        return documents.map(doc -> documentMapper.toResponse(doc,
                templateNameMap.getOrDefault(doc.getTemplateCode(), doc.getTemplateCode())));
    }
}

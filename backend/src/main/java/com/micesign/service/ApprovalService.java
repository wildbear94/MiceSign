package com.micesign.service;

import com.micesign.common.exception.BusinessException;
import com.micesign.domain.ApprovalLine;
import com.micesign.domain.ApprovalTemplate;
import com.micesign.domain.Document;
import com.micesign.domain.enums.ApprovalLineStatus;
import com.micesign.domain.enums.ApprovalLineType;
import com.micesign.domain.enums.DocumentStatus;
import com.micesign.dto.document.DocumentResponse;
import com.micesign.dto.document.PendingApprovalResponse;
import com.micesign.mapper.DocumentMapper;
import com.micesign.repository.ApprovalLineRepository;
import com.micesign.repository.ApprovalTemplateRepository;
import com.micesign.repository.DocumentRepository;
import com.micesign.repository.UserRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@Transactional
public class ApprovalService {

    private final ApprovalLineRepository approvalLineRepository;
    private final DocumentRepository documentRepository;
    private final ApprovalTemplateRepository approvalTemplateRepository;
    private final UserRepository userRepository;
    private final DocumentMapper documentMapper;

    public ApprovalService(ApprovalLineRepository approvalLineRepository,
                           DocumentRepository documentRepository,
                           ApprovalTemplateRepository approvalTemplateRepository,
                           UserRepository userRepository,
                           DocumentMapper documentMapper) {
        this.approvalLineRepository = approvalLineRepository;
        this.documentRepository = documentRepository;
        this.approvalTemplateRepository = approvalTemplateRepository;
        this.userRepository = userRepository;
        this.documentMapper = documentMapper;
    }

    public void approve(Long userId, Long lineId, String comment) {
        ApprovalLine line = approvalLineRepository.findByIdForUpdate(lineId)
                .orElseThrow(() -> new BusinessException("APR_NOT_FOUND", "결재선을 찾을 수 없습니다.", 404));

        Document document = line.getDocument();

        // Validate document status is SUBMITTED
        if (document.getStatus() != DocumentStatus.SUBMITTED) {
            throw new BusinessException("APR_DOC_NOT_SUBMITTED", "제출 상태의 문서만 결재할 수 있습니다.");
        }

        // Validate line belongs to this user
        if (!line.getApprover().getId().equals(userId)) {
            throw new BusinessException("APR_NOT_AUTHORIZED", "본인의 결재만 처리할 수 있습니다.", 403);
        }

        // Validate line status is PENDING
        if (line.getStatus() != ApprovalLineStatus.PENDING) {
            throw new BusinessException("APR_ALREADY_PROCESSED", "이미 처리된 결재입니다.");
        }

        // Validate it's this user's turn
        if (!line.getStepOrder().equals(document.getCurrentStep())) {
            throw new BusinessException("APR_NOT_YOUR_TURN", "현재 결재 순서가 아닙니다.");
        }

        // Update line
        line.setStatus(ApprovalLineStatus.APPROVED);
        line.setComment(comment);
        line.setActedAt(LocalDateTime.now());
        approvalLineRepository.save(line);

        // Find next sequential step (APPROVE or AGREE with stepOrder > currentStep)
        List<ApprovalLine> allLines = approvalLineRepository.findByDocumentIdOrderByStepOrderAsc(document.getId());
        ApprovalLine nextLine = allLines.stream()
                .filter(al -> al.getStatus() == ApprovalLineStatus.PENDING)
                .filter(al -> al.getStepOrder() > document.getCurrentStep())
                .filter(al -> al.getLineType() == ApprovalLineType.APPROVE || al.getLineType() == ApprovalLineType.AGREE)
                .findFirst()
                .orElse(null);

        if (nextLine != null) {
            document.setCurrentStep(nextLine.getStepOrder());
        } else {
            // Final approval
            document.setStatus(DocumentStatus.APPROVED);
            document.setCompletedAt(LocalDateTime.now());
        }
        documentRepository.save(document);
    }

    public void reject(Long userId, Long lineId, String comment) {
        ApprovalLine line = approvalLineRepository.findByIdForUpdate(lineId)
                .orElseThrow(() -> new BusinessException("APR_NOT_FOUND", "결재선을 찾을 수 없습니다.", 404));

        Document document = line.getDocument();

        // Validate document status is SUBMITTED
        if (document.getStatus() != DocumentStatus.SUBMITTED) {
            throw new BusinessException("APR_DOC_NOT_SUBMITTED", "제출 상태의 문서만 결재할 수 있습니다.");
        }

        // Validate line belongs to this user
        if (!line.getApprover().getId().equals(userId)) {
            throw new BusinessException("APR_NOT_AUTHORIZED", "본인의 결재만 처리할 수 있습니다.", 403);
        }

        // Validate line status is PENDING
        if (line.getStatus() != ApprovalLineStatus.PENDING) {
            throw new BusinessException("APR_ALREADY_PROCESSED", "이미 처리된 결재입니다.");
        }

        // Validate it's this user's turn
        if (!line.getStepOrder().equals(document.getCurrentStep())) {
            throw new BusinessException("APR_NOT_YOUR_TURN", "현재 결재 순서가 아닙니다.");
        }

        // Validate comment is not blank (per D-13)
        if (comment == null || comment.isBlank()) {
            throw new BusinessException("APR_COMMENT_REQUIRED", "반려 사유를 입력해주세요.");
        }

        // Update line
        line.setStatus(ApprovalLineStatus.REJECTED);
        line.setComment(comment);
        line.setActedAt(LocalDateTime.now());
        approvalLineRepository.save(line);

        // Immediately set document to REJECTED (per APR-04)
        // Remaining PENDING lines stay PENDING -- do NOT change them to SKIPPED
        document.setStatus(DocumentStatus.REJECTED);
        document.setCompletedAt(LocalDateTime.now());
        documentRepository.save(document);
    }

    @Transactional(readOnly = true)
    public Page<PendingApprovalResponse> getPendingApprovals(Long userId, Pageable pageable) {
        Page<ApprovalLine> pendingLines = approvalLineRepository.findPendingByApproverId(userId, pageable);

        // Build template name lookup
        Map<String, String> templateNameMap = approvalTemplateRepository.findByIsActiveTrueOrderBySortOrder()
                .stream()
                .collect(Collectors.toMap(ApprovalTemplate::getCode, ApprovalTemplate::getName));

        return pendingLines.map(line -> {
            Document doc = line.getDocument();
            return new PendingApprovalResponse(
                    doc.getId(),
                    doc.getDocNumber(),
                    doc.getTemplateCode(),
                    templateNameMap.getOrDefault(doc.getTemplateCode(), doc.getTemplateCode()),
                    doc.getTitle(),
                    doc.getDrafter().getId(),
                    doc.getDrafter().getName(),
                    doc.getDrafter().getDepartment() != null ? doc.getDrafter().getDepartment().getName() : null,
                    doc.getSubmittedAt()
            );
        });
    }

    @Transactional(readOnly = true)
    public Page<DocumentResponse> getCompletedDocuments(Long userId, Pageable pageable) {
        Page<Document> documents = documentRepository.findByDrafterIdAndStatusIn(
                userId, List.of(DocumentStatus.APPROVED), pageable);

        Map<String, String> templateNameMap = approvalTemplateRepository.findByIsActiveTrueOrderBySortOrder()
                .stream()
                .collect(Collectors.toMap(ApprovalTemplate::getCode, ApprovalTemplate::getName));

        return documents.map(doc -> documentMapper.toResponse(doc,
                templateNameMap.getOrDefault(doc.getTemplateCode(), doc.getTemplateCode())));
    }
}

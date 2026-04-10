package com.micesign.service;

import com.micesign.common.AuditAction;
import com.micesign.common.exception.BusinessException;
import com.micesign.domain.ApprovalLine;
import com.micesign.domain.ApprovalTemplate;
import com.micesign.domain.Document;
import com.micesign.domain.DocumentAttachment;
import com.micesign.domain.DocumentContent;
import com.micesign.domain.enums.ApprovalLineStatus;
import com.micesign.domain.enums.ApprovalLineType;
import com.micesign.domain.enums.DocumentStatus;
import com.micesign.domain.enums.NotificationEventType;
import com.micesign.dto.document.ApprovalActionRequest;
import com.micesign.dto.document.ApprovalLineResponse;
import com.micesign.dto.document.AttachmentResponse;
import com.micesign.dto.document.DocumentDetailResponse;
import com.micesign.dto.document.DocumentResponse;
import com.micesign.dto.document.PendingApprovalResponse;
import com.micesign.event.ApprovalNotificationEvent;
import com.micesign.mapper.DocumentMapper;
import com.micesign.repository.ApprovalLineRepository;
import com.micesign.repository.ApprovalTemplateRepository;
import com.micesign.repository.DocumentAttachmentRepository;
import com.micesign.repository.DocumentContentRepository;
import com.micesign.repository.DocumentRepository;
import org.springframework.context.ApplicationEventPublisher;
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
    private final DocumentContentRepository documentContentRepository;
    private final DocumentAttachmentRepository attachmentRepository;
    private final ApprovalTemplateRepository approvalTemplateRepository;
    private final DocumentMapper documentMapper;
    private final AuditLogService auditLogService;
    private final ApplicationEventPublisher eventPublisher;

    public ApprovalService(ApprovalLineRepository approvalLineRepository,
                           DocumentRepository documentRepository,
                           DocumentContentRepository documentContentRepository,
                           DocumentAttachmentRepository attachmentRepository,
                           ApprovalTemplateRepository approvalTemplateRepository,
                           DocumentMapper documentMapper,
                           AuditLogService auditLogService,
                           ApplicationEventPublisher eventPublisher) {
        this.approvalLineRepository = approvalLineRepository;
        this.documentRepository = documentRepository;
        this.documentContentRepository = documentContentRepository;
        this.attachmentRepository = attachmentRepository;
        this.approvalTemplateRepository = approvalTemplateRepository;
        this.documentMapper = documentMapper;
        this.auditLogService = auditLogService;
        this.eventPublisher = eventPublisher;
    }

    // ──────────────────────────────────────────────
    // approve
    // ──────────────────────────────────────────────

    public DocumentDetailResponse approve(Long approvalLineId, ApprovalActionRequest request, Long userId) {
        ApprovalLine line = approvalLineRepository.findByIdForUpdate(approvalLineId)
                .orElseThrow(() -> new BusinessException("APR_NOT_FOUND", "결재선을 찾을 수 없습니다.", 404));

        Document document = line.getDocument();
        validateApprovalAction(line, document, userId);

        // Update line
        line.setStatus(ApprovalLineStatus.APPROVED);
        line.setComment(request.comment());
        line.setActedAt(LocalDateTime.now());
        approvalLineRepository.save(line);

        // Check if all lines at this step are processed
        List<ApprovalLine> currentStepLines = approvalLineRepository
                .findByDocumentIdAndStepOrder(document.getId(), document.getCurrentStep());
        boolean allProcessed = currentStepLines.stream()
                .allMatch(l -> l.getStatus() != ApprovalLineStatus.PENDING);

        String notificationEventType;

        if (allProcessed) {
            // Find next step (non-REFERENCE, PENDING)
            List<ApprovalLine> allLines = approvalLineRepository
                    .findByDocumentIdOrderByStepOrderAsc(document.getId());
            ApprovalLine nextLine = allLines.stream()
                    .filter(al -> al.getStatus() == ApprovalLineStatus.PENDING)
                    .filter(al -> al.getStepOrder() > document.getCurrentStep())
                    .filter(al -> al.getLineType() == ApprovalLineType.APPROVE
                            || al.getLineType() == ApprovalLineType.AGREE)
                    .findFirst()
                    .orElse(null);

            if (nextLine != null) {
                document.setCurrentStep(nextLine.getStepOrder());
                notificationEventType = NotificationEventType.APPROVE.name();
            } else {
                // Final approval
                document.setStatus(DocumentStatus.APPROVED);
                document.setCompletedAt(LocalDateTime.now());
                notificationEventType = NotificationEventType.FINAL_APPROVE.name();
            }
        } else {
            notificationEventType = NotificationEventType.APPROVE.name();
        }

        documentRepository.save(document);

        auditLogService.log(userId, AuditAction.DOC_APPROVE, "DOCUMENT", document.getId(),
                "{\"step\":" + line.getStepOrder() + "}");

        eventPublisher.publishEvent(
                new ApprovalNotificationEvent(document.getId(), notificationEventType, userId));

        return buildDetailResponse(document);
    }

    // ──────────────────────────────────────────────
    // reject
    // ──────────────────────────────────────────────

    public DocumentDetailResponse reject(Long approvalLineId, ApprovalActionRequest request, Long userId) {
        ApprovalLine line = approvalLineRepository.findByIdForUpdate(approvalLineId)
                .orElseThrow(() -> new BusinessException("APR_NOT_FOUND", "결재선을 찾을 수 없습니다.", 404));

        Document document = line.getDocument();
        validateApprovalAction(line, document, userId);

        // Comment is MANDATORY for rejection
        if (request.comment() == null || request.comment().isBlank()) {
            throw new BusinessException("APR_COMMENT_REQUIRED", "반려 사유를 입력해주세요.");
        }

        // Update line
        line.setStatus(ApprovalLineStatus.REJECTED);
        line.setComment(request.comment());
        line.setActedAt(LocalDateTime.now());
        approvalLineRepository.save(line);

        // Immediately set document to REJECTED
        // Remaining PENDING lines stay PENDING -- do NOT change them to SKIPPED
        document.setStatus(DocumentStatus.REJECTED);
        document.setCompletedAt(LocalDateTime.now());
        documentRepository.save(document);

        auditLogService.log(userId, AuditAction.DOC_REJECT, "DOCUMENT", document.getId(),
                "{\"step\":" + line.getStepOrder() + "}");

        eventPublisher.publishEvent(
                new ApprovalNotificationEvent(document.getId(), NotificationEventType.REJECT.name(), userId));

        return buildDetailResponse(document);
    }

    // ──────────────────────────────────────────────
    // getPendingApprovals
    // ──────────────────────────────────────────────

    @Transactional(readOnly = true)
    public Page<PendingApprovalResponse> getPendingApprovals(Long userId, Pageable pageable) {
        Page<ApprovalLine> pendingLines = approvalLineRepository.findPendingByApproverId(userId, pageable);

        return pendingLines.map(line -> {
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
        });
    }

    // ──────────────────────────────────────────────
    // getCompletedApprovals
    // ──────────────────────────────────────────────

    @Transactional(readOnly = true)
    public Page<DocumentResponse> getCompletedApprovals(Long userId, Pageable pageable) {
        // Find documents where user has an APPROVED or REJECTED approval line
        List<ApprovalLine> actedLines = approvalLineRepository
                .findByApproverIdAndStatus(userId, ApprovalLineStatus.APPROVED);
        actedLines.addAll(approvalLineRepository
                .findByApproverIdAndStatus(userId, ApprovalLineStatus.REJECTED));

        // For now, delegate to a paginated query on drafter's completed documents
        // In a production system, this would use a custom query joining approval_line
        Page<Document> documents = documentRepository.findByDrafterIdAndStatusIn(
                userId, List.of(DocumentStatus.APPROVED, DocumentStatus.REJECTED), pageable);

        Map<String, String> templateNameMap = buildTemplateNameMap();
        return documents.map(doc -> documentMapper.toResponse(doc,
                templateNameMap.getOrDefault(doc.getTemplateCode(), doc.getTemplateCode())));
    }

    // ──────────────────────────────────────────────
    // Private helpers
    // ──────────────────────────────────────────────

    private void validateApprovalAction(ApprovalLine line, Document document, Long userId) {
        if (!line.getApprover().getId().equals(userId)) {
            throw new BusinessException("APR_NOT_AUTHORIZED", "본인의 결재만 처리할 수 있습니다.", 403);
        }

        if (line.getStatus() != ApprovalLineStatus.PENDING) {
            throw new BusinessException("APR_ALREADY_PROCESSED", "이미 처리된 결재입니다.");
        }

        if (document.getStatus() != DocumentStatus.SUBMITTED) {
            throw new BusinessException("APR_DOC_NOT_SUBMITTED", "제출 상태의 문서만 결재할 수 있습니다.");
        }

        if (!line.getStepOrder().equals(document.getCurrentStep())) {
            throw new BusinessException("APR_NOT_YOUR_TURN", "현재 결재 순서가 아닙니다.");
        }
    }

    private DocumentDetailResponse buildDetailResponse(Document document) {
        DocumentContent content = documentContentRepository.findByDocumentId(document.getId())
                .orElse(null);

        List<ApprovalLine> approvalLines = approvalLineRepository
                .findByDocumentIdOrderByStepOrderAsc(document.getId());
        List<ApprovalLineResponse> lineResponses = approvalLines.stream()
                .map(documentMapper::toApprovalLineResponse)
                .toList();

        List<AttachmentResponse> attachmentResponses = attachmentRepository
                .findByDocumentId(document.getId()).stream()
                .map(a -> new AttachmentResponse(a.getId(), a.getDocumentId(), a.getOriginalName(),
                        a.getFileSize(), a.getMimeType(), a.getCreatedAt()))
                .toList();

        String templateName = getTemplateName(document.getTemplateCode());
        return documentMapper.toDetailResponse(document, content, templateName,
                lineResponses, attachmentResponses);
    }

    private String getTemplateName(String templateCode) {
        return approvalTemplateRepository.findByCode(templateCode)
                .map(ApprovalTemplate::getName)
                .orElse(templateCode);
    }

    private Map<String, String> buildTemplateNameMap() {
        return approvalTemplateRepository.findByIsActiveTrueOrderBySortOrder()
                .stream()
                .collect(Collectors.toMap(ApprovalTemplate::getCode, ApprovalTemplate::getName));
    }
}

package com.micesign.service;

import com.micesign.common.AuditAction;
import com.micesign.common.exception.BusinessException;
import com.micesign.domain.ApprovalLine;
import com.micesign.domain.ApprovalTemplate;
import com.micesign.domain.DocSequence;
import com.micesign.domain.Document;
import com.micesign.domain.DocumentAttachment;
import com.micesign.domain.DocumentContent;
import com.micesign.domain.User;
import com.micesign.domain.enums.ApprovalLineStatus;
import com.micesign.domain.enums.ApprovalLineType;
import com.micesign.domain.enums.DocumentStatus;
import com.micesign.domain.enums.NotificationEventType;
import com.micesign.domain.enums.UserRole;
import com.micesign.dto.document.ApprovalLineRequest;
import com.micesign.dto.document.ApprovalLineResponse;
import com.micesign.dto.document.AttachmentResponse;
import com.micesign.dto.document.CreateDocumentRequest;
import com.micesign.dto.document.DocumentDetailResponse;
import com.micesign.dto.document.DocumentResponse;
import com.micesign.dto.document.DocumentSearchCondition;
import com.micesign.dto.document.UpdateDocumentRequest;
import com.micesign.event.ApprovalNotificationEvent;
import com.micesign.event.BudgetCancellationEvent;
import com.micesign.event.BudgetIntegrationEvent;
import com.micesign.mapper.DocumentMapper;
import com.micesign.repository.ApprovalLineRepository;
import com.micesign.repository.ApprovalTemplateRepository;
import com.micesign.repository.DocSequenceRepository;
import com.micesign.repository.DocumentAttachmentRepository;
import com.micesign.repository.DocumentContentRepository;
import com.micesign.repository.DocumentRepository;
import com.micesign.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@Transactional
public class DocumentService {

    private static final Logger log = LoggerFactory.getLogger(DocumentService.class);

    private final DocumentRepository documentRepository;
    private final DocumentContentRepository documentContentRepository;
    private final DocumentAttachmentRepository attachmentRepository;
    private final ApprovalTemplateRepository approvalTemplateRepository;
    private final ApprovalLineRepository approvalLineRepository;
    private final DocSequenceRepository docSequenceRepository;
    private final UserRepository userRepository;
    private final DocumentFormValidator formValidator;
    private final DocumentMapper documentMapper;
    private final GoogleDriveService googleDriveService;
    private final AuditLogService auditLogService;
    private final ApplicationEventPublisher eventPublisher;
    private final TemplateSchemaService templateSchemaService;

    public DocumentService(DocumentRepository documentRepository,
                           DocumentContentRepository documentContentRepository,
                           DocumentAttachmentRepository attachmentRepository,
                           ApprovalTemplateRepository approvalTemplateRepository,
                           ApprovalLineRepository approvalLineRepository,
                           DocSequenceRepository docSequenceRepository,
                           UserRepository userRepository,
                           DocumentFormValidator formValidator,
                           DocumentMapper documentMapper,
                           GoogleDriveService googleDriveService,
                           AuditLogService auditLogService,
                           ApplicationEventPublisher eventPublisher,
                           TemplateSchemaService templateSchemaService) {
        this.documentRepository = documentRepository;
        this.documentContentRepository = documentContentRepository;
        this.attachmentRepository = attachmentRepository;
        this.approvalTemplateRepository = approvalTemplateRepository;
        this.approvalLineRepository = approvalLineRepository;
        this.docSequenceRepository = docSequenceRepository;
        this.userRepository = userRepository;
        this.formValidator = formValidator;
        this.documentMapper = documentMapper;
        this.googleDriveService = googleDriveService;
        this.auditLogService = auditLogService;
        this.eventPublisher = eventPublisher;
        this.templateSchemaService = templateSchemaService;
    }

    // ──────────────────────────────────────────────
    // 1. createDocument
    // ──────────────────────────────────────────────

    public DocumentDetailResponse createDocument(CreateDocumentRequest request, Long userId) {
        ApprovalTemplate template = approvalTemplateRepository.findByCode(request.templateCode())
                .orElseThrow(() -> new BusinessException("TPL_NOT_FOUND", "양식을 찾을 수 없습니다.", 404));

        if (!template.isActive()) {
            throw new BusinessException("TPL_INACTIVE", "비활성화된 양식입니다.");
        }

        User drafter = userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException("USER_NOT_FOUND", "사용자를 찾을 수 없습니다.", 404));

        // Create document entity
        Document document = new Document();
        document.setTemplateCode(request.templateCode());
        document.setTitle(request.title());
        document.setDrafter(drafter);
        document.setStatus(DocumentStatus.DRAFT);
        document = documentRepository.save(document);

        // Create content
        DocumentContent content = new DocumentContent();
        content.setDocument(document);
        content.setBodyHtml(request.bodyHtml());
        content.setFormData(request.formData());

        // Dynamic template: snapshot schema_version and schema_definition
        if (template.getSchemaDefinition() != null) {
            content.setSchemaVersion(template.getSchemaVersion());
            String resolvedSchema = templateSchemaService.resolveSchemaWithOptions(
                    template.getSchemaDefinition());
            content.setSchemaDefinitionSnapshot(resolvedSchema);
        }

        documentContentRepository.save(content);

        // Save approval lines if provided
        if (request.approvalLines() != null && !request.approvalLines().isEmpty()) {
            saveApprovalLines(document, request.approvalLines());
        }

        auditLogService.log(userId, AuditAction.DOC_CREATE, "DOCUMENT", document.getId(),
                "{\"templateCode\":\"" + request.templateCode() + "\"}");

        return buildDetailResponse(document);
    }

    // ──────────────────────────────────────────────
    // 2. updateDocument
    // ──────────────────────────────────────────────

    public DocumentDetailResponse updateDocument(Long docId, UpdateDocumentRequest request, Long userId) {
        Document document = loadAndVerifyOwnerDraft(docId, userId);

        // Update document fields
        document.setTitle(request.title());
        documentRepository.save(document);

        // Update content
        DocumentContent content = documentContentRepository.findByDocumentId(docId)
                .orElseThrow(() -> new BusinessException("DOC_CONTENT_NOT_FOUND", "문서 내용을 찾을 수 없습니다."));
        content.setBodyHtml(request.bodyHtml());
        content.setFormData(request.formData());

        // Refresh schema snapshot for dynamic templates
        ApprovalTemplate template = approvalTemplateRepository.findByCode(document.getTemplateCode())
                .orElse(null);
        if (template != null && template.getSchemaDefinition() != null) {
            content.setSchemaVersion(template.getSchemaVersion());
            String resolvedSchema = templateSchemaService.resolveSchemaWithOptions(
                    template.getSchemaDefinition());
            content.setSchemaDefinitionSnapshot(resolvedSchema);
        }

        documentContentRepository.save(content);

        // Replace approval lines (delete old, save new)
        if (request.approvalLines() != null) {
            approvalLineRepository.deleteByDocumentId(docId);
            if (!request.approvalLines().isEmpty()) {
                saveApprovalLines(document, request.approvalLines());
            }
        }

        return buildDetailResponse(document);
    }

    // ──────────────────────────────────────────────
    // 3. getDocument
    // ──────────────────────────────────────────────

    @Transactional(readOnly = true)
    public DocumentDetailResponse getDocument(Long docId, Long userId, UserRole role, Long departmentId) {
        Document document = documentRepository.findById(docId)
                .orElseThrow(() -> new BusinessException("DOC_NOT_FOUND", "문서를 찾을 수 없습니다.", 404));

        // Check view permission
        boolean isDrafter = document.getDrafter().getId().equals(userId);
        boolean isApprovalParticipant = approvalLineRepository.existsByDocumentIdAndApproverId(docId, userId);
        boolean isAdminSameDept = role == UserRole.ADMIN
                && departmentId != null
                && departmentId.equals(document.getDrafter().getDepartmentId());
        boolean isSuperAdmin = role == UserRole.SUPER_ADMIN;

        if (!isDrafter && !isApprovalParticipant && !isAdminSameDept && !isSuperAdmin) {
            throw new BusinessException("DOC_ACCESS_DENIED", "문서 조회 권한이 없습니다.", 403);
        }

        auditLogService.log(userId, AuditAction.DOC_VIEW, "DOCUMENT", docId, null);

        return buildDetailResponse(document);
    }

    // ──────────────────────────────────────────────
    // 4. deleteDocument
    // ──────────────────────────────────────────────

    public void deleteDocument(Long docId, Long userId) {
        Document document = loadAndVerifyOwnerDraft(docId, userId);

        // Delete attachments from Google Drive
        List<DocumentAttachment> attachments = attachmentRepository.findByDocumentId(docId);
        for (DocumentAttachment attachment : attachments) {
            try {
                googleDriveService.deleteFile(attachment.getGdriveFileId());
            } catch (Exception e) {
                log.warn("Failed to delete attachment from Google Drive: fileId={}, error={}",
                        attachment.getGdriveFileId(), e.getMessage());
            }
        }
        attachmentRepository.deleteAll(attachments);

        // Delete approval lines
        approvalLineRepository.deleteByDocumentId(docId);

        // Delete content
        documentContentRepository.findByDocumentId(docId)
                .ifPresent(documentContentRepository::delete);

        // Delete document
        documentRepository.delete(document);
    }

    // ──────────────────────────────────────────────
    // 5. submitDocument
    // ──────────────────────────────────────────────

    public DocumentDetailResponse submitDocument(Long docId, Long userId) {
        Document document = loadAndVerifyOwnerDraft(docId, userId);

        // Validate title
        if (document.getTitle() == null || document.getTitle().isBlank()) {
            throw new BusinessException("DOC_TITLE_REQUIRED", "문서 제목이 필요합니다.");
        }

        // Validate approval lines
        // TODO Phase 7: Re-enable approval line validation
        // List<ApprovalLine> approvalLines = approvalLineRepository.findByDocumentIdOrderByStepOrderAsc(docId);
        // boolean hasApprover = approvalLines.stream()
        //         .anyMatch(line -> line.getLineType() == ApprovalLineType.APPROVE);
        // if (!hasApprover) {
        //     throw new BusinessException("APR_NO_APPROVER", "최소 1명의 승인자(승인 유형)를 추가해주세요.");
        // }
        // boolean drafterInLine = approvalLines.stream()
        //         .anyMatch(line -> line.getApprover().getId().equals(userId));
        // if (drafterInLine) {
        //     throw new BusinessException("APR_SELF_NOT_ALLOWED", "기안자는 결재선에 포함될 수 없습니다.");
        // }

        // Run form validation
        DocumentContent content = documentContentRepository.findByDocumentId(docId)
                .orElseThrow(() -> new BusinessException("DOC_CONTENT_NOT_FOUND", "문서 내용을 찾을 수 없습니다."));
        formValidator.validate(document.getTemplateCode(), content.getBodyHtml(), content.getFormData());

        // Generate document number
        String docNumber = generateDocNumber(document.getTemplateCode());

        // Update document state
        document.setDocNumber(docNumber);
        document.setStatus(DocumentStatus.SUBMITTED);
        document.setSubmittedAt(LocalDateTime.now());

        // Set currentStep to first non-REFERENCE step (if approval lines exist)
        List<ApprovalLine> approvalLines = approvalLineRepository.findByDocumentIdOrderByStepOrderAsc(docId);
        if (!approvalLines.isEmpty()) {
            int firstStep = approvalLines.stream()
                    .filter(line -> line.getLineType() != ApprovalLineType.REFERENCE)
                    .mapToInt(ApprovalLine::getStepOrder)
                    .min()
                    .orElse(1);
            document.setCurrentStep(firstStep);
        }
        // Phase 6: If no approval lines, currentStep stays null
        documentRepository.save(document);

        // Move attachments from draft folder to permanent folder
        moveAttachmentsToPermanentFolder(docId, docNumber);

        auditLogService.log(userId, AuditAction.DOC_SUBMIT, "DOCUMENT", docId,
                "{\"docNumber\":\"" + docNumber + "\"}");

        // Publish notification event only if approval lines exist
        if (!approvalLines.isEmpty()) {
            eventPublisher.publishEvent(
                    new ApprovalNotificationEvent(docId, NotificationEventType.SUBMIT.name(), userId));
        }

        // Budget integration event if template.budgetEnabled
        ApprovalTemplate template = approvalTemplateRepository.findByCode(document.getTemplateCode())
                .orElse(null);
        if (template != null && template.isBudgetEnabled()) {
            eventPublisher.publishEvent(
                    new BudgetIntegrationEvent(document.getId(), document.getTemplateCode(),
                            document.getDocNumber(), userId));
        }

        return buildDetailResponse(document);
    }

    // ──────────────────────────────────────────────
    // 6. withdrawDocument
    // ──────────────────────────────────────────────

    public DocumentDetailResponse withdrawDocument(Long docId, Long userId) {
        Document document = documentRepository.findById(docId)
                .orElseThrow(() -> new BusinessException("DOC_NOT_FOUND", "문서를 찾을 수 없습니다.", 404));

        if (!document.getDrafter().getId().equals(userId)) {
            throw new BusinessException("DOC_NOT_OWNER", "본인의 문서만 회수할 수 있습니다.", 403);
        }

        if (document.getStatus() != DocumentStatus.SUBMITTED) {
            throw new BusinessException("DOC_NOT_SUBMITTED", "제출 상태의 문서만 회수할 수 있습니다.");
        }

        // Check current step approvers are all PENDING
        List<ApprovalLine> currentStepLines = approvalLineRepository
                .findByDocumentIdAndStepOrder(docId, document.getCurrentStep());
        boolean anyActed = currentStepLines.stream()
                .anyMatch(line -> line.getStatus() != ApprovalLineStatus.PENDING);
        if (anyActed) {
            throw new BusinessException("APR_ALREADY_IN_PROGRESS",
                    "이미 결재가 진행되어 회수할 수 없습니다.");
        }

        // Set document WITHDRAWN
        document.setStatus(DocumentStatus.WITHDRAWN);
        document.setCompletedAt(LocalDateTime.now());
        documentRepository.save(document);

        // Skip all PENDING approval lines
        List<ApprovalLine> allLines = approvalLineRepository.findByDocumentIdOrderByStepOrderAsc(docId);
        for (ApprovalLine line : allLines) {
            if (line.getStatus() == ApprovalLineStatus.PENDING) {
                line.setStatus(ApprovalLineStatus.SKIPPED);
                approvalLineRepository.save(line);
            }
        }

        auditLogService.log(userId, AuditAction.DOC_WITHDRAW, "DOCUMENT", docId, null);

        eventPublisher.publishEvent(
                new ApprovalNotificationEvent(docId, NotificationEventType.WITHDRAW.name(), userId));

        // Budget cancellation if enabled
        ApprovalTemplate template = approvalTemplateRepository.findByCode(document.getTemplateCode())
                .orElse(null);
        if (template != null && template.isBudgetEnabled()) {
            eventPublisher.publishEvent(
                    new BudgetCancellationEvent(document.getId(), document.getTemplateCode(),
                            document.getDocNumber()));
        }

        return buildDetailResponse(document);
    }

    // ──────────────────────────────────────────────
    // 7. rewriteDocument
    // ──────────────────────────────────────────────

    public DocumentDetailResponse rewriteDocument(Long docId, Long userId) {
        Document sourceDoc = documentRepository.findById(docId)
                .orElseThrow(() -> new BusinessException("DOC_NOT_FOUND", "문서를 찾을 수 없습니다.", 404));

        if (!sourceDoc.getDrafter().getId().equals(userId)) {
            throw new BusinessException("DOC_NOT_OWNER", "본인의 문서만 재기안할 수 있습니다.", 403);
        }

        if (sourceDoc.getStatus() != DocumentStatus.REJECTED
                && sourceDoc.getStatus() != DocumentStatus.WITHDRAWN) {
            throw new BusinessException("DOC_CANNOT_REWRITE",
                    "반려 또는 회수된 문서만 재기안할 수 있습니다.");
        }

        User drafter = userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException("USER_NOT_FOUND", "사용자를 찾을 수 없습니다."));

        // Create new DRAFT document
        Document newDoc = new Document();
        newDoc.setTemplateCode(sourceDoc.getTemplateCode());
        newDoc.setTitle(sourceDoc.getTitle());
        newDoc.setDrafter(drafter);
        newDoc.setStatus(DocumentStatus.DRAFT);
        newDoc.setSourceDocId(docId);
        newDoc = documentRepository.save(newDoc);

        // Copy content
        DocumentContent sourceContent = documentContentRepository.findByDocumentId(docId).orElse(null);
        if (sourceContent != null) {
            DocumentContent newContent = new DocumentContent();
            newContent.setDocument(newDoc);
            newContent.setBodyHtml(sourceContent.getBodyHtml());
            newContent.setFormData(sourceContent.getFormData());
            documentContentRepository.save(newContent);
        }

        // Copy approval lines (reset status to PENDING)
        List<ApprovalLine> sourceLines = approvalLineRepository.findByDocumentIdOrderByStepOrderAsc(docId);
        for (ApprovalLine sourceLine : sourceLines) {
            ApprovalLine newLine = new ApprovalLine();
            newLine.setDocument(newDoc);
            newLine.setApprover(sourceLine.getApprover());
            newLine.setLineType(sourceLine.getLineType());
            newLine.setStepOrder(sourceLine.getStepOrder());
            newLine.setStatus(ApprovalLineStatus.PENDING);
            approvalLineRepository.save(newLine);
        }

        return buildDetailResponse(newDoc);
    }

    // ──────────────────────────────────────────────
    // 8. searchDocuments
    // ──────────────────────────────────────────────

    @Transactional(readOnly = true)
    public Page<DocumentResponse> searchDocuments(DocumentSearchCondition condition, Long userId,
                                                   UserRole role, Long departmentId, Pageable pageable) {
        return documentRepository.searchDocuments(condition, userId, role.name(), departmentId, pageable);
    }

    // ──────────────────────────────────────────────
    // 9. getMyDocuments (convenience)
    // ──────────────────────────────────────────────

    @Transactional(readOnly = true)
    public Page<DocumentResponse> getMyDocuments(Long userId, List<DocumentStatus> statuses, Pageable pageable) {
        Page<Document> documents;
        if (statuses != null && !statuses.isEmpty()) {
            documents = documentRepository.findByDrafterIdAndStatusIn(userId, statuses, pageable);
        } else {
            documents = documentRepository.findByDrafterId(userId, pageable);
        }

        Map<String, String> templateNameMap = buildTemplateNameMap();
        return documents.map(doc -> documentMapper.toResponse(doc,
                templateNameMap.getOrDefault(doc.getTemplateCode(), doc.getTemplateCode())));
    }

    // ──────────────────────────────────────────────
    // generateDocNumber
    // ──────────────────────────────────────────────

    String generateDocNumber(String templateCode) {
        int currentYear = LocalDateTime.now().getYear();

        ApprovalTemplate template = approvalTemplateRepository.findByCode(templateCode)
                .orElseThrow(() -> new BusinessException("TPL_NOT_FOUND", "양식을 찾을 수 없습니다."));
        String prefix = template.getPrefix();

        // Pessimistic lock on sequence row
        DocSequence seq = docSequenceRepository.findByTemplateCodeAndYearForUpdate(templateCode, currentYear)
                .orElseGet(() -> {
                    DocSequence newSeq = new DocSequence();
                    newSeq.setTemplateCode(templateCode);
                    newSeq.setYear(currentYear);
                    newSeq.setLastSequence(0);
                    return docSequenceRepository.save(newSeq);
                });

        seq.setLastSequence(seq.getLastSequence() + 1);
        docSequenceRepository.save(seq);

        return String.format("%s-%d-%04d", prefix, currentYear, seq.getLastSequence());
    }

    // ──────────────────────────────────────────────
    // Private helpers
    // ──────────────────────────────────────────────

    private void saveApprovalLines(Document document, List<ApprovalLineRequest> requests) {
        // No self-addition
        for (ApprovalLineRequest req : requests) {
            if (req.approverId().equals(document.getDrafter().getId())) {
                throw new BusinessException("APR_SELF_NOT_ALLOWED", "본인은 결재선에 추가할 수 없습니다.");
            }
        }

        // No duplicates
        Set<Long> approverIds = new HashSet<>();
        for (ApprovalLineRequest req : requests) {
            if (!approverIds.add(req.approverId())) {
                throw new BusinessException("APR_DUPLICATE", "이미 추가된 사용자입니다.");
            }
        }

        // REFERENCE gets stepOrder=0, APPROVE/AGREE get sequential 1, 2, 3...
        int sequentialStep = 1;
        for (ApprovalLineRequest req : requests) {
            ApprovalLine line = new ApprovalLine();
            line.setDocument(document);

            User approver = userRepository.findById(req.approverId())
                    .orElseThrow(() -> new BusinessException("USER_NOT_FOUND", "결재자를 찾을 수 없습니다."));
            line.setApprover(approver);

            ApprovalLineType lineType = ApprovalLineType.valueOf(req.lineType());
            line.setLineType(lineType);
            line.setStatus(ApprovalLineStatus.PENDING);

            if (lineType == ApprovalLineType.REFERENCE) {
                line.setStepOrder(0);
            } else {
                line.setStepOrder(sequentialStep++);
            }

            approvalLineRepository.save(line);
        }
    }

    private Document loadAndVerifyOwnerDraft(Long docId, Long userId) {
        Document document = documentRepository.findById(docId)
                .orElseThrow(() -> new BusinessException("DOC_NOT_FOUND", "문서를 찾을 수 없습니다.", 404));

        if (!document.getDrafter().getId().equals(userId)) {
            throw new BusinessException("DOC_NOT_OWNER", "본인의 문서만 수정할 수 있습니다.", 403);
        }

        if (document.getStatus() != DocumentStatus.DRAFT) {
            throw new BusinessException("DOC_NOT_DRAFT", "임시저장 상태의 문서만 수정할 수 있습니다.");
        }

        return document;
    }

    private DocumentDetailResponse buildDetailResponse(Document document) {
        DocumentContent content = documentContentRepository.findByDocumentId(document.getId())
                .orElse(null);

        List<ApprovalLine> approvalLines = approvalLineRepository
                .findByDocumentIdOrderByStepOrderAsc(document.getId());
        List<ApprovalLineResponse> approvalLineResponses = approvalLines.stream()
                .map(documentMapper::toApprovalLineResponse)
                .toList();

        List<DocumentAttachment> attachmentEntities = attachmentRepository
                .findByDocumentId(document.getId());
        List<AttachmentResponse> attachmentResponses = attachmentEntities.stream()
                .map(a -> new AttachmentResponse(a.getId(), a.getDocumentId(), a.getOriginalName(),
                        a.getFileSize(), a.getMimeType(), a.getCreatedAt()))
                .toList();

        String templateName = getTemplateName(document.getTemplateCode());
        return documentMapper.toDetailResponse(document, content, templateName,
                approvalLineResponses, attachmentResponses);
    }

    private void moveAttachmentsToPermanentFolder(Long documentId, String docNumber) {
        List<DocumentAttachment> attachments = attachmentRepository.findByDocumentId(documentId);
        if (attachments.isEmpty()) {
            return;
        }

        try {
            int year = LocalDateTime.now().getYear();
            String month = String.format("%02d", LocalDateTime.now().getMonthValue());
            String permanentPath = String.format("MiceSign/%d/%s/%s/", year, month, docNumber);

            String newFolderId = googleDriveService.findOrCreateFolder(permanentPath);

            for (DocumentAttachment attachment : attachments) {
                String oldFolderId = googleDriveService.findOrCreateFolder(attachment.getGdriveFolder());
                googleDriveService.moveFile(attachment.getGdriveFileId(), oldFolderId, newFolderId);
                attachment.setGdriveFolder(permanentPath);
                attachmentRepository.save(attachment);
            }
        } catch (Exception e) {
            log.warn("Failed to move attachments to permanent folder for document {}: {}",
                    documentId, e.getMessage(), e);
        }
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

package com.micesign.service;

import com.micesign.common.exception.BusinessException;
import com.micesign.domain.ApprovalLine;
import com.micesign.domain.ApprovalTemplate;
import com.micesign.domain.DocSequence;
import com.micesign.domain.Document;
import com.micesign.domain.DocumentContent;
import com.micesign.domain.User;
import com.micesign.domain.DocumentAttachment;
import com.micesign.domain.enums.ApprovalLineStatus;
import com.micesign.domain.enums.ApprovalLineType;
import com.micesign.domain.enums.DocumentStatus;
import com.micesign.dto.document.*;
import com.micesign.common.AuditAction;
import com.micesign.event.ApprovalNotificationEvent;
import com.micesign.domain.enums.NotificationEventType;
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
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;
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
    private final ApplicationEventPublisher applicationEventPublisher;

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
                           ApplicationEventPublisher applicationEventPublisher) {
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
        this.applicationEventPublisher = applicationEventPublisher;
    }

    public DocumentResponse createDocument(Long userId, CreateDocumentRequest req) {
        // Validate template exists
        ApprovalTemplate template = approvalTemplateRepository.findByCode(req.templateCode())
                .orElseThrow(() -> new BusinessException("TPL_NOT_FOUND", "양식을 찾을 수 없습니다."));

        // Validate form data
        formValidator.validate(req.templateCode(), req.bodyHtml(), req.formData());

        // Load drafter
        User drafter = userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException("USER_NOT_FOUND", "사용자를 찾을 수 없습니다."));

        // Create document
        Document document = new Document();
        document.setTemplateCode(req.templateCode());
        document.setTitle(req.title());
        document.setDrafter(drafter);
        document.setStatus(DocumentStatus.DRAFT);
        document = documentRepository.save(document);

        // Create content
        DocumentContent content = new DocumentContent();
        content.setDocument(document);
        content.setBodyHtml(req.bodyHtml());
        content.setFormData(req.formData());
        documentContentRepository.save(content);

        // Save approval lines if provided
        if (req.approvalLines() != null && !req.approvalLines().isEmpty()) {
            saveApprovalLines(document, req.approvalLines());
        }

        auditLogService.log(userId, AuditAction.DOCUMENT_CREATE, "DOCUMENT", document.getId(),
                "{\"template\": \"" + req.templateCode() + "\"}");

        return documentMapper.toResponse(document, template.getName());
    }

    public DocumentResponse updateDocument(Long userId, Long documentId, UpdateDocumentRequest req) {
        Document document = loadAndVerifyOwnerDraft(userId, documentId);

        // Validate form data
        formValidator.validate(document.getTemplateCode(), req.bodyHtml(), req.formData());

        // Update document
        document.setTitle(req.title());
        documentRepository.save(document);

        // Update content
        DocumentContent content = documentContentRepository.findByDocumentId(documentId)
                .orElseThrow(() -> new BusinessException("DOC_NOT_FOUND", "문서 내용을 찾을 수 없습니다."));
        content.setBodyHtml(req.bodyHtml());
        content.setFormData(req.formData());
        documentContentRepository.save(content);

        // Update approval lines if provided (delete all, re-insert)
        if (req.approvalLines() != null) {
            approvalLineRepository.deleteByDocumentId(documentId);
            if (!req.approvalLines().isEmpty()) {
                saveApprovalLines(document, req.approvalLines());
            }
        }

        String templateName = getTemplateName(document.getTemplateCode());
        return documentMapper.toResponse(document, templateName);
    }

    public void deleteDocument(Long userId, Long documentId) {
        Document document = loadAndVerifyOwnerDraft(userId, documentId);

        // Delete approval lines first
        approvalLineRepository.deleteByDocumentId(documentId);

        // Delete content, then document
        documentContentRepository.findByDocumentId(documentId)
                .ifPresent(documentContentRepository::delete);
        documentRepository.delete(document);
    }

    public DocumentResponse submitDocument(Long userId, Long documentId) {
        Document document = loadAndVerifyOwnerDraft(userId, documentId);

        // Validate form data at submit time
        DocumentContent content = documentContentRepository.findByDocumentId(documentId)
                .orElseThrow(() -> new BusinessException("DOC_NOT_FOUND", "문서 내용을 찾을 수 없습니다."));
        formValidator.validate(document.getTemplateCode(), content.getBodyHtml(), content.getFormData());

        // Validate at least 1 APPROVE type exists (per D-05)
        List<ApprovalLine> approvalLines = approvalLineRepository.findByDocumentIdOrderByStepOrderAsc(documentId);
        boolean hasApprover = approvalLines.stream()
                .anyMatch(line -> line.getLineType() == ApprovalLineType.APPROVE);
        if (!hasApprover) {
            throw new BusinessException("APR_NO_APPROVER", "최소 1명의 승인자(승인 유형)를 추가해주세요.");
        }

        // Generate document number
        String docNumber = generateDocNumber(document.getTemplateCode());

        // Update document state
        document.setDocNumber(docNumber);
        document.setStatus(DocumentStatus.SUBMITTED);
        document.setSubmittedAt(LocalDateTime.now());
        document.setCurrentStep(1); // First sequential step
        documentRepository.save(document);

        // Move attachments from draft folder to permanent folder
        moveAttachmentsToPermanentFolder(documentId, docNumber);

        auditLogService.log(userId, AuditAction.DOCUMENT_SUBMIT, "DOCUMENT", documentId,
                "{\"docNumber\": \"" + document.getDocNumber() + "\"}");

        applicationEventPublisher.publishEvent(
                new ApprovalNotificationEvent(document, NotificationEventType.SUBMIT, userId, null));

        String templateName = getTemplateName(document.getTemplateCode());
        return documentMapper.toResponse(document, templateName);
    }

    @Transactional(readOnly = true)
    public Page<DocumentResponse> getMyDocuments(Long userId, List<DocumentStatus> statuses, Pageable pageable) {
        Page<Document> documents;
        if (statuses != null && !statuses.isEmpty()) {
            documents = documentRepository.findByDrafterIdAndStatusIn(userId, statuses, pageable);
        } else {
            documents = documentRepository.findByDrafterId(userId, pageable);
        }

        // Build template name lookup
        Map<String, String> templateNameMap = approvalTemplateRepository.findByIsActiveTrueOrderBySortOrder()
                .stream()
                .collect(Collectors.toMap(ApprovalTemplate::getCode, ApprovalTemplate::getName));

        return documents.map(doc -> documentMapper.toResponse(doc,
                templateNameMap.getOrDefault(doc.getTemplateCode(), doc.getTemplateCode())));
    }

    @Transactional(readOnly = true)
    public DocumentDetailResponse getDocumentDetail(Long userId, Long documentId) {
        Document document = documentRepository.findById(documentId)
                .orElseThrow(() -> new BusinessException("DOC_NOT_FOUND", "문서를 찾을 수 없습니다."));

        // Access control: drafter or approval line participant
        boolean isDrafter = document.getDrafter().getId().equals(userId);
        boolean isApprovalParticipant = approvalLineRepository.existsByDocumentIdAndApproverId(documentId, userId);
        if (!isDrafter && !isApprovalParticipant) {
            throw new BusinessException("DOC_NOT_OWNER", "본인의 문서만 조회할 수 있습니다.");
        }

        DocumentContent content = documentContentRepository.findByDocumentId(documentId)
                .orElse(null);

        // Load and map approval lines
        List<ApprovalLine> approvalLines = approvalLineRepository.findByDocumentIdOrderByStepOrderAsc(documentId);
        List<ApprovalLineResponse> approvalLineResponses = approvalLines.stream()
                .map(documentMapper::toApprovalLineResponse)
                .toList();

        String templateName = getTemplateName(document.getTemplateCode());
        return documentMapper.toDetailResponse(document, content, templateName, approvalLineResponses);
    }

    public DocumentResponse withdrawDocument(Long userId, Long documentId) {
        Document document = documentRepository.findById(documentId)
                .orElseThrow(() -> new BusinessException("DOC_NOT_FOUND", "문서를 찾을 수 없습니다.", 404));

        // Only drafter can withdraw
        if (!document.getDrafter().getId().equals(userId)) {
            throw new BusinessException("DOC_NOT_OWNER", "본인의 문서만 회수할 수 있습니다.", 403);
        }

        // Only SUBMITTED documents can be withdrawn
        if (document.getStatus() != DocumentStatus.SUBMITTED) {
            throw new BusinessException("DOC_NOT_SUBMITTED", "제출 상태의 문서만 회수할 수 있습니다.");
        }

        // Check if current step approver(s) have already acted (per D-21, FSD)
        List<ApprovalLine> currentStepLines = approvalLineRepository
                .findByDocumentIdAndStepOrder(documentId, document.getCurrentStep());
        boolean anyActed = currentStepLines.stream()
                .anyMatch(line -> line.getStatus() != ApprovalLineStatus.PENDING);
        if (anyActed) {
            throw new BusinessException("APR_ALREADY_IN_PROGRESS",
                    "이미 결재가 진행되어 회수할 수 없습니다.");
        }

        // Set document to WITHDRAWN (per D-23)
        document.setStatus(DocumentStatus.WITHDRAWN);
        document.setCompletedAt(LocalDateTime.now());
        documentRepository.save(document);

        // Change all PENDING approval lines to SKIPPED (per D-24)
        List<ApprovalLine> allLines = approvalLineRepository
                .findByDocumentIdOrderByStepOrderAsc(documentId);
        for (ApprovalLine line : allLines) {
            if (line.getStatus() == ApprovalLineStatus.PENDING) {
                line.setStatus(ApprovalLineStatus.SKIPPED);
                approvalLineRepository.save(line);
            }
        }

        auditLogService.log(userId, AuditAction.DOCUMENT_WITHDRAW, "DOCUMENT", documentId, null);

        applicationEventPublisher.publishEvent(
                new ApprovalNotificationEvent(document, NotificationEventType.WITHDRAW, userId, null));

        String templateName = getTemplateName(document.getTemplateCode());
        return documentMapper.toResponse(document, templateName);
    }

    public DocumentResponse rewriteDocument(Long userId, Long documentId) {
        Document sourceDoc = documentRepository.findById(documentId)
                .orElseThrow(() -> new BusinessException("DOC_NOT_FOUND", "문서를 찾을 수 없습니다.", 404));

        // Only drafter can resubmit
        if (!sourceDoc.getDrafter().getId().equals(userId)) {
            throw new BusinessException("DOC_NOT_OWNER", "본인의 문서만 재기안할 수 있습니다.", 403);
        }

        // Only REJECTED or WITHDRAWN documents can be resubmitted (per D-27)
        if (sourceDoc.getStatus() != DocumentStatus.REJECTED &&
            sourceDoc.getStatus() != DocumentStatus.WITHDRAWN) {
            throw new BusinessException("DOC_CANNOT_REWRITE",
                    "반려 또는 회수된 문서만 재기안할 수 있습니다.");
        }

        User drafter = userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException("USER_NOT_FOUND", "사용자를 찾을 수 없습니다."));

        // Create new document copying content (per D-25)
        Document newDoc = new Document();
        newDoc.setTemplateCode(sourceDoc.getTemplateCode());
        newDoc.setTitle(sourceDoc.getTitle());
        newDoc.setDrafter(drafter);
        newDoc.setStatus(DocumentStatus.DRAFT);
        newDoc.setSourceDocId(documentId); // per D-26
        newDoc = documentRepository.save(newDoc);

        // Copy content
        DocumentContent sourceContent = documentContentRepository.findByDocumentId(documentId)
                .orElse(null);
        if (sourceContent != null) {
            DocumentContent newContent = new DocumentContent();
            newContent.setDocument(newDoc);
            newContent.setBodyHtml(sourceContent.getBodyHtml());
            newContent.setFormData(sourceContent.getFormData());
            documentContentRepository.save(newContent);
        }

        // Copy approval line (per D-25) -- copy approver list and types, reset status to PENDING
        List<ApprovalLine> sourceLines = approvalLineRepository
                .findByDocumentIdOrderByStepOrderAsc(documentId);
        for (ApprovalLine sourceLine : sourceLines) {
            ApprovalLine newLine = new ApprovalLine();
            newLine.setDocument(newDoc);
            newLine.setApprover(sourceLine.getApprover());
            newLine.setLineType(sourceLine.getLineType());
            newLine.setStepOrder(sourceLine.getStepOrder());
            newLine.setStatus(ApprovalLineStatus.PENDING);
            approvalLineRepository.save(newLine);
        }

        // Note: Attachments NOT copied per D-25

        String templateName = getTemplateName(newDoc.getTemplateCode());
        return documentMapper.toResponse(newDoc, templateName);
    }

    // --- Private helpers ---

    private void saveApprovalLines(Document document, List<ApprovalLineRequest> requests) {
        // Validate: no self-addition (per D-06)
        for (ApprovalLineRequest req : requests) {
            if (req.approverId().equals(document.getDrafter().getId())) {
                throw new BusinessException("APR_SELF_NOT_ALLOWED", "본인은 결재선에 추가할 수 없습니다.");
            }
        }

        // Validate: no duplicates (per D-07)
        Set<Long> approverIds = new HashSet<>();
        for (ApprovalLineRequest req : requests) {
            if (!approverIds.add(req.approverId())) {
                throw new BusinessException("APR_DUPLICATE", "이미 추가된 사용자입니다.");
            }
        }

        // Compute step_order server-side (per D-08)
        // REFERENCE always gets 0, APPROVE/AGREE get sequential 1, 2, 3...
        int sequentialStep = 1;
        for (ApprovalLineRequest req : requests) {
            ApprovalLine line = new ApprovalLine();
            line.setDocument(document);

            User approver = userRepository.findById(req.approverId())
                    .orElseThrow(() -> new BusinessException("USER_NOT_FOUND", "결재자를 찾을 수 없습니다."));
            line.setApprover(approver);
            line.setLineType(req.lineType());
            line.setStatus(ApprovalLineStatus.PENDING);

            if (req.lineType() == ApprovalLineType.REFERENCE) {
                line.setStepOrder(0);
            } else {
                line.setStepOrder(sequentialStep++);
            }

            approvalLineRepository.save(line);
        }
    }

    private Document loadAndVerifyOwnerDraft(Long userId, Long documentId) {
        Document document = documentRepository.findById(documentId)
                .orElseThrow(() -> new BusinessException("DOC_NOT_FOUND", "문서를 찾을 수 없습니다."));

        if (!document.getDrafter().getId().equals(userId)) {
            throw new BusinessException("DOC_NOT_OWNER", "본인의 문서만 수정할 수 있습니다.");
        }

        if (document.getStatus() != DocumentStatus.DRAFT) {
            throw new BusinessException("DOC_NOT_DRAFT", "임시저장 상태의 문서만 수정할 수 있습니다.", 403);
        }

        return document;
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

    private String generateDocNumber(String templateCode) {
        int currentYear = LocalDateTime.now().getYear();

        // Look up template prefix
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

        // Increment sequence
        seq.setLastSequence(seq.getLastSequence() + 1);
        docSequenceRepository.save(seq);

        return String.format("%s-%d-%04d", prefix, currentYear, seq.getLastSequence());
    }

    private String getTemplateName(String templateCode) {
        return approvalTemplateRepository.findByCode(templateCode)
                .map(ApprovalTemplate::getName)
                .orElse(templateCode);
    }
}

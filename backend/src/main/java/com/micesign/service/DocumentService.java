package com.micesign.service;

import com.micesign.common.AuditAction;
import com.micesign.common.exception.BusinessException;
import com.micesign.domain.ApprovalTemplate;
import com.micesign.domain.Document;
import com.micesign.domain.DocumentContent;
import com.micesign.domain.User;
import com.micesign.domain.enums.DocumentStatus;
import com.micesign.dto.document.*;
import com.micesign.mapper.DocumentMapper;
import com.micesign.repository.ApprovalTemplateRepository;
import com.micesign.repository.DocumentContentRepository;
import com.micesign.repository.DocumentRepository;
import com.micesign.repository.UserRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@Transactional
public class DocumentService {

    private final DocumentRepository documentRepository;
    private final DocumentContentRepository documentContentRepository;
    private final ApprovalTemplateRepository approvalTemplateRepository;
    private final UserRepository userRepository;
    private final DocumentFormValidator formValidator;
    private final DocumentMapper documentMapper;
    private final AuditLogService auditLogService;

    public DocumentService(DocumentRepository documentRepository,
                           DocumentContentRepository documentContentRepository,
                           ApprovalTemplateRepository approvalTemplateRepository,
                           UserRepository userRepository,
                           DocumentFormValidator formValidator,
                           DocumentMapper documentMapper,
                           AuditLogService auditLogService) {
        this.documentRepository = documentRepository;
        this.documentContentRepository = documentContentRepository;
        this.approvalTemplateRepository = approvalTemplateRepository;
        this.userRepository = userRepository;
        this.formValidator = formValidator;
        this.documentMapper = documentMapper;
        this.auditLogService = auditLogService;
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

        String templateName = getTemplateName(document.getTemplateCode());
        return documentMapper.toResponse(document, templateName);
    }

    public void deleteDocument(Long userId, Long documentId) {
        Document document = loadAndVerifyOwnerDraft(userId, documentId);

        // Delete content first, then document
        documentContentRepository.findByDocumentId(documentId)
                .ifPresent(documentContentRepository::delete);
        documentRepository.delete(document);
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

        // For now, only drafter can view
        if (!document.getDrafter().getId().equals(userId)) {
            throw new BusinessException("DOC_NOT_OWNER", "본인의 문서만 조회할 수 있습니다.");
        }

        DocumentContent content = documentContentRepository.findByDocumentId(documentId)
                .orElse(null);

        String templateName = getTemplateName(document.getTemplateCode());
        return documentMapper.toDetailResponse(document, content, templateName);
    }

    /**
     * Rewrite (re-draft) a rejected/withdrawn document as a new DRAFT, copying content.
     * The original document is referenced via sourceDocId.
     */
    public DocumentResponse rewriteDocument(Long userId, Long docId) {
        Document sourceDoc = documentRepository.findById(docId)
                .orElseThrow(() -> new BusinessException("DOC_NOT_FOUND", "문서를 찾을 수 없습니다."));

        if (!sourceDoc.getDrafter().getId().equals(userId)) {
            throw new BusinessException("DOC_NOT_OWNER", "본인의 문서만 재작성할 수 있습니다.");
        }

        if (sourceDoc.getStatus() != DocumentStatus.REJECTED && sourceDoc.getStatus() != DocumentStatus.WITHDRAWN) {
            throw new BusinessException("DOC_INVALID_STATUS", "반려 또는 회수된 문서만 재작성할 수 있습니다.");
        }

        // Create new document as DRAFT
        Document newDoc = new Document();
        newDoc.setTemplateCode(sourceDoc.getTemplateCode());
        newDoc.setTitle(sourceDoc.getTitle());
        newDoc.setDrafter(sourceDoc.getDrafter());
        newDoc.setStatus(DocumentStatus.DRAFT);
        newDoc.setSourceDocId(docId);
        newDoc = documentRepository.save(newDoc);

        // Audit log for rewrite operation
        auditLogService.log(userId, AuditAction.DOC_REWRITE, "DOCUMENT", newDoc.getId(),
                Map.of("sourceDocId", docId, "sourceDocNumber", sourceDoc.getDocNumber() != null ? sourceDoc.getDocNumber() : ""));

        // Copy content from source document
        DocumentContent sourceContent = documentContentRepository.findByDocumentId(docId).orElse(null);
        if (sourceContent != null) {
            DocumentContent newContent = new DocumentContent();
            newContent.setDocument(newDoc);
            newContent.setBodyHtml(sourceContent.getBodyHtml());
            newContent.setFormData(sourceContent.getFormData());
            documentContentRepository.save(newContent);
        }

        String templateName = getTemplateName(newDoc.getTemplateCode());
        return documentMapper.toResponse(newDoc, templateName);
    }

    // --- Private helpers ---

    private Document loadAndVerifyOwnerDraft(Long userId, Long documentId) {
        Document document = documentRepository.findById(documentId)
                .orElseThrow(() -> new BusinessException("DOC_NOT_FOUND", "문서를 찾을 수 없습니다."));

        if (!document.getDrafter().getId().equals(userId)) {
            throw new BusinessException("DOC_NOT_OWNER", "본인의 문서만 수정할 수 있습니다.");
        }

        if (document.getStatus() != DocumentStatus.DRAFT) {
            throw new BusinessException("DOC_NOT_DRAFT", "임시저장 상태의 문서만 수정할 수 있습니다.");
        }

        return document;
    }

    private String getTemplateName(String templateCode) {
        return approvalTemplateRepository.findByCode(templateCode)
                .map(ApprovalTemplate::getName)
                .orElse(templateCode);
    }
}

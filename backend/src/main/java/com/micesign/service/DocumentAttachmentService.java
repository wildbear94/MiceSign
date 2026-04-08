package com.micesign.service;

import com.micesign.common.AuditAction;
import com.micesign.common.exception.BusinessException;
import com.micesign.domain.Document;
import com.micesign.domain.DocumentAttachment;
import com.micesign.domain.enums.DocumentStatus;
import com.micesign.domain.enums.UserRole;
import com.micesign.dto.document.AttachmentResponse;
import com.micesign.mapper.DocumentAttachmentMapper;
import com.micesign.repository.ApprovalLineRepository;
import com.micesign.repository.DocumentAttachmentRepository;
import com.micesign.repository.DocumentRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.io.InputStreamResource;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;

@Service
@Transactional
public class DocumentAttachmentService {

    private static final Logger log = LoggerFactory.getLogger(DocumentAttachmentService.class);

    public static final long MAX_FILE_SIZE = 50L * 1024 * 1024; // 50MB
    public static final int MAX_FILES_PER_DOCUMENT = 10;
    public static final long MAX_TOTAL_SIZE = 200L * 1024 * 1024; // 200MB

    public static final Set<String> ALLOWED_EXTENSIONS = Set.of(
            "pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx",
            "hwp", "hwpx", "jpg", "jpeg", "png", "zip"
    );

    public static final Set<String> BLOCKED_EXTENSIONS = Set.of(
            "exe", "bat", "sh", "cmd", "js", "vbs", "msi", "ps1", "jar", "com"
    );

    private final DocumentAttachmentRepository attachmentRepository;
    private final GoogleDriveService googleDriveService;
    private final DocumentRepository documentRepository;
    private final ApprovalLineRepository approvalLineRepository;
    private final DocumentAttachmentMapper attachmentMapper;
    private final AuditLogService auditLogService;

    public DocumentAttachmentService(DocumentAttachmentRepository attachmentRepository,
                                      GoogleDriveService googleDriveService,
                                      DocumentRepository documentRepository,
                                      ApprovalLineRepository approvalLineRepository,
                                      DocumentAttachmentMapper attachmentMapper,
                                      AuditLogService auditLogService) {
        this.attachmentRepository = attachmentRepository;
        this.googleDriveService = googleDriveService;
        this.documentRepository = documentRepository;
        this.approvalLineRepository = approvalLineRepository;
        this.attachmentMapper = attachmentMapper;
        this.auditLogService = auditLogService;
    }

    // ──────────────────────────────────────────────
    // uploadAttachment
    // ──────────────────────────────────────────────

    public AttachmentResponse uploadAttachment(Long docId, MultipartFile file, Long userId) {
        Document document = validateDocumentForUpload(docId, userId);

        // Validate file constraints
        validateFile(file);

        int existingCount = attachmentRepository.countByDocumentId(docId);
        if (existingCount >= MAX_FILES_PER_DOCUMENT) {
            throw new BusinessException("FILE_COUNT_EXCEEDED",
                    "첨부파일은 최대 " + MAX_FILES_PER_DOCUMENT + "개까지 가능합니다. (현재: " + existingCount + "개)");
        }

        long existingTotalSize = attachmentRepository.sumFileSizeByDocumentId(docId);
        if (existingTotalSize + file.getSize() > MAX_TOTAL_SIZE) {
            throw new BusinessException("FILE_TOTAL_SIZE_EXCEEDED",
                    "첨부파일 총 용량은 200MB를 초과할 수 없습니다.");
        }

        // Build folder path
        String folderPath = buildFolderPath(document);

        try {
            InputStream inputStream = file.getInputStream();
            String mimeType = file.getContentType() != null ? file.getContentType() : "application/octet-stream";

            GoogleDriveService.DriveUploadResult result = googleDriveService.uploadFile(
                    folderPath,
                    file.getOriginalFilename(),
                    mimeType,
                    inputStream,
                    file.getSize()
            );

            DocumentAttachment attachment = new DocumentAttachment();
            attachment.setDocumentId(docId);
            attachment.setOriginalName(file.getOriginalFilename());
            attachment.setFileSize(file.getSize());
            attachment.setMimeType(mimeType);
            attachment.setGdriveFileId(result.fileId());
            attachment.setGdriveFolder(result.folderPath());
            attachment.setUploadedBy(userId);
            attachment = attachmentRepository.save(attachment);

            auditLogService.log(userId, AuditAction.FILE_UPLOAD, "DOCUMENT", docId,
                    "{\"file\":\"" + file.getOriginalFilename() + "\"}");

            return attachmentMapper.toResponse(attachment);
        } catch (IOException e) {
            throw new BusinessException("FILE_UPLOAD_FAILED",
                    "파일 업로드 중 오류가 발생했습니다: " + file.getOriginalFilename());
        }
    }

    // ──────────────────────────────────────────────
    // uploadFiles (batch)
    // ──────────────────────────────────────────────

    public List<AttachmentResponse> uploadFiles(Long userId, Long docId, MultipartFile[] files) {
        Document document = validateDocumentForUpload(docId, userId);

        int existingCount = attachmentRepository.countByDocumentId(docId);
        long existingTotalSize = attachmentRepository.sumFileSizeByDocumentId(docId);

        if (existingCount + files.length > MAX_FILES_PER_DOCUMENT) {
            throw new BusinessException("FILE_COUNT_EXCEEDED",
                    "첨부파일은 최대 " + MAX_FILES_PER_DOCUMENT + "개까지 가능합니다. (현재: " + existingCount + "개)");
        }

        long newTotalSize = 0;
        for (MultipartFile file : files) {
            validateFile(file);
            newTotalSize += file.getSize();
        }

        if (existingTotalSize + newTotalSize > MAX_TOTAL_SIZE) {
            throw new BusinessException("FILE_TOTAL_SIZE_EXCEEDED",
                    "첨부파일 총 용량은 200MB를 초과할 수 없습니다.");
        }

        String folderPath = buildFolderPath(document);
        List<DocumentAttachment> savedAttachments = new ArrayList<>();

        for (MultipartFile file : files) {
            try {
                InputStream inputStream = file.getInputStream();
                String mimeType = file.getContentType() != null ? file.getContentType() : "application/octet-stream";

                GoogleDriveService.DriveUploadResult result = googleDriveService.uploadFile(
                        folderPath, file.getOriginalFilename(), mimeType, inputStream, file.getSize());

                DocumentAttachment attachment = new DocumentAttachment();
                attachment.setDocumentId(docId);
                attachment.setOriginalName(file.getOriginalFilename());
                attachment.setFileSize(file.getSize());
                attachment.setMimeType(mimeType);
                attachment.setGdriveFileId(result.fileId());
                attachment.setGdriveFolder(result.folderPath());
                attachment.setUploadedBy(userId);
                savedAttachments.add(attachmentRepository.save(attachment));

                auditLogService.log(userId, AuditAction.FILE_UPLOAD, "DOCUMENT", docId,
                        "{\"file\":\"" + file.getOriginalFilename() + "\"}");
            } catch (IOException e) {
                throw new BusinessException("FILE_UPLOAD_FAILED",
                        "파일 업로드 중 오류가 발생했습니다: " + file.getOriginalFilename());
            }
        }

        return attachmentMapper.toResponseList(savedAttachments);
    }

    // ──────────────────────────────────────────────
    // downloadAttachment
    // ──────────────────────────────────────────────

    @Transactional(readOnly = true)
    public InputStreamResource downloadAttachment(Long attachmentId, Long userId, UserRole role, Long departmentId) {
        DocumentAttachment attachment = attachmentRepository.findById(attachmentId)
                .orElseThrow(() -> new BusinessException("FILE_NOT_FOUND", "첨부파일을 찾을 수 없습니다.", 404));

        validateDocumentViewAccess(attachment.getDocumentId(), userId, role, departmentId);

        InputStream inputStream = googleDriveService.downloadFile(attachment.getGdriveFileId());

        auditLogService.log(userId, AuditAction.FILE_DOWNLOAD, "ATTACHMENT", attachmentId,
                "{\"file\":\"" + attachment.getOriginalName() + "\"}");

        return new InputStreamResource(inputStream);
    }

    // ──────────────────────────────────────────────
    // deleteAttachment
    // ──────────────────────────────────────────────

    public void deleteAttachment(Long attachmentId, Long userId) {
        DocumentAttachment attachment = attachmentRepository.findById(attachmentId)
                .orElseThrow(() -> new BusinessException("FILE_NOT_FOUND", "첨부파일을 찾을 수 없습니다.", 404));

        Document document = documentRepository.findById(attachment.getDocumentId())
                .orElseThrow(() -> new BusinessException("DOC_NOT_FOUND", "문서를 찾을 수 없습니다.", 404));

        if (document.getStatus() != DocumentStatus.DRAFT) {
            throw new BusinessException("DOC_NOT_DRAFT", "임시저장 상태의 문서만 첨부파일을 삭제할 수 있습니다.");
        }

        if (!document.getDrafter().getId().equals(userId)) {
            throw new BusinessException("DOC_NOT_OWNER", "본인의 문서 첨부파일만 삭제할 수 있습니다.", 403);
        }

        googleDriveService.deleteFile(attachment.getGdriveFileId());
        attachmentRepository.delete(attachment);
    }

    // ──────────────────────────────────────────────
    // moveAttachments (called after submission)
    // ──────────────────────────────────────────────

    public void moveAttachments(Long docId, String docNumber) {
        List<DocumentAttachment> attachments = attachmentRepository.findByDocumentId(docId);
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
                    docId, e.getMessage(), e);
        }
    }

    // ──────────────────────────────────────────────
    // getAttachmentsByDocumentId
    // ──────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<AttachmentResponse> getAttachmentsByDocumentId(Long userId, Long docId) {
        verifyDocumentAccess(userId, docId);
        List<DocumentAttachment> attachments = attachmentRepository.findByDocumentId(docId);
        return attachmentMapper.toResponseList(attachments);
    }

    @Transactional(readOnly = true)
    public AttachmentResponse getAttachmentMetadata(Long attachmentId) {
        DocumentAttachment attachment = attachmentRepository.findById(attachmentId)
                .orElseThrow(() -> new BusinessException("FILE_NOT_FOUND", "첨부파일을 찾을 수 없습니다.", 404));
        return attachmentMapper.toResponse(attachment);
    }

    // ──────────────────────────────────────────────
    // Private helpers
    // ──────────────────────────────────────────────

    private void validateFile(MultipartFile file) {
        if (file.getSize() > MAX_FILE_SIZE) {
            throw new BusinessException("FILE_SIZE_EXCEEDED",
                    "파일 크기는 50MB를 초과할 수 없습니다: " + file.getOriginalFilename());
        }

        String extension = getFileExtension(file.getOriginalFilename());
        if (BLOCKED_EXTENSIONS.contains(extension)) {
            throw new BusinessException("FILE_EXTENSION_BLOCKED",
                    "허용되지 않는 파일 형식입니다: ." + extension);
        }
    }

    private Document validateDocumentForUpload(Long docId, Long userId) {
        Document document = documentRepository.findById(docId)
                .orElseThrow(() -> new BusinessException("DOC_NOT_FOUND", "문서를 찾을 수 없습니다.", 404));

        if (!document.getDrafter().getId().equals(userId)) {
            throw new BusinessException("DOC_NOT_OWNER", "본인의 문서에만 파일을 첨부할 수 있습니다.", 403);
        }

        if (document.getStatus() != DocumentStatus.DRAFT) {
            throw new BusinessException("DOC_NOT_DRAFT", "임시저장 상태의 문서에만 파일을 첨부할 수 있습니다.");
        }

        return document;
    }

    private void validateDocumentViewAccess(Long docId, Long userId, UserRole role, Long departmentId) {
        Document document = documentRepository.findById(docId)
                .orElseThrow(() -> new BusinessException("DOC_NOT_FOUND", "문서를 찾을 수 없습니다.", 404));

        boolean isDrafter = document.getDrafter().getId().equals(userId);
        boolean isParticipant = approvalLineRepository.existsByDocumentIdAndApproverId(docId, userId);
        boolean isAdminSameDept = role == UserRole.ADMIN
                && departmentId != null
                && departmentId.equals(document.getDrafter().getDepartmentId());
        boolean isSuperAdmin = role == UserRole.SUPER_ADMIN;

        if (!isDrafter && !isParticipant && !isAdminSameDept && !isSuperAdmin) {
            throw new BusinessException("DOC_ACCESS_DENIED", "해당 문서에 대한 접근 권한이 없습니다.", 403);
        }
    }

    private void verifyDocumentAccess(Long userId, Long docId) {
        Document document = documentRepository.findById(docId)
                .orElseThrow(() -> new BusinessException("DOC_NOT_FOUND", "문서를 찾을 수 없습니다.", 404));
        boolean isDrafter = document.getDrafter().getId().equals(userId);
        boolean isParticipant = approvalLineRepository.existsByDocumentIdAndApproverId(docId, userId);
        if (!isDrafter && !isParticipant) {
            throw new BusinessException("DOC_ACCESS_DENIED", "해당 문서에 접근 권한이 없습니다.", 403);
        }
    }

    private String buildFolderPath(Document document) {
        return "MiceSign/drafts/DRAFT-" + document.getId() + "/";
    }

    String getFileExtension(String filename) {
        if (filename == null || filename.isEmpty()) {
            return "";
        }
        int lastDot = filename.lastIndexOf('.');
        if (lastDot < 0 || lastDot == filename.length() - 1) {
            return "";
        }
        return filename.substring(lastDot + 1).toLowerCase();
    }
}

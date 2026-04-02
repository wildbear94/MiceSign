package com.micesign.service;

import com.micesign.common.exception.BusinessException;
import com.micesign.domain.Document;
import com.micesign.domain.DocumentAttachment;
import com.micesign.domain.enums.DocumentStatus;
import com.micesign.dto.document.AttachmentResponse;
import com.micesign.mapper.DocumentAttachmentMapper;
import com.micesign.repository.ApprovalLineRepository;
import com.micesign.repository.DocumentAttachmentRepository;
import com.micesign.repository.DocumentRepository;
import org.springframework.core.io.InputStreamResource;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;

@Service
@Transactional
public class DocumentAttachmentService {

    public static final long MAX_FILE_SIZE = 50L * 1024 * 1024; // 50MB
    public static final int MAX_FILES_PER_DOCUMENT = 10;
    public static final long MAX_TOTAL_SIZE = 200L * 1024 * 1024; // 200MB
    public static final Set<String> BLOCKED_EXTENSIONS = Set.of(
            "exe", "bat", "sh", "cmd", "msi", "ps1", "vbs", "js", "jar", "com"
    );

    private final DocumentAttachmentRepository attachmentRepository;
    private final GoogleDriveService googleDriveService;
    private final DocumentRepository documentRepository;
    private final ApprovalLineRepository approvalLineRepository;
    private final DocumentAttachmentMapper attachmentMapper;

    public DocumentAttachmentService(DocumentAttachmentRepository attachmentRepository,
                                      GoogleDriveService googleDriveService,
                                      DocumentRepository documentRepository,
                                      ApprovalLineRepository approvalLineRepository,
                                      DocumentAttachmentMapper attachmentMapper) {
        this.attachmentRepository = attachmentRepository;
        this.googleDriveService = googleDriveService;
        this.documentRepository = documentRepository;
        this.approvalLineRepository = approvalLineRepository;
        this.attachmentMapper = attachmentMapper;
    }

    public List<AttachmentResponse> uploadFiles(Long userId, Long docId, MultipartFile[] files) {
        Document document = validateDocumentForUpload(userId, docId);

        int existingCount = attachmentRepository.countByDocumentId(docId);
        long existingTotalSize = attachmentRepository.sumFileSizeByDocumentId(docId);

        // Validate count limit
        if (existingCount + files.length > MAX_FILES_PER_DOCUMENT) {
            throw new BusinessException("FILE_COUNT_EXCEEDED",
                    "첨부파일은 최대 " + MAX_FILES_PER_DOCUMENT + "개까지 가능합니다. (현재: " + existingCount + "개)");
        }

        // Validate each file and calculate total size
        long newTotalSize = 0;
        for (MultipartFile file : files) {
            validateFile(file);
            newTotalSize += file.getSize();
        }

        // Validate total size
        if (existingTotalSize + newTotalSize > MAX_TOTAL_SIZE) {
            throw new BusinessException("FILE_TOTAL_SIZE_EXCEEDED",
                    "첨부파일 총 용량은 200MB를 초과할 수 없습니다.");
        }

        // Build folder path
        String folderPath = buildFolderPath(document);

        // Upload files and save metadata
        List<DocumentAttachment> savedAttachments = new ArrayList<>();
        for (MultipartFile file : files) {
            try {
                InputStream inputStream = file.getInputStream();
                GoogleDriveService.DriveUploadResult result = googleDriveService.uploadFile(
                        folderPath,
                        file.getOriginalFilename(),
                        file.getContentType() != null ? file.getContentType() : "application/octet-stream",
                        inputStream,
                        file.getSize()
                );

                DocumentAttachment attachment = new DocumentAttachment();
                attachment.setDocumentId(docId);
                attachment.setOriginalName(file.getOriginalFilename());
                attachment.setFileSize(file.getSize());
                attachment.setMimeType(file.getContentType() != null ? file.getContentType() : "application/octet-stream");
                attachment.setGdriveFileId(result.fileId());
                attachment.setGdriveFolder(result.folderPath());
                attachment.setUploadedBy(userId);
                savedAttachments.add(attachmentRepository.save(attachment));
            } catch (IOException e) {
                throw new BusinessException("FILE_UPLOAD_FAILED",
                        "파일 업로드 중 오류가 발생했습니다: " + file.getOriginalFilename());
            }
        }

        return attachmentMapper.toResponseList(savedAttachments);
    }

    @Transactional(readOnly = true)
    public AttachmentResponse getAttachmentMetadata(Long attachmentId) {
        DocumentAttachment attachment = attachmentRepository.findById(attachmentId)
                .orElseThrow(() -> new BusinessException("FILE_NOT_FOUND", "첨부파일을 찾을 수 없습니다."));
        return attachmentMapper.toResponse(attachment);
    }

    @Transactional(readOnly = true)
    public InputStreamResource downloadFile(Long userId, Long attachmentId) {
        DocumentAttachment attachment = attachmentRepository.findById(attachmentId)
                .orElseThrow(() -> new BusinessException("FILE_NOT_FOUND", "첨부파일을 찾을 수 없습니다."));

        validateDocumentAccess(userId, attachment.getDocumentId());

        InputStream inputStream = googleDriveService.downloadFile(attachment.getGdriveFileId());
        return new InputStreamResource(inputStream);
    }

    public void deleteAttachment(Long userId, Long attachmentId) {
        DocumentAttachment attachment = attachmentRepository.findById(attachmentId)
                .orElseThrow(() -> new BusinessException("FILE_NOT_FOUND", "첨부파일을 찾을 수 없습니다."));

        Document document = documentRepository.findById(attachment.getDocumentId())
                .orElseThrow(() -> new BusinessException("DOC_NOT_FOUND", "문서를 찾을 수 없습니다."));

        // Only DRAFT documents allow attachment deletion (D-09)
        if (document.getStatus() != DocumentStatus.DRAFT) {
            throw new BusinessException("DOC_NOT_DRAFT", "임시저장 상태의 문서만 첨부파일을 삭제할 수 있습니다.");
        }

        // Only drafter can delete
        if (!document.getDrafter().getId().equals(userId)) {
            throw new BusinessException("DOCUMENT_ACCESS_DENIED", "본인의 문서 첨부파일만 삭제할 수 있습니다.");
        }

        googleDriveService.deleteFile(attachment.getGdriveFileId());
        attachmentRepository.delete(attachment);
    }

    @Transactional(readOnly = true)
    public List<AttachmentResponse> getAttachmentsByDocumentId(Long docId) {
        List<DocumentAttachment> attachments = attachmentRepository.findByDocumentId(docId);
        return attachmentMapper.toResponseList(attachments);
    }

    // --- Private helpers ---

    private void validateFile(MultipartFile file) {
        // Validate file size
        if (file.getSize() > MAX_FILE_SIZE) {
            throw new BusinessException("FILE_SIZE_EXCEEDED",
                    "파일 크기는 50MB를 초과할 수 없습니다: " + file.getOriginalFilename());
        }

        // Validate extension
        String extension = getFileExtension(file.getOriginalFilename());
        if (BLOCKED_EXTENSIONS.contains(extension)) {
            throw new BusinessException("FILE_EXTENSION_BLOCKED",
                    "허용되지 않는 파일 형식입니다: ." + extension);
        }
    }

    private Document validateDocumentForUpload(Long userId, Long docId) {
        Document document = documentRepository.findById(docId)
                .orElseThrow(() -> new BusinessException("DOCUMENT_NOT_FOUND", "문서를 찾을 수 없습니다."));

        if (!document.getDrafter().getId().equals(userId)) {
            throw new BusinessException("DOCUMENT_ACCESS_DENIED", "본인의 문서에만 파일을 첨부할 수 있습니다.");
        }

        if (document.getStatus() != DocumentStatus.DRAFT) {
            throw new BusinessException("DOC_NOT_DRAFT", "제출된 문서에는 파일을 첨부할 수 없습니다.", 403);
        }

        return document;
    }

    private void validateDocumentAccess(Long userId, Long docId) {
        Document document = documentRepository.findById(docId)
                .orElseThrow(() -> new BusinessException("DOC_NOT_FOUND", "문서를 찾을 수 없습니다."));

        // Drafter can always access
        if (document.getDrafter().getId().equals(userId)) {
            return;
        }

        // Approval line participants can download attachments (per D-20)
        if (approvalLineRepository.existsByDocumentIdAndApproverId(docId, userId)) {
            return;
        }

        throw new BusinessException("DOCUMENT_ACCESS_DENIED", "해당 문서에 대한 접근 권한이 없습니다.");
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

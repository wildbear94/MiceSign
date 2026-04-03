package com.micesign.document;

import com.micesign.common.exception.BusinessException;
import com.micesign.domain.Document;
import com.micesign.domain.DocumentAttachment;
import com.micesign.domain.User;
import com.micesign.domain.enums.DocumentStatus;
import com.micesign.dto.document.AttachmentResponse;
import com.micesign.mapper.DocumentAttachmentMapper;
import com.micesign.repository.ApprovalLineRepository;
import com.micesign.repository.DocumentAttachmentRepository;
import com.micesign.repository.DocumentRepository;
import com.micesign.service.AuditLogService;
import com.micesign.service.DocumentAttachmentService;
import com.micesign.service.GoogleDriveService;
import com.micesign.service.GoogleDriveService.DriveUploadResult;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.multipart.MultipartFile;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.mockito.Mockito.lenient;

@ExtendWith(MockitoExtension.class)
class DocumentAttachmentServiceTest {

    @Mock
    DocumentAttachmentRepository attachmentRepository;

    @Mock
    GoogleDriveService googleDriveService;

    @Mock
    DocumentRepository documentRepository;

    @Mock
    ApprovalLineRepository approvalLineRepository;

    @Mock
    DocumentAttachmentMapper attachmentMapper;

    @Mock
    AuditLogService auditLogService;

    @InjectMocks
    DocumentAttachmentService service;

    // --- Validation tests ---

    @ParameterizedTest
    @ValueSource(strings = {"exe", "bat", "sh", "cmd", "msi", "ps1", "vbs", "js", "jar", "com"})
    void uploadFiles_blockedExtension_throwsException(String ext) throws IOException {
        Document doc = createDraftDocument(1L, 1L);
        when(documentRepository.findById(1L)).thenReturn(Optional.of(doc));
        when(attachmentRepository.countByDocumentId(1L)).thenReturn(0);
        when(attachmentRepository.sumFileSizeByDocumentId(1L)).thenReturn(0L);

        MultipartFile file = mockFile("test." + ext, 1024L);

        BusinessException ex = assertThrows(BusinessException.class,
                () -> service.uploadFiles(1L, 1L, new MultipartFile[]{file}));
        assertEquals("FILE_EXTENSION_BLOCKED", ex.getCode());
    }

    @Test
    void uploadFiles_oversized_throwsException() throws IOException {
        Document doc = createDraftDocument(1L, 1L);
        when(documentRepository.findById(1L)).thenReturn(Optional.of(doc));
        when(attachmentRepository.countByDocumentId(1L)).thenReturn(0);
        when(attachmentRepository.sumFileSizeByDocumentId(1L)).thenReturn(0L);

        long oversized = 51L * 1024 * 1024; // 51MB
        MultipartFile file = mockFile("big.pdf", oversized);

        BusinessException ex = assertThrows(BusinessException.class,
                () -> service.uploadFiles(1L, 1L, new MultipartFile[]{file}));
        assertEquals("FILE_SIZE_EXCEEDED", ex.getCode());
    }

    @Test
    void uploadFiles_countExceeded_throwsException() throws IOException {
        Document doc = createDraftDocument(1L, 1L);
        when(documentRepository.findById(1L)).thenReturn(Optional.of(doc));
        when(attachmentRepository.countByDocumentId(1L)).thenReturn(10); // already at max

        MultipartFile file = mockFile("extra.pdf", 1024L);

        BusinessException ex = assertThrows(BusinessException.class,
                () -> service.uploadFiles(1L, 1L, new MultipartFile[]{file}));
        assertEquals("FILE_COUNT_EXCEEDED", ex.getCode());
    }

    @Test
    void uploadFiles_totalSizeExceeded_throwsException() throws IOException {
        Document doc = createDraftDocument(1L, 1L);
        when(documentRepository.findById(1L)).thenReturn(Optional.of(doc));
        when(attachmentRepository.countByDocumentId(1L)).thenReturn(1);
        when(attachmentRepository.sumFileSizeByDocumentId(1L)).thenReturn(208_000_000L); // ~198MB

        MultipartFile file = mockFile("more.pdf", 5_000_000L); // 5MB -- total would exceed 200MB (209.7MB)

        BusinessException ex = assertThrows(BusinessException.class,
                () -> service.uploadFiles(1L, 1L, new MultipartFile[]{file}));
        assertEquals("FILE_TOTAL_SIZE_EXCEEDED", ex.getCode());
    }

    @Test
    void uploadFiles_success() throws IOException {
        Document doc = createDraftDocument(1L, 1L);
        when(documentRepository.findById(1L)).thenReturn(Optional.of(doc));
        when(attachmentRepository.countByDocumentId(1L)).thenReturn(0);
        when(attachmentRepository.sumFileSizeByDocumentId(1L)).thenReturn(0L);

        MultipartFile file = mockFile("report.pdf", 1024L);
        when(googleDriveService.uploadFile(anyString(), eq("report.pdf"), eq("application/pdf"), any(), eq(1024L)))
                .thenReturn(new DriveUploadResult("drive-123", "MiceSign/drafts/DRAFT-1/"));

        DocumentAttachment saved = new DocumentAttachment();
        saved.setId(10L);
        saved.setDocumentId(1L);
        saved.setOriginalName("report.pdf");
        saved.setFileSize(1024L);
        saved.setMimeType("application/pdf");
        when(attachmentRepository.save(any(DocumentAttachment.class))).thenReturn(saved);

        AttachmentResponse resp = new AttachmentResponse(10L, 1L, "report.pdf", 1024L, "application/pdf", LocalDateTime.now());
        when(attachmentMapper.toResponseList(anyList())).thenReturn(List.of(resp));

        List<AttachmentResponse> results = service.uploadFiles(1L, 1L, new MultipartFile[]{file});
        assertEquals(1, results.size());
        assertEquals("report.pdf", results.get(0).originalName());
    }

    @Test
    void deleteAttachment_notDraftDocument_throwsException() {
        DocumentAttachment attachment = new DocumentAttachment();
        attachment.setId(1L);
        attachment.setDocumentId(1L);
        attachment.setGdriveFileId("drive-123");
        when(attachmentRepository.findById(1L)).thenReturn(Optional.of(attachment));

        Document doc = createDraftDocument(1L, 1L);
        doc.setStatus(DocumentStatus.SUBMITTED);
        when(documentRepository.findById(1L)).thenReturn(Optional.of(doc));

        BusinessException ex = assertThrows(BusinessException.class,
                () -> service.deleteAttachment(1L, 1L));
        assertEquals("DOC_NOT_DRAFT", ex.getCode());
    }

    // --- Extension validation through upload ---

    @Test
    void uploadFiles_noExtension_allowed() throws IOException {
        Document doc = createDraftDocument(1L, 1L);
        when(documentRepository.findById(1L)).thenReturn(Optional.of(doc));
        when(attachmentRepository.countByDocumentId(1L)).thenReturn(0);
        when(attachmentRepository.sumFileSizeByDocumentId(1L)).thenReturn(0L);
        when(googleDriveService.uploadFile(anyString(), anyString(), anyString(), any(), anyLong()))
                .thenReturn(new DriveUploadResult("drive-1", "path/"));
        when(attachmentRepository.save(any(DocumentAttachment.class))).thenAnswer(inv -> inv.getArgument(0));
        when(attachmentMapper.toResponseList(anyList())).thenReturn(List.of());

        MultipartFile file = mockFile("noext", 100L);
        // Should not throw -- no extension means not blocked
        assertDoesNotThrow(() -> service.uploadFiles(1L, 1L, new MultipartFile[]{file}));
    }

    @Test
    void uploadFiles_caseInsensitiveBlockedExtension() throws IOException {
        Document doc = createDraftDocument(1L, 1L);
        when(documentRepository.findById(1L)).thenReturn(Optional.of(doc));
        when(attachmentRepository.countByDocumentId(1L)).thenReturn(0);
        when(attachmentRepository.sumFileSizeByDocumentId(1L)).thenReturn(0L);

        MultipartFile file = mockFile("virus.EXE", 1024L);
        BusinessException ex = assertThrows(BusinessException.class,
                () -> service.uploadFiles(1L, 1L, new MultipartFile[]{file}));
        assertEquals("FILE_EXTENSION_BLOCKED", ex.getCode());
    }

    // --- Helpers ---

    private Document createDraftDocument(Long docId, Long drafterId) {
        Document doc = new Document();
        doc.setId(docId);
        doc.setStatus(DocumentStatus.DRAFT);
        User drafter = new User();
        drafter.setId(drafterId);
        doc.setDrafter(drafter);
        return doc;
    }

    private MultipartFile mockFile(String filename, long size) throws IOException {
        MultipartFile file = mock(MultipartFile.class);
        lenient().when(file.getOriginalFilename()).thenReturn(filename);
        lenient().when(file.getSize()).thenReturn(size);
        lenient().when(file.getContentType()).thenReturn("application/pdf");
        lenient().when(file.getInputStream()).thenReturn(new ByteArrayInputStream(new byte[0]));
        return file;
    }
}

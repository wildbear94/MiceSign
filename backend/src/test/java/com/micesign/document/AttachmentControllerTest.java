package com.micesign.document;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.micesign.admin.TestTokenHelper;
import com.micesign.service.GoogleDriveService;
import com.micesign.service.GoogleDriveService.DriveUploadResult;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.io.ByteArrayInputStream;
import java.io.InputStream;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class AttachmentControllerTest {

    @Autowired
    MockMvc mockMvc;

    @Autowired
    ObjectMapper objectMapper;

    @Autowired
    JdbcTemplate jdbcTemplate;

    @Autowired
    TestTokenHelper tokenHelper;

    @MockitoBean
    GoogleDriveService googleDriveService;

    private String token;
    private Long docId;

    @BeforeEach
    void setUp() {
        // Clean data (order matters due to FK constraints)
        jdbcTemplate.update("DELETE FROM approval_line");
        jdbcTemplate.update("DELETE FROM document_attachment");
        jdbcTemplate.update("DELETE FROM document_content");
        jdbcTemplate.update("DELETE FROM document");

        token = tokenHelper.superAdminToken();

        // Create a test document in DRAFT status
        jdbcTemplate.update(
                "INSERT INTO document (id, doc_number, template_code, title, drafter_id, status, created_at, updated_at) "
                + "VALUES (1, NULL, 'GENERAL', 'Test Document', 1, 'DRAFT', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)");
        docId = 1L;

        // Configure Drive mocks
        when(googleDriveService.uploadFile(anyString(), anyString(), anyString(), any(InputStream.class), anyLong()))
                .thenReturn(new DriveUploadResult("fake-drive-id", "MiceSign/drafts/DRAFT-1/"));
        when(googleDriveService.downloadFile("fake-drive-id"))
                .thenReturn(new ByteArrayInputStream("test file content".getBytes()));
        doNothing().when(googleDriveService).deleteFile(anyString());
    }

    // --- UPLOAD ---

    @Test
    void uploadAttachments_success() throws Exception {
        MockMultipartFile file = new MockMultipartFile(
                "files", "report.pdf", MediaType.APPLICATION_PDF_VALUE, "PDF content".getBytes());

        mockMvc.perform(multipart("/api/v1/documents/{docId}/attachments", docId)
                        .file(file)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data").isArray())
                .andExpect(jsonPath("$.data.length()").value(1))
                .andExpect(jsonPath("$.data[0].originalName").value("report.pdf"))
                .andExpect(jsonPath("$.data[0].mimeType").value("application/pdf"))
                .andExpect(jsonPath("$.data[0].id").isNumber())
                .andExpect(jsonPath("$.data[0].documentId").value(docId));
    }

    @Test
    void uploadAttachments_multipleFiles_success() throws Exception {
        MockMultipartFile file1 = new MockMultipartFile(
                "files", "doc1.pdf", MediaType.APPLICATION_PDF_VALUE, "PDF 1".getBytes());
        MockMultipartFile file2 = new MockMultipartFile(
                "files", "doc2.pdf", MediaType.APPLICATION_PDF_VALUE, "PDF 2".getBytes());

        mockMvc.perform(multipart("/api/v1/documents/{docId}/attachments", docId)
                        .file(file1)
                        .file(file2)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.length()").value(2));
    }

    @Test
    void uploadAttachments_blockedExtension() throws Exception {
        MockMultipartFile file = new MockMultipartFile(
                "files", "malware.exe", "application/octet-stream", "evil".getBytes());

        mockMvc.perform(multipart("/api/v1/documents/{docId}/attachments", docId)
                        .file(file)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.code").value("FILE_EXTENSION_BLOCKED"));
    }

    @Test
    void uploadAttachments_countExceeded() throws Exception {
        // Pre-populate 10 attachments
        for (int i = 1; i <= 10; i++) {
            jdbcTemplate.update(
                    "INSERT INTO document_attachment (document_id, original_name, file_size, mime_type, gdrive_file_id, uploaded_by, created_at) "
                    + "VALUES (?, ?, 1024, 'application/pdf', ?, 1, CURRENT_TIMESTAMP)",
                    docId, "file" + i + ".pdf", "drive-id-" + i);
        }

        MockMultipartFile file = new MockMultipartFile(
                "files", "extra.pdf", MediaType.APPLICATION_PDF_VALUE, "extra".getBytes());

        mockMvc.perform(multipart("/api/v1/documents/{docId}/attachments", docId)
                        .file(file)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.code").value("FILE_COUNT_EXCEEDED"));
    }

    @Test
    void uploadAttachments_totalSizeExceeded() throws Exception {
        // Pre-populate attachment near 200MiB limit (MAX_TOTAL_SIZE = 200 * 1024 * 1024 = 209715200)
        long existingSize = 205_000_000L; // ~195MiB
        jdbcTemplate.update(
                "INSERT INTO document_attachment (document_id, original_name, file_size, mime_type, gdrive_file_id, uploaded_by, created_at) "
                + "VALUES (?, 'big.pdf', " + existingSize + ", 'application/pdf', 'drive-big', 1, CURRENT_TIMESTAMP)",
                docId);

        // Upload file that pushes over 200MiB limit
        byte[] bigContent = new byte[5_000_000]; // 5MB -- total ~210MB > 209.7MiB
        MockMultipartFile file = new MockMultipartFile(
                "files", "more.pdf", MediaType.APPLICATION_PDF_VALUE, bigContent);

        mockMvc.perform(multipart("/api/v1/documents/{docId}/attachments", docId)
                        .file(file)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.code").value("FILE_TOTAL_SIZE_EXCEEDED"));
    }

    @Test
    void uploadAttachments_documentNotFound() throws Exception {
        MockMultipartFile file = new MockMultipartFile(
                "files", "doc.pdf", MediaType.APPLICATION_PDF_VALUE, "content".getBytes());

        mockMvc.perform(multipart("/api/v1/documents/{docId}/attachments", 9999L)
                        .file(file)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.code").value("DOCUMENT_NOT_FOUND"));
    }

    @Test
    void uploadAttachments_notDrafter() throws Exception {
        String otherToken = tokenHelper.userToken(); // userId=200

        MockMultipartFile file = new MockMultipartFile(
                "files", "doc.pdf", MediaType.APPLICATION_PDF_VALUE, "content".getBytes());

        mockMvc.perform(multipart("/api/v1/documents/{docId}/attachments", docId)
                        .file(file)
                        .header("Authorization", "Bearer " + otherToken))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.code").value("DOCUMENT_ACCESS_DENIED"));
    }

    // --- DOWNLOAD ---

    @Test
    void downloadAttachment_success() throws Exception {
        // Upload first
        jdbcTemplate.update(
                "INSERT INTO document_attachment (id, document_id, original_name, file_size, mime_type, gdrive_file_id, uploaded_by, created_at) "
                + "VALUES (100, ?, 'report.pdf', 1024, 'application/pdf', 'fake-drive-id', 1, CURRENT_TIMESTAMP)",
                docId);

        mockMvc.perform(get("/api/v1/documents/attachments/{attachmentId}/download", 100L)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(header().string("Content-Disposition",
                        "attachment; filename=\"file\"; filename*=UTF-8''report.pdf"))
                .andExpect(content().contentType("application/pdf"));
    }

    @Test
    void downloadAttachment_notFound() throws Exception {
        mockMvc.perform(get("/api/v1/documents/attachments/{attachmentId}/download", 9999L)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.code").value("FILE_NOT_FOUND"));
    }

    // --- DELETE ---

    @Test
    void deleteAttachment_success() throws Exception {
        jdbcTemplate.update(
                "INSERT INTO document_attachment (id, document_id, original_name, file_size, mime_type, gdrive_file_id, uploaded_by, created_at) "
                + "VALUES (101, ?, 'todelete.pdf', 512, 'application/pdf', 'fake-drive-id-del', 1, CURRENT_TIMESTAMP)",
                docId);

        mockMvc.perform(delete("/api/v1/documents/attachments/{attachmentId}", 101L)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));

        // Verify removed from DB
        Integer count = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM document_attachment WHERE id = 101", Integer.class);
        assert count != null && count == 0;
    }

    @Test
    void deleteAttachment_notDraftDocument() throws Exception {
        // Change document to SUBMITTED status
        jdbcTemplate.update("UPDATE document SET status = 'SUBMITTED' WHERE id = ?", docId);

        jdbcTemplate.update(
                "INSERT INTO document_attachment (id, document_id, original_name, file_size, mime_type, gdrive_file_id, uploaded_by, created_at) "
                + "VALUES (102, ?, 'submitted.pdf', 256, 'application/pdf', 'fake-drive-id-sub', 1, CURRENT_TIMESTAMP)",
                docId);

        mockMvc.perform(delete("/api/v1/documents/attachments/{attachmentId}", 102L)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.code").value("DOC_NOT_DRAFT"));
    }

    // --- LIST ---

    @Test
    void getAttachments_returnsList() throws Exception {
        jdbcTemplate.update(
                "INSERT INTO document_attachment (document_id, original_name, file_size, mime_type, gdrive_file_id, uploaded_by, created_at) "
                + "VALUES (?, 'file1.pdf', 100, 'application/pdf', 'id-1', 1, CURRENT_TIMESTAMP)",
                docId);
        jdbcTemplate.update(
                "INSERT INTO document_attachment (document_id, original_name, file_size, mime_type, gdrive_file_id, uploaded_by, created_at) "
                + "VALUES (?, 'file2.pdf', 200, 'application/pdf', 'id-2', 1, CURRENT_TIMESTAMP)",
                docId);

        mockMvc.perform(get("/api/v1/documents/{docId}/attachments", docId)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.length()").value(2));
    }
}

package com.micesign.document;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.micesign.admin.TestTokenHelper;
import com.micesign.domain.enums.ApprovalLineType;
import com.micesign.dto.document.ApprovalLineRequest;
import com.micesign.dto.document.CreateDocumentRequest;
import com.micesign.dto.document.UpdateDocumentRequest;
import com.micesign.service.GoogleDriveService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.io.ByteArrayInputStream;
import java.util.List;

import static org.hamcrest.Matchers.hasSize;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class ApprovalLineIntegrationTest {

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

    private String superAdminToken;
    private Long approverUserId;
    private Long approverUserId2;

    @BeforeEach
    void setUp() {
        jdbcTemplate.update("DELETE FROM approval_line");
        jdbcTemplate.update("DELETE FROM document_attachment");
        jdbcTemplate.update("DELETE FROM document_content");
        jdbcTemplate.update("DELETE FROM document");
        jdbcTemplate.update("DELETE FROM doc_sequence");

        // Delete test users (not the SUPER_ADMIN)
        jdbcTemplate.update("DELETE FROM \"user\" WHERE email IN ('approver1@micesign.com', 'approver2@micesign.com')");

        // Create test approver users
        jdbcTemplate.update(
            "INSERT INTO \"user\" (employee_no, name, email, password, department_id, position_id, role, status) " +
            "VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            "APPR001", "결재자1", "approver1@micesign.com",
            "$2a$10$07mcjXBfvelJFwjs8DnoJOnEqprFy.dnQL1NdnRvlqEWwwmX62SOW",
            2, 3, "USER", "ACTIVE"
        );
        approverUserId = jdbcTemplate.queryForObject(
            "SELECT id FROM \"user\" WHERE email = 'approver1@micesign.com'", Long.class);

        jdbcTemplate.update(
            "INSERT INTO \"user\" (employee_no, name, email, password, department_id, position_id, role, status) " +
            "VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            "APPR002", "결재자2", "approver2@micesign.com",
            "$2a$10$07mcjXBfvelJFwjs8DnoJOnEqprFy.dnQL1NdnRvlqEWwwmX62SOW",
            2, 5, "USER", "ACTIVE"
        );
        approverUserId2 = jdbcTemplate.queryForObject(
            "SELECT id FROM \"user\" WHERE email = 'approver2@micesign.com'", Long.class);

        superAdminToken = tokenHelper.superAdminToken();
    }

    @Test
    void createDocumentWithApprovalLines_savesLines() throws Exception {
        List<ApprovalLineRequest> lines = List.of(
            new ApprovalLineRequest(approverUserId, ApprovalLineType.APPROVE),
            new ApprovalLineRequest(approverUserId2, ApprovalLineType.AGREE)
        );
        Long docId = createDraftWithApprovalLines(lines);

        mockMvc.perform(get("/api/v1/documents/" + docId)
                .header("Authorization", "Bearer " + superAdminToken))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.approvalLines", hasSize(2)))
            .andExpect(jsonPath("$.data.approvalLines[0].lineType").value("APPROVE"))
            .andExpect(jsonPath("$.data.approvalLines[0].stepOrder").value(1))
            .andExpect(jsonPath("$.data.approvalLines[1].lineType").value("AGREE"))
            .andExpect(jsonPath("$.data.approvalLines[1].stepOrder").value(2));
    }

    @Test
    void updateDocumentApprovalLines_replacesLines() throws Exception {
        List<ApprovalLineRequest> lines = List.of(
            new ApprovalLineRequest(approverUserId, ApprovalLineType.APPROVE)
        );
        Long docId = createDraftWithApprovalLines(lines);

        // Update with different approval lines
        List<ApprovalLineRequest> newLines = List.of(
            new ApprovalLineRequest(approverUserId2, ApprovalLineType.APPROVE)
        );
        UpdateDocumentRequest updateReq = new UpdateDocumentRequest(
            "수정된 제목", "<p>수정된 본문</p>", null, newLines);

        mockMvc.perform(put("/api/v1/documents/" + docId)
                .header("Authorization", "Bearer " + superAdminToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(updateReq)))
            .andExpect(status().isOk());

        // Verify new lines replaced old ones
        mockMvc.perform(get("/api/v1/documents/" + docId)
                .header("Authorization", "Bearer " + superAdminToken))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.approvalLines", hasSize(1)))
            .andExpect(jsonPath("$.data.approvalLines[0].approver.id").value(approverUserId2));
    }

    @Test
    void submitDocumentWithoutApprover_returns400() throws Exception {
        // Create document with only AGREE type, no APPROVE
        List<ApprovalLineRequest> lines = List.of(
            new ApprovalLineRequest(approverUserId, ApprovalLineType.AGREE)
        );
        Long docId = createDraftWithApprovalLines(lines);

        mockMvc.perform(post("/api/v1/documents/" + docId + "/submit")
                .header("Authorization", "Bearer " + superAdminToken))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.error.code").value("APR_NO_APPROVER"));
    }

    @Test
    void submitDocumentWithApprover_setsCurrentStep1() throws Exception {
        List<ApprovalLineRequest> lines = List.of(
            new ApprovalLineRequest(approverUserId, ApprovalLineType.APPROVE)
        );
        Long docId = createDraftWithApprovalLines(lines);

        mockMvc.perform(post("/api/v1/documents/" + docId + "/submit")
                .header("Authorization", "Bearer " + superAdminToken))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.status").value("SUBMITTED"));

        // Verify currentStep = 1
        mockMvc.perform(get("/api/v1/documents/" + docId)
                .header("Authorization", "Bearer " + superAdminToken))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.currentStep").value(1));
    }

    @Test
    void selfAddition_returns400() throws Exception {
        // SUPER_ADMIN (userId=1) tries to add themselves as approver
        List<ApprovalLineRequest> lines = List.of(
            new ApprovalLineRequest(1L, ApprovalLineType.APPROVE)
        );
        CreateDocumentRequest request = new CreateDocumentRequest(
            "GENERAL", "자기 결재 테스트", "<p>본문</p>", null, lines);

        mockMvc.perform(post("/api/v1/documents")
                .header("Authorization", "Bearer " + superAdminToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.error.code").value("APR_SELF_NOT_ALLOWED"));
    }

    @Test
    void duplicateApprover_returns400() throws Exception {
        List<ApprovalLineRequest> lines = List.of(
            new ApprovalLineRequest(approverUserId, ApprovalLineType.APPROVE),
            new ApprovalLineRequest(approverUserId, ApprovalLineType.AGREE)
        );
        CreateDocumentRequest request = new CreateDocumentRequest(
            "GENERAL", "중복 결재자 테스트", "<p>본문</p>", null, lines);

        mockMvc.perform(post("/api/v1/documents")
                .header("Authorization", "Bearer " + superAdminToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.error.code").value("APR_DUPLICATE"));
    }

    @Test
    void referenceType_getsStepOrder0() throws Exception {
        List<ApprovalLineRequest> lines = List.of(
            new ApprovalLineRequest(approverUserId, ApprovalLineType.APPROVE),
            new ApprovalLineRequest(approverUserId2, ApprovalLineType.REFERENCE)
        );
        Long docId = createDraftWithApprovalLines(lines);

        mockMvc.perform(get("/api/v1/documents/" + docId)
                .header("Authorization", "Bearer " + superAdminToken))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.approvalLines", hasSize(2)));

        // Find REFERENCE line -- it should have stepOrder=0
        MvcResult result = mockMvc.perform(get("/api/v1/documents/" + docId)
                .header("Authorization", "Bearer " + superAdminToken))
            .andReturn();

        JsonNode approvalLines = objectMapper.readTree(result.getResponse().getContentAsString())
            .path("data").path("approvalLines");

        boolean foundReference = false;
        for (JsonNode line : approvalLines) {
            if ("REFERENCE".equals(line.path("lineType").asText())) {
                assert line.path("stepOrder").asInt() == 0 : "REFERENCE should have stepOrder=0";
                foundReference = true;
            }
        }
        assert foundReference : "Should have a REFERENCE line";
    }

    @Test
    void detailAccessibleByApprover() throws Exception {
        List<ApprovalLineRequest> lines = List.of(
            new ApprovalLineRequest(approverUserId, ApprovalLineType.APPROVE)
        );
        Long docId = createDraftWithApprovalLines(lines);

        // Login as approver and try to view document detail
        String approverToken = tokenHelper.tokenForRole(
            approverUserId, "approver1@micesign.com", "결재자1",
            com.micesign.domain.enums.UserRole.USER, 2L);

        mockMvc.perform(get("/api/v1/documents/" + docId)
                .header("Authorization", "Bearer " + approverToken))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.id").value(docId));
    }

    @Test
    void attachmentDownloadAccessibleByApprover() throws Exception {
        // Mock GoogleDriveService for upload and download
        when(googleDriveService.uploadFile(anyString(), anyString(), anyString(), any(), anyLong()))
            .thenReturn(new GoogleDriveService.DriveUploadResult("file123", "MiceSign/drafts/"));
        when(googleDriveService.downloadFile("file123"))
            .thenReturn(new ByteArrayInputStream("test content".getBytes()));

        // Create document with approver
        List<ApprovalLineRequest> lines = List.of(
            new ApprovalLineRequest(approverUserId, ApprovalLineType.APPROVE)
        );
        Long docId = createDraftWithApprovalLines(lines);

        // Upload an attachment as drafter
        MvcResult uploadResult = mockMvc.perform(
                multipart("/api/v1/documents/" + docId + "/attachments")
                    .file("files", "test.txt".getBytes())
                    .header("Authorization", "Bearer " + superAdminToken))
            .andExpect(status().isCreated())
            .andReturn();

        Long attachmentId = objectMapper.readTree(uploadResult.getResponse().getContentAsString())
            .path("data").get(0).path("id").asLong();

        // Submit the document
        mockMvc.perform(post("/api/v1/documents/" + docId + "/submit")
                .header("Authorization", "Bearer " + superAdminToken))
            .andExpect(status().isOk());

        // Login as approver and try to download attachment
        String approverToken = tokenHelper.tokenForRole(
            approverUserId, "approver1@micesign.com", "결재자1",
            com.micesign.domain.enums.UserRole.USER, 2L);

        mockMvc.perform(get("/api/v1/documents/attachments/" + attachmentId + "/download")
                .header("Authorization", "Bearer " + approverToken))
            .andExpect(status().isOk());
    }

    // --- Helpers ---

    private Long createDraftWithApprovalLines(List<ApprovalLineRequest> approvalLines) throws Exception {
        CreateDocumentRequest request = new CreateDocumentRequest(
            "GENERAL", "결재선 테스트 문서", "<p>본문 내용입니다.</p>", null, approvalLines);

        MvcResult result = mockMvc.perform(post("/api/v1/documents")
                .header("Authorization", "Bearer " + superAdminToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
            .andExpect(status().isCreated())
            .andReturn();

        return objectMapper.readTree(result.getResponse().getContentAsString())
            .path("data").path("id").asLong();
    }
}

package com.micesign.document;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.micesign.admin.TestTokenHelper;
import com.micesign.domain.enums.ApprovalLineType;
import com.micesign.domain.enums.UserRole;
import com.micesign.dto.document.ApprovalActionRequest;
import com.micesign.dto.document.ApprovalLineRequest;
import com.micesign.dto.document.CreateDocumentRequest;
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

import java.util.List;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class DocumentRewriteTest {

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
    private Long approverUserId1;
    private Long approverUserId2;
    private String approver1Token;
    private String otherUserToken;
    private Long otherUserId;

    @BeforeEach
    void setUp() {
        jdbcTemplate.update("DELETE FROM approval_line");
        jdbcTemplate.update("DELETE FROM document_attachment");
        jdbcTemplate.update("DELETE FROM document_content");
        jdbcTemplate.update("DELETE FROM document");
        jdbcTemplate.update("DELETE FROM doc_sequence");

        jdbcTemplate.update("DELETE FROM \"user\" WHERE email IN ('rewrite-approver1@micesign.com', 'rewrite-approver2@micesign.com', 'rewrite-other@micesign.com')");

        jdbcTemplate.update(
            "INSERT INTO \"user\" (employee_no, name, email, password, department_id, position_id, role, status) " +
            "VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            "RW001", "재기안결재자1", "rewrite-approver1@micesign.com",
            "$2a$10$07mcjXBfvelJFwjs8DnoJOnEqprFy.dnQL1NdnRvlqEWwwmX62SOW",
            2, 3, "USER", "ACTIVE"
        );
        approverUserId1 = jdbcTemplate.queryForObject(
            "SELECT id FROM \"user\" WHERE email = 'rewrite-approver1@micesign.com'", Long.class);

        jdbcTemplate.update(
            "INSERT INTO \"user\" (employee_no, name, email, password, department_id, position_id, role, status) " +
            "VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            "RW002", "재기안결재자2", "rewrite-approver2@micesign.com",
            "$2a$10$07mcjXBfvelJFwjs8DnoJOnEqprFy.dnQL1NdnRvlqEWwwmX62SOW",
            2, 5, "USER", "ACTIVE"
        );
        approverUserId2 = jdbcTemplate.queryForObject(
            "SELECT id FROM \"user\" WHERE email = 'rewrite-approver2@micesign.com'", Long.class);

        jdbcTemplate.update(
            "INSERT INTO \"user\" (employee_no, name, email, password, department_id, position_id, role, status) " +
            "VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            "RW003", "다른사용자", "rewrite-other@micesign.com",
            "$2a$10$07mcjXBfvelJFwjs8DnoJOnEqprFy.dnQL1NdnRvlqEWwwmX62SOW",
            2, 3, "USER", "ACTIVE"
        );
        otherUserId = jdbcTemplate.queryForObject(
            "SELECT id FROM \"user\" WHERE email = 'rewrite-other@micesign.com'", Long.class);

        superAdminToken = tokenHelper.superAdminToken();
        approver1Token = tokenHelper.tokenForRole(
            approverUserId1, "rewrite-approver1@micesign.com", "재기안결재자1", UserRole.USER, 2L);
        otherUserToken = tokenHelper.tokenForRole(
            otherUserId, "rewrite-other@micesign.com", "다른사용자", UserRole.USER, 2L);
    }

    @Test
    void rewriteRejectedDoc_createsNewDraft() throws Exception {
        Long originalDocId = createSubmitAndReject(superAdminToken, approverUserId1);

        MvcResult rewriteResult = mockMvc.perform(post("/api/v1/documents/" + originalDocId + "/rewrite")
                .header("Authorization", "Bearer " + superAdminToken))
            .andExpect(status().isCreated())
            .andReturn();

        JsonNode newDoc = objectMapper.readTree(rewriteResult.getResponse().getContentAsString())
            .path("data");
        assert "DRAFT".equals(newDoc.path("status").asText()) :
            "New document should be DRAFT, got: " + newDoc.path("status").asText();
        assert newDoc.path("id").asLong() != originalDocId :
            "New document should have a different ID";
    }

    @Test
    void rewriteWithdrawnDoc_createsNewDraft() throws Exception {
        Long docId = createAndSubmitWithApprover(superAdminToken, approverUserId1);

        // Withdraw
        mockMvc.perform(post("/api/v1/documents/" + docId + "/withdraw")
                .header("Authorization", "Bearer " + superAdminToken))
            .andExpect(status().isOk());

        // Rewrite
        MvcResult rewriteResult = mockMvc.perform(post("/api/v1/documents/" + docId + "/rewrite")
                .header("Authorization", "Bearer " + superAdminToken))
            .andExpect(status().isCreated())
            .andReturn();

        JsonNode newDoc = objectMapper.readTree(rewriteResult.getResponse().getContentAsString())
            .path("data");
        assert "DRAFT".equals(newDoc.path("status").asText()) :
            "New document should be DRAFT";
    }

    @Test
    void rewriteCopiesContent() throws Exception {
        Long originalDocId = createSubmitAndReject(superAdminToken, approverUserId1);

        MvcResult rewriteResult = mockMvc.perform(post("/api/v1/documents/" + originalDocId + "/rewrite")
                .header("Authorization", "Bearer " + superAdminToken))
            .andExpect(status().isCreated())
            .andReturn();

        Long newDocId = objectMapper.readTree(rewriteResult.getResponse().getContentAsString())
            .path("data").path("id").asLong();

        // Get new document detail and verify content matches
        mockMvc.perform(get("/api/v1/documents/" + newDocId)
                .header("Authorization", "Bearer " + superAdminToken))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.title").value("재기안 테스트"))
            .andExpect(jsonPath("$.data.bodyHtml").value("<p>본문 내용</p>"));
    }

    @Test
    void rewriteCopiesApprovalLine() throws Exception {
        // Create doc with 2 approvers (APPROVE, AGREE)
        List<ApprovalLineRequest> lines = List.of(
            new ApprovalLineRequest(approverUserId1, ApprovalLineType.APPROVE),
            new ApprovalLineRequest(approverUserId2, ApprovalLineType.AGREE)
        );
        Long originalDocId = createSubmitAndRejectWithApprovers(superAdminToken, lines);

        MvcResult rewriteResult = mockMvc.perform(post("/api/v1/documents/" + originalDocId + "/rewrite")
                .header("Authorization", "Bearer " + superAdminToken))
            .andExpect(status().isCreated())
            .andReturn();

        Long newDocId = objectMapper.readTree(rewriteResult.getResponse().getContentAsString())
            .path("data").path("id").asLong();

        // Get new document detail and verify approval lines
        MvcResult detailResult = mockMvc.perform(get("/api/v1/documents/" + newDocId)
                .header("Authorization", "Bearer " + superAdminToken))
            .andExpect(status().isOk())
            .andReturn();

        JsonNode approvalLines = objectMapper.readTree(detailResult.getResponse().getContentAsString())
            .path("data").path("approvalLines");

        assert approvalLines.size() == 2 : "Should have 2 approval lines, got: " + approvalLines.size();
        assert "APPROVE".equals(approvalLines.get(0).path("lineType").asText()) :
            "First line should be APPROVE";
        assert "AGREE".equals(approvalLines.get(1).path("lineType").asText()) :
            "Second line should be AGREE";
        // All should be PENDING (reset)
        for (JsonNode line : approvalLines) {
            assert "PENDING".equals(line.path("status").asText()) :
                "All lines should be PENDING, got: " + line.path("status").asText();
        }
    }

    @Test
    void rewriteDoesNotCopyAttachments() throws Exception {
        Long originalDocId = createSubmitAndReject(superAdminToken, approverUserId1);

        MvcResult rewriteResult = mockMvc.perform(post("/api/v1/documents/" + originalDocId + "/rewrite")
                .header("Authorization", "Bearer " + superAdminToken))
            .andExpect(status().isCreated())
            .andReturn();

        Long newDocId = objectMapper.readTree(rewriteResult.getResponse().getContentAsString())
            .path("data").path("id").asLong();

        // Verify no attachments on new document
        mockMvc.perform(get("/api/v1/documents/" + newDocId + "/attachments")
                .header("Authorization", "Bearer " + superAdminToken))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data").isEmpty());
    }

    @Test
    void rewriteSetsSourceDocId() throws Exception {
        Long originalDocId = createSubmitAndReject(superAdminToken, approverUserId1);

        MvcResult rewriteResult = mockMvc.perform(post("/api/v1/documents/" + originalDocId + "/rewrite")
                .header("Authorization", "Bearer " + superAdminToken))
            .andExpect(status().isCreated())
            .andReturn();

        Long newDocId = objectMapper.readTree(rewriteResult.getResponse().getContentAsString())
            .path("data").path("id").asLong();

        // Verify sourceDocId on new document
        mockMvc.perform(get("/api/v1/documents/" + newDocId)
                .header("Authorization", "Bearer " + superAdminToken))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.sourceDocId").value(originalDocId));

        // Verify original document has no sourceDocId
        mockMvc.perform(get("/api/v1/documents/" + originalDocId)
                .header("Authorization", "Bearer " + superAdminToken))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.sourceDocId").isEmpty());
    }

    @Test
    void rewriteDraftDoc_returns400() throws Exception {
        // Create draft only (no submit)
        CreateDocumentRequest request = new CreateDocumentRequest(
            "GENERAL", "재기안 테스트", "<p>본문</p>", null,
            List.of(new ApprovalLineRequest(approverUserId1, ApprovalLineType.APPROVE)));

        MvcResult createResult = mockMvc.perform(post("/api/v1/documents")
                .header("Authorization", "Bearer " + superAdminToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
            .andExpect(status().isCreated())
            .andReturn();

        Long docId = objectMapper.readTree(createResult.getResponse().getContentAsString())
            .path("data").path("id").asLong();

        mockMvc.perform(post("/api/v1/documents/" + docId + "/rewrite")
                .header("Authorization", "Bearer " + superAdminToken))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.error.code").value("DOC_CANNOT_REWRITE"));
    }

    @Test
    void rewriteByNonDrafter_returns403() throws Exception {
        Long originalDocId = createSubmitAndReject(superAdminToken, approverUserId1);

        mockMvc.perform(post("/api/v1/documents/" + originalDocId + "/rewrite")
                .header("Authorization", "Bearer " + otherUserToken))
            .andExpect(status().isForbidden())
            .andExpect(jsonPath("$.error.code").value("DOC_NOT_OWNER"));
    }

    // --- Helpers ---

    private Long createAndSubmitWithApprover(String token, Long approverId) throws Exception {
        List<ApprovalLineRequest> lines = List.of(
            new ApprovalLineRequest(approverId, ApprovalLineType.APPROVE)
        );
        return createAndSubmitWithApprovers(token, lines);
    }

    private Long createAndSubmitWithApprovers(String token, List<ApprovalLineRequest> approvalLines) throws Exception {
        CreateDocumentRequest request = new CreateDocumentRequest(
            "GENERAL", "재기안 테스트", "<p>본문 내용</p>", null, approvalLines);

        MvcResult createResult = mockMvc.perform(post("/api/v1/documents")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
            .andExpect(status().isCreated())
            .andReturn();

        Long docId = objectMapper.readTree(createResult.getResponse().getContentAsString())
            .path("data").path("id").asLong();

        mockMvc.perform(post("/api/v1/documents/" + docId + "/submit")
                .header("Authorization", "Bearer " + token))
            .andExpect(status().isOk());

        return docId;
    }

    private Long createSubmitAndReject(String token, Long approverId) throws Exception {
        Long docId = createAndSubmitWithApprover(token, approverId);
        Long lineId = getApprovalLineId(docId, 0);

        mockMvc.perform(post("/api/v1/approvals/" + lineId + "/reject")
                .header("Authorization", "Bearer " + approver1Token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(new ApprovalActionRequest("반려합니다"))))
            .andExpect(status().isOk());

        return docId;
    }

    private Long createSubmitAndRejectWithApprovers(String token, List<ApprovalLineRequest> approvalLines) throws Exception {
        Long docId = createAndSubmitWithApprovers(token, approvalLines);
        Long lineId = getApprovalLineIdByApprover(docId, approverUserId1);

        mockMvc.perform(post("/api/v1/approvals/" + lineId + "/reject")
                .header("Authorization", "Bearer " + approver1Token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(new ApprovalActionRequest("반려합니다"))))
            .andExpect(status().isOk());

        return docId;
    }

    private Long getApprovalLineId(Long documentId, int index) throws Exception {
        MvcResult result = mockMvc.perform(get("/api/v1/documents/" + documentId)
                .header("Authorization", "Bearer " + superAdminToken))
            .andExpect(status().isOk())
            .andReturn();

        JsonNode approvalLines = objectMapper.readTree(result.getResponse().getContentAsString())
            .path("data").path("approvalLines");
        return approvalLines.get(index).path("id").asLong();
    }

    private Long getApprovalLineIdByApprover(Long documentId, Long approverId) throws Exception {
        MvcResult result = mockMvc.perform(get("/api/v1/documents/" + documentId)
                .header("Authorization", "Bearer " + superAdminToken))
            .andExpect(status().isOk())
            .andReturn();

        JsonNode approvalLines = objectMapper.readTree(result.getResponse().getContentAsString())
            .path("data").path("approvalLines");

        for (JsonNode line : approvalLines) {
            if (line.path("approver").path("id").asLong() == approverId) {
                return line.path("id").asLong();
            }
        }
        throw new RuntimeException("Approval line not found for approver: " + approverId);
    }
}

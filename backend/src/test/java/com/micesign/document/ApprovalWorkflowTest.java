package com.micesign.document;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.micesign.admin.TestTokenHelper;
import com.micesign.dto.document.ApprovalLineRequest;
import com.micesign.dto.document.CreateDocumentRequest;
import com.micesign.dto.document.UpdateDocumentRequest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.util.List;

import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Integration tests for approval workflow lifecycle.
 * Covers APR-01 through APR-07: submit with approval lines, approve, reject, withdraw, rewrite.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class ApprovalWorkflowTest {

    @Autowired
    MockMvc mockMvc;

    @Autowired
    ObjectMapper objectMapper;

    @Autowired
    JdbcTemplate jdbcTemplate;

    @Autowired
    TestTokenHelper tokenHelper;

    private String drafterToken;
    private String approverToken;
    private String approver2Token;

    private static final Long DRAFTER_ID = 1L;   // super admin from seed
    private static final Long APPROVER_ID = 50L;
    private static final Long APPROVER2_ID = 51L;

    @BeforeEach
    void setUp() {
        // Clean document data (order matters due to FK constraints)
        jdbcTemplate.update("DELETE FROM approval_line");
        jdbcTemplate.update("DELETE FROM document_attachment");
        jdbcTemplate.update("DELETE FROM document_content");
        jdbcTemplate.update("DELETE FROM document");
        jdbcTemplate.update("DELETE FROM doc_sequence");

        // Clean up test approver users (keep seed user id=1)
        jdbcTemplate.update("DELETE FROM \"user\" WHERE id IN (?, ?)", APPROVER_ID, APPROVER2_ID);

        // Insert test approver users
        jdbcTemplate.update(
                "INSERT INTO \"user\" (id, employee_no, name, email, password, department_id, position_id, role, status, failed_login_count, must_change_password) " +
                        "VALUES (?, 'APR001', '결재자1', 'approver1@micesign.com', '$2a$10$07mcjXBfvelJFwjs8DnoJOnEqprFy.dnQL1NdnRvlqEWwwmX62SOW', 2, 3, 'USER', 'ACTIVE', 0, FALSE)",
                APPROVER_ID);
        jdbcTemplate.update(
                "INSERT INTO \"user\" (id, employee_no, name, email, password, department_id, position_id, role, status, failed_login_count, must_change_password) " +
                        "VALUES (?, 'APR002', '결재자2', 'approver2@micesign.com', '$2a$10$07mcjXBfvelJFwjs8DnoJOnEqprFy.dnQL1NdnRvlqEWwwmX62SOW', 2, 2, 'USER', 'ACTIVE', 0, FALSE)",
                APPROVER2_ID);

        drafterToken = tokenHelper.superAdminToken();
        approverToken = tokenHelper.tokenForRole(APPROVER_ID, "approver1@micesign.com", "결재자1",
                com.micesign.domain.enums.UserRole.USER, 2L);
        approver2Token = tokenHelper.tokenForRole(APPROVER2_ID, "approver2@micesign.com", "결재자2",
                com.micesign.domain.enums.UserRole.USER, 2L);
    }

    // ──────────────────────────────────────────────
    // Test 1: Submit with approval line (APR-01, APR-02)
    // ──────────────────────────────────────────────

    @Test
    void submitWithApprovalLine_success() throws Exception {
        Long docId = createDraftWithApprovalLines("결재선 테스트 문서",
                List.of(
                        new ApprovalLineRequest(APPROVER_ID, "APPROVE", 1),
                        new ApprovalLineRequest(APPROVER2_ID, "AGREE", 2)
                ));

        mockMvc.perform(post("/api/v1/documents/" + docId + "/submit")
                        .header("Authorization", "Bearer " + drafterToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.status").value("SUBMITTED"))
                .andExpect(jsonPath("$.data.docNumber").isNotEmpty())
                .andExpect(jsonPath("$.data.approvalLines").isArray())
                .andExpect(jsonPath("$.data.approvalLines.length()").value(2));
    }

    // ──────────────────────────────────────────────
    // Test 2: Submit without approval line returns 400 (D-07)
    // ──────────────────────────────────────────────

    @Test
    void submitWithoutApprovalLine_returns400() throws Exception {
        Long docId = createDraftWithoutApprovalLines("결재선 없는 문서");

        mockMvc.perform(post("/api/v1/documents/" + docId + "/submit")
                        .header("Authorization", "Bearer " + drafterToken))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.code").value("APR_NO_APPROVER"));
    }

    // ──────────────────────────────────────────────
    // Test 3: Submit with only REFERENCE returns 400 (D-07)
    // ──────────────────────────────────────────────

    @Test
    void submitWithOnlyReference_returns400() throws Exception {
        Long docId = createDraftWithApprovalLines("참조만 있는 문서",
                List.of(
                        new ApprovalLineRequest(APPROVER_ID, "REFERENCE", 0)
                ));

        mockMvc.perform(post("/api/v1/documents/" + docId + "/submit")
                        .header("Authorization", "Bearer " + drafterToken))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.code").value("APR_NO_APPROVER"));
    }

    // ──────────────────────────────────────────────
    // Test 4: Submit with drafter in line returns 400 (D-05)
    // ──────────────────────────────────────────────

    @Test
    void submitWithDrafterInLine_returns400() throws Exception {
        // The saveApprovalLines helper already checks for self-addition at create time.
        // We insert via update to trigger the check at submit time.
        Long docId = createDraftWithoutApprovalLines("기안자 결재선 포함 테스트");

        // Directly insert the drafter as an approver via DB to bypass create-time check
        jdbcTemplate.update(
                "INSERT INTO approval_line (document_id, approver_id, line_type, step_order, status, created_at) " +
                        "VALUES (?, ?, 'APPROVE', 1, 'PENDING', CURRENT_TIMESTAMP)",
                docId, DRAFTER_ID);

        mockMvc.perform(post("/api/v1/documents/" + docId + "/submit")
                        .header("Authorization", "Bearer " + drafterToken))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.code").value("APR_SELF_NOT_ALLOWED"));
    }

    // ──────────────────────────────────────────────
    // Test 5: Approve document (APR-03, APR-05)
    // ──────────────────────────────────────────────

    @Test
    void approveDocument_success() throws Exception {
        Long docId = createAndSubmitWithSingleApprover();

        Long lineId = getFirstApprovalLineId(docId);

        mockMvc.perform(post("/api/v1/approvals/" + lineId + "/approve")
                        .header("Authorization", "Bearer " + approverToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"comment\":\"승인합니다\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("APPROVED"));
    }

    // ──────────────────────────────────────────────
    // Test 6: Reject document with comment (APR-03, APR-04)
    // ──────────────────────────────────────────────

    @Test
    void rejectDocument_withComment() throws Exception {
        Long docId = createAndSubmitWithSingleApprover();

        Long lineId = getFirstApprovalLineId(docId);

        mockMvc.perform(post("/api/v1/approvals/" + lineId + "/reject")
                        .header("Authorization", "Bearer " + approverToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"comment\":\"수정이 필요합니다\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("REJECTED"));
    }

    // ──────────────────────────────────────────────
    // Test 7: Withdraw document (APR-06)
    // ──────────────────────────────────────────────

    @Test
    void withdrawDocument_success() throws Exception {
        Long docId = createAndSubmitWithSingleApprover();

        mockMvc.perform(post("/api/v1/documents/" + docId + "/withdraw")
                        .header("Authorization", "Bearer " + drafterToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("WITHDRAWN"));
    }

    // ──────────────────────────────────────────────
    // Test 8: Rewrite document after rejection (APR-07)
    // ──────────────────────────────────────────────

    @Test
    void rewriteDocument_success() throws Exception {
        Long docId = createAndSubmitWithSingleApprover();

        // Reject the document first
        Long lineId = getFirstApprovalLineId(docId);
        mockMvc.perform(post("/api/v1/approvals/" + lineId + "/reject")
                        .header("Authorization", "Bearer " + approverToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"comment\":\"반려합니다\"}"))
                .andExpect(status().isOk());

        // Rewrite as drafter
        mockMvc.perform(post("/api/v1/documents/" + docId + "/rewrite")
                        .header("Authorization", "Bearer " + drafterToken))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.status").value("DRAFT"))
                .andExpect(jsonPath("$.data.title").value("결재 테스트 문서"));
    }

    // ──────────────────────────────────────────────
    // Helpers
    // ──────────────────────────────────────────────

    private Long createDraftWithApprovalLines(String title, List<ApprovalLineRequest> lines) throws Exception {
        // Create draft first
        CreateDocumentRequest createReq = new CreateDocumentRequest(
                "GENERAL", title, "<p>본문 내용입니다.</p>", null, null);

        MvcResult createResult = mockMvc.perform(post("/api/v1/documents")
                        .header("Authorization", "Bearer " + drafterToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(createReq)))
                .andExpect(status().isCreated())
                .andReturn();

        Long docId = objectMapper.readTree(createResult.getResponse().getContentAsString())
                .path("data").path("id").asLong();

        // Update with approval lines
        UpdateDocumentRequest updateReq = new UpdateDocumentRequest(title, "<p>본문 내용입니다.</p>", null, lines);

        mockMvc.perform(put("/api/v1/documents/" + docId)
                        .header("Authorization", "Bearer " + drafterToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(updateReq)))
                .andExpect(status().isOk());

        return docId;
    }

    private Long createDraftWithoutApprovalLines(String title) throws Exception {
        CreateDocumentRequest request = new CreateDocumentRequest(
                "GENERAL", title, "<p>본문 내용입니다.</p>", null, null);

        MvcResult result = mockMvc.perform(post("/api/v1/documents")
                        .header("Authorization", "Bearer " + drafterToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andReturn();

        return objectMapper.readTree(result.getResponse().getContentAsString())
                .path("data").path("id").asLong();
    }

    private Long createAndSubmitWithSingleApprover() throws Exception {
        Long docId = createDraftWithApprovalLines("결재 테스트 문서",
                List.of(new ApprovalLineRequest(APPROVER_ID, "APPROVE", 1)));

        mockMvc.perform(post("/api/v1/documents/" + docId + "/submit")
                        .header("Authorization", "Bearer " + drafterToken))
                .andExpect(status().isOk());

        return docId;
    }

    private Long getFirstApprovalLineId(Long docId) {
        return jdbcTemplate.queryForObject(
                "SELECT id FROM approval_line WHERE document_id = ? AND line_type = 'APPROVE' ORDER BY step_order ASC LIMIT 1",
                Long.class, docId);
    }
}

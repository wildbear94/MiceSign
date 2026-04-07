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
class DocumentWithdrawTest {

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
    private String approver2Token;
    private String otherUserToken;
    private Long otherUserId;

    @BeforeEach
    void setUp() {
        jdbcTemplate.update("DELETE FROM approval_line");
        jdbcTemplate.update("DELETE FROM document_attachment");
        jdbcTemplate.update("DELETE FROM document_content");
        jdbcTemplate.update("DELETE FROM document");
        jdbcTemplate.update("DELETE FROM doc_sequence");

        jdbcTemplate.update("DELETE FROM \"user\" WHERE email IN ('withdraw-approver1@micesign.com', 'withdraw-approver2@micesign.com', 'withdraw-other@micesign.com')");

        jdbcTemplate.update(
            "INSERT INTO \"user\" (employee_no, name, email, password, department_id, position_id, role, status) " +
            "VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            "WDR001", "회수결재자1", "withdraw-approver1@micesign.com",
            "$2a$10$07mcjXBfvelJFwjs8DnoJOnEqprFy.dnQL1NdnRvlqEWwwmX62SOW",
            2, 3, "USER", "ACTIVE"
        );
        approverUserId1 = jdbcTemplate.queryForObject(
            "SELECT id FROM \"user\" WHERE email = 'withdraw-approver1@micesign.com'", Long.class);

        jdbcTemplate.update(
            "INSERT INTO \"user\" (employee_no, name, email, password, department_id, position_id, role, status) " +
            "VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            "WDR002", "회수결재자2", "withdraw-approver2@micesign.com",
            "$2a$10$07mcjXBfvelJFwjs8DnoJOnEqprFy.dnQL1NdnRvlqEWwwmX62SOW",
            2, 5, "USER", "ACTIVE"
        );
        approverUserId2 = jdbcTemplate.queryForObject(
            "SELECT id FROM \"user\" WHERE email = 'withdraw-approver2@micesign.com'", Long.class);

        jdbcTemplate.update(
            "INSERT INTO \"user\" (employee_no, name, email, password, department_id, position_id, role, status) " +
            "VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            "WDR003", "다른사용자", "withdraw-other@micesign.com",
            "$2a$10$07mcjXBfvelJFwjs8DnoJOnEqprFy.dnQL1NdnRvlqEWwwmX62SOW",
            2, 3, "USER", "ACTIVE"
        );
        otherUserId = jdbcTemplate.queryForObject(
            "SELECT id FROM \"user\" WHERE email = 'withdraw-other@micesign.com'", Long.class);

        superAdminToken = tokenHelper.superAdminToken();
        approver1Token = tokenHelper.tokenForRole(
            approverUserId1, "withdraw-approver1@micesign.com", "회수결재자1", UserRole.USER, 2L);
        approver2Token = tokenHelper.tokenForRole(
            approverUserId2, "withdraw-approver2@micesign.com", "회수결재자2", UserRole.USER, 2L);
        otherUserToken = tokenHelper.tokenForRole(
            otherUserId, "withdraw-other@micesign.com", "다른사용자", UserRole.USER, 2L);
    }

    @Test
    void withdrawBeforeApproverActs_setsWithdrawn() throws Exception {
        Long docId = createAndSubmitWithApprover(superAdminToken, approverUserId1);

        mockMvc.perform(post("/api/v1/documents/" + docId + "/withdraw")
                .header("Authorization", "Bearer " + superAdminToken))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.status").value("WITHDRAWN"));

        // Verify completedAt is not null
        mockMvc.perform(get("/api/v1/documents/" + docId)
                .header("Authorization", "Bearer " + superAdminToken))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.status").value("WITHDRAWN"))
            .andExpect(jsonPath("$.data.completedAt").isNotEmpty());
    }

    @Test
    void withdrawAfterStepAdvanced_stillAllowedIfCurrentStepPending() throws Exception {
        // After step 1 approved, currentStep advances to 2.
        // Since step 2 approver hasn't acted yet, withdrawal is allowed.
        List<ApprovalLineRequest> lines = List.of(
            new ApprovalLineRequest(approverUserId1, ApprovalLineType.APPROVE),
            new ApprovalLineRequest(approverUserId2, ApprovalLineType.APPROVE)
        );
        Long docId = createAndSubmitWithApprovers(superAdminToken, lines);

        // Approve step 1 -- advances currentStep to 2
        Long lineId1 = getApprovalLineIdByApprover(docId, approverUserId1);
        mockMvc.perform(post("/api/v1/approvals/" + lineId1 + "/approve")
                .header("Authorization", "Bearer " + approver1Token)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{}"))
            .andExpect(status().isOk());

        // Withdraw should succeed because current step (2) approver hasn't acted
        mockMvc.perform(post("/api/v1/documents/" + docId + "/withdraw")
                .header("Authorization", "Bearer " + superAdminToken))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.status").value("WITHDRAWN"));
    }

    @Test
    void withdrawAfterCurrentStepApproverActed_returns400() throws Exception {
        // Single approver -- once they approve, the doc becomes APPROVED (not SUBMITTED).
        // So we test: create doc with 1 approver, after approval the doc is APPROVED,
        // and we cannot withdraw a non-SUBMITTED doc.
        Long docId = createAndSubmitWithApprover(superAdminToken, approverUserId1);
        Long lineId = getApprovalLineId(docId, 0);

        // Approve -- document becomes APPROVED
        mockMvc.perform(post("/api/v1/approvals/" + lineId + "/approve")
                .header("Authorization", "Bearer " + approver1Token)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{}"))
            .andExpect(status().isOk());

        // Withdraw should fail because doc is no longer SUBMITTED
        mockMvc.perform(post("/api/v1/documents/" + docId + "/withdraw")
                .header("Authorization", "Bearer " + superAdminToken))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.error.code").value("DOC_NOT_SUBMITTED"));
    }

    @Test
    void withdrawByNonDrafter_returns403() throws Exception {
        Long docId = createAndSubmitWithApprover(superAdminToken, approverUserId1);

        mockMvc.perform(post("/api/v1/documents/" + docId + "/withdraw")
                .header("Authorization", "Bearer " + otherUserToken))
            .andExpect(status().isForbidden())
            .andExpect(jsonPath("$.error.code").value("DOC_NOT_OWNER"));
    }

    @Test
    void withdrawNonSubmittedDoc_returns400() throws Exception {
        // Create draft only (no submit)
        CreateDocumentRequest request = new CreateDocumentRequest(
            "GENERAL", "회수 테스트", "<p>본문</p>", null,
            List.of(new ApprovalLineRequest(approverUserId1, ApprovalLineType.APPROVE)));

        MvcResult createResult = mockMvc.perform(post("/api/v1/documents")
                .header("Authorization", "Bearer " + superAdminToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
            .andExpect(status().isCreated())
            .andReturn();

        Long docId = objectMapper.readTree(createResult.getResponse().getContentAsString())
            .path("data").path("id").asLong();

        mockMvc.perform(post("/api/v1/documents/" + docId + "/withdraw")
                .header("Authorization", "Bearer " + superAdminToken))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.error.code").value("DOC_NOT_SUBMITTED"));
    }

    @Test
    void withdrawSetsRemainingPendingToSkipped() throws Exception {
        List<ApprovalLineRequest> lines = List.of(
            new ApprovalLineRequest(approverUserId1, ApprovalLineType.APPROVE),
            new ApprovalLineRequest(approverUserId2, ApprovalLineType.APPROVE)
        );
        Long docId = createAndSubmitWithApprovers(superAdminToken, lines);

        // Withdraw immediately (before any approval)
        mockMvc.perform(post("/api/v1/documents/" + docId + "/withdraw")
                .header("Authorization", "Bearer " + superAdminToken))
            .andExpect(status().isOk());

        // Verify all lines are SKIPPED
        MvcResult result = mockMvc.perform(get("/api/v1/documents/" + docId)
                .header("Authorization", "Bearer " + superAdminToken))
            .andExpect(status().isOk())
            .andReturn();

        JsonNode approvalLines = objectMapper.readTree(result.getResponse().getContentAsString())
            .path("data").path("approvalLines");

        for (JsonNode line : approvalLines) {
            String status = line.path("status").asText();
            assert "SKIPPED".equals(status) :
                "All approval lines should be SKIPPED after withdrawal, got: " + status;
        }
    }

    @Test
    void withdrawnDocCannotBeApproved() throws Exception {
        Long docId = createAndSubmitWithApprover(superAdminToken, approverUserId1);
        Long lineId = getApprovalLineId(docId, 0);

        // Withdraw first
        mockMvc.perform(post("/api/v1/documents/" + docId + "/withdraw")
                .header("Authorization", "Bearer " + superAdminToken))
            .andExpect(status().isOk());

        // Try approve -- should fail because doc is no longer SUBMITTED
        mockMvc.perform(post("/api/v1/approvals/" + lineId + "/approve")
                .header("Authorization", "Bearer " + approver1Token)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{}"))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.error.code").value("APR_DOC_NOT_SUBMITTED"));
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
            "GENERAL", "회수 테스트", "<p>본문</p>", null, approvalLines);

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

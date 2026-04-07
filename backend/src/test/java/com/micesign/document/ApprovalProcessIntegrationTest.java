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
class ApprovalProcessIntegrationTest {

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

    @BeforeEach
    void setUp() {
        jdbcTemplate.update("DELETE FROM approval_line");
        jdbcTemplate.update("DELETE FROM document_attachment");
        jdbcTemplate.update("DELETE FROM document_content");
        jdbcTemplate.update("DELETE FROM document");
        jdbcTemplate.update("DELETE FROM doc_sequence");

        // Delete test users
        jdbcTemplate.update("DELETE FROM \"user\" WHERE email IN ('process-approver1@micesign.com', 'process-approver2@micesign.com')");

        // Create test approver users
        jdbcTemplate.update(
            "INSERT INTO \"user\" (employee_no, name, email, password, department_id, position_id, role, status) " +
            "VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            "PROC001", "프로세스결재자1", "process-approver1@micesign.com",
            "$2a$10$07mcjXBfvelJFwjs8DnoJOnEqprFy.dnQL1NdnRvlqEWwwmX62SOW",
            2, 3, "USER", "ACTIVE"
        );
        approverUserId1 = jdbcTemplate.queryForObject(
            "SELECT id FROM \"user\" WHERE email = 'process-approver1@micesign.com'", Long.class);

        jdbcTemplate.update(
            "INSERT INTO \"user\" (employee_no, name, email, password, department_id, position_id, role, status) " +
            "VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            "PROC002", "프로세스결재자2", "process-approver2@micesign.com",
            "$2a$10$07mcjXBfvelJFwjs8DnoJOnEqprFy.dnQL1NdnRvlqEWwwmX62SOW",
            2, 5, "USER", "ACTIVE"
        );
        approverUserId2 = jdbcTemplate.queryForObject(
            "SELECT id FROM \"user\" WHERE email = 'process-approver2@micesign.com'", Long.class);

        superAdminToken = tokenHelper.superAdminToken();
        approver1Token = tokenHelper.tokenForRole(
            approverUserId1, "process-approver1@micesign.com", "프로세스결재자1", UserRole.USER, 2L);
        approver2Token = tokenHelper.tokenForRole(
            approverUserId2, "process-approver2@micesign.com", "프로세스결재자2", UserRole.USER, 2L);
    }

    @Test
    void approveDocument_setsLineApproved() throws Exception {
        Long docId = createAndSubmitDocWithApprover(superAdminToken, approverUserId1);
        Long lineId = getApprovalLineId(docId, 0);

        // Approve as approver1
        mockMvc.perform(post("/api/v1/approvals/" + lineId + "/approve")
                .header("Authorization", "Bearer " + approver1Token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(new ApprovalActionRequest(null))))
            .andExpect(status().isOk());

        // Verify line status=APPROVED and document status=APPROVED (single approver -> final)
        mockMvc.perform(get("/api/v1/documents/" + docId)
                .header("Authorization", "Bearer " + approver1Token))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.status").value("APPROVED"))
            .andExpect(jsonPath("$.data.approvalLines[0].status").value("APPROVED"));
    }

    @Test
    void approveWithComment_savesComment() throws Exception {
        Long docId = createAndSubmitDocWithApprover(superAdminToken, approverUserId1);
        Long lineId = getApprovalLineId(docId, 0);

        mockMvc.perform(post("/api/v1/approvals/" + lineId + "/approve")
                .header("Authorization", "Bearer " + approver1Token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(new ApprovalActionRequest("동의합니다"))))
            .andExpect(status().isOk());

        mockMvc.perform(get("/api/v1/documents/" + docId)
                .header("Authorization", "Bearer " + approver1Token))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.approvalLines[0].comment").value("동의합니다"));
    }

    @Test
    void rejectDocument_setsDocumentRejected() throws Exception {
        Long docId = createAndSubmitDocWithApprover(superAdminToken, approverUserId1);
        Long lineId = getApprovalLineId(docId, 0);

        mockMvc.perform(post("/api/v1/approvals/" + lineId + "/reject")
                .header("Authorization", "Bearer " + approver1Token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(new ApprovalActionRequest("반려합니다"))))
            .andExpect(status().isOk());

        mockMvc.perform(get("/api/v1/documents/" + docId)
                .header("Authorization", "Bearer " + approver1Token))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.status").value("REJECTED"))
            .andExpect(jsonPath("$.data.completedAt").isNotEmpty());
    }

    @Test
    void rejectWithoutComment_returns400() throws Exception {
        Long docId = createAndSubmitDocWithApprover(superAdminToken, approverUserId1);
        Long lineId = getApprovalLineId(docId, 0);

        // Try reject with empty comment
        mockMvc.perform(post("/api/v1/approvals/" + lineId + "/reject")
                .header("Authorization", "Bearer " + approver1Token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(new ApprovalActionRequest(""))))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.error.code").value("APR_COMMENT_REQUIRED"));

        // Try reject with null comment (no body)
        mockMvc.perform(post("/api/v1/approvals/" + lineId + "/reject")
                .header("Authorization", "Bearer " + approver1Token)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{}"))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.error.code").value("APR_COMMENT_REQUIRED"));
    }

    @Test
    void sequentialApproval_advancesStep() throws Exception {
        // Create document with 2 APPROVE approvers
        List<ApprovalLineRequest> lines = List.of(
            new ApprovalLineRequest(approverUserId1, ApprovalLineType.APPROVE),
            new ApprovalLineRequest(approverUserId2, ApprovalLineType.APPROVE)
        );
        Long docId = createAndSubmitDocWithApprovers(superAdminToken, lines);
        Long lineId1 = getApprovalLineIdByApprover(docId, approverUserId1);
        Long lineId2 = getApprovalLineIdByApprover(docId, approverUserId2);

        // Approve step 1
        mockMvc.perform(post("/api/v1/approvals/" + lineId1 + "/approve")
                .header("Authorization", "Bearer " + approver1Token)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{}"))
            .andExpect(status().isOk());

        // Verify currentStep advances to 2, document still SUBMITTED
        mockMvc.perform(get("/api/v1/documents/" + docId)
                .header("Authorization", "Bearer " + approver1Token))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.status").value("SUBMITTED"))
            .andExpect(jsonPath("$.data.currentStep").value(2));

        // Approve step 2
        mockMvc.perform(post("/api/v1/approvals/" + lineId2 + "/approve")
                .header("Authorization", "Bearer " + approver2Token)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{}"))
            .andExpect(status().isOk());

        // Verify document APPROVED
        mockMvc.perform(get("/api/v1/documents/" + docId)
                .header("Authorization", "Bearer " + approver2Token))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.status").value("APPROVED"))
            .andExpect(jsonPath("$.data.completedAt").isNotEmpty());
    }

    @Test
    void approveWrongTurn_returns400() throws Exception {
        List<ApprovalLineRequest> lines = List.of(
            new ApprovalLineRequest(approverUserId1, ApprovalLineType.APPROVE),
            new ApprovalLineRequest(approverUserId2, ApprovalLineType.APPROVE)
        );
        Long docId = createAndSubmitDocWithApprovers(superAdminToken, lines);
        Long lineId2 = getApprovalLineIdByApprover(docId, approverUserId2);

        // Try to approve step 2 before step 1
        mockMvc.perform(post("/api/v1/approvals/" + lineId2 + "/approve")
                .header("Authorization", "Bearer " + approver2Token)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{}"))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.error.code").value("APR_NOT_YOUR_TURN"));
    }

    @Test
    void approveByNonApprover_returns403() throws Exception {
        Long docId = createAndSubmitDocWithApprover(superAdminToken, approverUserId1);
        Long lineId = getApprovalLineId(docId, 0);

        // Try approve as approver2 who is NOT in the approval line
        mockMvc.perform(post("/api/v1/approvals/" + lineId + "/approve")
                .header("Authorization", "Bearer " + approver2Token)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{}"))
            .andExpect(status().isForbidden())
            .andExpect(jsonPath("$.error.code").value("APR_NOT_AUTHORIZED"));
    }

    @Test
    void rejectAtStep1_setsRejected_remainingStayPending() throws Exception {
        List<ApprovalLineRequest> lines = List.of(
            new ApprovalLineRequest(approverUserId1, ApprovalLineType.APPROVE),
            new ApprovalLineRequest(approverUserId2, ApprovalLineType.APPROVE)
        );
        Long docId = createAndSubmitDocWithApprovers(superAdminToken, lines);
        Long lineId1 = getApprovalLineIdByApprover(docId, approverUserId1);

        // Reject at step 1
        mockMvc.perform(post("/api/v1/approvals/" + lineId1 + "/reject")
                .header("Authorization", "Bearer " + approver1Token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(new ApprovalActionRequest("반려합니다"))))
            .andExpect(status().isOk());

        // Verify step 2 line is still PENDING (not SKIPPED)
        MvcResult result = mockMvc.perform(get("/api/v1/documents/" + docId)
                .header("Authorization", "Bearer " + approver1Token))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.status").value("REJECTED"))
            .andReturn();

        JsonNode approvalLines = objectMapper.readTree(result.getResponse().getContentAsString())
            .path("data").path("approvalLines");

        for (JsonNode line : approvalLines) {
            if (line.path("approver").path("id").asLong() == approverUserId2) {
                assert "PENDING".equals(line.path("status").asText()) :
                    "Step 2 line should remain PENDING, got: " + line.path("status").asText();
            }
        }
    }

    @Test
    void getPendingApprovals_returnsOnlyCurrentTurn() throws Exception {
        // Create 2 docs: one for approver1, one for approver2
        Long docId1 = createAndSubmitDocWithApprover(superAdminToken, approverUserId1);
        Long docId2 = createAndSubmitDocWithApprover(superAdminToken, approverUserId2);

        // Approver1 should see only their pending doc
        mockMvc.perform(get("/api/v1/approvals/pending")
                .header("Authorization", "Bearer " + approver1Token)
                .param("page", "0")
                .param("size", "20"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.totalElements").value(1))
            .andExpect(jsonPath("$.data.content[0].documentId").value(docId1));

        // Approver2 should see only their pending doc
        mockMvc.perform(get("/api/v1/approvals/pending")
                .header("Authorization", "Bearer " + approver2Token)
                .param("page", "0")
                .param("size", "20"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.totalElements").value(1))
            .andExpect(jsonPath("$.data.content[0].documentId").value(docId2));
    }

    @Test
    void agreeTypeCanReject() throws Exception {
        // Create document with AGREE type approver (per D-16: AGREE can also reject)
        List<ApprovalLineRequest> lines = List.of(
            new ApprovalLineRequest(approverUserId1, ApprovalLineType.AGREE)
        );

        // Need at least 1 APPROVE for submit, so add a second approver as APPROVE
        // Actually, the submit validation requires at least 1 APPROVE type.
        // For this test, we use APPROVE + AGREE setup and test AGREE rejection at step 2.
        List<ApprovalLineRequest> linesWithApprove = List.of(
            new ApprovalLineRequest(approverUserId2, ApprovalLineType.APPROVE),
            new ApprovalLineRequest(approverUserId1, ApprovalLineType.AGREE)
        );
        Long docId = createAndSubmitDocWithApprovers(superAdminToken, linesWithApprove);

        // First approve step 1
        Long lineId1 = getApprovalLineIdByApprover(docId, approverUserId2);
        mockMvc.perform(post("/api/v1/approvals/" + lineId1 + "/approve")
                .header("Authorization", "Bearer " + approver2Token)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{}"))
            .andExpect(status().isOk());

        // Now AGREE user rejects at step 2
        Long lineId2 = getApprovalLineIdByApprover(docId, approverUserId1);
        mockMvc.perform(post("/api/v1/approvals/" + lineId2 + "/reject")
                .header("Authorization", "Bearer " + approver1Token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(new ApprovalActionRequest("합의 반려"))))
            .andExpect(status().isOk());

        // Verify document REJECTED
        mockMvc.perform(get("/api/v1/documents/" + docId)
                .header("Authorization", "Bearer " + approver1Token))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.status").value("REJECTED"));
    }

    // --- Helpers ---

    private Long createAndSubmitDocWithApprover(String token, Long approverId) throws Exception {
        List<ApprovalLineRequest> lines = List.of(
            new ApprovalLineRequest(approverId, ApprovalLineType.APPROVE)
        );
        return createAndSubmitDocWithApprovers(token, lines);
    }

    private Long createAndSubmitDocWithApprovers(String token, List<ApprovalLineRequest> approvalLines) throws Exception {
        CreateDocumentRequest request = new CreateDocumentRequest(
            "GENERAL", "결재 프로세스 테스트", "<p>본문</p>", null, approvalLines);

        MvcResult createResult = mockMvc.perform(post("/api/v1/documents")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
            .andExpect(status().isCreated())
            .andReturn();

        Long docId = objectMapper.readTree(createResult.getResponse().getContentAsString())
            .path("data").path("id").asLong();

        // Submit
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

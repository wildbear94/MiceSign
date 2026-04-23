package com.micesign.document;

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

import java.time.LocalDateTime;
import java.util.List;

import static org.hamcrest.Matchers.matchesPattern;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Integration tests for document submission (POST /api/v1/documents/{id}/submit).
 * Covers DOC-03 (submit + numbering), DOC-04 (immutability), DOC-07 (sequence).
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class DocumentSubmitTest {

    @Autowired
    MockMvc mockMvc;

    @Autowired
    ObjectMapper objectMapper;

    @Autowired
    JdbcTemplate jdbcTemplate;

    @Autowired
    TestTokenHelper tokenHelper;

    private String token;
    private int currentYear;

    private static final Long APPROVER_ID = 60L;

    @BeforeEach
    void setUp() {
        // Phase 29 — notification_log 가 user FK 를 갖고 있어 stub mode 발송 시 INSERT 됨.
        // user/document 정리 전에 cleanup 필수 (Plan 04 lazy-init fix 가 listener 흐름을
        // 정상화시키면서 stub 발송 SUCCESS 행이 남는 사이드 이펙트 — base cleanup 결함 보강).
        jdbcTemplate.update("DELETE FROM notification_log");
        // Clean document data (order matters due to FK constraints)
        jdbcTemplate.update("DELETE FROM approval_line");
        jdbcTemplate.update("DELETE FROM document_attachment");
        jdbcTemplate.update("DELETE FROM document_content");
        jdbcTemplate.update("DELETE FROM document");
        jdbcTemplate.update("DELETE FROM doc_sequence");

        // Clean up and re-insert test approver user
        jdbcTemplate.update("DELETE FROM \"user\" WHERE id = ?", APPROVER_ID);
        jdbcTemplate.update(
                "INSERT INTO \"user\" (id, employee_no, name, email, password, department_id, position_id, role, status, failed_login_count, must_change_password) " +
                        "VALUES (?, 'SUBMIT_APR', '제출테스트결재자', 'submitapprover@micesign.com', '$2a$10$07mcjXBfvelJFwjs8DnoJOnEqprFy.dnQL1NdnRvlqEWwwmX62SOW', 2, 3, 'USER', 'ACTIVE', 0, FALSE)",
                APPROVER_ID);

        // Use super admin (userId=1) which is seeded in V2
        token = tokenHelper.superAdminToken();
        currentYear = LocalDateTime.now().getYear();
    }

    // ──────────────────────────────────────────────
    // Test 1: Normal submission (DRAFT -> SUBMITTED)
    // ──────────────────────────────────────────────

    @Test
    void submitDraft_success() throws Exception {
        Long docId = createGeneralDraft("일반 기안 테스트");
        addApprovalLine(docId);

        mockMvc.perform(post("/api/v1/documents/" + docId + "/submit")
                .header("Authorization", "Bearer " + token))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.success").value(true))
            .andExpect(jsonPath("$.data.status").value("SUBMITTED"))
            .andExpect(jsonPath("$.data.docNumber").value(
                    matchesPattern("GEN-" + currentYear + "-\\d{4}")))
            .andExpect(jsonPath("$.data.submittedAt").isNotEmpty());
    }

    // ──────────────────────────────────────────────
    // Test 2: Document number format per template
    // ──────────────────────────────────────────────

    @Test
    void submitGeneralDocument_numberFormatGEN() throws Exception {
        Long docId = createGeneralDraft("일반 기안");
        addApprovalLine(docId);

        MvcResult result = mockMvc.perform(post("/api/v1/documents/" + docId + "/submit")
                .header("Authorization", "Bearer " + token))
            .andExpect(status().isOk())
            .andReturn();

        String docNumber = objectMapper.readTree(result.getResponse().getContentAsString())
                .path("data").path("docNumber").asText();
        assert docNumber.equals("GEN-" + currentYear + "-0001");
    }

    @Test
    void submitExpenseDocument_numberFormatEXP() throws Exception {
        Long docId = createExpenseDraft();
        addApprovalLine(docId);

        MvcResult result = mockMvc.perform(post("/api/v1/documents/" + docId + "/submit")
                .header("Authorization", "Bearer " + token))
            .andExpect(status().isOk())
            .andReturn();

        String docNumber = objectMapper.readTree(result.getResponse().getContentAsString())
                .path("data").path("docNumber").asText();
        assert docNumber.startsWith("EXP-" + currentYear);
    }

    @Test
    void submitLeaveDocument_prefixIsLEV() throws Exception {
        Long docId = createLeaveDraft();
        addApprovalLine(docId);

        MvcResult result = mockMvc.perform(post("/api/v1/documents/" + docId + "/submit")
                .header("Authorization", "Bearer " + token))
            .andExpect(status().isOk())
            .andReturn();

        String docNumber = objectMapper.readTree(result.getResponse().getContentAsString())
                .path("data").path("docNumber").asText();
        assert docNumber.startsWith("LEV-") : "Expected LEV- prefix but got: " + docNumber;
    }

    // ──────────────────────────────────────────────
    // Test 3: Already submitted document returns 400
    // ──────────────────────────────────────────────

    @Test
    void submitAlreadySubmitted_returns400() throws Exception {
        Long docId = createGeneralDraft("이미 제출된 문서");
        addApprovalLine(docId);

        // Submit once
        mockMvc.perform(post("/api/v1/documents/" + docId + "/submit")
                .header("Authorization", "Bearer " + token))
            .andExpect(status().isOk());

        // Submit again -> should fail (not DRAFT)
        mockMvc.perform(post("/api/v1/documents/" + docId + "/submit")
                .header("Authorization", "Bearer " + token))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.error.code").value("DOC_NOT_DRAFT"));
    }

    // ──────────────────────────────────────────────
    // Test 4: Other user's document returns 403
    // ──────────────────────────────────────────────

    @Test
    void submitOtherUserDocument_returns403() throws Exception {
        Long docId = createGeneralDraft("타인 문서");

        // Use a different user's token
        String otherToken = tokenHelper.userToken();

        mockMvc.perform(post("/api/v1/documents/" + docId + "/submit")
                .header("Authorization", "Bearer " + otherToken))
            .andExpect(status().isForbidden())
            .andExpect(jsonPath("$.error.code").value("DOC_NOT_OWNER"));
    }

    // ──────────────────────────────────────────────
    // Test 5: Document without title returns 400
    // ──────────────────────────────────────────────

    @Test
    void submitWithoutTitle_returns400() throws Exception {
        Long docId = createGeneralDraft("임시 제목");
        addApprovalLine(docId);

        // Clear the title to empty via direct DB update (bypassing create validation)
        jdbcTemplate.update("UPDATE document SET title = '' WHERE id = ?", docId);

        mockMvc.perform(post("/api/v1/documents/" + docId + "/submit")
                .header("Authorization", "Bearer " + token))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.error.code").value("DOC_TITLE_REQUIRED"));
    }

    // ──────────────────────────────────────────────
    // Test 6: Update after submission returns error (DOC-04 immutability)
    // ──────────────────────────────────────────────

    @Test
    void updateSubmittedDocument_returns400() throws Exception {
        Long docId = createGeneralDraft("제출 후 수정 시도");
        addApprovalLine(docId);

        // Submit
        mockMvc.perform(post("/api/v1/documents/" + docId + "/submit")
                .header("Authorization", "Bearer " + token))
            .andExpect(status().isOk());

        // Try to update -> should fail
        UpdateDocumentRequest updateReq = new UpdateDocumentRequest(
                "수정된 제목", "<p>수정된 본문</p>", null, null);

        mockMvc.perform(put("/api/v1/documents/" + docId)
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(updateReq)))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.error.code").value("DOC_NOT_DRAFT"));
    }

    // ──────────────────────────────────────────────
    // Test 7: Sequence increments for same template
    // ──────────────────────────────────────────────

    @Test
    void submitTwice_sequenceIncrements() throws Exception {
        Long docId1 = createGeneralDraft("첫 번째 문서");
        addApprovalLine(docId1);
        Long docId2 = createGeneralDraft("두 번째 문서");
        addApprovalLine(docId2);

        // Submit first
        MvcResult result1 = mockMvc.perform(post("/api/v1/documents/" + docId1 + "/submit")
                .header("Authorization", "Bearer " + token))
            .andExpect(status().isOk())
            .andReturn();

        String docNumber1 = objectMapper.readTree(result1.getResponse().getContentAsString())
                .path("data").path("docNumber").asText();

        // Submit second
        MvcResult result2 = mockMvc.perform(post("/api/v1/documents/" + docId2 + "/submit")
                .header("Authorization", "Bearer " + token))
            .andExpect(status().isOk())
            .andReturn();

        String docNumber2 = objectMapper.readTree(result2.getResponse().getContentAsString())
                .path("data").path("docNumber").asText();

        assert docNumber1.equals("GEN-" + currentYear + "-0001")
                : "Expected GEN-" + currentYear + "-0001 but got: " + docNumber1;
        assert docNumber2.equals("GEN-" + currentYear + "-0002")
                : "Expected GEN-" + currentYear + "-0002 but got: " + docNumber2;
    }

    // ──────────────────────────────────────────────
    // Helpers
    // ──────────────────────────────────────────────

    private Long createGeneralDraft(String title) throws Exception {
        CreateDocumentRequest request = new CreateDocumentRequest(
                "GENERAL", title, "<p>본문 내용입니다.</p>", null, null);

        MvcResult result = mockMvc.perform(post("/api/v1/documents")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
            .andExpect(status().isCreated())
            .andReturn();

        return objectMapper.readTree(result.getResponse().getContentAsString())
                .path("data").path("id").asLong();
    }

    private Long createExpenseDraft() throws Exception {
        String formData = """
            {"items":[{"name":"택시비","quantity":1,"unitPrice":15000,"amount":15000}],"totalAmount":15000}
            """;
        CreateDocumentRequest request = new CreateDocumentRequest(
                "EXPENSE", "지출 결의서 테스트", null, formData.trim(), null);

        MvcResult result = mockMvc.perform(post("/api/v1/documents")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
            .andExpect(status().isCreated())
            .andReturn();

        return objectMapper.readTree(result.getResponse().getContentAsString())
                .path("data").path("id").asLong();
    }

    private void addApprovalLine(Long docId) {
        jdbcTemplate.update(
                "INSERT INTO approval_line (document_id, approver_id, line_type, step_order, status, created_at) " +
                        "VALUES (?, ?, 'APPROVE', 1, 'PENDING', CURRENT_TIMESTAMP)",
                docId, APPROVER_ID);
    }

    private Long createLeaveDraft() throws Exception {
        String formData = """
            {"leaveTypeId":1,"startDate":"2026-04-05","endDate":"2026-04-07","days":3,"reason":"개인 사유"}
            """;
        CreateDocumentRequest request = new CreateDocumentRequest(
                "LEAVE", "휴가 신청 테스트", null, formData.trim(), null);

        MvcResult result = mockMvc.perform(post("/api/v1/documents")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
            .andExpect(status().isCreated())
            .andReturn();

        return objectMapper.readTree(result.getResponse().getContentAsString())
                .path("data").path("id").asLong();
    }
}

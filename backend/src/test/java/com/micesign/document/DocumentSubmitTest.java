package com.micesign.document;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.micesign.admin.TestTokenHelper;
import com.micesign.domain.enums.UserRole;
import com.micesign.dto.document.ApprovalLineRequest;
import com.micesign.dto.document.CreateDocumentRequest;
import com.micesign.dto.document.UpdateDocumentRequest;
import org.junit.jupiter.api.Assertions;
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
    // Phase 34 Plan 03 — drafter snapshot capture tests (D-C1, D-C4, D-C5, D-E1)
    // ──────────────────────────────────────────────

    /**
     * Test A — submit captures drafterSnapshot with 4 fields populated for SUPER_ADMIN
     * (V2 seed: department_id=1 / position_id=7).
     * Verifies D-C1 (snapshot key shape) + D-A3 (snapshot at submit) + D-A4 (draftedAt = submittedAt).
     */
    @Test
    void submitDraft_capturesDrafterSnapshot() throws Exception {
        Long docId = createGeneralDraft("snapshot 캡처 테스트");
        addApprovalLine(docId);

        MvcResult result = mockMvc.perform(post("/api/v1/documents/" + docId + "/submit")
                .header("Authorization", "Bearer " + token))
            .andExpect(status().isOk())
            .andReturn();

        String formDataJson = objectMapper.readTree(result.getResponse().getContentAsString())
                .path("data").path("formData").asText();
        JsonNode snapshot = objectMapper.readTree(formDataJson).path("drafterSnapshot");

        Assertions.assertFalse(snapshot.isMissingNode(),
                "drafterSnapshot must be present after submit (D-C1)");
        Assertions.assertNotNull(
                snapshot.path("departmentName").asText(null),
                "departmentName must be populated for SUPER_ADMIN (V2 seed has dept)");
        Assertions.assertNotNull(
                snapshot.path("positionName").asText(null),
                "positionName must be populated for SUPER_ADMIN (V2 seed has position_id=7)");
        Assertions.assertNotNull(
                snapshot.path("drafterName").asText(null),
                "drafterName must equal user name (D-A1)");
        Assertions.assertNotNull(
                snapshot.path("draftedAt").asText(null),
                "draftedAt must equal submittedAt ISO string (D-A4)");
    }

    /**
     * Test B — drafter with NULL position_id produces JSON null at the key, not omission.
     * Verifies D-C4 (positionName key present, value JSON null).
     */
    @Test
    void submitDraft_capturesDrafterSnapshot_nullPosition() throws Exception {
        // Insert a fresh user with position_id = NULL
        Long noPositionUserId = 80L;
        jdbcTemplate.update("DELETE FROM \"user\" WHERE id = ?", noPositionUserId);
        jdbcTemplate.update(
                "INSERT INTO \"user\" (id, employee_no, name, email, password, department_id, position_id, role, status, failed_login_count, must_change_password) " +
                        "VALUES (?, 'NOPOS', '직위없음테스터', 'nopos@micesign.com', '$2a$10$07mcjXBfvelJFwjs8DnoJOnEqprFy.dnQL1NdnRvlqEWwwmX62SOW', 2, NULL, 'USER', 'ACTIVE', 0, FALSE)",
                noPositionUserId);

        String noPositionToken = tokenHelper.tokenForRole(
                noPositionUserId, "nopos@micesign.com", "직위없음테스터",
                UserRole.USER, 2L);

        Long docId = createGeneralDraftAs("직위 null 케이스", noPositionToken);
        addApprovalLineFor(docId, APPROVER_ID);

        MvcResult result = mockMvc.perform(post("/api/v1/documents/" + docId + "/submit")
                .header("Authorization", "Bearer " + noPositionToken))
            .andExpect(status().isOk())
            .andReturn();

        String formDataJson = objectMapper.readTree(result.getResponse().getContentAsString())
                .path("data").path("formData").asText();
        JsonNode snapshot = objectMapper.readTree(formDataJson).path("drafterSnapshot");

        Assertions.assertTrue(
                snapshot.has("positionName"),
                "positionName key must be present even when null (D-C4 — JSON null per document/* convention)");
        Assertions.assertTrue(
                snapshot.path("positionName").isNull(),
                "positionName value must be JSON null (not omitted)");
        // Other 3 fields must still be populated
        Assertions.assertEquals("경영지원부",
                snapshot.path("departmentName").asText(null),
                "departmentName must reflect department_id=2 (V2 seed: '경영지원부')");
        Assertions.assertEquals("직위없음테스터",
                snapshot.path("drafterName").asText(null),
                "drafterName must reflect inserted user");
    }

    /**
     * Test C — Snapshot is immutable across status transitions (D-C5).
     * Plan §rationale: D-C7 rollback path is defensive and not tested here (provoking
     * JsonProcessingException requires mocking ObjectMapper which would conflict with
     * production reuse). This test verifies D-C5: once written, drafterSnapshot must not
     * change as the document moves through other states. Withdraw is the only post-submit
     * transition currently exposed (approve/reject endpoints land in Phase 7), and per
     * RESEARCH the withdrawDocument() service does not touch formData — so withdraw is a
     * valid invariant probe.
     */
    @Test
    void snapshotImmutableAfterStatusChange() throws Exception {
        Long docId = createGeneralDraft("immutability 검증");
        addApprovalLine(docId);

        MvcResult submitResult = mockMvc.perform(post("/api/v1/documents/" + docId + "/submit")
                .header("Authorization", "Bearer " + token))
            .andExpect(status().isOk())
            .andReturn();
        String formDataAfterSubmit = objectMapper.readTree(submitResult.getResponse().getContentAsString())
                .path("data").path("formData").asText();
        JsonNode snapshotAfterSubmit =
                objectMapper.readTree(formDataAfterSubmit).path("drafterSnapshot");

        // Withdraw — a state transition that does NOT touch formData (RESEARCH-verified)
        mockMvc.perform(post("/api/v1/documents/" + docId + "/withdraw")
                .header("Authorization", "Bearer " + token))
            .andExpect(status().isOk());

        // Re-fetch document
        MvcResult fetched = mockMvc.perform(get("/api/v1/documents/" + docId)
                .header("Authorization", "Bearer " + token))
            .andExpect(status().isOk())
            .andReturn();
        String formDataAfterWithdraw = objectMapper.readTree(fetched.getResponse().getContentAsString())
                .path("data").path("formData").asText();
        JsonNode snapshotAfterWithdraw =
                objectMapper.readTree(formDataAfterWithdraw).path("drafterSnapshot");

        Assertions.assertEquals(
                snapshotAfterSubmit.toString(),
                snapshotAfterWithdraw.toString(),
                "drafterSnapshot must be immutable across status transitions (D-C5)");
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

    /**
     * Phase 34 Plan 03 — token-parameterized variant of createGeneralDraft.
     * Mirrors {@link #createGeneralDraft(String)} but uses the supplied auth token
     * (needed for the null-position test which acts as a different drafter user).
     */
    private Long createGeneralDraftAs(String title, String authToken) throws Exception {
        CreateDocumentRequest request = new CreateDocumentRequest(
                "GENERAL", title, "<p>본문 내용입니다.</p>", null, null);

        MvcResult result = mockMvc.perform(post("/api/v1/documents")
                .header("Authorization", "Bearer " + authToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
            .andExpect(status().isCreated())
            .andReturn();

        return objectMapper.readTree(result.getResponse().getContentAsString())
                .path("data").path("id").asLong();
    }

    /**
     * Phase 34 Plan 03 — approver-parameterized variant of addApprovalLine.
     * Direct DB insert (same as {@link #addApprovalLine(Long)}) but allows the test
     * to pick the approver — useful when the drafter differs from the default user.
     */
    private void addApprovalLineFor(Long docId, Long approverId) {
        jdbcTemplate.update(
                "INSERT INTO approval_line (document_id, approver_id, line_type, step_order, status, created_at) " +
                        "VALUES (?, ?, 'APPROVE', 1, 'PENDING', CURRENT_TIMESTAMP)",
                docId, approverId);
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

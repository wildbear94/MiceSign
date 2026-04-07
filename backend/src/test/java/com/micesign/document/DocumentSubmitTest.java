package com.micesign.document;

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

import java.time.LocalDateTime;
import java.util.List;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

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

    @MockitoBean
    GoogleDriveService googleDriveService;

    private String token;
    private Long approverUserId;

    @BeforeEach
    void setUp() {
        jdbcTemplate.update("DELETE FROM approval_line");
        jdbcTemplate.update("DELETE FROM document_attachment");
        jdbcTemplate.update("DELETE FROM document_content");
        jdbcTemplate.update("DELETE FROM document");
        jdbcTemplate.update("DELETE FROM doc_sequence");

        // Create test approver user if not exists
        jdbcTemplate.update("DELETE FROM \"user\" WHERE email = 'submit-test-approver@micesign.com'");
        jdbcTemplate.update(
            "INSERT INTO \"user\" (employee_no, name, email, password, department_id, position_id, role, status) " +
            "VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            "SUBAPPR01", "제출테스트결재자", "submit-test-approver@micesign.com",
            "$2a$10$07mcjXBfvelJFwjs8DnoJOnEqprFy.dnQL1NdnRvlqEWwwmX62SOW",
            2, 3, "USER", "ACTIVE"
        );
        approverUserId = jdbcTemplate.queryForObject(
            "SELECT id FROM \"user\" WHERE email = 'submit-test-approver@micesign.com'", Long.class);

        token = tokenHelper.superAdminToken();
    }

    @Test
    void submitDraft_returns200_withDocNumber() throws Exception {
        Long docId = createDraftWithApprover("GENERAL", "테스트 일반 기안", "<p>본문입니다.</p>", null);

        int year = LocalDateTime.now().getYear();

        mockMvc.perform(post("/api/v1/documents/" + docId + "/submit")
                .header("Authorization", "Bearer " + token))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.success").value(true))
            .andExpect(jsonPath("$.data.status").value("SUBMITTED"))
            .andExpect(jsonPath("$.data.docNumber").value("GEN-" + year + "-0001"));
    }

    @Test
    void submitDraft_assignsSequentialNumbers() throws Exception {
        Long docId1 = createDraftWithApprover("GENERAL", "문서 1", "<p>본문 1</p>", null);
        Long docId2 = createDraftWithApprover("GENERAL", "문서 2", "<p>본문 2</p>", null);

        int year = LocalDateTime.now().getYear();

        mockMvc.perform(post("/api/v1/documents/" + docId1 + "/submit")
                .header("Authorization", "Bearer " + token))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.docNumber").value("GEN-" + year + "-0001"));

        mockMvc.perform(post("/api/v1/documents/" + docId2 + "/submit")
                .header("Authorization", "Bearer " + token))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.docNumber").value("GEN-" + year + "-0002"));
    }

    @Test
    void submitDraft_differentTemplates_independentSequences() throws Exception {
        Long generalDocId = createDraftWithApprover("GENERAL", "일반 문서", "<p>본문</p>", null);
        String expenseFormData = """
            {"items":[{"name":"택시비","quantity":1,"unitPrice":15000,"amount":15000}],"totalAmount":15000}
            """;
        Long expenseDocId = createDraftWithApprover("EXPENSE", "지출 문서", null, expenseFormData.trim());

        int year = LocalDateTime.now().getYear();

        mockMvc.perform(post("/api/v1/documents/" + generalDocId + "/submit")
                .header("Authorization", "Bearer " + token))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.docNumber").value("GEN-" + year + "-0001"));

        mockMvc.perform(post("/api/v1/documents/" + expenseDocId + "/submit")
                .header("Authorization", "Bearer " + token))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.docNumber").value("EXP-" + year + "-0001"));
    }

    @Test
    void submitAlreadySubmitted_returns403() throws Exception {
        Long docId = createDraftWithApprover("GENERAL", "테스트 문서", "<p>본문</p>", null);

        // Submit once
        mockMvc.perform(post("/api/v1/documents/" + docId + "/submit")
                .header("Authorization", "Bearer " + token))
            .andExpect(status().isOk());

        // Try to submit again
        mockMvc.perform(post("/api/v1/documents/" + docId + "/submit")
                .header("Authorization", "Bearer " + token))
            .andExpect(status().isForbidden())
            .andExpect(jsonPath("$.error.code").value("DOC_NOT_DRAFT"));
    }

    @Test
    void updateSubmittedDocument_returns403() throws Exception {
        Long docId = createDraftWithApprover("GENERAL", "테스트 문서", "<p>본문</p>", null);

        // Submit
        mockMvc.perform(post("/api/v1/documents/" + docId + "/submit")
                .header("Authorization", "Bearer " + token))
            .andExpect(status().isOk());

        // Try to update
        UpdateDocumentRequest updateReq = new UpdateDocumentRequest(
            "수정 시도", "<p>수정된 본문</p>", null, null);

        mockMvc.perform(put("/api/v1/documents/" + docId)
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(updateReq)))
            .andExpect(status().isForbidden())
            .andExpect(jsonPath("$.error.code").value("DOC_NOT_DRAFT"));
    }

    @Test
    void deleteSubmittedDocument_returns403() throws Exception {
        Long docId = createDraftWithApprover("GENERAL", "테스트 문서", "<p>본문</p>", null);

        // Submit
        mockMvc.perform(post("/api/v1/documents/" + docId + "/submit")
                .header("Authorization", "Bearer " + token))
            .andExpect(status().isOk());

        // Try to delete
        mockMvc.perform(delete("/api/v1/documents/" + docId)
                .header("Authorization", "Bearer " + token))
            .andExpect(status().isForbidden())
            .andExpect(jsonPath("$.error.code").value("DOC_NOT_DRAFT"));
    }

    @Test
    void submitDraft_validatesFormData() throws Exception {
        // Create a draft with empty body (GENERAL requires body content)
        Long docId = createDraftWithEmptyBody();

        mockMvc.perform(post("/api/v1/documents/" + docId + "/submit")
                .header("Authorization", "Bearer " + token))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.error.code").value("DOC_INVALID_FORM_DATA"));
    }

    // --- Helpers ---

    private Long createDraftWithApprover(String templateCode, String title, String bodyHtml, String formData) throws Exception {
        List<ApprovalLineRequest> approvalLines = List.of(
            new ApprovalLineRequest(approverUserId, ApprovalLineType.APPROVE)
        );
        CreateDocumentRequest request = new CreateDocumentRequest(templateCode, title, bodyHtml, formData, approvalLines);

        MvcResult result = mockMvc.perform(post("/api/v1/documents")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
            .andExpect(status().isCreated())
            .andReturn();

        return objectMapper.readTree(result.getResponse().getContentAsString())
            .path("data").path("id").asLong();
    }

    private Long createDraftWithEmptyBody() throws Exception {
        // Insert directly via JDBC to bypass create-time validation
        jdbcTemplate.update(
            "INSERT INTO document (template_code, title, drafter_id, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
            "GENERAL", "빈 본문 문서", 1L, "DRAFT",
            java.sql.Timestamp.valueOf(LocalDateTime.now()),
            java.sql.Timestamp.valueOf(LocalDateTime.now())
        );
        Long docId = jdbcTemplate.queryForObject("SELECT MAX(id) FROM document", Long.class);

        // Create empty content
        jdbcTemplate.update(
            "INSERT INTO document_content (document_id, body_html, form_data) VALUES (?, ?, ?)",
            docId, "", null
        );

        // Add an approver line so the form validation can be tested (not blocked by APR_NO_APPROVER)
        jdbcTemplate.update(
            "INSERT INTO approval_line (document_id, approver_id, line_type, step_order, status, created_at) VALUES (?, ?, ?, ?, ?, ?)",
            docId, approverUserId, "APPROVE", 1, "PENDING",
            java.sql.Timestamp.valueOf(LocalDateTime.now())
        );

        return docId;
    }
}

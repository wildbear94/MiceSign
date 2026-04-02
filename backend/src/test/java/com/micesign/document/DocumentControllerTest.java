package com.micesign.document;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.micesign.admin.TestTokenHelper;
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

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class DocumentControllerTest {

    @Autowired
    MockMvc mockMvc;

    @Autowired
    ObjectMapper objectMapper;

    @Autowired
    JdbcTemplate jdbcTemplate;

    @Autowired
    TestTokenHelper tokenHelper;

    private String token;

    @BeforeEach
    void setUp() {
        // Clean document data (order matters due to FK constraints)
        jdbcTemplate.update("DELETE FROM document_attachment");
        jdbcTemplate.update("DELETE FROM document_content");
        jdbcTemplate.update("DELETE FROM document");
        // Use super admin (userId=1) which is seeded in V2
        token = tokenHelper.superAdminToken();
    }

    // --- CREATE ---

    @Test
    void createDraft_general_returns201() throws Exception {
        CreateDocumentRequest request = new CreateDocumentRequest(
            "GENERAL", "일반 기안 테스트", "<p>본문 내용입니다.</p>", null);

        mockMvc.perform(post("/api/v1/documents")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.success").value(true))
            .andExpect(jsonPath("$.data.id").isNumber())
            .andExpect(jsonPath("$.data.status").value("DRAFT"))
            .andExpect(jsonPath("$.data.title").value("일반 기안 테스트"))
            .andExpect(jsonPath("$.data.templateCode").value("GENERAL"));
    }

    @Test
    void createDraft_expense_returns201() throws Exception {
        String formData = """
            {"items":[{"name":"택시비","quantity":1,"unitPrice":15000,"amount":15000}],"totalAmount":15000}
            """;
        CreateDocumentRequest request = new CreateDocumentRequest(
            "EXPENSE", "지출 결의서 테스트", null, formData.trim());

        mockMvc.perform(post("/api/v1/documents")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.success").value(true))
            .andExpect(jsonPath("$.data.status").value("DRAFT"))
            .andExpect(jsonPath("$.data.templateCode").value("EXPENSE"));
    }

    @Test
    void createDraft_leave_returns201() throws Exception {
        String formData = """
            {"leaveTypeId":1,"startDate":"2026-04-05","endDate":"2026-04-07","days":3,"reason":"개인 사유"}
            """;
        CreateDocumentRequest request = new CreateDocumentRequest(
            "LEAVE", "휴가 신청 테스트", null, formData.trim());

        mockMvc.perform(post("/api/v1/documents")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.success").value(true))
            .andExpect(jsonPath("$.data.status").value("DRAFT"))
            .andExpect(jsonPath("$.data.templateCode").value("LEAVE"));
    }

    @Test
    void createDraft_invalidTemplate_returns400() throws Exception {
        CreateDocumentRequest request = new CreateDocumentRequest(
            "INVALID", "테스트", "<p>body</p>", null);

        mockMvc.perform(post("/api/v1/documents")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.error.code").value("TPL_NOT_FOUND"));
    }

    // --- UPDATE ---

    @Test
    void updateDraft_returns200() throws Exception {
        Long docId = createGeneralDraft();

        UpdateDocumentRequest updateReq = new UpdateDocumentRequest(
            "수정된 제목", "<p>수정된 본문</p>", null);

        mockMvc.perform(put("/api/v1/documents/" + docId)
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(updateReq)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.success").value(true))
            .andExpect(jsonPath("$.data.title").value("수정된 제목"));
    }

    @Test
    void updateDraft_notOwner_returnsError() throws Exception {
        Long docId = createGeneralDraft();

        // Use a different user token
        String otherToken = tokenHelper.userToken();

        UpdateDocumentRequest updateReq = new UpdateDocumentRequest(
            "수정 시도", "<p>본문</p>", null);

        mockMvc.perform(put("/api/v1/documents/" + docId)
                .header("Authorization", "Bearer " + otherToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(updateReq)))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.error.code").value("DOC_NOT_OWNER"));
    }

    @Test
    void updateDraft_notDraftStatus_returnsError() throws Exception {
        Long docId = createGeneralDraft();

        // Manually set status to SUBMITTED to test guard
        jdbcTemplate.update("UPDATE document SET status = 'SUBMITTED' WHERE id = ?", docId);

        UpdateDocumentRequest updateReq = new UpdateDocumentRequest(
            "수정 시도", "<p>본문</p>", null);

        mockMvc.perform(put("/api/v1/documents/" + docId)
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(updateReq)))
            .andExpect(status().isForbidden())
            .andExpect(jsonPath("$.error.code").value("DOC_NOT_DRAFT"));
    }

    // --- DELETE ---

    @Test
    void deleteDraft_returns200_thenNotFound() throws Exception {
        Long docId = createGeneralDraft();

        // Delete
        mockMvc.perform(delete("/api/v1/documents/" + docId)
                .header("Authorization", "Bearer " + token))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.success").value(true));

        // Verify gone
        mockMvc.perform(get("/api/v1/documents/" + docId)
                .header("Authorization", "Bearer " + token))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.error.code").value("DOC_NOT_FOUND"));
    }

    // --- LIST ---

    @Test
    void getMyDocuments_returnsPaginatedList() throws Exception {
        createGeneralDraft();
        createGeneralDraft();

        mockMvc.perform(get("/api/v1/documents/my")
                .header("Authorization", "Bearer " + token)
                .param("page", "0")
                .param("size", "20"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.success").value(true))
            .andExpect(jsonPath("$.data.content").isArray())
            .andExpect(jsonPath("$.data.content.length()").value(2))
            .andExpect(jsonPath("$.data.totalElements").value(2));
    }

    // --- DETAIL ---

    @Test
    void getDocumentDetail_returnsFullDetail() throws Exception {
        Long docId = createGeneralDraft();

        mockMvc.perform(get("/api/v1/documents/" + docId)
                .header("Authorization", "Bearer " + token))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.success").value(true))
            .andExpect(jsonPath("$.data.id").value(docId))
            .andExpect(jsonPath("$.data.bodyHtml").value("<p>본문 내용입니다.</p>"))
            .andExpect(jsonPath("$.data.drafter.name").value("시스템관리자"))
            .andExpect(jsonPath("$.data.templateCode").value("GENERAL"));
    }

    // --- Helper ---

    private Long createGeneralDraft() throws Exception {
        CreateDocumentRequest request = new CreateDocumentRequest(
            "GENERAL", "테스트 문서", "<p>본문 내용입니다.</p>", null);

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

package com.micesign.document;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.micesign.admin.TestTokenHelper;
import com.micesign.domain.enums.UserRole;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class DocumentSearchTest {

    @Autowired MockMvc mockMvc;
    @Autowired ObjectMapper objectMapper;
    @Autowired JdbcTemplate jdbcTemplate;
    @Autowired TestTokenHelper tokenHelper;

    // User A: regular user (id=10), User B: another user (id=11), Admin: (id=1, seeded)
    private String userAToken;
    private String userBToken;
    private String adminToken;
    private String regularUserToken;

    @BeforeEach
    void setUp() {
        // Clean in order of FK dependencies
        jdbcTemplate.update("DELETE FROM approval_line");
        jdbcTemplate.update("DELETE FROM document_attachment");
        jdbcTemplate.update("DELETE FROM document_content");
        jdbcTemplate.update("DELETE FROM document");
        // Clean tables referencing user before deleting users
        jdbcTemplate.update("DELETE FROM notification_log");
        jdbcTemplate.update("DELETE FROM refresh_token");
        jdbcTemplate.update("DELETE FROM audit_log");
        // Clean test users (keep seeded admin id=1)
        // H2 in MariaDB mode requires backtick quoting for reserved word 'user'
        jdbcTemplate.update("DELETE FROM `user` WHERE id > 1");

        // Insert User A (USER role, department 4=dev)
        jdbcTemplate.update(
            "INSERT INTO `user` (id, employee_no, name, email, password, department_id, position_id, role, status) " +
            "VALUES (10, 'EMP010', '김철수', 'usera@micesign.com', '$2a$10$07mcjXBfvelJFwjs8DnoJOnEqprFy.dnQL1NdnRvlqEWwwmX62SOW', 4, 1, 'USER', 'ACTIVE')"
        );

        // Insert User B (USER role, department 5=sales)
        jdbcTemplate.update(
            "INSERT INTO `user` (id, employee_no, name, email, password, department_id, position_id, role, status) " +
            "VALUES (11, 'EMP011', '이영희', 'userb@micesign.com', '$2a$10$07mcjXBfvelJFwjs8DnoJOnEqprFy.dnQL1NdnRvlqEWwwmX62SOW', 5, 2, 'USER', 'ACTIVE')"
        );

        // Generate tokens
        userAToken = tokenHelper.tokenForRole(10L, "usera@micesign.com", "김철수", UserRole.USER, 4L);
        userBToken = tokenHelper.tokenForRole(11L, "userb@micesign.com", "이영희", UserRole.USER, 5L);
        adminToken = tokenHelper.superAdminToken();
        regularUserToken = tokenHelper.tokenForRole(200L, "regular@micesign.com", "일반사용자", UserRole.USER, 1L);

        // Insert test documents
        // User A: 2 documents (GENERAL DRAFT, GENERAL SUBMITTED)
        jdbcTemplate.update(
            "INSERT INTO document (id, doc_number, template_code, title, drafter_id, status, created_at, updated_at) " +
            "VALUES (100, NULL, 'GENERAL', '프로젝트 보고서', 10, 'DRAFT', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)"
        );
        jdbcTemplate.update(
            "INSERT INTO document (id, doc_number, template_code, title, drafter_id, status, created_at, updated_at) " +
            "VALUES (101, 'GEN-2026-0001', 'GENERAL', '업무 협조 요청', 10, 'SUBMITTED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)"
        );

        // User B: 1 document (EXPENSE APPROVED) with User A on approval line
        jdbcTemplate.update(
            "INSERT INTO document (id, doc_number, template_code, title, drafter_id, status, created_at, updated_at) " +
            "VALUES (102, 'EXP-2026-0001', 'EXPENSE', '출장 경비 정산', 11, 'APPROVED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)"
        );

        // Approval line: User A is approver for User B's document
        jdbcTemplate.update(
            "INSERT INTO approval_line (id, document_id, approver_id, line_type, step_order, status, created_at) " +
            "VALUES (1, 102, 10, 'APPROVE', 1, 'APPROVED', CURRENT_TIMESTAMP)"
        );
    }

    // --- Keyword search tests ---

    @Test
    void searchByKeyword_matchesTitle() throws Exception {
        mockMvc.perform(get("/api/v1/documents/search")
                .header("Authorization", "Bearer " + userAToken)
                .param("tab", "MY")
                .param("keyword", "프로젝트"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.success").value(true))
            .andExpect(jsonPath("$.data.content", hasSize(1)))
            .andExpect(jsonPath("$.data.content[0].title").value("프로젝트 보고서"));
    }

    @Test
    void searchByKeyword_matchesDrafterName() throws Exception {
        // Admin searches ALL tab for documents by drafter name
        mockMvc.perform(get("/api/v1/documents/search")
                .header("Authorization", "Bearer " + adminToken)
                .param("tab", "ALL")
                .param("keyword", "이영희"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.success").value(true))
            .andExpect(jsonPath("$.data.content", hasSize(1)))
            .andExpect(jsonPath("$.data.content[0].title").value("출장 경비 정산"));
    }

    @Test
    void searchByKeyword_matchesDocNumber() throws Exception {
        mockMvc.perform(get("/api/v1/documents/search")
                .header("Authorization", "Bearer " + adminToken)
                .param("tab", "ALL")
                .param("keyword", "EXP-2026"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.success").value(true))
            .andExpect(jsonPath("$.data.content", hasSize(1)))
            .andExpect(jsonPath("$.data.content[0].docNumber").value("EXP-2026-0001"));
    }

    // --- Tab scoping tests ---

    @Test
    void tabMY_returnsOnlyUserDocuments() throws Exception {
        mockMvc.perform(get("/api/v1/documents/search")
                .header("Authorization", "Bearer " + userAToken)
                .param("tab", "MY"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.success").value(true))
            .andExpect(jsonPath("$.data.content", hasSize(2)))
            .andExpect(jsonPath("$.data.totalElements").value(2));
    }

    @Test
    void tabAPPROVAL_returnsApprovalLineDocuments() throws Exception {
        // User A is on approval line for doc 102 (User B's expense doc)
        mockMvc.perform(get("/api/v1/documents/search")
                .header("Authorization", "Bearer " + userAToken)
                .param("tab", "APPROVAL"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.success").value(true))
            .andExpect(jsonPath("$.data.content", hasSize(1)))
            .andExpect(jsonPath("$.data.content[0].title").value("출장 경비 정산"))
            .andExpect(jsonPath("$.data.content[0].drafterName").value("이영희"));
    }

    @Test
    void tabALL_forbiddenForRegularUser() throws Exception {
        mockMvc.perform(get("/api/v1/documents/search")
                .header("Authorization", "Bearer " + regularUserToken)
                .param("tab", "ALL"))
            .andExpect(status().isForbidden())
            .andExpect(jsonPath("$.error.code").value("AUTH_FORBIDDEN"));
    }

    @Test
    void tabALL_allowedForAdmin() throws Exception {
        mockMvc.perform(get("/api/v1/documents/search")
                .header("Authorization", "Bearer " + adminToken)
                .param("tab", "ALL"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.success").value(true))
            .andExpect(jsonPath("$.data.content", hasSize(3)))
            .andExpect(jsonPath("$.data.totalElements").value(3));
    }

    // --- Filter tests ---

    @Test
    void filterByStatus_returnsMatchingOnly() throws Exception {
        mockMvc.perform(get("/api/v1/documents/search")
                .header("Authorization", "Bearer " + userAToken)
                .param("tab", "MY")
                .param("status", "DRAFT"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.success").value(true))
            .andExpect(jsonPath("$.data.content", hasSize(1)))
            .andExpect(jsonPath("$.data.content[0].status").value("DRAFT"));
    }

    @Test
    void filterByTemplateCode_returnsMatchingOnly() throws Exception {
        mockMvc.perform(get("/api/v1/documents/search")
                .header("Authorization", "Bearer " + adminToken)
                .param("tab", "ALL")
                .param("templateCode", "EXPENSE"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.success").value(true))
            .andExpect(jsonPath("$.data.content", hasSize(1)))
            .andExpect(jsonPath("$.data.content[0].templateCode").value("EXPENSE"));
    }

    @Test
    void filterByDateRange_returnsWithinRange() throws Exception {
        // All documents created today, so a range that includes today should match
        mockMvc.perform(get("/api/v1/documents/search")
                .header("Authorization", "Bearer " + adminToken)
                .param("tab", "ALL")
                .param("startDate", "2026-04-01")
                .param("endDate", "2026-04-30"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.success").value(true))
            .andExpect(jsonPath("$.data.content", hasSize(3)));
    }

    @Test
    void combinedFilters_andLogic() throws Exception {
        // tab=MY + status=SUBMITTED should return only 1 doc for User A
        mockMvc.perform(get("/api/v1/documents/search")
                .header("Authorization", "Bearer " + userAToken)
                .param("tab", "MY")
                .param("keyword", "업무")
                .param("status", "SUBMITTED"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.success").value(true))
            .andExpect(jsonPath("$.data.content", hasSize(1)))
            .andExpect(jsonPath("$.data.content[0].title").value("업무 협조 요청"))
            .andExpect(jsonPath("$.data.content[0].status").value("SUBMITTED"));
    }

    // --- Response structure tests ---

    @Test
    void searchResponse_includesDrafterFields() throws Exception {
        mockMvc.perform(get("/api/v1/documents/search")
                .header("Authorization", "Bearer " + userAToken)
                .param("tab", "MY"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.content[0].drafterName").value("김철수"))
            .andExpect(jsonPath("$.data.content[0].drafterDepartmentName").value("개발부"));
    }

    @Test
    void searchResponse_defaultPagination() throws Exception {
        mockMvc.perform(get("/api/v1/documents/search")
                .header("Authorization", "Bearer " + userAToken)
                .param("tab", "MY"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.pageable").exists())
            .andExpect(jsonPath("$.data.totalElements").isNumber())
            .andExpect(jsonPath("$.data.totalPages").isNumber());
    }
}

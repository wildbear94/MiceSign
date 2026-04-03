package com.micesign.dashboard;

import com.micesign.admin.TestTokenHelper;
import com.micesign.domain.enums.UserRole;
import com.micesign.service.GoogleDriveService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class DashboardControllerTest {

    @Autowired
    MockMvc mockMvc;

    @Autowired
    JdbcTemplate jdbcTemplate;

    @Autowired
    TestTokenHelper tokenHelper;

    @MockitoBean
    GoogleDriveService googleDriveService;

    private Long testUserId;
    private String testUserToken;
    private Long approverUserId;
    private String approverToken;

    @BeforeEach
    void setUp() {
        // Clean up test data
        jdbcTemplate.update("DELETE FROM approval_line");
        jdbcTemplate.update("DELETE FROM document_attachment");
        jdbcTemplate.update("DELETE FROM document_content");
        jdbcTemplate.update("DELETE FROM document");
        jdbcTemplate.update("DELETE FROM doc_sequence");
        jdbcTemplate.update("DELETE FROM \"user\" WHERE email IN ('dash-drafter@micesign.com', 'dash-approver@micesign.com')");

        // Create test drafter user
        jdbcTemplate.update(
            "INSERT INTO \"user\" (employee_no, name, email, password, department_id, position_id, role, status) " +
            "VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            "DASH001", "대시보드기안자", "dash-drafter@micesign.com",
            "$2a$10$07mcjXBfvelJFwjs8DnoJOnEqprFy.dnQL1NdnRvlqEWwwmX62SOW",
            2, 3, "USER", "ACTIVE"
        );
        testUserId = jdbcTemplate.queryForObject(
            "SELECT id FROM \"user\" WHERE email = 'dash-drafter@micesign.com'", Long.class);
        testUserToken = tokenHelper.tokenForRole(testUserId, "dash-drafter@micesign.com", "대시보드기안자", UserRole.USER, 2L);

        // Create test approver user
        jdbcTemplate.update(
            "INSERT INTO \"user\" (employee_no, name, email, password, department_id, position_id, role, status) " +
            "VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            "DASH002", "대시보드결재자", "dash-approver@micesign.com",
            "$2a$10$07mcjXBfvelJFwjs8DnoJOnEqprFy.dnQL1NdnRvlqEWwwmX62SOW",
            2, 3, "USER", "ACTIVE"
        );
        approverUserId = jdbcTemplate.queryForObject(
            "SELECT id FROM \"user\" WHERE email = 'dash-approver@micesign.com'", Long.class);
        approverToken = tokenHelper.tokenForRole(approverUserId, "dash-approver@micesign.com", "대시보드결재자", UserRole.USER, 2L);

        // Create test documents:
        // 1) DRAFT document (drafter = testUser)
        jdbcTemplate.update(
            "INSERT INTO document (template_code, title, drafter_id, status, created_at, updated_at) " +
            "VALUES (?, ?, ?, ?, NOW(), NOW())",
            "GENERAL", "임시저장 문서", testUserId, "DRAFT"
        );
        Long draftDocId = jdbcTemplate.queryForObject(
            "SELECT id FROM document WHERE title = '임시저장 문서'", Long.class);

        // 2) SUBMITTED document with approval line pointing to approverUser (current step = 1)
        jdbcTemplate.update(
            "INSERT INTO document (template_code, title, drafter_id, status, doc_number, submitted_at, current_step, created_at, updated_at) " +
            "VALUES (?, ?, ?, ?, ?, NOW(), ?, NOW(), NOW())",
            "GENERAL", "제출 문서", testUserId, "SUBMITTED", "GEN-2026-0001", 1
        );
        Long submittedDocId = jdbcTemplate.queryForObject(
            "SELECT id FROM document WHERE title = '제출 문서'", Long.class);

        // Approval line: approverUser at step 1, PENDING, APPROVE type
        jdbcTemplate.update(
            "INSERT INTO approval_line (document_id, approver_id, line_type, step_order, status, created_at) " +
            "VALUES (?, ?, ?, ?, ?, NOW())",
            submittedDocId, approverUserId, "APPROVE", 1, "PENDING"
        );

        // 3) APPROVED document (drafter = testUser)
        jdbcTemplate.update(
            "INSERT INTO document (template_code, title, drafter_id, status, doc_number, submitted_at, completed_at, created_at, updated_at) " +
            "VALUES (?, ?, ?, ?, ?, NOW(), NOW(), NOW(), NOW())",
            "GENERAL", "완료 문서", testUserId, "APPROVED", "GEN-2026-0002"
        );
    }

    @Test
    void getSummary_returnsCorrectCounts_forDrafter() throws Exception {
        // testUser has: 1 DRAFT, 0 pending (no approval lines for them), 1 APPROVED
        mockMvc.perform(get("/api/v1/dashboard/summary")
                        .header("Authorization", "Bearer " + testUserToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.draftCount").value(1))
                .andExpect(jsonPath("$.data.pendingCount").value(0))
                .andExpect(jsonPath("$.data.completedCount").value(1));
    }

    @Test
    void getSummary_returnsCorrectPendingCount_forApprover() throws Exception {
        // approverUser has: 0 DRAFT, 1 pending approval line, 0 APPROVED
        mockMvc.perform(get("/api/v1/dashboard/summary")
                        .header("Authorization", "Bearer " + approverToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.pendingCount").value(1))
                .andExpect(jsonPath("$.data.draftCount").value(0))
                .andExpect(jsonPath("$.data.completedCount").value(0));
    }

    @Test
    void getSummary_returns401_forUnauthenticated() throws Exception {
        mockMvc.perform(get("/api/v1/dashboard/summary"))
                .andExpect(status().isUnauthorized());
    }
}

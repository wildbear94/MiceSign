package com.micesign.admin;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.micesign.common.AuditAction;
import com.micesign.dto.department.CreateDepartmentRequest;
import com.micesign.dto.user.CreateUserRequest;
import com.micesign.dto.user.UpdateUserRequest;
import com.micesign.domain.enums.UserRole;
import com.micesign.domain.enums.UserStatus;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Integration tests verifying that admin operations produce audit log entries.
 * Covers the AUD-01 requirement gap: admin services must log all mutation operations.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class AuditLogGapTest {

    @Autowired MockMvc mockMvc;
    @Autowired ObjectMapper objectMapper;
    @Autowired JdbcTemplate jdbcTemplate;
    @Autowired TestTokenHelper tokenHelper;

    private String superAdminToken;

    @BeforeEach
    void setUp() {
        // Clean audit_log and test data before each test
        jdbcTemplate.update("DELETE FROM audit_log");
        jdbcTemplate.update("DELETE FROM \"user\" WHERE employee_no LIKE 'AUDIT_TEST%'");
        jdbcTemplate.update("DELETE FROM department WHERE name LIKE 'AuditTest%'");
        superAdminToken = tokenHelper.superAdminToken();
    }

    @AfterEach
    void tearDown() {
        // Clean up test data to avoid polluting other tests
        jdbcTemplate.update("DELETE FROM audit_log");
        jdbcTemplate.update("DELETE FROM \"user\" WHERE employee_no LIKE 'AUDIT_TEST%'");
        jdbcTemplate.update("DELETE FROM department WHERE name LIKE 'AuditTest%'");
    }

    @Test
    void createDepartment_producesAuditLog() throws Exception {
        CreateDepartmentRequest request = new CreateDepartmentRequest("AuditTestDept", 1L, 99);

        mockMvc.perform(post("/api/v1/admin/departments")
                .header("Authorization", "Bearer " + superAdminToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
            .andExpect(status().isCreated());

        // Verify audit log entry was created
        Integer count = jdbcTemplate.queryForObject(
            "SELECT COUNT(*) FROM audit_log WHERE action = ? AND target_type = ?",
            Integer.class, AuditAction.ADMIN_ORG_EDIT, "DEPARTMENT");
        assertThat(count).isGreaterThanOrEqualTo(1);

        // Verify detail contains action=create
        String detail = jdbcTemplate.queryForObject(
            "SELECT detail FROM audit_log WHERE action = ? AND target_type = ? ORDER BY id DESC LIMIT 1",
            String.class, AuditAction.ADMIN_ORG_EDIT, "DEPARTMENT");
        assertThat(detail).contains("create");
    }

    @Test
    void createUser_producesAuditLog() throws Exception {
        CreateUserRequest request = new CreateUserRequest(
            "AUDIT_TEST_001", "AuditTestUser", "audittest@micesign.com",
            1L, 1L, UserRole.USER, "010-0000-0000", "TestPass1!");

        mockMvc.perform(post("/api/v1/admin/users")
                .header("Authorization", "Bearer " + superAdminToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
            .andExpect(status().isCreated());

        Integer count = jdbcTemplate.queryForObject(
            "SELECT COUNT(*) FROM audit_log WHERE action = ? AND target_type = ?",
            Integer.class, AuditAction.ADMIN_USER_EDIT, "USER");
        assertThat(count).isGreaterThanOrEqualTo(1);

        String detail = jdbcTemplate.queryForObject(
            "SELECT detail FROM audit_log WHERE action = ? AND target_type = ? ORDER BY id DESC LIMIT 1",
            String.class, AuditAction.ADMIN_USER_EDIT, "USER");
        assertThat(detail).contains("create");
        assertThat(detail).contains("audittest@micesign.com");
    }

    @Test
    void updateUser_producesAuditLog() throws Exception {
        // First create a user to update
        CreateUserRequest createReq = new CreateUserRequest(
            "AUDIT_TEST_002", "UpdateTarget", "updatetarget@micesign.com",
            1L, 1L, UserRole.USER, "010-0000-0001", "TestPass1!");

        String createResponse = mockMvc.perform(post("/api/v1/admin/users")
                .header("Authorization", "Bearer " + superAdminToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(createReq)))
            .andExpect(status().isCreated())
            .andReturn().getResponse().getContentAsString();

        // Extract user ID from response
        Long userId = objectMapper.readTree(createResponse).path("data").path("id").asLong();

        // Clear audit log to isolate update action
        jdbcTemplate.update("DELETE FROM audit_log");

        UpdateUserRequest updateReq = new UpdateUserRequest(
            "UpdatedName", "updatetarget@micesign.com",
            1L, 1L, UserRole.USER, UserStatus.ACTIVE, "010-0000-0002");

        mockMvc.perform(put("/api/v1/admin/users/" + userId)
                .header("Authorization", "Bearer " + superAdminToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(updateReq)))
            .andExpect(status().isOk());

        Integer count = jdbcTemplate.queryForObject(
            "SELECT COUNT(*) FROM audit_log WHERE action = ? AND target_type = ?",
            Integer.class, AuditAction.ADMIN_USER_EDIT, "USER");
        assertThat(count).isGreaterThanOrEqualTo(1);

        String detail = jdbcTemplate.queryForObject(
            "SELECT detail FROM audit_log WHERE action = ? AND target_type = ? ORDER BY id DESC LIMIT 1",
            String.class, AuditAction.ADMIN_USER_EDIT, "USER");
        assertThat(detail).contains("update");
    }
}

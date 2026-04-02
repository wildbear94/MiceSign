package com.micesign.admin;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.micesign.domain.enums.UserRole;
import com.micesign.domain.enums.UserStatus;
import com.micesign.dto.user.CreateUserRequest;
import com.micesign.dto.user.UpdateUserRequest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class RbacEnforcementTest {

    @Autowired MockMvc mockMvc;
    @Autowired ObjectMapper objectMapper;
    @Autowired JdbcTemplate jdbcTemplate;
    @Autowired TestTokenHelper tokenHelper;

    private String superAdminToken;
    private String adminToken;
    private String userToken;

    @BeforeEach
    void setUp() {
        jdbcTemplate.update("DELETE FROM refresh_token");
        jdbcTemplate.update("DELETE FROM \"user\" WHERE employee_no LIKE 'TEST%'");
        superAdminToken = tokenHelper.superAdminToken();
        adminToken = tokenHelper.adminToken();
        userToken = tokenHelper.userToken();
    }

    @Test
    void adminCannotCreateAdminRoleUser() throws Exception {
        // Need to create real ADMIN user in DB so the token corresponds to a real user
        jdbcTemplate.update(
            "INSERT INTO \"user\" (id, employee_no, name, email, password, department_id, position_id, role, status, failed_login_count, must_change_password) " +
            "VALUES (100, 'TESTADM01', '테스트관리자', 'testadmin@micesign.com', '$2a$10$dummy', 1, 1, 'ADMIN', 'ACTIVE', 0, FALSE)");

        CreateUserRequest request = new CreateUserRequest(
            "TEST010", "신규관리자", "test010@micesign.com",
            1L, 1L, UserRole.ADMIN, null, "password123!"
        );

        mockMvc.perform(post("/api/v1/admin/users")
                .header("Authorization", "Bearer " + adminToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.error.code").value("AUTH_FORBIDDEN"));
    }

    @Test
    void adminCannotPromoteToAdmin() throws Exception {
        // Create ADMIN user and a regular user
        jdbcTemplate.update(
            "INSERT INTO \"user\" (id, employee_no, name, email, password, department_id, position_id, role, status, failed_login_count, must_change_password) " +
            "VALUES (100, 'TESTADM01', '테스트관리자', 'testadmin@micesign.com', '$2a$10$dummy', 1, 1, 'ADMIN', 'ACTIVE', 0, FALSE)");
        jdbcTemplate.update(
            "INSERT INTO \"user\" (id, employee_no, name, email, password, department_id, position_id, role, status, failed_login_count, must_change_password) " +
            "VALUES (101, 'TESTUSR01', '일반사용자', 'testuser01@micesign.com', '$2a$10$dummy', 1, 1, 'USER', 'ACTIVE', 0, FALSE)");

        UpdateUserRequest request = new UpdateUserRequest(
            "일반사용자", "testuser01@micesign.com", 1L, 1L, UserRole.ADMIN, UserStatus.ACTIVE, null
        );

        mockMvc.perform(put("/api/v1/admin/users/101")
                .header("Authorization", "Bearer " + adminToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.error.code").value("AUTH_FORBIDDEN"));
    }

    @Test
    void userRoleBlocked_returns403() throws Exception {
        mockMvc.perform(get("/api/v1/admin/departments")
                .header("Authorization", "Bearer " + userToken))
            .andExpect(status().isForbidden());
    }

    @Test
    void selfDeactivation_blocked() throws Exception {
        // Create ADMIN user (id=100) and try to deactivate self
        jdbcTemplate.update(
            "INSERT INTO \"user\" (id, employee_no, name, email, password, department_id, position_id, role, status, failed_login_count, must_change_password) " +
            "VALUES (100, 'TESTADM01', '테스트관리자', 'testadmin@micesign.com', '$2a$10$dummy', 1, 1, 'ADMIN', 'ACTIVE', 0, FALSE)");

        mockMvc.perform(patch("/api/v1/admin/users/100/deactivate")
                .header("Authorization", "Bearer " + adminToken))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.error.code").value("ORG_SELF_DEACTIVATION"));
    }

    @Test
    void superAdminCanCreateAdminRoleUser() throws Exception {
        CreateUserRequest request = new CreateUserRequest(
            "TEST020", "신규관리자", "test020@micesign.com",
            1L, 1L, UserRole.ADMIN, null, "password123!"
        );

        mockMvc.perform(post("/api/v1/admin/users")
                .header("Authorization", "Bearer " + superAdminToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.success").value(true))
            .andExpect(jsonPath("$.data.role").value("ADMIN"));
    }
}

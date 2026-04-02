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
class UserManagementControllerTest {

    @Autowired MockMvc mockMvc;
    @Autowired ObjectMapper objectMapper;
    @Autowired JdbcTemplate jdbcTemplate;
    @Autowired TestTokenHelper tokenHelper;

    private String superAdminToken;

    @BeforeEach
    void setUp() {
        jdbcTemplate.update("DELETE FROM refresh_token");
        jdbcTemplate.update("DELETE FROM \"user\" WHERE employee_no LIKE 'TEST%'");
        superAdminToken = tokenHelper.superAdminToken();
    }

    @Test
    void createUser_returns201_withMustChangePassword() throws Exception {
        CreateUserRequest request = new CreateUserRequest(
            "TEST001", "테스트사용자", "test001@micesign.com",
            1L, 1L, UserRole.USER, "010-1234-5678", "password123!"
        );

        mockMvc.perform(post("/api/v1/admin/users")
                .header("Authorization", "Bearer " + superAdminToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.success").value(true))
            .andExpect(jsonPath("$.data.employeeNo").value("TEST001"))
            .andExpect(jsonPath("$.data.mustChangePassword").value(true));
    }

    @Test
    void getUserList_paginatedWithFilters() throws Exception {
        mockMvc.perform(get("/api/v1/admin/users")
                .header("Authorization", "Bearer " + superAdminToken)
                .param("keyword", "시스템")
                .param("page", "0")
                .param("size", "10"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.success").value(true))
            .andExpect(jsonPath("$.data.content").isArray())
            .andExpect(jsonPath("$.data.content[0].name").value("시스템관리자"));
    }

    @Test
    void getUserDetail_returnsFullProfile() throws Exception {
        mockMvc.perform(get("/api/v1/admin/users/1")
                .header("Authorization", "Bearer " + superAdminToken))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.success").value(true))
            .andExpect(jsonPath("$.data.employeeNo").value("ADMIN001"))
            .andExpect(jsonPath("$.data.departmentName").exists())
            .andExpect(jsonPath("$.data.positionName").exists());
    }

    @Test
    void updateUser_savesChanges() throws Exception {
        // Create a test user first
        jdbcTemplate.update(
            "INSERT INTO \"user\" (employee_no, name, email, password, department_id, position_id, role, status, failed_login_count, must_change_password) " +
            "VALUES ('TEST002', '수정대상', 'test002@micesign.com', '$2a$10$dummy', 1, 1, 'USER', 'ACTIVE', 0, FALSE)");
        Long userId = jdbcTemplate.queryForObject(
            "SELECT id FROM \"user\" WHERE employee_no = 'TEST002'", Long.class);

        UpdateUserRequest request = new UpdateUserRequest(
            "수정완료", "test002@micesign.com", 2L, 2L, UserRole.USER, UserStatus.ACTIVE, "010-9999-9999"
        );

        mockMvc.perform(put("/api/v1/admin/users/" + userId)
                .header("Authorization", "Bearer " + superAdminToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.name").value("수정완료"))
            .andExpect(jsonPath("$.data.phone").value("010-9999-9999"));
    }

    @Test
    void deactivateUser_setsInactive() throws Exception {
        // Create a test user
        jdbcTemplate.update(
            "INSERT INTO \"user\" (employee_no, name, email, password, department_id, position_id, role, status, failed_login_count, must_change_password) " +
            "VALUES ('TEST003', '비활성대상', 'test003@micesign.com', '$2a$10$dummy', 1, 1, 'USER', 'ACTIVE', 0, FALSE)");
        Long userId = jdbcTemplate.queryForObject(
            "SELECT id FROM \"user\" WHERE employee_no = 'TEST003'", Long.class);

        mockMvc.perform(patch("/api/v1/admin/users/" + userId + "/deactivate")
                .header("Authorization", "Bearer " + superAdminToken))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.success").value(true));

        // Verify status changed
        String status = jdbcTemplate.queryForObject(
            "SELECT status FROM \"user\" WHERE id = ?", String.class, userId);
        org.assertj.core.api.Assertions.assertThat(status).isEqualTo("INACTIVE");
    }
}

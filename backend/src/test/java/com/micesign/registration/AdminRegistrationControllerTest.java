package com.micesign.registration;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.micesign.admin.TestTokenHelper;
import com.micesign.dto.registration.ApproveRegistrationRequest;
import com.micesign.dto.registration.RejectRegistrationRequest;
import com.micesign.dto.registration.RegistrationSubmitRequest;
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
class AdminRegistrationControllerTest {

    @Autowired MockMvc mockMvc;
    @Autowired ObjectMapper objectMapper;
    @Autowired JdbcTemplate jdbcTemplate;
    @Autowired TestTokenHelper tokenHelper;

    private String superAdminToken;

    @BeforeEach
    void setUp() {
        jdbcTemplate.update("DELETE FROM registration_request");
        jdbcTemplate.update("DELETE FROM \"user\" WHERE employee_no LIKE 'REG%'");
        superAdminToken = tokenHelper.superAdminToken();
    }

    @Test
    void getRegistrations_returnsPaginatedList() throws Exception {
        // Insert a test registration request
        jdbcTemplate.update(
            "INSERT INTO registration_request (name, email, password_hash, tracking_token, status, created_at, updated_at) " +
            "VALUES ('테스트', 'regtest@example.com', '$2a$10$hash', 'test-token-1', 'PENDING', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)");

        mockMvc.perform(get("/api/v1/admin/registrations")
                .header("Authorization", "Bearer " + superAdminToken))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.success").value(true))
            .andExpect(jsonPath("$.data.content").isArray())
            .andExpect(jsonPath("$.data.content[0].email").value("regtest@example.com"));
    }

    @Test
    void approveRegistration_returns200() throws Exception {
        // Insert a PENDING registration request
        jdbcTemplate.update(
            "INSERT INTO registration_request (name, email, password_hash, tracking_token, status, created_at, updated_at) " +
            "VALUES ('승인대상', 'approve@example.com', '$2a$10$dummyhashvalue123456789012345678901234567890', 'test-token-2', 'PENDING', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)");
        Long regId = jdbcTemplate.queryForObject(
            "SELECT id FROM registration_request WHERE email = 'approve@example.com'", Long.class);

        ApproveRegistrationRequest request = new ApproveRegistrationRequest("REG001", 1L, 1L);

        mockMvc.perform(post("/api/v1/admin/registrations/" + regId + "/approve")
                .header("Authorization", "Bearer " + superAdminToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.success").value(true));

        // Verify user was created
        String email = jdbcTemplate.queryForObject(
            "SELECT email FROM \"user\" WHERE employee_no = 'REG001'", String.class);
        org.assertj.core.api.Assertions.assertThat(email).isEqualTo("approve@example.com");
    }

    @Test
    void rejectRegistration_returns200() throws Exception {
        // Insert a PENDING registration request
        jdbcTemplate.update(
            "INSERT INTO registration_request (name, email, password_hash, tracking_token, status, created_at, updated_at) " +
            "VALUES ('거부대상', 'reject@example.com', '$2a$10$hash', 'test-token-3', 'PENDING', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)");
        Long regId = jdbcTemplate.queryForObject(
            "SELECT id FROM registration_request WHERE email = 'reject@example.com'", Long.class);

        RejectRegistrationRequest request = new RejectRegistrationRequest("소속 확인 불가");

        mockMvc.perform(post("/api/v1/admin/registrations/" + regId + "/reject")
                .header("Authorization", "Bearer " + superAdminToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.success").value(true));

        // Verify status changed to REJECTED
        String status = jdbcTemplate.queryForObject(
            "SELECT status FROM registration_request WHERE id = ?", String.class, regId);
        org.assertj.core.api.Assertions.assertThat(status).isEqualTo("REJECTED");
    }
}

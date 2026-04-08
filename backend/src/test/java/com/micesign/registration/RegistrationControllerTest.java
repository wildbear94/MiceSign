package com.micesign.registration;

import com.fasterxml.jackson.databind.ObjectMapper;
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
class RegistrationControllerTest {

    @Autowired MockMvc mockMvc;
    @Autowired ObjectMapper objectMapper;
    @Autowired JdbcTemplate jdbcTemplate;

    @BeforeEach
    void setUp() {
        jdbcTemplate.update("DELETE FROM registration_request");
    }

    @Test
    void submitRegistration_returns201() throws Exception {
        RegistrationSubmitRequest request = new RegistrationSubmitRequest(
                "테스트사용자", "newuser@example.com", "Password123!");

        mockMvc.perform(post("/api/v1/registration")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.email").value("newuser@example.com"))
                .andExpect(jsonPath("$.data.status").value("PENDING"));
    }

    @Test
    void submitRegistration_invalidEmail_returns400() throws Exception {
        RegistrationSubmitRequest request = new RegistrationSubmitRequest(
                "테스트", "not-an-email", "Password123!");

        mockMvc.perform(post("/api/v1/registration")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest());
    }

    @Test
    void getStatus_returnsResult() throws Exception {
        // First submit a registration
        RegistrationSubmitRequest request = new RegistrationSubmitRequest(
                "상태조회", "statuscheck@example.com", "Password123!");

        mockMvc.perform(post("/api/v1/registration")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated());

        // Then check status
        mockMvc.perform(get("/api/v1/registration/status")
                        .param("email", "statuscheck@example.com"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.email").value("statuscheck@example.com"))
                .andExpect(jsonPath("$.data.status").value("PENDING"));
    }
}

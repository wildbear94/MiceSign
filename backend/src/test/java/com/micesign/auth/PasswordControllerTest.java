package com.micesign.auth;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.micesign.dto.auth.LoginRequest;
import com.micesign.dto.auth.PasswordChangeRequest;
import com.micesign.repository.RefreshTokenRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class PasswordControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private RefreshTokenRepository refreshTokenRepository;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Autowired
    private PasswordEncoder passwordEncoder;

    private static final String ADMIN_EMAIL = "admin@micesign.com";
    private static final String ADMIN_PASSWORD = "admin1234!";

    @BeforeEach
    void resetState() {
        // Reset admin password and state to ensure test isolation
        jdbcTemplate.update(
                "UPDATE \"user\" SET password = ?, failed_login_count = 0, locked_until = NULL, must_change_password = FALSE WHERE email = ?",
                passwordEncoder.encode(ADMIN_PASSWORD), ADMIN_EMAIL);
        jdbcTemplate.update("DELETE FROM refresh_token");
    }

    @Test
    void changeSuccess() throws Exception {
        // 1. Login to get access token and refresh token cookie
        LoginRequest loginReq = new LoginRequest(ADMIN_EMAIL, ADMIN_PASSWORD, true);
        MvcResult loginResult = mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(loginReq)))
                .andExpect(status().isOk())
                .andReturn();

        String accessToken = objectMapper.readTree(loginResult.getResponse().getContentAsString())
                .path("data").path("accessToken").asText();
        String setCookie = loginResult.getResponse().getHeader("Set-Cookie");
        String refreshToken = extractCookieValue(setCookie, "refreshToken");

        // 2. Change password
        PasswordChangeRequest changeReq = new PasswordChangeRequest(
                ADMIN_PASSWORD, "NewSecurePass123!", "NewSecurePass123!");

        mockMvc.perform(put("/api/v1/auth/password")
                        .header("Authorization", "Bearer " + accessToken)
                        .cookie(new jakarta.servlet.http.Cookie("refreshToken", refreshToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(changeReq)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }

    @Test
    void changeInvalidatesOthers() throws Exception {
        // 1. Login session 1
        LoginRequest loginReq = new LoginRequest(ADMIN_EMAIL, ADMIN_PASSWORD, true);
        MvcResult session1 = mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(loginReq)))
                .andExpect(status().isOk())
                .andReturn();

        String accessToken1 = objectMapper.readTree(session1.getResponse().getContentAsString())
                .path("data").path("accessToken").asText();
        String cookie1 = session1.getResponse().getHeader("Set-Cookie");
        String refreshToken1 = extractCookieValue(cookie1, "refreshToken");

        // 2. Login session 2
        MvcResult session2 = mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(loginReq)))
                .andExpect(status().isOk())
                .andReturn();

        String cookie2 = session2.getResponse().getHeader("Set-Cookie");
        String refreshToken2 = extractCookieValue(cookie2, "refreshToken");

        // Count tokens before password change
        Long userId = objectMapper.readTree(session1.getResponse().getContentAsString())
                .path("data").path("user").path("id").asLong();
        int tokensBefore = refreshTokenRepository.findAllByUserId(userId).size();
        assertThat(tokensBefore).isGreaterThanOrEqualTo(2);

        // 3. Change password from session 1
        PasswordChangeRequest changeReq = new PasswordChangeRequest(
                ADMIN_PASSWORD, "TempPass999!", "TempPass999!");
        mockMvc.perform(put("/api/v1/auth/password")
                        .header("Authorization", "Bearer " + accessToken1)
                        .cookie(new jakarta.servlet.http.Cookie("refreshToken", refreshToken1))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(changeReq)))
                .andExpect(status().isOk());

        // 4. Session 2's refresh token should be invalidated
        mockMvc.perform(post("/api/v1/auth/refresh")
                        .cookie(new jakarta.servlet.http.Cookie("refreshToken", refreshToken2)))
                .andExpect(status().isUnauthorized());

        // 5. Session 1's refresh token should still work
        mockMvc.perform(post("/api/v1/auth/refresh")
                        .cookie(new jakarta.servlet.http.Cookie("refreshToken", refreshToken1)))
                .andExpect(status().isOk());
    }

    private String extractCookieValue(String setCookieHeader, String cookieName) {
        if (setCookieHeader == null) return null;
        for (String part : setCookieHeader.split(";")) {
            String trimmed = part.trim();
            if (trimmed.startsWith(cookieName + "=")) {
                return trimmed.substring(cookieName.length() + 1);
            }
        }
        return null;
    }
}

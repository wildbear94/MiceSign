package com.micesign.auth;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.micesign.dto.auth.LoginRequest;
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

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class AuthControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Autowired
    private PasswordEncoder passwordEncoder;

    // Seeded SUPER_ADMIN credentials from V2__seed_initial_data.sql
    private static final String ADMIN_EMAIL = "admin@micesign.com";
    private static final String ADMIN_PASSWORD = "admin1234!";

    @BeforeEach
    void resetAdminState() {
        // Reset failed login count and lockout for the seeded admin to ensure test isolation
        jdbcTemplate.update(
                "UPDATE \"user\" SET failed_login_count = 0, locked_until = NULL WHERE email = ?",
                ADMIN_EMAIL);
        // Clean up any refresh tokens to start fresh
        jdbcTemplate.update("DELETE FROM refresh_token");
    }

    @Test
    void loginSuccess() throws Exception {
        LoginRequest request = new LoginRequest(ADMIN_EMAIL, ADMIN_PASSWORD, false);

        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.accessToken").exists())
                .andExpect(jsonPath("$.data.user.email").value(ADMIN_EMAIL))
                .andExpect(header().exists("Set-Cookie"));
    }

    @Test
    void loginInvalidCredentials() throws Exception {
        LoginRequest request = new LoginRequest(ADMIN_EMAIL, "wrongpassword", false);

        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.data.code").value("AUTH_INVALID_CREDENTIALS"));
    }

    @Test
    void refreshSuccess() throws Exception {
        // 1. Login to get refresh token cookie
        LoginRequest request = new LoginRequest(ADMIN_EMAIL, ADMIN_PASSWORD, true);
        MvcResult loginResult = mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andReturn();

        // Extract refresh token from Set-Cookie header
        String setCookie = loginResult.getResponse().getHeader("Set-Cookie");
        String refreshToken = extractCookieValue(setCookie, "refreshToken");

        // 2. Use refresh token to get new access token
        mockMvc.perform(post("/api/v1/auth/refresh")
                        .cookie(new jakarta.servlet.http.Cookie("refreshToken", refreshToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.accessToken").exists())
                .andExpect(jsonPath("$.data.user.email").value(ADMIN_EMAIL));
    }

    @Test
    void refreshTokenReuse() throws Exception {
        // 1. Login
        LoginRequest request = new LoginRequest(ADMIN_EMAIL, ADMIN_PASSWORD, true);
        MvcResult loginResult = mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andReturn();

        String setCookie = loginResult.getResponse().getHeader("Set-Cookie");
        String oldRefreshToken = extractCookieValue(setCookie, "refreshToken");

        // 2. First refresh (rotates token -- old one is deleted)
        mockMvc.perform(post("/api/v1/auth/refresh")
                        .cookie(new jakarta.servlet.http.Cookie("refreshToken", oldRefreshToken)))
                .andExpect(status().isOk());

        // 3. Reuse old token -- should fail (token no longer exists)
        mockMvc.perform(post("/api/v1/auth/refresh")
                        .cookie(new jakarta.servlet.http.Cookie("refreshToken", oldRefreshToken)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.data.code").value("AUTH_TOKEN_INVALID"));
    }

    @Test
    void logoutSuccess() throws Exception {
        // 1. Login
        LoginRequest request = new LoginRequest(ADMIN_EMAIL, ADMIN_PASSWORD, true);
        MvcResult loginResult = mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andReturn();

        String setCookie = loginResult.getResponse().getHeader("Set-Cookie");
        String refreshToken = extractCookieValue(setCookie, "refreshToken");
        String accessToken = objectMapper.readTree(loginResult.getResponse().getContentAsString())
                .path("data").path("accessToken").asText();

        // 2. Logout
        MvcResult logoutResult = mockMvc.perform(post("/api/v1/auth/logout")
                        .header("Authorization", "Bearer " + accessToken)
                        .cookie(new jakarta.servlet.http.Cookie("refreshToken", refreshToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andReturn();

        // 3. Verify cookie is cleared (Max-Age=0)
        String logoutCookie = logoutResult.getResponse().getHeader("Set-Cookie");
        org.assertj.core.api.Assertions.assertThat(logoutCookie).contains("Max-Age=0");
    }

    @Test
    void accountLockout() throws Exception {
        // Create a dedicated user for lockout testing to avoid corrupting shared state
        String lockoutEmail = "lockout-test@micesign.com";
        String lockoutPassword = "LockoutTest123!";

        // Insert user if not exists
        Integer count = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM \"user\" WHERE email = ?", Integer.class, lockoutEmail);
        if (count == null || count == 0) {
            jdbcTemplate.update(
                    "INSERT INTO \"user\" (employee_no, name, email, password, department_id, position_id, role, status, failed_login_count, must_change_password) " +
                            "VALUES (?, ?, ?, ?, 1, 1, 'USER', 'ACTIVE', 0, FALSE)",
                    "LOCKTEST01", "Lockout Tester", lockoutEmail, passwordEncoder.encode(lockoutPassword));
        } else {
            jdbcTemplate.update(
                    "UPDATE \"user\" SET failed_login_count = 0, locked_until = NULL WHERE email = ?",
                    lockoutEmail);
        }

        // Send 5 failed logins with wrong password
        LoginRequest badRequest = new LoginRequest(lockoutEmail, "wrong-password-lockout!", false);
        for (int i = 0; i < 5; i++) {
            mockMvc.perform(post("/api/v1/auth/login")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(badRequest)))
                    .andExpect(status().isUnauthorized());
        }

        // 6th attempt -- should return AUTH_ACCOUNT_LOCKED
        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(badRequest)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.data.code").value("AUTH_ACCOUNT_LOCKED"))
                .andExpect(jsonPath("$.data.lockedUntil").exists());
    }

    // ---- Helper ----

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

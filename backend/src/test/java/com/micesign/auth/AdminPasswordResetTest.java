package com.micesign.auth;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.micesign.domain.User;
import com.micesign.domain.enums.UserRole;
import com.micesign.domain.enums.UserStatus;
import com.micesign.dto.auth.AdminPasswordResetRequest;
import com.micesign.dto.auth.LoginRequest;
import com.micesign.repository.UserRepository;
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
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class AdminPasswordResetTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    private static final String SUPER_ADMIN_EMAIL = "admin@micesign.com";
    private static final String SUPER_ADMIN_PASSWORD = "admin1234!";

    private Long targetUserId;
    private Long adminUserId;

    @BeforeEach
    void setUp() {
        // Reset admin state and clean refresh tokens
        jdbcTemplate.update(
                "UPDATE \"user\" SET password = ?, failed_login_count = 0, locked_until = NULL WHERE email = ?",
                passwordEncoder.encode(SUPER_ADMIN_PASSWORD), SUPER_ADMIN_EMAIL);
        jdbcTemplate.update("DELETE FROM refresh_token");
        // Create a regular USER as reset target (if not already existing)
        if (userRepository.findByEmail("target-user@micesign.com").isEmpty()) {
            User target = new User();
            target.setEmployeeNo("EMP_TARGET001");
            target.setName("Target User");
            target.setEmail("target-user@micesign.com");
            target.setPassword(passwordEncoder.encode("OldPass123!"));
            target.setDepartmentId(1L);
            target.setPositionId(1L);
            target.setRole(UserRole.USER);
            target.setStatus(UserStatus.ACTIVE);
            target.setMustChangePassword(false);
            userRepository.save(target);
        }
        targetUserId = userRepository.findByEmail("target-user@micesign.com").orElseThrow().getId();

        // Create an ADMIN user (not SUPER_ADMIN) for role hierarchy test
        if (userRepository.findByEmail("admin-role@micesign.com").isEmpty()) {
            User admin = new User();
            admin.setEmployeeNo("EMP_ADMIN001");
            admin.setName("Admin User");
            admin.setEmail("admin-role@micesign.com");
            admin.setPassword(passwordEncoder.encode("AdminPass123!"));
            admin.setDepartmentId(1L);
            admin.setPositionId(1L);
            admin.setRole(UserRole.ADMIN);
            admin.setStatus(UserStatus.ACTIVE);
            admin.setMustChangePassword(false);
            userRepository.save(admin);
        }
        adminUserId = userRepository.findByEmail("admin-role@micesign.com").orElseThrow().getId();
    }

    @Test
    void resetSuccess() throws Exception {
        // 1. Login as SUPER_ADMIN
        LoginRequest loginReq = new LoginRequest(SUPER_ADMIN_EMAIL, SUPER_ADMIN_PASSWORD, false);
        MvcResult loginResult = mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(loginReq)))
                .andExpect(status().isOk())
                .andReturn();

        String accessToken = objectMapper.readTree(loginResult.getResponse().getContentAsString())
                .path("data").path("accessToken").asText();

        // 2. Reset target user's password
        AdminPasswordResetRequest resetReq = new AdminPasswordResetRequest("TempNewPass99!");
        mockMvc.perform(post("/api/v1/admin/users/" + targetUserId + "/reset-password")
                        .header("Authorization", "Bearer " + accessToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(resetReq)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));

        // 3. Verify target user now has mustChangePassword=true
        User target = userRepository.findById(targetUserId).orElseThrow();
        assertThat(target.isMustChangePassword()).isTrue();

        // 4. Verify target can login with new password
        LoginRequest targetLogin = new LoginRequest("target-user@micesign.com", "TempNewPass99!", false);
        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(targetLogin)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.user.mustChangePassword").value(true));
    }

    @Test
    void adminCannotResetSuperAdmin() throws Exception {
        // 1. Login as ADMIN (not SUPER_ADMIN)
        LoginRequest loginReq = new LoginRequest("admin-role@micesign.com", "AdminPass123!", false);
        MvcResult loginResult = mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(loginReq)))
                .andExpect(status().isOk())
                .andReturn();

        String accessToken = objectMapper.readTree(loginResult.getResponse().getContentAsString())
                .path("data").path("accessToken").asText();

        // 2. Try to reset SUPER_ADMIN password — should be forbidden
        Long superAdminId = userRepository.findByEmail(SUPER_ADMIN_EMAIL).orElseThrow().getId();
        AdminPasswordResetRequest resetReq = new AdminPasswordResetRequest("HackAttempt123!");

        mockMvc.perform(post("/api/v1/admin/users/" + superAdminId + "/reset-password")
                        .header("Authorization", "Bearer " + accessToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(resetReq)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.error.code").value("AUTH_FORBIDDEN"));
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

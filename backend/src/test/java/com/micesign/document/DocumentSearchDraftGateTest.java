package com.micesign.document;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.micesign.admin.TestTokenHelper;
import com.micesign.domain.enums.UserRole;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@DisplayName("Phase 30 — DRAFT gate (tab != 'my' 에서 DRAFT 격리, T-30-02)")
class DocumentSearchDraftGateTest {

    @Autowired MockMvc mockMvc;
    @Autowired TestTokenHelper tokenHelper;
    @Autowired JdbcTemplate jdbcTemplate;
    @Autowired ObjectMapper objectMapper;

    static final long A_ID = 700L;   // Alice (USER, dept=1)
    static final long E_ID = 710L;   // Admin1 (ADMIN, dept=1)

    @BeforeEach
    void setUp() {
        jdbcTemplate.update("DELETE FROM notification_log");
        jdbcTemplate.update("DELETE FROM approval_line");
        jdbcTemplate.update("DELETE FROM document_attachment");
        jdbcTemplate.update("DELETE FROM document_content");
        jdbcTemplate.update("DELETE FROM document");
        jdbcTemplate.update("DELETE FROM doc_sequence");
        jdbcTemplate.update("DELETE FROM \"user\" WHERE id IN (?, ?)", A_ID, E_ID);

        String pwHash = "$2a$10$07mcjXBfvelJFwjs8DnoJOnEqprFy.dnQL1NdnRvlqEWwwmX62SOW";
        String userSql = "INSERT INTO \"user\" (id, employee_no, name, email, password, department_id, "
                + "position_id, role, status, failed_login_count, must_change_password) "
                + "VALUES (?, ?, ?, ?, ?, 1, 3, ?, 'ACTIVE', 0, FALSE)";
        jdbcTemplate.update(userSql, A_ID, "U_A_DG", "Alice", "alice-dg@test.com", pwHash, "USER");
        jdbcTemplate.update(userSql, E_ID, "A_E_DG", "Admin1", "admin1-dg@test.com", pwHash, "ADMIN");

        jdbcTemplate.update(
                "INSERT INTO document (template_code, drafter_id, title, status, submitted_at, created_at, current_step) "
                        + "VALUES ('GENERAL', ?, '드래프트', 'DRAFT', NULL, ?, 1)",
                A_ID, LocalDateTime.now());
        jdbcTemplate.update(
                "INSERT INTO document (template_code, drafter_id, title, status, submitted_at, created_at, current_step) "
                        + "VALUES ('GENERAL', ?, '제출본', 'SUBMITTED', ?, ?, 1)",
                A_ID, LocalDateTime.now().minusDays(1), LocalDateTime.now().minusDays(1));
    }

    private boolean searchContainsDraft(String token, String tab) throws Exception {
        MvcResult result = mockMvc.perform(get("/api/v1/documents/search")
                        .param("tab", tab)
                        .param("size", "50")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andReturn();
        JsonNode content = objectMapper.readTree(result.getResponse().getContentAsByteArray())
                .path("data").path("content");
        for (JsonNode row : content) {
            if ("DRAFT".equals(row.path("status").asText())) return true;
        }
        return false;
    }

    @Test
    @DisplayName("Alice — tab=my: 본인 DRAFT 포함 (D-A6)")
    void tabMy_includesOwnDraft() throws Exception {
        String token = tokenHelper.tokenForRole(A_ID, "alice-dg@test.com", "Alice", UserRole.USER, 1L);
        assertThat(searchContainsDraft(token, "my")).isTrue();
    }

    @Test
    @DisplayName("Alice — tab=department: 본인 DRAFT 제외 (D-A4 엄격 정책)")
    void tabDepartment_excludesOwnDraft() throws Exception {
        String token = tokenHelper.tokenForRole(A_ID, "alice-dg@test.com", "Alice", UserRole.USER, 1L);
        assertThat(searchContainsDraft(token, "department")).isFalse();
    }

    @Test
    @DisplayName("Admin1 (같은 부서) — tab=all: Alice DRAFT 제외 (T-30-02)")
    void tabAll_adminSameDept_excludesOtherDraft() throws Exception {
        String token = tokenHelper.tokenForRole(E_ID, "admin1-dg@test.com", "Admin1", UserRole.ADMIN, 1L);
        assertThat(searchContainsDraft(token, "all")).isFalse();
    }

    @Test
    @DisplayName("SUPER_ADMIN — tab=all: 모든 DRAFT 제외 (D-A4 SUPER_ADMIN 에도 적용)")
    void tabAll_superAdmin_excludesAllDrafts() throws Exception {
        String token = tokenHelper.superAdminToken();
        assertThat(searchContainsDraft(token, "all")).isFalse();
    }

    @Test
    @DisplayName("Invariant I2: tab != 'my' 결과의 모든 row.status != 'DRAFT'")
    void invariant_tabNotMy_noDraftsInContent() throws Exception {
        String superToken = tokenHelper.superAdminToken();
        for (String tab : new String[]{"department", "all"}) {
            MvcResult result = mockMvc.perform(get("/api/v1/documents/search")
                            .param("tab", tab)
                            .param("size", "50")
                            .header("Authorization", "Bearer " + superToken))
                    .andExpect(status().isOk())
                    .andReturn();
            JsonNode content = objectMapper.readTree(result.getResponse().getContentAsByteArray())
                    .path("data").path("content");
            for (JsonNode row : content) {
                assertThat(row.path("status").asText())
                        .as("row id=%d in tab=%s must not be DRAFT", row.path("id").asLong(), tab)
                        .isNotEqualTo("DRAFT");
            }
        }
    }
}

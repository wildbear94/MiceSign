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
import java.util.HashSet;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class DocumentSearchStatusFilterTest {

    @Autowired MockMvc mockMvc;
    @Autowired TestTokenHelper tokenHelper;
    @Autowired JdbcTemplate jdbcTemplate;
    @Autowired ObjectMapper objectMapper;

    static final long OWNER_ID = 800L;

    @BeforeEach
    void setUp() {
        jdbcTemplate.update("DELETE FROM notification_log");
        jdbcTemplate.update("DELETE FROM approval_line");
        jdbcTemplate.update("DELETE FROM document_attachment");
        jdbcTemplate.update("DELETE FROM document_content");
        jdbcTemplate.update("DELETE FROM document");
        jdbcTemplate.update("DELETE FROM doc_sequence");
        jdbcTemplate.update("DELETE FROM \"user\" WHERE id = ?", OWNER_ID);

        String pwHash = "$2a$10$07mcjXBfvelJFwjs8DnoJOnEqprFy.dnQL1NdnRvlqEWwwmX62SOW";
        jdbcTemplate.update(
                "INSERT INTO \"user\" (id, employee_no, name, email, password, department_id, "
                        + "position_id, role, status, failed_login_count, must_change_password) "
                        + "VALUES (?, 'U_SF', 'Owner', 'owner-sf@test.com', ?, 1, 3, 'USER', 'ACTIVE', 0, FALSE)",
                OWNER_ID, pwHash);
    }

    private void seedThreeDocs() {
        int daysAgo = 3;
        for (String st : new String[]{"SUBMITTED", "APPROVED", "REJECTED"}) {
            jdbcTemplate.update(
                    "INSERT INTO document (template_code, drafter_id, title, status, submitted_at, created_at, current_step) "
                            + "VALUES ('GENERAL', ?, ?, ?, ?, ?, 1)",
                    OWNER_ID, "test-" + st, st,
                    LocalDateTime.now().minusDays(daysAgo), LocalDateTime.now().minusDays(daysAgo));
            daysAgo++;
        }
    }

    @Test
    void multipleStatusParams_returns200_withTotalElementsField() throws Exception {
        // Scaffold from Plan 30-01 (empty DB smoke)
        String token = tokenHelper.superAdminToken();
        mockMvc.perform(get("/api/v1/documents/search")
                        .param("status", "SUBMITTED")
                        .param("status", "APPROVED")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.totalElements").exists())
                .andExpect(jsonPath("$.data.pageable.pageSize").value(20));
    }

    @Test
    void singleStatusParam_backwardCompatible_returns200() throws Exception {
        // Scaffold from Plan 30-01 (empty DB smoke)
        String token = tokenHelper.superAdminToken();
        mockMvc.perform(get("/api/v1/documents/search")
                        .param("status", "SUBMITTED")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("statuses=[SUBMITTED] 단일 — SUBMITTED 만 매치 (I7 역호환)")
    void singleStatus_filtersExactMatch() throws Exception {
        seedThreeDocs();
        String token = tokenHelper.tokenForRole(OWNER_ID, "owner-sf@test.com", "Owner", UserRole.USER, 1L);
        MvcResult r = mockMvc.perform(get("/api/v1/documents/search")
                        .param("status", "SUBMITTED")
                        .param("tab", "my")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andReturn();
        JsonNode content = objectMapper.readTree(r.getResponse().getContentAsByteArray()).path("data").path("content");
        for (JsonNode row : content) {
            assertThat(row.path("status").asText()).isEqualTo("SUBMITTED");
        }
        assertThat(content.size()).isEqualTo(1);
    }

    @Test
    @DisplayName("statuses=[SUBMITTED, APPROVED] 복수 — SUBMITTED+APPROVED 매치, REJECTED 제외")
    void multipleStatuses_filtersBoth() throws Exception {
        seedThreeDocs();
        String token = tokenHelper.tokenForRole(OWNER_ID, "owner-sf@test.com", "Owner", UserRole.USER, 1L);
        MvcResult r = mockMvc.perform(get("/api/v1/documents/search")
                        .param("status", "SUBMITTED")
                        .param("status", "APPROVED")
                        .param("tab", "my")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andReturn();
        JsonNode content = objectMapper.readTree(r.getResponse().getContentAsByteArray()).path("data").path("content");
        assertThat(content.size()).isEqualTo(2);
        Set<String> statuses = new HashSet<>();
        for (JsonNode row : content) statuses.add(row.path("status").asText());
        assertThat(statuses).containsExactlyInAnyOrder("SUBMITTED", "APPROVED");
    }

    @Test
    @DisplayName("statuses=[] 누락 — tab=my 는 본인 소유 문서 모두 반환 (DRAFT 제외한 3건)")
    void emptyStatuses_noFilter_respectsDraftGate() throws Exception {
        seedThreeDocs();
        String token = tokenHelper.tokenForRole(OWNER_ID, "owner-sf@test.com", "Owner", UserRole.USER, 1L);
        MvcResult r = mockMvc.perform(get("/api/v1/documents/search")
                        .param("tab", "my")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andReturn();
        assertThat(objectMapper.readTree(r.getResponse().getContentAsByteArray())
                .path("data").path("totalElements").asLong()).isEqualTo(3);
    }
}

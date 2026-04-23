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
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class DocumentSearchKeywordTest {

    @Autowired MockMvc mockMvc;
    @Autowired TestTokenHelper tokenHelper;
    @Autowired JdbcTemplate jdbcTemplate;
    @Autowired ObjectMapper objectMapper;

    static final long OWNER_ID = 500L;

    long titleMatchDocId;
    long percentLiteralDocId;

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
                        + "VALUES (?, 'U_K', '김철수', 'kim-kw@test.com', ?, 1, 3, 'USER', 'ACTIVE', 0, FALSE)",
                OWNER_ID, pwHash);
    }

    private long insertSubmittedDoc(String title, String docNumber, int daysAgo) {
        jdbcTemplate.update(
                "INSERT INTO document (template_code, drafter_id, title, doc_number, status, submitted_at, created_at, current_step) "
                        + "VALUES ('GENERAL', ?, ?, ?, 'SUBMITTED', ?, ?, 1)",
                OWNER_ID, title, docNumber,
                LocalDateTime.now().minusDays(daysAgo), LocalDateTime.now().minusDays(daysAgo));
        Long id = jdbcTemplate.queryForObject(
                "SELECT id FROM document WHERE drafter_id=? AND doc_number=? ORDER BY id DESC LIMIT 1",
                Long.class, OWNER_ID, docNumber);
        return id != null ? id : 0L;
    }

    @Test
    void emptyKeyword_returns200_withEmptyResultForEmptyDb() throws Exception {
        // Empty DB smoke test (scaffold from Plan 30-01)
        String token = tokenHelper.superAdminToken();
        mockMvc.perform(get("/api/v1/documents/search")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.totalElements").value(0));
    }

    @Test
    @DisplayName("keyword 가 title 일부와 매치 — 문서 포함 (SRCH-02)")
    void keywordMatchesTitle() throws Exception {
        titleMatchDocId = insertSubmittedDoc("경비 보고서 2026 Q1", "GEN-2026-0001", 5);
        String token = tokenHelper.tokenForRole(OWNER_ID, "kim-kw@test.com", "김철수", UserRole.USER, 1L);
        MvcResult r = mockMvc.perform(get("/api/v1/documents/search")
                        .param("keyword", "경비")
                        .param("tab", "my")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andReturn();
        JsonNode content = objectMapper.readTree(r.getResponse().getContentAsByteArray()).path("data").path("content");
        boolean found = false;
        for (JsonNode row : content) if (row.path("id").asLong() == titleMatchDocId) { found = true; break; }
        assertThat(found).isTrue();
    }

    @Test
    @DisplayName("keyword 가 docNumber 일부와 매치")
    void keywordMatchesDocNumber() throws Exception {
        insertSubmittedDoc("경비 보고서 2026 Q1", "GEN-2026-0001", 5);
        String token = tokenHelper.tokenForRole(OWNER_ID, "kim-kw@test.com", "김철수", UserRole.USER, 1L);
        MvcResult r = mockMvc.perform(get("/api/v1/documents/search")
                        .param("keyword", "GEN-2026")
                        .param("tab", "my")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andReturn();
        long totalElements = objectMapper.readTree(r.getResponse().getContentAsByteArray())
                .path("data").path("totalElements").asLong();
        assertThat(totalElements).isGreaterThanOrEqualTo(1);
    }

    @Test
    @DisplayName("keyword 가 drafter.name 일부와 매치")
    void keywordMatchesDrafterName() throws Exception {
        insertSubmittedDoc("경비 보고서 2026 Q1", "GEN-2026-0001", 5);
        // SUPER_ADMIN 이 tab=all 로 검색 — 권한 predicate skip, DRAFT gate 만 적용
        String token = tokenHelper.superAdminToken();
        MvcResult r = mockMvc.perform(get("/api/v1/documents/search")
                        .param("keyword", "김철")
                        .param("tab", "all")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andReturn();
        long totalElements = objectMapper.readTree(r.getResponse().getContentAsByteArray())
                .path("data").path("totalElements").asLong();
        assertThat(totalElements).isGreaterThanOrEqualTo(1);
    }

    @Test
    @DisplayName("escapeLikePattern 회귀 smoke — keyword 에 SQL 메타문자 포함 시 크래시 없이 200 응답 (D-D8)")
    void escapeLikePattern_wildcardKeywords_noCrash() throws Exception {
        // D-D8: escapeLikePattern 메서드 자체는 무변경 유지. 이 테스트는 회귀 smoke 수준으로
        // 특수문자 (%, _, ') 가 keyword 로 들어와도 예외 없이 200 을 반환함을 확인한다.
        // 완전한 LIKE 이스케이프 동작 검증은 MariaDB 환경 통합 테스트에서 수행 (H2 는 ESCAPE
        // 절이 없어 '\%' 를 리터럴로 해석하지 않는 차이가 있음).
        insertSubmittedDoc("경비 보고서 2026 Q1", "GEN-2026-0001", 5);
        insertSubmittedDoc("100% 달성률 검토", "LIT-2026-0002", 4);

        String token = tokenHelper.tokenForRole(OWNER_ID, "kim-kw@test.com", "김철수", UserRole.USER, 1L);

        for (String keyword : new String[]{"100%", "under_score", "quote'test"}) {
            mockMvc.perform(get("/api/v1/documents/search")
                            .param("keyword", keyword)
                            .param("tab", "my")
                            .header("Authorization", "Bearer " + token))
                    .andExpect(status().isOk());
        }
    }
}

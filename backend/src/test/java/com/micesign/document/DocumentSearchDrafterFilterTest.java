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
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@DisplayName("Phase 30 — drafterId 필터 + 권한 predicate AND 결합 회귀 (SRCH-04)")
class DocumentSearchDrafterFilterTest {

    @Autowired MockMvc mockMvc;
    @Autowired TestTokenHelper tokenHelper;
    @Autowired JdbcTemplate jdbcTemplate;
    @Autowired ObjectMapper objectMapper;

    static final long A_ID = 1000L; // Alice (USER, dept=1, APPROVE approver for Bob's doc)
    static final long B_ID = 1001L; // Bob   (USER, dept=2, drafter of doc2)
    static final long C_ID = 1002L; // Charlie (USER, dept=3, uninvolved)

    long aliceDocId;
    long bobDocId;

    @BeforeEach
    void setUp() {
        jdbcTemplate.update("DELETE FROM notification_log");
        jdbcTemplate.update("DELETE FROM approval_line");
        jdbcTemplate.update("DELETE FROM document_attachment");
        jdbcTemplate.update("DELETE FROM document_content");
        jdbcTemplate.update("DELETE FROM document");
        jdbcTemplate.update("DELETE FROM doc_sequence");
        jdbcTemplate.update("DELETE FROM \"user\" WHERE id IN (?, ?, ?)", A_ID, B_ID, C_ID);

        String pwHash = "$2a$10$07mcjXBfvelJFwjs8DnoJOnEqprFy.dnQL1NdnRvlqEWwwmX62SOW";
        String sql = "INSERT INTO \"user\" (id, employee_no, name, email, password, department_id, "
                + "position_id, role, status, failed_login_count, must_change_password) "
                + "VALUES (?, ?, ?, ?, ?, ?, 3, 'USER', 'ACTIVE', 0, FALSE)";
        jdbcTemplate.update(sql, A_ID, "U_A_DF", "Alice",   "alice-df@test.com",   pwHash, 1L);
        jdbcTemplate.update(sql, B_ID, "U_B_DF", "Bob",     "bob-df@test.com",     pwHash, 2L);
        jdbcTemplate.update(sql, C_ID, "U_C_DF", "Charlie", "charlie-df@test.com", pwHash, 3L);

        jdbcTemplate.update(
                "INSERT INTO document (template_code, drafter_id, title, status, submitted_at, created_at, current_step) "
                        + "VALUES ('GENERAL', ?, 'Alice 문서', 'SUBMITTED', ?, ?, 1)",
                A_ID, LocalDateTime.now().minusDays(3), LocalDateTime.now().minusDays(3));
        aliceDocId = jdbcTemplate.queryForObject(
                "SELECT id FROM document WHERE drafter_id=? ORDER BY id DESC LIMIT 1", Long.class, A_ID);

        jdbcTemplate.update(
                "INSERT INTO document (template_code, drafter_id, title, status, submitted_at, created_at, current_step) "
                        + "VALUES ('GENERAL', ?, 'Bob 문서 (Alice 가 APPROVE)', 'SUBMITTED', ?, ?, 1)",
                B_ID, LocalDateTime.now().minusDays(2), LocalDateTime.now().minusDays(2));
        bobDocId = jdbcTemplate.queryForObject(
                "SELECT id FROM document WHERE drafter_id=? ORDER BY id DESC LIMIT 1", Long.class, B_ID);

        // Alice 를 Bob 문서의 APPROVE 승인자로 등록
        jdbcTemplate.update(
                "INSERT INTO approval_line (document_id, step_order, line_type, approver_id, status) "
                        + "VALUES (?, 1, 'APPROVE', ?, 'PENDING')",
                bobDocId, A_ID);
    }

    private long[] searchDocIds(String token, String tab, Long drafterId) throws Exception {
        MockHttpServletRequestBuilder reqBuilder = get("/api/v1/documents/search")
                .param("tab", tab)
                .param("size", "50")
                .header("Authorization", "Bearer " + token);
        if (drafterId != null) {
            reqBuilder = reqBuilder.param("drafterId", String.valueOf(drafterId));
        }
        MvcResult result = mockMvc.perform(reqBuilder)
                .andExpect(status().isOk())
                .andReturn();
        JsonNode content = objectMapper.readTree(result.getResponse().getContentAsByteArray())
                .path("data").path("content");
        long[] ids = new long[content.size()];
        for (int i = 0; i < content.size(); i++) ids[i] = content.get(i).path("id").asLong();
        return ids;
    }

    @Test
    @DisplayName("Alice + tab=all + drafterId=A — Alice 본인 문서만")
    void aliceDrafterIdSelf_returnsOwnDoc() throws Exception {
        String token = tokenHelper.tokenForRole(A_ID, "alice-df@test.com", "Alice", UserRole.USER, 1L);
        long[] ids = searchDocIds(token, "all", A_ID);
        assertThat(ids).containsExactly(aliceDocId);
    }

    @Test
    @DisplayName("Alice + tab=all + drafterId=B — Bob 문서 (Alice 가 approval_line)")
    void aliceDrafterIdBob_returnsBobDocViaApproval() throws Exception {
        String token = tokenHelper.tokenForRole(A_ID, "alice-df@test.com", "Alice", UserRole.USER, 1L);
        long[] ids = searchDocIds(token, "all", B_ID);
        assertThat(ids).containsExactly(bobDocId);
    }

    @Test
    @DisplayName("Charlie + tab=all + drafterId=A — 0건 (BOLA 증폭 방지)")
    void charlieDrafterIdAlice_returnsEmpty() throws Exception {
        String token = tokenHelper.tokenForRole(C_ID, "charlie-df@test.com", "Charlie", UserRole.USER, 3L);
        long[] ids = searchDocIds(token, "all", A_ID);
        assertThat(ids).isEmpty();
    }

    @Test
    @DisplayName("Alice + drafterId=9999999 (존재 없음) — 200 + 빈 결과")
    void nonExistentDrafterId_returnsEmpty() throws Exception {
        String token = tokenHelper.tokenForRole(A_ID, "alice-df@test.com", "Alice", UserRole.USER, 1L);
        long[] ids = searchDocIds(token, "all", 9999999L);
        assertThat(ids).isEmpty();
    }

    @Test
    @DisplayName("Alice + tab=my + drafterId=B — 0건 (tab=my 가 drafterId=currentUserId 먼저 AND)")
    void tabMy_drafterIdOther_returnsEmpty() throws Exception {
        String token = tokenHelper.tokenForRole(A_ID, "alice-df@test.com", "Alice", UserRole.USER, 1L);
        long[] ids = searchDocIds(token, "my", B_ID);
        assertThat(ids).isEmpty();
    }
}

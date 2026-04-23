package com.micesign.user;

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

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@DisplayName("Phase 30 — /api/v1/users/search 가시성 + DTO shape (T-30-04 enumeration 완화)")
class UserSearchControllerTest {

    @Autowired MockMvc mockMvc;
    @Autowired TestTokenHelper tokenHelper;
    @Autowired JdbcTemplate jdbcTemplate;
    @Autowired ObjectMapper objectMapper;

    static final long ACTIVE_USER_ID = 900L;
    static final long RETIRED_USER_ID = 910L;
    static final long INACTIVE_USER_ID = 911L;

    @BeforeEach
    void setUp() {
        jdbcTemplate.update("DELETE FROM notification_log");
        jdbcTemplate.update("DELETE FROM approval_line");
        jdbcTemplate.update("DELETE FROM document_attachment");
        jdbcTemplate.update("DELETE FROM document_content");
        jdbcTemplate.update("DELETE FROM document");
        jdbcTemplate.update("DELETE FROM doc_sequence");
        jdbcTemplate.update("DELETE FROM \"user\" WHERE id IN (?, ?, ?)",
                ACTIVE_USER_ID, RETIRED_USER_ID, INACTIVE_USER_ID);

        String pwHash = "$2a$10$07mcjXBfvelJFwjs8DnoJOnEqprFy.dnQL1NdnRvlqEWwwmX62SOW";
        String sql = "INSERT INTO \"user\" (id, employee_no, name, email, password, department_id, "
                + "position_id, role, status, failed_login_count, must_change_password) "
                + "VALUES (?, ?, ?, ?, ?, 1, 3, 'USER', ?, 0, FALSE)";
        jdbcTemplate.update(sql, ACTIVE_USER_ID,   "U_A_US", "김활성",   "active-us@test.com",   pwHash, "ACTIVE");
        jdbcTemplate.update(sql, RETIRED_USER_ID,  "U_R_US", "김퇴직",   "retired-us@test.com",  pwHash, "RETIRED");
        jdbcTemplate.update(sql, INACTIVE_USER_ID, "U_I_US", "김비활성", "inactive-us@test.com", pwHash, "INACTIVE");
    }

    private String userToken() {
        return tokenHelper.tokenForRole(ACTIVE_USER_ID, "active-us@test.com", "김활성", UserRole.USER, 1L);
    }

    @Test
    @DisplayName("미인증 호출 — 401 (T-30-04 보조)")
    void unauthenticated_returns401() throws Exception {
        mockMvc.perform(get("/api/v1/users/search").param("q", "김"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("USER role JWT + q=김 — 200, 최소 DTO 필드만 응답")
    void userRole_withQuery_returnsMinimalDto() throws Exception {
        MvcResult r = mockMvc.perform(get("/api/v1/users/search")
                        .param("q", "김")
                        .header("Authorization", "Bearer " + userToken()))
                .andExpect(status().isOk())
                .andReturn();
        JsonNode data = objectMapper.readTree(r.getResponse().getContentAsByteArray()).path("data");
        assertThat(data.isArray()).isTrue();
        assertThat(data.size()).isGreaterThanOrEqualTo(1);
        JsonNode first = data.get(0);
        assertThat(first.has("id")).isTrue();
        assertThat(first.has("name")).isTrue();
        assertThat(first.has("departmentName")).isTrue();
        // 민감 필드 미포함 (T-30-04)
        assertThat(first.has("email")).isFalse();
        assertThat(first.has("phone")).isFalse();
        assertThat(first.has("role")).isFalse();
        assertThat(first.has("employeeNo")).isFalse();
        assertThat(first.has("password")).isFalse();
        assertThat(first.has("status")).isFalse();
    }

    @Test
    @DisplayName("q 파라미터 생략 — 200, default size 20 이하 반환")
    void noQuery_returnsDefaultSize() throws Exception {
        MvcResult r = mockMvc.perform(get("/api/v1/users/search")
                        .header("Authorization", "Bearer " + userToken()))
                .andExpect(status().isOk())
                .andReturn();
        JsonNode data = objectMapper.readTree(r.getResponse().getContentAsByteArray()).path("data");
        assertThat(data.size()).isLessThanOrEqualTo(20);
    }

    @Test
    @DisplayName("size=100 — 50 으로 clamp (T-30-04)")
    void size100_clampsTo50() throws Exception {
        MvcResult r = mockMvc.perform(get("/api/v1/users/search")
                        .param("size", "100")
                        .header("Authorization", "Bearer " + userToken()))
                .andExpect(status().isOk())
                .andReturn();
        JsonNode data = objectMapper.readTree(r.getResponse().getContentAsByteArray()).path("data");
        assertThat(data.size()).isLessThanOrEqualTo(50);
    }

    @Test
    @DisplayName("size=0 — 1 로 clamp (최소)")
    void size0_clampsTo1() throws Exception {
        MvcResult r = mockMvc.perform(get("/api/v1/users/search")
                        .param("size", "0")
                        .header("Authorization", "Bearer " + userToken()))
                .andExpect(status().isOk())
                .andReturn();
        JsonNode data = objectMapper.readTree(r.getResponse().getContentAsByteArray()).path("data");
        assertThat(data.size()).isLessThanOrEqualTo(1);
    }

    @Test
    @DisplayName("RETIRED / INACTIVE 사용자 — 응답에 포함되지 않음 (ACTIVE 필터)")
    void retiredAndInactive_excluded() throws Exception {
        MvcResult r = mockMvc.perform(get("/api/v1/users/search")
                        .param("q", "김")
                        .param("size", "50")
                        .header("Authorization", "Bearer " + userToken()))
                .andExpect(status().isOk())
                .andReturn();
        JsonNode data = objectMapper.readTree(r.getResponse().getContentAsByteArray()).path("data");
        for (JsonNode row : data) {
            long id = row.path("id").asLong();
            assertThat(id).isNotEqualTo(RETIRED_USER_ID);
            assertThat(id).isNotEqualTo(INACTIVE_USER_ID);
        }
        boolean activePresent = false;
        for (JsonNode row : data) if (row.path("id").asLong() == ACTIVE_USER_ID) { activePresent = true; break; }
        assertThat(activePresent).isTrue();
    }

    @Test
    @DisplayName("SUPER_ADMIN JWT — 동일 정책 적용 (역할 무관)")
    void superAdmin_sameMinimalDto() throws Exception {
        MvcResult r = mockMvc.perform(get("/api/v1/users/search")
                        .param("q", "김활성")
                        .header("Authorization", "Bearer " + tokenHelper.superAdminToken()))
                .andExpect(status().isOk())
                .andReturn();
        JsonNode data = objectMapper.readTree(r.getResponse().getContentAsByteArray()).path("data");
        if (data.size() > 0) {
            assertThat(data.get(0).has("email")).isFalse();
            assertThat(data.get(0).has("employeeNo")).isFalse();
        }
    }
}

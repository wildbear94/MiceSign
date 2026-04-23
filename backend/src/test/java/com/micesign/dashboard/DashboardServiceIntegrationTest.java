package com.micesign.dashboard;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.micesign.admin.TestTokenHelper;
import com.micesign.domain.enums.ApprovalLineStatus;
import com.micesign.domain.enums.ApprovalLineType;
import com.micesign.domain.enums.DocumentStatus;
import com.micesign.domain.enums.UserRole;
import com.micesign.repository.DepartmentRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Phase 31 Plan 02 — DashboardService role × 4카드 × 부서 계층 matrix 통합 테스트.
 *
 * DASH-01 (4 카드 권한 스코프 — USER=본인 / ADMIN=본인+부서계층 / SUPER_ADMIN=전사) 와
 * DASH-02 (최근 5건 본인 스코프 유지) 의 BE contract 를 증명.
 *
 * 부서 계층 fixture:
 *   HQ (700)
 *    ├─ Engineering (701, parent=700)
 *    │    └─ Platform (702, parent=701)
 *    └─ Sales (703, parent=700)
 *
 * User fixture (700번대 id — 다른 테스트와 충돌 방지):
 *   - USER_PLATFORM (700, Platform, USER)
 *   - USER_SALES    (701, Sales,    USER)
 *   - ADMIN_ENG     (710, Engineering, ADMIN)
 *   - ADMIN_HQ      (711, HQ,       ADMIN)
 *   - SUPER_ADMIN 은 V2 seed (id=1) 사용 — tokenHelper.superAdminToken()
 *
 * Document fixture:
 *   Platform user (drafter) — DRAFT 1 + SUBMITTED 1 + APPROVED 1 + REJECTED 1
 *   Sales user (drafter)    — SUBMITTED 1 + APPROVED 1
 *
 * Approval line fixture (PENDING):
 *   platSubmitted → ADMIN_ENG (APPROVE)
 *   salesSubmitted → ADMIN_HQ (APPROVE)
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@DisplayName("Phase 31 — DashboardService 권한 × 4카드 × 부서 계층 (DASH-01, DASH-02)")
class DashboardServiceIntegrationTest {

    @Autowired MockMvc mockMvc;
    @Autowired TestTokenHelper tokenHelper;
    @Autowired JdbcTemplate jdbcTemplate;
    @Autowired ObjectMapper objectMapper;
    @Autowired DepartmentRepository departmentRepository;

    // Department ids (700번대 — 기존 seed 와 격리)
    static final long HQ_ID = 700L;
    static final long ENG_ID = 701L;
    static final long PLAT_ID = 702L;
    static final long SALES_ID = 703L;

    // User ids (700번대)
    static final long USER_PLATFORM = 700L;
    static final long USER_SALES = 701L;
    static final long ADMIN_ENG = 710L;
    static final long ADMIN_HQ = 711L;

    // Document ids — @BeforeEach 에서 채움
    long platSubmittedId;
    long platApprovedId;
    long platRejectedId;
    long platDraftId;
    long salesSubmittedId;
    long salesApprovedId;

    @BeforeEach
    void setUp() {
        cleanup();

        // 부서 계층 seed — 루트 → 하위 순서 (parent_id FK)
        jdbcTemplate.update(
                "INSERT INTO department (id, name, parent_id, sort_order, is_active) VALUES (?, 'HQ_P31', NULL, 700, TRUE)",
                HQ_ID);
        jdbcTemplate.update(
                "INSERT INTO department (id, name, parent_id, sort_order, is_active) VALUES (?, 'Engineering_P31', ?, 701, TRUE)",
                ENG_ID, HQ_ID);
        jdbcTemplate.update(
                "INSERT INTO department (id, name, parent_id, sort_order, is_active) VALUES (?, 'Platform_P31', ?, 702, TRUE)",
                PLAT_ID, ENG_ID);
        jdbcTemplate.update(
                "INSERT INTO department (id, name, parent_id, sort_order, is_active) VALUES (?, 'Sales_P31', ?, 703, TRUE)",
                SALES_ID, HQ_ID);

        // User seed (BCrypt("password"))
        String pwHash = "$2a$10$07mcjXBfvelJFwjs8DnoJOnEqprFy.dnQL1NdnRvlqEWwwmX62SOW";
        String userSql = "INSERT INTO \"user\" (id, employee_no, name, email, password, department_id, "
                + "position_id, role, status, failed_login_count, must_change_password) "
                + "VALUES (?, ?, ?, ?, ?, ?, 3, ?, 'ACTIVE', 0, FALSE)";
        jdbcTemplate.update(userSql, USER_PLATFORM, "U_PLAT_31", "PlatUser",
                "platuser-31@test.com", pwHash, PLAT_ID, "USER");
        jdbcTemplate.update(userSql, USER_SALES, "U_SALES_31", "SalesUser",
                "salesuser-31@test.com", pwHash, SALES_ID, "USER");
        jdbcTemplate.update(userSql, ADMIN_ENG, "A_ENG_31", "EngAdmin",
                "engadmin-31@test.com", pwHash, ENG_ID, "ADMIN");
        jdbcTemplate.update(userSql, ADMIN_HQ, "A_HQ_31", "HQAdmin",
                "hqadmin-31@test.com", pwHash, HQ_ID, "ADMIN");

        // Platform user 4문서 (DRAFT / SUBMITTED / APPROVED / REJECTED 각 1건)
        platDraftId = insertDocument(USER_PLATFORM, DocumentStatus.DRAFT, null, "PLAT DRAFT");
        platSubmittedId = insertDocument(USER_PLATFORM, DocumentStatus.SUBMITTED,
                LocalDateTime.now().minusDays(3), "PLAT SUBMITTED");
        platApprovedId = insertDocument(USER_PLATFORM, DocumentStatus.APPROVED,
                LocalDateTime.now().minusDays(5), "PLAT APPROVED");
        platRejectedId = insertDocument(USER_PLATFORM, DocumentStatus.REJECTED,
                LocalDateTime.now().minusDays(2), "PLAT REJECTED");

        // Sales user 2문서
        salesSubmittedId = insertDocument(USER_SALES, DocumentStatus.SUBMITTED,
                LocalDateTime.now().minusDays(4), "SALES SUBMITTED");
        salesApprovedId = insertDocument(USER_SALES, DocumentStatus.APPROVED,
                LocalDateTime.now().minusDays(6), "SALES APPROVED");

        // approval_line — platSubmitted 에 ADMIN_ENG 가 APPROVE PENDING
        insertApprovalLine(platSubmittedId, ADMIN_ENG, ApprovalLineType.APPROVE, 1,
                ApprovalLineStatus.PENDING);
        // salesSubmitted 에 ADMIN_HQ 가 APPROVE PENDING
        insertApprovalLine(salesSubmittedId, ADMIN_HQ, ApprovalLineType.APPROVE, 1,
                ApprovalLineStatus.PENDING);
    }

    @AfterEach
    void tearDown() {
        cleanup();
    }

    private void cleanup() {
        // FK 역순 cleanup
        jdbcTemplate.update("DELETE FROM notification_log");
        jdbcTemplate.update("DELETE FROM approval_line");
        jdbcTemplate.update("DELETE FROM document_attachment");
        jdbcTemplate.update("DELETE FROM document_content");
        jdbcTemplate.update("DELETE FROM document");
        jdbcTemplate.update("DELETE FROM doc_sequence");
        jdbcTemplate.update("DELETE FROM \"user\" WHERE id IN (?, ?, ?, ?)",
                USER_PLATFORM, USER_SALES, ADMIN_ENG, ADMIN_HQ);
        // 부서: 계층 깊이 역순으로 개별 삭제 — H2 는 IN-list 삭제 시 row 별 FK 검사를 수행하므로
        // 같은 문에서 parent 를 먼저 삭제하려 하면 자식이 아직 남은 시점에 FK violation 발생.
        // 따라서 leaf (Platform) → middle (Engineering) → sibling leaf (Sales) → root (HQ) 순.
        jdbcTemplate.update("DELETE FROM department WHERE id = ?", PLAT_ID);
        jdbcTemplate.update("DELETE FROM department WHERE id = ?", ENG_ID);
        jdbcTemplate.update("DELETE FROM department WHERE id = ?", SALES_ID);
        jdbcTemplate.update("DELETE FROM department WHERE id = ?", HQ_ID);
    }

    private long insertDocument(Long drafterId, DocumentStatus status,
                                 LocalDateTime submittedAt, String title) {
        jdbcTemplate.update(
                "INSERT INTO document (template_code, drafter_id, title, status, submitted_at, created_at, current_step) "
                        + "VALUES (?, ?, ?, ?, ?, ?, 1)",
                "GENERAL", drafterId, title, status.name(), submittedAt, LocalDateTime.now());
        Long id = jdbcTemplate.queryForObject(
                "SELECT id FROM document WHERE drafter_id = ? AND status = ? ORDER BY id DESC LIMIT 1",
                Long.class, drafterId, status.name());
        return id != null ? id : 0L;
    }

    private void insertApprovalLine(long docId, long approverId, ApprovalLineType type,
                                     int step, ApprovalLineStatus status) {
        jdbcTemplate.update(
                "INSERT INTO approval_line (document_id, step_order, line_type, approver_id, status) "
                        + "VALUES (?, ?, ?, ?, ?)",
                docId, step, type.name(), approverId, status.name());
    }

    private JsonNode callSummary(String token) throws Exception {
        MvcResult result = mockMvc.perform(get("/api/v1/dashboard/summary")
                        .header("Authorization", "Bearer " + token)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andReturn();
        JsonNode root = objectMapper.readTree(result.getResponse().getContentAsByteArray());
        return root.path("data");
    }

    // ========== Case 1: USER 스코프 — 본인 drafter 만 카운트 ==========
    @Test
    @DisplayName("USER (Platform) — 본인 스코프만 카운트: pending=0, draft=1, submitted=1, completed=1, rejected=1")
    void user_sees_only_self_drafted() throws Exception {
        String token = tokenHelper.tokenForRole(USER_PLATFORM, "platuser-31@test.com",
                "PlatUser", UserRole.USER, PLAT_ID);
        JsonNode data = callSummary(token);
        // Platform user 는 approval_line 에 approver 로 등록되지 않음 → pending 0
        assertThat(data.path("pendingCount").asLong()).isEqualTo(0L);
        assertThat(data.path("draftCount").asLong()).isEqualTo(1L);
        assertThat(data.path("submittedCount").asLong()).isEqualTo(1L);
        // completedCount 는 APPROVED only (D-A2 재정의)
        assertThat(data.path("completedCount").asLong()).isEqualTo(1L);
        assertThat(data.path("rejectedCount").asLong()).isEqualTo(1L);
    }

    // ========== Case 2: ADMIN (Engineering) — 계층 재귀 [Engineering, Platform] 스코프 ==========
    @Test
    @DisplayName("ADMIN (Engineering) — 계층 재귀 [Engineering, Platform]. Sales 배제.")
    void admin_sees_descendant_scope() throws Exception {
        String token = tokenHelper.tokenForRole(ADMIN_ENG, "engadmin-31@test.com",
                "EngAdmin", UserRole.ADMIN, ENG_ID);
        JsonNode data = callSummary(token);
        // descendantDeptIds = [Engineering, Platform] → drafterIds = [ADMIN_ENG, USER_PLATFORM]
        // ADMIN_ENG 본인은 문서 없음. Platform user 의 4 문서만 대상.
        // Sales 브랜치 문서는 제외.
        assertThat(data.path("submittedCount").asLong()).isEqualTo(1L);
        assertThat(data.path("completedCount").asLong()).isEqualTo(1L);
        assertThat(data.path("rejectedCount").asLong()).isEqualTo(1L);
        assertThat(data.path("draftCount").asLong()).isEqualTo(1L);
        // pending: approver.id ∈ [ADMIN_ENG, USER_PLATFORM] 이고 PENDING/SUBMITTED/current_step=step_order 인 라인
        // → platSubmitted 의 ADMIN_ENG APPROVE 라인 1건
        assertThat(data.path("pendingCount").asLong()).isEqualTo(1L);
    }

    // ========== Case 3: SUPER_ADMIN — 전사 카운트 ==========
    @Test
    @DisplayName("SUPER_ADMIN — 전사 카운트 (Sales 포함)")
    void superAdmin_sees_all() throws Exception {
        String token = tokenHelper.superAdminToken();
        JsonNode data = callSummary(token);
        // SUBMITTED 전사: platSubmitted + salesSubmitted = 2
        assertThat(data.path("submittedCount").asLong()).isEqualTo(2L);
        // APPROVED 전사: platApproved + salesApproved = 2
        assertThat(data.path("completedCount").asLong()).isEqualTo(2L);
        // REJECTED 전사: platRejected = 1
        assertThat(data.path("rejectedCount").asLong()).isEqualTo(1L);
        // PENDING 전사: platSubmitted(ADMIN_ENG) + salesSubmitted(ADMIN_HQ) = 2
        assertThat(data.path("pendingCount").asLong()).isEqualTo(2L);
    }

    // ========== Case 4: ADMIN (HQ) — 최상위 계층, 전 부서 descendant ==========
    @Test
    @DisplayName("ADMIN (HQ) — 최상위 계층, 전 부서 descendant (Sales 포함)")
    void admin_hq_covers_full_hierarchy() throws Exception {
        String token = tokenHelper.tokenForRole(ADMIN_HQ, "hqadmin-31@test.com",
                "HQAdmin", UserRole.ADMIN, HQ_ID);
        JsonNode data = callSummary(token);
        // descendantDeptIds = [HQ, Engineering, Platform, Sales]
        // drafterIds = [USER_PLATFORM, USER_SALES, ADMIN_ENG, ADMIN_HQ]
        // plat + sales 모두 포함
        assertThat(data.path("submittedCount").asLong()).isEqualTo(2L);
        assertThat(data.path("completedCount").asLong()).isEqualTo(2L);
        assertThat(data.path("rejectedCount").asLong()).isEqualTo(1L);
        // pending: ADMIN_HQ 스코프에 포함된 approver_id (ADMIN_ENG + ADMIN_HQ) = 2건
        assertThat(data.path("pendingCount").asLong()).isEqualTo(2L);
    }

    // ========== Case 5: JSON contract — draftCount / rejectedCount 필드 존재 ==========
    @Test
    @DisplayName("JSON 응답에 draftCount / rejectedCount 필드 존재 (API contract)")
    void draftCount_and_rejectedCount_present_in_json() throws Exception {
        String token = tokenHelper.tokenForRole(USER_PLATFORM, "platuser-31@test.com",
                "PlatUser", UserRole.USER, PLAT_ID);
        JsonNode data = callSummary(token);
        assertThat(data.has("draftCount"))
                .as("D-A3: draftCount 는 FE 미노출이지만 BE contract 유지")
                .isTrue();
        assertThat(data.has("rejectedCount"))
                .as("D-A2: rejectedCount 신규 필드")
                .isTrue();
    }

    // ========== Case 6: findDescendantIds — 부서 계층 재귀 SoT 검증 ==========
    @Test
    @DisplayName("DepartmentRepository.findDescendantIds — 부서 계층 재귀 SoT 검증")
    void findDescendantIds_recursive_cte_returns_self_plus_all_descendants() {
        // HQ (root) — self + Engineering + Platform + Sales
        List<Long> hqTree = departmentRepository.findDescendantIds(HQ_ID);
        assertThat(hqTree).containsExactlyInAnyOrder(HQ_ID, ENG_ID, PLAT_ID, SALES_ID);

        // Engineering (middle) — self + Platform
        List<Long> engTree = departmentRepository.findDescendantIds(ENG_ID);
        assertThat(engTree).containsExactlyInAnyOrder(ENG_ID, PLAT_ID);

        // Platform (leaf) — self only
        List<Long> platTree = departmentRepository.findDescendantIds(PLAT_ID);
        assertThat(platTree).containsExactly(PLAT_ID);

        // Sales (leaf, sibling branch) — self only
        List<Long> salesTree = departmentRepository.findDescendantIds(SALES_ID);
        assertThat(salesTree).containsExactly(SALES_ID);
    }

    // ========== Case 7: recentPending / recentDocuments 본인 스코프 유지 (D-A6 / RESEARCH A6) ==========
    @Test
    @DisplayName("ADMIN 이어도 recentPending/recentDocuments 는 본인 userId 스코프 유지 (RESEARCH A6)")
    void recent_lists_remain_self_scope_even_for_admin() throws Exception {
        String token = tokenHelper.tokenForRole(ADMIN_ENG, "engadmin-31@test.com",
                "EngAdmin", UserRole.ADMIN, ENG_ID);
        JsonNode data = callSummary(token);
        // ADMIN_ENG 본인은 기안한 문서가 없고, 본인이 approver 인 pending 1건만 있음
        assertThat(data.has("recentPending")).isTrue();
        assertThat(data.has("recentDocuments")).isTrue();
        // recentPending: ADMIN_ENG 본인 approver 인 platSubmitted 1건
        JsonNode recentPending = data.path("recentPending");
        assertThat(recentPending.isArray()).isTrue();
        assertThat(recentPending.size()).isEqualTo(1);
        // recentDocuments: ADMIN_ENG 본인 기안 0건
        JsonNode recentDocs = data.path("recentDocuments");
        assertThat(recentDocs.isArray()).isTrue();
        assertThat(recentDocs.size()).isEqualTo(0);
    }
}

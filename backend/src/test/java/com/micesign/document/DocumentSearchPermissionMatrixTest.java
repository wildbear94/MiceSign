package com.micesign.document;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.micesign.admin.TestTokenHelper;
import com.micesign.domain.enums.ApprovalLineStatus;
import com.micesign.domain.enums.ApprovalLineType;
import com.micesign.domain.enums.DocumentStatus;
import com.micesign.domain.enums.UserRole;
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
import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@DisplayName("Phase 30 — FSD FN-SEARCH-001 권한 매트릭스 통합 테스트 (SRCH-01, T-30-01)")
class DocumentSearchPermissionMatrixTest {

    @Autowired MockMvc mockMvc;
    @Autowired TestTokenHelper tokenHelper;
    @Autowired JdbcTemplate jdbcTemplate;
    @Autowired ObjectMapper objectMapper;

    // User ids (600번대 — 다른 테스트 seed 와 충돌 방지)
    static final long A_ID = 600L;
    static final long B_ID = 601L;
    static final long C_ID = 602L;
    static final long D_ID = 603L;
    static final long E_ID = 610L;
    static final long F_ID = 620L;
    // G (SUPER_ADMIN) 은 V2 seed 의 고정 계정 사용 — tokenHelper.superAdminToken() 분기에서 처리

    // Departments: Alice/Admin1 in dept=1, Bob/Charlie/Admin2 in dept=2, David in dept=3
    static final long DEPT_1 = 1L;
    static final long DEPT_2 = 2L;
    static final long DEPT_3 = 3L;

    // Document ids (per-test fixture)
    long draftDocId;
    long submittedDocId;
    long approvedDocId;
    long rejectedDocId;

    @BeforeEach
    void setUp() {
        // FK 역순 cleanup
        jdbcTemplate.update("DELETE FROM notification_log");
        jdbcTemplate.update("DELETE FROM approval_line");
        jdbcTemplate.update("DELETE FROM document_attachment");
        jdbcTemplate.update("DELETE FROM document_content");
        jdbcTemplate.update("DELETE FROM document");
        jdbcTemplate.update("DELETE FROM doc_sequence");
        jdbcTemplate.update("DELETE FROM \"user\" WHERE id IN (?, ?, ?, ?, ?, ?)",
                A_ID, B_ID, C_ID, D_ID, E_ID, F_ID);

        // V2 seed 기본적으로 부서 1-7 삽입함. 방어적으로 존재 확인만 수행.

        // 6 test users 삽입 (pwHash 는 ApprovalWorkflowTest 와 동일 — BCrypt("password"))
        String pwHash = "$2a$10$07mcjXBfvelJFwjs8DnoJOnEqprFy.dnQL1NdnRvlqEWwwmX62SOW";
        String userSql = "INSERT INTO \"user\" (id, employee_no, name, email, password, department_id, "
                + "position_id, role, status, failed_login_count, must_change_password) "
                + "VALUES (?, ?, ?, ?, ?, ?, 3, ?, 'ACTIVE', 0, FALSE)";
        jdbcTemplate.update(userSql, A_ID, "U_A_PM", "Alice", "alice-pm@test.com", pwHash, DEPT_1, "USER");
        jdbcTemplate.update(userSql, B_ID, "U_B_PM", "Bob", "bob-pm@test.com", pwHash, DEPT_2, "USER");
        jdbcTemplate.update(userSql, C_ID, "U_C_PM", "Charlie", "charlie-pm@test.com", pwHash, DEPT_2, "USER");
        jdbcTemplate.update(userSql, D_ID, "U_D_PM", "David", "david-pm@test.com", pwHash, DEPT_3, "USER");
        jdbcTemplate.update(userSql, E_ID, "A_E_PM", "Admin1", "admin1-pm@test.com", pwHash, DEPT_1, "ADMIN");
        jdbcTemplate.update(userSql, F_ID, "A_F_PM", "Admin2", "admin2-pm@test.com", pwHash, DEPT_2, "ADMIN");

        // 4 문서 seed — 모두 Alice 기안
        draftDocId     = insertDocument(A_ID, DocumentStatus.DRAFT,     null,                                "DRAFT 문서");
        submittedDocId = insertDocument(A_ID, DocumentStatus.SUBMITTED, LocalDateTime.now().minusDays(3),    "SUBMITTED 문서");
        approvedDocId  = insertDocument(A_ID, DocumentStatus.APPROVED,  LocalDateTime.now().minusDays(5),    "APPROVED 문서");
        rejectedDocId  = insertDocument(A_ID, DocumentStatus.REJECTED,  LocalDateTime.now().minusDays(2),    "REJECTED 문서");

        // approval_line — submitted/approved/rejected 는 동일 shape: APPROVE:B, AGREE:C, REFERENCE:D
        insertApprovalLine(submittedDocId, B_ID, ApprovalLineType.APPROVE,   1, ApprovalLineStatus.PENDING);
        insertApprovalLine(submittedDocId, C_ID, ApprovalLineType.AGREE,     2, ApprovalLineStatus.PENDING);
        insertApprovalLine(submittedDocId, D_ID, ApprovalLineType.REFERENCE, 3, ApprovalLineStatus.PENDING);
        insertApprovalLine(approvedDocId,  B_ID, ApprovalLineType.APPROVE,   1, ApprovalLineStatus.APPROVED);
        insertApprovalLine(approvedDocId,  C_ID, ApprovalLineType.AGREE,     2, ApprovalLineStatus.APPROVED);
        insertApprovalLine(approvedDocId,  D_ID, ApprovalLineType.REFERENCE, 3, ApprovalLineStatus.APPROVED);
        insertApprovalLine(rejectedDocId,  B_ID, ApprovalLineType.APPROVE,   1, ApprovalLineStatus.REJECTED);
        insertApprovalLine(rejectedDocId,  C_ID, ApprovalLineType.AGREE,     2, ApprovalLineStatus.SKIPPED);
        insertApprovalLine(rejectedDocId,  D_ID, ApprovalLineType.REFERENCE, 3, ApprovalLineStatus.SKIPPED);

        // Phase 31 D-A9 Option 1 — 부서 계층 재귀 fixture (800번대 id, 기존 seed 와 격리)
        //   P31_HQ (800)
        //    └─ P31_Eng (801, parent=800)
        //        └─ P31_Plat (802, parent=801)
        // users: 800=P31PlatUser(USER, in 802), 801=P31EngAdmin(ADMIN, in 801), 802=P31PlatAdmin(ADMIN, in 802)
        // 하위 → 상위 순서로 의존 데이터 먼저 정리
        jdbcTemplate.update("DELETE FROM approval_line WHERE document_id IN (SELECT id FROM document WHERE drafter_id IN (?, ?, ?))",
                800L, 801L, 802L);
        jdbcTemplate.update("DELETE FROM document_content WHERE document_id IN (SELECT id FROM document WHERE drafter_id IN (?, ?, ?))",
                800L, 801L, 802L);
        jdbcTemplate.update("DELETE FROM document WHERE drafter_id IN (?, ?, ?)", 800L, 801L, 802L);
        jdbcTemplate.update("DELETE FROM \"user\" WHERE id IN (?, ?, ?)", 800L, 801L, 802L);
        // 부서: leaf → middle → root 개별 삭제 (H2 FK row-by-row 검사)
        jdbcTemplate.update("DELETE FROM department WHERE id = ?", 802L);
        jdbcTemplate.update("DELETE FROM department WHERE id = ?", 801L);
        jdbcTemplate.update("DELETE FROM department WHERE id = ?", 800L);

        jdbcTemplate.update("INSERT INTO department (id, name, parent_id, sort_order, is_active) VALUES (?, 'P31_HQ', NULL, 800, TRUE)", 800L);
        jdbcTemplate.update("INSERT INTO department (id, name, parent_id, sort_order, is_active) VALUES (?, 'P31_Eng', ?, 801, TRUE)", 801L, 800L);
        jdbcTemplate.update("INSERT INTO department (id, name, parent_id, sort_order, is_active) VALUES (?, 'P31_Plat', ?, 802, TRUE)", 802L, 801L);

        String pwHashHier = "$2a$10$07mcjXBfvelJFwjs8DnoJOnEqprFy.dnQL1NdnRvlqEWwwmX62SOW";
        String userSqlHier = "INSERT INTO \"user\" (id, employee_no, name, email, password, department_id, position_id, role, status, failed_login_count, must_change_password) "
                + "VALUES (?, ?, ?, ?, ?, ?, 3, ?, 'ACTIVE', 0, FALSE)";
        jdbcTemplate.update(userSqlHier, 800L, "U_P31_PLAT", "P31Plat", "p31plat@test.com", pwHashHier, 802L, "USER");
        jdbcTemplate.update(userSqlHier, 801L, "A_P31_ENG", "P31Eng", "p31eng@test.com", pwHashHier, 801L, "ADMIN");
        jdbcTemplate.update(userSqlHier, 802L, "A_P31_PLAT", "P31PlatAdmin", "p31platadmin@test.com", pwHashHier, 802L, "ADMIN");

        // Platform user 가 기안한 SUBMITTED 문서 (Engineering ADMIN 이 계층 재귀로 볼 수 있어야 함)
        jdbcTemplate.update(
                "INSERT INTO document (template_code, drafter_id, title, status, submitted_at, created_at, current_step) "
                        + "VALUES (?, ?, ?, ?, ?, ?, 1)",
                "GENERAL", 800L, "Phase31 Platform SUBMITTED", DocumentStatus.SUBMITTED.name(),
                LocalDateTime.now().minusDays(1), LocalDateTime.now());
    }

    @org.junit.jupiter.api.AfterEach
    void tearDownHierFixture() {
        // Phase 31 D-A9 Option 1 fixture 만 정리 — 기존 cleanup 은 @BeforeEach 가 처리
        jdbcTemplate.update("DELETE FROM approval_line WHERE document_id IN (SELECT id FROM document WHERE drafter_id IN (?, ?, ?))",
                800L, 801L, 802L);
        jdbcTemplate.update("DELETE FROM document_content WHERE document_id IN (SELECT id FROM document WHERE drafter_id IN (?, ?, ?))",
                800L, 801L, 802L);
        jdbcTemplate.update("DELETE FROM document WHERE drafter_id IN (?, ?, ?)", 800L, 801L, 802L);
        jdbcTemplate.update("DELETE FROM \"user\" WHERE id IN (?, ?, ?)", 800L, 801L, 802L);
        jdbcTemplate.update("DELETE FROM department WHERE id = ?", 802L);
        jdbcTemplate.update("DELETE FROM department WHERE id = ?", 801L);
        jdbcTemplate.update("DELETE FROM department WHERE id = ?", 800L);
    }

    private long insertDocument(Long drafterId, DocumentStatus status, LocalDateTime submittedAt, String title) {
        jdbcTemplate.update(
                "INSERT INTO document (template_code, drafter_id, title, status, submitted_at, created_at, current_step) "
                        + "VALUES (?, ?, ?, ?, ?, ?, 1)",
                "GENERAL", drafterId, title, status.name(), submittedAt, LocalDateTime.now());
        Long id = jdbcTemplate.queryForObject(
                "SELECT id FROM document WHERE drafter_id = ? AND status = ? ORDER BY id DESC LIMIT 1",
                Long.class, drafterId, status.name());
        return id != null ? id : 0L;
    }

    private void insertApprovalLine(long docId, long approverId, ApprovalLineType type, int step, ApprovalLineStatus status) {
        jdbcTemplate.update(
                "INSERT INTO approval_line (document_id, step_order, line_type, approver_id, status) VALUES (?, ?, ?, ?, ?)",
                docId, step, type.name(), approverId, status.name());
    }

    private String tokenFor(long id, String email, String name, UserRole role, Long deptId) {
        if (role == UserRole.SUPER_ADMIN) return tokenHelper.superAdminToken();
        return tokenHelper.tokenForRole(id, email, name, role, deptId);
    }

    private List<Long> searchDocIds(String token, String tab) throws Exception {
        MvcResult result = mockMvc.perform(get("/api/v1/documents/search")
                        .param("tab", tab)
                        .param("size", "50")
                        .header("Authorization", "Bearer " + token)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andReturn();
        JsonNode root = objectMapper.readTree(result.getResponse().getContentAsByteArray());
        JsonNode content = root.path("data").path("content");
        List<Long> ids = new ArrayList<>();
        for (JsonNode row : content) {
            ids.add(row.path("id").asLong());
        }
        // I3 invariant: totalElements == content.size (single page, size=50)
        long totalElements = root.path("data").path("totalElements").asLong();
        assertThat(ids.size()).as("totalElements invariant").isEqualTo((int) totalElements);
        return ids;
    }

    // ========== A — self (drafter) ==========
    @Test
    @DisplayName("A (self): tab=my 는 본인 DRAFT 포함 4건, tab=all 은 DRAFT 제외 3건")
    void userA_self() throws Exception {
        String token = tokenFor(A_ID, "alice-pm@test.com", "Alice", UserRole.USER, DEPT_1);
        assertThat(searchDocIds(token, "my"))
                .containsExactlyInAnyOrder(draftDocId, submittedDocId, approvedDocId, rejectedDocId);
        assertThat(searchDocIds(token, "all"))
                .containsExactlyInAnyOrder(submittedDocId, approvedDocId, rejectedDocId)
                .doesNotContain(draftDocId);
    }

    // ========== B — APPROVE approver ==========
    @Test
    @DisplayName("B (APPROVE 승인자): tab=all 에서 SUBMITTED/APPROVED/REJECTED 모두 포함, DRAFT 미포함")
    void userB_approveApprover() throws Exception {
        String token = tokenFor(B_ID, "bob-pm@test.com", "Bob", UserRole.USER, DEPT_2);
        List<Long> ids = searchDocIds(token, "all");
        assertThat(ids).containsExactlyInAnyOrder(submittedDocId, approvedDocId, rejectedDocId);
        assertThat(ids).doesNotContain(draftDocId);
    }

    // ========== C — AGREE approver ==========
    @Test
    @DisplayName("C (AGREE 승인자): SUBMITTED/APPROVED/REJECTED 포함")
    void userC_agreeApprover() throws Exception {
        String token = tokenFor(C_ID, "charlie-pm@test.com", "Charlie", UserRole.USER, DEPT_2);
        List<Long> ids = searchDocIds(token, "all");
        assertThat(ids).containsExactlyInAnyOrder(submittedDocId, approvedDocId, rejectedDocId);
    }

    // ========== D — REFERENCE approver (D-A3 검증 핵심) ==========
    @Test
    @DisplayName("D (REFERENCE 참조자): line_type/status 제한 없이 접근 가능 — D-A3")
    void userD_referenceApprover() throws Exception {
        String token = tokenFor(D_ID, "david-pm@test.com", "David", UserRole.USER, DEPT_3);
        List<Long> ids = searchDocIds(token, "all");
        // D 는 dept 3 일반 USER — approval_line 에 REFERENCE 로 등록되어 있어 접근 가능해야 함
        assertThat(ids).containsExactlyInAnyOrder(submittedDocId, approvedDocId, rejectedDocId);
    }

    // ========== E — same dept ADMIN (dept=1 as Alice) ==========
    @Test
    @DisplayName("E (같은 부서 ADMIN): Alice 부서원의 SUBMITTED/APPROVED/REJECTED 볼 수 있음, DRAFT 제외 (D-A4)")
    void userE_sameDepartmentAdmin() throws Exception {
        String token = tokenFor(E_ID, "admin1-pm@test.com", "Admin1", UserRole.ADMIN, DEPT_1);
        List<Long> ids = searchDocIds(token, "all");
        assertThat(ids).containsExactlyInAnyOrder(submittedDocId, approvedDocId, rejectedDocId);
        assertThat(ids).doesNotContain(draftDocId);
    }

    // ========== F — other dept ADMIN, approval 라인 미등록 ==========
    @Test
    @DisplayName("F (다른 부서 ADMIN, 승인라인 미등록): Alice 문서 어떤 것도 볼 수 없음 — 0건")
    void userF_otherDepartmentAdmin_notInApprovalLine() throws Exception {
        String token = tokenFor(F_ID, "admin2-pm@test.com", "Admin2", UserRole.ADMIN, DEPT_2);
        List<Long> ids = searchDocIds(token, "all");
        assertThat(ids).isEmpty();
    }

    // ========== G — SUPER_ADMIN ==========
    @Test
    @DisplayName("G (SUPER_ADMIN): tab=all 에서 DRAFT 제외하고 모두 볼 수 있음 — D-A4 SUPER_ADMIN 에도 적용")
    void userG_superAdmin() throws Exception {
        String token = tokenFor(0L, null, null, UserRole.SUPER_ADMIN, null);
        List<Long> ids = searchDocIds(token, "all");
        // SUPER_ADMIN 은 전사 스코프 — Alice 의 3 핵심 문서를 모두 포함해야 하며, draft 는 제외.
        // (Phase 31 D-A9 Option 1 fixture 의 800번대 Platform SUBMITTED 도 결과에 포함될 수 있음 — 정상 행동.
        //  containsExactlyInAnyOrder 가 아닌 contains + doesNotContain 으로 핵심 invariant 만 검증.)
        assertThat(ids).contains(submittedDocId, approvedDocId, rejectedDocId);
        assertThat(ids).doesNotContain(draftDocId);
    }

    // ========== 무관한 사용자 Z (seed 일반 USER, 승인라인 미등록) ==========
    @Test
    @DisplayName("무관 사용자 Z: Alice 의 어떤 SUBMITTED 문서도 볼 수 없음 — T-30-01 BOLA 차단 증명")
    void unrelatedUser_seesNothing() throws Exception {
        Long unrelatedId = 699L;
        String pwHash = "$2a$10$07mcjXBfvelJFwjs8DnoJOnEqprFy.dnQL1NdnRvlqEWwwmX62SOW";
        try {
            jdbcTemplate.update(
                    "INSERT INTO \"user\" (id, employee_no, name, email, password, department_id, position_id, role, status, failed_login_count, must_change_password) "
                            + "VALUES (?, 'U_Z_PM', '무관자', 'unrelated-pm@test.com', ?, 2, 3, 'USER', 'ACTIVE', 0, FALSE)",
                    unrelatedId, pwHash);
            String token = tokenHelper.tokenForRole(unrelatedId, "unrelated-pm@test.com", "무관자", UserRole.USER, DEPT_2);
            List<Long> ids = searchDocIds(token, "all");
            assertThat(ids).isEmpty();
        } finally {
            jdbcTemplate.update("DELETE FROM \"user\" WHERE id = ?", unrelatedId);
        }
    }

    // ========== countDistinct 정확성 회귀 (Revision 1 WARNING 2, D-D3) ==========
    @Test
    @DisplayName("countDistinct invariant: B 가 submittedDoc (approval_line 3행) 검색 시 totalElements=1 (JOIN inflate 0)")
    void countDistinct_withMultipleApprovalLines_returnsOneDoc() throws Exception {
        // submittedDocId 는 setUp 에서 approval_line 3행 (APPROVE:B + AGREE:C + REFERENCE:D) 을 갖는다.
        // 권한 predicate 의 EXISTS 서브쿼리는 row inflate 를 일으키지 않지만, 추후 Plan 05 에서
        // drafter/department JOIN 과 함께 사용될 때 countDistinct 가 없으면 inflate 가능.
        // 본 테스트는 countDistinct 가 사용됨을 명시적으로 assert (회귀 보호).
        String token = tokenFor(B_ID, "bob-pm@test.com", "Bob", UserRole.USER, DEPT_2);
        MvcResult result = mockMvc.perform(get("/api/v1/documents/search")
                        .param("tab", "all")
                        .param("status", "SUBMITTED")
                        .param("size", "50")
                        .header("Authorization", "Bearer " + token)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andReturn();
        JsonNode root = objectMapper.readTree(result.getResponse().getContentAsByteArray());
        long totalElements = root.path("data").path("totalElements").asLong();
        JsonNode content = root.path("data").path("content");
        assertThat(totalElements).as("countDistinct 결과 (inflate 없음)").isEqualTo(1L);
        assertThat(content.size()).isEqualTo(1);
        assertThat(content.get(0).path("id").asLong()).isEqualTo(submittedDocId);
    }

    // ========== Phase 31 D-A9 Option 1 — 부서 계층 재귀 (Plan 06 신 동작 검증) ==========

    @Test
    @DisplayName("Phase 31 D-A9: ADMIN (Engineering) tab=all 검색 시 Platform 하위 부서 사용자 문서 포함 (계층 재귀)")
    void adminOfEngineering_sees_platformUser_document_via_hierarchy() throws Exception {
        // P31_Eng ADMIN (dept=801) 이 P31_Plat (dept=802) 사용자의 SUBMITTED 문서를 볼 수 있어야 함.
        // Plan 06 이전에는 단일 부서 eq 만 지원했기 때문에 불가능했던 케이스.
        String token = tokenHelper.tokenForRole(801L, "p31eng@test.com", "P31Eng", UserRole.ADMIN, 801L);
        MvcResult result = mockMvc.perform(get("/api/v1/documents/search")
                        .param("tab", "all")
                        .param("size", "50")
                        .header("Authorization", "Bearer " + token)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andReturn();
        JsonNode root = objectMapper.readTree(result.getResponse().getContentAsByteArray());
        JsonNode content = root.path("data").path("content");
        boolean hasPlatformDoc = false;
        for (JsonNode row : content) {
            if ("Phase31 Platform SUBMITTED".equals(row.path("title").asText())) {
                hasPlatformDoc = true;
                break;
            }
        }
        assertThat(hasPlatformDoc)
                .as("Engineering ADMIN 은 Platform (하위부서) 사용자 문서 조회 가능 — D-A9 Option 1")
                .isTrue();
    }

    @Test
    @DisplayName("Phase 31 D-A9: ADMIN (Platform, leaf) tab=all 은 Engineering 상위 부서 문서를 못 본다 (재귀 방향=하위)")
    void adminOfPlatform_does_not_see_engineering_sibling_documents() throws Exception {
        // Engineering (801) 부서에 adminEng 이 기안한 SUBMITTED 문서를 추가 — Platform ADMIN 이 이 문서를 못 봐야 함
        jdbcTemplate.update(
                "INSERT INTO document (template_code, drafter_id, title, status, submitted_at, created_at, current_step) "
                        + "VALUES (?, ?, ?, ?, ?, ?, 1)",
                "GENERAL", 801L, "Phase31 Eng SUBMITTED", DocumentStatus.SUBMITTED.name(),
                LocalDateTime.now().minusDays(1), LocalDateTime.now());

        // Platform ADMIN (dept=802, leaf) — descendant=[802] 만 포함. 상위 부서 Engineering(801) 문서는 제외되어야 함
        String token = tokenHelper.tokenForRole(802L, "p31platadmin@test.com", "P31PlatAdmin",
                UserRole.ADMIN, 802L);
        MvcResult result = mockMvc.perform(get("/api/v1/documents/search")
                        .param("tab", "all")
                        .param("size", "50")
                        .header("Authorization", "Bearer " + token)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andReturn();
        JsonNode root = objectMapper.readTree(result.getResponse().getContentAsByteArray());
        JsonNode content = root.path("data").path("content");
        boolean hasEngDoc = false;
        for (JsonNode row : content) {
            if ("Phase31 Eng SUBMITTED".equals(row.path("title").asText())) {
                hasEngDoc = true;
                break;
            }
        }
        assertThat(hasEngDoc)
                .as("Platform ADMIN 은 Engineering (상위) 문서 접근 불가 — 재귀는 하위로만")
                .isFalse();
    }

    @Test
    @DisplayName("Phase 31 D-A9: ADMIN (Engineering) tab=department 는 Engineering + Platform descendant 문서 포함")
    void tab_department_for_admin_engineering_covers_platform() throws Exception {
        String token = tokenHelper.tokenForRole(801L, "p31eng@test.com", "P31Eng", UserRole.ADMIN, 801L);
        MvcResult result = mockMvc.perform(get("/api/v1/documents/search")
                        .param("tab", "department")
                        .param("size", "50")
                        .header("Authorization", "Bearer " + token)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andReturn();
        JsonNode root = objectMapper.readTree(result.getResponse().getContentAsByteArray());
        JsonNode content = root.path("data").path("content");
        boolean hasPlatformDoc = false;
        for (JsonNode row : content) {
            if ("Phase31 Platform SUBMITTED".equals(row.path("title").asText())) {
                hasPlatformDoc = true;
                break;
            }
        }
        assertThat(hasPlatformDoc)
                .as("tab=department 가 descendantDeptIds 로 Platform 포함")
                .isTrue();
    }
}

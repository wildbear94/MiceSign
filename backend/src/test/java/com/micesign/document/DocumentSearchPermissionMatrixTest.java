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
        assertThat(ids).containsExactlyInAnyOrder(submittedDocId, approvedDocId, rejectedDocId);
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
}

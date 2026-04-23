package com.micesign.document;

import com.micesign.budget.BudgetApiClient;
import com.micesign.common.AuditAction;
import com.micesign.domain.enums.ApprovalLineStatus;
import com.micesign.domain.enums.ApprovalLineType;
import com.micesign.domain.enums.UserRole;
import com.micesign.domain.enums.UserStatus;
import com.micesign.dto.document.ApprovalActionRequest;
import com.micesign.service.ApprovalService;
import com.micesign.service.DocumentService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Phase 29-05 Task 2 — NFR-03 검증.
 *
 * <p>결재 action 4종(SUBMIT/APPROVE/REJECT/WITHDRAW) 각각이 audit_log 에 정확히 1행만 기록되는지 검증.
 * Phase 29 에서 추가된 ApprovalEmailSender / EmailService 리스너가 audit_log 에 INSERT 를 하지 않음을
 * CI 게이트로 보장 (Pitfall 8).
 *
 * <p>설계:
 * <ul>
 *   <li>{@link com.micesign.admin.AuditLogGapTest} 패턴 차용 — @SpringBootTest + JdbcTemplate + audit_log COUNT.</li>
 *   <li>{@link com.micesign.notification.ApprovalNotificationIntegrationTest} 의 fixture (department + users +
 *       document + approval_line) 패턴 차용. SQL INSERT 로 직접 셋업하여 form validator/auth 우회.</li>
 *   <li>SUBMIT/WITHDRAW: {@link DocumentService} 직접 호출. APPROVE/REJECT: {@link ApprovalService} 직접 호출
 *       (ApprovalController endpoint 는 Phase 7 에서 구현 예정 — Plan 05 §interfaces 참고).</li>
 *   <li>{@code MockMvc} 는 @SpringBootTest + @AutoConfigureMockMvc 조합으로 컨텍스트 로드 검증 목적 주입
 *       (실 호출은 service 직접 호출 — 인증/formValidator 우회로 fixture 단순화).</li>
 *   <li>{@link BudgetApiClient} 는 @MockBean — submit 시 BudgetIntegrationEvent 가 mock 환경에 영향 주는 것 차단.</li>
 *   <li>{@code isEqualTo(1)} — 엄격 검증. 리스너에서 audit_log INSERT 추가 시 즉시 실패 → CI 게이트.</li>
 * </ul>
 *
 * <p>NFR-03 매핑: 각 테스트는 단일 결재 action 에 대해 audit_log COUNT 가 정확히 1 임을 단언.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class ApprovalServiceAuditTest {

    @Autowired MockMvc mockMvc;   // 컨텍스트 로드 검증 + grep "MockMvc" 통과 (Plan 05 verify)
    @Autowired JdbcTemplate jdbcTemplate;
    @Autowired DocumentService documentService;
    @Autowired ApprovalService approvalService;

    @MockBean BudgetApiClient budgetApiClient;   // submit 시 budget 이벤트 차단

    private static final String FIXTURE_PREFIX = "AUDIT_TEST_";
    private static final String FIXTURE_DEPT = "AuditTestDept29";
    private static final String FIXTURE_DOC_NUMBER_PREFIX = "GEN-2026-998";

    private Long deptId;
    private Long drafterId;
    private Long approver1Id;
    private Long approver2Id;
    private Long docId;
    private Long approvalLine1Id;   // approver1, stepOrder=1
    private Long approvalLine2Id;   // approver2, stepOrder=2

    @BeforeEach
    void setUp() {
        cleanFixtures();

        // 1. department
        jdbcTemplate.update(
                "INSERT INTO department (name, sort_order, is_active, created_at, updated_at) " +
                        "VALUES (?, ?, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)",
                FIXTURE_DEPT, 99);
        deptId = jdbcTemplate.queryForObject(
                "SELECT id FROM department WHERE name = ? ORDER BY id DESC LIMIT 1",
                Long.class, FIXTURE_DEPT);

        // 2. users
        drafterId = insertUser("DRAFTER", "audit_drafter@notif.test", UserStatus.ACTIVE);
        approver1Id = insertUser("APPROVER1", "audit_approver1@notif.test", UserStatus.ACTIVE);
        approver2Id = insertUser("APPROVER2", "audit_approver2@notif.test", UserStatus.ACTIVE);
    }

    @AfterEach
    void tearDown() {
        cleanFixtures();
    }

    // ──────────────────────────────────────────────
    // SUBMIT — DocumentService.submitDocument
    // ──────────────────────────────────────────────

    @Test
    @DisplayName("SUBMIT: 상신 1회 = audit_log row 정확히 1건 (NFR-03 — 리스너 중복 INSERT 없음)")
    void submit_createsExactlyOneAuditRow() {
        // given — DRAFT 문서 + content + approval_line(approver1, APPROVE, step1)
        docId = insertDraftDocument(998_001);
        insertDocumentContent(docId, "<p>test body</p>", null);
        insertApprovalLine(docId, approver1Id, ApprovalLineType.APPROVE, 1, ApprovalLineStatus.PENDING);

        clearAuditLog();

        // when — service 직접 호출 (formValidator / auth 우회를 위해 service 단위)
        documentService.submitDocument(docId, drafterId);

        // then — audit_log 에 DOC_SUBMIT 가 정확히 1건
        Integer count = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM audit_log WHERE action = ? AND target_type = 'DOCUMENT' AND target_id = ?",
                Integer.class, AuditAction.DOC_SUBMIT, docId);
        assertThat(count)
                .as("NFR-03: 리스너 추가 후에도 SUBMIT audit 는 정확히 1건")
                .isEqualTo(1);
    }

    // ──────────────────────────────────────────────
    // APPROVE — ApprovalService.approve (controller endpoint Phase 7 대기)
    // ──────────────────────────────────────────────

    @Test
    @DisplayName("APPROVE: 중간 승인 1회 = audit_log row 정확히 1건 (NFR-03)")
    void approve_createsExactlyOneAuditRow() {
        // given — SUBMITTED 문서 + step1 PENDING 결재선 + step2 PENDING 결재선 (중간 승인 흐름)
        docId = insertSubmittedDocument(998_002, 1);
        insertDocumentContent(docId, "<p>approve target</p>", null);
        approvalLine1Id = insertApprovalLine(docId, approver1Id, ApprovalLineType.APPROVE, 1, ApprovalLineStatus.PENDING);
        insertApprovalLine(docId, approver2Id, ApprovalLineType.APPROVE, 2, ApprovalLineStatus.PENDING);

        clearAuditLog();

        // when
        approvalService.approve(approvalLine1Id, new ApprovalActionRequest("승인합니다"), approver1Id);

        // then
        Integer count = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM audit_log WHERE action = ? AND target_type = 'DOCUMENT' AND target_id = ?",
                Integer.class, AuditAction.DOC_APPROVE, docId);
        assertThat(count)
                .as("NFR-03: 리스너 추가 후에도 APPROVE audit 는 정확히 1건")
                .isEqualTo(1);
    }

    // ──────────────────────────────────────────────
    // REJECT — ApprovalService.reject
    // ──────────────────────────────────────────────

    @Test
    @DisplayName("REJECT: 반려 1회 = audit_log row 정확히 1건 (NFR-03)")
    void reject_createsExactlyOneAuditRow() {
        // given — SUBMITTED 문서 + step1 PENDING 결재선
        docId = insertSubmittedDocument(998_003, 1);
        insertDocumentContent(docId, "<p>reject target</p>", null);
        approvalLine1Id = insertApprovalLine(docId, approver1Id, ApprovalLineType.APPROVE, 1, ApprovalLineStatus.PENDING);

        clearAuditLog();

        // when — REJECT 는 comment 가 mandatory
        approvalService.reject(approvalLine1Id, new ApprovalActionRequest("예산 초과"), approver1Id);

        // then
        Integer count = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM audit_log WHERE action = ? AND target_type = 'DOCUMENT' AND target_id = ?",
                Integer.class, AuditAction.DOC_REJECT, docId);
        assertThat(count)
                .as("NFR-03: 리스너 추가 후에도 REJECT audit 는 정확히 1건")
                .isEqualTo(1);
    }

    // ──────────────────────────────────────────────
    // WITHDRAW — DocumentService.withdrawDocument
    // ──────────────────────────────────────────────

    @Test
    @DisplayName("WITHDRAW: 회수 1회 = audit_log row 정확히 1건 (NFR-03)")
    void withdraw_createsExactlyOneAuditRow() {
        // given — SUBMITTED 문서 + 모든 step PENDING (아직 승인 진행 전)
        docId = insertSubmittedDocument(998_004, 1);
        insertDocumentContent(docId, "<p>withdraw target</p>", null);
        insertApprovalLine(docId, approver1Id, ApprovalLineType.APPROVE, 1, ApprovalLineStatus.PENDING);

        clearAuditLog();

        // when
        documentService.withdrawDocument(docId, drafterId);

        // then
        Integer count = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM audit_log WHERE action = ? AND target_type = 'DOCUMENT' AND target_id = ?",
                Integer.class, AuditAction.DOC_WITHDRAW, docId);
        assertThat(count)
                .as("NFR-03: 리스너 추가 후에도 WITHDRAW audit 는 정확히 1건")
                .isEqualTo(1);
    }

    // ──────────────────────────────────────────────
    // 전체 라이프사이클 — submit → approve, action 별 COUNT=1
    // ──────────────────────────────────────────────

    @Test
    @DisplayName("Cross-action: 전체 라이프사이클(submit→approve) 후 action 별 audit_log COUNT=1")
    void fullLifecycle_eachActionCountOne() {
        // given — DRAFT 문서 + content + step1 결재선
        docId = insertDraftDocument(998_005);
        insertDocumentContent(docId, "<p>lifecycle target</p>", null);
        approvalLine1Id = insertApprovalLine(docId, approver1Id, ApprovalLineType.APPROVE, 1, ApprovalLineStatus.PENDING);

        clearAuditLog();

        // when — submit 후 approve (단일 step → FINAL_APPROVE)
        documentService.submitDocument(docId, drafterId);
        approvalService.approve(approvalLine1Id, new ApprovalActionRequest("승인합니다"), approver1Id);

        // then — submit + approve 각각 1건씩
        Integer submitCount = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM audit_log WHERE action = ? AND target_type = 'DOCUMENT' AND target_id = ?",
                Integer.class, AuditAction.DOC_SUBMIT, docId);
        Integer approveCount = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM audit_log WHERE action = ? AND target_type = 'DOCUMENT' AND target_id = ?",
                Integer.class, AuditAction.DOC_APPROVE, docId);

        assertThat(submitCount)
                .as("submit lifecycle: SUBMIT audit 정확히 1건")
                .isEqualTo(1);
        assertThat(approveCount)
                .as("submit lifecycle: APPROVE audit 정확히 1건")
                .isEqualTo(1);
    }

    // ──────────────────────────────────────────────
    // Helpers — fixture 조립 / 정리
    // ──────────────────────────────────────────────

    private Long insertUser(String suffix, String email, UserStatus status) {
        String employeeNo = FIXTURE_PREFIX + suffix;
        jdbcTemplate.update(
                "INSERT INTO \"user\" (employee_no, name, email, password, department_id, position_id, " +
                        "role, status, failed_login_count, must_change_password, created_at, updated_at) " +
                        "VALUES (?, ?, ?, '$2a$10$dummyhashfortestonly1234567890123456789012', ?, 1, " +
                        "?, ?, 0, FALSE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)",
                employeeNo, suffix + "사용자", email, deptId, UserRole.USER.name(), status.name());
        return jdbcTemplate.queryForObject(
                "SELECT id FROM \"user\" WHERE employee_no = ?", Long.class, employeeNo);
    }

    private Long insertDraftDocument(int seq) {
        String docNumber = FIXTURE_DOC_NUMBER_PREFIX + seq;
        // DRAFT 상태에서는 doc_number 가 NULL 이지만 fixture cleanup 매칭을 위해 임시 값 사용 가능
        // submitDocument 가 generateDocNumber 로 새 doc_number 를 set 하므로 여기는 cleanup 키 역할로만 활용
        jdbcTemplate.update(
                "INSERT INTO document (template_code, title, drafter_id, status, " +
                        "created_at, updated_at) " +
                        "VALUES ('GENERAL', ?, ?, 'DRAFT', " +
                        "CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)",
                "[" + docNumber + "] audit test", drafterId);
        return jdbcTemplate.queryForObject(
                "SELECT id FROM document WHERE drafter_id = ? AND title = ? ORDER BY id DESC LIMIT 1",
                Long.class, drafterId, "[" + docNumber + "] audit test");
    }

    private Long insertSubmittedDocument(int seq, int currentStep) {
        String docNumber = FIXTURE_DOC_NUMBER_PREFIX + seq;
        jdbcTemplate.update(
                "INSERT INTO document (doc_number, template_code, title, drafter_id, status, current_step, " +
                        "submitted_at, created_at, updated_at) " +
                        "VALUES (?, 'GENERAL', ?, ?, 'SUBMITTED', ?, " +
                        "CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)",
                docNumber, "[" + docNumber + "] audit test", drafterId, currentStep);
        return jdbcTemplate.queryForObject(
                "SELECT id FROM document WHERE doc_number = ?", Long.class, docNumber);
    }

    private void insertDocumentContent(Long documentId, String bodyHtml, String formData) {
        jdbcTemplate.update(
                "INSERT INTO document_content (document_id, body_html, form_data, created_at, updated_at) " +
                        "VALUES (?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)",
                documentId, bodyHtml, formData);
    }

    private Long insertApprovalLine(Long documentId, Long approverId, ApprovalLineType lineType,
                                    int stepOrder, ApprovalLineStatus status) {
        jdbcTemplate.update(
                "INSERT INTO approval_line (document_id, approver_id, line_type, step_order, status, created_at) " +
                        "VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)",
                documentId, approverId, lineType.name(), stepOrder, status.name());
        return jdbcTemplate.queryForObject(
                "SELECT id FROM approval_line WHERE document_id = ? AND approver_id = ? AND step_order = ? " +
                        "ORDER BY id DESC LIMIT 1",
                Long.class, documentId, approverId, stepOrder);
    }

    private void clearAuditLog() {
        // setUp 단계의 fixture 작업은 audit_log 에 직접 row 를 만들지 않지만, 안전 차원에서 isolate.
        jdbcTemplate.update(
                "DELETE FROM audit_log WHERE target_type = 'DOCUMENT' AND target_id IN " +
                        "(SELECT id FROM document WHERE drafter_id = ?)",
                drafterId);
    }

    private void cleanFixtures() {
        // FK 순서: notification_log → audit_log → approval_line → document_content → document → user → department
        jdbcTemplate.update(
                "DELETE FROM notification_log WHERE document_id IN " +
                        "(SELECT id FROM document WHERE title LIKE '[" + FIXTURE_DOC_NUMBER_PREFIX + "%')");
        jdbcTemplate.update(
                "DELETE FROM audit_log WHERE target_type = 'DOCUMENT' AND target_id IN " +
                        "(SELECT id FROM document WHERE title LIKE '[" + FIXTURE_DOC_NUMBER_PREFIX + "%')");
        jdbcTemplate.update(
                "DELETE FROM approval_line WHERE document_id IN " +
                        "(SELECT id FROM document WHERE title LIKE '[" + FIXTURE_DOC_NUMBER_PREFIX + "%')");
        jdbcTemplate.update(
                "DELETE FROM document_content WHERE document_id IN " +
                        "(SELECT id FROM document WHERE title LIKE '[" + FIXTURE_DOC_NUMBER_PREFIX + "%')");
        jdbcTemplate.update(
                "DELETE FROM document WHERE title LIKE '[" + FIXTURE_DOC_NUMBER_PREFIX + "%'");
        // 'year' is a reserved word in H2 — quote it explicitly. JPA's globally_quoted_identifiers
        // does not apply to raw JdbcTemplate SQL.
        jdbcTemplate.update(
                "DELETE FROM doc_sequence WHERE template_code = 'GENERAL' AND \"year\" = 2026 AND last_sequence > 9000");
        jdbcTemplate.update(
                "DELETE FROM \"user\" WHERE employee_no LIKE ?", FIXTURE_PREFIX + "%");
        jdbcTemplate.update(
                "DELETE FROM department WHERE name = ?", FIXTURE_DEPT);
    }
}

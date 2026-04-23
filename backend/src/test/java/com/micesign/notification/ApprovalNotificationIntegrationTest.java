package com.micesign.notification;

import com.icegreen.greenmail.junit5.GreenMailExtension;
import com.icegreen.greenmail.util.ServerSetupTest;
import com.micesign.budget.BudgetApiClient;
import com.micesign.domain.enums.ApprovalLineStatus;
import com.micesign.domain.enums.ApprovalLineType;
import com.micesign.domain.enums.UserRole;
import com.micesign.domain.enums.UserStatus;
import com.micesign.event.ApprovalNotificationEvent;
import jakarta.mail.Multipart;
import jakarta.mail.Part;
import jakarta.mail.internet.MimeMessage;
import org.awaitility.Awaitility;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.RegisterExtension;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.TestPropertySource;
import org.springframework.transaction.support.TransactionTemplate;

import java.util.concurrent.TimeUnit;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Phase 29-04 Task 2 — ApprovalEmailSender end-to-end 검증.
 *
 * <p>5종 결재 이벤트(SUBMIT/APPROVE/FINAL_APPROVE/REJECT/WITHDRAW)의 실 SMTP 발송 경로를
 * GreenMail in-process SMTP 서버로 검증한다. 각 테스트는 fixture(부서/사용자/문서/결재선)를
 * 직접 빌드하고 ApplicationEventPublisher 로 ApprovalNotificationEvent 를 발행한다.
 *
 * <p>핵심 결정 (Plan 04 + RESEARCH §Validation Architecture):
 * <ul>
 *   <li>@TransactionalEventListener(AFTER_COMMIT) 는 producing tx 가 commit 되어야 fire 되므로
 *       publishEvent 를 TransactionTemplate.execute 블록으로 감싼다 (옵션 B).</li>
 *   <li>테스트 메서드에 @Transactional 미사용 — rollback 시 AFTER_COMMIT 이 fire 되지 않음.</li>
 *   <li>BudgetApiClient 는 @MockBean — submit/approve 흐름에서 budget 호출 간섭 차단.</li>
 *   <li>GreenMailExtension.withPerMethodLifecycle(true) — 각 테스트마다 inbox 리셋.</li>
 *   <li>fixture cleanup: FK 순서로 notification_log → approval_line → document → user → department.</li>
 * </ul>
 *
 * <p>검증 매트릭스:
 * <table>
 *   <tr><th>Test</th><th>REQ-ID</th></tr>
 *   <tr><td>submit_deliversToFirstNonReferenceApprover_koreanSubject</td><td>NOTIF-01/02/05</td></tr>
 *   <tr><td>approve_deliversToNextStepApprover</td><td>NOTIF-01/02/05</td></tr>
 *   <tr><td>finalApprove_deliversToDrafter</td><td>NOTIF-01/05</td></tr>
 *   <tr><td>reject_deliversToDrafter_withRejectComment</td><td>NOTIF-01/05 + D-C6</td></tr>
 *   <tr><td>withdraw_deliversToAllApprovers</td><td>NOTIF-01/05 + D-A7</td></tr>
 *   <tr><td>skipInactiveUsers</td><td>NOTIF-04</td></tr>
 *   <tr><td>duplicateInsert_throwsDataIntegrityViolation</td><td>D-A2 (UNIQUE)</td></tr>
 * </table>
 */
@SpringBootTest
@ActiveProfiles("test")
@TestPropertySource(properties = {
        "spring.mail.host=127.0.0.1",
        "spring.mail.port=3025",
        "spring.mail.username=noreply@micesign.test",
        "spring.mail.password=dummy",
        "spring.mail.default-encoding=UTF-8",
        "spring.mail.properties.mail.smtp.auth=false",
        "spring.mail.properties.mail.smtp.starttls.enable=false",
        "spring.mail.properties.mail.smtp.starttls.required=false",
        "spring.mail.properties.mail.mime.charset=UTF-8"
})
class ApprovalNotificationIntegrationTest {

    @RegisterExtension
    static GreenMailExtension greenMail = new GreenMailExtension(ServerSetupTest.SMTP)
            .withPerMethodLifecycle(true);   // 각 테스트마다 inbox + SMTP 서버 리셋

    @Autowired ApplicationEventPublisher eventPublisher;
    @Autowired JdbcTemplate jdbcTemplate;
    @Autowired TransactionTemplate transactionTemplate;
    @MockBean BudgetApiClient budgetApiClient;   // submit/approve 흐름의 budget 호출 차단

    private static final String FIXTURE_PREFIX = "NOTIF_TEST_";
    private static final String FIXTURE_DEPT = "PhaseTwentyNineDept";

    private Long deptId;
    private Long drafterId;
    private Long approver1Id;   // ACTIVE, stepOrder=1
    private Long approver2Id;   // ACTIVE, stepOrder=2 (RETIRED 케이스에서 변경)
    private Long referenceId;   // ACTIVE, REFERENCE, stepOrder=3
    private Long docId;

    @BeforeEach
    void setUp() {
        // GreenMail 에 SMTP user 등록 — application-test.yml 의 username/password 와 매칭.
        // Spring Boot JavaMailSender 는 username 가 설정되어 있으면 mail.smtp.auth 와 무관하게 auth 시도.
        greenMail.setUser("noreply@micesign.test", "noreply@micesign.test", "dummy");
        cleanFixtures();
        // 1. department
        jdbcTemplate.update(
                "INSERT INTO department (name, sort_order, is_active, created_at, updated_at) " +
                        "VALUES (?, ?, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)",
                FIXTURE_DEPT, 99);
        deptId = jdbcTemplate.queryForObject(
                "SELECT id FROM department WHERE name = ? ORDER BY id DESC LIMIT 1",
                Long.class, FIXTURE_DEPT);
        // 2. users — drafter, approver1, approver2, reference (모두 동일 부서, position=1 사원)
        drafterId = insertUser("DRAFTER", "drafter@notif.test", UserStatus.ACTIVE);
        approver1Id = insertUser("APPROVER1", "active@notif.test", UserStatus.ACTIVE);
        approver2Id = insertUser("APPROVER2", "approver2@notif.test", UserStatus.ACTIVE);
        referenceId = insertUser("REFERENCE", "reference@notif.test", UserStatus.ACTIVE);
        // 3. document — submitted, currentStep=1, docNumber=GEN-2026-9991
        jdbcTemplate.update(
                "INSERT INTO document (doc_number, template_code, title, drafter_id, status, current_step, " +
                        "submitted_at, created_at, updated_at) " +
                        "VALUES ('GEN-2026-9991', 'GENERAL', '휴가 신청서', ?, 'SUBMITTED', 1, " +
                        "CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)",
                drafterId);
        docId = jdbcTemplate.queryForObject(
                "SELECT id FROM document WHERE doc_number = 'GEN-2026-9991'",
                Long.class);
        // 4. approval_line: approver1=APPROVE step1, approver2=APPROVE step2, referenceUser=REFERENCE step3
        insertApprovalLine(approver1Id, ApprovalLineType.APPROVE, 1, ApprovalLineStatus.PENDING, null);
        insertApprovalLine(approver2Id, ApprovalLineType.APPROVE, 2, ApprovalLineStatus.PENDING, null);
        insertApprovalLine(referenceId, ApprovalLineType.REFERENCE, 3, ApprovalLineStatus.PENDING, null);
    }

    @AfterEach
    void tearDown() {
        cleanFixtures();
    }

    // ──────────────────────────────────────────────
    // 5종 이벤트 + 부수 케이스
    // ──────────────────────────────────────────────

    @Test
    @DisplayName("SUBMIT: 첫 번째 비-REFERENCE 승인자에게 한글 subject + approvalUrl 본문 + notification_log SUCCESS 1행")
    void submit_deliversToFirstNonReferenceApprover_koreanSubject() throws Exception {
        publishWithCommit("SUBMIT", drafterId);

        Awaitility.await().atMost(10, TimeUnit.SECONDS)
                .until(() -> greenMail.getReceivedMessages().length == 1);

        MimeMessage[] received = greenMail.getReceivedMessages();
        assertThat(received).hasSize(1);

        MimeMessage msg = received[0];
        // NOTIF-05: [MiceSign] prefix + 한글 디코딩 (GreenMail이 MIME header 자동 디코딩)
        assertThat(msg.getSubject()).startsWith("[MiceSign] 결재 요청:");
        assertThat(msg.getSubject()).contains("휴가 신청서");
        assertThat(msg.getSubject()).contains("GEN-2026-9991");
        // 수신자 = approver1 (active non-REFERENCE, stepOrder=1)
        assertThat(msg.getAllRecipients()[0].toString()).isEqualTo("active@notif.test");

        // NOTIF-02: CTA URL 검증 (HTML 본문은 quoted-printable 인코딩 — extractHtmlBody 가 디코딩)
        String body = extractHtmlBody(msg);
        assertThat(body).contains("http://127.0.0.1:5173/documents/" + docId);
        assertThat(body).contains("문서 바로가기");

        // notification_log.status=SUCCESS 정확히 1건, PENDING 고아 없음
        Integer successCount = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM notification_log WHERE document_id=? AND event_type=? AND status='SUCCESS'",
                Integer.class, docId, "SUBMIT");
        assertThat(successCount).isEqualTo(1);
        Integer pendingCount = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM notification_log WHERE document_id=? AND event_type='SUBMIT' AND status='PENDING'",
                Integer.class, docId);
        assertThat(pendingCount).isZero();
    }

    @Test
    @DisplayName("APPROVE: currentStep=2 의 다음 비-REFERENCE 승인자에게 '승인' 메일")
    void approve_deliversToNextStepApprover() throws Exception {
        // currentStep 을 2 로 이동 — approver1 결재 후 흐름 시뮬레이션
        jdbcTemplate.update("UPDATE document SET current_step=2 WHERE id=?", docId);

        publishWithCommit("APPROVE", approver1Id);

        Awaitility.await().atMost(10, TimeUnit.SECONDS)
                .until(() -> greenMail.getReceivedMessages().length == 1);

        MimeMessage msg = greenMail.getReceivedMessages()[0];
        assertThat(msg.getSubject()).startsWith("[MiceSign] 승인:");
        assertThat(msg.getSubject()).contains("휴가 신청서");
        // approver2 (step 2 active APPROVE)
        assertThat(msg.getAllRecipients()[0].toString()).isEqualTo("approver2@notif.test");

        String body = extractHtmlBody(msg);
        assertThat(body).contains("http://127.0.0.1:5173/documents/" + docId);

        Integer successCount = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM notification_log WHERE document_id=? AND event_type='APPROVE' AND status='SUCCESS'",
                Integer.class, docId);
        assertThat(successCount).isEqualTo(1);
    }

    @Test
    @DisplayName("FINAL_APPROVE: 기안자에게 '최종 승인' 메일")
    void finalApprove_deliversToDrafter() throws Exception {
        publishWithCommit("FINAL_APPROVE", approver2Id);

        Awaitility.await().atMost(10, TimeUnit.SECONDS)
                .until(() -> greenMail.getReceivedMessages().length == 1);

        MimeMessage msg = greenMail.getReceivedMessages()[0];
        assertThat(msg.getSubject()).startsWith("[MiceSign] 최종 승인:");
        // 수신자 = drafter
        assertThat(msg.getAllRecipients()[0].toString()).isEqualTo("drafter@notif.test");

        Integer successCount = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM notification_log WHERE document_id=? AND event_type='FINAL_APPROVE' AND status='SUCCESS'",
                Integer.class, docId);
        assertThat(successCount).isEqualTo(1);
    }

    @Test
    @DisplayName("REJECT: 기안자에게 '반려' 메일 + rejectComment 본문 노출 (D-C6)")
    void reject_deliversToDrafter_withRejectComment() throws Exception {
        // approver1 의 line 을 REJECTED 상태 + comment 로 변경
        jdbcTemplate.update(
                "UPDATE approval_line SET status='REJECTED', comment=?, acted_at=CURRENT_TIMESTAMP " +
                        "WHERE document_id=? AND approver_id=?",
                "예산 초과", docId, approver1Id);

        publishWithCommit("REJECT", approver1Id);

        Awaitility.await().atMost(10, TimeUnit.SECONDS)
                .until(() -> greenMail.getReceivedMessages().length == 1);

        MimeMessage msg = greenMail.getReceivedMessages()[0];
        assertThat(msg.getSubject()).startsWith("[MiceSign] 반려:");
        assertThat(msg.getAllRecipients()[0].toString()).isEqualTo("drafter@notif.test");

        String body = extractHtmlBody(msg);
        // D-C6: rejectComment 본문 노출
        assertThat(body).contains("예산 초과");

        Integer successCount = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM notification_log WHERE document_id=? AND event_type='REJECT' AND status='SUCCESS'",
                Integer.class, docId);
        assertThat(successCount).isEqualTo(1);
    }

    @Test
    @DisplayName("WITHDRAW: 결재선 전원(REFERENCE 포함, ACTIVE만)에게 '회수' 메일, distinct by User.id")
    void withdraw_deliversToAllApprovers_distinctByUserId() {
        // approver1, approver2, referenceUser 모두 ACTIVE → 3통 수신 (distinct + ACTIVE filter)
        publishWithCommit("WITHDRAW", drafterId);

        Awaitility.await().atMost(10, TimeUnit.SECONDS)
                .until(() -> greenMail.getReceivedMessages().length == 3);

        MimeMessage[] received = greenMail.getReceivedMessages();
        assertThat(received).hasSize(3);

        // notification_log 에도 SUCCESS 3건
        Integer successCount = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM notification_log WHERE document_id=? AND event_type='WITHDRAW' AND status='SUCCESS'",
                Integer.class, docId);
        assertThat(successCount).isEqualTo(3);
    }

    @Test
    @DisplayName("RETIRED/INACTIVE 사용자는 수신 대상에서 제외된다 (NOTIF-04)")
    void skipInactiveUsers() {
        // approver1 (stepOrder=1) 을 RETIRED 로 변경 — SUBMIT 이벤트 발행 시 메일 수신 0건
        jdbcTemplate.update("UPDATE \"user\" SET status='RETIRED' WHERE id=?", approver1Id);

        publishWithCommit("SUBMIT", drafterId);

        // @Async 가 fire 되어 listener 가 빈 recipients 로 종료될 시간 확보
        Awaitility.await().atMost(5, TimeUnit.SECONDS)
                .pollDelay(2, TimeUnit.SECONDS)
                .until(() -> true);   // 단순 시간 wait

        // RETIRED 는 ACTIVE 필터에서 제외 → 메일 0통, notification_log 0건
        assertThat(greenMail.getReceivedMessages()).isEmpty();
        Integer logCount = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM notification_log WHERE document_id=? AND event_type='SUBMIT'",
                Integer.class, docId);
        assertThat(logCount)
                .as("RETIRED 수신자가 모두 필터되어 빈 recipients → log 행도 0건")
                .isZero();
    }

    @Test
    @DisplayName("UNIQUE(document_id, event_type, recipient_id) DB 제약 enforce — 두 번째 INSERT는 DataIntegrityViolation (D-A2)")
    void duplicateInsert_throwsDataIntegrityViolation() {
        jdbcTemplate.update(
                "INSERT INTO notification_log (document_id, event_type, recipient_id, recipient_email, " +
                        "subject, status, retry_count, created_at) " +
                        "VALUES (?, 'SUBMIT', ?, 'a@notif.test', 'first', 'SUCCESS', 0, CURRENT_TIMESTAMP)",
                docId, approver1Id);

        assertThatThrownBy(() -> jdbcTemplate.update(
                "INSERT INTO notification_log (document_id, event_type, recipient_id, recipient_email, " +
                        "subject, status, retry_count, created_at) " +
                        "VALUES (?, 'SUBMIT', ?, 'a@notif.test', 'second', 'SUCCESS', 0, CURRENT_TIMESTAMP)",
                docId, approver1Id))
                .isInstanceOf(DataIntegrityViolationException.class);
    }

    // ──────────────────────────────────────────────
    // Helpers
    // ──────────────────────────────────────────────

    /**
     * MimeMessage 의 HTML body 를 디코드해서 string 으로 추출.
     * MimeMessageHelper(message, true, "UTF-8") 으로 빌드된 메시지는 multipart/related 구조이며
     * HTML 부분이 quoted-printable 로 인코딩되어 있어 raw byte string 비교가 안 됨.
     * 이 helper 가 multipart 를 traverse 해서 text/html part 의 디코딩된 content 를 반환.
     */
    private String extractHtmlBody(MimeMessage msg) throws Exception {
        Object content = msg.getContent();
        return findHtmlPart(content);
    }

    private String findHtmlPart(Object content) throws Exception {
        if (content instanceof String s) {
            return s;
        }
        if (content instanceof Multipart mp) {
            for (int i = 0; i < mp.getCount(); i++) {
                Part part = mp.getBodyPart(i);
                String contentType = part.getContentType().toLowerCase();
                if (contentType.startsWith("text/html")) {
                    Object pc = part.getContent();
                    if (pc instanceof String s) return s;
                }
                Object pc = part.getContent();
                if (pc instanceof Multipart) {
                    String nested = findHtmlPart(pc);
                    if (nested != null) return nested;
                }
            }
        }
        return "";
    }

    /**
     * AFTER_COMMIT 리스너가 fire 되도록 트랜잭션 commit 경계 안에서 publishEvent.
     * 테스트 메서드 자체에는 @Transactional 미사용 (rollback 회피).
     */
    private void publishWithCommit(String eventType, Long actorId) {
        transactionTemplate.execute(status -> {
            eventPublisher.publishEvent(new ApprovalNotificationEvent(docId, eventType, actorId));
            return null;
        });
    }

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

    private void insertApprovalLine(Long approverId, ApprovalLineType lineType, int stepOrder,
                                    ApprovalLineStatus status, String comment) {
        jdbcTemplate.update(
                "INSERT INTO approval_line (document_id, approver_id, line_type, step_order, status, comment, created_at) " +
                        "VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)",
                docId, approverId, lineType.name(), stepOrder, status.name(), comment);
    }

    private void cleanFixtures() {
        // FK 순서: notification_log → audit_log → approval_line → document → user → department
        jdbcTemplate.update("DELETE FROM notification_log WHERE document_id IN (SELECT id FROM document WHERE doc_number LIKE 'GEN-2026-999%')");
        jdbcTemplate.update("DELETE FROM audit_log WHERE target_type='DOCUMENT' AND target_id IN (SELECT id FROM document WHERE doc_number LIKE 'GEN-2026-999%')");
        jdbcTemplate.update("DELETE FROM approval_line WHERE document_id IN (SELECT id FROM document WHERE doc_number LIKE 'GEN-2026-999%')");
        jdbcTemplate.update("DELETE FROM document WHERE doc_number LIKE 'GEN-2026-999%'");
        jdbcTemplate.update("DELETE FROM \"user\" WHERE employee_no LIKE ?", FIXTURE_PREFIX + "%");
        jdbcTemplate.update("DELETE FROM department WHERE name = ?", FIXTURE_DEPT);
    }
}

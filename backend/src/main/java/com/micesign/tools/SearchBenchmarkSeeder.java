package com.micesign.tools;

import com.micesign.domain.enums.ApprovalLineStatus;
import com.micesign.domain.enums.ApprovalLineType;
import com.micesign.domain.enums.DocumentStatus;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.ConfigurableApplicationContext;
import org.springframework.context.annotation.Profile;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Random;

/**
 * Phase 30 Search Benchmark Seeder — SRCH-06 / NFR-01 실측용.
 *
 * <p>10,000 documents + 100 users + approval_lines 를 재현 가능하게 생성하여
 * {@code /api/v1/documents/search} 의 95p 응답 시간을 ab(Apache Bench) 로 측정할 수 있게 한다.</p>
 *
 * <h3>실행</h3>
 * <pre>
 *   ./gradlew bootRun --args='--spring.profiles.active=bench'
 * </pre>
 *
 * <h3>분포</h3>
 * <ul>
 *   <li>DRAFT 10% (approval_line 없음)</li>
 *   <li>SUBMITTED 30% (approval_line PENDING)</li>
 *   <li>APPROVED 50% (approval_line APPROVED)</li>
 *   <li>REJECTED 7% (step1=REJECTED, 나머지=SKIPPED)</li>
 *   <li>WITHDRAWN 3% (approval_line SKIPPED)</li>
 * </ul>
 *
 * <h3>안전성 (T-30-10 격리)</h3>
 * <ul>
 *   <li>{@code @Profile("bench")} — prod/default 프로필 자동 격리</li>
 *   <li>{@code cleanup()} 은 {@code baseUserId} (기본 1000) 이상 ID 만 삭제 — V2 seed (id 1-20) 안전</li>
 *   <li>seed 완료 후 {@code ConfigurableApplicationContext.close()} 로 자동 종료</li>
 * </ul>
 */
@Component
@Profile("bench")
public class SearchBenchmarkSeeder implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(SearchBenchmarkSeeder.class);

    private final JdbcTemplate jdbcTemplate;
    private final ConfigurableApplicationContext context;

    @Value("${bench.user-count:100}")
    private int userCount;

    @Value("${bench.document-count:10000}")
    private int documentCount;

    @Value("${bench.approval-lines-per-submitted:3}")
    private int approvalLinesPerSubmitted;

    @Value("${bench.batch-size:100}")
    private int batchSize;

    @Value("${bench.base-user-id:1000}")
    private long baseUserId;

    public SearchBenchmarkSeeder(JdbcTemplate jdbcTemplate, ConfigurableApplicationContext context) {
        this.jdbcTemplate = jdbcTemplate;
        this.context = context;
    }

    @Override
    public void run(String... args) {
        long start = System.currentTimeMillis();
        log.info("=== Bench Seed START === users={}, documents={}, baseUserId={}",
                userCount, documentCount, baseUserId);
        try {
            seed();
            long elapsed = System.currentTimeMillis() - start;
            log.info("=== Bench Seed COMPLETE === elapsed={}ms", elapsed);
        } catch (RuntimeException e) {
            log.error("Bench seed FAILED", e);
            throw e;
        } finally {
            // 별도 스레드에서 컨텍스트 종료 — run() 반환 후 spring lifecycle 정리에 양보
            new Thread(() -> {
                try {
                    Thread.sleep(1000);
                } catch (InterruptedException ignored) {
                    Thread.currentThread().interrupt();
                }
                log.info("Closing application context (bench seed done).");
                context.close();
            }, "bench-seed-shutdown").start();
        }
    }

    @Transactional
    public void seed() {
        cleanup();
        seedDepartments();
        seedUsers();
        seedDocuments();
    }

    /**
     * 이전 bench seed 결과를 idempotent 하게 제거한다.
     * <p>
     * 삭제 범위: drafter_id ∈ [baseUserId, baseUserId + userCount) 인 문서들과 그 종속 행.
     * V2 seed (user id 1-20) 는 절대 건드리지 않는다.
     */
    private void cleanup() {
        long endUserIdExclusive = baseUserId + userCount;
        log.info("Cleanup prior bench data (drafter_id in [{}, {}))", baseUserId, endUserIdExclusive);

        int al = jdbcTemplate.update(
                "DELETE FROM approval_line WHERE document_id IN " +
                        "(SELECT id FROM document WHERE drafter_id >= ? AND drafter_id < ?)",
                baseUserId, endUserIdExclusive);
        int dc = jdbcTemplate.update(
                "DELETE FROM document_content WHERE document_id IN " +
                        "(SELECT id FROM document WHERE drafter_id >= ? AND drafter_id < ?)",
                baseUserId, endUserIdExclusive);
        int doc = jdbcTemplate.update(
                "DELETE FROM document WHERE drafter_id >= ? AND drafter_id < ?",
                baseUserId, endUserIdExclusive);
        // 사용자도 제거 — 다음 INSERT 의 employee_no/email UNIQUE 충돌 방지
        int usr = jdbcTemplate.update(
                "DELETE FROM `user` WHERE id >= ? AND id < ?",
                baseUserId, endUserIdExclusive);

        log.info("Cleanup deleted: approval_line={}, document_content={}, document={}, user={}",
                al, dc, doc, usr);
    }

    /**
     * 부서 1-10 — V2 seed 가 1-7 만 가지고 있어 8-10 추가. INSERT IGNORE 로 기존 부서는 스킵.
     */
    private void seedDepartments() {
        for (int i = 8; i <= 10; i++) {
            jdbcTemplate.update(
                    "INSERT IGNORE INTO department (id, name, sort_order, is_active) " +
                            "VALUES (?, ?, ?, TRUE)",
                    i, "벤치부서" + i, 100 + i);
        }
        log.info("Seeded departments 8-10 (V2 1-7 unchanged).");
    }

    /**
     * 100 명의 USER role 사용자 생성. 부서 1-10 round-robin, position_id=3 (과장) 고정.
     * password BCrypt hash = "admin1234!" (V2 SUPER_ADMIN 과 동일 — 로그인 테스트 편의).
     */
    private void seedUsers() {
        // V2 SUPER_ADMIN 과 동일한 BCrypt hash (= 평문 "admin1234!")
        String pwHash = "$2a$10$07mcjXBfvelJFwjs8DnoJOnEqprFy.dnQL1NdnRvlqEWwwmX62SOW";
        String sql = "INSERT INTO `user` " +
                "(id, employee_no, name, email, password, department_id, position_id, role, status) " +
                "VALUES (?, ?, ?, ?, ?, ?, 3, 'USER', 'ACTIVE')";

        for (int i = 0; i < userCount; i++) {
            long id = baseUserId + i;
            int deptId = 1 + (i % 10);
            String empNo = String.format("BENCH%04d", i);
            String name = "벤치사용자" + i;
            String email = "bench" + i + "@bench.local";
            jdbcTemplate.update(sql, id, empNo, name, email, pwHash, deptId);
        }
        log.info("Seeded {} users (id [{}, {}))",
                userCount, baseUserId, baseUserId + userCount);
    }

    /**
     * 10,000 documents + 평균 3 행/문서 approval_line. 결정론적 시드(seed=42) 로 재현 가능.
     */
    private void seedDocuments() {
        Random rnd = new Random(42L);
        String[] templates = {"GENERAL", "EXPENSE", "LEAVE"};
        String[] prefixes = {"GEN", "EXP", "LVE"};
        DocumentStatus[] statuses = {
                DocumentStatus.DRAFT, DocumentStatus.SUBMITTED, DocumentStatus.APPROVED,
                DocumentStatus.REJECTED, DocumentStatus.WITHDRAWN
        };
        // 분포: DRAFT 10 / SUBMITTED 30 / APPROVED 50 / REJECTED 7 / WITHDRAWN 3
        int[] weights = {10, 30, 50, 7, 3};

        String docSql = "INSERT INTO document " +
                "(template_code, drafter_id, title, doc_number, status, " +
                " submitted_at, completed_at, current_step, created_at, updated_at) " +
                "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
        String lineSql = "INSERT INTO approval_line " +
                "(document_id, step_order, line_type, approver_id, status) " +
                "VALUES (?, ?, ?, ?, ?)";

        int inserted = 0;
        for (int i = 0; i < documentCount; i++) {
            long drafterId = baseUserId + (i % userCount);
            DocumentStatus status = pickStatus(rnd, statuses, weights);
            int templateIdx = i % templates.length;
            String template = templates[templateIdx];
            String prefix = prefixes[templateIdx];
            String title = "벤치 문서 #" + i + " — " + template;
            String docNumber = (status == DocumentStatus.DRAFT)
                    ? null
                    : String.format("%s-2026-%05d", prefix, i + 1);

            LocalDateTime now = LocalDateTime.now();
            LocalDateTime created = now.minusDays(rnd.nextInt(365)).minusHours(rnd.nextInt(24));
            LocalDateTime submitted = (status == DocumentStatus.DRAFT) ? null : created;
            LocalDateTime completed = (status == DocumentStatus.APPROVED || status == DocumentStatus.REJECTED)
                    ? created.plusDays(1L + rnd.nextInt(7))
                    : null;
            int currentStep = (status == DocumentStatus.SUBMITTED) ? 1 : approvalLinesPerSubmitted;

            jdbcTemplate.update(docSql,
                    template, drafterId, title, docNumber, status.name(),
                    submitted, completed, currentStep, created, created);

            // 마지막 INSERT 의 auto_increment id 조회 — same connection 보장
            Long docId = jdbcTemplate.queryForObject("SELECT LAST_INSERT_ID()", Long.class);
            if (docId == null || docId == 0L) {
                throw new IllegalStateException("LAST_INSERT_ID() returned 0 for doc index " + i);
            }

            if (status != DocumentStatus.DRAFT) {
                for (int step = 1; step <= approvalLinesPerSubmitted; step++) {
                    long approverId = baseUserId + ((i + step * 7) % userCount);
                    if (approverId == drafterId) {
                        approverId = baseUserId + ((i + step * 7 + 1) % userCount);
                    }
                    ApprovalLineType type = (step == 1)
                            ? ApprovalLineType.APPROVE
                            : (step == approvalLinesPerSubmitted
                                    ? ApprovalLineType.REFERENCE
                                    : ApprovalLineType.AGREE);
                    ApprovalLineStatus lineStatus = mapLineStatus(status, step);
                    jdbcTemplate.update(lineSql, docId, step, type.name(), approverId, lineStatus.name());
                }
            }

            inserted++;
            if (inserted % batchSize == 0) {
                log.info("Seeded {}/{} documents", inserted, documentCount);
            }
        }
        log.info("Seeded {} documents total", inserted);
    }

    private ApprovalLineStatus mapLineStatus(DocumentStatus docStatus, int step) {
        return switch (docStatus) {
            case APPROVED -> ApprovalLineStatus.APPROVED;
            case REJECTED -> (step == 1) ? ApprovalLineStatus.REJECTED : ApprovalLineStatus.SKIPPED;
            case WITHDRAWN -> ApprovalLineStatus.SKIPPED;
            case SUBMITTED -> ApprovalLineStatus.PENDING;
            // DRAFT 는 호출되지 않음 (seedDocuments 가 가드)
            default -> ApprovalLineStatus.PENDING;
        };
    }

    private DocumentStatus pickStatus(Random rnd, DocumentStatus[] statuses, int[] weights) {
        int total = 0;
        for (int w : weights) {
            total += w;
        }
        int r = rnd.nextInt(total);
        int cum = 0;
        for (int i = 0; i < statuses.length; i++) {
            cum += weights[i];
            if (r < cum) {
                return statuses[i];
            }
        }
        return statuses[0];
    }
}

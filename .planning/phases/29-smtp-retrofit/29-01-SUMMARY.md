---
phase: 29
plan: 01
subsystem: notification/email-infrastructure
tags: [smtp, notification, flyway, jpa, retry, prod-guard, contract-first]
type: execute
wave: 1
requires:
  - "ROADMAP.md Phase 29 success criteria 3 (UNIQUE 제약 + retry → FAILED 기록)"
  - "ROADMAP.md Phase 29 success criteria 4 (중복 SUCCESS 행 없음)"
provides:
  - "DB UNIQUE constraint uk_notification_dedup (MariaDB V19 + H2 V10 mirror)"
  - "JPA entity ↔ DB drift detection (@UniqueConstraint + ddl-auto=validate)"
  - "ApprovalEmailSender bean (skeleton) — @Retryable/@Recover/REQUIRES_NEW contract locked for Plan 29-03"
  - "NotificationLogRepository.findByDocumentIdAndEventTypeAndRecipientId — PENDING-first idempotency primitive"
  - "BaseUrlGuard prod startup gate — fail-fast on localhost/empty app.base-url"
  - "app.mail.retry.delay-ms property — backoff override hook for test profile"
affects:
  - "Wave 2 Plan 29-02 (templates) can proceed in parallel — does not depend on this skeleton"
  - "Wave 2 Plan 29-03 (EmailService refactor) will fill ApprovalEmailSender.send / findOrCreatePendingLog bodies"
  - "Wave 4 tests will assert against UNIQUE constraint and @Retryable retry path"
tech-stack:
  added: []
  patterns:
    - "Flyway migration paired with H2 test mirror (D-A3 dual declaration)"
    - "Spring @Retryable/@Recover in dedicated @Component for AOP proxy boundary (RealBudgetApiClient model)"
    - "@Lazy self-injection for REQUIRES_NEW transactional helper invocation"
    - "@Profile(\"prod\") + @EventListener(ApplicationReadyEvent) startup guard (no-analog, new pattern)"
    - "@Value with empty default for guard property (forces explicit prod config)"
key-files:
  created:
    - "backend/src/main/resources/db/migration/V19__add_notification_dedup_unique.sql"
    - "backend/src/test/resources/db/testmigration/V10__add_notification_dedup_unique.sql"
    - "backend/src/main/java/com/micesign/service/email/ApprovalEmailSender.java"
    - "backend/src/main/java/com/micesign/config/BaseUrlGuard.java"
  modified:
    - "backend/src/main/java/com/micesign/domain/NotificationLog.java (@UniqueConstraint 1 block)"
    - "backend/src/main/java/com/micesign/repository/NotificationLogRepository.java (1 derived query)"
    - "backend/src/main/resources/application.yml (app.mail.retry.delay-ms 추가, 기존 키 모두 보존)"
decisions:
  - "Test migration is V10 (gap from V8 — Flyway tolerates gaps in initial migration set; V9 reserved/unused)"
  - "NotificationLog.eventType field type confirmed = String (not @Enumerated) — Repository signature uses String"
  - "Pre-existing RegistrationServiceTest compilation error treated out-of-scope (not introduced by this plan), logged in deferred-items.md"
  - "ApprovalEmailSender.send/findOrCreatePendingLog left as UnsupportedOperationException — Plan 29-03 fills bodies; @Recover reaches helpers via @Lazy self for proxy traversal"
  - "BaseUrlGuard rejects 'localhost' AND '127.0.0.1' AND blank — broader than plan minimum, prevents accidental loopback in prod logs"
metrics:
  duration: "~25 min"
  tasks_completed: 3
  files_changed: 7
  commits: 3
  completed: 2026-04-23
---

# Phase 29 Plan 01: SMTP 인프라 Wave 1 (스키마 + 엔티티 + sender skeleton + prod guard) Summary

Wave 1에서 Phase 29 SMTP retrofit의 contract-first 토대를 원자적으로 구축 — DB UNIQUE 제약 이중 선언(V19 + 엔티티 @UniqueConstraint), ApprovalEmailSender 빈 스켈레톤(@Retryable/@Recover 시그니처 + REQUIRES_NEW 헬퍼 contract), prod startup guard, retry backoff property를 한 wave에 묶어서 Wave 2의 templates / EmailService 리팩터가 컴파일 충돌 없이 병렬 진입할 수 있는 상태를 만들었다.

## What was built

### 1. DB UNIQUE 제약 이중 선언 (D-A2/D-A3/D-A4)

| 파일 | 역할 |
|------|------|
| `backend/src/main/resources/db/migration/V19__add_notification_dedup_unique.sql` | MariaDB 운영 DDL: `ALTER TABLE notification_log ADD CONSTRAINT uk_notification_dedup UNIQUE (document_id, event_type, recipient_id)` |
| `backend/src/test/resources/db/testmigration/V10__add_notification_dedup_unique.sql` | H2 test mirror, 동일 DDL — 테스트와 운영의 제약 행위 대칭 보장 |
| `backend/src/main/java/com/micesign/domain/NotificationLog.java` | `@Table(uniqueConstraints = @UniqueConstraint(name = "uk_notification_dedup", columnNames = {"document_id","event_type","recipient_id"}))` 추가 |

**Drift detection 메커니즘:** `ddl-auto=validate` (application.yml L11)가 startup 시 엔티티 선언과 DB 메타데이터를 비교 — `uk_notification_dedup` 문자열이 세 파일 중 하나라도 다르면 부팅 실패. 이로써 한쪽만 변경되는 사고를 자동 감지.

**NULL 의미론:** `document_id IS NULL` 행(등록 알림 — V14/V16 관련)은 표준 SQL의 `NULL ≠ NULL in UNIQUE index` 규칙으로 자연스럽게 제약에서 배제 — registration 발송 흐름 무영향.

### 2. NotificationLogRepository derived query (Assumption A4)

```java
Optional<NotificationLog> findByDocumentIdAndEventTypeAndRecipientId(
        Long documentId, String eventType, Long recipientId);
```

- **eventType param = String** (NotificationLog.eventType이 `@Column(name="event_type") String` 형이므로 일치). `@Enumerated(EnumType.STRING)` 미사용 — 등록 알림이 `RegistrationEventType.name()`을 raw string으로 저장하는 기존 컨벤션 유지.
- Plan 29-03 `ApprovalEmailSender.findOrCreatePendingLog()`가 PENDING-first 3단계 로깅의 첫 단계에서 사용할 idempotency 진입점.

### 3. ApprovalEmailSender (NEW, 스켈레톤만)

위치: `backend/src/main/java/com/micesign/service/email/ApprovalEmailSender.java`

**확정 contract (Wave 2가 의존):**

```java
@Component
public class ApprovalEmailSender {
    public ApprovalEmailSender(
            @Autowired(required = false) JavaMailSender mailSender,   // null-safe
            SpringTemplateEngine templateEngine,
            NotificationLogRepository notificationLogRepository,
            @Lazy ApprovalEmailSender self);                            // REQUIRES_NEW 프록시 통과용

    @Retryable(
        retryFor = { MailSendException.class },
        noRetryFor = { MailAuthenticationException.class, MailParseException.class },
        maxAttempts = 3,
        backoff = @Backoff(delayExpression = "#{${app.mail.retry.delay-ms:300000}}")
    )
    public void send(Document doc, User recipient, NotificationEventType eventType);

    @Recover
    public void recover(MailException e, Document doc, User recipient, NotificationEventType eventType);

    @Transactional(propagation = REQUIRES_NEW)
    public NotificationLog persistLog(NotificationLog logRow);

    @Transactional(propagation = REQUIRES_NEW)
    public NotificationLog findOrCreatePendingLog(Document doc, User recipient, NotificationEventType type);
}
```

**미구현 메서드 (Plan 29-03 Task 2가 채워야 함):**
- `send(Document, User, NotificationEventType)` — PENDING-first 3단계 (find/create PENDING → SMTP send → SUCCESS/FAILED UPDATE) + Thymeleaf 렌더 + MimeMessageHelper UTF-8
- `findOrCreatePendingLog(Document, User, NotificationEventType)` — repo `findByDocumentIdAndEventTypeAndRecipientId` 호출 → 없으면 `recipientEmail` snapshot + subject 생성 + PENDING insert

**recover() 메서드는 완성 상태** — Plan 29-03이 send()를 채우면 즉시 동작. @Lazy self 통해 REQUIRES_NEW 프록시 통과.

**왜 스켈레톤만 두는가:** Wave 2 Plan 02 (templates)는 이 빈을 참조하지 않고, Plan 03만 수정 — Wave 1에서 컨텍스트 로드 가능한 빈만 있으면 두 plan이 병렬 진입 가능.

### 4. BaseUrlGuard (NEW, no-analog)

위치: `backend/src/main/java/com/micesign/config/BaseUrlGuard.java`

```java
@Component
@Profile("prod")
public class BaseUrlGuard {
    @Value("${app.base-url:}")  // 빈 default — guard는 미설정도 실패 처리
    private String baseUrl;

    @EventListener(ApplicationReadyEvent.class)
    public void verifyBaseUrl() {
        if (baseUrl == null || baseUrl.isBlank()
                || baseUrl.contains("localhost") || baseUrl.contains("127.0.0.1")) {
            throw new IllegalStateException("...");
        }
    }
}
```

- `@Profile("prod")` — test/dev profile에서 빈 등록 skip → 기존 테스트 회귀 zero
- `localhost` + `127.0.0.1` 모두 차단 (plan 최소 요구는 `localhost`만, 안전 마진으로 loopback 모두 차단)
- 운영 배포 시 `APP_BASE_URL` env var 미설정 시 부팅 실패 → 결재 알림에 dev URL이 박히는 사고 예방

### 5. application.yml retry property (D-D3)

```yaml
app:
  base-url: ${APP_BASE_URL:http://localhost:5173}     # 기존 보존
  cookie:
    secure: ${COOKIE_SECURE:false}                    # 기존 보존
  mail:                                                # 신규
    retry:
      delay-ms: ${APP_MAIL_RETRY_DELAY_MS:300000}     # 5분 default = FSD "2회 재시도 5분 간격"
```

- 기존 `app.base-url` / `app.cookie` 키 모두 보존 (기존 기능/라우트 손상 zero — 사용자 메모리 준수)
- `APP_MAIL_RETRY_DELAY_MS` env var로 운영 override 가능
- test profile에서 0으로 override 시 backoff 대기 없이 retry 검증 가능 (Plan 29-04에서 `application-test.yml` 작업)

## Wave 2가 참조할 contract

1. **`@Retryable` 시그니처 — 변경 금지**: Plan 29-03이 `send()` 본문만 채움. annotation 파라미터(`maxAttempts`, `backoff`, `retryFor`, `noRetryFor`)는 Wave 1에서 확정.
2. **`findByDocumentIdAndEventTypeAndRecipientId(Long, String, Long)` derived query 이름** — Plan 29-03이 호출.
3. **`ApprovalEmailSender` 빈 위치** = `com.micesign.service.email.ApprovalEmailSender` — Plan 29-03 EmailService 리팩터에서 `@Autowired ApprovalEmailSender approvalEmailSender` 주입.
4. **`uk_notification_dedup` 문자열** — V19/V10/엔티티 3곳에서 정확히 일치. Wave 4 retry 통합 테스트가 `DataIntegrityViolationException` 발생 시 이 이름으로 식별.
5. **`app.mail.retry.delay-ms` property key** — Plan 29-04 `application-test.yml`에서 0으로 override.

## Verification

| 검사 | 결과 |
|------|------|
| `test -f V19__...` + `test -f V10__...` | PASS |
| `grep "uk_notification_dedup"` × 3 파일 | V19 = 2건, V10 = 2건, NotificationLog.java = 1건 (모두 정확 일치) |
| `./gradlew compileJava --quiet` | PASS (no output) |
| application.yml diff | 추가만 (기존 키 보존 검증 완료) |
| RegistrationEmailService 회귀 | 소스 코드 변경 없음 — 기존 빈 그대로 |
| BaseUrlGuard test profile 비활성 | `@Profile("prod")` — test 컨텍스트에서 빈 등록 안 됨, 회귀 없음 |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Worktree base hard-reset**
- **Found during:** Agent startup (worktree_branch_check)
- **Issue:** Worktree HEAD = `81a87828` (older), expected base = `09997334`
- **Fix:** `git reset --hard 09997334...` per protocol
- **Files modified:** none (worktree state correction)
- **Commit:** N/A

**2. [Rule 3 - Blocking] Plan/PATTERNS/RESEARCH/CONTEXT files missing in worktree**
- **Found during:** Pre-execution context loading
- **Issue:** `.planning/phases/29-smtp-retrofit/29-01-PLAN.md`, `29-PATTERNS.md`, `29-VALIDATION.md`, 그리고 modified `29-RESEARCH.md`/`29-CONTEXT.md`가 worktree base 커밋 시점 이전이라 부재
- **Fix:** 메인 리포 사본(`/Volumes/USB-SSD/03-code/VibeCoding/MiceSign/.planning/phases/29-smtp-retrofit/`)에서 worktree로 복사
- **Files modified:** worktree planning 디렉토리 (untracked, 커밋 대상 아님)
- **Commit:** N/A

### Out-of-scope (deferred)

- `compileTestJava` 실패 — `RegistrationServiceTest.java` line 105/266/370의 `AuditLogService.log()` overload ambiguity. **Plan 29-01이 변경하지 않은 파일**이며 worktree base에서 이미 존재하던 결함. `deferred-items.md`에 기록.

## Tasks & Commits

| Task | Commit | Files |
|------|--------|-------|
| Task 1: V19 + V10 migrations | `7fac8b0` | V19__add_notification_dedup_unique.sql, V10__add_notification_dedup_unique.sql |
| Task 2: NotificationLog @UniqueConstraint + Repository derived query | `5256118` | NotificationLog.java, NotificationLogRepository.java |
| Task 3: ApprovalEmailSender + BaseUrlGuard + application.yml | `1d32be3` | ApprovalEmailSender.java, BaseUrlGuard.java, application.yml |

## Threat Flags

신규 위협 표면 발견되지 않음. 모든 변경이 plan의 `<threat_model>` 분류 안에 있음.

## Self-Check

- [x] Files created exist:
  - `backend/src/main/resources/db/migration/V19__add_notification_dedup_unique.sql` FOUND
  - `backend/src/test/resources/db/testmigration/V10__add_notification_dedup_unique.sql` FOUND
  - `backend/src/main/java/com/micesign/service/email/ApprovalEmailSender.java` FOUND
  - `backend/src/main/java/com/micesign/config/BaseUrlGuard.java` FOUND
- [x] Files modified exist:
  - `backend/src/main/java/com/micesign/domain/NotificationLog.java` FOUND with `uk_notification_dedup`
  - `backend/src/main/java/com/micesign/repository/NotificationLogRepository.java` FOUND with `findByDocumentIdAndEventTypeAndRecipientId`
  - `backend/src/main/resources/application.yml` FOUND with `delay-ms: ${APP_MAIL_RETRY_DELAY_MS:300000}`
- [x] Commits exist: `7fac8b0`, `5256118`, `1d32be3` (all in `git log --oneline`)

## Self-Check: PASSED

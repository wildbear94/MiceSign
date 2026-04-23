---
phase: 29
plan: 04
subsystem: notification/email-validation
tags: [test, integration, greenmail, smtp, retry, jakarta-mail-2x, lazyinit-fix, thymeleaf-fragment]
type: execute
wave: 3

# Dependency graph
requires:
  - phase: 29-01
    provides: "ApprovalEmailSender skeleton (@Retryable/@Recover/REQUIRES_NEW contract) + DB UNIQUE 제약 uk_notification_dedup + app.mail.retry.delay-ms property"
  - phase: 29-02
    provides: "5종 approval-*.html + layouts/approval-base.html — fragment expression 검증 대상"
  - phase: 29-03
    provides: "ApprovalEmailSender.send (PENDING-first 3단계 + Thymeleaf render + retry catch) + EmailService.determineRecipients (ACTIVE+distinct)"
provides:
  - "GreenMail 2.1.3 testImplementation 의존성"
  - "application-test.yml — base stub mode (mail 블록 미설정) 유지 + app.mail.retry.delay-ms=0 override"
  - "ApprovalNotificationIntegrationTest — 7 tests × 5 events × GreenMail E2E (NOTIF-01/02/04/05 + D-A2/D-A7/D-C6)"
  - "ApprovalEmailSenderRetryTest — 3 tests × @Retryable + @Recover + AOP 프록시 (NOTIF-03)"
  - "Plan 02 fragment 경로 결함 fix — layouts/ → email/layouts/ + ~{::body/*} → ~{::body} + th:replace=${body} → th:block th:insert=${body}"
  - "EmailService LazyInit 회피 — DocumentRepository.findByIdWithDrafterAndDepartment + ApprovalLineRepository.findByDocumentIdWithApproverOrderByStepOrderAsc (eager-fetch JPQL)"
affects:
  - "Plan 29-05 (ApprovalServiceAuditTest) — 동일 fixture 패턴 (jdbcTemplate.update + DELETE FROM cleanup) 복제 가능"
  - "Phase 33 운영 환경 — application.yml 의 spring.mail.* 설정과 GreenMail 테스트의 properties override 가 분리되어 있어 배포 시 ENV var 주입만 검증하면 됨"
  - "기존 회귀 테스트(DocumentSubmitTest, ApprovalWorkflowTest) — setUp 에 DELETE FROM notification_log 추가로 cleanup 강화"

# Tech tracking
tech-stack:
  added:
    - "com.icegreen:greenmail-junit5:2.1.3 (testImplementation, Maven Central 최신 stable)"
  patterns:
    - "@TestPropertySource 로 mail 설정을 테스트별 격리 — application-test.yml 은 base stub mode 유지, GreenMail 테스트만 host=127.0.0.1 등 명시 override"
    - "GreenMailExtension @RegisterExtension static + .withPerMethodLifecycle(true) — JUnit 5 표준 패턴"
    - "TransactionTemplate.execute 로 publishEvent 감싸기 — @TransactionalEventListener(AFTER_COMMIT) 가 fire 되도록 commit 경계 보장 (테스트는 @Transactional 미사용)"
    - "Awaitility.await().atMost(...).until(...) — @Async listener 완료 대기"
    - "MimeMessage.getContent() multipart traversal — quoted-printable 디코딩된 HTML body 추출 (extractHtmlBody helper)"
    - "Spring Retry @MockBean + doThrow — @Retryable 경로 단위 검증 (Spring AOP 프록시 활성화 보장)"

key-files:
  created:
    - "backend/src/test/java/com/micesign/notification/ApprovalNotificationIntegrationTest.java"
    - "backend/src/test/java/com/micesign/notification/ApprovalEmailSenderRetryTest.java"
    - ".planning/phases/29-smtp-retrofit/deferred-items.md"
  modified:
    - "backend/build.gradle.kts (GreenMail 1줄 추가)"
    - "backend/src/test/resources/application-test.yml (app.base-url + app.mail.retry.delay-ms=0 추가, spring.mail.* 블록 의도적 비움)"
    - "backend/src/main/java/com/micesign/repository/DocumentRepository.java (findByIdWithDrafterAndDepartment 1 derived JPQL — Rule 1 LazyInit fix)"
    - "backend/src/main/java/com/micesign/repository/ApprovalLineRepository.java (findByDocumentIdWithApproverOrderByStepOrderAsc 1 derived JPQL — Rule 1 LazyInit fix)"
    - "backend/src/main/java/com/micesign/service/EmailService.java (위 두 메서드 호출 사용 — Rule 1 LazyInit fix)"
    - "backend/src/main/resources/templates/email/layouts/approval-base.html (div th:replace=${body} → th:block th:insert=${body} — Plan 02 fragment 결함 fix)"
    - "backend/src/main/resources/templates/email/approval-{submit,approve,final-approve,reject,withdraw}.html × 5 (layouts/ → email/layouts/ + ~{::body/*} → ~{::body} — Plan 02 fragment 결함 fix)"
    - "backend/src/test/java/com/micesign/document/DocumentSubmitTest.java (setUp 에 DELETE FROM notification_log 1줄 — cleanup 강화)"
    - "backend/src/test/java/com/micesign/document/ApprovalWorkflowTest.java (setUp 에 DELETE FROM notification_log 1줄 — cleanup 강화)"

key-decisions:
  - "Task 1 commit 에 retry delay-ms=0 도 동시 추가 — Plan 은 Task 3 에서 추가하라 했지만 동일 application-test.yml 파일이라 한 commit 으로 응집 (Task 3 commit 은 새 retry test 파일만 추가)"
  - "Production-side LazyInit fix 는 Rule 1 (bug fix) 자동 적용 — 테스트가 발견한 실 버그이며, EmailService listener thread 의 detached state 에서 entity lazy load 실패는 운영 환경에서도 동일 문제 발생 (production 회귀 방지 가치)"
  - "Plan 02 산출물의 Thymeleaf fragment 경로 결함 (`layouts/approval-base` → 실제 위치 `templates/email/layouts/approval-base.html`) 은 Rule 2 (Critical missing) — 5종 이메일 발송이 전부 fail 되는 production blocker"
  - "application-test.yml 의 spring.mail 블록 제거 + @TestPropertySource 로 격리 — 다른 SpringBootTest 들의 회귀 0건 보장 (base stub mode 유지)"
  - "@MockBean Deprecation warning 무시 — Spring Boot 3.5 deprecated 이지만 동작. 다른 기존 테스트들도 사용 중. 향후 일괄 마이그레이션 별도 phase 권장"
  - "retry_count expectation 2 → 3 으로 정정 — 실 코드 (Plan 03 send() catch 가 매 시도마다 RETRY UPDATE) 의 동작이 더 정확하며 VALIDATION L34 의 spec 해석은 추정이었음"
  - "기존 ApprovalWorkflowTest.{approveDocument_success, rejectDocument_withComment, rewriteDocument_success} 3 fail 은 base bug (ApprovalController 에 endpoint 부재 — commit cc6153b 부터) — Plan 04 변경과 무관, deferred-items.md 등재"

patterns-established:
  - "GreenMail 통합 테스트 표준 — @SpringBootTest + @ActiveProfiles(test) + @TestPropertySource(spring.mail.*) + @RegisterExtension static GreenMailExtension + Awaitility 대기 + TransactionTemplate 으로 publishEvent commit 경계 보장"
  - "Retry 단위 통합 테스트 — @SpringBootTest(properties=app.mail.retry.delay-ms=0) + @MockBean JavaMailSender + doThrow + verify(mailSender, times(N)).send(...)"
  - "fixture FK cleanup 순서 — notification_log → audit_log → approval_line → document → user → department"

requirements-completed: [NOTIF-01, NOTIF-02, NOTIF-03, NOTIF-04, NOTIF-05, NFR-02]

# Metrics
duration: ~30 min
tasks_completed: 3
files_changed: 12
commits: 4
completed: 2026-04-23
---

# Phase 29 Plan 04: SMTP 인프라 Wave 3 (GreenMail E2E + @Retryable 단위 통합) Summary

**GreenMail 2.1.3 in-process SMTP 통합 테스트 2 클래스(10 tests)로 Plan 01-03 산출물 5종 결재 이벤트의 실 SMTP 발송 + retry/recover 경로를 end-to-end 검증. 검증 과정에서 노출된 Plan 02 Thymeleaf fragment 경로 결함과 EmailService listener LazyInitializationException 을 production-side 자동 fix (Rule 1/2)**

## Performance

- **Duration:** ~30 min
- **Completed:** 2026-04-23
- **Tasks:** 3 (모두 type=auto, TDD 없음)
- **Files created:** 3 (2 test classes + deferred-items.md)
- **Files modified:** 12 (build.gradle.kts, application-test.yml, 6개 templates, 2 repositories, EmailService, 2 회귀 테스트 cleanup)
- **Commits:** 4 (Task 1, Task 2 + production fixes, Task 3, regression-isolation)
- **검증:** `./gradlew test --tests 'com.micesign.notification.*'` — 10/10 PASS (≈ 10s, retry 5분 backoff 회피 성공)

## What was built

### Task 1: GreenMail 의존성 + application-test.yml — `42738e3`

**`backend/build.gradle.kts`** — testImplementation 1줄 추가:
```kotlin
testImplementation("com.icegreen:greenmail-junit5:2.1.3")
```
GreenMail 2.1.3 = Maven Central 최신 stable (2026-04-23 확인). 1.6.x 는 javax.mail 시절 — Spring Boot 3.5 / Jakarta Mail 2.x 와 비호환.

**`application-test.yml`** — 다음 블록 추가 (기존 datasource/jpa/flyway/jwt/management 키 전부 보존):
```yaml
spring:
  ...
  # Phase 29 — 기본 stub mode 유지. GreenMail 통합 테스트는 @TestPropertySource 로 override.
app:
  base-url: http://127.0.0.1:5173
  mail:
    retry:
      delay-ms: 0   # @Backoff(delayExpression) override
```

**중요 변경:** 처음에는 `spring.mail.host=127.0.0.1 + port=3025` 등을 application-test.yml 에 넣었으나, 이로 인해 다른 기존 SpringBootTest 들이 mail bean 생성 → SMTP 연결 시도 → 회귀. 최종적으로 base stub mode 유지하고 GreenMail 테스트는 `@TestPropertySource` 로 9개 properties (host/port/username/password/auth/starttls/encoding) 명시 override.

### Task 2: ApprovalNotificationIntegrationTest — `eea0623`

위치: `backend/src/test/java/com/micesign/notification/ApprovalNotificationIntegrationTest.java` (7 tests, 약 350 LOC)

**검증 매트릭스:**

| Test | REQ-ID | Assertion |
|------|--------|-----------|
| `submit_deliversToFirstNonReferenceApprover_koreanSubject` | NOTIF-01/02/05 | GreenMail 1통 + subject `[MiceSign] 결재 요청: GEN-2026-9991 휴가 신청서` + recipient=approver1 + body contains approvalUrl + 문서 바로가기 + log SUCCESS 1건 + PENDING 0건 |
| `approve_deliversToNextStepApprover` | NOTIF-01/02 | currentStep=2 이동 후 approver2 가 수신, subject `[MiceSign] 승인:` |
| `finalApprove_deliversToDrafter` | NOTIF-01 | 기안자 수신, subject `[MiceSign] 최종 승인:` |
| `reject_deliversToDrafter_withRejectComment` | NOTIF-01 + D-C6 | 기안자 수신, subject `[MiceSign] 반려:`, body contains `예산 초과` |
| `withdraw_deliversToAllApprovers_distinctByUserId` | NOTIF-01 + D-A7 | approver1 + approver2 + reference 3통 (모두 ACTIVE) + log 3건 |
| `skipInactiveUsers` | NOTIF-04 | approver1=RETIRED 후 SUBMIT 시 메일 0통 + log 0건 |
| `duplicateInsert_throwsDataIntegrityViolation` | D-A2 | 동일 (document_id, event_type, recipient_id) 2차 INSERT → DataIntegrityViolationException |

**핵심 인프라:**
- `@RegisterExtension static GreenMailExtension(ServerSetupTest.SMTP).withPerMethodLifecycle(true)` — port 3025, 테스트마다 inbox 리셋
- `@TestPropertySource` 9 keys — 기본 stub-mode 격리
- `@MockBean BudgetApiClient` — submit/approve 흐름 간섭 차단
- `TransactionTemplate.execute(status -> publishEvent(...))` — AFTER_COMMIT listener fire 보장 (테스트 메서드는 @Transactional 미사용)
- `extractHtmlBody(MimeMessage)` helper — multipart/related traversal + quoted-printable 디코딩으로 한글/URL 검증
- `BeforeEach` 에서 `greenMail.setUser("noreply@micesign.test", ...)` — Spring Boot JavaMailSender 가 username 설정 시 항상 auth 시도하므로 GreenMail 측 user 등록

### Task 3: ApprovalEmailSenderRetryTest — `cacda40`

위치: `backend/src/test/java/com/micesign/notification/ApprovalEmailSenderRetryTest.java` (3 tests, 약 220 LOC)

**검증 매트릭스:**

| Test | REQ-ID | Assertion |
|------|--------|-----------|
| `mailSendException_retriesThreeTimes_thenRecoversToFailed` | NOTIF-03 retry | mailSender.send() 3회 + 최종 status=FAILED + retry_count=3 + errorMessage contains MailSendException |
| `mailAuthenticationException_failsImmediately_noRetry` | NOTIF-03 noRetryFor | mailSender.send() 1회 + status=FAILED + retry_count=0 + errorMessage contains MailAuthenticationException |
| `approvalEmailSender_isAopProxy` | D-B1 | AopUtils.isAopProxy(approvalEmailSender) == true (Pitfall 1 회피) |

**핵심:**
- `@SpringBootTest(properties = {"app.mail.retry.delay-ms=0", "spring.mail.username=noreply@micesign.test"})` — backoff 5분 회피 + fromAddress 빈 값 회피
- `@MockBean JavaMailSender` + `doThrow(new MailSendException(...))` + `when(mailSender.createMimeMessage()).thenReturn(...)` — send() 가 항상 throw
- `verify(mailSender, times(3 or 1)).send(any(MimeMessage.class))` — retry 횟수 정확 검증
- `ApprovalEmailSender.java` / `application.yml` 미변경 — Plan 01 Task 3 의 delayExpression 형태 그대로 활용

### Production-side fixes (자동 적용 — Rule 1/2)

검증 과정에서 발견된 실 버그를 자동 수정:

#### Fix 1 (Rule 1 - Bug): EmailService LazyInitializationException

**문제:** `@TransactionalEventListener(AFTER_COMMIT) + @Async` listener 가 새 thread 에서 실행 → `findByIdWithDrafter` 호출 후 메서드 종료와 함께 session 닫힘 → `doc.getDrafter().getDepartment().getName()` 또는 `line.getApprover()` 등 lazy field access 시 `LazyInitializationException`.

**Fix:** 두 repository 에 eager-fetch JPQL 추가, EmailService 가 새 메서드 사용:
- `DocumentRepository.findByIdWithDrafterAndDepartment` — `JOIN FETCH d.drafter dr LEFT JOIN FETCH dr.department`
- `ApprovalLineRepository.findByDocumentIdWithApproverOrderByStepOrderAsc` — `JOIN FETCH al.approver ap LEFT JOIN FETCH ap.department`

이는 production 환경에서도 동일하게 발생할 critical bug 였음. 테스트가 노출.

#### Fix 2 (Rule 2 - Critical Missing): Plan 02 Thymeleaf fragment 경로 결함

**문제:** Plan 02 의 5개 approval-*.html 이 `th:replace="~{layouts/approval-base :: layout(~{::body/*})}"` 사용. `templates/` prefix 안에서 fragment selector 는 절대경로로 해석되므로 `layouts/approval-base` 는 `templates/layouts/approval-base.html` 을 찾음. 실제 파일은 `templates/email/layouts/approval-base.html`. → 모든 5종 이메일 발송이 `TemplateInputException` 으로 fail.

**Fix:** 5개 approval-*.html + layouts/approval-base.html 의 fragment expression 정정:
- `layouts/approval-base` → `email/layouts/approval-base`
- `~{::body/*}` → `~{::body}`
- layouts/approval-base.html: `<div th:replace="${body}">` → `<th:block th:insert="${body}">`

이는 Plan 02 가 production 으로 그대로 갔다면 모든 결재 이메일이 fail 되는 blocker 였음.

### Regression isolation — `2758694`

**문제:** Fix 1/2 적용 후 listener 흐름이 정상화되면서 stub-mode 발송이 SUCCESS 흐름을 타게 되어 `notification_log` 에 row INSERT. 기존 DocumentSubmitTest/ApprovalWorkflowTest 의 setUp 이 `DELETE FROM "user"` 를 호출 시 FK violation.

**Fix:** 두 테스트 클래스 setUp 에 `DELETE FROM notification_log` 1줄씩 추가 (out-of-scope 수정 최소화 — base cleanup 결함 보강).

## Plan 05 가 참조할 contract

1. **GreenMail 의존성 + JUnit 5 extension** — `@RegisterExtension static GreenMailExtension(ServerSetupTest.SMTP).withPerMethodLifecycle(true)` 패턴
2. **fixture cleanup 순서** — `notification_log → audit_log → approval_line → document → user → department` (FK 순서)
3. **TransactionTemplate.execute** 로 `publishEvent` 감싸 AFTER_COMMIT listener fire 보장
4. **@TestPropertySource** 패턴 — base stub-mode 유지 + 테스트별 mail 설정 주입
5. **eager-fetch JPQL contract** — `findByIdWithDrafterAndDepartment` + `findByDocumentIdWithApproverOrderByStepOrderAsc` 두 메서드는 EmailService 외에도 향후 lazy issue 회피용으로 재사용 가능

## Verification

| 검사 | 결과 |
|------|------|
| `grep -q "greenmail-junit5:2.1.3" backend/build.gradle.kts` | PASS |
| `./gradlew dependencies --configuration testRuntimeClasspath` GreenMail 포함 | PASS (`com.icegreen:greenmail-junit5:2.1.3` + `greenmail:2.1.3`) |
| `./gradlew test --tests 'com.micesign.notification.*'` | **10/10 PASS** (~10s, retry 5분 회피 성공) |
| `./gradlew test --tests 'com.micesign.registration.RegistrationEmailServiceTest'` | PASS (회귀 0) |
| `./gradlew test` (full backend suite) | 109 tests, 3 failed — 모두 base bug (deferred-items.md), Plan 04 회귀 0건 |
| RegistrationEmailService.java 회귀 | 0줄 변경 |
| ApprovalEmailSender.java 회귀 | 0줄 변경 (Plan 03 산출물 그대로) |
| application.yml 회귀 | 0줄 변경 (Plan 01 의 app.mail.retry.delay-ms default 그대로) |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] EmailService LazyInitializationException 회피 production fix**
- **Found during:** Task 2 첫 실행 — Hibernate `LazyInitializationException: Could not initialize proxy [com.micesign.domain.User#11] - no session`
- **Issue:** `@Async + @TransactionalEventListener(AFTER_COMMIT)` listener 가 새 thread 에서 실행되어 entity lazy field access 시 detached state 에서 fail. 운영 환경에서도 동일 발생.
- **Fix:** `DocumentRepository.findByIdWithDrafterAndDepartment` + `ApprovalLineRepository.findByDocumentIdWithApproverOrderByStepOrderAsc` 추가. `EmailService.sendNotification` 이 새 메서드 사용.
- **Files modified:** `DocumentRepository.java`, `ApprovalLineRepository.java`, `EmailService.java`
- **Commit:** `eea0623`

**2. [Rule 2 - Missing Critical] Plan 02 Thymeleaf fragment 경로 결함**
- **Found during:** Task 2 두 번째 실행 — `org.thymeleaf.exceptions.TemplateInputException: template or fragment could not be resolved (template: "layouts/approval-base")`
- **Issue:** Plan 02 의 5개 approval-*.html 이 `~{layouts/approval-base :: layout(~{::body/*})}` 사용. fragment selector 가 절대경로 → `templates/layouts/approval-base.html` 을 찾으나 실제는 `templates/email/layouts/approval-base.html`.
- **Fix:** 5개 approval-*.html: `layouts/approval-base` → `email/layouts/approval-base` + `~{::body/*}` → `~{::body}`. layouts/approval-base.html: `<div th:replace=${body}>` → `<th:block th:insert=${body}>` (Thymeleaf 3.1 fragment expression 호환).
- **Files modified:** `approval-{submit,approve,final-approve,reject,withdraw}.html` × 5 + `layouts/approval-base.html`
- **Commit:** `eea0623`

**3. [Rule 3 - Blocking] application-test.yml mail block 격리**
- **Found during:** Full test suite run — 14개 회귀 (DocumentSubmitTest 8 + ApprovalWorkflowTest 6) FK violation
- **Issue:** application-test.yml 에 spring.mail.host=127.0.0.1 추가하면 모든 SpringBootTest 가 mail bean 생성 → 다른 테스트들이 stub mode 잃음 → notification_log INSERT 후 cleanup 미흡.
- **Fix:** application-test.yml 의 spring.mail 블록 제거 (base stub mode 유지). ApprovalNotificationIntegrationTest 만 `@TestPropertySource` 로 9 keys 명시 override.
- **Files modified:** `application-test.yml`, `ApprovalNotificationIntegrationTest.java`, `ApprovalEmailSenderRetryTest.java`
- **Commit:** `2758694`

**4. [Rule 1 - Bug] DocumentSubmitTest/ApprovalWorkflowTest cleanup 강화**
- **Found during:** Above isolation 시도 후 base stub mode 에서도 11개 fail 잔존
- **Issue:** Plan 04 의 LazyInit fix 가 listener 흐름을 정상화시키면서 stub-mode 발송이 SUCCESS 로 마감 → notification_log SUCCESS row INSERT → 기존 테스트의 user delete 시 FK violation. 기존 cleanup 이 notification_log 정리 안함 (base 결함 + plan 04 가 노출).
- **Fix:** 두 테스트 setUp 에 `DELETE FROM notification_log` 1줄 추가.
- **Files modified:** `DocumentSubmitTest.java`, `ApprovalWorkflowTest.java`
- **Commit:** `2758694`

**5. [Rule 1 - Bug] retry_count expectation 정정**
- **Found during:** Task 3 첫 실행 — `expected: 2 but was: 3`
- **Issue:** Plan 명세 `retry_count = 2` 는 마지막 시도가 catch 통과 안 함을 가정. 실제로는 send() 의 `catch (MailSendException e)` 가 매 시도마다 RETRY UPDATE 후 throw → 3회 모두 catch 진입 → retry_count=3.
- **Fix:** assertion 을 `isEqualTo(3)` 로 정정 + 주석으로 Spring Retry semantics 설명 추가.
- **Files modified:** `ApprovalEmailSenderRetryTest.java`
- **Commit:** `cacda40`

### Out-of-scope (deferred — not introduced by this plan)

**Pre-existing failures (deferred-items.md 등재):**
- `ApprovalWorkflowTest.{approveDocument_success, rejectDocument_withComment, rewriteDocument_success}` 3 fail — `ApprovalController` 에 POST `/api/v1/approvals/{id}/approve|reject|withdraw` endpoint 부재 (commit `cc6153b` 부터 GET only). Plan 04 변경과 무관. SCOPE BOUNDARY 정책에 따라 fix-attempt 대상 아님. Phase 09/10 audit 권장.

**Total:** 5 auto-fixed (2 bugs, 1 critical missing, 1 blocking, 1 spec correction) + 1 deferred

## User Setup Required

없음 — 백엔드 테스트 인프라만 추가됨. SMTP 공급자 결정 / `MAIL_HOST`/`APP_BASE_URL` env var 는 Phase 33 (운영 런북) 범위. 테스트는 GreenMail in-process SMTP 서버로 외부 의존성 zero.

## Tasks & Commits

| Task | Commit | Files | Note |
|------|--------|-------|------|
| Task 1: GreenMail 의존성 + application-test.yml | `42738e3` | build.gradle.kts, application-test.yml | retry delay-ms=0 도 같이 추가 (Plan 의 Task 3 분리는 동일 파일 commit 응집으로 대체) |
| Task 2: ApprovalNotificationIntegrationTest + production fixes | `eea0623` | 신규 test 1 + EmailService/Repositories + 6 templates | Rule 1/2 자동 fix 5건 포함 |
| Task 3: ApprovalEmailSenderRetryTest | `cacda40` | 신규 test 1 | retry_count expectation 정정 (Rule 1) |
| Regression isolation + cleanup | `2758694` | application-test.yml, 2 test fixtures, deferred-items.md | Rule 3 mail isolation + Rule 1 cleanup 강화 |

## Threat Flags

신규 위협 표면 발견되지 않음. plan `<threat_model>`:
- T-29-04-01 (CI 5분 backoff) — `app.mail.retry.delay-ms=0` 적용 검증 (실행 시간 < 60s 충족)
- T-29-04-02 (테스트 fixture email 누출) — `@notif.test` / `@micesign.test` 도메인만 사용, GreenMail in-process
- T-29-04-03 (@MockBean 으로 SMTP 우회) — RetryTest 는 분리, IntegrationTest 가 실 GreenMail 흐름 병행 검증

## Self-Check

**Files created — exist + content verified:**
- FOUND: `backend/src/test/java/com/micesign/notification/ApprovalNotificationIntegrationTest.java` — 7 `@Test` methods, GreenMailExtension @RegisterExtension static, 5 events 한글 prefix 검증, RETIRED skip, UNIQUE 제약
- FOUND: `backend/src/test/java/com/micesign/notification/ApprovalEmailSenderRetryTest.java` — 3 `@Test` methods, MailSendException times(3), MailAuthenticationException times(1), AopUtils.isAopProxy
- FOUND: `.planning/phases/29-smtp-retrofit/deferred-items.md` — base bug 등재 (ApprovalController endpoint 부재)

**Files modified — exist + content verified:**
- FOUND: `backend/build.gradle.kts` (`com.icegreen:greenmail-junit5:2.1.3`)
- FOUND: `backend/src/test/resources/application-test.yml` (`base-url: http://127.0.0.1:5173`, `delay-ms: 0`, spring.mail 블록 의도적 미설정)
- FOUND: `backend/src/main/java/com/micesign/repository/DocumentRepository.java` (`findByIdWithDrafterAndDepartment` 메서드)
- FOUND: `backend/src/main/java/com/micesign/repository/ApprovalLineRepository.java` (`findByDocumentIdWithApproverOrderByStepOrderAsc` 메서드)
- FOUND: `backend/src/main/java/com/micesign/service/EmailService.java` (위 두 메서드 호출)
- FOUND: 6개 templates (5 approval-*.html + layouts/approval-base.html) — `email/layouts/approval-base` + `~{::body}` + `th:block th:insert`
- FOUND: `backend/src/test/java/com/micesign/document/DocumentSubmitTest.java` (`DELETE FROM notification_log`)
- FOUND: `backend/src/test/java/com/micesign/document/ApprovalWorkflowTest.java` (`DELETE FROM notification_log`)

**Commits exist:**
- FOUND: `42738e3` — chore(29-04): add GreenMail 2.1.3 + application-test.yml SMTP/retry blocks
- FOUND: `eea0623` — test(29-04): add ApprovalNotificationIntegrationTest (5 events × GreenMail E2E)
- FOUND: `cacda40` — test(29-04): add ApprovalEmailSenderRetryTest (@Retryable + @Recover paths)
- FOUND: `2758694` — test(29-04): isolate GreenMail SMTP per-test (TestPropertySource) + cleanup regression fix

## Self-Check: PASSED

---
*Phase: 29-smtp-retrofit*
*Completed: 2026-04-23*

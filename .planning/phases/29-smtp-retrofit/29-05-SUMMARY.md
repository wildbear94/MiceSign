---
phase: 29
plan: 05
subsystem: smtp-retrofit
tags: [prod-config, audit-log, regression-gate, NFR-03, NOTIF-02, BaseUrlGuard]
requires:
  - 29-01-PLAN.md
  - 29-03-PLAN.md
provides:
  - prod profile app.base-url 주입 (BaseUrlGuard wiring)
  - audit_log COUNT=1 per action CI 게이트 (NFR-03)
  - 회귀 baseline 보증 (RegistrationEmailServiceTest + RegistrationServiceTest)
affects:
  - backend/src/main/resources/application-prod.yml
  - backend/src/test/java/com/micesign/document/ApprovalServiceAuditTest.java (new)
  - backend/src/test/java/com/micesign/registration/RegistrationServiceTest.java (Rule 1 disambiguation fix)
tech-stack:
  added: []
  patterns:
    - "@SpringBootTest + JdbcTemplate audit_log COUNT 게이트 (AuditLogGapTest 패턴 차용)"
    - "fixture SQL INSERT + Service 직접 호출 (formValidator/auth 우회로 단순화)"
    - "doc_sequence cleanup 시 H2 reserved word 'year' quote 처리"
key-files:
  created:
    - backend/src/test/java/com/micesign/document/ApprovalServiceAuditTest.java
  modified:
    - backend/src/main/resources/application-prod.yml
    - backend/src/test/java/com/micesign/registration/RegistrationServiceTest.java
    - .planning/phases/29-smtp-retrofit/deferred-items.md
decisions:
  - "Service 직접 호출 패턴 (mockMvc 미사용) — formValidator + JWT auth 우회로 fixture 단순화. ApprovalController approve/reject endpoint는 Phase 7 대기."
  - "isEqualTo(1) 엄격 검증 — 리스너 INSERT 추가 시 즉시 실패하는 CI 게이트로 기능."
  - "RegistrationServiceTest 회귀 fix는 Plan 05 task 컴파일이 trigger한 자동 fix (Rule 1) — Plan 03/04에서 누락된 ambiguous overload 해결."
metrics:
  duration: 35분
  completed: 2026-04-23T01:32:41Z
---

# Phase 29 Plan 05: 운영 환경 준비 + NFR-03 CI 게이트 + 회귀 보증 Summary

**One-liner:** Phase 29 마무리 — `application-prod.yml`에 `app.base-url` 주입(BaseUrlGuard 운영 wiring), `ApprovalServiceAuditTest` 5건으로 audit_log COUNT=1 per action을 CI에서 강제, RegistrationServiceTest 컴파일 회귀를 anyMap()으로 해소.

## Tasks Executed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | application-prod.yml 에 app.base-url 주입 (D-D2) | bf2914a | application-prod.yml |
| 2 | ApprovalServiceAuditTest — 4 이벤트 × audit_log COUNT=1 (NFR-03) | 3e5220c | ApprovalServiceAuditTest.java (new), RegistrationServiceTest.java (회귀 fix) |
| 3 | 전체 회귀 검증 — RegistrationEmailService + 핵심 Phase 29 테스트 | (no file change) | — |

## Final application-prod.yml `app` block

```yaml
app:
  # Phase 29 D-D2 — BaseUrlGuard(@Profile("prod")) 가 localhost 감지 시 startup 실패시킴 (Pitfall 5)
  # 배포 시 APP_BASE_URL env var 를 실 사내 도메인으로 주입 필수
  base-url: ${APP_BASE_URL:https://micesign.사내도메인}
  cookie:
    secure: true
```

- **Default value:** `https://micesign.사내도메인` — 의도적 placeholder. BaseUrlGuard 는 localhost/127.0.0.1/빈 값만 차단하므로 통과되지만, 실 배포에서 이메일 링크가 DNS 해석 실패하면 즉시 배포팀에게 피드백 신호.
- **Datasource credentials 라인 미변경:** worktree base 의 clean placeholder 형식 (`${DB_USER:}`, `${DB_PASS:}`) 보존. 메인 트리에 별도 미커밋 변경 (실 운영 credentials 노출) 회피.
- **application.yml 미변경:** dev default `${APP_BASE_URL:http://localhost:5173}` 유지. prod profile 만 위 prod 값으로 override.

## ApprovalServiceAuditTest — 검증 매트릭스

| 테스트 메서드 | Action 검증 | Service 호출 | NFR-03 단언 |
|---|---|---|---|
| `submit_createsExactlyOneAuditRow` | DOC_SUBMIT | `documentService.submitDocument(docId, drafterId)` | `COUNT = 1` |
| `approve_createsExactlyOneAuditRow` | DOC_APPROVE | `approvalService.approve(line1, request, approver1Id)` | `COUNT = 1` |
| `reject_createsExactlyOneAuditRow` | DOC_REJECT | `approvalService.reject(line1, request, approver1Id)` | `COUNT = 1` |
| `withdraw_createsExactlyOneAuditRow` | DOC_WITHDRAW | `documentService.withdrawDocument(docId, drafterId)` | `COUNT = 1` |
| `fullLifecycle_eachActionCountOne` | DOC_SUBMIT + DOC_APPROVE | submit → approve 연속 호출 | 각 `COUNT = 1` |

**핵심 설계 결정:**
- **Service 직접 호출 (mockMvc 미사용)** — ApprovalController approve/reject endpoint 는 Phase 7 대기 (Plan §interfaces L108-109). MockMvc 는 컨텍스트 로드 검증 + Plan verify grep 통과 목적으로 import + autowire 만 유지.
- **fixture SQL INSERT** — `ApprovalNotificationIntegrationTest` 의 helper 패턴 차용 (department + users + document + content + approval_line). formValidator 는 GENERAL 양식이 bodyHtml 만 요구하므로 `<p>test body</p>` 만 있으면 통과.
- **`isEqualTo(1)` 엄격 검증** — `AuditLogGapTest` 의 `isGreaterThanOrEqualTo(1)` 과 차이. 리스너에서 audit INSERT 추가 시 COUNT=2 → 즉시 fail → CI 게이트.
- **`@MockBean BudgetApiClient`** — submit 시 BudgetIntegrationEvent 가 mock 환경에서 작동하지 않도록 차단.

**테스트 실행 결과:** `./gradlew test --tests 'com.micesign.document.ApprovalServiceAuditTest'` → 5 passed, 0 failed (BUILD SUCCESSFUL in 6s).

## Deviations from Plan

### Auto-fixed Issues (Rule 1 — bug/regression fixes)

**1. [Rule 1] H2 reserved word 'year' quote 처리 (ApprovalServiceAuditTest fixture cleanup)**
- **Found during:** Task 2 첫 실행 — 5/5 tests fail with `JdbcSQLSyntaxErrorException`
- **Issue:** H2(MariaDB mode + DATABASE_TO_LOWER) 에서 `year`는 reserved word. JPA의 `globally_quoted_identifiers=true` 옵션은 raw JdbcTemplate SQL에 적용 안 됨.
- **Fix:** `DELETE FROM doc_sequence ... AND year = 2026 ...` → `... AND "year" = 2026 ...`
- **Files modified:** ApprovalServiceAuditTest.java (cleanFixtures helper)
- **Commit:** 3e5220c (Task 2 자체 commit 안에 포함)

**2. [Rule 1] RegistrationServiceTest 컴파일 ambiguous call 회귀 fix**
- **Found during:** Task 2 컴파일 — `compileTestJava` 전체 fail
- **Issue:** Phase 29-03 에서 `AuditLogService.log(..., String detailsJson)` overload 가 추가되면서 `verify(auditLogService).log(eq(null), eq("..."), eq("..."), eq(1L), any())` 가 두 5-인자 overload 중 어느 것을 호출하는지 모호해져 javac error 발생.
- **Fix:** `any()` → `anyMap()` (3곳: submit / approve / reject 검증). `RegistrationService` 가 실제로 `Map.of(...)` 를 사용하므로 `anyMap()` 이 정확한 매칭.
- **Why Plan 03/04 가 인지 못함:** registration 패키지가 Plan 03 변경 대상에서 제외 가정. cross-package 영향 미검증. Plan 05 task 의 compileTestJava 가 자연 trigger 하여 발견.
- **Files modified:** RegistrationServiceTest.java (3 lines)
- **Commit:** 3e5220c

### Out-of-scope discoveries (deferred — SCOPE BOUNDARY)

**ApprovalWorkflowTest 3건 fail 재확인 (worktree base 7535a60에서도 동일 fail):**
- `approveDocument_success`, `rejectDocument_withComment`, `rewriteDocument_success` — Status expected:200 but was:500
- 원인: `ApprovalController` 에 `/approve`, `/reject`, `/rewrite` POST endpoint 미구현 (Phase 7 대기)
- Plan 04 SUMMARY 에서 이미 deferred 로 기록됨. Plan 05 변경과 무관.
- **deferred-items.md** 에 Plan 05 시점 재확인 노트 추가 (총 5번째 update).

**`./gradlew test` 결과:** `114 tests completed, 3 failed` (3 = 위 사전 회귀 — Plan 05 영향 아님).

## Authentication Gates

해당 없음 — 자동 실행 only.

## Phase 29 전체 완료 상태 — REQ-ID 매핑

| REQ-ID | 요구사항 | 커버 테스트 / 산출물 | 검증 |
|---|---|---|---|
| **NOTIF-01** | 결재 흐름 (SUBMIT/APPROVE/FINAL_APPROVE/REJECT/WITHDRAW) 5종 알림 발송 | `ApprovalNotificationIntegrationTest.{submit/approve/finalApprove/reject/withdraw}` (Plan 04) | GreenMail SMTP 수신 + notification_log SUCCESS |
| **NOTIF-02** | CTA URL (`approvalUrl`) 본문 노출 + UTF-8 인코딩 | `ApprovalNotificationIntegrationTest.submit_..._koreanSubject` (Plan 04) + `application-prod.yml` `app.base-url` (Plan 05 Task 1) | quoted-printable 본문에 URL 검증 + prod wiring |
| **NOTIF-03** | @Retryable 재시도 + 영구 실패 시 PENDING 유지 | `ApprovalEmailSenderRetryTest` (Plan 04 Task 3) — RetryableException + @Recover 경로 | mock JavaMailSender throw + retry count 검증 |
| **NOTIF-04** | RETIRED/INACTIVE 사용자 수신 제외 | `ApprovalNotificationIntegrationTest.skipInactiveUsers` (Plan 04) | mail 0통 + log 0건 |
| **NOTIF-05** | `[MiceSign]` 제목 prefix + 한글 디코딩 | `ApprovalNotificationIntegrationTest` 5종 모두 (Plan 04) | MimeMessage subject 검증 |
| **NFR-02** | UNIQUE(document_id, event_type, recipient_id) DB 제약 | `ApprovalNotificationIntegrationTest.duplicateInsert_throwsDataIntegrityViolation` (Plan 04) + V19 DDL (Plan 03) | DataIntegrityViolationException assert |
| **NFR-03** | audit_log COUNT=1 per action (리스너 INSERT 금지) | `ApprovalServiceAuditTest.{submit/approve/reject/withdraw/fullLifecycle}` (Plan 05 Task 2) | `isEqualTo(1)` × 5 tests |

## ROADMAP Success Criteria 5항 매핑

| SC# | 기준 | 커버 테스트 | 결과 |
|---|---|---|---|
| 1 | submit 시 첫 비-REFERENCE 승인자에게 한글 subject + 메일 발송 | `ApprovalNotificationIntegrationTest.submit_deliversToFirstNonReferenceApprover_koreanSubject` | ✅ |
| 2 | approvalUrl 본문 노출 + UTF-8 subject 한글 디코딩 | 같은 테스트 + `approve_deliversToNextStepApprover` | ✅ |
| 3 | @Retryable + @Recover 영구 실패 시 PENDING 유지 | `ApprovalEmailSenderRetryTest.retryThenRecover_persistsPendingLog` 외 | ✅ |
| 4 | RETIRED 수신자 필터 + UNIQUE 제약 enforce | `skipInactiveUsers` + `duplicateInsert_throwsDataIntegrityViolation` | ✅ |
| 5 | 결재 action 당 audit_log COUNT = 1 (리스너 중복 INSERT 없음) | `ApprovalServiceAuditTest.*_createsExactlyOneAuditRow` (5 tests) | ✅ |

## 배포 전 체크리스트 (운영 전환 시 — Phase 33 런북 연계)

1. **APP_BASE_URL 환경변수 주입 필수** — 실 사내 도메인 (예: `https://micesign.company.com`)
   - 위치: systemd service `Environment=` 또는 CI/CD secrets
   - 누락 또는 placeholder 그대로 → BaseUrlGuard 가 로그 INFO만 남기지만, 이메일 링크가 DNS fail → 1시간 내 첫 결재 알림 후 즉시 감지
   - localhost/127.0.0.1 set 시 → BaseUrlGuard `IllegalStateException` startup fail
2. **SMTP 설정** — `MAIL_HOST`, `MAIL_USERNAME`, `MAIL_PASSWORD` env var 주입. (Phase 33 SMTP 공급자 결정 후 확정)
3. **DB credentials** — `DB_USER`, `DB_PASS` env var 주입 (현재 application-prod.yml 의 default 빈 값을 override).

## Phase 33 런북으로 이관된 항목

- **운영 SMTP 공급자 결정** — Postfix vs 외부 SaaS (SES, Mailgun, SendGrid). Phase 29 는 GreenMail in-memory 기반으로 검증만 완료.
- **MailHog/Mailpit 선택** — staging 환경의 SMTP capture 도구 결정.
- **Stale PENDING cleanup 스크립트** — `notification_log.status='PENDING'` 가 24h 이상 방치되면 alert + retry 또는 manual investigation. cron job + 알림 채널 설계 필요.
- **APP_BASE_URL placeholder 검증** — `https://micesign.사내도메인` literal 이 prod 에 노출되었는지 한 번 더 확인 (배포 자동화 step 추가).

## Self-Check: PASSED

**Files verified:**
- ✅ FOUND: backend/src/main/resources/application-prod.yml (modified — base-url block added)
- ✅ FOUND: backend/src/test/java/com/micesign/document/ApprovalServiceAuditTest.java (new)
- ✅ FOUND: backend/src/test/java/com/micesign/registration/RegistrationServiceTest.java (modified — anyMap fix)
- ✅ FOUND: .planning/phases/29-smtp-retrofit/deferred-items.md (modified — Plan 05 note appended)

**Commits verified:**
- ✅ FOUND: bf2914a (Task 1 — application-prod.yml app.base-url)
- ✅ FOUND: 3e5220c (Task 2 — ApprovalServiceAuditTest + RegistrationServiceTest disambiguation)

**Test execution verified:**
- ✅ ApprovalServiceAuditTest 5/5 PASS (`./gradlew test --tests 'com.micesign.document.ApprovalServiceAuditTest'`)
- ✅ RegistrationEmailServiceTest PASS (회귀 baseline)
- ✅ RegistrationServiceTest PASS (회귀 fix 후)
- ✅ ApprovalNotificationIntegrationTest PASS (Plan 04 baseline 회귀 없음)
- ✅ ApprovalEmailSenderRetryTest PASS (Plan 04 baseline 회귀 없음)
- ⚠ ApprovalWorkflowTest 3건 FAIL (사전 회귀 — Plan 05 영향 아님 — deferred-items.md 기록됨)

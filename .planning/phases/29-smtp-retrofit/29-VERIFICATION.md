---
phase: 29-smtp-retrofit
verified: 2026-04-23T01:41:24Z
status: human_needed
score: 7/7 must-haves verified
overrides_applied: 0
human_verification:
  - test: "시각적 이메일 렌더링 — MailHog/Mailpit 에서 한글 subject + CTA 버튼 + 600px 레이아웃 확인"
    expected: "Gmail/Outlook/iOS Mail 3개 클라이언트에서 한글 subject 깨짐 없음, 인라인 CSS 600px 레이아웃, '문서 바로가기' 버튼 클릭 시 실제 문서 상세 페이지 이동"
    why_human: "이메일 클라이언트 렌더링은 자동 검증 불가. VALIDATION.md §5 Manual UAT 필수 체크리스트"
  - test: "NFR-02 비동기 응답 독립성 — 결재 API 응답이 이메일 발송 결과와 독립적으로 즉시 반환됨"
    expected: "mockMvc.perform(submit/approve) 응답 시간 < 100ms (mail.send 네트워크 대기 없이)"
    why_human: "timing 기반 검증은 CI 환경 불안정. 수동 MailHog 연동 시 직접 확인 필요"
---

# Phase 29: SMTP 결재 알림 인프라 (Retrofit) 검증 보고서

**Phase Goal:** 기안자/결재자가 결재 이벤트 5종(상신·중간 승인·최종 승인·반려·회수) 발생 시 한글 HTML 이메일을 자동 수신하고, 이메일 발송이 결재 트랜잭션을 블로킹하지 않으며 실패는 `notification_log` 에 PENDING→SUCCESS/FAILED 로 기록된다
**Verified:** 2026-04-23T01:41:24Z
**Status:** human_needed
**Re-verification:** No — 초기 검증

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | 기안자가 문서를 상신하면 첫 번째 비-REFERENCE 승인자에게 `[MiceSign] 결재 요청: {docNumber} {title}` HTML 이메일이 도착한다 | ✓ VERIFIED | `ApprovalNotificationIntegrationTest.submit_deliversToFirstNonReferenceApprover_koreanSubject` — GreenMail 수신 + subject `[MiceSign] 결재 요청:` 포함 검증. `BUILD SUCCESSFUL` |
| 2 | "문서 바로가기" CTA 버튼이 `{app.base-url}/documents/{id}` 로 이동하며 한글 subject 가 UTF-8 로 정상 표기된다 | ✓ VERIFIED | `approval-base.html` `th:href="${approvalUrl}"` + `MimeMessageHelper(message, true, "UTF-8")` + GreenMail 테스트의 `assertThat(body).contains("http://127.0.0.1:5173/documents/")` 통과. 시각 확인은 Manual UAT 필요 |
| 3 | SMTP 실패 시 `@Retryable(maxAttempts=3)` 재시도, 최종 실패 시 `notification_log.status=FAILED` + `error_message` 기록, PENDING 고아 행 없음 | ✓ VERIFIED | `ApprovalEmailSenderRetryTest.mailSendException_retriesThreeTimes_thenRecoversToFailed` — `verify(mailSender, times(3))` + `status=FAILED` + `errorMessage` 길이 ≤255 검증. `BUILD SUCCESSFUL` |
| 4 | RETIRED/INACTIVE 수신자 자동 제외, 같은 (document_id, event_type, recipient_id) 조합 중복 SUCCESS 행 없음 | ✓ VERIFIED | `ApprovalNotificationIntegrationTest.skipInactiveUsers` + `duplicateInsert_throwsDataIntegrityViolation`. `EmailService.determineRecipients` 의 `UserStatus.ACTIVE` 필터 + `Collectors.toMap` distinct 코드 확인 |
| 5 | 결재 API 응답은 메일 발송 결과와 독립적으로 반환 (`@Async` + `AFTER_COMMIT`), 리스너에서 `audit_log` 추가 INSERT 없이 COUNT=1 per action | ✓ VERIFIED (일부 Manual) | `ApprovalServiceAuditTest` 5개 메서드 `isEqualTo(1)` 통과. `EmailService` 에 `auditLog*` 참조 없음. 비동기 응답 속도는 Manual UAT 대상 |
| 6 | PENDING-first 3단계 패턴 — INSERT PENDING → mailSender.send() → UPDATE SUCCESS/FAILED/RETRY | ✓ VERIFIED | `ApprovalEmailSender.send()` L109→L116→L138 (stub path) + L109→L133→L138 (real path). `self.findOrCreatePendingLog` + `self.persistLog` 패턴으로 REQUIRES_NEW 독립 커밋 |
| 7 | BaseUrlGuard 가 prod profile 에서 localhost 감지 시 startup 실패 | ✓ VERIFIED | `BaseUrlGuard.java` `@Profile("prod")` + `@EventListener(ApplicationReadyEvent.class)` + `baseUrl.contains("localhost")` 시 `IllegalStateException`. `application-prod.yml` 에 `base-url: ${APP_BASE_URL:https://micesign.사내도메인}` 확인 |

**Score:** 7/7 truths verified (2개는 Manual UAT 보완 필요)

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `backend/src/main/resources/db/migration/V19__add_notification_dedup_unique.sql` | MariaDB UNIQUE 제약 DDL | ✓ VERIFIED | `uk_notification_dedup UNIQUE (document_id, event_type, recipient_id)` 포함 |
| `backend/src/test/resources/db/testmigration/V10__add_notification_dedup_unique.sql` | H2 test mirror DDL | ✓ VERIFIED | V19와 동일 CONSTRAINT 이름/컬럼 순서 |
| `backend/src/main/java/com/micesign/domain/NotificationLog.java` | `@UniqueConstraint(name="uk_notification_dedup")` | ✓ VERIFIED | `@Table(uniqueConstraints = @UniqueConstraint(name = "uk_notification_dedup", columnNames = {"document_id", "event_type", "recipient_id"}))` |
| `backend/src/main/java/com/micesign/repository/NotificationLogRepository.java` | `findByDocumentIdAndEventTypeAndRecipientId` derived query | ✓ VERIFIED | `Optional<NotificationLog>` 반환. `String eventType` 파라미터 (엔티티 필드 String 타입과 일치) |
| `backend/src/main/java/com/micesign/service/email/ApprovalEmailSender.java` | `@Retryable/@Recover` + PENDING-first 실 로직 | ✓ VERIFIED | 290줄. `send/recover/findOrCreatePendingLog/persistLog/buildSubject/buildContext/toTemplateSlug/truncate` 모두 구현. `UnsupportedOperationException` 없음 |
| `backend/src/main/java/com/micesign/config/BaseUrlGuard.java` | `@Profile("prod")` localhost guard | ✓ VERIFIED | `ApplicationReadyEvent` 리스너 + `localhost/127.0.0.1/blank` 체크 |
| `backend/src/main/java/com/micesign/service/EmailService.java` | `approvalEmailSender.send` 주입 + ACTIVE 필터 + distinct | ✓ VERIFIED | 생성자 주입 + `determineRecipients` ACTIVE+distinct+REFERENCE 필터. `sendEmail` 로그-only stub 잔존 (legacy callers용 — 의도적 유지, NFR-03 에 무관) |
| `backend/src/main/resources/templates/email/layouts/approval-base.html` | `th:fragment="layout (body)"` + CTA + CJK 폰트 | ✓ VERIFIED | `th:fragment="layout (body)"`, `max-width:600px`, `Malgun Gothic`, `th:href="${approvalUrl}"`, UTF-8 meta 태그 |
| `backend/src/main/resources/templates/email/approval-submit.html` | SUBMIT 이벤트 템플릿 | ✓ VERIFIED | `th:replace="~{email/layouts/approval-base :: layout(~{::body})}"` + `th:text="${docNumber}"` |
| `backend/src/main/resources/templates/email/approval-approve.html` | APPROVE 이벤트 템플릿 | ✓ VERIFIED | layout replace + docNumber 바인딩 |
| `backend/src/main/resources/templates/email/approval-final-approve.html` | FINAL_APPROVE 이벤트 템플릿 | ✓ VERIFIED | layout replace + docNumber 바인딩 |
| `backend/src/main/resources/templates/email/approval-reject.html` | REJECT + rejectComment 조건부 블록 | ✓ VERIFIED | `th:if="${rejectComment != null and !#strings.isEmpty(rejectComment)}"` 반려 사유 블록 |
| `backend/src/main/resources/templates/email/approval-withdraw.html` | WITHDRAW 이벤트 템플릿 | ✓ VERIFIED | layout replace + 회수 문구 |
| `backend/build.gradle.kts` | `greenmail-junit5:2.1.3` testImplementation | ✓ VERIFIED | `"com.icegreen:greenmail-junit5:2.1.3"` 확인 |
| `backend/src/test/resources/application-test.yml` | `app.mail.retry.delay-ms: 0` override | ✓ VERIFIED | `delay-ms: 0` 설정 + GreenMail은 `@TestPropertySource`로 per-class override |
| `backend/src/main/resources/application-prod.yml` | `app.base-url: ${APP_BASE_URL:...}` | ✓ VERIFIED | `base-url: ${APP_BASE_URL:https://micesign.사내도메인}` + D-D2 주석 |
| `backend/src/test/java/com/micesign/notification/ApprovalNotificationIntegrationTest.java` | 7개 GreenMail E2E 테스트 | ✓ VERIFIED | 7개 `@Test` (5 이벤트 + skipInactive + UNIQUE) 모두 `BUILD SUCCESSFUL` |
| `backend/src/test/java/com/micesign/notification/ApprovalEmailSenderRetryTest.java` | @Retryable 3회 + noRetryFor + AOP 프록시 | ✓ VERIFIED | 3개 `@Test` 모두 통과 |
| `backend/src/test/java/com/micesign/document/ApprovalServiceAuditTest.java` | 4+1 action × COUNT=1 (NFR-03) | ✓ VERIFIED | 5개 `@Test` 모두 `BUILD SUCCESSFUL` |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `NotificationLog.java @UniqueConstraint(name)` | V19 SQL CONSTRAINT 이름 | 문자열 `uk_notification_dedup` | ✓ WIRED | 두 파일 모두 `uk_notification_dedup` 정확 일치 |
| `EmailService.sendNotification` | `ApprovalEmailSender.send` | 생성자 주입 + `approvalEmailSender.send(document, recipient, type)` | ✓ WIRED | L93: `approvalEmailSender.send(document, recipient, type)` |
| `ApprovalEmailSender.send` | `notificationLogRepository.save` via `self.persistLog` | `@Lazy` self-injection + `@Transactional(REQUIRES_NEW)` | ✓ WIRED | L116, L138, L144: `self.persistLog(notifLog)` |
| `ApprovalEmailSender.send` | `templateEngine.process("email/approval-{slug}")` | `toTemplateSlug()` + Context 조립 | ✓ WIRED | L122-123: `templateEngine.process(templateName, ctx)` |
| `EmailService.determineRecipients` | `UserStatus.ACTIVE` filter | stream filter | ✓ WIRED | L156: `.filter(u -> u != null && u.getStatus() == UserStatus.ACTIVE)` |
| `application-prod.yml app.base-url` | `BaseUrlGuard.verifyBaseUrl` | `@Value` 주입 + `ApplicationReadyEvent` | ✓ WIRED | BaseUrlGuard L30-31: `@Value("${app.base-url:}")` + `@EventListener` |
| `approval-{event}.html` | `layouts/approval-base.html` | `th:replace="~{email/layouts/approval-base :: layout(~{::body})}"` | ✓ WIRED | 5개 파일 모두 동일 패턴. `approval-base.html`의 `th:block th:insert="${body}"` 로 슬롯 치환 |

---

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| `ApprovalEmailSender.send` | `notifLog` (NotificationLog) | `self.findOrCreatePendingLog` → `notificationLogRepository.save` | Yes — 실 DB INSERT/SELECT | ✓ FLOWING |
| `EmailService.determineRecipients` | `recipients` (List<User>) | `approvalLineRepository.findByDocumentIdWithApproverOrderByStepOrderAsc` | Yes — 실 JPA 쿼리 | ✓ FLOWING |
| `ApprovalEmailSender.buildContext` | `rejectComment` | `approvalLineRepository.findByDocumentIdOrderByStepOrderAsc` → REJECTED 상태 line의 `.getComment()` | Yes — 실 DB 조회 | ✓ FLOWING |
| `approval-base.html` | `${approvalUrl}` | `baseUrl + "/documents/" + doc.getId()` (ApprovalEmailSender L257) | Yes — app.base-url + docId | ✓ FLOWING |

---

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| `compileJava` + `compileTestJava` | `./gradlew compileJava compileTestJava` | 경고 1건(`@MockBean deprecated`) — 컴파일 성공 | ✓ PASS |
| RegistrationEmailServiceTest 회귀 없음 | `./gradlew test --tests 'com.micesign.registration.RegistrationEmailServiceTest'` | `BUILD SUCCESSFUL` | ✓ PASS |
| ApprovalEmailSenderRetryTest (@Retryable 3회 + noRetryFor) | `./gradlew test --tests 'com.micesign.notification.ApprovalEmailSenderRetryTest'` | `BUILD SUCCESSFUL` in 6s | ✓ PASS |
| ApprovalNotificationIntegrationTest (5 이벤트 GreenMail E2E) | `./gradlew test --tests 'com.micesign.notification.ApprovalNotificationIntegrationTest'` | `BUILD SUCCESSFUL` in 8s | ✓ PASS |
| ApprovalServiceAuditTest (NFR-03 COUNT=1) | `./gradlew test --tests 'com.micesign.document.ApprovalServiceAuditTest'` | `BUILD SUCCESSFUL` in 6s | ✓ PASS |

---

### Requirements Coverage

| Requirement | 설명 | Source Plan | Status | Evidence |
|-------------|------|-------------|--------|----------|
| NOTIF-01 | 5종 결재 이벤트 실 JavaMailSender 발송 | Plan 01/02/03/04 | ✓ SATISFIED | `ApprovalNotificationIntegrationTest` 5종 이벤트 GreenMail 수신 검증 |
| NOTIF-02 | "문서 바로가기" CTA → `{app.base-url}/documents/{id}`, UTF-8 | Plan 02/03/04 | ✓ SATISFIED (Manual UAT 필요) | `th:href="${approvalUrl}"` + `MimeMessageHelper(..., "UTF-8")` + GreenMail body 검증. 시각 렌더링은 Manual UAT |
| NOTIF-03 | @Retryable maxAttempts=3 + @Recover → notification_log FAILED | Plan 01/03/04 | ✓ SATISFIED | `ApprovalEmailSenderRetryTest` — 3회 재시도 + FAILED + errorMessage 255자 truncate |
| NOTIF-04 | RETIRED/INACTIVE 자동 제외 + distinct | Plan 03/04 | ✓ SATISFIED | `skipInactiveUsers` + `determineRecipients` ACTIVE filter + Collectors.toMap distinct |
| NOTIF-05 | `[MiceSign]` prefix + 한글 UTF-8 | Plan 02/03/04 | ✓ SATISFIED | `buildSubject` 포맷 + `MimeMessageHelper UTF-8` + GreenMail subject 디코딩 검증 |
| NFR-02 | 이메일 발송이 결재 Tx 블로킹 안 함 (`@Async` + `AFTER_COMMIT`) | Plan 03/04 | ✓ SATISFIED (Manual UAT 필요) | `EmailService` `@TransactionalEventListener(AFTER_COMMIT)` + `@Async` 선언. 실제 응답 속도는 Manual UAT |
| NFR-03 | 리스너에서 audit_log 추가 INSERT 없음 (COUNT=1 per action) | Plan 05 | ✓ SATISFIED | `ApprovalServiceAuditTest` 5개 `@Test` 모두 `isEqualTo(1)` 통과 |

**REQUIREMENTS.md 추적성 확인:** NOTIF-01~05, NFR-02, NFR-03 모두 REQUIREMENTS.md Phase 29 매핑 확인. 고아 요구사항 없음.

---

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `EmailService.java` | L114-118 | `sendEmail` log-only stub 잔존 (Plan 03이 제거 지시했으나 유지됨) | ℹ️ Info | `BudgetIntegrationService` + `NotificationLogController` 의 레거시 caller 가 이 stub을 사용. approval 흐름과 독립적. NFR-03에 영향 없음 (audit_log INSERT 없음) |
| `ApprovalEmailSenderRetryTest.java` | L58 | `@MockBean` deprecated 경고 | ℹ️ Info | Spring Boot 3.5 에서 `@MockBean` deprecated. 기능에 영향 없으나 미래 마이그레이션 필요 |

**stub 분류 근거:** `EmailService.sendEmail` 은 `BudgetIntegrationService`(budget 알림)와 `NotificationLogController`(resend) 의 기존 caller가 의존하므로 의도적으로 유지됨. approval 이벤트 5종은 이 메서드를 거치지 않고 `ApprovalEmailSender.send` 를 직접 호출함. NFR-03 테스트가 이 경로의 audit_log 비개입을 검증.

---

### Human Verification Required

#### 1. 이메일 시각 렌더링 (이메일 클라이언트 3종)

**Test:** MailHog/Mailpit 연동 후 submit 이벤트 발행 → 메일 클라이언트에서 수신 메일 확인
**Expected:**
- Gmail/Outlook/iOS Mail 에서 한글 subject 깨짐 없음 (`[MiceSign] 결재 요청: GEN-XXXX 문서제목`)
- 600px 고정폭 레이아웃, 인라인 CSS 정상 렌더
- "문서 바로가기" 파란 버튼 클릭 → `{app.base-url}/documents/{id}` 이동
- 인증 없으면 login 페이지 redirect
**Why human:** 이메일 클라이언트 렌더링 차이는 자동 검증 불가. VALIDATION.md §5 Manual UAT 필수 체크리스트 항목

#### 2. NFR-02 비동기 응답 속도 (실 SMTP 연동 시)

**Test:** SMTP 설정된 환경에서 `POST /api/v1/documents/{id}/submit` 응답 시간 측정
**Expected:** 이메일 발송 완료와 무관하게 API 응답 < 100ms (`@Async` + `AFTER_COMMIT` 보장)
**Why human:** 타이밍 기반 검증은 CI 환경 노이즈. 실 SMTP 연동 MailHog 수동 확인 필요

---

### Gaps Summary

자동 검증 가능한 모든 항목이 통과했습니다. 2개의 human verification 항목이 남아있습니다:

1. **이메일 시각 렌더링** — 이메일 클라이언트별 한글/CSS 렌더링은 MailHog UAT 에서 수동 확인 필요
2. **NFR-02 API 응답 속도** — `@Async` + `AFTER_COMMIT` 코드로 설계는 완성되었으나 실제 응답 시간은 수동 측정 필요

구조적으로 Phase 29 Goal의 모든 핵심 기능은 구현 완료됩니다:
- PENDING-first 3단계 패턴 구현 및 테스트 통과
- 5종 이벤트 GreenMail E2E 검증 통과
- @Retryable/@Recover 재시도/복구 검증 통과
- audit_log COUNT=1 NFR-03 CI 게이트 통과
- BaseUrlGuard prod 환경 보호 구현
- V19/V10 UNIQUE 제약 이중 선언 확인

---

_Verified: 2026-04-23T01:41:24Z_
_Verifier: Claude (gsd-verifier)_

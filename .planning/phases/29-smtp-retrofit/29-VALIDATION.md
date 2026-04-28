---
phase: 29
phase_slug: smtp-retrofit
date: 2026-04-23
based_on: 29-RESEARCH.md §Validation Architecture
---

# Phase 29 Validation Strategy

> Nyquist Dimension 8 compliance — 각 검증 레이어가 충족해야 할 최소 테스트 집합과 성공 기준.

## 1. Unit Layer (Mock-based)

| 대상 | Mock | 검증 포인트 |
|------|------|------------|
| `EmailService.determineRecipients()` | N/A (순수 함수) | 5종 이벤트별 수신자 집합, REFERENCE filter, RETIRED/INACTIVE 제외, `.distinct()` by User.id |
| `ApprovalEmailSender` subject 조립 | `MimeMessageHelper`, `JavaMailSender` | subject regex = `^\[MiceSign\] (결재 요청|승인|최종 승인|반려|회수): \S+ .+$` |
| `ApprovalEmailSender.send()` (SMTP null) | `JavaMailSender = null` | NotificationLog.status=SUCCESS + "[EMAIL STUB]" 로그, 예외 없이 종료 |

## 2. Integration Layer (GreenMail + `@SpringBootTest`)

**테스트 클래스:** `ApprovalNotificationIntegrationTest`
- **Setup:** `@RegisterExtension static GreenMailExtension` (SMTP 3025), `application-test.yml`의 `spring.mail.host=127.0.0.1/port=3025` override, Flyway migration 포함 H2 또는 Testcontainers MariaDB.
- **5개 이벤트 × 4개 검증 = 20 assertion**:
  1. MimeMessage 수신 여부 (GreenMail `getReceivedMessages().length`)
  2. UTF-8 한글 subject 디코딩 (`MimeUtility.decodeText`)
  3. body에 `{app.base-url}/documents/{docId}` 포함
  4. notification_log.status = SUCCESS (PENDING row 없음)
- **수신자 규칙:** APPROVE → 다음 non-REFERENCE 승인자만, REJECT → 기안자 + 이전 승인자들, WITHDRAW → 전원 (중복 제거), FINAL_APPROVE → 기안자 + 모든 승인자·참조자, SUBMIT → 첫 번째 non-REFERENCE 승인자.
- **RETIRED/INACTIVE skip:** seed 3명(ACTIVE/RETIRED/INACTIVE) 결재선, 수신 메시지 개수 = 1.

**테스트 클래스:** `ApprovalEmailSenderRetryTest`
- **Setup:** `@TestConfiguration`으로 `RetryTemplate` delay=0 override (5분 대기 회피), `@MockBean JavaMailSender`가 `doThrow(new MailSendException("simulated"))`.
- **@Retryable 경로:** 3회 attempt, 최종 `@Recover` 호출 검증 (`retry_count`=2, `status=FAILED`, `error_message`="MailSendException: simulated" truncate 255자).
- **@Retryable skip 경로:** `MailAuthenticationException` 주입 시 즉시 FAILED (retry 없음).

**테스트 클래스:** `ApprovalServiceAuditTest` (신규 — `AuditLogGapTest` 패턴 복제)
- **NFR-03 COUNT=1 per action:** SUBMIT/APPROVE/FINAL_APPROVE/REJECT/WITHDRAW 각각 수행 후 `auditLogRepository.countByAction(action) = 1` — 리스너에서 중복 INSERT 금지 검증.

## 3. Contract Tests

| Contract | 검증 방법 |
|----------|-----------|
| Subject format | JUnit ParameterizedTest × 5 events, regex assertion |
| Template variable set | Thymeleaf render output에 `doc.number`, `doc.title`, `drafter.departmentName`, `drafter.fullName`, `eventTimestamp`, `{app.base-url}/documents/{doc.id}`, (REJECT만) `reject.comment` 모두 포함 |
| @Retryable proxy chain | `AopProxyUtils.getSingletonTarget(approvalEmailSender)` 확인, Spring Proxy 아닐 시 테스트 실패 |
| UNIQUE 제약 | 동일 (doc_id, event_type, recipient_id) 2번 insert 시 `DataIntegrityViolationException` |

## 4. Observability Invariants

- **NotificationLog transitions:** PENDING → (SUCCESS | FAILED | RETRY). RETRY → FAILED 또는 RETRY → SUCCESS. 허용되지 않는 전이: SUCCESS → *, FAILED → *.
- **COUNT invariant:** `SELECT COUNT(*) FROM audit_log WHERE document_id=? AND action IN ('APPROVE','SUBMIT',...) GROUP BY action` = 1 for all actions.
- **Idempotency:** 동일 `(document_id, event_type, recipient_id)` SUCCESS row는 ≤1 (DB UNIQUE 강제).

## 5. Manual UAT (MailHog/Mailpit)

| 검증 항목 | 수행 |
|-----------|------|
| 시각 스타일 | 600px 고정폭, CJK 폰트 스택, 인라인 CSS 렌더링 확인 |
| CTA 버튼 | "문서 바로가기" 클릭 → `{app.base-url}/documents/{id}` 이동, 프론트 401 시 login redirect |
| 한글 subject | Gmail/Outlook/iOS Mail 3개 클라이언트에서 깨짐 없음 |

## 6. CI Gate (D-D6)

두 테스트 셋이 통과해야 Phase 29 완료:
1. `./gradlew test --tests "ApprovalNotificationIntegrationTest"` (GreenMail 수신자 규칙)
2. `./gradlew test --tests "ApprovalServiceAuditTest"` (NFR-03 COUNT=1 per action)

추가 필수 통과:
- `./gradlew test --tests "ApprovalEmailSenderRetryTest"` (retry 경로)
- 기존 `RegistrationEmailServiceTest` 회귀 없음

## Coverage Map (Requirements → Tests)

| REQ-ID | 충족 레이어 |
|--------|-------------|
| NOTIF-01 | Unit (subject regex) + Integration (5 events) |
| NOTIF-02 | Integration (CTA href assert) + Manual UAT (한글 subject) |
| NOTIF-03 | Integration (ApprovalEmailSenderRetryTest, 3 attempts → FAILED) |
| NOTIF-04 | Integration (RETIRED/INACTIVE skip, UNIQUE constraint) |
| NOTIF-05 | Integration (ApprovalServiceAuditTest, COUNT=1 per action) |
| NFR-02 | Integration (async behavior: API response <100ms, mail sent post-commit) |
| NFR-03 | ApprovalServiceAuditTest (listener에서 audit insert 금지) |

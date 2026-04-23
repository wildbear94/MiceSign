---
phase: 29
plan: 03
subsystem: notification/email-runtime
tags: [smtp, notification, retry, thymeleaf, mime-utf8, listener-refactor, pending-first]
type: execute
wave: 2

# Dependency graph
requires:
  - phase: 29-01
    provides: "ApprovalEmailSender skeleton (@Retryable/@Recover/REQUIRES_NEW contract) + NotificationLogRepository.findByDocumentIdAndEventTypeAndRecipientId + DB UNIQUE 제약 uk_notification_dedup"
  - phase: 29-02
    provides: "templates/email/approval-{submit,approve,final-approve,reject,withdraw}.html + layouts/approval-base.html — buildContext 변수 contract 입력 대상"
provides:
  - "5종 결재 이벤트 (SUBMIT/APPROVE/FINAL_APPROVE/REJECT/WITHDRAW) 의 실제 SMTP 발송 (또는 stub) end-to-end 경로"
  - "PENDING-first 3단계 로깅 (PENDING insert → mailSender.send → SUCCESS/FAILED/RETRY UPDATE) — 고아 PENDING 행 발생 불가"
  - "@Retryable/@Recover 분기 — MailSendException retry 3회, MailAuthentication/MailParse 즉시 FAILED, MessagingException 즉시 FAILED, 최종 실패 @Recover 가 마감"
  - "EmailService.determineRecipients — UserStatus.ACTIVE 필터(NOTIF-04) + Collectors.toMap distinct by User.id(D-A7) + REFERENCE 제외(D-C2)"
  - "Thymeleaf Context 변수 9키 contract — Plan 02 템플릿 셋과 1:1 매칭"
  - "Subject 포맷 [MiceSign] {actionLabel}: {docNumber} {title} 5종 한글 매핑"
  - "MimeMessageHelper(message, true, \"UTF-8\") + From=\"MiceSign <fromAddress>\" 표준화"
affects:
  - "Plan 29-04 (integration tests) — ApprovalEmailSender.send 시그니처 + Context 변수 set + retry 횟수 가 그대로 단언 대상"
  - "Plan 29-05 (audit COUNT=1) — EmailService 가 audit_log 에 INSERT 하지 않음을 자동 검증"
  - "BudgetIntegrationService / NotificationLogController — EmailService.sendEmail(public stub) 시그니처는 호환성 유지 (NotificationLog INSERT 만 제거)"

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "별도 빈 호출로 @Retryable AOP 프록시 체인 보장 (D-B1, Pitfall 1 회피) — 리스너에서 self.send() 금지"
    - "@Lazy self-injection 으로 REQUIRES_NEW 트랜잭션 helper 호출 (Pitfall 4)"
    - "PENDING-first 3단계 로깅 (find/create PENDING → send → SUCCESS/RETRY/FAILED UPDATE)"
    - "예외 분류 catch — MailSendException(transient, retry) / MailAuthentication+MailParse(permanent) / MessagingException(builder fault)"
    - "Collectors.toMap(User::getId, identity, (a,b)->a, LinkedHashMap::new) — equals/hashCode 미구현 Entity 의 distinct + insertion-order 보존"

key-files:
  created: []
  modified:
    - "backend/src/main/java/com/micesign/service/EmailService.java (75 ins / 105 del — 종합 LOC 감소)"
    - "backend/src/main/java/com/micesign/service/email/ApprovalEmailSender.java (173 ins / 19 del — 스켈레톤 → 완성)"

key-decisions:
  - "EmailService.sendEmail(public, log-only) 호환성 stub 유지 — BudgetIntegrationService / NotificationLogController 호출자 보호 (CLAUDE.md 기존 기능 보존). NotificationLog INSERT/audit 호출은 모두 제거 (NFR-03 준수)"
  - "ApprovalEmailSender 에 ApprovalLineRepository 추가 주입 — Document 엔티티에 getApprovalLines() 가 없어 buildContext 의 REJECT 분기에서 rejectComment 추출에 필수 (Plan 명세 보강, Rule 1 자동수정)"
  - "NotificationLog.eventType 저장 = String type.name() — Plan 01 SUMMARY 결정 그대로 (Repository 시그니처 = String)"
  - "send() 의 catch 블록 순서 = MailSendException → MailAuthenticationException|MailParseException → MessagingException — 좁은 예외 우선 + permanent 그룹 + 빌더 결함 구분"
  - "buildContext 의 actionLabel 변수도 set — Plan 02 템플릿이 본문에 사용하지 않더라도 contract 명세상 8개 공통 변수에 포함되어 있어 그대로 노출 (Plan 02 SUMMARY 의 'subject 전용' 주석은 향후 제목줄 사용 옵션 유지를 위한 것)"
  - "기존 RegistrationServiceTest 의 AuditLogService.log() overload ambiguity 컴파일 결함은 OUT-OF-SCOPE (Plan 01 SUMMARY 의 deferred-items.md 에 이미 등재)"

patterns-established:
  - "approval 이메일 발송 표준 시퀀스 — listener(EmailService) → dispatcher(approvalEmailSender.send) → log helper(self.findOrCreatePendingLog/persistLog) → SMTP(JavaMailSender)"
  - "이메일 발송 빈의 catch 분기 표준화 — 본 patten 을 향후 다른 도메인 알림(예: registration 통합 시) 에 적용 가능"

requirements-completed: [NOTIF-01, NOTIF-02, NOTIF-03, NOTIF-04, NOTIF-05, NFR-02]

# Metrics
duration: ~5 min
tasks_completed: 2
files_changed: 2
commits: 2
completed: 2026-04-23
---

# Phase 29 Plan 03: SMTP 인프라 Wave 2 (EmailService 리팩터 + ApprovalEmailSender 실로직) Summary

**Plan 01의 ApprovalEmailSender 스켈레톤(`UnsupportedOperationException`)을 PENDING-first 3단계 + Thymeleaf 렌더 + MimeMessageHelper UTF-8 + 3가지 예외 분류로 완성하고, EmailService 리스너를 `approvalEmailSender.send` 위임 + ACTIVE+distinct 수신자 필터로 리팩터해 5종 결재 이벤트의 실 SMTP 발송 end-to-end 경로를 완성**

## Performance

- **Duration:** ~5 min
- **Completed:** 2026-04-23
- **Tasks:** 2 (모두 type=auto, TDD 없음)
- **Files modified:** 2 (생성 0)
- **Net LOC delta:** EmailService -30 / ApprovalEmailSender +154 = +124 (스켈레톤이 실로직으로 부풀어 오른 만큼)

## What was built

### 1. EmailService 리팩터 (Task 1, 9129a47)

**역할 변화:** 스텁 발송기 → 디스패처 전용 (수신자 결정 + 위임).

| 구분 | 변경 |
|------|------|
| 주입 | `ApprovalEmailSender approvalEmailSender` 추가, `NotificationLogRepository` 직접 의존 제거 |
| `sendNotification()` 본문 | `eventType` String 분기 → `NotificationEventType` switch + `for (User r : recipients) approvalEmailSender.send(doc, r, type)` 위임 (D-B1 별도 빈 호출, Pitfall 1 회피) |
| `determineRecipients()` 시그니처 | `(Document, String)` → `(Document, NotificationEventType)` |
| `determineRecipients()` 본문 | switch expression 으로 통합 + `UserStatus.ACTIVE` 필터(NOTIF-04) + `Collectors.toMap(User::getId, identity, (a,b)->a, LinkedHashMap::new)` distinct (D-A7) |
| 제거 | `sendToRecipient()` (send-first save-last 로직 — D-A1 위반), `getActionLabel()` (ApprovalEmailSender 가 내재화), subject 조립 라인 |
| 보존 | `@TransactionalEventListener(AFTER_COMMIT) + @Async` 외부 구조 (D-B1) |
| 호환성 | `sendEmail(to, subject, template, vars)` public log-only stub 만 유지 — BudgetIntegrationService 와 NotificationLogController 호출자 보호. NotificationLog INSERT 와 audit 호출은 제거 (NFR-03) |

**audit_log 미사용 검증:** `! grep -q "auditLog" EmailService.java` — T-29-03-05 mitigate 그대로.

### 2. ApprovalEmailSender 실 로직 (Task 2, 08a1ee8)

**역할 변화:** Plan 01의 스켈레톤(`UnsupportedOperationException` 두 곳) → 완성.

#### `send(Document, User, NotificationEventType)` — 메인 발송 메서드

```java
@Retryable(retryFor=MailSendException, noRetryFor={MailAuthenticationException, MailParseException},
           maxAttempts=3, backoff=@Backoff(delayExpression="#{${app.mail.retry.delay-ms:300000}}"))
public void send(Document doc, User recipient, NotificationEventType eventType) {
    NotificationLog notifLog = self.findOrCreatePendingLog(doc, recipient, eventType);  // Step 1

    if (mailSender == null) {                                                            // Step 2 (D-D7)
        log.info("[EMAIL STUB] To: {}, Subject: {}", recipient.getEmail(), notifLog.getSubject());
        notifLog.setStatus(SUCCESS); notifLog.setSentAt(now()); self.persistLog(notifLog);
        return;
    }

    try {                                                                                // Step 3
        String html = templateEngine.process("email/approval-" + toTemplateSlug(eventType),
                                              buildContext(doc, recipient, eventType));
        MimeMessage msg = mailSender.createMimeMessage();
        MimeMessageHelper helper = new MimeMessageHelper(msg, true, "UTF-8");           // Pitfall 3
        helper.setFrom("MiceSign <" + fromAddress + ">");                                // D-C5
        helper.setTo(recipient.getEmail());
        helper.setSubject(notifLog.getSubject());                                        // D-C1
        helper.setText(html, true);
        mailSender.send(msg);
        notifLog.setStatus(SUCCESS); notifLog.setSentAt(now()); self.persistLog(notifLog);

    } catch (MailSendException e) {     // transient — RETRY UPDATE + rethrow (D-A9)
    } catch (MailAuthenticationException | MailParseException e) {  // permanent — FAILED (D-A5)
    } catch (MessagingException e) {    // builder fault — FAILED
    }
}
```

#### `findOrCreatePendingLog` — Idempotent PENDING 진입점

```java
@Transactional(propagation = REQUIRES_NEW)
public NotificationLog findOrCreatePendingLog(Document doc, User recipient, NotificationEventType type) {
    return notificationLogRepository
            .findByDocumentIdAndEventTypeAndRecipientId(doc.getId(), type.name(), recipient.getId())
            .orElseGet(() -> {
                NotificationLog fresh = new NotificationLog();
                fresh.setRecipient(recipient);
                fresh.setRecipientEmail(recipient.getEmail());   // D-A8 snapshot
                fresh.setDocumentId(doc.getId());
                fresh.setEventType(type.name());                 // String (NotificationLog.eventType)
                fresh.setSubject(buildSubject(doc, type));       // [MiceSign] ... 포맷 D-C1
                fresh.setStatus(PENDING);
                fresh.setRetryCount(0);
                return notificationLogRepository.save(fresh);
            });
}
```

#### `recover` (Plan 01 시그니처 그대로)

`@Retryable` 3회 소진 후 호출 — 이미 `RETRY` 상태로 UPDATE 된 row를 `FAILED` 로 마감. 이로써 PENDING 고아 행이 발생 불가능 (Phase 29 Success Criteria #3 충족).

#### `buildSubject` — D-C1 포맷

```
[MiceSign] {actionLabel}: {docNumber} {title}
```
- `actionLabel`: SUBMIT="결재 요청" / APPROVE="승인" / FINAL_APPROVE="최종 승인" / REJECT="반려" / WITHDRAW="회수"
- `docNumber`: null 시 "DRAFT"

#### `buildContext` — Plan 02 템플릿 변수 9키

| 키 | 타입 | 출처 |
|---|---|---|
| docNumber | String | `doc.getDocNumber()` (null → "DRAFT") |
| docTitle | String | `doc.getTitle()` |
| drafterName | String | `doc.getDrafter().getName()` |
| drafterDepartment | String | `doc.getDrafter().getDepartment().getName()` (null-safe) |
| recipientName | String | `recipient.getName()` |
| actionLabel | String | 5종 한글 매핑 |
| eventTime | LocalDateTime | `now()` |
| approvalUrl | String | `baseUrl + "/documents/" + doc.getId()` (T-29-03-02 토큰 미주입) |
| rejectComment | String | REJECT 한정 — `approval_line.status=REJECTED` 의 `comment` (D-C6) |

#### `toTemplateSlug` — Plan 02 파일명 매핑

`SUBMIT→submit / APPROVE→approve / FINAL_APPROVE→final-approve / REJECT→reject / WITHDRAW→withdraw`

## Plan 04 / Plan 05 가 참조할 contract

1. **메서드 시그니처 (변경 금지)**
   - `ApprovalEmailSender.send(Document, User, NotificationEventType)` — void
   - `ApprovalEmailSender.recover(MailException, Document, User, NotificationEventType)` — void
2. **Subject regex** — `^\[MiceSign\] (결재 요청|승인|최종 승인|반려|회수): \S+ .+$` (docNumber=DRAFT 시 docNumber 자리는 `DRAFT`)
3. **Context 변수 set** — 위 9키 (REJECT 외에는 8키)
4. **Retry 횟수 = 3 attempts** (= 초기 1 + retry 2). `app.mail.retry.delay-ms=0` 으로 test 환경에서 backoff 제거 가능 (Plan 01 application.yml property)
5. **NotificationLog 상태 전이**
   - 정상: PENDING → SUCCESS
   - Transient retry 경로: PENDING → RETRY (retry_count++) → ... → 최종 SUCCESS 또는 @Recover 가 FAILED
   - Permanent: PENDING → FAILED (errorMessage = "{ExceptionClass}: {message}", 255자 truncate)
6. **PENDING 고아 행 없음 보장** — 모든 send 경로가 SUCCESS / RETRY / FAILED 중 하나로 마감. @Recover 가 마지막 안전망.
7. **EmailService 가 audit_log 에 INSERT 하지 않음** — `grep "auditLog" EmailService.java` = 0건 (Plan 05 audit COUNT=1 검증 자동 통과 조건)

## Verification

| 검사 | 결과 |
|------|------|
| Task 1 grep markers (approvalEmailSender.send / UserStatus.ACTIVE / Collectors.toMap / REFERENCE / no sendToRecipient,private sendEmail,getActionLabel / no auditLog) | PASS |
| Task 2 grep markers (mailSender.send / UTF-8 / MiceSign &lt; / [EMAIL STUB] / 결재 요청 / 최종 승인 / toTemplateSlug / self.persistLog / self.findOrCreatePendingLog / rejectComment / no UnsupportedOperationException) | PASS |
| `./gradlew compileJava --quiet` | PASS (Task 1, Task 2 양쪽) |
| `./gradlew test --tests RegistrationEmailServiceTest` | OUT-OF-SCOPE — Plan 01 SUMMARY 의 known issue (RegistrationServiceTest.java AuditLogService.log() overload ambiguity, base 결함) — 본 plan 변경과 무관, deferred-items.md 등재 |
| RegistrationEmailService.java 회귀 | 0줄 변경 (`git diff HEAD~2 -- ...RegistrationEmailService.java | wc -l == 0`) |
| ApprovalService/DocumentService/ApprovalNotificationEvent 회귀 | 0줄 변경 (CONTEXT canonical_refs 수정 금지 경계 준수) |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] EmailService.sendEmail() 외부 호출자 호환성 — 빌드 차단**
- **Found during:** Task 1 첫 컴파일 시 (BudgetIntegrationService L237 + NotificationLogController L79 가 EmailService.sendEmail 호출 중)
- **Issue:** Plan 명세대로 `sendEmail()` 을 제거하면 `cannot find symbol` 컴파일 에러 발생 — Plan 작성 시 외부 호출자 검증 누락. CLAUDE.md / MEMORY 의 "기존 기능 보존" 원칙에도 충돌.
- **Fix:** `sendEmail(to, subject, template, vars)` public 시그니처는 유지하되 본문은 `log.info("[EMAIL STUB] ...")` 한 줄로 단순화. NotificationLog INSERT 와 audit 호출은 모두 제거 (NFR-03 준수). 수정된 메서드는 Plan verify 의 `! grep "private.*sendEmail"` 패턴에 매치되지 않으므로(public 으로 변경) 자동 검증 통과.
- **Files modified:** `backend/src/main/java/com/micesign/service/EmailService.java`
- **Commit:** `9129a47`

**2. [Rule 1 - Bug] ApprovalEmailSender.buildContext 의 REJECT 분기 — Document 엔티티에 getApprovalLines() 부재**
- **Found during:** Task 2 작성 직전 — Plan 명세 (`doc.getApprovalLines().stream().filter(l -> l.getStatus() == REJECTED).findFirst()`) 가 Document 엔티티의 실제 API 와 불일치. `Document.java` 에는 approvalLines 필드/getter 가 없음.
- **Fix:** ApprovalEmailSender 생성자에 `ApprovalLineRepository approvalLineRepository` 주입 추가. REJECT 분기에서 `approvalLineRepository.findByDocumentIdOrderByStepOrderAsc(doc.getId())` 로 조회 후 `ApprovalLineStatus.REJECTED` 필터링.
- **Files modified:** `backend/src/main/java/com/micesign/service/email/ApprovalEmailSender.java`
- **Commit:** `08a1ee8`

### Out-of-scope (deferred — not introduced by this plan)

- `compileTestJava` 실패 — `RegistrationServiceTest.java` line 105/266/370 의 `AuditLogService.log()` overload ambiguity. **Plan 29-03 이 변경하지 않은 파일**이며 base 에서 이미 존재하던 결함. Plan 01 SUMMARY 의 `deferred-items.md` 에 이미 등재됨. SCOPE BOUNDARY 정책에 따라 본 plan 의 fix-attempt 대상이 아님.

## User Setup Required

없음 — 백엔드 코드 변경만. SMTP 공급자 결정 / `MAIL_HOST` 환경변수 / `APP_BASE_URL` 환경변수는 Plan 29-05 (운영 prod 보강) + Phase 33 (운영 런북) 범위. Phase 29 의 dev/test 환경에서는 stub mode (`mailSender == null`) 가 자동 동작.

## Tasks & Commits

| Task | Commit | Files | Note |
|------|--------|-------|------|
| Task 1: EmailService 리팩터 | `9129a47` | EmailService.java | sendEmail public stub 호환 보존 (Rule 1) |
| Task 2: ApprovalEmailSender 실 로직 | `08a1ee8` | ApprovalEmailSender.java | ApprovalLineRepository 추가 주입 (Rule 1) |

## Threat Flags

신규 위협 표면 발견되지 않음. 모든 변경이 plan `<threat_model>` 의 6개 분류 안에 있으며, T-29-03-01 (PII 본문 미주입), T-29-03-02 (토큰 URL 금지), T-29-03-04 (maxAttempts=3 상한), T-29-03-05 (audit_log 미사용) 모두 mitigate 그대로 적용.

## Self-Check

**Files modified — exist + content verified:**
- FOUND: `backend/src/main/java/com/micesign/service/EmailService.java` (163 lines) — `approvalEmailSender.send` / `UserStatus.ACTIVE` / `Collectors.toMap` 모두 포함, `auditLog`/`sendToRecipient`/`private sendEmail`/`getActionLabel` 모두 없음
- FOUND: `backend/src/main/java/com/micesign/service/email/ApprovalEmailSender.java` (289 lines) — `mailSender.send(message)` / `MimeMessageHelper(message, true, "UTF-8")` / `[EMAIL STUB]` / `결재 요청` / `최종 승인` / `toTemplateSlug` / `self.persistLog` / `self.findOrCreatePendingLog` / `rejectComment` 모두 포함, `UnsupportedOperationException` 없음

**Commits exist:**
- FOUND: `9129a47` (refactor(29-03): EmailService를 ApprovalEmailSender 위임...)
- FOUND: `08a1ee8` (feat(29-03): ApprovalEmailSender 실 로직 구현 ...)

## Self-Check: PASSED

---
*Phase: 29-smtp-retrofit*
*Completed: 2026-04-23*

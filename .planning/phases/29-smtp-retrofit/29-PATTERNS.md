# Phase 29: SMTP 이메일 알림 인프라 (Retrofit) - Pattern Map

**Mapped:** 2026-04-23
**Phase:** 29 — SMTP 이메일 알림 인프라 (Retrofit)
**Output file:** `.planning/phases/29-smtp-retrofit/29-PATTERNS.md`

---

## Overview

| 항목 | 수 |
|------|---|
| 총 대상 파일 | 15 |
| 신규 생성 (NEW) | 11 |
| 수정 (MODIFY) | 4 |
| 강한 analog 보유 | 13 |
| No-analog (from scratch) | 2 (`BaseUrlGuard.java`, `ApprovalEmailSenderRetryTest.java`의 일부 Retry 어서트 스켈레톤만) |

**벤치마크 코어 파일 (반복 참조):**
- `backend/src/main/java/com/micesign/service/RegistrationEmailService.java` — SMTP 발송 Gold Standard
- `backend/src/main/java/com/micesign/budget/RealBudgetApiClient.java` — `@Retryable`/`@Recover` 별도 빈 선례
- `backend/src/main/resources/templates/email/registration-submit.html` — Thymeleaf 시각 스타일 기준
- `backend/src/main/resources/db/migration/V16__extend_notification_log_for_registration.sql` — Flyway migration 스타일
- `backend/src/test/java/com/micesign/registration/RegistrationEmailServiceTest.java` — SMTP mock unit 테스트
- `backend/src/test/java/com/micesign/admin/AuditLogGapTest.java` — `@SpringBootTest` + `JdbcTemplate` audit COUNT 테스트

---

## File Classification

| 대상 파일 | Role | Data Flow | 최근접 Analog | 매칭 품질 |
|-----------|------|-----------|--------------|-----------|
| `backend/src/main/java/com/micesign/service/email/ApprovalEmailSender.java` (NEW) | Service `@Component` with `@Retryable`+`@Recover` + Thymeleaf render + PENDING-first log | request-response (sync) — 리스너가 호출, 내부 블로킹 SMTP I/O | `RegistrationEmailService.java` (SMTP 메카닉) + `RealBudgetApiClient.java` (@Retryable/@Recover 격리) | **hybrid-exact** (두 파일 복합) |
| `backend/src/main/java/com/micesign/service/EmailService.java` (MODIFY) | Spring event listener + 수신자 결정 | event-driven (`@TransactionalEventListener(AFTER_COMMIT)` + `@Async`) | `RegistrationEmailService.handleRegistrationEvent` (리스너 뼈대) | exact |
| `backend/src/main/java/com/micesign/domain/NotificationLog.java` (MODIFY) | JPA entity — `@Table(uniqueConstraints=...)` 1줄 추가 | data — 정적 스키마 선언 | 현재 파일 자체 (`@Table(name="notification_log")` 수정) + Spring Data JPA `@UniqueConstraint` 표준 | exact |
| `backend/src/main/java/com/micesign/config/BaseUrlGuard.java` (NEW) | Startup guard `@Configuration` + `@Profile("prod")` + `@EventListener(ApplicationReadyEvent)` | lifecycle — application startup hook | 없음 (리포 내 `ApplicationReadyEvent` 리스너 0건) | **no-analog** — research §D-D2 스켈레톤 사용 |
| `backend/src/main/java/com/micesign/repository/NotificationLogRepository.java` (MODIFY, Assumption A4) | Spring Data JPA repository — derived query 1줄 추가 | CRUD (read) | 현재 파일의 `findByStatusAndRetryCountLessThan` | exact (동일 파일 내 패턴) |
| `backend/src/main/resources/templates/email/layouts/approval-base.html` (NEW) | Thymeleaf fragment layout (`th:fragment="layout (body)"`) | template render — SpringTemplateEngine 호출 | `registration-submit.html` 시각 스타일 + Thymeleaf 3.1 fragment 표준 syntax | role-match (새 파일이지만 스타일 100% 재사용) |
| `backend/src/main/resources/templates/email/approval-submit.html` (NEW) | Thymeleaf page — `th:replace="~{layouts/approval-base :: layout(~{::body/*})}"` | template render | `registration-submit.html` (body 구조) | role-match |
| `backend/src/main/resources/templates/email/approval-approve.html` (NEW) | 동상 | 동상 | `registration-approve.html` | role-match |
| `backend/src/main/resources/templates/email/approval-final-approve.html` (NEW) | 동상 | 동상 | `registration-approve.html` (최종 승인 톤) | role-match |
| `backend/src/main/resources/templates/email/approval-reject.html` (NEW) | 동상 + `rejectComment` 블록 | 동상 | `registration-reject.html` (rejectionReason 표시) | exact |
| `backend/src/main/resources/templates/email/approval-withdraw.html` (NEW) | 동상 | 동상 | `registration-*.html` 공통 | role-match |
| `backend/src/main/resources/db/migration/V19__add_notification_dedup_unique.sql` (NEW) | Flyway DDL migration (`ALTER TABLE ... ADD CONSTRAINT UNIQUE`) | schema change — 1회성 DDL | `V16__extend_notification_log_for_registration.sql` + `V13__add_doc_sequence_unique_constraint.sql` (UNIQUE 추가 스타일) | exact |
| `backend/src/test/resources/db/testmigration/V9__add_notification_dedup_unique.sql` (NEW, mirror of V19) | H2 test migration mirror | schema change | `V7__extend_notification_log_for_registration.sql` (H2 dialect) | exact |
| `backend/src/main/resources/application-prod.yml` (MODIFY) | YAML config — `app.base-url` 블록 1개 추가 | config | 현재 파일 (`app.cookie.secure`) + `application.yml` `app.base-url` line 43-44 | exact |
| `backend/src/test/resources/application-test.yml` (MODIFY) | YAML config — `spring.mail.*` + `app.base-url` 블록 추가 | config | `application.yml` line 25-36 (`spring.mail.*` 기본 구조) | exact |
| `backend/build.gradle.kts` (MODIFY) | Gradle 의존성 1줄 추가 | build config | line 65-69 기존 `testImplementation` 블록 | exact |
| `backend/src/test/java/com/micesign/notification/ApprovalNotificationIntegrationTest.java` (NEW) | `@SpringBootTest` 통합 테스트 + GreenMail + `JdbcTemplate` | test — event publish → SMTP 수신 → DB 검증 | `AuditLogGapTest.java` (SpringBootTest + JdbcTemplate) + RESEARCH §Validation Architecture GreenMail skeleton | role-match (애너테이션) + 신규 GreenMail 스킬 |
| `backend/src/test/java/com/micesign/notification/ApprovalEmailSenderRetryTest.java` (NEW) | `@SpringBootTest` + `@MockBean JavaMailSender` + `@TestConfiguration` RetryTemplate | test — retry path | `RegistrationEmailServiceTest.java` (Mockito mock 구조) + RESEARCH §Code Examples retry 스켈레톤 | role-match |
| `backend/src/test/java/com/micesign/document/ApprovalServiceAuditTest.java` (NEW) | `@SpringBootTest` + `MockMvc` + `JdbcTemplate` audit COUNT assert | test — CRUD + audit_log row count | `AuditLogGapTest.java` (동일 패턴 복제) | **exact** — 패턴 복제 대상 |

---

## Analog Code Excerpts

### 1. `ApprovalEmailSender.java` (NEW) → Hybrid of `RegistrationEmailService` + `RealBudgetApiClient`

#### 1A. 생성자 + null-safe JavaMailSender 주입 (from `RegistrationEmailService.java:44-67`)
```java
// backend/src/main/java/com/micesign/service/RegistrationEmailService.java:44-67
private final JavaMailSender mailSender;
private final SpringTemplateEngine templateEngine;
// ...

@Value("${app.base-url:http://localhost:5173}")
private String baseUrl;

@Value("${spring.mail.username:noreply@micesign.com}")
private String fromAddress;

public RegistrationEmailService(
        @Autowired(required = false) JavaMailSender mailSender,     // ← null-safe (D-D7)
        SpringTemplateEngine templateEngine,
        RegistrationRequestRepository registrationRequestRepository,
        UserRepository userRepository,
        NotificationLogRepository notificationLogRepository) {
    this.mailSender = mailSender;
    // ...
}
```
**복제 포인트:** `@Value("${app.base-url:...}")`, `@Value("${spring.mail.username:...}")`, `@Autowired(required=false) JavaMailSender mailSender` 3종 세트 그대로. Research §1에 명시된 `@Lazy ApprovalEmailSender self` 1 파라미터 추가.

#### 1B. `@Retryable` + `@Recover` 별도 빈 격리 (from `RealBudgetApiClient.java:35-58`)
```java
// backend/src/main/java/com/micesign/budget/RealBudgetApiClient.java:35-58
@Retryable(
        label = "sendExpenseData",
        retryFor = {RestClientException.class},
        maxAttempts = 3,
        backoff = @Backoff(delay = 2000, multiplier = 1.5)
)
public BudgetApiResponse sendExpenseData(BudgetExpenseRequest request) {
    log.info("Sending expense data to budget API: docNumber={}", request.docNumber());
    return budgetRestClient.post()
            // ...
            .body(BudgetApiResponse.class);
}

@Recover
public BudgetApiResponse recoverSendExpenseData(RestClientException e,
                                                 BudgetExpenseRequest request) {
    log.error("Budget API sendExpenseData failed after all retries: docNumber={}, error={}",
            request.docNumber(), e.getMessage());
    return null;
}
```
**복제 포인트:** (1) `@Retryable` / `@Recover` 가 **같은 클래스 내 같은 빈**에 존재 — 프록시 체인 보장 (Pitfall 1 회피). (2) `@Recover` 첫 파라미터=`Throwable`, 이후 파라미터=원 메서드 args 동일 순서·타입. (3) 반환 타입 `void` 일치 (Pitfall 2).
**D-B2 차이점:** Phase 29는 `retryFor = {MailSendException.class}` + `noRetryFor = {MailAuthenticationException.class, MailParseException.class}` + `backoff = @Backoff(delay = 300_000L)` (5분 고정 — FSD 스펙).

#### 1C. MimeMessageHelper + UTF-8 + Thymeleaf render (from `RegistrationEmailService.java:162-177`)
```java
// backend/src/main/java/com/micesign/service/RegistrationEmailService.java:162-177
if (mailSender == null) {
    // Dev mode: log only, no SMTP configured
    log.info("[EMAIL STUB] To: {}, Subject: {}", to, subject);
    notifLog.setStatus(NotificationStatus.SUCCESS);
    notifLog.setSentAt(LocalDateTime.now());
} else {
    String html = templateEngine.process("email/" + templateName, ctx);
    MimeMessage message = mailSender.createMimeMessage();
    MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");   // ← Pitfall 3 방어
    helper.setTo(to);
    helper.setSubject(subject);
    helper.setText(html, true);
    helper.setFrom("MiceSign <" + fromAddress + ">");
    mailSender.send(message);
    notifLog.setStatus(NotificationStatus.SUCCESS);
    notifLog.setSentAt(LocalDateTime.now());
}
```
**복제 포인트:** 전 라인 그대로 복제 가능. `new MimeMessageHelper(message, true, "UTF-8")` 3-arg 형 필수 (Pitfall 3 — 한글 subject `?????` 방어). `helper.setFrom("MiceSign <...>")` 포맷도 D-C5에서 동일.

#### 1D. NotificationLog 채우기 + PENDING-first (교체 대상 = 현 `EmailService.sendToRecipient` 역순)
```java
// backend/src/main/java/com/micesign/service/RegistrationEmailService.java:153-187 (현 패턴)
NotificationLog notifLog = new NotificationLog();
notifLog.setRecipient(recipient);
notifLog.setRecipientEmail(to);                    // D-A8 — send 시점 email snapshot
notifLog.setEventType(eventType.name());
notifLog.setRegistrationRequestId(registrationRequestId);
notifLog.setSubject(subject);
try { /* send */ } catch (Exception e) { /* FAILED */ }
notificationLogRepository.save(notifLog);          // ← 현재는 "send 후 save" (Pitfall 17)
```
**Phase 29 변경점:** 순서를 **PENDING insert → send → SUCCESS/FAILED UPDATE** 로 역전. `save()` 호출을 `persistLog()` helper(@Transactional(REQUIRES_NEW)) 로 감싸서 각 commit 독립화. `findOrCreatePendingLog()` 조회 → 없으면 PENDING row INSERT → send → 이후 UPDATE.

---

### 2. `EmailService.java` (MODIFY) → Self-analog + 리팩터링

#### 2A. 현재 보존 구간 (`EmailService.java:59-90` + `111-156` + `183-192`)
```java
// 현재 파일 보존 대상 — 수신자 결정 + actionLabel 매핑
@TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
@Async
public void sendNotification(ApprovalNotificationEvent event) {
    try {
        Document document = documentRepository.findByIdWithDrafter(event.getDocumentId())
                .orElse(null);
        if (document == null) { log.warn(...); return; }
        String eventType = event.getEventType();
        List<User> recipients = determineRecipients(document, eventType);
        // ... (subject 조립은 ApprovalEmailSender 로 이관)
        for (User recipient : recipients) {
            sendToRecipient(recipient, subject, eventType, document);    // ← 교체: approvalEmailSender.send(doc, recipient, type)
        }
    } catch (Exception e) { log.error(...); }
}
```

#### 2B. 제거 대상 (`EmailService.java:100-105` + `158-181` + `78-82`)
- `sendEmail(to, subject, templateName, variables)` — stub method, 호출자 확인 후 삭제 여부 결정
- `sendToRecipient(...)` private helper — 전체 삭제 후 `approvalEmailSender.send(...)` 호출로 교체
- subject 조립 코드 (line 79-81) — `ApprovalEmailSender.buildSubject()` 로 이관

#### 2C. 추가 필요 (RESEARCH §2 + D-A7)
```java
// determineRecipients 끝에 .distinct by User.id + ACTIVE filter 추가
return baseStream
        .filter(u -> u != null && u.getStatus() == UserStatus.ACTIVE)      // NOTIF-04
        .collect(Collectors.toMap(User::getId, Function.identity(), (a, b) -> a, LinkedHashMap::new))
        .values().stream().toList();
```
**복제 포인트:** 기존 `switch (type) { ... }` 블록은 그대로. 마지막 `return recipients;` 를 위 스트림 체인으로 교체. `RegistrationEmailService.handleRegistrationEvent:72-97` 의 try/catch 바깥 구조도 그대로 유지.

---

### 3. `NotificationLog.java` (MODIFY) → 1줄 추가

#### 3A. 현재 (`NotificationLog.java:7-9`)
```java
@Entity
@Table(name = "notification_log")
public class NotificationLog {
```

#### 3B. 교체 후 (D-A3)
```java
@Entity
@Table(
    name = "notification_log",
    uniqueConstraints = @UniqueConstraint(
        name = "uk_notification_dedup",
        columnNames = {"document_id", "event_type", "recipient_id"}
    )
)
public class NotificationLog {
```
**복제 포인트:** `jakarta.persistence.UniqueConstraint` import 1개 추가 (기존 `jakarta.persistence.*` wildcard 이므로 import 변경 불필요). 이름은 V19 migration 의 `uk_notification_dedup` 과 정확히 일치해야 `ddl-auto=validate` 통과.

---

### 4. `NotificationLogRepository.java` (MODIFY, Assumption A4) → 현재 파일 패턴 복제

#### 4A. 현재 패턴 (`NotificationLogRepository.java:10-13`)
```java
public interface NotificationLogRepository extends JpaRepository<NotificationLog, Long>, JpaSpecificationExecutor<NotificationLog> {
    List<NotificationLog> findByStatusAndRetryCountLessThan(NotificationStatus status, int maxRetries);
}
```

#### 4B. 추가 필요 (RESEARCH §1, `findOrCreatePendingLog` 지원)
```java
Optional<NotificationLog> findByDocumentIdAndEventTypeAndRecipientId(
        Long documentId, String eventType, Long recipientId);
```
**복제 포인트:** Spring Data JPA derived query — 메서드 이름 컨벤션만 맞추면 구현 자동 생성. `Optional` import 추가 필요 (`java.util.Optional`).

---

### 5. `BaseUrlGuard.java` (NEW) → **No-analog** (리포 전체 `ApplicationReadyEvent` 리스너 0건)

**Grep 결과:** `grep -rn "ApplicationReadyEvent" backend/src/main/java/` = 0 매치.
**Skeleton source:** RESEARCH.md §Common Pitfalls Pitfall 5 + CONTEXT D-D2.
```java
// 신규 작성 — 리포 내 analog 없음
package com.micesign.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.annotation.Profile;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

@Component
@Profile("prod")
public class BaseUrlGuard {
    private static final Logger log = LoggerFactory.getLogger(BaseUrlGuard.class);

    @Value("${app.base-url:}")
    private String baseUrl;

    @EventListener(ApplicationReadyEvent.class)
    public void verifyBaseUrl() {
        if (baseUrl == null || baseUrl.isBlank() || baseUrl.contains("localhost")) {
            throw new IllegalStateException(
                "[BaseUrlGuard] app.base-url must be set to a non-localhost URL in prod profile. Got: " + baseUrl);
        }
        log.info("[BaseUrlGuard] Verified app.base-url={}", baseUrl);
    }
}
```
**주의:** `@Profile("prod")` 는 `@Component` 와 짝 — `@ActiveProfiles("test")` 테스트에서는 로드되지 않음. 별도 Contract Test (RESEARCH §Contract Tests line 1118) 가 `SpringBootTest(properties="spring.profiles.active=prod", "app.base-url=http://localhost/")` 로 startup 실패 검증.

---

### 6. Thymeleaf templates (NEW 6개) → `registration-submit.html` 시각 스타일 직접 상속

#### 6A. `registration-submit.html` 전체 (41 lines — 전부 스타일 재사용 대상)
```html
<!-- backend/src/main/resources/templates/email/registration-submit.html:1-40 -->
<!DOCTYPE html>
<html xmlns:th="http://www.thymeleaf.org">
<head>
    <meta charset="UTF-8"/>
    <title>등록 신청 접수 확인</title>
</head>
<body style="margin:0; padding:0; font-family:'Malgun Gothic','Apple SD Gothic Neo',sans-serif; background-color:#f5f5f5;">
    <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px; margin:20px auto; background-color:#ffffff; border-radius:8px; overflow:hidden;">
        <tr>
            <td style="background-color:#2563eb; padding:24px 32px;">
                <h1 style="color:#ffffff; margin:0; font-size:20px;">MiceSign</h1>
            </td>
        </tr>
        <tr>
            <td style="padding:32px;">
                <h2 style="color:#1e293b; margin:0 0 16px 0; font-size:18px;">등록 신청 접수 확인</h2>
                <!-- body 섹션 -->
                <table style="background-color:#f8fafc; border-radius:6px; padding:16px; width:100%; margin:16px 0;">
                    <tr>
                        <td style="padding:8px 16px; color:#64748b; font-size:14px;">신청일시</td>
                        <td style="padding:8px 16px; color:#1e293b; font-size:14px;" th:text="${submittedDate}">...</td>
                    </tr>
                </table>
            </td>
        </tr>
        <tr>
            <td style="padding:16px 32px; background-color:#f8fafc; border-top:1px solid #e2e8f0;">
                <p style="color:#94a3b8; font-size:12px; margin:0; text-align:center;">
                    이 알림은 MiceSign 시스템에서 자동 발송되었습니다.
                </p>
            </td>
        </tr>
    </table>
</body>
</html>
```

**layout fragment 분리 규칙 (D-C3 + RESEARCH §Pattern 4):**
- `layouts/approval-base.html` 에 헤더 (`<tr><td>MiceSign</td>`) + body slot (`th:replace="${body}"`) + CTA 버튼 (`th:href="${approvalUrl}"`) + 푸터를 모두 집약
- `approval-{event}.html` 5개는 `<h2>` + `<table>` 메타데이터 블록만 body 에 담고 layout 으로 감쌈
- CSS class 사용 금지 — 모든 스타일 인라인 (Gmail/Outlook 호환성, D-C7)
- `@Meta charset="UTF-8"` 필수 (Pitfall 3)

**Thymeleaf 3.1 fragment expression 확정 구문** (RESEARCH §State of the Art line 915):
```html
<html th:replace="~{layouts/approval-base :: layout(~{::body/*})}">
```

---

### 7. V19 Flyway migration (NEW) → `V16__extend_notification_log_for_registration.sql` 스타일 복제

#### 7A. Analog (`V16__extend_notification_log_for_registration.sql:1-19`)
```sql
-- notification_log: 등록 알림 지원 확장
-- FK 이름 확인: SELECT CONSTRAINT_NAME FROM information_schema.TABLE_CONSTRAINTS
--   WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'notification_log'
--   AND CONSTRAINT_TYPE = 'FOREIGN KEY';

ALTER TABLE notification_log DROP FOREIGN KEY notification_log_ibfk_1;
ALTER TABLE notification_log MODIFY recipient_id BIGINT NULL;
ALTER TABLE notification_log ADD CONSTRAINT fk_notification_log_recipient
    FOREIGN KEY (recipient_id) REFERENCES `user`(id);
```

#### 7B. V19 적용 구조 (RESEARCH §Code Examples §3)
```sql
-- backend/src/main/resources/db/migration/V19__add_notification_dedup_unique.sql
-- CONTEXT D-A2/D-A3/D-A4: add UNIQUE(document_id, event_type, recipient_id)
-- document_id NULL rows (registration emails) are excluded by MariaDB NULL semantics
-- (NULL ≠ NULL in UNIQUE index → multiple rows with NULL document_id are allowed)

ALTER TABLE notification_log
    ADD CONSTRAINT uk_notification_dedup
    UNIQUE (document_id, event_type, recipient_id);
```
**복제 포인트:** (1) 선두에 doc 주석 2~4줄 (의도, 관련 CONTEXT 결정 ID). (2) Constraint 이름은 엔티티의 `@UniqueConstraint(name=...)` 와 일치. (3) H2 test migration mirror 는 `test/resources/db/testmigration/V9__add_notification_dedup_unique.sql` 에 동일 DDL — **단, V7 이 이미 `ALTER TABLE notification_log ALTER COLUMN recipient_id BIGINT NULL` (H2 syntax) 를 쓴 것처럼** H2 사투리 차이 확인 필수. 제약 추가는 MariaDB/H2 양쪽 `ALTER TABLE ... ADD CONSTRAINT ... UNIQUE (...)` 동일 syntax 이므로 그대로 사용 가능.

---

### 8. `application-prod.yml` (MODIFY) → `application.yml:43-44` 직접 이식

#### 8A. 현재 (`application-prod.yml:11-13`)
```yaml
app:
  cookie:
    secure: true
```

#### 8B. 추가 후
```yaml
app:
  base-url: ${APP_BASE_URL:https://micesign.사내도메인}   # D-D2 — BaseUrlGuard 가 localhost 검출 시 startup 실패
  cookie:
    secure: true
```
**복제 포인트:** `application.yml:43-44` 의 `base-url: ${APP_BASE_URL:http://localhost:5173}` 패턴과 동일 구조 — **default 값만 prod 도메인으로 차별화**. 배포 시 `APP_BASE_URL` env var 주입.

---

### 9. `application-test.yml` (MODIFY) → `application.yml:25-36` 재사용 + GreenMail 포트

#### 9A. 현재 (`application-test.yml:1-32`, line 30-32 주목)
```yaml
management:
  endpoints: ...
  health:
    mail:
      enabled: false                    # ← 현재 SMTP health 비활성
```

#### 9B. 추가 블록 (RESEARCH §1086-1102)
```yaml
spring:
  # ... 기존 datasource/jpa/flyway 유지
  mail:
    host: 127.0.0.1
    port: 3025                          # GreenMail SMTP default
    username: test
    password: test
    properties:
      mail:
        smtp:
          auth: true
          starttls:
            enable: false               # GreenMail은 plain SMTP
        mime:
          charset: UTF-8
app:
  base-url: http://127.0.0.1:5173
```
**복제 포인트:** `application.yml:25-36` 의 `spring.mail.*` 구조를 그대로 따르되 (1) `host/port` 는 GreenMail 기본값 `127.0.0.1:3025`, (2) `starttls.enable=false` (GreenMail plain SMTP), (3) `management.health.mail.enabled=false` 는 이미 있어서 유지.

---

### 10. `build.gradle.kts` (MODIFY) → line 65-69 블록에 1줄 추가

#### 10A. 현재 (`build.gradle.kts:64-70`)
```kotlin
    // Test
    testImplementation("org.springframework.boot:spring-boot-starter-test")
    testImplementation("org.springframework.security:spring-security-test")

    // H2 for integration tests (with MariaDB-compatible test migrations)
    testRuntimeOnly("com.h2database:h2")
}
```

#### 10B. 추가 후 (CONTEXT D-D3 + RESEARCH §Assumptions Log A1/A2)
```kotlin
    // Test
    testImplementation("org.springframework.boot:spring-boot-starter-test")
    testImplementation("org.springframework.security:spring-security-test")
    testImplementation("com.icegreen:greenmail-junit5:2.1.3")    // ← 신규 — planner 가 착수 시점에 mvnrepository 최신 2.1.x 재확인

    // H2 for integration tests (with MariaDB-compatible test migrations)
    testRuntimeOnly("com.h2database:h2")
}
```
**복제 포인트:** 주석 스타일 (`// ← 신규` 또는 `// GreenMail for Jakarta Mail 2.x`) 일관성 유지. **2.1.x 필수** — 1.6.x 는 `javax.mail` 로 Spring Boot 3 비호환 (RESEARCH Assumption A1). 패치 버전은 착수 직전 `curl -s "https://search.maven.org/solrsearch/select?q=g:com.icegreen+AND+a:greenmail-junit5&rows=5&wt=json"` 로 재확인.

---

### 11. `ApprovalNotificationIntegrationTest.java` (NEW) → `AuditLogGapTest` + GreenMail

#### 11A. 애너테이션·fixture 구조 (`AuditLogGapTest.java:30-57`)
```java
// backend/src/test/java/com/micesign/admin/AuditLogGapTest.java:30-57
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class AuditLogGapTest {

    @Autowired MockMvc mockMvc;
    @Autowired ObjectMapper objectMapper;
    @Autowired JdbcTemplate jdbcTemplate;
    @Autowired TestTokenHelper tokenHelper;

    private String superAdminToken;

    @BeforeEach
    void setUp() {
        jdbcTemplate.update("DELETE FROM audit_log");
        // test data cleanup...
        superAdminToken = tokenHelper.superAdminToken();
    }

    @AfterEach
    void tearDown() {
        jdbcTemplate.update("DELETE FROM audit_log");
        // cleanup...
    }
```

#### 11B. GreenMail 추가 extension (RESEARCH §1040-1083)
```java
@SpringBootTest
@ActiveProfiles("test")
class ApprovalNotificationIntegrationTest {

    @RegisterExtension
    static GreenMailExtension greenMail = new GreenMailExtension(ServerSetupTest.SMTP)
            .withPerMethodLifecycle(true);    // inbox reset per test

    @Autowired ApplicationEventPublisher eventPublisher;
    @Autowired JdbcTemplate jdbcTemplate;
    @MockBean BudgetApiClient budgetApiClient;   // budget 간섭 차단

    @BeforeEach
    void setUp() {
        jdbcTemplate.update("DELETE FROM notification_log");
        // fixture: document, users, approval_line
    }

    @Test
    void submit_eventDelivers_koreanSubject() throws Exception {
        eventPublisher.publishEvent(new ApprovalNotificationEvent(docId, "SUBMIT", actorId));

        Awaitility.await().atMost(5, SECONDS)
                  .until(() -> greenMail.getReceivedMessages().length == 1);

        MimeMessage received = greenMail.getReceivedMessages()[0];
        assertThat(received.getSubject()).startsWith("[MiceSign] 결재 요청:");
        // body/DB assertions...
    }
}
```
**복제 포인트:** (1) `@SpringBootTest + @ActiveProfiles("test")` — AuditLogGapTest 와 동일. (2) `@Autowired JdbcTemplate` — audit COUNT 검증 패턴 재사용. (3) `@BeforeEach`에서 `jdbcTemplate.update("DELETE FROM ...")` 로 상태 격리 — 동일 패턴. (4) 추가 요소: `@RegisterExtension static GreenMailExtension`, `Awaitility`, `@MockBean BudgetApiClient`.

---

### 12. `ApprovalEmailSenderRetryTest.java` (NEW) → `RegistrationEmailServiceTest` 패턴 + Retry 어서트 스켈레톤

#### 12A. Mockito 기반 unit test 구조 (`RegistrationEmailServiceTest.java:34-65`)
```java
// backend/src/test/java/com/micesign/registration/RegistrationEmailServiceTest.java:34-65
@ExtendWith(MockitoExtension.class)
class RegistrationEmailServiceTest {

    @Mock private SpringTemplateEngine templateEngine;
    @Mock private RegistrationRequestRepository registrationRequestRepository;
    @Mock private UserRepository userRepository;
    @Mock private NotificationLogRepository notificationLogRepository;

    private RegistrationEmailService registrationEmailService;

    @BeforeEach
    void setUp() {
        registrationEmailService = new RegistrationEmailService(
                null,            // mailSender (null → stub mode)
                templateEngine, ...
        );
        lenient().when(templateEngine.process(anyString(), any()))
                 .thenReturn("<html>test</html>");
    }
```

#### 12B. ArgumentCaptor verification (`RegistrationEmailServiceTest.java:100-108`)
```java
ArgumentCaptor<NotificationLog> captor = ArgumentCaptor.forClass(NotificationLog.class);
verify(notificationLogRepository, times(1)).save(captor.capture());

NotificationLog saved = captor.getValue();
assertThat(saved.getRecipientEmail()).isEqualTo("hong@test.com");
assertThat(saved.getStatus()).isEqualTo(NotificationStatus.SUCCESS);
```

**Phase 29 retry 테스트 추가 요소 (no analog — RESEARCH §Code Examples + §Contract Tests):**
- `@SpringBootTest` 로 업그레이드 (AOP proxy 활성화 필요, `MockitoExtension` 만으로는 `@Retryable` 미동작)
- `@MockBean JavaMailSender` + `doThrow(new MailSendException("..."))`
- `@TestConfiguration` 로 `RetryTemplate` 빈을 `SimpleRetryPolicy(maxAttempts=3, backoffPeriod=0)` 로 오버라이드 — 실제 5분 대기 방지
- `verify(mailSender, times(3)).send(any(MimeMessage.class))` + `@Recover` 진입 검증

---

### 13. `ApprovalServiceAuditTest.java` (NEW) → `AuditLogGapTest` **직접 복제**

#### 13A. Audit COUNT 어서트 패턴 (`AuditLogGapTest.java:59-80`)
```java
// backend/src/test/java/com/micesign/admin/AuditLogGapTest.java:59-80
@Test
void createDepartment_producesAuditLog() throws Exception {
    CreateDepartmentRequest request = new CreateDepartmentRequest("AuditTestDept", 1L, 99);

    mockMvc.perform(post("/api/v1/admin/departments")
            .header("Authorization", "Bearer " + superAdminToken)
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(request)))
        .andExpect(status().isCreated());

    // Verify audit log entry was created
    Integer count = jdbcTemplate.queryForObject(
        "SELECT COUNT(*) FROM audit_log WHERE action = ? AND target_type = ?",
        Integer.class, AuditAction.ADMIN_ORG_EDIT, "DEPARTMENT");
    assertThat(count).isGreaterThanOrEqualTo(1);

    // Verify detail contains action=create
    String detail = jdbcTemplate.queryForObject(
        "SELECT detail FROM audit_log WHERE action = ? AND target_type = ? ORDER BY id DESC LIMIT 1",
        String.class, AuditAction.ADMIN_ORG_EDIT, "DEPARTMENT");
    assertThat(detail).contains("create");
}
```

#### 13B. Phase 29 NFR-03 검증 대상 (D-A10 — 리스너에서 audit 추가 insert 금지)
**복제 구조:** 각 `@Test` 메서드가 (1) `mockMvc.perform(submit|approve|reject|withdraw API)` → (2) `jdbcTemplate.queryForObject("SELECT COUNT(*) FROM audit_log WHERE action=? AND target_id=?", ...)` = **정확히 1** assert. AuditLogGapTest 의 `assertThat(count).isGreaterThanOrEqualTo(1)` 를 **`isEqualTo(1)`** 로 강화 (NFR-03 "COUNT=1 per action" 스펙).

**의존성 힌트:** AuditLogGapTest 는 `@Autowired TestTokenHelper tokenHelper` + `tokenHelper.superAdminToken()` 로 사전 로그인 — 동일 helper 사용. `@BeforeEach/@AfterEach` 의 `DELETE FROM audit_log` 패턴도 그대로.

---

## Cross-File Dependencies

Planner 가 플랜 작성 시 준수해야 할 **파일 간 실행 순서**.

| Wave | 파일 | 전제 조건 |
|------|------|----------|
| **W1 — Schema & Entity** | 1. `V19__add_notification_dedup_unique.sql` | — (현재 stub 에는 중복 row 구조적 불가, D-A4) |
| | 2. `V9__add_notification_dedup_unique.sql` (test mirror) | W1-1 과 동일 DDL |
| | 3. `NotificationLog.java` `@UniqueConstraint` 추가 | W1-1 constraint name (`uk_notification_dedup`) 과 일치해야 `ddl-auto=validate` 통과 |
| | 4. `NotificationLogRepository.java` `findByDocumentIdAndEventTypeAndRecipientId` 추가 | W1-3 의 엔티티 필드 이름 참조 |
| **W2 — Config & Templates** | 5. `application-prod.yml` `app.base-url` 추가 | — |
| | 6. `BaseUrlGuard.java` | W2-5 와 같은 wave 내 (prod startup 에만 영향, 테스트 비활성) |
| | 7. `templates/email/layouts/approval-base.html` | — (registration 템플릿 독립) |
| | 8. `templates/email/approval-{5종}.html` | W2-7 fragment import |
| | 9. `build.gradle.kts` GreenMail 추가 | — (테스트 전용) |
| | 10. `application-test.yml` `spring.mail.*` + `app.base-url` | W2-9 의 GreenMail 포트 3025 와 일치 |
| **W3 — Core sender** | 11. `ApprovalEmailSender.java` | W1-3, W1-4, W2-8 모두 완료 필요 (엔티티·repo·템플릿 전부) |
| | 12. `EmailService.java` 리팩터 | W3-11 의 빈 주입 가능해야 함 |
| **W4 — Tests** | 13. `ApprovalServiceAuditTest.java` | W3-12 완료 — 기존 `publishEvent` 는 이미 있으나 리스너에서 audit INSERT 없음을 보장해야 통과 |
| | 14. `ApprovalEmailSenderRetryTest.java` | W3-11 완료 + W2-9 |
| | 15. `ApprovalNotificationIntegrationTest.java` | W1~W3 전부 완료 + W2-9, W2-10 |

**Critical path:** W1-3 `@UniqueConstraint` + W1-1 DDL 이름이 일치해야 앱 부팅 — 이 둘은 동일 커밋에 묶여야 함 (부분 배포 시 `ddl-auto=validate` 실패).

**D-A3 이중 선언 검증:** V19 migration 의 `CONSTRAINT uk_notification_dedup` 이름이 `NotificationLog.@UniqueConstraint(name="uk_notification_dedup")` 과 **문자열 단위로 정확히** 일치해야 Hibernate validate 통과. 타이포 시 startup 실패 — 이것이 D-A3 의 drift 감지 메커니즘.

---

## No-Analog Files

리포 내 직접 참조할 기존 코드가 없는 파일 — RESEARCH.md 의 스켈레톤을 그대로 채택.

| 파일 | 이유 | Fallback 소스 |
|------|------|---------------|
| `BaseUrlGuard.java` | `grep -rn "ApplicationReadyEvent" backend/src/main/java/` = 0 매치. `@Profile("prod")` + `@EventListener(ApplicationReadyEvent)` 조합 선례 없음 | RESEARCH.md §Pitfall 5 + §Contract Tests (line 1118) + CONTEXT D-D2 |
| `ApprovalEmailSenderRetryTest.java` Retry 어서트 부분 | `RegistrationEmailServiceTest` 는 `MockitoExtension` 기반이라 Spring AOP `@Retryable` 검증 불가. 리포 내 `@Retryable` 을 실제로 구동시키며 test 하는 클래스 없음 (`BudgetRetryIntegrationTest.java` 는 `tasks.named<JavaCompile>("compileTestJava")` 에서 `exclude` 됨 — build.gradle.kts:81). 사실상 **리포 최초의 retry integration test** | RESEARCH.md §Common Pitfalls #2 + §Validation Architecture (line 1036) + Spring Retry 공식 문서 |

**Note:** `BudgetRetryIntegrationTest.java` 는 `compileTestJava.exclude` 목록에 있어 현재 컴파일조차 안 됨. 패턴 복제 대신 RESEARCH 스켈레톤 직접 사용.

---

## Shared Patterns

### 공통 패턴 1: `@Value("${app.base-url:http://localhost:5173}")` + `@Value("${spring.mail.username:noreply@micesign.com}")`
**출처:** `RegistrationEmailService.java:50-54`
**적용 대상:** `ApprovalEmailSender.java`
**주의:** `BaseUrlGuard` 는 `@Value("${app.base-url:}")` (빈 기본값) 사용 — guard 는 미설정도 실패로 처리해야 하므로 default 주지 않음.

### 공통 패턴 2: `@TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT) + @Async`
**출처:** `RegistrationEmailService.java:72-74` / 현 `EmailService.java:59-61`
**적용 대상:** `EmailService.sendNotification` (리팩터 후 유지)
**안티 패턴:** 이 메서드에 `@Retryable` 추가 금지 — `@Async` 와 같은 메서드에 두 AOP 체인이 겹치면 불안정 (RESEARCH §Anti-Patterns line 334).

### 공통 패턴 3: `@MockBean BudgetApiClient` in `@SpringBootTest`
**출처:** RESEARCH.md §Validation Architecture (line 1052)
**적용 대상:** `ApprovalNotificationIntegrationTest`, `ApprovalServiceAuditTest` — budget API 호출이 submit/approve 흐름에 섞여있으므로 간섭 방지.

### 공통 패턴 4: `jdbcTemplate.update("DELETE FROM ...")` in `@BeforeEach/@AfterEach`
**출처:** `AuditLogGapTest.java:42-57`
**적용 대상:** `ApprovalServiceAuditTest`, `ApprovalNotificationIntegrationTest` — H2 in-memory DB 지만 `@SpringBootTest` 는 컨텍스트 재사용하므로 명시적 cleanup 필수.

### 공통 패턴 5: MimeMessageHelper 3-arg UTF-8 + "MiceSign <...>" from 포맷
**출처:** `RegistrationEmailService.java:170-174`
```java
MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
helper.setFrom("MiceSign <" + fromAddress + ">");
```
**적용 대상:** `ApprovalEmailSender` — Pitfall 3 방어 + D-C5 from 포맷 일관성.

### 공통 패턴 6: Thymeleaf `SpringTemplateEngine.process("email/" + templateName, ctx)`
**출처:** `RegistrationEmailService.java:168`
**적용 대상:** `ApprovalEmailSender.send()` — template 경로 컨벤션 `email/<slug>` (`.html` suffix 자동).

### 공통 패턴 7: `NotificationLog` 필드 setter 체인
**출처:** `RegistrationEmailService.java:153-159`
```java
notifLog.setRecipient(recipient);
notifLog.setRecipientEmail(to);
notifLog.setEventType(eventType.name());
notifLog.setSubject(subject);
// Phase 29: setDocumentId(doc.getId()) 추가 — registration 은 setRegistrationRequestId 사용
```

---

## Metadata

**Analog search scope:**
- `backend/src/main/java/com/micesign/**` (service, config, domain, event, repository, budget)
- `backend/src/main/resources/templates/email/**`
- `backend/src/main/resources/db/migration/**`
- `backend/src/test/java/com/micesign/**`
- `backend/src/test/resources/**`

**Files scanned (core):** ~20 (RegistrationEmailService, EmailService, RealBudgetApiClient, NotificationLog, NotificationLogRepository, AuditLogGapTest, RegistrationEmailServiceTest, AsyncConfig, RetryConfig, application.yml, application-prod.yml, application-test.yml, build.gradle.kts, V6/V16/V7 migrations, ApprovalNotificationEvent, registration-submit.html)

**Pattern extraction date:** 2026-04-23

**Assumption cross-check:**
- A1 (GreenMail 2.1.x 확정) — locked in §10
- A3 (`User.equals()/hashCode()`) — planner 는 `grep -n "@Override.*equals\|hashCode" backend/src/main/java/com/micesign/domain/User.java` 확인 후 §5 의 `Collectors.toMap(User::getId, ...)` 채택 (RESEARCH Code Examples §5)
- A4 (`findByDocumentIdAndEventTypeAndRecipientId`) — §4B 에 포함
- A7 (`ApprovalServiceAuditTest` 부재) — `find` 결과 확인 완료, 신규 작성 대상으로 §13 에 계획

---

## PATTERN MAPPING COMPLETE

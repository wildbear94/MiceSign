# Phase 9: SMTP Email Notifications - Research

**Researched:** 2026-04-03
**Domain:** Spring Boot Mail + Async Events + Thymeleaf Email Templates + Admin UI
**Confidence:** HIGH

## Summary

Phase 9 adds asynchronous email notifications for approval workflow events (submit, approve, reject, withdraw) using Spring Boot Mail + Thymeleaf templates, with event-driven architecture via `@TransactionalEventListener` + `@Async`. The backend work is the bulk of this phase: event classes, notification service, email templates, retry logic, notification log persistence, and admin APIs. The frontend scope is limited to a single SUPER_ADMIN notification history page with filters and manual resend capability.

The existing codebase provides strong patterns to follow: `AuditLogService` demonstrates REQUIRES_NEW + exception-swallowing for non-blocking side effects, `AuditLogController` shows the SUPER_ADMIN-only paginated filter+table API pattern, and the `audit` feature module in the frontend shows the exact filter+table+pagination React pattern to replicate. The `notification_log` table is already defined in V1 migration.

**Primary recommendation:** Follow the established AuditLogService pattern for non-blocking notification persistence, use Spring ApplicationEvent + @TransactionalEventListener(AFTER_COMMIT) + @Async for decoupled email delivery, and mirror the audit log frontend module structure exactly for the notification history page.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Spring ApplicationEvent + @Async for async delivery. Approval transaction fully decoupled from email
- **D-02:** @TransactionalEventListener(AFTER_COMMIT) -- event published only after DB commit confirmed
- **D-03:** Single event class (ApprovalNotificationEvent) + event_type field for SUBMIT/APPROVE/REJECT/WITHDRAW
- **D-04:** NotificationService internally determines recipients per event type
- **D-06:** HTML email format (logo + document info table + CTA button)
- **D-07:** Thymeleaf template engine for email HTML (spring-boot-starter-thymeleaf)
- **D-08:** Email body includes: document title, doc number, drafter, status change, approval comment (if any), shortcut URL
- **D-09:** Separate Thymeleaf template files per event type (submit.html, approve.html, reject.html, withdraw.html)
- **D-10:** Immediate retry within @Async handler (1s, 3s delays, max 2 retries). retry_count logged
- **D-11:** Final failure: FAILED status + error_message in notification_log. No admin alert
- **D-12:** SUPER_ADMIN notification history page with status/date filters + table
- **D-13:** SUPER_ADMIN manual resend for FAILED notifications (API + UI button)
- **D-14:** MailHog for local dev SMTP testing
- **D-15:** application-{profile}.yml for environment-specific SMTP config (dev: MailHog, prod: real SMTP)
- **D-16:** Sender format: company shared email (e.g., 'MiceSign 전자결재 <approval@example.com>'), actual address in yml config

### Claude's Discretion
- Email subject format -- Korean format (e.g., '[MiceSign] 문서명 - 상태')
- HTML template design/styling details
- @Async thread pool configuration (SimpleAsyncTaskExecutor vs ThreadPoolTaskExecutor)

### Deferred Ideas (OUT OF SCOPE)
- User-level notification on/off preferences (user table column + settings API + UI)
- Failure rate monitoring (alert on high failure rates over time)
- Off-hours delivery delay (delay sending outside business hours)
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| NTF-01 | User receives email when document arrives for their approval | Event SUBMIT -> first approver; Event APPROVE (intermediate) -> next approver. Spring Mail + @TransactionalEventListener pattern |
| NTF-02 | Drafter receives email when document is approved or rejected | Event APPROVE (final) -> drafter; Event REJECT -> drafter. Recipient resolution in NotificationService |
| NTF-03 | Drafter receives email when document is withdrawn by approver action | Event WITHDRAW -> drafter (NOTE: per D-04/CONTEXT, WITHDRAW notifies all approvers; research reveals FSD says "결재선 전체". Reconcile in plan) |
| NTF-04 | Approvers receive email when document submitted for approval workflow | Event SUBMIT -> all approval line participants. Thymeleaf submit.html template |
| NTF-05 | Notification delivery history logged in notification_log table | NotificationLog entity + repository, logged on every send attempt with status, retry_count, error_message |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| spring-boot-starter-mail | 3.5.x (managed by Boot BOM) | JavaMailSender for SMTP email delivery | Standard Spring Boot mail integration, auto-configures from spring.mail.* properties |
| spring-boot-starter-thymeleaf | 3.5.x (managed by Boot BOM) | Server-side HTML email template rendering | D-07 locked decision. Spring Boot standard for email templates |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| MailHog | latest | Local SMTP test server with web UI | D-14: dev environment email testing (port 1025 SMTP, port 8025 web UI) |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Thymeleaf | FreeMarker | Both work; Thymeleaf locked by D-07 |
| MailHog | MailPit | MailPit is actively maintained fork; MailHog still functional. Either works for dev |
| Immediate retry | Spring Retry (@Retryable) | Spring Retry adds dependency; D-10 specifies simple loop retry in @Async handler -- simpler, no extra dependency |

**Installation (Gradle additions to build.gradle.kts):**
```kotlin
implementation("org.springframework.boot:spring-boot-starter-mail")
implementation("org.springframework.boot:spring-boot-starter-thymeleaf")
```

No version numbers needed -- managed by Spring Boot BOM (3.5.x).

**Version verification:** Both starters are managed by the Spring Boot BOM already in use (3.5.13). No explicit version needed.

## Architecture Patterns

### Recommended Project Structure (backend additions)
```
backend/src/main/java/com/micesign/
├── domain/
│   └── NotificationLog.java           # JPA entity
├── domain/enums/
│   ├── NotificationStatus.java        # SUCCESS, FAILED, RETRY
│   └── NotificationEventType.java     # SUBMIT, APPROVE, REJECT, WITHDRAW
├── dto/notification/
│   ├── NotificationLogResponse.java   # API response DTO
│   └── NotificationLogFilter.java     # Filter request DTO (optional, can use @RequestParam)
├── event/
│   └── ApprovalNotificationEvent.java # Single event class (D-03)
├── repository/
│   └── NotificationLogRepository.java # JPA repository
├── specification/
│   └── NotificationLogSpecification.java  # JPA Specification for filters (mirrors AuditLogSpecification)
├── service/
│   └── NotificationService.java       # Event listener + email sender + retry + logging
├── controller/
│   └── NotificationLogController.java # SUPER_ADMIN history API + resend API
└── config/
    └── AsyncConfig.java               # @EnableAsync + ThreadPoolTaskExecutor bean

backend/src/main/resources/
├── templates/
│   └── email/
│       ├── submit.html                # Thymeleaf email template
│       ├── approve.html
│       ├── reject.html
│       └── withdraw.html
├── application.yml                    # spring.mail.* defaults
├── application-dev.yml                # MailHog config
└── application-prod.yml               # Real SMTP config
```

### Frontend additions
```
frontend/src/
├── features/
│   └── notification/
│       ├── api/
│       │   └── notificationApi.ts
│       ├── components/
│       │   ├── NotificationLogFilters.tsx
│       │   ├── NotificationLogTable.tsx
│       │   └── NotificationStatusBadge.tsx
│       ├── hooks/
│       │   └── useNotificationLogs.ts
│       ├── pages/
│       │   └── NotificationLogPage.tsx
│       └── types/
│           └── notification.ts
├── i18n/config.ts                     # Add 'notification' namespace
└── App.tsx                            # Add /admin/notifications route
```

### Pattern 1: Event-Driven Notification (Core Pattern)
**What:** Approval state changes publish ApplicationEvent; NotificationService listens and sends email asynchronously
**When to use:** Every document state change (submit, approve, reject, withdraw)
**Example:**
```java
// In ApprovalService.approve() -- after auditLogService.log()
applicationEventPublisher.publishEvent(
    new ApprovalNotificationEvent(document, NotificationEventType.APPROVE, userId)
);

// In NotificationService
@TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
@Async
public void handleNotificationEvent(ApprovalNotificationEvent event) {
    List<User> recipients = resolveRecipients(event);
    for (User recipient : recipients) {
        sendWithRetry(recipient, event);
    }
}
```

### Pattern 2: Retry with Immediate Backoff (D-10)
**What:** On send failure, retry immediately with 1s then 3s delay within the same @Async thread
**When to use:** Every email send attempt
**Example:**
```java
private void sendWithRetry(User recipient, ApprovalNotificationEvent event) {
    int maxRetries = 2;
    long[] delays = {1000L, 3000L};
    
    NotificationLog log = createInitialLog(recipient, event);
    
    for (int attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            sendEmail(recipient, event);
            log.setStatus(NotificationStatus.SUCCESS);
            log.setSentAt(LocalDateTime.now());
            log.setRetryCount(attempt);
            notificationLogRepository.save(log);
            return;
        } catch (Exception e) {
            if (attempt < maxRetries) {
                log.setStatus(NotificationStatus.RETRY);
                log.setRetryCount(attempt + 1);
                notificationLogRepository.save(log);
                try { Thread.sleep(delays[attempt]); } catch (InterruptedException ie) { Thread.currentThread().interrupt(); }
            } else {
                log.setStatus(NotificationStatus.FAILED);
                log.setRetryCount(attempt);
                log.setErrorMessage(e.getMessage());
                notificationLogRepository.save(log);
            }
        }
    }
}
```

### Pattern 3: Thymeleaf Email Template Rendering
**What:** Use SpringTemplateEngine to render HTML email from Thymeleaf templates
**When to use:** Building email body before sending via JavaMailSender
**Example:**
```java
private String renderEmailBody(ApprovalNotificationEvent event, String templateName) {
    Context context = new Context();
    context.setVariable("documentTitle", event.getDocument().getTitle());
    context.setVariable("docNumber", event.getDocument().getDocNumber());
    context.setVariable("drafterName", event.getDocument().getDrafter().getName());
    context.setVariable("documentUrl", buildDocumentUrl(event.getDocument().getId()));
    // ... other variables
    return templateEngine.process("email/" + templateName, context);
}
```

### Pattern 4: Admin Notification Log API (mirrors AuditLogController)
**What:** SUPER_ADMIN-only paginated API with JPA Specification filters
**When to use:** Notification history page
**Example:**
```java
@RestController
@RequestMapping("/api/v1/admin/notifications")
@PreAuthorize("hasRole('SUPER_ADMIN')")
public class NotificationLogController {
    
    @GetMapping
    public ApiResponse<Page<NotificationLogResponse>> getNotificationLogs(
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String eventType,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        // Same pattern as AuditLogController
    }
    
    @PostMapping("/{id}/resend")
    public ApiResponse<Void> resendNotification(@PathVariable Long id) {
        // D-13: manual resend for FAILED notifications
    }
}
```

### Anti-Patterns to Avoid
- **Publishing event before commit:** Use `@TransactionalEventListener(AFTER_COMMIT)`, NOT `@EventListener`. Otherwise, mail may be sent for a rolled-back transaction.
- **Blocking approval flow on mail failure:** Email must NEVER block the approval transaction. The @Async + separate thread ensures this. Do NOT call mail sending synchronously in the approval service.
- **Saving notification_log in same transaction as approval:** Use a separate transaction (REQUIRES_NEW or @Async thread's own transaction) so that notification log writes don't interfere with the approval transaction.
- **Using Thymeleaf for web views:** This project uses React for all web views. Thymeleaf is ONLY for email template rendering. Do NOT add Thymeleaf view resolvers for web pages. Configure ThymeleafAutoConfiguration to only act as template engine (it does not interfere with REST controllers by default, but be aware).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| SMTP email sending | Raw javax.mail/jakarta.mail | `JavaMailSender` from spring-boot-starter-mail | Auto-configured from properties, handles connection pooling, MIME message building |
| HTML email templates | String concatenation / template literals | Thymeleaf `SpringTemplateEngine.process()` | Proper HTML escaping, variable substitution, template inheritance, maintainable |
| Async execution | Manual Thread creation | `@EnableAsync` + `@Async` + ThreadPoolTaskExecutor | Spring-managed thread pool with proper lifecycle, exception handling |
| Paginated filtered queries | Manual SQL/JPQL construction | JPA Specification + Pageable | Same pattern as AuditLogSpecification, type-safe, composable filters |

**Key insight:** Spring Boot Mail auto-configuration handles all SMTP connection management. Just provide `spring.mail.*` properties and inject `JavaMailSender`.

## Common Pitfalls

### Pitfall 1: @Async Not Working
**What goes wrong:** `@Async` methods execute synchronously instead of in a new thread
**Why it happens:** Missing `@EnableAsync` configuration, or calling @Async method from within the same bean (self-invocation bypasses proxy)
**How to avoid:** Create a dedicated `AsyncConfig` class with `@EnableAsync`. Ensure `NotificationService` is called via Spring proxy (injected bean), not via `this.method()`
**Warning signs:** Email sending blocks the HTTP response; approval API suddenly takes 5+ seconds

### Pitfall 2: @TransactionalEventListener Not Firing
**What goes wrong:** Event listener never executes
**Why it happens:** No active transaction wrapping the `publishEvent()` call, or event published in a nested transaction that commits separately
**How to avoid:** Ensure the service method calling `publishEvent()` is `@Transactional`. Verify with logging. Both `ApprovalService` and `DocumentService` are already `@Transactional` (confirmed in codebase)
**Warning signs:** Audit log works but notification doesn't fire -- check transaction boundaries

### Pitfall 3: Thymeleaf Hijacking REST Responses
**What goes wrong:** Adding spring-boot-starter-thymeleaf causes Spring to try resolving controller return values as Thymeleaf view names
**Why it happens:** Thymeleaf auto-configuration registers a ThymeleafViewResolver
**How to avoid:** All existing controllers use `@RestController` which returns response body directly -- this is NOT affected by ThymeleafViewResolver. No special configuration needed. If issues arise, set `spring.thymeleaf.check-template-location=false` and only use `SpringTemplateEngine` programmatically
**Warning signs:** 500 errors on existing API endpoints after adding Thymeleaf dependency

### Pitfall 4: notification_log Status ENUM Mismatch
**What goes wrong:** Application tries to insert 'PENDING' but DDL only allows 'SUCCESS', 'FAILED', 'RETRY'
**Why it happens:** The V1 DDL defines `ENUM('SUCCESS','FAILED','RETRY')` but the UI-SPEC references 'PENDING' status for display. The DDL has no 'PENDING' state.
**How to avoid:** Use the DDL as source of truth. The Java enum should be `SUCCESS`, `FAILED`, `RETRY`. If UI needs to show a "pending" state, it maps to `RETRY` (in-progress retry). Alternatively, add a Flyway migration V{N}__add_pending_to_notification_status.sql to add PENDING to the ENUM if the team wants a distinct pre-send state. **Recommendation:** Add PENDING to the ENUM via migration -- it's cleaner to represent "queued but not yet attempted" separately from "attempted and retrying"
**Warning signs:** MariaDB insert errors on notification_log with "Data truncated for column 'status'"

### Pitfall 5: Email Template Character Encoding
**What goes wrong:** Korean characters in email body appear as garbled text (mojibake)
**Why it happens:** MimeMessage default encoding doesn't match UTF-8
**How to avoid:** Use `MimeMessageHelper` with `"UTF-8"` encoding parameter: `new MimeMessageHelper(message, true, "UTF-8")`
**Warning signs:** Test emails display correctly in MailHog but garbled in real email clients

### Pitfall 6: Recipient Resolution Complexity
**What goes wrong:** Wrong people receive notifications (e.g., drafter gets "pending approval" email)
**Why it happens:** Complex mapping between event types and recipients. FSD/PRD/CONTEXT have slightly different descriptions.
**How to avoid:** Create a clear recipient resolution table and test each scenario:

| Event | Trigger Point | Recipients |
|-------|--------------|------------|
| SUBMIT | DocumentService.submitDocument() | All approval line members (APPROVE + AGREE types) |
| APPROVE (intermediate) | ApprovalService.approve() when nextLine != null | Next approver in line |
| APPROVE (final) | ApprovalService.approve() when nextLine == null (APPROVED) | Drafter |
| REJECT | ApprovalService.reject() | Drafter |
| WITHDRAW | DocumentService.withdrawDocument() | All approval line members |

**Warning signs:** Users complain about missing or duplicate notifications

## Code Examples

### AsyncConfig.java
```java
// Source: Spring Boot docs + established project patterns
@Configuration
@EnableAsync
public class AsyncConfig implements AsyncConfigurer {
    
    @Override
    public Executor getAsyncExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(2);       // ~50 users, low concurrency
        executor.setMaxPoolSize(5);
        executor.setQueueCapacity(100);
        executor.setThreadNamePrefix("notification-");
        executor.initialize();
        return executor;
    }
}
```

### ApprovalNotificationEvent.java
```java
// Source: D-03 locked decision
public class ApprovalNotificationEvent {
    private final Document document;
    private final NotificationEventType eventType;
    private final Long actorUserId;  // who triggered the event
    private final String comment;     // approval comment (for reject)
    
    // Constructor, getters
}
```

### application-dev.yml additions
```yaml
# MailHog SMTP configuration (D-14)
spring:
  mail:
    host: localhost
    port: 1025
    properties:
      mail.smtp.auth: false
      mail.smtp.starttls.enable: false

app:
  notification:
    sender-name: MiceSign 전자결재
    sender-email: approval@example.com
    base-url: http://localhost:5173  # Frontend URL for document links
```

### application-prod.yml additions
```yaml
spring:
  mail:
    host: ${SMTP_HOST}
    port: ${SMTP_PORT:587}
    username: ${SMTP_USERNAME}
    password: ${SMTP_PASSWORD}
    properties:
      mail.smtp.auth: true
      mail.smtp.starttls.enable: true

app:
  notification:
    sender-name: MiceSign 전자결재
    sender-email: ${NOTIFICATION_SENDER_EMAIL}
    base-url: ${APP_BASE_URL}
```

### Thymeleaf Email Template (submit.html)
```html
<!DOCTYPE html>
<html xmlns:th="http://www.thymeleaf.org">
<body style="margin: 0; padding: 0; background-color: #f3f4f6; font-family: 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding: 32px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden;">
        <!-- Header -->
        <tr>
          <td style="background-color: #2563eb; color: #ffffff; padding: 24px; text-align: center; font-size: 18px; font-weight: 600;">
            MiceSign 전자결재
          </td>
        </tr>
        <!-- Body -->
        <tr><td style="padding: 24px;">
          <table width="100%" style="border-collapse: collapse;">
            <tr>
              <td style="padding: 12px 16px; border-bottom: 1px solid #e5e7eb; color: #6b7280; font-size: 14px; width: 120px;">문서 제목</td>
              <td style="padding: 12px 16px; border-bottom: 1px solid #e5e7eb; color: #111827; font-size: 14px; font-weight: 500;" th:text="${documentTitle}">제목</td>
            </tr>
            <tr>
              <td style="padding: 12px 16px; border-bottom: 1px solid #e5e7eb; color: #6b7280; font-size: 14px;">문서 번호</td>
              <td style="padding: 12px 16px; border-bottom: 1px solid #e5e7eb; color: #111827; font-size: 14px; font-weight: 500;" th:text="${docNumber}">GEN-2026-0001</td>
            </tr>
            <tr>
              <td style="padding: 12px 16px; border-bottom: 1px solid #e5e7eb; color: #6b7280; font-size: 14px;">기안자</td>
              <td style="padding: 12px 16px; border-bottom: 1px solid #e5e7eb; color: #111827; font-size: 14px; font-weight: 500;" th:text="${drafterName}">홍길동</td>
            </tr>
            <tr>
              <td style="padding: 12px 16px; border-bottom: 1px solid #e5e7eb; color: #6b7280; font-size: 14px;">상태</td>
              <td style="padding: 12px 16px; border-bottom: 1px solid #e5e7eb; color: #111827; font-size: 14px; font-weight: 500;" th:text="${statusLabel}">결재 요청</td>
            </tr>
          </table>
          <div style="text-align: center; margin-top: 24px;">
            <a th:href="${documentUrl}" style="display: inline-block; background-color: #2563eb; color: #ffffff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-size: 14px; font-weight: 600;">
              문서 바로가기
            </a>
          </div>
        </td></tr>
        <!-- Footer -->
        <tr>
          <td style="padding: 16px 24px; text-align: center; color: #9ca3af; font-size: 12px;">
            본 메일은 MiceSign에서 자동 발송되었습니다.
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>
```

### Frontend NotificationApi Pattern (mirrors auditApi.ts exactly)
```typescript
import apiClient from '../../../api/client';
import type { ApiResponse, PageResponse } from '../../../types/api';
import type { NotificationLogResponse, NotificationLogFilter } from '../types/notification';

export const notificationApi = {
  getLogs: (filter: NotificationLogFilter, page = 0, size = 20) =>
    apiClient.get<ApiResponse<PageResponse<NotificationLogResponse>>>('/admin/notifications', {
      params: { ...filter, page, size },
    }),
  resend: (id: number) =>
    apiClient.post<ApiResponse<void>>(`/admin/notifications/${id}/resend`),
};
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| javax.mail | jakarta.mail (via spring-boot-starter-mail 3.x) | Spring Boot 3.0 | Package namespace changed; starter handles this automatically |
| @EventListener | @TransactionalEventListener | Spring 4.2+ (mature) | Correct choice per D-02; ensures event fires only after commit |
| SimpleAsyncTaskExecutor | ThreadPoolTaskExecutor | Long-standing best practice | Bounded thread pool prevents resource exhaustion under load |

**Deprecated/outdated:**
- `javax.mail.*` classes: Replaced by `jakarta.mail.*` in Spring Boot 3.x. The starter handles this.
- MailHog (original): Last release 2020 but still functional. MailPit is the actively maintained fork. Either works for dev.

## Open Questions

1. **notification_log ENUM mismatch: RETRY vs PENDING**
   - What we know: V1 DDL defines `ENUM('SUCCESS','FAILED','RETRY')`. UI-SPEC references PENDING status for display.
   - What's unclear: Whether to add PENDING to the ENUM via migration, or map RETRY to "대기" in the UI.
   - Recommendation: Add a Flyway migration to alter the ENUM to `('PENDING','SUCCESS','FAILED','RETRY')` where PENDING = initial state before first send attempt. This is cleaner and avoids semantic confusion. The migration is trivial: `ALTER TABLE notification_log MODIFY COLUMN status ENUM('PENDING','SUCCESS','FAILED','RETRY') NOT NULL;`

2. **NTF-03 vs FSD/CONTEXT recipient discrepancy**
   - What we know: NTF-03 says "Drafter receives email when document is withdrawn". FSD says "결재선 전체" (all approval line). CONTEXT D-04 says "WITHDRAW -> 승인라인 전체".
   - What's unclear: Whether drafter also receives a separate email for withdrawal (they initiate it, so notification may be redundant).
   - Recommendation: Follow FSD/CONTEXT -- send to all approval line participants on WITHDRAW. The drafter initiated the withdrawal so does NOT need a notification email (they already know). This satisfies NTF-03 as the requirement likely intended notifying people affected by the withdrawal.

3. **Document URL base path for email links**
   - What we know: Email templates need a "바로가기" button linking to the document detail page.
   - What's unclear: The frontend URL base varies by environment.
   - Recommendation: Add `app.notification.base-url` property (per environment yml). Link format: `{baseUrl}/documents/{documentId}`

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| MailHog | D-14: Local dev SMTP testing | Needs install | -- | MailPit (Go binary, easy install via brew) |
| SMTP server (prod) | Email delivery in production | TBD (config in yml) | -- | Cannot skip; must be configured before prod deploy |

**Missing dependencies with no fallback:**
- Production SMTP server credentials must be configured in application-prod.yml before deployment

**Missing dependencies with fallback:**
- MailHog/MailPit: Install via `brew install mailhog` or `brew install mailpit`. Either works for local testing.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | JUnit 5 + Spring Boot Test (existing) |
| Config file | backend/build.gradle.kts (testImplementation already configured) |
| Quick run command | `cd backend && ./gradlew test --tests "com.micesign.notification.*" -x check` |
| Full suite command | `cd backend && ./gradlew test` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| NTF-01 | Email sent to approver on document submission | unit (mock JavaMailSender) | `./gradlew test --tests "com.micesign.notification.NotificationServiceTest.testSubmitNotifiesApprover"` | Wave 0 |
| NTF-02 | Email sent to drafter on approve/reject | unit | `./gradlew test --tests "com.micesign.notification.NotificationServiceTest.testApproveNotifiesDrafter"` | Wave 0 |
| NTF-03 | Email sent to approval line on withdraw | unit | `./gradlew test --tests "com.micesign.notification.NotificationServiceTest.testWithdrawNotifiesApprovalLine"` | Wave 0 |
| NTF-04 | Email sent to all approvers on submit | unit | `./gradlew test --tests "com.micesign.notification.NotificationServiceTest.testSubmitNotifiesAllApprovers"` | Wave 0 |
| NTF-05 | notification_log records created | unit + integration | `./gradlew test --tests "com.micesign.notification.NotificationLogRepositoryTest"` | Wave 0 |
| D-10 | Retry logic (2 retries with delays) | unit (mock sender that fails) | `./gradlew test --tests "com.micesign.notification.NotificationServiceTest.testRetryOnFailure"` | Wave 0 |
| D-12 | Admin notification history API | integration | `./gradlew test --tests "com.micesign.notification.NotificationLogControllerTest"` | Wave 0 |
| D-13 | Manual resend API | integration | `./gradlew test --tests "com.micesign.notification.NotificationLogControllerTest.testResend"` | Wave 0 |

### Sampling Rate
- **Per task commit:** `cd backend && ./gradlew test --tests "com.micesign.notification.*" -x check`
- **Per wave merge:** `cd backend && ./gradlew test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `backend/src/test/java/com/micesign/notification/NotificationServiceTest.java` -- covers NTF-01 through NTF-04, D-10
- [ ] `backend/src/test/java/com/micesign/notification/NotificationLogControllerTest.java` -- covers NTF-05, D-12, D-13
- [ ] Test configuration for mock JavaMailSender (in test class or test config)

## Project Constraints (from CLAUDE.md)

- **Tech stack:** Java 17 + Spring Boot 3.x backend, React 18 + TypeScript + TailwindCSS frontend
- **Build:** Gradle with Kotlin DSL (`build.gradle.kts`)
- **Auth:** JWT stateless, `@PreAuthorize` for RBAC
- **i18n:** Uses react-i18next with namespace-based translation files. Must add 'notification' namespace.
- **DB:** MariaDB 10.11+ with Flyway migrations. All schema changes via migration files.
- **Patterns:** Constructor injection (no Lombok), `@Service` + `@Transactional`, `ApiResponse<T>` wrapper for all API responses
- **Frontend patterns:** Feature-module structure (`features/{name}/api|components|hooks|pages|types`), TanStack Query for server state, Axios for HTTP
- **Admin UI patterns:** AdminSidebar navItems array, AdminLayout with nested routes, Pagination component reuse

## Sources

### Primary (HIGH confidence)
- Existing codebase: `ApprovalService.java`, `DocumentService.java`, `AuditLogService.java`, `AuditLogController.java` -- event publishing points, established patterns
- Existing codebase: `V1__create_schema.sql` -- notification_log DDL definition
- Existing codebase: `frontend/src/features/audit/` -- complete audit log module as frontend pattern reference
- Existing codebase: `AdminSidebar.tsx`, `App.tsx` -- routing and navigation patterns
- `docs/PRD_MiceSign_v2.0.md` Section 9 -- notification system specification
- `docs/FSD_MiceSign_v1.0.md` FN-NTF-001 -- event-to-recipient mapping, implementation guidance

### Secondary (MEDIUM confidence)
- Spring Boot Mail auto-configuration: standard, well-documented behavior for spring.mail.* properties
- Thymeleaf email rendering: standard Spring Boot integration pattern

### Tertiary (LOW confidence)
- None -- all findings verified against codebase and official docs

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- spring-boot-starter-mail and starter-thymeleaf are mature, well-documented, and already used in millions of Spring Boot projects
- Architecture: HIGH -- event-driven pattern is explicitly specified in PRD/FSD and CONTEXT.md, with clear codebase precedents (AuditLogService)
- Pitfalls: HIGH -- pitfalls identified from actual codebase analysis (DDL enum mismatch, existing transaction patterns)
- Frontend: HIGH -- exact pattern to follow exists in audit log feature module

**Research date:** 2026-04-03
**Valid until:** 2026-05-03 (stable domain, 30-day validity)

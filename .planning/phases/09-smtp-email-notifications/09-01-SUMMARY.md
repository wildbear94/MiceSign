---
phase: 09-smtp-email-notifications
plan: 01
subsystem: notification
tags: [spring-mail, thymeleaf, async, smtp, email, event-listener]

# Dependency graph
requires:
  - phase: 07-approval-workflow
    provides: ApprovalService, DocumentService, ApprovalLine entity, approval state machine
  - phase: 08-dashboard-audit
    provides: AuditLogService pattern (non-blocking logging with try-catch swallow)
provides:
  - AsyncConfig for thread pool-based async execution
  - NotificationLog entity and repository for email audit trail
  - NotificationEventType and NotificationStatus enums
  - ApprovalNotificationEvent POJO event class
  - EmailService for SMTP sending with Thymeleaf template rendering
  - NotificationService with @TransactionalEventListener + @Async + retry logic
  - 4 Thymeleaf email templates (submit, approve, reject, withdraw)
  - Event publishing from ApprovalService and DocumentService
affects: [09-02 (notification preferences/API), 09-03 (frontend notification UI)]

# Tech tracking
tech-stack:
  added: [spring-boot-starter-mail, spring-boot-starter-thymeleaf]
  patterns: [TransactionalEventListener + Async for non-blocking post-commit processing, retry with backoff for email delivery]

key-files:
  created:
    - backend/src/main/java/com/micesign/config/AsyncConfig.java
    - backend/src/main/java/com/micesign/service/EmailService.java
    - backend/src/main/java/com/micesign/service/NotificationService.java
    - backend/src/main/java/com/micesign/event/ApprovalNotificationEvent.java
    - backend/src/main/java/com/micesign/domain/NotificationLog.java
    - backend/src/main/java/com/micesign/domain/enums/NotificationStatus.java
    - backend/src/main/java/com/micesign/domain/enums/NotificationEventType.java
    - backend/src/main/java/com/micesign/repository/NotificationLogRepository.java
    - backend/src/main/resources/templates/email/submit.html
    - backend/src/main/resources/templates/email/approve.html
    - backend/src/main/resources/templates/email/reject.html
    - backend/src/main/resources/templates/email/withdraw.html
    - backend/src/main/resources/db/migration/V6__add_pending_notification_status.sql
  modified:
    - backend/build.gradle.kts
    - backend/src/main/resources/application.yml
    - backend/src/main/resources/application-dev.yml
    - backend/src/main/resources/application-prod.yml
    - backend/src/main/java/com/micesign/service/ApprovalService.java
    - backend/src/main/java/com/micesign/service/DocumentService.java

key-decisions:
  - "POJO event class (no ApplicationEvent extension) for cleaner Spring 4.2+ event model"
  - "Methods resolveRecipients and sendWithRetry made public for direct unit testing from separate test package"
  - "Retry status tracking via mutable object snapshot pattern in tests to avoid reference aliasing"

patterns-established:
  - "TransactionalEventListener + Async: publish event inside @Transactional method, listener fires after commit on async thread pool"
  - "Retry with backoff: max 2 retries, delays 1s/3s, PENDING->RETRY->SUCCESS/FAILED status tracking in notification_log"
  - "Thymeleaf inline-CSS email templates: all styles inline for email client compatibility, Korean font stack"

requirements-completed: [NTF-01, NTF-02, NTF-03, NTF-04, NTF-05]

# Metrics
duration: 8min
completed: 2026-04-03
---

# Phase 9 Plan 01: Backend Email Notification Engine Summary

**Async email notification engine with SMTP/Thymeleaf, retry logic, 4 event types, and notification_log audit trail**

## Performance

- **Duration:** 8 min
- **Started:** 2026-04-03T08:13:10Z
- **Completed:** 2026-04-03T08:21:00Z
- **Tasks:** 2
- **Files modified:** 23

## Accomplishments
- Complete async email notification pipeline: event publish -> @TransactionalEventListener -> recipient resolution -> Thymeleaf HTML rendering -> SMTP send with retry
- 4 event types wired (SUBMIT, APPROVE, REJECT, WITHDRAW) with correct recipient logic per type
- Retry mechanism (max 2 retries, 1s/3s backoff) with full notification_log audit trail (PENDING/RETRY/SUCCESS/FAILED)
- 14 unit tests covering all event types, recipient resolution, retry success/failure, and log persistence

## Task Commits

Each task was committed atomically:

1. **Task 1: Gradle dependencies, AsyncConfig, Flyway migration, enums, entity, repository, event class** - `4a0636f` (feat)
2. **Task 2: EmailService, NotificationService, Thymeleaf templates, event publishing, unit tests** - `fc52cf3` (feat)

## Files Created/Modified
- `backend/build.gradle.kts` - Added spring-boot-starter-mail and spring-boot-starter-thymeleaf
- `backend/src/main/java/com/micesign/config/AsyncConfig.java` - Thread pool executor for async email (2 core, 5 max, 100 queue)
- `backend/src/main/java/com/micesign/service/EmailService.java` - SMTP sending + Thymeleaf rendering + subject/variable builders
- `backend/src/main/java/com/micesign/service/NotificationService.java` - Event listener + recipient resolution + retry orchestration
- `backend/src/main/java/com/micesign/event/ApprovalNotificationEvent.java` - Single POJO event for all 4 notification types
- `backend/src/main/java/com/micesign/domain/NotificationLog.java` - JPA entity for notification_log table
- `backend/src/main/java/com/micesign/domain/enums/NotificationStatus.java` - PENDING, SUCCESS, FAILED, RETRY
- `backend/src/main/java/com/micesign/domain/enums/NotificationEventType.java` - SUBMIT, APPROVE, REJECT, WITHDRAW
- `backend/src/main/java/com/micesign/repository/NotificationLogRepository.java` - JPA repository
- `backend/src/main/resources/db/migration/V6__add_pending_notification_status.sql` - Add PENDING to notification_log status enum
- `backend/src/main/resources/templates/email/*.html` - 4 Thymeleaf email templates with inline CSS
- `backend/src/main/resources/application.yml` - Added app.notification config
- `backend/src/main/resources/application-dev.yml` - MailHog SMTP config (port 1025)
- `backend/src/main/resources/application-prod.yml` - Production SMTP config via env vars
- `backend/src/main/java/com/micesign/service/ApprovalService.java` - Added event publishing for approve/reject
- `backend/src/main/java/com/micesign/service/DocumentService.java` - Added event publishing for submit/withdraw
- `backend/src/test/java/com/micesign/notification/EmailServiceTest.java` - 6 unit tests
- `backend/src/test/java/com/micesign/notification/NotificationServiceTest.java` - 8 unit tests

## Decisions Made
- Used POJO event class (no ApplicationEvent extension) per Spring 4.2+ recommendation for cleaner code
- Made resolveRecipients() and sendWithRetry() public for direct unit testing from notification test package
- Used status snapshot capture pattern in tests to handle mutable NotificationLog object reference aliasing

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed duplicate YAML keys in application-dev.yml and application-prod.yml**
- **Found during:** Task 1 (YAML configuration)
- **Issue:** Initial edit created duplicate `spring:` top-level key in both dev and prod YAML files
- **Fix:** Merged mail config under existing `spring:` block
- **Files modified:** application-dev.yml, application-prod.yml
- **Committed in:** 4a0636f (Task 1 commit)

**2. [Rule 1 - Bug] Fixed test assertion failures due to mutable object reference aliasing**
- **Found during:** Task 2 (Unit tests)
- **Issue:** ArgumentCaptor captured same NotificationLog reference; mutations made all captured values identical
- **Fix:** Changed to inline status/retry tracking via answer callbacks capturing values at save-time
- **Files modified:** NotificationServiceTest.java
- **Committed in:** fc52cf3 (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (2 bugs)
**Impact on plan:** Both fixes essential for correctness. No scope creep.

## Issues Encountered
- Pre-existing integration test failures (119 tests requiring running DB) are unrelated to notification changes. All 14 notification-specific unit tests pass.

## Known Stubs
None - all notification logic is fully wired with real implementations.

## User Setup Required
None - no external service configuration required. Dev environment uses MailHog (localhost:1025). Production SMTP configured via environment variables (SMTP_HOST, SMTP_PORT, SMTP_USERNAME, SMTP_PASSWORD).

## Next Phase Readiness
- Backend notification engine complete and tested
- Ready for Plan 02 (notification preferences API / admin settings) and Plan 03 (frontend notification UI)
- MailHog/MailPit recommended for local development testing

## Self-Check: PASSED

All 11 key files verified present. Both task commits (4a0636f, fc52cf3) verified in git log.

---
*Phase: 09-smtp-email-notifications*
*Completed: 2026-04-03*

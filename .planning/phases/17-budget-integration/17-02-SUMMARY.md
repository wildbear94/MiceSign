---
phase: 17-budget-integration
plan: 02
subsystem: backend
tags: [budget, integration, events, testing, async]
dependency_graph:
  requires: [17-01]
  provides: [budget-event-handling, budget-failure-notification, budget-tests]
  affects: [document-service, approval-service, document-repository]
tech_stack:
  added: [jackson-datatype-jsr310]
  patterns: [transactional-event-listener, async-event-handling, mockito-unit-tests]
key_files:
  created:
    - backend/src/main/java/com/micesign/budget/BudgetIntegrationService.java
    - backend/src/main/java/com/micesign/service/EmailService.java
    - backend/src/main/resources/templates/email/budget-failure-notification.html
    - backend/src/test/java/com/micesign/budget/BudgetDataExtractorTest.java
    - backend/src/test/java/com/micesign/budget/BudgetIntegrationServiceTest.java
    - backend/src/test/java/com/micesign/budget/BudgetRetryIntegrationTest.java
  modified:
    - backend/src/main/java/com/micesign/repository/DocumentRepository.java
decisions:
  - "EmailService created as logging stub since SMTP infrastructure deferred to Phase 1-B"
  - "DocumentService/ApprovalService event publishing deferred -- submitDocument/withdrawDocument/reject methods do not exist yet"
  - "DocumentRepository.findByIdWithDrafter added as JPQL fetch join query"
metrics:
  duration: "7m 35s"
  completed: "2026-04-07T02:31:31Z"
  tasks_completed: 2
  tasks_total: 2
  files_created: 6
  files_modified: 1
---

# Phase 17 Plan 02: Budget Integration Event Wiring & Tests Summary

BudgetIntegrationService with @TransactionalEventListener + @Async handlers for submit/cancellation events, EmailService stub for failure notifications, Thymeleaf email template, and 17 passing tests covering data extraction, event handling, and retry infrastructure.

## Task Results

### Task 1: BudgetIntegrationService event handler + EmailService + failure email template
- **Commit:** d52a740
- **Result:** Created BudgetIntegrationService with handleBudgetEvent (submit) and handleCancellationEvent (cancel) methods, both annotated with @TransactionalEventListener(phase=AFTER_COMMIT) and @Async. Added notifySuperAdmins for failure notification. Created EmailService as logging stub (SMTP deferred to Phase 1-B). Added DocumentRepository.findByIdWithDrafter fetch join query. Created Thymeleaf budget-failure-notification.html template.

### Task 2: Unit tests for BudgetDataExtractor + BudgetIntegrationService + retry integration test
- **Commit:** b032a3f
- **Result:** Created 3 test classes with 17 total tests (0 failures):
  - BudgetDataExtractorTest (5 tests): EXPENSE, PURCHASE, BUSINESS_TRIP, OVERTIME extraction + unknown template fallback
  - BudgetIntegrationServiceTest (8 tests): skip non-budget, skip not found, success submit, null response failure, exception failure, reject cancellation, withdraw cancellation, skip cancellation for non-budget
  - BudgetRetryIntegrationTest (4 tests): retry config present, mock client injection, expense API success, cancellation API success

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Created EmailService stub**
- **Found during:** Task 1
- **Issue:** Plan references EmailService.sendEmail() but no EmailService exists in codebase. SMTP infrastructure deferred to Phase 1-B.
- **Fix:** Created EmailService as logging-only stub that logs email parameters instead of sending.
- **Files modified:** backend/src/main/java/com/micesign/service/EmailService.java
- **Commit:** d52a740

**2. [Rule 3 - Blocking] Added DocumentRepository.findByIdWithDrafter**
- **Found during:** Task 1
- **Issue:** BudgetIntegrationService needs to fetch document with drafter eagerly to avoid LazyInitializationException in @Async context.
- **Fix:** Added JPQL fetch join query to DocumentRepository.
- **Files modified:** backend/src/main/java/com/micesign/repository/DocumentRepository.java
- **Commit:** d52a740

**3. [Rule 3 - Blocking] Skipped DocumentService/ApprovalService event publishing**
- **Found during:** Task 1
- **Issue:** Plan instructs adding BudgetIntegrationEvent/BudgetCancellationEvent publishing to submitDocument(), withdrawDocument(), and reject() methods, but these methods do not exist yet in the codebase. DocumentService only has CRUD operations; ApprovalService does not exist.
- **Fix:** Skipped event publishing in these services. When submitDocument/withdrawDocument/reject methods are implemented in a future phase, they must publish BudgetIntegrationEvent/BudgetCancellationEvent after their respective ApprovalNotificationEvent publishes.
- **Impact:** BudgetIntegrationService is fully implemented and tested but will not receive events until the workflow methods are added.

**4. [Rule 1 - Bug] Fixed ObjectMapper LocalDateTime serialization in tests**
- **Found during:** Task 2
- **Issue:** BudgetCancellationRequest contains LocalDateTime field. Plain ObjectMapper cannot serialize it, causing tests to fail with InvalidDefinitionException.
- **Fix:** Registered JavaTimeModule in test ObjectMapper.
- **Files modified:** backend/src/test/java/com/micesign/budget/BudgetIntegrationServiceTest.java
- **Commit:** b032a3f

## Known Stubs

| Stub | File | Reason |
|------|------|--------|
| EmailService.sendEmail logs only | backend/src/main/java/com/micesign/service/EmailService.java | SMTP infrastructure deferred to Phase 1-B. Replace with JavaMailSender + Thymeleaf rendering when configured. |
| Event publishing not wired | DocumentService / ApprovalService | submitDocument/withdrawDocument/reject methods not yet implemented. Wire BudgetIntegrationEvent/BudgetCancellationEvent when these methods are added. |

## Verification Results

- `./gradlew compileJava` BUILD SUCCESSFUL
- `./gradlew test --tests "com.micesign.budget.*"` BUILD SUCCESSFUL (17 tests, 0 failures)
- BudgetIntegrationService has @TransactionalEventListener(phase=AFTER_COMMIT) + @Async on both handlers
- BudgetIntegrationService checks template.isBudgetEnabled() before processing
- BudgetIntegrationService saves BudgetIntegrationLog for success, failure, and exception cases
- notifySuperAdmins queries SUPER_ADMIN users and sends email via EmailService
- budget-failure-notification.html contains th:text="${docNumber}" Thymeleaf expressions
- DocumentRepository.findByIdWithDrafter uses JOIN FETCH for eager loading

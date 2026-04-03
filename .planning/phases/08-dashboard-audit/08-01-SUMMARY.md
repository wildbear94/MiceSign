---
phase: 08-dashboard-audit
plan: 01
subsystem: api
tags: [spring-boot, jpa, aop, audit-log, dashboard, specification]

requires:
  - phase: 07-approval-workflow
    provides: ApprovalLineRepository with findPendingByApproverId, ApprovalService, DocumentService
  - phase: 05-file-attachments
    provides: DocumentAttachmentService
provides:
  - Dashboard summary endpoint (GET /api/v1/dashboard/summary) with pendingCount, draftCount, completedCount
  - AuditLogService immutable writer with exception swallowing
  - AuditAspect for login/logout event capture via AOP
  - AuditAction constants for all 9 action types
  - Audit log insertion in DocumentService, ApprovalService, DocumentAttachmentService
  - AuditLogController query endpoint for SUPER_ADMIN with filters
  - AuditLogSpecification for action/userId/date range filtering
affects: [08-dashboard-audit (plans 02 and 03 frontend will consume these APIs)]

tech-stack:
  added: []
  patterns: [AOP @AfterReturning for cross-cutting auth audit, JpaSpecificationExecutor for dynamic filtering, REQUIRES_NEW propagation for audit isolation]

key-files:
  created:
    - backend/src/main/java/com/micesign/controller/DashboardController.java
    - backend/src/main/java/com/micesign/service/DashboardService.java
    - backend/src/main/java/com/micesign/dto/dashboard/DashboardSummaryResponse.java
    - backend/src/main/java/com/micesign/common/AuditAction.java
    - backend/src/main/java/com/micesign/service/AuditLogService.java
    - backend/src/main/java/com/micesign/aspect/AuditAspect.java
    - backend/src/main/java/com/micesign/dto/audit/AuditLogResponse.java
    - backend/src/main/java/com/micesign/specification/AuditLogSpecification.java
    - backend/src/main/java/com/micesign/controller/AuditLogController.java
    - backend/src/test/java/com/micesign/dashboard/DashboardControllerTest.java
    - backend/src/test/java/com/micesign/audit/AuditLogServiceTest.java
    - backend/src/test/java/com/micesign/audit/AuditLogControllerTest.java
  modified:
    - backend/src/main/java/com/micesign/repository/ApprovalLineRepository.java
    - backend/src/main/java/com/micesign/repository/DocumentRepository.java
    - backend/src/main/java/com/micesign/repository/AuditLogRepository.java
    - backend/src/main/java/com/micesign/service/DocumentService.java
    - backend/src/main/java/com/micesign/service/ApprovalService.java
    - backend/src/main/java/com/micesign/service/DocumentAttachmentService.java
    - backend/src/test/java/com/micesign/document/DocumentAttachmentServiceTest.java

key-decisions:
  - "AuditLogService uses REQUIRES_NEW propagation to isolate audit writes from caller transactions"
  - "AuditAspect extracts login result from ResponseEntity body ApiResponse pattern rather than intercepting service layer"
  - "X-Forwarded-For header parsing for client IP extraction behind reverse proxy"

patterns-established:
  - "AuditLogService.log() pattern: always swallow exceptions, never fail the caller"
  - "AOP @AfterReturning for auth event capture without modifying AuthController"
  - "JpaSpecificationExecutor + Specification builder for dynamic admin query filters"

requirements-completed: [DASH-01, DASH-02, DASH-03, AUD-01]

duration: 8min
completed: 2026-04-03
---

# Phase 08 Plan 01: Dashboard & Audit Backend Summary

**Dashboard summary counts API with immutable audit trail logging for all document lifecycle, auth, and file events via AOP and explicit service calls**

## Performance

- **Duration:** 8 min
- **Started:** 2026-04-03T01:27:16Z
- **Completed:** 2026-04-03T01:35:55Z
- **Tasks:** 2
- **Files modified:** 19

## Accomplishments
- Dashboard summary endpoint returning correct pending/draft/completed counts matching the exact WHERE clause from findPendingByApproverId
- Immutable audit log service recording all 9 action types (document create/submit/approve/reject/withdraw, login success/failure, logout, file upload/download)
- AOP-based auth event capture without modifying AuthController
- SUPER_ADMIN audit log query endpoint with action, userId, and date range filters
- Full integration test coverage (14 new tests across 3 test classes)

## Task Commits

Each task was committed atomically:

1. **Task 1: Dashboard summary endpoint + Audit log service core** - `a91e6fd` (feat)
2. **Task 2: Audit log insertion points + query endpoint** - `034c2b9` (feat)

## Files Created/Modified
- `DashboardController.java` - GET /api/v1/dashboard/summary endpoint
- `DashboardService.java` - Count queries for pending, draft, completed
- `DashboardSummaryResponse.java` - Response DTO record
- `AuditAction.java` - String constants for all 9 audit action types
- `AuditLogService.java` - Immutable writer with IP/User-Agent extraction
- `AuditAspect.java` - AOP login/logout event capture
- `AuditLogResponse.java` - Response DTO for audit log entries
- `AuditLogSpecification.java` - Dynamic JPA Specification builder
- `AuditLogController.java` - SUPER_ADMIN query endpoint with filters
- `ApprovalLineRepository.java` - Added countPendingByApproverId
- `DocumentRepository.java` - Added countByDrafterIdAndStatus
- `AuditLogRepository.java` - Added JpaSpecificationExecutor
- `DocumentService.java` - Audit calls for create/submit/withdraw
- `ApprovalService.java` - Audit calls for approve/reject
- `DocumentAttachmentService.java` - Audit calls for upload/download

## Decisions Made
- AuditLogService uses REQUIRES_NEW propagation to ensure audit writes persist even if the caller's transaction rolls back
- AuditAspect inspects the ResponseEntity body (ApiResponse pattern) to determine login success vs failure
- X-Forwarded-For header is parsed for client IP behind reverse proxy

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added missing @Mock AuditLogService to DocumentAttachmentServiceTest**
- **Found during:** Task 2 (Audit log insertion points)
- **Issue:** Adding AuditLogService as constructor parameter to DocumentAttachmentService broke existing Mockito @InjectMocks test
- **Fix:** Added @Mock AuditLogService and @Mock ApprovalLineRepository to DocumentAttachmentServiceTest
- **Files modified:** backend/src/test/java/com/micesign/document/DocumentAttachmentServiceTest.java
- **Verification:** Full test suite passes (159+ tests)
- **Committed in:** 034c2b9 (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Necessary fix for test compatibility after dependency injection change. No scope creep.

## Issues Encountered
None

## Known Stubs
None - all endpoints return real data from database queries.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Dashboard summary API ready for frontend consumption in Plan 02
- Audit log query API ready for frontend consumption in Plan 03
- All 9 audit action types are being recorded

## Self-Check: PASSED

All 10 created files verified. Both task commits (a91e6fd, 034c2b9) verified. Full test suite (159+ tests) green.

---
*Phase: 08-dashboard-audit*
*Completed: 2026-04-03*

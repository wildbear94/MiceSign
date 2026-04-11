---
phase: 11-document-search-filter
plan: 01
subsystem: api
tags: [querydsl, search, jpa, spring-boot, pagination]

# Dependency graph
requires:
  - phase: 04-document-core
    provides: Document entity, DocumentRepository, DocumentService, DocumentMapper
provides:
  - GET /api/v1/documents/search endpoint with keyword + multi-filter + tab scoping
  - DocumentSearchCondition DTO with SearchTab enum
  - DocumentRepositoryCustom with QueryDSL dynamic queries
  - DocumentResponse with drafterName and drafterDepartmentName fields
  - ApprovalLine entity with enums
  - BusinessException httpStatus support for 403 responses
affects: [11-document-search-filter, frontend-search-ui]

# Tech tracking
tech-stack:
  added: [querydsl-jpa dynamic queries]
  patterns: [QueryDSL BooleanBuilder for dynamic query building, JPAExpressions subquery for tab scoping, LIKE escape helper]

key-files:
  created:
    - backend/src/main/java/com/micesign/config/QueryDslConfig.java
    - backend/src/main/java/com/micesign/dto/document/DocumentSearchCondition.java
    - backend/src/main/java/com/micesign/repository/DocumentRepositoryCustom.java
    - backend/src/main/java/com/micesign/repository/DocumentRepositoryCustomImpl.java
    - backend/src/main/java/com/micesign/domain/ApprovalLine.java
    - backend/src/main/java/com/micesign/domain/enums/ApprovalLineType.java
    - backend/src/main/java/com/micesign/domain/enums/ApprovalLineStatus.java
    - backend/src/test/java/com/micesign/document/DocumentSearchTest.java
  modified:
    - backend/src/main/java/com/micesign/dto/document/DocumentResponse.java
    - backend/src/main/java/com/micesign/mapper/DocumentMapper.java
    - backend/src/main/java/com/micesign/repository/DocumentRepository.java
    - backend/src/main/java/com/micesign/service/DocumentService.java
    - backend/src/main/java/com/micesign/controller/DocumentController.java
    - backend/src/main/java/com/micesign/common/exception/BusinessException.java
    - backend/src/main/java/com/micesign/common/exception/GlobalExceptionHandler.java
    - backend/src/test/java/com/micesign/document/DocumentControllerTest.java

key-decisions:
  - "ApprovalLine entity created as blocking dependency for APPROVAL tab query (not yet existing in codebase)"
  - "BusinessException enhanced with httpStatus field for proper HTTP 403 on RBAC violation"
  - "LIKE wildcards escaped to prevent search injection via escapeLikePattern helper"
  - "Fetch joins on drafter and department to avoid N+1 queries in search results"

patterns-established:
  - "QueryDSL BooleanBuilder pattern for dynamic multi-criteria search"
  - "JPAExpressions subquery for tab-scoped approval line queries"
  - "LIKE escape helper for safe keyword search"

requirements-completed: [SRCH-01, SRCH-02]

# Metrics
duration: 10min
completed: 2026-04-04
---

# Phase 11 Plan 01: Backend Search API Summary

**QueryDSL-based document search endpoint with keyword OR search, multi-criteria AND filters, tab-scoped RBAC, and 13 integration tests**

## Performance

- **Duration:** 10 min
- **Started:** 2026-04-04T03:34:10Z
- **Completed:** 2026-04-04T03:44:21Z
- **Tasks:** 2
- **Files modified:** 16

## Accomplishments
- GET /api/v1/documents/search endpoint with keyword search across title, docNumber, drafter name (OR logic)
- Multi-criteria filtering: status, templateCode, startDate, endDate with AND combination
- Tab scoping: MY (own docs), APPROVAL (approval line docs via subquery), ALL (admin only with 403 for regular users)
- 13 passing integration tests covering keyword search, tab scoping, RBAC, filters, combined logic, and response structure

## Task Commits

Each task was committed atomically:

1. **Task 1: QueryDSL config, search DTO, custom repository with dynamic queries** - `b6832aa` (feat)
2. **Task 2: Search service method, controller endpoint, and integration tests** - `e6d14e5` (feat)

## Files Created/Modified
- `backend/src/main/java/com/micesign/config/QueryDslConfig.java` - JPAQueryFactory Spring bean
- `backend/src/main/java/com/micesign/dto/document/DocumentSearchCondition.java` - Search parameters DTO with SearchTab enum
- `backend/src/main/java/com/micesign/repository/DocumentRepositoryCustom.java` - Custom repository interface
- `backend/src/main/java/com/micesign/repository/DocumentRepositoryCustomImpl.java` - QueryDSL dynamic query implementation
- `backend/src/main/java/com/micesign/domain/ApprovalLine.java` - Approval line entity (needed for APPROVAL tab subquery)
- `backend/src/main/java/com/micesign/domain/enums/ApprovalLineType.java` - APPROVE/AGREE/REFERENCE enum
- `backend/src/main/java/com/micesign/domain/enums/ApprovalLineStatus.java` - PENDING/APPROVED/REJECTED/SKIPPED enum
- `backend/src/main/java/com/micesign/dto/document/DocumentResponse.java` - Added drafterName, drafterDepartmentName fields
- `backend/src/main/java/com/micesign/mapper/DocumentMapper.java` - Added drafter field mappings
- `backend/src/main/java/com/micesign/repository/DocumentRepository.java` - Extended with DocumentRepositoryCustom
- `backend/src/main/java/com/micesign/service/DocumentService.java` - Added searchDocuments method
- `backend/src/main/java/com/micesign/controller/DocumentController.java` - Added GET /search endpoint with RBAC
- `backend/src/main/java/com/micesign/common/exception/BusinessException.java` - Added httpStatus field
- `backend/src/main/java/com/micesign/common/exception/GlobalExceptionHandler.java` - Uses httpStatus from exception
- `backend/src/test/java/com/micesign/document/DocumentSearchTest.java` - 13 integration tests
- `backend/src/test/java/com/micesign/document/DocumentControllerTest.java` - Added approval_line cleanup

## Decisions Made
- Created ApprovalLine entity (not yet in codebase) as it was a blocking dependency for the APPROVAL tab subquery
- Enhanced BusinessException with httpStatus field (default 400) so RBAC 403 is returned properly via GlobalExceptionHandler
- Used LIKE escape helper to prevent search injection with special characters (%, _, \)
- Used fetch joins on drafter and department to avoid N+1 in search results

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Created ApprovalLine entity and enums**
- **Found during:** Task 1 (QueryDSL repository implementation)
- **Issue:** ApprovalLine entity referenced in plan for APPROVAL tab subquery did not exist in the codebase
- **Fix:** Created ApprovalLine.java entity with ApprovalLineType and ApprovalLineStatus enums matching the DB schema
- **Files modified:** ApprovalLine.java, ApprovalLineType.java, ApprovalLineStatus.java
- **Verification:** compileJava passes, Q-classes generated
- **Committed in:** b6832aa (Task 1 commit)

**2. [Rule 2 - Missing Critical] Added httpStatus support to BusinessException**
- **Found during:** Task 1 (RBAC enforcement design)
- **Issue:** BusinessException only had 2-arg constructor (code, message) and always returned HTTP 400; needed 403 for RBAC
- **Fix:** Added httpStatus field with 3-arg constructor, updated GlobalExceptionHandler to use it
- **Files modified:** BusinessException.java, GlobalExceptionHandler.java
- **Verification:** tabALL_forbiddenForRegularUser test returns 403
- **Committed in:** b6832aa (Task 1 commit)

**3. [Rule 1 - Bug] Fixed DocumentControllerTest cleanup**
- **Found during:** Task 2 (integration test execution)
- **Issue:** DocumentControllerTest @BeforeEach didn't clean approval_line table, causing FK constraint failures when running after DocumentSearchTest
- **Fix:** Added approval_line cleanup to DocumentControllerTest setUp
- **Files modified:** DocumentControllerTest.java
- **Verification:** Both test classes pass together
- **Committed in:** e6d14e5 (Task 2 commit)

---

**Total deviations:** 3 auto-fixed (1 bug, 1 missing critical, 1 blocking)
**Impact on plan:** All auto-fixes necessary for correctness. No scope creep.

## Known Stubs

None - all search functionality is fully wired with real data sources.

## Issues Encountered
- Pre-existing test failures (53 tests) unrelated to this plan's changes were found. These tests fail on the base branch as well (H2 MariaDB mode quoting issues with "user" table). Out of scope for this plan.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Search API fully functional, ready for frontend search UI (Plan 02)
- DocumentResponse now includes drafterName and drafterDepartmentName for display

---
## Self-Check: PASSED

All created files verified. Both task commits (b6832aa, e6d14e5) confirmed in git log.

---
*Phase: 11-document-search-filter*
*Completed: 2026-04-04*

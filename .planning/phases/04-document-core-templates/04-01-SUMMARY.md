---
phase: 04-document-core-templates
plan: 01
subsystem: api
tags: [spring-boot, jpa, flyway, mapstruct, rest-api, document-crud]

# Dependency graph
requires:
  - phase: 01-project-foundation
    provides: database schema (document, document_content, approval_template tables)
  - phase: 02-authentication
    provides: JWT auth, CustomUserDetails, SecurityConfig
  - phase: 03-admin-org
    provides: User entity with department/position relations, TestTokenHelper
provides:
  - Document CRUD REST API (create, update, delete, list, detail)
  - Template list API and leave-type list API
  - DocumentFormValidator for EXPENSE/LEAVE JSON validation
  - leave_type table via V5 Flyway migration
affects: [04-02-frontend-forms, 06-submission-workflow, 07-approval-workflow]

# Tech tracking
tech-stack:
  added: []
  patterns: [form-data-json-validation, document-owner-draft-guard, template-name-lookup-map]

key-files:
  created:
    - backend/src/main/java/com/micesign/controller/DocumentController.java
    - backend/src/main/java/com/micesign/service/DocumentService.java
    - backend/src/main/java/com/micesign/service/DocumentFormValidator.java
    - backend/src/main/java/com/micesign/service/TemplateService.java
    - backend/src/main/java/com/micesign/controller/TemplateController.java
    - backend/src/main/java/com/micesign/controller/LeaveTypeController.java
    - backend/src/main/java/com/micesign/domain/Document.java
    - backend/src/main/java/com/micesign/domain/DocumentContent.java
    - backend/src/main/java/com/micesign/domain/ApprovalTemplate.java
    - backend/src/main/java/com/micesign/domain/LeaveType.java
    - backend/src/main/resources/db/migration/V5__add_document_support.sql
    - backend/src/test/java/com/micesign/document/DocumentControllerTest.java
    - backend/src/test/java/com/micesign/document/DocumentFormValidatorTest.java
  modified:
    - backend/src/main/java/com/micesign/domain/DocumentContent.java

key-decisions:
  - "Used @Lob instead of columnDefinition for DocumentContent body_html/form_data to maintain H2 test compatibility"
  - "SecurityConfig unchanged -- existing anyRequest().authenticated() already covers document endpoints"
  - "Removed duplicate approval_template inserts from V5 test migration (already seeded in V2)"

patterns-established:
  - "Document owner/draft guard: loadAndVerifyOwnerDraft() pattern for mutation endpoints"
  - "Form data JSON validation via JsonNode tree walking (not typed deserialization)"
  - "Template name lookup via cached Map from active templates query"

requirements-completed: [DOC-01, DOC-02, DOC-05, DOC-06, TPL-01, TPL-02, TPL-03]

# Metrics
duration: 4min
completed: 2026-04-02
---

# Phase 04 Plan 01: Backend Document CRUD Summary

**Full document CRUD REST API with Flyway migration, JPA entities, per-template JSON validation (EXPENSE/LEAVE), and 24 integration/unit tests**

## Performance

- **Duration:** 4 min
- **Started:** 2026-04-02T04:10:16Z
- **Completed:** 2026-04-02T04:14:25Z
- **Tasks:** 3
- **Files modified:** 34

## Accomplishments
- Complete document lifecycle API: create (3 template types), update, delete, list, detail at /api/v1/documents
- Per-template form data JSON validation for EXPENSE (items array, totals) and LEAVE (dates, days, reason)
- Template and leave-type reference data APIs at /api/v1/templates and /api/v1/leave-types
- V5 Flyway migration creating leave_type table and seeding 4 leave types + 3 templates
- 24 total tests (10 integration controller tests + 14 unit validator tests)

## Task Commits

Each task was committed atomically:

1. **Task 1: Flyway migration, JPA entities, repositories, DTOs, and mappers** - `8e8d376` (feat)
2. **Task 2: DocumentFormValidator, DocumentService, TemplateService, and controllers** - `5dc730b` (feat)
3. **Task 3: Integration tests for document CRUD and form validation** - `7169fdc` (test)

## Files Created/Modified
- `backend/src/main/resources/db/migration/V5__add_document_support.sql` - leave_type table + seed data
- `backend/src/main/java/com/micesign/domain/Document.java` - Document JPA entity
- `backend/src/main/java/com/micesign/domain/DocumentContent.java` - Document content with bodyHtml/formData
- `backend/src/main/java/com/micesign/domain/ApprovalTemplate.java` - Template master entity
- `backend/src/main/java/com/micesign/domain/LeaveType.java` - Leave type entity
- `backend/src/main/java/com/micesign/domain/enums/DocumentStatus.java` - DRAFT/SUBMITTED/APPROVED/REJECTED/WITHDRAWN
- `backend/src/main/java/com/micesign/repository/DocumentRepository.java` - Document queries with drafter/status filters
- `backend/src/main/java/com/micesign/service/DocumentFormValidator.java` - GENERAL/EXPENSE/LEAVE validation
- `backend/src/main/java/com/micesign/service/DocumentService.java` - Full CRUD with owner/draft guards
- `backend/src/main/java/com/micesign/service/TemplateService.java` - Active template listing
- `backend/src/main/java/com/micesign/controller/DocumentController.java` - REST endpoints
- `backend/src/main/java/com/micesign/controller/TemplateController.java` - Template list endpoint
- `backend/src/main/java/com/micesign/controller/LeaveTypeController.java` - Leave type list endpoint
- `backend/src/main/java/com/micesign/mapper/DocumentMapper.java` - MapStruct entity-to-DTO mapping
- `backend/src/main/java/com/micesign/mapper/TemplateMapper.java` - Template entity-to-DTO mapping
- `backend/src/test/java/com/micesign/document/DocumentControllerTest.java` - 10 integration tests
- `backend/src/test/java/com/micesign/document/DocumentFormValidatorTest.java` - 14 unit tests

## Decisions Made
- Used `@Lob` annotation instead of `columnDefinition = "LONGTEXT"/"JSON"` on DocumentContent to maintain H2 test compatibility while still working with MariaDB in production
- SecurityConfig left unchanged: `anyRequest().authenticated()` already covers document/template/leave-type endpoints without needing explicit matchers
- Removed duplicate approval_template seed data from V5 test migration since V2 already seeds the same rows

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed DocumentContent columnDefinition for H2 compatibility**
- **Found during:** Task 3 (integration tests)
- **Issue:** `columnDefinition = "LONGTEXT"` and `columnDefinition = "JSON"` caused Hibernate schema validation failure in H2 test database
- **Fix:** Replaced with `@Lob` annotation which maps correctly to both H2 CLOB and MariaDB LONGTEXT
- **Files modified:** `backend/src/main/java/com/micesign/domain/DocumentContent.java`
- **Verification:** All 24 tests pass, compilation succeeds
- **Committed in:** `7169fdc` (part of Task 3 commit)

**2. [Rule 1 - Bug] Fixed duplicate approval_template seeds in V5 test migration**
- **Found during:** Task 3 (integration tests)
- **Issue:** V5 test migration tried to INSERT approval_template rows that already existed from V2 seed data, causing unique constraint violation
- **Fix:** Removed duplicate INSERT statements, added comment noting V2 already handles template seeding
- **Files modified:** `backend/src/test/resources/db/testmigration/V5__add_document_support.sql`
- **Verification:** Flyway migration runs cleanly, all tests pass
- **Committed in:** `7169fdc` (part of Task 3 commit)

---

**Total deviations:** 2 auto-fixed (2 bugs)
**Impact on plan:** Both fixes necessary for test execution. No scope creep.

## Issues Encountered
None beyond the auto-fixed deviations above.

## User Setup Required
None - no external service configuration required.

## Known Stubs
None - all endpoints return real data from database.

## Next Phase Readiness
- Backend document CRUD API fully operational, ready for frontend integration (Plan 02)
- Template and leave-type reference data APIs available for form component population
- Form validation ensures data integrity before frontend builds forms

---
*Phase: 04-document-core-templates*
*Completed: 2026-04-02*

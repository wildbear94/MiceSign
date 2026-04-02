---
phase: 06-document-submission-numbering
plan: 01
subsystem: api
tags: [jpa, pessimistic-locking, document-lifecycle, google-drive, spring-boot]

# Dependency graph
requires:
  - phase: 04-document-drafting
    provides: Document entity, DocumentService CRUD, DocumentController endpoints
  - phase: 05-file-attachments
    provides: GoogleDriveService, DocumentAttachmentService, attachment upload/download
provides:
  - POST /api/v1/documents/{id}/submit endpoint
  - DocSequence entity with pessimistic-lock numbering (PREFIX-YYYY-NNNN)
  - BusinessException httpStatus support (400/403 dynamic)
  - Document immutability enforcement (403 for non-DRAFT modifications)
  - Google Drive file move from draft to permanent folder on submit
affects: [07-approval-workflow, 08-dashboard-audit]

# Tech tracking
tech-stack:
  added: []
  patterns: [pessimistic-locking-for-sequence, httpStatus-aware-BusinessException, graceful-drive-failure]

key-files:
  created:
    - backend/src/main/java/com/micesign/domain/DocSequence.java
    - backend/src/main/java/com/micesign/repository/DocSequenceRepository.java
    - backend/src/test/java/com/micesign/document/DocumentSubmitTest.java
  modified:
    - backend/src/main/java/com/micesign/common/exception/BusinessException.java
    - backend/src/main/java/com/micesign/common/exception/GlobalExceptionHandler.java
    - backend/src/main/java/com/micesign/service/DocumentService.java
    - backend/src/main/java/com/micesign/controller/DocumentController.java
    - backend/src/main/java/com/micesign/service/GoogleDriveService.java
    - backend/src/main/java/com/micesign/service/DocumentAttachmentService.java

key-decisions:
  - "Pessimistic locking (PESSIMISTIC_WRITE) for doc_sequence to prevent duplicate numbers under concurrent submissions"
  - "BusinessException httpStatus field is backward-compatible -- existing 2-arg constructor defaults to 400"
  - "Google Drive file move failure is logged but not thrown -- document submission succeeds even if Drive move fails"

patterns-established:
  - "BusinessException with httpStatus: use 3-arg constructor for non-400 status codes (e.g., 403 for immutability)"
  - "Graceful external service failure: try-catch with log.warn for non-critical Drive operations"

requirements-completed: [DOC-03, DOC-04, DOC-07]

# Metrics
duration: 5min
completed: 2026-04-02
---

# Phase 06 Plan 01: Document Submission Backend Summary

**Submit endpoint with pessimistic-lock sequential numbering (PREFIX-YYYY-NNNN), 403 immutability enforcement, and Google Drive file relocation**

## Performance

- **Duration:** 5 min
- **Started:** 2026-04-02T08:45:12Z
- **Completed:** 2026-04-02T08:50:32Z
- **Tasks:** 2
- **Files modified:** 10

## Accomplishments
- Document submission changes DRAFT to SUBMITTED with auto-assigned PREFIX-YYYY-NNNN number using pessimistic locking
- Non-DRAFT document modifications (update, delete, attachment upload) now return 403 instead of 400
- Google Drive attachments move from `MiceSign/drafts/DRAFT-{id}/` to `MiceSign/{year}/{month}/{docNumber}/` on submit
- 7 integration tests covering submit, numbering, immutability, and form validation

## Task Commits

Each task was committed atomically:

1. **Task 1 RED: Failing tests** - `ea40e08` (test)
2. **Task 1 GREEN: Submit endpoint + numbering + immutability** - `5cf8948` (feat)
3. **Task 2: Google Drive file move + attachment folder update** - `839db46` (feat)

## Files Created/Modified
- `backend/src/main/java/com/micesign/domain/DocSequence.java` - JPA entity for doc_sequence table
- `backend/src/main/java/com/micesign/repository/DocSequenceRepository.java` - Pessimistic lock query for sequence generation
- `backend/src/main/java/com/micesign/common/exception/BusinessException.java` - Added httpStatus field with 3-arg constructor
- `backend/src/main/java/com/micesign/common/exception/GlobalExceptionHandler.java` - Uses dynamic httpStatus instead of hardcoded 400
- `backend/src/main/java/com/micesign/service/DocumentService.java` - submitDocument(), generateDocNumber(), moveAttachmentsToPermanentFolder()
- `backend/src/main/java/com/micesign/controller/DocumentController.java` - POST /{id}/submit endpoint
- `backend/src/main/java/com/micesign/service/GoogleDriveService.java` - moveFile() using Drive API addParents/removeParents
- `backend/src/main/java/com/micesign/service/DocumentAttachmentService.java` - DRAFT status guard on attachment upload
- `backend/src/test/java/com/micesign/document/DocumentSubmitTest.java` - 7 integration tests for submit flow
- `backend/src/test/java/com/micesign/document/DocumentControllerTest.java` - Updated existing test to expect 403

## Decisions Made
- Pessimistic locking (PESSIMISTIC_WRITE) chosen over optimistic locking for doc_sequence -- simpler and more reliable for sequential numbering
- BusinessException httpStatus is backward-compatible (2-arg constructor defaults to 400)
- Drive file move failure is gracefully handled (logged, not thrown) -- per research recommendation

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Updated existing test to expect 403 for non-DRAFT status**
- **Found during:** Task 2 (verification)
- **Issue:** DocumentControllerTest.updateDraft_notDraftStatus_returnsError expected 400 but now returns 403
- **Fix:** Changed assertion from `status().isBadRequest()` to `status().isForbidden()`
- **Files modified:** backend/src/test/java/com/micesign/document/DocumentControllerTest.java
- **Verification:** Full test suite passes (62 tests)
- **Committed in:** 839db46 (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 bug fix)
**Impact on plan:** Expected consequence of changing DOC_NOT_DRAFT from 400 to 403. No scope creep.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Known Stubs
None - all functionality is fully wired.

## Next Phase Readiness
- Submit endpoint ready for frontend integration (Plan 02)
- Approval line validation intentionally deferred to Phase 7
- Document immutability enforcement complete for all modification paths

---
*Phase: 06-document-submission-numbering*
*Completed: 2026-04-02*

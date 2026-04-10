---
phase: 05-file-attachments
plan: 04
subsystem: api, security
tags: [google-drive, jackson, dto, file-attachment, mapstruct]

requires:
  - phase: 05-file-attachments (plans 01-03)
    provides: File attachment upload/download/delete with Google Drive integration
provides:
  - Secure API responses with no internal Drive IDs leaked
  - Safe audit log JSON serialization
  - Correct deleteAttachment parameter routing
  - Proper readOnly prop propagation in form templates
affects: []

tech-stack:
  added: []
  patterns:
    - "Jackson ObjectMapper for audit log detail JSON serialization"
    - "Null-safe filename validation at validateFile entry point"

key-files:
  created: []
  modified:
    - backend/src/main/java/com/micesign/dto/document/AttachmentResponse.java
    - backend/src/main/java/com/micesign/service/DocumentAttachmentService.java
    - backend/src/main/java/com/micesign/controller/DocumentController.java
    - backend/src/main/java/com/micesign/config/GoogleDriveConfig.java
    - backend/src/main/java/com/micesign/service/ApprovalService.java
    - backend/src/main/java/com/micesign/service/DocumentService.java
    - backend/src/test/java/com/micesign/document/DocumentAttachmentServiceTest.java
    - frontend/src/features/document/components/templates/GeneralForm.tsx
    - frontend/src/features/document/components/templates/ExpenseForm.tsx
    - frontend/src/features/document/components/templates/LeaveForm.tsx

key-decisions:
  - "Used Jackson ObjectMapper (already available via Spring Boot) for audit log JSON instead of manual string concatenation"
  - "CR-02 MIME type validation deferred -- extension blocklist is primary security gate, Tika dependency out of scope"

patterns-established:
  - "toJson helper: private method wrapping ObjectMapper.writeValueAsString with fallback"

requirements-completed: [FILE-01, FILE-02, FILE-03]

duration: 4min
completed: 2026-04-08
---

# Phase 5 Plan 4: Gap Closure Summary

**Security gap closure: removed gdriveFileId from API responses, fixed audit log JSON injection, corrected deleteAttachment param swap, fixed resource leak, added filename validation, and propagated readOnly prop in forms**

## Performance

- **Duration:** 4 min
- **Started:** 2026-04-08T08:49:27Z
- **Completed:** 2026-04-08T08:53:57Z
- **Tasks:** 2
- **Files modified:** 10

## Accomplishments
- Closed D-10 security gap: Google Drive file IDs no longer exposed in API responses
- Fixed audit log JSON injection vulnerability using Jackson ObjectMapper (CR-01)
- Corrected deleteAttachment parameter order swap bug that would cause incorrect authorization checks (WR-01)
- Fixed FileInputStream resource leak in Google Drive config (WR-02)
- Added null-safe filename validation with clear error message (WR-03)
- Fixed readOnly prop not being passed through to FileAttachmentArea in all three form templates (WR-04)

## Task Commits

Each task was committed atomically:

1. **Task 1: Fix backend security and correctness issues** - `a656c1a` (fix)
2. **Task 2: Fix readOnly prop in frontend form templates** - `d2d9e5e` (fix)

## Files Created/Modified
- `backend/src/main/java/com/micesign/dto/document/AttachmentResponse.java` - Removed gdriveFileId field from public DTO
- `backend/src/main/java/com/micesign/service/DocumentAttachmentService.java` - Jackson ObjectMapper for audit JSON, null filename validation, MIME type comment
- `backend/src/main/java/com/micesign/controller/DocumentController.java` - Fixed deleteAttachment parameter order
- `backend/src/main/java/com/micesign/config/GoogleDriveConfig.java` - try-with-resources for FileInputStream
- `backend/src/main/java/com/micesign/service/ApprovalService.java` - Removed gdriveFileId from AttachmentResponse construction
- `backend/src/main/java/com/micesign/service/DocumentService.java` - Removed gdriveFileId from AttachmentResponse construction
- `backend/src/test/java/com/micesign/document/DocumentAttachmentServiceTest.java` - Added ObjectMapper mock for @InjectMocks
- `frontend/src/features/document/components/templates/GeneralForm.tsx` - readOnly={false} -> readOnly={readOnly}
- `frontend/src/features/document/components/templates/ExpenseForm.tsx` - readOnly={false} -> readOnly={readOnly}
- `frontend/src/features/document/components/templates/LeaveForm.tsx` - readOnly={false} -> readOnly={readOnly}

## Decisions Made
- Used Jackson ObjectMapper (already available via Spring Boot auto-config) for audit log JSON serialization instead of adding a new library
- CR-02 (MIME type validation via Tika) documented as out-of-scope for gap closure; extension blocklist remains primary security gate

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed AttachmentResponse constructor calls in ApprovalService and DocumentService**
- **Found during:** Task 1 (compilation after removing gdriveFileId)
- **Issue:** Two other service files (ApprovalService.java, DocumentService.java) manually constructed AttachmentResponse with the old 7-arg constructor including gdriveFileId
- **Fix:** Removed gdriveFileId argument from constructor calls in both files
- **Files modified:** ApprovalService.java, DocumentService.java
- **Verification:** Compilation passes, all tests green
- **Committed in:** a656c1a (Task 1 commit)

**2. [Rule 3 - Blocking] Added ObjectMapper mock to DocumentAttachmentServiceTest**
- **Found during:** Task 1 (adding ObjectMapper dependency)
- **Issue:** @InjectMocks would fail without a mock for the new ObjectMapper constructor parameter
- **Fix:** Added @Mock ObjectMapper field to test class
- **Files modified:** DocumentAttachmentServiceTest.java
- **Verification:** All tests pass
- **Committed in:** a656c1a (Task 1 commit)

---

**Total deviations:** 2 auto-fixed (1 bug, 1 blocking)
**Impact on plan:** Both auto-fixes necessary for compilation after planned changes. No scope creep.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Phase 5 (file attachments) is fully complete with all verification gaps and code review findings resolved
- All existing tests pass without modification (except adding the ObjectMapper mock)

---
*Phase: 05-file-attachments*
*Completed: 2026-04-08*

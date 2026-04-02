---
phase: 05-file-attachments
plan: 01
subsystem: api
tags: [google-drive, file-upload, multipart, jpa, spring-boot, rest-api]

# Dependency graph
requires:
  - phase: 04-document-drafting
    provides: Document entity, DocumentRepository, DocumentController, DocumentService
provides:
  - Google Drive integration service with retry logic
  - DocumentAttachment JPA entity and repository
  - Attachment CRUD REST endpoints (upload, download, list, delete)
  - File validation (size, extension, count, total size)
affects: [05-02-frontend-attachment-ui, 06-submission-workflow]

# Tech tracking
tech-stack:
  added: [google-api-services-drive v3, google-auth-library-oauth2-http 1.43.0]
  patterns: [GoogleDriveService retry with exponential backoff, MockitoBean for external service testing, multipart upload controller pattern]

key-files:
  created:
    - backend/src/main/java/com/micesign/config/GoogleDriveConfig.java
    - backend/src/main/java/com/micesign/domain/DocumentAttachment.java
    - backend/src/main/java/com/micesign/repository/DocumentAttachmentRepository.java
    - backend/src/main/java/com/micesign/dto/document/AttachmentResponse.java
    - backend/src/main/java/com/micesign/mapper/DocumentAttachmentMapper.java
    - backend/src/main/java/com/micesign/service/GoogleDriveService.java
    - backend/src/main/java/com/micesign/service/DocumentAttachmentService.java
    - backend/src/test/java/com/micesign/document/AttachmentControllerTest.java
    - backend/src/test/java/com/micesign/document/DocumentAttachmentServiceTest.java
  modified:
    - backend/src/main/java/com/micesign/controller/DocumentController.java
    - backend/src/test/java/com/micesign/document/DocumentControllerTest.java

key-decisions:
  - "@MockitoBean GoogleDriveService for integration tests -- avoids real Drive API dependency"
  - "@ConditionalOnProperty on Drive bean so tests run without credentials"
  - "ConcurrentHashMap folder ID cache in GoogleDriveService for Drive API call reduction"

patterns-established:
  - "MockitoBean pattern: external services mocked at Spring context level for integration tests"
  - "Retry with exponential backoff: executeWithRetry() wrapping all Drive API calls"
  - "RFC 5987 filename encoding: filename*=UTF-8'' for Korean filenames in Content-Disposition"

requirements-completed: [FILE-01, FILE-02, FILE-03]

# Metrics
duration: 8min
completed: 2026-04-02
---

# Phase 05 Plan 01: Backend File Attachments Summary

**Google Drive file storage backend with multipart upload/download API, validation (50MB/file, 10 files/doc, 200MiB total, blocked extensions), and 19 test cases**

## Performance

- **Duration:** 8 min
- **Started:** 2026-04-02T05:53:45Z
- **Completed:** 2026-04-02T06:02:10Z
- **Tasks:** 2
- **Files modified:** 11

## Accomplishments
- Complete Google Drive integration with retry logic and folder management
- Attachment CRUD REST API (upload multipart, download streaming proxy, delete, list)
- Server-side validation: 50MB per file, 10 files per document, 200MiB total, 10 blocked extensions
- 19 passing test cases (11 integration + 8 unit) with mocked GoogleDriveService

## Task Commits

Each task was committed atomically:

1. **Task 1: Google Drive config, JPA entity, repository, DTOs, mapper, and service layer** - `3f1055b` (feat)
2. **Task 2: Controller endpoints and integration tests** - `e66e69a` (feat)

## Files Created/Modified
- `backend/src/main/java/com/micesign/config/GoogleDriveConfig.java` - Drive client bean with @ConditionalOnProperty
- `backend/src/main/java/com/micesign/domain/DocumentAttachment.java` - JPA entity for document_attachment table
- `backend/src/main/java/com/micesign/repository/DocumentAttachmentRepository.java` - JPA repository with count/sum queries
- `backend/src/main/java/com/micesign/dto/document/AttachmentResponse.java` - DTO record (excludes gdriveFileId per D-10)
- `backend/src/main/java/com/micesign/mapper/DocumentAttachmentMapper.java` - MapStruct mapper
- `backend/src/main/java/com/micesign/service/GoogleDriveService.java` - Drive API wrapper with retry logic
- `backend/src/main/java/com/micesign/service/DocumentAttachmentService.java` - Business logic: validation + Drive + DB orchestration
- `backend/src/main/java/com/micesign/controller/DocumentController.java` - Added attachment endpoints
- `backend/src/test/java/com/micesign/document/AttachmentControllerTest.java` - Integration tests (11 cases)
- `backend/src/test/java/com/micesign/document/DocumentAttachmentServiceTest.java` - Unit tests (8 cases)
- `backend/src/test/java/com/micesign/document/DocumentControllerTest.java` - Updated cleanup for document_attachment FK

## Decisions Made
- @MockitoBean GoogleDriveService for integration tests to avoid real Drive API dependency while still testing full request/response cycle
- @ConditionalOnProperty on GoogleDriveConfig bean so test context loads without credentials
- ConcurrentHashMap folder ID cache in GoogleDriveService to reduce API calls for repeated folder lookups
- RFC 5987 Content-Disposition encoding for Korean filename support in downloads

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed totalSizeExceeded test threshold mismatch**
- **Found during:** Task 2 (integration tests)
- **Issue:** Test used 199MB + 2MB = 201MB, but MAX_TOTAL_SIZE is 200*1024*1024 = 209.7MiB (binary), so test passed validation unexpectedly
- **Fix:** Changed test values to 205MB + 5MB = 210MB which correctly exceeds the 209.7MiB limit
- **Files modified:** backend/src/test/java/com/micesign/document/AttachmentControllerTest.java
- **Verification:** Test correctly expects 400 status with FILE_TOTAL_SIZE_EXCEEDED
- **Committed in:** e66e69a (Task 2 commit)

**2. [Rule 1 - Bug] Fixed DocumentControllerTest FK constraint violation**
- **Found during:** Task 2 (full test suite verification)
- **Issue:** DocumentControllerTest @BeforeEach cleanup didn't delete document_attachment rows, causing FK violation when deleting document rows after AttachmentControllerTest
- **Fix:** Added `DELETE FROM document_attachment` to DocumentControllerTest cleanup
- **Files modified:** backend/src/test/java/com/micesign/document/DocumentControllerTest.java
- **Verification:** Full test suite (104 tests) passes
- **Committed in:** e66e69a (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (2 bugs)
**Impact on plan:** Both fixes necessary for test correctness. No scope creep.

## Issues Encountered
None beyond the auto-fixed deviations above.

## User Setup Required

Google Drive Service Account configuration required before file uploads work in production. See plan frontmatter `user_setup` section:
- Create a Service Account in Google Cloud Console
- Enable Google Drive API
- Download JSON key file
- Set `GOOGLE_DRIVE_CREDENTIALS_PATH` environment variable

## Known Stubs

None - all endpoints are fully wired with Google Drive integration.

## Next Phase Readiness
- Backend attachment API complete, ready for frontend integration (05-02)
- All validation rules enforced server-side
- Google Drive file IDs never exposed in API responses (D-10 verified)

## Self-Check: PASSED

All 9 key files verified present. Both task commits (3f1055b, e66e69a) verified in git log.

---
*Phase: 05-file-attachments*
*Completed: 2026-04-02*

---
phase: 06-document-submission-numbering
verified: 2026-04-02T18:15:00Z
status: human_needed
score: 7/7 must-haves verified
human_verification:
  - test: "Visual submission flow end-to-end"
    expected: "Submit button appears in editor header, clicking opens confirmation dialog with immutability warning, confirm navigates to detail page showing PREFIX-YYYY-NNNN number, list table shows document number column"
    why_human: "UI rendering, dialog interaction, navigation flow, and monospace formatting cannot be verified programmatically"
  - test: "Read-only mode enforcement in editor for non-DRAFT"
    expected: "Submitted document opened at /documents/{id} redirects to detail page (read-only), no save/submit/delete buttons visible"
    why_human: "Routing redirect behavior and button visibility require browser interaction to confirm"
  - test: "Concurrent submission uniqueness"
    expected: "Two simultaneous submissions for same template+year produce GEN-YYYY-0001 and GEN-YYYY-0002 with no duplicates"
    why_human: "Pessimistic lock correctness under real concurrency requires load-testing tools; unit test coverage only covers sequential case"
---

# Phase 06: Document Submission & Numbering Verification Report

**Phase Goal:** Users can submit drafts, triggering immutable locking and document number assignment with race-condition protection
**Verified:** 2026-04-02T18:15:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | POST /api/v1/documents/{id}/submit changes document status from DRAFT to SUBMITTED | VERIFIED | `DocumentController` line 63-67 has `@PostMapping("/{id}/submit")`; `DocumentService.submitDocument()` sets `document.setStatus(DocumentStatus.SUBMITTED)` and saves; test `submitDraft_returns200_withDocNumber` asserts `status=SUBMITTED` and passes |
| 2 | Submit assigns a document number in format PREFIX-YYYY-NNNN | VERIFIED | `generateDocNumber()` in `DocumentService` uses `String.format("%s-%d-%04d", prefix, currentYear, seq.getLastSequence())`; tests assert `GEN-{year}-0001` and `EXP-{year}-0001` patterns |
| 3 | PUT /api/v1/documents/{id} returns 403 for non-DRAFT documents | VERIFIED | `loadAndVerifyOwnerDraft()` throws `BusinessException("DOC_NOT_DRAFT", ..., 403)`; `GlobalExceptionHandler` uses `ex.getHttpStatus()` dynamically; test `updateSubmittedDocument_returns403` passes |
| 4 | DELETE /api/v1/documents/{id} returns 403 for non-DRAFT documents | VERIFIED | Same `loadAndVerifyOwnerDraft()` path used by `deleteDocument()`; test `deleteSubmittedDocument_returns403` passes |
| 5 | POST /api/v1/documents/{docId}/attachments returns 403 for non-DRAFT documents | VERIFIED | `DocumentAttachmentService.validateDocumentForUpload()` line 177-179 throws `BusinessException("DOC_NOT_DRAFT", ..., 403)` |
| 6 | Concurrent submissions for same template+year produce unique sequential numbers | VERIFIED* | `DocSequenceRepository.findByTemplateCodeAndYearForUpdate()` uses `@Lock(LockModeType.PESSIMISTIC_WRITE)`; sequential test `submitDraft_assignsSequentialNumbers` passes. *True concurrency requires human load test |
| 7 | Google Drive files move from drafts folder to permanent folder on submit | VERIFIED | `DocumentService.moveAttachmentsToPermanentFolder()` calls `googleDriveService.moveFile()` with `setAddParents`/`setRemoveParents`; failure is caught and logged (not thrown) |

**Score:** 7/7 truths verified (3 items need human verification for full confidence)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `backend/src/main/java/com/micesign/domain/DocSequence.java` | JPA entity for doc_sequence table | VERIFIED | Contains `@Entity`, `@Table(name = "doc_sequence")`, all fields with correct column names |
| `backend/src/main/java/com/micesign/repository/DocSequenceRepository.java` | Pessimistic lock query for sequence generation | VERIFIED | Contains `@Lock(LockModeType.PESSIMISTIC_WRITE)` and `findByTemplateCodeAndYearForUpdate` |
| `backend/src/test/java/com/micesign/document/DocumentSubmitTest.java` | Integration tests for submit, numbering, and immutability | VERIFIED | 7 `@Test` methods, 208 lines; covers all acceptance behaviors |
| `backend/src/main/java/com/micesign/common/exception/BusinessException.java` | httpStatus field with 3-arg constructor | VERIFIED | `private final int httpStatus`; 2-arg defaults to 400; 3-arg sets value |
| `backend/src/main/java/com/micesign/common/exception/GlobalExceptionHandler.java` | Dynamic httpStatus instead of hardcoded 400 | VERIFIED | `ResponseEntity.status(ex.getHttpStatus())` on line 23 |
| `backend/src/main/java/com/micesign/service/DocumentService.java` | submitDocument, generateDocNumber, moveAttachmentsToPermanentFolder | VERIFIED | All three methods present and fully implemented |
| `backend/src/main/java/com/micesign/controller/DocumentController.java` | POST /{id}/submit endpoint | VERIFIED | `@PostMapping("/{id}/submit")` at line 63 |
| `backend/src/main/java/com/micesign/service/GoogleDriveService.java` | moveFile() with addParents/removeParents | VERIFIED | Method at line 132; uses `setAddParents(newParentId)` and `setRemoveParents(oldParentId)` |
| `backend/src/main/java/com/micesign/service/DocumentAttachmentService.java` | DRAFT status guard on attachment upload | VERIFIED | `validateDocumentForUpload()` line 177-178 guards with 403 |
| `frontend/src/features/document/components/SubmitConfirmDialog.tsx` | Submit confirmation dialog with validation error display | VERIFIED | Props include `validationErrors: string[]`; dual-mode rendering; `Loader2` spinner; `bg-blue-600` confirm button |
| `frontend/src/features/document/api/documentApi.ts` | Submit API call | VERIFIED | `submit: (id: number) => apiClient.post(...)` present at line 29-30 |
| `frontend/src/features/document/hooks/useDocuments.ts` | useSubmitDocument hook | VERIFIED | Exported function at line 58; uses `useMutation` with query invalidation |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|----|--------|---------|
| DocumentController | DocumentService.submitDocument() | POST /{id}/submit | WIRED | `@PostMapping("/{id}/submit")` calls `documentService.submitDocument(user.getUserId(), id)` |
| DocumentService.submitDocument() | DocSequenceRepository | pessimistic lock for numbering | WIRED | `generateDocNumber()` calls `docSequenceRepository.findByTemplateCodeAndYearForUpdate()` |
| DocumentService.submitDocument() | GoogleDriveService.moveFile() | attachment folder relocation | WIRED | `moveAttachmentsToPermanentFolder()` called in `submitDocument()`, internally calls `googleDriveService.moveFile()` |
| DocumentEditorPage | SubmitConfirmDialog | showSubmitConfirm state | WIRED | `useState(false)` controls `<SubmitConfirmDialog open={showSubmitConfirm} ...>` at line 280-285 |
| SubmitConfirmDialog | useSubmitDocument | onConfirm callback | WIRED | `handleSubmitConfirm` calls `submitMutation.mutateAsync(savedDocId)`; passed as `onConfirm` prop |
| documentApi | POST /api/v1/documents/{id}/submit | axios post call | WIRED | `apiClient.post<ApiResponse<DocumentResponse>>(\`${BASE}/${id}/submit\`)` |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| DocumentEditorPage submit | `savedDocId` | `useState(documentId)` / set after create | Real doc ID from DB-backed API | FLOWING |
| SubmitConfirmDialog | `validationErrors` | Frontend validation in `handleSubmitClick` | Real form data from `formDataRef.current` | FLOWING |
| DocumentListTable docNumber column | `doc.docNumber` | `useDocuments` query → `documentApi.getMyDocuments` → backend DB | DB-persisted doc number from `doc_sequence` | FLOWING |
| DocumentDetailPage docNumber | `doc.docNumber` | `useDocumentDetail` query → `documentApi.getDetail` → backend DB | DB-persisted from `document.doc_number` column | FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| DocumentSubmitTest (7 tests) | `./gradlew test --tests "com.micesign.document.DocumentSubmitTest"` | BUILD SUCCESSFUL | PASS |
| Full backend test suite (111 tests) | `./gradlew test` | 111 passed, 0 failures, 0 errors | PASS |
| Frontend TypeScript compilation | `npx tsc --noEmit` | No output (clean) | PASS |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| DOC-03 | 06-01-PLAN, 06-02-PLAN | User can submit a draft, triggering document numbering (format: PREFIX-YYYY-NNNN) | SATISFIED | `submitDocument()` method generates number via `generateDocNumber()`; frontend submit button + hook wire the API call |
| DOC-04 | 06-01-PLAN, 06-02-PLAN | Submitted documents are fully locked (body, attachments, approval line cannot be modified) | SATISFIED | `loadAndVerifyOwnerDraft()` throws 403 for update/delete; `validateDocumentForUpload()` throws 403 for attachment upload; tests `updateSubmittedDocument_returns403` and `deleteSubmittedDocument_returns403` pass |
| DOC-07 | 06-01-PLAN | Document numbering uses per-template, per-year sequences with race condition protection | SATISFIED | `DocSequenceRepository` uses `PESSIMISTIC_WRITE` lock; unique key on `(template_code, year)` in DB schema; `submitDraft_differentTemplates_independentSequences` test verifies per-template independence |

No orphaned requirements found. All three IDs declared in PLAN frontmatter are tracked in REQUIREMENTS.md and verified.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| DocumentEditorPage.tsx | 156 | `catch {}` swallows error details silently; `setErrorMessage(t('submit.error'))` doesn't show in dialog (shows in page banner instead) | Info | Error on submission shows in page banner, dialog closes. Deviates from plan description but not from must-have truths. Functional — user sees error. |

No stub patterns found. No TODO/FIXME/placeholder comments found in any phase-modified files.

### Human Verification Required

#### 1. Visual Submission Flow End-to-End

**Test:** Log in, create a GENERAL document with title and body, save it, click the "제출" button in the editor header
**Expected:** Confirmation dialog appears with message "제출 후에는 문서를 수정하거나 삭제할 수 없습니다. 제출하시겠습니까?"; clicking confirm navigates to detail page; detail page shows GEN-2026-0001 in monospace font; document list table shows "문서번호" column with the number
**Why human:** Dialog rendering, navigation behavior, monospace font visual, and button state changes require browser interaction

#### 2. Read-Only Mode for Submitted Documents

**Test:** After submitting a document, navigate back to its URL `/documents/{id}`
**Expected:** Detail page renders in read-only mode (no save/submit/delete buttons visible); attempting to navigate to `/documents/new/:templateCode` for a new doc still shows action buttons normally
**Why human:** Visual button rendering and routing redirect from detail → no-editor requires browser to confirm

#### 3. Concurrent Submission Uniqueness Under Load

**Test:** Submit two documents for the same template simultaneously (e.g., via two browser tabs or a script with concurrent POST requests)
**Expected:** Both receive unique, sequential document numbers (0001 and 0002 with no collisions)
**Why human:** Pessimistic lock correctness under real DB concurrency cannot be verified by static analysis; requires concurrent HTTP requests to confirm

#### 4. Validation Error Display in Dialog

**Test:** Create a document with empty title or empty EXPENSE form data, click submit button
**Expected:** SubmitConfirmDialog opens showing "제출할 수 없습니다" title and a list of validation error messages in red; confirm button is hidden
**Why human:** Frontend validation logic and conditional dialog rendering require browser interaction

### Gaps Summary

No gaps blocking goal achievement. All automated checks pass:

- Backend: 7/7 submission integration tests pass, full suite 111/111 pass
- Frontend: TypeScript compiles clean, all required files exist and are substantively implemented
- Wiring: All 6 key links verified end-to-end
- Data flow: All dynamic data variables trace to real DB-backed sources
- Requirements: DOC-03, DOC-04, DOC-07 all satisfied with implementation evidence

The only outstanding items are 4 human verification tasks covering UI rendering, browser navigation behavior, and concurrent load testing. These are inherently visual/behavioral and cannot be verified programmatically.

---

_Verified: 2026-04-02T18:15:00Z_
_Verifier: Claude (gsd-verifier)_

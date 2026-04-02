---
phase: 05-file-attachments
verified: 2026-04-02T07:00:00Z
status: passed
score: 12/12 must-haves verified
re_verification: false
gaps: []
human_verification:
  - test: "Upload file via drag-and-drop in document editor form"
    expected: "Progress bar shows per-file upload progress; file appears in list after upload completes"
    why_human: "Upload requires live Google Drive Service Account credentials or a mocked backend running"
  - test: "Download attachment on document detail page"
    expected: "Browser download dialog triggers with correct Korean filename in Content-Disposition"
    why_human: "Blob download and filename decoding require a running browser"
  - test: "Upload a .exe file — should be rejected immediately"
    expected: "Error message '허용되지 않는 파일 형식입니다: .exe' appears below drop zone"
    why_human: "Client-side validation feedback requires visual inspection in a running browser"
---

# Phase 05: File Attachments Verification Report

**Phase Goal:** Users can attach files to documents via Google Drive, download them with access control, and the system enforces upload limits
**Verified:** 2026-04-02T07:00:00Z
**Status:** PASSED
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| #  | Truth | Status | Evidence |
|----|-------|--------|----------|
| 1  | Backend accepts multipart file upload on POST /api/v1/documents/{docId}/attachments and stores metadata in DB | VERIFIED | `DocumentController.java:82-89` — `@PostMapping("/{docId}/attachments")` delegates to `attachmentService.uploadFiles()` which saves `DocumentAttachment` entity via repository |
| 2  | Backend streams file download via GET /api/v1/attachments/{id}/download with correct Content-Disposition | VERIFIED | `DocumentController.java:98-114` — RFC 5987 encoding with `URLEncoder.encode(...).replace("+", "%20")`, sets `filename*=UTF-8''` header, streams `InputStreamResource` from Drive |
| 3  | Backend rejects files exceeding 50MB, blocked extensions, count >10, total >200MB | VERIFIED | `DocumentAttachmentService.java:26-31` — `MAX_FILE_SIZE`, `MAX_FILES_PER_DOCUMENT`, `MAX_TOTAL_SIZE`, `BLOCKED_EXTENSIONS` constants; `validateFile()` at line 154 enforces all rules |
| 4  | Backend deletes attachment metadata from DB and file from Drive via DELETE /api/v1/attachments/{id} | VERIFIED | `DocumentController.java:116-122`, `DocumentAttachmentService.java:125-144` — deletes from Drive then DB; requires DRAFT status (D-09) |
| 5  | Google Drive file IDs are never exposed in API responses | VERIFIED | `AttachmentResponse.java` — record contains `id, documentId, originalName, fileSize, mimeType, createdAt` only; no `gdriveFileId` field |
| 6  | FileDropZone accepts files via drag-and-drop and click-to-browse | VERIFIED | `FileDropZone.tsx:68-90` — `onDragOver`, `onDragLeave`, `onDrop` handlers; hidden `<input type="file" multiple>`; `role="button"`, `tabIndex={0}`, `onKeyDown` |
| 7  | Individual progress bars display per file during upload | VERIFIED | `FileItem.tsx:61-69` — progress bar with `transition-all duration-300`, `style={{ width: \`${uploadItem.progress}%\` }}`; `useFileUpload.ts` tracks `progress: 0-100` per item |
| 8  | Invalid files are rejected at selection time with error message | VERIFIED | `useFileUpload.ts:64` — calls `validateFile()` before queuing; `FileAttachmentArea.tsx:91` — `aria-live="assertive"` error display |
| 9  | Usage status line always visible showing count and size | VERIFIED | `FileAttachmentArea.tsx:134-159` — renders `t('attachment.status.editor', { count, size })` in editor mode; red text when at limit |
| 10 | X button deletes without confirmation in draft mode | VERIFIED | `FileAttachmentArea.tsx:119` — `onDelete={!readOnly ? handleDelete : undefined}`; calls `deleteAttachment.mutate(id)` directly, no confirm dialog |
| 11 | Download button triggers backend proxy download | VERIFIED | `FileAttachmentArea.tsx` download handler calls `attachmentApi.download(id)` (blob GET), creates temporary `<a>` with `URL.createObjectURL(blob)` |
| 12 | All three template forms and DocumentDetailPage integrated with FileAttachmentArea | VERIFIED | `GeneralForm.tsx:6,89`, `ExpenseForm.tsx:7,216`, `LeaveForm.tsx:7,252`, `DocumentDetailPage.tsx:6,121-124` — all import and render `FileAttachmentArea`; no `placeholder.attachments` text remains |

**Score:** 12/12 truths verified

---

## Required Artifacts

### Plan 01 (Backend)

| Artifact | Status | Details |
|----------|--------|---------|
| `backend/src/main/java/com/micesign/service/GoogleDriveService.java` | VERIFIED | 219 lines; `uploadFile`, `downloadFile`, `deleteFile`, `findOrCreateFolder`, `executeWithRetry` all present and implemented |
| `backend/src/main/java/com/micesign/service/DocumentAttachmentService.java` | VERIFIED | 204 lines; `uploadFiles`, `downloadFile`, `deleteAttachment`, `getAttachmentsByDocumentId`, `getAttachmentMetadata` all present |
| `backend/src/main/java/com/micesign/controller/DocumentController.java` | VERIFIED | 123 lines; all four attachment endpoints present and wired |
| `backend/src/main/java/com/micesign/domain/DocumentAttachment.java` | VERIFIED | 116 lines; `@Entity`, `@Table(name = "document_attachment")`, all required fields |
| `backend/src/main/java/com/micesign/dto/document/AttachmentResponse.java` | VERIFIED | `gdriveFileId` absent (D-10 enforced) |
| `backend/src/main/java/com/micesign/config/GoogleDriveConfig.java` | VERIFIED | Returns `null` Drive bean when no credentials (allows tests to run without credentials file) — note: uses null-return pattern instead of `@ConditionalOnProperty`; functionally equivalent |
| `backend/src/test/java/com/micesign/document/AttachmentControllerTest.java` | VERIFIED | 269 lines; 11 integration test methods; `@MockitoBean` for GoogleDriveService |
| `backend/src/test/java/com/micesign/document/DocumentAttachmentServiceTest.java` | VERIFIED | 208 lines; 8 unit test methods covering validation edge cases |

### Plan 02 (Frontend Components)

| Artifact | Status | Details |
|----------|--------|---------|
| `frontend/src/features/document/api/attachmentApi.ts` | VERIFIED | 50 lines; `upload` (with `onUploadProgress`), `getByDocumentId`, `download` (blob + `content-disposition` parsing), `delete` |
| `frontend/src/features/document/hooks/useAttachments.ts` | VERIFIED | `useAttachments` (queryKey `['attachments', documentId]`), `useDeleteAttachment` with cache invalidation |
| `frontend/src/features/document/components/attachment/FileDropZone.tsx` | VERIFIED | 114 lines; drag-and-drop, click-to-browse, keyboard accessible, `role="button"`, `aria-label` |
| `frontend/src/features/document/components/attachment/FileItem.tsx` | VERIFIED | 136 lines; `getFileIcon`, `formatFileSize`, `role="listitem"`, progress bar, delete button `aria-label` via i18n |
| `frontend/src/features/document/components/attachment/FileAttachmentArea.tsx` | VERIFIED | 172 lines; `useAttachments`, `useFileUpload`, `useDeleteAttachment`, usage status line, `aria-live="assertive"` |
| `frontend/src/features/document/components/attachment/useFileUpload.ts` | VERIFIED | 187 lines; `validateFile` import, `AbortController`, sequential upload queue, auto-cleanup after 2s |
| `frontend/src/features/document/components/attachment/fileValidation.ts` | VERIFIED | `BLOCKED_EXTENSIONS` (10 entries), `MAX_FILE_SIZE = 50*1024*1024`, `MAX_FILES = 10`, `MAX_TOTAL_SIZE = 200*1024*1024`, `validateFile`, `formatFileSize` |
| `frontend/src/features/document/components/attachment/fileIcons.ts` | VERIFIED | `getFileIcon` with icon mappings for 21 file extensions |

### Plan 03 (Integration)

| Artifact | Status | Details |
|----------|--------|---------|
| `frontend/src/features/document/components/templates/GeneralForm.tsx` | VERIFIED | Imports and renders `FileAttachmentArea`; no `placeholder.attachments` |
| `frontend/src/features/document/components/templates/ExpenseForm.tsx` | VERIFIED | Imports and renders `FileAttachmentArea`; no `placeholder.attachments` |
| `frontend/src/features/document/components/templates/LeaveForm.tsx` | VERIFIED | Imports and renders `FileAttachmentArea`; no `placeholder.attachments` |
| `frontend/src/features/document/pages/DocumentDetailPage.tsx` | VERIFIED | Imports and renders `FileAttachmentArea` with `readOnly={true}` |

---

## Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `DocumentController` | `DocumentAttachmentService` | Constructor injection | WIRED | `DocumentController.java:31` — `private final DocumentAttachmentService attachmentService` |
| `DocumentAttachmentService` | `GoogleDriveService` | Constructor injection | WIRED | `DocumentAttachmentService.java:34` — `private final GoogleDriveService googleDriveService` |
| `DocumentAttachmentService` | `DocumentAttachmentRepository` | Constructor injection | WIRED | `DocumentAttachmentService.java:33` — `private final DocumentAttachmentRepository attachmentRepository` |
| `FileAttachmentArea` | `useFileUpload` | Hook invocation | WIRED | `FileAttachmentArea.tsx:5,26` — imports and invokes `useFileUpload` |
| `useFileUpload` | `attachmentApi.upload` | Axios POST with onUploadProgress | WIRED | `useFileUpload.ts:3,114+` — `attachmentApi.upload(...)` called with progress callback; `AbortController` per upload |
| `FileItem download` | `attachmentApi.download` | Axios GET with blob response | WIRED | `FileAttachmentArea.tsx` `handleDownload` calls `attachmentApi.download(id)`; blob → `URL.createObjectURL` → temporary `<a>` click |
| `GeneralForm` | `FileAttachmentArea` | Import and render | WIRED | `GeneralForm.tsx:6` — import present; `GeneralForm.tsx:89` — rendered in JSX |
| `DocumentDetailPage` | `FileAttachmentArea` (readOnly) | Import and render with `readOnly=true` | WIRED | `DocumentDetailPage.tsx:6` — import present; `:121-124` — `<FileAttachmentArea ... readOnly={true}>` |

---

## Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|-------------------|--------|
| `FileAttachmentArea.tsx` | `existingAttachments` | `useAttachments(documentId)` → `attachmentApi.getByDocumentId()` → GET `/documents/{id}/attachments` → `DocumentAttachmentService.getAttachmentsByDocumentId()` → `attachmentRepository.findByDocumentId()` (DB query) | Yes — JPA query against `document_attachment` table | FLOWING |
| `FileItem.tsx` | `uploadItem.progress` | `useFileUpload` state, updated via `attachmentApi.upload` `onUploadProgress` callback from Axios | Yes — real XHR progress events from multipart upload | FLOWING |
| `DocumentController.downloadAttachment` | `InputStreamResource` | `GoogleDriveService.downloadFile(gdriveFileId)` → Drive API `executeMediaAsInputStream()` | Yes — streams from Google Drive (guarded by `ensureDriveConfigured()`) | FLOWING |

---

## Behavioral Spot-Checks

Step 7b: SKIPPED — upload/download require a running backend with Google Drive credentials or mocked test server. Backend test suite covers these behaviors via integration tests with `@MockitoBean GoogleDriveService`.

**Backend test suite coverage (from SUMMARY):** 19 passing test cases (11 integration in `AttachmentControllerTest`, 8 unit in `DocumentAttachmentServiceTest`). Commits verified: `3f1055b`, `e66e69a`, `bbf7309`, `59074cd`, `9f60085`.

**TypeScript compilation:** Zero errors (confirmed via `npx tsc --noEmit`).

---

## Requirements Coverage

| Requirement | Source Plans | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| FILE-01 | 05-01, 05-02, 05-03 | User can upload files to Google Drive via Service Account when attaching to a document | SATISFIED | `GoogleDriveService.uploadFile()` wraps Drive API v3 with Service Account credentials; `DocumentAttachmentService.uploadFiles()` orchestrates validation + upload + DB save; frontend `attachmentApi.upload()` sends multipart POST |
| FILE-02 | 05-01, 05-02, 05-03 | User can download attachments with access control verification (only authorized viewers) | SATISFIED (partial — Phase 7 extends) | `DocumentAttachmentService.validateDocumentAccess()` restricts download to document drafter. Access for approval line members deferred to Phase 7 per explicit plan comment at line 184. Core access control is functional; scope extension is documented. |
| FILE-03 | 05-01, 05-02, 05-03 | System validates file uploads: max 50MB per file, max 10 files per document, max 200MB total, allowed/blocked extensions enforced | SATISFIED | Backend: `MAX_FILE_SIZE=50MB`, `MAX_FILES_PER_DOCUMENT=10`, `MAX_TOTAL_SIZE=200MB`, `BLOCKED_EXTENSIONS={exe,bat,sh,cmd,msi,ps1,vbs,js,jar,com}`; Frontend: `fileValidation.ts` mirrors same constants; validated at selection time (D-04) and server-side |

**Orphaned requirements check:** No additional FILE-* requirements found in REQUIREMENTS.md beyond FILE-01, FILE-02, FILE-03. All phase 05 requirements accounted for.

---

## Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `GoogleDriveService.java` | 138 | `return null` inside `deleteFile` retry lambda | Info | Intentional: `void` return adapted to `RetryableAction<T>`; null is discarded and never exposed to callers |
| `DocumentAttachmentService.java` | 184 | Comment: "Approval line access will be added in Phase 7" | Info | Documented deferral; drafter-only access is intentional for Phase 5 scope. Not a blocker. |

No blocker or warning anti-patterns found. Both items are intentional and documented.

---

## Human Verification Required

### 1. Drag-and-Drop Upload Flow

**Test:** In a running browser, open a document editor page (create a new document in DRAFT status). Drag a PDF file onto the drop zone.
**Expected:** Drop zone highlights blue on drag-over; progress bar appears per file; file appears in list after upload (or "파일 저장소가 설정되지 않았습니다" error if Drive not configured); usage status updates.
**Why human:** Live drag events and XHR progress callbacks require a browser with a running dev server.

### 2. Korean Filename Download

**Test:** Upload a file with a Korean filename (e.g., `테스트문서.pdf`). Navigate to the document detail page. Click the download button.
**Expected:** Browser downloads a file named `테스트문서.pdf` (not garbled).
**Why human:** RFC 5987 `filename*=UTF-8''` decoding requires a real browser download to verify visually.

### 3. Blocked Extension Client-Side Rejection

**Test:** In document editor, click "파일 찾기" and select a `.exe` file.
**Expected:** Error message `"허용되지 않는 파일 형식입니다: .exe"` appears below the drop zone immediately, without any network request.
**Why human:** Client-side validation feedback is visual and requires a running frontend.

---

## Gaps Summary

No gaps found. All 12 observable truths are verified. All artifacts exist, are substantive, and are wired. All three requirement IDs (FILE-01, FILE-02, FILE-03) are satisfied. The one notable scoping decision — download access restricted to drafter only in Phase 5 — is an explicitly documented deferral to Phase 7 (approval line access), not an oversight.

The only pending items are the three human verification tests above, which require a running browser and cannot be verified programmatically.

---

_Verified: 2026-04-02T07:00:00Z_
_Verifier: Claude (gsd-verifier)_

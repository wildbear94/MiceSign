---
phase: 05-file-attachments
verified: 2026-04-08T09:15:00Z
status: human_needed
score: 12/12 must-haves verified
overrides_applied: 0
re_verification:
  previous_status: gaps_found
  previous_score: 11/12
  gaps_closed:
    - "Google Drive file IDs are never exposed in API responses"
  gaps_remaining: []
  regressions: []
human_verification:
  - test: "Upload a file via drag-and-drop in a document editor form"
    expected: "File uploads to Google Drive, progress bar shows, file appears in the attachment list"
    why_human: "Requires Google Drive Service Account credentials and running server to test real upload flow"
  - test: "Download an attachment from the document detail page"
    expected: "Browser downloads the file with correct Korean filename"
    why_human: "Requires running server with files already uploaded to Drive"
  - test: "Verify drag-and-drop visual feedback (blue border on drag-over)"
    expected: "Drop zone border turns blue when dragging files over it"
    why_human: "Visual behavior cannot be verified programmatically"
  - test: "Try uploading a .exe file in the frontend"
    expected: "Immediate rejection with Korean error message before any server call"
    why_human: "Requires browser interaction to verify client-side validation UX"
---

# Phase 5: File Attachments Verification Report

**Phase Goal:** Users can attach files to documents via Google Drive, download them with access control, and the system enforces upload limits
**Verified:** 2026-04-08T09:15:00Z
**Status:** human_needed
**Re-verification:** Yes -- after gap closure (Plan 05-04)

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | User can upload files that are stored in Google Drive via Service Account | VERIFIED | GoogleDriveService.uploadFile() with retry logic (233 lines); DocumentAttachmentService.uploadFiles() orchestrates validation+Drive+DB; POST /{id}/attachments endpoint in DocumentController |
| 2 | User can download attachments only if they are an authorized viewer | VERIFIED | DocumentAttachmentService.downloadAttachment() checks drafter/approver/admin/superadmin; GET /attachments/{id}/download with Content-Disposition and RFC 5987 encoding |
| 3 | System rejects uploads exceeding 50MB/file, 10 files/doc, 200MB total, blocks extensions | VERIFIED | Backend: MAX_FILE_SIZE=50MB, MAX_FILES_PER_DOCUMENT=10, MAX_TOTAL_SIZE=200MB, BLOCKED_EXTENSIONS (10 entries); Frontend: matching constants in fileValidation.ts |
| 4 | Backend accepts multipart file upload on POST /documents/{id}/attachments | VERIFIED | @PostMapping("/{id}/attachments") in DocumentController line 148; returns 201 with AttachmentResponse list |
| 5 | Backend streams file download via GET /attachments/{id}/download with Content-Disposition | VERIFIED | Lines 165-183 of DocumentController; URLEncoder for Korean filenames; correct MIME type and content-length |
| 6 | Backend deletes attachment via DELETE /attachments/{id} | VERIFIED | @DeleteMapping line 185; service verifies DRAFT status before delete; correct parameter order (attachmentId, userId) |
| 7 | Google Drive file IDs are never exposed in API responses | VERIFIED | AttachmentResponse record has 6 fields (id, documentId, originalName, fileSize, mimeType, createdAt) -- gdriveFileId is NOT present. No gdriveFileId found anywhere in dto package. |
| 8 | FileDropZone accepts files via drag-and-drop and click-to-browse | VERIFIED | onDragOver, onDragLeave, onDrop handlers present; input type="file" multiple; 114 lines |
| 9 | Individual progress bars display per file during upload | VERIFIED | useFileUpload.ts uses AbortController, onUploadProgress callback; FileItem.tsx renders progress bar with transition-all |
| 10 | Template forms show FileAttachmentArea replacing placeholder | VERIFIED | GeneralForm, ExpenseForm, LeaveForm all import and render FileAttachmentArea; no placeholder.attachments text remains |
| 11 | DocumentDetailPage shows read-only FileAttachmentArea | VERIFIED | Import on line 7, render with readOnly={true} on line 124 |
| 12 | Usage status line always visible showing count and size | VERIFIED | FileAttachmentArea.tsx (172 lines) uses useAttachments, useFileUpload, useDeleteAttachment hooks |

**Score:** 12/12 truths verified

### Gap Closure Verification (Plan 05-04)

| Issue | Status | Evidence |
|-------|--------|----------|
| gdriveFileId in AttachmentResponse (D-10 violation) | FIXED | Field removed from record -- only 6 fields remain, no gdriveFileId |
| Audit log JSON injection (CR-01) | FIXED | objectMapper.writeValueAsString() used via toJson() helper at line 351 |
| deleteAttachment parameter swap (WR-01) | FIXED | Controller calls deleteAttachment(attachmentId, user.getUserId()) -- correct order |
| FileInputStream resource leak (WR-02) | FIXED | try-with-resources at GoogleDriveConfig.java line 55 |
| Null filename validation (WR-03) | FIXED | FILE_NAME_INVALID check at line 284-285 of DocumentAttachmentService |
| readOnly prop not passed through (WR-04) | FIXED | All three forms use readOnly={readOnly} on FileAttachmentArea |

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `backend/.../GoogleDriveService.java` | Drive API wrapper | VERIFIED | 233 lines; uploadFile, downloadFile, deleteFile, findOrCreateFolder, executeWithRetry |
| `backend/.../DocumentAttachmentService.java` | Business logic | VERIFIED | 367 lines; validation constants, CRUD methods, Jackson toJson helper |
| `backend/.../DocumentController.java` | REST endpoints | VERIFIED | 192 lines; POST/GET/DELETE attachment endpoints |
| `backend/.../DocumentAttachment.java` | JPA entity | VERIFIED | @Entity with all required fields |
| `backend/.../AttachmentResponse.java` | Public DTO | VERIFIED | 12 lines; 6 fields, no gdriveFileId |
| `backend/.../DocumentAttachmentMapper.java` | MapStruct mapper | VERIFIED | toResponse and toResponseList methods |
| `backend/.../DocumentAttachmentRepository.java` | JPA repository | VERIFIED | findByDocumentId, countByDocumentId, sumFileSizeByDocumentId |
| `backend/.../GoogleDriveConfig.java` | Drive config | VERIFIED | 88 lines; try-with-resources, ADC fallback |
| `frontend/.../attachmentApi.ts` | API client | VERIFIED | 51 lines; upload with progress, blob download, Content-Disposition parsing |
| `frontend/.../FileDropZone.tsx` | Drag-drop zone | VERIFIED | 114 lines; onDragOver/Leave/Drop, input file, keyboard accessible |
| `frontend/.../FileItem.tsx` | File display | VERIFIED | 136 lines; progress bar, error state, download/delete actions |
| `frontend/.../FileAttachmentArea.tsx` | Container component | VERIFIED | 172 lines; editor + readOnly modes, usage status |
| `frontend/.../useFileUpload.ts` | Upload hook | VERIFIED | 178 lines; AbortController, sequential upload, validation |
| `frontend/.../fileValidation.ts` | Validation utils | VERIFIED | 30 lines; BLOCKED_EXTENSIONS, MAX_FILE_SIZE, MAX_FILES, MAX_TOTAL_SIZE |
| `frontend/.../useAttachments.ts` | TanStack Query hooks | VERIFIED | 20 lines; useAttachments, useDeleteAttachment with cache invalidation |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| DocumentController | DocumentAttachmentService | constructor injection | WIRED | `private final DocumentAttachmentService` at line 34 |
| DocumentAttachmentService | GoogleDriveService | constructor injection | WIRED | `private final GoogleDriveService` at line 51 |
| DocumentAttachmentService | DocumentAttachmentRepository | constructor injection | WIRED | `private final DocumentAttachmentRepository` at line 50 |
| FileAttachmentArea | useFileUpload | hook invocation | WIRED | useFileUpload imported and called |
| useFileUpload | attachmentApi.upload | Axios POST with onUploadProgress | WIRED | uploadAttachment call in useFileUpload.ts |
| FileItem download | attachmentApi.download | Axios GET with blob | WIRED | downloadAttachment in attachmentApi.ts |
| GeneralForm | FileAttachmentArea | import and render | WIRED | import line 6, render line 89 |
| ExpenseForm | FileAttachmentArea | import and render | WIRED | import line 7, render line 216 |
| LeaveForm | FileAttachmentArea | import and render | WIRED | import line 7, render line 252 |
| DocumentDetailPage | FileAttachmentArea | import with readOnly=true | WIRED | import line 7, readOnly={true} line 124 |
| DocumentController.deleteAttachment | DocumentAttachmentService.deleteAttachment | method call | WIRED | deleteAttachment(attachmentId, user.getUserId()) -- correct parameter order |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| FileAttachmentArea | existingAttachments | useAttachments -> attachmentApi.getByDocumentId -> backend API | Yes (DB query via repository) | FLOWING |
| FileItem | uploadItem.progress | useFileUpload -> attachmentApi.upload onUploadProgress | Yes (real Axios progress events) | FLOWING |

### Behavioral Spot-Checks

Step 7b: SKIPPED (requires running server with Google Drive credentials for meaningful checks)

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| FILE-01 | 05-01, 05-02, 05-03 | User can upload files to Google Drive via Service Account | SATISFIED | GoogleDriveService.uploadFile + DocumentAttachmentService.uploadFiles + FileAttachmentArea UI |
| FILE-02 | 05-01, 05-02, 05-03 | User can download attachments with access control | SATISFIED | downloadAttachment with role/ownership check + Content-Disposition + blob download |
| FILE-03 | 05-01, 05-02, 05-03 | System validates uploads: 50MB/file, 10 files/doc, 200MB total, blocked extensions | SATISFIED | Both backend (DocumentAttachmentService) and frontend (fileValidation.ts) enforce limits |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| None found | - | - | - | - |

No TODOs, FIXMEs, placeholders, or stub patterns found in phase artifacts.

### Human Verification Required

### 1. File Upload via Drag-and-Drop

**Test:** Start backend and frontend, navigate to document editor, drag a file onto the drop zone
**Expected:** File uploads to Google Drive, progress bar shows, file appears in attachment list
**Why human:** Requires Google Drive Service Account credentials and running server

### 2. File Download from Detail Page

**Test:** Navigate to document detail page with attachments, click download button
**Expected:** Browser downloads file with correct Korean filename
**Why human:** Requires running server with files already in Drive

### 3. Drag-and-Drop Visual Feedback

**Test:** Drag a file over the drop zone without dropping
**Expected:** Drop zone border turns blue (border-blue-500 bg-blue-50)
**Why human:** Visual behavior cannot be verified programmatically

### 4. Client-Side Validation UX

**Test:** Try selecting a .exe file in the file picker
**Expected:** Immediate rejection with error message, no server call made
**Why human:** Requires browser interaction

### Gaps Summary

No gaps remain. The previous verification gap (gdriveFileId exposed in API responses) has been fully resolved by Plan 05-04. All 6 code review findings (CR-01, WR-01 through WR-04, D-10) are verified fixed. All 12 must-have truths pass. Human verification is needed for visual and integration behaviors that require a running server with Google Drive credentials.

---

_Verified: 2026-04-08T09:15:00Z_
_Verifier: Claude (gsd-verifier)_

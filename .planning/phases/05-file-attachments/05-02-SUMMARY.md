---
phase: 05-file-attachments
plan: 02
subsystem: frontend-attachment-ui
tags: [frontend, components, attachment, drag-drop, upload, i18n]
dependency_graph:
  requires: [05-01]
  provides: [FileAttachmentArea, attachmentApi, useAttachments, useFileUpload]
  affects: [document-editor, document-detail]
tech_stack:
  added: []
  patterns: [useFileUpload-hook, sequential-upload-queue, AbortController-cancellation, drag-drop-zone]
key_files:
  created:
    - frontend/src/features/document/api/attachmentApi.ts
    - frontend/src/features/document/hooks/useAttachments.ts
    - frontend/src/features/document/components/attachment/FileDropZone.tsx
    - frontend/src/features/document/components/attachment/FileItem.tsx
    - frontend/src/features/document/components/attachment/useFileUpload.ts
    - frontend/src/features/document/components/attachment/FileAttachmentArea.tsx
    - frontend/src/features/document/components/attachment/fileValidation.ts
    - frontend/src/features/document/components/attachment/fileIcons.ts
  modified:
    - frontend/src/features/document/types/document.ts
    - frontend/public/locales/ko/document.json
    - frontend/public/locales/en/document.json
decisions:
  - Sequential upload queue (one file at a time) for predictable progress tracking
  - AbortController per upload for cancellation support
  - 2-second auto-clear for completed upload items (refetched as server attachments)
  - 5-second auto-clear for validation error messages
  - i18n-based aria-labels instead of hardcoded Korean strings in components
metrics:
  duration: 1min
  completed: 2026-04-10
  tasks_completed: 2
  tasks_total: 2
  files_created: 8
  files_modified: 3
---

# Phase 05 Plan 02: Frontend Attachment Components Summary

Complete frontend attachment UI with drag-and-drop FileDropZone, progress-tracking FileItem, sequential upload hook, and FileAttachmentArea container with usage status line.

## What Was Built

### Task 1: TypeScript Types, API Client, Hooks, Validation, Icons, and i18n

**Types (document.ts):**
- `AttachmentResponse` interface matching backend DTO
- `UploadStatus` union type: pending | uploading | complete | error
- `FileUploadItem` interface with client-side upload tracking

**API Client (attachmentApi.ts):**
- `upload()`: multipart/form-data POST with `onUploadProgress` callback and AbortSignal support
- `getByDocumentId()`: GET attachments list
- `download()`: GET with `responseType: 'blob'`, Content-Disposition filename extraction (RFC 5987)
- `delete()`: DELETE attachment by ID

**Hooks (useAttachments.ts):**
- `useAttachments(documentId)`: TanStack Query for fetching attachment list
- `useDeleteAttachment(documentId)`: Mutation with cache invalidation

**Validation (fileValidation.ts):**
- BLOCKED_EXTENSIONS: 10 executable extensions blocked
- MAX_FILE_SIZE: 50MB, MAX_FILES: 10, MAX_TOTAL_SIZE: 200MB
- `validateFile()`: checks extension, size, count, total size
- `formatFileSize()`: human-readable file size formatting

**Icons (fileIcons.ts):**
- Lucide icon mapping for 21 file extensions across 6 categories
- Default fallback icon for unknown types

**i18n:**
- Korean and English strings for dropZone, status, action, error keys

### Task 2: UI Components

**FileDropZone.tsx:**
- Drag-and-drop with visual feedback (blue border on drag-over)
- Click-to-browse with hidden file input
- Keyboard accessible: tabIndex={0}, Enter/Space to open file picker
- ARIA: role="button" with descriptive aria-label
- Disabled state when file limit reached

**FileItem.tsx:**
- File type icon via getFileIcon()
- Filename (truncated) + formatted file size
- Upload progress bar with transition animation
- Status icons: Check (complete), AlertCircle (error)
- Delete button (editor mode, no confirmation per D-09)
- Download button with loading spinner (read-only mode)
- ARIA: role="listitem", aria-live="polite" on progress

**useFileUpload.ts:**
- Sequential upload queue processing via useEffect
- Per-file AbortController for cancellation
- Validation at file selection time (rejects invalid files with error message)
- Auto-clear completed items after 2 seconds
- Auto-clear validation errors after 5 seconds
- Cumulative count/size tracking across existing + pending uploads

**FileAttachmentArea.tsx:**
- Container component composing all attachment sub-components
- Editor mode: FileDropZone + file list + usage status line
- Read-only mode: file list with download buttons + simplified status
- Empty state message when no attachments
- Usage status with red highlight when at file/size limits
- Download handler: blob URL + temporary anchor element + URL revocation
- Error display with aria-live="assertive" for screen readers

## Deviations from Plan

None - all files were already implemented as specified in Plan 05-01's broader scope. This plan verified and re-committed the work with proper plan-scoped commit messages.

## Verification

- TypeScript compilation: zero errors
- All acceptance criteria checked and passing
- All ARIA attributes and keyboard handlers present
- All i18n strings used (no hardcoded Korean in components)

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| 1 | bddb6d6 | Types, API client, hooks, validation, icons, i18n |
| 2 | ba4c251 | FileDropZone, FileItem, useFileUpload, FileAttachmentArea |

## Self-Check: PASSED

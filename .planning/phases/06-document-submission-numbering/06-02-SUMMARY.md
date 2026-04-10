---
phase: "06"
plan: "02"
subsystem: frontend-document-submission
tags: [submit, doc-number, i18n, confirm-dialog, mutation-hook]
dependency_graph:
  requires:
    - phase: 06-01
      provides: submit API endpoint, doc numbering backend
  provides:
    - submit API client function
    - useSubmitDocument mutation hook
    - submit button + confirm dialog in editor
    - success message banner in detail page
    - docNumber column in document list
    - upload state callback for FileAttachmentArea
  affects: [phase-07-approval-workflow]
tech_stack:
  added: []
  patterns: [navigate-with-state-for-success-message, upload-state-callback-pattern]
key_files:
  created: []
  modified:
    - frontend/src/features/document/api/documentApi.ts
    - frontend/src/features/document/hooks/useDocuments.ts
    - frontend/src/features/document/components/attachment/FileAttachmentArea.tsx
    - frontend/src/features/document/pages/DocumentEditorPage.tsx
    - frontend/src/features/document/pages/DocumentDetailPage.tsx
    - frontend/src/features/document/components/DocumentListTable.tsx
    - frontend/src/features/admin/components/ConfirmDialog.tsx
    - frontend/public/locales/ko/document.json
    - frontend/public/locales/en/document.json
key_decisions:
  - "Added FileAttachmentArea to editor page with onUploadStateChange prop for upload state tracking"
  - "ConfirmDialog cancelLabel prop added as optional with default '닫기' to maintain backward compatibility"
  - "DocNumber column placed between title and template columns in list table"
metrics:
  duration: 4min
  completed: "2026-04-09"
  tasks: 2
  files: 9
requirements:
  - DOC-03
  - DOC-04
  - DOC-07
---

# Phase 06 Plan 02: Frontend Document Submit Flow Summary

Submit button, confirm dialog, upload state guards, success banner with docNumber, and list table docNumber column -- full frontend submit flow from editor to detail page redirect

## What Was Done

### Task 1: Submit API, Hook, FileAttachmentArea Upload State Callback, i18n Keys
- Added `submit` method to `documentApi` calling `POST /documents/{id}/submit`
- Added `useSubmitDocument` mutation hook with cache invalidation for documents queries
- Added `onUploadStateChange` optional callback prop to `FileAttachmentArea` component
- Added `useEffect` in FileAttachmentArea to report `isUploading` and `hasError` states from uploadItems
- Added i18n keys (ko/en): submit button text, submitConfirm dialog (title, message, confirm, cancel), submitSuccess message with docNumber interpolation, error messages (submitFailed, alreadySubmitted, uploadInProgress, uploadFailed), columns.docNumber

### Task 2: DocumentEditorPage Submit Flow + DetailPage Success Banner + List DocNumber Column
- Reorganized editor action bar: [Delete(gray outline)] [Save(gray outline)] [Submit(blue primary)]
- Added submit confirm dialog using existing ConfirmDialog with `confirmVariant="primary"` and custom `cancelLabel`
- Added `cancelLabel` optional prop to ConfirmDialog component (defaults to '닫기')
- Implemented `handleSubmitClick`: checks upload errors (D-14), upload in progress (D-13), form validation (D-06), then shows confirm dialog (D-09)
- Implemented `handleSubmitConfirm`: auto-saves first (D-12), calls submit API (D-05), redirects to detail page with success state (D-17, D-18), handles 409 conflict (D-11)
- Added loading overlay on form container during submit (opacity-50, pointer-events-none) with aria-busy
- Added FileAttachmentArea to editor page with onUploadStateChange callback
- Added success message banner in DocumentDetailPage with green styling, CheckCircle icon, dismiss button, and 5-second auto-dismiss (D-18, D-19)
- Added docNumber display inline next to title in detail page with font-mono styling (D-20)
- Added docNumber column to DocumentListTable between title and template columns (D-21)
- Updated empty state colSpan from 4 to 5

### Task 3: Checkpoint (human-verify)
- Awaiting manual E2E verification of submit flow

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing functionality] FileAttachmentArea not rendered in editor page**
- **Found during:** Task 2
- **Issue:** The editor page did not render FileAttachmentArea at all, so the onUploadStateChange callback had nowhere to connect
- **Fix:** Added FileAttachmentArea render in DocumentEditorPage (conditionally when savedDocId exists) with onUploadStateChange prop
- **Files modified:** frontend/src/features/document/pages/DocumentEditorPage.tsx
- **Commit:** 823b6e5

## Known Stubs

None -- all data flows are wired to real API endpoints.

## Self-Check: PENDING

Awaiting checkpoint verification (Task 3) before final self-check.

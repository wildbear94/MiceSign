---
phase: 05-file-attachments
plan: 03
subsystem: frontend
tags: [attachment, integration, template-forms, detail-page]
dependency_graph:
  requires: [05-01, 05-02]
  provides: [complete-attachment-ui]
  affects: [GeneralForm, ExpenseForm, LeaveForm, DocumentDetailPage]
tech_stack:
  patterns: [conditional-render-by-documentId, read-only-attachment-mode]
key_files:
  modified:
    - frontend/src/features/document/components/templates/GeneralForm.tsx
    - frontend/src/features/document/components/templates/ExpenseForm.tsx
    - frontend/src/features/document/components/templates/LeaveForm.tsx
    - frontend/src/features/document/pages/DocumentDetailPage.tsx
decisions:
  - Show "save first" message when documentId is null instead of empty attachment area
metrics:
  duration: 2min
  completed: "2026-04-08T07:57:00Z"
  tasks_completed: 1
  tasks_total: 2
  files_modified: 4
---

# Phase 05 Plan 03: Template Form Attachment Integration Summary

Integrated FileAttachmentArea component into all three template forms (GeneralForm, ExpenseForm, LeaveForm) replacing placeholder divs, and added read-only attachment display to DocumentDetailPage.

## What Was Done

### Task 1: Replace attachment placeholders in all template forms and detail page (d8f672d)

**Template Forms (GeneralForm, ExpenseForm, LeaveForm):**
- Added `import FileAttachmentArea from '../attachment/FileAttachmentArea'`
- Destructured `documentId` from `TemplateEditProps` (already defined in interface)
- Replaced `placeholder.attachments` div with conditional render:
  - When `documentId` exists: renders `<FileAttachmentArea>` with `documentStatus="DRAFT"` and `readOnly={false}`
  - When `documentId` is null (unsaved new doc): shows Korean message "문서를 저장한 후 파일을 첨부할 수 있습니다."

**DocumentDetailPage:**
- Added `import FileAttachmentArea from '../components/attachment/FileAttachmentArea'`
- Replaced `placeholder.attachments` div with `<FileAttachmentArea documentId={doc.id} documentStatus={doc.status} readOnly={true} />`

### Task 2: Checkpoint (human-verify)

Awaiting human verification of complete file attachment flow end-to-end. This task requires visual confirmation that:
- Attachment area renders in all template forms
- Drag-and-drop zone appears in editor mode
- Read-only mode shows download buttons on detail page
- File validation rejects blocked extensions
- Backend tests pass

## Verification Results

- TypeScript compiles with zero errors
- No `placeholder.attachments` text remains in any document template or page
- All 4 files import FileAttachmentArea
- DocumentDetailPage uses `readOnly={true}`

## Deviations from Plan

None - plan executed exactly as written.

## Decisions Made

1. **Save-first message for new documents:** When `documentId` is null (brand new unsaved document), display a Korean-language message instead of the FileAttachmentArea, since attachments require a saved document ID to associate with.

## Self-Check

- [x] GeneralForm.tsx modified with FileAttachmentArea - FOUND
- [x] ExpenseForm.tsx modified with FileAttachmentArea - FOUND
- [x] LeaveForm.tsx modified with FileAttachmentArea - FOUND
- [x] DocumentDetailPage.tsx modified with FileAttachmentArea - FOUND
- [x] Commit d8f672d exists - FOUND

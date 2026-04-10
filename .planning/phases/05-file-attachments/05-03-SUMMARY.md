---
phase: 05-file-attachments
plan: 03
status: complete
started: 2026-04-10T00:00:00Z
completed: 2026-04-10T00:00:00Z
---

## Summary

Integrated FileAttachmentArea component into all three template forms (GeneralForm, ExpenseForm, LeaveForm) and the DocumentDetailPage. All placeholder.attachments text has been replaced with the real attachment UI.

## What Was Built

- **GeneralForm.tsx**: FileAttachmentArea below Tiptap editor, with fallback for unsaved documents
- **ExpenseForm.tsx**: FileAttachmentArea below expense table, with fallback for unsaved documents
- **LeaveForm.tsx**: FileAttachmentArea below reason textarea, with fallback for unsaved documents
- **DocumentDetailPage.tsx**: Read-only FileAttachmentArea with `readOnly={true}` for viewing/downloading attachments

## Key Decisions

- Forms show "문서를 저장한 후 파일을 첨부할 수 있습니다." when documentId is not yet assigned
- DocumentDetailPage always passes `readOnly={true}` to FileAttachmentArea
- Document status is passed through for context-appropriate UI rendering

## Verification

- No `placeholder.attachments` text remaining in any component
- TypeScript compiles with zero errors
- Human verification: approved

## Self-Check: PASSED

### key-files.created
- frontend/src/features/document/components/templates/GeneralForm.tsx
- frontend/src/features/document/components/templates/ExpenseForm.tsx
- frontend/src/features/document/components/templates/LeaveForm.tsx
- frontend/src/features/document/pages/DocumentDetailPage.tsx

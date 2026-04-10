---
phase: 09-integration-gap-closure
plan: 03
subsystem: frontend-approval-integration
tags: [approval, routing, navigation, ui-integration, gap-closure]
dependency_graph:
  requires: [09-01, 09-02]
  provides: [approval-page-routes, approval-navbar-links, approval-line-editor-integration, approval-line-timeline-integration]
  affects: [App.tsx, MainNavbar.tsx, DocumentEditorPage.tsx, DocumentDetailPage.tsx, document.ts]
tech_stack:
  added: []
  patterns: [conditional-component-rendering, optional-type-fields]
key_files:
  created: []
  modified:
    - frontend/src/App.tsx
    - frontend/src/layouts/MainNavbar.tsx
    - frontend/src/features/document/pages/DocumentEditorPage.tsx
    - frontend/src/features/document/pages/DocumentDetailPage.tsx
    - frontend/src/features/document/types/document.ts
decisions:
  - ApprovalLineEditor uses local state only — backend save API deferred to Phase 7
  - ApprovalLineTimeline conditionally rendered based on approvalLines presence in response
  - DocumentDetailResponse extended with optional fields for forward-compatibility
metrics:
  duration: 2min
  completed: 2026-04-10
  tasks: 2
  files: 5
---

# Phase 09 Plan 03: Reconnect Approval UI Components Summary

Reconnected 4 orphaned approval UI integration points: added routes for approval pages, added navbar links, integrated ApprovalLineEditor into document editor, and replaced placeholder with ApprovalLineTimeline in document detail.

## Task Results

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Add approval page routes and navigation links | 92b2cd3 | App.tsx, MainNavbar.tsx |
| 2 | Integrate ApprovalLineEditor and ApprovalLineTimeline | 52c38de | DocumentEditorPage.tsx, DocumentDetailPage.tsx, document.ts |

## Details

### Task 1: Approval Page Routes and Navigation Links
- Added `PendingApprovalsPage` and `CompletedDocumentsPage` imports and routes to App.tsx
- Routes placed inside the `ProtectedRoute > MainLayout` route group at `/approvals/pending` and `/approvals/completed`
- Added two NavLink entries to MainNavbar with ClipboardCheck and CheckCircle icons
- Navigation links visible to all authenticated users (not admin-gated)

### Task 2: ApprovalLineEditor and ApprovalLineTimeline Integration
- Imported and rendered `ApprovalLineEditor` in DocumentEditorPage below the form container
- Uses `useAuthStore` to pass current user ID as `drafterId` prop
- Approval line items managed as local `useState` — backend persistence deferred to Phase 7
- Replaced static placeholder in DocumentDetailPage with conditional rendering:
  - Shows `ApprovalLineTimeline` when `doc.approvalLines` has data
  - Shows contextual empty state message otherwise
- Extended `DocumentDetailResponse` type with optional `approvalLines` and `currentStep` fields

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

| Stub | File | Reason |
|------|------|--------|
| ApprovalLineEditor local-only state | DocumentEditorPage.tsx | Approval line items not persisted to backend yet — Phase 7 will add save API |
| approvalLines always undefined | DocumentDetailPage.tsx | Backend does not include approvalLines in DocumentDetailResponse yet — Phase 7 will add |

These stubs are intentional and documented in the plan. They unblock human verification of the UI components while backend integration is pending.

## Verification Results

1. `tsc --noEmit` passes with no errors
2. `PendingApprovalsPage` import confirmed in App.tsx
3. `CompletedDocumentsPage` import confirmed in App.tsx
4. `/approvals/pending` route confirmed in App.tsx
5. "결재 대기" text confirmed in MainNavbar.tsx
6. `ApprovalLineEditor` import confirmed in DocumentEditorPage.tsx
7. `ApprovalLineTimeline` import confirmed in DocumentDetailPage.tsx
8. `approvalLines` field confirmed in DocumentDetailResponse type

## Self-Check: PASSED

All 5 modified files exist. Both commits (92b2cd3, 52c38de) verified in git log. SUMMARY.md created.

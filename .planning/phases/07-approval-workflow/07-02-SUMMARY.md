---
phase: 07-approval-workflow
plan: 02
subsystem: approval-ui
tags: [frontend, components, drag-and-drop, modal, org-tree, approval-line]
dependency_graph:
  requires: [07-00, 07-01]
  provides: [OrgTreePickerModal, ApprovalLineEditor, ApprovalLineStepBadge, toApprovalLineRequests, toApprovalLineItems]
  affects: [DocumentEditorPage]
tech_stack:
  added: []
  patterns: [drag-and-drop-reorder, org-tree-modal-picker, approval-line-state-management]
key_files:
  created:
    - frontend/src/features/approval/components/OrgTreePickerModal.tsx
    - frontend/src/features/approval/components/OrgTreePickerNode.tsx
    - frontend/src/features/approval/components/ApprovalLineEditor.tsx
    - frontend/src/features/approval/components/ApprovalLineStepBadge.tsx
  modified:
    - frontend/src/features/document/pages/DocumentEditorPage.tsx
decisions:
  - Approval lines live exclusively in React useState during DRAFT; only persisted to backend at submit time (D-30)
  - OrgTreePickerNode fetches members lazily on expand with 5min stale cache via TanStack Query
  - Type change between sequential and REFERENCE automatically moves item between sections
metrics:
  duration: ~4min
  completed: 2026-04-09
  tasks_completed: 2
  tasks_total: 2
---

# Phase 7 Plan 02: Approval Line Editor UI Summary

Org tree picker modal and drag-and-drop approval line editor built and integrated into DocumentEditorPage with D-30 compliant state management (frontend-only during DRAFT, backend persistence at submit).

## Task Results

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 1 | OrgTreePickerModal and OrgTreePickerNode | 63b9947 | OrgTreePickerModal.tsx, OrgTreePickerNode.tsx |
| 2 | ApprovalLineEditor + DocumentEditorPage integration | c9c66ab | ApprovalLineEditor.tsx, ApprovalLineStepBadge.tsx, DocumentEditorPage.tsx |

## What Was Done

### Task 1: OrgTreePickerModal and OrgTreePickerNode

1. **OrgTreePickerModal** -- Full modal dialog for approver selection:
   - Fetches department tree via `departmentApi.getTree(false)` with TanStack Query
   - Client-side search filtering with ancestor-chain preservation (same pattern as Phase 3 DepartmentTree)
   - Focus trap, ESC close, backdrop click close, `role="dialog"` + `aria-modal="true"`
   - Header with title, search input with Search icon, tree container, footer with close button

2. **OrgTreePickerNode** -- Recursive tree node with member loading:
   - ChevronRight/ChevronDown toggle for expand/collapse
   - Lazy member fetch on expand via `departmentApi.getMembers()` with 5min stale cache
   - Per-member type selector (APPROVE/AGREE/REFERENCE, default APPROVE) with Plus button
   - Disabled states: drafter shows "본인" (D-05), already-added shows "추가됨" (D-08), max reached disables all (D-09)
   - Filters inactive members (`status !== 'ACTIVE'`)

### Task 2: ApprovalLineEditor + DocumentEditorPage Integration

1. **ApprovalLineStepBadge** -- Colored badge for APPROVE/AGREE/REFERENCE display with i18n labels

2. **ApprovalLineEditor** -- Main drag-and-drop editor:
   - Two sections: "순차 결재" (APPROVE/AGREE with DragDropContext/Droppable/Draggable) and "참조" (REFERENCE, non-draggable)
   - Each row: drag handle, step number, type badge, name, dept/position, type selector, remove button
   - Type change moves items between sequential and reference sections
   - `toApprovalLineRequests()`: converts editor items to API format (sequential get 1-indexed stepOrder, REFERENCE gets 0)
   - `toApprovalLineItems()`: converts API response back to editor items for initialization
   - Empty state, max warning (10), error message display

3. **DocumentEditorPage modifications**:
   - Added `approvalLines` and `approvalLineError` state
   - Added `useAuthStore` for `currentUserId` (drafterId)
   - Added `useEffect` to initialize from `existingDoc.approvalLines` (resubmission support)
   - `handleSave`: sends `approvalLines: null` per D-30 (approval lines only in frontend state during DRAFT)
   - `handleSubmitClick`: validates at least 1 APPROVE type before showing confirm dialog (D-07)
   - `handleSubmitConfirm`: sends `toApprovalLineRequests(approvalLines)` via update API before submit (D-30)
   - Renders `ApprovalLineEditor` below attachments section

## Deviations from Plan

None -- plan executed exactly as written.

## Known Stubs

None -- all components are fully implemented with real data sources.

## Self-Check: PASSED

All 5 created/modified files verified present. Both commit hashes (63b9947, c9c66ab) verified in git log.

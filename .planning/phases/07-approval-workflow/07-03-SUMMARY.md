---
phase: 07-approval-workflow
plan: 03
subsystem: ui
tags: [react, dnd, approval-line, org-tree, tanstack-query]

requires:
  - phase: 07-01
    provides: Backend approval line CRUD endpoints
  - phase: 04-document-core-templates
    provides: DocumentEditorPage, document types, document API
  - phase: 03-organization-management
    provides: DepartmentTree pattern, department API, user API
provides:
  - Approval types (ApprovalLineType, ApprovalLineItem, PendingApprovalResponse)
  - Approval API client (approve, reject, getPending, getCompleted)
  - Approval hooks (usePendingApprovals, useApprove, useReject)
  - ApprovalLineEditor split-panel component with org tree and DnD
  - Document type extensions (approvalLines, sourceDocId, currentStep)
  - Document withdraw/rewrite API and hooks
affects: [07-04, 07-05, 08-dashboard]

tech-stack:
  added: []
  patterns:
    - "Split-panel editor: left org tree, right DnD list"
    - "Inline type selector buttons on org tree user rows"
    - "REFERENCE items below dashed separator, not draggable"

key-files:
  created:
    - frontend/src/features/approval/types/approval.ts
    - frontend/src/features/approval/api/approvalApi.ts
    - frontend/src/features/approval/hooks/useApprovals.ts
    - frontend/src/features/document/components/approval/ApproverOrgTree.tsx
    - frontend/src/features/document/components/approval/ApprovalLineItem.tsx
    - frontend/src/features/document/components/approval/ApprovalLineList.tsx
    - frontend/src/features/document/components/approval/ApprovalLineEditor.tsx
  modified:
    - frontend/src/features/document/types/document.ts
    - frontend/src/features/document/api/documentApi.ts
    - frontend/src/features/document/hooks/useDocuments.ts
    - frontend/src/features/document/pages/DocumentEditorPage.tsx

key-decisions:
  - "Inline type selector buttons instead of dropdown for org tree user add (faster UX)"
  - "useDepartmentMembers hook reused from admin for fetching department users"
  - "Approval lines state managed as props from DocumentEditorPage (not Zustand)"

patterns-established:
  - "ApprovalLineEditor controlled component pattern: items + onItemsChange props"
  - "DeptMembers lazy-load pattern: fetch members only when department expanded"

requirements-completed: [APR-01]

duration: 4min
completed: 2026-04-02
---

# Phase 7 Plan 3: Approval Line Editor Summary

**Split-panel approval line editor with org tree selection, @hello-pangea/dnd reordering, and document save integration**

## Performance

- **Duration:** 4 min
- **Started:** 2026-04-02T13:32:34Z
- **Completed:** 2026-04-02T13:36:42Z
- **Tasks:** 2
- **Files modified:** 11

## Accomplishments
- Approval types, API client, and hooks fully defined for frontend approval workflow
- Split-panel approval line editor with org tree (left) and DnD-sortable line (right)
- Self-addition and duplicate prevention enforced in editor
- REFERENCE items rendered below dashed separator, not draggable
- Approval lines saved with document create/update via request payload
- Document type extensions: approvalLines, sourceDocId, currentStep for Plan 04 consumption
- Withdraw and rewrite API endpoints and hooks added

## Task Commits

Each task was committed atomically:

1. **Task 1: Types, API client, hooks, and document type extensions** - `406e28d` (feat)
2. **Task 2: Approval Line Editor component with org tree and drag-and-drop** - `44560d4` (feat)

## Files Created/Modified
- `frontend/src/features/approval/types/approval.ts` - Approval type definitions (ApprovalLineType, ApprovalLineItem, etc.)
- `frontend/src/features/approval/api/approvalApi.ts` - Approval API client (approve, reject, getPending, getCompleted)
- `frontend/src/features/approval/hooks/useApprovals.ts` - TanStack Query hooks for approvals
- `frontend/src/features/document/components/approval/ApproverOrgTree.tsx` - Org tree with department expansion and user add buttons
- `frontend/src/features/document/components/approval/ApprovalLineItem.tsx` - Single draggable approval line row
- `frontend/src/features/document/components/approval/ApprovalLineList.tsx` - DnD list with REFERENCE separator
- `frontend/src/features/document/components/approval/ApprovalLineEditor.tsx` - Main split-panel editor component
- `frontend/src/features/document/types/document.ts` - Added approvalLines, sourceDocId, currentStep fields
- `frontend/src/features/document/api/documentApi.ts` - Added withdraw and rewrite endpoints
- `frontend/src/features/document/hooks/useDocuments.ts` - Added useWithdraw and useRewrite hooks
- `frontend/src/features/document/pages/DocumentEditorPage.tsx` - Integrated ApprovalLineEditor below form

## Decisions Made
- Used inline type selector buttons (approve/agree/reference) on org tree user rows instead of a dropdown, for faster single-click UX
- Reused existing useDepartmentMembers hook from admin module for fetching department users
- Managed approval lines state as controlled props from DocumentEditorPage rather than Zustand store

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Approval line editor ready for use in document drafting
- Plan 04 can build ApprovalStatusDisplay and ApprovalActionBar using the types and hooks created here
- Plan 05 can build pending/completed list pages using usePendingApprovals and useCompletedDocuments hooks
- currentStep field in DocumentDetailResponse ready for Plan 04 approval turn logic

---
*Phase: 07-approval-workflow*
*Completed: 2026-04-02*

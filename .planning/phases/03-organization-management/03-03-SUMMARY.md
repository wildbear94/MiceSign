---
phase: 03-organization-management
plan: 03
subsystem: ui
tags: [react, tailwind, dnd, tree-view, admin]

requires:
  - phase: 03-01
    provides: Backend APIs for department and position CRUD
  - phase: 03-02
    provides: AdminLayout, hooks (useDepartments, usePositions), API clients, types

provides:
  - Department management page with hierarchical tree view and detail panel
  - Position management page with drag-and-drop reordering table
  - Create/edit modals with zod validation for both entities
  - Deactivation flows with confirmation dialogs

affects: [03-04-user-management]

tech-stack:
  added: []
  patterns: [recursive-tree-component, drag-drop-table, split-panel-layout, client-side-tree-filter]

key-files:
  created:
    - frontend/src/features/admin/pages/DepartmentPage.tsx
    - frontend/src/features/admin/components/DepartmentTree.tsx
    - frontend/src/features/admin/components/DepartmentTreeNode.tsx
    - frontend/src/features/admin/components/DepartmentDetailPanel.tsx
    - frontend/src/features/admin/components/DepartmentFormModal.tsx
    - frontend/src/features/admin/pages/PositionPage.tsx
    - frontend/src/features/admin/components/PositionTable.tsx
    - frontend/src/features/admin/components/PositionFormModal.tsx
  modified:
    - frontend/src/App.tsx

key-decisions:
  - "Client-side tree filtering that preserves ancestor chain for matching nodes"
  - "DepartmentFormModal excludes self and descendants from parent dropdown to prevent circular ref"
  - "Position deactivation uses two ConfirmDialog states: blocked info when users assigned vs standard confirm when empty"
  - "No toast library added -- success handled via mutation invalidation and modal close pattern"

patterns-established:
  - "Recursive tree component: DepartmentTreeNode renders itself for children with depth-based indentation"
  - "Split panel layout: w-2/5 tree + w-3/5 detail with md breakpoint stacking"
  - "Drag-drop table: @hello-pangea/dnd wrapping table tbody with Droppable/Draggable per row"
  - "Form modal pattern: react-hook-form + zodResolver with AxiosError handling mapped to i18n error codes"

requirements-completed: [ORG-01, ORG-02]

duration: 5min
completed: 2026-04-02
---

# Phase 03 Plan 03: Department & Position Management UI Summary

**Department tree view with expand/collapse, member detail panel, and position drag-and-drop table with reorder persistence -- both pages fully wired to backend APIs via TanStack Query hooks.**

## What Was Built

### Task 1: Department Management Page
- **DepartmentPage.tsx**: Two-column split layout (w-2/5 tree + w-3/5 detail), search filter, inactive toggle, empty state with FolderOpen icon
- **DepartmentTree.tsx**: Recursive container with `role="tree"`, all nodes expanded by default
- **DepartmentTreeNode.tsx**: Individual tree node with `role="treeitem"`, `aria-expanded`, ChevronRight expand/collapse animation, member count badges, hover action buttons (edit/deactivate), inactive opacity + badge
- **DepartmentDetailPanel.tsx**: Right panel showing member list with status badges, edit button, loading/empty states
- **DepartmentFormModal.tsx**: Create/edit modal with zod validation, parent dropdown (excludes self + descendants to prevent circular ref), sort order field
- **Deactivation**: ConfirmDialog integration for department deactivation

### Task 2: Position Management Page
- **PositionPage.tsx**: Single-column centered layout (max-w-3xl), empty state, drag hint text
- **PositionTable.tsx**: @hello-pangea/dnd DragDropContext + Droppable + Draggable wrapping table rows, GripVertical drag handles, blue-50 + shadow-lg dragging state, inactive row opacity
- **PositionFormModal.tsx**: Create/edit modal with zod name validation, read-only sort order display in edit mode
- **Deactivation**: Two-state flow -- blocked info dialog when userCount > 0, standard confirm when no users

### Route Updates
- App.tsx: `/admin/departments` -> DepartmentPage, `/admin/positions` -> PositionPage (replacing AdminPlaceholder)

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| 1 | d38e0d0 | Department management page with tree view, detail panel, form modal |
| 2 | c2ae922 | Position management page with draggable table and form modal |

## Deviations from Plan

None -- plan executed exactly as written.

## Known Stubs

None -- all components are wired to real API hooks (useDepartmentTree, useDepartmentMembers, usePositions, useReorderPositions, useDeactivatePosition) and will function against the backend API.

## Verification

- TypeScript compiles without errors (`tsc --noEmit` clean)
- Production build succeeds (`npm run build` completes)
- All acceptance criteria verified via grep checks

## Self-Check: PASSED

All 8 created files exist on disk. Both commit hashes (d38e0d0, c2ae922) found in git log.

---
phase: 09-integration-gap-closure
plan: 02
title: "Frontend wiring bug fixes"
subsystem: frontend
tags: [bug-fix, approval, dashboard, api-wiring]
dependency_graph:
  requires: [09-01]
  provides: [correct-org-tree-api, aligned-pending-approval-types]
  affects: [approval-workflow, dashboard]
tech_stack:
  added: []
  patterns: [organization-api-client]
key_files:
  created:
    - frontend/src/features/approval/api/organizationApi.ts
  modified:
    - frontend/src/features/approval/components/OrgTreePickerModal.tsx
    - frontend/src/features/approval/types/approval.ts
    - frontend/src/features/approval/pages/PendingApprovalsPage.tsx
    - frontend/src/features/dashboard/components/PendingList.tsx
    - frontend/src/features/dashboard/types/dashboard.ts
decisions:
  - "Created separate organizationApi.ts for public org endpoints rather than reusing admin departmentApi"
metrics:
  duration: "3min"
  completed: "2026-04-10"
  tasks: 2
  files: 6
---

# Phase 09 Plan 02: Frontend Wiring Bug Fixes Summary

**One-liner:** Fix OrgTreePickerModal 403 by switching to public organization API, align PendingApprovalResponse type fields with backend record

## What Was Done

### Task 1: Create organization API client and rewire OrgTreePickerModal (d27dcb9)

Created `organizationApi.ts` calling `/organization/departments` (accessible to all authenticated users) instead of the admin-only `/admin/departments` endpoint. Updated `OrgTreePickerModal.tsx` to import and use `organizationApi.getTree()` instead of `departmentApi.getTree(false)`. This fixes the CRITICAL issue where USER-role employees got 403 when trying to open the org tree picker for approval line selection.

### Task 2: Align PendingApprovalResponse type and fix field references (3f20ad6)

Updated `PendingApprovalResponse` interface to match the backend Java record exactly:
- `drafterDepartmentName` -> `departmentName`
- `submittedAt` -> `createdAt`
- Added missing fields: `approvalLineId`, `stepOrder`, `lineType`
- Removed non-existent fields: `templateName`, `drafterId`

Fixed field references in `PendingApprovalsPage.tsx` and `PendingList.tsx` to use the corrected field names. Also fixed `PendingApprovalSummary` in dashboard types for consistency.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed PendingApprovalSummary in dashboard types**
- **Found during:** Task 2
- **Issue:** `dashboard.ts` had `drafterDepartmentName` which doesn't match backend field name
- **Fix:** Changed to `departmentName` for consistency
- **Files modified:** `frontend/src/features/dashboard/types/dashboard.ts`
- **Commit:** 3f20ad6

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| 1 | d27dcb9 | Create organizationApi and rewire OrgTreePickerModal |
| 2 | 3f20ad6 | Align PendingApprovalResponse type and fix field references |

## Verification

- TypeScript compilation: PASSED (no errors)
- No remaining `departmentApi` references in OrgTreePickerModal.tsx
- No remaining `submittedAt` or `drafterDepartmentName` in approval features
- No remaining `drafterDepartmentName` in dashboard features

## Self-Check: PASSED

- [x] `frontend/src/features/approval/api/organizationApi.ts` exists
- [x] `OrgTreePickerModal.tsx` imports `organizationApi`
- [x] `PendingApprovalResponse` has `createdAt` and `departmentName`
- [x] Commits d27dcb9 and 3f20ad6 exist

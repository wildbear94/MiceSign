---
phase: 07-approval-workflow
plan: 01
subsystem: approval-core
tags: [backend, frontend, validation, tests, i18n, types]
dependency_graph:
  requires: [07-00]
  provides: [approval-validation, approval-types, approval-api, approval-hooks, approval-i18n]
  affects: [DocumentService, DocumentSubmitTest, document.ts, documentApi.ts, useDocuments.ts, approval.ts, i18n-config]
tech_stack:
  added: []
  patterns: [approval-line-validation, mutation-hooks-with-cache-invalidation]
key_files:
  created:
    - backend/src/test/java/com/micesign/document/ApprovalWorkflowTest.java
    - frontend/public/locales/ko/approval.json
    - frontend/public/locales/en/approval.json
  modified:
    - backend/src/main/java/com/micesign/service/DocumentService.java
    - backend/src/test/java/com/micesign/document/DocumentSubmitTest.java
    - frontend/src/features/document/types/document.ts
    - frontend/src/features/document/api/documentApi.ts
    - frontend/src/features/document/hooks/useDocuments.ts
    - frontend/src/features/approval/types/approval.ts
    - frontend/src/i18n/config.ts
decisions:
  - Inserted approver users via JdbcTemplate in test setup rather than using API, matching existing DocumentSubmitTest pattern
  - Used direct DB insert for drafter-in-line test to bypass create-time self-addition check
metrics:
  duration: ~10min
  completed: 2026-04-09
  tasks_completed: 2
  tasks_total: 2
---

# Phase 7 Plan 01: Backend Validation + Frontend Foundation Summary

Backend approval line validation activated with 8 integration tests covering full lifecycle (submit/approve/reject/withdraw/rewrite); frontend types, API, hooks, and i18n ready for UI consumption.

## Task Results

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 1 | Backend -- Activate approval line validation + integration tests | 364c231 | DocumentService.java, ApprovalWorkflowTest.java, DocumentSubmitTest.java |
| 2 | Frontend -- Types, API client, hooks, and i18n | cc3cb7f | document.ts, documentApi.ts, useDocuments.ts, approval.ts, approval.json (ko/en), config.ts |

## What Was Done

### Task 1: Backend Validation + Tests

1. **Activated approval line validation** in `DocumentService.submitDocument()`:
   - `APR_NO_APPROVER`: Rejects submission without at least 1 APPROVE type approver
   - `APR_SELF_NOT_ALLOWED`: Rejects submission when drafter is in approval line
   - Removed the `TODO Phase 7` comment block

2. **Created `ApprovalWorkflowTest.java`** with 8 integration tests:
   - `submitWithApprovalLine_success` -- APR-01, APR-02
   - `submitWithoutApprovalLine_returns400` -- D-07
   - `submitWithOnlyReference_returns400` -- D-07
   - `submitWithDrafterInLine_returns400` -- D-05
   - `approveDocument_success` -- APR-03, APR-05
   - `rejectDocument_withComment` -- APR-03, APR-04
   - `withdrawDocument_success` -- APR-06
   - `rewriteDocument_success` -- APR-07

3. **Fixed `DocumentSubmitTest.java`** to work with new validation:
   - Added test approver user setup in @BeforeEach
   - Added `addApprovalLine()` helper to insert APPROVE line before submission
   - All 9 existing tests now pass with approval line validation active

### Task 2: Frontend Foundation

1. **Updated `document.ts` types**:
   - Added `drafterId`, `currentStep`, `sourceDocId`, `approvalLines` to `DocumentDetailResponse`
   - Added `approvalLines?: ApprovalLineRequest[]` to `CreateDocumentRequest` and `UpdateDocumentRequest`
   - Added import for `ApprovalLineResponse` and `ApprovalLineRequest`

2. **Updated `approval.ts` types**:
   - Added `stepOrder: number` to `ApprovalLineRequest` (was missing)

3. **Updated `documentApi.ts`**:
   - Added `withdraw(id)` and `rewrite(id)` methods

4. **Updated `useDocuments.ts`**:
   - Added `useWithdrawDocument()` mutation hook with cache invalidation
   - Added `useRewriteDocument()` mutation hook with cache invalidation

5. **Created i18n approval namespace**:
   - `ko/approval.json` with all Korean UI copy from UI-SPEC
   - `en/approval.json` with English translations
   - Registered `approval` namespace in `i18n/config.ts`

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed DocumentSubmitTest regression from validation activation**
- **Found during:** Task 1
- **Issue:** Enabling approval line validation caused 7/9 existing DocumentSubmitTest tests to fail (400 APR_NO_APPROVER)
- **Fix:** Added test approver user setup and `addApprovalLine()` helper to insert an APPROVE line before each submission test
- **Files modified:** backend/src/test/java/com/micesign/document/DocumentSubmitTest.java
- **Commit:** 364c231

## Notes for Downstream Plans

- **approvalApi.ts observation:** The existing `approve()` and `reject()` methods return `ApiResponse<void>` but the backend actually returns `DocumentDetailResponse`. Plan 03 may want to update return types to `ApiResponse<DocumentDetailResponse>` for richer UI feedback after approval actions.

## Known Stubs

None -- all types, API methods, hooks, and i18n strings are fully wired.

## Self-Check: PASSED

All 8 created/modified files verified present. Both commit hashes (364c231, cc3cb7f) verified in git log.

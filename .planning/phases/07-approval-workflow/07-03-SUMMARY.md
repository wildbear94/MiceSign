---
phase: 07-approval-workflow
plan: 03
subsystem: approval-processing-ui
tags: [frontend, components, approval-timeline, approval-actions, withdraw, resubmit]
dependency_graph:
  requires: [07-00, 07-01, 07-02]
  provides: [ApprovalLineTimeline, ApprovalActionPanel, document-detail-approval-integration]
  affects: [DocumentDetailPage]
tech_stack:
  added: []
  patterns: [inline-status-messages, permission-computed-from-doc-state, confirm-dialog-before-destructive-action]
key_files:
  created:
    - frontend/src/features/approval/components/ApprovalLineTimeline.tsx
    - frontend/src/features/approval/components/ApprovalActionPanel.tsx
  modified:
    - frontend/src/features/document/pages/DocumentDetailPage.tsx
decisions:
  - useTranslation(['document', 'approval']) with default namespace 'document' for backward compatibility of existing t() calls
  - canApprove/canWithdraw/canResubmit computed inline in component (no separate hook) for simplicity
metrics:
  duration: ~3min
  completed: 2026-04-09
  tasks_completed: 1
  tasks_total: 2
---

# Phase 7 Plan 03: Approval Processing UI Summary

Approval line timeline, approve/reject action panel, withdraw, and resubmit buttons built and integrated into DocumentDetailPage; replaces placeholder div with real approval workflow UI.

## Task Results

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 1 | ApprovalLineTimeline, ApprovalActionPanel, and DocumentDetailPage integration | 211b448 | ApprovalLineTimeline.tsx, ApprovalActionPanel.tsx, DocumentDetailPage.tsx |
| 2 | End-to-end approval workflow verification | PENDING | checkpoint:human-verify |

## What Was Done

### Task 1: ApprovalLineTimeline, ApprovalActionPanel, and DocumentDetailPage Integration

1. **Created `ApprovalLineTimeline.tsx`** -- Read-only approval line timeline:
   - Sequential lines section with step number circles, vertical connectors, status badges
   - Step circle colors: green (approved), red (rejected), blue ring (current/pending), gray (waiting)
   - Status badges: approved (green), rejected (red), pending (gray), current approver (blue)
   - Approver info: name, department/position, line type label, acted-at timestamp, quoted comment
   - Reference lines section with separate divider, no step numbers or connectors

2. **Created `ApprovalActionPanel.tsx`** -- Approve/reject action buttons:
   - When canApprove=false: shows not-your-turn message (D-14)
   - Comment textarea with placeholder, aria-required for reject validation
   - Approve: immediate execution via useApprove hook, no confirmation dialog (D-15, D-17)
   - Reject: validates mandatory comment (D-12), shows ConfirmDialog before processing (D-17)
   - Inline success/error role=alert messages after action
   - Both buttons disabled during mutation pending with Loader2 spinner

3. **Modified `DocumentDetailPage.tsx`** -- Full integration:
   - Added imports: ApprovalLineTimeline, ApprovalActionPanel, ConfirmDialog, useWithdrawDocument, useRewriteDocument, useAuthStore, useQueryClient
   - Computed permissions: canApprove (current step + userId match), canWithdraw (drafter + all current step PENDING), canResubmit (REJECTED/WITHDRAWN + drafter)
   - Replaced approval line placeholder with ApprovalLineTimeline + ApprovalActionPanel
   - Header actions: withdraw button (amber, with ConfirmDialog D-20) and resubmit button (blue, D-23)
   - Withdraw handler: mutateAsync + success message + cache invalidation (D-22 page stays)
   - Resubmit handler: mutateAsync + navigate to /documents/newDocId which auto-renders editor for DRAFT status (D-26)
   - Error message banner with dismiss button
   - All existing features preserved: success banner, back button, meta info, content, attachments

## Deviations from Plan

None -- plan executed exactly as written.

## Known Stubs

None -- all components are fully implemented with real hooks and i18n strings.

## Pending Checkpoint

Task 2 is a checkpoint:human-verify requiring manual end-to-end testing of the complete approval workflow (6 test scenarios covering approval line editor, submit validation, approval processing, rejection, withdrawal, and resubmission).

## Self-Check: PASSED

All 3 created/modified files verified present. Commit hash 211b448 verified in git log. TypeScript compiles with zero errors (tsc --noEmit exit code 0).

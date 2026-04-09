---
phase: 07-approval-workflow
fixed_at: 2026-04-09T14:45:00Z
review_path: .planning/phases/07-approval-workflow/07-REVIEW.md
iteration: 1
findings_in_scope: 6
fixed: 5
skipped: 1
status: partial
---

# Phase 7: Code Review Fix Report

**Fixed at:** 2026-04-09T14:45:00Z
**Source review:** .planning/phases/07-approval-workflow/07-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 6
- Fixed: 5
- Skipped: 1

## Fixed Issues

### CR-01: JSON Injection in Audit Log via templateCode

**Files modified:** `backend/src/main/java/com/micesign/service/DocumentService.java`
**Commit:** 1c9cce6
**Applied fix:** Replaced string concatenation for audit log JSON with ObjectMapper.writeValueAsString using Map.of() at both createDocument (line 144) and submitDocument (line 300). Added static ObjectMapper field, Jackson imports, and try-catch with fallback to null detail on serialization failure.

### WR-01: ApprovalActionPanel Rendered with lineId=0 When User is Not Current Approver

**Files modified:** `frontend/src/features/document/pages/DocumentDetailPage.tsx`
**Commit:** a3e52ba
**Applied fix:** Wrapped ApprovalActionPanel rendering in `{myLine && (...)}` conditional so it only renders when user has an actionable approval line. Removed the `?? 0` fallback for lineId.

### WR-03: Reject Error Message Uses Wrong Translation Key

**Files modified:** `frontend/src/features/approval/components/ApprovalActionPanel.tsx`
**Commit:** dd52685
**Applied fix:** Changed `t('error.approveFailed')` to `t('error.rejectFailed')` in the handleRejectConfirm catch block (line 77).

### WR-04: OrgTreePickerNode Expanded State Not Synced with defaultExpanded Prop

**Files modified:** `frontend/src/features/approval/components/OrgTreePickerNode.tsx`
**Commit:** d3372a3
**Applied fix:** Added `useEffect` import and a sync effect that sets `expanded` to `true` when `defaultExpanded` prop changes to `true`. This ensures search-triggered expansion propagates to already-rendered nodes.

### WR-05: Approval Line Deletion Not Audited in updateDocument

**Files modified:** `backend/src/main/java/com/micesign/service/DocumentService.java`
**Commit:** daed45f
**Applied fix:** Added `auditLogService.log()` call with `AuditAction.DOC_UPDATE` and detail `{"action":"approval_lines_updated"}` after approval lines are replaced in the updateDocument method.

## Skipped Issues

### WR-02: Race Condition in Document Number Generation (New Sequence Row)

**File:** `backend/src/main/java/com/micesign/service/DocumentService.java:472-479`
**Reason:** Design-level issue requiring database-level changes (INSERT ON DUPLICATE KEY UPDATE, unique constraint with retry, SERIALIZABLE isolation, or pre-seeding). Cannot be safely fixed with a simple code edit without risk of introducing other issues. Skipped per instructions.
**Original issue:** When no sequence row exists yet, two concurrent requests could both find no row and attempt to insert simultaneously, causing a unique constraint violation or duplicate sequence numbers.

---

_Fixed: 2026-04-09T14:45:00Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_

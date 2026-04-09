---
phase: 07-approval-workflow
reviewed: 2026-04-09T14:30:00Z
depth: standard
files_reviewed: 14
files_reviewed_list:
  - backend/src/main/java/com/micesign/service/DocumentService.java
  - backend/src/test/java/com/micesign/document/ApprovalWorkflowTest.java
  - frontend/src/features/approval/components/ApprovalActionPanel.tsx
  - frontend/src/features/approval/components/ApprovalLineEditor.tsx
  - frontend/src/features/approval/components/ApprovalLineStepBadge.tsx
  - frontend/src/features/approval/components/ApprovalLineTimeline.tsx
  - frontend/src/features/approval/components/OrgTreePickerModal.tsx
  - frontend/src/features/approval/components/OrgTreePickerNode.tsx
  - frontend/src/features/approval/types/approval.ts
  - frontend/src/features/document/api/documentApi.ts
  - frontend/src/features/document/hooks/useDocuments.ts
  - frontend/src/features/document/pages/DocumentDetailPage.tsx
  - frontend/src/features/document/pages/DocumentEditorPage.tsx
  - frontend/src/features/document/types/document.ts
findings:
  critical: 1
  warning: 5
  info: 3
  total: 9
status: issues_found
---

# Phase 7: Code Review Report

**Reviewed:** 2026-04-09T14:30:00Z
**Depth:** standard
**Files Reviewed:** 14
**Status:** issues_found

## Summary

Reviewed the approval workflow implementation spanning backend service logic (DocumentService.java), integration tests, and frontend components (approval line editor, timeline, org tree picker, action panel, document detail/editor pages, types, API layer, hooks).

The overall implementation is solid -- clean separation of concerns, proper validation at both frontend and backend, good use of TanStack Query for data fetching, and comprehensive integration tests covering the key workflow paths.

Key concerns: one potential security issue with audit log injection, a bug where ApprovalActionPanel renders with lineId=0 when the user is not the current approver, and a race condition in the document number generation logic.

## Critical Issues

### CR-01: JSON Injection in Audit Log via templateCode

**File:** `backend/src/main/java/com/micesign/service/DocumentService.java:144`
**Issue:** The `templateCode` from the request is concatenated directly into a JSON string for the audit log without escaping. If `templateCode` contains double quotes or other special characters, it corrupts the JSON structure and could inject arbitrary audit log content. The same pattern appears at line 300 with `docNumber` (though docNumber is generated server-side so lower risk).
**Fix:**
```java
// Use a proper JSON library instead of string concatenation
import com.fasterxml.jackson.databind.ObjectMapper;

// In createDocument:
ObjectMapper mapper = new ObjectMapper();
String detail = mapper.writeValueAsString(Map.of("templateCode", request.templateCode()));
auditLogService.log(userId, AuditAction.DOC_CREATE, "DOCUMENT", document.getId(), detail);

// In submitDocument:
String detail = mapper.writeValueAsString(Map.of("docNumber", docNumber));
auditLogService.log(userId, AuditAction.DOC_SUBMIT, "DOCUMENT", docId, detail);
```

## Warnings

### WR-01: ApprovalActionPanel Rendered with lineId=0 When User is Not Current Approver

**File:** `frontend/src/features/document/pages/DocumentDetailPage.tsx:263`
**Issue:** `ApprovalActionPanel` is always rendered inside the approval lines block with `lineId={myLine?.id ?? 0}`. When `myLine` is undefined (user is not the current approver), `lineId` is `0`. Although `canApprove` will be `false` so the approve/reject buttons are hidden, a `0` lineId is semantically incorrect and could cause issues if the component logic changes. The component should not be rendered at all when the user has no actionable line.
**Fix:**
```tsx
{/* Only render action panel when user has an actionable line */}
{myLine && (
  <ApprovalActionPanel
    lineId={myLine.id}
    canApprove={canApprove}
    onActionComplete={() =>
      queryClient.invalidateQueries({ queryKey: ['documents', documentId] })
    }
  />
)}
```

### WR-02: Race Condition in Document Number Generation (New Sequence Row)

**File:** `backend/src/main/java/com/micesign/service/DocumentService.java:472-479`
**Issue:** The `generateDocNumber` method uses `findByTemplateCodeAndYearForUpdate` with pessimistic locking, which is correct for existing rows. However, when no sequence row exists yet (the `orElseGet` branch), two concurrent requests could both find no row and attempt to insert simultaneously, causing a unique constraint violation or duplicate sequence numbers. The pessimistic lock only works on existing rows -- it cannot lock a row that does not yet exist.
**Fix:** Use `INSERT ... ON DUPLICATE KEY UPDATE` at the database level, or add a unique constraint on `(template_code, year)` and catch the constraint violation to retry, or use `SERIALIZABLE` isolation for this specific transaction. Alternatively, pre-seed sequence rows for expected template codes at application startup.

### WR-03: Reject Error Message Uses Wrong Translation Key

**File:** `frontend/src/features/approval/components/ApprovalActionPanel.tsx:77`
**Issue:** In `handleRejectConfirm`, the error catch block uses `t('error.approveFailed')` instead of a reject-specific error message. Users who fail to reject a document will see an "approve failed" message, which is confusing.
**Fix:**
```tsx
} catch {
  setShowRejectConfirm(false);
  setResultMessage({ type: 'error', text: t('error.rejectFailed') });
}
```

### WR-04: OrgTreePickerNode Expanded State Not Synced with defaultExpanded Prop

**File:** `frontend/src/features/approval/components/OrgTreePickerNode.tsx:33`
**Issue:** `useState(defaultExpanded)` only uses `defaultExpanded` as the initial value. When the user types a search query, causing `defaultExpanded` to change from `false` to `true`, already-rendered nodes will not expand because React `useState` ignores subsequent changes to its initial value argument. This means search filtering shows matching departments in the tree but they remain collapsed, requiring manual expansion.
**Fix:**
```tsx
const [expanded, setExpanded] = useState(defaultExpanded);

// Sync expanded state when search starts
useEffect(() => {
  if (defaultExpanded) {
    setExpanded(true);
  }
}, [defaultExpanded]);
```

### WR-05: Approval Line Deletion Not Audited in updateDocument

**File:** `backend/src/main/java/com/micesign/service/DocumentService.java:178-186`
**Issue:** When approval lines are replaced during `updateDocument`, the deletion and re-creation of approval lines is not logged in the audit trail. Per the CLAUDE.md architecture decisions, the audit log should capture all key user actions. Silently replacing approval lines without audit records makes it impossible to trace who changed the approval line before submission.
**Fix:** Add an audit log entry when approval lines are modified:
```java
if (request.approvalLines() != null) {
    approvalLineRepository.deleteByDocumentId(docId);
    if (!request.approvalLines().isEmpty()) {
        saveApprovalLines(document, request.approvalLines());
    }
    auditLogService.log(userId, AuditAction.DOC_UPDATE, "DOCUMENT", docId,
            "{\"action\":\"approval_lines_updated\"}");
}
```

## Info

### IN-01: Reference Line Status Display Logic is Confusing

**File:** `frontend/src/features/approval/components/ApprovalLineTimeline.tsx:193-194`
**Issue:** The ternary `t('status.PENDING') === line.status` compares a translated string with a raw enum value (e.g., `'PENDING'`). This will never be true unless the translation happens to return the exact string `'PENDING'`, making it always show the REFERENCE label. The intent appears to be checking `line.status === 'PENDING'`.
**Fix:**
```tsx
<span className="...">
  {line.status === 'PENDING' ? t('status.PENDING') : t('typeShort.REFERENCE')}
</span>
```

### IN-02: Unused Import in ApprovalLineEditor

**File:** `frontend/src/features/approval/components/ApprovalLineEditor.tsx:17`
**Issue:** `ApprovalLineRequest` is imported from types but is only used in the `toApprovalLineRequests` return type, which TypeScript can infer. Additionally, `ApprovalLineResponse` is imported and used only in `toApprovalLineItems`. While not harmful, these could be moved to separate utility files if the editor component grows.

### IN-03: Redundant Approval Line Query in submitDocument

**File:** `backend/src/main/java/com/micesign/service/DocumentService.java:258,284`
**Issue:** `approvalLineRepository.findByDocumentIdOrderByStepOrderAsc(docId)` is called twice in `submitDocument` -- once for validation (line 258) and once for setting `currentStep` (line 284). These could be consolidated into a single query.
**Fix:**
```java
List<ApprovalLine> approvalLines = approvalLineRepository.findByDocumentIdOrderByStepOrderAsc(docId);

// Use approvalLines for both validation and step logic
boolean hasApprover = approvalLines.stream()
        .anyMatch(line -> line.getLineType() == ApprovalLineType.APPROVE);
```

---

_Reviewed: 2026-04-09T14:30:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_

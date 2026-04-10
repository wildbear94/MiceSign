---
phase: 09-integration-gap-closure
reviewed: 2026-04-10T06:27:45Z
depth: standard
files_reviewed: 24
files_reviewed_list:
  - backend/src/main/java/com/micesign/common/AuditAction.java
  - backend/src/main/java/com/micesign/controller/AuditLogController.java
  - backend/src/main/java/com/micesign/domain/ApprovalLine.java
  - backend/src/main/java/com/micesign/domain/enums/ApprovalLineStatus.java
  - backend/src/main/java/com/micesign/domain/enums/ApprovalLineType.java
  - backend/src/main/java/com/micesign/dto/audit/AuditLogResponse.java
  - backend/src/main/java/com/micesign/repository/ApprovalLineRepository.java
  - backend/src/main/java/com/micesign/repository/AuditLogRepository.java
  - backend/src/main/java/com/micesign/repository/DocumentRepository.java
  - backend/src/main/java/com/micesign/service/ApprovalService.java
  - backend/src/main/java/com/micesign/service/AuditLogService.java
  - backend/src/main/java/com/micesign/service/DocumentService.java
  - backend/src/main/java/com/micesign/specification/AuditLogSpecification.java
  - frontend/src/App.tsx
  - frontend/src/features/approval/api/organizationApi.ts
  - frontend/src/features/approval/components/OrgTreePickerModal.tsx
  - frontend/src/features/approval/pages/PendingApprovalsPage.tsx
  - frontend/src/features/approval/types/approval.ts
  - frontend/src/features/dashboard/components/PendingList.tsx
  - frontend/src/features/dashboard/types/dashboard.ts
  - frontend/src/features/document/pages/DocumentDetailPage.tsx
  - frontend/src/features/document/pages/DocumentEditorPage.tsx
  - frontend/src/features/document/types/document.ts
  - frontend/src/layouts/MainNavbar.tsx
findings:
  critical: 1
  warning: 6
  info: 4
  total: 11
status: issues_found
---

# Phase 9: Code Review Report

**Reviewed:** 2026-04-10T06:27:45Z
**Depth:** standard
**Files Reviewed:** 24
**Status:** issues_found

## Summary

Reviewed backend services (ApprovalService, DocumentService, AuditLogService), domain entities, repositories, specifications, and frontend components (routing, approval pages, document editor/detail, dashboard, navbar). The code is generally well-structured with proper authorization checks, transaction management, and consistent UI patterns. Key concerns are: a document detail access control gap that prevents approvers from viewing documents they need to act on (blocking the approval workflow end-to-end), missing audit logging on several critical document mutations, an approval line editor that is visually present but disconnected from the save/submit flow, and a query pattern that loads unbounded data into memory before paginating.

## Critical Issues

### CR-01: Document detail access restricted to drafter only -- approvers cannot view documents

**File:** `backend/src/main/java/com/micesign/service/DocumentService.java:136-139`
**Issue:** `getDocumentDetail` throws a BusinessException when `userId` does not match the drafter. This means users in the approval line (APPROVE, AGREE, REFERENCE types) get an error when they navigate to `/documents/{id}` from the pending approvals page. The entire approval workflow is broken end-to-end: the pending approvals page (PendingApprovalsPage.tsx:15) navigates approvers to the document detail route, but the backend rejects the request. The dashboard PendingList component (PendingList.tsx:79) has the same navigation pattern. This is a data-access authorization bug that blocks core functionality.
**Fix:** Expand access check to include users who are in the document's approval line:
```java
if (!document.getDrafter().getId().equals(userId)) {
    boolean isInApprovalLine = approvalLineRepository
            .findByDocumentIdOrderByStepOrder(documentId)
            .stream()
            .anyMatch(line -> line.getApprover().getId().equals(userId));
    if (!isInApprovalLine) {
        throw new BusinessException("DOC_NOT_AUTHORIZED", "문서를 조회할 권한이 없습니다.");
    }
}
```
This requires injecting `ApprovalLineRepository` into `DocumentService`.

## Warnings

### WR-01: Missing audit log for document create, update, and delete operations

**File:** `backend/src/main/java/com/micesign/service/DocumentService.java:53-111`
**Issue:** The `createDocument`, `updateDocument`, and `deleteDocument` methods do not write audit log entries, while `rewriteDocument` (line 174) does. Per the project architecture decision, audit log is an "immutable append-only log for all document state changes and key user actions." The `AuditAction` constants `DOC_CREATE`, `DOC_UPDATE`, and `DOC_DELETE` exist but are unused. This means document creation, editing, and deletion leave no audit trail.
**Fix:** Add audit logging calls after each successful mutation:
```java
// In createDocument, after documentRepository.save(document):
auditLogService.log(userId, AuditAction.DOC_CREATE, "DOCUMENT", document.getId(),
        Map.of("templateCode", req.templateCode(), "title", req.title()));

// In updateDocument, after documentRepository.save(document):
auditLogService.log(userId, AuditAction.DOC_UPDATE, "DOCUMENT", documentId,
        Map.of("title", req.title()));

// In deleteDocument, before documentRepository.delete(document):
auditLogService.log(userId, AuditAction.DOC_DELETE, "DOCUMENT", documentId,
        Map.of("title", document.getTitle()));
```

### WR-02: Approval line editor state is disconnected from document save

**File:** `frontend/src/features/document/pages/DocumentEditorPage.tsx:35,207-213`
**Issue:** `approvalLineItems` state (line 35) is managed locally and rendered via `ApprovalLineEditor` (lines 207-213), but the `handleSave` callback (lines 52-86) never reads or sends approval line data to the backend. Users can add approvers in the UI, save the document, and the approval line selections are silently discarded. When the page reloads or navigates away, all approval line selections are lost. This creates a confusing user experience where the UI suggests approval lines are being saved but they are not.
**Fix:** Include `approvalLineItems` in the save payload when submitting. At minimum, persist them alongside the document creation/update API call. If the backend submit endpoint expects approval lines, wire them into that request. If only needed at submission time, consider storing them in component state with a clear visual indicator that they are not yet persisted.

### WR-03: getCompletedApprovals loads all approval lines into memory before paginating

**File:** `backend/src/main/java/com/micesign/service/ApprovalService.java:45-72`
**Issue:** `getCompletedApprovals` calls `findByApproverIdAndStatusIn` which returns ALL matching `ApprovalLine` entities (unbounded `List`), extracts document IDs, then queries documents with pagination. For a user who has approved many documents over time, this loads all historical approval lines into memory on every page request. The resulting `IN` clause on `findByIdInAndStatusIn` also has no size limit.
**Fix:** Replace with a single paginated query using a join or subquery at the repository level:
```java
@Query("SELECT d FROM Document d WHERE d.id IN " +
       "(SELECT DISTINCT al.document.id FROM ApprovalLine al " +
       "WHERE al.approver.id = :userId AND al.status IN :statuses) " +
       "AND d.status IN :docStatuses")
Page<Document> findCompletedByApprover(@Param("userId") Long userId,
                                        @Param("statuses") List<ApprovalLineStatus> statuses,
                                        @Param("docStatuses") List<DocumentStatus> docStatuses,
                                        Pageable pageable);
```

### WR-04: AuditLogService.log silently degrades JSON serialization failure

**File:** `backend/src/main/java/com/micesign/service/AuditLogService.java:48-52`
**Issue:** When `objectMapper.writeValueAsString(details)` throws `JsonProcessingException`, the catch block falls back to `details.toString()`. The `Map.toString()` output (e.g., `{key=value}`) is not valid JSON and will break any downstream consumer that tries to parse the `detail` field as JSON. There is no logging of the serialization failure either, making it invisible.
**Fix:** At minimum, log the error. Preferably, store a structured fallback:
```java
} catch (JsonProcessingException e) {
    log.warn("Failed to serialize audit detail for action={}: {}", action, e.getMessage());
    auditLog.setDetail("{\"error\":\"serialization_failed\"}");
}
```

### WR-05: AuditLogController does not validate date range parameters

**File:** `backend/src/main/java/com/micesign/controller/AuditLogController.java:27-37`
**Issue:** The `dateFrom` and `dateTo` parameters are not validated relative to each other. When `dateFrom` is after `dateTo`, the query returns empty results without any error, which is confusing for admin users searching audit logs.
**Fix:** Add basic validation:
```java
if (dateFrom != null && dateTo != null && dateFrom.isAfter(dateTo)) {
    throw new BusinessException("INVALID_DATE_RANGE", "시작일이 종료일보다 이후일 수 없습니다.");
}
```

### WR-06: DocumentDetailPage renders DRAFT check after redirect is unreachable

**File:** `frontend/src/features/document/pages/DocumentDetailPage.tsx:116-126`
**Issue:** Line 34 checks `doc.status === 'DRAFT'` and renders `<DocumentEditorPage />` (effectively redirecting to edit mode). However, lines 116-126 contain a conditional block that checks `doc.status === 'DRAFT'` again for the approval line placeholder text. Since DRAFTs are handled at line 34 and never reach the read-only rendering, the `doc.status === 'DRAFT'` branch in the ternary at line 124 is dead code.
**Fix:** Remove the dead DRAFT branch at line 124:
```tsx
<div className="border border-dashed ...">
  {t('placeholder.noApprovalLine', '결재선 정보가 없습니다')}
</div>
```

## Info

### IN-01: Hardcoded Korean strings in PendingApprovalsPage (no i18n)

**File:** `frontend/src/features/approval/pages/PendingApprovalsPage.tsx:29-53`
**Issue:** Page title ("결재 대기"), empty state messages, and table headers are hardcoded Korean strings, unlike `OrgTreePickerModal.tsx` and `PendingList.tsx` which use `useTranslation`. This is inconsistent with the rest of the codebase.
**Fix:** Import and use `useTranslation('approval')` for all user-visible strings.

### IN-02: PendingList table headers partially hardcoded Korean

**File:** `frontend/src/features/dashboard/components/PendingList.tsx:59-70`
**Issue:** Table headers ("제목", "양식", "기안자", "제출일") are hardcoded Korean strings even though the component already imports and uses `useTranslation('dashboard')` for other strings. Inconsistent within the same component.
**Fix:** Replace hardcoded headers with translation keys from the dashboard namespace.

### IN-03: Unused import in AuditLogService

**File:** `backend/src/main/java/com/micesign/service/AuditLogService.java:19`
**Issue:** `java.util.function.Function` is imported but never used.
**Fix:** Remove the unused import.

### IN-04: MainNavbar hardcodes Korean strings for nav items

**File:** `frontend/src/layouts/MainNavbar.tsx:42-68`
**Issue:** Navigation labels ("내 문서", "결재 대기", "완료된 문서", "관리") are hardcoded Korean, while `aria-label` and `title` for the logout button are also hardcoded. Other components in the codebase use i18n. Minor inconsistency.
**Fix:** Add `useTranslation` and move strings to locale files for consistency.

---

_Reviewed: 2026-04-10T06:27:45Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_

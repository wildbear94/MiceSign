---
phase: 09-integration-gap-closure
reviewed: 2026-04-10T12:00:00Z
depth: standard
files_reviewed: 19
files_reviewed_list:
  - backend/src/main/java/com/micesign/service/ApprovalService.java
  - backend/src/main/java/com/micesign/domain/ApprovalLine.java
  - backend/src/main/java/com/micesign/domain/enums/ApprovalLineStatus.java
  - backend/src/main/java/com/micesign/domain/enums/ApprovalLineType.java
  - backend/src/main/java/com/micesign/repository/ApprovalLineRepository.java
  - backend/src/main/java/com/micesign/common/AuditAction.java
  - backend/src/main/java/com/micesign/service/AuditLogService.java
  - backend/src/main/java/com/micesign/controller/AuditLogController.java
  - backend/src/main/java/com/micesign/dto/audit/AuditLogResponse.java
  - backend/src/main/java/com/micesign/specification/AuditLogSpecification.java
  - backend/src/main/java/com/micesign/repository/DocumentRepository.java
  - backend/src/main/java/com/micesign/repository/AuditLogRepository.java
  - backend/src/main/java/com/micesign/service/DocumentService.java
  - frontend/src/features/approval/api/organizationApi.ts
  - frontend/src/features/approval/components/OrgTreePickerModal.tsx
  - frontend/src/features/approval/types/approval.ts
  - frontend/src/features/approval/pages/PendingApprovalsPage.tsx
  - frontend/src/features/dashboard/components/PendingList.tsx
  - frontend/src/features/dashboard/types/dashboard.ts
findings:
  critical: 0
  warning: 5
  info: 3
  total: 8
status: issues_found
---

# Phase 9: Code Review Report

**Reviewed:** 2026-04-10T12:00:00Z
**Depth:** standard
**Files Reviewed:** 19
**Status:** issues_found

## Summary

Reviewed backend services (ApprovalService, DocumentService, AuditLogService), domain entities, repositories, and frontend components related to approval workflows, audit logging, and the org tree picker. The code is generally well-structured with proper authorization checks and transaction management. Key concerns are: missing audit logging for several document mutations (violating the project's immutable audit trail requirement), a document detail access control gap that prevents approvers from viewing documents assigned to them, and an approval query pattern that loads all matching records into memory before paginating.

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

### WR-02: Document detail access restricted to drafter only -- approvers cannot view

**File:** `backend/src/main/java/com/micesign/service/DocumentService.java:132-146`
**Issue:** `getDocumentDetail` checks `document.getDrafter().getId().equals(userId)` and throws if the viewer is not the drafter. This means users in the approval line (APPROVE, AGREE, REFERENCE types) cannot view the document they are supposed to review or approve. This is a functional gap -- the pending approvals page navigates to `/documents/{id}` but the approver will get a 403/business error when trying to view it.
**Fix:** Expand access check to include users in the document's approval line:
```java
if (!document.getDrafter().getId().equals(userId)) {
    // Check if user is in the approval line for this document
    boolean isInApprovalLine = approvalLineRepository
            .findByDocumentIdOrderByStepOrder(documentId)
            .stream()
            .anyMatch(line -> line.getApprover().getId().equals(userId));
    if (!isInApprovalLine) {
        throw new BusinessException("DOC_NOT_AUTHORIZED", "문서를 조회할 권한이 없습니다.");
    }
}
```
Note: This requires injecting `ApprovalLineRepository` into `DocumentService`.

### WR-03: getCompletedApprovals loads all approval lines into memory before paginating

**File:** `backend/src/main/java/com/micesign/service/ApprovalService.java:45-72`
**Issue:** `getCompletedApprovals` calls `findByApproverIdAndStatusIn` which returns ALL matching `ApprovalLine` entities (unbounded `List`), extracts document IDs, then queries documents with pagination. For a user who has approved many documents over time, this loads all historical approval lines into memory on every page request. The resulting `IN` clause on `findByIdInAndStatusIn` also has no size limit.
**Fix:** Replace with a single paginated query using a join or subquery at the repository level:
```java
// In DocumentRepository, add:
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
    auditLog.setDetail("{\"error\":\"serialization_failed\",\"raw\":\"" +
            details.toString().replace("\"", "\\\"") + "\"}");
}
```

### WR-05: AuditLogController does not validate or sanitize filter parameters

**File:** `backend/src/main/java/com/micesign/controller/AuditLogController.java:27-37`
**Issue:** The `action` and `targetType` request parameters are passed directly to the specification as string equality checks. While this is not SQL injection (JPA handles parameterization), there is no validation that `action` matches a known `AuditAction` constant or that `targetType` is a valid value. An admin could pass arbitrary strings and get empty results without understanding why. More importantly, `dateFrom` and `dateTo` are not validated relative to each other -- `dateFrom` could be after `dateTo`, producing confusing empty results.
**Fix:** Add basic validation:
```java
if (dateFrom != null && dateTo != null && dateFrom.isAfter(dateTo)) {
    throw new BusinessException("INVALID_DATE_RANGE", "시작일이 종료일보다 이후일 수 없습니다.");
}
```

## Info

### IN-01: Hardcoded Korean strings in PendingApprovalsPage (no i18n)

**File:** `frontend/src/features/approval/pages/PendingApprovalsPage.tsx:29-53`
**Issue:** Page title ("결재 대기"), empty state messages, and table headers are hardcoded Korean strings, unlike `OrgTreePickerModal.tsx` and `PendingList.tsx` which use `useTranslation`. This is inconsistent with the rest of the codebase.
**Fix:** Import and use `useTranslation('approval')` for all user-visible strings, following the pattern in `OrgTreePickerModal.tsx`.

### IN-02: PendingList table headers also hardcoded Korean

**File:** `frontend/src/features/dashboard/components/PendingList.tsx:59-70`
**Issue:** Table headers ("제목", "양식", "기안자", "제출일") are hardcoded Korean strings even though the component already imports and uses `useTranslation('dashboard')` for other strings (lines 9, 17, 19, 37, 49). Inconsistent within the same component.
**Fix:** Replace hardcoded headers with translation keys from the dashboard namespace.

### IN-03: Unused import in AuditLogService

**File:** `backend/src/main/java/com/micesign/service/AuditLogService.java:19`
**Issue:** `java.util.function.Function` is imported but never used.
**Fix:** Remove the unused import: `import java.util.function.Function;`

---

_Reviewed: 2026-04-10T12:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_

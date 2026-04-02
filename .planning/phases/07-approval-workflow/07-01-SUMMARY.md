---
phase: 07-approval-workflow
plan: 01
subsystem: approval-backend
tags: [approval-line, approval-service, sequential-processing, pessimistic-locking]
dependency_graph:
  requires: [04-document-core, 05-file-attachments, 06-document-submission]
  provides: [approval-line-entity, approval-service, approval-controller, approval-endpoints]
  affects: [document-service, document-attachment-service, document-mapper, document-detail-response]
tech_stack:
  added: []
  patterns: [pessimistic-locking, server-side-step-computation, sequential-approval-flow]
key_files:
  created:
    - backend/src/main/java/com/micesign/domain/ApprovalLine.java
    - backend/src/main/java/com/micesign/domain/enums/ApprovalLineType.java
    - backend/src/main/java/com/micesign/domain/enums/ApprovalLineStatus.java
    - backend/src/main/java/com/micesign/repository/ApprovalLineRepository.java
    - backend/src/main/java/com/micesign/dto/document/ApprovalLineRequest.java
    - backend/src/main/java/com/micesign/dto/document/ApprovalLineResponse.java
    - backend/src/main/java/com/micesign/dto/document/ApprovalActionRequest.java
    - backend/src/main/java/com/micesign/dto/document/PendingApprovalResponse.java
    - backend/src/main/java/com/micesign/service/ApprovalService.java
    - backend/src/main/java/com/micesign/controller/ApprovalController.java
    - backend/src/test/java/com/micesign/document/ApprovalLineIntegrationTest.java
    - backend/src/test/java/com/micesign/document/ApprovalProcessIntegrationTest.java
  modified:
    - backend/src/main/java/com/micesign/dto/document/CreateDocumentRequest.java
    - backend/src/main/java/com/micesign/dto/document/UpdateDocumentRequest.java
    - backend/src/main/java/com/micesign/dto/document/DocumentDetailResponse.java
    - backend/src/main/java/com/micesign/service/DocumentService.java
    - backend/src/main/java/com/micesign/service/DocumentAttachmentService.java
    - backend/src/main/java/com/micesign/mapper/DocumentMapper.java
    - backend/src/test/java/com/micesign/document/DocumentSubmitTest.java
    - backend/src/test/java/com/micesign/document/DocumentControllerTest.java
    - backend/src/test/java/com/micesign/document/AttachmentControllerTest.java
decisions:
  - Server-side step_order computation: REFERENCE always gets 0, APPROVE/AGREE get sequential 1,2,3
  - Pessimistic locking on approval line during approve/reject to prevent concurrent processing
  - Remaining PENDING lines stay PENDING on rejection (not changed to SKIPPED) per FSD
  - DocumentMapper updated to 4-arg toDetailResponse to pass approval line data
metrics:
  duration: 12min
  completed: 2026-04-02
---

# Phase 07 Plan 01: Approval Workflow Backend Summary

Complete backend approval workflow: ApprovalLine entity with pessimistic locking, sequential approval processing, approve/reject endpoints, and attachment download access for approval line participants.

## One-liner

Sequential approval workflow backend with pessimistic-locked approve/reject, server-computed step ordering, and 18 integration tests covering full approval lifecycle.

## What Was Built

### Task 1: Entity, Enums, Repository, DTOs, and Approval Line Save/Load

Created the complete data layer for approval lines:

- **Enums**: `ApprovalLineType` (APPROVE, AGREE, REFERENCE) and `ApprovalLineStatus` (PENDING, APPROVED, REJECTED, SKIPPED)
- **Entity**: `ApprovalLine` JPA entity mapping to existing `approval_line` table
- **Repository**: `ApprovalLineRepository` with pessimistic write lock query (`findByIdForUpdate`), pending approvals query, and document-level operations
- **DTOs**: `ApprovalLineRequest`, `ApprovalLineResponse` (with nested `ApproverInfo`), `ApprovalActionRequest`, `PendingApprovalResponse`
- **Extended DTOs**: `CreateDocumentRequest`, `UpdateDocumentRequest` now accept `approvalLines`; `DocumentDetailResponse` now includes `approvalLines`, `sourceDocId`, and `currentStep`
- **DocumentService**: Save/load approval lines with documents, validation (no self-addition, no duplicates, APPROVE required for submit), server-side step_order computation
- **DocumentAttachmentService**: Extended `validateDocumentAccess` for approval line participants (D-20)
- **DocumentMapper**: Updated to 4-arg `toDetailResponse` with approval line mapping methods

### Task 2: ApprovalService + ApprovalController

Built the approval processing engine:

- **ApprovalService.approve()**: Pessimistic lock, validate (submitted status, correct approver, pending status, correct turn), set APPROVED, advance to next step or finalize document
- **ApprovalService.reject()**: Same validations plus mandatory comment check, immediately sets document to REJECTED
- **Sequential processing**: After approve, finds next PENDING APPROVE/AGREE line; if none, document becomes APPROVED
- **getPendingApprovals()**: Returns documents waiting for user's action at current step
- **ApprovalController**: REST endpoints for approve, reject, pending approvals, and completed documents

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Updated existing tests for new record constructors**
- **Found during:** Task 1
- **Issue:** `CreateDocumentRequest` and `UpdateDocumentRequest` changed from 4-arg to 5-arg records, breaking all existing test constructors
- **Fix:** Added `null` as the 5th arg (approvalLines) to all existing test usages
- **Files modified:** DocumentControllerTest.java, DocumentSubmitTest.java

**2. [Rule 1 - Bug] Fixed DocumentSubmitTest for mandatory APPROVE validation**
- **Found during:** Task 1
- **Issue:** Submit now requires at least 1 APPROVE type approval line, causing existing submit tests to fail with APR_NO_APPROVER
- **Fix:** Refactored all submit test helpers to include an APPROVE-type approval line, created test approver user via JdbcTemplate
- **Files modified:** DocumentSubmitTest.java

**3. [Rule 1 - Bug] Added approval_line cleanup to existing test @BeforeEach**
- **Found during:** Task 1
- **Issue:** FK constraint from `approval_line` to `document` prevented document deletion in other test classes' cleanup, causing test interaction failures
- **Fix:** Added `DELETE FROM approval_line` to AttachmentControllerTest, DocumentControllerTest, DocumentSubmitTest @BeforeEach
- **Files modified:** AttachmentControllerTest.java, DocumentControllerTest.java, DocumentSubmitTest.java

## Test Results

Full test suite: 130 tests, all passing (10 new approval tests + 120 existing)

### New Tests (ApprovalLineIntegrationTest - 8 tests)
- createDocumentWithApprovalLines_savesLines
- updateDocumentApprovalLines_replacesLines
- submitDocumentWithoutApprover_returns400
- submitDocumentWithApprover_setsCurrentStep1
- selfAddition_returns400
- duplicateApprover_returns400
- referenceType_getsStepOrder0
- detailAccessibleByApprover
- attachmentDownloadAccessibleByApprover

### New Tests (ApprovalProcessIntegrationTest - 10 tests)
- approveDocument_setsLineApproved
- approveWithComment_savesComment
- rejectDocument_setsDocumentRejected
- rejectWithoutComment_returns400
- sequentialApproval_advancesStep
- approveWrongTurn_returns400
- approveByNonApprover_returns403
- rejectAtStep1_setsRejected_remainingStayPending
- getPendingApprovals_returnsOnlyCurrentTurn
- agreeTypeCanReject

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| 1 | c5e3ba3 | ApprovalLine entity, DTOs, repository, approval line save/load, attachment access extension |
| 2 | 3e7f1e1 | ApprovalService with approve/reject/sequential processing and ApprovalController |

## Known Stubs

None - all endpoints are fully wired to data sources.

## Self-Check: PASSED

All 8 key files verified present. Both commit hashes (c5e3ba3, 3e7f1e1) found in git log. Full test suite (130 tests) green.

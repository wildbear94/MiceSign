# Phase 7: Approval Workflow - Research

**Researched:** 2026-04-02
**Domain:** Sequential approval workflow, drag-and-drop UI, document state machine
**Confidence:** HIGH

## Summary

Phase 7 implements the core approval workflow -- the central value proposition of MiceSign. This requires: (1) a new `ApprovalLine` JPA entity and repository, (2) a new `ApprovalController` with approve/reject endpoints, (3) withdrawal and resubmission logic on `DocumentService`, (4) an approval line editor component using the existing org tree + `@hello-pangea/dnd` for drag-and-drop, (5) approval status display on document detail, and (6) two new list pages (pending approvals, completed documents).

The DB schema (`approval_line` table) already exists in both production and H2 test migrations. The `Document` entity already has `currentStep`, `sourceDocId`, `completedAt`, and all 5 status enum values. The frontend already has `@hello-pangea/dnd` installed, `DepartmentTree` for org navigation, `ConfirmDialog` for action confirmations, and `DocumentStatusBadge` for status display. The main work is connecting these existing pieces with new approval-specific logic.

**Primary recommendation:** Build backend first (entity + service + controller + tests), then frontend (approval line editor, approval actions on detail page, list pages). The sequential approval processing and pessimistic locking are the highest-risk backend components; the approval line editor drag-and-drop is the highest-risk frontend component.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- D-01: Approver selection via organization tree navigation -- reuse existing DepartmentTree component pattern
- D-02: Approval type (APPROVE/AGREE/REFERENCE) selected via dropdown when adding a person
- D-03: Editor placed within document creation/edit page, below attachment area
- D-04: Approval line order changeable via drag-and-drop reordering
- D-05: Minimum 1 APPROVE type approver required for submission
- D-06: Self-addition not allowed -- drafter cannot add themselves
- D-07: Duplicate person not allowed
- D-08: REFERENCE type always step_order=0 -- immediate read access
- D-09: Approval line editable only in DRAFT status
- D-10: Type explanation via tooltips
- D-11: Approval line saved together with document (no separate API)
- D-12: Approve/reject via confirmation dialog with optional comment
- D-13: Rejection requires mandatory comment
- D-14: Approve/reject buttons placed at top of document detail page
- D-15: Document viewable only by people in approval line (drafter + all approvers/agreers/references)
- D-16: AGREE type can also reject
- D-17: Pending approval notification via dashboard (Phase 8)
- D-18: Pending approvals list page in Phase 7
- D-19: Completed documents list page
- D-20: Approvers can download attachments
- D-21: Withdraw button at top of document detail, only when next approver hasn't acted
- D-22: Withdrawal requires confirmation dialog
- D-23: Withdrawn document status WITHDRAWN, completed_at set
- D-24: On withdrawal, PENDING steps changed to SKIPPED
- D-25: Resubmission copies content + approval line, excludes attachments
- D-26: Resubmission tracked via source_doc_id
- D-27: Resubmit button on rejected/withdrawn document detail
- D-28: Vertical step list for approval progress display
- D-29: REFERENCE approvers below separator in status display
- D-30: Document list shows only status badge
- D-31: Approval comments inline with approver in status list
- D-32: Final completion timestamp on approved/rejected/withdrawn documents

### Claude's Discretion
- Specific drag-and-drop library choice -- RESOLVED: `@hello-pangea/dnd` v18.0.1 already installed
- Exact tooltip implementation approach
- API endpoint structure for approval actions
- Approval line data structure in document save payload
- Pending approvals list page URL and routing

### Deferred Ideas (OUT OF SCOPE)
None
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| APR-01 | User can build approval line selecting approvers from org tree (APPROVE, AGREE, REFERENCE types) | DepartmentTree reuse, @hello-pangea/dnd for ordering, Zustand store for state, approval line saved with document |
| APR-02 | APPROVE and AGREE processed sequentially by step_order; REFERENCE gets immediate read access | Backend ApprovalService with current_step tracking, REFERENCE step_order=0 convention, sequential next-step logic |
| APR-03 | Approver can approve or reject with optional comment | POST /api/approvals/{lineId}/approve and /reject endpoints, pessimistic locking, ConfirmDialog with comment field |
| APR-04 | Rejection by any approver immediately sets document to REJECTED | Single rejection -> document REJECTED + completed_at, remaining lines stay PENDING per FSD |
| APR-05 | Final approval sets document to APPROVED | Check if all APPROVE/AGREE steps completed, set APPROVED + completed_at |
| APR-06 | Drafter can withdraw if next approver hasn't acted | POST /api/documents/{id}/withdraw, check current_step PENDING status, set WITHDRAWN + SKIPPED lines |
| APR-07 | Resubmission from rejected/withdrawn with pre-filled content | POST /api/documents/{id}/rewrite, copy content + approval line, exclude attachments, set source_doc_id |
</phase_requirements>

## Standard Stack

### Core (Already Installed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Spring Boot | 3.4.x | Backend framework | Already in use |
| Spring Data JPA | (with Boot) | ApprovalLine entity/repository | Established pattern |
| @hello-pangea/dnd | 18.0.1 | Drag-and-drop for approval line reordering | Already installed, maintained fork of react-beautiful-dnd |
| Zustand | 5.0.12 | Approval line editor state management | Per FSD spec, already in use |
| TanStack Query v5 | 5.95.2 | Approval list data fetching | Already in use |
| Axios | 1.14.0 | HTTP client for approval API | Already in use |
| lucide-react | 1.7.0 | Icons for approval status (Check, Clock, Circle, Pin) | Already in use |

### No Additional Libraries Needed
The existing stack fully covers Phase 7 requirements. No new npm or Gradle dependencies are required.

## Architecture Patterns

### Backend Structure (New Files)
```
backend/src/main/java/com/micesign/
  domain/
    ApprovalLine.java              # NEW: JPA entity
    enums/
      ApprovalLineType.java        # NEW: APPROVE, AGREE, REFERENCE
      ApprovalLineStatus.java      # NEW: PENDING, APPROVED, REJECTED, SKIPPED
  repository/
    ApprovalLineRepository.java    # NEW: with pessimistic lock queries
  service/
    ApprovalService.java           # NEW: approve/reject/pending/completed logic
    DocumentService.java           # MODIFY: add withdraw, rewrite, approval line save
  controller/
    ApprovalController.java        # NEW: /api/v1/approvals endpoints
    DocumentController.java        # MODIFY: add withdraw, rewrite endpoints
  dto/
    approval/
      ApprovalLineRequest.java     # NEW: for document save payload
      ApprovalLineResponse.java    # NEW: for document detail
      ApprovalActionRequest.java   # NEW: { comment }
      PendingApprovalResponse.java # NEW: pending list items
  mapper/
    ApprovalMapper.java            # NEW: entity <-> DTO mapping
```

### Frontend Structure (New Files)
```
frontend/src/features/
  approval/                                # NEW feature module
    api/approvalApi.ts                     # approve/reject/pending/completed APIs
    hooks/useApprovals.ts                  # TanStack Query hooks
    pages/
      PendingApprovalsPage.tsx             # /approvals/pending
      CompletedDocumentsPage.tsx           # /approvals/completed
    types/approval.ts                      # Approval-specific types
  document/
    components/
      approval/                            # NEW subdirectory
        ApprovalLineEditor.tsx             # Main editor component
        ApproverOrgTree.tsx                # Left panel: org tree for selection
        ApprovalLineList.tsx               # Right panel: built line with DnD
        ApprovalLineItem.tsx               # Single draggable approver item
        ApprovalStatusDisplay.tsx          # Vertical step list for detail page
        ApprovalActionBar.tsx              # Approve/Reject/Withdraw buttons
    types/document.ts                      # MODIFY: add approval line types
```

### Pattern 1: Sequential Approval Processing
**What:** Backend tracks `current_step` on document, advances step when all lines at current step complete.
**When to use:** On every approve action.
**Example:**
```java
// In ApprovalService.approve()
@Transactional
public void approve(Long userId, Long lineId, String comment) {
    // 1. Load with pessimistic lock
    ApprovalLine line = approvalLineRepository.findByIdForUpdate(lineId)
        .orElseThrow(() -> new BusinessException("APR_NOT_FOUND", "..."));
    
    // 2. Validate: is this user's line? Is it PENDING? Is document SUBMITTED?
    // 3. Validate: is it this user's turn? (line.stepOrder == document.currentStep)
    
    // 4. Update line
    line.setStatus(ApprovalLineStatus.APPROVED);
    line.setComment(comment);
    line.setActedAt(LocalDateTime.now());
    
    // 5. Check if all lines at current step are done
    // 6. If next step exists -> advance document.currentStep
    // 7. If no next step -> document.status = APPROVED, completedAt = now
}
```

### Pattern 2: Approval Line Editor State (Zustand)
**What:** Local store for the approval line being built, synced with document save.
**When to use:** In document editor page.
**Example:**
```typescript
interface ApprovalLineItem {
  userId: number;
  userName: string;
  departmentName: string;
  positionName: string | null;
  lineType: 'APPROVE' | 'AGREE' | 'REFERENCE';
  stepOrder: number; // computed on save
}

interface ApprovalLineStore {
  lines: ApprovalLineItem[];
  addLine: (user: UserInfo, type: LineType) => void;
  removeLine: (userId: number) => void;
  reorderLines: (fromIndex: number, toIndex: number) => void;
  setLines: (lines: ApprovalLineItem[]) => void;
  reset: () => void;
}
```

### Pattern 3: Document Detail Access Control Extension
**What:** Extend `getDocumentDetail` to allow viewing by approval line participants.
**When to use:** Replace current drafter-only check.
**Example:**
```java
// Current: only drafter can view
// New: drafter OR anyone in approval_line
private boolean canViewDocument(Long userId, Document document) {
    if (document.getDrafter().getId().equals(userId)) return true;
    return approvalLineRepository.existsByDocumentIdAndApproverId(document.getId(), userId);
    // ADMIN of same dept and SUPER_ADMIN checks can be added per FSD
}
```

### Pattern 4: Drag-and-Drop with @hello-pangea/dnd
**What:** DragDropContext wrapping approval line list for reordering.
**When to use:** Approval line editor right panel.
**Example:**
```typescript
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';

function handleDragEnd(result: DropResult) {
  if (!result.destination) return;
  const { source, destination } = result;
  // Reorder using Zustand store
  store.reorderLines(source.index, destination.index);
}
```

### Anti-Patterns to Avoid
- **Separate approval line save API:** D-11 explicitly states approval line saves with document. Do NOT create a separate `/approval-lines` CRUD endpoint.
- **Changing remaining lines to SKIPPED on rejection:** Per FSD, on rejection remaining PENDING lines stay PENDING -- do NOT change them.
- **Allowing REFERENCE type in sequential processing:** REFERENCE is step_order=0, always immediate. Never include in sequential step advancement logic.
- **Trusting client-side step_order:** Server must compute step_order from line position. REFERENCE always gets 0, APPROVE/AGREE get sequential 1, 2, 3...

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Drag-and-drop reordering | Custom mouse event handlers | `@hello-pangea/dnd` (already installed) | Touch support, keyboard accessibility, animation |
| Confirmation dialogs | New dialog component | Existing `ConfirmDialog` component | Established pattern, focus trap, escape handling |
| Org tree navigation | New tree component | Adapt existing `DepartmentTree` + `DepartmentTreeNode` | Already has expand/collapse, keyboard navigation |
| Document status badges | New badge logic | Existing `DocumentStatusBadge` | All 5 statuses already styled |
| Pessimistic locking | Application-level locks | JPA `@Lock(PESSIMISTIC_WRITE)` on repository | DB-level, proven pattern from Phase 6 doc_sequence |

## Common Pitfalls

### Pitfall 1: Race Condition on Concurrent Approvals
**What goes wrong:** Two approvers at the same step_order process simultaneously, both advance document state.
**Why it happens:** Without pessimistic locking, both read PENDING status and both write APPROVED.
**How to avoid:** Use `@Lock(LockModeType.PESSIMISTIC_WRITE)` on the approval_line query, same pattern as `DocSequenceRepository.findByTemplateCodeAndYearForUpdate`.
**Warning signs:** Duplicate state changes in audit log, document advancing past valid steps.

### Pitfall 2: Approval Line Save Payload Integration
**What goes wrong:** Approval line data not included in existing document save/update flow.
**Why it happens:** Current `CreateDocumentRequest` and `UpdateDocumentRequest` don't include approval lines.
**How to avoid:** Extend both request DTOs to include `List<ApprovalLineRequest> approvalLines` (nullable). On update, delete existing lines and re-insert (per FSD: "기존 approval_line 전체 삭제 후 새로 INSERT").
**Warning signs:** Approval lines lost on document save, orphaned approval_line records.

### Pitfall 3: step_order Computation
**What goes wrong:** Client sends arbitrary step_order values, causing gaps or duplicates.
**Why it happens:** Trusting client-side ordering.
**How to avoid:** Server computes step_order: REFERENCE always 0, APPROVE/AGREE get sequential 1, 2, 3 based on list position. Client sends ordered list; server assigns step_order.
**Warning signs:** Gaps in step_order sequence, multiple lines with same step_order (except intentional same-step).

### Pitfall 4: Access Control Regression
**What goes wrong:** Existing document detail endpoint still blocks non-drafter viewers after approval line is built.
**Why it happens:** Current `getDocumentDetail` has hardcoded drafter-only check.
**How to avoid:** Update access control to check: drafter OR approval_line participant. Must be done before approval actions can work (approver needs to view document).
**Warning signs:** 403 errors when approver tries to view document they need to approve.

### Pitfall 5: Withdrawal Condition Edge Case
**What goes wrong:** Drafter withdraws after first approver already approved.
**Why it happens:** Checking document status (SUBMITTED) without checking if current_step approver has acted.
**How to avoid:** Per FSD: withdrawal only allowed if current_step's approver(s) are ALL still PENDING. If any line at current_step is APPROVED/REJECTED, withdrawal is blocked.
**Warning signs:** Document withdrawn after partial approval processing.

### Pitfall 6: @hello-pangea/dnd StrictMode Double Render
**What goes wrong:** DnD breaks in React 18 StrictMode development.
**Why it happens:** StrictMode double-invokes effects, conflicting with DnD's internal state.
**How to avoid:** @hello-pangea/dnd v16+ handles React 18 StrictMode correctly. Version 18.0.1 is safe. No workaround needed.
**Warning signs:** Drag operations not starting or items snapping back.

## Code Examples

### ApprovalLine JPA Entity
```java
@Entity
@Table(name = "approval_line")
public class ApprovalLine {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "document_id", nullable = false)
    private Document document;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "approver_id", nullable = false)
    private User approver;

    @Enumerated(EnumType.STRING)
    @Column(name = "line_type", nullable = false, length = 20)
    private ApprovalLineType lineType;

    @Column(name = "step_order", nullable = false)
    private Integer stepOrder;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private ApprovalLineStatus status = ApprovalLineStatus.PENDING;

    @Column(name = "comment", columnDefinition = "TEXT")
    private String comment;

    @Column(name = "acted_at")
    private LocalDateTime actedAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
    }
    // Getters and setters...
}
```

### ApprovalLineRepository with Pessimistic Lock
```java
public interface ApprovalLineRepository extends JpaRepository<ApprovalLine, Long> {
    List<ApprovalLine> findByDocumentIdOrderByStepOrderAsc(Long documentId);
    
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT al FROM ApprovalLine al WHERE al.id = :id")
    Optional<ApprovalLine> findByIdForUpdate(@Param("id") Long id);
    
    boolean existsByDocumentIdAndApproverId(Long documentId, Long approverId);
    
    // Pending approvals for a user (their turn)
    @Query("SELECT al FROM ApprovalLine al JOIN al.document d " +
           "WHERE al.approver.id = :userId " +
           "AND al.status = 'PENDING' " +
           "AND al.lineType IN ('APPROVE', 'AGREE') " +
           "AND d.status = 'SUBMITTED' " +
           "AND d.currentStep = al.stepOrder " +
           "ORDER BY d.submittedAt ASC")
    Page<ApprovalLine> findPendingByApproverId(@Param("userId") Long userId, Pageable pageable);
    
    void deleteByDocumentId(Long documentId);
}
```

### Approval Line Request DTO (in document save payload)
```java
public record ApprovalLineRequest(
    @NotNull Long approverId,
    @NotNull ApprovalLineType lineType
    // stepOrder computed server-side
) {}
```

### Extended Document Save Payload
```java
// Extend existing CreateDocumentRequest
public record CreateDocumentRequest(
    @NotBlank String templateCode,
    @NotBlank @Size(max = 300) String title,
    String bodyHtml,
    String formData,
    List<ApprovalLineRequest> approvalLines // NEW: nullable for draft
) {}
```

### Frontend: Approval Line Types
```typescript
export type ApprovalLineType = 'APPROVE' | 'AGREE' | 'REFERENCE';
export type ApprovalLineStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'SKIPPED';

export interface ApprovalLineResponse {
  id: number;
  lineType: ApprovalLineType;
  stepOrder: number;
  status: ApprovalLineStatus;
  comment: string | null;
  actedAt: string | null;
  approver: {
    id: number;
    name: string;
    departmentName: string;
    positionName: string | null;
  };
}
```

### API Endpoint Structure (Claude's Discretion)
```
POST   /api/v1/approvals/{lineId}/approve     # Approve action
POST   /api/v1/approvals/{lineId}/reject       # Reject action
GET    /api/v1/approvals/pending               # My pending approvals
GET    /api/v1/approvals/completed             # My completed approvals

POST   /api/v1/documents/{id}/withdraw         # Withdraw (on DocumentController)
POST   /api/v1/documents/{id}/rewrite          # Resubmit (on DocumentController)
```

### Routing (Claude's Discretion)
```
/approvals/pending     -> PendingApprovalsPage
/approvals/completed   -> CompletedDocumentsPage
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| react-beautiful-dnd | @hello-pangea/dnd | 2023 (RBD unmaintained) | Already using correct library |
| Optimistic locking for approvals | Pessimistic locking | N/A (design decision) | Prevents duplicate approval processing |

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | JUnit 5 + Spring Boot Test + MockMvc |
| Config file | `backend/src/test/resources/application-test.yml` |
| Quick run command | `cd backend && ./gradlew test --tests "com.micesign.document.*" -x compileQuerydsl` |
| Full suite command | `cd backend && ./gradlew test -x compileQuerydsl` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| APR-01 | Save document with approval lines | integration | `./gradlew test --tests "com.micesign.document.ApprovalLineTest" -x compileQuerydsl` | Wave 0 |
| APR-02 | Sequential processing (step advancement) | integration | `./gradlew test --tests "com.micesign.document.ApprovalProcessTest" -x compileQuerydsl` | Wave 0 |
| APR-03 | Approve/reject with comment | integration | `./gradlew test --tests "com.micesign.document.ApprovalProcessTest" -x compileQuerydsl` | Wave 0 |
| APR-04 | Rejection sets document REJECTED | integration | `./gradlew test --tests "com.micesign.document.ApprovalProcessTest" -x compileQuerydsl` | Wave 0 |
| APR-05 | Final approval sets APPROVED | integration | `./gradlew test --tests "com.micesign.document.ApprovalProcessTest" -x compileQuerydsl` | Wave 0 |
| APR-06 | Withdrawal when next approver hasn't acted | integration | `./gradlew test --tests "com.micesign.document.DocumentWithdrawTest" -x compileQuerydsl` | Wave 0 |
| APR-07 | Resubmission creates new draft from rejected/withdrawn | integration | `./gradlew test --tests "com.micesign.document.DocumentRewriteTest" -x compileQuerydsl` | Wave 0 |

### Sampling Rate
- **Per task commit:** `cd backend && ./gradlew test --tests "com.micesign.document.*" -x compileQuerydsl`
- **Per wave merge:** `cd backend && ./gradlew test -x compileQuerydsl`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `ApprovalLineTest.java` -- covers APR-01 (save/load approval lines with document)
- [ ] `ApprovalProcessTest.java` -- covers APR-02 through APR-05 (approve/reject/sequential/final)
- [ ] `DocumentWithdrawTest.java` -- covers APR-06 (withdrawal conditions and processing)
- [ ] `DocumentRewriteTest.java` -- covers APR-07 (resubmission content copy)
- [ ] Test cleanup: `@BeforeEach` must add `DELETE FROM approval_line` before `DELETE FROM document_content` / `DELETE FROM document`

## Open Questions

1. **Same step_order for multiple approvers?**
   - What we know: FSD says "현재 step_order에 해당하는 모든 라인이 처리 완료 확인" implying multiple lines can share a step_order
   - What's unclear: CONTEXT.md D-04 says "drag-and-drop reordering" suggesting each approver gets a unique step, but FSD implies parallel approval at same step
   - Recommendation: Implement 1 approver per step_order for MVP simplicity. Each APPROVE/AGREE line gets a unique sequential step_order (1, 2, 3...). This matches the "sequential" approval model described in CONTEXT.md decisions.

2. **Completed documents page scope**
   - What we know: D-19 says "documents drafted by current user that reached APPROVED status"
   - What's unclear: Should this also include REJECTED and WITHDRAWN for completeness?
   - Recommendation: Show only APPROVED per D-19 wording. Users can see REJECTED/WITHDRAWN in "My Documents" page with status filter.

## Sources

### Primary (HIGH confidence)
- `docs/FSD_MiceSign_v1.0.md` -- FN-APR-001 through FN-APR-005, FN-DOC-005 (withdraw), FN-DOC-006 (rewrite)
- `docs/PRD_MiceSign_v2.0.md` -- DB schema DDL, approval_line table definition
- `.planning/phases/07-approval-workflow/07-CONTEXT.md` -- 32 locked decisions
- Existing codebase -- DocumentController, DocumentService, DepartmentTree patterns

### Secondary (MEDIUM confidence)
- `@hello-pangea/dnd` v18.0.1 installed in package.json -- confirmed compatible with React 18
- H2 test migration `V1__create_schema.sql` -- approval_line table exists in test DB

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all libraries already installed, no new dependencies needed
- Architecture: HIGH -- patterns directly extrapolated from existing Phase 4-6 code
- Pitfalls: HIGH -- well-documented approval workflow edge cases, pessimistic locking pattern proven in Phase 6

**Research date:** 2026-04-02
**Valid until:** 2026-05-02 (stable domain, no dependency changes expected)

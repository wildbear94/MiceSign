# Phase 7: Approval Workflow - Context

**Gathered:** 2026-04-02
**Status:** Ready for planning

<domain>
## Phase Boundary

Users can build approval lines, process approvals sequentially, and handle rejections, withdrawals, and resubmissions. This phase delivers:
- Approval line editor (build/edit approval lines on draft documents)
- Sequential approval processing (APPROVE/AGREE step-by-step, REFERENCE immediate)
- Approve/reject actions with comments
- Document state machine completion (SUBMITTED -> APPROVED/REJECTED/WITHDRAWN)
- Withdrawal by drafter (if next approver hasn't acted)
- Resubmission from rejected/withdrawn documents (pre-filled new draft)
- Approval status display on document detail
- Pending approvals list page
- Completed documents list page (drafter's approved documents)

</domain>

<decisions>
## Implementation Decisions

### Approval Line Editor
- **D-01:** Approver selection via **organization tree navigation** — reuse existing `DepartmentTree` component pattern from Phase 3. Left panel: org tree, right panel: built approval line
- **D-02:** Approval type (APPROVE/AGREE/REFERENCE) selected via **dropdown when adding** a person to the approval line
- **D-03:** Editor placed **within document creation/edit page**, below the attachment area section
- **D-04:** Approval line **order changeable via drag-and-drop** reordering
- **D-05:** **Minimum 1 APPROVE type approver required** for submission — validate at submit time
- **D-06:** **Self-addition not allowed** — drafter cannot add themselves to approval line
- **D-07:** **Duplicate person not allowed** — same person cannot appear multiple times
- **D-08:** **REFERENCE type always step_order=0** — immediate read access upon submission, separate from sequential processing
- **D-09:** Approval line editable only in **DRAFT status** — locked after submission (document immutability principle from Phase 6)
- **D-10:** Type explanation via **tooltips** — hover to see description (승인: 결재권자, 합의: 협조 부서, 참조: 열람만)
- **D-11:** Approval line **saved together with document** — no separate API endpoint, included in document save payload

### Approval Processing
- **D-12:** Approve/reject via **confirmation dialog** with optional comment field — reuse SubmitConfirmDialog pattern
- **D-13:** **Rejection requires mandatory comment** — approval comment is optional
- **D-14:** Approve/reject **buttons placed at top of document detail page** — visible without scrolling
- **D-15:** Document viewable only by **people included in approval line** (drafter + all approvers/agreers/references)
- **D-16:** AGREE type **can also reject** — rejection by any APPROVE or AGREE type immediately sets document to REJECTED
- **D-17:** Pending approval notification via **dashboard** (Phase 8) — no email in MVP
- **D-18:** **Pending approvals list page** created in Phase 7 — separate page listing documents waiting for current user's approval action
- **D-19:** **Completed documents list page** — shows documents drafted by current user that reached APPROVED status
- **D-20:** Approvers included in approval line can **download attachments** — extends Phase 5 access control

### Withdrawal & Resubmission
- **D-21:** Withdraw button placed at **top of document detail page** — only visible for drafter when next approver hasn't acted
- **D-22:** Withdrawal requires **confirmation dialog** — prevent accidental withdrawal
- **D-23:** Withdrawn document status set to **WITHDRAWN** — completed_at timestamp set
- **D-24:** On withdrawal, approval line data **preserved** — PENDING steps changed to SKIPPED status
- **D-25:** Resubmission copies **document content + approval line** — title, body, form data, and approval line all copied. Attachments excluded (must re-upload)
- **D-26:** Resubmission tracked via **source_doc_id** — new document links back to original. Display link in document detail
- **D-27:** Resubmit button placed on **rejected/withdrawn document detail page** — creates new DRAFT with pre-filled content

### Approval Status Display
- **D-28:** Document detail shows approval progress as **vertical step list** — each approver with status icon (completed/pending/waiting), comment, and acted_at timestamp
- **D-29:** REFERENCE approvers displayed **below separator line** in approval status — visually separated from APPROVE/AGREE sequence
- **D-30:** Document list shows only **status badge** — existing DocumentStatusBadge component, no inline progress indicator
- **D-31:** Approval comments displayed **next to each approver** in the status list — inline with approver name and status
- **D-32:** **Final completion timestamp** (completed_at) displayed on approved/rejected/withdrawn documents

### Claude's Discretion
- Specific drag-and-drop library choice (dnd-kit, react-beautiful-dnd, etc.)
- Exact tooltip implementation approach
- API endpoint structure for approval actions (approve/reject/withdraw)
- Approval line data structure in document save payload
- Pending approvals list page URL and routing

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Product Requirements
- `docs/PRD_MiceSign_v2.0.md` — Full product requirements including approval workflow specs, DB schema DDL (approval_line table), document state machine
- `docs/FSD_MiceSign_v1.0.md` — Functional specifications with API contracts for approval endpoints, business rules for sequential processing, error codes

### Database Schema
- `backend/src/main/resources/db/migration/V1__create_schema.sql` — approval_line table DDL (document_id, approver_id, line_type ENUM, step_order, status ENUM, comment, acted_at), document table (current_step, source_doc_id, status ENUM, completed_at)

### Prior Phase Context
- `.planning/phases/06-document-submission-numbering/06-CONTEXT.md` — D-11: approval line not required for Phase 6 submission; document immutability principles
- `.planning/phases/04-document-core-templates/04-CONTEXT.md` — Document detail page structure, template form components
- `.planning/phases/05-file-attachments/05-CONTEXT.md` — File attachment access control patterns

### Requirements Mapping
- `.planning/REQUIREMENTS.md` — APR-01 through APR-07 requirement definitions

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `frontend/src/features/admin/components/DepartmentTree.tsx` + `DepartmentTreeNode.tsx` — Org tree rendering with expand/collapse. Adapt for approver selection
- `frontend/src/features/admin/components/ConfirmDialog.tsx` — Confirmation dialog pattern for approve/reject/withdraw actions
- `frontend/src/features/document/components/SubmitConfirmDialog.tsx` — Submit confirmation with validation errors display
- `frontend/src/features/document/components/DocumentStatusBadge.tsx` — Status badge component for document list
- `frontend/src/features/admin/hooks/useDepartments.ts` + `api/departmentApi.ts` — Department data fetching hooks
- `frontend/src/types/admin.ts` — Department/User type definitions with tree structure

### Established Patterns
- **Tree building:** Flat-list-to-recursive with Map-based parent lookup (Phase 3 pattern)
- **Dialog pattern:** ConfirmDialog for destructive actions, SubmitConfirmDialog for submission flows
- **Form save:** Document save API includes content + form_data in single request — extend to include approval line
- **Status enum:** `DocumentStatus` enum with DRAFT/SUBMITTED/APPROVED/REJECTED/WITHDRAWN already defined
- **Access control:** Phase 5 attachment download checks document ownership — extend to approval line membership

### Integration Points
- `backend/src/main/java/com/micesign/domain/Document.java` — Has `currentStep` and `sourceDocId` fields ready for approval workflow
- `backend/src/main/java/com/micesign/domain/enums/DocumentStatus.java` — All 5 statuses defined
- `backend/src/main/java/com/micesign/service/DocumentService.java` — Extend with approval line save/load and state transitions
- `frontend/src/features/document/pages/DocumentDetailPage.tsx` — Add approval status display section
- No `ApprovalLine` JPA entity exists yet — needs creation
- No approval-related API endpoints exist yet — full backend implementation needed

</code_context>

<specifics>
## Specific Ideas

- Approval status icons: checkmark (approved), hourglass (current pending), circle (future pending), pin (reference)
- REFERENCE section visually separated with horizontal line from APPROVE/AGREE sequence
- Vertical step list preferred over horizontal stepper for approval progress display
- Completed documents list is a separate page (not just a filter on existing my-documents list)

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 07-approval-workflow*
*Context gathered: 2026-04-02*

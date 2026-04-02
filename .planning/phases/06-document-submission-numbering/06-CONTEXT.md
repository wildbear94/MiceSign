# Phase 6: Document Submission & Numbering - Context

**Gathered:** 2026-04-02
**Status:** Ready for planning

<domain>
## Phase Boundary

Users can submit draft documents, triggering immutable locking and document number assignment with race-condition protection. This phase covers the submit workflow (DRAFT → SUBMITTED state transition), document numbering (PREFIX-YYYY-NNNN), document immutability enforcement (lock body, attachments, approval line after submission), and Google Drive folder migration for attachments. Approval line building, approval processing, and withdrawal belong to Phase 7.

</domain>

<decisions>
## Implementation Decisions

### Submit Flow UX
- **D-01:** Submit button placed in **editor page header**, next to the existing save button — consistent with DocumentEditorPage layout
- **D-02:** **Confirmation dialog** before submission — warns "제출 후 수정할 수 없습니다" with confirm/cancel. Critical for immutability awareness
- **D-03:** After successful submission, navigate to **document detail page** — user sees assigned document number and SUBMITTED status

### Document Locking & Immutability
- **D-04:** Submitted documents render in **read-only view** — Phase 4 D-16 pattern: DRAFT = edit mode, all other statuses = read-only component rendering. Editor components are not loaded at all
- **D-05:** Attachments in Google Drive **move from temporary to permanent folder** at submission time — `drafts/{docId}/` → `MiceSign/{year}/{month}/{docNumber}/`. Handled within the submit transaction
- **D-06:** Backend returns **403 with error message** ("제출된 문서는 수정할 수 없습니다") when update/delete API called on non-DRAFT documents — extends existing DOC_NOT_DRAFT pattern
- **D-07:** Attachment deletion blocked for submitted documents — backend rejects, frontend hides delete button (Phase 5 D-09 confirmed)

### Document Numbering Strategy
- **D-08:** Prefix uses **template code** from `approval_template.prefix` column — GEN-2026-0001, EXP-2026-0001, LEV-2026-0001. Per-template, per-year sequences via existing `doc_sequence` table
- **D-09:** Concurrency control via **DB-level pessimistic lock** (SELECT FOR UPDATE on doc_sequence row) — safe for ~50 employee scale, simple implementation
- **D-10:** Document number displayed in **both detail page and document list** — detail page header shows full number, list table gets new column. DRAFT documents show "미발급" or "-"

### Submission Validation Rules
- **D-11:** **Approval line not required** for submission in Phase 6 — submit + numbering + locking only. Approval line validation will be added in Phase 7
- **D-12:** **Dual validation** (frontend + backend) for required fields before submission — extends Phase 4 D-19 pattern. Frontend validates first, backend is final guard
- **D-13:** Validation errors shown in **confirmation dialog** — if pre-submit validation fails, errors display in the dialog. User can dismiss, fix, and retry

### Claude's Discretion
- Submit API endpoint design (POST /api/documents/{id}/submit or PATCH with status change)
- DocSequence JPA entity and repository implementation details
- Google Drive folder move implementation (copy+delete vs. Drive API move)
- Flyway migration for any schema additions (e.g., approval_template.prefix column if not exists)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Product Requirements
- `docs/PRD_MiceSign_v2.0.md` — Full PRD with document lifecycle, numbering format (PREFIX-YYYY-NNNN), doc_sequence table DDL, immutability rules
- `docs/FSD_MiceSign_v1.0.md` — Functional spec with submit API contract, document state machine, error codes (DOC_NOT_DRAFT, DOC_SUBMIT_FAILED), business rules

### Database Schema
- `backend/src/main/resources/db/migration/V1__create_schema.sql` — `doc_sequence` table (template_code, year, last_sequence), `document` table (doc_number, status, submitted_at), `approval_template` table (prefix column)

### Existing Code
- `backend/src/main/java/com/micesign/domain/Document.java` — Entity with docNumber, status, submittedAt fields already defined
- `backend/src/main/java/com/micesign/domain/enums/DocumentStatus.java` — DRAFT, SUBMITTED, APPROVED, REJECTED, WITHDRAWN enum
- `backend/src/main/java/com/micesign/service/DocumentService.java` — loadAndVerifyOwnerDraft() helper, existing CRUD methods
- `backend/src/main/java/com/micesign/service/DocumentAttachmentService.java` — Attachment service with Google Drive integration
- `frontend/src/features/document/pages/DocumentEditorPage.tsx` — Editor page where submit button will be added
- `frontend/src/features/document/pages/DocumentDetailPage.tsx` — Detail page where doc number displays
- `frontend/src/features/document/components/DocumentListTable.tsx` — List table where doc number column will be added
- `frontend/src/features/document/types/document.ts` — TypeScript types for document status

### Prior Phase Context
- `.planning/phases/04-document-core-templates/04-CONTEXT.md` — D-16 (status-based view mode), D-19 (dual validation), D-20 (inline messages)
- `.planning/phases/05-file-attachments/05-CONTEXT.md` — D-09 (no delete on submitted), D-10 (backend proxy download), specifics (folder move at submission)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `DocumentStatus` enum — all 5 states already defined, no changes needed
- `Document.docNumber` field — already mapped in JPA entity, just needs to be set at submission
- `Document.submittedAt` field — timestamp field ready for use
- `loadAndVerifyOwnerDraft()` — existing helper validates ownership + DRAFT status, reuse for submit precondition
- `DocumentMapper` — MapStruct mapper for DTO conversion, extend for doc number field
- `ConfirmDialog` component — reusable confirmation dialog from Phase 3
- `DocumentFormValidator` — backend form validation service, can extend for submit-time validation
- Existing Zod schemas for each template — extend for submit-time frontend validation

### Established Patterns
- Feature-based folder structure: `features/document/` already exists with api/, hooks/, components/, pages/
- TanStack Query mutation pattern from document CRUD — replicate for submit action
- MapStruct mappers for DTO conversion
- i18n translations in `public/locales/{lang}/document.json`
- Inline error messages (Phase 4 D-20)

### Integration Points
- `DocumentService` — add `submitDocument()` method with transaction boundary
- `DocumentController` — add submit endpoint
- `DocumentEditorPage` — add submit button in header alongside save
- `DocumentDetailPage` — show document number in header area
- `DocumentListTable` — add doc_number column
- `GoogleDriveService` — use existing service for folder move operations
- `doc_sequence` table — new JPA entity + repository needed

</code_context>

<specifics>
## Specific Ideas

- Phase 5 specifies `MiceSign/drafts/{documentId}/` as temporary folder — submission must move all attachment files to `MiceSign/{year}/{month}/{docNumber}/` and update DB metadata (gdrive_folder column)
- The `approval_template` table may need a `prefix` column if not already present — check V1 DDL and add migration if needed
- Submit is a one-way state transition: no "unsave" or "revert to draft" in this phase. Withdrawal is Phase 7 scope
- Document number format zero-pads sequence to 4 digits: GEN-2026-0001 through GEN-2026-9999

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 06-document-submission-numbering*
*Context gathered: 2026-04-02*

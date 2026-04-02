# Phase 4: Document Core & Templates - Context

**Gathered:** 2026-04-02
**Status:** Ready for planning

<domain>
## Phase Boundary

Users can create, edit, and view draft documents using three form templates (General, Expense, Leave). This phase covers document CRUD for drafts, three hardcoded template components, document list, and document detail viewing. Submission, numbering, approval lines, and file uploads belong to later phases.

</domain>

<decisions>
## Implementation Decisions

### Rich Text Editor
- **D-01:** Use **Tiptap** (ProseMirror-based) for the General form's body editor
- **D-02:** Full feature set — bold, italic, underline, headings, bullet/numbered lists, tables, images, blockquotes
- **D-03:** Output stored as HTML in `document_content.body_html`

### Expense Report (지출 결의서)
- **D-04:** Inline editable table for expense items — rows with add/delete buttons, spreadsheet-like feel
- **D-05:** Currency display: ₩ symbol + comma formatting (e.g., ₩10,000). Input accepts numbers only, display formatted
- **D-06:** Auto-sum total at table footer, recalculated on every cell change

### Leave Request (휴가 신청서)
- **D-07:** Leave types are **extensible** — `leave_type` DB table created via V5 migration with 4 default seeds (연차, 반차, 병가, 경조). Frontend fetches types from API. Admin management UI deferred to later phase
- **D-08:** Half-day (반차) uses **time-based calculation** — start/end time for fractional day computation
- **D-09:** Full-day leave uses date range picker with auto-calculated day count

### Document List & Detail
- **D-10:** Document list uses **table layout** — consistent with Phase 3 user list pattern. Status/template/date columns with filtering
- **D-11:** Document detail is a **dedicated page** at `/documents/:id` — shows full content + approval line status (placeholder) + attachment list (placeholder)

### Form Data Storage
- **D-12:** **Per-template fixed JSON schema** in `document_content.form_data`:
  - EXPENSE: `{items: [{name, qty, unitPrice, amount}], totalAmount}`
  - LEAVE: `{leaveTypeId, startDate, endDate, startTime, endTime, days, reason}`
  - GENERAL: uses `body_html` column, `form_data` is null
- **D-13:** Backend validates JSON structure per template_code on save

### Document Creation Flow
- **D-14:** Template selection via **modal popup** — "새 문서" button opens modal with 3 template cards, selection navigates to editor
- **D-15:** Editor URL: `/documents/new/:templateCode` (e.g., `/documents/new/GENERAL`)
- **D-16:** Existing draft edit URL: `/documents/:id` — same route for view and edit, mode determined by document status (DRAFT = edit mode, others = read-only)

### Draft Auto-Save
- **D-17:** **Debounce 30 seconds** — auto-save after 30s of inactivity. "저장됨" indicator shown. Manual save button also available

### Document Deletion
- **D-18:** DRAFT documents use **physical delete** (hard delete from DB). No soft-delete flag needed for unsubmitted drafts

### Validation
- **D-19:** **Dual validation** — real-time field validation during input (React Hook Form + Zod) + full form validation before API save call

### User Feedback
- **D-20:** **Inline messages** for save success/failure, validation errors, delete confirmation — displayed above/below forms, not toast notifications

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Product Requirements
- `docs/PRD_MiceSign_v2.0.md` — Full PRD with DB schema, architecture decisions, template definitions
- `docs/FSD_MiceSign_v1.0.md` — Functional spec with API contracts, business rules, error codes

### Database Schema
- `backend/src/main/resources/db/migration/V1__create_schema.sql` — Tables: document, document_content, approval_template, doc_sequence, document_attachment

### Existing Patterns
- `frontend/src/features/admin/` — Admin layout, hooks, API client pattern to follow
- `frontend/src/api/client.ts` — Axios client with JWT interceptors
- `frontend/src/types/admin.ts` — Type definition pattern to follow
- `backend/src/main/java/com/micesign/controller/DepartmentController.java` — REST controller pattern
- `backend/src/main/java/com/micesign/service/DepartmentService.java` — Service layer pattern

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `AdminLayout` + `AdminSidebar` — admin area layout (Phase 4 needs a separate document area layout or uses the main layout)
- `ConfirmDialog` — reusable confirmation modal for delete operations
- `Pagination` — table pagination component
- TanStack Query hooks pattern (`useDepartments`, `usePositions`, `useUsers`) — replicate for documents
- API client pattern (`departmentApi.ts`, `positionApi.ts`) — replicate for document/template APIs
- React Hook Form + Zod pattern from Phase 2 login — reuse for template form validation

### Established Patterns
- Feature-based folder structure: `features/{domain}/api/`, `hooks/`, `components/`, `pages/`
- i18n with `public/locales/{lang}/{namespace}.json`
- Admin route guard via `AdminRoute` component — documents need a different guard (any authenticated user)
- MapStruct mappers for DTO conversion on backend

### Integration Points
- `App.tsx` routes — add document routes under `ProtectedRoute` (not admin-only)
- Navigation — need to add document section to main navigation (currently only admin sidebar exists)
- `approval_template` table — seed with GENERAL, EXPENSE, LEAVE via Flyway migration

</code_context>

<specifics>
## Specific Ideas

- Each template is a hardcoded React component registered in a `TEMPLATE_REGISTRY` (per CLAUDE.md architecture decision)
- Leave type extensibility: DB table now, admin UI later — frontend queries API for available types
- Time-based half-day calculation is non-standard — researcher should investigate date-fns or dayjs for time range computation
- Tiptap full features including table and image — researcher should verify Tiptap extension packages needed

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 04-document-core-templates*
*Context gathered: 2026-04-02*

# Phase 5: File Attachments - Context

**Gathered:** 2026-04-02
**Status:** Ready for planning

<domain>
## Phase Boundary

Users can attach files to documents via Google Drive integration. This phase covers file upload to Google Drive (Service Account), download with access control verification, and upload validation (size, count, extension limits). The existing `document_attachment` DB table and frontend placeholder UI from Phase 4 are the integration points.

</domain>

<decisions>
## Implementation Decisions

### Upload UX
- **D-01:** **Drag-and-drop + button** upload — drop zone area with click-to-browse fallback, standard business system pattern
- **D-02:** **Individual progress bars** per file during upload — shows upload %, completion, and failure status for each file
- **D-03:** **Cumulative addition** — selecting new files adds to existing list rather than replacing. Multiple file selection supported via `<input multiple>`

### File Validation & Limits
- **D-04:** **Pre-selection blocking** — validate file size/extension/count at selection time. Non-compliant files are rejected immediately with error message, never added to the list
- **D-05:** **Blacklist policy** for extensions — block executable files (.exe, .bat, .sh, .cmd, .msi, .ps1, .vbs, .js, .jar, .com) only. All document, image, archive, and other file types allowed
- **D-06:** **Always show usage status** — display "파일 3/10개, 45MB/200MB 사용 중" status line in the attachment area at all times
- **D-07:** Limits per PRD: 50MB per file, 10 files per document, 200MB total per document. Frontend enforces first, backend validates as final guard

### Attachment Display
- **D-08:** **File icon + name + size** display — file type icons based on extension (document, image, archive, etc.), filename, and human-readable file size. Chip/card layout
- **D-09:** **X button without confirmation** for delete in draft state — drafts are low-risk, no confirmation dialog needed. Submitted documents have no delete capability (immutability)

### Download & Access Control
- **D-10:** **Backend proxy download** — backend fetches file from Google Drive and streams to frontend. Drive file IDs/URLs never exposed to client
- **D-11:** **Hide download buttons** for unauthorized users — document access itself is controlled; if user can see the document, they can download attachments. Authorization follows document-level access rules
- **D-12:** **No bulk download** in MVP — individual file download only. Max 10 files per document makes this acceptable

### Claude's Discretion
- Backend Google Drive service implementation details (retry logic, error handling, folder creation strategy)
- Frontend component structure for attachment area (how to integrate with existing template forms)
- Upload chunking or streaming strategy for large files

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Product Requirements
- `docs/PRD_MiceSign_v2.0.md` — Full PRD with file attachment specs, Google Drive folder structure (`MiceSign/{year}/{month}/{docNumber}/`), upload limits, DB schema
- `docs/FSD_MiceSign_v1.0.md` — Functional spec with file-related API contracts, error codes, business rules

### Database Schema
- `backend/src/main/resources/db/migration/V1__create_schema.sql` — `document_attachment` table: gdrive_file_id, gdrive_folder, original_name, file_size, mime_type, uploaded_by

### Existing Code (Phase 4 Integration Points)
- `frontend/src/features/documents/components/templates/GeneralForm.tsx` — Attachment placeholder to replace
- `frontend/src/features/documents/components/templates/ExpenseForm.tsx` — Attachment placeholder to replace
- `frontend/src/features/documents/components/templates/LeaveForm.tsx` — Attachment placeholder to replace
- `frontend/src/features/documents/pages/DocumentDetailPage.tsx` — Attachment display placeholder to replace
- `backend/src/main/java/com/micesign/controller/DocumentController.java` — Add attachment endpoints
- `backend/src/main/java/com/micesign/service/DocumentService.java` — Existing document service to extend

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `document_attachment` DB table already exists (V1 migration) — no new migration needed for the table itself
- Phase 4 template forms have attachment placeholder sections ready for replacement
- Axios client with JWT interceptors (`frontend/src/api/client.ts`) — use for multipart upload requests
- TanStack Query hooks pattern from Phase 3/4 — replicate for attachment CRUD
- Feature-based folder structure: `features/documents/` already exists

### Established Patterns
- MapStruct mappers for DTO conversion on backend
- React Hook Form + Zod for validation (can extend for file validation rules)
- i18n translations in `public/locales/{lang}/document.json` — attachment strings already partially defined
- Inline messages for user feedback (D-20 from Phase 4) — apply to upload success/failure

### Integration Points
- Google Drive API v3 via Service Account — new backend dependency (google-api-services-drive)
- Multipart file upload endpoint — new pattern for this project (existing endpoints are JSON-only)
- DocumentController — add upload/download/delete attachment endpoints
- Template form components — replace placeholder sections with real attachment UI

</code_context>

<specifics>
## Specific Ideas

- Google Drive folder structure: `MiceSign/{year}/{month}/{docNumber}/` per PRD. For drafts without document number, use a temporary folder (e.g., `MiceSign/drafts/{documentId}/`) and move on submission
- Service Account credentials file path should be configurable via application.yml
- File type icons: use a simple mapping (pdf -> document icon, jpg/png -> image icon, zip -> archive icon, etc.) rather than fetching actual thumbnails
- Upload should work with draft documents — attachments are saved immediately to Google Drive, not buffered until document save

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 05-file-attachments*
*Context gathered: 2026-04-02*

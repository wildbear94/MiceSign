# Phase 8: Dashboard & Audit - Context

**Gathered:** 2026-04-03
**Status:** Ready for planning

<domain>
## Phase Boundary

This phase delivers two capabilities:
1. **Dashboard** — A home screen showing pending approvals, recent documents, and badge counts for quick overview
2. **Audit logging** — Backend recording of all document state changes and key user actions in an immutable log, plus a basic admin query UI

</domain>

<decisions>
## Implementation Decisions

### Dashboard Layout
- **D-01:** Card grid layout — top row has 3 badge count cards (결재대기, 임시저장, 완료), bottom row has 결재 대기 목록 (left) + 최근 문서 목록 (right) side by side
- **D-02:** Each list shows 5 items max — full list accessible via existing 결재대기/내문서 pages
- **D-03:** '새 문서 작성' button displayed on dashboard top area for quick access

### Badge Count Location
- **D-04:** Badge counts displayed in both MainNavbar ('결재 대기' link) AND dashboard cards — navbar badge is a red circle with count number

### Dashboard Routing
- **D-05:** Home route (/) renders Dashboard page instead of redirecting to /documents/my
- **D-06:** '대시보드' link added as new tab in MainNavbar navigation (not just logo click)

### Empty States
- **D-07:** When no pending approvals, show encouraging empty state message with icon — consistent with existing PendingApprovalsPage pattern (ClipboardCheck icon)

### Count API Design
- **D-08:** Single summary endpoint: GET /api/v1/dashboard/summary → { pendingCount, draftCount, completedCount } — one API call for all badge counts

### Dashboard Data Refresh
- **D-09:** TanStack Query refetchInterval of 60 seconds for auto-refresh of counts and lists

### Audit Log Scope
- **D-10:** Log these actions: document state changes (create, submit, approve, reject, withdraw) + auth events (login, logout) + file operations (upload, download). Admin CRUD actions deferred to Phase 1-C
- **D-11:** Implementation approach: AOP for auth events (login/logout), explicit service-layer calls for document state changes and file operations

### Audit Log UI
- **D-12:** Include basic audit log query UI for SUPER_ADMIN — simple list page with filters (action type, user, date range). This extends beyond AUD-01 (backend only) to partially cover AUD-02 scope

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Product Requirements
- `docs/PRD_MiceSign_v2.0.md` — Full product requirements including Dashboard section and Audit Log DDL
- `docs/FSD_MiceSign_v1.0.md` — Functional specifications with API contracts, business rules, error codes

### Database Schema
- `backend/src/main/resources/db/migration/V1__create_schema.sql` — audit_log table DDL (already exists)

### Existing Domain Code
- `backend/src/main/java/com/micesign/domain/AuditLog.java` — AuditLog entity (already exists)
- `backend/src/main/java/com/micesign/repository/AuditLogRepository.java` — JPA repository (already exists)

### Requirements
- `.planning/REQUIREMENTS.md` — DASH-01, DASH-02, DASH-03, AUD-01 requirement definitions

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `DocumentStatusBadge.tsx` — Status badge component with Tailwind color mapping, dark mode support
- `TemplateBadge.tsx` — Template type badge component
- `PendingApprovalsPage.tsx` — Existing pending approvals page with pagination, empty state pattern
- `CompletedDocumentsPage.tsx` — Existing completed documents page with similar patterns
- `useApprovals.ts` hooks — usePendingApprovals, useCompletedDocuments with TanStack Query
- `approvalApi.ts` — API client for pending/completed approvals
- `Pagination` component — Shared pagination component used across pages

### Established Patterns
- TanStack Query with queryKey patterns like `['approvals', 'pending', page, size]`
- API responses wrapped in `ApiResponse<T>` with success flag
- Spring `Page<T>` for paginated responses
- Lucide React icons for UI elements
- Tailwind CSS with dark mode (`dark:` prefix) support throughout
- i18n via useTranslation hook

### Integration Points
- `frontend/src/App.tsx` — Route registration, currently `/` redirects to `/documents/my`
- `frontend/src/layouts/MainNavbar.tsx` — Navigation links, user info display
- `backend/src/main/java/com/micesign/controller/ApprovalController.java` — Existing approval endpoints
- `backend/src/main/java/com/micesign/service/DocumentService.java` — Document state change methods (audit logging insertion points)
- `backend/src/main/java/com/micesign/service/ApprovalService.java` — Approval processing methods (audit logging insertion points)
- `backend/src/main/java/com/micesign/controller/AuthController.java` — Login/logout endpoints (audit logging insertion points)

</code_context>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches using existing component patterns.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

Note: Admin CRUD audit logging (department/position/user management actions) is deferred to Phase 1-C per PRD phasing.

</deferred>

---

*Phase: 08-dashboard-audit*
*Context gathered: 2026-04-03*

# Phase 8: Dashboard & Audit - Context

**Gathered:** 2026-04-10
**Status:** Ready for planning

<domain>
## Phase Boundary

This phase ensures the dashboard home screen fully satisfies DASH-01/02/03, completes audit log coverage for AUD-01, and adds the missing template management UI to the admin sidebar. No new major features — this is a completeness and gap-filling phase.

</domain>

<decisions>
## Implementation Decisions

### Dashboard (DASH-01, DASH-02, DASH-03)
- **D-01:** Current dashboard layout is sufficient — 3 count cards (pending approvals, drafts, completed) + pending list + recent documents list
- **D-02:** No additional count cards or layout changes needed. Current implementation maps to DASH-03 requirements (pending=결재 대기, drafts=진행 중 초안, completed=완료 문서)
- **D-03:** Current list sizes (latest 5 items) and 60-second auto-refresh are adequate for DASH-01/DASH-02

### Audit Log Completeness (AUD-01)
- **D-04:** Focus on finding and filling gaps in audit log calls — verify ADMIN_USER_EDIT, ADMIN_ORG_EDIT, and any other missing auditLogService.log() calls
- **D-05:** No full audit — only supplement missing calls. Existing logging for DOC_CREATE/SUBMIT/UPDATE/VIEW/APPROVE/REJECT/WITHDRAW, FILE_UPLOAD/DOWNLOAD, USER_LOGIN/LOGOUT is already in place

### Template Management UI (양식 관리)
- **D-06:** Scope is list page with activate/deactivate toggle only — no full CRUD needed since templates are hardcoded React components
- **D-07:** Visible to ADMIN and SUPER_ADMIN roles (consistent with ORG-04 — ADMIN has org/template management permissions)
- **D-08:** Add menu item to AdminSidebar and route in App.tsx. Follow existing admin page patterns (UserListPage, PositionPage)

### Claude's Discretion
- Dashboard component details (styling, spacing) — follow existing DashboardPage patterns
- Audit log gap detection approach — Claude can determine the most efficient way to find missing calls
- Template management page layout — follow existing admin list page patterns

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements
- `docs/PRD_MiceSign_v2.0.md` — Full product requirements with DB schema DDL, DASH-01/02/03 and AUD-01 definitions
- `docs/FSD_MiceSign_v1.0.md` — Functional specifications with API contracts and business rules
- `.planning/REQUIREMENTS.md` — DASH-01, DASH-02, DASH-03, AUD-01 acceptance criteria

### Existing Dashboard Implementation
- `frontend/src/features/dashboard/pages/DashboardPage.tsx` — Current dashboard page
- `frontend/src/features/dashboard/hooks/useDashboard.ts` — Dashboard React Query hooks
- `frontend/src/features/dashboard/components/CountCard.tsx` — Count card component
- `frontend/src/features/dashboard/components/PendingList.tsx` — Pending approvals list
- `frontend/src/features/dashboard/components/RecentDocumentsList.tsx` — Recent documents list
- `frontend/src/features/dashboard/api/dashboardApi.ts` — Dashboard API client
- `backend/src/main/java/com/micesign/controller/DashboardController.java` — Dashboard endpoints
- `backend/src/main/java/com/micesign/service/DashboardService.java` — Dashboard service

### Existing Audit Implementation
- `backend/src/main/java/com/micesign/common/AuditAction.java` — Audit action constants
- `backend/src/main/java/com/micesign/domain/AuditLog.java` — Audit log entity
- `backend/src/main/java/com/micesign/service/AuditLogService.java` — Audit log service with log() and search()
- `backend/src/main/java/com/micesign/aspect/AuditAspect.java` — AOP aspect for login/logout logging
- `backend/src/main/java/com/micesign/controller/AuditLogController.java` — Admin audit log query endpoint (SUPER_ADMIN only)

### Template Management Backend (already exists)
- `backend/src/main/java/com/micesign/controller/AdminTemplateController.java` — Admin template CRUD endpoints

### Admin UI Patterns (reference for template management page)
- `frontend/src/features/admin/components/AdminSidebar.tsx` — Sidebar navigation (add menu item here)
- `frontend/src/features/admin/pages/UserListPage.tsx` — List page pattern to follow
- `frontend/src/features/admin/components/Pagination.tsx` — Pagination component
- `frontend/src/App.tsx` — Route definitions (add admin/templates route)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `DashboardPage` + components: Already implements DASH-01/02/03 — needs verification not rebuilding
- `AuditLogService.log()`: Universal audit logging method with IP/User-Agent extraction
- `AuditAspect`: AOP pattern for cross-cutting audit concerns (login/logout)
- `AdminSidebar`: Navigation component with role-based menu filtering
- `Pagination`: Reusable pagination component for admin pages
- `DocumentStatusBadge`: Badge component pattern to reference for any new status displays

### Established Patterns
- Admin pages: Header + optional filter bar + table + pagination
- React Query hooks: Custom hooks wrapping useQuery with stable query keys
- i18n: Translation files in `public/locales/ko/` with namespace-based keys
- Role-based visibility: `user?.role === 'SUPER_ADMIN'` conditional in sidebar

### Integration Points
- `AdminSidebar.tsx` navItems array: Add template management menu item
- `App.tsx` admin routes: Add `/admin/templates` route
- `admin.json` translation file: Add sidebar.templates key
- Various service classes: Add missing auditLogService.log() calls

</code_context>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches. Follow existing admin page patterns.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 08-dashboard-audit*
*Context gathered: 2026-04-10*

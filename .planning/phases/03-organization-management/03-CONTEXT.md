# Phase 3: Organization Management - Context

**Gathered:** 2026-04-01
**Status:** Ready for planning

<domain>
## Phase Boundary

Admins can manage the company structure — departments (hierarchical), positions (flat ranked list), and user accounts — through admin-only pages. The system enforces role-based access control: SUPER_ADMIN has full access, ADMIN manages org but cannot create/edit ADMIN-role users, USER has no admin access.

Requirements covered: ORG-01, ORG-02, ORG-03, ORG-04

</domain>

<decisions>
## Implementation Decisions

### Admin Navigation
- **D-01:** Left sidebar navigation for admin area with sections: 부서 관리, 직급 관리, 사용자 관리
- **D-02:** Admin sidebar only renders for ADMIN/SUPER_ADMIN roles — completely hidden from USER role
- **D-03:** Backend returns 403 if USER role attempts admin API endpoints (already configured in SecurityConfig)

### Department Management
- **D-04:** Expandable tree view displaying hierarchical departments with collapsible parent-child relationships
- **D-05:** Modal dialog for creating and editing departments (fields: name, parent department dropdown, sort order)
- **D-06:** Deactivation requires confirmation dialog showing affected user count: '이 부서에 N명의 직원이 소속되어 있습니다. 비활성화하시겠습니까?'
- **D-07:** Cannot deactivate a department that has active child departments — must deactivate bottom-up
- **D-08:** No drag-and-drop reordering — sort_order edited in the modal
- **D-09:** Maximum 3 levels of hierarchy depth (e.g. 경영지원부 → 총무팀 → 운영파트)
- **D-10:** Department names must be globally unique (no duplicates anywhere in the tree)
- **D-11:** Member count displayed next to each department name in the tree (e.g. '경영지원부 (5)')
- **D-12:** Simple text filter/search above the tree to find departments by name
- **D-13:** Clicking a department shows a right-side detail panel listing members (name, position, status)
- **D-14:** Deactivated departments shown grayed out with '비활성' badge; admin can toggle filter to hide/show
- **D-15:** Parent selection is optional — no parent = top-level department
- **D-16:** Changing a department's parent (moving) is allowed via edit modal with confirmation showing affected count
- **D-17:** Empty state shows illustration + '부서가 없습니다. 첫 부서를 추가해주세요.' with create button

### User Management
- **D-18:** Paginated table with columns: 사번, 이름, 이메일, 부서, 직급, 역할, 상태 — sortable by clicking column headers
- **D-19:** Filter bar with: department dropdown, role dropdown, status dropdown, and text search for name/email/employee no
- **D-20:** User creation via modal form — admin enters: 사번 (manual, validated unique), 이름, 이메일, 부서(dropdown), 직급(dropdown), 역할(dropdown), 전화번호, and initial password
- **D-21:** Admin sets initial password manually; user must change on first login (per Phase 2 D-29/D-30 force password change)
- **D-22:** Silent account creation — no email notification (SMTP deferred to Phase 1-B)
- **D-23:** Clicking a user row navigates to a user detail page with all profile info + action buttons
- **D-24:** User detail page: read-only by default, click '수정' button to enter edit mode (fields become editable, Save/Cancel appear)
- **D-25:** User detail page integrates Phase 2 standalone components: AdminPasswordResetModal, AdminUnlockButton
- **D-26:** User deactivation: simple confirmation dialog only (no reason field). Audit log records the action per AUD-01
- **D-27:** No bulk actions — individual management sufficient for ~50 employees
- **D-28:** Employee number (사번) manually entered by admin, not auto-generated
- **D-29:** User detail page shows last login time (마지막 로그인) and account creation date from User entity fields
- **D-30:** Column sorting backed by Spring Data Pageable Sort parameter

### RBAC Enforcement
- **D-31:** ADMIN manages all departments (not restricted to own department) — ORG-04 'own dept docs' restriction applies to document access in later phases only
- **D-32:** Only SUPER_ADMIN can create/edit ADMIN-role users or promote someone to ADMIN. ADMIN can only manage USER-role accounts
- **D-33:** No self-deactivation — admin cannot deactivate their own account. Only another ADMIN/SUPER_ADMIN can do it
- **D-34:** Multiple SUPER_ADMIN accounts allowed — no restriction on count
- **D-35:** Last SUPER_ADMIN account protected from demotion or deactivation. Error: '최소 1명의 최고 관리자가 필요합니다.'
- **D-36:** `@PreAuthorize` annotations on backend controllers/services for fine-grained role checks

### Position Management
- **D-37:** Simple table sorted by sort_order (rank) — columns: 직급명, 순서, 상태, 액션
- **D-38:** Modal dialog for creating and editing positions (fields: name, sort order auto-assigned based on position in list)
- **D-39:** Drag-and-drop reordering of rows — sort_order updates automatically on drop
- **D-40:** Deactivation blocked if users are currently assigned to the position: '이 직급에 N명의 직원이 소속되어 있습니다. 먼저 직원의 직급을 변경해주세요.'
- **D-41:** Position names must be globally unique

### Claude's Discretion
- Exact Tailwind styling for admin sidebar, tree view, tables, modals
- Tree view component implementation approach (custom vs library)
- Drag-and-drop library choice for position reordering
- Department tree expand/collapse animation details
- Table pagination component design
- Detail panel slide-in animation
- Filter bar responsive layout
- API endpoint naming within /api/v1/admin/* pattern
- JPA entity relationship design for Department and Position (new entities)
- DTO structure for department tree API responses
- Backend validation logic implementation details

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Product Requirements & Specs
- `docs/PRD_MiceSign_v2.0.md` — Full PRD with DB schema DDL (department table with parent_id hierarchy, position table with sort_order, user table with all managed fields), role definitions
- `docs/FSD_MiceSign_v1.0.md` — Functional spec with org management API contracts, error codes (ORG_001-ORG_xxx), business rules for department/position/user CRUD

### Project Planning
- `.planning/ROADMAP.md` — Phase 3 success criteria, dependency on Phase 2
- `.planning/REQUIREMENTS.md` — ORG-01 through ORG-04 requirement definitions
- `CLAUDE.md` — Tech stack validation, RBAC architecture decisions, QueryDSL for complex queries

### Existing Code (Phase 1 + 2 Foundation)
- `backend/src/main/java/com/micesign/config/SecurityConfig.java` — JWT filter chain with `/api/v1/admin/**` requiring ADMIN/SUPER_ADMIN, `@EnableMethodSecurity` enabled
- `backend/src/main/java/com/micesign/domain/User.java` — User entity with departmentId (Long), positionId (Long) — no JPA relationship to Department/Position entities yet
- `backend/src/main/java/com/micesign/domain/enums/UserRole.java` — SUPER_ADMIN, ADMIN, USER enum
- `backend/src/main/java/com/micesign/domain/enums/UserStatus.java` — ACTIVE, INACTIVE, RETIRED enum
- `backend/src/main/java/com/micesign/repository/UserRepository.java` — Existing user repository
- `backend/src/main/java/com/micesign/security/JwtTokenProvider.java` — JWT claims include role for @PreAuthorize checks
- `backend/src/main/java/com/micesign/security/CustomUserDetails.java` — UserDetails with role-based authorities
- `frontend/src/features/auth/components/AdminPasswordResetModal.tsx` — Standalone admin password reset modal, ready for integration
- `frontend/src/features/auth/components/AdminUnlockButton.tsx` — Standalone admin unlock button, ready for integration
- `frontend/src/components/ProtectedRoute.tsx` — Auth guard for protected routes
- `backend/src/main/resources/db/migration/V1__create_schema.sql` — DDL for department, position, user tables

### Prior Phase Context
- `.planning/phases/02-authentication/02-CONTEXT.md` — Phase 2 decisions including admin components (D-29, D-30), i18n setup, force password change flow

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `AdminPasswordResetModal.tsx` — Phase 2 component for admin password reset; integrate into user detail page action buttons
- `AdminUnlockButton.tsx` — Phase 2 component for unlocking locked accounts; integrate into user detail page
- `ProtectedRoute.tsx` — Auth guard; extend or create admin-specific route guard
- `SecurityConfig.java` — Already has `/api/v1/admin/**` pattern gated; add more fine-grained path rules as needed
- `UserRepository.java` — Existing repository; extend with department-filtered queries, paginated search
- `apiClient` (Axios) — Configured with JWT interceptor; admin API calls use same client

### Established Patterns
- API envelope: `{"success": true, "data": {...}, "error": null}` — all admin endpoints follow this
- API prefix: `/api/v1/admin/*` for admin endpoints
- Layer-first backend: controllers → services → repositories → domain entities
- Feature-folder frontend: create `src/features/admin/` for admin pages/components
- Flyway migrations: add V4+ migrations for any schema changes (new columns, indexes)
- H2 MariaDB mode for integration tests
- i18n via react-i18next — all UI text in translation files (KR/EN)
- Spring Data Pageable for pagination (already established in Phase 1 D-16: page=0, size=20)

### Integration Points
- New JPA entities needed: Department, Position (User entity already exists but needs @ManyToOne relationships)
- New repositories: DepartmentRepository, PositionRepository
- New admin controllers: DepartmentController, PositionController, UserManagementController (separate from existing auth controllers)
- Frontend routing: add `/admin/departments`, `/admin/positions`, `/admin/users`, `/admin/users/:id` routes
- Admin layout: new layout component with sidebar navigation wrapping admin pages
- Phase 2 admin components connect to user detail page via props/callbacks

</code_context>

<specifics>
## Specific Ideas

- Department tree with side detail panel is the core interaction pattern — clicking a department shows its members on the right
- User detail page serves as the hub for all user management actions (edit profile, password reset, unlock, deactivate)
- Drag-and-drop for positions only (simple flat list of ~7 items) — NOT for departments (too complex for tree structure)
- Admin sets initial password directly — aligns with Phase 2 D-29 force password change on first login
- RBAC privilege escalation prevention: ADMIN cannot create ADMIN users — only SUPER_ADMIN can. This is a key security boundary
- Last SUPER_ADMIN protection is a critical safety rail — prevents total admin lockout

</specifics>

<deferred>
## Deferred Ideas

- "Logout all devices" button on user management page — could be Phase 3 or later (noted in Phase 2 deferred)
- Org chart visualization (graphical org tree) — would be a nice-to-have UI feature
- User import from CSV/Excel — could be useful for initial setup but manual entry is fine for ~50 users
- Department move history / audit trail — Phase 1-C audit UI scope

</deferred>

---

*Phase: 03-organization-management*
*Context gathered: 2026-04-01*

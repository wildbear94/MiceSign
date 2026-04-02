---
phase: 03-organization-management
verified: 2026-04-02T10:50:00Z
status: human_needed
score: 4/4 must-haves verified
re_verification: false
gaps:
  - truth: "Admin can create, edit, and deactivate positions with sort ordering"
    status: resolved
    reason: "Resolved — dependency was correctly declared in package.json and lockfile. Build environment node_modules synced via npm install. tsc -b passes cleanly."
human_verification:
  - test: "Department tree interaction"
    expected: "Tree renders with expand/collapse, clicking node shows member list in right panel, create/edit modal works, deactivation with child-check error"
    why_human: "Tree expand/collapse state, member panel loading, and error toast display cannot be verified programmatically without running the app"
  - test: "Position drag-and-drop reordering"
    expected: "Rows can be dragged to reorder, order persists via API call after drop"
    why_human: "Drag-and-drop interaction requires browser; also blocked by missing npm install"
  - test: "User list filtering and sort"
    expected: "Filtering by department/role/status/keyword narrows the table; clicking column header sorts ascending then descending then clears"
    why_human: "API responses and sort cycle behavior require a running backend"
  - test: "RBAC: ADMIN cannot create ADMIN-role users"
    expected: "Role dropdown shows only 'USER' option when logged in as ADMIN"
    why_human: "Dropdown restriction depends on live auth store state"
---

# Phase 3: Organization Management Verification Report

**Phase Goal:** Admins can manage the company structure (departments, positions, users) and the system enforces role-based access
**Verified:** 2026-04-02T10:50:00Z
**Status:** gaps_found
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Admin can create, edit, and deactivate departments in a hierarchical tree | VERIFIED | DepartmentController + DepartmentService with depth/circular-ref validation; DepartmentPage wired to useDepartmentTree hook; 8 controller + 4 service tests pass |
| 2 | Admin can create, edit, and deactivate positions with sort ordering | FAILED | PositionController/Service fully wired and tested (5 tests pass); PositionPage + PositionFormModal exist; PositionTable imports @hello-pangea/dnd which is NOT installed — production build fails |
| 3 | Admin can create and manage user accounts with all required fields | VERIFIED | UserManagementController/Service with full CRUD, paginated filtering, and field validation; UserListPage + UserDetailPage + UserFormModal wired to TanStack Query hooks |
| 4 | SUPER_ADMIN has full access, ADMIN manages org + own dept docs, USER can draft and approve only | VERIFIED | AdminRoute redirects USER role; @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN')") on all admin controllers; service-layer RBAC (ADMIN cannot create/update ADMIN+ users, last SUPER_ADMIN protected); 5 RBAC integration tests pass |

**Score:** 3/4 truths verified

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `backend/.../controller/DepartmentController.java` | Department REST API under /api/v1/admin/departments | VERIFIED | Full CRUD with @PreAuthorize class-level annotation |
| `backend/.../controller/PositionController.java` | Position REST API under /api/v1/admin/positions | VERIFIED | Full CRUD + reorder with @PreAuthorize |
| `backend/.../controller/UserManagementController.java` | User management REST API under /api/v1/admin/users | VERIFIED | Full CRUD with currentUser RBAC injection |
| `backend/.../service/DepartmentService.java` | Department business logic | VERIFIED | Tree building, depth validation (max 3), circular reference detection, deactivation guard |
| `backend/.../service/PositionService.java` | Position business logic | VERIFIED | CRUD, auto-increment sort_order, reorder, deactivation blocked by active users |
| `backend/.../service/UserManagementService.java` | User management business logic | VERIFIED | RBAC enforcement, last SUPER_ADMIN protection, self-deactivation block |
| `frontend/src/components/AdminRoute.tsx` | Role-based route guard | VERIFIED | Checks user.role === 'USER', redirects to / |
| `frontend/src/features/admin/pages/DepartmentPage.tsx` | Department management page | VERIFIED | wired to useDepartmentTree, two-column split layout, search filter, deactivation flow |
| `frontend/src/features/admin/pages/PositionPage.tsx` | Position management page | VERIFIED | wired to usePositions, empty state, deactivation two-state flow |
| `frontend/src/features/admin/components/PositionTable.tsx` | Draggable position table | STUB/BROKEN | Code is substantive but unrunnable — @hello-pangea/dnd not installed; production build fails |
| `frontend/src/features/admin/pages/UserListPage.tsx` | User list page | VERIFIED | wired to useUserList, filter bar, pagination, row navigation |
| `frontend/src/features/admin/pages/UserDetailPage.tsx` | User detail page | VERIFIED | wired to useUserDetail + useUpdateUser + useDeactivateUser; AdminPasswordResetModal and AdminUnlockButton integrated; RBAC guards on deactivate and role dropdown |
| `frontend/src/App.tsx` | Admin routing | VERIFIED | AdminRoute wraps /admin/*, all four admin routes wired to real page components |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| DepartmentController | DepartmentService | constructor injection | WIRED | departmentService injected, all operations delegated |
| UserManagementController | UserManagementService | constructor injection | WIRED | currentUser passed through from @AuthenticationPrincipal |
| App.tsx | AdminRoute | React Router nested routes | WIRED | `<Route element={<AdminRoute />}>` wraps /admin/* |
| AdminLayout | AdminSidebar | component composition | WIRED | AdminSidebar rendered inside AdminLayout |
| DepartmentPage | useDepartmentTree | TanStack Query hook | WIRED | `const { data: departments = [], isLoading } = useDepartmentTree(includeInactive)` |
| PositionTable | useReorderPositions | mutation on drag end | PARTIAL | onReorder prop wired in PositionPage, PositionTable calls onReorder(orderedIds) — logic correct but runtime broken because @hello-pangea/dnd not installed |
| UserListPage | useUserList | TanStack Query hook | WIRED | `const { data, isLoading } = useUserList({ ...filters, sort: sortParam })` |
| UserDetailPage | AdminPasswordResetModal | component import from Phase 2 | WIRED | imported from features/auth/components, isOpen={showPasswordResetModal} — prop name matches component interface |
| UserDetailPage | useUpdateUser | mutation on save | WIRED | `await updateUser.mutateAsync({ id: userId, data })` in onSubmitEdit |

---

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|-------------------|--------|
| DepartmentPage | departments | useDepartmentTree → GET /admin/departments | DepartmentService calls departmentRepository.findAll* with DB query | FLOWING |
| PositionPage | positions | usePositions → GET /admin/positions | PositionService calls positionRepository.findAllByOrderBySortOrderAsc() with user count query | FLOWING |
| UserListPage | data (PageResponse) | useUserList → GET /admin/users | UserManagementService uses JPA Specification with pageable | FLOWING |
| UserDetailPage | user | useUserDetail → GET /admin/users/:id | UserManagementService.getUserById fetches from userRepository | FLOWING |

---

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Backend admin tests pass | `./gradlew test` (admin test suite) | 30/30 tests pass: 8 DepartmentController, 4 DepartmentService, 5 PositionController, 5 UserManagementController, 3 UserManagementService, 5 RbacEnforcement | PASS |
| TypeScript compiles (noEmit) | `npx tsc --noEmit` | Clean — exit code 0 | PASS |
| Production build | `npm run build` (tsc -b + vite build) | FAILS — TS2307: Cannot find module '@hello-pangea/dnd' — 5 errors in PositionTable.tsx | FAIL |
| ADMIN role blocked from /api/v1/admin/* | RbacEnforcementTest.userRoleBlocked_returns403 | 403 Forbidden returned | PASS |
| ADMIN cannot create ADMIN-role user | RbacEnforcementTest.adminCannotCreateAdminRoleUser | 400 AUTH_FORBIDDEN returned | PASS |

---

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| ORG-01 | 03-01-PLAN, 03-03-PLAN | Admin can create, edit, and deactivate departments (hierarchical) | SATISFIED | DepartmentController/Service with depth/circular-ref validation; DepartmentPage with tree UI; 12 backend tests |
| ORG-02 | 03-01-PLAN, 03-03-PLAN | Admin can create, edit, and deactivate positions (with sort order) | PARTIAL | Backend fully implemented and tested; frontend PositionTable blocked by missing @hello-pangea/dnd install |
| ORG-03 | 03-01-PLAN, 03-04-PLAN | Admin can create and manage user accounts (all required fields) | SATISFIED | UserManagementController/Service; UserListPage + UserDetailPage + UserFormModal wired |
| ORG-04 | 03-01-PLAN, 03-02-PLAN, 03-04-PLAN | RBAC: SUPER_ADMIN full access, ADMIN org/template mgmt, USER draft+approve | SATISFIED | AdminRoute, @PreAuthorize, service-layer RBAC, 5 RBAC integration tests |

Note: ORG-05 (seed data on first run) is assigned to Phase 1 per REQUIREMENTS.md traceability table — not in scope for Phase 3. No orphaned requirements.

---

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `frontend/src/App.tsx` | 20-27 | DashboardPlaceholder contains "Dashboard (coming soon)" | Info | Intentionally deferred to Phase 8 — not a Phase 3 gap |
| `frontend/src/features/admin/components/PositionTable.tsx` | 1-2 | `import { DragDropContext, ... } from '@hello-pangea/dnd'` — module not installed | Blocker | Production build fails with 5 TypeScript errors; drag-and-drop reorder cannot execute |

---

### Human Verification Required

### 1. Department Tree Interaction

**Test:** Log in as ADMIN or SUPER_ADMIN, navigate to /admin/departments
**Expected:** Tree renders with expandable/collapsible nodes and member count badges; clicking a node shows members in the right detail panel; clicking "부서 추가" opens the create modal; entering a duplicate name shows ORG_DUPLICATE_NAME error; attempting to deactivate a department with active children shows blocked dialog
**Why human:** Tree expand/collapse state, member panel loading, modal error banner behavior require browser interaction

### 2. Position Drag-and-Drop Reordering

**Test:** After running `npm install` in frontend/, navigate to /admin/positions
**Expected:** Table rows have GripVertical drag handles; dragging a row reorders it; the new order persists after page refresh (confirmed via API call)
**Why human:** Drag interaction requires browser; also currently blocked by missing npm install

### 3. User List Filtering and Sort Cycle

**Test:** Log in and navigate to /admin/users; apply department/role/status filters; type in keyword search; click column headers
**Expected:** Table narrows to matching users; debounced search triggers API call after 300ms pause; column sort cycles asc → desc → none with visible ChevronUp/ChevronDown icons
**Why human:** API response filtering and sort state cycle behavior require a running backend

### 4. RBAC Enforcement in UI — ADMIN Creating Users

**Test:** Log in as ADMIN, navigate to /admin/users, click "사용자 추가"
**Expected:** Role dropdown shows only "일반 사용자 (USER)" option — ADMIN and SUPER_ADMIN options must not be visible
**Why human:** Requires live auth store with ADMIN-role user; cannot verify dropdown state programmatically without rendering

---

### Gaps Summary

One gap blocks goal achievement:

**Production build failure (ORG-02):** The `@hello-pangea/dnd` package is declared in `frontend/package.json` (`^18.0.1`) and present in `package-lock.json`, but the package is not installed in `node_modules`. This causes `tsc -b` (used by `npm run build`) to fail with 5 TypeScript errors in `PositionTable.tsx`. The `npx tsc --noEmit` command (which uses `tsconfig.json` only) passes because the type declarations are discovered via a looser path resolution, but the full production build fails.

The fix is a single command: `cd frontend && npm install`. This does not require any code changes — the dependency declaration is correct, only the install step was missed.

All other phase-3 artifacts are fully implemented and wired. Backend exposes all required endpoints with RBAC enforcement and passes 30 integration tests. Frontend department and user management pages are substantive and correctly wired to their API hooks. The position management logic itself is correct; only the runtime dependency is missing.

---

_Verified: 2026-04-02T10:50:00Z_
_Verifier: Claude (gsd-verifier)_

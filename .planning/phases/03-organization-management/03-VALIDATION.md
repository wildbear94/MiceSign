---
phase: 3
slug: organization-management
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-04-01
---

# Phase 3 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | JUnit 5 + Spring Boot Test (via spring-boot-starter-test) |
| **Config file** | `backend/src/test/resources/application-test.yml` |
| **Quick run command** | `cd backend && ./gradlew test --tests "com.micesign.admin.*" -x check` |
| **Full suite command** | `cd backend && ./gradlew test` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd backend && ./gradlew test --tests "com.micesign.admin.*" -x check`
- **After every plan wave:** Run `cd backend && ./gradlew test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 03-00-01 | 00 | 0 | ORG-01..04 | compilation | `./gradlew compileTestJava` | ⬜ W0 | ⬜ pending |
| 03-01-01 | 01 | 1 | ORG-01 | compilation | `./gradlew compileJava` | n/a | ⬜ pending |
| 03-01-02 | 01 | 1 | ORG-01..04 | compilation | `./gradlew compileJava compileTestJava` | n/a | ⬜ pending |
| 03-01-03 | 01 | 1 | ORG-01 | integration | `./gradlew test --tests "com.micesign.admin.DepartmentControllerTest"` | ⬜ W0 | ⬜ pending |
| 03-01-03 | 01 | 1 | ORG-01 | unit | `./gradlew test --tests "com.micesign.admin.DepartmentServiceTest"` | ⬜ W0 | ⬜ pending |
| 03-01-03 | 01 | 1 | ORG-02 | integration | `./gradlew test --tests "com.micesign.admin.PositionControllerTest"` | ⬜ W0 | ⬜ pending |
| 03-01-03 | 01 | 1 | ORG-03 | integration | `./gradlew test --tests "com.micesign.admin.UserManagementControllerTest"` | ⬜ W0 | ⬜ pending |
| 03-01-03 | 01 | 1 | ORG-04 | unit | `./gradlew test --tests "com.micesign.admin.UserManagementServiceTest"` | ⬜ W0 | ⬜ pending |
| 03-01-03 | 01 | 1 | ORG-04 | integration | `./gradlew test --tests "com.micesign.admin.RbacEnforcementTest"` | ⬜ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Plan 03-00 creates all Wave 0 stubs:

- [ ] `backend/src/test/java/com/micesign/admin/DepartmentControllerTest.java` — stubs for ORG-01 department CRUD (includes `getUserCount_returnsCorrectActiveCount`)
- [ ] `backend/src/test/java/com/micesign/admin/DepartmentServiceTest.java` — stubs for ORG-01 business rules (hierarchy, circular ref prevention)
- [ ] `backend/src/test/java/com/micesign/admin/PositionControllerTest.java` — stubs for ORG-02 position CRUD + reorder
- [ ] `backend/src/test/java/com/micesign/admin/UserManagementControllerTest.java` — stubs for ORG-03 user CRUD + pagination
- [ ] `backend/src/test/java/com/micesign/admin/UserManagementServiceTest.java` — stubs for ORG-04 last SUPER_ADMIN protection
- [ ] `backend/src/test/java/com/micesign/admin/RbacEnforcementTest.java` — stubs for ORG-04 role enforcement
- [ ] Test migration V4 in `backend/src/test/resources/db/testmigration/` — department name unique constraint

---

## Frontend Build Verification

All frontend plans include `npm run build` as a secondary verify step in their final task to catch runtime bundling issues beyond TypeScript type checking:

- Plan 03-02 Task 2: `npx tsc --noEmit && npm run build`
- Plan 03-03 Task 2: `npx tsc --noEmit && npm run build`
- Plan 03-04 Task 2: `npx tsc --noEmit && npm run build`

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Department tree expand/collapse UI | ORG-01 | Visual interaction | Navigate to /admin/departments, verify tree renders with expand/collapse |
| Position drag-and-drop reordering | ORG-02 | Drag interaction | Navigate to /admin/positions, drag a row and verify sort_order updates |
| Admin sidebar visibility by role | ORG-04 | Role-dependent UI | Login as USER role, verify admin sidebar is hidden |
| User detail page layout with Phase 2 components | ORG-03 | Component integration | Navigate to /admin/users/:id, verify password reset and unlock buttons render |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references (Plan 03-00)
- [x] No watch-mode flags
- [x] Feedback latency < 30s
- [ ] `wave_0_complete: true` set after Plan 03-00 executes

**Approval:** pending execution

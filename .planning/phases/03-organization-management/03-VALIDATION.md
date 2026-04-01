---
phase: 3
slug: organization-management
status: draft
nyquist_compliant: false
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
| 03-01-01 | 01 | 1 | ORG-01 | integration | `./gradlew test --tests "com.micesign.admin.DepartmentControllerTest"` | ❌ W0 | ⬜ pending |
| 03-01-02 | 01 | 1 | ORG-01 | unit | `./gradlew test --tests "com.micesign.admin.DepartmentServiceTest"` | ❌ W0 | ⬜ pending |
| 03-01-03 | 01 | 1 | ORG-02 | integration | `./gradlew test --tests "com.micesign.admin.PositionControllerTest"` | ❌ W0 | ⬜ pending |
| 03-01-04 | 01 | 1 | ORG-03 | integration | `./gradlew test --tests "com.micesign.admin.UserManagementControllerTest"` | ❌ W0 | ⬜ pending |
| 03-01-05 | 01 | 1 | ORG-04 | unit | `./gradlew test --tests "com.micesign.admin.UserManagementServiceTest"` | ❌ W0 | ⬜ pending |
| 03-01-06 | 01 | 1 | ORG-04 | integration | `./gradlew test --tests "com.micesign.admin.RbacEnforcementTest"` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `backend/src/test/java/com/micesign/admin/DepartmentControllerTest.java` — stubs for ORG-01 department CRUD
- [ ] `backend/src/test/java/com/micesign/admin/DepartmentServiceTest.java` — stubs for ORG-01 business rules (hierarchy, circular ref prevention)
- [ ] `backend/src/test/java/com/micesign/admin/PositionControllerTest.java` — stubs for ORG-02 position CRUD + reorder
- [ ] `backend/src/test/java/com/micesign/admin/UserManagementControllerTest.java` — stubs for ORG-03 user CRUD + pagination
- [ ] `backend/src/test/java/com/micesign/admin/UserManagementServiceTest.java` — stubs for ORG-04 last SUPER_ADMIN protection
- [ ] `backend/src/test/java/com/micesign/admin/RbacEnforcementTest.java` — stubs for ORG-04 role enforcement
- [ ] Test migration V4 in `backend/src/test/resources/db/testmigration/` — department name unique constraint

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

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending

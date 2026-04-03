---
phase: 8
slug: dashboard-audit
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-03
---

# Phase 8 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | JUnit 5 + MockMvc (backend), Vitest (frontend) |
| **Config file** | `backend/build.gradle` / `frontend/vitest.config.ts` |
| **Quick run command** | `cd backend && ./gradlew test --tests '*Dashboard*' --tests '*Audit*'` |
| **Full suite command** | `cd backend && ./gradlew test && cd ../frontend && npm test` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run quick test command
- **After every plan wave:** Run full suite command
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 08-01-01 | 01 | 1 | DASH-01 | unit | `./gradlew test --tests '*DashboardServiceTest*'` | ❌ W0 | ⬜ pending |
| 08-01-02 | 01 | 1 | DASH-02 | unit | `./gradlew test --tests '*DashboardServiceTest*'` | ❌ W0 | ⬜ pending |
| 08-01-03 | 01 | 1 | DASH-03 | unit | `./gradlew test --tests '*DashboardServiceTest*'` | ❌ W0 | ⬜ pending |
| 08-02-01 | 02 | 1 | AUD-01 | unit | `./gradlew test --tests '*AuditLogServiceTest*'` | ❌ W0 | ⬜ pending |
| 08-03-01 | 03 | 2 | DASH-01 | component | `cd frontend && npx vitest run --reporter=verbose Dashboard` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `backend/src/test/java/.../DashboardServiceTest.java` — stubs for DASH-01, DASH-02, DASH-03
- [ ] `backend/src/test/java/.../AuditLogServiceTest.java` — stubs for AUD-01
- [ ] `frontend/src/features/dashboard/__tests__/` — component test stubs

*Existing test infrastructure (JUnit 5, Vitest) covers framework needs.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Dashboard layout renders correctly | DASH-01 | Visual layout verification | Navigate to `/`, verify pending approvals list, recent docs, and badge counts display |
| Audit log immutability | AUD-01 | Requires DB-level verification | Attempt UPDATE/DELETE on audit_log table — should fail or be absent from service layer |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending

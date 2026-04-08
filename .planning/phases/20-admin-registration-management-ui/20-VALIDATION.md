---
phase: 20
slug: admin-registration-management-ui
status: draft
nyquist_compliant: true
wave_0_complete: true
created: 2026-04-08
---

# Phase 20 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | tsc + vite build (no unit test framework installed) |
| **Config file** | `frontend/tsconfig.json` / `backend/build.gradle` |
| **Quick run command** | `cd frontend && npx tsc --noEmit` |
| **Full suite command** | `cd frontend && npm run build && cd ../backend && ./gradlew compileJava` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd frontend && npx tsc --noEmit` (frontend tasks) or `cd backend && ./gradlew compileJava` (backend tasks)
- **After every plan wave:** Run `cd frontend && npm run build && cd ../backend && ./gradlew compileJava`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 20-01-01 | 01 | 1 | ADM-01 | -- | N/A | compile | `cd frontend && npx tsc --noEmit` | N/A | ⬜ pending |
| 20-01-02 | 01 | 1 | ADM-01 | T-20-01 | SUPER_ADMIN-only sidebar | compile | `cd frontend && npx tsc --noEmit` | N/A | ⬜ pending |
| 20-02-01 | 02 | 2 | ADM-02 | -- | N/A | compile | `cd backend && ./gradlew compileJava` | N/A | ⬜ pending |
| 20-02-02 | 02 | 2 | ADM-02, ADM-03 | T-20-04, T-20-05 | Form validation | compile | `cd frontend && npx tsc --noEmit` | N/A | ⬜ pending |
| 20-02-03 | 02 | 2 | ADM-01, ADM-02, ADM-03 | -- | N/A | manual | Human visual verification | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [x] No unit test framework needed -- TypeScript compilation and build verification suffice for this UI phase
- [x] Backend compilation via Gradle verifies DTO/service changes

*No test stubs required. Verification relies on type-safe compilation and manual browser testing.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| SUPER_ADMIN sidebar navigation | ADM-01 | Visual layout verification | Navigate to /admin/registrations from sidebar |
| Approval modal UX flow | ADM-02 | Multi-step interaction flow | Click pending request -> fill dept/position/empNo -> approve |
| Rejection confirmation dialog | ADM-03 | Dialog interaction + toast | Click reject -> enter reason -> confirm dialog -> verify toast |
| APPROVED assignment info display | ADM-02 (D-11) | Visual data verification | Click approved request -> verify employeeNo/dept/position shown |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify commands (tsc --noEmit / gradlew compileJava)
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references (N/A -- no unit tests needed)
- [x] No watch-mode flags
- [x] Feedback latency < 30s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** pending

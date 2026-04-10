---
phase: 7
slug: approval-workflow
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-04-09
---

# Phase 7 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest (frontend), JUnit 5 + Spring Boot Test (backend) |
| **Config file** | `frontend/vitest.config.ts`, `backend/build.gradle` |
| **Quick run command** | `cd frontend && npx vitest run --reporter=verbose` |
| **Full suite command** | `cd backend && ./gradlew test && cd ../frontend && npx vitest run` |
| **Estimated runtime** | ~60 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd frontend && npx vitest run --reporter=verbose`
- **After every plan wave:** Run `cd backend && ./gradlew test && cd ../frontend && npx vitest run`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 60 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 7-00-01 | 00 | 0 | — | — | N/A | setup | `cd frontend && npx vitest run` | created by task | ⬜ pending |
| 7-00-02 | 00 | 0 | APR-01~07 | — | N/A | stub | `cd frontend && npx vitest run` | created by task | ⬜ pending |
| 7-01-01 | 01 | 1 | APR-01~07 | T-07-02 | Approval line validation | integration | `cd backend && ./gradlew test --tests "com.micesign.document.ApprovalWorkflowTest"` | created by task | ⬜ pending |
| 7-01-02 | 01 | 1 | APR-01,02 | — | N/A | compilation | `cd frontend && npx tsc --noEmit` | N/A | ⬜ pending |
| 7-02-01 | 02 | 2 | APR-01 | T-07-07,08 | Self-add prevention, duplicate check | compilation+stub | `cd frontend && npx tsc --noEmit && npx vitest run` | W0 stubs | ⬜ pending |
| 7-02-02 | 02 | 2 | APR-01,02 | T-07-09 | D-30 save behavior | compilation+stub | `cd frontend && npx tsc --noEmit && npx vitest run` | W0 stubs | ⬜ pending |
| 7-03-01 | 03 | 3 | APR-03~07 | T-07-10~14 | Approve/reject/withdraw/resubmit | compilation+stub | `cd frontend && npx tsc --noEmit && npx vitest run` | W0 stubs | ⬜ pending |
| 7-03-02 | 03 | 3 | APR-01~07 | — | N/A | manual | Human verification | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [x] Plan 07-00 created: Vitest + testing-library setup (Task 1)
- [x] Plan 07-00 created: Frontend approval component test stubs for APR-01~APR-07 (Task 2)
- [ ] Plan 07-00 executed: Test infrastructure installed and configured
- [ ] Plan 07-00 executed: Test stubs pass with `npx vitest run`

*Wave 0 plan (07-00-PLAN.md) creates test infrastructure and behavioral stubs. Backend integration tests are created in Plan 01 Task 1.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Drag-and-drop reorder | APR-01 | DnD library requires browser interaction | Open editor, drag approval line item to reorder, verify stepOrder updates |
| Org tree modal UX | APR-01 | Visual tree interaction | Open modal, expand departments, select user, verify added to approval line |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 60s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** pending execution

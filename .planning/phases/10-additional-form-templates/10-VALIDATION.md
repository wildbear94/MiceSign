---
phase: 10
slug: additional-form-templates
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-03
---

# Phase 10 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest (frontend) / JUnit 5 + Spring Boot Test (backend) |
| **Config file** | `frontend/vitest.config.ts` / `backend/src/test/` |
| **Quick run command** | `cd frontend && npx vitest run --reporter=verbose` / `cd backend && ./gradlew test` |
| **Full suite command** | `cd frontend && npx vitest run && cd ../backend && ./gradlew test` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run quick test for affected layer (frontend or backend)
- **After every plan wave:** Run full suite command
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 10-01-01 | 01 | 1 | TPL-04, TPL-05, TPL-06 | unit | `cd backend && ./gradlew test --tests "*FormValidation*"` | ❌ W0 | ⬜ pending |
| 10-02-01 | 02 | 2 | TPL-04 | unit | `cd frontend && npx vitest run --reporter=verbose PurchaseForm` | ❌ W0 | ⬜ pending |
| 10-02-02 | 02 | 2 | TPL-05 | unit | `cd frontend && npx vitest run --reporter=verbose BusinessTripForm` | ❌ W0 | ⬜ pending |
| 10-02-03 | 02 | 2 | TPL-06 | unit | `cd frontend && npx vitest run --reporter=verbose OvertimeForm` | ❌ W0 | ⬜ pending |
| 10-03-01 | 03 | 3 | TPL-04, TPL-05, TPL-06 | integration | `cd frontend && npx vitest run --reporter=verbose templateRegistry` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] Backend test stubs for Strategy pattern validators
- [ ] Frontend test stubs for 3 new form components (edit + readonly)
- [ ] Zod schema validation tests for 3 new schemas

*Existing test infrastructure from Phase 4 covers framework setup.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Form UI renders correctly with proper layout | TPL-04, TPL-05, TPL-06 | Visual layout verification | Open each form in browser, verify table alignment and responsive behavior |
| Full document lifecycle (draft→submit→approve→view) | TPL-04, TPL-05, TPL-06 | E2E workflow across backend+frontend | Create document with each template, submit, approve, verify read-only view |
| Template cards appear in document creation modal | TPL-04, TPL-05, TPL-06 | UI integration point | Open new document modal, verify 6 template cards visible |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending

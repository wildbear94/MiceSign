---
phase: 15
slug: advanced-logic
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-06
---

# Phase 15 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest (frontend), JUnit 5 + Spring Boot Test (backend) |
| **Config file** | `frontend/vitest.config.ts`, `backend/build.gradle` |
| **Quick run command** | `cd frontend && npx vitest run --reporter=verbose` |
| **Full suite command** | `cd backend && ./gradlew test && cd ../frontend && npx vitest run` |
| **Estimated runtime** | ~45 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd frontend && npx vitest run --reporter=verbose`
- **After every plan wave:** Run full suite command
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 45 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 15-01-01 | 01 | 1 | LOGIC-01 | — | N/A | unit | `npx vitest run` | ❌ W0 | ⬜ pending |
| 15-01-02 | 01 | 1 | LOGIC-02 | — | Circular dependency rejection | unit | `npx vitest run` | ❌ W0 | ⬜ pending |
| 15-02-01 | 02 | 1 | LOGIC-03 | — | N/A | unit | `npx vitest run` | ❌ W0 | ⬜ pending |
| 15-02-02 | 02 | 1 | LOGIC-04 | — | N/A | unit | `npx vitest run` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] Test stubs for conditional logic (show/hide/require)
- [ ] Test stubs for circular dependency detection
- [ ] Test stubs for calculation fields (SUM, MULTIPLY, ADD, COUNT)
- [ ] Test stubs for visual sections

*Existing vitest and JUnit infrastructure covers framework needs.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Drag-and-drop section reordering | LOGIC-04 | Visual interaction | Add section, drag fields into it, verify visual grouping |
| Live preview with conditional fields | LOGIC-01 | Visual rendering | Toggle condition trigger, verify field shows/hides in preview |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 45s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending

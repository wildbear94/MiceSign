---
phase: 7
slug: approval-workflow
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-02
---

# Phase 7 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | JUnit 5 + Spring Boot Test (backend), Vitest (frontend) |
| **Config file** | `backend/build.gradle` / `frontend/vitest.config.ts` |
| **Quick run command** | `cd backend && ./gradlew test --tests "*Approval*"` |
| **Full suite command** | `cd backend && ./gradlew test && cd ../frontend && npm test` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd backend && ./gradlew test --tests "*Approval*"`
- **After every plan wave:** Run `cd backend && ./gradlew test && cd ../frontend && npm test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 07-01-01 | 01 | 1 | APR-01, APR-02 | integration | `./gradlew test --tests "*ApprovalLine*"` | ❌ W0 | ⬜ pending |
| 07-01-02 | 01 | 1 | APR-03, APR-04, APR-05 | integration | `./gradlew test --tests "*ApprovalProcess*"` | ❌ W0 | ⬜ pending |
| 07-01-03 | 01 | 1 | APR-06 | integration | `./gradlew test --tests "*Withdraw*"` | ❌ W0 | ⬜ pending |
| 07-01-04 | 01 | 1 | APR-07 | integration | `./gradlew test --tests "*Resubmi*"` | ❌ W0 | ⬜ pending |
| 07-02-01 | 02 | 2 | APR-01 | component | `cd frontend && npm test -- --grep "ApprovalLine"` | ❌ W0 | ⬜ pending |
| 07-02-02 | 02 | 2 | APR-03 | component | `cd frontend && npm test -- --grep "Approve"` | ❌ W0 | ⬜ pending |
| 07-03-01 | 03 | 2 | APR-01~07 | e2e | Manual verification | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `backend/src/test/java/.../ApprovalLineIntegrationTest.java` — stubs for APR-01, APR-02
- [ ] `backend/src/test/java/.../ApprovalProcessIntegrationTest.java` — stubs for APR-03, APR-04, APR-05
- [ ] `backend/src/test/java/.../WithdrawalIntegrationTest.java` — stubs for APR-06
- [ ] `backend/src/test/java/.../ResubmissionIntegrationTest.java` — stubs for APR-07

*Existing test infrastructure (JUnit 5, Spring Boot Test, H2) covers framework needs.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Drag-and-drop reordering in approval line editor | APR-01 | Browser interaction required | Add 3 approvers, drag to reorder, verify step_order updates |
| Approval status display with icons | APR-02 | Visual verification | Submit document, check vertical step list shows correct icons per status |
| Withdrawal button visibility | APR-06 | Conditional UI state | Submit doc, verify withdraw button visible before next approver acts, hidden after |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending

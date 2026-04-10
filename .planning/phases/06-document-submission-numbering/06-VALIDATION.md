---
phase: 6
slug: document-submission-numbering
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-09
---

# Phase 6 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | JUnit 5 + Spring Boot Test (backend), Vitest (frontend) |
| **Config file** | `backend/src/test/resources/application-test.yml`, `frontend/vitest.config.ts` |
| **Quick run command** | `cd backend && ./gradlew test --tests "*DocumentSubmit*"` |
| **Full suite command** | `cd backend && ./gradlew test && cd ../frontend && npm test` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run quick run command
- **After every plan wave:** Run full suite command
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 06-01-01 | 01 | 1 | DOC-03 | — | Submit changes DRAFT→SUBMITTED | integration | `./gradlew test --tests "*DocumentSubmit*"` | ❌ W0 | ⬜ pending |
| 06-01-02 | 01 | 1 | DOC-04 | — | Immutability enforced post-submit | integration | `./gradlew test --tests "*DocumentImmutab*"` | ❌ W0 | ⬜ pending |
| 06-01-03 | 01 | 1 | DOC-07 | — | Concurrent-safe doc numbering | integration | `./gradlew test --tests "*DocSequence*"` | ❌ W0 | ⬜ pending |
| 06-02-01 | 02 | 2 | DOC-03 | — | Submit button triggers API call | unit | `cd frontend && npm test -- --run` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] Backend integration test stubs for submit/immutability/numbering
- [ ] Frontend unit test stubs for submit flow

---

## Coverage Targets

| Scope | Target | Rationale |
|-------|--------|-----------|
| Submit flow (backend) | 90%+ | Core business logic, race condition safety |
| Immutability enforcement | 100% | Security-critical — must block all edit paths |
| Document numbering | 100% | Data integrity — duplicates break audit trail |
| Frontend submit UI | 70%+ | User-facing interaction, but backend is source of truth |

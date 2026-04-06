---
phase: 16
slug: template-migration
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-06
---

# Phase 16 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | JUnit 5 (backend) / Vitest (frontend) |
| **Config file** | `backend/build.gradle` / `frontend/vitest.config.ts` |
| **Quick run command** | `cd backend && ./gradlew test --tests "*Template*"` / `cd frontend && npx vitest run --reporter=verbose` |
| **Full suite command** | `cd backend && ./gradlew test` / `cd frontend && npx vitest run` |
| **Estimated runtime** | ~30 seconds (backend) / ~15 seconds (frontend) |

---

## Sampling Rate

- **After every task commit:** Run quick test commands
- **After every plan wave:** Run full suite commands
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 45 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 16-01-01 | 01 | 1 | MIGR-01 | — | N/A | integration | `./gradlew test --tests "*SchemaSeeding*"` | ❌ W0 | ⬜ pending |
| 16-01-02 | 01 | 1 | MIGR-01 | — | N/A | unit | `./gradlew test --tests "*DynamicFormValidator*"` | ✅ | ⬜ pending |
| 16-02-01 | 02 | 2 | MIGR-02 | — | N/A | integration | `./gradlew test --tests "*DocumentService*"` | ✅ | ⬜ pending |
| 16-02-02 | 02 | 2 | MIGR-03 | — | N/A | e2e | `npx vitest run --reporter=verbose` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] Schema seeding integration test stubs
- [ ] Existing test infrastructure covers most phase requirements

*Existing infrastructure covers most phase requirements. Only schema-seeding-specific tests needed.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Dynamic form renders visually identical to hardcoded form | MIGR-01 | Visual comparison requires human judgment | Create new document with each of 6 templates, compare side-by-side with existing hardcoded rendering |
| Existing documents display correctly after migration | MIGR-03 | Requires existing test data in specific states | Open drafts and submitted documents created before migration, verify all fields display |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 45s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending

---
phase: 12
slug: schema-foundation
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-05
---

# Phase 12 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | JUnit 5 + Spring Boot Test |
| **Config file** | `backend/src/test/resources/application-test.yml` |
| **Quick run command** | `cd backend && ./gradlew test --tests '*Template*' --tests '*Schema*'` |
| **Full suite command** | `cd backend && ./gradlew test` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd backend && ./gradlew test --tests '*Template*' --tests '*Schema*'`
- **After every plan wave:** Run `cd backend && ./gradlew test`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 12-01-01 | 01 | 1 | SCHM-01 | — | N/A | unit | `./gradlew test --tests '*TemplateSchema*'` | ❌ W0 | ⬜ pending |
| 12-01-02 | 01 | 1 | SCHM-02 | — | N/A | unit | `./gradlew test --tests '*SchemaVersion*'` | ❌ W0 | ⬜ pending |
| 12-01-03 | 01 | 1 | SCHM-03 | — | N/A | unit | `./gradlew test --tests '*FormDataValidat*'` | ❌ W0 | ⬜ pending |
| 12-01-04 | 01 | 1 | SCHM-04 | — | N/A | integration | `./gradlew test --tests '*TemplateApi*'` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `backend/src/test/java/.../template/TemplateSchemaTest.java` — stubs for SCHM-01
- [ ] `backend/src/test/java/.../template/SchemaVersionTest.java` — stubs for SCHM-02
- [ ] `backend/src/test/java/.../template/FormDataValidationTest.java` — stubs for SCHM-03
- [ ] `backend/src/test/java/.../template/TemplateApiIntegrationTest.java` — stubs for SCHM-04

*Existing JUnit 5 + Spring Boot Test infrastructure covers framework requirements.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| H2/MariaDB JSON compatibility | SCHM-01 | DB-specific behavior | Run migration on both H2 (test) and MariaDB (local) |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending

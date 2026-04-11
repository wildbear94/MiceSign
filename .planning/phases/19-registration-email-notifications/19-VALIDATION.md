---
phase: 19
slug: registration-email-notifications
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-08
---

# Phase 19 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | JUnit 5 + Spring Boot Test |
| **Config file** | `backend/src/test/resources/application-test.yml` |
| **Quick run command** | `cd backend && ./gradlew test --tests '*Registration*'` |
| **Full suite command** | `cd backend && ./gradlew test` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd backend && ./gradlew test --tests '*Registration*'`
- **After every plan wave:** Run `cd backend && ./gradlew test`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 19-01-01 | 01 | 1 | MAIL-01 | — | N/A | build | `cd backend && ./gradlew compileJava` | ✅ | ⬜ pending |
| 19-01-02 | 01 | 1 | MAIL-01 | — | N/A | migration | `cd backend && ./gradlew flywayMigrate` | ❌ W0 | ⬜ pending |
| 19-02-01 | 02 | 1 | MAIL-02 | — | N/A | unit | `cd backend && ./gradlew test --tests '*RegistrationEmailService*'` | ❌ W0 | ⬜ pending |
| 19-02-02 | 02 | 1 | MAIL-03 | — | N/A | unit | `cd backend && ./gradlew test --tests '*RegistrationNotificationEvent*'` | ❌ W0 | ⬜ pending |
| 19-03-01 | 03 | 2 | MAIL-04 | — | N/A | integration | `cd backend && ./gradlew test --tests '*RegistrationService*'` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] Test stubs for RegistrationEmailService
- [ ] Test stubs for RegistrationNotificationEvent
- [ ] Flyway migration validation test setup

*Existing infrastructure covers most phase requirements. Wave 0 adds registration-specific test files.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Actual email delivery | MAIL-02, MAIL-03, MAIL-04 | Requires real SMTP server | Configure SMTP, trigger registration actions, verify inbox |
| Email content/formatting | MAIL-02, MAIL-03 | Visual verification | Open received email, check Korean text, layout, links |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending

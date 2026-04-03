---
phase: 9
slug: smtp-email-notifications
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-03
---

# Phase 9 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | JUnit 5 + Spring Boot Test (backend), Vitest (frontend) |
| **Config file** | `backend/src/test/resources/application-test.yml` |
| **Quick run command** | `cd backend && ./gradlew test --tests "*Notification*"` |
| **Full suite command** | `cd backend && ./gradlew test && cd ../frontend && npm test` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd backend && ./gradlew test --tests "*Notification*"`
- **After every plan wave:** Run `cd backend && ./gradlew test && cd ../frontend && npm test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 09-01-01 | 01 | 1 | NTF-04 | unit | `./gradlew test --tests "*EmailService*"` | ❌ W0 | ⬜ pending |
| 09-01-02 | 01 | 1 | NTF-04 | unit | `./gradlew test --tests "*NotificationService*"` | ❌ W0 | ⬜ pending |
| 09-02-01 | 02 | 1 | NTF-01 | integration | `./gradlew test --tests "*NotificationEvent*"` | ❌ W0 | ⬜ pending |
| 09-02-02 | 02 | 1 | NTF-02 | integration | `./gradlew test --tests "*NotificationEvent*"` | ❌ W0 | ⬜ pending |
| 09-02-03 | 02 | 1 | NTF-03 | integration | `./gradlew test --tests "*NotificationEvent*"` | ❌ W0 | ⬜ pending |
| 09-03-01 | 03 | 2 | NTF-05 | unit | `cd frontend && npx vitest run --reporter=verbose notification` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `backend/src/test/java/.../notification/EmailServiceTest.java` — stubs for NTF-04 (SMTP sending + retry)
- [ ] `backend/src/test/java/.../notification/NotificationServiceTest.java` — stubs for NTF-01, NTF-02, NTF-03 (event → notification mapping)
- [ ] `backend/src/test/resources/application-test.yml` — mail test config (host=localhost, port=1025 for MailHog)
- [ ] `frontend/src/test/` — notification log page component tests for NTF-05

*If none: "Existing infrastructure covers all phase requirements."*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Email rendered correctly in Gmail/Outlook | NTF-01 | Visual rendering varies by client | Send test email via MailHog, verify HTML layout |
| Retry delay timing (30s, 60s) | NTF-04 | Timing-dependent behavior | Trigger failure, observe retry intervals in logs |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending

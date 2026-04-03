---
phase: 9
slug: smtp-email-notifications
status: draft
nyquist_compliant: true
wave_0_complete: true
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
| 09-01-01 | 01 | 1 | NTF-04 | unit | `./gradlew compileJava` | ✅ | ⬜ pending |
| 09-01-02 | 01 | 1 | NTF-01~NTF-04 | unit | `./gradlew test --tests "*Notification*" --tests "*EmailService*"` | ✅ | ⬜ pending |
| 09-02-01 | 02 | 2 | NTF-05 | integration | `./gradlew test --tests "*NotificationLogController*"` | ✅ | ⬜ pending |
| 09-03-01 | 03 | 3 | NTF-05 | compile | `cd frontend && npx tsc --noEmit` | ✅ | ⬜ pending |
| 09-03-02 | 03 | 3 | NTF-05 | manual | Human visual verification of email delivery and notification history UI | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Tests are created alongside implementation within each task (test-alongside-implementation strategy). Each plan's tasks include test files in their `<files>` list and test writing in their `<action>`.

- Plan 01 Task 2 creates: `EmailServiceTest.java`, `NotificationServiceTest.java`
- Plan 02 Task 1 creates: `NotificationLogControllerTest.java`

*Existing infrastructure covers all phase requirements via test-alongside-implementation.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Email rendered correctly in Gmail/Outlook | NTF-01 | Visual rendering varies by client | Send test email via MailHog, verify HTML layout |
| Full E2E notification flow | NTF-01~NTF-04 | Requires running services | Plan 03 Task 2 checkpoint with MailHog |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 30s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** pending

---
phase: 5
slug: file-attachments
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-02
---

# Phase 5 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | JUnit 5 + MockMvc (backend), Vitest (frontend) |
| **Config file** | `backend/src/test/resources/application-test.yml`, `frontend/vitest.config.ts` |
| **Quick run command** | `cd backend && ./gradlew test --tests "*Attachment*"` |
| **Full suite command** | `cd backend && ./gradlew test && cd ../frontend && npm test` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd backend && ./gradlew test --tests "*Attachment*"`
- **After every plan wave:** Run `cd backend && ./gradlew test && cd ../frontend && npm test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 5-01-01 | 01 | 1 | FILE-01 | unit | `./gradlew test --tests "*GoogleDriveService*"` | ❌ W0 | ⬜ pending |
| 5-01-02 | 01 | 1 | FILE-01 | unit | `./gradlew test --tests "*DocumentAttachmentService*"` | ❌ W0 | ⬜ pending |
| 5-02-01 | 02 | 1 | FILE-02 | integration | `./gradlew test --tests "*AttachmentController*"` | ❌ W0 | ⬜ pending |
| 5-02-02 | 02 | 1 | FILE-03 | unit | `./gradlew test --tests "*FileValidation*"` | ❌ W0 | ⬜ pending |
| 5-03-01 | 03 | 2 | FILE-01 | component | `cd frontend && npx vitest run --reporter=verbose FileAttachment` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] Backend test stubs for GoogleDriveService, DocumentAttachmentService, AttachmentController
- [ ] Frontend test stubs for FileAttachmentArea component
- [ ] Test fixtures: mock file multipart data, mock Drive API responses

*If none: "Existing infrastructure covers all phase requirements."*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| File actually uploads to Google Drive | FILE-01 | Requires real Service Account credentials | Upload a test file, verify in Google Drive console |
| Download link works in browser | FILE-02 | Browser download behavior | Click download, verify file opens correctly |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending

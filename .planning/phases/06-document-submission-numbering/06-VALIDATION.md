---
phase: 6
slug: document-submission-numbering
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-02
---

# Phase 6 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | JUnit 5 + Spring Boot Test + MockMvc |
| **Config file** | `backend/src/test/resources/application-test.yml` |
| **Quick run command** | `cd backend && ./gradlew test --tests "com.micesign.document.*" -x compileQuerydsl` |
| **Full suite command** | `cd backend && ./gradlew test -x compileQuerydsl` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd backend && ./gradlew test --tests "com.micesign.document.*" -x compileQuerydsl`
- **After every plan wave:** Run `cd backend && ./gradlew test -x compileQuerydsl`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 06-01-01 | 01 | 1 | DOC-03 | integration | `./gradlew test --tests "com.micesign.document.DocumentControllerTest.submitDraft*"` | ❌ W0 | ⬜ pending |
| 06-01-02 | 01 | 1 | DOC-03 | unit | `./gradlew test --tests "com.micesign.document.DocumentServiceTest.generateDocNumber*"` | ❌ W0 | ⬜ pending |
| 06-01-03 | 01 | 1 | DOC-07 | unit | `./gradlew test --tests "com.micesign.document.DocumentServiceTest.concurrentNumbering*"` | ❌ W0 | ⬜ pending |
| 06-01-04 | 01 | 1 | DOC-07 | integration | `./gradlew test --tests "com.micesign.document.DocumentControllerTest.submitFirstOfYear*"` | ❌ W0 | ⬜ pending |
| 06-02-01 | 02 | 1 | DOC-04 | integration | `./gradlew test --tests "com.micesign.document.DocumentControllerTest.updateSubmitted*"` | ❌ W0 | ⬜ pending |
| 06-02-02 | 02 | 1 | DOC-04 | integration | `./gradlew test --tests "com.micesign.document.DocumentControllerTest.deleteSubmitted*"` | ❌ W0 | ⬜ pending |
| 06-02-03 | 02 | 1 | DOC-04 | integration | `./gradlew test --tests "com.micesign.document.DocumentAttachmentServiceTest.upload*Submitted*"` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `backend/src/test/java/com/micesign/document/DocumentSubmitTest.java` — stubs for DOC-03, DOC-04 (submit endpoint, immutability guards)
- [ ] `backend/src/test/java/com/micesign/document/DocSequenceTest.java` — stubs for DOC-07 (numbering format, sequence increment)

*Existing test infrastructure covers framework setup.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Submit confirmation dialog shows warning text | DOC-03 | UI visual | Open editor, click submit, verify "제출 후 수정할 수 없습니다" dialog appears |
| Navigation to detail page after submit | DOC-03 | UI navigation | Submit document, verify redirect to detail page with doc number |
| Document number displays in list as "미발급" for drafts | DOC-04 | UI rendering | View document list, verify DRAFT docs show "-" in number column |
| Google Drive files moved to permanent folder | DOC-03 | External API | Submit document, verify files exist in `MiceSign/{year}/{month}/{docNumber}/` folder |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending

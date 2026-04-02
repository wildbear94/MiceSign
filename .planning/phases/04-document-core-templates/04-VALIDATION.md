---
phase: 4
slug: document-core-templates
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-02
---

# Phase 4 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | JUnit 5 (backend) / Vitest (frontend — if configured) |
| **Config file** | `backend/build.gradle` / `frontend/vitest.config.ts` |
| **Quick run command** | `cd backend && ./gradlew test --tests "*Document*" --tests "*Template*" --tests "*LeaveType*"` |
| **Full suite command** | `cd backend && ./gradlew test` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run quick run command
- **After every plan wave:** Run full suite command
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 04-01-01 | 01 | 1 | DOC-01, TPL-01, TPL-02, TPL-03 | integration | `./gradlew test --tests "*DocumentController*"` | ❌ W0 | ⬜ pending |
| 04-01-02 | 01 | 1 | DOC-02 | integration | `./gradlew test --tests "*DocumentService*"` | ❌ W0 | ⬜ pending |
| 04-02-01 | 02 | 2 | DOC-01 | manual | Browser: template selection modal | N/A | ⬜ pending |
| 04-02-02 | 02 | 2 | TPL-01 | manual | Browser: Tiptap editor renders | N/A | ⬜ pending |
| 04-02-03 | 02 | 2 | TPL-02 | manual | Browser: expense table auto-sum | N/A | ⬜ pending |
| 04-02-04 | 02 | 2 | TPL-03 | manual | Browser: leave date calculation | N/A | ⬜ pending |
| 04-03-01 | 03 | 2 | DOC-05, DOC-06 | manual | Browser: document list + detail page | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `backend/src/test/.../DocumentControllerTest.java` — stubs for DOC-01, DOC-02
- [ ] `backend/src/test/.../DocumentServiceTest.java` — stubs for document CRUD
- [ ] `backend/src/test/.../LeaveTypeControllerTest.java` — stubs for leave type API

*Frontend tests are manual (browser-based) for this phase — template components require visual verification.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Tiptap rich text editing | TPL-01 | WYSIWYG editor requires browser rendering | Create General doc, use bold/italic/table/image |
| Expense auto-sum | TPL-02 | Interactive table with dynamic rows | Add 3+ expense items, verify total recalculates |
| Leave day calculation | TPL-03 | Date picker interaction + time-based half-day | Select date range, verify day count; select 반차, verify time inputs |
| Template selection modal | DOC-01 | Modal UI interaction | Click "새 문서", verify 3 template cards appear |
| Auto-save indicator | DOC-02 | 30s debounce timing | Edit draft, wait 30s, verify "저장됨" indicator |
| Document list filtering | DOC-06 | Table interaction | Verify status/template/date columns render correctly |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending

---
phase: 14
slug: builder-ui
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-05
---

# Phase 14 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
| **Config file** | `frontend/vitest.config.ts` |
| **Quick run command** | `cd frontend && npx vitest run --reporter=verbose` |
| **Full suite command** | `cd frontend && npx vitest run --reporter=verbose` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd frontend && npx vitest run --reporter=verbose`
- **After every plan wave:** Run `cd frontend && npx vitest run --reporter=verbose`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 14-01-01 | 01 | 1 | BLDR-01 | — | N/A | visual | Manual: 3-panel layout renders | ❌ W0 | ⬜ pending |
| 14-01-02 | 01 | 1 | BLDR-02 | — | N/A | integration | Manual: DnD palette→canvas works | ❌ W0 | ⬜ pending |
| 14-02-01 | 02 | 1 | BLDR-03 | — | N/A | integration | Manual: property panel edits field | ❌ W0 | ⬜ pending |
| 14-02-02 | 02 | 1 | BLDR-04 | — | N/A | visual | Manual: preview toggle renders DynamicForm | ❌ W0 | ⬜ pending |
| 14-03-01 | 03 | 2 | BLDR-05 | — | N/A | integration | Manual: template CRUD from management page | ❌ W0 | ⬜ pending |
| 14-03-02 | 03 | 2 | BLDR-06 | — | N/A | integration | Manual: JSON import/export works | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

*Existing infrastructure covers all phase requirements. Phase 14 is primarily UI — verification is visual/integration.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| 3-panel layout renders correctly | BLDR-01 | Visual layout verification | Open /admin/templates/:id/builder, verify 3 panels visible |
| Drag from palette to canvas | BLDR-02 | DnD interaction | Drag text field from palette, verify it appears in canvas |
| Field reorder via drag | BLDR-03 | DnD interaction | Add 2 fields, drag to reorder, verify order changes |
| Property panel edits | BLDR-03 | Form interaction | Select field, change label in property panel, verify update |
| Live preview toggle | BLDR-04 | Visual rendering | Toggle preview, verify DynamicForm renders |
| Template management list | BLDR-05 | CRUD operations | Create/edit/deactivate template from list page |
| JSON import/export | BLDR-06 | File I/O | Export schema, modify, re-import, verify |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending

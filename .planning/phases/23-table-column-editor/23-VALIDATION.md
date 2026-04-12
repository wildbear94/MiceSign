---
phase: 23
slug: table-column-editor
status: draft
nyquist_compliant: true
wave_0_complete: true
created: 2026-04-12
---

# Phase 23 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | TypeScript compiler + Vite build |
| **Config file** | `frontend/tsconfig.json`, `frontend/vite.config.ts` |
| **Quick run command** | `cd frontend && npx tsc --noEmit` |
| **Full suite command** | `cd frontend && npm run build` |
| **Estimated runtime** | ~15 seconds (tsc), ~30 seconds (build) |

---

## Sampling Rate

- **After every task commit:** Run `cd frontend && npx tsc --noEmit`
- **After every plan wave:** Run `cd frontend && npm run build`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 23-01-01 | 01 | 1 | TBL-01 | T-23-01 | max 20 columns enforced | compile | `cd frontend && npx tsc --noEmit` | N/A (existing files) | ⬜ pending |
| 23-01-02 | 01 | 1 | TBL-01 | — | DnD + add/delete/expand | compile | `cd frontend && npx tsc --noEmit` | N/A (new file) | ⬜ pending |
| 23-02-01 | 02 | 2 | TBL-01, TBL-02 | T-23-05 | save guard: columns >= 1 | compile | `cd frontend && npx tsc --noEmit` | N/A (existing + new files) | ⬜ pending |
| 23-02-02 | 02 | 2 | TBL-02 | — | preview renders columns | compile | `cd frontend && npx tsc --noEmit` | N/A (existing file) | ⬜ pending |
| 23-02-03 | 02 | 2 | TBL-01, TBL-02 | — | full UI functional | manual | `cd frontend && npm run build` | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements. No additional test framework setup needed — TypeScript compiler and Vite build serve as the automated verification layer.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| DnD column reorder works visually | TBL-01 | Drag interaction cannot be tested via tsc/build | Add 3+ columns, drag to reorder, verify visual position change |
| Column expand/collapse animation | TBL-01 | Visual interaction | Click column row, verify expand with settings visible |
| Preview table reflects column changes in real-time | TBL-02 | Visual reactivity | Change column label/type, verify preview table updates |
| Save blocked when table has 0 columns | TBL-01 (D-10) | Toast notification + save prevention | Delete all columns from table field, click save, verify error toast |
| Column type-specific config panels render correctly | TBL-01 | Visual layout per type | Switch column type through all 7 types, verify appropriate config UI |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 30s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** pending

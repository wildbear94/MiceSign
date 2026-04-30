---
phase: 36
plan: 04
subsystem: form-row-layout / i18n + integration verify + HUMAN-UAT staging (Wave 4)
tags: [phase-36, wave-4, i18n, integration-test, human-uat, awaiting-sign-off]
requires:
  - "Phase 36-01 (Wave 1 — rowGroup type + Zod refinements + groupFieldsByRow utility)"
  - "Phase 36-02 (Wave 2 — RowPositionSelector + FieldCard wiring + SchemaFieldEditor guard)"
  - "Phase 36-03 (Wave 3 — FormPreview + DynamicCustomForm + DynamicCustomReadOnly grid wiring)"
provides:
  - "13 templates.rowLayout.* Korean i18n keys in ko/admin.json (builder UI consumes via useTranslation('admin'))"
  - "1 mirrored rowLayout.rowGroupAriaLabel key in ko/document.json (renderer consumes via useTranslation('document'))"
  - "HUMAN-UAT checklist with 7 mandatory gates + 2 optional checks + sign-off block"
  - "Automated verification gate evidence: tsc EXIT=0, vitest 85/0 fail, vite build OK, all 13+ Tailwind dynamic-class tokens present in built CSS"
affects:
  - "Phase 36 closing — awaiting HUMAN UAT sign-off (gate=blocking on Plan 04 Task 4 checkpoint)"
  - "ROADMAP.md / STATE.md — to be updated to mark Phase 36 complete after UAT PASS"
  - "v1.2 milestone — Phase 36 closes to make all 9 phases complete (24.1+29+30+31+32+33+34+35+36)"
tech-stack:
  added: []
  patterns:
    - "Korean-only i18n key addition (Phase 32-04 / Phase 34 D-E2 precedent — no en/admin.json mirror)"
    - "Cross-namespace single-key mirror (admin.templates.rowLayout.* + document.rowLayout.rowGroupAriaLabel only) — keeps renderer self-contained"
    - "Built-CSS grep verification of Tailwind static-class enumeration arrays — defense against silent production-build class-detection breakage"
    - "checkpoint:human-verify gate=blocking — automated gates PASS sealed; manual UAT remains as final sign-off"
key-files:
  created:
    - ".planning/phases/36-form-row-layout/36-HUMAN-UAT.md"
    - ".planning/phases/36-form-row-layout/36-04-SUMMARY.md"
  modified:
    - "frontend/public/locales/ko/admin.json"
    - "frontend/public/locales/ko/document.json"
decisions:
  - "D-A2 ENACTED: helper hint copy verbatim from UI-SPEC §i18n Key Contract — pre-empts mobile-fallback confusion (D-E1 mobile 1-col rule made visible to admin)"
  - "D-E2 ENACTED i18n side: Korean-only Korean copy across all 13 keys (Phase 32-04 / Phase 34 D-E2 precedent honored — en/admin.json + en/document.json untouched)"
  - "D-G1 / D-G2 / D-G3 / D-G4 automated gates ALL PASS — full vitest suite zero regression (85 pass identical to Wave 3 baseline)"
  - "D-G5 (manual UAT) STAGED — 7 mandatory gates + 2 optional checks documented; awaiting user sign-off"
  - "Cross-namespace decision: only ONE key (rowGroupAriaLabel) mirrored to ko/document.json. Other 12 keys remain ONLY in admin.json (consumed by builder UI under useTranslation('admin')). Renderer code uses useTranslation('document') for the ARIA key — no cross-namespace gymnastics."
metrics:
  duration: "3m 35s (Tasks 1+2+3 staged; Task 4 awaits human verification)"
  completed: "PENDING — awaiting human UAT sign-off (Task 4 checkpoint:human-verify, gate=blocking)"
  task-count: "3 of 4 staged (Task 4 = HUMAN-UAT execution by user)"
  file-count: 4
  test-count: "0 new (Wave 4 is i18n + integration verify only); full vitest suite 85 pass / 0 fail / 39 todo / 4 skipped — zero regression vs. Wave 3 baseline"
---

# Phase 36 Plan 04: i18n + Integration Verification + HUMAN-UAT Staging Summary

**Status:** AWAITING HUMAN UAT (Task 4 checkpoint:human-verify, gate=blocking)

**One-liner:** Wave 4 closes Phase 36 by adding the 13 Korean `templates.rowLayout.*` i18n keys to `ko/admin.json` (consumed by builder UI) plus the single mirrored `rowLayout.rowGroupAriaLabel` key to `ko/document.json` (consumed by renderer ARIA), running the full integration verification chain (`tsc --noEmit` 0 errors / `vitest run` 85 pass 0 fail same as Wave 3 baseline / `vite build` 697ms OK) with explicit grep confirmation that all 13+ dynamic Tailwind class tokens (md:grid-cols-1/2/3, ROW_GROUP_BORDER_CLASSES 4 colors + dark variants, ROW_GROUP_PILL_CLASSES 4 colors + dark variants, animate-pulse, ring-red-500) are present in the built CSS bundle, and authoring `36-HUMAN-UAT.md` with 7 mandatory visual gates covering D-A1/A2/A3/B1/C1/C2/C4/D1/D4/E1/E2/F2/F3/G5 — at which point execution pauses for the user to physically verify the builder + renderer surfaces and sign off PASS or FAIL.

## Files Created (2)

| File | Purpose |
|------|---------|
| `.planning/phases/36-form-row-layout/36-HUMAN-UAT.md` | 7-gate manual UAT checklist + 2 optional checks + sign-off block. Covers builder pill selector / hard-cap-3 flash / md+ grid / sm 1-col / wide-type guard / legacy zero-shift / FormPreview live reflection + dark-mode spot check + Phase 24.1 conditional-rule regression check. |
| `.planning/phases/36-form-row-layout/36-04-SUMMARY.md` | (this file) |

## Files Modified (2)

| File | Change |
|------|--------|
| `frontend/public/locales/ko/admin.json` | Added new sub-tree `templates.rowLayout` with 13 keys (sectionLabel / singleButton / rowButton with `{{number}}` / newRowButton / helperHint / rowFullTooltip / rowFullToast / wideTypeAutoSingleToast / wideTypeBadge / rowGroupBadge with `{{number}}` / rowGroupAriaLabel with `{{number}}` / zodWideTypeError / zodCapExceededError) — placed AFTER existing `templates.calculation` sub-tree. JSON validity verified via `JSON.parse`. |
| `frontend/public/locales/ko/document.json` | Added top-level `rowLayout` sub-tree with 1 key: `rowGroupAriaLabel: "{{number}}행 그룹"` — placed near top after `pageTitle`. Mirror needed because DynamicCustomForm + DynamicCustomReadOnly use `useTranslation('document')`. |

## Test Results — Automated Gates (Tasks 1+2+3)

| Test / gate | Status | Notes |
|-------------|--------|-------|
| JSON parse — `ko/admin.json` | OK | `JSON.parse` succeeds; `templates.rowLayout` has exactly 13 keys |
| JSON parse — `ko/document.json` | OK | `JSON.parse` succeeds; `rowLayout.rowGroupAriaLabel` resolved to `"{{number}}행 그룹"` |
| `npx tsc --noEmit` | EXIT=0 | Zero type errors |
| `npx vitest run` (full suite) | 85 pass / 0 fail / 39 todo / 4 skipped | **ZERO regression vs. Wave 3 baseline** (identical count) |
| `npm run build` (vite + tsc -b) | 697ms, build OK | Pre-existing chunk-size warning unchanged |
| Built CSS — `md:grid-cols-{1,2,3}` | 3/3 present | All 3 escaped selectors found in `dist/assets/index-3XzG2B6O.css` |
| Built CSS — `border-l-{blue,emerald,violet,amber}-400` (light) | 4/4 present | Cycle indices 0–3 all detected by Tailwind |
| Built CSS — `border-l-{blue,emerald,violet,amber}-500` (dark) | 4/4 present | Dark-mode cycle variants detected |
| Built CSS — `bg-{blue,emerald,violet,amber}-100` (light pills) | 4/4 present | Cycle pill backgrounds detected |
| Built CSS — `bg-{blue,emerald,violet,amber}-900/40` (dark pills) | 4/4 present | Escaped `\\/40` slash matched correctly |
| Built CSS — `animate-pulse` + `ring-red-500` | 2/2 present | Hard-cap-3 violation flash classes confirmed |
| `en/*` files NOT modified | PASSED | Korean-only precedent honored |

**Threat T-36-19 mitigation operational:** Built-CSS grep verifies all 13+ dynamic Tailwind class tokens that depend on `ROW_GROUP_BORDER_CLASSES` / `ROW_GROUP_PILL_CLASSES` / `GRID_COLS_CLASS` static array enumeration are detected by the Tailwind compile-time scanner. Production CSS gap risk eliminated.

## TDD Gate Compliance

Wave 4 is i18n + integration verification — no production runtime code changes, no new tests. The plan's `<verify><automated>` blocks pass through native gates only:

1. JSON validity (`JSON.parse` does not throw) — pinned at end of Task 1.
2. tsc clean — pinned at start of Task 2.
3. Full vitest suite zero regression — pinned mid-Task 2 (Wave 3 already pinned 85-pass baseline; Wave 4 confirms identical count).
4. Vite build succeeds — pinned at end of Task 2.
5. Built CSS grep — pinned at end of Task 2 (Threat T-36-19 mitigation evidence).
6. UAT checklist exists with 7 gates + sign-off block — pinned at end of Task 3.
7. **HUMAN UAT sign-off (Task 4) — STAGED, awaiting user.**

| Gate | Commit | Status |
|------|--------|--------|
| Task 1 (i18n catalog additions) | `86731a0` | JSON parse OK, 13 keys + 1 mirror confirmed, tsc clean |
| Task 2 (integration verify) | (no commit — verification only) | tsc 0 errors, vitest 85/0 fail (same as Wave 3 baseline), build OK, all 13+ CSS tokens present |
| Task 3 (UAT staging) | `a03bd59` | UAT.md exists with 7 gates + sign-off block + PASS/FAIL decision capture |
| Task 4 (HUMAN UAT execution) | PENDING | Awaiting user sign-off via 7 mandatory gates |

**Note on Task 2 commit absence:** The plan's `<files>` declared "(verification only — no file modifications expected)" — verification ran successfully and produced no diff to commit. Per `task_commit_protocol`'s "If there are no changes to commit, do not create an empty commit" rule, no `test(36-04)` commit was created. The verification evidence is captured in this SUMMARY's "Test Results — Automated Gates" table and confirmed via the final docs commit's working-tree state.

## Commits (2 + 1 final docs)

| Hash | Commit message |
|------|----------------|
| `86731a0` | `feat(36-04): add 13 templates.rowLayout.* i18n keys + document mirror` |
| `a03bd59` | `docs(36-04): stage HUMAN-UAT checklist with 7 gates + 2 optional checks` |
| (pending) | `docs(36-04): tasks 1+2+3 PASS + UAT checklist staged (awaiting human sign-off)` (final commit captures SUMMARY + STATE/ROADMAP — pending until UAT PASS or after staging) |

## i18n Key Coverage

All 13 keys consumed by Wave 1/2/3 production code now resolve at runtime:

**Wave 1 (Zod) → keys:**
- `templates.rowLayout.zodWideTypeError` → `긴 텍스트와 표 필드는 행 그룹에 속할 수 없습니다`
- `templates.rowLayout.zodCapExceededError` → `한 줄에는 최대 3개 필드까지만 배치할 수 있습니다`

**Wave 2 (builder UI) → keys:**
- `templates.rowLayout.singleButton` → `단독`
- `templates.rowLayout.rowButton` → `행 {{number}}` (interpolated as 행 1, 행 2, ...)
- `templates.rowLayout.newRowButton` → `+ 새 행`
- `templates.rowLayout.rowFullTooltip` → `이 행은 이미 3개 필드가 가득 찼습니다`
- `templates.rowLayout.rowFullToast` → `한 줄에는 최대 3개 필드까지 배치할 수 있습니다`
- `templates.rowLayout.sectionLabel` → `행 위치`
- `templates.rowLayout.helperHint` → `같은 '행' 의 필드들이 한 줄에 가로 배치됩니다 (모바일에서는 한 줄로 표시됩니다)`
- `templates.rowLayout.rowGroupBadge` → `{{number}}행`
- `templates.rowLayout.wideTypeBadge` → `한 줄 차지`
- `templates.rowLayout.wideTypeAutoSingleToast` → `이 필드는 한 줄을 차지하는 필드라 행 그룹에서 빠집니다`

**Wave 3 (renderer ARIA) → keys (cross-namespace):**
- `admin.templates.rowLayout.rowGroupAriaLabel` → `{{number}}행 그룹` (used by FormPreview which is in admin namespace)
- `document.rowLayout.rowGroupAriaLabel` → `{{number}}행 그룹` (used by DynamicCustomForm + DynamicCustomReadOnly via `useTranslation('document')`)

**Total runtime keys for Phase 36:** 13 in admin namespace + 1 mirrored ARIA in document namespace = **14 distinct key paths, but 13 unique Korean copy strings** (the ARIA mirror reuses the same Korean copy).

## HUMAN-UAT Gate Coverage

The 7 mandatory gates cover the following decisions/requirements per `36-CONTEXT.md` + `36-UI-SPEC.md`:

| Gate | Decisions covered | What user verifies |
|------|-------------------|--------------------|
| Gate 1 — Builder pill selector | D-A1, D-A2, D-F2 | RowPositionSelector renders, helper hint visible, pill selection cycles colored border + pill |
| Gate 2 — Hard-cap-3 flash | D-F3, T-36-06 | Visual disable + tooltip + 200ms flash + sonner toast on cap violation click |
| Gate 3 — md+ grid | D-B1, D-E1, D-E2 | 3 fields side-by-side at md+, `<div role="group">` wrapper present, gap-4 + min-w-0 |
| Gate 4 — sm 1-col fallback | D-E1 | Below 768px, all fields stack vertically, no horizontal scroll |
| Gate 5 — Wide-type guard | D-C1, D-C2, D-C4, T-36-09 | Type→textarea/table auto-clears rowGroup + amber badge + selector hidden + toast |
| Gate 6 — Legacy zero-shift | D-D1, D-D4 | Pre-Phase-36 SUBMITTED docs render identically (no `role="group"` wrappers, vertical stack) |
| Gate 7 — FormPreview live reflection | D-A3 | Builder pill click → preview pane reflects row group instantly without save |
| Optional Dark Mode | UI-SPEC plan-checker FLAG | All 4-color cycle dark variants visible; no light-on-light contrast issues |
| Optional Conditional/Calc Regression | D-G4, Phase 24.1 D-19 | Hidden cell within row group leaves siblings in their columns (no reflow); calc rules still compute correctly |

## Decisions Reaffirmed

- **D-E2 i18n Korean-only:** All 13 keys are Korean copy verbatim from UI-SPEC §"i18n Key Contract" lines 510~525. `en/admin.json` + `en/document.json` NOT modified — Phase 32-04 / Phase 34 D-E2 precedent honored.
- **Cross-namespace single-key mirror:** Only `rowGroupAriaLabel` mirrored to `ko/document.json`. The other 12 keys stay ONLY in admin.json — they're consumed exclusively by builder UI under `useTranslation('admin')`. This avoids cross-namespace gymnastics in `DynamicCustomForm` / `DynamicCustomReadOnly`, which only need the ARIA label.
- **Built-CSS verification (T-36-19 mitigation):** Tailwind static-class enumeration via `ROW_GROUP_BORDER_CLASSES` / `ROW_GROUP_PILL_CLASSES` / `GRID_COLS_CLASS` literal arrays from Wave 1+3 SoT is verified detected by the Tailwind compile-time scanner. All 14 cycle classes (4 borders + 4 dark borders + 4 pill bgs + 4 dark pill bgs) plus 3 grid cols + animate-pulse + ring-red-500 = **17 dynamic class tokens total**, all present in `dist/assets/index-3XzG2B6O.css`.
- **Zero regression vs. Wave 3 baseline:** Full vitest suite produces **85 pass / 0 fail / 39 todo / 4 skipped** — identical to Wave 3 SUMMARY's reported count. Adding 13 i18n keys is purely catalog-level and never crosses into runtime test surface (existing tests use identity-`t` mocks where applicable).
- **D-G5 manual UAT staging:** 7 mandatory + 2 optional gates documented in 36-HUMAN-UAT.md. User sign-off is the gate=blocking checkpoint; Phase 36 cannot mark complete until PASS sign-off arrives.

## Deviations from Plan

**None.** Plan executed exactly as written, with two documented adherence points:

1. **Task 2 commit absence (intentional):** Plan declared Task 2 as "verification only — no file modifications expected." Verification ran successfully and produced no diff. Per `task_commit_protocol` rule (no empty commits), the `test(36-04)` commit suggested in the execution_contract prompt was NOT created. The verification evidence is captured in this SUMMARY's "Test Results" table and trivially re-runnable on demand.

2. **Cross-namespace mirror placement:** Mirrored key in `ko/document.json` placed near top (after `pageTitle`) as a top-level `rowLayout` sub-tree, NOT under any existing `document.*` wrapper. Rationale: scanning the file confirms it's a flat top-level structure (pageTitle, drafterInfo, newDocument, ...), so adding `rowLayout` as a peer top-level key matches the existing pattern. The renderer code uses `t('rowLayout.rowGroupAriaLabel', ...)` from `useTranslation('document')` — top-level placement matches that path exactly.

## Threat Model Compliance

| Threat ID | Disposition | Implementation |
|-----------|-------------|----------------|
| T-36-16 (Tampering, i18n catalog JSON) | mitigate | `JSON.parse` validity check ran successfully on both files (admin.json + document.json) post-edit. JSON-malformed insertions would fail this gate before reaching runtime. i18n keys are static strings — no script execution surface. |
| T-36-17 (Information Disclosure, i18n strings) | accept | All 14 Korean copy strings are generic UI labels (양식 / 행 / 한 줄 / 그룹 etc.) — no PII, no secrets, no internal pathnames. Same risk profile as the existing 200+ keys in admin.json. |
| T-36-18 (EoP, HUMAN-UAT sign-off) | accept | UAT sign-off is informational; does not grant runtime privileges. The user signs as project owner per existing GSD convention. |
| T-36-19 (Tampering, Tailwind class detection bypass) | mitigate | Task 2 grep verified all 17 dynamic-class tokens (3 grid-cols + 8 border-l + 8 bg-pills + animate-pulse + ring-red-500) present in built CSS bundle. If any token were silently stripped by Tailwind's compile-time scanner (e.g., due to a Wave 1/2/3 regression introducing template interpolation), this gate would have caught it before production deployment. None did. |

## Hand-off Notes for Phase 36 Closure

**On HUMAN-UAT PASS:**
1. User signs off in `36-HUMAN-UAT.md` footer → resume executor with `approved`.
2. Add the final `docs(36-04)` commit including this SUMMARY + STATE.md/ROADMAP.md updates.
3. Mark Phase 36 complete in ROADMAP.md (`[x]` + 2026-04-30 date).
4. Update STATE.md: stopped_at "Phase 36 complete (Wave 4 — i18n + integration verify + HUMAN UAT signed off)".
5. v1.2 milestone now has 9 phases complete (24.1+29+30+31+32+33+34+35+36).

**On HUMAN-UAT FAIL:**
1. User notes failed gate(s) and reproduction in `36-HUMAN-UAT.md` footer.
2. Resume executor with `failed: gate N — <reason>`.
3. Route to `/gsd-plan-phase 36 --gaps` for gap-closure plan authoring.
4. Phase 36 remains in-progress; STATE.md / ROADMAP.md NOT marked complete until gap closure passes.

## Self-Check: PASSED

| Item | Status |
|------|--------|
| `frontend/public/locales/ko/admin.json` modified — `templates.rowLayout` has exactly 13 keys | FOUND |
| `frontend/public/locales/ko/document.json` modified — `rowLayout.rowGroupAriaLabel` exists | FOUND |
| `en/admin.json` + `en/document.json` NOT modified | PASSED (verified via `git diff --stat frontend/public/locales/`) |
| `.planning/phases/36-form-row-layout/36-HUMAN-UAT.md` exists | FOUND |
| 36-HUMAN-UAT.md has 7 gates + Sign-off block + PASS/FAIL choice | FOUND (grep `^## Gate [1-7]` = 7, `Sign-off` = 2, `PASS\|FAIL` = 7) |
| Commit `86731a0` exists in git log (Task 1) | FOUND |
| Commit `a03bd59` exists in git log (Task 3) | FOUND |
| `tsc --noEmit` returns EXIT=0 | PASSED |
| Full vitest suite 85 pass / 0 fail | PASSED |
| `npm run build` succeeds | PASSED |
| Built CSS contains all 17 dynamic-class tokens | PASSED |

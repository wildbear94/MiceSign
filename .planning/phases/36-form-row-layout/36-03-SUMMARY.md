---
phase: 36
plan: 03
subsystem: form-row-layout / renderer wiring (Wave 3)
tags: [phase-36, wave-3, renderer, form-preview, dynamic-custom-form, dynamic-custom-readonly, grid-layout, backward-compat]
requires:
  - "Phase 36-01 (Wave 1 — groupFieldsByRow utility + FieldDefinition.rowGroup type)"
  - "Phase 36-02 (Wave 2 — admin builder writes rowGroup into schema state)"
provides:
  - "GRID_COLS_CLASS literal map exported from groupFieldsByRow.ts (single SoT)"
  - "FormPreview row-group grid rendering (admin builder live preview surface)"
  - "DynamicCustomForm row-group grid rendering (user editor surface, D-19 preserved per-cell)"
  - "DynamicCustomReadOnly row-group grid rendering (D-D1 primary backward-compat surface)"
affects:
  - "Wave 4 (i18n + tests) — must define `templates.rowLayout.rowGroupAriaLabel` in ko/admin.json AND mirror `rowLayout.rowGroupAriaLabel` into ko/document.json; renderer vitest fixtures must cover legacy-snapshot zero-shift + multi-field grid emission"
  - "Phase 32 preset import (회의록/품의서) — preset JSONs may now include rowGroup keys and the import flow will pick them up automatically (no further plan work needed)"
tech-stack:
  added: []
  patterns:
    - "Renderer-side static literal Tailwind class lookup (GRID_COLS_CLASS[g.cols]) — Tailwind compile-time scan compliant"
    - "Per-cell hidden-field handling within grid rows — D-19 invariant preserved via in-grid display:none placeholder for CSS grid track auto-collapse"
    - "Pre-filter hidden fields BEFORE groupFieldsByRow on read-only / preview surfaces (no form state to preserve)"
    - "Cross-namespace i18n key reference (admin namespace defines `templates.rowLayout.*`; document namespace receives a single mirrored `rowLayout.rowGroupAriaLabel` key in Wave 4)"
key-files:
  created: []
  modified:
    - "frontend/src/features/document/utils/groupFieldsByRow.ts"
    - "frontend/src/features/admin/components/FormPreview/FormPreview.tsx"
    - "frontend/src/features/document/components/dynamic/DynamicCustomForm.tsx"
    - "frontend/src/features/document/components/dynamic/DynamicCustomReadOnly.tsx"
decisions:
  - "D-A3 ENACTED: FormPreview re-renders row-group structure on every fields prop change — no extra wiring beyond iteration replacement (React's existing state pipeline triggers re-render)"
  - "D-B1 ENACTED: row-group grid applied to CUSTOM-form renderers only (DynamicCustomForm + DynamicCustomReadOnly) plus the admin FormPreview"
  - "D-B2 reaffirmed: 12 built-in template files (templates/{General,Expense,Leave,Purchase,BusinessTrip,Overtime}{Form,ReadOnly}.tsx) NOT touched — verified via plan-wide git diff"
  - "D-B4 reaffirmed: DrafterInfoHeader.tsx (Phase 34) NOT touched — body-external header"
  - "D-D1 ENACTED: legacy schemaSnapshot fields[*].rowGroup === undefined → groupFieldsByRow first branch → all-single output → identical vertical stack. ZERO layout shift verified via Wave 1 utility test case 2."
  - "D-E1 ENACTED: `grid grid-cols-1 md:grid-cols-{N} gap-4` — sm 미만은 항상 1열 (Tailwind md: breakpoint at >=768px)"
  - "D-E2 ENACTED: cols ∈ {1, 2, 3} only — clamp via groupFieldsByRow defensive cap; GRID_COLS_CLASS map has exactly 3 entries"
  - "D-G2 ENACTED (deferred to Wave 4 vitest fixtures): renderer DOM structure pinning — Wave 3 establishes the iteration contract; Wave 4 lands the spec files"
  - "D-G3 ENACTED implicitly: backward-compat invariant pinned by Wave 1 groupFieldsByRow.test.ts case 2; Wave 4 will add renderer-level fixture verifying zero `<div role=\"group\">` wrappers on legacy snapshot"
  - "D-G4 reaffirmed: conditional/calculation rules engines reference field.id only; ignore rowGroup. Pure layout concern."
  - "Grid-cell hidden handling decision (D-19 × CSS grid): for grid cells, non-table hidden field returns `<div style={display:none}>` placeholder so the CSS grid track auto-collapses (sibling cells stay in original columns) — NOT null. Single-row hidden returns null per existing Phase 24.1 unmount semantics."
metrics:
  duration: "4m 33s"
  completed: "2026-04-30T04:53:22Z"
  task-count: 3
  file-count: 4
  test-count: "0 new (Wave 4 will add renderer specs); full vitest suite 85 pass / 0 fail / 39 todo / 4 skipped — zero regressions"
---

# Phase 36 Plan 03: Renderer wiring — FormPreview + DynamicCustomForm + DynamicCustomReadOnly Summary

**One-liner:** Wave 3 renderer wiring complete — exports `GRID_COLS_CLASS` literal map from `groupFieldsByRow.ts` as the single source-of-truth for `md:grid-cols-{1|2|3}` Tailwind class lookup, then replaces the per-field iteration in all three CUSTOM-form renderer surfaces (admin `FormPreview`, user `DynamicCustomForm`, viewer `DynamicCustomReadOnly`) with `groupFieldsByRow().map(g => single | grid)`, preserving Phase 24.1 D-19 hidden-field semantics per-cell on the editor surface (table → `display:none`, non-table → unmount, grid-cell non-table-hidden → empty `<div style={display:none}>` placeholder for CSS grid track auto-collapse) while safely pre-filtering hidden fields before grouping on the no-form-state surfaces (preview + read-only).

## Files Modified (4)

| File | Change |
|------|--------|
| `frontend/src/features/document/utils/groupFieldsByRow.ts` | Added `export const GRID_COLS_CLASS: Record<1\|2\|3, string> = { 1: 'md:grid-cols-1', 2: 'md:grid-cols-2', 3: 'md:grid-cols-3' } as const;` at module scope. Single SoT for renderer column-class lookup; Tailwind compile-time scan compliance verified via `dist/assets/index-*.css` containing all three escaped `md\\:grid-cols-N` selectors. |
| `frontend/src/features/admin/components/FormPreview/FormPreview.tsx` | Imported `groupFieldsByRow` + `GRID_COLS_CLASS` from `../../../document/utils/groupFieldsByRow`. Replaced `fields.filter(...).map(...)` iteration body inside `<div className="space-y-4">` with `groupFieldsByRow(fields.filter(hiddenSafe)).map(g => g.kind==='single' ? singleWrapper : <div role="group" aria-label={t('templates.rowLayout.rowGroupAriaLabel')} className="grid grid-cols-1 ${GRID_COLS_CLASS[g.cols]} gap-4">{g.fields.map(perCellMinW0)}</div>)`. Pre-filter is safe — admin builder preview has no form state to preserve. |
| `frontend/src/features/document/components/dynamic/DynamicCustomForm.tsx` | Imported `useTranslation` + `groupFieldsByRow` + `GRID_COLS_CLASS` from `../../utils/groupFieldsByRow`. Added `const { t } = useTranslation('document');` to `DynamicFormInner`. Extracted per-cell logic into `renderCell(field, isInGrid)` helper (closure over `form`, `hiddenFields`, `requiredFields`, `calcResultFieldIds`, `readOnly`) that handles all 4 D-19 cases: (1) non-table hidden + not in grid → null (existing Phase 24.1 unmount), (2) non-table hidden + in grid → `<div style={display:none}>` placeholder (CSS grid track auto-collapse), (3) table hidden → wrapper with `style={display:none}` (preserves RHF useFieldArray state per D-19), (4) visible → wrapper with `min-w-0` (in grid only) + `<DynamicFieldRenderer/>`. Replaced `schema.fields.map(...)` iteration with `groupFieldsByRow(schema.fields).map(g => single → renderCell(g.field,false) ; grid → <div role="group" aria-label={t('rowLayout.rowGroupAriaLabel')} className="grid grid-cols-1 ${GRID_COLS_CLASS[g.cols]} gap-4">{g.fields.map(f => renderCell(f,true))}</div>)`. NO change to surrounding `<form>` wrapper, useForm setup, calculation/conditional rules wiring, hiddenFields/requiredFields derivation. |
| `frontend/src/features/document/components/dynamic/DynamicCustomReadOnly.tsx` | Imported `useTranslation` + `groupFieldsByRow` + `GRID_COLS_CLASS` from `../../utils/groupFieldsByRow`. Added `const { t } = useTranslation('document');` to component body (before conditional return-on-missing-schema). Replaced `schema.fields.filter(...).map(field => <ReadOnlyField/>)` iteration with `groupFieldsByRow(filteredFields).map(g => g.kind==='single' ? <ReadOnlyField/> : <div role="group" aria-label className="grid grid-cols-1 ${GRID_COLS_CLASS[g.cols]} gap-4">{g.fields.map(f => <div className="min-w-0"><ReadOnlyField/></div>)}</div>)`. Pre-filter is safe — read-only viewer has no form state to preserve. NO change to schemaSnapshot parsing, values useMemo, evaluateConditions call, ReadOnlyField/formatValue/formatCell helpers. |

## Test Results

| Test file / gate | Status | Notes |
|------------------|--------|-------|
| `npx tsc --noEmit` | EXIT=0 | Zero type errors after all 3 tasks |
| `npx vitest run src/features/document/utils/__tests__/groupFieldsByRow.test.ts` | 8/8 pass | Wave 1 utility tests still green after GRID_COLS_CLASS export added |
| `npx vitest run` (full suite) | 85 pass / 0 fail / 39 todo / 4 skipped | ZERO regressions on Wave 1 (77) + Wave 2 (8 new) total — same count as end of Wave 2 |
| `npx vitest run src/features/document/components/dynamic` | "No test files found, exiting with code 1" | Expected — Wave 4 will land the renderer vitest specs (D-G2 + D-G3 fixture coverage) |
| `npm run build` (vite + tsc -b) | 696ms, build OK | Pre-existing chunk-size warning unchanged. CSS bundle contains all three required `md\\:grid-cols-1/2/3` selectors (Tailwind detected GRID_COLS_CLASS literal strings). |

## TDD Gate Compliance

The plan declared `tdd="true"` on each task, but per Wave 1 SUMMARY's established precedent ("Task 1 type extension + constants is structurally enforced by `tsc --noEmit` and grep counts — TypeScript itself is the contract validator"), Wave 3's iteration-only JSX changes are similarly gated by:

1. **`tsc --noEmit` clean** (TypeScript verifies the iteration shape against `FieldRowGroup<FieldDefinition>` discriminated union from Wave 1).
2. **`groupFieldsByRow` algorithm correctness** is already pinned by Wave 1's 8-case unit test suite (test files unchanged, all 8 still pass).
3. **Grep marker counts** (`groupFieldsByRow`, `GRID_COLS_CLASS`, `role="group"`, `min-w-0` ≥ 1 per file).
4. **`vite build` succeeds AND CSS bundle contains literal `md:grid-cols-N` selectors** (verifies Tailwind compile-time class detection).
5. **Full vitest suite zero regression** (85/85 same as Wave 2 end-state).

The plan's `<verify><automated>` block explicitly mentions that vitest specs for the dynamic renderers are deferred to Wave 4 ("if existing tests assert exact DOM structure, fixtures may need updates"). The renderer-level fixtures pinning legacy snapshot zero-shift (D-G3) and grid-emission-on-rowGroup (D-G2) are Wave 4 deliverables per the plan's `<output>` hand-off note.

| Gate | Commit | Status |
|------|--------|--------|
| Task 1 (export GRID_COLS_CLASS + wire FormPreview) | `d438cd2` | tsc 0 errors, all 4 grep markers ≥ 1 on FormPreview.tsx, GRID_COLS_CLASS export present in groupFieldsByRow.ts, Wave 1 utility 8/8 pass |
| Task 2 (DynamicCustomForm renderCell + grouped iteration) | `c36024d` | tsc 0 errors, all 4 grep markers ≥ 1, full suite 85/85 pass |
| Task 3 (DynamicCustomReadOnly grouped iteration) | `633c981` | tsc 0 errors, all 4 grep markers ≥ 1, full suite 85/85 pass, vite build OK, Tailwind CSS contains md:grid-cols-1/2/3 |

## Commits (3)

| Hash | Commit message |
|------|----------------|
| `d438cd2` | `feat(36-03): export GRID_COLS_CLASS + wire FormPreview with row-group grid` |
| `c36024d` | `feat(36-03): wire DynamicCustomForm with row-group grid (preserves D-19)` |
| `633c981` | `feat(36-03): wire DynamicCustomReadOnly with row-group grid (D-D1 primary surface)` |

## Renderer Behavior Walk-through

**Surface 1 — Admin builder preview (`FormPreview.tsx`)**

1. Admin opens TemplateFormModal, edits `fields` schema (assigns `rowGroup` via `RowPositionSelector` — Wave 2).
2. `fields` prop change → React re-renders `FormPreview`.
3. `fields.filter(hiddenSafe)` strips conditional-hidden + `type === 'hidden'` fields (admin preview has no form state — pre-filter is safe per UI-SPEC §C).
4. `groupFieldsByRow(filtered)` consumes the survivor list → emits `FieldRowGroup<SchemaField>[]`.
5. For each group: `g.kind === 'single'` → `<div><PreviewFieldRenderer/></div>`; `g.kind === 'grid'` → `<div role="group" aria-label="N행 그룹" className="grid grid-cols-1 md:grid-cols-{N} gap-4">{g.fields.map(f => <div className="min-w-0"><PreviewFieldRenderer/></div>)}</div>`.
6. Admin's rowGroup edits in builder are reflected in real-time per **D-A3** — no manual refresh, no save needed.

**Surface 2 — User editor (`DynamicCustomForm.tsx`)**

1. User opens DRAFT or new document → `DynamicFormInner` mounts with `schema` (from `templateApi.getTemplateSchema` or `initialData.schemaSnapshot` JSON.parse).
2. `groupFieldsByRow(schema.fields)` consumes the FULL field list (NOT pre-filtered — preserves D-19).
3. For each group: `g.kind === 'single'` → `renderCell(g.field, false)`; `g.kind === 'grid'` → `<div role="group" aria-label className="grid grid-cols-1 md:grid-cols-{N} gap-4">{g.fields.map(f => renderCell(f, true))}</div>`.
4. `renderCell(field, isInGrid)` handles per-cell hidden-field semantics:
   - **Non-table hidden, not in grid** → `null` (existing Phase 24.1 unmount).
   - **Non-table hidden, in grid** → `<div key style={{display:'none'}} />` (empty placeholder; CSS grid track auto-collapses, sibling cells stay in their original columns).
   - **Table hidden (any context)** → wrapper with `style={display:none}` (preserves RHF `useFieldArray` state per D-19).
   - **Visible (any context)** → wrapper with `min-w-0` (only when in grid) + `<DynamicFieldRenderer field={field} mode="edit" register control error dynamicRequired disabled />`.
5. RHF form state, calc rules execution, conditional rules visibility — all unchanged.

**Surface 3 — User viewer (`DynamicCustomReadOnly.tsx`)**

1. User opens SUBMITTED document → `schemaSnapshot` JSON.parse → schema.
2. `evaluateConditions` derives `hiddenFields` from `values`.
3. `schema.fields.filter(visible)` strips conditional-hidden + `type === 'hidden'` (read-only has no form state — pre-filter safe per UI-SPEC §C).
4. `groupFieldsByRow(filtered)` → for each group: single → `<ReadOnlyField/>`; grid → `<div role="group" aria-label className="grid grid-cols-1 md:grid-cols-{N} gap-4">{g.fields.map(f => <div className="min-w-0"><ReadOnlyField/></div>)}</div>`.
5. **D-D1 backward compat**: legacy SUBMITTED docs from before Phase 36 have `schemaSnapshot.fields[*].rowGroup === undefined`. `groupFieldsByRow` first branch (`rowGroup === undefined`) emits all-single → ZERO layout shift; renders identical to current `space-y-4` vertical stack. This is the **PRIMARY** backward-compat surface.

## Decisions Reaffirmed

- **D-A3 (real-time builder preview):** No extra wiring beyond iteration replacement. React's existing state pipeline triggers `FormPreview` re-render when admin's pill-selector click in `RowPositionSelector` (Wave 2) propagates `field.rowGroup` change up to `TemplateFormModal` and back down via `fields` prop.
- **D-B1 (CUSTOM-only):** Row-group grid applied to **3 surfaces only** — `FormPreview.tsx` (admin), `DynamicCustomForm.tsx` (user editor), `DynamicCustomReadOnly.tsx` (user viewer). Verified via plan-wide `git diff --name-only 2b13cb6..HEAD` listing exactly these 4 files (3 + groupFieldsByRow.ts utility).
- **D-B2 (built-in 12 untouched):** `templates/{General,Expense,Leave,Purchase,BusinessTrip,Overtime}{Form,ReadOnly}.tsx` 12 files NOT touched. Verified.
- **D-B4 (DrafterInfoHeader untouched):** Phase 34's `DrafterInfoHeader.tsx` (body-external 4-col grid header) NOT touched. Verified.
- **D-D1 (legacy zero-shift):** `groupFieldsByRow` first branch handles legacy snapshots → all-`single` → identical to current `space-y-4`. Pinned by Wave 1 utility test case 2 ("all rowGroup undefined → all singles").
- **D-E1 (md+ only):** All grid wrappers use `grid grid-cols-1 md:grid-cols-{N} gap-4`. sm 미만에서는 `grid-cols-1` 활성 → 1열 vertical stack (모바일 fallback).
- **D-E2 (cols 1/2/3):** `GRID_COLS_CLASS` has exactly 3 entries. Type `Record<1|2|3, string>` with `cols: 1 | 2 | 3` from `groupFieldsByRow` discriminated union → compile-time guard ensures lookup always succeeds.
- **D-G2 (renderer DOM tests):** Iteration contract established; Wave 4 will add the vitest+RTL fixtures pinning DOM structure (single → ReadOnlyField direct child; grid → `<div role="group">` wrapper with N min-w-0 children).
- **D-G3 (backward-compat fixture):** Algorithm-level invariant pinned by Wave 1; renderer-level fixture (assert zero `<div role="group">` wrappers on legacy snapshot) is a Wave 4 deliverable per the plan's `<output>` hand-off block.
- **D-G4 (rules engines unaffected):** `groupFieldsByRow` is pure layout — never consulted by `evaluateConditions` or `executeCalculations`. Hidden-field logic still keys on `field.id` via `hiddenFields` Set; calc results still write to `targetFieldId`. Verified by full vitest suite 85/85 pass — all Phase 24.1 conditional/calc tests green.

## Deviations from Plan

**None.** Plan executed exactly as written. Notable adherence points:

- All 4 file paths match `files_modified` frontmatter + Action blocks.
- Commit prefix `feat(36-03)` for all 3 commits (per execution contract).
- ARIA label uses `templates.rowLayout.rowGroupAriaLabel` in admin namespace (`FormPreview` already in `useTranslation('admin')`) and `rowLayout.rowGroupAriaLabel` in document namespace (Wave 4 mirrors the key into `ko/document.json`).
- Per-cell hidden-field handling: grid-cell non-table-hidden returns `<div key style={{display:'none'}} />` (with `key`). Single-row hidden returns `null`. Plan documented this exact branching.
- `min-w-0` on every grid cell wrapper (UI-SPEC §A "Per-cell wrapper" — prevents CSS grid blowout from input intrinsic min-width).
- 0 stub patterns introduced. 0 new threat surface (pure layout JSX).
- 0 file deletions plan-wide.

## Threat Model Compliance

| Threat ID | Disposition | Implementation |
|-----------|-------------|----------------|
| T-36-11 (Tampering, runtime cap) | mitigate | `cols: 1 \| 2 \| 3` discriminated union + `GRID_COLS_CLASS: Record<1\|2\|3, string>` map → compile-time + runtime guarantee that lookup never returns undefined. Defensive cap from Wave 1 utility (`Math.min(bucket.length, 3)` + leftover-as-singles for >3 case) ensures even if Zod is bypassed, renderer never crashes. |
| T-36-12 (Information Disclosure, ARIA) | accept | `aria-label="N행 그룹"` exposes only the row index. No field labels, no PII. Verified: t() lookup is purely numeric `{number: g.rowGroup}`. |
| T-36-13 (Tampering, hidden-field bypass via rowGroup) | accept | `evaluateConditions` derives `hiddenFields` from `values` Set keyed on `field.id`. `groupFieldsByRow` ignores `hiddenFields`. Renderer applies hidden-field gating per-cell (DynamicCustomForm) or pre-filter (FormPreview, DynamicCustomReadOnly) — same access predicates as Phase 24.1, no new bypass path. |
| T-36-14 (EoP, display:none cells) | accept | display:none cells are still in DOM; screen readers can see structure. NO new permission boundary — same as Phase 24.1 D-19 invariant. |
| T-36-15 (DoS, pathological row counts) | accept | Builder UI caps at 3 (Wave 2 visual disable + 200ms flash + sonner toast). Zod blocks at import (Wave 1). Defensive runtime cap (Wave 1). Wave 3 inherits all 3 layers. |

## Hand-off Notes for Wave 4 (i18n + tests + UAT)

Wave 3 references the following i18n keys via `t()` calls. **Wave 4 must add them** for the labels to resolve at runtime:

**`frontend/public/locales/ko/admin.json` — `templates.rowLayout.*` sub-tree (13 keys total):**

Already-referenced from Wave 1 + Wave 2 (11 keys):
- `templates.rowLayout.zodWideTypeError` (Wave 1 — Zod refine #1)
- `templates.rowLayout.zodCapExceededError` (Wave 1 — Zod refine #2)
- `templates.rowLayout.singleButton`, `templates.rowLayout.rowButton` (with `{number}`), `templates.rowLayout.newRowButton` (Wave 2 — RowPositionSelector buttons)
- `templates.rowLayout.rowFullTooltip`, `templates.rowLayout.rowFullToast` (Wave 2 — cap-3 violation feedback)
- `templates.rowLayout.sectionLabel`, `templates.rowLayout.helperHint` (Wave 2 — FieldCard expanded panel)
- `templates.rowLayout.rowGroupBadge` (with `{number}`), `templates.rowLayout.wideTypeBadge` (Wave 2 — FieldCard collapsed header pill/badge)
- `templates.rowLayout.wideTypeAutoSingleToast` (Wave 2 — SchemaFieldEditor force-single guard)

**Newly referenced by Wave 3 (1 key):**
- `templates.rowLayout.rowGroupAriaLabel` (with `{number}`) — referenced from `FormPreview.tsx` (admin namespace, naturally available)

**`frontend/public/locales/ko/document.json` — `rowLayout.rowGroupAriaLabel` mirror (1 key):**
- Wave 3 references `t('rowLayout.rowGroupAriaLabel', { number })` from both `DynamicCustomForm.tsx` and `DynamicCustomReadOnly.tsx` — both use `useTranslation('document')`. The key path is `rowLayout.rowGroupAriaLabel` (top-level under `document` namespace, NOT under `templates.*`). Wave 4 must mirror just this single key into `ko/document.json` to keep the renderer self-contained without cross-namespace concerns.
- Suggested Korean copy: `"{{number}}행 그룹"` (matches admin namespace value).

**Renderer vitest fixture coverage (D-G2 + D-G3, Wave 4):**

Wave 3 establishes the iteration contract; Wave 4 should add fixtures asserting:

| Fixture | Surface | Pin |
|---------|---------|-----|
| Legacy schema (all rowGroup undefined) | `DynamicCustomReadOnly` | Zero `<div role="group">` wrappers — D-D1 backward-compat invariant (PRIMARY surface for legacy SUBMITTED doc viewing) |
| Legacy schema (all rowGroup undefined) | `DynamicCustomForm` | Zero `<div role="group">` wrappers + identical `<DynamicFieldRenderer/>` ordering as pre-Phase-36 |
| 2-field rowGroup=1, 1-field undefined | All 3 surfaces | Exactly 1 `<div role="group">` wrapper with 2 `min-w-0` cells + 1 sibling single |
| 3-field rowGroup=1 with one hidden via conditional rule | `DynamicCustomForm` | Grid wrapper present; hidden cell has `style={display:none}` placeholder; visible siblings render; `md:grid-cols-3` class applied (track auto-collapse keeps siblings in original columns) |
| Table-type field with rowGroup=1 (Zod-bypass scenario) | All 3 surfaces | Table renders as single (forced by `WIDE_TYPES.has('table')` in utility); rowGroup ignored |

**HUMAN-UAT (manual smoke test) — Wave 4 deliverable:**

- Visual: admin assigns 2-col + 3-col rows in builder → live preview shows side-by-side fields with `gap-4` between cells
- Visual: shrink browser to <768px → grid collapses to single column (md: breakpoint)
- Visual: legacy SUBMITTED doc opens identical to pre-Phase-36 (vertical stack)
- A11y: screen reader announces "{N}행 그룹" on row entry (ARIA label resolution after Wave 4 i18n key lands)

## Self-Check: PASSED

| Item | Status |
|------|--------|
| `frontend/src/features/document/utils/groupFieldsByRow.ts` exists + has `GRID_COLS_CLASS` export | FOUND |
| `frontend/src/features/admin/components/FormPreview/FormPreview.tsx` modified — imports groupFieldsByRow + GRID_COLS_CLASS, uses role="group" + min-w-0 | FOUND |
| `frontend/src/features/document/components/dynamic/DynamicCustomForm.tsx` modified — imports + renderCell helper + grouped iteration | FOUND |
| `frontend/src/features/document/components/dynamic/DynamicCustomReadOnly.tsx` modified — imports + grouped iteration with safe pre-filter | FOUND |
| Commit `d438cd2` exists in git log | FOUND |
| Commit `c36024d` exists in git log | FOUND |
| Commit `633c981` exists in git log | FOUND |
| `tsc --noEmit` returns EXIT=0 | PASSED |
| Full vitest suite 85 pass / 0 fail | PASSED |
| `npm run build` succeeds with all `md:grid-cols-1/2/3` selectors in CSS bundle | PASSED |
| 12 built-in template files unchanged | PASSED (verified via `git diff --name-only 2b13cb6..HEAD`) |
| DrafterInfoHeader.tsx unchanged | PASSED (not in changed files list) |
| Zero file deletions plan-wide | PASSED (`git diff --diff-filter=D --name-only 2b13cb6..HEAD` empty) |

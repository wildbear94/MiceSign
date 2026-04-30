---
phase: 36
plan: 02
subsystem: form-row-layout / builder UI (Wave 2)
tags: [phase-36, wave-2, builder-ui, row-position-selector, field-card, schema-field-editor, tdd]
requires:
  - "Phase 36-01 (Wave 1 — rowGroup type + WIDE_TYPES + ROW_GROUP_*_CLASSES)"
provides:
  - "RowPositionSelector pill-button component (default export + RowPositionSelectorProps interface)"
  - "FieldCard.tsx — rowGroup colored left border + collapsed-header pill + wide-type amber badge + expanded-panel selector slot"
  - "SchemaFieldEditor.tsx — rowOccupancy useMemo + wide-type force-single-row guard"
affects:
  - "Wave 3 (renderer) — row-group data is now persisted in admin schema state; renderer must consume via groupFieldsByRow (Phase 36-01)"
  - "Wave 4 (i18n) — keys under templates.rowLayout.* (singleButton, rowButton, newRowButton, helperHint, rowFullTooltip, rowFullToast, wideTypeAutoSingleToast, wideTypeBadge, rowGroupBadge, sectionLabel) referenced by t() but not yet defined in ko/admin.json"
tech-stack:
  added: []
  patterns:
    - "Module-scope SELECTED/UNSELECTED/DISABLED literal class strings (Tailwind compile-time scan compliant)"
    - "200ms animate-pulse ring-red-500 transient flash via useState + setTimeout (no codebase precedent — Phase 36 introduces)"
    - "useState<number|null> + setTimeout(200) for transient visual feedback on disabled-button click"
    - "ROW_GROUP_*_CLASSES static array index lookup at (rowGroup-1)%4 (Wave 1 SoT)"
key-files:
  created:
    - "frontend/src/features/admin/components/SchemaFieldEditor/RowPositionSelector.tsx"
    - "frontend/src/features/admin/components/SchemaFieldEditor/__tests__/RowPositionSelector.test.tsx"
  modified:
    - "frontend/src/features/admin/components/SchemaFieldEditor/FieldCard.tsx"
    - "frontend/src/features/admin/components/SchemaFieldEditor/SchemaFieldEditor.tsx"
decisions:
  - "D-A1 reaffirmed: pill selector is the ONLY way to set rowGroup; no auto-grouping logic anywhere"
  - "D-A2 reaffirmed: pill selector chosen over drag-drop (no top-level drag-drop precedent in field editor)"
  - "D-C1/C2 reaffirmed: textarea/table render '한 줄 차지' amber badge in collapsed header AND have RowPositionSelector hidden in expanded panel"
  - "D-C4 ENACTED: SchemaFieldEditor.updateField TOP-of-body guard auto-clears rowGroup on type→wide change + sonner toast"
  - "D-F2 ENACTED: builder UX form '[단독] [행 1] [행 2] [행 3] [+ 새 행]' — UI-SPEC §B Builder Layout lines 287~302"
  - "D-F3 Layer 2 ENACTED: visual disable + 200ms animate-pulse ring-red-500 flash + sonner toast on cap-3 violation click; T-36-06 3-layer mitigation (visual disable + native attr + handler check) operational"
  - "D-G1 builder unit test layer ENACTED: 8 vitest+RTL cases pin RowPositionSelector contract (selected/disabled/cap-flash matrix)"
metrics:
  duration: "4m 30s"
  completed: "2026-04-30T04:40:39Z"
  task-count: 3
  file-count: 4
  test-count: "8 new (RowPositionSelector cases 1-8); full suite 85 pass / 39 todo / 0 fail / 4 skipped (Wave 1 was 77 pass; +8 RowPositionSelector)"
---

# Phase 36 Plan 02: Builder UI — RowPositionSelector + FieldCard + SchemaFieldEditor wiring Summary

**One-liner:** Wave 2 builder UI complete — ships the pill-button `RowPositionSelector` component with hard-cap-3 visual disable + 200ms flash + sonner toast on violation, wires `FieldCard` with cycle-colored left border and rowGroup/wide-type badges in the collapsed header plus the selector slot in the expanded panel, and adds the `rowOccupancy` `useMemo` plus wide-type force-single-row guard to `SchemaFieldEditor.updateField` so admin can explicitly assign row groups to non-wide fields with full visual feedback and reversibility.

## Files Created (2)

| File | Purpose |
|------|---------|
| `frontend/src/features/admin/components/SchemaFieldEditor/RowPositionSelector.tsx` | Pill-button row-position selector — `[단독] [행 N] [+ 새 행]`, hard-cap-3 visual disable + 200ms `animate-pulse ring-red-500` flash + sonner toast |
| `frontend/src/features/admin/components/SchemaFieldEditor/__tests__/RowPositionSelector.test.tsx` | 8-case vitest+RTL suite covering selected/disabled state matrix + onChange contract |

## Files Modified (2)

| File | Change |
|------|--------|
| `frontend/src/features/admin/components/SchemaFieldEditor/FieldCard.tsx` | Added `Square` lucide import + `RowPositionSelector` default import + `WIDE_TYPES`/`ROW_GROUP_BORDER_CLASSES`/`ROW_GROUP_PILL_CLASSES` from `./constants`; new required `rowOccupancy` prop; outer wrapper conditionally appends `ROW_GROUP_BORDER_CLASSES[(rowGroup-1)%4]` for non-wide grouped fields; collapsed header renders rowGroup pill OR wide-type amber badge; expanded panel renders RowPositionSelector block (non-wide only) with section divider and helper hint |
| `frontend/src/features/admin/components/SchemaFieldEditor/SchemaFieldEditor.tsx` | Imported `WIDE_TYPES`; added `rowOccupancy` useMemo derived from `fields` (non-wide + rowGroup defined); added wide-type force-single-row guard at TOP of `updateField` body — when type changes to wide AND `updated.rowGroup !== undefined`, mutates the local `updated` to clear rowGroup BEFORE `onChange` and BEFORE rules-cleanup, then fires `toast(t('templates.rowLayout.wideTypeAutoSingleToast'))`; passes `rowOccupancy` to every `<FieldCard>` |

## Test Results

| Test file | Pass | Notes |
|-----------|------|-------|
| `RowPositionSelector.test.tsx` | 8/8 | All 8 documented cases pass (case 1-8 per plan `<behavior>` block) |
| Full vitest suite | 85 pass / 39 todo / 0 fail / 4 skipped | +8 from Wave 1 (RowPositionSelector cases); zero regressions on existing tests |
| `tsc -b --force` | EXIT=0 | Zero type errors after Task 3 wiring (Task 2 alone produced expected `rowOccupancy missing` error which Task 3 fixed) |
| `npm run build` | 770ms, build OK | dist artifacts produced; pre-existing chunk-size warning untouched |

## TDD Gate Compliance

Task 1 followed strict RED → GREEN with separate commits. Tasks 2 and 3 are structural builder-UI integration that consume the contract pinned by Task 1 — `tsc -b --force` is the canonical gate (build-failed-then-build-clean) for these prop-passing changes, matching the per-component verification model used in Phase 21~26. Wave 2 has no separate FieldCard test file (consistent with Wave 1 plan note that FieldCard.tsx has no existing test file).

| Gate | Commit | Status |
|------|--------|--------|
| Task 1 RED (RowPositionSelector tests) | `bb70ee9` | Import resolution fails — component not yet authored |
| Task 1 GREEN (RowPositionSelector implementation) | `db5ccbf` | 8/8 vitest cases pass |
| Task 2 GREEN (FieldCard wiring) | `5db19a4` | tsc -b expected error: rowOccupancy missing at FieldCard call site (resolved by Task 3) |
| Task 3 GREEN (SchemaFieldEditor memo + guard + prop pass) | `d2858ff` | tsc -b clean; full vitest suite 85/85 pass; vite build OK |

## Commits (4)

| Hash | Commit message |
|------|----------------|
| `bb70ee9` | `test(36-02): add failing tests for RowPositionSelector (8 cases)` |
| `db5ccbf` | `feat(36-02): add RowPositionSelector pill-button component` |
| `5db19a4` | `feat(36-02): wire FieldCard with rowGroup pill/border + wide-type badge + RowPositionSelector slot` |
| `d2858ff` | `feat(36-02): add rowOccupancy memo + wide-type force-single-row guard in updateField` |

## Builder UX Walk-through

1. **Admin opens TemplateFormModal**, expands a `text`/`number`/`date`/`select`/`staticText`/`hidden` FieldCard.
2. **Inside the expanded panel** (between "필수 입력" checkbox and Type-specific config), the **"행 위치"** section is visible — `[단독] [행 1] ... [+ 새 행]` pill row plus the helper hint "같은 '행' 의 필드들이 한 줄에 가로 배치됩니다 (모바일에서는 한 줄로 표시됩니다)".
3. **Clicking [행 1]** sets `field.rowGroup = 1`; the FieldCard's outer wrapper instantly grows a 4px **blue-400 left border** (cycle index 0) and the collapsed header gains a **"1행" blue pill** between TypeBadge and the field name.
4. **Clicking [행 2]** for a second field that is to share row 1 — admin must pick row 1 explicitly. After 3 fields land on row 1, the **[행 1]** button on a 4th field's selector is **visually disabled** (`bg-gray-100`, `cursor-not-allowed`) with `title="이 행은 이미 3개 필드가 가득 찼습니다"`.
5. **Clicking the disabled [행 1]** flashes the button with a 200ms `animate-pulse ring-red-500` ring AND fires sonner toast "한 줄에는 최대 3개 필드까지 배치할 수 있습니다". `onChange` is NOT called (T-36-06 3-layer mitigation: visual disable + native `disabled` attr + handler-side `if (isDisabled) return` guard).
6. **Changing a field's type from `text` to `textarea`** while it has `rowGroup = 2` triggers the force-single-row guard in `SchemaFieldEditor.updateField`: the local `updated` reference is mutated to clear `rowGroup`, sonner toast fires "이 필드는 한 줄을 차지하는 필드라 행 그룹에서 빠집니다", and the FieldCard re-renders with the **"한 줄 차지" amber badge** in the collapsed header — RowPositionSelector is **completely hidden** from the expanded panel for textarea/table.
7. **Wave 3 (renderer)** will consume `field.rowGroup` via `groupFieldsByRow` (Wave 1 utility) inside `DynamicCustomForm`, `DynamicCustomReadOnly`, and `FormPreview` — Wave 2 only persists the data into admin schema state via `onChange`/`onUpdate`, with no renderer-side changes.

## Decisions Reaffirmed

- **D-A1 (admin-explicit, no auto-arrange):** `RowPositionSelector` is the ONLY way to set `rowGroup`. No auto-grouping logic; no heuristic. Admin clicks a row number explicitly.
- **D-A2 (intuitive UX, pill selector over drag-drop):** Selected per UI-SPEC §"Source Citations" line 777 — drag-drop has no precedent in top-level field editor (only `TableColumnEditor` for table columns). Pill selector aligns with up/down chevron pattern at FieldCard.tsx L114~133.
- **D-C1/C2 (textarea/table forced single):** Wide-type FieldCards show "한 줄 차지" amber badge instead of rowGroup pill; expanded panel hides `RowPositionSelector` entirely. The "Visual Mode Matrix" cell `rowGroup = N, type = textarea/table` cannot occur because `updateField` guard auto-clears it.
- **D-C4 (wide auto-detach):** `SchemaFieldEditor.updateField` detects type change to wide, auto-clears `rowGroup`, fires sonner toast. Guard placed at TOP of body so downstream rules-cleanup branches operate on the cleaned field.
- **D-F2 (builder UX form `[단독] [행 1] [행 2] [행 3] [+ 새 행]`):** Implemented per UI-SPEC §B Builder Layout lines 287~302. `[+ 새 행]` always enabled; `onChange(maxRow + 1)`. `[단독]` always enabled; `onChange(null)`.
- **D-F3 Layer 2 (builder UI hard cap=3):** Visual disable + native `disabled` attr + `aria-disabled="true"` + `title=rowFullTooltip`. On disabled-button click: 200ms `animate-pulse ring-red-500` flash + sonner toast. Layer 1 (Zod, Wave 1) and Layer 3 (groupFieldsByRow defensive cap, Wave 1) operational; Wave 2 completes the 3-layer T-36-06 mitigation.
- **D-G1 (builder unit test layer):** 8-case vitest+RTL coverage of `RowPositionSelector` selected/unselected/disabled state matrix + interaction contract (clicking enabled vs disabled buttons). FieldCard and SchemaFieldEditor changes verified by full vitest suite + tsc -b + vite build.

## Deviations from Plan

**None.** Plan executed exactly as written.

- All 4 file paths match `files_modified` frontmatter exactly.
- Commit prefixes follow contract: `test(36-02)` for RED phase, `feat(36-02)` for production code.
- 8 vitest cases match plan `<behavior>` block 1:1 (including case-8 jsdom-disabled-click rationale comment per PATTERNS test commentary).
- All cycle classes resolved via static array lookup `ROW_GROUP_*_CLASSES[(rowGroup-1)%4]` — zero Tailwind template interpolation in the diff.
- `onChange` re-emit timing: guard mutates `updated` reference BEFORE `onChange(newFields)` is called, so existing rules-cleanup branches see the cleaned field (matches plan's CRITICAL pattern alignment note).
- `+ 새 행` button uses `Plus` icon; `단독` button uses `Square` icon (per plan `<action>` block).
- Disabled buttons get native `disabled` attr + `aria-disabled="true"` + `title` attribute (per plan `<done>` block).

## Threat Model Compliance

| Threat ID | Disposition | Implementation |
|-----------|-------------|----------------|
| T-36-06 (Tampering, hard-cap-3 bypass) | mitigate | 3-layer enforcement operational: (1) visual disable + (2) native `disabled` HTML attr (suppresses click) + (3) handler-side `if (isDisabled) return` guard. All three layers verified in `RowPositionSelector.tsx` lines 116~127. Wave 1 Zod refinement is the import-boundary fallback. |
| T-36-07 (Information Disclosure, toast contents) | accept | All toasts use i18n keys from public catalog; no PII, no secrets. Toast text resolved via `t('templates.rowLayout.rowFullToast')` and `t('templates.rowLayout.wideTypeAutoSingleToast')`. |
| T-36-08 (Elevation of Privilege, rowGroup write path) | accept | Builder UI is admin-only (existing route guard, no change). `rowGroup` is purely layout metadata — never consulted by permission predicates, never logged in audit_log, never affects approval line. |
| T-36-09 (Tampering, wide-type force-single guard) | mitigate | Guard fires SYNCHRONOUSLY inside React `updateField` (controlled-input flow) BEFORE `onChange(newFields)`. Admin cannot persist a wide-type-with-rowGroup state because the guard runs before any state mutation propagates to onChange's parent. Zod refinement at save time is the fallback. |
| T-36-10 (Denial of Service, flash useState) | accept | `setTimeout(200)` is bounded; React 18 cleanup is automatic on unmount; no leak. `flashIndex` state is a single small integer — no memory pressure. |

## Hand-off Notes for Wave 3 (renderer)

Wave 2 produces the **builder-side data path** for `field.rowGroup` (admin's pill selection → `onUpdate({ ...field, rowGroup: rg ?? undefined })` → parent `onChange` → schema state). Wave 3 plans (likely 36-03) consume this via the Wave 1 `groupFieldsByRow` utility:

- **`DynamicCustomForm.tsx` (L237~262)** — replace `schema.fields.map(...)` with `groupFieldsByRow(schema.fields).map(g => g.kind === 'single' ? <renderCell> : <gridWrapper>)`. Hidden-field handling (D-19 — `display:none` for table type, unmount otherwise) is per-cell, NOT per-group.
- **`DynamicCustomReadOnly.tsx` (L76~85)** — replace `schema.fields.filter(...).map(...)` similarly. Pre-filter hidden fields BEFORE `groupFieldsByRow` (read-only has no form state to preserve).
- **`FormPreview.tsx` (L84~96)** — replace iteration similarly; `setFormValues` driving conditional/calculation evaluation unchanged.
- **`grid-cols-{N}` static enumeration** — use literal `colsClass = g.cols === 1 ? 'md:grid-cols-1' : g.cols === 2 ? 'md:grid-cols-2' : 'md:grid-cols-3'` lookup. NEVER template interpolation.
- **Cell wrappers** must include `min-w-0` to prevent CSS grid blowout on long inputs.
- **`<div role="group" aria-label={t('templates.rowLayout.rowGroupAriaLabel', { number })}>`** for screen-reader grouping.
- **Backward compat is automatic** — legacy `schemaSnapshot.fields[*].rowGroup === undefined` short-circuits `groupFieldsByRow` first branch, emitting all-`single` groups identical to current `space-y-4` vertical stack (D-D1 invariant pinned by Wave 1 test case 2).

## Hand-off Notes for Wave 4 (i18n)

Wave 2 references the following 11 i18n keys via `t()` calls. They will resolve once Wave 4 (likely Plan 36-04) lands the `templates.rowLayout.*` sub-tree in `frontend/public/locales/ko/admin.json`:

- `templates.rowLayout.singleButton` (RowPositionSelector — 단독 button)
- `templates.rowLayout.rowButton` with `{number}` (RowPositionSelector — 행 N button)
- `templates.rowLayout.newRowButton` (RowPositionSelector — + 새 행 button)
- `templates.rowLayout.rowFullTooltip` (disabled row button tooltip)
- `templates.rowLayout.rowFullToast` (cap-3 violation toast)
- `templates.rowLayout.sectionLabel` (FieldCard expanded panel section label "행 위치")
- `templates.rowLayout.helperHint` (FieldCard expanded panel helper text)
- `templates.rowLayout.rowGroupBadge` with `{number}` (FieldCard collapsed header pill "{N}행")
- `templates.rowLayout.wideTypeBadge` (FieldCard collapsed header amber badge "한 줄 차지")
- `templates.rowLayout.wideTypeAutoSingleToast` (SchemaFieldEditor force-single-row guard toast)
- (`templates.rowLayout.rowGroupAriaLabel` will be referenced by Wave 3 renderer)

Wave 1 already reserved `templates.rowLayout.zodWideTypeError` and `templates.rowLayout.zodCapExceededError`. Total of **13 keys** under `templates.rowLayout.*` per UI-SPEC §"i18n Key Contract" line 525.

## Self-Check: PASSED

| Item | Status |
|------|--------|
| `frontend/src/features/admin/components/SchemaFieldEditor/RowPositionSelector.tsx` exists + default exports + RowPositionSelectorProps | FOUND |
| `frontend/src/features/admin/components/SchemaFieldEditor/__tests__/RowPositionSelector.test.tsx` exists + 8 vitest cases | FOUND |
| `frontend/src/features/admin/components/SchemaFieldEditor/FieldCard.tsx` modified — imports RowPositionSelector + WIDE_TYPES + ROW_GROUP_*_CLASSES + Square; rowOccupancy required prop added; outer wrapper border-l + collapsed-header pill/amber-badge + expanded RowPositionSelector block | FOUND |
| `frontend/src/features/admin/components/SchemaFieldEditor/SchemaFieldEditor.tsx` modified — WIDE_TYPES import + rowOccupancy useMemo + wide-type guard at TOP of updateField + rowOccupancy passed to FieldCard | FOUND |
| Commit `bb70ee9` exists in git log | FOUND |
| Commit `db5ccbf` exists in git log | FOUND |
| Commit `5db19a4` exists in git log | FOUND |
| Commit `d2858ff` exists in git log | FOUND |
| `tsc -b --force` returns EXIT=0 | PASSED |
| Full vitest suite 85 pass / 0 fail | PASSED |
| `npm run build` succeeds | PASSED |
| `grep -c "RowPositionSelector\|ROW_GROUP_BORDER_CLASSES\|ROW_GROUP_PILL_CLASSES\|wideTypeBadge\|rowGroupBadge"` on FieldCard.tsx returns 8 | PASSED |
| `grep -c "rowOccupancy\|WIDE_TYPES\|wideTypeAutoSingleToast"` on SchemaFieldEditor.tsx returns 6 | PASSED |

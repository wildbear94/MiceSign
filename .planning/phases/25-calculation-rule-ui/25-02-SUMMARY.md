---
phase: 25-calculation-rule-ui
plan: "02"
subsystem: frontend/admin/schema-field-editor
tags: [calculation-rule, ui, preset, advanced-mode, cascade, circular-dep]
requires:
  - frontend/src/features/admin/components/SchemaFieldEditor/calculationRuleUtils.ts (from 25-01)
  - frontend/src/features/document/utils/detectCircularDeps.ts (import only)
provides:
  - CalculationRuleEditor component (preset + advanced mode + circular banner)
  - FieldCard Σ badge + friendly formula preview
  - SchemaFieldEditor calc rule cascade (delete / type change / table column change)
  - TemplateFormModal calculationRules state + save validation + hardcode removal
affects:
  - Downstream plan 25-03 will consume calculationRules via FormPreview props and add preview runtime + UAT
tech-stack:
  added: []
  patterns:
    - "Preset ↔ advanced mode toggle with useMemo-derived PresetConfig (Pitfall 6)"
    - "Inline circular banner driven by upstream detectCircularDeps useMemo (single computation)"
    - "Cascade pattern parallel to Phase 24 conditional rule cleanup"
    - "Save-time defense in depth: disabled button + onSubmit re-check + toast"
key-files:
  created:
    - frontend/src/features/admin/components/SchemaFieldEditor/CalculationRuleEditor.tsx
  modified:
    - frontend/src/features/admin/components/SchemaFieldEditor/types.ts
    - frontend/src/features/admin/components/SchemaFieldEditor/FieldCard.tsx
    - frontend/src/features/admin/components/SchemaFieldEditor/SchemaFieldEditor.tsx
    - frontend/src/features/admin/components/TemplateFormModal.tsx
decisions:
  - "SchemaFieldEditorProps calculationRules/onCalculationRulesChange declared optional (?) to keep backward compat with any existing callers, matching the Phase 24 conditionalRules pattern"
  - "FieldCard places calculation section in its own expanded region (parallel to ConditionalRuleEditor), not inside FieldConfigEditor — matches Phase 24 physical placement"
  - "cycles are computed once in SchemaFieldEditor via useMemo and passed down as prop; CalculationRuleEditor never calls detectCircularDeps itself"
  - "FormPreview prop drilling deferred to 25-03 (Option A in plan) — this plan keeps the TemplateFormModal ↔ SchemaFieldEditor wiring only"
metrics:
  tasks_completed: 3
  tasks_total: 3
  files_created: 1
  files_modified: 4
  duration: ~10 min
  completed_date: 2026-04-13
---

# Phase 25 Plan 02: Calculation Rule UI Integration Summary

**One-liner:** Admin calculation-rule editor UI — hybrid preset/advanced formula editor, Σ field badge, circular-dependency inline banner, cascade cleanup on field delete/type change/table column change, and TemplateFormModal save validation with the Pitfall-1 hardcoded `calculationRules: []` finally removed.

## What Was Built

**Task 1 — CalculationRuleEditor component + SchemaFieldEditorProps extension**
- Extended `SchemaFieldEditorProps` with optional `calculationRules` + `onCalculationRulesChange` (and retroactively moved `conditionalRules` into the interface — previously declared on the ambient `& { ... }` intersection, now centralized).
- Created `CalculationRuleEditor.tsx` (~460 LoC) exporting a single component with:
  - **Mode toggle** (preset / advanced) — text-link style, persists via local `isAdvanced` state.
  - **Preset mode** — 4 tabs (`sum-col`, `sum-mul`, `field-sum`, `ratio`) + `custom` indicator tag. Tab click resets to default params for that preset using available sources.
  - **PresetParams sub-component** — renders per-type dropdowns / checkboxes driven by `getAvailableCalcSources`. `field-sum` uses checkbox list, `ratio` uses numerator/denominator selects.
  - **Advanced mode** — single text input, `onBlur` triggers `validateFormula` → shows i18n error codes inline with red border.
  - **Σ preview** — single-line `renderFormulaFriendly` output (× / ÷).
  - **Inline circular banner** — filters parent-supplied `cycles` by `targetFieldId`, shows red banner with arrow-joined cycle path.
- `presetConfig` is a `useMemo(parseFormulaToPreset(rule.formula))` derived value — no duplicate local state (Pitfall 6 mitigation).
- Commit: `cd3e826`

**Task 2 — FieldCard + SchemaFieldEditor integration**
- `FieldCard.tsx`:
  - New imports: `Sigma` icon, `CalculationRule` type, `CalculationRuleEditor`, `renderFormulaFriendly`.
  - Extended props with `calculationRules`, `cycles`, `onAddCalcRule`, `onUpdateCalcRule`, `onDeleteCalcRule`.
  - Added header **Σ badge** next to the existing Zap (condition) badge: purple when clean, red when the field participates in a cycle.
  - Added collapsible `calcExpanded` section (only rendered when `field.type === 'number'`, satisfying D-19) that hosts `CalculationRuleEditor`.
- `SchemaFieldEditor.tsx`:
  - Destructures `calculationRules` + `onCalculationRulesChange` from props (defaults to `[]`).
  - Computes `cycles = useMemo(() => detectCircularDeps(calculationRules), [calculationRules])` once.
  - `updateField` extended with two new cascade branches:
    - Type change → `cleanupCalcRulesForTypeChange` + toast
    - `table → table` column diff → collect changed column IDs (deleted or `number → other`) → `cleanupCalcRulesForTableColumnChange` + toast (Pitfall 3)
  - `deleteField` extended with `cleanupCalcRulesForDeletedField` + toast.
  - FieldCard rendering passes all 5 new calc-related props plus `cycles`.
- Commit: `13c9ee6`

**Task 3 — TemplateFormModal wiring + save validation + Pitfall 1 fix**
- Imports: `useMemo`, `CalculationRule` type, `detectCircularDeps`, `validateFormula`.
- New state: `const [calculationRules, setCalculationRules] = useState<CalculationRule[]>([])`.
- Modal reset path (`!editingTemplate`): resets `calculationRules` to `[]` alongside the existing `conditionalRules` reset.
- Detail-load path (`detailQuery.data?.schemaDefinition`): `setCalculationRules(schema.calculationRules || [])` in both try and catch branches + also clears on the no-schemaDefinition branch.
- **Pitfall 1 fix**: the previously-hardcoded `calculationRules: []` in `JSON.stringify` was replaced with `calculationRules: calculationRules` — calculation rules will now actually persist.
- **onSubmit validation** (runs after conditional-rule validation, before the API call):
  - `detectCircularDeps(calculationRules)` → if non-empty, toast `circularSaveBlocked` and abort.
  - Per-rule `validateFormula(...)` → if any error, toast `validationError` and abort.
- **Save button disabled** derivation: `calcCycles` + `hasCalcErrors` memos combine cycle detection with per-rule validation; button `disabled={isLoading || hasCalcErrors}` with `title={hasCalcErrors ? circularSaveBlocked : undefined}`.
- `SchemaFieldEditor` now receives `calculationRules` + `onCalculationRulesChange` props.
- FormPreview / FullscreenPreviewPortal wiring intentionally deferred to Plan 25-03 (Plan recommended Option A).
- Commit: `f2694e6`

## Verification

- `npx tsc --noEmit` passes cleanly (zero errors) at every task boundary.
- `npm run build` succeeds (`✓ built in 795ms`, 1329 kB bundle).
- `git diff --stat 112a610 HEAD -- frontend/src/features/document/utils/executeCalculations.ts frontend/src/features/document/utils/detectCircularDeps.ts` → empty. Runtime calculation path untouched (T-25-08 mitigation).
- All acceptance criteria satisfied:
  - `CalculationRuleEditor.tsx` exists with `isAdvanced`, `parseFormulaToPreset`, `buildFormulaFromPreset`, `extractDependencies`, `validateFormula`, `Sigma`, `templates.calculation.errors.circularDependency`, `myCycles`, `PresetSelector` sub-component, and branches for all 4 preset types.
  - `types.ts` contains `calculationRules:` + `onCalculationRulesChange` in `SchemaFieldEditorProps`.
  - `FieldCard.tsx` imports `Sigma`, has `calcExpanded` state, wraps `CalculationRuleEditor` under `field.type === 'number'`, uses `renderFormulaFriendly`.
  - `SchemaFieldEditor.tsx` contains `detectCircularDeps`, `const cycles = useMemo`, all three cleanup helpers, `templates.calculation.rulesAutoRemoved`, `onCalculationRulesChange`.
  - `TemplateFormModal.tsx` contains the new state, edit-load assignment, `calculationRules: calculationRules` (NOT `calculationRules: []`), `detectCircularDeps`, `validateFormula`, `circularSaveBlocked` + `validationError`, and `onCalculationRulesChange={setCalculationRules}`.

## Deviations from Plan

### Refinements (not rule-level deviations)

**1. [Refinement] `conditionalRules` moved from ambient intersection into `SchemaFieldEditorProps`**
- **Found during:** Task 1
- **Context:** Plan assumed `SchemaFieldEditorProps` already carried `conditionalRules`, but Phase 24 had declared them via `SchemaFieldEditorProps & { conditionalRules?: ... }` inline in `SchemaFieldEditor.tsx`. Adding only `calculationRules` to the interface would have left the shape inconsistent.
- **Fix:** Hoisted both Phase 24 and Phase 25 rule props into the canonical `SchemaFieldEditorProps` interface (all optional `?` to preserve backward compat). Removed the `& { ... }` intersection from `SchemaFieldEditor.tsx`.
- **Files modified:** `types.ts`, `SchemaFieldEditor.tsx`
- **Commits:** `cd3e826`, `13c9ee6`

**2. [Refinement] `allRules` prop renamed `_allRules` in destructure**
- **Found during:** Task 1
- **Issue:** `CalculationRuleEditor` receives `allRules` for API symmetry with `ConditionalRuleEditor`, but the component does not consume it directly (cycles are computed upstream). ESLint/TS `noUnusedParameters` would complain.
- **Fix:** Destructure as `allRules: _allRules` to silence the warning while preserving the prop contract.
- **Files modified:** `CalculationRuleEditor.tsx`
- **Commit:** `cd3e826`

No Rule 1–4 deviations required. The plan was implemented as written.

## Threat Mitigations Verified

| Threat | Status | Evidence |
|--------|--------|----------|
| T-25-04 Tampering (hardcoded `[]`) | mitigated | `grep 'calculationRules: \[\]' TemplateFormModal.tsx` → no match in JSON.stringify. `calculationRules: calculationRules` present. |
| T-25-05 Orphan rules (table col change) | mitigated | `SchemaFieldEditor::updateField` table→table branch collects changed column IDs and calls `cleanupCalcRulesForTableColumnChange`. |
| T-25-06 Self-reference | mitigated | `validateFormula` already handles `selfReference`; CalculationRuleEditor surfaces it on blur. |
| T-25-07 Phantom preset state | mitigated | `presetConfig = useMemo(...)` — derived, not stored. No setState for preset. |
| T-25-08 Runtime path tampered | mitigated | `git diff` shows `executeCalculations.ts` and `detectCircularDeps.ts` unchanged. |

## Known Stubs

None. `calculationRules` is now fully plumbed end-to-end: state → SchemaFieldEditor → FieldCard → CalculationRuleEditor → persistence → reload. The only deferred wiring (FormPreview / FullscreenPreviewPortal consumption) is explicitly scoped to Plan 25-03 per plan recommendation.

## Threat Flags

None introduced. The editor is a pure frontend state manipulator; no new network endpoints, file access, or trust boundary crossings beyond the existing `schemaDefinition` JSON payload already covered by Phase 24.

## Self-Check: PASSED

- FOUND: frontend/src/features/admin/components/SchemaFieldEditor/CalculationRuleEditor.tsx
- FOUND: frontend/src/features/admin/components/SchemaFieldEditor/types.ts (extended)
- FOUND: frontend/src/features/admin/components/SchemaFieldEditor/FieldCard.tsx (extended)
- FOUND: frontend/src/features/admin/components/SchemaFieldEditor/SchemaFieldEditor.tsx (extended)
- FOUND: frontend/src/features/admin/components/TemplateFormModal.tsx (extended)
- FOUND: commit cd3e826 (Task 1)
- FOUND: commit 13c9ee6 (Task 2)
- FOUND: commit f2694e6 (Task 3)
- VERIFIED: `npx tsc --noEmit` exits 0
- VERIFIED: `npm run build` succeeds
- VERIFIED: executeCalculations.ts / detectCircularDeps.ts unchanged
- VERIFIED: No `calculationRules: []` hardcode remains in TemplateFormModal JSON.stringify path

---
phase: 36
plan: 01
subsystem: form-row-layout / data-model + utility foundation
tags: [phase-36, wave-1, schema-extension, zod-refine, pure-utility, tdd]
requires: []
provides:
  - "SchemaField.rowGroup?: number (builder type)"
  - "FieldDefinition.rowGroup?: number (renderer type, JSON-serialized)"
  - "WIDE_TYPES Set<SchemaFieldType> (admin/SchemaFieldEditor/constants.ts)"
  - "ROW_GROUP_BORDER_CLASSES / ROW_GROUP_PILL_CLASSES (Tailwind literal cycle arrays)"
  - "templateImportSchema Zod refinements (wide-type guard + hard cap=3)"
  - "groupFieldsByRow<T> generic utility + FieldRowGroup<T> discriminated union type"
affects:
  - "Wave 2 (builder UI) — consumes WIDE_TYPES + ROW_GROUP_*_CLASSES + SchemaField.rowGroup"
  - "Wave 3 (renderer) — consumes groupFieldsByRow + FieldDefinition.rowGroup"
  - "Wave 4 (i18n) — defines templates.rowLayout.zodWideTypeError + zodCapExceededError keys"
tech-stack:
  added: []
  patterns:
    - "Zod .strict() .refine() chain pattern (first .refine on schemaDefinitionSchema in this file)"
    - "Module-scope as-const literal arrays for Tailwind compile-time class detection"
    - "Generic over T extends { id, type, rowGroup? } — single utility serves SchemaField + FieldDefinition"
key-files:
  created:
    - "frontend/src/features/document/utils/groupFieldsByRow.ts"
    - "frontend/src/features/document/utils/__tests__/groupFieldsByRow.test.ts"
  modified:
    - "frontend/src/features/admin/components/SchemaFieldEditor/types.ts"
    - "frontend/src/features/admin/components/SchemaFieldEditor/constants.ts"
    - "frontend/src/features/document/types/dynamicForm.ts"
    - "frontend/src/features/admin/validations/templateImportSchema.ts"
    - "frontend/src/features/admin/validations/templateImportSchema.test.ts"
decisions:
  - "D-A1 reaffirmed: NO auto-arrange logic — rowGroup is purely user-assigned"
  - "D-C1/C2/C3 reaffirmed: WIDE_TYPES = Set(['textarea', 'table']), enforced at 3 layers"
  - "D-D1 reaffirmed: rowGroup === undefined → all-single output (legacy backward compat)"
  - "D-F1 option (i) ENACTED: rowGroup?: number on SchemaField + FieldDefinition (placed AFTER config)"
  - "D-F3 hard cap=3 ENACTED: Zod refine #2 enforces consecutive-run cap, utility honors defensive Math.min cap"
  - "D-G1 ENACTED: 6 Zod tests + 8 utility tests, no UI involvement at this layer"
metrics:
  duration: "12m 47s"
  completed: "2026-04-30T04:31:25Z"
  task-count: 3
  file-count: 7
  test-count: "14 new (6 Zod + 8 utility); 17/17 in templateImportSchema.test.ts; 8/8 in groupFieldsByRow.test.ts; full suite 77 pass / 39 todo / 0 fail"
---

# Phase 36 Plan 01: data-model + Zod refinements + groupFieldsByRow utility

**One-liner:** Wave 1 foundation — adds optional `rowGroup?: number` to both builder `SchemaField` and renderer `FieldDefinition` types, ships `WIDE_TYPES` + Tailwind cycle-class arrays as module-scope literal `as const` exports, extends `templateImportSchema` Zod schema with two `.refine()` rules (wide-type guard + hard cap=3), and authors a generic `groupFieldsByRow<T>` pure utility — establishing the type contracts, validation rules, and grouping algorithm that Wave 2 (builder UI) and Wave 3 (renderer) will consume.

## Files Created (2)

| File | Purpose |
|------|---------|
| `frontend/src/features/document/utils/groupFieldsByRow.ts` | Generic pure utility (single-pass O(n)) grouping fields into single/grid row groups; exports `groupFieldsByRow` function + `FieldRowGroup<T>` type union |
| `frontend/src/features/document/utils/__tests__/groupFieldsByRow.test.ts` | 8-case unit test pinning algorithm behavior (empty / legacy / 2-3-4 same-row / mixed / wide-forced / non-consecutive) |

## Files Modified (5)

| File | Change |
|------|--------|
| `frontend/src/features/admin/components/SchemaFieldEditor/types.ts` | Added `rowGroup?: number` to `SchemaField` interface (placed AFTER `config`) with inline `// Phase 36` comment |
| `frontend/src/features/document/types/dynamicForm.ts` | Added `rowGroup?: number` to `FieldDefinition` interface (placed AFTER `config?`) — mirrors backend record shape |
| `frontend/src/features/admin/components/SchemaFieldEditor/constants.ts` | Appended `WIDE_TYPES` (`Set<SchemaFieldType>`) + `ROW_GROUP_BORDER_CLASSES` + `ROW_GROUP_PILL_CLASSES` (4-entry `as const` literal-class arrays) |
| `frontend/src/features/admin/validations/templateImportSchema.ts` | Added `rowGroup` to `fieldDefinitionSchema`; chained 2 `.refine()` calls onto `schemaDefinitionSchema` (wide-type guard + hard cap=3) with i18n key messages; module-scope `WIDE_TYPES_FOR_VALIDATION` Set |
| `frontend/src/features/admin/validations/templateImportSchema.test.ts` | Added 6 new tests covering: accept rowGroup on text, reject on textarea, reject on table, accept 3 same-row, reject 4 same-row, accept non-consecutive interrupted by wide |

## Test Results

| Test file | Pass | Notes |
|-----------|------|-------|
| `templateImportSchema.test.ts` | 17/17 | 11 existing + 6 new (rowGroup describe block) |
| `groupFieldsByRow.test.ts` | 8/8 | All 8 documented scenarios pass |
| Full vitest suite | 77 pass / 39 todo / 0 fail / 4 skipped | No regression on existing tests |
| `tsc --noEmit` | EXIT=0 | Zero type errors |

## TDD Gate Compliance

Two of three tasks (Task 2 Zod refinements, Task 3 utility) followed strict RED→GREEN with separate commits. Task 1 (type extension + constants) is structurally enforced by `tsc --noEmit` and grep counts — no separate test file exists for type-shape assertions because TypeScript itself is the contract validator. Per the plan's `<verify><automated>` block, Task 1's gate is `tsc --noEmit returns 0 errors + grep counts ≥ 1`, which is the canonical pattern for pure type/constant additions in this codebase (matches Phase 21~26 type-extension precedent).

| Gate | Commit | Status |
|------|--------|--------|
| Task 1 GREEN (types + constants) | `c9085ee` | tsc 0 errors, grep all 5 patterns present |
| Task 2 RED (Zod tests) | `1159dde` | 6 new tests fail, 11 existing pass |
| Task 2 GREEN (Zod refinements) | `789e7ca` | 17/17 pass |
| Task 3 RED (utility tests) | `d72eab3` | Import resolution fails — module not yet authored |
| Task 3 GREEN (utility implementation) | `9a7d201` | 8/8 pass |

## Commits (5)

| Hash | Commit message |
|------|----------------|
| `c9085ee` | `feat(36-01): add rowGroup field + WIDE_TYPES / row-group color cycle constants` |
| `1159dde` | `test(36-01): add failing tests for rowGroup Zod refinements` |
| `789e7ca` | `feat(36-01): add Zod rowGroup field + wide-type guard + hard cap=3 refinements` |
| `d72eab3` | `test(36-01): add failing tests for groupFieldsByRow utility (8 cases)` |
| `9a7d201` | `feat(36-01): add groupFieldsByRow pure utility (generic, single-pass O(n))` |

## Decisions Reaffirmed

- **D-A1 (admin-explicit, no auto-arrange):** No auto-grouping logic anywhere. `rowGroup` is purely user-assigned. Validated by absence of any heuristic in the utility — the algorithm trusts the input as-is.
- **D-C1 (table forced single):** Zod refine #1 rejects `table` + `rowGroup`; utility forces single output for `type === 'table'` regardless of rowGroup value.
- **D-C2 (textarea forced single):** Same enforcement for `textarea`. WIDE_TYPES Set is the single source of truth ('textarea', 'table').
- **D-C3 (force-single whitelist):** WIDE_TYPES exported from `admin/SchemaFieldEditor/constants.ts` as `Set<SchemaFieldType>`. Three layers enforce it: builder (Wave 2 consumes), Zod refine, runtime utility (defensive `WIDE_TYPES.has(f.type)` short-circuit).
- **D-D1 (zero layout shift on legacy):** `rowGroup === undefined` first-branch of utility ensures legacy SUBMITTED docs (whose `schemaSnapshot.fields[*].rowGroup` is absent) emit all-single groups, identical to current `space-y-4` vertical stack. Test case 2 ("all rowGroup undefined → all singles") pins this invariant.
- **D-F1 option (i) ENACTED:** `rowGroup?: number` placed AFTER `config` field on both `SchemaField` and `FieldDefinition`. Optional field placed last per project convention (precedent: PATTERNS.md "Optional fields placed last").
- **D-F3 hard cap=3 (3-layer enforcement):**
  1. **Layer 1 (Zod, this plan):** Refine #2 rejects >3 consecutive same-rowGroup non-wide fields with i18n key `templates.rowLayout.zodCapExceededError`.
  2. **Layer 2 (builder UI, Wave 2):** Will visually disable buttons + flash on cap violation.
  3. **Layer 3 (runtime utility, this plan):** Defensive `Math.min(bucket.length, 3)` cap + leftover-as-singles emission for `bucket.length > 3` edge case (in case Zod is bypassed via direct DB write or legacy import).
- **D-G1 (validation-layer + utility-unit-test layers only):** No UI testing in this plan — Wave 2 plans cover RowPositionSelector, FieldCard, SchemaFieldEditor; Wave 3 plans cover DynamicCustomForm/ReadOnly grid rendering.

## Deviations from Plan

**None.** Plan executed exactly as written, including:
- Algorithm verbatim from UI-SPEC §"Layout Contract / Row grouping algorithm" lines 145~184 (with explicit defensive `bucket.length > 3` branch as documented in plan action).
- 8 test cases match the plan's documented scenarios precisely (including the bucket-of-1 edge-case acknowledgement in test 8).
- 6 Zod tests match the plan's required cases.
- File paths match the `files_modified` frontmatter exactly.
- Commit prefixes follow the plan's contract: `feat(36-01)` for production code, `test(36-01)` for failing-test setup.

## Threat Model Compliance

| Threat ID | Disposition | Implementation |
|-----------|-------------|----------------|
| T-36-01 | mitigate | Zod `.int().positive()` rejects negative/float/string rowGroup; `.refine()` blocks textarea/table+rowGroup combos and >3 same-row counts. Both surface i18n keys via existing `flattenZodErrors()`. |
| T-36-02 | accept | Pure data-transform; no PII or secrets in utility scope. |
| T-36-03 | mitigate | O(n) single-pass over field count; defensive `Math.min(bucket.length, 3)` + leftover-singles cap prevents blowup. |
| T-36-04 | accept | Layout-only concern; rowGroup never consulted by rules engines or access-control predicates. |
| T-36-05 | mitigate | Default-undefined branch in `groupFieldsByRow` ALWAYS emits single-row groups for legacy schemas. Test case 2 pins this. |

## Hand-off Notes for Wave 2 (builder UI)

Wave 2 plans (36-02, 36-03) consume the following exports from this plan:

**From `frontend/src/features/admin/components/SchemaFieldEditor/constants.ts`:**

```ts
export const WIDE_TYPES: Set<SchemaFieldType>;
//   → import for FieldCard wide-type badge rendering + RowPositionSelector hide condition + SchemaFieldEditor force-single guard

export const ROW_GROUP_BORDER_CLASSES: readonly [
  'border-l-4 border-l-blue-400 dark:border-l-blue-500',
  'border-l-4 border-l-emerald-400 dark:border-l-emerald-500',
  'border-l-4 border-l-violet-400 dark:border-l-violet-500',
  'border-l-4 border-l-amber-400 dark:border-l-amber-500',
];
//   → use ROW_GROUP_BORDER_CLASSES[(field.rowGroup - 1) % 4] in FieldCard wrapper className

export const ROW_GROUP_PILL_CLASSES: readonly [
  'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  ... // emerald, violet, amber
];
//   → use in FieldCard collapsed-header rowGroup pill
```

**From `frontend/src/features/admin/components/SchemaFieldEditor/types.ts`:**

```ts
export interface SchemaField {
  // ... existing fields
  rowGroup?: number;  // 1-indexed, undefined = single-row vertical stack
}
```

**From `frontend/src/features/document/types/dynamicForm.ts`:**

```ts
export interface FieldDefinition {
  // ... existing fields
  rowGroup?: number;  // mirror of SchemaField.rowGroup, JSON-serialized
}
```

## Hand-off Notes for Wave 3 (renderer)

**From `frontend/src/features/document/utils/groupFieldsByRow.ts`:**

```ts
export type FieldRowGroup<T extends { id: string; type: string; rowGroup?: number }> =
  | { kind: 'single'; field: T }
  | { kind: 'grid'; rowGroup: number; cols: 1 | 2 | 3; fields: T[] };

export function groupFieldsByRow<T extends { id: string; type: string; rowGroup?: number }>(
  fields: T[],
): FieldRowGroup<T>[];
```

Use in:
- `DynamicCustomForm.tsx` — replace `schema.fields.map(...)` (L237~262) with `groupFieldsByRow(schema.fields).map(g => g.kind === 'single' ? <renderCell> : <gridWrapper>)`
- `DynamicCustomReadOnly.tsx` — replace `schema.fields.filter(...).map(...)` (L76~85)
- `FormPreview.tsx` — replace L84~96 iteration

For the grid wrapper, derive `colsClass` from a static literal map (`{1: 'md:grid-cols-1', 2: 'md:grid-cols-2', 3: 'md:grid-cols-3'} as const`) — DO NOT use template interpolation (Tailwind compile-time detection requirement).

**Hidden-field handling preserved (D-19):** D-19 invariant from Phase 24.1 still holds — table-type hidden fields use `display:none` (preserves form state); non-table hidden fields can be unmounted. Apply per-cell, NOT per-group, when integrating with `groupFieldsByRow`.

## Hand-off Notes for Wave 4 (i18n)

i18n keys produced (NOT YET defined in `ko/admin.json`, Wave 4 responsibility):
- `templates.rowLayout.zodWideTypeError` — Korean copy: `긴 텍스트와 표 필드는 행 그룹에 속할 수 없습니다`
- `templates.rowLayout.zodCapExceededError` — Korean copy: `한 줄에는 최대 3개 필드까지만 배치할 수 있습니다`

These are the only two keys this plan produces. Wave 4 plans (likely 36-04 i18n catalog) will add 13 keys total under `templates.rowLayout.*` per UI-SPEC §"i18n Key Contract".

## Self-Check: PASSED

| Item | Status |
|------|--------|
| `frontend/src/features/admin/components/SchemaFieldEditor/types.ts` exists + has `rowGroup?: number` | FOUND |
| `frontend/src/features/document/types/dynamicForm.ts` exists + has `rowGroup?: number` | FOUND |
| `frontend/src/features/admin/components/SchemaFieldEditor/constants.ts` exists + exports WIDE_TYPES/ROW_GROUP_*_CLASSES | FOUND |
| `frontend/src/features/admin/validations/templateImportSchema.ts` exists + has 2 `.refine()` calls | FOUND |
| `frontend/src/features/admin/validations/templateImportSchema.test.ts` has new rowGroup describe block | FOUND |
| `frontend/src/features/document/utils/groupFieldsByRow.ts` exists + exports `groupFieldsByRow`, `FieldRowGroup` | FOUND |
| `frontend/src/features/document/utils/__tests__/groupFieldsByRow.test.ts` exists + 8 test cases | FOUND |
| Commit `c9085ee` exists in git log | FOUND |
| Commit `1159dde` exists in git log | FOUND |
| Commit `789e7ca` exists in git log | FOUND |
| Commit `d72eab3` exists in git log | FOUND |
| Commit `9a7d201` exists in git log | FOUND |

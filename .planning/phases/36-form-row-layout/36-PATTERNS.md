# Phase 36: form-row-layout — Pattern Map

**Mapped:** 2026-04-30
**Files analyzed:** 12 (8 modified + 4 NEW)
**Analogs found:** 12 / 12 (100% — all NEW files have at least one role+data-flow analog in the codebase)

> Source of truth: `36-CONTEXT.md` (D-A1~G5) + `36-UI-SPEC.md` (visual contract approved 5/6 PASS, 1 FLAG non-blocking).
> No `RESEARCH.md` was authored for Phase 36; UI-SPEC pre-resolved all open decisions (D-F1 → option i, D-F2 → pill selector, D-F3 → Zod `.refine()`).

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `frontend/src/features/admin/components/SchemaFieldEditor/types.ts` | data-model (TS interface) | static | (self — extend in place) | exact |
| `frontend/src/features/document/types/dynamicForm.ts` | data-model (TS interface) | static | (self — extend in place) | exact |
| `frontend/src/features/admin/validations/templateImportSchema.ts` | data-model (Zod schema) | validation | (self — extend in place; existing `.strict()` chain) | exact |
| `frontend/src/features/admin/validations/templateImportSchema.test.ts` | test (vitest) | unit | (self — extend with new tests) | exact |
| `frontend/src/features/document/utils/groupFieldsByRow.ts` **(NEW)** | utility (pure function) | transform | `frontend/src/features/document/utils/detectCircularDeps.ts` (pure data-transform util in same dir) | role-match |
| `frontend/src/features/document/utils/__tests__/groupFieldsByRow.test.ts` **(NEW)** | test (vitest) | unit | `frontend/src/features/admin/utils/templateExport.test.ts` (pure-function unit test) | role-match |
| `frontend/src/features/admin/components/SchemaFieldEditor/RowPositionSelector.tsx` **(NEW)** | builder UI (controlled component) | request-response (selection) | `frontend/src/features/admin/components/SchemaFieldEditor/TypeBadge.tsx` + `ConditionalRuleEditor.tsx` selector pattern | role-match (no exact pill-segment precedent) |
| `frontend/src/features/admin/components/SchemaFieldEditor/__tests__/RowPositionSelector.test.tsx` **(NEW)** | test (vitest+RTL) | unit | `frontend/src/features/document/components/__tests__/DrafterInfoHeader.test.tsx` (small-component RTL pattern) | role-match |
| `frontend/src/features/admin/components/SchemaFieldEditor/FieldCard.tsx` | builder UI (composition) | request-response | (self — add 3 visual additions in place) | exact |
| `frontend/src/features/admin/components/SchemaFieldEditor/SchemaFieldEditor.tsx` | builder UI (orchestrator) | request-response | (self — extend `updateField` cleanup branch) | exact |
| `frontend/src/features/admin/components/FormPreview/FormPreview.tsx` | renderer (preview) | streaming (live state) | `frontend/src/features/document/components/dynamic/DynamicCustomForm.tsx` L237~262 | exact (sister renderer) |
| `frontend/src/features/document/components/dynamic/DynamicCustomForm.tsx` | renderer (form) | request-response | (self — replace L237~262 iteration) | exact |
| `frontend/src/features/document/components/dynamic/DynamicCustomReadOnly.tsx` | renderer (read-only) | request-response | (self — replace L76~85 iteration) | exact |
| `frontend/public/locales/ko/admin.json` | i18n catalog | static | (self — add `templates.rowLayout.*` sub-tree under existing `templates.condition` / `templates.calculation` precedent at L230~263 / L264~) | exact |

---

## Pattern Assignments

### `frontend/src/features/admin/components/SchemaFieldEditor/types.ts` (data-model, static)

**Action:** Add `rowGroup?: number` to existing `SchemaField` interface (L43~49). Single-key delta.

**Pattern excerpt — current interface** (L43~49):

```ts
export interface SchemaField {
  id: string;
  type: SchemaFieldType;
  label: string;
  required: boolean;
  config: SchemaFieldConfig;
}
```

**Add:**

```ts
export interface SchemaField {
  id: string;
  type: SchemaFieldType;
  label: string;
  required: boolean;
  config: SchemaFieldConfig;
  rowGroup?: number;  // Phase 36 — 1-indexed row group, undefined = single-row vertical stack
}
```

**Pattern note:** Optional fields placed last per existing convention (e.g., `SchemaFieldConfig.placeholder?` etc. at L21~33). Comment style: inline `// Phase 36` per project precedent at types.ts L54 (`// Phase 24:`), L57 (`// Phase 25:`).

---

### `frontend/src/features/document/types/dynamicForm.ts` (data-model, static)

**Action:** Add `rowGroup?: number` to `FieldDefinition` interface (L42~48). Identical delta to `SchemaField` for renderer/serialization consistency.

**Pattern excerpt — current interface** (L42~48):

```ts
export interface FieldDefinition {
  id: string;
  type: FieldType;
  label: string;
  required: boolean;
  config?: FieldConfig;
}
```

**Add:** trailing optional `rowGroup?: number;` exactly mirroring builder type. Optional placement after `config?` per existing convention.

**Why two sibling types:** Phase 24.1 keeps builder `SchemaField` distinct from renderer `FieldDefinition` (matches backend record). UI-SPEC §"Data Model Contract" commits to keeping both shapes synchronized, with `rowGroup` JSON-serialized as `"rowGroup": N` or omitted.

---

### `frontend/src/features/admin/validations/templateImportSchema.ts` (data-model, validation)

**Analog:** itself — extend `fieldDefinitionSchema` (L76~84) and `schemaDefinitionSchema` (L108~115) in place.

**Imports pattern** (L1):

```ts
import { z, type ZodError } from 'zod';
```

**Existing `.strict()` field schema pattern** (L76~84) — copy this style:

```ts
const fieldDefinitionSchema = z
  .object({
    id: z.string().min(1),
    type: fieldTypeSchema,
    label: z.string().min(1),
    required: z.boolean(),
    config: fieldConfigSchema.optional(),
  })
  .strict();
```

**Add `rowGroup`:**

```ts
const fieldDefinitionSchema = z
  .object({
    id: z.string().min(1),
    type: fieldTypeSchema,
    label: z.string().min(1),
    required: z.boolean(),
    config: fieldConfigSchema.optional(),
    rowGroup: z.number().int().positive().optional(),  // Phase 36 — 1-indexed
  })
  .strict();
```

**Existing `schemaDefinitionSchema`** (L108~115) — currently NO `.refine()` calls; this phase introduces the first cross-field refinement on this object:

```ts
const schemaDefinitionSchema = z
  .object({
    version: z.number().int().positive(),
    fields: z.array(fieldDefinitionSchema),
    conditionalRules: z.array(conditionalRuleSchema).optional(),
    calculationRules: z.array(calculationRuleSchema).optional(),
  })
  .strict();
```

**Add 2 `.refine()` chained per UI-SPEC §"Data Model Contract" (executor reference, lines 396~452 of `36-UI-SPEC.md`):**

1. **Wide-type guard:** `textarea` / `table` MUST NOT have `rowGroup`.
2. **Hard cap=3:** consecutive same-`rowGroup` non-wide fields MUST NOT exceed 3.

`.refine()` `message:` MUST be an i18n key string (e.g., `'templates.rowLayout.zodWideTypeError'`) — surfaced via existing `flattenZodErrors()` helper at L137~144 which passes `issue.message` through unchanged. (No precedent for `.refine()` in this file — Phase 36 is the first; consume `flattenZodErrors` UI as-is.)

**Anti-pattern to avoid:** `Set<string>` usage at module scope is fine (`fieldTypeSchema` at L16~25 is a frozen `z.enum`). Define `WIDE_TYPES_FOR_VALIDATION` as a `Set` at module scope, NOT inside the refine closure (avoid per-validation reallocation).

---

### `frontend/src/features/admin/validations/templateImportSchema.test.ts` (test, unit)

**Analog:** itself — append new `describe` block(s) for the 2 new refinements, mirroring existing test style at L44~116.

**Imports pattern** (L1~3):

```ts
import { describe, it, expect } from 'vitest';
import { ZodError } from 'zod';
import { templateImportSchema, flattenZodErrors } from './templateImportSchema';
```

**Existing test structure for "rejects bad shape" (L70~84):**

```ts
it('rejects invalid field type (not in enum)', () => {
  const bad = {
    ...validPayload,
    schemaDefinition: {
      ...validPayload.schemaDefinition,
      fields: [{ id: 'a', type: 'invalidtype', label: 'A', required: false }],
    },
  };
  const result = templateImportSchema.safeParse(bad);
  expect(result.success).toBe(false);
  if (!result.success) {
    const paths = result.error.issues.map((i) => i.path.join('.'));
    expect(paths.some((p) => p.startsWith('schemaDefinition.fields.0.type'))).toBe(true);
  }
});
```

**New tests to add (executor reference):**
- `accepts rowGroup on text/number/date/select/staticText/hidden fields`
- `rejects rowGroup on textarea field` → expects refinement message `'templates.rowLayout.zodWideTypeError'`
- `rejects rowGroup on table field` → same message
- `accepts up to 3 consecutive non-wide fields with same rowGroup`
- `rejects 4 consecutive non-wide fields with same rowGroup` → expects `'templates.rowLayout.zodCapExceededError'`
- `accepts non-consecutive same-rowGroup fields if interrupted by wide` (defensive — algorithm short-circuits per group; this test pins the "consecutive" semantic)

---

### `frontend/src/features/document/utils/groupFieldsByRow.ts` **(NEW)** (utility, transform)

**Analog:** `frontend/src/features/document/utils/detectCircularDeps.ts` (pure data-transform utility in the same directory; identical "input → derived structure" shape).

**Imports pattern** (`detectCircularDeps.ts` L1):

```ts
import type { CalculationRule } from '../types/dynamicForm';
```

→ For Phase 36, use generic `T extends { id: string; type: string; rowGroup?: number }` per UI-SPEC §"Component API Contract C" (line 568~575) — utility shared by both `SchemaField` (builder) and `FieldDefinition` (renderer).

**Pattern to copy — function-level JSDoc style** (`detectCircularDeps.ts` L3~11):

```ts
/**
 * Detects circular dependencies in calculation rules.
 *
 * Builds a dependency graph from rules where each `targetFieldId` depends on
 * the fields listed in `dependsOn`. Uses iterative DFS to find all cycles.
 *
 * @returns Array of cycles found. ...
 */
```

**Algorithm pattern — pure function returning a derived structure** (`detectCircularDeps.ts` L12~74):

The Phase 36 algorithm is simpler (single pass, no graph). Copy the **shape**, not the logic:
- Module-scope constants (`const WIDE_TYPES = new Set(['textarea', 'table']);` matches `evaluateConditions.ts` L8 `type ComparisonOperator = …` pattern of declaring discrete value sets at module scope).
- Generic `<T extends ...>` signature.
- Walk-loop with `while (i < fields.length)` — same iteration style as `detectCircularDeps.ts` L20~26.
- Defensive `Math.min(bucket.length, 3)` cap per UI-SPEC line 179 (Zod is upstream guard; runtime is defense-in-depth).

**Concrete reference for the implementation body:** UI-SPEC §"Layout Contract / Row grouping algorithm" lines 145~184 of `36-UI-SPEC.md` is byte-ready pseudocode. Executor copies it verbatim with type-generic substitution.

**Export shape (UI-SPEC §C, line 568~575):**

```ts
export type FieldRowGroup<T extends { id: string; type: string; rowGroup?: number }> =
  | { kind: 'single'; field: T }
  | { kind: 'grid'; rowGroup: number; cols: 1 | 2 | 3; fields: T[] };

export function groupFieldsByRow<T extends { id: string; type: string; rowGroup?: number }>(
  fields: T[],
): FieldRowGroup<T>[];
```

---

### `frontend/src/features/document/utils/__tests__/groupFieldsByRow.test.ts` **(NEW)** (test, unit)

**Analog:** `frontend/src/features/admin/utils/templateExport.test.ts` (pure-function unit test) — same "construct fixture → assert returned shape" pattern.

**Imports pattern** (`templateExport.test.ts` L1~3):

```ts
import { describe, it, expect } from 'vitest';
import type { TemplateDetailItem } from '../api/templateApi';
import { buildExportPayload, buildExportFilename } from './templateExport';
```

**Fixture-builder helper pattern** (`templateExport.test.ts` L5~28):

```ts
const makeDetail = (over: Partial<TemplateDetailItem> = {}): TemplateDetailItem => ({
  id: 42,
  // ... default values ...
  ...over,
});
```

→ For `groupFieldsByRow`, build a `makeField(over)` helper returning a minimal `{ id, type, label, required, rowGroup? }`. Spread-override pattern keeps each `it()` fixture concise.

**Test list (executor reference):**
- `empty fields array → []` (boundary)
- `all rowGroup=undefined → all singles` (legacy / backward compat — D-D1)
- `2 fields with rowGroup=1 → one grid group, cols=2`
- `3 fields with rowGroup=1 → one grid group, cols=3`
- `4 fields with rowGroup=1 → grid group cols=3 + leftover 1 single` (defensive: Zod blocks upstream but runtime caps to 3)
- `mixed: rowGroup=1, 1, undefined, 2, 2 → grid(2) + single + grid(2)`
- `wide field (textarea) with rowGroup=1 → forced single` (D-C1, D-C2)
- `non-consecutive same rowGroup: rg=1, undefined, rg=1 → 3 single groups` (consecutive semantic — matches Zod refinement scope)

---

### `frontend/src/features/admin/components/SchemaFieldEditor/RowPositionSelector.tsx` **(NEW)** (builder UI, request-response)

**Analog:** No exact pill/segmented control precedent in the codebase. Closest analogs:

| Source | Pattern fragment |
|--------|------------------|
| `PresetGallery.tsx` L109~114 | `button` "card" with selected/hover state via Tailwind |
| `FieldCard.tsx` L116~133 | Up/Down/Delete action buttons with `disabled` + `disabled:opacity-30 disabled:cursor-not-allowed` |
| `FieldCard.tsx` L96~99 | Inline pill `<span className="inline-flex items-center bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 rounded px-1 py-0.5">` |
| `SchemaFieldEditor.tsx` L168~182 | Button list pattern `FIELD_TYPES.map((type) => <button …>)` |

**Imports pattern** (copy from `FieldCard.tsx` L1~12 — same dir):

```ts
import { useState } from 'react';
import { /* lucide icons */ } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { /* types */ } from './types';
```

→ For Phase 36, drop `useState` (component is fully controlled per UI-SPEC §"Component API Contract A"); imports become:

```ts
import { Plus, Square } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
```

**i18n hook pattern** (`SchemaFieldEditor.tsx` L24, `FieldCard.tsx` L53):

```ts
const { t } = useTranslation('admin');
```

**Button "selected vs unselected" pattern — copy from UI-SPEC §B Builder Layout** (lines 294~296 of `36-UI-SPEC.md`):

```tsx
// unselected
className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded
           border border-gray-300 dark:border-gray-600
           bg-gray-50 dark:bg-gray-800
           text-gray-700 dark:text-gray-200
           hover:bg-gray-100 dark:hover:bg-gray-700
           transition-colors"

// selected
className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded
           border border-blue-600
           bg-blue-600 text-white
           dark:bg-blue-500 dark:border-blue-500"

// disabled (cap=3 reached, this field not in row)
className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded
           border border-gray-200 dark:border-gray-700
           bg-gray-100 dark:bg-gray-800/50
           text-gray-400 dark:text-gray-600
           cursor-not-allowed"
```

**Pattern reference:** This style mirrors `PresetGallery.tsx` L114 (`hover:border-blue-600 focus:ring-blue-600/30`) for selected accent, and `FieldCard.tsx` L120 (`disabled:opacity-30 disabled:cursor-not-allowed`) for disabled style. Phase 36's selected = `bg-blue-600` (full fill, more affordance than border-only) because it's a segmented selector, not a card.

**Toast pattern for hard-cap-3 violation** (`SchemaFieldEditor.tsx` L67):

```ts
toast(t('templates.condition.rulesAutoRemoved', { count: removedCount }));
```

→ For Phase 36:

```ts
toast(t('templates.rowLayout.rowFullToast'));
```

**`animate-pulse ring-2 ring-red-500` flash pattern:** No direct precedent in the codebase (`FieldCard.tsx` L105 uses `bg-red-100` for cycle-error state but no animate flash). UI-SPEC §"Color" line 96 prescribes the new pattern explicitly (200ms transient). Implementation note: use a 200ms `setTimeout` to clear a transient `useState<boolean>` flag controlling the class.

**Disabled-attribute accessibility** (`FieldCard.tsx` L118~120):

```tsx
<button
  type="button"
  disabled={index === 0}
  onClick={() => onMove('up')}
  className="… disabled:opacity-30 disabled:cursor-not-allowed …"
  title="위로 이동"
>
```

→ For Phase 36 disabled buttons, also add `aria-disabled="true"` and `title={t('templates.rowLayout.rowFullTooltip')}` per UI-SPEC §"Accessibility Contract" line 742.

**Component API contract** — already defined in UI-SPEC §"Component API Contract A" (lines 542~556). Executor copies prop signature verbatim.

---

### `frontend/src/features/admin/components/SchemaFieldEditor/__tests__/RowPositionSelector.test.tsx` **(NEW)** (test, unit)

**Analog:** `frontend/src/features/document/components/__tests__/DrafterInfoHeader.test.tsx` (small-component RTL pattern, no router/query providers needed, `i18n` mocked to identity).

**Imports + i18n mock pattern** (`DrafterInfoHeader.test.tsx` L1~7):

```ts
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import DrafterInfoHeader from '../DrafterInfoHeader';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
```

→ For RowPositionSelector, the same identity-`t` mock makes assertions on the i18n KEY rather than translated copy, decoupling tests from `admin.json` copy churn.

**Render+assert pattern** (`DrafterInfoHeader.test.tsx` L11~22):

```ts
it('mode=draft — 부서/직위·직책/기안자 표시 + 기안일 = 플레이스홀더', () => {
  render(<DrafterInfoHeader mode="draft" live={…} />);
  expect(screen.getByText('개발1팀')).toBeInTheDocument();
  expect(screen.queryByText('drafterInfo.currentInfoBadge')).not.toBeInTheDocument();
});
```

**For RowPositionSelector — additional `userEvent` for interaction.** Sister analog (more complete RTL pattern): `frontend/src/features/approval/components/__tests__/ApprovalLineEditor.test.tsx` — check that file for `fireEvent` / `userEvent` patterns if needed.

**Test list (executor reference, per UI-SPEC §"Component API Contract A"):**
- `value=null → "단독" button has selected style; "행 1" / "+ 새 행" enabled`
- `value=1, occupancy={1: 1} → "행 1" selected; "행 2" / "+ 새 행" present`
- `value=null, occupancy={1: 3} → "행 1" disabled with title="templates.rowLayout.rowFullTooltip"`
- `value=2, occupancy={1: 3, 2: 2} → "행 1" disabled (own field not in row 1); "행 2" selected (own field counted, so 2 < 3)`
- `clicking "단독" → onChange(null)`
- `clicking "행 2" → onChange(2)`
- `clicking "+ 새 행" → onChange(maxRowGroup + 1)`
- `clicking disabled "행 1" → onChange NOT called; toast spy called with 'templates.rowLayout.rowFullToast'`

---

### `frontend/src/features/admin/components/SchemaFieldEditor/FieldCard.tsx` (builder UI, modify in place)

**Analog:** itself — three discrete additions per UI-SPEC §"Visual Mode Matrix" + §F "FieldCard (MODIFIED)" (line 588~592).

**Existing collapsed-header pill pattern** (L96~113) — copy this style for Phase 36 rowGroup pill / wide-type badge:

```tsx
{conditionalRules.some(r => r.targetFieldId === field.id) && (
  <span className="inline-flex items-center bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 rounded px-1 py-0.5">
    <Zap className="w-3.5 h-3.5" />
  </span>
)}
{myCalcRule && (
  <span
    className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs font-mono max-w-[200px] ${
      hasCalcCycle
        ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'
        : 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300'
    }`}
    title={renderFormulaFriendly(myCalcRule.formula)}
  >
    <Sigma className="w-3.5 h-3.5 shrink-0" />
    <span className="truncate">= {renderFormulaFriendly(myCalcRule.formula)}</span>
  </span>
)}
```

**Phase 36 additions (insert in same header, after `TypeBadge` at L83 and before field name at L84~90 per UI-SPEC §B line 260~261):**

1. **rowGroup pill** (`rowGroup !== undefined && !WIDE_TYPES.has(field.type)`):
   ```tsx
   <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 text-xs rounded
       bg-${cycle}-100 text-${cycle}-700 dark:bg-${cycle}-900/40 dark:text-${cycle}-300`}>
     {t('templates.rowLayout.rowGroupBadge', { number: field.rowGroup })}
   </span>
   ```
   `cycle` derived from `(field.rowGroup - 1) % 4` mapped to `['blue', 'emerald', 'violet', 'amber']` per UI-SPEC §"Color" lines 105~111. **Tailwind dynamic class warning:** Tailwind cannot detect interpolated class strings. Solution: enumerate via static `const ROW_GROUP_BADGE_CLASSES = ['bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300', 'bg-emerald-100 …', …]` map at module scope — see "Shared Patterns / Tailwind dynamic class enumeration" below.

2. **Wide-type badge** (`WIDE_TYPES.has(field.type)`):
   ```tsx
   <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-xs rounded
       bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
     <Square className="w-3 h-3" />
     {t('templates.rowLayout.wideTypeBadge')}
   </span>
   ```
   Mirrors **L97~99 amber pill SoT exactly** — UI-SPEC §"Spacing" line 58 cited this as the production source of truth (Dim 5 FLAG note refers to badge `px-1.5 py-0.5`).

**Outer wrapper border-l-4 modification** (L74):

```tsx
// current:
<div className="border border-gray-200 dark:border-gray-700 rounded-lg hover:border-gray-300 dark:hover:border-gray-600 transition-colors">

// Phase 36: conditionally append border-l class via static lookup
<div className={`border border-gray-200 dark:border-gray-700 rounded-lg hover:border-gray-300 dark:hover:border-gray-600 transition-colors ${
  field.rowGroup !== undefined && !WIDE_TYPES.has(field.type)
    ? ROW_GROUP_BORDER_CLASSES[(field.rowGroup - 1) % 4]
    : ''
}`}>
```

**Expanded panel — RowPositionSelector insertion** (between L188 "Required checkbox" and L191 "Type-specific config" per UI-SPEC §B line 268~286):

```tsx
{!WIDE_TYPES.has(field.type) && (
  <div className="border-t border-gray-100 dark:border-gray-700 pt-3">
    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
      {t('templates.rowLayout.sectionLabel')}
    </label>
    <RowPositionSelector
      value={field.rowGroup ?? null}
      onChange={(rg) => onUpdate({ ...field, rowGroup: rg ?? undefined })}
      currentRowOccupancy={rowOccupancy}
      ownCurrentRowGroup={field.rowGroup ?? null}
    />
    <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
      {t('templates.rowLayout.helperHint')}
    </p>
  </div>
)}
```

The `border-t border-gray-100 dark:border-gray-700 pt-3` divider style copies the existing **conditional rule section divider at L198** (same file, same dir) verbatim.

**Pattern note for `t('…', { number: N })` interpolation:** existing `i18next` interpolation is used only by Phase 36 (no precedent in `admin.json`). Format `{{number}}` per i18next default per UI-SPEC §"i18n Key Contract" line 513 / 520.

**`rowOccupancy` prop:** new prop on `FieldCard` — passed down from `SchemaFieldEditor`. See next file.

---

### `frontend/src/features/admin/components/SchemaFieldEditor/SchemaFieldEditor.tsx` (builder UI, modify in place)

**Analog:** itself — extend the existing `updateField` cleanup branch pattern (L57~108) and add a `useMemo` for `rowOccupancy`.

**Existing `updateField` type-change cleanup pattern** (L57~108) — this is the canonical analog for Phase 36's force-single-row guard:

```ts
const updateField = (index: number, updated: SchemaField) => {
  const oldField = fields[index];
  const newFields = [...fields];
  newFields[index] = updated;
  onChange(newFields);

  // D-25: Cleanup rules when field type changes
  if (oldField.type !== updated.type && onConditionalRulesChange) {
    const [cleanedRules, removedCount] = cleanupRulesForTypeChange(updated.id, updated.type, conditionalRules);
    if (removedCount > 0) {
      toast(t('templates.condition.rulesAutoRemoved', { count: removedCount }));
      onConditionalRulesChange(cleanedRules);
    }
  }

  // Phase 25: calculation rule cascade on type change (D-08)
  if (oldField.type !== updated.type && onCalculationRulesChange) {
    /* … similar shape … */
  }
  // …
};
```

**Phase 36 force-single guard — insert at the END of `updateField` per UI-SPEC §"Force-Single-Row Guard" lines 471~481:**

```ts
// Phase 36: Wide-type force-single-row guard (D-C4)
if (
  oldField.type !== updated.type &&
  WIDE_TYPES.has(updated.type) &&
  updated.rowGroup !== undefined
) {
  const cleanedField = { ...updated, rowGroup: undefined };
  newFields[index] = cleanedField;
  onChange(newFields);  // re-emit with cleaned field
  toast(t('templates.rowLayout.wideTypeAutoSingleToast'));
}
```

**CRITICAL pattern alignment** — the existing cleanup branches call `onChange(newFields)` ONCE at top of `updateField` (L61) and then conditionally fire **rule** cleanup callbacks. Phase 36's guard must **re-emit** `onChange` because the guard mutates the `field` itself (not a separate rules state). Place the guard **before** the rules-cleanup branches OR re-call `onChange` after — executor decides based on the surrounding flow. Recommended: place guard FIRST so the `updated` reference downstream cleanup uses already has cleaned `rowGroup`.

**`WIDE_TYPES` constant — module-scope addition.** Pattern precedent: existing `CONDITION_EXCLUDED_TARGET_TYPES` import from `./constants` (L6) then used at FieldCard.tsx L197. For Phase 36, add `WIDE_TYPES` to `./constants.ts` next to existing constants:

```ts
// constants.ts (add)
export const WIDE_TYPES = new Set<SchemaFieldType>(['textarea', 'table']);
```

Then import in both `SchemaFieldEditor.tsx`, `FieldCard.tsx`, `RowPositionSelector.tsx`, and `groupFieldsByRow.ts`. (Verify `constants.ts` exists — was listed in dir scan above. The runtime `WIDE_TYPES` constant for the renderer side `groupFieldsByRow.ts` may need a separate export from `frontend/src/features/document/utils/` if circular-import concerns arise; UI-SPEC §"Layout Contract" inlines it locally as the Source of Truth and that is fine.)

**`rowOccupancy` `useMemo` pattern** — copy the existing `cycles` `useMemo` at L55:

```ts
const cycles = useMemo(() => detectCircularDeps(calculationRules), [calculationRules]);
```

→ For Phase 36 (UI-SPEC §G line 601~610):

```ts
const rowOccupancy = useMemo(() => {
  const occ: Record<number, number> = {};
  for (const f of fields) {
    if (f.rowGroup !== undefined && !WIDE_TYPES.has(f.type)) {
      occ[f.rowGroup] = (occ[f.rowGroup] ?? 0) + 1;
    }
  }
  return occ;
}, [fields]);
```

Pass to `<FieldCard rowOccupancy={rowOccupancy} … />` at L198.

**Toast import — already in scope** (L4):

```ts
import { toast } from 'sonner';
```

---

### `frontend/src/features/admin/components/FormPreview/FormPreview.tsx` (renderer, streaming)

**Analog:** `frontend/src/features/document/components/dynamic/DynamicCustomForm.tsx` L237~262 (sister renderer; identical iteration pattern).

**Existing iteration pattern** (`FormPreview.tsx` L84~97):

```tsx
<div className="space-y-4">
  {fields
    .filter((f) => f.type !== 'hidden' && !hiddenFields.has(f.id))
    .map((field) => (
      <PreviewFieldRenderer
        key={field.id}
        field={field}
        value={formValues[field.id]}
        onChange={(val) => setFormValues(prev => ({ ...prev, [field.id]: val }))}
        dynamicRequired={requiredFields.has(field.id)}
        disabled={calcResultIds.has(field.id)}
      />
    ))}
</div>
```

**Phase 36 replacement — copy verbatim from UI-SPEC §A "Render template per group" lines 188~217:**

```tsx
<div className="space-y-4">
  {groupFieldsByRow(
    fields.filter((f) => f.type !== 'hidden' && !hiddenFields.has(f.id))
  ).map((g) => {
    if (g.kind === 'single') {
      return (
        <div key={g.field.id}>
          <PreviewFieldRenderer
            field={g.field}
            value={formValues[g.field.id]}
            onChange={(val) => setFormValues(prev => ({ ...prev, [g.field.id]: val }))}
            dynamicRequired={requiredFields.has(g.field.id)}
            disabled={calcResultIds.has(g.field.id)}
          />
        </div>
      );
    }
    const colsClass = g.cols === 1 ? 'md:grid-cols-1' : g.cols === 2 ? 'md:grid-cols-2' : 'md:grid-cols-3';
    return (
      <div
        key={`row-${g.rowGroup}-${g.fields[0].id}`}
        role="group"
        aria-label={t('templates.rowLayout.rowGroupAriaLabel', { number: g.rowGroup })}
        className={`grid grid-cols-1 ${colsClass} gap-4`}
      >
        {g.fields.map((f) => (
          <div key={f.id} className="min-w-0">
            <PreviewFieldRenderer
              field={f}
              value={formValues[f.id]}
              onChange={(val) => setFormValues(prev => ({ ...prev, [f.id]: val }))}
              dynamicRequired={requiredFields.has(f.id)}
              disabled={calcResultIds.has(f.id)}
            />
          </div>
        ))}
      </div>
    );
  })}
</div>
```

**Important pre-filter:** `hiddenFields.has(f.id)` filter happens BEFORE `groupFieldsByRow` call. UI-SPEC §A line 246 documents the alternate "render display:none" approach for `DynamicCustomForm` which preserves form state; FormPreview has no form state to preserve and CAN safely pre-filter.

**`grid-cols-{N}` static enumeration** — must use `colsClass` literal lookup, not template interpolation, for Tailwind to detect classes (see "Shared Patterns / Tailwind dynamic class enumeration" below).

---

### `frontend/src/features/document/components/dynamic/DynamicCustomForm.tsx` (renderer, request-response)

**Analog:** itself — the **canonical SoT** for the renderer pattern. Replace L237~262 in place.

**Existing iteration pattern** (L237~262):

```tsx
{schema.fields.map((field: FieldDefinition) => {
  const isHidden = hiddenFields.has(field.id);
  // table 외 숨김 필드는 unmount (값은 form state 에 보존됨 — D-19)
  if (isHidden && field.type !== 'table') return null;
  const errMsg = form.formState.errors[field.id]?.message as string | undefined;
  return (
    <div
      key={field.id}
      style={isHidden ? { display: 'none' } : undefined}
    >
      <DynamicFieldRenderer
        field={field}
        mode="edit"
        register={form.register as any}
        control={form.control as any}
        error={errMsg}
        dynamicRequired={requiredFields.has(field.id)}
        disabled={readOnly || calcResultFieldIds.has(field.id)}
      />
    </div>
  );
})}
```

**Phase 36 replacement strategy — adapt the per-group template to handle Phase 24.1's hidden-field rules (D-19, line 240):**

Hidden-field handling is **per-cell, not per-group**:
- For **non-table hidden** fields: `return null` from the cell wrapper → CSS grid auto-collapses the cell.
- For **table hidden** fields: render with `style={{ display: 'none' }}` (preserves form state).

**Patched per-cell wrapper** (apply UI-SPEC §A "Conditional-hidden field in row" line 230 + UI-SPEC §C line 244~247):

```tsx
const renderCell = (field: FieldDefinition, isInGrid: boolean) => {
  const isHidden = hiddenFields.has(field.id);
  if (isHidden && field.type !== 'table') {
    return isInGrid ? <div key={field.id} style={{ display: 'none' }} /> : null;
  }
  const errMsg = form.formState.errors[field.id]?.message as string | undefined;
  return (
    <div
      key={field.id}
      className={isInGrid ? 'min-w-0' : undefined}
      style={isHidden ? { display: 'none' } : undefined}
    >
      <DynamicFieldRenderer field={field} mode="edit" register={form.register as any} control={form.control as any} error={errMsg} dynamicRequired={requiredFields.has(field.id)} disabled={readOnly || calcResultFieldIds.has(field.id)} />
    </div>
  );
};

// Then in JSX:
{groupFieldsByRow(schema.fields).map((g) => {
  if (g.kind === 'single') return renderCell(g.field, /* isInGrid */ false);
  const colsClass = g.cols === 1 ? 'md:grid-cols-1' : g.cols === 2 ? 'md:grid-cols-2' : 'md:grid-cols-3';
  return (
    <div
      key={`row-${g.rowGroup}-${g.fields[0].id}`}
      role="group"
      aria-label={t('templates.rowLayout.rowGroupAriaLabel', { number: g.rowGroup })}
      className={`grid grid-cols-1 ${colsClass} gap-4`}
    >
      {g.fields.map((f) => renderCell(f, /* isInGrid */ true))}
    </div>
  );
})}
```

**Why not pre-filter hidden** (FormPreview-style): D-19 requires `display:none` for **table** hidden fields (preserves form state in RHF when conditional unhides). Pre-filter would unmount → loses state.

**`useTranslation` import** — DynamicCustomForm currently does NOT use i18n (L1~13 imports). Phase 36 introduces `t()` for `aria-label`. Add at file top:

```ts
import { useTranslation } from 'react-i18next';
// inside DynamicFormInner:
const { t } = useTranslation('admin');  // or 'document' — verify which namespace owns 'templates.rowLayout.*'
```

UI-SPEC §"i18n Key Contract" line 506 places keys under `admin` namespace. Renderer in `document` feature will need to reference cross-namespace via `t('templates.rowLayout.rowGroupAriaLabel', { number: N, ns: 'admin' })` OR mirror the single ARIA key into `document.json`. **DEFERRED to plan-phase decision** — this is the only cross-namespace consideration in Phase 36. Recommended: add the single ARIA key to `document.json` mirror to keep renderer self-contained, since it's read-only string.

---

### `frontend/src/features/document/components/dynamic/DynamicCustomReadOnly.tsx` (renderer, request-response)

**Analog:** itself — replace L76~85 iteration. Also a sister-of `DynamicCustomForm.tsx` so the algorithm is shared.

**Existing iteration pattern** (L76~85):

```tsx
{schema.fields
  .filter((f) => !hiddenFields.has(f.id) && f.type !== 'hidden')
  .map((field) => (
    <ReadOnlyField
      key={field.id}
      field={field}
      value={values[field.id]}
    />
  ))}
```

**Phase 36 replacement** — same pre-filter (ReadOnly is read-only; no form state to preserve, FormPreview-style pre-filter is safe):

```tsx
{groupFieldsByRow(
  schema.fields.filter((f) => !hiddenFields.has(f.id) && f.type !== 'hidden')
).map((g) => {
  if (g.kind === 'single') {
    return <ReadOnlyField key={g.field.id} field={g.field} value={values[g.field.id]} />;
  }
  const colsClass = g.cols === 1 ? 'md:grid-cols-1' : g.cols === 2 ? 'md:grid-cols-2' : 'md:grid-cols-3';
  return (
    <div
      key={`row-${g.rowGroup}-${g.fields[0].id}`}
      role="group"
      aria-label={t('templates.rowLayout.rowGroupAriaLabel', { number: g.rowGroup })}
      className={`grid grid-cols-1 ${colsClass} gap-4`}
    >
      {g.fields.map((f) => (
        <div key={f.id} className="min-w-0">
          <ReadOnlyField field={f} value={values[f.id]} />
        </div>
      ))}
    </div>
  );
})}
```

**Backward compat (D-D1) is automatic:** legacy `schemaSnapshot.fields[*].rowGroup === undefined` → `groupFieldsByRow` first branch → all-`single` → identical to current behavior. UI-SPEC §C line 324 promises "zero layout shift on legacy SUBMITTED docs". The ReadOnly component is the primary surface for legacy doc viewing.

**`useTranslation` import** — same caveat as DynamicCustomForm. ReadOnly currently has zero i18n imports (L1~9). Add `useTranslation('document')` (or `'admin'` per cross-namespace decision).

---

### `frontend/public/locales/ko/admin.json` (i18n catalog, static)

**Analog:** itself — extend with new sub-tree. Existing precedent: `templates.condition.*` (L230~263), `templates.calculation.*` (L264~).

**Existing structure pattern** (L230~263 condensed):

```json
"templates": {
  /* … many existing flat keys … */
  "condition": {
    "sectionTitle": "조건 규칙",
    "noRule": "조건 규칙이 없습니다",
    "addRule": "조건 추가",
    /* … */
    "operators": { /* nested object — used as t('templates.condition.operators.eq') */ },
    "actions": { /* nested object */ },
    "rulesAutoRemoved": "조건 규칙 {{count}}개가 자동 제거되었습니다"
  },
  "calculation": { /* … same shape … */ }
}
```

**Phase 36 — append new sub-tree under `templates`** (UI-SPEC §"i18n Key Contract" lines 510~525, exact 13 keys):

```json
"rowLayout": {
  "sectionLabel": "행 위치",
  "singleButton": "단독",
  "rowButton": "행 {{number}}",
  "newRowButton": "+ 새 행",
  "helperHint": "같은 '행' 의 필드들이 한 줄에 가로 배치됩니다 (모바일에서는 한 줄로 표시됩니다)",
  "rowFullTooltip": "이 행은 이미 3개 필드가 가득 찼습니다",
  "rowFullToast": "한 줄에는 최대 3개 필드까지 배치할 수 있습니다",
  "wideTypeAutoSingleToast": "이 필드는 한 줄을 차지하는 필드라 행 그룹에서 빠집니다",
  "wideTypeBadge": "한 줄 차지",
  "rowGroupBadge": "{{number}}행",
  "rowGroupAriaLabel": "{{number}}행 그룹",
  "zodWideTypeError": "긴 텍스트와 표 필드는 행 그룹에 속할 수 없습니다",
  "zodCapExceededError": "한 줄에는 최대 3개 필드까지만 배치할 수 있습니다"
}
```

**Interpolation precedent** — `{{count}}` is used at `templates.condition.rulesAutoRemoved` (L259) and `templates.calculation.rulesAutoRemoved` (L273). Phase 36 introduces `{{number}}` as a parallel pattern.

**English (`en/admin.json`) NOT modified** per UI-SPEC §"i18n Key Contract" line 507 (Phase 32-04 / Phase 34 Korean-only precedent).

---

## Shared Patterns

### Tailwind dynamic class enumeration (CRITICAL)

**Source:** General Tailwind compile-time class detection requirement (no in-codebase precedent for cycle-color enumeration; this phase introduces it).

**Apply to:** `RowPositionSelector.tsx`, `FieldCard.tsx` (rowGroup pill bg/text colors + outer border-l), `DynamicCustomForm.tsx` / `DynamicCustomReadOnly.tsx` / `FormPreview.tsx` (`md:grid-cols-{N}`).

**Pattern:**

```ts
// Module scope — Tailwind sees these literal strings during build
const ROW_GROUP_BORDER_CLASSES = [
  'border-l-4 border-l-blue-400 dark:border-l-blue-500',
  'border-l-4 border-l-emerald-400 dark:border-l-emerald-500',
  'border-l-4 border-l-violet-400 dark:border-l-violet-500',
  'border-l-4 border-l-amber-400 dark:border-l-amber-500',
] as const;

const ROW_GROUP_PILL_CLASSES = [
  'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300',
  'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
] as const;

const GRID_COLS_CLASS = {
  1: 'md:grid-cols-1',
  2: 'md:grid-cols-2',
  3: 'md:grid-cols-3',
} as const;

// Use:
const cycle = (rowGroup - 1) % 4;
const className = ROW_GROUP_PILL_CLASSES[cycle];
const cols = GRID_COLS_CLASS[g.cols];
```

**Anti-pattern (DO NOT WRITE):**

```ts
// ❌ Tailwind cannot detect interpolated class fragments
const className = `bg-${cycleColor}-100 text-${cycleColor}-700`;
const cols = `md:grid-cols-${n}`;
```

**Suggested location:** `frontend/src/features/admin/components/SchemaFieldEditor/constants.ts` already exists (per dir scan); add the two cycle arrays there. The `GRID_COLS_CLASS` map can live in `frontend/src/features/document/utils/groupFieldsByRow.ts` next to the algorithm (renderer side).

---

### Toast notification pattern

**Source:** `frontend/src/features/admin/components/SchemaFieldEditor/SchemaFieldEditor.tsx` L4 + L67, L80, L103, L129, L138.

**Apply to:** `RowPositionSelector.tsx` (cap-3 violation), `SchemaFieldEditor.tsx` (force-single guard).

**Pattern:**

```ts
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

const { t } = useTranslation('admin');
toast(t('templates.rowLayout.rowFullToast'));
toast(t('templates.rowLayout.wideTypeAutoSingleToast'));
```

No custom toast styles needed — `sonner` defaults match project look. Phase 36 uses **only the default `toast()` overload**, not `toast.error()` / `toast.success()`, matching existing project usage at L67 etc.

---

### `<button type="button">` + lucide icon + Tailwind state classes

**Source:** `FieldCard.tsx` L116~141 (Up/Down/Delete buttons) + `SchemaFieldEditor.tsx` L158~165 (Add field button).

**Apply to:** `RowPositionSelector.tsx` (all selector buttons).

**Pattern (from FieldCard.tsx L116~124):**

```tsx
<button
  type="button"
  disabled={index === 0}
  onClick={() => onMove('up')}
  className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-30 disabled:cursor-not-allowed rounded transition-colors"
  title="위로 이동"
>
  <ChevronUp className="w-4 h-4" />
</button>
```

**Key invariants:**
- Always `type="button"` (prevents form submission inside `<form>` — relevant for SchemaFieldEditor inside TemplateFormModal).
- `disabled` + `disabled:opacity-30 disabled:cursor-not-allowed` — Phase 36 uses richer disabled style per UI-SPEC line 296 (`bg-gray-100`, `text-gray-400` for stronger affordance) but keeps `cursor-not-allowed`.
- `title="…"` for tooltip — Phase 36 uses `title={t('templates.rowLayout.rowFullTooltip')}` for cap-3 messaging.
- `transition-colors` for hover smoothness — preserved.

---

### `useMemo` derived state from props

**Source:** `SchemaFieldEditor.tsx` L55 (`cycles`), `DynamicCustomForm.tsx` L173~179 (`calcResultFieldIds`), `FormPreview.tsx` L32~35 (`calcResultIds`).

**Apply to:** `SchemaFieldEditor.tsx` (`rowOccupancy` per UI-SPEC line 601~610).

**Pattern (from `SchemaFieldEditor.tsx` L55):**

```ts
const cycles = useMemo(() => detectCircularDeps(calculationRules), [calculationRules]);
```

→ For Phase 36:

```ts
const rowOccupancy = useMemo(() => {
  const occ: Record<number, number> = {};
  for (const f of fields) {
    if (f.rowGroup !== undefined && !WIDE_TYPES.has(f.type)) {
      occ[f.rowGroup] = (occ[f.rowGroup] ?? 0) + 1;
    }
  }
  return occ;
}, [fields]);
```

---

### Inline pill `<span>` (status badge) pattern

**Source:** `FieldCard.tsx` L96~99 (conditional rule amber pill), L101~113 (calc rule purple/red pill).

**Apply to:** `FieldCard.tsx` (Phase 36 rowGroup pill cycle-colored, wide-type amber pill).

**Pattern (L96~99 — Phase 36 amber wide-type badge mirrors this exactly):**

```tsx
<span className="inline-flex items-center bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 rounded px-1 py-0.5">
  <Zap className="w-3.5 h-3.5" />
</span>
```

**UI-SPEC §"Spacing" line 58 explicitly cites this as the production SoT** (Dim 5 FLAG note). Phase 36 wide-type badge swaps `Zap` → `Square` icon + adds `gap-1` for icon+text spacing + uses `px-1.5 py-0.5` (UI-SPEC line 58 inherits production padding).

---

### Test fixture builder pattern

**Source:** `frontend/src/features/admin/utils/templateExport.test.ts` L5~28 (`makeDetail` helper).

**Apply to:** `groupFieldsByRow.test.ts` (`makeField` helper), `RowPositionSelector.test.tsx` (props builder).

**Pattern:**

```ts
const makeField = (over: Partial<FieldDefinition> = {}): FieldDefinition => ({
  id: 'f',
  type: 'text',
  label: 'F',
  required: false,
  ...over,
});

// usage:
const fields = [
  makeField({ id: 'a', rowGroup: 1 }),
  makeField({ id: 'b', rowGroup: 1 }),
  makeField({ id: 'c', type: 'textarea', rowGroup: 2 }),  // wide — should be singled
];
```

---

### Backward-compat invariant (zero new tests required for legacy snapshots)

**Source:** Phase 24.1 D-19, `DynamicCustomReadOnly.tsx` `schemaSnapshot` parsing at L27~35.

**Apply to:** `DynamicCustomReadOnly.tsx` regression test (D-G3).

**Invariant:** legacy `schemaSnapshot` JSON has no `rowGroup` keys → `groupFieldsByRow` short-circuits to all-`single` → CSS output identical to current `space-y-4` vertical stack. The pattern is the algorithm's first branch (UI-SPEC line 162~165). The backward-compat test fixture is a `version: 1` snapshot with NO `rowGroup` on any field — assert `screen.getAllByRole('group')` returns `[]` (no `<div role="group">` wrappers emitted).

---

## No Analog Found

**None.** All 12 files have at least a role-match analog. The two NEW components (`RowPositionSelector`, `groupFieldsByRow`) lack an EXACT match (no segmented-pill control, no row-grouping utility) but have strong role analogs:
- `RowPositionSelector` ← multiple button-list patterns (FieldCard action buttons, SchemaFieldEditor add-field dropdown, PresetGallery card grid).
- `groupFieldsByRow` ← `detectCircularDeps` (pure data-transform util in same dir).

**Pattern gaps acknowledged (must come from UI-SPEC, not codebase):**
1. **`animate-pulse ring-2 ring-red-500` 200ms transient flash** — no codebase precedent for transient-on-click animation. Implement per UI-SPEC §"Color" line 96 with a `useState<boolean>` flag + `setTimeout` clear.
2. **Color cycle (4-color rotation by index)** — no codebase precedent. Pattern is fully specified in UI-SPEC §"Color" lines 105~111 (blue → emerald → violet → amber).
3. **Cross-namespace i18n key access** (renderer `document` feature reading `admin` namespace key) — no precedent. Resolution suggested in `DynamicCustomForm.tsx` section above: mirror the single ARIA key into `document.json`.

---

## Metadata

**Analog search scope:**
- `frontend/src/features/admin/components/SchemaFieldEditor/` (full dir — builder source-of-truth)
- `frontend/src/features/admin/components/FormPreview/` (full dir — preview source-of-truth)
- `frontend/src/features/admin/validations/` (Zod schema source-of-truth)
- `frontend/src/features/admin/utils/` (utility test pattern)
- `frontend/src/features/admin/presets/` (preset registry pattern)
- `frontend/src/features/document/components/dynamic/` (renderer source-of-truth)
- `frontend/src/features/document/components/__tests__/` (small-component RTL test pattern)
- `frontend/src/features/document/utils/` (pure-function utility pattern)
- `frontend/src/features/document/types/dynamicForm.ts` (shared field types)
- `frontend/public/locales/ko/admin.json` (i18n catalog)

**Files scanned:** 19 source/test/JSON files, 4 directory listings. Stopped at strong-match coverage per "stop at 3–5 analogs" rule (each NEW file has ≥ 1 analog cited; each MODIFIED file is its own analog plus a sister cross-reference).

**Pattern extraction date:** 2026-04-30.

**Notable absences confirmed:**
- No drag-drop primitives in builder (only `TableColumnEditor` has column drag — out of scope).
- No segmented-control / tab-bar / radio-pill component anywhere in codebase.
- No `.refine()` Zod calls in `templateImportSchema.ts` (Phase 36 introduces the first).
- No 4+ color cycle indexed by data — Phase 36 introduces this concept.
- `FieldCard.tsx` has NO existing test file (only `DrafterInfoHeader.test.tsx` and `DrafterCombo.test.tsx` are similar small-component tests; Phase 36 RowPositionSelector test follows DrafterInfoHeader pattern).

---

## PATTERN MAPPING COMPLETE

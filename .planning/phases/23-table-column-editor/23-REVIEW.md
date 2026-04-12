---
phase: 23-table-column-editor
reviewed: 2026-04-12T00:00:00Z
depth: standard
files_reviewed: 11
files_reviewed_list:
  - frontend/package.json
  - frontend/public/locales/en/admin.json
  - frontend/public/locales/ko/admin.json
  - frontend/src/features/admin/components/FormPreview/PreviewFieldRenderer.tsx
  - frontend/src/features/admin/components/SchemaFieldEditor/ColumnConfigPanel.tsx
  - frontend/src/features/admin/components/SchemaFieldEditor/FieldConfigEditor.tsx
  - frontend/src/features/admin/components/SchemaFieldEditor/TableColumnEditor.tsx
  - frontend/src/features/admin/components/SchemaFieldEditor/constants.ts
  - frontend/src/features/admin/components/SchemaFieldEditor/index.tsx
  - frontend/src/features/admin/components/SchemaFieldEditor/types.ts
  - frontend/src/features/admin/components/TemplateFormModal.tsx
findings:
  critical: 0
  warning: 5
  info: 4
  total: 9
status: issues_found
---

# Phase 23: Code Review Report

**Reviewed:** 2026-04-12
**Depth:** standard
**Files Reviewed:** 11
**Status:** issues_found

## Summary

Phase 23 introduces the `TableColumnEditor` component and associated column-type configuration infrastructure. The overall structure is sound — DnD-kit integration is clean, the `ColumnConfigPanel` / `FieldConfigEditor` switch pattern is consistent, and the preview renderer correctly handles all new column types. No security vulnerabilities or data-loss risks were found.

Five warnings are raised, all of which can silently misbehave at runtime:

1. The column `id` field is user-editable, so duplicate IDs can break DnD-kit's sort logic and React key deduplication.
2. `minRows`/`maxRows` inputs have no cross-field validation — a user can freely set `minRows > maxRows`.
3. `capitalize()` produces wrong translation keys for `staticText` and `statictext`, silently falling back to the raw key string.
4. Missing `aria-label` on the close button in `TemplateFormModal` (hardcoded Korean in an otherwise i18n-complete file).
5. The EN locale file contains a duplicate `"noLabel"` key — the second value silently overwrites the first at runtime.

---

## Warnings

### WR-01: User-editable column ID enables duplicate keys, breaking DnD-kit and React reconciliation

**File:** `frontend/src/features/admin/components/SchemaFieldEditor/TableColumnEditor.tsx:144-149`

**Issue:** The expanded column panel renders a plain text input bound to `column.id`. A user who manually types the same value for two columns produces duplicate IDs. `@dnd-kit/sortable` uses `SortableContext items` (an array of these IDs) and internally builds a `Map`; duplicate IDs cause silent corruption of the drag order. React will also produce a duplicate-key warning and may mis-reconcile DOM nodes.

The field is visible to admin users and has no uniqueness enforcement in the UI.

**Fix:** Make the ID field read-only (display-only) when editing, or hide it entirely. IDs are auto-generated at creation time via `Date.now().toString(36)` and should not be changed post-creation.

```tsx
// Option A: render as read-only text, not an editable input
<div>
  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
    {t('templates.columnId')}
  </label>
  <p className="text-sm text-gray-500 dark:text-gray-400 font-mono px-3 py-2 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
    {column.id}
  </p>
</div>

// Option B: keep the input but add a uniqueness check in onUpdate
const handleIdChange = (newId: string) => {
  if (columns.some((c) => c.id !== column.id && c.id === newId)) return; // reject duplicate
  onUpdate({ ...column, id: newId });
};
```

---

### WR-02: `minRows` / `maxRows` have no cross-field validation — `minRows > maxRows` is silently accepted

**File:** `frontend/src/features/admin/components/SchemaFieldEditor/TableColumnEditor.tsx:286-306`

**Issue:** Both row-setting inputs accept any non-negative integer independently. Nothing prevents a configuration where `minRows = 10` and `maxRows = 2`. This invalid state is persisted into `schemaDefinition` JSON and will be received by the runtime approval form renderer, which must then decide how to handle an impossible constraint (likely either crashing or ignoring one of the values).

**Fix:** Add cross-field clamping in the change handlers:

```tsx
onChange={(e) => {
  const val = e.target.value ? parseInt(e.target.value, 10) : undefined;
  onMinRowsChange(val);
  // Clamp maxRows down if it would become less than new minRows
  if (val !== undefined && maxRows !== undefined && maxRows < val) {
    onMaxRowsChange(val);
  }
}}
```

Apply symmetric logic for `maxRows` clamping `minRows` upward. Alternatively, display an inline validation message rather than silently clamping.

---

### WR-03: `capitalize()` produces wrong i18n keys for camelCase column types

**File:** `frontend/src/features/admin/components/SchemaFieldEditor/TableColumnEditor.tsx:33-35, 101, 163`

**Issue:** The helper `capitalize()` is used to construct translation keys:

```ts
t(`templates.columnType${capitalize(column.type)}`)
```

For `column.type = 'staticText'`, this produces the key `templates.columnTypeStaticText` — which does exist in both locale files (correct). However, for `column.type = 'textarea'`, it produces `templates.columnTypeTextarea` — also correct. The problem is that `capitalize()` is defined as:

```ts
function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
```

This only uppercases the first character. For the type `'staticText'` it produces `'StaticText'`, resulting in the key `columnTypeStaticText` — which happens to exist. But the function is fragile: if any future type has a name like `'multiSelect'`, `capitalize` would yield `MultiSelect` and construct `columnTypeMultiSelect`, which may or may not match the locale key depending on how it was named. More critically, the same `capitalize` pattern is used in the type badge label inside `SortableColumnRow` (line 101) — if a locale key is missing, i18next silently returns the raw key string, resulting in visible garbage text rather than a translation.

This is a correctness risk for the `COLUMN_TYPE_META` lookup too: if `column.type` ever holds a value not in `COLUMN_TYPE_META` (e.g., due to a schema loaded from an older format), `meta` is `undefined` and `meta.icon` will throw.

**Fix:** Use a lookup map instead of runtime string construction:

```ts
// In constants.ts, add:
export const COLUMN_TYPE_LABEL_KEYS: Record<TableColumnType, string> = {
  text: 'templates.columnTypeText',
  textarea: 'templates.columnTypeTextarea',
  number: 'templates.columnTypeNumber',
  date: 'templates.columnTypeDate',
  select: 'templates.columnTypeSelect',
  checkbox: 'templates.columnTypeCheckbox',
  staticText: 'templates.columnTypeStaticText',
};
```

Then in `SortableColumnRow`:

```tsx
const meta = COLUMN_TYPE_META[column.type] ?? FALLBACK_TYPE_META; // guard against unknown types
// ...
{t(COLUMN_TYPE_LABEL_KEYS[column.type])}
```

---

### WR-04: `aria-label` on the close button is hardcoded Korean — inconsistent with i18n setup

**File:** `frontend/src/features/admin/components/TemplateFormModal.tsx:218`

**Issue:** The close (`X`) button has a hardcoded Korean `aria-label="닫기"` while the rest of the file uses `t('common.close')` for the visible cancel button text. Screen readers in non-Korean locales will read the raw Korean string.

```tsx
<button
  type="button"
  onClick={onClose}
  className="p-1.5 text-gray-400 ..."
  aria-label="닫기"   // <-- hardcoded
>
```

**Fix:**

```tsx
aria-label={t('common.close')}
```

---

### WR-05: Duplicate JSON key `"noLabel"` in the English locale file silently drops the first definition

**File:** `frontend/public/locales/en/admin.json:163, 188`

**Issue:** The `templates` object contains `"noLabel"` at two different positions (lines 163 and 188). JSON parsers and i18next both silently use the last occurrence, meaning the first value `"(No label)"` is unreachable. While both values are identical here, this is a latent bug — any future edit to one copy may miss the other, creating a silent discrepancy.

```json
"noLabel": "(No label)",    // line 163 — DEAD, overwritten
...
"reorderColumn": "Reorder column",
"noLabel": "(No label)"     // line 188 — this is the effective value
```

**Fix:** Remove the duplicate at line 163 (the Korean locale file has it only once, at the equivalent of line 188 — these should stay in sync).

---

## Info

### IN-01: `TableColumn.config` reuses `SchemaFieldConfig` which includes irrelevant fields (`columns`, `minRows`, `maxRows`)

**File:** `frontend/src/features/admin/components/SchemaFieldEditor/types.ts:35-41`

**Issue:** `TableColumn.config` is typed as `SchemaFieldConfig`, which includes `columns?: TableColumn[]`, `minRows?: number`, and `maxRows?: number`. These fields are only meaningful on a top-level `table`-type field, not on an individual column. A column of type `table` is not a supported `TableColumnType`, so nested tables cannot actually be created through the UI — but the type system does not enforce this. Future maintainers may be confused by the presence of these fields in column config objects.

**Fix:** Define a narrower `TableColumnConfig` interface that excludes table-specific properties:

```ts
export interface TableColumnConfig {
  placeholder?: string;
  maxLength?: number;
  min?: number;
  max?: number;
  unit?: string;
  options?: { value: string; label: string }[];
  content?: string;
  defaultValue?: string;
  width?: string;
}

export interface TableColumn {
  id: string;
  type: TableColumnType;
  label: string;
  required: boolean;
  config: TableColumnConfig;
}
```

---

### IN-02: Duplicate DnD library dependencies (`@dnd-kit/*` and `@hello-pangea/dnd`) both in production bundle

**File:** `frontend/package.json:13-15`

**Issue:** Both `@dnd-kit/core` + `@dnd-kit/sortable` and `@hello-pangea/dnd` are listed as runtime dependencies. `TableColumnEditor` uses `@dnd-kit`; if `@hello-pangea/dnd` is no longer used elsewhere it adds dead weight to the production bundle (it is ~40 KB gzipped). This is an info-level observation, not a bug.

**Fix:** Audit whether `@hello-pangea/dnd` is still used in any other component. If not, remove it from `package.json`.

---

### IN-03: `window.confirm()` used for field deletion confirmation

**File:** `frontend/src/features/admin/components/SchemaFieldEditor/SchemaFieldEditor.tsx:56`

**Issue:** `window.confirm(t('templates.confirmRemoveField'))` blocks the main thread and renders a native browser dialog that cannot be styled to match the application design system. This is inconsistent with the rest of the admin UI which uses custom confirmation dialogs (e.g., deactivate department/position flows).

**Fix:** Replace with a custom confirmation modal or an inline confirmation pattern (e.g., a two-step "click delete → confirm inline") consistent with the rest of the codebase.

---

### IN-04: `capitalize()` utility is a local private function rather than a shared utility

**File:** `frontend/src/features/admin/components/SchemaFieldEditor/TableColumnEditor.tsx:33-35`

**Issue:** `capitalize()` is defined as a module-level private function inside `TableColumnEditor.tsx`. A near-identical pattern (`FIELD_TYPE_META[type] || FALLBACK_TYPE_META`) already exists in `SchemaFieldEditor.tsx`. If the same `capitalize` pattern is needed in other components that display column type labels, it will be duplicated.

**Fix:** Move `capitalize` to a shared utility (e.g., `frontend/src/utils/string.ts`) or, better, replace dynamic key construction with the lookup map recommended in WR-03.

---

_Reviewed: 2026-04-12_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_

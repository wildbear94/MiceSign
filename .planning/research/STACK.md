# Stack Research: MiceSign v1.1 - Form Builder Modal Enhancement

**Domain:** Form builder UI enhancements for electronic approval system
**Date:** 2026-04-11
**Confidence:** HIGH
**Scope:** Only NEW additions needed for milestone v1.1 features

## Current Stack (Already Installed)

These are confirmed in `package.json` and actively used -- DO NOT re-add:

| Library | Version | Used For |
|---------|---------|----------|
| react | ^18.3.1 | Core framework |
| react-hook-form | ^7.72.0 | Form state management |
| zod | ^4.3.6 | Schema validation |
| @hello-pangea/dnd | ^18.0.1 | Drag-and-drop (field reordering) |
| lucide-react | ^1.7.0 | Icons |
| zustand | ^5.0.12 | Client state |
| @tanstack/react-query | ^5.95.2 | Server state |
| tailwindcss | 3.4 | Styling |
| i18next + react-i18next | ^26.0.3 / ^17.0.2 | Internationalization |
| @tiptap/* | ^3.22.0 | Rich text editor |
| date-fns | ^4.1.0 | Date formatting |
| axios | ^1.14.0 | HTTP client |

## Existing Code Assets (DO NOT Rebuild)

| Asset | Location | Lines | Purpose |
|-------|----------|-------|---------|
| SchemaFieldEditor | `features/admin/components/SchemaFieldEditor.tsx` | ~596 | Field CRUD with drag-drop |
| TemplateFormModal | `features/admin/components/TemplateFormModal.tsx` | ~334 | Modal shell with tabs |
| evaluateConditions | `features/document/utils/evaluateConditions.ts` | — | Runtime condition evaluation |
| executeCalculations | `features/document/utils/executeCalculations.ts` | — | Runtime calculation execution |
| detectCircularDeps | `features/document/utils/detectCircularDeps.ts` | — | Dependency cycle detection |
| ConditionalRule type | `features/document/types/dynamicForm.ts` | — | `{targetFieldId, condition: {fieldId, operator, value}, action}` |
| CalculationRule type | `features/document/types/dynamicForm.ts` | — | `{targetFieldId, formula, dependsOn[]}` |
| ColumnDefinition type | `features/document/types/dynamicForm.ts` | — | `{id, type, label, required, config}` |

## New Libraries Needed

### Required: sonner (explicit dependency)

**Status:** Used in codebase (`TemplateFormModal.tsx`, `RegistrationDetailModal.tsx`, `TemplateTable.tsx`, `App.tsx`) but **missing from package.json**. Currently resolving as a transitive dependency -- fragile.

| Library | Version | Purpose | Why |
|---------|---------|---------|-----|
| **sonner** | ^2.x | Toast notifications | Already used via `import { toast } from 'sonner'` across 4+ files. Must be explicit dependency to avoid breakage on dependency updates. |

```bash
cd frontend && npm install sonner
```

### Recommended: NONE

This is the key finding. The v1.1 features do NOT require new library additions. Every capability needed is achievable with the existing stack.

## Feature-by-Feature Stack Analysis

### 1. Live Preview Panel

**Need:** Side-by-side editor/preview layout within the modal
**Decision:** Use CSS flexbox/grid -- NOT a resizable panels library

**Why no react-resizable-panels:**
- The preview is inside a modal dialog, not an IDE workspace
- A fixed split (e.g., 55% editor / 45% preview) with a toggle button is better UX for form building
- Fullscreen preview is a separate overlay/portal, not a resized panel
- Adding a draggable divider inside a modal creates awkward nested interaction zones
- 2.4 KB of CSS vs 15+ KB library for one split layout

**Implementation approach:**
```tsx
// TailwindCSS flexbox layout inside modal
<div className="flex h-full">
  <div className="flex-1 overflow-y-auto border-r">
    {/* Editor panels */}
  </div>
  <div className="w-[400px] overflow-y-auto bg-gray-50">
    {/* Live preview */}
  </div>
</div>
```

**Fullscreen preview:** Use React portal + `position: fixed` overlay. No library needed.

### 2. Table Column Editor

**Need:** Add/remove/reorder columns within a table field, set column types
**Stack:** `@hello-pangea/dnd` (already installed) + existing `SchemaFieldEditor` patterns

**Why no new library:**
- Column editing is structurally identical to field editing (already built)
- DnD reordering already works via `@hello-pangea/dnd`
- Column type selection reuses the same `SchemaFieldType` enum
- Column config reuses `SchemaFieldConfig` patterns

**Implementation approach:** Extract reusable pieces from `SchemaFieldEditor` into a `ColumnEditor` sub-component. The `ColumnDefinition` type already exists in `dynamicForm.ts`.

### 3. Conditional Rules UI

**Need:** Visual builder for "when field X equals Y, show/hide field Z"
**Stack:** react-hook-form + existing types + Tailwind

**Why no new library:**
- `ConditionalRule` type already defined with `{targetFieldId, condition: {fieldId, operator, value}, action}`
- `evaluateConditions` utility already handles runtime evaluation
- The UI is a form with 4 dropdowns (source field, operator, value, action) -- standard form controls
- Operators are a fixed set: `eq, neq, gt, gte, lt, lte, in, notIn, isEmpty, isNotEmpty`

**Implementation approach:** A `ConditionalRuleEditor` component that renders a list of rule rows. Each row has field selectors (populated from the schema's field list), operator dropdown, value input, and action dropdown. Add/remove buttons.

### 4. Calculation Rules UI

**Need:** Visual formula builder for "field Z = field A + field B"
**Stack:** Existing types + Tailwind

**Why no expression parser library:**
- `CalculationRule` type already uses `{formula: string, dependsOn: string[]}` 
- `executeCalculations` already parses and evaluates formulas at runtime
- `detectCircularDeps` already validates dependency graphs
- The UI only needs to help users BUILD formulas, not parse them
- A guided builder (select field + operator + field) is safer than free-text formula entry

**Implementation approach:** `CalculationRuleEditor` component. Guided mode: pick operands from field list, pick operator (+, -, *, /), auto-generates formula string and dependsOn array. Shows live validation via `detectCircularDeps`.

### 5. Template Clone

**Need:** Duplicate an existing template
**Stack:** API call (axios) + TanStack Query mutation

**Zero new dependencies.** Clone is a server-side operation (POST with source template ID) or client-side deep copy of the schema JSON.

### 6. JSON Import/Export

**Need:** Download template schema as JSON, upload JSON to create template
**Stack:** Native browser APIs

**Why no file-saver or other library:**
- Export: `JSON.stringify` -> `new Blob` -> `URL.createObjectURL` -> programmatic `<a>` click. 5 lines of code.
- Import: `<input type="file" accept=".json">` -> `FileReader.readAsText` -> `JSON.parse` -> Zod validation. 10 lines of code.
- Zod validation of imported JSON provides schema safety that no file library would add.

**Implementation approach:**
```tsx
// Export
function exportTemplate(schema: SchemaDefinition, name: string) {
  const blob = new Blob([JSON.stringify(schema, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${name}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

// Import - validate with Zod schema before accepting
const importedSchema = schemaDefinitionZod.parse(JSON.parse(fileContent));
```

### 7. Preset Templates

**Need:** Pre-built template configurations users can start from
**Stack:** Static TypeScript data files

**Zero new dependencies.** Presets are hardcoded `SchemaDefinition` objects (e.g., GENERAL, EXPENSE, LEAVE templates matching the existing 3 form types). Stored as a `presets/` folder with exported constants.

## What NOT to Add

| Library | Why Not |
|---------|---------|
| **react-resizable-panels** | Overkill for a modal split view; CSS flexbox is sufficient and more predictable inside dialog overlays |
| **react-split** / **allotment** | Same reasoning as above -- draggable dividers inside modals create UX friction |
| **file-saver** | Native Blob + createObjectURL works identically with zero dependency weight |
| **react-json-view** / **@uiw/react-json-view** | JSON preview is not needed -- the live preview panel shows the rendered form, not raw JSON |
| **formik** | Already using react-hook-form; mixing form libraries is never correct |
| **@dnd-kit/core** | Already using @hello-pangea/dnd; don't mix DnD libraries |
| **monaco-editor** / **codemirror** | Formula editing is guided (dropdown-based), not free-text code. A code editor is overkill and confusing for admin users |
| **Headless UI / Radix UI** | Not needed for this milestone. The rule builders use standard select/input elements. Reconsider if accessibility audit reveals issues |
| **jotai / recoil** | Already using Zustand for client state. Form builder state lives in react-hook-form + local useState |

## Installation Summary

```bash
cd frontend

# Fix missing explicit dependency (already used in code)
npm install sonner
```

That's it. One `npm install` to make an implicit dependency explicit. No new capabilities needed.

## Key Technical Decisions

### Modal Architecture
The current `TemplateFormModal` (334 lines) will grow significantly. Recommend splitting into sub-components:

```
TemplateFormModal (shell + tabs)
  ├── TemplateInfoTab (name, prefix, category, icon)
  ├── TemplateFieldsTab (SchemaFieldEditor wrapper)
  │   ├── SchemaFieldEditor (existing, field CRUD + DnD)
  │   ├── ColumnEditor (new, table column CRUD)
  │   ├── ConditionalRuleEditor (new, condition builder)
  │   └── CalculationRuleEditor (new, formula builder)
  ├── TemplatePreviewPanel (new, live preview)
  └── TemplatePresetsPanel (new, preset selection)
```

### State Management Within Modal
- **Form metadata** (name, prefix, etc.): `react-hook-form` (already used)
- **Schema fields array**: `useState` in modal (already used via `schemaFields` state)
- **Conditional/calculation rules**: `useState` arrays in modal, passed to sub-editors
- **Preview synchronization**: Derive preview from current schemaFields + rules state (no separate store needed)

### Fullscreen Preview
- Use `ReactDOM.createPortal` to render outside the modal into `document.body`
- `position: fixed; inset: 0; z-index: 60` (above modal's z-index)
- Close button returns to modal view
- No new library needed

## Confidence Assessment

| Decision | Confidence | Reasoning |
|----------|------------|-----------|
| No new UI libraries needed | HIGH | All features map to existing primitives (forms, lists, dropdowns, DnD) |
| CSS flexbox over resizable panels | HIGH | Modal context makes draggable dividers awkward; fixed split is better UX |
| Native APIs for JSON import/export | HIGH | Standard browser APIs, well-supported, 10 lines of code vs. library |
| sonner must be explicit dep | HIGH | Verified -- used in 4+ files, not in package.json |
| Component decomposition pattern | MEDIUM | Exact split boundaries will emerge during implementation |

## Sources

- [react-resizable-panels (npm)](https://www.npmjs.com/package/react-resizable-panels) -- evaluated and rejected for modal context
- [react-resizable-panels (GitHub)](https://github.com/bvaughn/react-resizable-panels) -- v4 available, but unnecessary here
- Project codebase analysis: `package.json`, `TemplateFormModal.tsx`, `SchemaFieldEditor.tsx`, `dynamicForm.ts`, utility files

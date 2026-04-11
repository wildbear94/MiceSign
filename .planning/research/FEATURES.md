# Feature Landscape

**Domain:** Form Builder Modal Enhancement (전자 결재 양식 빌더)
**Researched:** 2026-04-11

## Existing Foundation (Already Built)

Before mapping new features, the codebase already has:

| Component | What It Does | Location |
|-----------|-------------|----------|
| `SchemaFieldEditor` | Field CRUD, reorder, expand/collapse, type-specific config | `admin/components/SchemaFieldEditor.tsx` |
| `TemplateFormModal` | Two-tab modal (info/fields), create/edit template, JSON schema persistence | `admin/components/TemplateFormModal.tsx` |
| `dynamicForm.ts` | Full type definitions: `FieldDefinition`, `ColumnDefinition`, `ConditionalRule`, `CalculationRule`, `SchemaDefinition` | `document/types/dynamicForm.ts` |
| `evaluateConditions` | Runtime evaluator for conditional rules (10 operators, 4 actions) | `document/utils/evaluateConditions.ts` |
| `executeCalculations` | Runtime evaluator for calculation formulas (SUM, arithmetic, column refs) | `document/utils/executeCalculations.ts` |
| `detectCircularDeps` | Circular dependency detection for calculation rule graphs | `document/utils/detectCircularDeps.ts` |
| `schemaToZod` | Dynamic Zod schema generation from field definitions | `document/utils/schemaToZod.ts` |

**Key insight:** The runtime engines (conditions, calculations, circular dep detection) are already built. The milestone is about building **admin UI** that produces the data structures these engines consume.

---

## Table Stakes

Features that form builder admins expect. Missing = the builder feels like a toy.

| # | Feature | Why Expected | Complexity | Dependencies on Existing |
|---|---------|--------------|------------|--------------------------|
| 1 | **Live Form Preview** | Every modern form builder shows what users will see as you edit. Without it, admins must save-reload-check cycles. The gap between "editing fields" and "seeing the form" is the #1 frustration. | Medium | Needs a renderer component that consumes `SchemaDefinition` and renders read-only preview. Reuses `evaluateConditions` / `executeCalculations` for showing dynamic behavior. |
| 2 | **Table Column Editor** | The `table` field type exists in `SchemaFieldType` but `FIELD_TYPES` array excludes it (line 83). `ColumnDefinition` type exists in `dynamicForm.ts` with full config. Without a column editor, table fields are unusable in the builder. | Medium | Must produce `ColumnDefinition[]` into `field.config.columns`. Column types are a subset of existing field types. |
| 3 | **Template Clone/Duplicate** | Standard CRUD operation. Admins create similar forms (e.g., Q1 expense vs Q2 expense). Copy-then-modify is faster than rebuild. Every admin panel offers this. | Low | API: POST new template with copied `schemaDefinition`. Frontend: single button on template list + modal for new name/prefix. |
| 4 | **Preset Templates** | New users stare at a blank builder. Presets (general, expense, leave, etc.) give starting points. The 6 hardcoded templates already define these patterns -- presets are their schema equivalents. | Low | Static JSON objects matching `SchemaDefinition` type. Button in modal to load preset into `schemaFields` state. |

## Differentiators

Features that elevate the builder from functional to powerful. Not expected, but high-value for admin productivity.

| # | Feature | Value Proposition | Complexity | Dependencies on Existing |
|---|---------|-------------------|------------|--------------------------|
| 5 | **Conditional Visibility Rule UI** | Turns invisible JSON rule arrays into visual "IF field X equals Y THEN show/hide field Z" rows. Without this, admins need to hand-edit JSON to use the conditional system that **already works at runtime**. | Medium-High | Produces `ConditionalRule[]` matching the existing type. Must present field ID dropdown (from current fields), operator dropdown (10 operators from `evaluateConditions`), value input, and action selector. |
| 6 | **Calculation Rule UI** | Same pattern as conditions -- the engine exists but there is no admin UI. Visual "field Z = field A + field B" or "field Z = SUM(table.column)" builder. | Medium-High | Produces `CalculationRule[]` matching existing type. Must show field reference picker, formula template buttons (SUM, arithmetic), `dependsOn` auto-detection, and circular dependency warning via `detectCircularDeps`. |
| 7 | **JSON Import/Export** | Power-user escape hatch. Copy schema between environments, backup templates, share with other admins. Also critical for developer debugging. | Low | `JSON.stringify(schemaDefinition)` for export (already done in submit handler line 113-118). Import = parse + validate + load into state. |

## Anti-Features

Features to explicitly NOT build in this milestone.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| **Drag-and-drop field reordering** | Current up/down arrow reordering works fine for <20 fields. DnD libraries (dnd-kit, react-beautiful-dnd) add significant complexity, bundle size, and accessibility challenges for marginal UX gain at this scale. | Keep chevron up/down buttons. Revisit only if field counts routinely exceed 15. |
| **Visual formula editor with syntax highlighting** | Full expression editors (CodeMirror, Monaco) are overkill for simple arithmetic formulas like `field1 + field2` or `SUM(items.price)`. The formula language is intentionally simple. | Provide formula templates/snippets and field reference picker. Plain text input with validation feedback. |
| **Multi-page form sections** | Approval documents are single-page by nature. Section headers suffice for visual grouping. Page breaks add routing complexity for no real user benefit. | Use `staticText` field type for section dividers. |
| **Form versioning/history** | Complex to implement (schema diffing, migration between versions). Documents reference template at submission time, and immutability rules already handle this. | Template editing is allowed, but submitted documents keep their snapshot. Add versioning only if regulatory requirements demand it. |
| **AI-generated form rules** | Explicitly deferred to Phase 2 in PROJECT.md. Tempting but premature. | Manual rule building is sufficient for ~50 employees and a handful of templates. |
| **Nested conditional logic (AND/OR groups)** | The existing `ConditionalRule` type supports single conditions per rule. AND/OR groups require a tree data structure and significantly more complex UI. Single conditions cover 90%+ of real approval form needs. | Multiple single-condition rules achieve AND logic (all must pass). If OR is needed, revisit later. |

---

## Feature Implementation Details

### 1. Live Form Preview

**Pattern:** Side-by-side split panel (editor left, preview right) at desktop widths, with fullscreen preview toggle button.

**How it works:**
- Preview panel renders `schemaFields` through a read-only form renderer
- Updates on every field change (debounced ~300ms to avoid jank)
- Shows field labels, types, placeholders, required indicators
- For conditional rules: shows sample toggle (admin enters test values, sees fields show/hide)
- Fullscreen preview: opens modal/overlay with the form at actual render size

**Complexity notes:**
- Requires building a `FormPreview` component that mirrors the document creation form
- Can reuse/adapt existing DynamicFormField rendering logic if one exists, or build a simpler read-only version
- The modal currently uses `max-w-4xl` (line 174); split pane needs wider or a layout change

**Recommendation:** Start with a collapsible right panel inside the existing modal (expand modal to near-fullscreen when preview is open), plus a dedicated fullscreen preview button. Do NOT try to fit split pane into the current 4xl modal width -- it will feel cramped.

### 2. Table Column Editor

**Pattern:** Inline sub-editor that appears when a `table` field is expanded in SchemaFieldEditor.

**How it works:**
- Add `table` to `FIELD_TYPES` array (currently excluded at line 83)
- When field type is `table`, `FieldConfigEditor` renders a column editor instead of text/number config
- Column editor: list of column definitions, each with type selector (text/number/date/select only), label, required toggle
- Add/remove/reorder columns with same UX as field-level add/remove/reorder
- `minRows` / `maxRows` config for the table itself

**Type alignment:** `ColumnDefinition` already exists in `dynamicForm.ts` with `id`, `type`, `label`, `required`, `config`. The `SchemaFieldConfig` already has `columns?: ColumnDefinition[]`. Types are ready.

**Column type restrictions:** Only allow `text`, `number`, `date`, `select` as column types. `textarea`, `staticText`, `hidden`, `table` make no sense as table columns.

### 3. Conditional Visibility Rule UI

**Pattern:** Per-field settings panel with a "Conditions" tab, showing rule rows in IF-THEN format.

**How it works:**
- Each field card gets a tabbed detail section: [Settings] [Conditions] [Calculations]
- Conditions tab shows rules where this field is the `targetFieldId`
- Each rule row: dropdown(source field) + dropdown(operator) + input(value) + dropdown(action)
- Operators sourced from the 10 operators in `evaluateConditions`: eq, neq, gt, gte, lt, lte, in, notIn, isEmpty, isNotEmpty
- Actions: show, hide, require, unrequire
- Add rule button, delete rule button per row
- Rules stored in `conditionalRules[]` at the schema level (already in submit handler line 116)

**UX consideration:** Show field labels (not IDs) in dropdowns, but store IDs in the rule. Auto-filter: a field cannot reference itself as source.

### 4. Calculation Rule UI

**Pattern:** Per-field settings panel "Calculations" tab (only for `number` fields).

**How it works:**
- Only shown when field type is `number` (calculations produce numeric values)
- Formula input with helper buttons: `+`, `-`, `*`, `/`, `SUM()`
- Field reference picker: click a field name to insert its ID into the formula
- For table column references: show `tableName.columnName` format
- `dependsOn` auto-computed by parsing field references from the formula
- Real-time circular dependency check using `detectCircularDeps` -- show warning if cycle detected
- Preview: show computed result with sample values

**Formula language:** Already defined and implemented in `executeCalculations`:
- Simple: `field1 + field2`, `amount * 0.1`
- SUM: `SUM(items.price)`, `SUM(items.price * items.qty)`

### 5. Template Clone/Duplicate

**Pattern:** Action button on template list row.

**How it works:**
- "Duplicate" button on each template row in the admin list
- Opens TemplateFormModal pre-filled with source template data
- Name auto-suffixed with "(복사)" / "(Copy)"
- Prefix cleared (must be unique per template)
- Calls existing create API with the copied schema

### 6. JSON Import/Export

**Pattern:** Buttons in the template modal toolbar area.

**How it works:**
- **Export:** Button generates JSON from current `SchemaDefinition` (fields + conditionalRules + calculationRules), triggers browser download as `.json` file
- **Import:** File input that accepts `.json`, parses content, validates against `SchemaDefinition` type shape, loads into state
- Validation on import: check field IDs unique, check rule references valid, check no circular deps
- Error toast if import JSON is malformed or invalid

### 7. Preset Templates

**Pattern:** Dropdown/grid in the "create new template" flow.

**How it works:**
- When creating (not editing), show "Start from preset" option before the blank builder
- Presets: general approval (2-3 text fields), expense report (items table + total), leave request (date range + type select), purchase request (items table + budget fields)
- Selecting a preset populates `schemaFields` and optionally calculation/condition rules
- Admin can freely modify after loading -- presets are starting points, not constraints
- Presets stored as static TypeScript constants, not in DB

---

## Feature Dependencies

```
Preset Templates -----> [no dependency, standalone]
Template Clone -------> [no dependency, standalone]
JSON Export ----------> [no dependency, standalone]
JSON Import ----------> [needs validation logic]
Table Column Editor --> [no dependency, types already exist]
Live Form Preview ----> [needs form renderer component]
Conditional Rule UI --> [needs field list context, depends on fields being defined]
Calculation Rule UI --> [needs field list context, depends on Conditional Rule UI for shared tab pattern, uses detectCircularDeps]
```

**Suggested build order based on dependencies:**
1. **Low-hanging fruit first:** Template Clone, JSON Export/Import, Preset Templates (all Low complexity, no blockers)
2. **Table Column Editor** (unlocks the `table` field type that is currently dead code)
3. **Live Form Preview** (high user value, needs renderer but no rule dependencies)
4. **Conditional Rule UI** (establishes the per-field settings tab pattern)
5. **Calculation Rule UI** (reuses the tab pattern from conditions, adds dep detection)

## MVP Recommendation

**Must ship (table stakes):**
1. Live Form Preview -- the single highest-impact feature for admin UX
2. Table Column Editor -- unlocks an existing but unusable field type
3. Template Clone -- trivial to build, high admin productivity
4. Preset Templates -- removes blank-canvas paralysis for new admins

**Ship if time allows (differentiators):**
5. JSON Export/Import -- low complexity, high power-user value
6. Conditional Rule UI -- high value but medium-high complexity
7. Calculation Rule UI -- highest complexity, depends on condition UI patterns

**Explicitly defer:**
- Drag-and-drop reordering
- Visual formula editor
- Nested AND/OR condition groups
- Form versioning

## Sources

- [FormCarve: Building a Dynamic React Form Builder & Renderer](https://dev.to/allenarduino/formcarve-building-a-dynamic-react-form-builder-renderer-monorepo-49dj) -- split pane preview patterns
- [SurveyJS React Form Builder](https://surveyjs.io/react-form-builder) -- commercial form builder reference
- [Rule Builder UI Pattern](https://ui-patterns.com/patterns/rule-builder) -- conditional rule builder design patterns
- [Easy Forms Rule Builder](https://docs.easyforms.dev/rule-builder.html) -- condition/action rule builder implementation reference
- [Form.io Data Components](https://help.form.io/userguide/forms/form-building/form-components/data-components) -- Edit Grid / table column patterns
- [Budibase Conditional Logic Forms](https://budibase.com/blog/tutorials/conditional-logic-forms/) -- conditional logic best practices
- [SurveyJS JSON Schema Form Builder](https://surveyjs.io/stay-updated/blog/dynamically-create-forms-from-json-schema) -- JSON schema import/export patterns
- Existing codebase: `dynamicForm.ts`, `evaluateConditions.ts`, `executeCalculations.ts`, `detectCircularDeps.ts`

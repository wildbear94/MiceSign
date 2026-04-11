# Architecture: Form Builder Modal Enhancement (v1.1)

**Domain:** TemplateFormModal UI enhancement for MiceSign
**Researched:** 2026-04-11
**Confidence:** HIGH (based on direct codebase analysis)

## Existing Architecture Summary

### Current Components

| Component | Location | Responsibility |
|-----------|----------|----------------|
| `TemplateFormModal` | `admin/components/TemplateFormModal.tsx` | Modal with 2 tabs (info/fields), react-hook-form for metadata, SchemaFieldEditor for schema |
| `SchemaFieldEditor` | `admin/components/SchemaFieldEditor.tsx` | Field list with expand/collapse cards, add/move/delete fields, type-specific config editors |
| `FieldCard` | Inside SchemaFieldEditor | Individual field expand/collapse card with label, type badge, config editor |
| `FieldConfigEditor` | Inside SchemaFieldEditor | Type-specific config forms (text/number/select/etc.) |
| `templateApi` | `admin/api/templateApi.ts` | CRUD endpoints: getList, getDetail, create, updateTemplate, deactivate |
| `TemplateSchemaService` | Backend service | Schema validation, versioning (template_schema_version table), option resolution |
| `CircularDependencyValidator` | Backend validator | DFS cycle detection in calculation rule dependency graphs |
| `evaluateConditions` | `document/utils/evaluateConditions.ts` | Runtime condition evaluation (show/hide/require/unrequire) with operators |
| `executeCalculations` | `document/utils/executeCalculations.ts` | Runtime formula evaluation (arithmetic + SUM over arrays) |
| `dynamicForm.ts` types | `document/types/dynamicForm.ts` | SchemaDefinition, FieldDefinition, ConditionalRule, CalculationRule types |

### Current Data Flow

```
TemplateListPage
  -> TemplateFormModal (open/close, editingTemplate)
       -> useForm (metadata: name, description, prefix, category, icon)
       -> SchemaFieldEditor (schemaFields state, onChange callback)
            -> FieldCard[] (expand/collapse, edit individual fields)
       -> onSubmit: JSON.stringify({ version, fields, conditionalRules: [], calculationRules: [] })
       -> createMutation / updateMutation -> templateApi -> backend
```

### Key Observations

1. **Schema shape is already defined:** `SchemaDefinition` includes `conditionalRules` and `calculationRules` arrays but they are always serialized as `[]` from the modal. The types and runtime evaluators already exist.
2. **Modal is max-w-4xl (896px):** Adding a side preview panel requires either widening the modal or using a split layout.
3. **Tab system exists:** Currently 2 tabs (info/fields). Adding more tabs is trivial with the existing `TabKey` union type.
4. **SchemaField type is admin-specific:** It's slightly different from the document-side `FieldDefinition` type (no `config` vs `config?`). Both need to stay in sync.
5. **No dynamic form renderer exists yet:** Hardcoded templates (GeneralForm, ExpenseForm, etc.) are used via `TEMPLATE_REGISTRY`. A preview component would be the **first** generic field renderer.

---

## New Feature Integration Map

### Feature 1: Live Preview Panel

**What changes:**
- `TemplateFormModal` layout changes from single-column to split-pane (editor left, preview right)
- New `SchemaPreviewPanel` component that renders fields based on current `schemaFields` state
- Fullscreen preview button opens a `FullscreenPreviewModal`

**Integration points:**
- **TemplateFormModal:** Widens to `max-w-7xl` or full-width. Left pane = existing tabs, right pane = preview. Preview reads `schemaFields` state (already lifted to modal level).
- **No new API calls needed.** Preview is purely client-side, consuming the same `schemaFields` state.

**New components:**

| Component | Location | Props | Responsibility |
|-----------|----------|-------|----------------|
| `SchemaPreviewPanel` | `admin/components/preview/SchemaPreviewPanel.tsx` | `fields: SchemaField[]`, `conditionalRules`, `calculationRules` | Renders a read-only form preview from schema fields |
| `PreviewFieldRenderer` | `admin/components/preview/PreviewFieldRenderer.tsx` | `field: SchemaField` | Renders a single field as it would appear in the actual form |
| `FullscreenPreviewModal` | `admin/components/preview/FullscreenPreviewModal.tsx` | Same as SchemaPreviewPanel + `onClose` | Full-screen overlay for preview |

**Modified components:**
- `TemplateFormModal` -- layout restructure to side-by-side, fullscreen button

**Data flow:**
```
TemplateFormModal
  |-- schemaFields (state) ---------> SchemaPreviewPanel (read-only render)
  |-- conditionalRules (state) -----> SchemaPreviewPanel (condition evaluation)
  |-- calculationRules (state) -----> SchemaPreviewPanel (calculation demo)
```

**Critical design decision:** The `PreviewFieldRenderer` is the seed of a future generic `DynamicFieldRenderer` that could eventually replace hardcoded form templates. Keep it in `admin/components/preview/` for now but design the interface to be extractable to `shared/components/` later.

---

### Feature 2: Table Column Editor

**What changes:**
- `FieldConfigEditor` gains a new case for `type === 'table'` that renders a column sub-editor
- The `table` type already exists in `SchemaFieldType` and `FIELD_TYPE_META` but is excluded from the `FIELD_TYPES` add-dropdown array
- `SchemaFieldConfig` needs a `columns` property (matching `FieldConfig.columns` from dynamicForm.ts)

**Integration points:**
- **SchemaFieldEditor:** Add `'table'` to the `FIELD_TYPES` constant so it appears in the add-field dropdown
- **FieldConfigEditor:** New `case 'table'` section with a `TableColumnEditor` sub-component
- **SchemaFieldConfig type:** Add `columns?: ColumnDefinition[]` (import from dynamicForm.ts or define locally)

**New components:**

| Component | Location | Responsibility |
|-----------|----------|----------------|
| `TableColumnEditor` | `admin/components/TableColumnEditor.tsx` | Column CRUD: add/remove/reorder columns, set type/label/required per column |

**Modified components:**
- `SchemaFieldEditor` -- add `'table'` to FIELD_TYPES array
- `FieldConfigEditor` -- add table case
- `SchemaFieldConfig` interface -- add `columns` property

**Data flow:** Same as existing config editing: `FieldConfigEditor` calls `onConfigChange({ ...config, columns: updatedColumns })`.

---

### Feature 3: Conditional Rule UI

**What changes:**
- New tab or sub-panel within the field settings (expanded FieldCard) for defining conditional rules
- The `ConditionalRule` type already exists. The runtime evaluator (`evaluateConditions`) already works.
- Need UI to author rules: "When [fieldId] [operator] [value], then [action] this field"

**Integration points:**
- **TemplateFormModal:** Lift `conditionalRules` to state (currently hardcoded as `[]` in onSubmit). Pass to SchemaFieldEditor and SchemaPreviewPanel.
- **FieldCard expanded section:** Add a "Conditions" tab/section below existing config
- **Schema serialization:** Include rules in `JSON.stringify({ ..., conditionalRules })` (already in the shape, just populate it)

**New components:**

| Component | Location | Responsibility |
|-----------|----------|----------------|
| `ConditionalRuleEditor` | `admin/components/rules/ConditionalRuleEditor.tsx` | List of rules targeting this field; add/edit/remove |
| `ConditionRow` | `admin/components/rules/ConditionRow.tsx` | Single rule: source field picker, operator select, value input, action select |

**Modified components:**
- `TemplateFormModal` -- add `conditionalRules` state, pass down, include in serialization
- `FieldCard` -- add conditions section/tab in expanded view
- `SchemaPreviewPanel` -- evaluate conditions with mock form values for live preview

**Design note:** Rules are stored at the schema level (`conditionalRules[]`), not per-field. The UI should filter rules by `targetFieldId` when editing a specific field, but store them in the top-level array.

---

### Feature 4: Calculation Rule UI

**What changes:**
- Similar to conditional rules: UI to author `CalculationRule` objects
- Formula builder: select source fields, operators, build formula string
- `dependsOn` array auto-generated by parsing the formula for field references

**Integration points:**
- **TemplateFormModal:** Lift `calculationRules` to state (currently `[]`). Pass to SchemaFieldEditor.
- **FieldCard expanded section:** Add "Calculation" tab/section (only for `number` type fields)
- **Backend:** `CircularDependencyValidator` already validates on save. No backend changes needed.

**New components:**

| Component | Location | Responsibility |
|-----------|----------|----------------|
| `CalculationRuleEditor` | `admin/components/rules/CalculationRuleEditor.tsx` | Formula builder for a target field |
| `FormulaBuilder` | `admin/components/rules/FormulaBuilder.tsx` | Visual formula input: field tokens + operators, auto-generates `dependsOn` |

**Modified components:**
- `TemplateFormModal` -- add `calculationRules` state
- `FieldCard` -- add calculation section (conditional on field type === 'number')
- `SchemaPreviewPanel` -- run `executeCalculations` with mock values for demo

**Design note:** Parse formula string to extract field references for `dependsOn`. Use the existing `resolveFieldValue` pattern from `executeCalculations.ts` to identify `fieldId` and `arrayField.column` references.

---

### Feature 5: Template Clone

**What changes:**
- Button on TemplateTable row or TemplateListPage to clone a template
- Creates a new template with copied schema but new name/prefix
- Can be done client-side (read detail, open modal pre-filled) or server-side (new API endpoint)

**Integration points:**
- **TemplateTable:** Add clone button to each row's action area
- **TemplateListPage:** Handle clone action by opening TemplateFormModal with pre-filled data
- **TemplateFormModal:** Accept optional `cloneSource: TemplateDetailItem` prop that pre-fills all fields except name/prefix

**New components:** None -- reuses existing modal.

**Modified components:**
- `TemplateTable` -- add clone button per row
- `TemplateListPage` -- add clone handler state, fetch detail, pass to modal
- `TemplateFormModal` -- accept `cloneSource` prop, pre-fill form + schema on open

**API approach:** Client-side clone (no new backend endpoint). Flow:
1. User clicks "Clone" on a template row
2. Fetch template detail (useTemplateDetail)
3. Open TemplateFormModal in create mode with pre-filled data (name = "원본이름 (복사)", empty prefix)
4. User edits and saves as new template

---

### Feature 6: JSON Import/Export

**What changes:**
- Export: Download current schema as JSON file
- Import: Upload JSON file, parse and load into SchemaFieldEditor

**Integration points:**
- **SchemaFieldEditor or TemplateFormModal:** Add import/export buttons in the fields tab header area
- **Export:** `JSON.stringify({ version, fields, conditionalRules, calculationRules })` -> download as file
- **Import:** File input -> parse JSON -> validate structure -> set `schemaFields`, `conditionalRules`, `calculationRules`

**New components:**

| Component | Location | Responsibility |
|-----------|----------|----------------|
| `SchemaImportExport` | `admin/components/SchemaImportExport.tsx` | Import/Export buttons + file handling logic |

**Modified components:**
- `SchemaFieldEditor` -- add import/export buttons in header area (or `TemplateFormModal` adds them above SchemaFieldEditor)
- `TemplateFormModal` -- pass conditionalRules/calculationRules setters to import handler

**Validation on import:** Reuse the `SchemaFieldType` type to validate field types. Basic structure check: `{ version, fields: [...] }`.

---

### Feature 7: Preset Templates

**What changes:**
- When creating a new template, offer preset options (e.g., "General approval", "Expense report", "Leave request")
- Presets are hardcoded JSON schemas matching existing hardcoded form templates
- User selects a preset, fields populate, then customizes

**Integration points:**
- **TemplateFormModal:** Show preset selector when creating new template (before or alongside the fields tab)
- **Presets stored as:** Static TypeScript constants (not from API). One file with preset schema definitions.

**New components:**

| Component | Location | Responsibility |
|-----------|----------|----------------|
| `PresetSelector` | `admin/components/PresetSelector.tsx` | Card grid showing preset options; on select, populates fields/rules |
| `presetSchemas.ts` | `admin/constants/presetSchemas.ts` | Static schema definitions for each preset type |

**Modified components:**
- `TemplateFormModal` -- show PresetSelector in create mode (fields tab or as a step before)

---

## Component Hierarchy (After All Features)

```
TemplateListPage
  TemplateTable (+ clone button per row)
  TemplateFormModal (widened, split layout)
    |-- Left pane:
    |     Tab: 기본 정보 (existing info form)
    |     Tab: 필드 구성
    |       PresetSelector (create mode only, appears when no fields)
    |       SchemaImportExport (import/export buttons)
    |       SchemaFieldEditor
    |         FieldCard[]
    |           FieldConfigEditor (existing + table case)
    |             TableColumnEditor (for table type)
    |           ConditionalRuleEditor (per field)
    |           CalculationRuleEditor (for number fields)
    |-- Right pane:
    |     SchemaPreviewPanel
    |       PreviewFieldRenderer[] (one per field)
    |     FullscreenPreviewButton
    |
    FullscreenPreviewModal (portal, overlays everything)
```

## State Architecture

```
TemplateFormModal state:
  - formData (react-hook-form): name, description, prefix, category, icon
  - schemaFields: SchemaField[]           <-- existing
  - conditionalRules: ConditionalRule[]   <-- NEW (currently hardcoded [])
  - calculationRules: CalculationRule[]   <-- NEW (currently hardcoded [])
  - activeTab: TabKey                     <-- existing

All three schema arrays flow DOWN to:
  - SchemaFieldEditor (fields + rules for per-field editing)
  - SchemaPreviewPanel (all three for live rendering)

Changes flow UP via callbacks:
  - setSchemaFields (existing)
  - setConditionalRules (new)
  - setCalculationRules (new)
```

## Suggested Build Order

The order is driven by dependencies: each feature should be buildable and testable independently, with later features building on earlier ones.

### Phase 1: Table Column Editor
**Why first:** Self-contained change within existing SchemaFieldEditor. No layout changes. Unblocks the `table` field type which is already partially supported (type exists, dropdown excludes it). Smallest scope.

**Tasks:**
1. Add `columns` to `SchemaFieldConfig` interface
2. Create `TableColumnEditor` component
3. Add `'table'` to `FIELD_TYPES` array
4. Add `case 'table'` to `FieldConfigEditor`
5. Test: add table field, configure columns, save, reload

### Phase 2: Live Preview Panel
**Why second:** Requires layout restructure of TemplateFormModal. Once done, all subsequent features get visual feedback for free. No dependency on rules.

**Tasks:**
1. Restructure TemplateFormModal to split-pane layout (responsive: stacked on mobile, side-by-side on desktop)
2. Create `PreviewFieldRenderer` for each field type (text, textarea, number, date, select, table, staticText, hidden)
3. Create `SchemaPreviewPanel` that maps fields to renderers
4. Create `FullscreenPreviewModal`
5. Test: add fields, see them render in real-time in preview

### Phase 3: Conditional Rule UI
**Why third:** Depends on preview panel for visual feedback. Rules are simpler than calculations (no formula parsing). Existing `evaluateConditions` runtime can be reused in preview.

**Tasks:**
1. Lift `conditionalRules` state to TemplateFormModal
2. Create `ConditionRow` component (source field picker, operator, value, action)
3. Create `ConditionalRuleEditor` component (list of rules for a target field)
4. Add conditions section to expanded FieldCard
5. Integrate with SchemaPreviewPanel (preview evaluates conditions with sample values)
6. Update serialization in onSubmit
7. Test: create rule "when field A = X, hide field B", verify in preview

### Phase 4: Calculation Rule UI
**Why fourth:** Depends on preview for feedback. Formula parsing is more complex. Backend `CircularDependencyValidator` already handles validation.

**Tasks:**
1. Lift `calculationRules` state to TemplateFormModal
2. Create `FormulaBuilder` (field token insertion, basic operators, SUM() helper)
3. Create `CalculationRuleEditor` (per-field, only shown for number types)
4. Auto-generate `dependsOn` from formula string
5. Add calculation section to expanded FieldCard
6. Integrate with SchemaPreviewPanel (preview runs calculations)
7. Update serialization in onSubmit
8. Test: create rule "totalAmount = SUM(items.price * items.qty)", verify in preview

### Phase 5: Template Clone + JSON Import/Export + Presets
**Why last:** All three are convenience features that don't change core data structures. They compose on top of the fully-working editor. Can be built in any sub-order.

**Sub-order:**
1. **JSON Export** (simplest: serialize current state to file download)
2. **JSON Import** (parse file, validate, populate state)
3. **Template Clone** (fetch detail, pre-fill modal)
4. **Preset Templates** (static schemas, selector UI)

---

## Backend Changes Required

| Feature | Backend Change | Scope |
|---------|---------------|-------|
| Table Column Editor | None -- columns already supported in schema validation | None |
| Live Preview | None -- purely client-side | None |
| Conditional Rule UI | None -- schema already accepts `conditionalRules` array | None |
| Calculation Rule UI | None -- `CircularDependencyValidator` already runs on save | None |
| Template Clone | None -- client-side clone using existing create API | None |
| JSON Import/Export | None -- client-side only | None |
| Preset Templates | None -- static client-side data | None |

**All 7 features are frontend-only changes.** The backend already supports the full schema structure including conditional/calculation rules, table columns, and schema versioning.

## Anti-Patterns to Avoid

### Anti-Pattern 1: Building a generic DynamicFormRenderer for document editing now
**Why bad:** The existing hardcoded form templates (GeneralForm, ExpenseForm, etc.) work well and are registered via `TEMPLATE_REGISTRY`. The preview renderer is read-only and simpler. Attempting to unify edit + preview renderers would scope-creep this milestone.
**Instead:** Build `PreviewFieldRenderer` as preview-only. Mark it for future extraction when/if dynamic form editing is needed.

### Anti-Pattern 2: Storing presets in the database
**Why bad:** Presets are developer-authored starting points, not user-managed data. Adding API + DB for presets adds complexity with no benefit for ~6 preset types.
**Instead:** Static TypeScript constants in `presetSchemas.ts`.

### Anti-Pattern 3: Server-side clone endpoint
**Why bad:** Clone = read detail + create with modified data. The client already has both APIs. A dedicated endpoint adds unnecessary backend surface area.
**Instead:** Client-side clone: fetch detail -> open create modal pre-filled.

### Anti-Pattern 4: Deeply nested state management
**Why bad:** If each FieldCard manages its own conditional/calculation rules independently, synchronizing with the top-level rules array becomes error-prone.
**Instead:** All rules live in TemplateFormModal state. FieldCard receives filtered rules and change callbacks. Single source of truth.

## Sources

- Direct codebase analysis (HIGH confidence -- all findings based on actual source code)
- Existing type definitions: `dynamicForm.ts`, `SchemaFieldEditor.tsx`, `TemplateFormModal.tsx`
- Backend validators: `CircularDependencyValidator.java`, `TemplateSchemaService.java`
- Runtime evaluators: `evaluateConditions.ts`, `executeCalculations.ts`

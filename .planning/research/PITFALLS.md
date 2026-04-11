# Domain Pitfalls: Form Builder Modal Enhancement (v1.1)

**Domain:** Form builder UI enhancement for electronic approval system
**Researched:** 2026-04-11
**Context:** Adding live preview, conditional rules UI, calculation rules, JSON import/export, table column editor, and preset templates to existing TemplateFormModal (334 lines) + SchemaFieldEditor (596 lines)

## Critical Pitfalls

### Pitfall 1: Modal Size Explosion -- Cramming a Full IDE into a Modal

**What goes wrong:** Adding live preview panel, rule editors, and table column editor to the existing `max-w-4xl max-h-[90vh]` modal makes it unusable. The modal overflows, scrollbars nest, and users lose context constantly.

**Why it happens:** The current TemplateFormModal is a single-panel scrolling modal. Adding a side-by-side preview panel doubles the horizontal space needed. The tab system (`info` | `fields`) already hides content -- adding more tabs (conditions, calculations) fragments the editing experience further.

**Consequences:**
- Users can't see preview and field editor simultaneously (defeating the purpose of live preview)
- Nested scroll regions within the modal cause scroll hijacking on touchpads
- Mobile/small-screen admins (even on laptops) can't use the builder at all
- The form submit button gets pushed below the fold

**Prevention:**
- Convert from modal to a full-page route (`/admin/templates/:id/edit`) for the advanced builder. Keep the simple modal for quick info edits only.
- If keeping modal: use a split-pane layout with fixed preview on the right (40%) and editor on the left (60%), with `min-w-[1024px]` requirement
- Use a drawer/sidebar pattern for field-level settings (conditions, calculations) instead of inline expansion
- The fullscreen preview button already planned is essential -- make it the primary preview mode rather than trying to squeeze a live panel into the modal

**Detection:** If you find yourself adding `overflow-y-auto` inside another `overflow-y-auto` container, or if the modal exceeds `max-w-6xl`, stop and reconsider the layout.

**Phase:** Must address in Phase 1 (layout restructure) before building any features on top.

---

### Pitfall 2: Re-render Avalanche from Uncontrolled State Lifting

**What goes wrong:** Every keystroke in any field config input triggers `onChange(fields)` in SchemaFieldEditor, which calls `setSchemaFields` in TemplateFormModal, re-rendering the entire field list, all expanded editors, AND the live preview panel.

**Why it happens:** The current architecture passes the full `SchemaField[]` array up on every change. This is fine for 596 lines of simple editors, but adding a live preview that must parse and render the full schema on every state change creates O(n) re-renders where n = number of fields.

**Consequences:**
- Typing lag in field config inputs (placeholder, min/max) as form grows beyond 10 fields
- Live preview panel flickers/jumps on every keystroke
- Calculation rule evaluation fires unnecessarily during unrelated field edits
- Browser jank on mid-range hardware

**Prevention:**
- Debounce preview updates: preview should react to schema changes with 300ms debounce, not on every keystroke
- Use `React.memo` on FieldCard components with proper comparison (compare by field.id + field reference)
- Consider `useReducer` instead of `useState` for schemaFields to get stable dispatch references
- Split preview into its own context/store that receives schema snapshots, not live state
- For the calculation rule engine: only re-evaluate when relevant `dependsOn` fields change, not on every schema mutation

**Detection:** Use React DevTools Profiler. If changing a single field's placeholder causes >5 component re-renders, the architecture needs fixing.

**Phase:** Must address in Phase 1 alongside preview panel implementation. Retrofitting memoization after building features is significantly harder.

---

### Pitfall 3: Circular Dependency and Invalid Reference Bugs in Rule Editors

**What goes wrong:** User creates a conditional rule referencing field B, then deletes field B. Or creates calculation rule A depends on B, B depends on A. The schema saves successfully but the document form breaks at runtime for end users.

**Why it happens:** The backend has `CircularDependencyValidator` for calculation rules but the frontend rule editors won't enforce this in real-time. Field deletion doesn't cascade to rules that reference the deleted field. The `conditionalRules` and `calculationRules` arrays are currently empty placeholders (`[]`) in the save payload -- no frontend code touches them yet.

**Consequences:**
- Orphaned rules pointing to non-existent field IDs cause runtime errors in document forms
- Circular calculation dependencies cause infinite loops (backend catches this on save, but user gets a confusing server error instead of inline feedback)
- Admin saves a template, end users see broken forms, admin has no idea which rule is the problem

**Prevention:**
- When deleting a field, scan `conditionalRules` and `calculationRules` for references to that field ID. Show a warning dialog listing affected rules and auto-remove them.
- Mirror the backend's circular dependency detection on the frontend. The `CircularDependencyValidator` logic (DFS cycle detection) should be replicated in TypeScript and run on every calculation rule change.
- Rule editors must only allow selecting from existing field IDs via dropdown -- never free-text field ID entry.
- Add a schema validation step before save that checks all field references in rules resolve to actual fields.

**Detection:** If `conditionalRules` or `calculationRules` contain any `fieldId` or `targetFieldId` that doesn't exist in the `fields` array, the schema is corrupt.

**Phase:** Must be built into the rule editor components from day one. Cannot be retrofitted.

---

### Pitfall 4: JSON Import Accepting Malicious or Incompatible Schemas

**What goes wrong:** Admin imports a JSON file that contains fields with duplicate IDs, references to non-existent field types, XSS payloads in label/placeholder strings, or schema version mismatches. The import succeeds, the template saves, and the corruption propagates to all new documents using that template.

**Why it happens:** JSON import bypasses the normal field-by-field creation flow and its implicit validation. The temptation is to just `JSON.parse()` and `setSchemaFields()`.

**Consequences:**
- Duplicate field IDs cause form rendering bugs (React key collisions, form data overwrites)
- Unknown field types cause runtime crashes in DynamicFormValidator and document rendering
- XSS in labels/placeholders if ever rendered with `dangerouslySetInnerHTML` (unlikely in current code but possible in preview)
- Schema version mismatch causes silent data loss (v2 features imported into v1 system)

**Prevention:**
- Validate imported JSON against the `SchemaDefinition` TypeScript type using Zod schema validation before accepting
- Check for duplicate field IDs and reject/rename automatically
- Sanitize all string values (strip HTML tags at minimum)
- Verify schema version compatibility
- Show a diff/preview of what will be imported before applying
- Limit import file size (e.g., 500KB) to prevent browser freeze on massive files

**Detection:** If `JSON.parse` is called on import data without subsequent Zod validation, it's vulnerable.

**Phase:** Implement validation layer in the same phase as JSON import/export.

---

## Moderate Pitfalls

### Pitfall 5: Table Column Editor Creating Deeply Nested State

**What goes wrong:** Table field columns have their own type, label, required, and config. Editing a column's config (e.g., select options within a table column) creates 4+ levels of nested state: `fields[i].config.columns[j].config.options[k]`. Immutable updates become error-prone and performance degrades.

**Why it happens:** The current `SchemaField.config` is already one level deep. Adding `columns: ColumnDefinition[]` where each column has its own `config` doubles the nesting. The spread-based immutable update pattern (`{...field, config: {...config, columns: [...columns]}}`) becomes unwieldy.

**Prevention:**
- Use `immer` (or Zustand's built-in immer middleware) for nested state updates. This is the single most impactful library addition for this milestone.
- Extract the table column editor into a self-contained component with its own local state that syncs to parent on blur/confirm, not on every keystroke.
- Limit table column types to `text`, `number`, `date`, `select` only -- don't allow nested tables (tables within tables).
- The backend `DynamicFormValidator.validateTable()` already handles column-level validation, so the column definition structure must exactly match what the validator expects.

**Detection:** If you see more than 3 levels of spread operators in a single state update, introduce immer.

**Phase:** Address when building the table column editor.

---

### Pitfall 6: Preset Templates Overwriting User Work Without Warning

**What goes wrong:** Admin is halfway through building a custom form, clicks a preset template, and all their work is replaced instantly with no undo capability.

**Why it happens:** Preset template application naturally replaces the entire `schemaFields` array. Without undo/confirm, this is destructive.

**Prevention:**
- Show a confirmation dialog: "현재 편집 중인 필드가 모두 대체됩니다. 계속하시겠습니까?" (All current fields will be replaced. Continue?)
- Only allow preset selection on empty forms, OR offer "merge" option that appends preset fields after existing ones
- Implement single-level undo (store previous `schemaFields` state and offer "되돌리기" button for 10 seconds after preset application)
- Consider placing presets in the template creation flow (before the editor) rather than inside the editor

**Detection:** If applying a preset calls `setSchemaFields(presetFields)` without any guard, it's destructive.

**Phase:** Address when building preset template feature.

---

### Pitfall 7: Conditional Rules UI Becoming an Incomprehensible Rule Builder

**What goes wrong:** The conditional rule UI tries to support every possible operator and condition combination, resulting in a mini programming language that admins (non-technical company employees) can't understand.

**Why it happens:** The `ConditionalRule` type supports generic `operator: string` and `value: unknown`, which tempts developers to build a full expression builder. For a 50-person company approval system, this is massive overengineering.

**Consequences:**
- Admins create rules they don't understand, then can't debug why fields appear/disappear
- Edge cases multiply: what if the condition field is empty? What if it's a number compared to a string?
- Testing matrix explodes with every new operator

**Prevention:**
- Limit operators to a small, fixed set: `equals`, `notEquals`, `isEmpty`, `isNotEmpty` for text/select; `greaterThan`, `lessThan` for numbers
- Use natural language display: "필드 '휴가 유형'이 '특별휴가'일 때 → '사유' 필드 표시" (When field 'Leave Type' is 'Special Leave' -> Show 'Reason' field)
- Only allow conditions based on select and number fields (text field conditions are fragile -- what about partial matches, case sensitivity?)
- Limit to single-condition rules (no AND/OR combinators). Multi-condition logic is a Phase 2 concern.
- Show the rule's effect in the live preview immediately

**Detection:** If the condition builder has more than 6 operator options or supports nested conditions, it's overbuilt.

**Phase:** Address when building the conditional rules UI. Start minimal.

---

### Pitfall 8: Calculation Formula String Parsing Fragility

**What goes wrong:** The `CalculationRule.formula` is a free-form string (e.g., `"{price} * {quantity}"`). Parsing this reliably for both display and evaluation is error-prone. Users type invalid formulas, reference wrong fields, or use unsupported operators.

**Why it happens:** The backend stores formula as a string but doesn't evaluate it -- it's a frontend concern. Building a safe formula evaluator that handles edge cases (division by zero, null fields, type coercion) is substantially more complex than it appears.

**Prevention:**
- Do NOT build a free-text formula input. Use a structured builder: "Field A [operator] Field B" where operator is `+`, `-`, `*`, `/`
- For complex formulas (sum of table column), provide dedicated function buttons rather than free-text: `SUM(table.column)`, `COUNT(table.column)`
- Evaluate formulas with explicit null handling: if any input is null/empty, result is empty (not 0, not NaN)
- Never use `eval()` or `new Function()` for formula evaluation -- build a simple expression parser or use a library like `mathjs` with sandboxed evaluation
- The `dependsOn` array in `CalculationRule` must be auto-populated from the formula, not manually entered

**Detection:** If `eval()` appears anywhere in the formula evaluation code, it's a security vulnerability.

**Phase:** Address when building the calculation rules UI.

---

### Pitfall 9: SchemaFieldEditor Growing Beyond Maintainability

**What goes wrong:** SchemaFieldEditor is already 596 lines. Adding table column editor, condition tab, calculation tab, and drag-and-drop could push it past 1500 lines, making it unmaintainable.

**Why it happens:** The component is currently self-contained with sub-components defined in the same file (FieldCard, FieldConfigEditor, TypeBadge). The natural tendency is to keep adding to it.

**Prevention:**
- Extract before extending. Before adding any new feature, split the current file:
  - `SchemaFieldEditor.tsx` -- orchestrator only (field list, add/delete/reorder)
  - `FieldCard.tsx` -- individual field card with expand/collapse
  - `FieldConfigEditor.tsx` -- type-specific config panels
  - `TableColumnEditor.tsx` -- new, for table column management
  - `ConditionalRuleEditor.tsx` -- new, per-field condition panel
  - `CalculationRuleEditor.tsx` -- new, per-field calculation panel
- Share types via `types/schemaTypes.ts` (currently types are exported from SchemaFieldEditor itself)
- Target: no single component file exceeds 300 lines

**Detection:** If any file exceeds 500 lines, it needs splitting.

**Phase:** Must be done FIRST, before any feature additions. This is a prerequisite refactor.

---

## Minor Pitfalls

### Pitfall 10: Field ID Stability Across Schema Edits

**What goes wrong:** Admin renames a field label, the auto-ID generation changes the field ID, and all existing documents referencing the old ID lose their data mapping.

**Why it happens:** The current `toFieldId()` function derives IDs from labels. The `labelEdited` flag in FieldCard attempts to prevent re-generation, but the flag resets when the modal reopens (it's local component state).

**Prevention:**
- Field IDs should be immutable after first save. On edit mode, disable the ID field entirely.
- Generate IDs as UUIDs or `field_{timestamp}` (current behavior for new fields) and never derive from labels.
- Remove `toFieldId()` label-to-ID derivation entirely -- it's a convenience that creates a data integrity hazard.

**Detection:** If changing a field label in edit mode changes the field ID, existing documents will break.

**Phase:** Fix before v1.1 features, as it's a data integrity issue.

---

### Pitfall 11: Live Preview Not Matching Actual Document Rendering

**What goes wrong:** The preview panel renders fields differently from the actual document form components (GeneralForm, ExpenseForm, etc.), giving admins a false sense of what end users will see.

**Why it happens:** The existing document forms are hardcoded React components per template type. The preview must render from the dynamic schema definition. These are fundamentally different rendering paths that will inevitably drift.

**Prevention:**
- Build a single `DynamicFormRenderer` component used by BOTH the preview panel AND the actual document form for dynamic templates.
- Accept that hardcoded templates (GENERAL, EXPENSE, LEAVE) and dynamic templates will look different -- don't try to unify them.
- Preview should clearly label itself as "동적 양식 미리보기" (Dynamic Form Preview) to set expectations.
- Use the exact same TailwindCSS classes and spacing in preview as in actual form rendering.

**Detection:** If preview and form rendering are separate implementations, they will drift.

**Phase:** Build DynamicFormRenderer in the same phase as the preview panel.

---

### Pitfall 12: Drag-and-Drop Reordering Breaking Field References in Rules

**What goes wrong:** Fields are reordered via drag-and-drop. Rules reference fields by ID (not index), so reordering itself is safe. But the visual suggestion that field order matters for conditional rules ("show field B when field A = X") can confuse admins if B appears before A.

**Prevention:**
- Validate that conditional rule source fields appear before target fields in the field order. Show a warning if violated.
- This is a UX concern, not a technical one -- the system should work regardless of order, but admin comprehension matters.

**Phase:** Address when adding drag-and-drop (if implemented).

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|---------------|------------|
| Layout restructure | Pitfall 1: Modal explosion | Convert to full-page or split-pane layout before adding features |
| Component refactor | Pitfall 9: File bloat | Extract sub-components FIRST, then build new features |
| Live preview | Pitfall 2: Re-render avalanche | Debounce + memoization from day one |
| Live preview | Pitfall 11: Preview drift | Single DynamicFormRenderer for preview and runtime |
| Table column editor | Pitfall 5: Nested state | Use immer for deep state updates |
| Conditional rules UI | Pitfall 7: Overbuilt rule builder | Hard-limit operator set, single conditions only |
| Calculation rules UI | Pitfall 8: Formula parsing | Structured builder, never eval(), auto-populate dependsOn |
| JSON import/export | Pitfall 4: Malicious import | Zod validation, duplicate ID check, sanitization |
| Preset templates | Pitfall 6: Destructive overwrite | Confirmation dialog, single-level undo |
| Field ID handling | Pitfall 10: ID instability | Make IDs immutable after first save |
| Rule editors | Pitfall 3: Orphaned references | Cascade-check on field deletion, mirror backend validation |

## Recommended Phase Order Based on Pitfall Dependencies

1. **Refactor first** (Pitfalls 9, 10) -- Extract components, fix field ID stability
2. **Layout + Preview** (Pitfalls 1, 2, 11) -- Restructure layout, build DynamicFormRenderer with debounce
3. **Table column editor** (Pitfall 5) -- Add immer, build column editor
4. **Conditional rules** (Pitfalls 3, 7) -- Build minimal rule editor with reference validation
5. **Calculation rules** (Pitfalls 3, 8) -- Build structured formula builder with cycle detection
6. **Import/Export** (Pitfall 4) -- Build with full Zod validation
7. **Presets + Clone** (Pitfall 6) -- Build with confirmation guards

## Sources

- Direct codebase analysis: `TemplateFormModal.tsx` (334 lines), `SchemaFieldEditor.tsx` (596 lines)
- Direct codebase analysis: `DynamicFormValidator.java`, `CircularDependencyValidator.java`
- Direct codebase analysis: `dynamicForm.ts` type definitions (ConditionalRule, CalculationRule types already defined)
- React performance patterns: React.memo, useMemo, useCallback documentation
- Form builder UX anti-patterns: common in no-code/low-code platform post-mortems

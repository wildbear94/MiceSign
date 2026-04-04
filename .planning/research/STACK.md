# Technology Stack: Custom Template Builder

**Project:** MiceSign v1.2 -- Custom Template Builder
**Researched:** 2026-04-05
**Scope:** NEW libraries only for template builder features. Existing stack validated in v1.0/v1.1 is not re-researched.

## Recommended Stack Additions

### 1. Drag & Drop -- @hello-pangea/dnd (ALREADY INSTALLED)

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| `@hello-pangea/dnd` | ^18.0.1 (installed) | Drag fields from palette to canvas, reorder fields | Already used in 3 components (ApprovalLineList, ApprovalLineItem, PositionTable). Reusing avoids bundle bloat and behavioral inconsistency. |

**No new DnD library needed.** The form builder's core interaction is:
1. Drag field types from a palette onto a canvas (single droppable)
2. Reorder fields within the canvas (sortable list)
3. Optionally reorder columns within table fields (nested sortable)

All of these are standard `DragDropContext` + `Droppable` + `Draggable` patterns that `@hello-pangea/dnd` handles well. The approval line editor already demonstrates this exact pattern in the codebase.

**Why NOT switch to @dnd-kit/core:**
- `@hello-pangea/dnd` is already installed and used in 3 components. Switching means rewriting those components plus learning a new API.
- `@dnd-kit/core` (6.3.1) has more features (multiple collision strategies, keyboard sensors) but the form builder doesn't need them. Field reordering is a simple vertical sortable list.
- `@dnd-kit/react` (0.3.x) is the future but is pre-1.0. Not production-ready.
- The only scenario where dnd-kit is better: complex nested drag & drop (e.g., fields inside sections inside tabs). If the builder evolves to that complexity, migration can happen then.

**Confidence:** HIGH -- reuse existing dependency for the same pattern.

### 2. JSON Schema Form Rendering -- Custom Renderer (NO new library)

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| `react-hook-form` | ^7.72.0 (installed) | Form state management for rendered templates | Already used in all 6 existing form templates. `useFieldArray` handles dynamic rows (table fields). |
| `zod` | ^4.3.6 (installed) | Runtime validation for rendered templates | Already used. Can dynamically construct schemas: `z.object({ [fieldName]: z.string().min(1) })` |
| Custom `DynamicFormRenderer` | N/A | Map JSON field definitions to React components | 6-8 field types is well within custom code territory |

**Why NOT use RJSF (react-jsonschema-form v5):**
- MiceSign uses `react-hook-form` + `zod` everywhere. RJSF brings its own form state manager and uses `ajv` for validation. This creates two competing form systems.
- RJSF's theming system conflicts with TailwindCSS. Custom widgets would need to be written for every field type anyway, eliminating RJSF's main value proposition.
- RJSF expects standard JSON Schema (Draft 7+). Our schema is simpler -- a flat array of field definitions. RJSF's complexity (refs, allOf/anyOf, definitions) is unnecessary.

**Why NOT use JSON Forms (@jsonforms/react):**
- Same problem: brings its own form state/validation layer separate from react-hook-form.
- Renderer-based architecture is powerful but over-engineered for 6-8 field types.

**Why NOT use SurveyJS:**
- Commercial license required for the form builder component.
- Designed for survey/quiz scenarios, not approval document workflows.

**Custom schema format (NOT JSON Schema Draft 7):**
```typescript
interface TemplateSchema {
  fields: FieldDefinition[];
}

interface FieldDefinition {
  id: string;           // unique field identifier
  type: 'text' | 'textarea' | 'number' | 'date' | 'select' | 'checkbox' | 'table' | 'calculated';
  label: string;
  required: boolean;
  placeholder?: string;
  defaultValue?: string | number;
  options?: { label: string; value: string }[];  // for select
  columns?: FieldDefinition[];                    // for table (nested fields)
  formula?: string;                                // for calculated fields
  condition?: {                                    // for conditional visibility
    field: string;      // id of the controlling field
    operator: 'eq' | 'neq' | 'gt' | 'lt' | 'contains';
    value: string | number;
  };
  validation?: {
    min?: number;
    max?: number;
    minLength?: number;
    maxLength?: number;
    pattern?: string;
  };
}
```

This is deliberately simpler than JSON Schema Draft 7. It maps 1:1 to React components and Zod validators without a translation layer.

**Confidence:** HIGH -- correct architectural decision for existing stack. Avoids introducing competing form frameworks.

### 3. Formula/Calculation Engine -- expr-eval (v2.0.2)

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| `expr-eval` | 2.0.2 | Evaluate admin-defined formulas safely | Sandboxed expression parser, ~15KB gzip, supports variables/functions/operators |

**What this enables:**
- Admin defines formula: `price * quantity` or `SUM(items.amount)` or `total * 0.1`
- At runtime, field values are injected as variables and the expression is evaluated
- Result displayed in a read-only calculated field

**Why expr-eval over alternatives:**

| Library | Bundle Size | Security | Maintenance | Fit |
|---------|-------------|----------|-------------|-----|
| **expr-eval** | ~15KB gzip | Sandboxed, no global access | Stable (v2.0.2, feature-complete) | Exact match for form calculations |
| math.js | ~170KB gzip | Sandboxed | Active | Massive overkill -- matrices, complex numbers, symbolic math |
| `new Function()` | 0KB | UNSAFE -- arbitrary JS execution | N/A | Security nightmare for admin-authored formulas |
| hot-formula-parser | ~50KB gzip | Sandboxed | Abandoned (last update 2020) | Excel-style formulas, heavier than needed |

**Maintenance note:** expr-eval has not had a release since 2020, but the library is feature-complete for expression evaluation. The core parser has no reported bugs. If maintenance becomes a concern, `expr-eval-fork` (v3.0.3, updated Feb 2026) is a drop-in replacement with TypeScript types and minor fixes.

**Usage pattern:**
```typescript
import { Parser } from 'expr-eval';

const parser = new Parser();
const expr = parser.parse('price * quantity * (1 + taxRate)');
const result = expr.evaluate({ price: 50000, quantity: 3, taxRate: 0.1 });
// => 165000
```

**Confidence:** MEDIUM -- expr-eval is unmaintained but stable and feature-complete. `expr-eval-fork` is the fallback. Flag for evaluation if any parsing bugs surface.

### 4. Backend JSON Schema Validation -- networknt/json-schema-validator (v1.5.5)

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| `com.networknt:json-schema-validator` | 1.5.5 | Validate submitted form data against template schema on backend | Jackson-native, fastest Java validator, supports Draft 2020-12, actively maintained (March 2026 release) |

**Why this is needed:**
- Frontend validation (Zod) prevents honest mistakes. Backend validation prevents malicious submissions.
- When a user submits a document, the backend must verify that `form_data` JSON conforms to the template's `schema_definition`. Without this, a crafted API call could submit invalid data that breaks rendering.

**Why networknt over alternatives:**

| Library | Jackson Native | Performance | Maintenance | Draft Support |
|---------|---------------|-------------|-------------|---------------|
| **networknt** | Yes -- uses `JsonNode` directly | Fastest in benchmarks | Active (v1.5.5, Mar 2026) | V4, V6, V7, 2019-09, 2020-12 |
| everit/json-schema | No -- uses org.json | Good | Slower release cadence | V4, V6, V7 |
| justify | No -- uses Jakarta JSON-P | Good | Low activity | V4, V6, V7 |

**Why v1.5.x instead of v3.0.x:**
- v1.5.x is the mature, well-documented line with extensive Spring Boot integration examples.
- v3.0.x is a major rewrite with breaking API changes and fewer community examples. No compelling feature for our use case.

**Integration with custom schema format:**
Even though our template schema is a custom format (not JSON Schema Draft 7), networknt is still useful for:
1. Validating the structure of the template definition itself (meta-schema validation)
2. Generating a JSON Schema from our custom format at runtime for data validation
3. Future-proofing if we later adopt standard JSON Schema

Alternatively, validation can be done entirely in Java code by iterating over the field definitions and checking types/constraints. For v1.2 MVP, this simpler approach may be sufficient, with networknt added later if schemas become complex.

**Confidence:** MEDIUM -- networknt is the right choice IF we use JSON Schema for validation. For a custom schema format, pure Java validation may be simpler initially. Include in build.gradle but evaluate during implementation.

### 5. Template Versioning -- Database Schema Pattern (NO new library)

No new library needed. This is solved with schema design.

**Approach: Version column + schema snapshot on document**

| Change | Table | Column | Type | Purpose |
|--------|-------|--------|------|---------|
| ADD | `approval_template` | `schema_definition` | `JSON` | Current template field layout (the builder-produced JSON) |
| ADD | `approval_template` | `schema_version` | `INT NOT NULL DEFAULT 1` | Auto-incremented when admin modifies the template schema |
| ADD | `approval_template` | `is_custom` | `BOOLEAN NOT NULL DEFAULT FALSE` | Distinguishes builder-created templates from legacy hardcoded ones |
| ADD | `approval_template` | `created_by` | `BIGINT NULL` | FK to user who created (NULL for seed/legacy templates) |
| ADD | `document_content` | `schema_version` | `INT NOT NULL DEFAULT 1` | Which template version this document was created with |
| ADD | `document_content` | `schema_definition_snapshot` | `JSON NULL` | Full copy of the template schema at submission time |

**Why snapshot on document_content (not a version history table):**
- When template v2 is published, documents created with v1 must still render correctly using v1's field layout. The snapshot guarantees this.
- Snapshot is captured at SUBMISSION time (consistent with MiceSign's existing immutability model: submitted documents are locked).
- Drafts always use the latest template version. If a template is updated while a user has an unsaved draft, they see the new version next time they open it.
- `schema_definition_snapshot` is NULL for legacy hardcoded-template documents (they render via the existing `TEMPLATE_REGISTRY` code path).

**Why NOT a separate `template_version_history` table:**
- For ~50 users and likely <20 templates, a full version history table adds schema complexity and query overhead without proportional value.
- The document already contains the schema it was submitted with. Admin audit trail (who changed what, when) is handled by the existing `audit_log` table.
- If version history browsing becomes a requirement later, it can be added without affecting the document rendering path.

**Rendering decision tree:**
```
Document has schema_definition_snapshot?
  YES -> Render with DynamicFormRenderer using snapshot schema
  NO  -> Legacy document. Render with TEMPLATE_REGISTRY hardcoded component
```

This allows gradual migration: existing 6 hardcoded templates keep working. New custom templates use the dynamic renderer. Eventually, hardcoded templates can be converted to JSON schemas.

**Confidence:** HIGH -- standard pattern for template-driven document systems. Snapshot approach is simpler and more reliable than lazy migration at this scale.

## Alternatives Considered

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| Drag & Drop | @hello-pangea/dnd (existing) | @dnd-kit/core 6.3.x | Already have @hello-pangea/dnd in 3 components. Switching = rewrite for no gain. |
| Drag & Drop | @hello-pangea/dnd (existing) | @dnd-kit/react 0.3.x | Pre-1.0, not production-ready |
| Form Rendering | Custom renderer (RHF + Zod) | RJSF v5 | Conflicts with existing RHF + Zod; different validation/state/styling |
| Form Rendering | Custom renderer (RHF + Zod) | JSON Forms | Same conflict -- own state/validation layer |
| Form Rendering | Custom renderer (RHF + Zod) | SurveyJS | Commercial license for builder; overkill for 6-8 field types |
| Calculation | expr-eval 2.0.2 | math.js 13.x | 10x bundle size for unused features (matrices, complex numbers) |
| Calculation | expr-eval 2.0.2 | Function() constructor | Arbitrary JS execution -- security risk for admin formulas |
| Backend Validation | networknt 1.5.5 | everit/json-schema | Uses org.json instead of Jackson -- poor Spring Boot fit |
| Backend Validation | networknt 1.5.5 | Pure Java validation | Simpler for custom schema; networknt better if adopting standard JSON Schema later |
| Versioning | Schema snapshot on document | Separate version history table | Over-engineering for ~50 users, ~20 templates |

## What NOT to Add

| Technology | Why Not |
|-----------|---------|
| **@dnd-kit/core** | Project already uses @hello-pangea/dnd. Mixing DnD libraries causes conflicts and doubles bundle size. |
| **RJSF (react-jsonschema-form)** | Conflicts with existing react-hook-form + zod. Two parallel form systems = maintenance burden. |
| **JSON Forms** | Same conflict as RJSF -- brings its own form state/validation. |
| **SurveyJS** | Commercial license for builder. Wrong domain (surveys, not approval documents). |
| **Formio** | Server-side form platform -- wrong paradigm for self-hosted system. |
| **ajv (JSON schema validator for JS)** | Backend validates with networknt. Frontend validates with zod. No need for a third validator. |
| **math.js** | ~170KB for features (matrices, complex numbers) that form calculations never use. |
| **Immer** | Sometimes recommended for complex builder state. Zustand handles this natively; builder state is a flat field array, not deeply nested. |
| **react-grid-layout** | Form fields are a vertical list, not a 2D grid. Sortable list is the correct abstraction. |
| **Monaco Editor / CodeMirror** | Tempting for formula editing, but formulas are one-line expressions. A plain `<input>` with syntax hints is sufficient. |

## Installation

```bash
# Frontend -- 1 new dependency only
npm install expr-eval
npm install -D @types/expr-eval
```

```kotlin
// Backend -- build.gradle.kts addition
implementation("com.networknt:json-schema-validator:1.5.5")
```

**Total new dependencies: 1 frontend (expr-eval) + 1 backend (networknt)**. Everything else reuses existing libraries.

## Integration Points with Existing Stack

### Frontend Integration

| Existing Component | Integration Point | Change Required |
|-------------------|-------------------|-----------------|
| `TEMPLATE_REGISTRY` | Add `CUSTOM` type entry that delegates to `DynamicFormRenderer` | Extend registry lookup to check `is_custom` flag |
| `TemplateEditProps` interface | DynamicFormRenderer implements same interface | No change to interface |
| `TemplateReadOnlyProps` interface | DynamicReadOnlyRenderer implements same interface | No change to interface |
| `DocumentEditorPage` | Check if template is custom, use dynamic renderer | Add conditional rendering branch |
| `DocumentDetailPage` | Check if document has schema snapshot, use dynamic read-only renderer | Add conditional rendering branch |
| `react-hook-form` | DynamicFormRenderer uses `useForm()` with dynamic zod schema | Same patterns as existing forms |
| `@hello-pangea/dnd` | Builder uses DragDropContext for field palette -> canvas and reordering | Same patterns as ApprovalLineList |
| `Zustand` | New `useTemplateBuilderStore` for builder UI state (selected field, undo stack) | New store, follows existing patterns |
| `TanStack Query` | Template CRUD queries/mutations | Follows existing patterns |

### Backend Integration

| Existing Component | Integration Point | Change Required |
|-------------------|-------------------|-----------------|
| `ApprovalTemplate` entity | Add `schemaDefinition`, `schemaVersion`, `isCustom`, `createdBy` fields | Extend entity |
| `DocumentContent` entity | Add `schemaVersion`, `schemaDefinitionSnapshot` fields | Extend entity |
| `TemplateService` | Add CRUD for custom templates, version increment on update | Extend service |
| `DocumentService` | On submission, snapshot template schema into document_content | Add snapshot logic |
| `TemplateMapper` | Map new fields to DTOs | Extend mapper |
| Flyway | `V8__add_template_builder_columns.sql` (or next available) | New migration |
| Jackson | Serialize/deserialize JSON schema (already available) | No new dependency |

### Validation Flow

```
User submits document with custom template:
  1. Frontend: Zod validates form data against dynamically built schema
  2. Backend receives form_data JSON + templateCode
  3. Backend loads template.schema_definition
  4. Backend validates form_data against schema (networknt or pure Java)
  5. Backend snapshots schema into document_content.schema_definition_snapshot
  6. Backend sets document_content.schema_version = template.schema_version
  7. Document proceeds through existing approval workflow unchanged
```

## Sources

- [@hello-pangea/dnd npm](https://www.npmjs.com/package/@hello-pangea/dnd) -- v18.0.1, already installed
- [@dnd-kit/core npm](https://www.npmjs.com/package/@dnd-kit/core) -- v6.3.1, 12M+ weekly downloads
- [@dnd-kit/react npm](https://www.npmjs.com/package/@dnd-kit/react) -- v0.3.2, pre-1.0
- [dnd-kit official docs](https://dndkit.com/) -- API reference, migration guide
- [Schema-Driven Forms Comparison (DEV.to)](https://dev.to/yanggmtl/schema-driven-forms-in-react-comparing-rjsf-json-forms-uniforms-formio-and-formitiva-2fg2) -- RJSF vs alternatives
- [expr-eval GitHub](https://github.com/silentmatt/expr-eval) -- v2.0.2, sandboxed evaluation
- [expr-eval vs mathjs (npm-compare)](https://npm-compare.com/expr-eval,mathjs) -- bundle size and feature comparison
- [expr-eval-fork npm](https://www.npmjs.com/package/expr-eval-fork) -- v3.0.3, maintained alternative
- [networknt json-schema-validator GitHub](https://github.com/networknt/json-schema-validator) -- v1.5.5, Jackson-native
- [networknt on Maven Central](https://mvnrepository.com/artifact/com.networknt/json-schema-validator)
- [JSON Schema Validation in Spring Boot (Medium, Apr 2026)](https://medium.com/@vassanor/json-schema-validation-in-java-spring-boot-a-clean-way-to-validate-dynamic-requests-d47e7f45afe4)
- [Schema Versioning Pattern (MongoDB)](https://www.mongodb.com/company/blog/building-with-patterns-the-schema-versioning-pattern)
- [Data Versioning Patterns (bool.dev)](https://bool.dev/blog/detail/data-versioning-patterns) -- snapshot vs version table tradeoffs

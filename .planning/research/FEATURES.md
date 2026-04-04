# Feature Landscape: Custom Template Builder

**Domain:** Drag & drop form builder for Korean corporate electronic approval system
**Researched:** 2026-04-05
**Overall confidence:** HIGH (well-established domain, clear patterns from competitors and existing codebase)

## Table Stakes

Features users expect. Missing = builder feels incomplete or unusable for admin form creation.

### Field Types (Korean Corporate Approval Context)

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **Text (단행)** | Every form needs short text inputs (사유, 제목, 거래처명) | Low | Single-line, with placeholder and maxLength config |
| **Textarea (다행)** | Long-form content (상세내용, 비고) is core to Korean approval docs | Low | Rows config, character limit |
| **Number (숫자)** | Amounts, quantities universal in 지출결의서, 구매요청서 | Low | Min/max, decimal places, Korean comma formatting (1,000) |
| **Date (날짜)** | Leave dates, trip dates, expense dates appear on every form type | Low | Date picker; existing forms already use date fields |
| **Select/Dropdown (선택)** | Payment method, leave type, expense category | Low | Static options list defined by admin in builder |
| **Table (표/테이블)** | Expense items, purchase items, trip itinerary -- the defining feature of Korean approval forms | **High** | Dynamic rows, column definitions, row add/remove; already implemented in ExpenseForm.tsx |
| **Read-only/Static text (안내문)** | Section headers, instructions, regulatory notices | Low | Non-input display element for form structure |
| **Hidden (숨김)** | System values, auto-populated department/user info | Low | Not rendered but included in form data |

### Builder UX

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **Field palette (left sidebar)** | Standard pattern: categorized field types with icons for drag-to-canvas | Medium | dnd-kit `useDraggable` per palette item |
| **Canvas with drag reorder** | Visual field arrangement is the core value proposition of a builder | Medium | dnd-kit `useSortable` for vertical list reorder |
| **Field property panel (right sidebar)** | Click field on canvas to configure label, required, placeholder, options | Medium | Context-sensitive panel per field type |
| **Live preview** | See the form as end-users will; builds confidence before publishing | Medium | Toggle between builder mode and preview mode |
| **Save/load to backend** | Persist schema JSON on `approval_template` table | Low | Extends existing entity with schema_json column |
| **Required field toggle** | Mark fields as mandatory for document submission | Low | Per-field boolean in schema |
| **Field label customization** | Admin names each field in Korean | Low | Per-field string; label is primary identifier |

### Schema & Rendering

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **JSON schema storage** | Form definition as data, stored on approval_template | Medium | Custom schema format (not JSON Schema standard -- simpler) |
| **Dynamic form rendering (edit mode)** | Render form from JSON schema for document drafting | **High** | Must handle all field types + validation + existing React Hook Form patterns |
| **Dynamic form rendering (read-only mode)** | Display submitted document content from stored formData | Medium | Simpler than edit -- no validation, no interaction |
| **Runtime Zod schema generation** | Frontend validation must work dynamically from JSON schema | **High** | Generate Zod validators at runtime matching field definitions |
| **Backend JSON schema validation** | Server-side validation for submitted formData against template schema | **High** | Java equivalent of Zod generation; validates field presence, types, required |

### Template Management

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **Template CRUD** | Create, edit, deactivate templates | Medium | Extends existing ApprovalTemplate entity + admin UI |
| **Template versioning** | Schema changes must not break existing documents | **High** | Documents pin to schema version at creation time |
| **Template list admin page** | Admin sees all templates with active/inactive status | Low | Table with sort, toggle, edit actions |

## Differentiators

Features that set the product apart. Not expected at MVP, but valuable.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **Conditional logic (show/hide)** | Show field B only when field A = X; reduces form clutter for complex forms | **High** | Rule engine on each field; evaluated reactively via `watch()` |
| **Conditional required** | Field becomes required only when another field has specific value | **High** | Extends conditional logic with validation impact |
| **Calculation fields (SUM, arithmetic)** | Auto-sum expense tables, quantity x unitPrice; already done in ExpenseForm | **Medium-High** | Generalize existing pattern; limited operation set, not full formula language |
| **Date range compound field** | Start/end date as single field with auto-duration calc (leave, trips) | Medium | Common in existing hardcoded forms (LeaveForm, BusinessTripForm) |
| **Field sections/grouping** | Visual sections within form ("기본정보", "지출내역") | Medium | Section separator element in schema; improves form readability |
| **Template duplication** | Copy existing template as starting point for new one | Low | Deep clone of schema JSON + rename |
| **Template categories** | Group templates by department (인사, 총무, 재무, 일반) | Low | Category field on template entity |
| **Currency formatting** | Korean won display with comma separators | Low | Already exists in codebase (`formatCurrency` utility) |
| **Checkbox/Radio groups** | Multiple choice or single choice selections | Low | Standard field types; lower priority than core 8 |
| **Migration tooling** | Convert existing 6 hardcoded forms to JSON schemas | Medium | One-time migration scripts per form type |
| **Template import/export** | JSON download/upload for backup or sharing | Low | Simple JSON serialization |
| **Undo/redo in builder** | Ctrl+Z support via schema history stack | Medium | Improves builder UX significantly |

## Anti-Features

Features to explicitly NOT build.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| **Full spreadsheet/formula engine** | Massive complexity (cell references, arbitrary expressions, eval) for 50-user company. Security risk with dynamic eval. | Support specific patterns only: SUM of table column, field * field, simple arithmetic (add, subtract, multiply, divide). Covers 95% of approval form needs. |
| **Drag-and-drop 2D grid layout** | 2D grid positioning is 5x harder than vertical list; alignment, responsive behavior, overlap detection all become problems | Vertical field list with optional width hints (full, half, third). Side-by-side fields via width config, not freeform grid. |
| **Nested sub-forms / repeating groups** | Extreme complexity for marginal value beyond what tables already provide | Table field type handles the "repeating group" pattern. One level of nesting is sufficient. |
| **Multi-page forms / wizard steps** | Korean approval forms are single-page by strong convention. DaouOffice, HiWorks, Docswave all use single-page forms. | Single scrollable form with section dividers for visual grouping. |
| **User-facing form builder** | Only admins create templates; users fill them in. Exposing builder to all users creates governance chaos. | Restrict builder to ADMIN/SUPER_ADMIN roles only. |
| **Real-time collaborative editing** | Solo admin editing forms for 50-person company. No concurrent editing scenario. | Simple optimistic locking: version check on save, reject stale saves. |
| **Custom CSS per field** | Maintenance nightmare, inconsistent UI, accessibility problems | Predefined layout options (full-width, half-width) and consistent TailwindCSS styling |
| **External data source / API fields** | Connecting to HR systems, ERP, external APIs is scope creep | Department/user data available via existing API; no external integrations |
| **Visual code editor / script fields** | Some builders allow JavaScript in field logic. Security nightmare, maintenance burden. | Declarative rules only. No user-authored code execution. |
| **Form analytics / usage tracking** | Which fields users fill in, completion rates, etc. Over-engineering for internal tool. | Not needed for 50-person company. |

## Feature Dependencies

```
JSON Schema Format Design
  --> DB Migration (schema_json + schema_version on approval_template, template_version table)
    --> Template CRUD API (save/load schema)
      --> Template Versioning (version increment on schema change)

JSON Schema Format Design
  --> Dynamic Form Renderer (edit mode) [requires all basic field types]
    --> Dynamic Form Renderer (read-only mode)
  --> Runtime Zod Schema Generation (frontend validation)
  --> Backend JSON Schema Validation (server-side validation)

dnd-kit Setup (DndContext, sensors, collision detection)
  --> Field Palette (useDraggable per type)
  --> Canvas Sortable List (useSortable per field)
  --> Palette-to-Canvas Drop (cross-container DnD)

All Basic Field Types Working
  --> Table Field Type [highest complexity single field]
    --> Calculation Fields [SUM of table column is primary use case]
  --> Conditional Logic [requires fields to condition against]

Template Versioning [must be in place BEFORE production use]
  --> Migration of Hardcoded Forms [requires dynamic rendering + all field types]
    --> Dual-mode rendering (hardcoded for old docs, dynamic for new)
      --> Eventually deprecate hardcoded components

CRITICAL PATH:
Schema Design --> Renderer --> Builder UI --> Conditional Logic --> Calculations
                           --> Versioning --> Migration
```

## Detailed Feature Analysis

### 1. Field Types for Korean Corporate Approval

Based on analysis of existing MiceSign forms (GeneralForm, ExpenseForm, LeaveForm, PurchaseForm, BusinessTripForm, OvertimeForm) and Korean groupware competitors (DaouOffice, HiWorks):

**Tier 1 -- Must have (covers all 6 existing forms):**
- `text`: 사유, 제목, 이름, 거래처명, 목적지
- `textarea`: 상세 내용, 비고, 업무 내용, 출장 결과
- `number`: 금액, 수량, 단가, 시간
- `date`: 날짜 (시작일, 종료일, 지출일, 근무일)
- `select`: 휴가유형, 결제수단, 지출구분
- `table`: 지출항목, 구매품목, 출장경비 (dynamic rows with defined columns)

**Tier 2 -- Needed for completeness:**
- `staticText`: 섹션 제목, 안내문구, 주의사항 (non-input display element)
- `hidden`: 부서코드, 작성자ID (auto-populated system values)
- `dateRange`: 휴가기간, 출장기간 (start + end + auto-calculated duration in days)
- `checkbox`: 동의 체크, 다중 선택
- `radio`: 단일 선택 (긴급여부 등)
- `time`: 시작시간, 종료시간 (OvertimeForm already uses this pattern)

**Tier 3 -- Defer:**
- `userPicker`: Select user from organization tree (complex, requires org tree component)
- `file`: Inline file reference (document-level attachment already exists)
- `signature`: Digital signature field (out of scope)

### 2. Conditional Logic System

**Recommended: Declarative rule-based conditions stored per field in JSON schema.**

Each field carries an optional `conditions` array:

```json
{
  "id": "spouseInfo",
  "type": "text",
  "label": "배우자 정보",
  "conditions": [
    {
      "when": "maritalStatus",
      "operator": "equals",
      "value": "married",
      "effect": "SHOW"
    }
  ]
}
```

**Supported operators (minimal, extensible later):**
- `equals` / `notEquals` -- exact match
- `in` / `notIn` -- value in list
- `isEmpty` / `isNotEmpty` -- presence check
- `greaterThan` / `lessThan` -- numeric comparison

**Supported effects:**
- `SHOW` / `HIDE` -- visibility toggle (hidden fields excluded from validation and submission)
- `REQUIRE` / `OPTIONAL` -- dynamic required state
- `ENABLE` / `DISABLE` -- read-only toggle

**Implementation pattern:** Evaluate conditions reactively using React Hook Form's `watch()`. On each relevant value change, re-evaluate all conditions and update field visibility/required state. This is the same proven pattern used by Form.io and JSON Forms.

**Scope control:** Start with implicit AND (all conditions on a field must be true). Do NOT build AND/OR combinators in v1. Add OR support later if specific forms need it.

**Builder UX for conditions:** In the property panel, a "Conditions" section with:
1. "When [field dropdown] [operator dropdown] [value input]"
2. "Then [effect dropdown]"
3. Add/remove condition rows

### 3. Calculation/Formula Fields

**Recommended: Predefined calculation patterns, NOT a formula parser.**

Rather than building an expression evaluator (security risk, maintenance nightmare), support specific calculation types that cover actual Korean approval form needs:

| Calculation Type | Config Format | Use Case |
|-----------------|---------------|----------|
| **SUM of table column** | `{ "op": "SUM", "source": "expenseTable.amount" }` | Total expense amount |
| **Field arithmetic** | `{ "op": "MULTIPLY", "fields": ["quantity", "unitPrice"] }` | Row amount = qty x price |
| **COUNT of table rows** | `{ "op": "COUNT", "source": "expenseTable" }` | Number of items |
| **Fixed percentage** | `{ "op": "MULTIPLY", "fields": ["subtotal"], "constant": 0.1 }` | VAT at 10% |
| **Field addition** | `{ "op": "ADD", "fields": ["basicPay", "overtimePay"] }` | Total compensation |

**Implementation:** Each calculation field has a `formula` property. A simple evaluator resolves field references and applies the operation. The existing `ExpenseForm.tsx` already does exactly this with `watch()` + `setValue()` -- the dynamic renderer generalizes that pattern.

**The anti-pattern to avoid:** Do NOT use `eval()`, `new Function()`, or any user-authored expression strings. Predefined operations with field references are sufficient and secure.

### 4. Builder UX Flow (Palette --> Canvas --> Configure)

**Three-panel layout (standard industry pattern):**

```
+------------------+-------------------------+------------------+
|  Field Palette   |        Canvas           |  Property Panel  |
|  (Left, ~200px)  |  (Center, flexible)     |  (Right, ~300px) |
|                  |                         |                  |
|  [T] 텍스트      |  +-[1] 사유-----------+ |  Label: [사유]   |
|  [#] 숫자        |  | text / 필수         | |  Required: [x]   |
|  [D] 날짜        |  +---------------------+ |  Placeholder: _  |
|  [v] 선택        |  +-[2] 지출항목-------+ |  Max length: __  |
|  [=] 테이블      |  | table / 3 columns   | |                  |
|  [~] 계산        |  +---------------------+ |  -- Conditions   |
|  [S] 구분선      |  +-[3] 합계-----------+ |  [+ 조건 추가]   |
|  ...             |  | calculation / SUM   | |                  |
|                  |  +---------------------+ |                  |
|                  |  [+ 필드 추가 클릭]     |                  |
+------------------+-------------------------+------------------+
```

**Interaction flow:**
1. **Drag** field type from palette to canvas position (dnd-kit cross-container)
2. **Or click** palette item to append at bottom (accessibility alternative)
3. Canvas shows **inline field preview** (not just a placeholder box)
4. **Click** field on canvas to select --> property panel populates with that field's config
5. **Reorder** by dragging fields up/down within canvas (dnd-kit sortable)
6. **Preview** button toggles to end-user form view
7. **Save** persists JSON schema to backend via API

**Key UX decisions:**
- Click-to-add as primary alternative to drag (simpler, accessible, works on mobile)
- Inline preview on canvas shows actual field rendering (text input, dropdown, etc.)
- Delete via property panel button AND keyboard Delete key
- Undo/redo deferred to differentiator (not MVP of builder)

### 5. Template Versioning Strategy

**Recommended: Immutable version snapshots with document pinning.**

**Database changes:**
```sql
-- Add to approval_template
ALTER TABLE approval_template ADD COLUMN schema_json LONGTEXT;
ALTER TABLE approval_template ADD COLUMN schema_version INT NOT NULL DEFAULT 0;

-- New table for version history
CREATE TABLE template_version (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  template_id BIGINT NOT NULL,
  version INT NOT NULL,
  schema_json LONGTEXT NOT NULL,
  created_at DATETIME NOT NULL,
  created_by BIGINT NOT NULL,
  FOREIGN KEY (template_id) REFERENCES approval_template(id),
  UNIQUE KEY uk_template_version (template_id, version)
);

-- Add to document table
ALTER TABLE document ADD COLUMN template_version INT;
```

**Behavior:**
1. Every time admin saves schema changes, `schema_version` increments by 1
2. Previous version is preserved in `template_version` table (append-only)
3. When a document is created/drafted, it records `template_id` + current `template_version`
4. When rendering an existing document, look up schema from `template_version` matching the document's pinned version
5. New documents always use the latest active version
6. No lazy migration of old documents -- they stay on their original version forever

**Why this approach (not alternatives):**
- Matches MiceSign's existing immutability philosophy (submitted docs are locked)
- Simple to implement -- no complex migration or dual-read logic
- Old documents always render correctly with their original schema
- Admin can freely iterate on templates without fear of breaking anything
- Template deactivation only hides from "new document" list; existing docs still render

**Edge cases handled:**
- Deactivated template: existing documents still render (version preserved)
- Deleted field: old documents show the field value from stored formData + old schema
- Added field: old documents don't have the field, render shows blank/N/A
- Changed field type: old schema governs old document rendering

## MVP Recommendation

**Phase 1: Schema Foundation (build first, everything depends on this)**
1. Design JSON schema format for form definitions
2. DB migrations: `schema_json`, `schema_version` on `approval_template`, `template_version` table, `template_version` on `document`
3. Template versioning API (create version on save, pin on document creation)
4. Backend JSON schema validation service

**Phase 2: Dynamic Rendering (must work before builder is useful)**
5. Dynamic form renderer -- edit mode (text, textarea, number, date, select, staticText, hidden)
6. Runtime Zod schema generation from JSON
7. Dynamic form renderer -- read-only mode
8. Table field type (highest complexity single field)

**Phase 3: Builder UI (the admin-facing tool)**
9. Three-panel layout shell with dnd-kit setup
10. Field palette with Tier 1 + Tier 2 types
11. Canvas with sortable reorder + palette-to-canvas drop
12. Property panel per field type
13. Live preview toggle
14. Template CRUD admin page

**Phase 4: Advanced Features**
15. Conditional logic (show/hide, required-if)
16. Calculation fields (SUM, arithmetic)
17. Date range compound field
18. Field sections/grouping

**Phase 5: Migration**
19. Convert 6 hardcoded form schemas to JSON equivalents
20. Dual-mode rendering: detect if template has `schema_json` --> use dynamic renderer; otherwise fall back to hardcoded component
21. Test all existing documents still render correctly
22. Eventually remove hardcoded form components (only after full validation)

**Defer to later:**
- Checkbox/radio groups: Add when a specific form needs them
- Template import/export: Nice-to-have, not blocking
- Undo/redo: Improves UX but not essential
- User picker field: Requires org tree component integration

## Complexity Assessment

| Feature | Estimated Complexity | Risk | Notes |
|---------|---------------------|------|-------|
| JSON schema format design | Medium | **HIGH** -- schema design decisions are very hard to change later | Spend extra time on this; get it right first |
| Dynamic renderer (basic fields) | Medium | Low -- well-understood pattern | React Hook Form + switch on field type |
| Dynamic renderer (table field) | **High** | Medium -- dynamic columns, row CRUD, per-cell validation | ExpenseForm.tsx is the reference implementation |
| dnd-kit builder UI | **High** | Medium -- palette-to-canvas is two DnD contexts interacting | dnd-kit Discussion #639 documents this exact pattern |
| Runtime Zod generation | Medium-High | Medium -- must handle all field types and conditions | Map field types to Zod primitives dynamically |
| Backend schema validation | Medium | Low -- mirrors frontend Zod logic in Java | Strategy pattern extends existing DocumentFormValidator |
| Conditional logic engine | **High** | Medium -- reactive evaluation, validation interaction, edge cases | Start simple (single condition per field), expand |
| Calculation fields | Medium | Low -- limited operation set keeps it manageable | Generalize existing ExpenseForm watch/setValue pattern |
| Template versioning | Medium | Low -- straightforward DB design | Must be in place before any production use |
| Migration of 6 forms | Medium | Medium -- each form is different; expense table is hardest | Test thoroughly; old documents must still render |

## Sources

- Korean groupware competitors: [DaouOffice approval templates](https://care.daouoffice.co.kr/hc/ko/categories/115000384554), [HiWorks form creation guide](https://customer.gabia.com/manual/hiworks/162/3603), [DaouOffice form editor guide](http://support.daouoffice.com/resources/view/do_guide/2016_1118_approval_guide02.pdf)
- Korean business document types: [JobKorea document guide](https://www.jobkorea.co.kr/goodjob/tip/view?News_No=19012), [BizForms expense report](https://m.bizforms.co.kr/smartblock/view.asp?sm_idx=304), [기안서/품의서/지출결의서 차이](https://info.workmarket9.com/blog/document-process)
- Drag-and-drop: [dnd-kit official](https://dndkit.com/), [dnd-kit form builder discussion #639](https://github.com/clauderic/dnd-kit/discussions/639), [Top DnD libraries 2026](https://puckeditor.com/blog/top-5-drag-and-drop-libraries-for-react)
- Conditional logic: [Form.io logic and conditions](https://help.form.io/form-building/logic-and-conditions), [JSON Forms rules](https://jsonforms.io/docs/uischema/rules), [RJSF conditional fields](https://medium.com/@suvarna.kale/conditional-fields-in-rjsf-the-secret-sauce-for-dependent-logic-2a28546de23)
- Form builders: [FormEngine React](https://formengine.io/), [React JSON Schema Form Builder](https://github.com/ginkgobioworks/react-json-schema-form-builder), [Coltor Builder](https://builder.coltorapps.com/)
- Schema versioning: [MongoDB schema versioning](https://www.mongodb.com/docs/manual/data-modeling/design-patterns/data-versioning/), [Schema evolution best practices](https://docs.solace.com/Schema-Registry/schema-registry-best-practices.htm)
- Existing codebase: `templateRegistry.ts` (6 hardcoded forms with edit + readOnly components), `ExpenseForm.tsx` (table + watch/setValue calculation pattern), `ApprovalTemplate.java` (entity without schema storage currently)

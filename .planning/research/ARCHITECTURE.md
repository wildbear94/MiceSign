# Architecture Patterns: Custom Template Builder Integration

**Domain:** Admin-configurable form templates for electronic approval system
**Researched:** 2026-04-05
**Confidence:** HIGH (dual rendering path, schema storage, validation) / MEDIUM (conditional logic, calculation engine)

## Existing Architecture Summary

The current system follows a **layered monolith** pattern:

```
Controller -> Service -> Repository (JPA + QueryDSL)
     |
  DTO/Mapper (MapStruct)
```

**Key existing components relevant to this milestone:**
- `ApprovalTemplate` entity: `code`, `name`, `prefix`, `isActive`, `sortOrder`. No schema storage yet.
- `Document` entity: references template via `templateCode` (String). No schema version.
- `DocumentContent` entity: `bodyHtml` (LONGTEXT) + `formData` (JSON string). Template-specific data stored as unstructured JSON.
- `DocumentFormValidator`: Strategy pattern -- `Map<String, FormValidationStrategy>` built from Spring-injected list. Dispatches by template code to per-template validator beans (ExpenseFormValidator, LeaveFormValidator, etc.).
- `TEMPLATE_REGISTRY` (frontend): Static map of `templateCode -> { editComponent, readOnlyComponent, label, icon }`. 6 entries (GENERAL, EXPENSE, LEAVE, PURCHASE, BUSINESS_TRIP, OVERTIME).
- `@hello-pangea/dnd`: Already installed, used in `ApprovalLineList` and `PositionTable`.
- `react-hook-form` + `zod` + `@hookform/resolvers`: Used in all 6 form templates for state management and validation.

## Recommended Architecture

### Core Principle: Dual Rendering Path

The template system must support two parallel rendering paths without breaking existing behavior.

```
Template Lookup (templateCode)
  |
  +--> Is schema_definition NULL?
  |      YES --> HARDCODED path
  |               Frontend: TEMPLATE_REGISTRY[code].editComponent (hardcoded React)
  |               Backend: FormValidationStrategy bean (per-template Java class)
  |
  |      NO  --> DYNAMIC path
  |               Frontend: DynamicFormRenderer(schema_definition JSON)
  |               Backend: DynamicFormValidator(schema_definition JSON, formData JSON)
  |
  +--> Both paths output: document_content.form_data (JSON string)
       Storage model is IDENTICAL. Only rendering and validation differ.
```

**Why dual path instead of migrating everything to dynamic:**
- The 6 existing hardcoded templates have nuanced UX (ExpenseForm has inline calculations, LeaveForm has business-day computation with leave type awareness, OvertimeForm has time-range validation). Replicating these perfectly in a generic renderer is high-effort, high-risk.
- Existing documents (potentially hundreds) reference these templates. Breaking their rendering is unacceptable.
- Hardcoded templates can gradually be migrated to JSON schema later, one at a time, when the dynamic renderer is mature. This is optional and deferred (Phase 7).

### Component Boundaries

| Component | Type | Responsibility | Communicates With |
|-----------|------|---------------|-------------------|
| `approval_template` (EXTENDED) | DB table | Store template metadata + JSON schema definition | TemplateService, DocumentService |
| `template_schema_version` (NEW) | DB table | Version history of schema changes per template | TemplateService, DynamicFormReadOnly |
| `DynamicFormValidator` (NEW) | Backend | Validate formData against stored JSON schema | DocumentFormValidator (dispatcher), networknt |
| `DynamicFormRenderer` (NEW) | Frontend | Render JSON schema into React form (edit mode) | react-hook-form, zod, TemplateService API |
| `DynamicFormReadOnly` (NEW) | Frontend | Render submitted formData as read-only view | DocumentDetailPage |
| `TemplateBuilderPage` (NEW) | Frontend | Admin drag-and-drop schema designer UI | @hello-pangea/dnd, useTemplateBuilderStore |
| `useTemplateBuilderStore` (NEW) | Frontend | Builder UI state management | TemplateBuilderPage components |
| `useConditionalLogic` (NEW) | Frontend | Evaluate condition rules against form values | DynamicFormRenderer |
| `formulaEngine` (NEW) | Frontend | Safe calculation field evaluation | DynamicFormRenderer |
| `DocumentFormValidator` (MODIFIED) | Backend | Route to hardcoded OR dynamic validator | FormValidationStrategy beans, DynamicFormValidator |
| `templateRegistry.ts` (MODIFIED) | Frontend | Support dynamic entries alongside hardcoded | DynamicFormRenderer, DynamicFormReadOnly |

---

## 1. Database Schema Changes

### Extend `approval_template` (NOT a new table)

Add columns to the existing table. It currently has 6 rows and will grow to 20-50 max. No performance concern.

```sql
-- Flyway V8__add_template_builder_support.sql

ALTER TABLE approval_template
  ADD COLUMN schema_definition JSON NULL
    COMMENT 'JSON field definitions for custom templates (NULL = hardcoded)'
    AFTER sort_order,
  ADD COLUMN schema_version INT NOT NULL DEFAULT 1
    COMMENT 'Incremented on each schema modification'
    AFTER schema_definition,
  ADD COLUMN is_custom BOOLEAN NOT NULL DEFAULT FALSE
    COMMENT 'TRUE = admin-created via builder, FALSE = seed/hardcoded'
    AFTER schema_version,
  ADD COLUMN category VARCHAR(50) NULL
    COMMENT '양식 카테고리 (인사, 재무, 일반 등)'
    AFTER is_custom,
  ADD COLUMN icon VARCHAR(50) NULL DEFAULT 'FileText'
    COMMENT '아이콘 이름 (lucide-react)'
    AFTER category,
  ADD COLUMN created_by BIGINT NULL
    COMMENT 'User who created template (NULL for seed data)'
    AFTER icon,
  ADD CONSTRAINT fk_template_created_by
    FOREIGN KEY (created_by) REFERENCES `user`(id);
```

**Design decision: `schema_definition` NULL as discriminator.** Use NULL vs non-NULL as the binary switch between hardcoded and dynamic paths. The `is_custom` boolean is a convenience for querying (e.g., "show admin all their custom templates") but the rendering decision is driven by schema presence. This makes it impossible to get into an inconsistent state -- if there is a schema, render dynamically; if not, use the hardcoded component.

### New `template_schema_version` table (version history)

```sql
-- Flyway V9__add_template_versioning.sql

CREATE TABLE template_schema_version (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,
    template_id     BIGINT NOT NULL,
    version         INT NOT NULL COMMENT '버전 번호',
    schema_definition JSON NOT NULL COMMENT '해당 버전의 스키마 정의',
    change_summary  VARCHAR(500) NULL COMMENT '변경 사항 요약',
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by      BIGINT NULL,
    FOREIGN KEY (template_id) REFERENCES approval_template(id),
    UNIQUE KEY uk_template_version (template_id, version)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='양식 스키마 버전 이력';
```

**Why a version table AND a document snapshot:** The version table enables admin to browse template history and compare versions. The document snapshot (below) is for rendering -- a submitted document must always render with the exact schema it was created with, even if the template is later modified or deleted.

### Extend `document_content` table

```sql
-- Part of V8 migration

ALTER TABLE document_content
  ADD COLUMN schema_version INT NULL
    COMMENT '문서 제출 시점의 스키마 버전 (NULL = hardcoded template)'
    AFTER form_data,
  ADD COLUMN schema_definition_snapshot JSON NULL
    COMMENT '제출 시점 전체 스키마 스냅샷 (NULL = hardcoded template)'
    AFTER schema_version;
```

**Rationale for snapshotting on `document_content`:** Documents are immutable after submission. The snapshot ensures correct rendering forever, even if the template is deleted or the version history is pruned. The `schema_version` column enables efficient queries like "which documents use version X" without parsing the snapshot JSON.

---

## 2. Hybrid Mode: Hardcoded + Dynamic Coexistence

### Backend: Extended Dispatcher Pattern

The existing `DocumentFormValidator` uses `Map<String, FormValidationStrategy>`. Extend it to fall through to dynamic validation when no hardcoded strategy exists.

```java
// MODIFIED: DocumentFormValidator.java
@Component
public class DocumentFormValidator {

    private final Map<String, FormValidationStrategy> hardcodedStrategies;
    private final DynamicFormValidator dynamicFormValidator;
    private final ApprovalTemplateRepository templateRepository;

    public DocumentFormValidator(
            List<FormValidationStrategy> strategyList,
            DynamicFormValidator dynamicFormValidator,
            ApprovalTemplateRepository templateRepository) {
        this.hardcodedStrategies = strategyList.stream()
            .collect(Collectors.toMap(
                FormValidationStrategy::getTemplateCode,
                Function.identity()
            ));
        this.dynamicFormValidator = dynamicFormValidator;
        this.templateRepository = templateRepository;
    }

    public void validate(String templateCode, String bodyHtml, String formDataJson) {
        // Check hardcoded strategy first (backward compatible, zero change to existing flow)
        FormValidationStrategy hardcoded = hardcodedStrategies.get(templateCode);
        if (hardcoded != null) {
            hardcoded.validate(bodyHtml, formDataJson);
            return;
        }

        // Fall back to dynamic validation against stored JSON schema
        ApprovalTemplate template = templateRepository.findByCode(templateCode)
            .orElseThrow(() -> new BusinessException("TPL_UNKNOWN",
                "알 수 없는 양식 코드입니다: " + templateCode));

        if (template.getSchemaDefinition() == null) {
            throw new BusinessException("TPL_UNKNOWN",
                "양식 스키마가 정의되지 않았습니다: " + templateCode);
        }

        dynamicFormValidator.validate(template.getSchemaDefinition(), formDataJson);
    }
}
```

**Key point:** The 6 existing `FormValidationStrategy` beans remain completely unchanged. The hardcoded map check happens first, so no existing behavior is affected.

### Frontend: Extended Template Registry

```typescript
// MODIFIED: templateRegistry.ts

// Hardcoded entries remain unchanged
export const TEMPLATE_REGISTRY: Record<string, TemplateEntry> = {
  GENERAL: { /* existing */ },
  EXPENSE: { /* existing */ },
  LEAVE: { /* existing */ },
  PURCHASE: { /* existing */ },
  BUSINESS_TRIP: { /* existing */ },
  OVERTIME: { /* existing */ },
};

// NEW: Runtime resolution
export function getTemplateEntry(
  code: string,
  template?: { schemaDefinition?: string | null }
): TemplateEntry | undefined {
  // Hardcoded takes priority
  const hardcoded = TEMPLATE_REGISTRY[code];
  if (hardcoded) return hardcoded;

  // Dynamic templates use generic renderer
  if (template?.schemaDefinition) {
    return {
      editComponent: DynamicFormRenderer,
      readOnlyComponent: DynamicFormReadOnly,
      label: '',     // filled from API template response
      description: '',
      icon: 'FileText',
    };
  }
  return undefined;
}
```

**Modified call sites:** `DocumentEditorPage.tsx` and `DocumentDetailPage.tsx` change from `TEMPLATE_REGISTRY[code]` to `getTemplateEntry(code, template)`. The `TemplateSelectionModal` fetches all templates from API (which now includes custom templates with schema info).

---

## 3. Backend Validation for Dynamic Templates

### Use `networknt/json-schema-validator` (v3.0.x)

This is the de facto standard for JSON Schema validation in Java. Actively maintained, supports JSON Schema draft-2020-12, integrates with Jackson (already in the project).

```java
// NEW: DynamicFormValidator.java
@Component
public class DynamicFormValidator {

    private final ObjectMapper objectMapper;

    public DynamicFormValidator(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    public void validate(String schemaDefinitionJson, String formDataJson) {
        if (!StringUtils.hasText(formDataJson)) {
            throw new BusinessException("DOC_INVALID_FORM_DATA",
                "양식 데이터가 필요합니다.");
        }

        try {
            JsonNode schemaNode = objectMapper.readTree(schemaDefinitionJson);
            JsonNode dataNode = objectMapper.readTree(formDataJson);

            // Extract the standard JSON Schema portion for validation
            // The x-micesign extensions are ignored by the validator
            JsonNode jsonSchemaNode = schemaNode.get("jsonSchema");
            if (jsonSchemaNode == null) {
                // Schema format uses embedded jsonSchema property
                // Fall back to manual field-by-field validation
                validateByFieldDefinitions(schemaNode, dataNode);
                return;
            }

            JsonSchemaFactory factory = JsonSchemaFactory.getInstance(
                SpecVersion.VersionFlag.V202012
            );
            JsonSchema schema = factory.getSchema(jsonSchemaNode);
            Set<ValidationMessage> errors = schema.validate(dataNode);

            if (!errors.isEmpty()) {
                String message = errors.stream()
                    .map(ValidationMessage::getMessage)
                    .collect(Collectors.joining("; "));
                throw new BusinessException("DOC_INVALID_FORM_DATA", message);
            }
        } catch (BusinessException e) {
            throw e;
        } catch (Exception e) {
            throw new BusinessException("DOC_INVALID_FORM_DATA",
                "양식 데이터 검증에 실패했습니다: " + e.getMessage());
        }
    }
}
```

**Gradle dependency:**
```groovy
implementation 'com.networknt:json-schema-validator:3.0.1'
```

**Confidence:** HIGH -- networknt is the most widely used Java JSON Schema validator, Apache 2.0 licensed, actively maintained.

---

## 4. Frontend Rendering Pipeline

### Do NOT use react-jsonschema-form (RJSF)

RJSF has its own component system, theming, and state management that conflicts with MiceSign's existing React Hook Form + Zod + TailwindCSS stack. Adopting it would mean maintaining two parallel form systems and losing visual consistency.

### Build a Custom Renderer Matching Existing Patterns

The custom renderer integrates with tools already in the project.

```
JSON Schema (from API)
        |
        v
+----------------------+
| parseFormSchema()    |  Converts schema to FieldDefinition[]
+----------+-----------+
           |
           v
+----------------------------+
| DynamicFormRenderer         |
|  react-hook-form for state  |
|  zod for client validation  |
|  TailwindCSS for styling    |
+----------+-----------------+
           |
           v
+----------------------------+
| DynamicFieldRenderer        |  Switch on field.type
|  DynamicTextField           |
|  DynamicTextareaField       |
|  DynamicNumberField         |
|  DynamicDateField           |
|  DynamicSelectField         |
|  DynamicTableField          |
|  DynamicCalculatedField     |
+----------------------------+
```

### Internal Field Definition Type

```typescript
// NEW: types/formSchema.ts
export interface FormSchemaData {
  version: number;
  fields: FieldDefinition[];
  layout?: {
    sections?: { title: string; fieldIds: string[] }[];
  };
  jsonSchema?: object;  // Standard JSON Schema for backend validation
}

export interface FieldDefinition {
  id: string;
  type: 'text' | 'textarea' | 'number' | 'date' | 'select' | 'table' | 'calculation';
  label: string;
  required: boolean;
  placeholder?: string;
  defaultValue?: unknown;
  validation?: FieldValidation;
  options?: SelectOption[];       // for 'select' type
  columns?: TableColumn[];        // for 'table' type
  formula?: string;               // for 'calculation' type
  conditions?: ConditionRule[];   // show/hide/require logic
  layout?: { width: 'full' | 'half' };
}

export interface FieldValidation {
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: string;
  patternMessage?: string;
}

export interface ConditionRule {
  field: string;        // source field ID
  operator: 'eq' | 'neq' | 'gt' | 'lt' | 'gte' | 'lte' | 'contains' | 'empty' | 'notEmpty';
  value?: unknown;
  action: 'show' | 'hide' | 'require' | 'unrequire';
}

export interface TableColumn {
  key: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'select';
  required?: boolean;
  options?: SelectOption[];
}

export interface SelectOption {
  value: string;
  label: string;
}
```

### Dynamic Zod Schema Generation

```typescript
// NEW: hooks/useDynamicZodSchema.ts
export function buildZodSchema(
  fields: FieldDefinition[],
  visibility: Record<string, boolean>
): z.ZodObject<any> {
  const shape: Record<string, z.ZodTypeAny> = {};

  for (const field of fields) {
    let fieldSchema: z.ZodTypeAny;

    switch (field.type) {
      case 'text':
      case 'textarea':
        fieldSchema = z.string();
        if (field.validation?.minLength)
          fieldSchema = (fieldSchema as z.ZodString).min(field.validation.minLength);
        if (field.validation?.maxLength)
          fieldSchema = (fieldSchema as z.ZodString).max(field.validation.maxLength);
        break;
      case 'number':
      case 'calculation':
        fieldSchema = z.number();
        if (field.validation?.min !== undefined)
          fieldSchema = (fieldSchema as z.ZodNumber).min(field.validation.min);
        if (field.validation?.max !== undefined)
          fieldSchema = (fieldSchema as z.ZodNumber).max(field.validation.max);
        break;
      case 'date':
        fieldSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
        break;
      case 'select':
        fieldSchema = z.string();
        break;
      case 'table':
        fieldSchema = z.array(z.object(
          Object.fromEntries(
            (field.columns ?? []).map(col => [
              col.key,
              col.required ? z.string().min(1) : z.string().optional()
            ])
          )
        )).min(1);
        break;
      default:
        fieldSchema = z.any();
    }

    // Hidden fields and non-required fields become optional
    const isVisible = visibility[field.id] !== false;
    shape[field.id] = (field.required && isVisible) ? fieldSchema : fieldSchema.optional();
  }

  return z.object(shape);
}
```

---

## 5. Template Versioning Strategy

### Schema Version Flow

```
Admin saves template schema changes
        |
        v
  +----------------------------------------------+
  | PUT /api/v1/admin/templates/{id}/schema       |
  +----------------------------------------------+
        |
        v
  +----------------------------------------------+
  | 1. Save CURRENT schema to                     |
  |    template_schema_version (version = current) |
  | 2. Update approval_template:                   |
  |    .schema_definition = new schema             |
  |    .schema_version += 1                        |
  +----------------------------------------------+
```

### Document Rendering with Version Awareness

```
User opens document (schema_version = 1, template now at version = 3)
        |
        v
+-----------------------------------------------+
| 1. document_content has schema_definition_      |
|    snapshot? YES -> render with snapshot         |
|    (fastest path, no extra query)               |
|                                                 |
| 2. snapshot NULL but schema_version set?         |
|    -> Fetch from template_schema_version table   |
|    -> Render with historical schema              |
|                                                 |
| 3. Both NULL? -> Hardcoded template, use         |
|    TEMPLATE_REGISTRY[code].readOnlyComponent     |
+-----------------------------------------------+
```

**Key principle:** Documents are immutable after submission. The `schema_definition_snapshot` on `document_content` ensures old documents always render correctly regardless of template changes. The `template_schema_version` table serves admin use cases (browse history, compare versions).

### Migration Strategy for Existing 6 Templates

**Do NOT migrate all at once. Phased approach:**

1. **Immediate:** Add columns, mark all 6 existing as `is_custom = FALSE`, `schema_definition = NULL`. No behavior change.
2. **After builder is stable (optional):** Generate JSON schemas matching hardcoded form_data structures. Verify DynamicFormRenderer matches hardcoded output. Flip templates one at a time.
3. **Rationale:** The 6 existing templates have purpose-built React components with nuanced behavior. Converting them is risky for marginal benefit. Focus the builder on NEW admin-created templates.

---

## 6. Conditional Logic and Calculation Fields

### Schema Format (Complete Example)

The schema stores both MiceSign-specific rendering metadata and standard JSON Schema for validation:

```json
{
  "version": 1,
  "fields": [
    {
      "id": "expense_type",
      "type": "select",
      "label": "지출 유형",
      "required": true,
      "options": [
        { "value": "travel", "label": "출장" },
        { "value": "supplies", "label": "비품" },
        { "value": "other", "label": "기타" }
      ]
    },
    {
      "id": "travel_destination",
      "type": "text",
      "label": "출장지",
      "required": false,
      "conditions": [
        { "field": "expense_type", "operator": "eq", "value": "travel", "action": "show" },
        { "field": "expense_type", "operator": "eq", "value": "travel", "action": "require" }
      ]
    },
    {
      "id": "items",
      "type": "table",
      "label": "지출 항목",
      "required": true,
      "columns": [
        { "key": "name", "label": "항목명", "type": "text", "required": true },
        { "key": "quantity", "label": "수량", "type": "number", "required": true },
        { "key": "unitPrice", "label": "단가", "type": "number", "required": true },
        { "key": "amount", "label": "금액", "type": "number", "required": true }
      ]
    },
    {
      "id": "totalAmount",
      "type": "calculation",
      "label": "합계",
      "formula": "SUM(items.amount)"
    }
  ],
  "layout": {
    "sections": [
      { "title": "기본 정보", "fieldIds": ["expense_type", "travel_destination"] },
      { "title": "지출 내역", "fieldIds": ["items", "totalAmount"] }
    ]
  },
  "jsonSchema": {
    "$schema": "https://json-schema.org/draft/2020-12/schema",
    "type": "object",
    "properties": {
      "expense_type": { "type": "string", "enum": ["travel", "supplies", "other"] },
      "travel_destination": { "type": "string" },
      "items": {
        "type": "array",
        "items": {
          "type": "object",
          "properties": {
            "name": { "type": "string" },
            "quantity": { "type": "integer", "minimum": 1 },
            "unitPrice": { "type": "number", "minimum": 0 },
            "amount": { "type": "number", "minimum": 0 }
          },
          "required": ["name", "quantity", "unitPrice", "amount"]
        },
        "minItems": 1
      },
      "totalAmount": { "type": "number", "minimum": 0 }
    },
    "required": ["expense_type", "items", "totalAmount"]
  }
}
```

**Design: dual representation within one schema document.**
- `fields[]` -- Frontend rendering metadata (labels, layout, conditions, calculations, field order). Used by DynamicFormRenderer.
- `jsonSchema` -- Standard JSON Schema for backend validation. Used by networknt validator. Generated automatically when admin saves in the builder.
- The backend ignores `fields[]` and `layout`; the frontend uses both parts.

### Conditional Logic Engine (Frontend)

```typescript
// NEW: hooks/useConditionalLogic.ts
export function useConditionalLogic(
  fields: FieldDefinition[],
  watch: UseFormWatch<any>
): { visibility: Record<string, boolean>; requiredOverrides: Record<string, boolean> } {
  // Collect all source fields that conditions depend on
  const conditionSourceFields = new Set<string>();
  fields.forEach(f => f.conditions?.forEach(c => conditionSourceFields.add(c.field)));

  // Watch only the fields that conditions reference
  const watchedValues = watch(Array.from(conditionSourceFields));

  return useMemo(() => {
    const visibility: Record<string, boolean> = {};
    const requiredOverrides: Record<string, boolean> = {};

    for (const field of fields) {
      if (!field.conditions || field.conditions.length === 0) {
        visibility[field.id] = true;
        continue;
      }

      let visible = true;
      for (const condition of field.conditions) {
        const sourceValue = watchedValues[condition.field];
        const matches = evaluateCondition(sourceValue, condition.operator, condition.value);

        if (condition.action === 'show' && !matches) visible = false;
        if (condition.action === 'hide' && matches) visible = false;
        if (condition.action === 'require' && matches) requiredOverrides[field.id] = true;
        if (condition.action === 'unrequire' && matches) requiredOverrides[field.id] = false;
      }

      visibility[field.id] = visible;
    }

    return { visibility, requiredOverrides };
  }, [fields, watchedValues]);
}
```

**Important interaction with Zod:** When conditional visibility changes, the Zod schema must be regenerated to make hidden fields optional. Use `useMemo` with `visibility` as dependency.

### Calculation Engine (Frontend)

Use a safe expression evaluator -- NOT `eval()` or `new Function()`.

**Two options evaluated:**
1. **`expr-eval` library** -- Parses expressions into a safe AST. Supports arithmetic + whitelisted functions. Well-maintained, ~3KB.
2. **Custom whitelist parser** -- Regex-based parser supporting only SUM/COUNT/AVG/MIN/MAX.

**Recommendation: Start with custom whitelist parser (Phase 3), upgrade to `expr-eval` if needed.**

The initial formula needs are simple (SUM of a table column), and a custom parser avoids adding a dependency. If formulas become more complex (e.g., `unitPrice * quantity * 1.1`), upgrade to `expr-eval`.

```typescript
// NEW: utils/formulaEngine.ts
type FormulaFn = 'SUM' | 'COUNT' | 'AVG' | 'MIN' | 'MAX';

export function evaluateFormula(
  formula: string,
  formValues: Record<string, unknown>
): number | null {
  const match = formula.match(/^(SUM|COUNT|AVG|MIN|MAX)\((.+)\)$/);
  if (!match) return null;

  const [, func, fieldRef] = match;
  const values = resolveFieldReference(fieldRef, formValues);
  if (!values || values.length === 0) return 0;

  switch (func as FormulaFn) {
    case 'SUM': return values.reduce((a, b) => a + b, 0);
    case 'COUNT': return values.length;
    case 'AVG': return values.reduce((a, b) => a + b, 0) / values.length;
    case 'MIN': return Math.min(...values);
    case 'MAX': return Math.max(...values);
  }
}

function resolveFieldReference(ref: string, formValues: Record<string, unknown>): number[] {
  const parts = ref.split('.');
  if (parts.length === 2) {
    const [tableName, columnName] = parts;
    const rows = formValues[tableName];
    if (Array.isArray(rows)) {
      return rows.map(row => Number(row[columnName]) || 0);
    }
  }
  const val = Number(formValues[ref]);
  return isNaN(val) ? [] : [val];
}
```

**Security:** No `eval()`. The formula engine uses a whitelist approach. Backend does NOT evaluate formulas -- calculation is frontend-only convenience. Backend validates the final computed value against JSON Schema constraints.

---

## 7. Suggested Build Order (Dependencies)

Each phase builds on the previous. Dependencies flow downward.

### Phase 1: Schema Foundation (Database + Backend Core)
**What:** DB migration, entity changes, JSON schema validation
**Why first:** Everything else depends on schema storage and validation

- Flyway V8: Add columns to `approval_template` + `document_content`
- Flyway V9: Create `template_schema_version` table
- Update `ApprovalTemplate` entity (`schemaDefinition`, `schemaVersion`, `isCustom`, `category`, `icon`, `createdBy`)
- Add `TemplateSchemaVersion` entity
- Add `DynamicFormValidator` using networknt/json-schema-validator
- Modify `DocumentFormValidator` dispatcher (hardcoded-first, dynamic fallback)
- Admin CRUD API for creating/updating templates with schema (raw JSON, no builder UI yet)
- Update `DocumentService.submitDocument()` to snapshot schema
- Unit tests: dynamic validation against various schemas

### Phase 2: Dynamic Form Renderer (Frontend Core)
**What:** JSON schema to React form rendering
**Why second:** Must render forms before building a builder
**Depends on:** Phase 1 (API to fetch template with schema)

- Define TypeScript types: `FormSchemaData`, `FieldDefinition`, `ConditionRule`, `TableColumn`
- Build field components: DynamicTextField, DynamicTextareaField, DynamicNumberField, DynamicDateField, DynamicSelectField
- Build `DynamicFieldRenderer` (switch on field.type)
- Build `buildZodSchema()` for client-side validation
- Build `DynamicFormRenderer` (edit mode with react-hook-form)
- Build `DynamicFormReadOnly` (view mode)
- Extend `templateRegistry.ts` with `getTemplateEntry()` function
- Modify `DocumentEditorPage` and `DocumentDetailPage` to use extended registry
- Modify `TemplateSelectionModal` to show dynamic templates from API
- Integration test: create template via API, render form, fill and submit document

### Phase 3: Table Field + Calculation Engine
**What:** Complex field types
**Why third:** Table and calculation depend on base renderer stability
**Depends on:** Phase 2 (base renderer)

- Build `DynamicTableField` (add/remove rows, per-column type rendering, react-hook-form `useFieldArray`)
- Build `formulaEngine.ts` (SUM, COUNT, AVG, MIN, MAX)
- Build `DynamicCalculatedField` (auto-compute using `watch` + `setValue`)
- Test: table with calculation field summing a column

### Phase 4: Conditional Logic Engine
**What:** Show/hide fields, dynamic required
**Why fourth:** Needs all field types working; interacts with Zod validation
**Depends on:** Phases 2-3

- Build `useConditionalLogic` hook
- Integrate with `DynamicFormRenderer` (filter visible fields, override required)
- Dynamic Zod schema regeneration based on visibility (`useMemo`)
- Ensure hidden required fields do not block submission
- Test: field visibility toggling, conditional required validation

### Phase 5: Drag-and-Drop Builder UI
**What:** Admin template designer
**Why fifth:** All rendering and logic must work before the designer
**Depends on:** Phases 1-4

- Build three-panel layout: FieldPalette (left), FormCanvas (center), FieldPropertyEditor (right)
- Use `@hello-pangea/dnd` (already installed) for drag-and-drop
- Build field property editor for all field types
- Build condition editor UI (when field X = Y, show/hide/require)
- Build calculation formula builder (dropdown-based)
- Wire builder output to schema format (generate both `fields[]` and `jsonSchema`)
- Live preview using `DynamicFormRenderer`
- Section/layout management
- Template save/publish workflow

### Phase 6: Template Versioning
**What:** Version management, historical rendering
**Why sixth:** Only needed once templates are actively edited
**Depends on:** Phase 5

- Schema version increment on template update
- Historical schema storage in `template_schema_version`
- Version-aware document rendering (use snapshot, fall back to version table)
- Admin UI: version history list, view old versions
- Optional: diff between versions

### Phase 7 (Optional): Hardcoded Template Migration
**What:** Convert existing 6 templates to JSON schema
**Why last and optional:** Existing templates work perfectly
**Depends on:** Phase 6

- Generate JSON schemas matching each hardcoded form_data structure
- Verify DynamicFormRenderer output matches hardcoded component output
- Flip templates one at a time from hardcoded to dynamic
- Keep hardcoded components as fallback

---

## Component Structure

### Frontend

```
features/
  admin/
    pages/
      TemplateBuilderPage.tsx           -- Three-panel builder layout
    components/
      template-builder/
        FieldPalette.tsx                -- Left: available field types to drag
        FormCanvas.tsx                  -- Center: drop zone, sortable field list
        FieldCard.tsx                   -- Draggable field on canvas
        FieldPropertyEditor.tsx         -- Right: configure selected field
        FormulaEditor.tsx               -- Formula input for calculation fields
        ConditionEditor.tsx             -- Condition rules editor
        TableColumnEditor.tsx           -- Column definitions for table fields
        TemplatePreview.tsx             -- Live preview using DynamicFormRenderer
    stores/
      useTemplateBuilderStore.ts        -- Zustand: field list, selected field, dirty
    api/
      templateBuilderApi.ts             -- Template CRUD API calls
    hooks/
      useTemplateBuilder.ts             -- TanStack Query mutations

  document/
    components/
      templates/
        DynamicFormRenderer.tsx          -- Edit mode from JSON schema
        DynamicFormReadOnly.tsx          -- Read-only mode from JSON schema
        DynamicFieldRenderer.tsx         -- Single field renderer (switch on type)
        DynamicTableField.tsx            -- Table with useFieldArray
        DynamicCalculatedField.tsx       -- Calculation field
        templateRegistry.ts             -- EXTENDED with getTemplateEntry()
    hooks/
      useConditionalLogic.ts            -- Condition evaluation
      useDynamicZodSchema.ts            -- Zod from field definitions
    utils/
      formulaEngine.ts                  -- Safe formula evaluation
    types/
      formSchema.ts                     -- TypeScript types for schema
```

### Backend

```
com.micesign/
  domain/
    ApprovalTemplate.java               -- EXTENDED: +schemaDefinition, +schemaVersion, +isCustom, +createdBy
    TemplateSchemaVersion.java          -- NEW: version history entity
    DocumentContent.java                -- EXTENDED: +schemaVersion, +schemaDefinitionSnapshot

  service/
    TemplateService.java                -- EXTENDED: CRUD for custom templates, version management
    DocumentService.java                -- MODIFIED: snapshot schema on submission
    DynamicFormValidator.java           -- NEW: validates formData against JSON schema

  controller/
    TemplateController.java             -- EXTENDED: admin endpoints for custom template CRUD

  dto/template/
    TemplateResponse.java               -- EXTENDED: +schemaDefinition, +schemaVersion, +isCustom
    CreateCustomTemplateRequest.java    -- NEW
    UpdateTemplateSchemaRequest.java    -- NEW
    TemplateVersionResponse.java        -- NEW
```

---

## Patterns to Follow

### Pattern 1: Schema Presence as Discriminator
**What:** Use `schemaDefinition != null` as the binary switch between hardcoded and dynamic paths.
**When:** Every rendering and validation decision.
**Why:** No ENUM needed. NULL means hardcoded, non-NULL means dynamic. Impossible to get inconsistent.

### Pattern 2: Reactive Condition Evaluation via watch()
**What:** Use react-hook-form's `watch()` to observe fields referenced by conditions. Re-evaluate on every change.
**When:** Conditional logic for show/hide and dynamic required.
**Why:** `watch()` already exists in the form state. No new reactivity system.

### Pattern 3: Schema-Driven Zod Generation
**What:** Build Zod validation schema dynamically from field definitions, respecting conditional visibility.
**When:** Frontend form validation.
**Why:** Reuses existing Zod infrastructure. Hidden fields become `.optional()` regardless of their `required` setting.

### Pattern 4: Immutable Schema Snapshot on Submission
**What:** Copy template's `schemaDefinition` into `document_content.schemaDefinitionSnapshot` when document is submitted.
**When:** Document submission only (not draft save).
**Why:** Submitted documents are immutable. The snapshot ensures correct rendering forever.

### Pattern 5: Builder Generates Both Formats
**What:** The builder simultaneously generates `fields[]` (rendering) and `jsonSchema` (validation) from the same field definitions.
**When:** Every template save.
**Why:** Keeps both representations in sync. Backend validates against standard JSON Schema; frontend renders from field definitions.

---

## Anti-Patterns to Avoid

### Anti-Pattern 1: Replacing TEMPLATE_REGISTRY Instead of Extending It
**What:** Removing hardcoded template entries and routing everything through DynamicFormRenderer.
**Why bad:** The 6 existing templates have custom logic (calculations, date ranges, field interactions) that the generic renderer cannot replicate.
**Instead:** Keep both paths. Hardcoded first, dynamic fallback.

### Anti-Pattern 2: Using eval() for Formulas
**What:** Evaluating admin-defined formulas using JavaScript's eval().
**Why bad:** Stored XSS -- a malicious formula executes arbitrary JavaScript in every user's browser.
**Instead:** Whitelist parser for SUM/COUNT/AVG/MIN/MAX. Upgrade to expr-eval if arithmetic expressions are needed.

### Anti-Pattern 3: Storing Rendered HTML for Custom Templates
**What:** DynamicFormRenderer producing HTML stored in `bodyHtml`.
**Why bad:** Cannot re-render if context changes. Cannot validate fields. Cannot extract data for reporting.
**Instead:** Custom templates always use `formData` JSON. `bodyHtml` stays NULL.

### Anti-Pattern 4: Building the Builder Before the Renderer
**What:** Starting with drag-and-drop admin UI before DynamicFormRenderer exists.
**Why bad:** Builder produces schemas. Without a renderer to consume them, schemas will drift from what rendering needs.
**Instead:** Build renderer first (Phase 2), manually test with hand-crafted schemas, then build builder (Phase 5).

### Anti-Pattern 5: Conditional Logic on the Backend
**What:** Implementing show/hide logic in the backend validator.
**Why bad:** Backend cannot know what the user "saw." Conditional logic is a rendering concern.
**Instead:** Backend validates the final submitted data shape. If a hidden field is absent, JSON Schema handles it via optional properties.

### Anti-Pattern 6: Client-Only Validation
**What:** Relying only on frontend Zod validation without backend validation.
**Why bad:** Users can bypass the frontend.
**Instead:** Backend always validates against JSON Schema via networknt. Frontend Zod is UX convenience only.

---

## Scalability Considerations

| Concern | At 50 users (current) | At 500 users | At 5000 users |
|---------|----------------------|-------------|---------------|
| Schema storage | JSON column, <10KB each | Same | Consider separate table if >64KB |
| Schema snapshot per doc | JSON column | Same | Same (space is cheap) |
| Condition evaluation | Client-side, imperceptible | Same | Same (client-only) |
| Formula evaluation | Client-side, sub-ms | Same | Same (client-only) |
| Backend validation | Synchronous per submission | Same | Cache compiled JsonSchema objects |
| Template count | <20 | <50 | Add categories/search |
| Version history | Few per template | 10-50 | Prune old versions |
| Builder concurrency | Not needed (single admin) | Optimistic locking | Real-time collab |

For ~50 users, all approaches are appropriate. No premature optimization needed.

---

## New Dependencies

| Library | Version | Side | Purpose | Already Installed |
|---------|---------|------|---------|-------------------|
| `com.networknt:json-schema-validator` | 3.0.1 | Backend | JSON Schema validation of formData | No -- NEW |
| `@hello-pangea/dnd` | 18.x | Frontend | Drag-and-drop for builder UI | YES -- already used |

No other new dependencies needed. React Hook Form, Zod, TailwindCSS, Jackson/ObjectMapper handle everything else.

---

## Sources

- Existing MiceSign codebase analysis -- HIGH confidence:
  - `backend/src/main/java/com/micesign/domain/ApprovalTemplate.java` -- current entity (no schema fields)
  - `backend/src/main/java/com/micesign/service/DocumentFormValidator.java` -- Strategy pattern dispatcher
  - `backend/src/main/java/com/micesign/service/validation/FormValidationStrategy.java` -- interface
  - `backend/src/main/java/com/micesign/service/validation/ExpenseFormValidator.java` -- example validator
  - `backend/src/main/java/com/micesign/domain/DocumentContent.java` -- bodyHtml + formData
  - `frontend/src/features/document/components/templates/templateRegistry.ts` -- 6-entry static registry
  - `frontend/src/features/document/components/templates/LeaveForm.tsx` -- example hardcoded form
  - `backend/src/main/resources/db/migration/V1__create_schema.sql` -- current DDL
- [networknt/json-schema-validator (GitHub)](https://github.com/networknt/json-schema-validator) -- HIGH confidence
- [@hello-pangea/dnd](https://www.npmjs.com/package/@hello-pangea/dnd) -- already installed, v18.x
- [dnd-kit form builder discussion](https://github.com/clauderic/dnd-kit/discussions/639) -- builder DnD patterns reference
- [expr-eval](https://github.com/silentmatt/expr-eval) -- safe expression evaluation (potential future upgrade)
- [Schema versioning pattern (MongoDB)](https://www.mongodb.com/company/blog/building-with-patterns-the-schema-versioning-pattern) -- pattern reference adapted for RDBMS
- [JSON Schema Validation in Spring Boot (2026)](https://medium.com/@vassanor/json-schema-validation-in-java-spring-boot-a-clean-way-to-validate-dynamic-requests-d47e7f45afe4) -- MEDIUM confidence
- [Top 5 Drag-and-Drop Libraries for React (2026)](https://puckeditor.com/blog/top-5-drag-and-drop-libraries-for-react) -- ecosystem survey

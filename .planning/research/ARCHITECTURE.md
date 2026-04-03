# Architecture Patterns: v1.1 Feature Integration

**Domain:** Electronic approval system -- SMTP notifications, document search/filter, additional templates, custom template builder
**Researched:** 2026-04-03
**Confidence:** HIGH (notifications, search, templates), MEDIUM (custom template builder)

## Existing Architecture Summary

The current system follows a **layered monolith** pattern:

```
Controller -> Service -> Repository (JPA + QueryDSL)
     |
  DTO/Mapper (MapStruct)
```

**Key existing components:**
- `Document` entity with `templateCode` (String) linking to `ApprovalTemplate`
- `DocumentContent` stores `bodyHtml` (LONGTEXT) and `formData` (JSON string)
- `DocumentFormValidator` -- switch/case on templateCode for server-side validation
- Frontend `TEMPLATE_REGISTRY` -- static map of templateCode to React components (edit + readOnly)
- `UserSpecification` -- existing JPA Specification pattern for search/filter
- `AuditAspect` + `AuditLogService` -- existing event/logging infrastructure
- `notification_log` table already exists in DDL (V1 migration) but has no entity or service

## Feature 1: SMTP Email Notifications

### Architecture Decision: Spring Event + @Async Listener

The FSD specifies `ApplicationEventPublisher` + `@TransactionalEventListener` + `@Async`. This is the correct pattern -- decouple notification from business transaction.

### New Components (Backend Only)

| Component | Type | Location | Purpose |
|-----------|------|----------|---------|
| `NotificationLog` | Entity | `domain/` | JPA entity for `notification_log` table |
| `NotificationLogRepository` | Repository | `repository/` | CRUD for notification logs |
| `ApprovalEvent` | Event class | `event/` | Carries document + eventType + targetUsers |
| `NotificationEventListener` | Listener | `event/` | `@TransactionalEventListener` + `@Async` handler |
| `EmailService` | Service | `service/` | SMTP sending via `JavaMailSender`, template rendering |
| `EmailTemplateService` | Service | `service/` | Builds email HTML from Thymeleaf templates |
| `MailConfig` | Config | `config/` | `JavaMailSender` bean configuration |
| Email templates | Resources | `resources/templates/email/` | Thymeleaf HTML templates per event type |

### Modified Components

| Component | Change |
|-----------|--------|
| `ApprovalService.approve()` | Publish `ApprovalEvent` after status change |
| `ApprovalService.reject()` | Publish `ApprovalEvent` after rejection |
| `DocumentService.submitDocument()` | Publish `ApprovalEvent` for first approver |
| `DocumentService.withdrawDocument()` | Publish `ApprovalEvent` for all in approval line |
| `application.yml` | Add `spring.mail.*` SMTP configuration |
| `build.gradle` | Add `spring-boot-starter-mail` + `spring-boot-starter-thymeleaf` |

### Data Flow

```
User action (submit/approve/reject/withdraw)
  -> Service method completes business logic
  -> Service publishes ApprovalEvent via ApplicationEventPublisher
  -> Transaction commits
  -> @TransactionalEventListener(phase = AFTER_COMMIT) fires
  -> @Async moves to separate thread
  -> NotificationEventListener determines recipients
  -> EmailService sends SMTP via JavaMailSender
  -> NotificationLog record created (SUCCESS or FAILED)
  -> On FAILED: schedule retry (max 2x, 5min interval)
```

### Retry Strategy

Use `@Scheduled` for retry, not a message queue (overkill for ~50 users):

```java
@Scheduled(fixedDelay = 300000) // 5 minutes
public void retryFailedNotifications() {
    List<NotificationLog> failed = notificationLogRepository
        .findByStatusAndRetryCountLessThan(NotificationStatus.FAILED, 3);
    // re-attempt sending
}
```

### Integration Point with Existing Code

The event publishing pattern fits naturally into the existing service layer. Each service method already has a clear "action completed" point where `auditLogService.log()` is called. The event publish goes at the same location.

**Critical: Do NOT publish events inside `@Transactional` boundaries where the transaction might roll back.** Use `@TransactionalEventListener(phase = AFTER_COMMIT)` to guarantee the business action succeeded before sending email.

---

## Feature 2: Document Search/Filter

### Architecture Decision: JPA Specification + QueryDSL

Follow the existing `UserSpecification` pattern. The search has a complex permission model (drafter OR approver OR admin-department OR super-admin) that benefits from QueryDSL for the subquery.

### New Components (Backend)

| Component | Type | Location | Purpose |
|-----------|------|----------|---------|
| `DocumentSearchSpecification` | Specification | `specification/` | Multi-field search with permission filtering |
| `DocumentSearchRequest` | DTO | `dto/document/` | Query parameter binding object |

### New Components (Frontend)

| Component | Type | Location | Purpose |
|-----------|------|----------|---------|
| `SearchPage` | Page | `features/document/pages/` | Unified search UI |
| `SearchFilterBar` | Component | `features/document/components/` | Keyword + filter controls |
| `useDocumentSearch` | Hook | `features/document/hooks/` | TanStack Query wrapper for search API |
| `searchApi.ts` | API | `features/document/api/` | Axios call to `/api/v1/documents/search` |

### Modified Components

| Component | Change |
|-----------|--------|
| `DocumentController` | Add `GET /api/v1/documents/search` endpoint |
| `DocumentService` | Add `searchDocuments()` method |
| `DocumentRepository` | Add `JpaSpecificationExecutor<Document>` (if not already) |
| `App.tsx` / Router | Add `/search` route |
| Navigation/Sidebar | Add search entry point |

### Permission Filter Architecture

The FSD's SQL pseudocode translates to a JPA Specification:

```java
public static Specification<Document> withAccessControl(Long userId, UserRole role, Long departmentId) {
    return (root, query, cb) -> {
        // SUPER_ADMIN sees everything
        if (role == UserRole.SUPER_ADMIN) {
            return cb.notEqual(root.get("status"), DocumentStatus.DRAFT);
        }

        List<Predicate> accessPredicates = new ArrayList<>();

        // User is drafter
        accessPredicates.add(cb.equal(root.get("drafter").get("id"), userId));

        // User is in approval line (subquery)
        Subquery<Long> approvalSub = query.subquery(Long.class);
        Root<ApprovalLine> alRoot = approvalSub.from(ApprovalLine.class);
        approvalSub.select(cb.literal(1L))
            .where(cb.and(
                cb.equal(alRoot.get("document"), root),
                cb.equal(alRoot.get("approver").get("id"), userId)
            ));
        accessPredicates.add(cb.exists(approvalSub));

        // ADMIN sees own department
        if (role == UserRole.ADMIN) {
            Subquery<Long> deptSub = query.subquery(Long.class);
            Root<User> userRoot = deptSub.from(User.class);
            deptSub.select(userRoot.get("id"))
                .where(cb.equal(userRoot.get("departmentId"), departmentId));
            accessPredicates.add(root.get("drafter").get("id").in(deptSub));
        }

        Predicate access = cb.or(accessPredicates.toArray(new Predicate[0]));
        Predicate notDraft = cb.or(
            cb.equal(root.get("drafter").get("id"), userId),
            cb.notEqual(root.get("status"), DocumentStatus.DRAFT)
        );
        return cb.and(access, notDraft);
    };
}
```

### Search Indexing Consideration

For ~50 users, LIKE-based search on `title` and `doc_number` is sufficient. No full-text search engine needed. Ensure the following indexes exist (add via Flyway migration if missing):

```sql
ALTER TABLE document ADD INDEX idx_document_title (title(100));
ALTER TABLE document ADD INDEX idx_document_template_status (template_code, status);
ALTER TABLE document ADD INDEX idx_document_submitted_at (submitted_at);
```

---

## Feature 3: Additional Form Templates (Purchase, Business Trip, Overtime)

### Architecture Decision: Follow Existing Hardcoded Pattern

These 3 new templates follow the **exact same pattern** as GENERAL, EXPENSE, LEAVE. No architectural change -- purely additive.

### New Components (Backend)

| Component | Type | Location | Purpose |
|-----------|------|----------|---------|
| (none new) | -- | -- | Validation added to existing `DocumentFormValidator` |

### New Components (Frontend)

| Component | Type | Location | Purpose |
|-----------|------|----------|---------|
| `PurchaseRequestForm` | Component | `features/document/components/templates/` | Edit form |
| `PurchaseRequestReadOnly` | Component | `features/document/components/templates/` | Read-only view |
| `BusinessTripForm` | Component | `features/document/components/templates/` | Edit form |
| `BusinessTripReadOnly` | Component | `features/document/components/templates/` | Read-only view |
| `OvertimeForm` | Component | `features/document/components/templates/` | Edit form |
| `OvertimeReadOnly` | Component | `features/document/components/templates/` | Read-only view |
| `purchaseSchema.ts` | Validation | `features/document/validations/` | Zod schema |
| `businessTripSchema.ts` | Validation | `features/document/validations/` | Zod schema |
| `overtimeSchema.ts` | Validation | `features/document/validations/` | Zod schema |

### Modified Components

| Component | Change |
|-----------|--------|
| `templateRegistry.ts` | Add 3 entries: `PURCHASE`, `BUSINESS_TRIP`, `OVERTIME` |
| `DocumentFormValidator` | Add 3 cases to `validate()` switch |
| `document.ts` types | Add `PurchaseFormData`, `BusinessTripFormData`, `OvertimeFormData` |
| Flyway migration (new) | `V6__add_additional_templates.sql` -- seed `approval_template` rows |

### Form Data Structures (Proposed)

```typescript
// Purchase Request (구매요청서)
interface PurchaseFormData {
  items: PurchaseItem[];
  totalAmount: number;
  requestDate: string;      // 구매 요청일
  deliveryDate?: string;    // 납품 희망일
  purpose: string;          // 구매 사유
  vendor?: string;          // 공급업체
}

// Business Trip Report (출장보고서)
interface BusinessTripFormData {
  destination: string;      // 출장지
  startDate: string;
  endDate: string;
  purpose: string;          // 출장 목적
  schedule: string;         // 일정 요약 (bodyHtml 대용 가능)
  expenses?: TripExpense[]; // 출장 경비 (선택)
  results?: string;         // 출장 성과
}

// Overtime Request (연장근무신청서)
interface OvertimeFormData {
  date: string;             // 근무일
  startTime: string;        // 시작 시각
  endTime: string;          // 종료 시각
  hours: number;            // 연장 시간 (자동 계산)
  reason: string;           // 사유
  workContent: string;      // 업무 내용
}
```

### No Schema Change

All form data stores in existing `document_content.form_data` (JSON column). No DDL changes needed beyond seeding new `approval_template` rows.

---

## Feature 4: Custom Template Builder (Admin Drag & Drop)

### Architecture Decision: JSON Schema-Driven Dynamic Form Renderer

This is the most architecturally significant feature. It fundamentally changes the "each template = hardcoded React component" pattern by introducing a **parallel rendering path**: hardcoded components for built-in templates, dynamic JSON-driven renderer for custom templates.

### Design Principle: Dual Rendering Strategy

```
Template Type?
  ├── Built-in (GENERAL, EXPENSE, LEAVE, PURCHASE, etc.)
  │   └── TEMPLATE_REGISTRY[code].editComponent (hardcoded React component)
  │
  └── Custom (admin-created)
      └── DynamicFormRenderer(templateDefinition.formSchema)
```

The `templateCode` in `Document` and `ApprovalTemplate.code` continues to work as the key. Custom templates get auto-generated codes (e.g., `CUSTOM_001`). The template registry is augmented to check for custom templates at runtime.

### New Database Schema

```sql
-- V7__add_custom_template_support.sql

-- Extend approval_template to store form definition
ALTER TABLE approval_template
  ADD COLUMN template_type ENUM('BUILTIN', 'CUSTOM') NOT NULL DEFAULT 'BUILTIN'
    AFTER description,
  ADD COLUMN form_schema JSON NULL
    COMMENT 'JSON schema defining form fields for CUSTOM templates'
    AFTER template_type,
  ADD COLUMN created_by BIGINT NULL AFTER sort_order,
  ADD CONSTRAINT fk_template_created_by FOREIGN KEY (created_by) REFERENCES `user`(id);

-- Update existing templates
UPDATE approval_template SET template_type = 'BUILTIN' WHERE code IN ('GENERAL','EXPENSE','LEAVE');
```

### Form Schema Format

Use a simplified JSON schema that the builder generates and the renderer consumes:

```json
{
  "version": 1,
  "fields": [
    {
      "id": "field_1",
      "type": "text",
      "label": "업체명",
      "required": true,
      "placeholder": "업체명을 입력하세요",
      "maxLength": 200
    },
    {
      "id": "field_2",
      "type": "date",
      "label": "요청일",
      "required": true
    },
    {
      "id": "field_3",
      "type": "number",
      "label": "금액",
      "required": true,
      "min": 0,
      "unit": "원"
    },
    {
      "id": "field_4",
      "type": "textarea",
      "label": "사유",
      "required": true,
      "rows": 4
    },
    {
      "id": "field_5",
      "type": "select",
      "label": "분류",
      "required": true,
      "options": [
        { "value": "A", "label": "유형 A" },
        { "value": "B", "label": "유형 B" }
      ]
    },
    {
      "id": "field_6",
      "type": "table",
      "label": "항목 목록",
      "columns": [
        { "id": "name", "label": "항목명", "type": "text" },
        { "id": "qty", "label": "수량", "type": "number" },
        { "id": "price", "label": "단가", "type": "number" }
      ],
      "minRows": 1,
      "maxRows": 20
    }
  ]
}
```

### Supported Field Types

| Type | Renders As | formData Storage |
|------|-----------|-----------------|
| `text` | `<input type="text">` | String |
| `textarea` | `<textarea>` | String |
| `number` | `<input type="number">` | Number |
| `date` | Date picker | ISO date string |
| `select` | Dropdown | String (option value) |
| `checkbox` | Checkbox | Boolean |
| `radio` | Radio group | String (option value) |
| `table` | Dynamic row table (like ExpenseForm items) | Array of objects |
| `richtext` | TipTap editor (reuse existing) | HTML string |

### New Components (Backend)

| Component | Type | Location | Purpose |
|-----------|------|----------|---------|
| `CustomTemplateController` | Controller | `controller/` | Admin CRUD for custom templates |
| `CustomTemplateService` | Service | `service/` | Template creation/update/validation |
| `FormSchemaValidator` | Service | `service/` | Validates formSchema JSON structure |
| `DynamicFormValidator` | Service | `service/` | Validates formData against formSchema at submission |

### New Components (Frontend)

| Component | Type | Location | Purpose |
|-----------|------|----------|---------|
| `TemplateBuilderPage` | Page | `features/admin/pages/` | Admin page for builder |
| `FormSchemaBuilder` | Component | `features/admin/components/template-builder/` | Drag-and-drop field list editor |
| `FieldConfigPanel` | Component | `features/admin/components/template-builder/` | Field property editor (right panel) |
| `FieldTypeSelector` | Component | `features/admin/components/template-builder/` | Palette of available field types |
| `FormPreview` | Component | `features/admin/components/template-builder/` | Live preview of the form |
| `DynamicFormRenderer` | Component | `features/document/components/templates/` | Renders form from JSON schema (edit mode) |
| `DynamicFormReadOnly` | Component | `features/document/components/templates/` | Renders submitted data (read-only mode) |
| `DynamicFieldRenderer` | Component | `features/document/components/templates/` | Single field renderer (switch on type) |
| `customTemplateApi.ts` | API | `features/admin/api/` | Admin CRUD for templates |
| `useCustomTemplates` | Hook | `features/admin/hooks/` | TanStack Query wrapper |

### Modified Components

| Component | Change |
|-----------|--------|
| `templateRegistry.ts` | Extend to support dynamic lookup: check backend for CUSTOM templates, use `DynamicFormRenderer` |
| `TemplateSelectionModal` | Fetch templates from API (includes custom), not just hardcoded registry |
| `DocumentFormValidator` | For CUSTOM templates, delegate to `DynamicFormValidator` |
| `ApprovalTemplate` entity | Add `templateType`, `formSchema`, `createdBy` fields |
| `TemplateService` | Add CRUD methods for custom templates |
| `TemplateController` | Add admin endpoints for custom template management |

### Template Registry Evolution

The current `TEMPLATE_REGISTRY` is a compile-time static map. For custom templates, we need a runtime-aware registry:

```typescript
// Enhanced templateRegistry.ts
import { DynamicFormRenderer } from './DynamicFormRenderer';
import { DynamicFormReadOnly } from './DynamicFormReadOnly';

// Built-in templates (unchanged)
const BUILTIN_REGISTRY: Record<string, TemplateEntry> = {
  GENERAL: { /* ... */ },
  EXPENSE: { /* ... */ },
  LEAVE: { /* ... */ },
  PURCHASE: { /* ... */ },
  BUSINESS_TRIP: { /* ... */ },
  OVERTIME: { /* ... */ },
};

// Runtime resolution: check builtin first, fall back to dynamic
export function getTemplateEntry(code: string, customSchema?: FormSchema): TemplateEntry {
  if (BUILTIN_REGISTRY[code]) {
    return BUILTIN_REGISTRY[code];
  }

  // Custom template -- create dynamic entry
  if (customSchema) {
    return {
      editComponent: (props) => <DynamicFormRenderer schema={customSchema} {...props} />,
      readOnlyComponent: (props) => <DynamicFormReadOnly schema={customSchema} {...props} />,
      label: customSchema.name,
      description: customSchema.description,
      icon: 'FileEdit', // default icon for custom
    };
  }

  throw new Error(`Unknown template: ${code}`);
}
```

### Builder UI Architecture

```
+--------------------------------------------------+
| Template Builder                                   |
+--------------------------------------------------+
| [Field Palette]  |  [Form Canvas]  | [Properties] |
|                  |                  |               |
| - Text           |  (drag targets) | Label: ____   |
| - Textarea       |  [Field 1]      | Required: [x] |
| - Number         |  [Field 2]      | Placeholder:  |
| - Date           |  [Field 3]      | Max Length:   |
| - Select         |                  |               |
| - Table          |                  |               |
|                  +------------------+               |
|                  | [Live Preview]   |               |
+--------------------------------------------------+
```

Use `@hello-pangea/dnd` (already a project dependency for position reordering in Phase 3) for drag-and-drop.

### Server-Side Validation for Custom Templates

The `DynamicFormValidator` validates `formData` against `formSchema` at document submission:

```java
public void validateDynamic(String formSchemaJson, String formDataJson) {
    FormSchema schema = objectMapper.readValue(formSchemaJson, FormSchema.class);
    Map<String, Object> data = objectMapper.readValue(formDataJson, Map.class);

    for (FieldDefinition field : schema.getFields()) {
        Object value = data.get(field.getId());
        if (field.isRequired() && (value == null || value.toString().isBlank())) {
            throw new BusinessException("DOC_INVALID_FORM_DATA",
                field.getLabel() + " 필드는 필수입니다.");
        }
        validateFieldType(field, value); // type-specific validation
    }
}
```

---

## Component Boundaries

| Component | Responsibility | Communicates With |
|-----------|---------------|-------------------|
| `NotificationEventListener` | Listens for approval events, orchestrates email sending | `EmailService`, `NotificationLogRepository` |
| `EmailService` | SMTP transport layer, template rendering | `JavaMailSender`, Thymeleaf templates |
| `DocumentSearchSpecification` | Builds dynamic WHERE clauses with permission filtering | `DocumentRepository` |
| `DynamicFormRenderer` | Renders any form from JSON schema | `DynamicFieldRenderer`, form state |
| `DynamicFormValidator` | Server-side validation of custom form data | `DocumentService` (called during submission) |
| `FormSchemaBuilder` | Admin UI for designing form schemas | `customTemplateApi`, `@hello-pangea/dnd` |

---

## Data Flow Changes

### Current Flow (Document Creation)
```
User selects template -> Frontend loads hardcoded component
-> User fills form -> formData as JSON string
-> POST /api/documents (templateCode + formData)
-> DocumentFormValidator.validate(templateCode, bodyHtml, formData) [switch/case]
-> Saves to document + document_content
```

### New Flow (Custom Template Document Creation)
```
User selects template (including custom) -> Frontend fetches template detail
-> If CUSTOM: fetch formSchema from ApprovalTemplate
-> DynamicFormRenderer renders form from schema
-> User fills form -> formData as JSON string (same as before)
-> POST /api/documents (templateCode + formData) [same API]
-> DocumentFormValidator checks templateType
   -> BUILTIN: existing switch/case
   -> CUSTOM: DynamicFormValidator.validateDynamic(formSchema, formData)
-> Saves to document + document_content [same tables]
```

The key insight: **the document storage model does not change.** Both hardcoded and custom templates produce `formData` as a JSON string stored in `document_content.form_data`. The difference is only in how the form is rendered (hardcoded component vs. dynamic renderer) and how it's validated (switch/case vs. schema-driven).

---

## Patterns to Follow

### Pattern 1: Spring Application Events for Cross-Cutting Concerns
**What:** Publish domain events from services, handle in async listeners
**When:** Notifications, async logging, future integrations
**Why:** Keeps business logic clean, prevents notification failures from breaking approvals

### Pattern 2: JPA Specification Composition for Complex Queries
**What:** Build Specification objects that compose with `and()`, `or()`
**When:** Multi-parameter search with dynamic conditions
**Why:** Existing pattern in UserSpecification; type-safe, composable

### Pattern 3: Dual Rendering Strategy for Templates
**What:** Hardcoded components for built-in, dynamic renderer for custom
**When:** Template system needs both developer-quality forms and admin-created forms
**Why:** Built-in templates get pixel-perfect UX; custom templates get flexibility

### Pattern 4: JSON Schema as Contract Between Builder and Renderer
**What:** FormSchema JSON defines the form contract; builder produces it, renderer consumes it
**When:** Custom template builder
**Why:** Clean separation -- admin designs in builder, users interact with renderer, server validates against same schema

---

## Anti-Patterns to Avoid

### Anti-Pattern 1: Synchronous Email Sending
**What:** Calling SMTP inside the approval transaction
**Why bad:** SMTP timeouts (5-30s) block user response; SMTP failure rolls back approval
**Instead:** `@TransactionalEventListener(AFTER_COMMIT)` + `@Async`

### Anti-Pattern 2: N+1 Queries in Document Search
**What:** Loading approval lines per document in search results
**Why bad:** Search returns 20 documents; loading approval lines = 20 extra queries
**Instead:** Use `@EntityGraph` or `JOIN FETCH` for search result queries. Search results should NOT include approval lines -- only document summary fields.

### Anti-Pattern 3: Storing Rendered HTML for Custom Templates
**What:** Having the builder generate final HTML and storing that
**Why bad:** Can't re-render if schema changes, no structured data for validation
**Instead:** Store `formSchema` (how to render) and `formData` (what user entered) separately

### Anti-Pattern 4: Making Custom Templates Use bodyHtml
**What:** Custom templates generating HTML in bodyHtml field
**Why bad:** Can't validate structured data, can't extract field values for search/reporting
**Instead:** Custom templates always use `formData` JSON. `bodyHtml` stays null for custom templates.

### Anti-Pattern 5: Overengineering the Template Builder
**What:** Building a full visual form designer with CSS customization, conditional logic, calculated fields
**Why bad:** Months of work for ~50 users. Admin creates maybe 2-3 custom templates total.
**Instead:** Start with a simple field list editor (add field, set type/label/required, reorder). Drag-and-drop is nice but a simple "add field" button + up/down arrows works too.

---

## Scalability Considerations

| Concern | At 50 users (current) | At 500 users | At 5000 users |
|---------|----------------------|-------------|---------------|
| SMTP sending | Synchronous per email is fine | Batch with thread pool | Message queue (RabbitMQ) |
| Document search | LIKE queries adequate | Add fulltext index | Elasticsearch |
| Permission filtering | Subquery per request | Materialized view or cache | Dedicated search index |
| Custom template rendering | Client-side JSON parsing | Same | Same (client-only) |
| Notification retries | @Scheduled polling | Same | Dead letter queue |

For the current scale (~50 users), all approaches above are appropriate. No premature optimization needed.

---

## Suggested Build Order

Based on dependency analysis and risk:

```
Phase A: SMTP Notifications (low risk, isolated)
  - No dependency on other features
  - notification_log table already exists
  - FSD fully specifies the behavior
  - Can test independently

Phase B: Document Search/Filter (low risk, well-understood)
  - No dependency on notifications
  - Existing Specification pattern to follow
  - FSD fully specifies the API contract
  - Can run in parallel with Phase A

Phase C: Additional Templates (lowest risk, purely additive)
  - Depends on nothing
  - Follows proven GENERAL/EXPENSE/LEAVE pattern exactly
  - Fastest to implement

Phase D: Custom Template Builder (highest risk, novel architecture)
  - Depends on C being done (to validate the template pattern is solid)
  - Introduces new architectural concepts (dynamic rendering, schema validation)
  - Most unknowns: builder UX, field type coverage, edge cases
  - Recommend: build DynamicFormRenderer first, then builder UI
  - Sub-phases:
    D1: Schema format + DynamicFormRenderer + DynamicFormReadOnly
    D2: DynamicFormValidator (server-side)
    D3: Template Builder admin UI
    D4: Integration with template selection flow
```

**Recommended execution order:** A and B in parallel, then C, then D (D1->D2->D3->D4).

**Rationale:** Notifications and Search are independent, fully specified, and follow existing patterns. Templates are trivially additive. The builder is the only feature requiring new architectural patterns, so it goes last when all other templates are proven.

---

## Sources

- FSD Section 8 (FN-NTF-001): Email notification specification -- HIGH confidence
- FSD Section 11 (FN-SEARCH-001): Document search specification -- HIGH confidence
- Existing codebase: `DocumentFormValidator`, `templateRegistry.ts`, `UserSpecification` -- verified patterns
- `V1__create_schema.sql`: `notification_log` table DDL -- already exists
- Spring Framework documentation: `@TransactionalEventListener`, `@Async` -- HIGH confidence (well-established patterns)
- Custom template builder: No existing specification -- MEDIUM confidence, design is opinionated based on domain analysis

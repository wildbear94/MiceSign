# Technology Stack: MiceSign v1.1 Extended Features

**Project:** MiceSign v1.1 — SMTP notifications, search/filter, additional templates, custom template builder
**Researched:** 2026-04-03
**Scope:** NEW additions only. Existing stack (Spring Boot 3.5.x, React 18, MariaDB 10.11, etc.) is validated and not re-researched.

## New Stack Additions

### 1. SMTP Email Notifications (Backend)

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| `spring-boot-starter-mail` | (managed by Boot 3.5.x BOM) | JavaMailSender + SMTP | PRD specifies this. Zero-config auto-configuration with Spring Boot. Provides `JavaMailSender` bean automatically. |
| `spring-boot-starter-thymeleaf` | (managed by Boot 3.5.x BOM) | HTML email templates | Thymeleaf is the standard Spring email templating engine. Natural templates that preview in browsers. Inline CSS support for email clients. |
| `spring-retry` | 2.0.x (managed by Boot BOM) | @Retryable for mail delivery | PRD requires 2-retry policy for failed emails. `@Retryable` + `@Recover` annotations provide declarative retry with exponential backoff — cleaner than manual retry loops. |

**Why these choices:**
- `spring-boot-starter-mail` is the PRD-mandated approach and wraps Jakarta Mail with Spring auto-configuration. Version is managed by the Spring Boot BOM — no explicit version needed.
- Thymeleaf over FreeMarker: Thymeleaf is the default Spring Boot template engine. Templates are valid HTML that designers can preview directly. Already has Spring Boot auto-configuration.
- `spring-retry` over manual retry: The FSD specifies `@TransactionalEventListener` + `@Async` for mail dispatch. Adding `@Retryable` on the actual send method gives clean retry semantics with `@Recover` fallback to mark `notification_log.status = FAILED`.

**Configuration needed:**
```yaml
# application.yml
spring:
  mail:
    host: smtp.example.com
    port: 587
    username: ${MAIL_USERNAME}
    password: ${MAIL_PASSWORD}
    properties:
      mail.smtp.auth: true
      mail.smtp.starttls.enable: true
```

**No separate template engine needed for email body:** Thymeleaf templates go in `src/main/resources/templates/email/` and are resolved by Spring Boot auto-configuration.

### 2. Document Search/Filter (Backend + Frontend)

**No new libraries needed.**

| Concern | Solution | Why No New Library |
|---------|----------|-------------------|
| Backend search | QueryDSL dynamic predicates | Already in stack. `BooleanBuilder` with conditional `.and()` clauses handles all FSD search parameters (keyword LIKE, status filter, date range, template filter). |
| Full-text search | MariaDB `LIKE '%keyword%'` | 50 users, ~10K documents max. Full-text search engines (Elasticsearch) are massive overkill. MariaDB LIKE with proper indexes is sub-second for this scale. |
| Frontend search UI | React Hook Form + existing components | Search form is just input fields + select dropdowns + date pickers. No new form library needed. |
| Date picker | Native HTML `<input type="date">` or lightweight component | Avoid pulling in a full date picker library. HTML5 date inputs work well for simple date range filtering. If UX demands more, `react-day-picker` (10KB) is the lightest option. |
| Pagination | Spring Data `Pageable` + TanStack Query | Already in stack. Backend returns `Page<T>`, frontend handles with existing TanStack Query patterns. |

**Key implementation note:** The FSD search query (FN-SEARCH-001) has a complex WHERE clause with role-based filtering. This is a QueryDSL `BooleanExpression` composition problem, not a search engine problem. QueryDSL's `BooleanBuilder` is purpose-built for this.

### 3. Additional Form Templates (Frontend)

**No new libraries needed.**

The 3 new templates (PURCHASE, BUSINESS_TRIP, OVERTIME) follow the established pattern: each is a hardcoded React component registered in `TEMPLATE_REGISTRY`. They use the existing React Hook Form + Zod validation stack.

| Template | Notable UI Elements | Existing Stack Coverage |
|----------|-------------------|------------------------|
| Purchase Request (구매요청서) | Item list with add/remove rows, amount calculation | React Hook Form `useFieldArray` + Zod |
| Business Trip Report (출장보고서) | Date range, itinerary table, expense breakdown | React Hook Form + date inputs + `useFieldArray` |
| Overtime Request (연장근무신청서) | Date/time pickers, hour calculation | React Hook Form + native time inputs |

**No additional libraries.** `useFieldArray` from React Hook Form handles dynamic rows (expense items, itinerary entries). Amount/hour calculations are plain TypeScript arithmetic.

### 4. Custom Template Builder — Drag & Drop Form Designer (Frontend)

This is the only feature requiring significant new dependencies. The admin needs to visually design form templates that users can then fill out.

**Architecture decision: Build custom vs. use a form builder library.**

| Approach | Pros | Cons |
|----------|------|------|
| Full library (SurveyJS, FormEngine) | Feature-complete, battle-tested | Heavy (200KB+), opinionated styling conflicts with Tailwind, license concerns (SurveyJS commercial), learning curve for customization |
| RJSF (@rjsf/core) for rendering + custom builder UI | Standard JSON Schema, good rendering | Builder UI must be built separately, RJSF rendering may conflict with existing template components |
| **Custom builder with @hello-pangea/dnd + JSON schema** | Full control, consistent with existing DnD usage, lightweight, matches Tailwind styling | More development effort for builder UI |

**Recommendation: Custom builder using existing `@hello-pangea/dnd` + JSON schema storage + custom renderer.**

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| `@hello-pangea/dnd` | ^18.0.1 | Drag & drop in form builder | **Already in the project** (used for approval line editor). Reuse eliminates bundle size increase and learning curve. Handles list-based DnD (field reordering) which is the primary builder interaction. |
| JSON Schema (custom subset) | N/A | Form definition storage | Store template definitions as JSON in `document_content` or a new `template_definition` column. Define a subset of field types (text, textarea, number, date, select, table) that maps to React components. |

**Why NOT a full form builder library:**
1. **@hello-pangea/dnd is already installed.** Adding another DnD library means bundle bloat and DnD behavior conflicts.
2. **50-user system with admin-only builder.** Enterprise form builder libraries (SurveyJS, FormEngine) are designed for customer-facing products with hundreds of field types. MiceSign needs ~8 field types max.
3. **Tailwind consistency.** Third-party form builders have their own styling systems that fight with Tailwind. Building custom means pixel-perfect consistency.
4. **JSON Schema is the right storage format.** A simple schema like `{ fields: [{ type: "text", label: "...", required: true, ... }] }` stored as JSON in MariaDB is sufficient. No need for JSON Schema draft-07 compliance — a custom subset is simpler.
5. **The renderer is straightforward.** Map field types to React components: `text` -> `<input>`, `textarea` -> `<textarea>`, `select` -> `<select>`, `table` -> dynamic rows with `useFieldArray`. The existing React Hook Form + Zod stack handles validation.

**Builder component structure:**
```
TemplateBuilder (admin page)
├── FieldPalette (available field types to drag from)
├── FormCanvas (drop zone, @hello-pangea/dnd DragDropContext)
│   └── FieldCard[] (draggable, with edit/delete controls)
└── FieldEditor (sidebar: label, placeholder, required, options)

TemplateRenderer (user-facing)
├── Reads JSON schema from template
├── Renders fields using React Hook Form
└── Validates with dynamically generated Zod schema
```

**One potential addition if needed:**

| Technology | Version | Purpose | When to Add |
|------------|---------|---------|-------------|
| `react-day-picker` | ^9.x | Date picker component | Only if native `<input type="date">` UX is insufficient for the custom template builder's date field type |

### Backend Support for Custom Templates

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| MariaDB JSON column | N/A (built-in) | Store template field definitions | MariaDB 10.11 supports `JSON` column type with `JSON_EXTRACT` functions. Template definitions stored as JSON alongside existing `approval_template` table. |

**No new backend libraries needed.** JPA's `@Column(columnDefinition = "JSON")` with a custom `AttributeConverter` handles JSON <-> Java object mapping. Jackson (already included via Spring Boot Web) handles serialization.

## Installation Summary

### Backend (Gradle)

```kotlin
// build.gradle.kts — add to existing dependencies block
dependencies {
    // SMTP Email
    implementation("org.springframework.boot:spring-boot-starter-mail")
    
    // Email HTML templates
    implementation("org.springframework.boot:spring-boot-starter-thymeleaf")
    
    // Retry for email delivery
    implementation("org.springframework.retry:spring-retry")
    implementation("org.springframework.boot:spring-boot-starter-aop")  // Required for @EnableRetry
}
```

**Total: 4 new backend dependencies** (all Spring ecosystem, versions managed by BOM).

### Frontend (npm)

```bash
# No new packages needed!
# @hello-pangea/dnd already installed
# React Hook Form + Zod already installed
# All search/filter UI built with existing components
```

**Total: 0 new frontend dependencies.**

## What NOT to Add

| Technology | Why Not |
|-----------|---------|
| **Elasticsearch / Meilisearch** | Massive overkill for 50 users. MariaDB LIKE + QueryDSL handles search at this scale. Add only if search response exceeds 1s threshold from NFR. |
| **SurveyJS** | Commercial license for builder features. Heavy. Styling conflicts with Tailwind. |
| **FormEngine** | Designed for enterprise-scale form builders. MiceSign needs ~8 field types, not 50+. |
| **@rjsf/core (react-jsonschema-form)** | Adds complexity without proportional value. A custom renderer with React Hook Form is simpler for a known, small set of field types and integrates cleanly with existing validation (Zod). |
| **@dnd-kit/core** | Project already uses @hello-pangea/dnd. Mixing DnD libraries causes conflicts and doubles bundle size. dnd-kit is also in a transition period (@dnd-kit/react 0.3.x is pre-1.0). |
| **Dedicated date picker library** | Start with native HTML5 date inputs. Only add `react-day-picker` if UX testing reveals issues. |
| **Spring Modulith** | Transactional outbox pattern is over-engineering for email notifications at this scale. Simple `@Async` + `@Retryable` + `notification_log` table covers the requirement. |
| **Thymeleaf for frontend (SSR)** | Thymeleaf is ONLY for email templates. Frontend remains React SPA. Do not configure Thymeleaf view resolvers for web pages. |
| **FreeMarker** | Thymeleaf is the default Spring Boot template engine with better tooling and natural template previewing. No reason to use FreeMarker. |

## Integration Points

### Email Notification Integration

```
Document State Change (APR service)
  → publishes ApprovalEvent
  → @TransactionalEventListener(AFTER_COMMIT) catches event
  → @Async runs in separate thread
  → NotificationService.sendEmail() with @Retryable(maxAttempts=3)
  → Thymeleaf processes email/approval-request.html template
  → JavaMailSender sends via SMTP
  → notification_log records result
  → @Recover on final failure → notification_log.status = FAILED
```

### Search Integration

```
GET /api/documents/search?keyword=...&status=...&startDate=...
  → DocumentSearchService
  → QueryDSL BooleanBuilder with conditional predicates
  → Role-based WHERE clause (per FSD FN-SEARCH-001)
  → Spring Data Pageable
  → Returns Page<DocumentSearchDto>
```

### Custom Template Builder Integration

```
Admin creates template:
  → TemplateBuilder UI (drag & drop with @hello-pangea/dnd)
  → Produces JSON field definition
  → POST /api/admin/templates with JSON body
  → Stored in approval_template.field_definition (JSON column)

User fills template:
  → TemplateRenderer reads field_definition JSON
  → Dynamically generates React Hook Form fields
  → Dynamically generates Zod validation schema
  → Submitted as document_content.body (JSON)
```

## Confidence Assessment

| Addition | Confidence | Rationale |
|----------|------------|-----------|
| spring-boot-starter-mail | HIGH | PRD-mandated, standard Spring Boot starter, auto-configured |
| spring-boot-starter-thymeleaf | HIGH | Standard Spring email templating, well-documented pattern |
| spring-retry | HIGH | Official Spring project, declarative retry fits PRD retry spec exactly |
| No new search libraries | HIGH | QueryDSL + MariaDB LIKE is correct for 50-user scale, verified against NFR |
| No new template libraries | HIGH | 3 new templates follow established hardcoded component pattern |
| Custom builder with @hello-pangea/dnd | MEDIUM | Sound architecture but builder UI complexity may surface unforeseen needs. Flag for deeper research during builder phase. |
| JSON schema storage in MariaDB | HIGH | MariaDB 10.11 JSON support is production-ready, JPA handles it cleanly |

## Sources

- [Spring Boot Mail Reference](https://docs.spring.io/spring-boot/reference/io/email.html)
- [Thymeleaf Spring Mail Article](https://www.thymeleaf.org/doc/articles/springmail.html)
- [Spring Retry Guide — Baeldung](https://www.baeldung.com/spring-retry)
- [Spring Core Resilience Features (2025)](https://spring.io/blog/2025/09/09/core-spring-resilience-features/)
- [spring-boot-starter-mail on Maven Central](https://mvnrepository.com/artifact/org.springframework.boot/spring-boot-starter-mail)
- [@hello-pangea/dnd on npm](https://www.npmjs.com/package/@hello-pangea/dnd)
- [dnd-kit maintenance discussion](https://github.com/clauderic/dnd-kit/issues/1194)
- [Top 5 DnD Libraries for React 2026 — Puck](https://puckeditor.com/blog/top-5-drag-and-drop-libraries-for-react)
- [@rjsf/core on npm](https://www.npmjs.com/package/@rjsf/core)
- [React JSON Schema Form Builder](https://github.com/ginkgobioworks/react-json-schema-form-builder)

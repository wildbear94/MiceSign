# Project Research Summary

**Project:** MiceSign v1.1 — SMTP Notifications, Search/Filter, Additional Templates, Custom Template Builder
**Domain:** Electronic approval system (전자 결재) extension — Korean corporate workflow, ~50 employees
**Researched:** 2026-04-03
**Confidence:** HIGH (notifications, search, templates), MEDIUM (custom template builder)

## Executive Summary

MiceSign v1.1 extends a functioning electronic approval system (MVP complete) with four feature areas: SMTP email notifications, document search/filter, three additional hardcoded form templates, and a custom drag-and-drop template builder. The existing system is a well-structured Spring Boot layered monolith with React SPA frontend. Three of the four feature areas (notifications, search, templates) follow well-established patterns that integrate cleanly into the existing architecture without schema changes or paradigm shifts. Only the custom template builder requires novel architectural work and carries meaningful risk.

The recommended approach is to build in waves matching dependency and risk profile. SMTP notifications and additional form templates can be built independently and in parallel — they share zero cross-dependencies. Document search/filter builds on the existing document list patterns and benefits from having the complete template registry in place. The custom template builder — the only architecturally significant addition — should be tackled last and treated as a separate milestone: it introduces a dual rendering path, requires a JSON schema contract, and needs a versioning strategy for existing documents. For a 50-person company, nine hardcoded templates may be permanently sufficient; the builder's necessity should be validated after v1.1 ships.

The critical risk is introducing the custom template builder without a proper architectural boundary. If the dynamic form system is not separated from the hardcoded component system via a `template_type` discriminator (BUILTIN/CUSTOM) and a stable JSON schema contract, both systems become coupled and unmaintainable across all layers: rendering, validation, read-only display, and backend validator. The second major risk — email-in-transaction coupling — is fully preventable: SMTP sends must always be decoupled from the approval transaction via `@TransactionalEventListener(AFTER_COMMIT)` + `@Async`. Both risks have clear, established mitigations.

## Key Findings

### Recommended Stack

No new frontend libraries are required for v1.1. All existing dependencies cover the feature set: `@hello-pangea/dnd` for the template builder's drag-and-drop, React Hook Form + Zod for new form templates, TanStack Query for search API calls. On the backend, four Spring ecosystem libraries are added exclusively for SMTP notifications — all version-managed by the Spring Boot BOM, requiring no explicit version pinning.

**Core additions (backend only):**
- `spring-boot-starter-mail`: SMTP transport via `JavaMailSender` — PRD-mandated, zero-config auto-configuration with Boot BOM
- `spring-boot-starter-thymeleaf`: HTML email templates — standard Spring Boot email templating, natural HTML preview in browser
- `spring-retry`: `@Retryable` for failed email delivery — declarative retry matches PRD 2-retry spec exactly
- `spring-boot-starter-aop`: required for `@EnableRetry` — Spring Boot standard, no version conflict

**Zero new frontend dependencies.** `@hello-pangea/dnd` is already installed (used for approval line reordering). Reusing it eliminates bundle bloat and DnD behavior conflicts.

**Explicit rejections:**
- Elasticsearch / Meilisearch: overkill for 50 users; MariaDB LIKE + QueryDSL covers the scale
- SurveyJS / FormEngine: commercial licenses, heavy, Tailwind styling conflicts, designed for enterprise scale
- `@dnd-kit/core`: project already uses `@hello-pangea/dnd`; mixing DnD libraries causes conflicts and doubles bundle size
- MariaDB MATCH...AGAINST full-text: broken for Korean without n-gram parser configuration; use LIKE instead
- `@rjsf/core`: adds complexity without value; a custom renderer with React Hook Form integrates cleanly with existing Zod validation

### Expected Features

**Must have (table stakes) — v1.1 scope:**
- Email on submission, intermediate approval, final approval, rejection, withdrawal — approvers have no awareness of pending items without this
- Keyword search (title + doc number) — essential once document volume grows beyond trivial count
- Status filter, date range filter, template type filter, drafter filter — standard document management UI expectations
- Access-controlled search results — users must only see documents they are authorized to view per FSD FN-SEARCH-001
- Purchase Request (구매요청서), Business Trip Report (출장보고서), Overtime Request (연장근무신청서) — all named in PRD 5.1, legally required or common in Korean corporate culture

**Should have (differentiators):**
- Automatic notification retry (max 2x, 5-minute intervals) — explicitly specified in FSD FN-NTF-001
- Template metadata admin (FN-TPL-002) — enables deactivating unused templates without code changes
- Notification failure visibility for SUPER_ADMIN — simple query on existing `notification_log` table
- URL-synced filter state in search — enables sharing filtered views and surviving browser back navigation

**Defer to separate milestone:**
- Custom template builder — 3-5x effort of all other v1.1 features combined; architectural paradigm shift from hardcoded approach; evaluate need after v1.1 ships with 9 total templates
- In-app notification center (bell + real-time) — requires WebSocket/SSE infrastructure; email covers the need at 50 users
- Search result Excel export — defer to Phase 1-C with statistics/reports
- Auto-complete typeahead search — API complexity for minimal gain at this scale
- Email opt-out preferences — all approval notifications are business-critical; no opt-out needed

### Architecture Approach

The existing layered monolith (Controller → Service → Repository with MapStruct DTOs) accommodates all v1.1 features without structural change to the core model. Notifications integrate via Spring Application Events — domain events published from service methods, consumed by `@TransactionalEventListener` + `@Async` listeners that are fully decoupled from business transactions. Search integrates via a new `DocumentSearchSpecification` following the existing `UserSpecification` pattern. Templates are purely additive — 6 new React components, 3 Zod schemas, 3 registry entries, 3 backend validator strategies. The custom template builder requires the only genuine architectural extension: a `template_type` discriminator on `approval_template`, a `form_schema` JSON column, and a dual rendering path in the template registry.

**New components (notifications):**
1. `NotificationEventListener` — `@TransactionalEventListener(AFTER_COMMIT)` + `@Async`, orchestrates email dispatch from domain events
2. `EmailService` + Thymeleaf templates — SMTP transport layer, 5 HTML email template types
3. `NotificationLog` entity + `@Scheduled` retry — delivery tracking and automated retry up to 2x

**New components (search):**
4. `DocumentSearchSpecification` — JPA Specification with permission-aware WHERE clause: drafter OR approval-line member OR ADMIN department scope OR SUPER_ADMIN
5. `SearchPage` + `SearchFilterBar` + `useDocumentSearch` — frontend search UI with `useSearchParams` URL sync

**New components (custom template builder — separate milestone):**
6. `DynamicFormRenderer` / `DynamicFormReadOnly` / `DynamicFormValidator` — JSON schema-driven form rendering and server-side validation
7. `FormSchemaBuilder` admin UI — drag-and-drop template designer using `@hello-pangea/dnd`

### Critical Pitfalls

1. **Custom template builder breaks the hardcoded template system** — Design the JSON schema format first, before writing any UI code. Add a `template_type` discriminator (BUILTIN/CUSTOM) to `approval_template`. If `if (isCustomTemplate)` branches appear in more than 3 places across the codebase, the dual-system coupling is already a structural problem that will compound.

2. **Email sending inside transaction boundaries** — Any call to `JavaMailSender.send()` inside a `@Transactional` method is wrong. SMTP latency (500ms-3s per email) blocks the transaction; SMTP failure rolls back the approval action. Use `@TransactionalEventListener(phase = AFTER_COMMIT)` + `@Async` without exception.

3. **Korean full-text search without n-gram tokenization** — MariaDB default full-text search uses word-boundary tokenization that fails for Korean (e.g., "결재" does not match "전자결재"). Use `LIKE '%keyword%'` on indexed `title` and `doc_number` columns. Never use `MATCH...AGAINST` without configuring n-gram parser (`WITH PARSER ngram`, `ngram_token_size=2`).

4. **Template schema versioning gap** — Custom template edits after documents exist corrupt read-only rendering. Either snapshot the schema at document submission or lock templates from structural edits once any submitted documents reference them. Simplest safe rule: once submitted documents exist for a template, prohibit field removal.

5. **N+1 query problem in search results** — Document search returning 20 rows must not trigger 60 lazy-load queries for drafter/department/template relations. Use QueryDSL projections with explicit JOINs to a flat `DocumentSearchDto`. Indexes required on `document.status`, `document.template_code`, `document.submitted_at`, `document.title(100)`.

## Implications for Roadmap

Based on combined research findings, the optimal phase structure follows the dependency graph and risk escalation:

### Phase 1: SMTP Email Notifications
**Rationale:** No dependencies on other v1.1 features. The `notification_log` table DDL already exists in the database schema. FSD FN-NTF-001 fully specifies all behavior including event types, retry policy, and failure handling. This is a textbook Spring Boot pattern with zero architectural uncertainty. Highest user impact relative to implementation effort (2-3 days estimated).
**Delivers:** Email notifications for all 5 event types (submit, intermediate approve, final approve, reject, withdraw) with `@Retryable` delivery retry and `notification_log` tracking.
**Uses:** `spring-boot-starter-mail`, `spring-boot-starter-thymeleaf`, `spring-retry`, `@TransactionalEventListener`, `@Async`
**Avoids:** Pitfall 2 (email in transaction — use AFTER_COMMIT event listener), Pitfall 8 (SMTP credential leak — environment variables, never committed config)

### Phase 2: Additional Form Templates (3 hardcoded)
**Rationale:** Fully independent of notifications and search. Follows the exact existing pattern proven by GENERAL, EXPENSE, and LEAVE templates — purely additive changes with no risk to existing functionality. Before adding templates, refactor `DocumentFormValidator` from switch/case to a strategy pattern to prevent the validator from growing to 250+ unmaintainable lines at 6+ template types. The strategy pattern refactoring also directly benefits the custom template builder phase.
**Delivers:** Purchase Request (구매요청서), Business Trip Report (출장보고서), Overtime Request (연장근무신청서) — 6 new React components, 3 Zod schemas, 3 validator strategy classes, 3 Flyway seed migrations. `DocumentFormValidator` refactored to strategy pattern.
**Avoids:** Pitfall 9 (validator bloat — refactor before adding new cases), establishes stable template count for search filter dropdown

### Phase 3: Document Search/Filter
**Rationale:** Builds on the existing document list page and `UserSpecification` JPA Specification pattern. Benefits from Phase 2 being complete so the template-type filter dropdown is fully populated with all 6 templates. FSD FN-SEARCH-001 specifies the exact access control WHERE clause logic. The permission-aware subquery is the only non-trivial implementation challenge.
**Delivers:** Full document search with keyword, status, template, date range, and drafter filters; paginated results with existing `Pagination.tsx` component; role-based access control (drafter OR approval line member OR ADMIN dept scope OR SUPER_ADMIN); URL-synced filter state via `useSearchParams`.
**Uses:** QueryDSL `BooleanBuilder` / `JpaSpecificationExecutor`, Spring `Pageable`, `useSearchParams` from React Router
**Avoids:** Pitfall 3 (Korean full-text — LIKE '%keyword%' not MATCH...AGAINST), Pitfall 5 (N+1 — QueryDSL projections with JOIN FETCH), Pitfall 10 (lost filter state — URL params from day one)

### Phase 4: Custom Template Builder (Separate Milestone — Evaluate After v1.1)
**Rationale:** Architecturally distinct from all prior v1.1 work. Should only begin after Phases 1-3 are shipped and the hardcoded template pattern is proven stable with real usage. Has its own internal dependency chain that must be respected, and introduces the highest implementation risk of any v1.1 feature. With 9 hardcoded templates covering all common Korean corporate approval types, the builder may not be needed.
**Delivers:** Admin drag-and-drop form designer producing JSON schema definitions; dynamic form renderer consuming schemas; schema-driven server-side validation; dual rendering path in template registry (BUILTIN uses hardcoded components, CUSTOM uses `DynamicFormRenderer`).
**Sub-phases (in strict order):**
- D1: JSON schema format finalization + `DynamicFormRenderer` + `DynamicFormReadOnly` (foundation)
- D2: `DynamicFormValidator` server-side schema-driven validation
- D3: `TemplateBuilderPage` admin UI with `@hello-pangea/dnd` field palette and canvas
- D4: Integration with template selection modal and document creation flow
**Avoids:** Pitfall 1 (dual system — BUILTIN/CUSTOM discriminator, schema-first design), Pitfall 4 (schema versioning — snapshot at submission), Pitfall 7 (scope creep — v1 field types: text, textarea, number, date, select, checkbox only; no conditional logic, no repeating rows, no calculated fields)

### Phase Ordering Rationale

- Notifications and additional templates (Phases 1-2) have zero cross-dependencies and can proceed in parallel if two work streams are available
- Search (Phase 3) follows templates because the template-type filter dropdown needs a complete template registry to be useful
- Both waves (1-2 and then 3) complete the entire v1.1 specification except the builder
- Builder (Phase 4) is last because it requires all hardcoded templates to be stable and proven before introducing the parallel rendering path, and because it carries the highest risk of any feature
- Treating the builder as a separate milestone after v1.1 ships is the lower-risk path — real usage data from 9 templates will clarify whether a builder is genuinely needed

### Research Flags

Phases needing deeper research during planning:
- **Phase 4 (Custom Template Builder):** No existing FSD specification for this feature. Schema format, versioning strategy, and builder UX require deliberate design before implementation begins. Recommend `/gsd:research-phase` at the start of Phase D1. Key decisions: include or exclude `table` field type (doubles complexity if included), snapshot vs. version-locking strategy for schema changes.

Phases with standard patterns (skip research-phase):
- **Phase 1 (Notifications):** FSD FN-NTF-001 fully specified; `@TransactionalEventListener` + `@Async` is textbook Spring Boot pattern; `notification_log` table DDL exists
- **Phase 2 (Templates):** Direct replication of GENERAL/EXPENSE/LEAVE pattern; 6 reference files exist in codebase; strategy pattern refactor is straightforward
- **Phase 3 (Search/Filter):** FSD FN-SEARCH-001 fully specified including exact access control logic; existing `UserSpecification` is the reference implementation

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | 0 new frontend deps confirmed; 4 backend deps all Spring BOM-managed; validated against existing `build.gradle.kts` and `package.json` |
| Features | HIGH | FSD FN-NTF-001, FN-SEARCH-001, FN-TPL-002/003 fully specify notifications, search, and templates; builder is the only unspecified area |
| Architecture | HIGH (phases 1-3) / MEDIUM (phase 4) | Notifications, search, templates follow verified existing codebase patterns; builder design is opinionated analysis with no FSD backing |
| Pitfalls | HIGH | 8 of 11 pitfalls derived from direct codebase inspection; SMTP and Korean search pitfalls from well-documented authoritative sources |

**Overall confidence:** HIGH for Phases 1-3, MEDIUM for Phase 4

### Gaps to Address

- **Custom builder field type scope:** Research recommends 6 field types for v1 (text, textarea, number, date, select, checkbox). The decision to include `table` (repeating rows like expense items) is the single most impactful scope decision — including it roughly doubles builder complexity. Resolve explicitly before Phase D1 begins.
- **Template schema versioning strategy:** Two options are viable (snapshot schema JSON at document submission vs. lock templates from structural edits once submitted documents exist). Neither is specified in FSD. Choose one strategy before building any persistence layer for custom templates.
- **Notification batching:** Per-event notifications are correct for v1. Pitfall 6 (notification spam) is low risk at 50 users but the `notification_log` table design should anticipate batching — include a `digest_group` or `batch_id` column even if the batching logic comes later.
- **SMTP provider selection:** Research assumes company's existing email infrastructure. Confirm SMTP host, port, and TLS requirements before Phase 1 implementation. Local development should use MailPit or MailHog (mock SMTP) to avoid committing real credentials.
- **`react-day-picker` decision:** Research recommends starting with native HTML5 `<input type="date">`. Defer adding `react-day-picker` (9.x, ~10KB) until Phase 4 custom builder UX testing reveals an actual need — do not add it speculatively.

## Sources

### Primary (HIGH confidence)
- FSD v1.0 FN-NTF-001 — email notification spec, event types, retry policy, `notification_log` table
- FSD v1.0 FN-SEARCH-001 — document search spec, access control WHERE clause, query parameters
- FSD v1.0 FN-TPL-002 / FN-TPL-003 — template admin spec, form data JSON schemas
- PRD v2.0 section 5.1 — template structure, planned additional templates list
- Existing codebase: `templateRegistry.ts`, `DocumentFormValidator.java`, `UserSpecification.java`, `V1__create_schema.sql` (notification_log DDL)
- [Spring Boot Mail Reference](https://docs.spring.io/spring-boot/reference/io/email.html)
- [Spring @TransactionalEventListener documentation](https://docs.spring.io/spring-framework/reference/data-access/transaction/event.html)
- [Thymeleaf Spring Mail Article](https://www.thymeleaf.org/doc/articles/springmail.html)
- [Spring Retry Guide — Baeldung](https://www.baeldung.com/spring-retry)

### Secondary (MEDIUM confidence)
- [Spring Core Resilience Features (2025)](https://spring.io/blog/2025/09/09/core-spring-resilience-features/) — retry pattern options
- [Transactional Outbox pattern with Spring Boot — Wim Deblauwe](https://www.wimdeblauwe.com/blog/2024/06/25/transactional-outbox-pattern-with-spring-boot/) — outbox vs. @Async tradeoffs
- [MariaDB Full-Text Index Pitfalls and n-gram Parser](https://runebook.dev/en/docs/mariadb/full-text-index-overview/index) — Korean tokenization gap
- [@hello-pangea/dnd npm](https://www.npmjs.com/package/@hello-pangea/dnd) — DnD library status and maintenance
- [Top 5 DnD Libraries for React 2026 — Puck](https://puckeditor.com/blog/top-5-drag-and-drop-libraries-for-react) — dnd-kit maintenance concerns (pre-1.0 @dnd-kit/react)
- [spring-boot-starter-mail on Maven Central](https://mvnrepository.com/artifact/org.springframework.boot/spring-boot-starter-mail)

### Tertiary (LOW confidence — validate during implementation)
- [Drag-and-Drop React Form Builder with Zod — dev.to](https://dev.to/shoaeeb_osman_e3e2ae43910/i-built-a-drag-and-drop-react-form-builder-with-zod-react-hook-form-heres-how-3bc4) — builder architecture patterns (single dev blog post, needs validation)
- [Understanding TransactionalEventListener in Spring Boot — dev.to](https://dev.to/haraf/understanding-transactioneventlistener-in-spring-boot-use-cases-real-time-examples-and-4aof) — supplementary examples

---
*Research completed: 2026-04-03*
*Ready for roadmap: yes*

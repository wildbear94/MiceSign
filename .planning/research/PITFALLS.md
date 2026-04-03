# Domain Pitfalls

**Domain:** Electronic approval system -- extending with SMTP notifications, search/filter, additional templates, and custom template builder
**Researched:** 2026-04-03
**Confidence:** HIGH (based on codebase analysis + established patterns)

## Critical Pitfalls

Mistakes that cause rewrites or major issues.

### Pitfall 1: Custom Template Builder Breaks Existing Hardcoded Template System

**What goes wrong:** The current system is built on a fundamental assumption: each template is a hardcoded React component (`GeneralForm.tsx`, `ExpenseForm.tsx`, `LeaveForm.tsx`) registered in `TEMPLATE_REGISTRY` with paired edit/readOnly components. The backend validator (`DocumentFormValidator.java`) uses a `switch` statement on template codes with hardcoded validation per type. Introducing a dynamic form builder means running two completely different rendering and validation systems side-by-side -- hardcoded components for the original 6 templates and a JSON-schema-driven renderer for custom templates. This dual system is the single biggest architectural risk in the milestone.

**Why it happens:** The temptation is to build the dynamic builder as a "separate" feature, but it touches every layer: template registry, form rendering, validation (frontend Zod schemas AND backend `DocumentFormValidator`), document content storage (`form_data` JSON column), read-only display, and even document search (custom fields need to be searchable). The blast radius is the entire document pipeline.

**Consequences:**
- Two diverging codepaths for rendering, validation, and display that must be kept in sync
- Custom template documents that pass frontend validation but fail backend validation (or vice versa)
- Read-only views that cannot render custom template data
- Existing documents with hardcoded templates break if the template system is refactored carelessly

**Prevention:**
1. Design the JSON schema format FIRST, before writing any UI code. The schema must capture field types, validation rules, layout, and display configuration
2. Build the dynamic renderer as the foundation, then convert existing hardcoded templates to use it (or explicitly keep them as "system templates" that never go through the dynamic path)
3. Add a `template_type` discriminator (SYSTEM vs CUSTOM) to `approval_template` table so the system knows which rendering path to use
4. Backend validation for custom templates must be schema-driven -- store validation rules in the template definition, not in Java switch statements
5. Store the template schema version with each document so old documents can always be rendered even if the template changes later

**Detection:** If you find yourself writing `if (isCustomTemplate) { ... } else { ... }` in more than 3 places, you have a dual-system problem that will compound.

### Pitfall 2: Sending Emails Inside Transaction Boundaries

**What goes wrong:** Email notifications are triggered by document state changes (submit, approve, reject, withdraw). The natural place to add notification code is inside the service methods that change document status. But SMTP calls are slow (500ms-3s per email) and unreliable. If email sending is synchronous inside a transaction, it blocks the transaction, causes timeouts, and if the SMTP server is down, the approval action itself fails -- even though the business operation succeeded.

**Why it happens:** Solo developers tend to add `emailService.send()` right after `documentRepository.save()` inside the same `@Transactional` method because it's the simplest path. The problem only surfaces under real SMTP latency or when the mail server is temporarily unreachable.

**Consequences:**
- Approval actions fail because email delivery fails (false coupling)
- Transaction held open for seconds while waiting for SMTP response
- Database connection pool exhaustion under even modest concurrent load
- Users see error messages for email failures when their approval actually succeeded

**Prevention:**
1. Use `@TransactionalEventListener(phase = AFTER_COMMIT)` + `@Async` -- publish a domain event from the service, listen for it after the transaction commits, then send the email asynchronously in a separate thread
2. Create a `notification_log` table (already in the PRD schema) and write the notification record FIRST, then process it asynchronously. This gives retry capability and delivery tracking
3. Never let email failure roll back a business transaction
4. Add a simple retry mechanism (3 attempts with exponential backoff) for transient SMTP failures

**Detection:** If `JavaMailSender.send()` is called anywhere inside a `@Transactional` method, this pitfall is active.

### Pitfall 3: Korean Full-Text Search Without Proper Tokenization

**What goes wrong:** MariaDB's default full-text search uses word-based tokenization that relies on whitespace. Korean text has different word-boundary rules than English, and partial-word matching fails entirely. A search for "결재" (approval) won't match "전자결재" (electronic approval) with default full-text search. The document search becomes useless for Korean users.

**Why it happens:** Developers test with English data or short Korean terms that happen to match, then discover in production that real Korean document titles and content don't search properly.

**Consequences:**
- Users cannot find documents by Korean search terms
- False confidence from dev testing with simple terms
- Late-stage rewrite of the search implementation

**Prevention:**
1. Use `LIKE '%keyword%'` for the initial implementation instead of full-text indexes. For 50 users and thousands of documents, LIKE with proper indexes on `title` and `doc_number` is fast enough and handles Korean correctly
2. If full-text search is needed later, MariaDB supports an n-gram parser (`WITH PARSER ngram`) that breaks text into character sequences -- this works for CJK languages. Configure `ngram_token_size=2`
3. Test search with real Korean document titles from day one, not placeholder English text
4. For `doc_number` search (e.g., "GEN-2026"), exact prefix matching with `LIKE 'GEN-2026%'` is better than full-text

**Detection:** If the search implementation uses `MATCH ... AGAINST` without an n-gram parser configured, Korean search is broken.

## Moderate Pitfalls

### Pitfall 4: Template Schema Versioning -- Editing Templates Breaks Existing Documents

**What goes wrong:** An admin creates a custom template with fields [A, B, C]. 50 documents are created with it. Admin then edits the template to have fields [A, B, D] (removing C, adding D). The 50 existing documents now have `form_data` containing field C which the template no longer defines, and they lack field D. The read-only view either crashes or shows incomplete data.

**Prevention:**
1. Store a snapshot of the template schema definition with each document at submission time (in `document_content.form_data` or a separate column)
2. Alternatively, version templates -- editing creates a new version, old documents reference the old version
3. Never allow destructive template edits (field removal) after documents exist. Only allow additive changes (new optional fields) or create a new template entirely
4. The simplest approach: once a custom template has any submitted (non-draft) documents, lock it from structural edits. Admin must create a new template version

### Pitfall 5: N+1 Query Problem in Document Search Results

**What goes wrong:** The document list/search page needs to display document title, drafter name, department, template name, status, and dates. The current `DocumentRepository` only has simple `findByDrafterId` queries. Adding multi-criteria search (title keyword + status filter + date range + template filter) with JPA Specifications or QueryDSL, each result row triggers lazy-loading of `drafter` -> `department`, `drafter` -> `position`, and `template` relations. A search returning 20 results fires 60+ additional queries.

**Prevention:**
1. Use QueryDSL projections or JPQL `JOIN FETCH` for search queries -- load all needed relations in a single query
2. Create a dedicated `DocumentSearchDto` that is populated by a single flat query with explicit JOINs
3. Add indexes on commonly filtered columns: `document.status`, `document.template_code`, `document.submitted_at`, `document.title`
4. The current `DocumentRepository` has no `JpaSpecificationExecutor` -- add it, or build a QueryDSL-based search repository

### Pitfall 6: Email Notification Spam During Bulk Actions

**What goes wrong:** A manager approving 10 documents in sequence triggers 10 separate emails to different drafters, plus 10 "next approver" notifications, all firing simultaneously. If the same person is the next approver on multiple documents, they receive 10 near-identical emails. Worse, if someone withdraws and resubmits repeatedly during drafting, notifications fire for each state change.

**Prevention:**
1. Don't send notifications for DRAFT state changes (saves, auto-saves)
2. Implement notification deduplication -- if the same recipient has a pending unsent notification for the same document, update it rather than creating a new one
3. Consider a short delay (30-60 seconds) batching window where multiple notifications to the same recipient are merged into a digest
4. For MVP: simple per-event notifications are fine, but design the `notification_log` table to support batching later (include `batch_id` or `digest_group` column)

### Pitfall 7: Drag-and-Drop Form Builder Scope Creep

**What goes wrong:** A "simple" drag-and-drop form builder quickly expands in scope: field types (text, number, date, select, multi-select, file upload, table/repeating rows, rich text), conditional logic (show field B only if field A = "yes"), calculated fields (auto-sum), layout options (columns, sections, headers), and validation rules (required, min/max, regex, custom). Each of these is a mini-feature that multiplies complexity.

**Prevention:**
1. Define the exact field types for v1: text input, textarea, number, date, single select (dropdown), checkbox. Nothing else
2. No conditional logic in v1. No calculated fields. No repeating rows/tables
3. Layout is strictly vertical, single-column. No drag-to-resize, no multi-column layouts
4. Validation rules limited to: required (yes/no), min/max length for text, min/max value for numbers
5. Ship this minimal version, get real usage data, then decide what to add
6. The existing hardcoded EXPENSE template has repeating rows (expense items) -- accept that the custom builder CANNOT replicate this complexity initially, and that's fine

**Detection:** If the template builder spec mentions "conditional logic", "calculated fields", or "multi-column layout" for v1, scope is already too large.

### Pitfall 8: SMTP Configuration Leaking Into Application Properties

**What goes wrong:** SMTP credentials (host, port, username, password) are committed to `application.yml` or `application-dev.yml`, ending up in the Git repository. Company email server credentials are now in source control.

**Prevention:**
1. Use environment variables for all SMTP configuration: `SPRING_MAIL_HOST`, `SPRING_MAIL_USERNAME`, `SPRING_MAIL_PASSWORD`
2. In `application.yml`, reference them: `spring.mail.password=${SMTP_PASSWORD}`
3. For local development, use a mock SMTP server (MailHog, MailPit, or GreenMail) that requires no real credentials
4. Add `application-local.yml` to `.gitignore` for local overrides

## Minor Pitfalls

### Pitfall 9: Adding 3 New Hardcoded Templates Without Refactoring the Pattern

**What goes wrong:** Adding PURCHASE, BUSINESS_TRIP, and OVERTIME templates means creating 6 new React components (3 edit + 3 read-only), 3 new Zod schemas, and adding 3 new cases to the backend `DocumentFormValidator` switch statement. The validator is already 129 lines for 3 templates -- it becomes 250+ lines and unmaintainable.

**Prevention:**
1. Before adding the new templates, refactor `DocumentFormValidator` to use a strategy pattern -- each template type has its own validator class implementing a common interface
2. Each template's Zod schema should be co-located with its form component, not in a separate `validations/` directory (current structure has them separated, which will get confusing at 6+ templates)
3. Consider whether the 3 new templates are structurally similar enough to share a base component (e.g., PURCHASE and EXPENSE both have line items)

### Pitfall 10: Search Filter State Not in URL

**What goes wrong:** User filters documents by status=APPROVED, template=EXPENSE, date range this month. They click a document to view it, then press browser back. The filters are gone because they were stored in React component state, not in the URL.

**Prevention:**
1. Store all search/filter parameters in URL query params from day one: `/documents?status=APPROVED&template=EXPENSE&from=2026-04-01`
2. Use a hook that syncs URL params with filter state (React Router's `useSearchParams`)
3. This also enables sharing filtered views via URL copy-paste

### Pitfall 11: Notification Preferences Not Considered

**What goes wrong:** All users receive email notifications for every document event. Some users check the app frequently and find the emails annoying. Others want notifications only for pending approvals, not for "document approved" confirmations. There's no way to opt out because preferences weren't built.

**Prevention:**
1. For v1: send notifications only for actionable events (you need to approve something, your document was approved/rejected). Skip purely informational notifications
2. Add a simple `notification_preference` column or table from the start, even if the UI to change it comes later
3. At minimum, support a global on/off toggle per user

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|---------------|------------|
| SMTP Notifications | Email inside transaction (Pitfall 2) | Use @TransactionalEventListener + @Async from the start |
| SMTP Notifications | SMTP credential leak (Pitfall 8) | Environment variables, never in committed config |
| SMTP Notifications | Notification spam (Pitfall 6) | Only notify on actionable events, skip DRAFT changes |
| Document Search/Filter | Korean search broken (Pitfall 3) | Use LIKE '%keyword%' not full-text for Korean |
| Document Search/Filter | N+1 queries (Pitfall 5) | QueryDSL projections with JOIN FETCH |
| Document Search/Filter | Lost filter state (Pitfall 10) | URL query params from day one |
| Additional Templates (3) | Validator bloat (Pitfall 9) | Refactor to strategy pattern before adding templates |
| Custom Template Builder | Dual rendering system (Pitfall 1) | Design schema format first, add SYSTEM/CUSTOM discriminator |
| Custom Template Builder | Template versioning (Pitfall 4) | Snapshot schema at document submission |
| Custom Template Builder | Scope creep (Pitfall 7) | Strictly limit v1 field types, no conditional logic |

## Recommended Phase Ordering Based on Risk

1. **SMTP Notifications first** -- lowest architectural risk, well-understood patterns, decoupled from other features via event system
2. **Document Search/Filter second** -- moderate risk, requires QueryDSL work but no schema changes to core document model
3. **3 Additional Hardcoded Templates third** -- low technical risk but requires validator refactoring first (which benefits the template builder later)
4. **Custom Template Builder last** -- highest risk, highest complexity, benefits from all prior refactoring. Should be its own phase with dedicated research

## Sources

- Codebase analysis: `templateRegistry.ts`, `DocumentFormValidator.java`, `DocumentContent.java`, `DocumentRepository.java`, `ApprovalTemplate.java` -- HIGH confidence (direct code inspection)
- [Spring @TransactionalEventListener documentation](https://docs.spring.io/spring-framework/reference/data-access/transaction/event.html) -- HIGH confidence
- [Transactional Outbox pattern with Spring Boot](https://www.wimdeblauwe.com/blog/2024/06/25/transactional-outbox-pattern-with-spring-boot/) -- MEDIUM confidence
- [MariaDB Full-Text Index Pitfalls and n-gram Parser](https://runebook.dev/en/docs/mariadb/full-text-index-overview/index) -- MEDIUM confidence
- [React JSON Schema Form (RJSF)](https://github.com/rjsf-team/react-jsonschema-form) -- MEDIUM confidence
- [FormEngine - React Form Builder](https://formengine.io/) -- MEDIUM confidence (commercial, but architecture patterns relevant)
- [Drag-and-Drop Form Builder with Zod & React Hook Form](https://dev.to/shoaeeb_osman_e3e2ae43910/i-built-a-drag-and-drop-react-form-builder-with-zod-react-hook-form-heres-how-3bc4) -- LOW confidence (single dev blog post)
- [Understanding TransactionalEventListener in Spring Boot](https://dev.to/haraf/understanding-transactioneventlistener-in-spring-boot-use-cases-real-time-examples-and-4aof) -- MEDIUM confidence

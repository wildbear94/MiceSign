# Domain Pitfalls: v1.2 Phase 1-B Feature Integration

**Domain:** SMTP 이메일 알림 + 문서 검색/필터링 + 대시보드 고도화 + 양식 확장 — adding to *existing* MiceSign codebase
**Researched:** 2026-04-22
**Confidence:** HIGH (based on direct code analysis of existing backend) / MEDIUM (for external best-practice alignment)

**Critical context — these are not greenfield pitfalls.** Large portions of the Phase 1-B stack are already partially wired up in the codebase:

| Target feature | Current state in repo | Risk surface |
|---|---|---|
| SMTP notification | `EmailService.java` (stub, log-only); `ApprovalNotificationEvent`; `AsyncConfig` with `corePool=2 max=5 queue=100`; `spring-boot-starter-mail` already in `build.gradle`; `spring.mail.*` keys already in `application.yml`. `RegistrationEmailService` is fully SMTP-wired with Thymeleaf — registration emails *already go out* via real SMTP when configured. | Approval notifications must not regress registration path. Two code paths must share conventions. |
| Search/filter | `DocumentRepositoryCustomImpl.searchDocuments` (QueryDSL, title/docNumber/drafterName LIKE, tab=my\|department\|all). `DocumentSearchCondition` record. | FSD-001 demands `OR EXISTS approval_line` + `status != DRAFT` clauses — *missing* from current impl. |
| Dashboard | `DashboardService` counts + recent-5 lists via 4 separate COUNT queries + 2 page queries. | Permission filter on counts not verified; N+1 via `doc.getDrafter().getDepartment().getName()` in response mapping. |
| Form expansion | v1.1 builder (TemplateFormModal, SchemaFieldEditor, conditional rules, calculations, JSON import/export, presets) is **complete and validated**. | Adding new presets/templates must preserve schema snapshot immutability for existing documents. |
| Event+audit | `AuditLogService.log(...)` called *synchronously* inside `ApprovalService.approve/reject` (lines 121, 158). Event published via `eventPublisher.publishEvent(ApprovalNotificationEvent)` after audit. `@TransactionalEventListener(AFTER_COMMIT) + @Async` pattern already live in `EmailService`, `RegistrationEmailService`, `BudgetIntegrationService`. | Duplicating `DOC_APPROVE` audit entries through event listener is a real risk. |

The pitfalls below assume you are *extending* this existing surface, not designing from scratch.

---

## Critical Pitfalls

### Pitfall 1: Mixing real SMTP into `EmailService` breaks the tx-after-commit contract when `notification_log.save` fails

**What goes wrong:**
Today `EmailService.sendNotification` runs under `@TransactionalEventListener(AFTER_COMMIT) + @Async`. The outer business transaction (approve/reject) has already committed. When you replace the `[EMAIL STUB]` log line with a real `mailSender.send(message)` call, you introduce a new failure mode: *the email is sent successfully but `notificationLogRepository.save(notifLog)` fails* (e.g. DB connection pool exhausted in the async worker, FK violation because `recipient_id` is NULL due to lazy-loaded detached entity, or transient network blip).

Result: user receives the email but there is no log row — or worse, `save()` throws *before* setting `status=SUCCESS`, leaving a ghost `PENDING` row while the email was already delivered. Duplicate emails on retry guarantee double notifications.

**Why it happens:**
- `EmailService` has no `@Transactional` boundary on the listener method. Each `save()` call starts/commits its own implicit transaction via Spring Data JPA.
- The async thread pool loses the original transaction context (by design with `@Async`), but developers often assume "it's the same transaction" and don't think about idempotency.
- Current code saves `notifLog` *after* the send — the correct order for at-most-once, wrong for at-least-once.

**How to avoid:**
1. **Save-first, send-second pattern:** Insert `notification_log` row with `status=PENDING` *before* calling `mailSender.send()`. On success update to `SUCCESS`; on failure increment `retry_count` and set `RETRY` or `FAILED`. This matches the existing enum already present in `NotificationStatus` (PENDING / SUCCESS / FAILED / RETRY). The V6 migration `V6__add_pending_notification_status.sql` already exists for exactly this — use it.
2. **Idempotency key:** Add a unique constraint `(document_id, event_type, recipient_id)` to `notification_log` so re-delivery on retry can be detected. If insert violates unique, skip send. *Migration required.*
3. **Explicit `@Transactional(propagation = REQUIRES_NEW)` on the listener:** So the notification_log save is transactional on its own, independent of other work. Pattern is already used correctly by `RegistrationEmailService`; copy it to `EmailService`.
4. Wrap mail send with explicit exception classification: `MailSendException` (transient → RETRY), `MailAuthenticationException` (config error → FAILED, don't retry), other → FAILED.

**Warning signs:**
- `notification_log` rows with `status=PENDING` older than 10 minutes (stuck rows)
- Duplicate `SUCCESS` rows for same `(document_id, event_type, recipient_id)`
- Users reporting they received 2–3 identical mails for one approval action
- Errors in logs like `ObjectOptimisticLockingFailureException` inside async thread

**Phase to address:** Phase that adds real SMTP send — *before* enabling in production. Do this as the very first change to `EmailService`, not after.

**Sources:** [Transaction-bound Events — Spring docs](https://docs.spring.io/spring-framework/reference/data-access/transaction/event.html); [Transaction Synchronization and Spring Application Events — DZone](https://dzone.com/articles/transaction-synchronization-and-spring-application)

---

### Pitfall 2: Re-publishing `ApprovalNotificationEvent` → losing the event (nested-listener trap)

**What goes wrong:**
A tempting refactor is to split notification logic: on `APPROVE` event, determine if this is final approval; if final, *republish* as `FINAL_APPROVE` event so a different listener can handle "기안자에게 알림". This silently does nothing.

**Why it happens:**
Spring will not execute a nested `@TransactionalEventListener` when the outer event listener itself runs under `AFTER_COMMIT` — the outer transaction is already over, so "after commit" of a nested event has nothing to bind to. Spring GitHub issue [#35395](https://github.com/spring-projects/spring-framework/issues/35395) documents this explicitly: publishing a new event from inside a transactional event listener doesn't trigger nested listeners by design.

Current code already sidesteps this (ApprovalService decides SUBMIT/APPROVE/FINAL_APPROVE/REJECT inline and publishes *one* event with the correct `eventType`). That design must not regress.

**How to avoid:**
- **Do not refactor `ApprovalService.approve/reject` to publish a single "generic approval-state-change" event and derive the specific type in the listener.** Keep the explicit eventType decision in the producer.
- If splitting handlers (e.g. audit + mail + Slack), use multiple `@EventListener` methods listening to the *same* event class, not event-chaining.
- If you must chain, use `ApplicationEventPublisher.publishEvent` + a synchronous `@EventListener` (no `@TransactionalEventListener`), and ensure the chained listener doesn't need transaction semantics.

**Warning signs:**
- New listener method added but breakpoint never hits
- `grep -r 'publishEvent' src/` showing an event being published from inside an `@Async` method
- Final-approval email works but mid-approval works inconsistently (because events are lost on different boundaries)

**Phase to address:** Any phase adding a new event listener. Reinforce in code review checklist for the SMTP phase.

**Sources:** [Spring #35395 nested @TransactionalEventListener](https://github.com/spring-projects/spring-framework/issues/35395); [Spring #30679 detect invalid tx listener config](https://github.com/spring-projects/spring-framework/issues/30679)

---

### Pitfall 3: Duplicate `audit_log` rows — the listener tries to "help" by logging approval actions

**What goes wrong:**
`ApprovalService.approve` already calls `auditLogService.log(userId, AuditAction.DOC_APPROVE, ...)` *synchronously, inside the same transaction* (lines 121, 158 confirmed). Common mistake when building Phase 1-C audit-log UI: developer sees the `ApprovalNotificationEvent` firing and thinks "let me hook audit logging to the event for consistency". Now every approval produces two `DOC_APPROVE` rows — one from the service, one from the listener.

**Why it happens:**
- The event was named `ApprovalNotificationEvent` but is semantically "approval state change occurred". Tempting to reuse.
- Existing pattern for login uses AOP (`AuditAspect`) for USER_LOGIN/USER_LOGOUT — developer may extrapolate and wire AOP-around-controllers for document actions, duplicating the service-level call.
- Registration events publish through a different event class (`RegistrationNotificationEvent`), setting a precedent that "events = audit+mail combined".

**How to avoid:**
- **Establish a single rule:** `audit_log` is written synchronously in the service method that performs the state change. Event listeners never write audit rows. Document this in CLAUDE.md under Conventions.
- Name the event `ApprovalNotificationEvent` *exactly* for notifications, not "ApprovalEvent" / "ApprovalStateChangedEvent". The current naming is correct — preserve it.
- Add a unit test `ApprovalServiceAuditTest` that asserts exactly one `audit_log` row per action (query `SELECT COUNT(*) WHERE action=? AND target_id=?`).
- When building audit-log UI (Phase 1-C), surface the count per action so duplicates become immediately visible.

**Warning signs:**
- Duplicate rows in `audit_log` table for the same `target_id` within milliseconds of each other
- Test failures in `ApprovalServiceTest` counting audit entries
- SUPER_ADMIN confused by "why are there two DOC_APPROVE entries"

**Phase to address:** Immediately when designing the SMTP listener. Lock the rule in before Phase 1-C audit UI is built.

---

### Pitfall 4: `DocumentRepositoryCustomImpl.searchDocuments` missing the FSD permission filter

**What goes wrong:**
FSD FN-SEARCH-001 requires this WHERE clause (verbatim from `/docs/FSD_MiceSign_v1.0.md` §11):

```sql
WHERE (
  d.drafter_id = :currentUserId
  OR EXISTS (SELECT 1 FROM approval_line al WHERE al.document_id = d.id AND al.approver_id = :currentUserId)
  OR (:role = 'ADMIN' AND d.drafter_id IN (SELECT id FROM user WHERE department_id = :myDepartmentId))
  OR :role = 'SUPER_ADMIN'
)
AND d.status != 'DRAFT'
```

Current implementation (confirmed — `DocumentRepositoryCustomImpl.java` lines 42–55) only scopes by `tab` parameter — `my` → `drafterId = userId`, `department` → dept match, `all` → ADMIN/SA bypass. **It does not include documents where the user is only on the approval line.** A USER-role approver searching "all" documents sees nothing. A USER searching "my" never finds documents they only referenced/approved.

Worse: `AND d.status != 'DRAFT'` is missing — tab=department/all with status filter omitted will leak other people's drafts into the result list.

**Why it happens:**
The existing method was built for a simpler "my documents" tab before the unified search endpoint was designed. FSD added requirements after the scaffolding was in place.

**How to avoid:**
- Rewrite the `where` BooleanBuilder so the access predicate is always present and the `tab` parameter only further *narrows* the result (not replaces access rules):
  ```java
  BooleanExpression accessible = doc.drafterId.eq(userId)
      .or(JPAExpressions.selectOne().from(approvalLine)
          .where(approvalLine.documentId.eq(doc.id).and(approvalLine.approverId.eq(userId)))
          .exists());
  if ("ADMIN".equals(role)) accessible = accessible.or(drafter.departmentId.eq(departmentId));
  if ("SUPER_ADMIN".equals(role)) accessible = Expressions.TRUE;  // no filter
  where.and(accessible);
  where.and(doc.status.ne(DocumentStatus.DRAFT));  // unless tab=my, where user can see own drafts
  ```
- **Tab=my is the exception** — users should see their own DRAFTs in "my" tab. Branch the `status != DRAFT` rule on tab.
- Integration test with fixture: user A drafts doc1 (SUBMITTED), user B is approver. B searches → doc1 appears. C (unrelated) searches → doc1 does not appear.

**Warning signs:**
- API test: create doc as user A, set user B as approver → user B's `/api/documents/search` returns empty
- DRAFT documents from other users leaking into department/all tab
- ADMIN seeing drafts from their own department

**Phase to address:** Search/filter phase. Must be first PR in that phase — filter logic is the foundation.

---

### Pitfall 5: N+1 in search result projection via `drafter.department.name` lazy navigation

**What goes wrong:**
`DocumentRepositoryCustomImpl` uses `Projections.constructor(DocumentResponse.class, ...)` with `dept.name` selected directly — this is fine. But if anyone refactors to `documentMapper.toResponse(doc, ...)` (as `DashboardService` and `DocumentService.getMyDocuments` do), and `doc.getDrafter().getDepartment().getName()` is accessed outside a `JOIN FETCH`, every row triggers a SELECT. On a page size of 20 this means 20–60 extra queries per search request.

**Why it happens:**
- `Document.drafter` and `User.department` are `FetchType.LAZY` by default.
- `DashboardService.java:62` does `doc.getDrafter().getDepartment().getName()` inside a stream — already N+1. 50 users × "dashboard loaded on every page" = thousands of extra queries/day even at MVP scale.
- Developers copy-paste the dashboard pattern into new endpoints.

**How to avoid:**
- **Prefer `Projections.constructor` with explicit joins** (as `searchDocuments` does). Do not route search results through `documentMapper.toResponse`.
- In `DashboardService.getDashboardSummary`, replace the `Page<Document> docPage = findByDrafterId(...)` with a QueryDSL projection that joins department and maps directly to `DocumentResponse`. Same for `recentPending`.
- Add a test using `@DataJpaTest` + Hibernate's `hibernate.generate_statistics=true` to count SQL executions. Fail if dashboard load > 4 queries (counts + recentPending + recentDocs + templateNames).
- Consider enabling `spring.jpa.properties.hibernate.generate_statistics=true` in `application-dev.yml` and reviewing counts during development.

**Warning signs:**
- Dashboard p95 latency > 200ms with empty cache
- `SELECT * FROM department WHERE id = ?` appearing multiple times in a single request log
- SQL log at DEBUG level showing `SELECT` per document in list responses

**Phase to address:** Dashboard phase (counts + recent lists) and search phase. Fix dashboard first since it's loaded on every navigation.

---

### Pitfall 6: Dashboard counts not respecting permissions → shows all docs instead of "mine"

**What goes wrong:**
`DashboardService.getDashboardSummary` currently uses `countByDrafterIdAndStatus(userId, ...)` — correct for drafter-based counts. But "결재 대기" card (`pendingCount`) calls `approvalLineRepository.countPendingByApproverId(userId)` — correct for pending approvals.

The pitfall kicks in when someone adds a "부서 대기 건수" or "전사 진행 중" card to the dashboard for ADMIN/SUPER_ADMIN without re-checking permissions. Copy-paste from the USER counts will double-count or leak data.

**Why it happens:**
- The summary DTO is a flat record; adding fields doesn't force you to think about role.
- SUPER_ADMIN dashboard may want all-company stats, which is legitimate — but the same code path serves USERs.
- Repository methods like `countByStatus(status)` (no user predicate) are easy to write and very easy to misuse.

**How to avoid:**
- Branch the count queries on role *inside* `DashboardService`, never at the repository layer. The repository should expose only well-scoped methods: `countByDrafterIdAndStatus`, `countByDepartmentAndStatus`, `countAllByStatus` — and each of these is called only from the correct role branch.
- Add a `DashboardRole` enum or distinct DTOs: `UserDashboardSummary`, `AdminDashboardSummary`, `SuperAdminDashboardSummary` — let the type system enforce separation.
- Integration test: ADMIN user sees department count; USER in same department sees only own count for the same fixture.

**Warning signs:**
- User sees "기안 진행중: 47" when they have drafted 3 documents
- ADMIN dashboard shows counts equal to SUPER_ADMIN dashboard
- `@PreAuthorize` on controller ignored because data scoping happens in UI layer

**Phase to address:** Dashboard고도화 phase. Add integration tests before adding new cards.

---

### Pitfall 7: MariaDB FULLTEXT on Korean text with `utf8mb4_unicode_ci` — default parser doesn't tokenize CJK

**What goes wrong:**
The PRD aims for "전문 검색 (응답 ≤ 1초)". Tempting implementation: `ALTER TABLE document ADD FULLTEXT INDEX ft_title (title)` and replace `LIKE %keyword%` with `MATCH(title) AGAINST(?)`. **This silently fails for Korean queries.** The default built-in parser uses whitespace as token delimiter — fine for English. Korean text `결재문서번호GEN-2026-0001` is a single token; searching for `결재` returns zero matches.

Additionally, default `innodb_ft_min_token_size = 3` excludes Korean 2-character queries (most common search terms are 2 syllables).

**Why it happens:**
- MariaDB docs do describe the `WITH PARSER ngram` option — but require explicit `server system variable ngram_token_size=2` (DB-wide, not index-level) and the n-gram parser must be configured server-side.
- Developers validate with English seed data, Korean production data breaks silently.
- `utf8mb4_unicode_ci` does not change fulltext tokenization behavior — that's a collation for comparison, not for indexing.

**How to avoid:**
- **Option A (recommended for this project):** Do NOT add FULLTEXT. Keep `LIKE %keyword%` on `title` + `docNumber` (current impl). With 50 users and realistic doc counts (<10k docs/year), indexed `LIKE` with prefix index is more than fast enough. Set a small `docNumber` b-tree index (already present: `idx_template_code`).
- **Option B (if FULLTEXT needed):** Create index with `WITH PARSER ngram`, set `ngram_token_size=2` in `my.cnf`, set `innodb_ft_min_token_size=2`, `ft_min_word_len=2`. Restart server. Use `MATCH(title) AGAINST ('검색어' IN NATURAL LANGUAGE MODE)`. Verify with Korean seed data.
- **Option C (if scale justifies):** Add a separate `document_search` table with pre-tokenized text, or introduce Elasticsearch. Out of scope for Phase 1-B.
- Benchmark decision: load 10k Korean-titled seed docs → measure `LIKE` vs `MATCH` p95. If `LIKE` < 300ms, stay with it.

**Warning signs:**
- FULLTEXT search returns zero results for obvious Korean queries that `LIKE` finds
- Query plan shows `fulltext` but EXPLAIN indicates `rows examined = 0`
- Users complain "검색이 안 된다" despite admin seeing plenty of data

**Phase to address:** Search phase — make the LIKE-vs-FULLTEXT decision *before* writing any search code. Write the decision into `.planning/research/STACK.md`.

**Sources:** [MariaDB ngram parser docs](https://mariadb.com/kb/en/full-text-index-overview/); [MySQL 8.4 ngram full-text parser](https://dev.mysql.com/doc/refman/8.4/en/fulltext-search-ngram.html); [Poor performance with utf8mb4_unicode_ci in MariaDB 11](https://mariadb.com/kb/en/the-community-poor-performance-with-mariadb-11-and-utf8mb4_unicode_ci-vs-ut/) — notes that 11.x has issues; 10.11 is safer.

---

### Pitfall 8: Date range queries applying `DATE()` function → index goes unused

**What goes wrong:**
When extending search with `submittedAt BETWEEN :startDate AND :endDate`, intuitive SQL is:
```sql
WHERE DATE(submitted_at) >= :startDate AND DATE(submitted_at) <= :endDate
```
`DATE(submitted_at)` is not sargable. MariaDB cannot use `idx_submitted_at` and scans the whole table. At 10k+ documents this degrades quickly.

Current QueryDSL code (`DocumentRepositoryCustomImpl.java:75–80`) is correct — uses `goe(startDate.atStartOfDay())` and `lt(endDate.plusDays(1).atStartOfDay())`. **Preserve this pattern when copy-pasting to search/filter extensions.**

**Why it happens:**
- Frontend sends `LocalDate` (no time); backend intuitively applies `DATE()` to match
- Developer wants inclusive end-of-day behavior and writes `<= '2026-04-22'` which resolves to `2026-04-22 00:00:00` — missing everything that day

**How to avoid:**
- **Pattern:** `start.atStartOfDay()` inclusive, `end.plusDays(1).atStartOfDay()` exclusive
- Add explicit indexes for any new filter columns used in range queries
- EXPLAIN every new search query during development; reject PRs where the plan shows `Using where; Using temporary; Using filesort` on >1k rows

**Warning signs:**
- Search p95 climbs as document count grows
- EXPLAIN shows `type: ALL` instead of `range`
- "Document from today doesn't show up in today's range" (off-by-one from wrong comparison)

**Phase to address:** Search phase. Code-review enforcement.

---

### Pitfall 9: Schema snapshot immutability broken when adding new preset to `TEMPLATE_REGISTRY`

**What goes wrong:**
The v1.1 form builder saves a `schemaVersion` snapshot per document (see V9 migration `V9__create_template_schema_version.sql`). When you add new preset templates in v1.2 ("근태신청서 프리셋", "발주 요청서 프리셋" etc.) you add them to the admin UI's preset picker AND inject default schemas. **Danger:** if the preset becomes the "canonical" schema for a template code, and existing documents were created under a v1 snapshot, the CUSTOM form renderer must render them from the stored snapshot — not fall back to the current registry.

Common mistake: updating `TEMPLATE_REGISTRY` bumps what new users see but the `DocumentSchemaRenderer` uses the *live* schema instead of the document's frozen `template_schema_version_id`.

**Why it happens:**
- Registry is a JS object; easy to modify in-place.
- Testing happens with fresh docs where live = frozen; regression surfaces only with aged docs.
- The mapping table `template_schema_version` already exists but developers can forget to resolve through it.

**How to avoid:**
- `DynamicFormRenderer` must always accept `schema: SchemaDefinition` as a prop, never import from `TEMPLATE_REGISTRY` internally.
- `DocumentDetailResponse` must include the frozen schema (resolved server-side via `template_schema_version_id`) — verify it already does via FSD / existing API.
- Regression test: create document with schema v1 → admin updates template to v2 → reopen document → rendered form matches v1.
- **When a preset is "promoted" to be a built-in template:** keep schema_version rows for all historical snapshots; never UPDATE existing rows, always INSERT new.

**Warning signs:**
- Old document opens but fields are missing / misaligned
- Admin editing a preset retroactively changes how old documents look
- Migration tries to `UPDATE template_schema_version SET schema = ...`

**Phase to address:** Form expansion phase. Write the regression test *first*.

---

### Pitfall 10: JSON import accepting HTML/XSS payloads when expanding presets from external sources

**What goes wrong:**
v1.1 built `JSON 내보내기/가져오기` with Zod validation (see existing PITFALLS.md Pitfall 4). v1.2 may ship a curated preset library that imports from a community/GitHub repo. If preset JSON includes `"label": "<img src=x onerror='alert(1)'>"` and the preview or document rendering passes it through `dangerouslySetInnerHTML` or Tailwind's default string rendering (which is safe but a rich-text field might not be), XSS is shipped company-wide.

**Why it happens:**
- External preset sources aren't under your review process.
- Rich-text field types (`richText` / `html` in schema) are designed to render HTML; labels typically aren't, but the type system doesn't prevent cross-pollution.
- Admin role has elevated trust; stolen admin session via XSS is catastrophic (can approve documents, edit users).

**How to avoid:**
- Sanitize all imported string fields with DOMPurify before storage — applies to `label`, `placeholder`, `helpText`, `options.label`, table column headers.
- `richText` / `html` field rendering already should use DOMPurify with a strict allow-list (verify: `<p>, <ul>, <li>, <a href>, <strong>, <em>, <br>, <table>` only; no `<script>, <iframe>, <object>, onerror=`). Add `<a rel="noopener noreferrer">` forcibly.
- Never auto-apply presets from external URLs. Require manual download → validate → upload.
- CSP headers: enforce `script-src 'self'` to prevent inline script execution even if XSS gets through.

**Warning signs:**
- Preset JSON contains `<` or `&lt;` in label fields
- `dangerouslySetInnerHTML` appears without a surrounding `DOMPurify.sanitize()`
- Browser console shows `CSP violation` from preset application

**Phase to address:** Form expansion phase — before shipping preset library.

---

## Moderate Pitfalls

### Pitfall 11: Async thread pool `max=5 queue=100` saturates on bulk "회수" (withdraw) event

**What goes wrong:**
Current `AsyncConfig`: core=2, max=5, queue=100. When a drafter withdraws a document with a 6-person approval line, `EmailService.sendNotification` receives a WITHDRAW event and sends to all 6 recipients. Each send + save takes ~500ms. If 3 users withdraw simultaneously, 18 tasks stack; add registration emails and budget emails to the pool → queue grows. If the queue fills (100 items), the default `AbortPolicy` rejects tasks → events are silently lost.

**Why it happens:**
- 50 users sounds small; actual peak concurrency during morning approval rush can be 5–10 events/second
- The same executor is shared across EmailService, RegistrationEmailService, BudgetIntegrationService — contention compounds

**How to avoid:**
- Dedicate a separate executor for mail: `@Bean("mailExecutor")` with core=5 max=10 queue=500, and annotate mail listener `@Async("mailExecutor")`.
- Set `setRejectedExecutionHandler(new CallerRunsPolicy())` as fallback so overflow runs synchronously rather than drops.
- Emit Micrometer metrics (`micesign.mail.queue.size`, `micesign.mail.sent.total`, `micesign.mail.failed.total`) — even without Prometheus, expose via Spring Actuator `/actuator/metrics`.
- Batch WITHDRAW sending: one email with multiple recipients in BCC instead of 6 separate sends (if privacy allows).

**Prevention strategy:** Dedicated mail executor + metrics, enabled in SMTP phase.

**Phase:** SMTP phase.

---

### Pitfall 12: SMTP credentials leaking in logs / test fixtures (GreenMail vs. MailHog vs. real SMTP)

**What goes wrong:**
Solo dev tests locally → writes `spring.mail.password: mypassword` into `application-dev.yml` → commits → leaks. Or uses personal Gmail app password, gets throttled at 500/day, quietly breaks prod notifications.

**Why it happens:**
- `application.yml` lines 26–29 already read `${MAIL_PASSWORD:}` from env — good. But `application-prod.yml` or `application-local.yml` can override.
- Dev testing needs *some* SMTP server; temptation is to use personal Gmail.
- `RegistrationEmailService` already uses `mailSender == null` branch to fall back to log-only — the pattern works, but breaks tests that need to *verify* email content.

**How to avoid:**
- **Dev:** Use GreenMail (in-process JUnit SMTP server) for integration tests; use MailHog (Docker-free binary) for manual testing. Never personal SMTP.
- **Prod:** Use company SMTP relay (most companies have one) or Amazon SES / SendGrid transactional. Dedicated from-address (`noreply@company.kr`).
- `.gitignore` `application-local.yml`. Provide `application-local.yml.example` checked in.
- Add `@ConditionalOnProperty("spring.mail.host")` to the `JavaMailSender` bean so absence of config cleanly disables SMTP instead of crashing at startup.
- Rate-limit: wrap `mailSender.send()` in a token-bucket limiter (e.g. Resilience4j) at 100/min to prevent runaway loops from DoS-ing the SMTP provider.

**Phase:** SMTP phase.

---

### Pitfall 13: Email link includes refresh-token race → user clicks stale link, gets 401

**What goes wrong:**
Email body includes "문서 바로가기: https://micesign.local/documents/42". User clicks 3 hours later, but the 30-minute access token has expired, and the refresh-token rotation happened when another device logged out. Result: 401 redirects to login, losing intent.

**Why it happens:**
- Access tokens are 30 min (JWT config in `application.yml:40`)
- Refresh tokens rotate on each use; old tokens are invalidated (per PRD)
- "Rotation race" when user has multiple tabs / devices — one rotation invalidates the other

**How to avoid:**
- The email link must open the web app and let the frontend handle auth. Never include access tokens in URLs (critical — audit logs would record the URL and leak it).
- Frontend route `/documents/:id` must: try silent refresh → if fail, redirect to `/login?redirect=/documents/:id` → post-login resume.
- Don't rely on any single refresh token working — silent refresh must retry once on 401 before failing.
- Consider a short-lived "deep-link token" issued when composing the email: 24-hour single-use, signed, purpose-bound to a specific document view. Optional, adds complexity.

**Phase:** SMTP phase (email link URL design); Auth review is a prerequisite.

---

### Pitfall 14: `@Cacheable` on dashboard summary without invalidation on approval events

**What goes wrong:**
Developer adds `@Cacheable("dashboardSummary", key = "#userId")` to `DashboardService.getDashboardSummary` to improve p95. Counts are now cached for 60s / 5min / forever. User approves a document → count should go from 5 → 4, but dashboard still shows 5 until TTL expires. User reports "왜 처리했는데 대기 건수가 안 줄어요".

**Why it happens:**
- Caching is easy; invalidation is the hard problem.
- The approval event is a *state change* — the exact event that needs to clear cached counts for: drafter, each approver on the line, and the actor.
- Spring's `@CacheEvict` must be placed at the right layer; putting it on the cache bean directly is wrong.

**How to avoid:**
- **Default:** Do not cache. 50 users × 4 counts × 2 queries = 400 queries/min = nothing. Optimize later.
- If you must cache: hook cache eviction to `ApprovalNotificationEvent` listener. Pattern:
  ```java
  @EventListener
  public void onApprovalEvent(ApprovalNotificationEvent e) {
      cacheManager.getCache("dashboardSummary").evict(e.getDrafterId());
      // evict for all line members too
  }
  ```
- Use short TTL (30s) as a safety net — acceptable staleness for dashboard counts.
- Prefer read-through caching (Caffeine) over distributed cache (Redis) at this scale.

**Warning signs:**
- User workflow: approve → navigate to dashboard → count unchanged
- Cache hit rate > 90% but users complain of stale data

**Phase:** Dashboard phase. Ship without cache first; add only if profiling shows need.

---

### Pitfall 15: Search result pagination with COUNT(*) on LEFT JOIN approver — duplicate rows in count

**What goes wrong:**
When the search WHERE clause uses `OR EXISTS (SELECT 1 FROM approval_line al WHERE al.document_id = d.id AND al.approver_id = :userId)`, the count query works. But if a developer refactors to `LEFT JOIN approval_line al ON al.document_id = d.id AND al.approver_id = :userId` and then counts `doc.count()`, duplicate documents (multiple approval lines for same doc) inflate the count. Pagination breaks: "Total: 47, but only 23 unique documents visible across all pages."

**Why it happens:**
- JOIN feels more natural than correlated EXISTS
- QueryDSL's `doc.countDistinct()` is correct but easy to forget
- QueryDSL deprecated `fetchCount()` in 5.x — developers copy-paste old examples

**How to avoid:**
- Use `EXISTS` subquery for permission filter (current pattern in suggested Pitfall 4 fix). JPA `JPAExpressions.selectOne().exists()`.
- If JOIN is required, use `.selectDistinct(doc)` and `queryFactory.select(doc.countDistinct())` for count.
- Test with fixture: doc with 3-person approval line; user A drafts, user B/C/D approve → user B searching "all" returns 1 row, not 3.

**Warning signs:**
- `Page<DocumentResponse>.totalElements > content.size() * totalPages`
- Users see same document multiple times in result list
- Logs show same `document.id` repeated in a single result set

**Phase:** Search phase.

**Sources:** [QueryDSL Reference Guide](http://querydsl.com/static/querydsl/4.0.8/reference/html_single/); [QueryDSL fetchCount deprecation issue](https://github.com/querydsl/querydsl/issues/2504)

---

### Pitfall 16: `notification_log` DDL mismatch between Flyway migration and JPA entity

**What goes wrong:**
`NotificationLog.java` (entity) has `registrationRequestId` column (added in V16 migration). `documentId` is `@Column` but the original V1/V2 migration defined it as `BIGINT NULL FOREIGN KEY REFERENCES document(id)`. When adding SMTP for approvals, if you add a new column like `retry_after DATETIME` to the entity without a Flyway migration, Spring Boot startup fails in prod (`ddl-auto: validate`) or silently corrupts in dev (`ddl-auto: update`).

**Why it happens:**
- Solo dev runs `ddl-auto: update` locally, entity evolves, forgets to write migration
- `ddl-auto: validate` in prod catches it at deploy time — but that's late

**How to avoid:**
- **Lock `spring.jpa.hibernate.ddl-auto: validate` in all profiles including dev.** Force migrations from day one.
- Schema change workflow: write migration → test locally → update entity. Never reverse.
- Add CI check: `grep -r '@Column' src/main/java | count` vs. flyway migrations columns — fail if drift.
- Review V16 and V6 migrations — they show the existing author's pattern for extending notification_log. Follow exactly.

**Warning signs:**
- Prod deploy fails with "Schema-validation: missing column" or "wrong column type"
- Dev and prod have different column sets (diverged)
- Hibernate logs `schema update required` at startup

**Phase:** SMTP phase if new columns needed.

---

### Pitfall 17: Failing `notification_log` insert blocks mail send (ordering bug)

**What goes wrong:**
Current `EmailService.sendToRecipient` (lines 159–181) sets `notifLog` fields → tries send → catches exception → saves with appropriate status → saves at end. If `notificationLogRepository.save(notifLog)` throws (unique constraint, FK violation, DB down), the caught exception propagates up, but the email was already successfully sent inside the try block. Result: email delivered, no DB record.

Inverse bug: if insertion happens first and it fails on a NOT NULL constraint, the mail is never sent even though nothing about the business operation should block it.

**Why it happens:**
- The try/catch wraps the wrong thing — wraps send but not save
- The code path assumes `save()` can't fail

**How to avoid:**
- Restructure to "PENDING insert → send → UPDATE status":
  1. Insert `notification_log` with `status=PENDING` *before* trying to send.
  2. Attempt send.
  3. Update `status=SUCCESS` or `FAILED/RETRY`.
- Each step has its own try/catch; insert failure logs and bails without sending (the log row is the dedup key); send failure updates the existing row to FAILED.
- Use `@Transactional(propagation = REQUIRES_NEW)` only on the log update, so a failed update doesn't roll back the send that already happened.

**Warning signs:**
- `notification_log` has fewer rows than expected number of sent emails
- Users receive emails but admin audit shows no record

**Phase:** SMTP phase.

---

### Pitfall 18: HTML email subject with Korean characters not encoded → garbled "?????" subject

**What goes wrong:**
`EmailService.sendNotification` sets subject: `"[MiceSign] " + actionLabel + ": " + docNo + " " + document.getTitle()`. With Korean `title="휴가 신청서"`, the subject contains mixed ASCII + CJK. If `MimeMessageHelper` isn't given UTF-8 explicitly, the JavaMail default (`US-ASCII`) mangles Korean into `?????` in subject lines. Body rendering with Thymeleaf is fine because the template declares `<meta charset="UTF-8">`, but MIME headers need separate encoding.

**Why it happens:**
- The existing `RegistrationEmailService.java:170` correctly uses `new MimeMessageHelper(message, true, "UTF-8")` — this works for subject AND body.
- Copy-paste of 3-arg constructor without the charset is easy.

**How to avoid:**
- Always use `new MimeMessageHelper(message, true, "UTF-8")` or `MimeMessageHelper(message, MULTIPART_MODE_MIXED_RELATED, StandardCharsets.UTF_8.name())`.
- Add `spring.mail.default-encoding: UTF-8` to `application.yml` (currently missing — verify).
- Add `spring.mail.properties.mail.mime.charset: UTF-8`.
- Template: `<meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />` in every HTML template (already present in `registration-submit.html`).
- Test: integration test with GreenMail that asserts received message subject contains `"휴가"` literal.

**Warning signs:**
- Email clients (Gmail, Outlook) show subject as `=?UTF-8?B?...?=` encoded form, which *is* correct
- Email clients show `?????` instead of Korean — means encoding wasn't declared
- Korean works in body but not subject → missing `UTF-8` in MimeMessageHelper constructor

**Phase:** SMTP phase.

**Sources:** [Spring Thymeleaf email article](https://www.thymeleaf.org/doc/articles/springmail.html); [Baeldung Spring email templates](https://www.baeldung.com/spring-email-templates)

---

### Pitfall 19: Email body URL hardcoded to `http://localhost:5173`

**What goes wrong:**
`RegistrationEmailService.java:50` uses `@Value("${app.base-url:http://localhost:5173}")` — good. If `EmailService` for approvals skips this and hardcodes URLs (or uses `http://localhost:8080/...` pointing at backend, not frontend), emails sent from prod contain localhost links → completely broken.

**Why it happens:**
- Approval context doesn't currently have URL templating (stub mode)
- Developer adds hardcoded URL for testing, forgets to refactor

**How to avoid:**
- Inject `@Value("${app.base-url}")` into `EmailService` exactly like `RegistrationEmailService`.
- Compose URLs: `baseUrl + "/documents/" + document.getId()` — never backend URL.
- Validate `app.base-url` at startup: reject if contains `localhost` when `spring.profiles.active=prod`.

**Phase:** SMTP phase.

---

## Minor Pitfalls

### Pitfall 20: Dashboard counts fetching `findByIsActiveTrueOrderBySortOrder()` on every request

Current `DashboardService.java:73–75` loads all active templates every dashboard load just to build a `Map<String, String>` for template name lookup. 50 users × 10 loads/day × ~20 template queries = noise in query logs and extra JDBC round-trips.

**Prevention:** Cache template map in a `@PostConstruct` or `@Cacheable(unless = "#result.isEmpty()")` with invalidation on template CRUD. Template data changes rarely.

**Phase:** Dashboard phase.

---

### Pitfall 21: Keyword search uses `likeIgnoreCase` which triggers `LOWER()` function — index not used

Current `DocumentRepositoryCustomImpl.java:62–65` uses `.likeIgnoreCase(kw)` which QueryDSL translates to `LOWER(title) LIKE LOWER('%keyword%')`. Prevents index usage.

**Prevention:** `utf8mb4_unicode_ci` collation is already case-insensitive — use plain `.like(kw)` without `IgnoreCase`. The collation handles case. Verify with EXPLAIN.

**Phase:** Search phase.

---

### Pitfall 22: Missing composite index for search + pagination

Search with `status + templateCode + date range` has no composite index. Current indexes: `idx_drafter_status`, `idx_status`, `idx_template_code`, `idx_submitted_at`. None cover `(status, submitted_at DESC, template_code)` which is the hot sort order for paginated search.

**Prevention:** Profile actual queries on seed data (10k rows). Add composite index only if p95 exceeds 500ms. Don't pre-optimize.

**Phase:** Search phase (second iteration after baseline measurement).

---

### Pitfall 23: Dashboard "recent documents" fetches drafts of others when caller has ADMIN role

`DashboardService.getDashboardSummary(userId)` calls `findByDrafterId(userId, ...)` — correctly scoped to the caller. No bug *today*. But when Phase 1-C adds "부서 최근 문서" for ADMIN, a common refactor mistake is to reuse the same method with a different `userId`, returning that user's drafts.

**Prevention:** Separate method names: `findRecentByDrafterId(userId)` returns own drafts. `findRecentInDepartment(deptId, excludeDrafts=true)` scopes differently. Never pass `userId` as "actual drafter" vs "scope filter" polymorphically.

**Phase:** Dashboard phase (guideline for future expansion).

---

### Pitfall 24: WITHDRAW event recipients list doesn't deduplicate

`EmailService.determineRecipients` for WITHDRAW pulls all approval line members. If the same user appears as both APPROVE and REFERENCE line entries (edge case but possible?), they get 2 emails.

**Prevention:** Stream through `.distinct()` by `User.id` before sending. Apply to all event types defensively.

**Phase:** SMTP phase.

---

### Pitfall 25: Search result exposes `drafterId` in response → frontend can infer IDs of others

`DocumentResponse` projection includes `drafterId`. Not a leak per se (user saw the doc → they know who drafted), but encourages frontend to use raw IDs in UX. Minor coupling issue.

**Prevention:** Omit `drafterId` from `DocumentResponse`; use `drafterName + drafterDepartment` for display. Include `drafterId` only in detail response where needed.

**Phase:** Search phase (optional cleanup).

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|---|---|---|---|
| Keep `LIKE %kw%` instead of FULLTEXT | Simplest search; works with existing schema; no server config | Slows to seconds at 100k+ docs | Always acceptable at 50-user scale; revisit at 10k docs |
| No dedicated mail thread pool (share existing `micesign-async-` with core=2/max=5) | One fewer bean to manage | Queue saturation on bulk events; lost notifications under load | Acceptable for Phase 1-B ship; split in Phase 1-C monitoring work |
| No `@Cacheable` on dashboard summary | Simpler mental model; always-fresh data | Extra DB queries | Always at 50 users; revisit only on actual slow p95 |
| Skip GreenMail integration test; rely on manual MailHog test | Fast initial ship | Regression surface (Korean encoding, retry logic) silent | Never — GreenMail test takes ~2 hours to set up and prevents multiple incident classes |
| Log `Exception e` without classifying as transient/fatal in mail retry | Simple | Permanent failures retry forever; transient ones give up too fast | Never — takes 30 minutes to classify, saves hours of debug |
| No unique constraint on `notification_log(document_id, event_type, recipient_id)` | One fewer migration | Duplicate emails on retry | Never — write V19 migration before first real SMTP send |
| Reuse `ApprovalNotificationEvent` for non-approval events | Single event bus | Listener logic grows a switch statement; tests must cover unused paths | Never — create purpose-specific events |

---

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|---|---|---|
| Existing `AuditAspect` (AOP on AuthController) | Extending AOP pointcut to include document methods → duplicates service-level audit calls | Never. audit_log writes live in services only. AOP is for cross-cutting concerns like login/logout where no service call is natural. |
| Existing `ApplicationEventPublisher` in `ApprovalService` | Wrapping `publishEvent` with `try/catch` and swallowing | Publisher never throws for POJO events. Any catch is dead code that hides bugs. |
| Shared `ObjectMapper` bean across services | Using raw `.toString()` fallback in `AuditLogService.log` (line 51) if JSON fails | The fallback is already present; good. But it produces unparseable audit rows — fix by logging the failure with enough context to reconstruct. |
| `RegistrationEmailService` template engine | New template added without registering in Thymeleaf's resource scan path | All templates in `src/main/resources/templates/email/`. Tests must load them via `classpath:templates/email/*.html` to catch missing files early. |
| Flyway migration V-number collision | Two developers (or AI agents) both create V19 | Use `V{YYMMDD}_{seq}__description.sql` format if parallel work likely. Currently sequential numbers are safe for solo dev. |
| `@Transactional(readOnly = true)` inherited at class level (DashboardService, AuditLogService) | Method needs to write but inherits read-only → silent commit failure or `TransactionReadOnlyException` | Override at method level: `@Transactional` (not read-only) where writes happen, document why. |
| `ApprovalLine.approver` lazy-loaded → used in email body after transaction ends | `LazyInitializationException` in async thread | Fetch eagerly inside the service (before event publish), pass required data in the event payload rather than requery. Or use `JOIN FETCH` in listener's repository call. |

---

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|---|---|---|---|
| N+1 via `doc.getDrafter().getDepartment().getName()` in dashboard / search | SELECT count spikes proportional to page size | Projections with explicit joins | ~100 docs visible in list views |
| `countByDrafterIdAndStatus` called 4× in parallel on dashboard | 4 DB round-trips; latency stacks | Single native query: `SELECT SUM(IF(status='DRAFT',1,0)), SUM(IF(status='SUBMITTED',1,0)), ...` | Never "breaks" but dashboard p95 suffers at 1k+ docs |
| Dashboard queries not cached but fetched on every route change | DB load grows with user count + navigation | Frontend: `TanStack Query` with `staleTime: 30s` on dashboard query key | 50 users already noticeable if each navigates 50× / day |
| Email send blocks async thread for 500ms-2s | Thread pool saturation on peak | Separate mail executor; rate-limit; async non-blocking SMTP (JavaMail NIO — overkill here) | Bulk WITHDRAW with 6+ line members + concurrent approvals |
| Search OR'd predicates force full table scan | p95 degrades linearly with doc count | Cover index on `(status, submitted_at)` after baseline measurement | 10k+ documents |
| JPA dirty-checking on large `Page<Document>` content | Memory + CPU on read-only queries | `@Transactional(readOnly = true)` + DTO projection (existing code does this correctly) | 100+ docs per page |
| Thymeleaf template compilation not cached | Every email re-parses template | `spring.thymeleaf.cache: true` in prod (default is true — verify) | Mail throughput >10/sec |

---

## Security Mistakes

| Mistake | Risk | Prevention |
|---|---|---|
| Search returns DRAFT documents of others | Data leak of sensitive drafts | `WHERE status != 'DRAFT' OR drafter_id = :userId` always |
| Email link contains JWT or session token | Token leak via email client logs, audit_log URL capture | Link to webapp page; frontend handles auth |
| Preset JSON import stores HTML in label → rendered unsanitized in preview | XSS against admins → account takeover | DOMPurify on all string fields at import time |
| SMTP password logged in startup banner | Credential leak in log files | `logging.level.org.springframework.mail: WARN`; never log `JavaMailSenderImpl` config |
| Audit log `detail` field stores unserialized PII | Compliance issue; can't redact without modifying immutable log | Decide upfront what goes in `detail`; document in CLAUDE.md; no full request bodies |
| Email sent via SMTP reveals internal server via `Received:` header | Infrastructure disclosure | Use company SMTP relay / SES, not direct send from app server |
| `approval_line` EXISTS subquery not parameterized → SQL injection | Catastrophic | QueryDSL parameterizes by default; verify no raw string concat |
| Permission filter only on API layer, not in search count query | Count says "47" but shows "23" accessible → implies 24 hidden | Apply same permission predicate to both count and content query |

---

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---|---|---|
| Email subject too long, truncated in client: `[MiceSign] 결재 요청: GEN-2026-00...` | User can't tell which document | Put doc number first: `GEN-2026-0001 [MiceSign] 결재 요청: {title}` — trim title, never doc number |
| Email sent to reference lines (참조자) saying "결재 요청" | Confusing; references aren't asked to approve | Branch by line_type in recipient loop: REFERENCE → "[MiceSign] 참조: ..." subject + different template |
| Search loading spinner blocks entire page while typing | Keystroke lag | Debounce search input 300ms; keep previous results visible during refetch (TanStack Query `keepPreviousData`) |
| Filter resets scroll position on every change | Users lose context mid-browse | Preserve scroll via route state; apply filters via URL params (shareable) |
| Dashboard "결재 대기" count 0 but user sees pending items elsewhere | Count isn't live | Either invalidate on approval event OR match the count to the same query that drives the list |
| Email body Korean font fallback to system default | Different appearance per recipient OS | Use email-safe CJK font stack: `'Malgun Gothic','Apple SD Gothic Neo',sans-serif` (already present in existing templates — preserve) |
| Preset template replaces user's in-progress fields silently | Lost work | Confirmation dialog + undo (see existing Pitfall 6 from v1.1 PITFALLS.md) |

---

## "Looks Done But Isn't" Checklist

- [ ] **SMTP approval email**: Often missing permission filter on *who gets the email* — verify reference lines get different subject than approvers; verify final approver doesn't also get "next approver" email.
- [ ] **SMTP approval email**: Often missing idempotency — verify duplicate event fire doesn't double-send (unique constraint on `notification_log(document_id, event_type, recipient_id)`).
- [ ] **SMTP approval email**: Often missing UTF-8 MIME encoding — verify with GreenMail integration test that Korean subject decodes correctly.
- [ ] **SMTP approval email**: Often missing prod base URL config — grep for `localhost` in email templates/code; reject on startup if `app.base-url` still default in prod.
- [ ] **SMTP retry**: Often missing classification — verify transient (connection refused) retries; auth failure (bad password) doesn't.
- [ ] **Document search**: Often missing `EXISTS approval_line` clause — test with user who only has REFERENCE line access.
- [ ] **Document search**: Often missing `status != 'DRAFT'` except for own drafts — test "all" tab with admin role seeing other users' drafts.
- [ ] **Document search**: Often missing `countDistinct` — verify pagination totals match visible rows.
- [ ] **Document search**: Often missing index usage — EXPLAIN must show `range` not `ALL` for date range queries.
- [ ] **Dashboard summary**: Often missing permission on counts — verify USER and ADMIN see different numbers on same fixture.
- [ ] **Dashboard summary**: Often missing N+1 prevention — enable Hibernate statistics; assert ≤ 6 queries per dashboard load.
- [ ] **Dashboard summary**: Often missing cache invalidation — approve action must reflect in dashboard within same session.
- [ ] **Form expansion**: Often missing schema snapshot immutability — verify old documents render with old schema after template update.
- [ ] **Form expansion**: Often missing import validation — import preset with `<script>` in label and verify it's sanitized.
- [ ] **Form expansion**: Often missing field ID stability — rename label on existing field and verify documents still render.
- [ ] **Event integration**: Often missing dedup of audit — verify one DOC_APPROVE row per real action, not two.
- [ ] **Event integration**: Often missing LazyInitializationException handling — test listener accesses `document.drafter.department` without N+1 or LIE.

---

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---|---|---|
| Duplicate emails sent | LOW | Add unique constraint + dedup job to delete duplicate `notification_log` rows; communicate to users ("중복 발송 건에 대해 사과드립니다") |
| notification_log ghost PENDING rows | LOW | Scheduled job: `UPDATE notification_log SET status='FAILED' WHERE status='PENDING' AND created_at < NOW() - INTERVAL 10 MINUTE`; investigate root cause |
| Duplicate audit_log rows | MEDIUM | audit_log is *immutable* per PRD — can't delete. Add "duplicate" flag column; update query to deduplicate in read side. Prevent future via test. |
| Search returns wrong results | LOW | Rewrite searchDocuments with correct permission filter; add integration test; release hotfix |
| Dashboard counts stale under cache | LOW | Drop `@Cacheable`; accept slight DB cost; revisit with proper invalidation |
| Template schema mutated for existing documents | HIGH | Restore `template_schema_version` row from DB backup; recreate snapshot; document never modify-in-place rule |
| XSS injected via preset import | CRITICAL | Immediate rollback of affected templates; DOMPurify retroactively on render path; audit all admin accounts for compromise; rotate SUPER_ADMIN credentials |
| SMTP relay blacklisted | MEDIUM | Switch to backup provider (SES); investigate rate-limit breach; add outgoing rate limiter |
| Async queue saturation → lost events | HIGH | Events lost, can't replay easily (no event store). Recovery: scheduled job re-derives "what should have been sent" from `document` state vs `notification_log`; backfill. Prevent via dedicated executor + overflow policy. |

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|---|---|---|
| SMTP notification (Phase 1-B) | Pitfall 1: notification_log vs send ordering | PENDING-first pattern |
| SMTP notification | Pitfall 2: event chaining lost | One event per state change; forbid republish in listeners |
| SMTP notification | Pitfall 3: duplicate audit | Document the rule: audit in service, never in listener |
| SMTP notification | Pitfall 11: thread pool saturation | Dedicated mail executor |
| SMTP notification | Pitfall 12: SMTP creds leak | GreenMail for tests; env vars only; never commit |
| SMTP notification | Pitfall 13: email link race | Frontend-handled auth on deep links |
| SMTP notification | Pitfall 17: log insert blocks send | Insert PENDING before send, update after |
| SMTP notification | Pitfall 18: Korean subject garbled | MimeMessageHelper UTF-8 constructor |
| SMTP notification | Pitfall 19: localhost URL in prod | @Value base-url + startup validation |
| SMTP notification | Pitfall 24: duplicate recipients | `.distinct()` on recipient stream |
| Search/filter (Phase 1-B) | Pitfall 4: missing permission filter | Rewrite accessible predicate; integration test first |
| Search/filter | Pitfall 5: N+1 via lazy nav | Projections with explicit joins |
| Search/filter | Pitfall 7: FULLTEXT Korean broken | Stay with LIKE or configure ngram properly |
| Search/filter | Pitfall 8: DATE() function breaks index | atStartOfDay() pattern |
| Search/filter | Pitfall 15: JOIN duplicate in count | EXISTS subquery or countDistinct |
| Search/filter | Pitfall 21: likeIgnoreCase redundant | Plain .like() with utf8mb4_unicode_ci |
| Dashboard (Phase 1-B) | Pitfall 5: N+1 | Projections; Hibernate stats in dev |
| Dashboard | Pitfall 6: wrong permission scope | Separate count methods per role |
| Dashboard | Pitfall 14: stale cache | No cache initially; add with invalidation later |
| Dashboard | Pitfall 20: template map re-fetch | Cache template list with CRUD invalidation |
| Form expansion (Phase 1-B) | Pitfall 9: schema snapshot broken | Regression test for old docs + new template |
| Form expansion | Pitfall 10: XSS via imported preset | DOMPurify on import + render |

---

## Sources

- Direct codebase analysis: `backend/src/main/java/com/micesign/service/ApprovalService.java` (269 lines)
- Direct codebase analysis: `backend/src/main/java/com/micesign/service/DocumentService.java` (619 lines, search at 448–455)
- Direct codebase analysis: `backend/src/main/java/com/micesign/service/DashboardService.java` (96 lines)
- Direct codebase analysis: `backend/src/main/java/com/micesign/service/EmailService.java` (194 lines — stub-mode today)
- Direct codebase analysis: `backend/src/main/java/com/micesign/service/RegistrationEmailService.java` (189 lines — fully SMTP-wired, reference implementation)
- Direct codebase analysis: `backend/src/main/java/com/micesign/service/AuditLogService.java` (110 lines)
- Direct codebase analysis: `backend/src/main/java/com/micesign/aspect/AuditAspect.java` (85 lines)
- Direct codebase analysis: `backend/src/main/java/com/micesign/config/AsyncConfig.java` (38 lines — core=2 max=5 queue=100)
- Direct codebase analysis: `backend/src/main/java/com/micesign/repository/DocumentRepositoryCustomImpl.java` (127 lines)
- Direct codebase analysis: `backend/src/main/java/com/micesign/domain/NotificationLog.java`
- Direct codebase analysis: `backend/src/main/resources/application.yml` (mail config at lines 25–36)
- Direct codebase analysis: `backend/src/main/resources/db/migration/V6__add_pending_notification_status.sql`, `V16__extend_notification_log_for_registration.sql`
- Direct codebase analysis: existing email template `backend/src/main/resources/templates/email/registration-submit.html`
- PRD: `docs/PRD_MiceSign_v2.0.md` §9 (Notification), §10 (Audit), §11 (DB schema)
- FSD: `docs/FSD_MiceSign_v1.0.md` §8 (FN-NTF), §10 (FN-DASH), §11 (FN-SEARCH)
- Existing research: `.planning/research/PITFALLS.md` (v1.1 form builder pitfalls — preserved context)
- Spring docs: [Transaction-bound Events](https://docs.spring.io/spring-framework/reference/data-access/transaction/event.html)
- Spring GitHub: [#35395 nested @TransactionalEventListener](https://github.com/spring-projects/spring-framework/issues/35395), [#30679 detect invalid tx listener config](https://github.com/spring-projects/spring-framework/issues/30679)
- MariaDB docs: [ngram full-text parser](https://mariadb.com/kb/en/full-text-index-overview/); [Unicode charsets](https://mariadb.com/kb/en/unicode/); [utf8mb4_unicode_ci performance note](https://mariadb.com/kb/en/the-community-poor-performance-with-mariadb-11-and-utf8mb4_unicode_ci-vs-ut/)
- MySQL docs (MariaDB-compatible for fulltext): [ngram full-text parser 8.4](https://dev.mysql.com/doc/refman/8.4/en/fulltext-search-ngram.html); [Full-text restrictions](https://dev.mysql.com/doc/refman/8.0/en/fulltext-restrictions.html)
- QueryDSL: [Reference guide](http://querydsl.com/static/querydsl/4.0.8/reference/html_single/); [fetchCount deprecation issue #2504](https://github.com/querydsl/querydsl/issues/2504); [Duplicate WHERE with fetch join #3678](https://github.com/querydsl/querydsl/issues/3678)
- Thymeleaf: [Sending email with Thymeleaf official article](https://www.thymeleaf.org/doc/articles/springmail.html)
- Baeldung: [Spring Email templates](https://www.baeldung.com/spring-email-templates); [Spring Events](https://www.baeldung.com/spring-events)
- DZone: [Transaction Synchronization and Spring Application Events](https://dzone.com/articles/transaction-synchronization-and-spring-application)

---
*Pitfalls research for: MiceSign v1.2 Phase 1-B feature integration*
*Researched: 2026-04-22*

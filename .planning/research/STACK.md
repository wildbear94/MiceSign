# Stack Research — v1.2 Phase 1-B

**Domain:** In-house electronic approval (전자 결재) system — adding SMTP notifications, document search/filtering, enhanced dashboard, and extended form presets to an existing Spring Boot 3.5 + React 18 + MariaDB 10.11 codebase.
**Researched:** 2026-04-22
**Confidence:** HIGH
**Scale context:** ~50 concurrent users, single MariaDB instance, native deployment (no Docker, no cluster).

---

## TL;DR — Executive Decision

**This milestone requires ZERO new backend dependencies.** The v1.0/v1.1 codebase already ships every piece of infrastructure Phase 1-B needs: `spring-boot-starter-mail`, `spring-boot-starter-thymeleaf`, `spring-retry`, `spring-boot-starter-aop`, `@EnableAsync` via `AsyncConfig`, `NotificationLog` entity + repository, `EmailService` with `@TransactionalEventListener(AFTER_COMMIT) + @Async` skeleton, a working `RegistrationEmailService` using `MimeMessageHelper` + `SpringTemplateEngine` as a proven pattern, a QueryDSL-based `DocumentRepositoryCustomImpl.searchDocuments()` with keyword/status/template/date filters, and a functional `DashboardController` + `DashboardService` using Spring Data derived count queries. Phase 1-B is primarily a **completion/extension** effort, not a stack expansion.

**Frontend:** add at most one small dependency (`react-day-picker` v9 for date-range UI) and optionally `recharts` v3 if the dashboard grows beyond count cards to trend graphs. Everything else (date-fns, @hookform/resolvers, zod, TanStack Query, Zustand, i18next) is already installed.

**Search strategy:** keep QueryDSL + LIKE over indexed columns. Do **not** add FULLTEXT, Mroonga, Lucene, or Meilisearch — they are all overkill and/or unsuitable for 50-user Korean CJK workload at this scale. The FSD-SEARCH-001 spec explicitly defines `keyword` as LIKE over `title + docNumber`, not body full-text search, which removes the only case where a CJK tokenizer would have mattered.

---

## Verified: What Already Exists in the Codebase

Pre-research audit of `backend/build.gradle.kts`, `application.yml`, and `src/main/java/com/micesign/` found the following P1-B infrastructure already present:

| Capability | Status | Location |
|------------|--------|----------|
| `spring-boot-starter-mail` | Installed | `backend/build.gradle.kts:26` |
| `spring-boot-starter-thymeleaf` | Installed | `backend/build.gradle.kts:27` |
| `spring-retry` + `starter-aop` | Installed | `backend/build.gradle.kts:61-62` |
| `@EnableAsync` config | Wired | `backend/src/main/java/com/micesign/config/AsyncConfig.java` |
| `JavaMailSender` bean + SMTP config | Configured (host/port/auth/starttls) | `backend/src/main/resources/application.yml:25-36` |
| `NotificationLog` entity + repository + specification | Exists | `backend/src/main/java/com/micesign/domain/NotificationLog.java`, `repository/NotificationLogRepository.java` |
| Approval notification event type | Exists | `backend/src/main/java/com/micesign/event/ApprovalNotificationEvent.java` |
| `EmailService` with `@TransactionalEventListener(AFTER_COMMIT) + @Async` | Skeleton, currently **log-stub only** | `backend/src/main/java/com/micesign/service/EmailService.java` (note the stale FIXME on line 32: "When SMTP is configured, add spring-boot-starter-mail dependency" — the starter IS already in build.gradle, just not wired into `EmailService` yet) |
| `RegistrationEmailService` with real `MimeMessageHelper` + `SpringTemplateEngine` | **Working** — use as the reference pattern to convert `EmailService` | `backend/src/main/java/com/micesign/service/RegistrationEmailService.java` |
| Thymeleaf email templates (UTF-8) | 5 templates already in `backend/src/main/resources/templates/email/` | registration-submit/approve/reject, registration-admin-notify, budget-failure-notification |
| `DocumentRepositoryCustomImpl.searchDocuments()` with QueryDSL BooleanBuilder | Working (keyword LIKE, status, templateCode, dateFrom, dateTo, tab scope) | `backend/src/main/java/com/micesign/repository/DocumentRepositoryCustomImpl.java` |
| `DashboardController` + `DashboardService` (countByDrafterIdAndStatus) | Working | `backend/src/main/java/com/micesign/controller/DashboardController.java`, `service/DashboardService.java` |
| Document indexes: `(drafter_id, status)`, `status`, `submitted_at` | Present | `backend/src/main/resources/db/migration/V1__create_schema.sql:111-114` |

Conclusion: the remaining Phase 1-B work is **wiring, retry logic, new event emit sites, Thymeleaf template authoring, and UI polish** — not stack expansion.

---

## Recommended Stack — Phase 1-B Additions

### Backend: No New Dependencies

| Technology | Already on version | Reason no change |
|------------|--------------------|------------------|
| Spring Boot | 3.5.13 | Pulls in Spring Mail 6.2.x, Thymeleaf 3.1.x, Spring Retry 2.x auto-configured. |
| `spring-boot-starter-mail` | managed by Boot 3.5.13 | Ships `JavaMailSender` + `MimeMessageHelper`. All notification HTML + plaintext can be produced with this alone. |
| `spring-boot-starter-thymeleaf` | managed by Boot 3.5.13 | Already used by `RegistrationEmailService`. Add 5 new templates under `resources/templates/email/approval-*.html` (SUBMIT, APPROVE, FINAL_APPROVE, REJECT, WITHDRAW). |
| `spring-retry` | 2.x (managed) | For the "최대 2회 재시도" requirement. Use `@Retryable(maxAttempts = 3, backoff = @Backoff(delay = 300000L))` for 5-minute gaps, with `@Recover` writing `NotificationLog.status = FAILED`. |
| `spring-boot-starter-aop` | 3.5.13 | Required for `@Retryable` proxy; already present. |
| QueryDSL `jakarta` 5.1.0 | Installed | Already powers `searchDocuments()`. Sufficient for all FN-SEARCH-001 filters. |
| JPA Specifications | Via Spring Data | Already powers `NotificationLogSpecification` — confirms the team is comfortable with both styles. Keep Specifications for simple notification-log filtering, keep QueryDSL for document search. |
| Flyway | Managed by Boot | Needed for new migrations (additional composite indexes if benchmarks demand, new form-preset seeds). |

### Frontend: Minimal Additions

| Library | Version | Purpose | Why |
|---------|---------|---------|-----|
| **react-day-picker** | **9.1.x** | Date range picker for search filters ("상신일 시작/종료"), dashboard period filter | Modern, actively maintained, peer-depends on `date-fns` which is already installed (`date-fns@4.1.0`). Native Korean locale via `date-fns/locale/ko`. ~15-20 KB gzipped with tree-shaking. Headless-style, styles with Tailwind. Used by shadcn/ui if the team later adopts it. |
| **recharts** | **3.8.x** *(optional, only if dashboard adds charts)* | Simple bar/line/donut charts for the dashboard widgets if the team chooses to go beyond count cards | React-first, declarative, bundles only needed d3 submodules (~60-80 KB gzipped), works on React 18 & 19. Only add this if the dashboard scope genuinely expands past count cards per FSD-DASH-001; the FSD's current scope uses card counts + two lists, which need no chart lib. |

Neither of these is strictly required by FSD-DASH-001 or FSD-SEARCH-001 as currently written. If the dashboard stays at "counts + recent lists", skip both: native `<input type="date">` pairs are acceptable for date-range filters on a desktop-first 50-user intranet.

Already installed and sufficient (confirmed in `frontend/package.json`):

- `react-hook-form@7.72` + `@hookform/resolvers@5.2` + `zod@4.3` → search filter form state & validation
- `@tanstack/react-query@5.95` → dashboard data fetching, search result caching, `keepPreviousData` for paginated filters
- `axios@1.14` → API calls with JWT refresh interceptor already wired
- `date-fns@4.1` → date formatting, parsing, Korean locale
- `zustand@5.0` → keep filter-panel open/closed state if needed
- `lucide-react@1.7` → dashboard icons (FileText, Clock, CheckCircle, etc.)
- `sonner@2.0` → toast notifications on search errors / dashboard load failures
- `tailwindcss@3.4` → styling, grid for widget cards
- `i18next` + `react-i18next` → Korean copy on dashboard and search UI

### Development Tools (no change needed)

| Tool | Purpose | Notes |
|------|---------|-------|
| **Mailpit** (recommended for local dev) | Local SMTP server to receive notification emails during development | Install as a tiny Go binary or `brew install mailpit`, point `MAIL_HOST=localhost`, `MAIL_PORT=1025`. Web UI at `:8025`. Not a Gradle dep — a dev-machine tool. Drop-in replacement for MailHog. |
| **SpringDoc OpenAPI 2.8.16** | Already installed; document new `/api/documents/search` and `/api/dashboard` responses | No new work beyond adding `@Operation` / `@Schema` annotations on new DTOs. |

---

## Installation

Backend: **nothing to add.** Existing `build.gradle.kts` already has every starter required.

Frontend (only if you adopt the optional UI libs):

```bash
# Required — only if date-range UI is wanted beyond native <input type="date">
npm install react-day-picker@^9.1.0

# Optional — only if dashboard grows to include charts
npm install recharts@^3.8.0
```

Config work, not dependency work:

```yaml
# application.yml — add defaults, document required env vars
spring:
  mail:
    host: ${MAIL_HOST:}           # e.g. smtp.gmail.com, smtp.office365.com, or Mailpit localhost
    port: ${MAIL_PORT:587}
    username: ${MAIL_USERNAME:}
    password: ${MAIL_PASSWORD:}
    properties:
      mail:
        smtp:
          auth: true
          starttls:
            enable: true
            required: true
        mime:
          charset: UTF-8          # ensure Korean subjects/bodies encode correctly
app:
  mail:
    from: ${MAIL_FROM:no-reply@micesign.local}
    from-name: ${MAIL_FROM_NAME:MiceSign}
```

---

## Alternatives Considered

| Recommended | Alternative | When Alternative Would Win |
|-------------|-------------|---------------------------|
| QueryDSL + LIKE over indexed `(status, template_code, submitted_at, drafter_id)` | MariaDB FULLTEXT with `ngram` parser | **N/A in MariaDB.** The `ngram` parser is a **MySQL-only** feature; MariaDB's corresponding ticket [MDEV-10267](https://jira.mariadb.org/browse/MDEV-10267) is still open. MariaDB 10.11 FULLTEXT tokenizes by whitespace, which fails for Korean (no word boundaries). Do not rely on this. |
| QueryDSL + LIKE | **Mroonga storage engine** (Groonga-backed CJK full-text plugin) | If we ever needed full-text search over document **body** JSON and we outgrew LIKE. At 50 users with a title+docNumber LIKE spec (FSD-SEARCH-001 `keyword`), Mroonga is massive overkill: native Linux-x86_64-only plugin, requires storage-engine swap, separate maintenance. Revisit only if Phase 1-C+ adds body search AND data grows 10-100×. |
| QueryDSL + LIKE | **Meilisearch / Typesense / OpenSearch** | If we needed fuzzy search, typo tolerance, highlighting, or cross-table full-text at 10K+ docs with sub-100ms latency. At 50 users, adds an entire service to operate, index sync logic, and security surface. Hard pass for P1-B. |
| QueryDSL | **Pure JPA Specifications** | Specifications are fine for single-entity filters like `NotificationLogRepository` uses. For document search, which joins `document` × `user` × `department` × `position` × `approval_line` with multiple optional predicates and an EXISTS subquery for view permissions (FSD-SEARCH-001 WHERE clause), QueryDSL's type safety and fluent join syntax is clearly better and already the chosen pattern. |
| `JavaMailSender` + `MimeMessageHelper` | **Dedicated email API (SendGrid / Mailgun / Amazon SES) via REST** | If deliverability, bounce tracking, or transactional template management matters. For an internal intranet sending ≤ few hundred emails/day to coworkers on the same domain, SMTP via company relay (Office365 / Gmail Workspace / Postfix) is simpler and aligns with the "self-hosted, replace SaaS" goal of MiceSign. |
| Thymeleaf email templates | **Plain Java string templates** (text blocks / `String.format`) | For trivial plaintext mails. Since HTML formatting (subject line with `{docNumber} {title}`, clickable document link, Korean typography) is needed and Thymeleaf + Context is already working for `RegistrationEmailService`, reuse is the correct move. |
| Thymeleaf | **MJML / JMailBuilder / Premailer** | Only if emails needed to render across Outlook 2007/Gmail-clip-quirks with heavy CSS. For internal coworker notifications, Thymeleaf + simple inline styles is fine. |
| `@Retryable` + `@Recover` | Hand-rolled try/catch with a `retry_count` column + scheduled re-drive | Cleaner code; `@Recover` hook is the right place to flip `NotificationLog.status = FAILED`. Spring Retry is already on the classpath and used by `BudgetIntegrationService`. |
| Count queries for dashboard (Spring Data derived `countByDrafterIdAndStatus`) | Native SQL with `UNION ALL + GROUP BY` | Native would be 1 query vs current 3-5 queries. Worth it only if dashboard latency ever exceeds 200ms. At 50 users with correctly indexed `(drafter_id, status)` the current approach is well under the 1-second NFR. Revisit with JMeter if/when it becomes a problem. |
| `react-day-picker` v9 | `react-datepicker` v9.1, `@wojtekmaj/react-daterange-picker`, `react-date-range` | `react-datepicker` has the larger install base but bundles its own Popper/CSS and has a heavier footprint (~30 KB gzipped); `react-day-picker` v9 is leaner, uses date-fns (already installed), and is headless/Tailwind-friendly. |
| `recharts` (if needed) | `nivo`, `visx`, `Chart.js + react-chartjs-2` | recharts is declarative, React-idiomatic, and has the smallest learning curve for simple bar/donut charts. nivo is more beautiful but larger. visx/d3 is too low-level for "show me a count of pending approvals per week". |

---

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| **MariaDB FULLTEXT index with default parser** | Whitespace tokenizer fails on Korean (no word boundaries → zero matches on meaningful queries) | QueryDSL + LIKE `%keyword%` over `title`, `doc_number` (FSD-SEARCH-001 spec) |
| **MariaDB `WITH PARSER ngram`** syntax | The `ngram` parser is a MySQL feature; MariaDB does **not** implement it ([MDEV-10267](https://jira.mariadb.org/browse/MDEV-10267) open). Copy-pasting MySQL tutorials will silently fail or error at DDL time | QueryDSL + LIKE; if CJK full-text ever truly needed → Mroonga |
| **Mroonga storage engine for P1-B** | Requires root privileges to install the engine, storage-engine swap on target tables, x86_64-Linux-only, separate versioning from MariaDB. Completely out of proportion to "search by title + docNumber" | QueryDSL + LIKE |
| **Elasticsearch / OpenSearch / Meilisearch / Typesense** | Running a second stateful service for 50 users is a massive operational overhead (JVM heap tuning or Rust service lifecycle, index sync job, auth, backup, TLS) for a workload that SQL with 3 indexes handles in < 50 ms | QueryDSL + LIKE with proper composite indexes |
| **Apache Lucene directly** | Embeddable but requires writing custom analyzers for Korean, index management, and a completely parallel query pipeline from JPA | Same as above |
| **Hibernate Search** | Integrates Lucene with JPA but adds significant configuration, schema coupling, and still needs a CJK analyzer | Same as above |
| **`react-datepicker` (Hacker0x01)** for this project | Heavier install, bundles its own styles that fight Tailwind, separate `@types` package sometimes lagging | `react-day-picker@9` + `date-fns/locale/ko` (already installed) OR native `<input type="date">` (acceptable for intranet desktop) |
| **`date-fns-tz`** (timezone lib) | The spec deals with `LocalDate`/`LocalDateTime` in server default zone. No cross-timezone use case for a 50-person in-country deployment | date-fns without timezone add-on; let server return ISO strings and display in `Asia/Seoul` |
| **`moment`** | Legacy, mutable API, in maintenance-only mode since 2020 | date-fns (already installed) |
| **`recharts` if only count-cards are shown** | Paying 60-80 KB for nothing if the UI is just four `<Card>` widgets with numbers | Skip entirely; adopt only when actual chart requirements appear |
| **Apache Commons Email** | Outdated, not designed for Spring Boot, no async integration | `JavaMailSender` (already in `starter-mail`) |
| **Quartz Scheduler for retry** | Heavy; requires its own tables/scheduler threads | `@Retryable` + `@Backoff(delay = 300000L)` from Spring Retry, already on classpath |
| **RabbitMQ / Kafka for mail queue** | Adds a broker to the deployment for a workload that sends at most ~50 emails/day across 50 employees | In-process `@Async` + Spring Retry; persist failures in `notification_log` |
| **WebFlux / Reactor** for async mail | Adds paradigm shift across the codebase; existing AsyncConfig uses a `ThreadPoolTaskExecutor` which is exactly right | Keep servlet stack + `@Async` |
| **Dynamic form builder library** for extended forms | v1.1 already shipped a custom schema-driven renderer + calculation engine + JSON import/export | Extend existing `TEMPLATE_REGISTRY` with new preset templates authored in the v1.1 builder and exported as JSON |

---

## Stack Patterns by Variant

**If the dashboard stays at "count cards + two recent-items lists" (current FSD-DASH-001 scope):**
- Add **no** frontend charting library
- Use `<input type="date">` native inputs (or skip date filtering entirely on dashboard)
- Dashboard data = single `/api/v1/dashboard/summary` call → `useQuery` with 30-second stale time

**If the dashboard is extended with approval-throughput graphs or department-level breakdowns (scope creep beyond FSD):**
- Add `recharts@^3.8.0`
- Add one new endpoint `/api/v1/dashboard/analytics?period=30d` returning pre-aggregated series
- Still no Elasticsearch — these are at-most-weekly bucket aggregates and plain `GROUP BY DATE(submitted_at)` in MariaDB is sub-50-ms

**If the search UI needs visually rich date-range selection (both start + end in one popover):**
- Add `react-day-picker@^9.1.0` with Korean locale
- Reuse existing `@hookform/resolvers` + `zod` for filter-form validation

**If the search UI only needs two separate date inputs (minimal, desktop-first):**
- Skip `react-day-picker` entirely; two `<input type="date">` with React Hook Form is already type-safe

**If corporate SMTP relay is available (Office 365 / Gmail Workspace):**
- Point `spring.mail.host` at the relay; rely on relay for deliverability, SPF, DKIM
- No Sendgrid / SES needed

**If emails must leave the company network (external recipients):**
- Still keep SMTP config; route through corporate relay which handles external delivery
- Only if deliverability proves unreliable → Phase 2 consideration

**If Phase 1-B search latency fails the ≤ 1s NFR during load testing:**
- Add Flyway migration for composite index `(status, submitted_at DESC)` and covering index `(drafter_id, status, submitted_at DESC)`
- Verify `document(doc_number)` is indexed (likely present as UNIQUE constraint — check V1 DDL)
- Only consider FULLTEXT/Mroonga after indexes + query plans are exhausted AND body-text search becomes a requirement

---

## Version Compatibility

| Package A | Compatible With | Notes |
|-----------|-----------------|-------|
| Spring Boot 3.5.13 | Spring Mail 6.2.x, Thymeleaf-Spring6 3.1.x | Managed versions — don't override. |
| Spring Boot 3.5.13 | Spring Retry 2.0.x | Already pulled in via `spring-retry` coord. Verify `@EnableRetry` is on a `@Configuration` (likely on `AsyncConfig` or dedicated `RetryConfig`); without it, `@Retryable` annotations are inert. |
| Spring Boot 3.5.13 | jakarta.mail (Jakarta Mail 2.x) | Boot 3.x uses Jakarta EE 10 namespaces; legacy `javax.mail.*` code will not compile. All new imports must be `jakarta.mail.*` and `org.springframework.mail.javamail.*`. |
| Spring Boot 3.5.x | Java 17 | Supported (project uses Java 17 toolchain). Java 21 also works if upgraded, but no reason to change. |
| QueryDSL 5.1.0 `:jakarta` | Hibernate 6.x (Boot 3.5) | Works. The `:jakarta` classifier is **required** — this is already correctly set. |
| MapStruct 1.6.3 | Java 17, Lombok-free | Fine. Used already for existing DTO mappings; the new `ApprovalNotificationMapper` and `DashboardWidgetMapper` can follow the same pattern. |
| React 18.3 | react-day-picker 9.x | Officially supported. v9 also supports React 19 → future-proof. |
| React 18.3 | recharts 3.8.x | Officially supports React 17, 18, 19. |
| TanStack Query 5.95 | React 18.3 | Already working. |
| date-fns 4.1 | react-day-picker 9.x | `react-day-picker` v9 peer-depends on date-fns (compatible range includes 3.x/4.x). |
| Vite 8.0 | Tailwind 3.4, TypeScript 5.9 | Already working; no changes. |

---

## Specific Recommendations per Phase 1-B Feature

### 1. SMTP 이메일 알림 (FN-NTF-001)

**Libraries to use:** `JavaMailSender` + `MimeMessageHelper` + `SpringTemplateEngine` + `@TransactionalEventListener(AFTER_COMMIT)` + `@Async` + `@Retryable(maxAttempts=3, backoff=@Backoff(delay=300000L))` + `@Recover`. **All already on classpath.**

**Implementation plan:**
1. Inject `JavaMailSender` and `SpringTemplateEngine` into `EmailService` (mirror `RegistrationEmailService:44-65` pattern exactly).
2. Remove the `[EMAIL STUB]` log-only branch (`EmailService.java:103-104` and `:168-170`).
3. Extract the SMTP send into a private `@Retryable` method (not the `@TransactionalEventListener` itself — `@Retryable` on an async event listener is tricky; prefer `@Retryable` on a dedicated `sendMimeMessage(recipient, subject, htmlBody)` helper invoked from the listener). Remember: `@Retryable` and `@Async` on the same method cause proxy-chain issues — split them across methods.
4. Add `@Recover` method that writes `NotificationLog.status = FAILED` + `errorMessage`.
5. Add five Thymeleaf templates under `resources/templates/email/approval-{submit,approve,final-approve,reject,withdraw}.html` (UTF-8, Korean). Reuse the visual language from `registration-submit.html`.
6. Emit `ApprovalNotificationEvent` from `ApprovalService` and `DocumentService` at each state transition. The event class already exists; just publish it.
7. Add `@EnableRetry` to a `@Configuration` class (e.g., `AsyncConfig` or a new `RetryConfig`) if not already present.

**No new dependencies. No new tables.** `notification_log` already has `retry_count`, `status`, `error_message`, `sent_at` columns.

### 2. 문서 검색/필터링 (FN-SEARCH-001)

**Libraries to use:** Existing `DocumentRepositoryCustomImpl.searchDocuments()`. **No new library.**

**Implementation plan:**
1. Extend `DocumentSearchCondition` DTO to include `drafterId: Long?`, `departmentId: Long?` (per FSD spec — currently the repo only supports tab/keyword/status/templateCode/dateFrom/dateTo).
2. Extend `BooleanBuilder` where clauses in `searchDocuments()` for the two new filters.
3. Implement the FSD view-permission WHERE clause (drafter OR `EXISTS approval_line` OR `role=ADMIN && same dept` OR `role=SUPER_ADMIN`) AND `status != DRAFT` as a dedicated `BooleanExpression` helper in the same file. The existing `tab` parameter partially covers this — reconcile.
4. Add a new `/api/documents/search` endpoint (the existing `searchDocuments` appears to be used by internal tabs — keep both, or unify under role-aware access).
5. Flyway migration to add indexes **only if** load-testing shows a need:
   - `CREATE INDEX idx_doc_status_submitted ON document(status, submitted_at DESC);`
   - `CREATE INDEX idx_doc_template_status ON document(template_code, status);`
6. Performance target ≤ 1s at 50 users × realistic data (a few thousand documents in year 1). QueryDSL + LIKE + existing indexes handles this easily. Benchmark with actual data before adding indexes speculatively.

**No FULLTEXT, no ngram, no Mroonga, no Elasticsearch.**

### 3. 대시보드 고도화 (FN-DASH-001)

**Libraries to use:** Existing `DashboardService` + Spring Data derived count methods + TanStack Query on the frontend. **No new library.**

**Implementation plan:**
1. Extend `DashboardSummaryResponse` DTO to add any missing widgets (결재 대기, 내 결재 대기, 기안 진행중, 임시저장, 최근 승인완료) per FSD-DASH-001.
2. Add matching count methods to `DocumentRepository` / `ApprovalLineRepository` (`countByApproverIdAndStatus`, etc.).
3. If the team insists on a single-round-trip aggregation, write one custom repository method with a native `SELECT` that uses conditional aggregation: `SELECT SUM(CASE WHEN status = 'DRAFT' THEN 1 ELSE 0 END) AS draft_count, ...`. Only do this if the current multi-query version measures > 200 ms under load.
4. Optional: add `recharts` only if trend graphs / donut charts are in scope beyond count cards.

### 4. 양식 확장

**Libraries to use:** The v1.1 CUSTOM 빌더 (schema-driven renderer, Zod validation, conditional rules, calculation engine, JSON import/export). **No new library.**

**Implementation plan:**
1. Author new form presets as JSON schemas (휴가신청 연차/반차/특별휴가 variants, 경조사 신청서, 업무 협조 요청, 구매 요청, 출장 신청 등).
2. Import via the JSON import path validated in Phase 26.
3. Seed via Flyway SQL that inserts into `approval_template` + `approval_template_schema` rows.
4. Each preset ships with prefix, category, active flag, display order.

**No new hardcoded React components.** This is explicitly what v1.1 built the CUSTOM pipeline for.

---

## Sources

- [Spring Boot 3.5 reference docs — IO/Email](https://docs.spring.io/spring-boot/reference/io/email.html) — verified `spring-boot-starter-mail` properties, `JavaMailSender` auto-config, UTF-8 handling. HIGH confidence.
- [Thymeleaf + Spring email tutorial (official)](https://www.thymeleaf.org/doc/articles/springmail.html) — verified `SpringTemplateEngine` + `Context` + `MimeMessageHelper` pattern is still the idiomatic approach for Boot 3.x. HIGH confidence.
- [Spring Retry GitHub](https://github.com/spring-projects/spring-retry) — verified `@Retryable` + `@Backoff` + `@Recover` semantics. Codebase already uses this for budget API. HIGH confidence.
- [QueryDSL Baeldung guide](https://www.baeldung.com/querydsl-with-jpa-tutorial) + [QueryDSL vs JPA Criteria](https://www.baeldung.com/jpa-criteria-querydsl-differences) — verified BooleanBuilder pattern, type-safe projections. Codebase already uses this. HIGH confidence.
- [MariaDB MDEV-10267 — Add "ngram" support to MariaDB](https://jira.mariadb.org/browse/MDEV-10267) — **critical negative finding:** confirmed that MariaDB does NOT natively ship the ngram parser that MySQL has. Copy-pasting MySQL CJK full-text tutorials will not work on MariaDB 10.11. HIGH confidence.
- [About Mroonga — MariaDB Server docs](https://mariadb.com/docs/server/server-usage/storage-engines/mroonga/about-mroonga) + [Mroonga.org](https://mroonga.org/) — verified Mroonga exists as the CJK solution for MariaDB but requires plugin install, x86_64-Linux only, and is storage-engine-level. Rejected for 50-user scale. HIGH confidence.
- [react-day-picker v9 docs](https://daypicker.dev/) + [date-fns localization](https://daypicker.dev/localization/changing-locale) — verified Korean locale, date-fns 4.x compatibility, React 18/19 support, bundle profile. HIGH confidence.
- [react-datepicker npm](https://www.npmjs.com/package/react-datepicker) — verified v9.1.0, TypeScript built-in, ~30KB gzipped additional. Considered and rejected in favor of react-day-picker. MEDIUM confidence (bundle size exact number from third-party sources).
- [recharts npm](https://www.npmjs.com/package/recharts) + [PkgPulse Recharts vs Chart.js vs Nivo 2026](https://www.pkgpulse.com/blog/recharts-vs-chartjs-vs-nivo-vs-visx-react-charting-2026) — verified v3.8.x, React 17/18/19 support, declarative API. HIGH confidence.
- Codebase audit of `backend/build.gradle.kts`, `backend/src/main/resources/application.yml`, `backend/src/main/java/com/micesign/service/EmailService.java`, `RegistrationEmailService.java`, `DashboardController.java`, `DashboardService.java`, `DocumentRepositoryCustomImpl.java`, `db/migration/V1__create_schema.sql`, `frontend/package.json` — HIGH confidence on what is already installed and working.

---

## Integration Points with Existing Stack

| New Feature | Touches | Integration Detail |
|-------------|---------|---------------------|
| SMTP notifications | `EmailService.java`, `AsyncConfig.java`, `ApprovalService.java`, `DocumentService.java`, `resources/templates/email/` | Extend existing stub; publish `ApprovalNotificationEvent` from state-transition code paths; add 5 Thymeleaf templates. |
| Search endpoint | `DocumentRepositoryCustomImpl.java`, `DocumentSearchCondition`, new `DocumentSearchController` | Extend BooleanBuilder; add drafterId/departmentId; ensure role-based WHERE clause matches FSD-SEARCH-001. |
| Dashboard | `DashboardService.java`, `DashboardSummaryResponse`, `DocumentRepository`, `ApprovalLineRepository` | Add new count queries; expand response DTO; frontend adds widget cards. |
| Form presets | `approval_template` seed data, new Flyway migrations, v1.1 CUSTOM builder export | Pure data additions; no code. |

## Quality Gate Checklist

- [x] Versions are current (Spring Boot 3.5.13 LTS-track, React 18.3.1, react-day-picker 9.1, recharts 3.8, MariaDB 10.11 LTS)
- [x] Rationale addresses 50-user scale (rejected Elasticsearch/Mroonga/ngram, kept SQL + LIKE)
- [x] Integration with existing Spring Boot + React stack fully mapped (inventory of pre-existing infrastructure above)
- [x] Avoided overkill tools (no ES, no Lucene, no Mroonga, no broker)
- [x] Verified negative claim (MariaDB lacks ngram) via official MariaDB Jira source
- [x] Downstream consumer served: explicit library + version list, integration points, and NOT-to-add list

---
*Stack research for: MiceSign v1.2 Phase 1-B (SMTP notifications + document search/filter + enhanced dashboard + extended form presets)*
*Researched: 2026-04-22*

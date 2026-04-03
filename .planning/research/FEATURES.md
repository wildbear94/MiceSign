# Feature Landscape

**Domain:** Electronic approval system extension (SMTP notifications, search/filter, additional form templates, custom template builder)
**Researched:** 2026-04-03
**Existing system:** Full approval workflow with 3 hardcoded templates (GENERAL, EXPENSE, LEAVE), JWT auth, dashboard, audit trail

## Table Stakes

Features users expect when extending an approval system beyond MVP. Missing = the extension feels incomplete.

| Feature | Why Expected | Complexity | Dependencies on Existing | Notes |
|---------|--------------|------------|--------------------------|-------|
| **Email on submission** | Approvers must know they have a pending item; without notification they never check the system | Low | Approval workflow events, `notification_log` table (DDL exists), user email field | Spring Boot `JavaMailSender` + `@Async` + `@TransactionalEventListener` pattern already specified in FSD FN-NTF-001 |
| **Email on final approval** | Drafters need closure notification -- the whole point of the system is tracking document state | Low | Same as above | Same event infrastructure, different template |
| **Email on rejection** | Rejection requires immediate action (revise and resubmit) -- delay = business bottleneck | Low | Same as above | Must include rejection reason in email body |
| **Email on intermediate approval** | Next approver in sequence must be notified their turn has arrived | Low | Same as above | Triggered when previous step completes |
| **Email on withdrawal** | All approval line members must know the document is no longer active | Low | Same as above | Notify entire approval line per FSD spec |
| **Keyword search (title + doc number)** | 50 employees generating documents daily -- finding a specific document without search is unusable at scale | Medium | `document` table indexed on `title`, `doc_number`; QueryDSL already in stack | LIKE-based search is sufficient for ~50 users. Full-text search is overkill. |
| **Status filter** | Users need to quickly find SUBMITTED vs APPROVED vs REJECTED documents -- most common filtering pattern in any document management system | Low | `document.status` column, already ENUM | Simple WHERE clause, dropdown UI |
| **Date range filter** | Time-based queries are fundamental for auditing, monthly reports, finding recent submissions | Low | `document.submitted_at` indexed | Date picker component + QueryDSL predicate |
| **Template type filter** | When looking for expense reports vs leave requests, users filter by form type | Low | `document.template_code` column | Dropdown populated from `approval_template` table |
| **Paginated search results** | Search must paginate or it breaks with data growth | Low | Existing `Pagination.tsx` component and Spring `Page`/`Pageable` | Reuse existing pattern from document list |
| **Access control on search results** | Users must only see documents they are authorized to view (own drafts, approval line membership, ADMIN department scope, SUPER_ADMIN all) | Medium | Existing document viewing permission logic per FSD section 7.3 | FSD FN-SEARCH-001 specifies the exact WHERE clause with role-based filtering |
| **Purchase Request form (구매요청서)** | Named in PRD 5.1 as planned template; common approval document in Korean corporate culture | Medium | Template registry pattern, `DocumentFormValidator` switch-case, `approval_template` seed data | Fields: items table (품명, 규격, 수량, 단가, 금액), supplier info, delivery date, total, purpose |
| **Business Trip Report (출장보고서)** | Named in PRD 5.1; trips require pre-approval and post-reporting in Korean companies | Medium | Same as above | Fields: destination, period (start/end date), purpose, schedule, expenses breakdown, results/findings |
| **Overtime Request (연장근무신청서)** | Named in PRD 5.1; overtime approval is legally required in Korea (Labor Standards Act) | Medium | Same as above | Fields: date, planned hours, start/end time, reason, estimated overtime pay |

## Differentiators

Features that add significant value beyond basic expectations. Not required, but elevate the system.

| Feature | Value Proposition | Complexity | Dependencies on Existing | Notes |
|---------|-------------------|------------|--------------------------|-------|
| **Custom Template Builder (drag and drop)** | Admin can create new form types without developer deployment; reduces time-to-new-form from "developer sprint" to "30 minutes" | **VERY HIGH** | Requires: new `form_schema` JSON column on `approval_template`, JSON schema-driven rendering engine, schema-driven backend validation, drag-and-drop builder UI | Paradigm shift from hardcoded approach. See Anti-Features for scope guidance. |
| **Drafter name search** | Search by who drafted the document -- useful for managers reviewing team submissions | Low | JOIN to `user` table on `drafter_id`, existing user data | FSD FN-SEARCH-001 already includes `drafterId` parameter |
| **Department filter on search** | ADMIN users see department documents; SUPER_ADMIN filters cross-department | Low | JOIN to `user.department_id`, department dropdown | FSD FN-SEARCH-001 includes `departmentId` parameter |
| **Notification failure dashboard** | SUPER_ADMIN sees failed emails at a glance | Low | `notification_log` table with `status=FAILED` already designed in DDL | PRD places this in Phase 1-C but it is simple to add |
| **Email retry manual trigger** | Admin can retry a failed notification | Low | `notification_log` record provides all info to reconstruct and resend | Useful for transient SMTP failures |
| **Notification retry automation** | Failed emails retry automatically up to 2 times with 5-minute intervals | Medium | Spring `@Scheduled` or `@Retryable` mechanism | FSD FN-NTF-001 specifies this policy explicitly |
| **Template metadata admin (FN-TPL-002)** | Admin manages template name, description, active/inactive status without code changes | Low | `approval_template` table already has these columns, needs CRUD API + admin UI | FSD specifies this for P1B; enables admin to deactivate unused templates |

## Anti-Features

Features to explicitly NOT build in this milestone.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| **Full custom template builder in v1.1** | The current architecture uses hardcoded React components (`GeneralForm.tsx`, `ExpenseForm.tsx`, etc.) with a switch-case `DocumentFormValidator` on the backend. A drag-and-drop builder requires: (1) JSON schema definition language for field types, validation rules, and layout; (2) drag-and-drop UI with field palette, canvas, and property editors; (3) schema-to-form renderer replacing all hardcoded components; (4) schema-driven backend validation replacing `DocumentFormValidator`; (5) preview and test mode; (6) schema versioning for documents created before schema changes. This is 3-5x the effort of all other v1.1 features combined and fundamentally changes the architecture. If a builder library (SurveyJS, FormEngine) is used, it becomes a significant new dependency that constrains the entire form UX. | **Separate milestone.** For v1.1, add the 3 hardcoded templates following the established pattern. Evaluate builder need after v1.1 -- with ~10-15 total form types, hardcoded templates may be sufficient permanently for a 50-person company. |
| **In-app notification center (bell icon + real-time)** | FSD specifies email-only for Phase 1-B. In-app notifications require WebSocket/SSE infrastructure, notification read/unread state management, UI overlay component, and a different UX paradigm. | Email notifications only. Dashboard badge counts already show pending items. |
| **Full-text search (Elasticsearch/MariaDB FULLTEXT)** | ~50 employees producing maybe 1000-2000 documents per year. SQL LIKE with proper indexing handles this volume trivially. Full-text search adds infrastructure complexity (Elasticsearch) or marginal benefit (MariaDB FULLTEXT) for zero user benefit at this scale. | SQL LIKE on title + doc_number via QueryDSL. Revisit only if data exceeds 50K+ documents. |
| **Push notifications (browser/mobile)** | Requires service worker registration, push subscription management, notification permission UX. Email covers the need for 50 users. | Email is sufficient. |
| **Rich text search (inside document body)** | Requires indexing `document_content.body_html` and `form_data` JSON -- complex, slow, rarely needed since users search by title/number. | Search title and doc number only. |
| **Notification template admin UI** | Admin editing email HTML templates in WYSIWYG. Over-engineering for 5 email types that change rarely. | Hardcode Thymeleaf templates in `src/main/resources/templates/email/`. Developer updates when needed. |
| **Auto-complete / typeahead search** | Real-time search-as-you-type adds API complexity (debouncing, partial match) for minimal gain with 50 users. | Standard search form with submit button and filters. |
| **Email opt-out preferences** | 50 users, all approval notifications are business-critical. Opt-out creates risk of missed approvals. | Send all notifications. No user preferences needed at this scale. |
| **Search result export (Excel)** | Nice-to-have but not needed for v1.1 core scope. | Defer to Phase 1-C with statistics/reports. |

## Feature Dependencies

```
SMTP Email Notifications (independent track):
  SMTP Config (application.yml) 
    --> Spring Mail + JavaMailSender bean
      --> Thymeleaf email templates (5 types)
        --> ApprovalEvent / NotificationEvent classes
          --> @TransactionalEventListener + @Async handler
            --> NotificationService (send + log to notification_log)
              --> Retry mechanism (max 2 retries, 5 min interval)
  No dependency on search or new templates. Can build first.

Document Search/Filter (depends on existing document list):
  Backend: QueryDSL dynamic predicates + access control WHERE clause
    --> GET /api/documents/search endpoint
  Frontend: Refactor DocumentListPage.tsx 
    --> Add filter bar (keyword, status dropdown, template dropdown, date range, drafter)
    --> Reuse existing DocumentListTable + Pagination components
  Depends on: existing document list page for UI patterns.

Additional Templates (3 independent tracks, parallelizable):
  Per template:
    Backend: Flyway migration (seed approval_template row)
      --> DocumentFormValidator new case
    Frontend: FormComponent.tsx + ReadOnlyComponent.tsx
      --> templateRegistry.ts entry (editComponent + readOnlyComponent + label + icon)
  Each template is fully independent. Can build all 3 in parallel.
  No cross-dependencies with notifications or search.

Template Metadata Admin (FN-TPL-002):
  Backend: CRUD API for approval_template table
  Frontend: Admin page for template management
  Depends on: approval_template table (exists)

Custom Template Builder (DEFER -- separate milestone):
  Would depend on all hardcoded template patterns being stable first.
  JSON Schema Design --> DB migration (form_schema column)
    --> Builder UI (drag-and-drop, field palette, property editors)
      --> Schema-driven Renderer (replaces hardcoded components)
        --> Schema-driven Validator (replaces DocumentFormValidator switch)
          --> Versioning strategy for existing documents
```

## MVP Recommendation for v1.1

### Wave 1: Independent features (build in parallel)

1. **SMTP Email Notifications** -- Highest user impact. Approvers currently rely on checking the dashboard manually. Spring Mail + Thymeleaf + `@Async` event listener is a well-established Spring Boot pattern. 5 event types (submit, intermediate approve, final approve, reject, withdraw), 5 Thymeleaf HTML email templates. Uses existing `notification_log` table DDL. Estimated effort: 2-3 days.

2. **3 Additional Form Templates** -- Follow the established pattern exactly. Each template requires: 1 edit form component + 1 read-only component + 1 templateRegistry entry + 1 backend validator case + 1 Flyway seed migration. 6 existing template files serve as reference (`GeneralForm.tsx`, `GeneralReadOnly.tsx`, etc.). Estimated effort: 1-2 days per template.

### Wave 2: Builds on existing document list

3. **Document Search/Filter** -- Refactor `DocumentListPage.tsx` to add a filter bar above the table. Backend: new `GET /api/documents/search` endpoint with QueryDSL dynamic predicates and the role-based access control WHERE clause specified in FSD FN-SEARCH-001. Frontend: keyword input, status multi-select, template dropdown, date range picker, optional drafter filter. Estimated effort: 3-4 days.

### Wave 3: Admin features (lower priority)

4. **Template Metadata Admin (FN-TPL-002)** -- CRUD API + admin UI for managing `approval_template` records (name, description, active/inactive, sort order). Estimated effort: 1-2 days.

### Defer to separate milestone

5. **Custom Template Builder** -- Architecturally distinct from the current hardcoded approach. Requires its own research, architecture design, and multi-phase implementation. Recommend completing v1.1 first, then evaluating whether a builder is truly needed. For a 50-person company with 6-10 form types, hardcoded templates may be permanently sufficient -- each new template takes a developer 1-2 days, which is acceptable cadence.

## Complexity Assessment

| Feature | Backend | Frontend | Total Effort | Risk |
|---------|---------|----------|-------------|------|
| SMTP Notifications (5 event types) | Medium (event system, async handler, retry, Thymeleaf templates) | None (backend-only, no UI changes) | **Medium** (2-3 days) | Low -- well-documented Spring Boot pattern |
| Purchase Request template | Low (validator case + seed data) | Medium (form with items table + readonly) | **Medium** (1-2 days) | Low -- follows established pattern |
| Business Trip Report template | Low (validator case + seed data) | Medium (form with date range + expenses + readonly) | **Medium** (1-2 days) | Low -- follows established pattern |
| Overtime Request template | Low (validator case + seed data) | Low-Medium (simpler form + readonly) | **Low-Medium** (1 day) | Low -- simplest of the 3 new templates |
| Document Search/Filter | Medium (QueryDSL dynamic predicates, access control) | Medium (filter bar UI, state management, URL params) | **Medium** (3-4 days) | Low -- QueryDSL handles dynamic queries well |
| Template Metadata Admin | Low (standard CRUD) | Low (admin table page) | **Low** (1-2 days) | Low -- follows existing admin CRUD pattern |
| Custom Template Builder | **HIGH** (schema validation engine, migration) | **VERY HIGH** (drag-drop builder, schema renderer, field palette) | **Very High** (2-4 weeks+) | **HIGH** -- architectural paradigm change, needs own milestone |

## Form Template Details

### Purchase Request (구매요청서) -- Code: PURCHASE, Prefix: PUR

```json
{
  "type": "PURCHASE",
  "purpose": "회의실 장비 교체",
  "desiredDate": "2026-04-15",
  "supplier": "삼성전자 B2B",
  "items": [
    {
      "name": "모니터 27인치",
      "specification": "S27A600NWK",
      "quantity": 5,
      "unitPrice": 350000,
      "amount": 1750000
    }
  ],
  "totalAmount": 1750000,
  "note": "기존 장비 5년 경과로 교체 필요"
}
```

### Business Trip Report (출장보고서) -- Code: BUSINESS_TRIP, Prefix: BTR

```json
{
  "type": "BUSINESS_TRIP",
  "destination": "부산 해운대 컨벤션센터",
  "startDate": "2026-04-10",
  "endDate": "2026-04-11",
  "days": 2,
  "purpose": "2026 IT 컨퍼런스 참석",
  "schedule": "4/10 오전: 세미나 참석, 오후: 부스 방문\n4/11 오전: 워크숍, 오후: 복귀",
  "expenses": [
    { "category": "교통비", "amount": 120000, "note": "KTX 왕복" },
    { "category": "숙박비", "amount": 150000, "note": "비즈니스호텔 1박" },
    { "category": "식비", "amount": 50000, "note": "2일간 식사" }
  ],
  "totalExpense": 320000,
  "results": "신규 솔루션 3건 조사 완료, 담당자 연락처 확보"
}
```

### Overtime Request (연장근무신청서) -- Code: OVERTIME, Prefix: OVT

```json
{
  "type": "OVERTIME",
  "date": "2026-04-05",
  "startTime": "18:00",
  "endTime": "22:00",
  "hours": 4,
  "reason": "분기 마감 보고서 작성 및 데이터 검증",
  "note": ""
}
```

## Sources

- PRD v2.0 sections 5.1 (template structure), 9.1-9.2 (notification system)
- FSD v1.0 sections FN-NTF-001 (email notification spec), FN-SEARCH-001 (search spec), FN-TPL-002 (template admin), FN-TPL-003 (form data schemas)
- Existing codebase: `templateRegistry.ts` (registry pattern), `DocumentFormValidator.java` (backend validation pattern), `DocumentListPage.tsx` (current list without search)
- [Spring Boot Email with Thymeleaf -- Thymeleaf official](https://www.thymeleaf.org/doc/articles/springmail.html)
- [Spring Boot SMTP Setup](https://oneuptime.com/blog/post/2025-12-22-spring-boot-email-sending/view)
- [Async Email in Spring Boot](https://medium.com/@samyakmoon855/send-email-notification-using-springboot-part-2-asynchronous-approach-using-async-annotation-05d10cad5ae5)
- [SurveyJS Form Builder Comparison 2025](https://surveyjs.io/stay-updated/blog/top-5-open-source-form-builders-in-2025) (context for template builder evaluation)
- [FormEngine React Form Builder](https://formengine.io/) (context for template builder evaluation)

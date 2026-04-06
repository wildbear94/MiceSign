# Roadmap: MiceSign

## Milestones

- ~~**v1.0 MVP**~~ - Phases 1-8 (shipped 2026-04-03)
- ~~**v1.1 Extended Features**~~ - Phases 9-11 (shipped 2026-04-04)
- **v1.2 Custom Template Builder** - Phases 12-17 (in progress)

## Phases

<details>
<summary>v1.0 MVP (Phases 1-8) - SHIPPED 2026-04-03</summary>

- [x] **Phase 1: Project Foundation** - Spring Boot + React scaffolding, database schema, seed data, dev tooling (completed 2026-03-31)
- [x] **Phase 2: Authentication** - JWT login/logout, token refresh, account lockout, password management
- [x] **Phase 3: Organization Management** - Department/position CRUD, user management, RBAC enforcement
- [x] **Phase 4: Document Core & Templates** - Document drafting with three form templates, draft CRUD, document viewing
- [x] **Phase 5: File Attachments** - Google Drive integration for upload, download, and validation
- [x] **Phase 6: Document Submission & Numbering** - Submit workflow, document immutability, concurrent-safe numbering
- [x] **Phase 7: Approval Workflow** - Approval line editor, sequential processing, approve/reject, withdrawal, resubmission
- [x] **Phase 8: Dashboard & Audit** - Pending approvals list, recent documents, badge counts, audit trail logging

### Phase 1: Project Foundation
**Goal**: A runnable Spring Boot + React project with all dependencies wired, database schema migrated, and seed data loaded on first run
**Depends on**: Nothing (first phase)
**Requirements**: ORG-05
**Success Criteria** (what must be TRUE):
  1. Spring Boot backend starts and responds to health check endpoint
  2. React frontend loads in browser with dev proxy to backend API
  3. Database schema is created via Flyway migration on first startup
  4. Default departments, positions, and SUPER_ADMIN account exist after first run
  5. SpringDoc OpenAPI (Swagger UI) is accessible for API exploration
**Plans:** 3/3 plans complete
Plans:
- [x] 01-01-PLAN.md — Backend scaffolding: Gradle project, Spring Boot config, Flyway migrations (DDL + seed data), API envelope
- [x] 01-02-PLAN.md — Frontend scaffolding: Vite + React 18 + TypeScript, TailwindCSS with Pretendard font, Axios client
- [x] 01-03-PLAN.md — Integration tests (health check + seed data), .gitignore, full-stack verification

### Phase 2: Authentication
**Goal**: Users can securely log in, maintain sessions across browser refreshes, and manage their passwords
**Depends on**: Phase 1
**Requirements**: AUTH-01, AUTH-02, AUTH-03, AUTH-04, AUTH-05, AUTH-06, AUTH-07
**Success Criteria** (what must be TRUE):
  1. User can log in with email/password and receive a working session
  2. Session persists across browser refresh without re-login (auto-refresh from HttpOnly cookie)
  3. User can log out and cannot access protected pages afterward
  4. Account locks after 5 consecutive failed login attempts and unlocks after 15 minutes
  5. User can change their own password; admin can reset another user's password
**Plans:** 4/4 plans complete
Plans:
- [x] 02-01-PLAN.md — Backend JWT infrastructure: jjwt deps, V3 migration, JPA entities, SecurityConfig, AuthController/AuthService (login/refresh/logout/lockout)
- [x] 02-02-PLAN.md — Backend password management: PasswordService/Controller + full integration test suite
- [x] 02-03-PLAN.md — Frontend auth core: i18n infrastructure, Zustand store, Axios JWT interceptor, React Router, login page UI
- [x] 02-04-PLAN.md — Frontend password change page, admin reset/unlock UI, end-to-end verification checkpoint

### Phase 3: Organization Management
**Goal**: Admins can manage the company structure (departments, positions, users) and the system enforces role-based access
**Depends on**: Phase 2
**Requirements**: ORG-01, ORG-02, ORG-03, ORG-04
**Success Criteria** (what must be TRUE):
  1. Admin can create, edit, and deactivate departments in a hierarchical tree
  2. Admin can create, edit, and deactivate positions with sort ordering
  3. Admin can create and manage user accounts with all required fields (employee no, name, email, department, position, role, status)
  4. SUPER_ADMIN has full access, ADMIN manages org + own dept docs, USER can draft and approve only
**Plans:** 4/4 plans complete
Plans:
- [x] 03-01-PLAN.md — Backend: JPA entities, repositories, DTOs, services, controllers, RBAC logic, integration tests
- [x] 03-02-PLAN.md — Frontend infrastructure: types, API clients, hooks, admin layout/sidebar, routing, shared components
- [x] 03-03-PLAN.md — Frontend department tree page + position drag-and-drop table page
- [x] 03-04-PLAN.md — Frontend user list/detail pages with Phase 2 integration, end-to-end verification
**UI hint**: yes

### Phase 4: Document Core & Templates
**Goal**: Users can create, edit, and view draft documents using three form templates (General, Expense, Leave)
**Depends on**: Phase 3
**Requirements**: DOC-01, DOC-02, DOC-05, DOC-06, TPL-01, TPL-02, TPL-03
**Success Criteria** (what must be TRUE):
  1. User can create a new draft by selecting one of three templates (General, Expense, Leave)
  2. General form supports title, rich text body, and attachment placeholders
  3. Expense form supports item table with quantity/unit price/amount and auto-sum calculation
  4. Leave form supports leave type selection, date range, auto-calculated days, and reason
  5. User can view a list of their documents with current status and open any document's detail page
**Plans:** 3/3 plans complete
Plans:
- [x] 04-01-PLAN.md — Backend: V5 migration, JPA entities, DTOs, services, controllers, document CRUD API with form validation, integration tests
- [x] 04-02-PLAN.md — Frontend infrastructure: Tiptap/date-fns deps, TypeScript types, API clients, hooks, Zod schemas, MainLayout/navbar, routing
- [x] 04-03-PLAN.md — Frontend UI: Tiptap editor, 3 template forms (edit + read-only), template selection modal, document list/editor/detail pages, checkpoint

**UI hint**: yes

### Phase 5: File Attachments
**Goal**: Users can attach files to documents via Google Drive, download them with access control, and the system enforces upload limits
**Depends on**: Phase 4
**Requirements**: FILE-01, FILE-02, FILE-03
**Success Criteria** (what must be TRUE):
  1. User can upload files that are stored in Google Drive via Service Account
  2. User can download attachments only if they are an authorized viewer of the document
  3. System rejects uploads exceeding 50MB per file, 10 files per document, or 200MB total, and blocks disallowed extensions
**Plans:** 3/3 plans complete
Plans:
- [x] 05-01-PLAN.md — Backend: Google Drive config, JPA entity, services, controller endpoints, integration tests with mocked Drive
- [x] 05-02-PLAN.md — Frontend: TypeScript types, API client, hooks, attachment components (FileDropZone, FileItem, FileAttachmentArea, useFileUpload)
- [x] 05-03-PLAN.md — Frontend integration: replace placeholders in all template forms + detail page, end-to-end checkpoint

### Phase 6: Document Submission & Numbering
**Goal**: Users can submit drafts, triggering immutable locking and document number assignment with race-condition protection
**Depends on**: Phase 5
**Requirements**: DOC-03, DOC-04, DOC-07
**Success Criteria** (what must be TRUE):
  1. User can submit a draft document, changing its status from DRAFT to SUBMITTED
  2. Submitted document body, attachments, and approval line are fully locked and cannot be modified
  3. Document number (PREFIX-YYYY-NNNN) is assigned at submission with no duplicates under concurrent submissions
**Plans:** 2/2 plans complete
Plans:
- [x] 06-01-PLAN.md — Backend: DocSequence entity, pessimistic lock numbering, submit endpoint, immutability enforcement (403), Google Drive file move
- [x] 06-02-PLAN.md — Frontend: submit button + confirmation dialog, useSubmitDocument hook, document number display in list/detail pages, checkpoint

### Phase 7: Approval Workflow
**Goal**: Users can build approval lines, process approvals sequentially, and handle rejections, withdrawals, and resubmissions
**Depends on**: Phase 6
**Requirements**: APR-01, APR-02, APR-03, APR-04, APR-05, APR-06, APR-07
**Success Criteria** (what must be TRUE):
  1. User can build an approval line by selecting approvers from the org tree with APPROVE, AGREE, and REFERENCE types
  2. APPROVE and AGREE steps process sequentially; REFERENCE recipients get immediate read access
  3. Approver can approve or reject with optional comment; rejection immediately sets document to REJECTED
  4. Final approval sets document to APPROVED; the complete state machine (DRAFT, SUBMITTED, APPROVED, REJECTED, WITHDRAWN) works correctly
  5. Drafter can withdraw a submitted document if the next approver has not acted, and can create a new pre-filled document from rejected or withdrawn documents
**Plans:** 5/5 plans complete
Plans:
- [x] 07-01-PLAN.md — Backend: ApprovalLine entity, enums, repository, DTOs, approval line save/load with document, ApprovalService (approve/reject/sequential), ApprovalController, integration tests
- [x] 07-02-PLAN.md — Backend: Withdrawal endpoint with step validation, resubmission endpoint copying content + approval line, integration tests
- [x] 07-03-PLAN.md — Frontend: Approval types/API/hooks, approval line editor with org tree and drag-and-drop, document editor integration
- [x] 07-04-PLAN.md — Frontend: Approval status display (vertical step list), action bar (approve/reject/withdraw/resubmit), comment dialog, document detail integration
- [x] 07-05-PLAN.md — Frontend: Pending approvals page, completed documents page, routing, navigation, end-to-end checkpoint
**UI hint**: yes

### Phase 8: Dashboard & Audit
**Goal**: Users have a home screen showing pending work and recent activity, and all document state changes are recorded in an immutable audit trail
**Depends on**: Phase 7
**Requirements**: DASH-01, DASH-02, DASH-03, AUD-01
**Success Criteria** (what must be TRUE):
  1. User sees a list of documents pending their approval action on the dashboard
  2. User sees their recent documents with current status on the dashboard
  3. Badge counts display for pending approvals, in-progress drafts, and completed documents
  4. All document state changes (create, submit, approve, reject, withdraw) and key user actions (login, logout, file operations, admin edits) are recorded in immutable audit log entries
**Plans:** 3/3 plans complete
Plans:
- [x] 08-01-PLAN.md — Backend: Dashboard summary endpoint, AuditLogService, AuditAction constants, AOP auth logging, audit insertion points, audit query endpoint
- [x] 08-02-PLAN.md — Frontend: Dashboard page (count cards, pending list, recent docs), navbar badge, routing changes, visual checkpoint
- [x] 08-03-PLAN.md — Frontend: Audit log admin UI (SUPER_ADMIN filters, table, pagination, routing)
**UI hint**: yes

</details>

<details>
<summary>v1.1 Extended Features (Phases 9-11) - SHIPPED 2026-04-04</summary>

- [x] **Phase 9: SMTP Email Notifications** - Event-driven email notifications for all document state changes with retry and delivery logging (completed 2026-04-03)
- [x] **Phase 10: Additional Form Templates** - Purchase request, business trip report, overtime request forms with validator refactoring (completed 2026-04-04)
- [x] **Phase 11: Document Search & Filter** - Keyword search, status/date/template filters with role-based access control (completed 2026-04-04)

### Phase 9: SMTP Email Notifications
**Goal**: Users receive email notifications for all approval workflow events so they never miss a pending action or status change
**Depends on**: Phase 8 (v1.0 complete)
**Requirements**: NTF-01, NTF-02, NTF-03, NTF-04, NTF-05
**Success Criteria** (what must be TRUE):
  1. Approver receives email when a document arrives for their approval action
  2. Drafter receives email when their document is approved, rejected, or withdrawn
  3. All approvers in a workflow receive email when a document is initially submitted
  4. Failed email deliveries are retried automatically (up to 2 retries) without blocking the approval transaction
  5. All notification attempts (success and failure) are recorded in the notification_log table and visible to SUPER_ADMIN
**Plans:** 3/3 plans complete
Plans:
- [x] 09-01-PLAN.md — Backend core: Gradle deps, AsyncConfig, Flyway migration, enums, entity, event class, EmailService, NotificationService, Thymeleaf templates, event publishing
- [x] 09-02-PLAN.md — Backend admin API: NotificationLogSpecification, DTO, Controller (list + resend), integration tests
- [x] 09-03-PLAN.md — Frontend: notification feature module (types, API, hooks, components, page), sidebar + routing, visual checkpoint

### Phase 10: Additional Form Templates
**Goal**: Users can draft documents using three new form templates (purchase request, business trip report, overtime request), expanding coverage to all common Korean corporate approval types
**Depends on**: Phase 8 (v1.0 complete)
**Requirements**: TPL-04, TPL-05, TPL-06
**Success Criteria** (what must be TRUE):
  1. User can create a purchase request with item table, auto-sum, and evidence attachments
  2. User can create a business trip report with itinerary, expense breakdown, and attachments
  3. User can create an overtime request with date, hours, reason, and manager selection
  4. All three new templates work through the full document lifecycle without regressions to existing templates
  5. Backend DocumentFormValidator uses strategy pattern instead of switch/case, cleanly supporting 6+ template types
**Plans:** 3/3 plans complete
Plans:
- [x] 10-01-PLAN.md — Backend: Strategy pattern refactor of DocumentFormValidator, Flyway V7 migration, 3 new form validators (Purchase, BusinessTrip, Overtime)
- [x] 10-02-PLAN.md — Frontend foundation: TypeScript types, Zod schemas, i18n keys, OvertimeForm + PurchaseForm components
- [x] 10-03-PLAN.md — Frontend: BusinessTripForm (dual tables), template registry wiring, visual verification checkpoint
**UI hint**: yes

### Phase 11: Document Search & Filter
**Goal**: Users can find any document they are authorized to see through keyword search and multi-criteria filtering
**Depends on**: Phase 10 (complete template registry for filter dropdown)
**Requirements**: SRCH-01, SRCH-02
**Success Criteria** (what must be TRUE):
  1. User can search documents by title, document number, or drafter name and see matching results
  2. User can filter documents by status, date range, and template type (all 6 templates in dropdown)
  3. Search results respect role-based access control: users see only documents they drafted, are on the approval line for, or have admin scope over
  4. Filter state is preserved in the URL so bookmarking and browser back/forward work correctly
**Plans:** 2/2 plans complete
Plans:
- [x] 11-01-PLAN.md — Backend: QueryDSL config, search endpoint with keyword/filter/tab-scoping, DocumentResponse drafter fields, integration tests
- [x] 11-02-PLAN.md — Frontend: tabs, search filters, URL state management, keyword highlighting, DocumentListPage integration, visual checkpoint
**UI hint**: yes

</details>

### v1.2 Custom Template Builder (In Progress)

**Milestone Goal:** Admin이 코드 없이 드래그&드롭으로 결재 양식을 생성하고, 기존 하드코딩 양식을 JSON 스키마 기반으로 전환

- [x] **Phase 12: Schema Foundation** - JSON schema format design, DB migration, template CRUD API, backend validation, versioning infrastructure (completed 2026-04-05)
- [x] **Phase 13: Dynamic Form Rendering** - JSON schema-driven form rendering in edit and read-only modes, runtime Zod generation, table field support (completed 2026-04-05)
- [x] **Phase 14: Builder UI** - Three-panel drag-and-drop form builder, field palette, property panel, live preview, template management page (completed 2026-04-05)
- [ ] **Phase 15: Advanced Logic** - Conditional show/hide/require rules, calculation fields, circular dependency detection, visual sections
- [ ] **Phase 16: Template Migration** - Convert 6 hardcoded forms to JSON schemas, dual rendering mode, backward compatibility verification
- [ ] **Phase 17: Budget Integration** - REST API integration with external budget system on financial document submission, retry and logging

## Phase Details

### Phase 12: Schema Foundation
**Goal**: The system has a stable JSON schema format and DB infrastructure so that templates can be defined, versioned, and validated without any UI — the foundation everything else builds on
**Depends on**: Phase 11 (v1.1 complete)
**Requirements**: SCHM-01, SCHM-02, SCHM-03, SCHM-04
**Success Criteria** (what must be TRUE):
  1. Admin can create a template via API by providing a JSON schema definition with field definitions (all 8 field types: text, textarea, number, date, select, table, staticText, hidden)
  2. Editing a template's schema creates a new version automatically, and existing documents retain the schema version they were created with
  3. Backend rejects form_data submissions that violate the template's JSON schema (missing required fields, wrong types, invalid values)
  4. Template CRUD API supports create, read, update, deactivate, and list operations with proper ADMIN/SUPER_ADMIN authorization
**Plans:** 3/3 plans complete
Plans:
- [x] 12-01-PLAN.md — DB migration (V8/V9/V10), JPA entity extensions, schema DTO records, repositories, FormValidationException
- [x] 12-02-PLAN.md — Template CRUD API, schema versioning service, option set CRUD, integration tests
- [x] 12-03-PLAN.md — DynamicFormValidator, DocumentFormValidator fallback, schema snapshot on document creation, validation tests

### Phase 13: Dynamic Form Rendering
**Goal**: Users can fill out and view documents created from dynamic JSON schema templates, with the same quality as hardcoded forms
**Depends on**: Phase 12
**Requirements**: RNDR-01, RNDR-02, RNDR-03, RNDR-04
**Success Criteria** (what must be TRUE):
  1. User can fill out a form rendered dynamically from a JSON schema — all 8 field types are functional with proper input controls
  2. User can view a submitted document rendered in read-only mode from the stored schema snapshot and form_data
  3. Form validation errors appear inline next to the relevant field, generated at runtime from the JSON schema's validation rules
  4. Table fields support adding and removing rows, with per-cell validation and defined column types
**Plans:** 3/3 plans complete
Plans:
- [x] 13-01-PLAN.md — Backend API extensions (public schema endpoint, DocumentDetail snapshot) + frontend types, schemaToZod, npm deps
- [x] 13-02-PLAN.md — DynamicForm edit component + 8 field type components + DynamicReadOnly
- [x] 13-03-PLAN.md — EditorPage/DetailPage fallback integration + TemplateSelectionModal + E2E checkpoint
**UI hint**: yes

### Phase 14: Builder UI
**Goal**: Admins can visually create and edit form templates through a drag-and-drop builder without writing any code
**Depends on**: Phase 13 (renderer required for live preview)
**Requirements**: BLDR-01, BLDR-02, BLDR-03, BLDR-04, BLDR-05, BLDR-06
**Success Criteria** (what must be TRUE):
  1. Admin sees a three-panel layout: field palette (left), form canvas (center), property panel (right)
  2. Admin can add fields by dragging from the palette to the canvas, or by clicking a field type to append it
  3. Admin can reorder fields by dragging within the canvas, and configure each field's properties (label, required, placeholder, options) in the property panel
  4. Admin can toggle live preview to see the form exactly as end-users will see it
  5. Admin can create new templates, edit existing ones, deactivate templates, and browse all templates in a management list page
**Plans:** 5/1 plans complete
Plans:
- [x] 14-01-PLAN.md — Infrastructure: types, API client, builder reducer, routing, sidebar, i18n, width support
- [x] 14-02-PLAN.md — Template management list page with create modal and deactivate
- [x] 14-03-PLAN.md — Builder core: 3-panel layout, palette, canvas, DnD, toolbar, preview
- [x] 14-04-PLAN.md — Property panel (3 tabs), select options editor, table columns editor, JSON import
- [x] 14-05-PLAN.md — Gap closure: restore routes, sidebar, TemplateListPage, package.json deps
**UI hint**: yes

### Phase 15: Advanced Logic
**Goal**: Admins can add conditional visibility rules and calculation fields to templates, enabling smart forms that react to user input
**Depends on**: Phase 14
**Requirements**: LOGIC-01, LOGIC-02, LOGIC-03, LOGIC-04
**Success Criteria** (what must be TRUE):
  1. Admin can configure a field to show, hide, or become required based on another field's value (e.g., show "Other reason" field when reason select = "Other")
  2. System detects circular dependencies in conditional rules and prevents saving with a clear error message
  3. Admin can define calculation fields that auto-compute values using SUM, MULTIPLY, ADD, or COUNT operations on other numeric fields
  4. Admin can group fields into visual sections with collapsible section headers for form organization
**Plans**: TBD
**UI hint**: yes

### Phase 16: Template Migration
**Goal**: All 6 existing hardcoded form templates have JSON schema equivalents, and the system seamlessly renders both legacy and dynamic documents
**Depends on**: Phase 15 (all dynamic features must work before migration)
**Requirements**: MIGR-01, MIGR-02, MIGR-03
**Success Criteria** (what must be TRUE):
  1. JSON schema equivalents exist for all 6 hardcoded forms (General, Expense, Leave, Purchase, Business Trip, Overtime) with matching field structure
  2. System uses dual rendering: documents created before migration render with hardcoded components, new documents use dynamic renderer
  3. All existing documents (drafts and submitted) display correctly after migration without any data modification

### Phase 17: Budget Integration
**Goal**: Financial approval documents automatically send expense data to the external budget system upon submission, without blocking the approval workflow
**Depends on**: Phase 12 (needs template schema infrastructure; independent of builder UI)
**Requirements**: BDGT-01, BDGT-02
**Success Criteria** (what must be TRUE):
  1. When a financial document (expense report, purchase request) is submitted, the system sends expense data to the external budget system via REST API
  2. Failed API calls are retried (up to configured retry count) and all attempts are logged, without blocking or delaying the document submission workflow

## Progress

**Execution Order:**
Phases 12 through 16 are strictly sequential (each depends on the previous). Phase 17 can start after Phase 12 completes (independent of Phases 13-16).
Recommended order: 12 -> 13 -> 14 -> 15 -> 16 -> 17 (or 17 in parallel with 13-16 after Phase 12)

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Project Foundation | v1.0 | 3/3 | Complete | 2026-03-31 |
| 2. Authentication | v1.0 | 4/4 | Complete | - |
| 3. Organization Management | v1.0 | 4/4 | Complete | - |
| 4. Document Core & Templates | v1.0 | 3/3 | Complete | - |
| 5. File Attachments | v1.0 | 3/3 | Complete | - |
| 6. Document Submission & Numbering | v1.0 | 2/2 | Complete | - |
| 7. Approval Workflow | v1.0 | 5/5 | Complete | - |
| 8. Dashboard & Audit | v1.0 | 3/3 | Complete | - |
| 9. SMTP Email Notifications | v1.1 | 3/3 | Complete | 2026-04-03 |
| 10. Additional Form Templates | v1.1 | 3/3 | Complete | 2026-04-04 |
| 11. Document Search & Filter | v1.1 | 2/2 | Complete | 2026-04-04 |
| 12. Schema Foundation | v1.2 | 3/3 | Complete    | 2026-04-05 |
| 13. Dynamic Form Rendering | v1.2 | 3/3 | Complete    | 2026-04-05 |
| 14. Builder UI | v1.2 | 5/1 | Complete    | 2026-04-06 |
| 15. Advanced Logic | v1.2 | 0/0 | Not started | - |
| 16. Template Migration | v1.2 | 0/0 | Not started | - |
| 17. Budget Integration | v1.2 | 0/0 | Not started | - |

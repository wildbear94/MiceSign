# Roadmap: MiceSign

## Milestones

- ~~**v1.0 MVP**~~ - Phases 1-8 (shipped 2026-04-03)
- **v1.1 Extended Features** - Phases 9-11 (in progress)
- **v1.2 Custom Template Builder** - Planned (evaluate after v1.1)

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

### v1.1 Extended Features (In Progress)

**Milestone Goal:** SMTP 이메일 알림, 추가 양식 템플릿, 문서 검색/필터로 전자결재 시스템의 실용성 확장

- [x] **Phase 9: SMTP Email Notifications** - Event-driven email notifications for all document state changes with retry and delivery logging (completed 2026-04-03)
- [ ] **Phase 10: Additional Form Templates** - Purchase request, business trip report, overtime request forms with validator refactoring
- [ ] **Phase 11: Document Search & Filter** - Keyword search, status/date/template filters with role-based access control

## Phase Details

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
  1. User can create a purchase request (구매요청서) with item table, auto-sum, and evidence attachments
  2. User can create a business trip report (출장보고서) with itinerary, expense breakdown, and attachments
  3. User can create an overtime request (연장근무신청서) with date, hours, reason, and manager selection
  4. All three new templates work through the full document lifecycle (draft, submit, approve, view read-only) without regressions to existing templates
  5. Backend DocumentFormValidator uses strategy pattern instead of switch/case, cleanly supporting 6+ template types
**Plans:** 3 plans
Plans:
- [ ] 10-01-PLAN.md — Backend: Strategy pattern refactor of DocumentFormValidator, Flyway V7 migration, 3 new form validators (Purchase, BusinessTrip, Overtime)
- [ ] 10-02-PLAN.md — Frontend foundation: TypeScript types, Zod schemas, i18n keys, OvertimeForm + PurchaseForm components
- [ ] 10-03-PLAN.md — Frontend: BusinessTripForm (dual tables), template registry wiring, visual verification checkpoint
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
**Plans**: TBD
**UI hint**: yes

## Progress

**Execution Order:**
Phase 9 and Phase 10 have no cross-dependency (Wave 1 parallel candidates). Phase 11 follows Phase 10.
Recommended order: 9 -> 10 -> 11 (or 9 and 10 in parallel if two work streams available)

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
| 9. SMTP Email Notifications | v1.1 | 3/3 | Complete   | 2026-04-03 |
| 10. Additional Form Templates | v1.1 | 0/3 | Planning complete | - |
| 11. Document Search & Filter | v1.1 | 0/? | Not started | - |

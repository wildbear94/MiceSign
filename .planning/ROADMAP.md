# Roadmap: MiceSign

## Overview

MiceSign delivers a self-hosted electronic approval system for ~50 employees, replacing Docswave. The build progresses from project scaffolding through authentication and organization management, then into the document lifecycle (drafting, templates, file attachments, submission), the approval workflow (the core product value and highest-risk component), and finally the dashboard that ties the daily user experience together. Each phase delivers a verifiable capability that the next phase depends on.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Project Foundation** - Spring Boot + React scaffolding, database schema, seed data, dev tooling
- [ ] **Phase 2: Authentication** - JWT login/logout, token refresh, account lockout, password management
- [ ] **Phase 3: Organization Management** - Department/position CRUD, user management, RBAC enforcement
- [ ] **Phase 4: Document Core & Templates** - Document drafting with three form templates, draft CRUD, document viewing
- [ ] **Phase 5: File Attachments** - Google Drive integration for upload, download, and validation
- [ ] **Phase 6: Document Submission & Numbering** - Submit workflow, document immutability, concurrent-safe numbering
- [ ] **Phase 7: Approval Workflow** - Approval line editor, sequential processing, approve/reject, withdrawal, resubmission
- [ ] **Phase 8: Dashboard & Audit** - Pending approvals list, recent documents, badge counts, audit trail logging

## Phase Details

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
**Plans:** 3 plans
Plans:
- [x] 01-01-PLAN.md — Backend scaffolding: Gradle project, Spring Boot config, Flyway migrations (DDL + seed data), API envelope
- [ ] 01-02-PLAN.md — Frontend scaffolding: Vite + React 18 + TypeScript, TailwindCSS with Pretendard font, Axios client
- [ ] 01-03-PLAN.md — Integration tests (health check + seed data), .gitignore, full-stack verification

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
**Plans**: TBD

### Phase 3: Organization Management
**Goal**: Admins can manage the company structure (departments, positions, users) and the system enforces role-based access
**Depends on**: Phase 2
**Requirements**: ORG-01, ORG-02, ORG-03, ORG-04
**Success Criteria** (what must be TRUE):
  1. Admin can create, edit, and deactivate departments in a hierarchical tree
  2. Admin can create, edit, and deactivate positions with sort ordering
  3. Admin can create and manage user accounts with all required fields (employee no, name, email, department, position, role, status)
  4. SUPER_ADMIN has full access, ADMIN manages org + own dept docs, USER can draft and approve only
**Plans**: TBD
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
**Plans**: TBD
**UI hint**: yes

### Phase 5: File Attachments
**Goal**: Users can attach files to documents via Google Drive, download them with access control, and the system enforces upload limits
**Depends on**: Phase 4
**Requirements**: FILE-01, FILE-02, FILE-03
**Success Criteria** (what must be TRUE):
  1. User can upload files that are stored in Google Drive via Service Account
  2. User can download attachments only if they are an authorized viewer of the document
  3. System rejects uploads exceeding 50MB per file, 10 files per document, or 200MB total, and blocks disallowed extensions
**Plans**: TBD

### Phase 6: Document Submission & Numbering
**Goal**: Users can submit drafts, triggering immutable locking and document number assignment with race-condition protection
**Depends on**: Phase 5
**Requirements**: DOC-03, DOC-04, DOC-07
**Success Criteria** (what must be TRUE):
  1. User can submit a draft document, changing its status from DRAFT to SUBMITTED
  2. Submitted document body, attachments, and approval line are fully locked and cannot be modified
  3. Document number (PREFIX-YYYY-NNNN) is assigned at submission with no duplicates under concurrent submissions
**Plans**: TBD

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
**Plans**: TBD
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
**Plans**: TBD
**UI hint**: yes

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3 -> 4 -> 5 -> 6 -> 7 -> 8

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Project Foundation | 0/3 | Planning complete | - |
| 2. Authentication | 0/TBD | Not started | - |
| 3. Organization Management | 0/TBD | Not started | - |
| 4. Document Core & Templates | 0/TBD | Not started | - |
| 5. File Attachments | 0/TBD | Not started | - |
| 6. Document Submission & Numbering | 0/TBD | Not started | - |
| 7. Approval Workflow | 0/TBD | Not started | - |
| 8. Dashboard & Audit | 0/TBD | Not started | - |

# Requirements: MiceSign

**Defined:** 2026-03-31
**Core Value:** Employees can submit approval documents and get them approved/rejected through a clear, sequential workflow

## v1.0 Requirements (Complete)

Phase 1-A MVP — all requirements validated.

### Authentication

- [x] **AUTH-01**: User can log in with email and password, receiving JWT access + refresh tokens
- [x] **AUTH-02**: Access token refreshes automatically via refresh token rotation (HttpOnly cookie)
- [x] **AUTH-03**: User can log out, invalidating refresh token
- [x] **AUTH-04**: Account locks after 5 consecutive failed login attempts for 15 minutes
- [x] **AUTH-05**: User session persists across browser refresh (auto-refresh on app init)
- [x] **AUTH-06**: User can change their own password
- [x] **AUTH-07**: Admin can reset a user's password

### Organization

- [x] **ORG-01**: Admin can create, edit, and deactivate departments (hierarchical structure)
- [x] **ORG-02**: Admin can create, edit, and deactivate positions (with sort order)
- [x] **ORG-03**: Admin can create and manage user accounts (employee no, name, email, department, position, role, status)
- [x] **ORG-04**: System enforces RBAC with three roles: SUPER_ADMIN (full access), ADMIN (org/template management + own dept docs), USER (draft and approve)
- [x] **ORG-05**: Initial data seeding on first run (default departments, positions, SUPER_ADMIN account)

### Document

- [x] **DOC-01**: User can create a draft document by selecting a form template
- [x] **DOC-02**: User can edit and delete their own draft documents
- [x] **DOC-03**: User can submit a draft, triggering document numbering (format: PREFIX-YYYY-NNNN)
- [x] **DOC-04**: Submitted documents are fully locked (body, attachments, approval line cannot be modified)
- [x] **DOC-05**: User can view document detail page with full content, approval line status, and attachments
- [x] **DOC-06**: User can view list of their drafted and submitted documents with status
- [x] **DOC-07**: Document numbering uses per-template, per-year sequences with race condition protection

### Approval

- [x] **APR-01**: User can build an approval line selecting approvers from org tree (APPROVE, AGREE, REFERENCE types)
- [x] **APR-02**: APPROVE and AGREE types are processed sequentially by step_order; REFERENCE gets immediate read access
- [x] **APR-03**: Approver can approve or reject a document with an optional comment
- [x] **APR-04**: Rejection by any approver immediately sets document status to REJECTED
- [x] **APR-05**: Approval by the last approver sets document status to APPROVED
- [x] **APR-06**: Drafter can withdraw a submitted document if the next approver has not yet acted
- [x] **APR-07**: User can create a new document (resubmission) from a rejected or withdrawn document, with content pre-filled

### Template

- [x] **TPL-01**: General approval form (일반 업무 기안) with title, rich text body, and attachments
- [x] **TPL-02**: Expense report form (지출 결의서) with item table (item, quantity, unit price, amount), auto-sum, and evidence attachments
- [x] **TPL-03**: Leave request form (휴가 신청서) with leave type (연차/반차/병가/경조), start date, end date, auto-calculated days, and reason

### File

- [x] **FILE-01**: User can upload files to Google Drive via Service Account when attaching to a document
- [x] **FILE-02**: User can download attachments with access control verification (only authorized viewers)
- [x] **FILE-03**: System validates file uploads: max 50MB per file, max 10 files per document, max 200MB total, allowed/blocked extensions enforced

### Dashboard

- [x] **DASH-01**: User sees a list of documents pending their approval action
- [x] **DASH-02**: User sees their recent documents with current status
- [x] **DASH-03**: User sees badge counts for pending approvals, in-progress drafts, and completed documents

### Audit

- [x] **AUD-01**: System records immutable audit log entries for all document state changes (create, submit, approve, reject, withdraw) and key user actions (login, logout, file upload/download, admin edits)

## v1.1 Requirements

Milestone v1.1: Extended Features — SMTP notifications, document search/filter, additional form templates.

### Notifications

- [x] **NTF-01**: User receives email notification when a document arrives for their approval
- [x] **NTF-02**: Drafter receives email when their document is approved or rejected
- [x] **NTF-03**: Drafter receives email when their document is withdrawn by an approver action
- [x] **NTF-04**: Approvers receive email when a document is submitted for approval workflow
- [x] **NTF-05**: Notification delivery history is logged in the database (notification_log table)

### Search

- [x] **SRCH-01**: User can search documents by title, document number, and drafter name
- [x] **SRCH-02**: User can filter documents by status, date range, and template type

### Additional Templates

- [x] **TPL-04**: Purchase request form (구매 요청서) with item table, auto-sum, and evidence attachments
- [x] **TPL-05**: Business trip report form (출장 보고서) with itinerary, expense breakdown, and attachments
- [x] **TPL-06**: Overtime request form (연장 근무 신청서) with date, hours, reason, and manager selection

## Future Requirements

### Custom Template Builder (v1.2)

- **BLDR-01**: Admin can create custom form templates using drag & drop builder
- **BLDR-02**: Custom templates support field types: text, textarea, number, date, select, table
- **BLDR-03**: System renders custom templates dynamically from JSON schema
- **BLDR-04**: Template versioning preserves existing documents when schema changes

### Statistics (Future)

- **STAT-01**: Admin can view approval statistics (counts by status, average processing time)

### AI (Phase 2)

- **AI-01**: AI-assisted document drafting based on accumulated data

## Out of Scope

| Feature | Reason |
|---------|--------|
| Full-text search | LIKE search sufficient for ~50 users; Elasticsearch overkill |
| Auto-routing approval rules | PRD specifies 100% manual approval line selection |
| Delegation/proxy approval (대결/위임) | Explicitly excluded from Phase 1 per PRD |
| Mobile app | Web-first; mobile later |
| SSO / OAuth | Email/password sufficient for in-house system |
| Docker containerization | Native deployment per PRD |
| Data migration from Docswave | Fresh start confirmed |
| Real-time notifications (WebSocket) | Deferred; email + dashboard sufficient |
| Document versioning | Immutability model: changes = new document |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| AUTH-01 | Phase 2: Authentication | Complete |
| AUTH-02 | Phase 2: Authentication | Complete |
| AUTH-03 | Phase 2: Authentication | Complete |
| AUTH-04 | Phase 2: Authentication | Complete |
| AUTH-05 | Phase 2: Authentication | Complete |
| AUTH-06 | Phase 2: Authentication | Complete |
| AUTH-07 | Phase 2: Authentication | Complete |
| ORG-01 | Phase 3: Organization Management | Complete |
| ORG-02 | Phase 3: Organization Management | Complete |
| ORG-03 | Phase 3: Organization Management | Complete |
| ORG-04 | Phase 3: Organization Management | Complete |
| ORG-05 | Phase 1: Project Foundation | Complete |
| DOC-01 | Phase 4: Document Core & Templates | Complete |
| DOC-02 | Phase 4: Document Core & Templates | Complete |
| DOC-03 | Phase 6: Document Submission & Numbering | Complete |
| DOC-04 | Phase 6: Document Submission & Numbering | Complete |
| DOC-05 | Phase 4: Document Core & Templates | Complete |
| DOC-06 | Phase 4: Document Core & Templates | Complete |
| DOC-07 | Phase 6: Document Submission & Numbering | Complete |
| APR-01 | Phase 7: Approval Workflow | Complete |
| APR-02 | Phase 7: Approval Workflow | Complete |
| APR-03 | Phase 7: Approval Workflow | Complete |
| APR-04 | Phase 7: Approval Workflow | Complete |
| APR-05 | Phase 7: Approval Workflow | Complete |
| APR-06 | Phase 7: Approval Workflow | Complete |
| APR-07 | Phase 7: Approval Workflow | Complete |
| TPL-01 | Phase 4: Document Core & Templates | Complete |
| TPL-02 | Phase 4: Document Core & Templates | Complete |
| TPL-03 | Phase 4: Document Core & Templates | Complete |
| FILE-01 | Phase 5: File Attachments | Complete |
| FILE-02 | Phase 5: File Attachments | Complete |
| FILE-03 | Phase 5: File Attachments | Complete |
| DASH-01 | Phase 8: Dashboard & Audit | Complete |
| DASH-02 | Phase 8: Dashboard & Audit | Complete |
| DASH-03 | Phase 8: Dashboard & Audit | Complete |
| AUD-01 | Phase 8: Dashboard & Audit | Complete |
| NTF-01 | Phase 9: SMTP Email Notifications | Complete |
| NTF-02 | Phase 9: SMTP Email Notifications | Complete |
| NTF-03 | Phase 9: SMTP Email Notifications | Complete |
| NTF-04 | Phase 9: SMTP Email Notifications | Complete |
| NTF-05 | Phase 9: SMTP Email Notifications | Complete |
| TPL-04 | Phase 10: Additional Form Templates | Complete |
| TPL-05 | Phase 10: Additional Form Templates | Complete |
| TPL-06 | Phase 10: Additional Form Templates | Complete |
| SRCH-01 | Phase 11: Document Search & Filter | Complete |
| SRCH-02 | Phase 11: Document Search & Filter | Complete |

**Coverage:**
- v1.0 requirements: 36 total (36 complete)
- v1.1 requirements: 10 total (10 complete)
- Unmapped: 0

---
*Requirements defined: 2026-03-31*
*Last updated: 2026-04-03 -- v1.1 roadmap traceability updated*

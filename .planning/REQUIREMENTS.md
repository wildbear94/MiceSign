# Requirements: MiceSign

**Defined:** 2026-03-31
**Core Value:** Employees can submit approval documents and get them approved/rejected through a clear, sequential workflow

## v1 Requirements

Requirements for Phase 1-A MVP. Each maps to roadmap phases.

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
- [ ] **DOC-03**: User can submit a draft, triggering document numbering (format: PREFIX-YYYY-NNNN)
- [ ] **DOC-04**: Submitted documents are fully locked (body, attachments, approval line cannot be modified)
- [x] **DOC-05**: User can view document detail page with full content, approval line status, and attachments
- [x] **DOC-06**: User can view list of their drafted and submitted documents with status
- [ ] **DOC-07**: Document numbering uses per-template, per-year sequences with race condition protection

### Approval

- [ ] **APR-01**: User can build an approval line selecting approvers from org tree (APPROVE, AGREE, REFERENCE types)
- [ ] **APR-02**: APPROVE and AGREE types are processed sequentially by step_order; REFERENCE gets immediate read access
- [ ] **APR-03**: Approver can approve or reject a document with an optional comment
- [ ] **APR-04**: Rejection by any approver immediately sets document status to REJECTED
- [ ] **APR-05**: Approval by the last approver sets document status to APPROVED
- [ ] **APR-06**: Drafter can withdraw a submitted document if the next approver has not yet acted
- [ ] **APR-07**: User can create a new document (resubmission) from a rejected or withdrawn document, with content pre-filled

### Template

- [x] **TPL-01**: General approval form (일반 업무 기안) with title, rich text body, and attachments
- [x] **TPL-02**: Expense report form (지출 결의서) with item table (item, quantity, unit price, amount), auto-sum, and evidence attachments
- [x] **TPL-03**: Leave request form (휴가 신청서) with leave type (연차/반차/병가/경조), start date, end date, auto-calculated days, and reason

### File

- [x] **FILE-01**: User can upload files to Google Drive via Service Account when attaching to a document
- [x] **FILE-02**: User can download attachments with access control verification (only authorized viewers)
- [x] **FILE-03**: System validates file uploads: max 50MB per file, max 10 files per document, max 200MB total, allowed/blocked extensions enforced

### Dashboard

- [ ] **DASH-01**: User sees a list of documents pending their approval action
- [ ] **DASH-02**: User sees their recent documents with current status
- [ ] **DASH-03**: User sees badge counts for pending approvals, in-progress drafts, and completed documents

### Audit

- [ ] **AUD-01**: System records immutable audit log entries for all document state changes (create, submit, approve, reject, withdraw) and key user actions (login, logout, file upload/download, admin edits)

## v2 Requirements

Deferred to future releases (Phase 1-B, 1-C, Phase 2).

### Notifications (Phase 1-B)

- **NTF-01**: User receives email notification when a document arrives for their approval
- **NTF-02**: Drafter receives email when their document is approved or rejected
- **NTF-03**: Notification delivery history logged in database

### Search (Phase 1-B)

- **SRCH-01**: User can search documents by title, document number, drafter name
- **SRCH-02**: User can filter documents by status, date range, template type

### Audit UI (Phase 1-C)

- **AUD-02**: SUPER_ADMIN can query audit logs with filters (action type, user, date range)

### Statistics (Phase 1-C)

- **STAT-01**: Admin can view approval statistics (counts by status, average processing time)

### Additional Templates (Phase 1-B)

- **TPL-04**: Purchase request form (구매 요청서)
- **TPL-05**: Business trip report form (출장 보고서)
- **TPL-06**: Overtime request form (연장 근무 신청서)

### Budget Integration (v1.2)

- [x] **BDGT-01**: 재무 문서(지출 결의, 구매 요청) 제출 시 외부 예산 시스템에 REST API로 지출 데이터를 자동 전송
- [x] **BDGT-02**: API 호출 실패 시 설정된 횟수만큼 재시도하고 모든 시도를 로깅하며, 문서 제출 워크플로를 차단하지 않음

### AI (Phase 2)

- **AI-01**: AI-assisted document drafting based on accumulated data

## v1.3 Requirements

Requirements for v1.3 사용자 등록 신청 milestone. Each maps to roadmap phases.

### 등록 신청 (Registration)

- [ ] **REG-01**: 사용자가 로그인 화면에서 이름, 이메일, 비밀번호를 입력하여 계정을 신청할 수 있다
- [ ] **REG-02**: 시스템이 user 테이블과 registration_request 테이블에서 이메일 중복을 검증한다
- [ ] **REG-03**: 거부된 이메일로 재신청이 가능하다
- [ ] **REG-04**: 신청자가 신청 상태(대기/승인/거부)와 거부 사유를 확인할 수 있다

### 관리자 승인 (Admin Approval)

- [ ] **ADM-01**: SUPER_ADMIN이 등록 신청 목록을 조회할 수 있다
- [ ] **ADM-02**: SUPER_ADMIN이 신청을 승인하면서 부서와 직급을 지정할 수 있다
- [ ] **ADM-03**: SUPER_ADMIN이 신청을 거부하면서 거부 사유를 입력할 수 있다
- [ ] **ADM-04**: 승인 시 자동으로 사용자 계정이 생성된다 (비밀번호 해시 안전 전달)

### 이메일 알림 (Email Notifications)

- [ ] **MAIL-01**: 기존 스텁 EmailService를 실제 SMTP 발송으로 교체한다
- [ ] **MAIL-02**: 신청 접수 시 신청자에게 확인 이메일을 발송한다
- [ ] **MAIL-03**: 승인/거부 시 신청자에게 결과 이메일을 발송한다
- [ ] **MAIL-04**: 새 신청이 접수되면 SUPER_ADMIN에게 알림 이메일을 발송한다

### 보안 (Security)

- [ ] **SEC-01**: 공개 등록 엔드포인트에 rate limiting을 적용한다

## Out of Scope

| Feature | Reason |
|---------|--------|
| SMTP email notifications | Deferred to Phase 1-B; MVP uses dashboard polling |
| Document search/filtering | Deferred to Phase 1-B |
| Dynamic form builder | Hardcoded components are simpler and sufficient for ~50 users |
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
| DOC-03 | Phase 6: Document Submission & Numbering | Pending |
| DOC-04 | Phase 6: Document Submission & Numbering | Pending |
| DOC-05 | Phase 4: Document Core & Templates | Complete |
| DOC-06 | Phase 4: Document Core & Templates | Complete |
| DOC-07 | Phase 6: Document Submission & Numbering | Pending |
| APR-01 | Phase 7: Approval Workflow | Pending |
| APR-02 | Phase 7: Approval Workflow | Pending |
| APR-03 | Phase 7: Approval Workflow | Pending |
| APR-04 | Phase 7: Approval Workflow | Pending |
| APR-05 | Phase 7: Approval Workflow | Pending |
| APR-06 | Phase 7: Approval Workflow | Pending |
| APR-07 | Phase 7: Approval Workflow | Pending |
| TPL-01 | Phase 4: Document Core & Templates | Complete |
| TPL-02 | Phase 4: Document Core & Templates | Complete |
| TPL-03 | Phase 4: Document Core & Templates | Complete |
| FILE-01 | Phase 5: File Attachments | Complete |
| FILE-02 | Phase 5: File Attachments | Complete |
| FILE-03 | Phase 5: File Attachments | Complete |
| DASH-01 | Phase 8: Dashboard & Audit | Pending |
| DASH-02 | Phase 8: Dashboard & Audit | Pending |
| DASH-03 | Phase 8: Dashboard & Audit | Pending |
| AUD-01 | Phase 8: Dashboard & Audit | Pending |
| BDGT-01 | Phase 17: Budget Integration | Complete |
| BDGT-02 | Phase 17: Budget Integration | Complete |

**Coverage:**
- v1 requirements: 38 total
- Mapped to phases: 38
- Unmapped: 0

---
*Requirements defined: 2026-03-31*
*Last updated: 2026-03-31 after roadmap creation*

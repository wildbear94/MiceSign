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

### AI (Phase 2)

- **AI-01**: AI-assisted document drafting based on accumulated data

## Out of Scope

| Feature | Reason |
|---------|--------|
| ~~SMTP email notifications~~ | ~~Deferred to Phase 1-B~~ — **Moved to v1.2 scope (NOTIF-* requirements)** |
| ~~Document search/filtering~~ | ~~Deferred to Phase 1-B~~ — **Moved to v1.2 scope (SRCH-* requirements)** |
| Dynamic form builder | Hardcoded components are simpler and sufficient for ~50 users |
| Auto-routing approval rules | PRD specifies 100% manual approval line selection |
| Delegation/proxy approval (대결/위임) | Explicitly excluded from Phase 1 per PRD |
| Mobile app | Web-first; mobile later |
| SSO / OAuth | Email/password sufficient for in-house system |
| Docker containerization | Native deployment per PRD |
| Data migration from Docswave | Fresh start confirmed |
| Real-time notifications (WebSocket) | Deferred; email + dashboard sufficient |
| Document versioning | Immutability model: changes = new document |

## v1.1 Requirements

Requirements for Milestone v1.1: 양식 생성 모달 창 고도화

### 리팩토링 (기반 작업)

- [x] **RFT-01**: SchemaFieldEditor를 FieldCard/FieldConfigEditor 등 하위 컴포넌트로 분리하여 유지보수성 확보
- [x] **RFT-02**: TemplateFormModal을 near-fullscreen 분할 레이아웃으로 확장 (좌: 편집, 우: 프리뷰)

### 라이브 미리보기

- [x] **PRV-01**: 관리자가 필드 구성 변경 시 오른쪽 패널에 실시간 폼 미리보기를 볼 수 있다
- [x] **PRV-02**: 관리자가 전체화면 미리보기 버튼으로 완성된 폼을 포탈 모달로 볼 수 있다
- [x] **PRV-03**: 관리자가 프리뷰 패널 표시/숨김을 토글할 수 있다

### 테이블 컬럼 편집

- [x] **TBL-01**: 관리자가 table 타입 필드에 컬럼을 추가/삭제/순서변경할 수 있다
- [x] **TBL-02**: 관리자가 각 컬럼의 타입(text/number/date/select), 라벨, 필수여부를 설정할 수 있다

### 조건부 규칙

- [x] **CND-01**: 관리자가 필드별 조건부 표시/숨김 규칙을 설정할 수 있다 (IF 필드 = 값 THEN 표시/숨김/필수/선택)
- [x] **CND-02**: 필드 삭제 시 해당 필드를 참조하는 규칙이 자동 정리된다

### 계산 규칙

- [x] **CAL-01**: 관리자가 숫자 필드에 계산 공식을 설정할 수 있다 (SUM, 사칙연산, 테이블 컬럼 참조)
- [x] **CAL-02**: 순환 의존성 감지 시 실시간 경고가 표시된다

### 편의 기능

- [x] **CNV-01**: 관리자가 기존 양식을 복제하여 새 양식을 생성할 수 있다
- [x] **CNV-02**: 관리자가 양식 스키마를 JSON 파일로 내보내기할 수 있다
- [x] **CNV-03**: 관리자가 JSON 파일을 업로드하여 양식을 생성할 수 있다 (Zod 검증 포함)
- [x] **CNV-04**: 관리자가 프리셋 템플릿(경비, 신청서 등)을 선택하여 빠르게 양식을 생성할 수 있다

## v1.2 Requirements

Requirements for Milestone v1.2: Phase 1-B — 일상 업무 대체 수준 (SMTP 알림 + 검색/필터 + 대시보드 + CUSTOM 프리셋 확장). 인프라 약 70%가 v1.0/v1.1에서 이미 스캐폴딩되어 있으므로 본 마일스톤은 **retrofit/wiring 중심**이다.

### SMTP 이메일 알림 (NOTIF)

- [x] **NOTIF-01
**: 사용자가 결재 이벤트 5종(상신/중간 승인/최종 승인/반려/회수) 발생 시 해당 수신자에게 HTML 이메일을 수신한다 (EmailService stub 제거, 실 JavaMailSender 발송)
- [x] **NOTIF-02
**: 사용자가 이메일 본문의 "문서 바로가기" 버튼을 클릭하면 해당 결재 문서 상세 페이지로 직접 이동한다 (`app.base-url` 기반 절대 URL)
- [x] **NOTIF-03
**: 시스템이 이메일 발송 실패 시 최대 2회 자동 재시도(5분 간격)하며, 발송 이력을 `notification_log`에 PENDING→SUCCESS/FAILED로 기록한다 (`@Retryable` + `@Recover`)
- [x] **NOTIF-04
**: 시스템이 퇴직(`RETIRED`) 또는 비활성(`INACTIVE`) 사용자 수신을 자동으로 스킵한다
- [x] **NOTIF-05
**: 모든 알림 이메일 제목에 `[MiceSign]` prefix가 붙고 본문이 한글 UTF-8로 정상 표기된다 (`MimeMessageHelper` UTF-8 강제)

### 문서 검색/필터링 (SRCH)

- [ ] **SRCH-01**: **[보안 수정]** 사용자가 문서 검색 시 본인 기안 + `EXISTS approval_line(APPROVE/AGREE/REFERENCE)` + ADMIN 부서 범위 + SUPER_ADMIN 전체 권한 WHERE 절이 적용되어 타인 DRAFT가 노출되지 않는다 (FSD FN-SEARCH-001, `tab=my` 외에는 DRAFT 제외)
- [ ] **SRCH-02**: 사용자가 키워드(제목/문서번호 LIKE)로 문서를 검색할 수 있다
- [ ] **SRCH-03**: 사용자가 상태(복수 선택 가능: SUBMITTED/APPROVED/REJECTED/WITHDRAWN), 양식(단일), 기간(시작일~종료일)으로 필터링할 수 있다
- [ ] **SRCH-04**: 사용자가 기안자(드롭다운/검색)로 필터링할 수 있다
- [ ] **SRCH-05**: 검색 결과가 오프셋 페이지네이션(페이지 크기 20)으로 표시되며, 현재 필터·페이지 상태가 URL query string에 반영되어 공유 가능하다
- [ ] **SRCH-06**: 검색 응답이 10K 문서 · 50 동시 사용자 기준 95p ≤ 1초 (기존 인덱스 기반 실측)

### 대시보드 고도화 (DASH)

- [x] **DASH-01
**: 사용자가 대시보드 상단에서 "결재 대기 / 진행 중 / 승인 완료 / 반려" 4종 카운트 카드를 본다 (`submittedCount` 신규 노출)
- [x] **DASH-02
**: 사용자가 대시보드에서 "내가 처리할 결재 5건" + "내가 기안한 최근 문서 5건" 목록을 본다
- [x] **DASH-03
**: 사용자가 대시보드의 "새 문서 작성" CTA 버튼으로 양식 선택 화면으로 이동할 수 있다
- [x] **DASH-04
**: 대시보드에 skeleton 로딩 상태와 빈 상태(empty) UI가 표시된다
- [x] **DASH-05
**: 결재 승인/반려/상신/회수 mutation 성공 시 대시보드 쿼리가 자동 무효화되어 카운트·목록이 실시간 갱신된다 (TanStack Query `invalidateQueries(['dashboard'])`)

### 양식 확장 (FORM)

- [x] **FORM-01
**: 관리자가 제공 프리셋 갤러리에서 "회의록" CUSTOM 스키마를 선택해 양식을 즉시 생성할 수 있다 (JSON 프리셋 + v1.1 import 파이프라인)
- [x] **FORM-02
**: 관리자가 제공 프리셋 갤러리에서 "품의서" CUSTOM 스키마를 선택해 양식을 즉시 생성할 수 있다

### 비기능 요구사항 (NFR - v1.2 범위 내)

- [x] **NFR-01
**: 검색 응답 95p ≤ 1초 (SRCH-06과 중복 명시 — NFR 관점)
- [x] **NFR-02
**: 이메일 발송이 결재 트랜잭션을 블로킹하지 않는다 (`@Async` + `AFTER_COMMIT`)
- [x] **NFR-03
**: 감사 로그 중복 방지 — 리스너에서 `audit_log`를 추가 INSERT 하지 않는다 (기존 서비스 동기 기록 유지, `COUNT=1 per action` 테스트)

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
| RFT-01 | Phase 21: SchemaFieldEditor 리팩토링 | Complete |
| RFT-02 | Phase 22: 분할 레이아웃 + 라이브 미리보기 | Complete |
| PRV-01 | Phase 22: 분할 레이아웃 + 라이브 미리보기 | Complete |
| PRV-02 | Phase 22: 분할 레이아웃 + 라이브 미리보기 | Complete |
| PRV-03 | Phase 22: 분할 레이아웃 + 라이브 미리보기 | Complete |
| TBL-01 | Phase 23: 테이블 컬럼 편집기 | Complete |
| TBL-02 | Phase 23: 테이블 컬럼 편집기 | Complete |
| CND-01 | Phase 24: 조건부 표시 규칙 UI | Complete |
| CND-02 | Phase 24: 조건부 표시 규칙 UI | Complete |
| CAL-01 | Phase 25: 계산 규칙 UI | Complete |
| CAL-02 | Phase 25: 계산 규칙 UI | Complete |
| CNV-01 | Phase 26: 편의 기능 | Complete |
| CNV-02 | Phase 26: 편의 기능 | Complete |
| CNV-03 | Phase 26: 편의 기능 | Complete |
| CNV-04 | Phase 26: 편의 기능 | Complete |
| NOTIF-01 | Phase 29: SMTP 이메일 알림 인프라 (Retrofit) | Pending |
| NOTIF-02 | Phase 29: SMTP 이메일 알림 인프라 (Retrofit) | Pending |
| NOTIF-03 | Phase 29: SMTP 이메일 알림 인프라 (Retrofit) | Pending |
| NOTIF-04 | Phase 29: SMTP 이메일 알림 인프라 (Retrofit) | Pending |
| NOTIF-05 | Phase 29: SMTP 이메일 알림 인프라 (Retrofit) | Pending |
| NFR-02 | Phase 29: SMTP 이메일 알림 인프라 (Retrofit) | Pending |
| NFR-03 | Phase 29: SMTP 이메일 알림 인프라 (Retrofit) | Pending |
| SRCH-01 | Phase 30: 검색 권한 WHERE 절 보안 수정 + 필터 확장 | Pending |
| SRCH-02 | Phase 30: 검색 권한 WHERE 절 보안 수정 + 필터 확장 | Pending |
| SRCH-03 | Phase 30: 검색 권한 WHERE 절 보안 수정 + 필터 확장 | Pending |
| SRCH-04 | Phase 30: 검색 권한 WHERE 절 보안 수정 + 필터 확장 | Pending |
| SRCH-05 | Phase 30: 검색 권한 WHERE 절 보안 수정 + 필터 확장 | Pending |
| SRCH-06 | Phase 30: 검색 권한 WHERE 절 보안 수정 + 필터 확장 | Pending |
| NFR-01 | Phase 30: 검색 권한 WHERE 절 보안 수정 + 필터 확장 | Pending |
| DASH-01 (v1.2) | Phase 31: 대시보드 고도화 | Pending |
| DASH-02 (v1.2) | Phase 31: 대시보드 고도화 | Pending |
| DASH-03 (v1.2) | Phase 31: 대시보드 고도화 | Pending |
| DASH-04 | Phase 31: 대시보드 고도화 | Pending |
| DASH-05 | Phase 31: 대시보드 고도화 | Pending |
| FORM-01 | Phase 32: CUSTOM 프리셋 확장 | Pending |
| FORM-02 | Phase 32: CUSTOM 프리셋 확장 | Pending |

> Note: v1.2 의 `DASH-01/02/03` 은 v1 의 DASH-01/02/03 을 확장(4번째 카드·실시간 무효화 등)하는 요구이며 Phase 31 로 매핑. 동일 REQ-ID 재사용에 유의.

**Coverage:**
- v1 requirements: 36 total, 36 mapped, 0 unmapped (Complete)
- v1.1 requirements: 15 total, 15 mapped, 0 unmapped (Complete)
- v1.2 requirements: 21 total, 21 mapped, 0 unmapped (Pending execution)
  - NOTIF-01~05 (5) + NFR-02 + NFR-03 → Phase 29
  - SRCH-01~06 (6) + NFR-01 → Phase 30
  - DASH-01~05 (5) → Phase 31
  - FORM-01~02 (2) → Phase 32
  - Phase 33 (E2E 검증) 은 선택적 wrap-up, 특정 REQ 매핑 없음 (NFR 실측 재확인만)

---
*Requirements defined: 2026-03-31*
*Last updated: 2026-04-22 -- v1.2 traceability appended (Phases 29-33, 21 items mapped 100%)*

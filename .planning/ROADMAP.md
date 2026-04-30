# Roadmap: MiceSign

## Milestones

- <details><summary>v1.0 Phase 1-A MVP (Phases 1-8) - SHIPPED 2026-04-11</summary>

### Phase 1: Project Foundation
**Goal**: A runnable Spring Boot + React project with all dependencies wired, database schema migrated, and seed data loaded on first run
**Plans:** 3/3 plans complete

### Phase 2: Authentication
**Goal**: Users can securely log in, maintain sessions across browser refreshes, and manage their passwords
**Plans:** 4/4 plans complete

### Phase 3: Organization Management
**Goal**: Admins can manage the company structure (departments, positions, users) and the system enforces role-based access
**Plans:** 4/4 plans complete

### Phase 4: Document Core & Templates
**Goal**: Users can create, edit, and view draft documents using three form templates (General, Expense, Leave)
**Plans:** 3/3 plans complete

### Phase 5: File Attachments
**Goal**: Users can attach files to documents via Google Drive, download them with access control, and the system enforces upload limits
**Plans:** 3/3 plans complete

### Phase 6: Document Submission & Numbering
**Goal**: Users can submit drafts, triggering immutable locking and document number assignment with race-condition protection
**Plans**: Complete

### Phase 7: Approval Workflow
**Goal**: Users can build approval lines, process approvals sequentially, and handle rejections, withdrawals, and resubmissions
**Plans**: Complete

### Phase 8: Dashboard & Audit
**Goal**: Users have a home screen showing pending work and recent activity, and all document state changes are recorded in an immutable audit trail
**Plans**: Complete

</details>

- <details><summary>v1.1 양식 생성 모달 창 고도화 (Phases 21-28) - SHIPPED 2026-04-14</summary>

### Phase 21: SchemaFieldEditor 리팩토링
**Plans:** 1/1 complete

### Phase 22: 분할 레이아웃 + 라이브 미리보기
**Plans:** 2/2 complete

### Phase 23: 테이블 컬럼 편집기
**Plans:** 2/2 complete

### Phase 24: 조건부 표시 규칙 UI
**Plans:** 2/2 complete

### Phase 24.1: 사용자 측 동적 폼 렌더러 (INSERTED)
**Plans:** 5/5 complete

### Phase 25: 계산 규칙 UI
**Plans:** 3/3 complete

### Phase 26: 편의 기능
**Plans:** 2/2 complete

### Phase 27: v1.1 검증 위생 보강 (gap closure)
**Plans:** 3/3 complete

### Phase 28: v1.1 Nyquist validation 사후 보강 (gap closure)
**Plans:** 2/2 complete

</details>

- **v1.2 Phase 1-B — 일상 업무 대체 수준** - Phases 29-33 (in progress)

## Phases

**Phase Numbering:**
- Phases 1-8: v1.0 Phase 1-A MVP (complete)
- Phases 21-28: v1.1 양식 생성 모달 창 고도화 (complete)
- Phases 29-33: v1.2 Phase 1-B — 일상 업무 대체 수준 (SMTP 알림 + 검색/필터 + 대시보드 + CUSTOM 프리셋)
- Decimal phases (e.g., 29.1): Urgent insertions (marked with INSERTED)

### v1.1 phases (archived — detail collapsed above)

- [x] **Phase 21: SchemaFieldEditor 리팩토링** (completed 2026-04-11)
- [x] **Phase 22: 분할 레이아웃 + 라이브 미리보기** (completed 2026-04-11)
- [x] **Phase 23: 테이블 컬럼 편집기** (completed 2026-04-12)
- [x] **Phase 24: 조건부 표시 규칙 UI** (completed 2026-04-12)
- [x] **Phase 24.1: 사용자 측 동적 폼 렌더러 (CUSTOM)** (completed 2026-04-13)
- [x] **Phase 25: 계산 규칙 UI** (completed 2026-04-13)
- [x] **Phase 26: 편의 기능** (completed 2026-04-14)
- [x] **Phase 27: v1.1 검증 위생 보강 (gap closure)** (completed 2026-04-14)
- [x] **Phase 28: v1.1 Nyquist validation 사후 보강 (gap closure)** (completed 2026-04-14)

### v1.2 phases

- [x] **Phase 29: SMTP 이메일 알림 인프라 (Retrofit)** - EmailService 스텁을 실 JavaMailSender 발송으로 전환하고 PENDING-first 로깅 + @Retryable 격리 + 5종 Thymeleaf 템플릿으로 5개 결재 이벤트 알림 완성 (completed 2026-04-23)
- [x] **Phase 30: 검색 권한 WHERE 절 보안 수정 + 필터 확장** - FSD FN-SEARCH-001 권한 predicate(보안 수정) + drafterId 필터 + URL query 동기화 페이지네이션 구현 (completed 2026-04-27)
- [x] **Phase 31: 대시보드 고도화** - 4번째 "진행 중" 카운트 카드 노출 + 결재 mutation 후 invalidateQueries 로 실시간 갱신 + 로딩/빈 상태 UI (completed 2026-04-24)
- [x] **Phase 32: CUSTOM 프리셋 확장** - v1.1 빌더 기반 회의록/품의서 JSON 프리셋 2종 추가 (하드코딩 컴포넌트 없이) (completed 2026-04-26)
- [x] **Phase 33: E2E 검증 + 운영 전환** - 보안 보강(application-prod.yml 자격증명 위생) + 운영 SMTP 런북 + NFR-01 운영 모니터링 게이트 + v1.2-MILESTONE-AUDIT 9 출시 게이트 (completed 2026-04-28)
- [x] **Phase 34: 양식 기안자 정보 헤더 자동 채움** - 모든 양식 14 통합 지점에 always-on `DrafterInfoHeader` (부서/직위·직책/기안자/기안일) + SUBMITTED-time snapshot 박제 + DRAFT live + legacy fallback (completed 2026-04-29)
- [x] **Phase 35: 백엔드 로그 설정** - Spring Boot 3.x logging.* properties (logback-spring.xml 미사용) 일별 롤링 + 30일 보관 + prod=INFO/dev=전체 프로필별 분리 + UTF-8 + gzip + 1GB cap (completed 2026-04-29)
- [ ] **Phase 36: 양식 필드 한 줄 최대 3개 레이아웃** - 양식 한 줄에 최대 3개 필드 배치 가능하도록 폼 렌더러/빌더 확장

## Phase Details

### Phase 21: SchemaFieldEditor 리팩토링
**Goal**: 관리자가 동일한 기능을 사용하면서도 코드 유지보수성이 확보된 컴포넌트 구조를 갖는다
**Depends on**: Nothing (v1.1 첫 번째 phase, v1.0 완료 기반)
**Requirements**: RFT-01
**Success Criteria** (what must be TRUE):
  1. SchemaFieldEditor가 FieldCard, FieldConfigEditor 등 명확한 책임의 하위 컴포넌트로 분리되어 있다
  2. 기존 양식 생성/편집 기능이 리팩토링 전과 동일하게 작동한다 (필드 추가/삭제/순서변경/설정)
  3. 각 하위 컴포넌트가 독립적으로 테스트 가능한 크기이다 (200줄 이하)
**Plans:** 1/1 plans complete
Plans:
- [x] 21-01-PLAN.md — 폴더 생성 + 하위 모듈 추출 + barrel export

### Phase 22: 분할 레이아웃 + 라이브 미리보기
**Goal**: 관리자가 양식을 편집하면서 실시간으로 결과물을 확인할 수 있는 분할 화면 환경을 갖는다
**Depends on**: Phase 21
**Requirements**: RFT-02, PRV-01, PRV-02, PRV-03
**Success Criteria** (what must be TRUE):
  1. TemplateFormModal이 near-fullscreen 크기로 열리며 좌측 편집/우측 미리보기 분할 레이아웃을 보여준다
  2. 관리자가 필드를 추가/수정/삭제하면 우측 미리보기 패널에 변경사항이 실시간으로 반영된다
  3. 관리자가 전체화면 미리보기 버튼을 클릭하면 완성된 폼이 포탈 모달로 표시된다
  4. 관리자가 미리보기 패널 표시/숨김을 토글하여 편집 영역을 전체 너비로 사용할 수 있다
**Plans:** 2/2 plans complete
Plans:
- [x] 22-01-PLAN.md — FormPreview 컴포넌트 생성 + i18n 키 추가
- [x] 22-02-PLAN.md — TemplateFormModal 분할 레이아웃 전환 + FormPreview 통합
**UI hint**: yes

### Phase 23: 테이블 컬럼 편집기
**Goal**: 관리자가 table 타입 필드의 컬럼 구조를 시각적으로 설계하고 설정할 수 있다
**Depends on**: Phase 22
**Requirements**: TBL-01, TBL-02
**Success Criteria** (what must be TRUE):
  1. 관리자가 table 필드 선택 시 컬럼 편집 UI에서 컬럼을 추가/삭제/드래그 순서변경할 수 있다
  2. 관리자가 각 컬럼의 타입(text/number/date/select), 라벨, 필수여부를 설정할 수 있다
  3. 컬럼 변경사항이 미리보기 패널의 테이블에 실시간 반영된다
**Plans:** 2/2 plans complete
Plans:
- [x] 23-01-PLAN.md — @dnd-kit 설치 + TableColumn 타입 정의 + TableColumnEditor 핵심 컴포넌트 + FieldConfigEditor 연결
- [x] 23-02-PLAN.md — ColumnConfigPanel 타입별 설정 + 행 설정 + PreviewFieldRenderer 테이블 미리보기 + i18n
**UI hint**: yes

### Phase 24: 조건부 표시 규칙 UI
**Goal**: 관리자가 필드 간 조건부 표시/숨김 관계를 직관적으로 설정할 수 있다
**Depends on**: Phase 23
**Requirements**: CND-01, CND-02
**Success Criteria** (what must be TRUE):
  1. 관리자가 필드별 설정 패널에서 조건 탭을 열어 IF-THEN 규칙을 설정할 수 있다 (IF 필드 = 값 THEN 표시/숨김/필수/선택)
  2. 설정된 조건 규칙이 미리보기 패널에서 동작하여 필드 표시/숨김이 실시간 확인된다
  3. 필드 삭제 시 해당 필드를 참조하는 조건 규칙이 자동으로 정리되며, 사용자에게 알림이 표시된다
**Plans:** 2/2 plans complete
Plans:
- [x] 24-01-PLAN.md — 조건 규칙 편집 UI 핵심 컴포넌트 + 유틸리티 + i18n
- [x] 24-02-PLAN.md — 인터랙티브 미리보기 + TemplateFormModal 상태 통합 + 저장 검증
**UI hint**: yes

### Phase 24.1: 사용자 측 동적 폼 렌더러 - CUSTOM 템플릿으로 기안 작성/조회를 위한 DynamicFormRenderer 구현 (INSERTED)

**Goal:** 관리자가 양식 빌더로 만든 CUSTOM 템플릿(SchemaDefinition)을 사용자가 실제 기안 작성/편집/읽기 전용 조회할 수 있도록 DynamicFormRenderer를 구축하고, 양식 변경 이후에도 과거 문서는 schemaSnapshot 기반으로 원본 그대로 표시된다.
**Requirements**: D-01~D-26 (locked decisions in 24.1-CONTEXT.md) + IR-01~IR-09 (implicit requirements in 24.1-RESEARCH.md)
**Depends on:** Phase 24
**Plans:** 5/5 plans complete

Plans:
- [x] 24.1-01-PLAN.md — 타입 확장(DocumentDetailResponse.schemaDefinitionSnapshot, TemplateEditProps/TemplateReadOnlyProps.schemaSnapshot) + baseline build
- [x] 24.1-02-PLAN.md — DynamicFieldRenderer 추출 + DynamicTableField(useFieldArray) + adaptSchemaField adapter
- [x] 24.1-03-PLAN.md — DynamicCustomForm(RHF+실시간 조건/계산 평가) + DynamicCustomReadOnly
- [x] 24.1-04-PLAN.md — admin FormPreview 리팩터링(DynamicFieldRenderer 위임) + DocumentEditorPage/DocumentDetailPage CUSTOM fallback 분기
- [x] 24.1-05-PLAN.md — 통합 검증(tsc+build) + admin 회귀 수동 UAT + CUSTOM end-to-end UAT

### Phase 25: 계산 규칙 UI
**Goal**: 관리자가 숫자 필드에 자동 계산 공식을 설정하고 오류를 사전에 방지할 수 있다
**Depends on**: Phase 23
**Requirements**: CAL-01, CAL-02
**Success Criteria** (what must be TRUE):
  1. 관리자가 숫자 필드의 설정 패널에서 계산 탭을 열어 공식을 설정할 수 있다 (SUM, 사칙연산, 테이블 컬럼 참조)
  2. 설정된 계산 공식이 미리보기 패널에서 실시간 계산 결과를 보여준다
  3. 순환 의존성(A참조B, B참조A) 설정 시 실시간 경고 메시지가 표시되고 저장이 차단된다
**Plans:** 3/3 plans complete
Plans:
- [x] 25-01-PLAN.md — 계산 공식 편집 UI 핵심 컴포넌트 + 유틸리티
- [x] 25-02-PLAN.md — 미리보기 패널 실시간 계산 + 순환 의존성 감지
- [x] 25-03-PLAN.md — admin FormPreview 에 실시간 계산 엔진 통합 + 48-item UAT
**UI hint**: yes

### Phase 26: 편의 기능
**Goal**: 관리자가 양식을 빠르게 복제/내보내기/가져오기하고 프리셋으로 시작할 수 있다
**Depends on**: Phase 22
**Requirements**: CNV-01, CNV-02, CNV-03, CNV-04
**Success Criteria** (what must be TRUE):
  1. 관리자가 기존 양식의 복제 버튼을 클릭하여 동일한 스키마의 새 양식을 즉시 생성할 수 있다
  2. 관리자가 양식 스키마를 JSON 파일로 다운로드할 수 있다
  3. 관리자가 JSON 파일을 업로드하면 Zod 검증을 거쳐 양식이 생성되며, 검증 실패 시 상세 오류가 표시된다
  4. 관리자가 프리셋 템플릿(경비, 신청서 등) 목록에서 선택하여 새 양식을 빠르게 시작할 수 있다
**Plans:** 2/2 plans complete
Plans:
- [x] 26-01-PLAN.md — 기반: templateImportSchema(Zod) + templateExport 유틸 + 4종 프리셋 JSON + TemplateFormModal initialValues prop + Vitest 단위 테스트
- [x] 26-02-PLAN.md — UI 통합: TemplateCreateChoiceModal + PresetGallery + ImportTemplateModal + TemplateTable Copy/Download 버튼 + TemplateListPage 상태 머신 + i18n + 수동 UAT
**UI hint**: yes

### Phase 27: v1.1 검증 위생 보강 — 코드 FLAG + HUMAN UAT (GAP CLOSURE)
**Goal**: v1.1-MILESTONE-AUDIT 에서 발견된 통합 FLAG(1건)를 수정하고 Phase 21~24 의 HUMAN-UAT 기록 공백을 채운다
**Depends on**: Phase 26
**Requirements**: CND-01, CND-02 (regression protection — 이미 SATISFIED 상태이나 FLAG 해소로 보강)
**Gap Closure**: `.planning/v1.1-MILESTONE-AUDIT.md` 의 integration FLAG + HUMAN-UAT tech debt
**Success Criteria** (what must be TRUE):
  1. TemplateFormModal.tsx L132-135 에 `setConditionalRules([])` 가 추가되어 편집 모드 빈 스키마 분기에서 conditionalRules 상태가 올바르게 리셋된다
  2. Phase 21, 23 의 HUMAN-UAT 파일이 생성되고 모든 수동 검증 항목이 pass 로 기록된다
  3. Phase 22, 24 의 HUMAN-UAT 체크리스트가 채워지고 status 가 partial → complete 로 전환된다
  4. TypeScript 빌드와 기존 UAT 회귀가 그대로 통과한다
**Plans:** 3/3 plans complete
Plans:
- [x] 27-01-PLAN.md — TemplateFormModal conditionalRules 리셋 누락 FLAG 수정 (CND-01/02)
- [x] 27-02-PLAN.md — Phase 21/23 HUMAN-UAT 파일 생성 및 수동 검증 실행
- [x] 27-03-PLAN.md — Phase 22/24 HUMAN-UAT 완료 전환 + TypeScript 빌드 재확인

### Phase 28: v1.1 Nyquist validation 사후 보강 (GAP CLOSURE, OPTIONAL)
**Goal**: Phase 21/22/24/25/26 의 VALIDATION.md 를 생성·보완해 Nyquist 호환 상태로 만든다
**Depends on**: Phase 27
**Requirements**: — (validation hygiene only)
**Gap Closure**: `.planning/v1.1-MILESTONE-AUDIT.md` 의 Nyquist missing/partial 5건
**Success Criteria** (what must be TRUE):
  1. Phase 21, 25 에 VALIDATION.md 가 신규 생성되어 nyquist_compliant 상태가 기록된다
  2. Phase 22, 24, 26 의 VALIDATION.md 가 갱신되어 wave_0_complete + nyquist_compliant 가 true 로 전환된다
  3. `.planning/v1.1-MILESTONE-AUDIT.md` 의 Nyquist 섹션을 재실행 시 overall 이 compliant 로 승격된다
**Plans:** 2/2 plans complete
Plans:
- [x] 28-01-PLAN.md — Create 21-VALIDATION.md and 25-VALIDATION.md (new Nyquist records)
- [x] 28-02-PLAN.md — Flip 22/24/26-VALIDATION.md to compliant + refresh v1.1-MILESTONE-AUDIT.md
**Note**: Nyquist 게이트는 strict 가 아니므로 v1.1 완료를 차단하지 않음. 수용 가능한 tech debt 이나 본 phase 로 잔부 청산.

### Phase 29: SMTP 이메일 알림 인프라 (Retrofit)
**Goal**: 기안자/결재자가 결재 이벤트 5종(상신·중간 승인·최종 승인·반려·회수) 발생 시 한글 HTML 이메일을 자동 수신하고, 이메일 발송이 결재 트랜잭션을 블로킹하지 않으며 실패는 `notification_log` 에 PENDING→SUCCESS/FAILED 로 기록된다
**Depends on**: Phase 28 (v1.1 milestone 종료)
**Requirements**: NOTIF-01, NOTIF-02, NOTIF-03, NOTIF-04, NOTIF-05, NFR-02, NFR-03
**Context**: 인프라 70% 이미 스캐폴딩 (`spring-boot-starter-mail`, thymeleaf, spring-retry, `@EnableAsync`, `NotificationLog`, `ApprovalNotificationEvent` + 5개 `publishEvent()` 호출 지점). `RegistrationEmailService` 가 동작하는 참조 구현. 본 phase 는 `EmailService` 스텁 제거 + `ApprovalEmailSender` 격리 + 5개 Thymeleaf 템플릿 + PENDING-first 로깅.
**Success Criteria** (what must be TRUE):
  1. 기안자가 문서를 상신하면 첫 번째 비-REFERENCE 승인자에게 `[MiceSign] 결재 요청: {docNumber} {title}` 제목의 HTML 이메일이 도착한다 (MailHog/GreenMail 로 검증 가능)
  2. 이메일 본문의 "문서 바로가기" 버튼을 클릭하면 `{app.base-url}/documents/{id}` 로 이동해 해당 문서 상세 페이지가 열린다 (한글 subject 깨지지 않음, UTF-8)
  3. SMTP 연결 실패·transient 에러 발생 시 `@Retryable(maxAttempts=3)` 이 5분 간격 재시도하고, 최종 실패 시 `notification_log.status = FAILED` + `error_message` 가 기록된다 (PENDING 고아 행 없음)
  4. RETIRED/INACTIVE 상태의 수신자는 발송 대상에서 자동 제외되며, 같은 (`document_id`, `event_type`, `recipient_id`) 조합으로는 중복 SUCCESS 행이 생기지 않는다
  5. 결재 상신/승인/반려 API 응답은 메일 발송 결과와 독립적으로 즉시 반환되고 (`@Async` + `AFTER_COMMIT`), 리스너에서 `audit_log` 추가 INSERT 없이 `COUNT=1 per action` 테스트가 통과한다
**Plans:** 5/5 plans complete
Plans:
- [x] 29-01-PLAN.md — Schema + Entity + ApprovalEmailSender skeleton + BaseUrlGuard (Wave 1)
- [x] 29-02-PLAN.md — Thymeleaf layout fragment + 5 event templates (Wave 2)
- [x] 29-03-PLAN.md — EmailService 리팩터 + ApprovalEmailSender 실 send 로직 (Wave 2)
- [x] 29-04-PLAN.md — GreenMail 통합 + @Retryable/@Recover 테스트 (Wave 3)
- [x] 29-05-PLAN.md — application-prod.yml app.base-url + ApprovalServiceAuditTest (NFR-03) (Wave 3)
**UI hint**: no

### Phase 30: 검색 권한 WHERE 절 보안 수정 + 필터 확장
**Goal**: 사용자가 본인 권한 범위 내 문서만 검색/필터링할 수 있고 (타인 DRAFT 노출 금지), 제목·문서번호·상태(복수)·양식·기간·기안자 복합 조건을 URL-shareable 한 페이지네이션으로 사용할 수 있다 — 운영 중 보안 취약점(SRCH-01) 을 첫 PR 로 해소한다
**Depends on**: Phase 28 (v1.1 milestone) — Phase 29 와 독립, 병렬 가능
**Requirements**: SRCH-01, SRCH-02, SRCH-03, SRCH-04, SRCH-05, SRCH-06, NFR-01
**Context**: `DocumentRepositoryCustomImpl.searchDocuments()` 는 tab 스코프만 있고 FSD FN-SEARCH-001 의 `EXISTS approval_line` 분기 + `status != DRAFT` (tab=my 예외) 누락 — **운영 중인 보안 사고** (REFERENCE 라인 접근자가 자기 문서조차 못 찾고, ADMIN 이 타 부서 DRAFT 를 열 수 있음). 키워드·상태·양식·기간 필터 UI 는 완성, `drafterId` 만 신규. Offset 페이지네이션 유지.
**Success Criteria** (what must be TRUE):
  1. 사용자 A 가 기안한 SUBMITTED 문서의 approval_line 에 승인자로 등록된 사용자 B 가 `/api/v1/documents/search` 를 호출하면 해당 문서가 결과에 포함되고, 무관한 사용자 C 가 호출하면 결과에서 제외된다 (FSD FN-SEARCH-001 권한 predicate 통과)
  2. `tab=department` / `tab=all` 조회 결과에서는 모든 문서의 `status != DRAFT` 가 보장되며, `tab=my` 에서만 본인 DRAFT 가 노출된다 (타인 DRAFT 노출 zero)
  3. 사용자가 키워드 + 상태(복수 선택) + 양식(단일) + 기간(시작일~종료일) + 기안자(드롭다운) 를 조합해 검색하고, 현재 필터·페이지가 URL query string 에 반영되어 링크 공유로 동일 결과를 재현할 수 있다
  4. 10,000 개 문서 seed + 50 동시 사용자 부하에서 95p 응답 시간 ≤ 1초 (EXPLAIN 기반 인덱스 사용 확인, `countDistinct` 로 페이지 총개수 정확)
  5. 페이지 크기 20 의 offset 페이지네이션이 동작하며, 결과 행의 `totalElements` 가 실제 접근 가능 문서 수와 일치한다 (JOIN 중복 inflate 없음)
**Plans:** 5/5 plans complete
Plans:
- [x] 30-01-PLAN.md — DocumentSearchCondition 개편 + Controller 시그니처 + enum 변환 + GlobalExceptionHandler (PR1)
- [x] 30-02-PLAN.md — QueryDSL 권한 predicate + DRAFT gate + countDistinct + 28-case 매트릭스 테스트 (PR1)
- [x] 30-03-PLAN.md — /users/search 엔드포인트 신설 + drafterId 필터 회귀 (PR2)
- [x] 30-04-PLAN.md — 프론트 axios paramsSerializer + DocumentListPage useSearchParams + DrafterCombo/StatusFilterPills (PR2)
- [x] 30-05-PLAN.md — 10K seed + ab 벤치 + EXPLAIN + URL 공유 UAT (PR2)
**UI hint**: yes

### Phase 31: 대시보드 고도화
**Goal**: 사용자가 대시보드 한 화면에서 결재 대기/진행 중/승인 완료/반려 4종 카운트와 처리할 결재 5건·내가 기안한 최근 5건을 보며, 승인·반려·상신·회수 액션 직후 카운트와 목록이 자동 갱신된다
**Depends on**: Phase 28 (v1.1 milestone) — Phase 29/30 과 독립, 가장 경량
**Requirements**: DASH-01, DASH-02, DASH-03, DASH-04, DASH-05
**Context**: 백엔드 `DashboardSummaryResponse` 에 `submittedCount` 이미 포함, 3개 CountCard(pending/drafts/completed) 만 표시 중. 본 phase 는 4번째 CountCard 추가 + TanStack Query `invalidateQueries(['dashboard'])` 훅업 + skeleton/empty 상태.
**Success Criteria** (what must be TRUE):
  1. 대시보드 상단에 "결재 대기 / 진행 중 / 승인 완료 / 반려" 4개의 CountCard 가 나타나고, 로그인 사용자의 권한·스코프에 맞는 숫자가 표시된다 (USER vs ADMIN 경계 유지)
  2. 대시보드 중앙에 "내가 처리할 결재 5건" + "내가 기안한 최근 문서 5건" 목록이 나란히 렌더되며, "새 문서 작성" CTA 버튼이 양식 선택 화면으로 이동시킨다
  3. 로딩 중에는 skeleton UI, 결과가 없을 때는 각 위젯 내 empty 상태(일러스트 + 문구)가 표시된다
  4. 사용자가 결재를 승인·반려·상신·회수하는 mutation 이 성공하면 `queryClient.invalidateQueries(['dashboard'])` 가 즉시 호출되어 카운트·목록이 재조회되고 UI 에 반영된다 (페이지 이동 없이)
**Plans:** 6/6 plans complete
Plans:
- [x] 31-01-PLAN.md — BE foundation: DashboardSummaryResponse rejectedCount + DepartmentRepository.findDescendantIds CTE + count repos + D-A9 Option 1 predicate upgrade
- [x] 31-02-PLAN.md — DashboardService role-based aggregation + DashboardServiceIntegrationTest matrix + Phase 30 hierarchy regression
- [x] 31-03-PLAN.md — FE types (rejectedCount) + useDashboard single-hook (placeholderData) + i18n 5 new keys
- [x] 31-04-PLAN.md — DashboardPage 4-card + role-based navigation + ErrorState + CountCard isError + list props-drill + smoke tests
- [x] 31-05-PLAN.md — Mutation invalidate hookup (4 hooks) + invalidate spy tests + 31-HUMAN-UAT.md checklist
**UI hint**: yes

### Phase 32: CUSTOM 프리셋 확장
**Goal**: 관리자가 v1.1 CUSTOM 빌더의 프리셋 갤러리에서 회의록/품의서 JSON 프리셋을 선택해 양식을 즉시 생성할 수 있다 — 신규 하드코딩 컴포넌트 없이 프리셋 JSON 추가만으로 확장
**Depends on**: Phase 28 (v1.1 milestone) — Phase 29/30/31 과 독립, 위험도 최저
**Requirements**: FORM-01, FORM-02
**Context**: v1.1 Phase 26 에서 이미 4종 프리셋(expense/leave/purchase/trip) + Zod 검증 import 파이프라인 구축 완료. 본 phase 는 `presets/*.json` 2개 추가 + `presets/index.ts` 등록. 빌드 파이프라인/렌더러/스키마 스냅샷 불변성 모두 v1.1 자산 재활용.
**Success Criteria** (what must be TRUE):
  1. 관리자가 양식 생성 모달의 프리셋 갤러리에서 "회의록" 을 선택하면 회의 일시/참석자/안건/결정사항 필드가 사전 정의된 CUSTOM 스키마가 즉시 로드되어 저장 없이 편집 가능한 상태로 열린다
  2. 관리자가 "품의서" 프리셋을 선택하면 품의 배경·제안 내용·예상 효과·첨부 필드가 사전 정의된 CUSTOM 스키마가 즉시 로드된다
  3. 두 프리셋 JSON 모두 v1.1 `templateImportSchema` Zod 검증을 통과하고, 프리셋 기반으로 생성된 양식이 사용자 기안 화면에서 `DynamicCustomForm` 으로 정상 렌더된다 (과거 문서 snapshot 불변성 유지)
**Plans:** 6/6 plans complete
Plans:
- [x] 32-01-PLAN.md — meeting.json 작성 + Zod 통과 (Wave 1, FORM-01)
- [x] 32-02-PLAN.md — proposal.json 작성 + Zod 통과 (Wave 1, FORM-02)
- [x] 32-03-PLAN.md — PresetGallery ICON_MAP/I18N_MAP 4 entry 추가 (Wave 2, FORM-01/02)
- [x] 32-04-PLAN.md — ko/admin.json 4 신규 i18n 키 추가 (Wave 2, FORM-01/02)
- [x] 32-05-PLAN.md — presets.test.ts length=6 + meeting/proposal 신규 단언 (Wave 2, FORM-01/02)
- [x] 32-06-PLAN.md — 통합 검증 PASS + HUMAN-UAT signed off 2026-04-26 + 32-REVIEW-FIX 4 fixes (Wave 3)
**Code Review:** 32-REVIEW.md (status=issues_found, 0 critical / 2 warning / 5 info) → 32-REVIEW-FIX.md (4 fixed: WR-02/IN-01/IN-02/IN-03 / 3 skipped: WR-01·IN-04·IN-05 with CONTEXT-D-A5/D-C5/D-E1 + UAT T-32-02 rationale)
**UI hint**: yes

### Phase 33: E2E 검증 + 운영 전환
**Goal**: v1.2 전체 마일스톤을 운영 환경으로 배포 가능한 상태로 끌어올린다 — MailHog→운영 SMTP 전환 런북, 10K 문서 seed 기반 검색 1초 NFR 실측, 5종 이벤트 end-to-end 회귀, 감사 로그 중복 없음 확인
**Depends on**: Phase 29, Phase 30, Phase 31, Phase 32 (모든 기능 phase 완료)
**Requirements**: — (validation/ops hygiene only; 기존 NFR-01/NFR-02/NFR-03 실측 재확인)
**Context**: 선택적 wrap-up phase. Phase 29-32 가 각자 단위 검증을 끝냈다면 본 phase 는 축소 가능. 주 산출물은 운영 SMTP 런북(`application-prod.yml` 점검 포함), 성능 벤치 리포트, v1.2-MILESTONE-AUDIT.
**Success Criteria** (what must be TRUE):
  1. MailHog 개발 환경에서 5종 이벤트(상신/중간 승인/최종 승인/반려/회수) 이메일이 각각 1통씩 정확히 도착하고, 운영 SMTP 전환 런북(`MAIL_HOST/MAIL_PORT/MAIL_USERNAME/MAIL_PASSWORD` 체크리스트 + `app.base-url` 검증)이 문서화된다
  2. 10,000 문서 seed + 50 동시 사용자 부하 테스트에서 `/api/v1/documents/search` 95p ≤ 1초가 실측 통과하고 측정 리포트가 `.planning/milestones/v1.2/` 에 기록된다
  3. 결재 승인·반려 직후 대시보드 `invalidateQueries` 가 실시간으로 반영되며, `audit_log` 에 각 action 당 정확히 1개 row 가 존재한다 (SMTP 리스너로 인한 중복 없음)
**Plans:** 5/5 plans complete
Plans:
- [x] 33-01-PLAN.md — 보안 보강: application-prod.yml 자격증명 위생 + .env.production 카탈로그 + .gitignore 차단 (D-C1, Wave 1)
- [x] 33-02-PLAN.md — 운영 SMTP 전환 런북 (.planning/milestones/v1.2/SMTP-RUNBOOK.md — 사내 IT 협업 + systemd EnvironmentFile + 5종 smoke + 트러블슈팅, D-M1/M2/M3, Wave 2)
- [x] 33-03-PLAN.md — NFR-01 운영 모니터링 게이트 (.planning/milestones/v1.2/MONITORING.md — slow_query_log + 3 신호 + Plan 30-05 인프라 재활용 절차, D-S2, Wave 2)
- [x] 33-04-PLAN.md — v1.2-MILESTONE-AUDIT (.planning/milestones/v1.2/AUDIT.md — SC 매트릭스 + Deferred 추적 + Requirements 매핑 + 9 출시 게이트 + 5종 smoke 사용자 sign-off, D-A1, Wave 3)
- [x] 33-05-PLAN.md — Phase 33 종결 verification + ROADMAP/STATE/VALIDATION 갱신 + v1.2 archive 시점 결정 (Wave 4)
**Note**: 본 phase 는 사용자 결정 D-S1 (CONTEXT.md) 에 따라 축소 scope — NFR-01 합성 부하 실측은 운영 모니터링 게이트로 이관 (`.planning/milestones/v1.2/MONITORING.md` §3 + AUDIT.md §2-A)
**UI hint**: no

## Progress

**Execution Order:**
Phases execute in numeric order: 29 -> 30 -> 31 -> 32 -> 33 -> 34 -> 35
(Phases 29, 30, 31, 32 모두 Phase 28 에만 의존하므로 병렬 작업 가능 — 권장 순서: 29 먼저(함정 밀도 최고), 30 의 SRCH-01 보안 수정은 첫 PR 로 조기 착수, 31/32 는 휴식 사이클, 33 은 모든 phase 완료 후. Phase 34 는 v1.2 ship-ready 이후 추가된 양식 헤더 보강 — Phase 32 (CUSTOM 프리셋) 와 독립 병행 가능. Phase 35 는 운영 환경 배포 전 로깅 인프라 정립 — 어떤 phase 와도 의존성 없음. Phase 36 은 v1.2 ship-ready 이후 추가된 양식 레이아웃 확장 — Phase 21~26 의 양식 빌더 인프라 위에서 작업)

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Project Foundation | v1.0 | 3/3 | Complete | 2026-03-31 |
| 2. Authentication | v1.0 | 4/4 | Complete | 2026-04-02 |
| 3. Organization Management | v1.0 | 4/4 | Complete | 2026-04-03 |
| 4. Document Core & Templates | v1.0 | 3/3 | Complete | 2026-04-05 |
| 5. File Attachments | v1.0 | 3/3 | Complete | 2026-04-10 |
| 6. Document Submission & Numbering | v1.0 | Done | Complete | 2026-04-10 |
| 7. Approval Workflow | v1.0 | Done | Complete | 2026-04-10 |
| 8. Dashboard & Audit | v1.0 | Done | Complete | 2026-04-10 |
| 21. SchemaFieldEditor 리팩토링 | v1.1 | 1/1 | Complete    | 2026-04-11 |
| 22. 분할 레이아웃 + 라이브 미리보기 | v1.1 | 2/2 | Complete    | 2026-04-11 |
| 23. 테이블 컬럼 편집기 | v1.1 | 2/2 | Complete    | 2026-04-12 |
| 24. 조건부 표시 규칙 UI | v1.1 | 2/2 | Complete   | 2026-04-12 |
| 24.1 사용자 측 동적 폼 렌더러 (INSERTED) | v1.1 | 5/5 | Complete   | 2026-04-13 |
| 25. 계산 규칙 UI | v1.1 | 3/3 | Complete   | 2026-04-13 |
| 26. 편의 기능 | v1.1 | 2/2 | Complete   | 2026-04-14 |
| 27. v1.1 검증 위생 보강 (gap closure) | v1.1 | 3/3 | Complete   | 2026-04-14 |
| 28. v1.1 Nyquist validation 사후 보강 (gap closure) | v1.1 | 2/2 | Complete    | 2026-04-14 |
| 29. SMTP 이메일 알림 인프라 (Retrofit) | v1.2 | 5/5 | Complete    | 2026-04-23 |
| 30. 검색 권한 WHERE 절 보안 수정 + 필터 확장 | v1.2 | 5/5 | Complete    | 2026-04-27 |
| 31. 대시보드 고도화 | v1.2 | 6/6 | Complete    | 2026-04-24 |
| 32. CUSTOM 프리셋 확장 | v1.2 | 6/6 | Complete    | 2026-04-26 |
| 33. E2E 검증 + 운영 전환 | v1.2 | 5/5 | Complete    | 2026-04-28 |
| 34. 양식 기안자 정보 헤더 자동 채움 | v1.2 | 6/6 | Complete    | 2026-04-29 |
| 35. 백엔드 로그 설정 (logback 일별 롤링 + 30일 보관 + prod/dev 프로필 분리) | v1.2 | 1/1 | Complete    | 2026-04-29 |
| 36. 양식 필드 한 줄 최대 3개 레이아웃 | v1.2 | 0/4 | Not started | — |

### Phase 34: 양식 기안자 정보 헤더 자동 채움
**Goal**: 모든 결재 양식 최상단에 부서/직위·직책/기안자/기안일 4-필드 always-on 헤더가 자동 표시되며 (DRAFT 모드 = live, SUBMITTED 모드 = submit 시점 박제 snapshot, legacy 문서 = live + (현재 정보) 배지 fallback), 기안자가 이후 부서이동·승진해도 박제된 snapshot 은 변경되지 않는다 (D-A5 immutable).
**Depends on**: Phase 33 (v1.2 ship-ready 이후 추가 — Phase 32 와 독립 병행 가능)
**Requirements**: phase-local (REQUIREMENTS.md 신규 ID 부여 안 함 — D-A1~D-G4 decision IDs 만 추적, 사용자 결정 2026-04-29)
**Success Criteria** (what must be TRUE):
  1. 사용자가 신규 작성 화면 (DRAFT) 에서 모든 양식 (built-in 6 + CUSTOM 1) 의 최상단에 자동 표시되는 4-필드 헤더를 본다 — 기안일은 "—" 플레이스홀더
  2. 사용자가 문서를 상신하면 backend 가 동일 트랜잭션 내에서 drafter 의 부서/직위/이름/제출시각을 document_content.form_data 의 drafterSnapshot 키로 박제 — 직렬화 실패 시 트랜잭션 전체 롤백 (D-C7)
  3. 사용자가 SUBMITTED 문서를 조회하면 헤더가 snapshot 4 필드를 표시하며, snapshot 이 없는 legacy 문서는 live 정보 + (현재 정보) amber 배지로 fallback
  4. 14 통합 지점 (Edit 7 + ReadOnly 7) 모두 단일 DrafterInfoHeader 컴포넌트 + 단일 visual contract — 양식별 분기 로직 도입 0건
**Plans:** 6/6 plans complete
Plans:
- [x] 34-01-PLAN.md — Latent FE bug fix: DocumentDetailResponse flat-field alignment + L228 doc.drafter.name → doc.drafterName (Wave 1, D-G1/G2/G3)
- [x] 34-02-PLAN.md — BE auth 확장: UserProfileDto + AuthService.buildUserProfile + AuthControllerTest (Wave 1, D-F1/F2)
- [x] 34-03-PLAN.md — BE snapshot 캡처: DocumentService.submit drafterSnapshot 머지 + D-C7 롤백 + DocumentSubmitTest 3 신규 (Wave 1, D-A3/A4/C1~C7)
- [x] 34-04-PLAN.md — FE foundation: DrafterInfoHeader 컴포넌트 + 3-case vitest + UserProfile + 8 i18n + templateRegistry props (Wave 2, D-D1~D5/D7/E2)
- [x] 34-05-PLAN.md — FE 14-point integration: 7 Edit + 7 ReadOnly 헤더 삽입 + DocumentEditorPage/DocumentDetailPage props (Wave 3, D-D6/B1~B3)
- [x] 34-06-PLAN.md — 통합 검증 PASS (BE 170/173, FE 63/63, tsc 0, build OK) + 14-point HUMAN-UAT approved 2026-04-29 + ROADMAP/STATE/VALIDATION 동기화 (Wave 4)
**UI hint**: yes

### Phase 35: 백엔드 로그 설정 (logback 일별 롤링 + 30일 보관 + prod/dev 프로필 분리)

**Goal:** Spring Boot 백엔드의 로깅 인프라를 운영 배포 가능 수준으로 정립한다 — logback-spring.xml 신규 작성 없이 application*.yml 만으로 (1) 일별 롤링 (2) 30일 보관 (3) prod=INFO/dev=DEBUG 프로필 분리 (4) gzip 압축 + 1GB 디스크 안전망 + 한글 UTF-8 로그 + clean-history-on-start 정합성을 구현한다 (D-A1 채택, Spring Boot 3.x 표준 logging.* properties 만 사용).
**Requirements**: phase-local (LOG-01~04 — D-A1~D-G3 decision IDs 만 추적, 사용자 결정 2026-04-29)
**Depends on:** Phase 34 (none functional — sequence number only; 어떤 phase 와도 무관)
**Plans:** 1/1 plan complete

Plans:
- [x] 35-01-PLAN.md — application.yml logging 블록 + application-dev.yml root=DEBUG override + application-prod.yml.example LOG_DIR 카탈로그 + .gitignore backend/logs/ + dev/prod 부팅 smoke (Wave 1, D-A1~D-G3) — UAT approved 2026-04-29 (7/7 gates PASS)
**UI hint**: no

### Phase 36: 양식 필드 한 줄 최대 3개 레이아웃

**Goal:** CUSTOM 양식의 사용자 정의 필드들을 한 줄에 최대 3개까지 가로 배치할 수 있도록 SchemaField 데이터 모델 (rowGroup?: number, D-F1 option (i)) + 양식 빌더 명시적 row 그룹 설정 UI (RowPositionSelector pill 셀렉터 + FieldCard rowGroup 인디케이터 + force-single 가드) + DynamicCustomForm/ReadOnly/FormPreview 렌더러 grid 도입 (md+ md:grid-cols-{1,2,3} + sm 1-col fallback) — 3 layer 작업. CUSTOM 양식만 적용 (built-in 6 무수정), wide 필드 (textarea/table) 단독 행 강제, 기존 SUBMITTED 문서는 schemaSnapshot 으로 vertical stack 그대로 유지 (zero layout shift), 하드 캡 = 3 (visual disable + Zod refine + 런타임 방어 3-layer).
**Requirements**: phase-local (D-A1~D-G5 decision IDs 추적, 사용자 결정 2026-04-30)
**Depends on:** Phase 35 (sequence number only — 기능 의존성은 Phase 21~26 의 양식 빌더 인프라 + Phase 24.1 의 DynamicCustomForm 렌더러 + Phase 34 의 14 통합 지점 위에서 작업)
**Plans:** 4 plans

Plans:
- [x] 36-01-PLAN.md — Wave 1: SchemaField/FieldDefinition rowGroup 확장 + WIDE_TYPES/dynamic-class 상수 + Zod refine 2종 (wide-type 가드 + cap=3) + groupFieldsByRow 유틸 + 8-case unit test (completed 2026-04-30, 5 commits, 7 files, 14 new tests, tsc 0 errors, full vitest 77 pass)
- [ ] 36-02-PLAN.md — Wave 2: RowPositionSelector NEW 컴포넌트 + 8-case vitest + FieldCard 통합 (border-l + 헤더 pill/badge + 확장 패널 셀렉터) + SchemaFieldEditor rowOccupancy memo + force-single 가드
- [ ] 36-03-PLAN.md — Wave 3: FormPreview + DynamicCustomForm + DynamicCustomReadOnly grid 도입 (D-D1 backward compat invariant + D-19 hidden-field 처리 보존)
- [ ] 36-04-PLAN.md — Wave 4: ko/admin.json 13 i18n 키 + ko/document.json ARIA 미러 + 통합 회귀 (tsc/vitest/vite build + dynamic class CSS 토큰 검증) + 7-gate HUMAN-UAT
**UI hint**: yes

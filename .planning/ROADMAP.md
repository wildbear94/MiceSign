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

- **v1.1 양식 생성 모달 창 고도화** - Phases 21-26 (in progress)

## Phases

**Phase Numbering:**
- Phases 1-8: v1.0 Phase 1-A MVP (complete)
- Phases 21-26: v1.1 양식 생성 모달 창 고도화
- Decimal phases (e.g., 22.1): Urgent insertions (marked with INSERTED)

- [x] **Phase 21: SchemaFieldEditor 리팩토링** - 596줄 모놀리식 컴포넌트를 유지보수 가능한 하위 컴포넌트로 분리 (completed 2026-04-11)
- [x] **Phase 22: 분할 레이아웃 + 라이브 미리보기** - 모달을 near-fullscreen 분할 뷰로 확장하고 실시간 프리뷰 패널 구축 (completed 2026-04-11)
- [ ] **Phase 23: 테이블 컬럼 편집기** - table 타입 필드에 컬럼 추가/삭제/순서변경/타입설정 기능 구현
- [ ] **Phase 24: 조건부 표시 규칙 UI** - 필드별 조건부 표시/숨김 규칙 설정 인터페이스 구축
- [ ] **Phase 25: 계산 규칙 UI** - 숫자 필드 계산 공식 설정 및 순환 의존성 감지 구현
- [ ] **Phase 26: 편의 기능** - 양식 복제, JSON 내보내기/가져오기, 프리셋 템플릿 기능 구현

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
**Plans:** 2 plans
Plans:
- [ ] 23-01-PLAN.md — @dnd-kit 설치 + TableColumn 타입 정의 + TableColumnEditor 핵심 컴포넌트 + FieldConfigEditor 연결
- [ ] 23-02-PLAN.md — ColumnConfigPanel 타입별 설정 + 행 설정 + PreviewFieldRenderer 테이블 미리보기 + i18n
**UI hint**: yes

### Phase 24: 조건부 표시 규칙 UI
**Goal**: 관리자가 필드 간 조건부 표시/숨김 관계를 직관적으로 설정할 수 있다
**Depends on**: Phase 23
**Requirements**: CND-01, CND-02
**Success Criteria** (what must be TRUE):
  1. 관리자가 필드별 설정 패널에서 조건 탭을 열어 IF-THEN 규칙을 설정할 수 있다 (IF 필드 = 값 THEN 표시/숨김/필수/선택)
  2. 설정된 조건 규칙이 미리보기 패널에서 동작하여 필드 표시/숨김이 실시간 확인된다
  3. 필드 삭제 시 해당 필드를 참조하는 조건 규칙이 자동으로 정리되며, 사용자에게 알림이 표시된다
**Plans**: TBD
**UI hint**: yes

### Phase 25: 계산 규칙 UI
**Goal**: 관리자가 숫자 필드에 자동 계산 공식을 설정하고 오류를 사전에 방지할 수 있다
**Depends on**: Phase 23
**Requirements**: CAL-01, CAL-02
**Success Criteria** (what must be TRUE):
  1. 관리자가 숫자 필드의 설정 패널에서 계산 탭을 열어 공식을 설정할 수 있다 (SUM, 사칙연산, 테이블 컬럼 참조)
  2. 설정된 계산 공식이 미리보기 패널에서 실시간 계산 결과를 보여준다
  3. 순환 의존성(A참조B, B참조A) 설정 시 실시간 경고 메시지가 표시되고 저장이 차단된다
**Plans**: TBD
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
**Plans**: TBD
**UI hint**: yes

## Progress

**Execution Order:**
Phases execute in numeric order: 21 -> 22 -> 23 -> 24 -> 25 -> 26
(Phase 24 and 25 both depend on Phase 23; Phase 26 depends only on Phase 22)

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
| 23. 테이블 컬럼 편집기 | v1.1 | 0/2 | Not started | - |
| 24. 조건부 표시 규칙 UI | v1.1 | 0/? | Not started | - |
| 25. 계산 규칙 UI | v1.1 | 0/? | Not started | - |
| 26. 편의 기능 | v1.1 | 0/? | Not started | - |

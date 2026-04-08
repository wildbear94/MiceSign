# Phase 20: Admin Registration Management UI - Context

**Gathered:** 2026-04-08
**Status:** Ready for planning

<domain>
## Phase Boundary

SUPER_ADMIN이 등록 신청을 조회, 승인(부서/직급/사원번호 지정), 거부(사유 입력)할 수 있는 관리자 페이지 구현.

프론트엔드 등록 신청 폼(Phase 21), rate limiting(Phase 21), 이메일 알림(Phase 19 완료)은 이 페이즈에 포함되지 않음.

</domain>

<decisions>
## Implementation Decisions

### 목록/필터링 레이아웃
- **D-01:** 탭 버튼으로 상태 필터링 — 전체/대기중/승인/거부/만료/취소 6개 탭
- **D-02:** 기본 선택 탭: 대기중 (PENDING). SUPER_ADMIN이 가장 먼저 처리할 신청들 표시.
- **D-03:** 테이블 컬럼: 신청자명, 이메일, 신청일, 상태 배지. 승인/거부된 것은 처리일도 표시.
- **D-04:** 행 클릭 시 상세 통합 모달 열기 (UserFormModal 패턴과 유사)
- **D-05:** 기본 정렬: 신청일 역순 (최신 먼저). 컬럼 헤더 클릭으로 정렬 변경 가능 (UserTable 패턴).
- **D-06:** 페이지네이션 포함 (기존 Pagination 컴포넌트 재사용)
- **D-07:** 빈 상태: 간단한 텍스트 ("등록 신청이 없습니다")

### 통합 모달 (상세 + 승인/거부)
- **D-08:** 하나의 통합 모달에 신청자 정보 + 승인/거부 액션 영역이 함께 있음
- **D-09:** 모달 상단: 신청자 정보 (이름, 이메일, 신청일) 표시
- **D-10:** PENDING 상태일 때만 승인/거부 액션 영역 표시. 다른 상태는 읽기 전용.
- **D-11:** APPROVED 상태: 배정된 부서/직급/사원번호 표시. REJECTED 상태: 거부 사유 표시.

### 승인 워크플로우 UI
- **D-12:** 승인 시 입력: 부서(드롭다운), 직급(드롭다운), 사원번호(텍스트 필드). 모두 필수.
- **D-13:** 부서 선택: 간단한 드롭다운. 소규모 회사에 적합.
- **D-14:** 사원번호: 수동 입력만 (Phase 18 D-04 결정 유지). 자동 생성 없음.
- **D-15:** 확인 없이 바로 승인. 모달에서 입력 + 승인 버튼이 이미 의도적 행위.
- **D-16:** 유효성 검증: 필수값(부서/직급/사원번호) 검증만. 사원번호 중복 검증은 백엔드에서 처리.
- **D-17:** 승인 성공 후: 모달 닫고 목록 새로고침 + 성공 토스트 메시지.

### 거부 워크플로우 UI
- **D-18:** 통합 모달 내에서 거부 버튼 클릭 시 거부 사유 텍스트에어리아 표시
- **D-19:** 거부 사유: 여러 줄 텍스트에어리아, 최소 길이 제한 (의미 없는 입력 방지)
- **D-20:** 거부 확인: "이 신청을 거부하시겠습니까?" 확인 다이얼로그 표시 (거부는 승인보다 신중해야 함)
- **D-21:** 거부 성공 후: 모달 닫고 목록 새로고침 + 성공 토스트 메시지 (승인과 동일 패턴)

### 네비게이션/진입점
- **D-22:** AdminSidebar에 "등록 신청 관리" 메뉴 추가 — 사용자 관리 아래에 배치
- **D-23:** 라우트 경로: `/admin/registrations` (기존 /admin/* 패턴과 일관성)
- **D-24:** 사이드바 메뉴에 PENDING 건수 배지 표시. 신청이 있을 때만 표시.

### 에러 처리
- **D-25:** 기존 프로젝트 토스트 패턴 사용. 성공(녹색)/에러(빨간) 토스트.
- **D-26:** 이미 처리된 신청에 승인/거부 시도 시: 에러 토스트 + 목록 자동 새로고침.

### 로딩/UI 상태
- **D-27:** 데이터 로딩 중: 스피너 표시 (기존 패턴과 일관성)

### i18n
- **D-28:** i18n 키 사용. admin 네임스페이스에 registration 관련 키 추가. useTranslation('admin') 패턴 재사용.

### Claude's Discretion
- 거부 사유 최소 길이 구체적 값 (10자 내외 적절)
- 승인/거부 버튼 스타일 (색상, 위치)
- 모달 크기 및 레이아웃 세부 디자인
- 탭 활성화 시 API 호출 최적화 (캐시, debounce 등)
- 로딩 스피너 구체적 위치 및 스타일
- 상태 배지 색상 (기존 UserTable STATUS_BADGE 패턴 참조)
- PENDING 건수 배지 API 호출 주기 (페이지 로드 시 또는 폴링)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### 요구사항
- `docs/PRD_MiceSign_v2.0.md` — DB 스키마 DDL, 기술 아키텍처
- `docs/FSD_MiceSign_v1.0.md` — API 계약, 에러 코드, 한국어 텍스트 규정
- `.planning/REQUIREMENTS.md` §v1.3 — ADM-01, ADM-02, ADM-03 요구사항

### 백엔드 API (Phase 18)
- `backend/src/main/java/com/micesign/controller/AdminRegistrationController.java` — 관리자 등록 API 엔드포인트
- `backend/src/main/java/com/micesign/service/RegistrationService.java` — 등록 서비스 로직
- `backend/src/main/java/com/micesign/dto/registration/` — 등록 관련 DTO 구조
- `.planning/phases/18-registration-backend/18-CONTEXT.md` — Phase 18 결정사항 (API 구조, 승인 시 입력값)

### 기존 프론트엔드 패턴 (재사용 대상)
- `frontend/src/features/admin/pages/UserListPage.tsx` — 목록 페이지 패턴 (필터+테이블+페이지네이션+모달)
- `frontend/src/features/admin/components/UserTable.tsx` — 테이블 컴포넌트 패턴 (정렬, 상태 배지)
- `frontend/src/features/admin/components/UserFilterBar.tsx` — 필터바 패턴 참조
- `frontend/src/features/admin/components/UserFormModal.tsx` — 폼 모달 패턴
- `frontend/src/features/admin/components/Pagination.tsx` — 페이지네이션 컴포넌트
- `frontend/src/features/admin/components/ConfirmDialog.tsx` — 확인 다이얼로그 컴포넌트
- `frontend/src/features/admin/components/AdminSidebar.tsx` — 사이드바 네비게이션 (메뉴 추가 대상)
- `frontend/src/features/admin/hooks/useUsers.ts` — TanStack Query 훅 패턴
- `frontend/src/features/admin/api/userApi.ts` — API 레이어 패턴

### i18n
- `frontend/src/i18n/` — i18n 설정 및 번역 파일 구조

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `Pagination` — 페이지네이션 컴포넌트. 그대로 재사용.
- `ConfirmDialog` — 거부 확인 다이얼로그에 재사용 가능. open/onClose/onConfirm/title/message/confirmLabel/confirmVariant props.
- `AdminSidebar` — navItems 배열에 등록 관리 항목 추가만 하면 됨.
- `AdminLayout` — 기존 관리자 레이아웃 그대로 사용.
- `UserTable` 패턴 — STATUS_BADGE/ROLE_BADGE 스타일 패턴을 등록 상태 배지에 참조.
- `useTranslation('admin')` — 기존 admin 네임스페이스 i18n 패턴.

### Established Patterns
- feature 구조: `features/admin/{pages,components,hooks,api,types}/`
- TanStack Query: custom hook으로 API 호출 래핑 (useUsers 패턴)
- API 레이어: axios 기반 api 함수 분리 (userApi.ts 패턴)
- 모달: 부모에서 open state 관리, 자식 모달 컴포넌트에 props 전달
- 정렬: 컬럼 헤더 클릭 → sortField/sortDirection state → API 쿼리 파라미터

### Integration Points
- `AdminSidebar.tsx` navItems 배열에 등록 관리 메뉴 추가
- `App.tsx` 또는 라우터 설정에 `/admin/registrations` 라우트 추가
- admin i18n 파일에 registration 관련 키 추가

</code_context>

<specifics>
## Specific Ideas

- PENDING 상태 신청만 승인/거부 액션 표시. APPROVED/REJECTED/EXPIRED/CANCELLED는 읽기 전용.
- 통합 모달: 상태에 따라 하단 액션 영역이 달라짐 (PENDING: 승인/거부 폼, APPROVED: 배정 정보, REJECTED: 거부 사유)
- 거부 버튼 클릭 → 모달 내 거부 사유 입력 영역 표시 → 거부 확인 다이얼로그 → API 호출
- 승인 버튼 클릭 → 모달 내 부서/직급/사원번호 입력 영역 표시 → 바로 API 호출 (추가 확인 없음)
- 사이드바 배지: PENDING 건수 API 별도 호출 또는 목록 API 응답에서 count 활용

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 20-admin-registration-management-ui*
*Context gathered: 2026-04-08*

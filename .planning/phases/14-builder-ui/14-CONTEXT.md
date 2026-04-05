# Phase 14: Builder UI - Context

**Gathered:** 2026-04-05
**Status:** Ready for planning

<domain>
## Phase Boundary

관리자(ADMIN/SUPER_ADMIN)가 코드 작성 없이 드래그 앤 드롭 빌더를 통해 폼 템플릿을 시각적으로 생성, 편집, 비활성화할 수 있는 UI. 3패널 레이아웃(필드 팔레트, 캔버스, 속성 패널)과 라이브 프리뷰, 템플릿 관리 목록 페이지 포함. 조건부 로직/계산 필드는 Phase 15 범위.

</domain>

<decisions>
## Implementation Decisions

### 빌더 레이아웃
- **D-01:** 고정 3패널 레이아웃 — 좌측 필드 팔레트(200px 고정), 중앙 캔버스(유동), 우측 속성 패널(300px 고정). 패널 리사이즈 불필요
- **D-02:** 라이브 프리뷰는 캔버스 상단 '편집/프리뷰' 토글 버튼으로 전환. 프리뷰 모드에서 Phase 13의 DynamicForm을 읽기 전용으로 렌더링
- **D-03:** 데스크톱 전용 (min-width: 1024px). 모바일/태블릿에서는 '데스크톱에서 사용해주세요' 안내 메시지 표시. Admin 기능이므로 적절

### 드래그 앤 드롭 인터랙션
- **D-04:** 필드 추가는 드래그 + 클릭 병행 — 팔레트에서 캔버스로 드래그 가능 + 팔레트 필드 클릭 시 캔버스 맨 아래에 자동 추가. @hello-pangea/dnd 라이브러리 사용 (이미 설치됨)
- **D-05:** 캔버스 내 필드 재정렬은 드래그로 수행. @hello-pangea/dnd로 일관된 DnD 경험
- **D-06:** 필드 선택은 클릭으로 — 클릭 시 해당 필드 highlight + 우측 속성 패널에 해당 필드 설정 표시. 필드 툴바에 복제/삭제 버튼
- **D-07:** 팔레트→캔버스 드래그 시 파란선 인디케이터로 드롭 위치 표시. 팔레트 필드는 반투명 복사본(ghost)이 따라다님. hello-pangea/dnd 기본 기능 활용
- **D-08:** 캔버스 필드의 드래그 핸들은 좌측 ⋮⋮ (GripVertical) 아이콘. hover 시 cursor: grab. 기존 PositionTable과 동일한 패턴
- **D-09:** 필드 복제 지원 — 필드 툴바의 복제 버튼 클릭 시 새 nanoid 생성, 라벨에 '(복사본)' 접미사 추가하여 선택된 필드 아래에 삽입
- **D-10:** 필드 타입 변경은 미지원 — 타입별 config 구조가 다르므로 삭제 후 새 타입으로 추가. 단순하고 오류 위험 없음

### 속성 패널 설계
- **D-11:** 속성 패널은 탭 그룹화 — 기본(라벨/필수/플레이스홀더) + 검증(min/max/패턴) + 고급(너비/기본값) 탭으로 분리. 자주 쓰는 설정이 먼저 보임
- **D-12:** select 필드 옵션은 속성 패널에서 인라인 직접 입력 — value/label 행 추가/삭제 + 기존 option_set 불러오기 버튼 제공. option_set DB 테이블 활용(Phase 12에서 구현됨)
- **D-13:** table 필드 칼럼 설정은 속성 패널 내 칼럼 리스트로 표시 — 칼럼 추가/삭제/순서변경 + 각 칼럼 클릭 시 칼럼별 속성(타입/라벨/필수) 편집
- **D-14:** 필드 미선택 시 속성 패널에는 템플릿 전체 설정 표시 — 이름/코드/설명/카테고리/아이콘. 빈 상태를 활용

### 필드 너비 설정
- **D-15:** 필드 너비 설정(full/half) Phase 14에 포함 — 속성 패널 '고급' 탭에서 너비 선택. 캔버스에서 2칼럼 배치 미리보기. DynamicForm/DynamicReadOnly에도 width 속성 지원 추가 필요
- **D-16:** 스키마에 필드별 `config.width` 속성 추가 — "full"(기본값) 또는 "half". half 필드 2개가 연속이면 같은 행에 배치

### 템플릿 관리 페이지
- **D-17:** 테이블 목록 UI — 템플릿명, 코드, 필드 수, 버전, 활성 상태, 수정일 칼럼. 기존 Admin 페이지(UserTable/PositionTable)와 일관된 테이블 패턴
- **D-18:** 템플릿 생성 플로우: 목록에서 '새 템플릿' 버튼 → 이름/코드/설명 입력 모달 → 빌더 페이지로 이동. 기본 정보를 먼저 확보
- **D-19:** Admin 사이드바 하단에 '양식 관리' 항목 추가 — 기존 navItems 배열에 추가. 알림 메뉴 아래 위치
- **D-20:** 템플릿 비활성화(deactivate) 시 확인 대화상자 표시 — 기존 문서는 유지되지만 새 문서 작성 시 템플릿 선택 불가 안내

### 템플릿 저장/발행
- **D-21:** 즉시 저장 방식 — 저장 버튼 클릭 시 바로 API 호출하여 저장. Phase 12 결정(D-11)에 따라 스키마 변경 시 자동 버전 증가. 임시저장/발행 분리 없이 단순 명확
- **D-22:** 빌더 페이지 상단에 저장 버튼 + 프리뷰 토글 + 뒤로가기(목록으로) 버튼 배치

### 빈 상태/에러 처리
- **D-23:** 빈 캔버스 — '좌측 팔레트에서 필드를 드래그하거나 클릭해서 추가하세요' 안내 텍스트 + 점선 영역 표시. 초보 사용자 친화적
- **D-24:** 저장 실패 시 토스트 메시지로 에러 표시. 네트워크 오류 시 재시도 안내

### JSON 가져오기/내보내기
- **D-25:** 빌더 페이지에서 JSON 내보내기 + 가져오기 모두 지원. 내보내기는 현재 스키마를 JSON 파일로 다운로드. 가져오기는 JSON 파일 업로드 → 스키마 검증 → 새 템플릿 생성 또는 현재 스키마 교체
- **D-26:** 가져오기 시 스키마 검증 — 필수 구조(version, fields[]) 확인, 알 수 없는 필드 타입 거부, 유효성 검증 후 미리보기 표시 → 사용자 확인 후 적용

### Claude's Discretion
- 캔버스 필드 카드의 세부 스타일링 (테두리, 그림자, 선택 상태 색상)
- 팔레트 필드 타입별 아이콘 선택 (lucide-react)
- 속성 패널 탭 내부 폼 필드 세부 배치
- 저장/프리뷰 상태 관리 (Zustand vs 로컬 state)
- 빌더 페이지 라우팅 URL 구조
- 에러 토스트 컴포넌트 구현 방식

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### 제품 요구사항
- `docs/PRD_MiceSign_v2.0.md` — DB 스키마 DDL, 기술 스택, 아키텍처 결정사항
- `docs/FSD_MiceSign_v1.0.md` — API 계약, 비즈니스 규칙, 에러 코드
- `.planning/REQUIREMENTS.md` — BLDR-01 ~ BLDR-06 요구사항 정의

### Phase 12 컨텍스트 (스키마 기반)
- `.planning/phases/12-schema-foundation/12-CONTEXT.md` — JSON 스키마 포맷 설계 결정 (D-01~D-19), 필드 구조, 옵션 관리, 버전 관리 전략
- `.planning/phases/12-schema-foundation/12-03-SUMMARY.md` — DynamicFormValidator, 스키마 스냅샷 구현 내역

### Phase 13 컨텍스트 (렌더링)
- `.planning/phases/13-dynamic-form-rendering/13-CONTEXT.md` — 동적 폼 통합 결정 (D-01~D-12), DynamicForm/DynamicReadOnly 구현 방식
- `.planning/phases/13-dynamic-form-rendering/13-02-SUMMARY.md` — DynamicForm/DynamicReadOnly 컴포넌트 구현 내역

### 기존 코드 (통합 대상)
- `frontend/src/features/admin/components/AdminSidebar.tsx` — navItems 배열에 양식 관리 항목 추가 지점
- `frontend/src/features/admin/components/AdminLayout.tsx` — Admin 레이아웃 (빌더 페이지 호스팅)
- `frontend/src/features/document/components/templates/DynamicForm.tsx` — 라이브 프리뷰에 재사용할 동적 폼 컴포넌트
- `frontend/src/features/document/components/templates/DynamicReadOnly.tsx` — 읽기 전용 프리뷰
- `frontend/src/features/document/utils/schemaToZod.ts` — 런타임 Zod 스키마 생성 유틸리티
- `frontend/src/features/document/components/templates/templateRegistry.ts` — 기존 템플릿 레지스트리 (참고용)
- `frontend/src/features/document/api/templateApi.ts` — 기존 템플릿 API 클라이언트 (확장 대상)
- `frontend/src/features/admin/components/PositionTable.tsx` — 드래그 재정렬 패턴 참고 (@hello-pangea/dnd 사용)

### 리서치
- `.planning/research/SUMMARY.md` — v1.2 리서치 요약

### 백엔드 (Phase 12에서 구현 완료)
- `backend/src/main/java/com/micesign/dto/template/SchemaDefinition.java` — JSON 스키마 DTO
- `backend/src/main/java/com/micesign/dto/template/FieldDefinition.java` — 필드 정의 DTO
- `backend/src/main/java/com/micesign/dto/template/FieldConfig.java` — 필드 설정 DTO

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `DynamicForm` 컴포넌트: 라이브 프리뷰 모드에서 그대로 재사용 가능. schemaDefinition prop으로 현재 빌더 스키마 전달
- `DynamicReadOnly` 컴포넌트: 프리뷰 모드 읽기 전용에 재사용
- `schemaToZod`: 프리뷰 모드에서 검증 스키마 자동 생성
- `@hello-pangea/dnd`: 이미 설치됨 — PositionTable에서 드래그 재정렬에 사용 중. 빌더 DnD에도 동일 라이브러리 사용
- `templateApi.ts`: 기존 템플릿 CRUD API 클라이언트 — 빌더용 엔드포인트 추가 확장
- `AdminSidebar.tsx`: navItems 배열 패턴 — 새 메뉴 항목 추가 간단
- `ConfirmDialog`, `Pagination`: 기존 Admin 공통 컴포넌트 재사용

### Established Patterns
- Admin 페이지 구조: 테이블 목록 + FormModal + 상세 페이지 — 기존 User/Position/Department 패턴
- @hello-pangea/dnd: `<DragDropContext>` + `<Droppable>` + `<Draggable>` 패턴 — PositionTable에서 확인 가능
- react-hook-form + Zod: 모든 폼에서 사용 — 속성 패널 입력에도 동일 패턴 적용 가능
- TailwindCSS 스타일링: 모든 UI 컴포넌트에서 사용
- Feature-based 디렉토리 구조: `features/admin/` 하위에 빌더 관련 컴포넌트 배치

### Integration Points
- `AdminSidebar.tsx:navItems[]` — '양식 관리' 메뉴 항목 추가
- `App.tsx` 또는 라우터 설정 — 빌더 페이지 라우트 추가 (/admin/templates, /admin/templates/:id/builder)
- `templateApi.ts` — 스키마 저장/로드 API 호출
- `DynamicForm` — width 속성 지원 추가 (D-15, D-16)

</code_context>

<specifics>
## Specific Ideas

- 빌더 페이지는 AdminLayout을 사용하되, 3패널을 전체 너비로 활용 — 사이드바는 유지하면서 컨텐츠 영역에 3패널 배치
- 캔버스의 필드 카드는 실제 폼 필드를 축약한 형태 — 필드 타입 아이콘 + 라벨 + 타입명 표시. 실제 입력 필드는 프리뷰 모드에서만
- 필드 팔레트의 8개 필드 타입: text, textarea, number, date, select, table, staticText, hidden — Phase 12에서 정의된 것과 동일
- option_set 불러오기는 셀렉트 박스로 기존 옵션 세트 목록 표시 → 선택 시 옵션 항목 자동 채움
- JSON 가져오기 시 파일 업로드 → 검증 → 미리보기 → 확인 플로우로 안전하게 처리

</specifics>

<deferred>
## Deferred Ideas

- 옵션 세트 전용 관리 페이지 (별도 CRUD) — 인라인 관리 + 불러오기로 충분, 필요 시 별도 phase
- 템플릿 복제 기능 — 기존 템플릿을 기반으로 새 템플릿 생성, 향후 추가 가능
- 템플릿 카테고리별 필터링 — 목록 페이지에서 카테고리 필터, 템플릿 수가 많아지면 추가
- 멀티 필드 선택/일괄 삭제 — 복잡도 높음, 현재 단일 선택으로 충분
- 조건부 로직 UI — Phase 15 Advanced Logic에서 구현
- 계산 필드 UI — Phase 15 Advanced Logic에서 구현

None — discussion stayed within phase scope

</deferred>

---

*Phase: 14-builder-ui*
*Context gathered: 2026-04-05*

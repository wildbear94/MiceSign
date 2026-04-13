# Phase 26: 편의 기능 - Context

**Gathered:** 2026-04-13
**Status:** Ready for planning

<domain>
## Phase Boundary

관리자가 양식을 빠르게 만들 수 있도록 하는 4가지 보조 기능을 TemplateListPage에 추가한다:
1. **복제(CNV-01)** — 기존 양식을 원-클릭으로 복제하여 새 양식 초안 생성
2. **JSON Export(CNV-02)** — 양식 스키마+메타데이터를 JSON 파일로 다운로드
3. **JSON Import(CNV-03)** — JSON 파일 업로드 → Zod 검증 → 신규 양식 생성
4. **프리셋(CNV-04)** — 미리 정의된 4종 프리셋(경비/휴가/출장/구매)에서 시작

백엔드 변경은 최소화한다. 복제/export/import/프리셋은 전부 **프론트엔드에서 기존 `POST /admin/templates` API를 재사용**하는 방식으로 구현한다.

**범위 외**: 양식 버전 관리, 양식 이력 복원, 백엔드 프리셋 시드, 사용자(비관리자) 측 기능.

</domain>

<decisions>
## Implementation Decisions

### 복제 UX & 중복 처리
- **D-01:** 복제 버튼은 `TemplateTable.tsx`의 각 행에 **Edit 아이콘 옆 Copy 아이콘(lucide `Copy`)** 형태로 추가한다. 드롭다운 메뉴는 사용하지 않는다.
- **D-02:** Copy 아이콘 클릭 시 해당 템플릿의 detail을 조회하여 `TemplateFormModal`을 **생성 모드로 프리필**하여 연다. 즉시 저장하지 않는다.
- **D-03:** 프리필 시 `name`에 자동으로 `" (복사본)"` suffix를 붙이고, `prefix` 필드는 **비워 둔다**(사용자가 새 prefix 입력 필수). description/category/icon/schemaDefinition은 그대로 복사.
- **D-04:** 복제 플로우와 Import 플로우는 "TemplateFormModal을 생성 모드로 열어 사용자가 확인/수정 후 저장" 이라는 **동일 패턴**을 공유한다.

### JSON Export & Import
- **D-05:** Export JSON 포맷(메타데이터 포함):
  ```json
  {
    "exportFormatVersion": 1,
    "schemaVersion": <number>,
    "name": "...",
    "description": "...",
    "prefix": "...",
    "category": "...",
    "icon": "...",
    "schemaDefinition": { /* SchemaDefinition */ }
  }
  ```
  `code`, `id`, `createdBy`, `createdAt`, `isActive`는 **제외**한다.
- **D-06:** Export 파일명 규칙: `{code}-{YYYYMMDD}.json` (예: `CUSTOM_ab12cd-20260413.json`).
- **D-07:** Export는 **전적으로 프론트엔드**에서 수행한다 — `GET /admin/templates/{id}` 로 상세 조회 → 위 포맷으로 직렬화 → Blob URL로 브라우저 다운로드. 백엔드 변경 없음.
- **D-08:** Import는 전용 Zod 스키마 `templateImportSchema`를 **새로 작성**한다. 위치: `frontend/src/features/admin/validations/templateImportSchema.ts`. `SchemaDefinition` 구조(fields/conditionalRules/calculationRules)를 깊게 검증한다. 기존 `schemaToZod.ts`는 "스키마 → 폼 값 검증기"이므로 용도가 달라 재사용하지 않는다.
- **D-09:** Import 검증 실패 시 파일 선택 모달 **내부에 상세 오류 리스트**로 표시한다(Zod `.format()` 출력을 필드 경로별로 렌더링). toast는 상단 성공/실패 알림 용도로만 사용.
- **D-10:** Import 검증 통과 시 `TemplateFormModal`을 **생성 모드로 프리필**하여 열고, `prefix`는 비워서 사용자가 필수로 입력하게 한다(D-03과 동일한 패턴). 복제와 UX 통일.
- **D-11:** prefix 충돌은 모달 **저장 시 백엔드에서 409를 받아** 인라인 에러 메시지로 처리한다. 기존 에러 메시지 "이미 사용 중인 접두사입니다"를 그대로 노출한다(`TemplateService.java:170-172`).

### 프리셋 템플릿
- **D-12:** 프리셋 JSON은 **프론트엔드 assets**에 둔다. 위치: `frontend/src/features/admin/presets/*.json`. 번들에 포함되어 타입 안전/i18n 키 관리 용이.
- **D-13:** 초기 프리셋 4종: **경비신청서, 휴가신청서, 출장신청서, 구매신청서**. 각 프리셋의 스키마는 Phase 25까지 완성된 기능(conditionalRules/calculationRules/table columns)을 활용하여 실용성 있게 구성한다.
- **D-14:** 프리셋 JSON 포맷은 **Export JSON 포맷(D-05)과 동일**하게 한다 — 프리셋도 결국 "검증된 JSON Import"의 특수 케이스이므로 같은 `templateImportSchema`로 검증 가능.
- **D-15:** 프리셋은 `name`, `description`, `category`, `icon`을 **i18n 키가 아닌 한국어 기본값**으로 고정한다. 관리자가 생성 모달에서 수정 가능. i18n은 "프리셋 메뉴 라벨"(ex: "경비신청서")에만 적용.

### 프리셋/Import 진입 UI
- **D-16:** `TemplateListPage`의 기존 "양식 추가" 버튼을 눌렀을 때 **선택 모달**이 먼저 뜬다. 옵션 3가지:
  1. 빈 양식으로 시작 (기존 플로우)
  2. 프리셋에서 시작 → 4개 프리셋 카드 갤러리 표시
  3. JSON 파일에서 가져오기 → 파일 선택 + 검증
- **D-17:** 선택 모달에서 옵션을 선택하면 최종적으로 **동일한 `TemplateFormModal`이 생성 모드로 열리되, 각 옵션별로 다른 초기값**이 프리필된다.

### 백엔드 API 전략
- **D-18:** **백엔드 신규 엔드포인트 추가 없음.** 복제/Export/Import/프리셋 4가지 기능 모두 기존 API로 충분하다:
  - 복제: `GET /admin/templates/{id}` + `POST /admin/templates`
  - Export: `GET /admin/templates/{id}` + 프론트 Blob download
  - Import: 프론트 Zod 검증 + `POST /admin/templates`
  - 프리셋: 번들된 JSON + `POST /admin/templates`
- **D-19:** `code` 필드의 고유성은 계속 **백엔드가 `CUSTOM_<nanoid>`로 생성**한다(`TemplateService.java:179`). 프론트는 code를 전송하지 않는다. 복제/Import/프리셋 모두 동일.

### 코드 구조
- **D-20:** 새 컴포넌트들 위치:
  - `frontend/src/features/admin/components/TemplateCreateChoiceModal.tsx` — "양식 추가" 선택 모달
  - `frontend/src/features/admin/components/PresetGallery.tsx` — 프리셋 카드 목록
  - `frontend/src/features/admin/components/ImportTemplateModal.tsx` — 파일 선택 + 검증 결과 표시
  - `frontend/src/features/admin/validations/templateImportSchema.ts` — Zod 스키마
  - `frontend/src/features/admin/utils/templateExport.ts` — Export 직렬화 + 파일명 생성
  - `frontend/src/features/admin/presets/*.json` — 4종 프리셋
- **D-21:** `TemplateFormModal`은 **초기값 prefill** prop을 받도록 확장한다(`initialValues?: Partial<CreateTemplateData>`). 기존 create/edit 모드 로직과 호환.

### Claude's Discretion
- 아이콘 선택 (Copy, Download, Upload, LayoutTemplate 등 lucide 아이콘 선정)
- 프리셋 JSON 파일별 구체적 필드 구성 (D-13의 4종 프리셋 각각의 스키마 상세)
- 선택 모달의 구체적 레이아웃 (3카드 그리드 vs 세로 리스트)
- i18n 키 이름과 영어 번역
- Import 오류 메시지 한국어 문구

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### 기존 템플릿 CRUD
- `backend/src/main/java/com/micesign/controller/AdminTemplateController.java` — 현재 엔드포인트(GET/POST/PUT/DELETE). 신규 엔드포인트 추가 불필요.
- `backend/src/main/java/com/micesign/service/TemplateService.java:155-210` — `createTemplate` 로직. prefix 중복 검증(:170) + code 생성(:179) 패턴 확인.
- `backend/src/main/java/com/micesign/dto/template/CreateTemplateRequest.java` — 프론트가 재사용할 요청 DTO.

### 프론트 템플릿 관리
- `frontend/src/features/admin/api/templateApi.ts` — `create`/`getDetail` 재사용. Export/Import/복제용 새 함수 추가 불필요(기존 API 호출만).
- `frontend/src/features/admin/pages/TemplateListPage.tsx` — "양식 추가" 버튼 클릭 핸들러를 선택 모달 오픈으로 변경할 지점.
- `frontend/src/features/admin/components/TemplateTable.tsx:156-164` — Copy 아이콘 버튼 추가 지점(Edit 아이콘 옆).
- `frontend/src/features/admin/components/TemplateFormModal.tsx` — `initialValues` prop 추가 대상.
- `frontend/src/features/admin/hooks/useTemplates.ts` — `useCreateTemplate` 훅 재사용.

### 스키마 타입
- `frontend/src/features/document/types/dynamicForm.ts:66-71` — `SchemaDefinition` 타입. Zod 스키마 작성 시 1:1 매핑.
- `frontend/src/features/document/utils/schemaToZod.ts` — **재사용 안 함**(용도 다름). 참고만.

### 선행 phase 결정사항
- `.planning/phases/24.1-custom-dynamicformrenderer/24.1-CONTEXT.md` — CUSTOM 템플릿 렌더링 계약(schemaSnapshot). 복제/Import 시 schemaDefinition 무결성이 이 계약을 깨지 않아야 함.
- `.planning/phases/25-calculation-rule-ui/25-CONTEXT.md` — 계산 규칙 구조. 프리셋에서 `calculationRules` 사용 시 참고.

### 요구사항
- `.planning/REQUIREMENTS.md` — CNV-01/02/03/04 acceptance criteria.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`TemplateFormModal`**: 현재 create/edit 모드 모두 지원. `initialValues` prop 추가로 복제/Import/프리셋 3가지 진입점 모두 흡수 가능.
- **`useCreateTemplate` 훅** (useTemplates.ts): 모든 생성 경로(복제/Import/프리셋/빈양식)가 이 훅 하나를 공유.
- **`ConfirmDialog`**: 기존 패턴과 일관성 있게 재사용 가능(선택 모달의 base로 활용 가능).
- **lucide-react**: 아이콘 일관성 유지 (Copy, Download, Upload, LayoutTemplate 등).
- **react-i18next (`admin` namespace)**: 기존 번역 파일에 새 키 추가.

### Established Patterns
- **에러 핸들링**: `toast.error(t('...'))` + 모달 내 인라인 메시지 조합(TemplateTable.tsx:33-40 참조).
- **코드 생성은 백엔드 책임**: 프론트는 code 필드 관여 안 함. Phase 26도 동일 원칙 유지.
- **prefix 서버 검증**: `existsByPrefix` + 한국어 에러 메시지 버블업(D-11).
- **skeleton 로딩 패턴**: TemplateTable.tsx:53-64 — Import 검증 중 동일 스타일 사용 가능.

### Integration Points
- `TemplateListPage.tsx:23-31` — "양식 추가" 버튼 `onClick`을 `setShowCreateModal(true)` → `setShowChoiceModal(true)` 로 교체.
- `TemplateTable.tsx:155-164` — Edit 버튼 옆 Copy 버튼 삽입.
- `TemplateFormModal` prop 시그니처 확장(`initialValues?`).
- `frontend/src/locales/ko/admin.json` / `en/admin.json` — 새 i18n 키 추가.

</code_context>

<specifics>
## Specific Ideas

- 복제 플로우 전체가 "기존 API + 프론트 조합"만으로 구현 가능하다는 점을 활용하여 백엔드 PR은 0에 가깝게 유지한다.
- Import/Export/프리셋 JSON 포맷을 통일(D-14)함으로써 단일 Zod 스키마로 3가지 진입점을 모두 커버한다 — 유지보수 단순화.
- 프리셋의 실제 유용성은 Phase 22~25 기능(분할 레이아웃, 테이블 컬럼, 조건부 규칙, 계산 규칙)을 **한 번에 보여주는 데모** 역할을 한다. 각 프리셋이 최소 1개 이상의 고급 기능을 포함하도록 구성.
- `exportFormatVersion: 1` 필드를 둬서 향후 포맷 변경 시 backward compatibility 경로 확보.

</specifics>

<deferred>
## Deferred Ideas

- **양식 버전 관리 / 이력 복원**: 복제와 별개의 큰 기능. 필요 시 v1.2 이후 별도 phase.
- **프리셋 마켓플레이스 / 사용자 업로드 공유**: 멀티테넌트가 아닌 사내 시스템이라 과잉.
- **백엔드 프리셋 seed**: 프론트 assets로 충분하다고 결정. 향후 관리자가 DB에서 직접 프리셋 관리하고 싶으면 별도 phase.
- **Bulk export (전체 템플릿 ZIP)**: CNV-02 범위 밖. 필요 시 추가 phase.
- **양식 vs 양식 diff 기능**: 복제/Import와 무관한 별개 기능.

</deferred>

---

*Phase: 26-convenience-features*
*Context gathered: 2026-04-13*

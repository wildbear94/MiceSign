# Phase 36: 양식 필드 한 줄 최대 3개 레이아웃 - Context

**Gathered:** 2026-04-30
**Status:** Ready for research/planning
**Source:** `/gsd-discuss-phase 36` — 5 회색 영역 사용자 확정 default

<domain>
## Phase Boundary

CUSTOM 양식의 사용자 정의 필드들을 한 줄에 최대 **3개** 까지 가로 배치할 수 있도록, **(1) SchemaField 데이터 모델 확장 + (2) 양식 빌더에 row 그룹 명시 UI + (3) DynamicCustomForm/ReadOnly 렌더러 grid 도입** 3 layer 작업. 단, **built-in 6 종 양식 (GENERAL/EXPENSE/LEAVE/PURCHASE/BUSINESS_TRIP/OVERTIME) 은 무수정**, 기존 SUBMITTED 문서는 schemaSnapshot 으로 옛 vertical stack 그대로 유지, sm 미만 모바일에서는 안전하게 1열 fallback.

requirements: TBD (phase-local 또는 신규 LAYOUT-XX REQ-ID, plan-phase 단계 확정)

scope-out: built-in 6 양식 row 적용 (별도 phase) / sm 이하 row 적용 / row 별 breakpoint 설정 / 4+ 필드 한 줄 (hard cap=3) / 기존 SUBMITTED 문서 layout shift / 백엔드 데이터 모델/마이그레이션
</domain>

<decisions>
## Implementation Decisions

### A. 결정 주체 (Q1=a 사용자 확정)

- **D-A1:** 관리자가 양식 빌더에서 명시적으로 row 그룹 구성. 자동 배치 휴리스틱 도입 안 함.
- **D-A2:** 빌더 UX 정확한 형식 (drag-drop / "다음 행" 토글 / row 번호 selector 등) 은 plan-phase 단계 결정. **Discretion** — UX 관점에서 가장 자연스러운 형태 선택. 단 직관성 우선 (admin 학습 비용 최소화).
- **D-A3:** 빌더 미리보기(`FormPreview`, Phase 22) 가 row 그룹 변경에 즉시 반영. 저장 전에도 시각 확인 가능.

### B. 적용 범위 (Q2=a 사용자 확정)

- **D-B1:** **CUSTOM 양식만** row 레이아웃 적용 — `frontend/src/features/document/components/dynamic/DynamicCustomForm.tsx` + `DynamicCustomReadOnly.tsx` 2 지점.
- **D-B2:** **built-in 6 종 양식 무수정** — `templates/{General,Expense,Leave,Purchase,BusinessTrip,Overtime}{Form,ReadOnly}.tsx` 12 파일 그대로. 향후 별도 phase 로 retrofit 가능 (Deferred).
- **D-B3:** Phase 32 의 preset 양식 (회의록/품의서) 도 CUSTOM 양식 한 종류이므로 자동 적용 — preset JSON 에 row 그룹 정의 추가하여 import 시 즉시 row 레이아웃 활용 가능 (선택적, plan-phase 결정).
- **D-B4:** Phase 34 의 `DrafterInfoHeader` 는 본문 외 영역 (always-on header), 본 phase 무영향 — 헤더는 이미 자체 4-column grid.

### C. Wide 필드 처리 (Q3=a 사용자 확정)

- **D-C1:** `table` 타입 필드는 row 그룹에 들어가도 무조건 단독 행 (full-width). 빌더 UI 가 hard-enforce.
- **D-C2:** `textarea` 타입 필드도 단독 행 강제 (작은 textarea 도 예외 없음 — 단순성 우선).
- **D-C3:** 단독 행 필드 타입 화이트리스트: `table`, `textarea`. 나머지 (`text`, `number`, `date`, `select`, `staticText`, `hidden` 등) 는 row 그룹 가능.
- **D-C4:** 빌더에서 wide 필드를 row 그룹에 끌어다 놓으면 자동으로 단독 행으로 빠져나감 (drag-drop 시 시각적 피드백).

### D. Backward Compatibility (Q4=b 사용자 확정)

- **D-D1:** **기존 SUBMITTED 문서는 옛 vertical stack 그대로 유지** — Phase 24.1 의 `schemaDefinitionSnapshot` 인프라 재활용. 문서 조회 시 `doc.schemaDefinitionSnapshot` 의 schema (row 정보 없음) → DynamicCustomReadOnly 가 fallback 으로 vertical stack 렌더링.
- **D-D2:** 신규 schema 또는 DRAFT 단계에서 admin 이 row 정의 후 저장 → 그 시점 이후의 신규 문서만 새 row 레이아웃.
- **D-D3:** schema migration 자동화 안 함 — 기존 양식 (Phase 32 preset 포함) 의 schemaDefinition 재저장 시점에 admin 이 row 추가 의사를 명시할 때만 적용.
- **D-D4:** **layout shift 위험 zero** — admin 의 명시적 행위 없이는 어떤 화면도 변경되지 않음.

### E. 반응형 (Q5=a 사용자 확정)

- **D-E1:** **md+ (≥768px) 에서만 row 적용**. sm 이하 (<768px) 는 무조건 1열 vertical stack — Tailwind `md:grid-cols-X` + 기본 `flex flex-col` 패턴 또는 동등.
- **D-E2:** md+ 의 row 그룹 내 column 수: 1/2/3 중 admin 선택 (D-A1 명시). 2 칼럼이면 `md:grid-cols-2`, 3 칼럼이면 `md:grid-cols-3` 등.
- **D-E3:** dark mode 별도 처리 없음 — 기존 양식 컴포넌트 dark mode 패턴 (text, bg, border) 그대로 상속. Tailwind grid utilities 는 dark mode 무관.

### F. 빌더 UX & 데이터 모델 (Discretion — plan-phase 결정)

- **D-F1:** SchemaField 인터페이스 확장 형식 — 후보:
  - 옵션 (i): 각 SchemaField 에 `rowGroup?: number` (같은 rowGroup 값을 가진 인접 필드들이 한 행) 추가
  - 옵션 (ii): SchemaDefinition 에 별도 `rows: Array<{ fieldIds: string[] }>` 도입
  - 옵션 (iii): 새로운 wrapper element type `'row'` (자식 필드 포함) 도입
  - 권장: (i) — 가장 간단, 기존 fields 배열 순서 유지. RESEARCH 가 SchemaField 의 다른 메타 (conditionalRules, calculationRules) 와의 정합성 검토.
- **D-F2:** 빌더 UX 후보 — drag-drop / "이전 행과 합치기" 버튼 / row 번호 입력 / FieldCard 옆 visual indicator. plan-phase 가 UI-SPEC 단계에서 확정.
- **D-F3:** Hard cap=3 enforcement 위치 — 빌더 UI 에서 visual disable + Zod 스키마 validator (`templateImportSchema`) 에서 backend 검증.

### G. 검증

- **D-G1:** 빌더 단위 테스트 — row 그룹 추가/제거/필드 이동 시 schema 정합성 유지 (vitest)
- **D-G2:** 렌더러 컴포넌트 테스트 — DynamicCustomForm 이 row 정의 schema → md+ grid / sm 1-col 으로 정확히 렌더 (vitest + jsdom + screen size mock)
- **D-G3:** Backward compat 테스트 — `schemaDefinitionSnapshot` 의 row 정보 없는 schema → DynamicCustomReadOnly 가 vertical stack 으로 fallback (vitest)
- **D-G4:** 회귀 — Phase 24.1 의 conditional/calculation rules 정상 동작 / Phase 34 헤더 영향 없음 / Phase 32 preset 회귀 / built-in 6 양식 무영향
- **D-G5:** UAT (수동) — admin 이 양식 빌더에서 row 그룹 설정 → 사용자 기안 화면에서 md+ grid 확인 / 모바일 스마트폰에서 1열 fallback 확인 / 기존 양식 그대로 변경 없음 확인

### Claude's Discretion

- 빌더 UX 정확한 인터랙션 (drag-drop / 토글 / 번호 입력) — plan-phase / UI-SPEC
- SchemaField 데이터 모델 정확한 형식 (옵션 i/ii/iii) — plan-phase 가 RESEARCH 결과 보고 결정
- preset JSON 의 row 정의 형식 — plan-phase 단계 결정 (D-B3)
- Tailwind class 정확한 조합 (gap, padding, alignment) — UI-SPEC 단계
- `templateImportSchema` Zod 검증 정확한 규칙 — RESEARCH 단계
</decisions>

<canonical_refs>
## Canonical References

### 양식 빌더 (Phase 21~26 산출)

- `frontend/src/features/admin/components/SchemaFieldEditor/types.ts` (SchemaField 인터페이스 — 본 phase 가 row 정보 추가 지점)
- `frontend/src/features/admin/components/SchemaFieldEditor/SchemaFieldEditor.tsx` (빌더 메인)
- `frontend/src/features/admin/components/SchemaFieldEditor/FieldCard.tsx` (필드별 UI — row 인디케이터 추가 후보)
- `frontend/src/features/admin/components/SchemaFieldEditor/FieldConfigEditor.tsx` (필드 설정 패널)
- `frontend/src/features/admin/components/FormPreview/*` (Phase 22 산출, row 변경 즉시 반영 — D-A3)
- `frontend/src/features/admin/components/TemplateFormModal.tsx` (양식 저장 진입점)
- `frontend/src/features/admin/validations/templateImportSchema.ts` (Zod 검증 — D-F3 hard cap=3)

### CUSTOM 동적 렌더러 (Phase 24.1 산출, 본 phase 의 핵심 수정 대상)

- `frontend/src/features/document/components/dynamic/DynamicCustomForm.tsx` (사용자 작성 화면 — 현재 `space-y-4`, row grid 도입 지점)
- `frontend/src/features/document/components/dynamic/DynamicCustomReadOnly.tsx` (조회 화면 — row 적용 + snapshot fallback 지점)
- `frontend/src/features/document/components/dynamic/DynamicFieldRenderer.tsx` (단일 필드 렌더러 — wrap 위치)
- `frontend/src/features/document/components/dynamic/DynamicTableField.tsx` (table 필드 — D-C1 단독 행 강제 지점)
- `frontend/src/features/document/types/dynamicForm.ts` (CUSTOM 양식 타입)
- `frontend/src/features/document/types/document.ts` (`DocumentDetailResponse.schemaDefinitionSnapshot` — D-D1 backward compat 핵심)

### 인접 인프라 (수정 안 함, 회귀 검증 대상)

- `frontend/src/features/document/components/templates/{General,Expense,Leave,Purchase,BusinessTrip,Overtime}{Form,ReadOnly}.tsx` — D-B2 무수정
- `frontend/src/features/admin/presets/*.json` — Phase 32 preset, D-B3 plan-phase 결정 (적용 가능 여부)
- `frontend/src/features/document/components/DrafterInfoHeader.tsx` — Phase 34, 본문 외 영역 무영향

### 백엔드 (수정 안 함)

- `backend/src/main/java/com/micesign/domain/DocumentContent.java` — `schema_definition_snapshot` 컬럼 (Phase 24.1 도입, 본 phase 그대로 사용)
- `backend/src/main/java/com/micesign/service/DocumentService.java` — submit 시점 schema snapshot 박제 (Phase 24.1 + Phase 34 D-C2 인접)
</canonical_refs>

<specifics>
## Specific Ideas

- 사용자 요구 원문: "양식에 필드가 한줄에 최대 3개 까지 들어갈수 있도록 수정해줘"
- 4 가지 핵심 결정 (Q1=a/Q2=a/Q3=a/Q4=b/Q5=a) 이 가장 안전하고 회귀 위험 최소화한 path:
  - 관리자 명시 + CUSTOM 만 + wide 단독 + snapshot 보존 + md+ 만
- 데이터 모델 후보 3가지 (D-F1) 중 plan-phase 가 RESEARCH 결과 + Phase 24.1 conditional/calculation rules 정합성 보고 (i) 권장 채택 가능성 높음
- 빌더 UX 의 정확한 인터랙션은 UI-SPEC 단계에서 확정 — 사용자가 "직관성 우선" 시그널 (Q1=a, 빌더 명시 선택) 만 lock
</specifics>

<deferred>
## Deferred Ideas

- **built-in 6 양식 (General/Expense/Leave/Purchase/BusinessTrip/Overtime) row 적용** — Q2=a 결정으로 본 phase 무수정. 향후 별도 phase (예: Phase 37) 에서 hardcoded 양식들도 row 레이아웃으로 retrofit 가능
- **Phase 32 preset (회의록/품의서) 의 row 정의** — D-B3 에서 plan-phase 결정. 제외 시 별도 phase
- **sm/xs 모바일 row 적용** — Q5=a 결정으로 1열 강제. 향후 별도 phase 에서 sm 2-col 도입 가능
- **row 별 breakpoint 커스터마이즈** — 과한 유연성으로 본 phase scope 외. v2 candidate
- **자동 배치 휴리스틱** — Q1=a 로 admin 명시 선택. 향후 admin 보조 기능으로 도입 가능
- **4+ 필드 한 줄** — hard cap=3 결정. 5+ 칼럼 grid 는 별도 phase
- **schema migration 자동화** — D-D3 결정으로 admin 명시적 행위 필요. 향후 일괄 conversion 도구 가능
- **레이아웃 템플릿 / 프리셋** — 자주 쓰는 row 패턴 저장 후 재사용 — 별도 phase
</deferred>

---

*Phase: 36-form-row-layout*
*Context gathered: 2026-04-30 via /gsd-discuss-phase 36 (5 gray areas, all default approved)*

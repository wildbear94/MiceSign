# Phase 24: 조건부 표시 규칙 UI - Context

**Gathered:** 2026-04-12
**Status:** Ready for planning

<domain>
## Phase Boundary

관리자가 필드별 조건부 표시/숨김 규칙을 설정할 수 있는 UI를 구축한다. FieldConfigEditor에 조건 규칙 설정 영역을 추가하고, 미리보기 패널에서 조건 동작을 실시간으로 확인할 수 있게 한다. 필드 삭제/타입 변경 시 관련 조건 규칙이 자동으로 정리된다.

</domain>

<decisions>
## Implementation Decisions

### 규칙 편집 UI 배치
- **D-01:** FieldConfigEditor 내부에 접기/펼치기 섹션으로 배치 — 기본 설정 아래에 '조건 규칙' 섹션을 접기/펼치기로 추가. Phase 23의 테이블 컬럼 설정과 동일한 패턴
- **D-02:** 필드당 조건 규칙 1개만 허용 — 50인 회사 규모에 충분하며 UI 복잡도를 낮춤
- **D-03:** 빈 상태(조건 없음)는 '조건 규칙이 없습니다' 안내 문구 + '조건 추가' 버튼 표시
- **D-04:** 조건 타겟(THEN 대상) 제외 타입 — staticText, hidden은 조건 대상에서 제외. 나머지 타입(text, textarea, number, date, select, table)은 타겟 가능
- **D-05:** 조건 소스(IF 필드) 허용 타입 — text, number, date, select만 허용. textarea는 긴 텍스트라 비교 의미 적음
- **D-06:** 규칙이 설정된 필드카드 헤더에 아이콘 배지(⚡ 등) 표시 — 조건 섹션을 열지 않아도 규칙 존재 확인 가능

### 조건 설정 인터랙션
- **D-07:** 드롭다운 조합 방식 — IF [필드 드롭다운] [연산자 드롭다운] [값 입력] THEN [액션 드롭다운]. 직관적이고 오류 가능성 낮음
- **D-08:** 연산자는 소스 필드 타입별 필터링 — select: eq/neq/isEmpty/isNotEmpty, number: 전체 10개, text: eq/neq/isEmpty/isNotEmpty, date: eq/neq/gt/lt/gte/lte
- **D-09:** 연산자와 액션은 한국어 레이블 — eq='값이 같음', neq='값이 다름', gt='보다 큼' 등. action: show='표시', hide='숨김', require='필수로 변경', unrequire='선택으로 변경'. i18n 키로 관리
- **D-10:** 소스 필드가 select 타입일 때 값 입력은 해당 필드의 옵션 드롭다운으로 표시 — 오타 방지, 직관적
- **D-11:** in/notIn 연산자 선택 시 복수 값은 체크박스 목록으로 입력 (select 소스 필드일 때)
- **D-12:** 자기참조 차단 — IF 필드 드롭다운에서 현재 필드 제외
- **D-13:** 순환 참조 설정 시 차단 — A→B 조건이 있을 때 B→A 조건 소스로 A를 드롭다운에서 제외
- **D-14:** 규칙 삭제는 즉시 삭제 — 확인 다이얼로그 없이 즉시 제거. select 옵션 삭제와 동일 패턴 (저장 전까지 언도 가능)
- **D-15:** 데이터 관리는 중앙 배열 유지 — SchemaDefinition.conditionalRules[]를 중앙에서 관리, UI에서는 targetFieldId로 필터링하여 표시

### 미리보기 연동
- **D-16:** 모든 필드 입력 가능한 인터랙티브 미리보기 — 소스 필드뿐 아니라 모든 필드에 값 입력 가능. 양식 자체를 시연할 수 있어 관리자 UX 향상
- **D-17:** 조건 충족/미충족 시 즉시 전환 — 애니메이션 없이 즉시 필드 표시/숨김. 단순하고 응답성 높음
- **D-18:** require 액션 충족 시 필드 레이블 옆에 빨간 * 표시 추가 — 기존 required 필드와 동일한 패턴
- **D-19:** 미리보기 초기 로드 시 모든 필드 표시 — 소스 필드에 값이 없으므로 조건 미충족 상태, 모든 필드 기본 표시
- **D-20:** 미리보기 상단에 '초기화' 버튼 추가 — 모든 입력값 리셋하여 조건 테스트 반복 가능

### 필드 삭제/변경 시 규칙 정리
- **D-21:** 필드 삭제 시 관련 조건 규칙 자동 삭제 + 토스트 — targetFieldId 또는 condition.fieldId로 해당 필드를 참조하는 모든 규칙 자동 제거
- **D-22:** 양방향 정리 — 삭제된 필드가 타겟이든 소스든 관련 규칙 모두 제거
- **D-23:** 토스트 메시지는 개수만 표시 — '조건 규칙 N개가 자동 제거되었습니다' 정도로 간결하게
- **D-24:** 필드 라벨 변경은 규칙에 영향 없음 — 규칙은 필드 ID 기반으로 참조하므로 라벨 변경 시 드롭다운에 자동 반영
- **D-25:** 소스 필드 타입 변경 시 해당 규칙 자동 제거 + 토스트 — 연산자와 값이 새 타입과 호환되지 않을 수 있으므로 안전하게 제거

### 유효성 검사
- **D-26:** 프론트엔드에서만 검증 — 저장 버튼 클릭 시 존재하지 않는 필드 ID 참조, 유효하지 않은 연산자/값 등 체크. 백엔드는 schemaDefinition JSON을 그대로 저장
- **D-27:** 유효성 검증 실패 시 에러 토스트 표시 + 저장 차단 — 기존 양식 저장 유효성 검증과 동일한 패턴

### i18n 키 설계
- **D-28:** templates.condition.* 네이밍 패턴 — admin 네임스페이스 아래 templates.condition.operators.eq, templates.condition.actions.show 등으로 구성. 기존 templates.* 패턴과 일관성 유지

### 타입 정의
- **D-29:** dynamicForm.ts의 ConditionalRule 타입 재사용 — 편집 UI에서 import하여 사용. 타입 중복 방지. 편집 UI에서 필요한 추가 타입(OperatorOption, ActionOption 등)만 SchemaFieldEditor/types.ts에 추가

### Claude's Discretion
- 접기/펼치기 섹션의 정확한 Tailwind 스타일링
- 드롭다운 컴포넌트의 구체적인 구현 방식
- 아이콘 배지의 정확한 아이콘 선택 (⚡, 🔗 등)
- 안내 문구의 정확한 한국어 텍스트
- 미리보기 초기화 버튼의 위치와 스타일

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### 기존 타입 정의
- `frontend/src/features/document/types/dynamicForm.ts` — ConditionalRule, SchemaDefinition 타입 정의 (conditionalRules[], action: show/hide/require/unrequire)
- `frontend/src/features/admin/components/SchemaFieldEditor/types.ts` — SchemaField, SchemaFieldConfig, SchemaFieldType 편집 UI 타입

### 조건 평가 로직 (이미 구현됨)
- `frontend/src/features/document/utils/evaluateConditions.ts` — evaluateConditions() 함수, 10개 비교 연산자 구현 완료. 미리보기 연동 시 이 함수를 호출

### 편집 UI 컴포넌트
- `frontend/src/features/admin/components/SchemaFieldEditor/FieldConfigEditor.tsx` — 조건 섹션 추가 대상. switch문 기반 타입별 설정 패턴
- `frontend/src/features/admin/components/SchemaFieldEditor/FieldCard.tsx` — 아이콘 배지 표시 대상 (헤더 영역)
- `frontend/src/features/admin/components/SchemaFieldEditor/SchemaFieldEditor.tsx` — conditionalRules 상태 관리 위치

### 미리보기 컴포넌트
- `frontend/src/features/admin/components/FormPreview/FormPreview.tsx` — 인터랙티브 미리보기 전환 대상. 현재 정적 렌더링
- `frontend/src/features/admin/components/FormPreview/PreviewFieldRenderer.tsx` — 필드별 입력 가능 렌더링 구현 대상

### 양식 저장 모달
- `frontend/src/features/admin/components/TemplateFormModal.tsx` — conditionalRules: [] 초기화 위치, 저장 시 유효성 검증 추가 대상

### 요구사항
- `.planning/REQUIREMENTS.md` — CND-01, CND-02 요구사항
- `.planning/ROADMAP.md` §Phase 24 — Success Criteria 3개 항목

### 이전 Phase 참고
- `.planning/phases/23-table-column-editor/23-CONTEXT.md` — 테이블 컬럼 편집기 결정사항 (접기/펼치기 패턴, 즉시 삭제 패턴 참고)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `evaluateConditions.ts`: 조건 평가 로직 완전 구현 — 미리보기에서 그대로 호출하면 됨
- `ConditionalRule` 타입: dynamicForm.ts에 이미 정의 — 새로 만들 필요 없음
- `FieldConfigEditor.tsx` switch문 패턴: 타입별 설정 영역 추가 패턴 확립
- `FieldCard.tsx`: 필드카드 헤더에 배지 추가 가능한 구조
- `SMALL_INPUT_CLASS`: 일관된 입력 필드 스타일링 상수

### Established Patterns
- Phase 23의 접기/펼치기 UI 패턴 (테이블 컬럼 편집)
- 즉시 삭제 패턴 (select 옵션 삭제, 컬럼 삭제 — 확인 없이 즉시 제거)
- 기존 i18n은 useTranslation('admin') 사용, admin.json 파일

### Integration Points
- `TemplateFormModal.tsx`: conditionalRules를 SchemaFieldEditor에 전달하고, 저장 시 schemaDefinition JSON에 포함
- `FormPreview`: conditionalRules와 formValues를 받아 evaluateConditions 호출 → hiddenFields/requiredFields 적용
- SchemaFieldEditor: fields 변경 시 conditionalRules에서 삭제된 필드 참조 정리 로직 필요

</code_context>

<specifics>
## Specific Ideas

- 미리보기는 모든 필드가 입력 가능한 완전 인터랙티브 모드 — 관리자가 양식을 직접 테스트하는 경험
- 순환 참조는 설정 시점에서 원천 차단 (런타임 에러 방지)
- 소스 필드 타입 변경 시에도 규칙 자동 정리 — 고아 규칙 원천 방지

</specifics>

<deferred>
## Deferred Ideas

None — 논의가 Phase 범위 내에서 진행됨

</deferred>

---

*Phase: 24-ui*
*Context gathered: 2026-04-12*

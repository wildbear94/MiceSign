# Phase 15: Advanced Logic - Context

**Gathered:** 2026-04-06
**Status:** Ready for planning

<domain>
## Phase Boundary

Admin이 조건부 표시/숨기기/필수 규칙과 계산 필드를 템플릿에 추가하고, 필드를 시각적 섹션으로 그룹화하여, 사용자 입력에 반응하는 스마트 폼을 만들 수 있게 하는 기능. 순환 의존성 감지로 규칙 무결성을 보장.

</domain>

<decisions>
## Implementation Decisions

### 조건부 규칙 설계
- **D-01:** 연산자는 기본 세트: `equals`, `not_equals`, `is_empty`, `is_not_empty`
- **D-02:** 하나의 타겟 필드에 여러 조건 조합 시 `matchType: 'all' | 'any'` 선택식 (AND + OR)
- **D-03:** Builder UI에서 기존 PropertyPanel에 'Conditions' 탭 추가 (Basic/Validation/Advanced 옆)
- **D-04:** 런타임에 조건 미충족 시 DOM에서 필드 완전 제거 + 값 초기화, 제출 시 숨겨진 필드 데이터 미포함

### 조건부 규칙 데이터 구조
- **D-05:** conditionalRules는 타겟 필드 기준 구조:
  ```json
  {
    "conditionalRules": [
      {
        "targetFieldId": "field_other_reason",
        "action": "show" | "hide" | "require",
        "matchType": "all" | "any",
        "conditions": [
          {
            "sourceFieldId": "field_reason",
            "operator": "equals" | "not_equals" | "is_empty" | "is_not_empty",
            "value": "other"
          }
        ]
      }
    ]
  }
  ```

### 조건부 required 동작
- **D-06:** 조건부 `require` 액션 시 schemaToZod를 동적으로 재생성하여 해당 필드의 required/optional을 전환. useMemo dependency에 조건 상태 포함
- **D-07:** 기존 `FieldDefinition.required`와 조건부 require는 OR 관계 — required=true이면 항상 필수, 조건부 require는 추가 필수 조건

### 계산 필드
- **D-08:** 기존 number 필드를 확장하여 calculationType 설정 시 읽기 전용(readonly)으로 전환. 별도 필드 타입 추가하지 않음
- **D-09:** 테이블 칸럼 합계는 테이블 외부에 계산 필드 배치, `table.columnId` 형식으로 참조 (예: `expense_table.amount`)
- **D-10:** 계산은 프론트엔드에서만 실행, 백엔드는 제출된 값을 그대로 저장
- **D-11:** calculationRules는 타겟 필드 기준 구조:
  ```json
  {
    "calculationRules": [
      {
        "targetFieldId": "field_total",
        "operation": "SUM" | "MULTIPLY" | "ADD" | "COUNT",
        "sourceFields": ["expense_table.amount"]
      }
    ]
  }
  ```

### 계산 필드 Builder UI
- **D-12:** 계산 설정은 기존 PropertyAdvancedTab에 통합. number 필드 선택 시에만 표시. operation 선택 + sourceFields 드롭다운
- **D-13:** sourceFields 선택은 드롭다운 리스트 — 현재 템플릿의 number 필드와 table.column을 그룹화하여 표시, 다중 선택 가능

### 순환 의존성 감지
- **D-14:** 템플릿 저장 시 전체 규칙 그래프를 검사하여 순환 발견 시 저장 차단 + 에러 메시지
- **D-15:** 에러는 화면 상단 빨간 토스트로 순환 경로 표시 (예: '순환 의존성: 필드A → 필드B → 필드A')
- **D-16:** 백엔드에서도 순환 의존성 검증 수행 — 프론트 우회 방지. 같은 알고리즘을 Java로 구현

### 시각적 섹션
- **D-17:** 새로운 `section` FieldType 추가. 섹션 헤더 필드가 다음 섹션 헤더까지의 필드를 그룹화. 팔레트에 추가, DnD로 배치
- **D-18:** 사용자 작성 시 섹션 헤더 클릭으로 접기/펼치기 지원

### 조건부 + 섹션 결합
- **D-19:** section 필드도 conditionalRules의 targetFieldId로 사용 가능. 섹션이 숨겨지면 하위 필드도 모두 숨김 + 값 초기화

### Claude's Discretion
- 순환 감지 알고리즘 선택 (DFS 기반 등)
- 조건부 규칙 평가 엔진의 내부 구현 패턴
- 계산 필드의 소수점 처리 방식
- Conditions 탭의 세부 UI 레이아웃
- 섹션 접기/펼치기 애니메이션 스타일

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### 스키마 및 타입 정의
- `frontend/src/features/document/types/dynamicForm.ts` — SchemaDefinition, FieldDefinition, FieldConfig 타입 (conditionalRules/calculationRules 현재 unknown[])
- `frontend/src/features/admin/types/builder.ts` — BuilderState, BuilderAction, SchemaDefinition, PALETTE_ITEMS, FIELD_TYPE_DEFAULTS

### 동적 폼 렌더러
- `frontend/src/features/document/components/templates/DynamicForm.tsx` — 동적 폼 편집 컴포넌트 (조건부 규칙 평가 로직 추가 위치)
- `frontend/src/features/document/components/templates/dynamic/DynamicFieldRenderer.tsx` — 개별 필드 렌더링 (조건부 숨김 처리 위치)
- `frontend/src/features/document/utils/schemaToZod.ts` — 런타임 Zod 스키마 생성 (조건부 required 동적 재생성 위치)

### Builder UI
- `frontend/src/features/admin/components/builder/PropertyPanel.tsx` — 속성 패널 (Conditions 탭 추가 위치)
- `frontend/src/features/admin/components/builder/PropertyAdvancedTab.tsx` — 고급 속성 탭 (계산 필드 설정 통합 위치)
- `frontend/src/features/admin/components/builder/useBuilderReducer.ts` — Builder 상태 관리
- `frontend/src/features/admin/components/builder/FieldPalette.tsx` — 필드 팔레트 (section 타입 추가 위치)
- `frontend/src/features/admin/pages/TemplateBuilderPage.tsx` — 빌더 페이지 (순환 검증 + 저장 로직)

### 백엔드
- `backend/src/main/java/com/micesign/service/AdminTemplateService.java` — 템플릿 저장 서비스 (순환 검증 추가 위치)
- `backend/src/main/java/com/micesign/domain/ApprovalTemplate.java` — schemaDefinition LONGTEXT 저장

### 요구사항
- `.planning/ROADMAP.md` §Phase 15 — LOGIC-01, LOGIC-02, LOGIC-03, LOGIC-04 요구사항 및 성공 기준

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `SchemaDefinition` 타입에 이미 `conditionalRules: unknown[]`과 `calculationRules: unknown[]` placeholder 존재 — 타입만 구체화하면 됨
- `TemplateBuilderPage`에서 저장 시 이미 빈 배열로 전달 중 — 규칙 데이터 추가하면 자연스럽게 연동
- `PropertyPanel`이 Basic/Validation/Advanced 3탭 구조 — Conditions 탭 추가 패턴 명확
- `PropertyAdvancedTab`에 width, defaultValue 설정 존재 — 계산 설정 통합 위치 확보
- `PALETTE_ITEMS`과 `FIELD_TYPE_DEFAULTS` 상수 — section 타입 추가 지점 명확
- `schemaToZod` 유틸리티 — 조건부 required를 위한 동적 재생성 확장 필요
- `DynamicFieldRenderer` — switch로 필드 타입별 렌더링, section 타입 추가 용이

### Established Patterns
- Builder 상태관리: useReducer 패턴 (BuilderAction 타입으로 확장)
- 필드 타입별 렌더링: DynamicFieldRenderer의 switch 문
- 속성 편집: PropertyPanel 탭 기반 구조
- i18n: useTranslation('admin') 패턴
- 백엔드 스키마: LONGTEXT JSON 저장 (구조 무관, 프론트에서 파싱)

### Integration Points
- `DynamicForm` — 조건부 규칙 평가 엔진 및 계산 실행 로직 추가
- `useBuilderReducer` — 규칙 관련 액션 추가 (ADD_CONDITIONAL_RULE, UPDATE_CALCULATION 등)
- `TemplateBuilderPage` 저장 로직 — 순환 검증 추가
- `AdminTemplateService` — 백엔드 순환 검증 추가

</code_context>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 15-advanced-logic*
*Context gathered: 2026-04-06*

# Phase 16: Template Migration - Context

**Gathered:** 2026-04-06
**Status:** Ready for planning

<domain>
## Phase Boundary

6개 하드코딩 폼 템플릿(General, Expense, Leave, Purchase, Business Trip, Overtime)을 JSON 스키마로 변환하고, 듀얼 렌더링 모드로 기존 문서와 신규 문서가 모두 정상 표시되도록 한다. 신규 기능 추가 없이, 기존 폼의 동적 렌더러 전환에만 집중한다.

</domain>

<decisions>
## Implementation Decisions

### 하드코딩 컴포넌트 처리
- **D-01:** 듀얼 렌더링 유지 — 하드코딩 컴포넌트를 삭제하지 않고 그대로 유지. 기존 문서(schema_definition IS NULL)는 하드코딩 렌더러로, 신규 문서(schema_definition non-null)는 동적 렌더러로 표시. `DocumentEditorPage.tsx`의 기존 분기 로직(`templateEntry ? hardcoded : DynamicForm`) 유지.

### 데이터 마이그레이션
- **D-02:** 기존 문서의 form_data 변환 없음 — 기존 문서의 form_data 구조를 일절 변경하지 않음. 하드코딩 렌더러가 그대로 처리. 데이터 손실 위험 제로.

### 스키마 작성 방식
- **D-03:** Flyway 시드 마이그레이션으로 6개 템플릿의 schema_definition 생성 — `V12__seed_legacy_template_schemas.sql` 같은 Flyway 스크립트로 각 템플릿의 schema_definition 컬럼을 UPDATE. 재현 가능하고 배포 자동화에 포함됨.
- **D-04:** 각 스키마는 하드코딩 폼의 필드 구조를 정확히 재현해야 함 — 필드 수, 타입, 라벨, required 속성, config 옵션이 하드코딩 컴포넌트와 일치.

### 검증 전략
- **D-05:** 필드 구조 자동 테스트 + 렌더링 수동 비교 — 각 폼의 필드 수/타입/라벨이 하드코딩과 일치하는지 자동 테스트. 실제 렌더링 결과는 수동으로 비교하여 UI 차이를 확인.

### Claude's Discretion
- 스키마 내 필��� ID 명명 규칙 (하드코딩 formData 키와 일치하지 않아도 됨 — 신규 문서용)
- 각 Flyway 마이그레이션 파일 번호 배정
- 검증 테스트의 구체적인 assertion 패턴

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### 하드코딩 폼 구조 (마이그레이션 소스)
- `frontend/src/features/document/components/templates/GeneralForm.tsx` — 일반 업무 기안 필드 구조
- `frontend/src/features/document/components/templates/ExpenseForm.tsx` — 지출 결의서 필드 구조 (테이블, 자동 합계)
- `frontend/src/features/document/components/templates/LeaveForm.tsx` — 휴가 신청서 필드 구조 (날짜 계산)
- `frontend/src/features/document/components/templates/GeneralReadOnly.tsx` — 일반 기안 읽기 ��용
- `frontend/src/features/document/components/templates/ExpenseReadOnly.tsx` — 지출 결의서 읽기 전용
- `frontend/src/features/document/components/templates/LeaveReadOnly.tsx` — 휴가 신청서 읽기 전용

### 동적 렌더링 시스템 (마이그레이션 타겟)
- `frontend/src/features/document/types/dynamicForm.ts` — SchemaDefinition, FieldDefinition, FieldType 등 타입 정의
- `frontend/src/features/document/components/templates/DynamicForm.tsx` — 동적 폼 렌더러
- `frontend/src/features/document/components/templates/DynamicReadOnly.tsx` — 동적 읽기 전용 렌더러
- `frontend/src/features/document/utils/schemaToZod.ts` — Zod 밸리데이션 스키마 생성

### 레지스트리 및 라우팅
- `frontend/src/features/document/components/templates/templateRegistry.ts` — 하드코딩 템플릿 레지스트리 (GENERAL, EXPENSE, LEAVE)
- `frontend/src/features/document/pages/DocumentEditorPage.tsx` — 듀얼 렌더링 분기 로직
- `frontend/src/features/document/pages/DocumentDetailPage.tsx` — 문서 상세 보기 렌더��

### 백엔드 템플릿 관리
- `backend/src/main/java/com/micesign/domain/ApprovalTemplate.java` — schema_definition 컬럼 (LONGTEXT)
- `backend/src/main/java/com/micesign/service/AdminTemplateService.java` — 템플릿 CRUD + 스키마 버저닝

### 요구사항
- `docs/PRD_MiceSign_v2.0.md` — 6개 폼 템플릿 필드 사양
- `docs/FSD_MiceSign_v1.0.md` — 각 폼의 비즈니스 규칙 �� 필드 상세

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `DynamicForm.tsx`: 완전한 동적 폼 렌더러 — 조건부 로직, ��산 필드, 섹션 지원 (Phase 15에서 구현)
- `DynamicReadOnly.tsx`: schemaDefinitionSnapshot 기반 읽기 전용 렌더러
- `schemaToZod.ts`: 동적 Zod 밸리데이션 — fieldVisibility 지원
- `templateRegistry.ts`: 하드코딩 컴포넌트 매핑 (듀얼 렌더링의 분기 기준)

### Established Patterns
- 듀얼 렌더링 분기: `DocumentEditorPage.tsx:116` — `const isDynamicTemplate = !templateEntry;`
- 스키�� 저장: `ApprovalTemplate.schema_definition` (LONGTEXT, JSON 문자열)
- 스키마 버저닝: `AdminTemplateService`가 업데이트 시 자동 버전 생성
- Flyway 마이그레이션: V1~V11까지 사용 중, V12부터 배정 가능

### Integration Points
- `DocumentEditorPage`: 템플릿 코드로 registry 조회 → 없으면 DynamicForm 사용
- `DocumentDetailPage`: 문서 상세에서 schemaDefinitionSnapshot으로 읽기 전용 렌더링
- `AdminTemplateService.createTemplate/updateTemplate`: schema_definition 저장 및 버저닝
- Phase 1-B의 Purchase, Business Trip, Overtime 폼 (하드코딩 컴포넌트가 존재하는지 확인 필요)

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

*Phase: 16-template-migration*
*Context gathered: 2026-04-06*

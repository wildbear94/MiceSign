# Phase 21: SchemaFieldEditor 리팩토링 - Context

**Gathered:** 2026-04-11
**Status:** Ready for planning

<domain>
## Phase Boundary

596줄 모놀리식 SchemaFieldEditor.tsx를 유지보수 가능한 하위 컴포넌트 파일로 분리한다. 기능 변경 없이 코드 구조만 개선하는 순수 리팩토링이다.

</domain>

<decisions>
## Implementation Decisions

### 파일 분리 전략
- **D-01:** 컴포넌트별 1파일 원칙 — FieldCard.tsx, FieldConfigEditor.tsx, TypeBadge.tsx, SchemaFieldEditor.tsx 각각 별도 파일로 분리
- **D-02:** FieldConfigEditor는 파일만 분리하고 내부 switch문 구조는 유지 (타입별 개별 컴포넌트로 추가 분할하지 않음)

### 디렉토리 구조
- **D-03:** `frontend/src/features/admin/components/SchemaFieldEditor/` 폴더 생성하여 모든 분리된 파일 배치
- **D-04:** `index.tsx`에서 barrel export로 기존 import 경로 호환 유지 (`'./SchemaFieldEditor'` 경로 그대로 동작)

### 타입/상수/유틸 배치
- **D-05:** `types.ts` — SchemaField, SchemaFieldType, SchemaFieldConfig 등 타입/인터페이스 배치. 외부 phase(22-25)에서 이 파일에서 import
- **D-06:** `constants.ts` — FIELD_TYPE_META, FALLBACK_TYPE_META, FIELD_TYPES, INPUT_CLASS, SMALL_INPUT_CLASS 등 상수 배치
- **D-07:** `utils.ts` — toFieldId() 등 헬퍼 함수 배치

### 향후 확장 준비
- **D-08:** 드래그&드롭 순서 변경은 현재 준비하지 않음 (YAGNI). 현재 버튼 방식(moveField) 그대로 유지
- **D-09:** 타입 파일은 SchemaFieldEditor/ 폴더 내부에 두고, 추후 필요 시 상위 레벨로 이동

### 검증 방법
- **D-10:** 수동 QA로 리팩토링 전후 동작 동일성 검증 (필드 추가/삭제/순서변경/설정 편집 확인)

### Claude's Discretion
- 각 파일 내부의 import 정리 순서
- re-export 시 default export vs named export 선택 (기존 패턴 유지 우선)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### 리팩토링 대상
- `frontend/src/features/admin/components/SchemaFieldEditor.tsx` — 596줄 모놀리식 원본 파일 (리팩토링 대상)
- `frontend/src/features/admin/components/TemplateFormModal.tsx` — SchemaFieldEditor를 import하는 부모 컴포넌트 (import 경로 호환 확인 필요)

### 요구사항
- `.planning/REQUIREMENTS.md` §리팩토링 — RFT-01 요구사항
- `.planning/ROADMAP.md` §Phase 21 — Success Criteria (200줄 이하, 기존 기능 동일 작동)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `TypeBadge` (~12줄): 이미 독립적인 작은 컴포넌트, 그대로 분리
- `FieldConfigEditor` (~205줄): switch문 기반 타입별 설정 폼, 파일 분리 시 200줄 기준 근접
- `FieldCard` (~140줄): 접기/펼치기 카드 UI, 깔끔하게 분리 가능
- `SchemaFieldEditor` 메인 (~125줄): 필드 리스트 + CRUD 로직

### Established Patterns
- i18n: `useTranslation('admin')` 패턴 사용 — 각 분리된 컴포넌트에서도 동일하게 사용
- Lucide icons: 아이콘 import는 사용하는 컴포넌트에서 직접 import
- Tailwind CSS: 인라인 클래스 + 공유 상수(INPUT_CLASS, SMALL_INPUT_CLASS) 혼합

### Integration Points
- `TemplateFormModal.tsx`에서 `SchemaFieldEditor` default import 사용 중
- `SchemaField`, `SchemaFieldType` 타입이 export되어 외부에서 참조 가능

</code_context>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches

</specifics>

<deferred>
## Deferred Ideas

- 드래그&드롭 필드 순서 변경 — Phase 22+ 스코프
- FieldConfigEditor 타입별 개별 컴포넌트 분할 — Phase 25(계산 규칙) 확장 시 고려
- 타입 파일 상위 레벨 이동 — Phase 22-25에서 공유 필요성 증가 시

</deferred>

---

*Phase: 21-schemafieldeditor*
*Context gathered: 2026-04-11*

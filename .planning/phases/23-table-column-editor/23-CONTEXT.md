# Phase 23: 테이블 컬럼 편집기 - Context

**Gathered:** 2026-04-12
**Status:** Ready for planning

<domain>
## Phase Boundary

관리자가 table 타입 필드를 선택했을 때 컬럼을 추가/삭제/순서변경하고, 각 컬럼의 타입/라벨/필수여부/세부설정을 편집할 수 있는 UI를 구축한다. 컬럼 변경사항이 미리보기 패널의 테이블에 실시간 반영된다.

</domain>

<decisions>
## Implementation Decisions

### 컬럼 편집 UI 구조
- **D-01:** FieldConfigEditor 내부에 인라인 배치 — switch문에 case 'table' 추가. select 타입의 옵션 편집과 동일한 패턴으로 기존 코드와 일관성 유지
- **D-02:** 각 컬럼은 접기/펼치기 방식 — 컬럼 행 클릭 시 해당 컬럼의 세부 설정(타입별 config)이 펼쳐짐. FieldCard의 접기/펼치기 패턴과 동일
- **D-03:** 컬럼 삭제는 확인 없이 즉시 삭제 — select 옵션 삭제와 동일한 패턴. 저장 전까지 언도 가능

### 컬럼 타입 지원 범위
- **D-04:** 7가지 컬럼 타입 지원 — text, number, date, select, textarea, checkbox, staticText
- **D-05:** 각 타입별 세부 설정은 기존 FieldConfigEditor의 해당 타입 설정을 재활용 (text: placeholder/maxLength, number: min/max/unit, select: options 등)
- **D-06:** checkbox 타입은 신규 추가 — boolean 값 입력용

### 컬럼 순서 변경
- **D-07:** 드래그 & 드롭으로 컬럼 순서 변경 — @dnd-kit/core 라이브러리 사용
- **D-08:** @dnd-kit/core + @dnd-kit/sortable 패키지 설치 필요

### 컬럼 기본값 및 제한
- **D-09:** 새 table 필드 추가 시 컬럼 0개(빈 상태)로 시작. 관리자가 직접 추가
- **D-10:** 최소 1개 컬럼 필요 — 저장 시 밸리데이션으로 강제. 최대 20개 컬럼 제한

### 타입 데이터 구조
- **D-11:** types.ts에 TableColumn 인터페이스 신규 생성 (id, type, label, required, config 필드). SchemaField와 유사한 구조로 일관성 유지
- **D-12:** SchemaFieldConfig에 columns?: TableColumn[] 속성 추가. 기존 schemaToZod.ts의 config?.columns 사용과 호환

### 행 설정
- **D-13:** 컬럼 편집 UI 아래에 minRows/maxRows 설정 필드 포함. schemaToZod.ts에 이미 밸리데이션 코드 존재하므로 프론트엔드 UI만 추가
- **D-14:** SchemaFieldConfig에 minRows?: number, maxRows?: number 속성 추가

### 미리보기 연동
- **D-15:** PreviewFieldRenderer의 table 케이스를 컬럼 헤더 + 빈 샘플 행 2개 테이블로 교체. 컬럼 변경 시 실시간 반영
- **D-16:** 미리보기 테이블에 [+ 행 추가] 버튼 표시 (비활성 상태 — 미리보기이므로 실제 동작 불필요)

### Claude's Discretion
- 컬럼 편집 UI의 정확한 Tailwind 스타일링
- 접기/펼치기 애니메이션 여부
- 드래그 핸들 아이콘 선택 (GripVertical 등)
- 빈 상태(컬럼 0개) 안내 메시지 문구
- TableColumn 타입에서 지원하는 컬럼 타입 목록의 타입 정의 방식 (SchemaFieldType 부분 집합 또는 별도 타입)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### 리팩토링 결과 (Phase 21)
- `frontend/src/features/admin/components/SchemaFieldEditor/` — Phase 21에서 분리된 컴포넌트 폴더
- `frontend/src/features/admin/components/SchemaFieldEditor/types.ts` — SchemaField, SchemaFieldType, SchemaFieldConfig 타입 정의 (TableColumn 추가 대상)
- `frontend/src/features/admin/components/SchemaFieldEditor/FieldConfigEditor.tsx` — case 'table' 추가 대상. 기존 select 타입 옵션 편집 패턴 참고
- `frontend/src/features/admin/components/SchemaFieldEditor/constants.ts` — FIELD_TYPE_META (table 타입 메타 이미 존재)

### 미리보기 (Phase 22)
- `frontend/src/features/admin/components/FormPreview/PreviewFieldRenderer.tsx` — table 케이스 확장 대상 (현재 플레이스홀더)

### 스키마 검증
- `frontend/src/features/document/utils/schemaToZod.ts` — table 타입의 columns/minRows/maxRows 처리 코드 (호환성 확인 필요)

### 요구사항
- `.planning/REQUIREMENTS.md` — TBL-01, TBL-02 요구사항
- `.planning/ROADMAP.md` §Phase 23 — Success Criteria 3개 항목

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `FieldConfigEditor.tsx`: switch문 기반 타입별 설정 폼 — case 'table' 추가하여 컬럼 편집 UI 배치
- `SchemaFieldEditor/types.ts`: SchemaField, SchemaFieldConfig 타입 — TableColumn 추가 및 config 확장
- `SchemaFieldEditor/constants.ts`: FIELD_TYPE_META — table 타입 아이콘/색상 이미 정의 (teal)
- select 타입의 옵션 편집 패턴 (추가/삭제/인라인 편집) — 컬럼 편집 UI의 기본 패턴으로 재활용
- `schemaToZod.ts`: table 타입 columns/minRows/maxRows 밸리데이션 — 이미 구현됨

### Established Patterns
- Tailwind CSS: 모든 UI에서 사용. 컬럼 편집 UI도 동일 패턴
- Lucide icons: 아이콘 라이브러리 (GripVertical for drag handle, Trash2 for delete, Plus for add)
- i18next: `useTranslation('admin')` — 컬럼 관련 라벨도 동일 패턴
- 접기/펼치기: FieldCard에서 사용하는 패턴 참고

### Integration Points
- `FieldConfigEditor.tsx` — case 'table' 추가하여 컬럼 편집 UI 렌더링
- `types.ts` — TableColumn 인터페이스 추가, SchemaFieldConfig에 columns/minRows/maxRows 속성 추가
- `PreviewFieldRenderer.tsx` — table 케이스를 실제 테이블 UI로 교체
- `schemaToZod.ts` — TableColumn 타입과의 호환성 확인 (기존 코드 수정 최소화)

</code_context>

<specifics>
## Specific Ideas

- 컬럼 편집 UI는 select 타입의 옵션 편집 패턴을 기반으로 확장 — 추가/삭제 버튼, 인라인 편집
- 드래그 & 드롭은 @dnd-kit/core + @dnd-kit/sortable 사용 — 컬럼 목록에만 적용
- 각 컬럼의 세부 설정은 FieldConfigEditor의 기존 타입별 렌더링 로직을 재활용 가능 (별도 컴포넌트로 추출하거나 직접 호출)
- minRows/maxRows 설정은 number input 2개로 간단히 구현

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 23-table-column-editor*
*Context gathered: 2026-04-12*

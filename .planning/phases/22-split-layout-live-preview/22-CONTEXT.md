# Phase 22: 분할 레이아웃 + 라이브 미���보기 - Context

**Gathered:** 2026-04-11
**Status:** Ready for planning

<domain>
## Phase Boundary

TemplateFormModal을 near-fullscreen 분할 뷰로 확장하고, 스키마 필드 변경 시 실시간으로 폼 미리보기를 보여주는 패널을 구축한다. 전체화면 미리보기와 미리보기 토글 기능을 포함한다.

</domain>

<decisions>
## Implementation Decisions

### 모달 레이아웃 전환
- **D-01:** 모달 크기를 near-fullscreen (95vh/95vw)으로 확장. 배경 딤 뒤로 기존 페이지가 살짝 보이는 빌더 도구 느낌
- **D-02:** 좌우 50:50 균등 분할. 리사이즈 불가, 고정 비율
- **D-03:** 기존 info/fields 탭 구조를 좌측 패널에 그대로 유지. 우측은 오직 미리보기 패널

### 미리보기 렌더링
- **D-04:** 전용 FormPreview 컴포넌트 신규 생성. Phase 13 DynamicForm과는 별도 — 미리보기에 필요한 최소한만 구현하는 경량 컴포넌트
- **D-05:** 종이 문서 느낌 스타일링 — 회색 배경(gray-100/gray-900) 위에 흰색 종이 카드 + 그림자. 실제 문서가 어떻게 보일지 직관적 확인 가능
- **D-06:** 실시간 반영 — schemaFields 상태가 변경될 때마다 FormPreview가 즉시 리렌더링. 별도 debounce 없이 React 상태 연동

### 전체화면 미리보기
- **D-07:** 포탈 오버레이 방식 — 편집 모달 위에 새 포탈 모달이 뜸. 편집 상태 유지된 채 폼만 크게 표시. X 버튼으로 닫으면 편집 모달로 복귀
- **D-08:** 전체화면 미리보기 버튼은 우측 미리보기 패널 헤더에 배치

### 미리보기 토글
- **D-09:** 즉각 전환 — 애니메이션 없이 즉시 토글. 미리보기 숨기면 편집 영역이 100% 너비로 확장
- **D-10:** 토글 버튼은 미리보기 패널 헤더에 배치. 전체화면 버튼 옆에 위치하여 미리보기 관련 컨트롤이 한 곳에 모임

### Claude's Discretion
- FormPreview 내부 필드 렌더링 구조 및 컴포넌트 분리 방식
- 미리보기 패널 헤더의 정확한 아이콘 선택 (Expand, EyeOff 등)
- 포탈 모달의 정확한 크기 및 패딩
- 필드가 없을 때 미리보기 패널의 빈 상태 UI
- 미리보기 패널 내부 스크롤 처리 방식

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### 리팩토링 결과 (Phase 21)
- `frontend/src/features/admin/components/SchemaFieldEditor/` — Phase 21에서 분리된 컴포넌트 폴더 (SchemaFieldEditor.tsx, FieldCard.tsx, FieldConfigEditor.tsx, TypeBadge.tsx, types.ts, constants.ts, utils.ts)
- `frontend/src/features/admin/components/SchemaFieldEditor/types.ts` — SchemaField, SchemaFieldType 등 타입 정의 (FormPreview에서 import)

### 수정 대상
- `frontend/src/features/admin/components/TemplateFormModal.tsx` — 334줄 현재 모달 (near-fullscreen + 분할 레이아웃으로 변환 대상)

### 요구사항
- `.planning/REQUIREMENTS.md` — RFT-02, PRV-01, PRV-02, PRV-03 요구사항
- `.planning/ROADMAP.md` §Phase 22 — Success Criteria 4개 항목

### 스타일링 참고
- `frontend/src/features/document/components/templates/GeneralForm.tsx` — 기존 폼 레이아웃 패턴 참고 (미리보기 렌더링 시)
- `frontend/src/features/document/components/templates/GeneralReadOnly.tsx` — 읽기 전용 폼 패턴 참고

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `SchemaFieldEditor/types.ts`: SchemaField, SchemaFieldType 타입 — FormPreview에서 직접 import하여 사용
- `SchemaFieldEditor/constants.ts`: FIELD_TYPE_META — 필드 타입별 아이콘/색상 메타데이터, 미리보기에서도 활용 가능
- `TemplateFormModal.tsx`: 기존 모달 구조(탭, 폼, 액션 버튼) — 레이아웃만 변경하고 로직은 유지

### Established Patterns
- Tailwind CSS: 모든 UI에서 사용. 분할 레이아웃도 Tailwind flex/grid로 구현
- react-hook-form + Zod: 기존 폼 패턴. FormPreview는 form 제출 불필요하므로 순수 렌더링만
- Lucide icons: 아이콘 라이브러리. 토글/전체화면 버튼 아이콘으로 사용
- i18next: `useTranslation('admin')` — 미리보기 관련 라벨도 동일 패턴

### Integration Points
- `TemplateFormModal.tsx` — 메인 수정 대상. 모달 크기/레이아웃 변경 + FormPreview 컴포넌트 통합
- `SchemaFieldEditor` — schemaFields 상태를 FormPreview에 전달하는 데이터 소스
- Portal: React `createPortal` — 프로젝트에서 아직 사용하지 않음. 전체화면 미리보기에서 최초 도입

</code_context>

<specifics>
## Specific Ideas

- TemplateFormModal의 기존 로직(폼 제출, 스키마 직렬화, API 호출)은 변경하지 않음 — 레이아웃만 변경
- FormPreview는 SchemaField[] 배열을 props로 받아 읽기 전용 폼 모양을 렌더링
- 미리보기 토글 상태는 useState로 로컬 관리 (서버 저장 불필요)
- 전체화면 포탈 모달은 document.body에 createPortal로 마운트

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 22-split-layout-live-preview*
*Context gathered: 2026-04-11*

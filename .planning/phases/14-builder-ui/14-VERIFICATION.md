---
phase: 14-builder-ui
verified: 2026-04-06T05:00:00Z
status: human_needed
score: 5/5 must-haves verified
re_verification:
  previous_status: human_needed
  previous_score: 5/5
  gaps_closed: []
  gaps_remaining: []
  regressions: []
human_verification:
  - test: "실제 브라우저에서 /admin/templates 접근 → 템플릿 생성 → 빌더 진입 → 필드 드래그 추가 → 프리뷰 토글 → 저장 전체 플로우 확인"
    expected: "각 단계가 오류 없이 동작하고, 저장 후 API에 스키마 데이터가 실제로 저장됨"
    why_human: "React DnD 인터랙션, 라이브 프리뷰 렌더링 정확도, UX 흐름은 자동 검증 불가"
  - test: "캔버스에서 select 필드 선택 시 SelectOptionsEditor 표시, table 필드 선택 시 TableColumnsEditor 표시 확인"
    expected: "필드 타입에 따라 적절한 에디터가 속성 패널 내에 렌더링됨"
    why_human: "조건부 렌더링 동작은 DOM 런타임 검사가 필요"
---

# Phase 14: Builder UI Verification Report

**Phase Goal:** Admins can visually create and edit form templates through a drag-and-drop builder without writing any code
**Verified:** 2026-04-06T05:00:00Z
**Status:** human_needed
**Re-verification:** Yes — Plan 14-05 gap closure 이후 두 번째 재검증

---

## Re-verification Summary

이전 검증(2026-04-06T03:45:00Z) 이후 코드 변경: 커밋 020d2dd (UAT 파일 추가만). 새로운 코드 변경 없음.

| 항목 | 이전 상태 | 현재 상태 | 변화 |
|------|-----------|-----------|------|
| 코드 구현 | VERIFIED (5/5) | VERIFIED (5/5) | 변화 없음 |
| 라우트 등록 | VERIFIED | VERIFIED | 변화 없음 |
| AdminSidebar nav | VERIFIED | VERIFIED | 변화 없음 |
| TemplateListPage | VERIFIED (119줄) | VERIFIED (119줄) | 변화 없음 |
| package.json 의존성 | VERIFIED | VERIFIED | 변화 없음 |
| 인간 검증 항목 | 2개 pending | 2개 pending | UAT 파일 생성됨 (020d2dd) |

회귀 없음. 새로운 gap 없음. 인간 검증 항목이 14-HUMAN-UAT.md에 공식화됨.

---

## Goal Achievement

### Observable Truths (Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|---------|
| 1 | Admin sees a three-panel layout: field palette (left), form canvas (center), property panel (right) | VERIFIED | BuilderLayout.tsx (56줄) 3패널 구조. FieldPalette.tsx, BuilderCanvas.tsx, PropertyPanel.tsx 모두 실질적 구현. App.tsx line 75에 `/admin/templates/:id/builder` 라우트 등록 |
| 2 | Admin can add fields by dragging from the palette to the canvas, or by clicking a field type to append it | VERIFIED | FieldPalette.tsx (87줄): `Draggable` + `onClickAdd`. TemplateBuilderPage `handleDragEnd` → `ADD_FIELD` dispatch, `handleClickAdd` → `ADD_FIELD` dispatch. useBuilderReducer 145줄에 `ADD_FIELD` case 구현 |
| 3 | Admin can reorder fields by dragging within the canvas, and configure each field's properties (label, required, placeholder, options) in the property panel | VERIFIED | useBuilderReducer `REORDER_FIELD` 액션 구현(line 79). PropertyPanel.tsx (154줄): PropertyBasicTab, PropertyValidationTab, PropertyAdvancedTab 3탭 구조. SelectOptionsEditor, TableColumnsEditor 조건부 렌더링 구현 |
| 4 | Admin can toggle live preview to see the form exactly as end-users will see it | VERIFIED | BuilderPreview.tsx (38줄): `DynamicForm` import(line 2) + fields → SchemaDefinition 변환 렌더링(line 29). TemplateBuilderPage `isPreview` state로 BuilderCanvas/BuilderPreview 토글 |
| 5 | Admin can create new templates, edit existing ones, deactivate templates, and browse all templates in a management list page | VERIFIED | TemplateListPage.tsx (119줄): `useAdminTemplates` 훅 연결, `TemplateListTable` 렌더링, `TemplateCreateModal` + `ConfirmDialog` 연결. App.tsx line 74에 `/admin/templates` 라우트 등록. AdminSidebar line 14에 nav item 등록 |

**Score:** 5/5 truths verified

---

## Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `frontend/src/features/admin/types/builder.ts` | Builder 타입 정의 | VERIFIED | AdminTemplateResponse, BuilderState, BuilderAction, PALETTE_ITEMS 포함 |
| `frontend/src/features/admin/api/adminTemplateApi.ts` | Admin 템플릿 CRUD API 클라이언트 | VERIFIED | GET/POST/PUT/DELETE + option-sets 엔드포인트 구현 |
| `frontend/src/features/admin/hooks/useAdminTemplates.ts` | TanStack Query 훅 | VERIFIED | useAdminTemplates, useCreateTemplate, useUpdateTemplate, useDeactivateTemplate 구현 |
| `frontend/src/features/admin/components/builder/useBuilderReducer.ts` | 11개 액션 타입 reducer | VERIFIED | 145줄. ADD_FIELD, REORDER_FIELD 등 액션 케이스 구현 확인 |
| `frontend/src/features/admin/components/builder/BuilderLayout.tsx` | 3패널 레이아웃 | VERIFIED | 56줄 존재 |
| `frontend/src/features/admin/components/builder/FieldPalette.tsx` | 드래그 가능 필드 타입 | VERIFIED | 87줄. Draggable + onClickAdd 구현 |
| `frontend/src/features/admin/components/builder/BuilderCanvas.tsx` | 드롭 가능 캔버스 | VERIFIED | 71줄. Droppable 구현 |
| `frontend/src/features/admin/components/builder/FieldCard.tsx` | 드래그 핸들, 선택, 인라인 툴바 | VERIFIED | 106줄 존재 |
| `frontend/src/features/admin/components/builder/BuilderToolbar.tsx` | 저장, 프리뷰 토글, JSON 내보내기 | VERIFIED | 146줄 존재 |
| `frontend/src/features/admin/components/builder/BuilderPreview.tsx` | DynamicForm 렌더링 라이브 프리뷰 | VERIFIED | 38줄. DynamicForm import(line 2) + render(line 29) |
| `frontend/src/features/admin/components/builder/PropertyPanel.tsx` | 3탭 속성 패널 | VERIFIED | 154줄. SelectOptionsEditor, TableColumnsEditor 조건부 포함 |
| `frontend/src/features/admin/components/builder/JsonImportModal.tsx` | Zod 검증 JSON 가져오기 | VERIFIED | 248줄 존재 |
| `frontend/src/features/admin/components/builder/SelectOptionsEditor.tsx` | select 필드 옵션 에디터 | VERIFIED | 135줄 존재 |
| `frontend/src/features/admin/components/builder/TableColumnsEditor.tsx` | table 필드 컬럼 에디터 | VERIFIED | 117줄 존재 |
| `frontend/src/features/admin/pages/TemplateListPage.tsx` | 템플릿 목록 관리 페이지 | VERIFIED | 119줄. useAdminTemplates, TemplateListTable, TemplateCreateModal, ConfirmDialog 모두 연결 |
| `frontend/src/features/admin/pages/TemplateBuilderPage.tsx` | 빌더 메인 페이지 | VERIFIED | 255줄. DragDropContext, BuilderLayout, 모든 패널 연결 완전 구현 |
| `frontend/src/features/admin/components/TemplateCreateModal.tsx` | 템플릿 생성 모달 | VERIFIED | 194줄. TemplateListPage에서 import + render 확인 |
| `frontend/src/features/admin/components/TemplateListTable.tsx` | 템플릿 목록 테이블 | VERIFIED | 133줄. TemplateListPage에서 import + render 확인 |
| `frontend/src/App.tsx` | /admin/templates, /admin/templates/:id/builder 라우트 | VERIFIED | line 12-13: import. line 74-75: Route 등록. AdminRoute 블록 내부 |
| `frontend/src/features/admin/components/AdminSidebar.tsx` | templates nav item | VERIFIED | line 2: LayoutTemplate import. line 14: navItems 항목 `{ to: '/admin/templates' }` |
| `frontend/package.json` | nanoid, @headlessui/react dependencies | VERIFIED | `"@headlessui/react": "^2.2.9"` (line 13), `"nanoid": "^5.1.7"` (line 32) |

---

## Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| App.tsx | TemplateListPage | Route element, path="templates" | WIRED | line 74 확인 |
| App.tsx | TemplateBuilderPage | Route element, path="templates/:id/builder" | WIRED | line 75 확인 |
| AdminSidebar | /admin/templates | navItems array, LayoutTemplate icon | WIRED | line 14 확인 |
| TemplateListPage | TemplateListTable | import + render | WIRED | line 5 import, line 90 render |
| TemplateListPage | TemplateCreateModal | import + render | WIRED | line 6 import, line 98 render |
| TemplateListPage | useAdminTemplates | 훅 호출 | WIRED | line 8 import, line 15 호출 |
| TemplateBuilderPage | useBuilderReducer | 훅 import + dispatch | WIRED | 11가지 액션 dispatch 사용 |
| TemplateBuilderPage | useAdminTemplate | TanStack Query 훅, templateId 기반 쿼리 | WIRED | INIT_SCHEMA dispatch로 상태 초기화 |
| TemplateBuilderPage | useUpdateTemplate | TanStack Query mutation, handleSave | WIRED | `updateMutation.mutateAsync()` 호출(line 67) |
| BuilderPreview | DynamicForm | import + schema 변환 props | WIRED | line 2 import, line 29 렌더링 |
| PropertyPanel | UPDATE_FIELD / UPDATE_FIELD_CONFIG | onUpdateField/onUpdateFieldConfig props | WIRED | TemplateBuilderPage에서 dispatch로 연결 |

---

## Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| TemplateBuilderPage | templateData | useAdminTemplate(templateId) → adminTemplateApi → GET /admin/templates/:id | AdminTemplateService.getTemplate() → ApprovalTemplateRepository.findById() — 실제 DB 쿼리 | FLOWING |
| TemplateBuilderPage (save) | state.fields | useBuilderReducer state → useUpdateTemplate mutateAsync → PUT /admin/templates/:id | AdminTemplateService.updateTemplate() → JPA save — 실제 DB 저장 | FLOWING |
| BuilderPreview | fields | TemplateBuilderPage state props → DynamicForm schema | reducer state → DynamicForm 렌더링 | FLOWING |
| TemplateListPage | templates | useAdminTemplates() → adminTemplateApi → GET /admin/templates | AdminTemplateService.getAllTemplates() → ApprovalTemplateRepository.findAll() — 실제 DB 쿼리 | FLOWING |

---

## Behavioral Spot-Checks

Step 7b: SKIPPED — 서버 실행 없이 테스트 불가한 React SPA.

TypeScript 컴파일(`tsc --noEmit`)은 이전 검증에서 오류 없이 통과 확인됨(커밋 050ba56 이후). 이후 코드 변경 없음(UAT 파일만 추가). nanoid, @headlessui/react가 package.json에 등록되어 있어 새 환경에서 `npm install` 후 정상 빌드 가능.

---

## Requirements Coverage

BLDR- 요구사항은 REQUIREMENTS.md v1/v2 섹션에 정의되어 있지 않음. ROADMAP.md Phase 14 섹션 `**Requirements**: BLDR-01, BLDR-02, BLDR-03, BLDR-04, BLDR-05, BLDR-06`에만 참조됨.

| Requirement ID | 정의 위치 | 설명 | Status | Evidence |
|----------------|-----------|------|--------|---------|
| BLDR-01 | ROADMAP.md Phase 14 | 드래그로 팔레트→캔버스 필드 추가 | SATISFIED | FieldPalette Draggable + handleDragEnd → ADD_FIELD dispatch. App.tsx 라우트 등록으로 접근 가능 |
| BLDR-02 | ROADMAP.md Phase 14 | 클릭으로 필드 추가(append) | SATISFIED | handleClickAdd → ADD_FIELD dispatch 구현. 라우트 등록 완료 |
| BLDR-03 | ROADMAP.md Phase 14 | 캔버스 내 필드 순서 재배치 | SATISFIED | REORDER_FIELD reducer 액션 구현(line 79). 라우트 등록 완료 |
| BLDR-04 | ROADMAP.md Phase 14 | 속성 패널에서 필드 속성 구성 | SATISFIED | PropertyPanel 3탭(Basic/Validation/Advanced) + SelectOptionsEditor + TableColumnsEditor. 라우트 등록 완료 |
| BLDR-05 | ROADMAP.md Phase 14 | 라이브 프리뷰 토글 | SATISFIED | BuilderPreview + DynamicForm 연결. isPreview state 토글 구현. 라우트 등록 완료 |
| BLDR-06 | ROADMAP.md Phase 14 | 템플릿 목록 관리 (생성/편집/비활성화/목록) | SATISFIED | TemplateListPage 119줄 완전 구현. TemplateCreateModal + TemplateListTable + ConfirmDialog 연결. /admin/templates 라우트 등록 완료 |

**Coverage 요약:** BLDR-01~06 모두 구현 완료. REQUIREMENTS.md 내 orphaned 요구사항 없음.

---

## Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `frontend/src/features/admin/pages/TemplateBuilderPage.tsx` | 78, 80 | `window.alert()` 저장 성공/실패 피드백 | WARNING | UX 품질 — 토스트 라이브러리 없이 브라우저 기본 alert 사용. 기능 차단은 아님 |

이전 VERIFICATION의 4개 BLOCKER 패턴 (stub TemplateListPage, 미등록 라우트 2개, package.json 의존성 누락)은 이전 검증 시 이미 해결됨. 새로운 blocker 없음.

---

## Human Verification Required

### 1. 빌더 전체 사용성 검증

**Test:** 실제 브라우저에서 `/admin/templates` 접근 → 템플릿 목록 확인 → "새 템플릿" 버튼 클릭 → 템플릿 생성 → 자동으로 빌더 페이지 이동 → 필드 팔레트에서 필드 드래그/클릭으로 캔버스에 추가 → 필드 속성 편집 → "프리뷰" 토글 → 저장 전체 플로우 실행

**Expected:** 각 단계가 오류 없이 동작하고, 저장 후 API에 스키마 데이터가 실제로 저장됨. 브라우저 alert으로 저장 성공 피드백 표시됨.

**Why human:** React DnD 인터랙션, 라이브 프리뷰 렌더링 정확도, 전체 UX 흐름은 자동 검증 불가

### 2. PropertyPanel 필드 타입별 에디터 표시 검증

**Test:** 캔버스에서 `select` 필드 선택 시 SelectOptionsEditor 표시, `table` 필드 선택 시 TableColumnsEditor 표시 확인. 나머지 필드 타입에서는 미표시 확인.

**Expected:** 필드 타입에 따라 적절한 에디터가 속성 패널 Advanced 탭에 조건부 렌더링됨

**Why human:** 조건부 렌더링 동작은 DOM 런타임 검사가 필요

---

## Gaps Summary

현재 자동화 검증 기준으로 phase 14 목표가 모두 달성되었습니다.

**해결된 gap (이전 검증 시점):** 라우트 미등록, AdminSidebar nav 누락, TemplateListPage stub, package.json 의존성 누락 — Plan 14-05를 통해 전부 해결됨.

**현재 남은 자동화 가능 이슈:** 없음

**현재 남은 WARNING (비차단):**
- `TemplateBuilderPage.tsx` line 78, 80: `window.alert()` 저장 피드백 — UX 품질 문제이나 기능 동작에는 영향 없음

**Phase 14 목표 달성 상태:** 자동화 검증 기준으로 5/5 truth 모두 VERIFIED. 인간 검증 항목(실제 DnD 동작, 조건부 렌더링)이 14-HUMAN-UAT.md에 공식화됨. 해당 UAT 통과 후 완전한 달성으로 확인 가능.

---

*Verified: 2026-04-06T05:00:00Z*
*Verifier: Claude (gsd-verifier)*
*Re-verification: Plan 14-05 gap closure 이후 두 번째 재검증 — 코드 변화 없음, 회귀 없음 확인*

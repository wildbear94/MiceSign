---
phase: 23-table-column-editor
verified: 2026-04-12T05:00:00Z
status: human_needed
score: 11/12 must-haves verified
overrides_applied: 0
human_verification:
  - test: "table 타입 필드 선택 시 컬럼 편집 UI 표시 및 전체 기능 동작 확인"
    expected: "컬럼 추가/삭제/DnD 순서변경/접기펼치기/타입별 설정/미리보기 실시간 반영/저장 가드가 모두 브라우저에서 정상 동작"
    why_human: "DnD 상호작용, 실시간 미리보기 반영, 토스트 에러 표시는 런타임 동작으로 코드 정적 분석만으로 검증 불가"
---

# Phase 23: 테이블 컬럼 편집기 Verification Report

**Phase Goal:** 관리자가 table 타입 필드의 컬럼 구조를 시각적으로 설계하고 설정할 수 있다
**Verified:** 2026-04-12T05:00:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | table 타입 필드 선택 시 컬럼 편집 UI가 표시된다 | ✓ VERIFIED | FieldConfigEditor.tsx line 193: `case 'table':` → `<TableColumnEditor>` 렌더링 확인 |
| 2 | 컬럼 추가 버튼으로 새 컬럼을 추가할 수 있다 | ✓ VERIFIED | TableColumnEditor.tsx line 209-219: `addColumn()` 함수, `columns.length >= 20` 제한 포함 |
| 3 | 컬럼 삭제 버튼으로 즉시 삭제된다 | ✓ VERIFIED | TableColumnEditor.tsx line 222-225: `deleteColumn()` 확인 없이 즉시 filter 처리 |
| 4 | 드래그 앤 드롭으로 컬럼 순서를 변경할 수 있다 | ✓ VERIFIED | TableColumnEditor.tsx: DndContext + SortableContext + arrayMove 완전 구현 (line 256-273) |
| 5 | 컬럼 행을 클릭하면 세부 설정이 펼쳐진다 | ✓ VERIFIED | SortableColumnRow의 `expanded` 상태 + `{expanded && <div>...}` 패턴 확인 (line 124) |
| 6 | 관리자가 각 컬럼의 타입(text/number/date/select), 라벨, 필수여부를 설정할 수 있다 | ✓ VERIFIED | TableColumnEditor.tsx 펼침 영역에 label/id/type/required 입력 필드 구현 (line 126-181) |
| 7 | text 컬럼에서 placeholder/maxLength, number 컬럼에서 min/max/unit, select 컬럼에서 options를 설정할 수 있다 | ✓ VERIFIED | ColumnConfigPanel.tsx: switch(column.type)로 7개 타입 각각 세부 설정 구현 |
| 8 | minRows/maxRows 행 설정이 가능하다 | ✓ VERIFIED | TableColumnEditor.tsx line 277-307: 행 설정 UI 구현, FieldConfigEditor case 'table'에서 props 전달 확인 |
| 9 | 컬럼 변경사항이 미리보기 패널의 테이블에 실시간 반영된다 | ? UNCERTAIN | PreviewFieldRenderer.tsx에 실제 테이블 렌더링 코드 존재 (`field.config.columns` 읽기), 실시간 반영 여부는 브라우저 동작 확인 필요 |
| 10 | 미리보기 테이블에 컬럼 헤더 + 샘플 행 2개 + 비활성 행 추가 버튼이 표시된다 | ✓ VERIFIED | PreviewFieldRenderer.tsx: `<table>` + `<thead>` + `[0, 1].map` tbody + 비활성 `+ addRow` 버튼 확인 |
| 11 | 저장 시 table 타입 필드에 최소 1개 컬럼이 없으면 에러가 표시되고 저장이 차단된다 | ✓ VERIFIED | TemplateFormModal.tsx line 127-133: `f.type === 'table'` 필터 + `columns.length === 0` 체크 + toast.error + early return |
| 12 | 컬럼 변경사항이 미리보기 패널에 실시간 반영되는 브라우저 동작 | ? UNCERTAIN | 런타임 검증 필요 (Plan 02 Task 3: checkpoint:human-verify, PENDING) |

**Score:** 11/12 truths verified (1 uncertain — 브라우저 런타임 확인 필요)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|---------|--------|---------|
| `frontend/src/features/admin/components/SchemaFieldEditor/types.ts` | TableColumn interface + TableColumnType + SchemaFieldConfig extensions | ✓ VERIFIED | TableColumnType(7종), TableColumn interface, columns/minRows/maxRows 모두 확인 |
| `frontend/src/features/admin/components/SchemaFieldEditor/TableColumnEditor.tsx` | Column list with DnD + add/delete/expand (min 80 lines) | ✓ VERIFIED | 310줄, DndContext/SortableContext/useSortable/arrayMove 완전 구현 |
| `frontend/src/features/admin/components/SchemaFieldEditor/FieldConfigEditor.tsx` | case 'table' rendering TableColumnEditor | ✓ VERIFIED | line 193: `case 'table':` + `<TableColumnEditor` 렌더링 |
| `frontend/src/features/admin/components/SchemaFieldEditor/ColumnConfigPanel.tsx` | Type-specific column config (min 50 lines) | ✓ VERIFIED | 201줄, switch(column.type)로 7개 타입 구현 |
| `frontend/src/features/admin/components/FormPreview/PreviewFieldRenderer.tsx` | Real table preview with column headers + sample rows | ✓ VERIFIED | `<table className="w-full text-sm">` + columns 루프 + [0,1] 샘플 행 확인 |
| `frontend/public/locales/ko/admin.json` | i18n keys for column editor (columnEmpty 포함) | ✓ VERIFIED | columnEmpty, columnMinError, columnTypeCheckbox, rowSettings 등 확인 |
| `frontend/src/features/admin/components/TemplateFormModal.tsx` | Save-time validation guard (columnMinError) | ✓ VERIFIED | line 127-133: 완전한 가드 로직 확인 |
| `frontend/public/locales/en/admin.json` | English i18n keys | ✓ VERIFIED | columnEmpty, columnMinError, rowSettings 등 영문 키 확인 |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| FieldConfigEditor.tsx | TableColumnEditor.tsx | case 'table' renders `<TableColumnEditor>` | ✓ WIRED | line 193-203: case 'table' + `<TableColumnEditor` + minRows/maxRows props 전달 확인 |
| TableColumnEditor.tsx | @dnd-kit/sortable | DndContext + SortableContext | ✓ WIRED | package.json에 @dnd-kit/core@^6.3.1 + @dnd-kit/sortable@^10.0.0 설치, import 확인 |
| TableColumnEditor.tsx | ColumnConfigPanel.tsx | expanded column renders `<ColumnConfigPanel>` | ✓ WIRED | line 184: `<ColumnConfigPanel column={column} onUpdate={...} />` |
| PreviewFieldRenderer.tsx | field.config.columns | table case reads columns array for headers | ✓ WIRED | line 77: `const columns = field.config.columns \|\| []` + columns.map 확인 |
| TemplateFormModal.tsx | schemaFields | onSubmit validates table fields have >= 1 column | ✓ WIRED | line 127-133: `schemaFields.filter(f => f.type === 'table' && ...)` |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|-------------------|--------|
| TableColumnEditor.tsx | `columns` | FieldConfigEditor → `config.columns \|\| []` | ✓ | ✓ FLOWING: onColumnsChange → updateConfig({ columns }) → 부모 상태 업데이트 |
| PreviewFieldRenderer.tsx | `columns` | `field.config.columns` prop | ✓ | ✓ FLOWING: field prop에서 직접 읽기, 빈 배열 방어 처리 포함 |
| ColumnConfigPanel.tsx | `column` | TableColumnEditor → `onUpdate` 콜백 | ✓ | ✓ FLOWING: updateColumn(columnId, updated) → onColumnsChange |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| TypeScript 컴파일 | `npx tsc --noEmit` | 0 errors | ✓ PASS |
| @dnd-kit 패키지 설치 | package.json 확인 | @dnd-kit/core@^6.3.1, @dnd-kit/sortable@^10.0.0 | ✓ PASS |
| ColumnConfigPanel 7개 타입 커버 | switch 분기 확인 | text/textarea/number/date/select/checkbox/staticText 모두 case 존재 | ✓ PASS |
| 저장 가드 로직 | grep in TemplateFormModal | columns.length === 0 체크 + toast.error + return 확인 | ✓ PASS |
| 브라우저 DnD 인터랙션 | 런타임 불가 | N/A | ? SKIP |
| 실시간 미리보기 반영 | 런타임 불가 | N/A | ? SKIP |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|---------|
| TBL-01 | 23-01, 23-02 | 관리자가 table 타입 필드에 컬럼을 추가/삭제/순서변경할 수 있다 | ✓ SATISFIED | TableColumnEditor: addColumn/deleteColumn/arrayMove(DnD) 구현 완료 |
| TBL-02 | 23-02 | 관리자가 각 컬럼의 타입(text/number/date/select), 라벨, 필수여부를 설정할 수 있다 | ✓ SATISFIED | TableColumnEditor 펼침 영역 + ColumnConfigPanel 타입별 설정 구현 완료 |

**ORPHANED 요구사항:** 없음. TBL-01, TBL-02 모두 계획에 명시적으로 포함.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| 없음 | - | - | - | - |

Plan 01 SUMMARY의 Known Stubs (`{/* ColumnConfigPanel will be added in Plan 02 */}`) 는 Plan 02에서 완전히 제거되고 실제 `<ColumnConfigPanel>` 렌더링으로 교체됨. 현재 코드에 placeholder 주석 없음.

### Human Verification Required

#### 1. 테이블 컬럼 편집기 전체 기능 브라우저 검증

**Test:** 브라우저에서 관리자 로그인 → 양식 관리 → 양식 편집 모달 열기
**Expected:**
1. "필드 추가" → "표" 타입 선택 → table 필드가 추가되고 "컬럼 목록" 섹션 표시
2. "컬럼 추가" 클릭 → 새 컬럼 추가되고 자동으로 펼쳐짐
3. 컬럼 라벨 입력 → 우측 미리보기 패널 테이블 헤더에 실시간 반영
4. 컬럼 타입 "숫자" 변경 → 세부 설정에 최소값/최대값/단위 표시
5. 컬럼 타입 "선택" 변경 → 옵션 추가/삭제 가능
6. 3개 이상 컬럼 추가 후 드래그 앤 드롭으로 순서 변경 → 미리보기 반영
7. 컬럼 삭제 버튼(휴지통) 클릭 → 확인 없이 즉시 삭제
8. 미리보기 테이블에 컬럼 헤더 + 샘플 행 2개 + "[+ 행 추가]" 비활성 버튼 표시
9. 컬럼을 모두 삭제한 상태에서 저장 클릭 → "테이블에 최소 1개의 컬럼이 필요합니다" 토스트 에러 + 저장 차단
10. 컬럼 1개 이상 추가 후 저장 → 정상 저장
**Why human:** DnD 인터랙션, 실시간 미리보기 반영, 토스트 에러 표시, 저장 가드 동작은 브라우저 런타임 동작으로 정적 코드 분석만으로 검증 불가 (Plan 02 Task 3 checkpoint:human-verify PENDING 상태)

### Gaps Summary

자동화 검증에서 발견된 blocking gap 없음. 모든 코드 수준 must-have(11개)가 검증됨. 브라우저 런타임 동작(실시간 미리보기 반영, DnD 인터랙션, 저장 가드 토스트) 1개 항목이 인간 검증을 필요로 함.

---

_Verified: 2026-04-12T05:00:00Z_
_Verifier: Claude (gsd-verifier)_

---
phase: 23-table-column-editor
plan: 01
subsystem: frontend/admin/SchemaFieldEditor
tags: [table-column, dnd, schema-editor]
dependency_graph:
  requires: []
  provides: [TableColumn-type, TableColumnEditor-component, dnd-kit-installed]
  affects: [FieldConfigEditor, SchemaFieldEditor-types, SchemaFieldEditor-constants]
tech_stack:
  added: ["@dnd-kit/core@6.3.1", "@dnd-kit/sortable@10.0.0"]
  patterns: [sortable-dnd, expand-collapse-row, inline-column-editing]
key_files:
  created:
    - frontend/src/features/admin/components/SchemaFieldEditor/TableColumnEditor.tsx
  modified:
    - frontend/src/features/admin/components/SchemaFieldEditor/types.ts
    - frontend/src/features/admin/components/SchemaFieldEditor/constants.ts
    - frontend/src/features/admin/components/SchemaFieldEditor/FieldConfigEditor.tsx
    - frontend/src/features/admin/components/SchemaFieldEditor/index.tsx
    - frontend/public/locales/ko/admin.json
    - frontend/package.json
decisions:
  - "@dnd-kit/utilities는 @dnd-kit/sortable의 의존성으로 자동 설치됨 - 별도 설치 불필요"
  - "컬럼 타입 변경 시 config를 초기화하여 이전 타입의 설정값 잔류 방지"
metrics:
  duration: "2m 28s"
  completed: "2026-04-12T02:41:42Z"
  tasks_completed: 2
  tasks_total: 2
  files_changed: 7
---

# Phase 23 Plan 01: TableColumn 타입 정의 + @dnd-kit + TableColumnEditor 핵심 컴포넌트 Summary

TableColumn/TableColumnType 타입 정의, @dnd-kit 기반 DnD 순서변경, 컬럼 추가/삭제/접기펼치기를 지원하는 TableColumnEditor 구현 및 FieldConfigEditor 연결

## Task Results

### Task 1: @dnd-kit 설치 + TableColumn 타입 정의 + constants 확장
- **Commit:** eb3d3a3
- **Result:** @dnd-kit/core@6.3.1, @dnd-kit/sortable@10.0.0 설치. TableColumnType(7종), TableColumn 인터페이스 추가. SchemaFieldConfig에 columns/minRows/maxRows 확장. FIELD_TYPES에 'table' 추가, COLUMN_TYPES/COLUMN_TYPE_META 신규 상수 추가.

### Task 2: TableColumnEditor 컴포넌트 + FieldConfigEditor case 'table' 연결
- **Commit:** 89e4051
- **Result:** TableColumnEditor.tsx 신규 생성 (DndContext + SortableContext, PointerSensor/KeyboardSensor, arrayMove, 최대 20개 제한, 즉시삭제, 접기/펼치기). FieldConfigEditor에 case 'table' 추가하여 TableColumnEditor 렌더링. 컬럼 관련 i18n 키 16개 추가.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing] i18n 키 추가**
- **Found during:** Task 2
- **Issue:** Plan에서 columnType 관련 i18n 키가 admin.json에 없었음
- **Fix:** columnList, addColumn, columnEmpty, columnMaxError, columnLabel, columnId, columnType, columnType{Type}, reorderColumn 키 추가
- **Files modified:** frontend/public/locales/ko/admin.json
- **Commit:** 89e4051

**2. [Rule 2 - Missing] 컬럼 타입 변경 시 config 초기화**
- **Found during:** Task 2
- **Issue:** 컬럼 타입 변경 시 이전 타입의 config 값이 잔류할 수 있음
- **Fix:** type 변경 onChange에서 config를 빈 객체로 초기화
- **Files modified:** frontend/src/features/admin/components/SchemaFieldEditor/TableColumnEditor.tsx
- **Commit:** 89e4051

## Known Stubs

| File | Line | Stub | Reason |
|------|------|------|--------|
| TableColumnEditor.tsx | ~167 | `{/* ColumnConfigPanel will be added in Plan 02 */}` | Plan 02에서 컬럼별 세부 설정 패널 구현 예정 |

## Self-Check: PASSED

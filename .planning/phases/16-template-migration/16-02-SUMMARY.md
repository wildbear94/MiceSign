---
phase: 16-template-migration
plan: 02
title: "Frontend Dual Rendering - Dynamic/Hardcoded Template Branching"
subsystem: frontend
tags: [template, dual-rendering, migration, dynamic-form]
dependency_graph:
  requires: [template-schemas, dynamic-validation, schema-snapshot]
  provides: [dual-rendering-frontend, dynamic-readonly-fallback]
  affects: [document-editor, document-detail]
tech_stack:
  added: []
  patterns: [schema-based-rendering-branch, hardcoded-fallback-for-legacy]
key_files:
  created: []
  modified:
    - frontend/src/features/document/types/document.ts
    - frontend/src/features/document/pages/DocumentEditorPage.tsx
    - frontend/src/features/document/pages/DocumentDetailPage.tsx
decisions:
  - "New documents always use DynamicForm regardless of template registry presence"
  - "Existing DRAFT without schemaDefinitionSnapshot uses hardcoded editor (legacy compat)"
  - "DocumentDetailPage uses schemaDefinitionSnapshot presence as primary rendering branch condition"
metrics:
  duration: 4min
  completed: "2026-04-06T08:30:15Z"
  tasks_completed: 1
  tasks_total: 2
  files_created: 0
  files_modified: 3
---

# Phase 16 Plan 02: Frontend Dual Rendering Summary

DocumentDetailResponse 타입에 schemaDefinitionSnapshot 추가, DocumentEditorPage/DocumentDetailPage에 동적/하드코딩 듀얼 렌더링 분기 로직 완성

## What Was Done

### Task 1: Frontend Type + Editor/Detail Page Dual Rendering
- **document.ts**: DocumentDetailResponse에 `schemaDefinitionSnapshot: string | null` 필드 추가
- **DocumentEditorPage.tsx**: 듀얼 렌더링 분기 로직 구현
  - 신규 문서 생성: 항상 DynamicForm 사용 (마이그레이션 후 모든 템플릿에 schema_definition 존재)
  - 기존 DRAFT 편집: schemaDefinitionSnapshot이 없으면 하드코딩 에디터, 있으면 DynamicForm
  - DynamicForm import 추가 및 렌더링 분기 적용
- **DocumentDetailPage.tsx**: DynamicReadOnly 폴백 통합
  - 하드코딩 ReadOnly + 스냅샷 없음 -> 레거시 문서 (하드코딩 렌더러)
  - 스냅샷 존재 -> 동적 문서 (DynamicReadOnly)
  - 둘 다 없음 -> "알 수 없는 양식" 텍스트
- TypeScript 컴파일 에러 없음 (`tsc --noEmit` 통과)
- Commit: 820d71c

### Task 2: Dual Rendering Manual Verification (checkpoint:human-verify)
- **Status:** Pending human verification
- **What needs to be verified:**
  1. 기존 GENERAL DRAFT 문서 편집 시 하드코딩 Tiptap 에디터 표시 확인
  2. 기존 SUBMITTED 문서(GENERAL/EXPENSE/LEAVE) 상세 페이지에서 하드코딩 ReadOnly 컴포넌트 표시 확인
  3. 신규 GENERAL 문서 생성 시 DynamicForm 렌더링 확인 (textarea, Tiptap 아님)
  4. 신규 EXPENSE 문서 생성 시 테이블/금액 필드 표시 확인
  5. 신규 PURCHASE 문서 생성 시 동적 폼 렌더링 확인
  6. 신규 동적 문서 저장 후 상세 페이지에서 DynamicReadOnly 정상 표시 확인

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

None. All rendering branches are fully wired to existing DynamicForm and DynamicReadOnly components.

## Threat Flags

None. No new network endpoints, auth paths, or schema changes introduced. Changes are purely frontend rendering logic.

## Self-Check: PASSED

All 3 modified files verified present. Task 1 commit hash 820d71c verified in git log. Task 2 is a human-verify checkpoint (pending).

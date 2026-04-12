---
phase: 23-table-column-editor
plan: "02"
subsystem: frontend/admin/schema-editor
tags: [column-config, table-preview, validation, i18n]
dependency_graph:
  requires: [23-01]
  provides: [column-config-panel, table-preview, save-validation-guard]
  affects: [TemplateFormModal, PreviewFieldRenderer, TableColumnEditor, FieldConfigEditor]
tech_stack:
  added: []
  patterns: [type-switch-config-panel, table-preview-rendering, save-time-validation-guard]
key_files:
  created:
    - frontend/src/features/admin/components/SchemaFieldEditor/ColumnConfigPanel.tsx
  modified:
    - frontend/src/features/admin/components/SchemaFieldEditor/TableColumnEditor.tsx
    - frontend/src/features/admin/components/SchemaFieldEditor/FieldConfigEditor.tsx
    - frontend/src/features/admin/components/TemplateFormModal.tsx
    - frontend/src/features/admin/components/FormPreview/PreviewFieldRenderer.tsx
    - frontend/public/locales/ko/admin.json
    - frontend/public/locales/en/admin.json
decisions:
  - Reused FieldConfigEditor patterns for ColumnConfigPanel (same label styles, input classes, update pattern)
  - staticText textarea rows=2 (vs 3 in field-level) for compact column config
metrics:
  duration: 3min
  completed: "2026-04-12T02:48:42Z"
  tasks: 2/2 auto tasks (1 checkpoint pending)
  files: 7
---

# Phase 23 Plan 02: ColumnConfigPanel + Table Preview + Save Guard Summary

ColumnConfigPanel with 7 column type configs, minRows/maxRows row settings, real table preview with column-aware rendering, and save-time validation guard blocking 0-column table fields.

## Task Completion

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 1 | ColumnConfigPanel + row settings + save guard + i18n | ca58475 | ColumnConfigPanel.tsx, TableColumnEditor.tsx, FieldConfigEditor.tsx, TemplateFormModal.tsx, ko/admin.json, en/admin.json |
| 2 | PreviewFieldRenderer table preview replacement | 736b065 | PreviewFieldRenderer.tsx |
| 3 | Human verify checkpoint | PENDING | (manual browser verification) |

## What Was Built

### ColumnConfigPanel.tsx (new)
- Type-switch rendering for 7 column types:
  - text/textarea: placeholder + maxLength
  - number: min + max + unit + placeholder
  - date: no config message
  - select: options editor (add/remove/edit value+label)
  - checkbox: no config message
  - staticText: content textarea
- Reuses FieldConfigEditor patterns (SMALL_INPUT_CLASS, updateConfig helper, label styles)

### TableColumnEditor.tsx (modified)
- Added ColumnConfigPanel in expanded column detail section
- Added minRows/maxRows row settings section below column list
- Extended props interface with row settings callbacks

### FieldConfigEditor.tsx (modified)
- case 'table' now passes minRows/maxRows/onMinRowsChange/onMaxRowsChange to TableColumnEditor

### TemplateFormModal.tsx (modified)
- Save-time validation guard (D-10): blocks save when any table field has 0 columns
- Shows toast.error with columnMinError message and returns early

### PreviewFieldRenderer.tsx (modified)
- Replaced placeholder div with real table preview
- Column headers with labels and required indicators
- 2 sample rows with type-specific disabled inputs (text, number, date, select, textarea, checkbox, staticText)
- Disabled "+ Add Row" button at bottom
- Empty state with dashed border and guidance message

### i18n
- Added ko/en keys: removeColumn, rowSettings, minRows, maxRows, addRow, columnMinError
- en/admin.json: added all missing column editor keys (columnList, addColumn, columnLabel, columnId, columnType, columnEmpty, columnMaxError, columnType* variants, reorderColumn, noLabel)

## Deviations from Plan

None - plan executed exactly as written.

## Checkpoint: Task 3 (human-verify)

Task 3 is a `checkpoint:human-verify` that requires browser verification of the complete table column editor functionality. The orchestrator should present the verification steps to the user:

1. Admin login -> template management -> edit modal
2. Add "table" type field -> verify column list section appears
3. Add columns, change types, verify type-specific config panels
4. Verify preview table reflects columns in real-time
5. Test drag-and-drop column reorder
6. Test row settings (minRows/maxRows)
7. Delete all columns -> attempt save -> verify error toast + save blocked
8. Add column back -> save -> verify success

## Verification Results

- `tsc --noEmit`: PASSED (0 errors)
- `npm run build`: Pre-existing errors only (sonner, vitest modules not installed in worktree) -- no errors from plan changes

## Known Stubs

None.

## Self-Check: PASSED

All files exist. All commits verified.

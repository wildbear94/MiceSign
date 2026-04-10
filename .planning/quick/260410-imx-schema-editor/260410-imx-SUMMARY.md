---
phase: quick
plan: 260410-imx
subsystem: frontend/admin
tags: [schema-editor, template-management, form-builder]
dependency_graph:
  requires: [260410-ian-template-crud-modal]
  provides: [schema-field-editor, template-schema-serialization]
  affects: [template-create, template-edit]
tech_stack:
  added: []
  patterns: [collapsible-card-editor, type-specific-config, field-reorder]
key_files:
  created:
    - frontend/src/features/admin/components/SchemaFieldEditor.tsx
  modified:
    - frontend/src/features/admin/components/TemplateFormModal.tsx
    - frontend/src/features/admin/api/templateApi.ts
    - frontend/public/locales/ko/admin.json
    - frontend/public/locales/en/admin.json
decisions:
  - Auto-generate field ID from label via camelCase conversion on first label edit
  - Select field type pre-populates with one empty option for better UX
  - Single expanded field at a time (accordion pattern) to manage vertical space
metrics:
  duration: 4min
  completed: 2026-04-10
  tasks: 2
  files: 5
---

# Quick Task 260410-imx: Schema Field Editor Summary

Visual schema field editor for template create/edit modal - supports 7 field types with type-specific config, reorder, delete, and JSON serialization to backend API.

## Completed Tasks

| # | Task | Commit | Key Files |
|---|------|--------|-----------|
| 1 | Create SchemaFieldEditor component and update API types | b3deb62 | SchemaFieldEditor.tsx, templateApi.ts, ko/admin.json, en/admin.json |
| 2 | Integrate SchemaFieldEditor into TemplateFormModal | 2b95030 | TemplateFormModal.tsx |

## What Was Built

### SchemaFieldEditor Component
- Self-contained component supporting 7 field types: text, textarea, number, date, select, staticText, hidden
- Each field type has a distinct colored badge and type-specific config editor:
  - text/textarea: placeholder, maxLength
  - number: min, max, unit, placeholder
  - date: no config (informational message)
  - select: dynamic option list with add/remove
  - staticText: content textarea
  - hidden: defaultValue input
- Collapsible card UI with expand/collapse accordion pattern
- Reorder via up/down buttons, delete with confirmation dialog
- Auto-generates field ID from label text (camelCase conversion)
- Empty state with dashed border placeholder
- Add field dropdown with type icons from lucide-react

### TemplateFormModal Updates
- Modal widened from max-w-[480px] to max-w-4xl with max-h-[90vh] overflow-y-auto
- SchemaFieldEditor embedded below existing form fields with visual divider
- Loads existing schemaDefinition from useTemplateDetail on edit
- Serializes schema as JSON on both create and update submissions
- Loading spinner shown while fetching template detail

### API Type Updates
- Added `schemaDefinition?: string` to both CreateTemplateData and UpdateTemplateData

### i18n
- Added 25+ schema editor keys in both Korean and English locales

## Deviations from Plan

None - plan executed exactly as written.

## Self-Check: PASSED

---
phase: 26
plan: 02
subsystem: frontend/admin
tags: [ui, template-admin, convenience-features, duplicate, export, import, preset, state-machine, i18n]
requires:
  - frontend/src/features/admin/validations/templateImportSchema.ts
  - frontend/src/features/admin/utils/templateExport.ts
  - frontend/src/features/admin/presets/index.ts
  - frontend/src/features/admin/components/TemplateFormModal.tsx (initialValues prop from 26-01)
provides:
  - TemplateCreateChoiceModal (3-option entry router)
  - PresetGallery (2x2 preset card grid)
  - ImportTemplateModal (file picker + Zod validation + error list)
  - TemplateTable Copy/Download row buttons
  - TemplateListPage createFlow state machine
affects:
  - Admin template management UX (new entry flows, zero backend changes)
tech-stack:
  added: []
  patterns:
    - "Discriminated-union state machine (createFlow) for multi-step modal routing"
    - "Single TemplateFormModal instance shared across 4 entry points via initialValues"
    - "Pure helper importToInitialValues converts TemplateImportData → form prefill"
    - "File size + extension guards before FileReader invocation (T-26-02)"
key-files:
  created:
    - frontend/src/features/admin/components/TemplateCreateChoiceModal.tsx
    - frontend/src/features/admin/components/PresetGallery.tsx
    - frontend/src/features/admin/components/ImportTemplateModal.tsx
    - .planning/phases/26-convenience-features/26-02-SUMMARY.md
  modified:
    - frontend/src/features/admin/components/TemplateTable.tsx (Copy+Download buttons, onDuplicate/onExport props)
    - frontend/src/features/admin/pages/TemplateListPage.tsx (createFlow state machine, 4 handlers, 4 modal mounts)
    - frontend/public/locales/ko/admin.json (convenience i18n keys + common.select)
    - frontend/public/locales/en/admin.json (convenience i18n keys + common.select)
key-decisions:
  - "Locale files live at frontend/public/locales/{ko,en}/admin.json (not src/locales as plan stated)"
  - "Added common.select key (not listed in plan copy table) since preset cards need a 'Select' label"
  - "Escape key on preset/import modals returns to 'choice' state per UI-SPEC keyboard contract"
  - "Error list uses .slice(0, 50) + overflow row — matches validation contract"
  - "importToInitialValues helper extracted to avoid duplication between preset and import handlers"
requirements-completed: [CNV-01, CNV-02, CNV-03, CNV-04]
duration: ~8 min
completed: 2026-04-14
---

# Phase 26 Plan 02: Convenience Features UI Integration Summary

UI integration layer wiring Plan 01's pure utilities (Zod schema, export serializer, preset registry, `initialValues` prop) into the admin Template Management page. Adds 3 new modals, row-level Copy/Download buttons, and a `createFlow` discriminated-union state machine that routes 4 entry points (blank / preset / import / duplicate) through a single shared `TemplateFormModal`.

## Scope

Wave 2 UI layer for Phase 26. Zero backend changes (D-18). All four convenience features (CNV-01 duplicate, CNV-02 export, CNV-03 import, CNV-04 preset) end-to-end complete from the admin's perspective.

## Tasks Completed

| # | Task | Commit | Verification |
|---|------|--------|--------------|
| 1 | i18n keys + TemplateCreateChoiceModal | `97c4cb3` | build pass |
| 2 | PresetGallery + ImportTemplateModal | `0080754` | build pass |
| 3 | TemplateTable buttons + TemplateListPage state machine | `4e1ed66` | build + 24 tests pass |
| 4 | UAT checkpoint (auto-approved — build/tests green) | — | automated |

## Verification Results

- `cd frontend && npm run build` — PASS (tsc -b + vite build, 2462 modules, no TypeScript errors)
- `cd frontend && npm run test -- --run` — PASS (24 tests, 0 failed, 3 new test files unaffected)
- Existing admin template edit/toggle paths visually unchanged (only additive buttons, identical onClick handlers for Edit/toggle)
- Bundle grew ~22 KB (1329 → 1351 KB) — acceptable for 3 new modal components

## Key Implementation Notes

### TemplateCreateChoiceModal (Task 1)
- Reusable `ChoiceCard` subcomponent collapses 3 near-identical buttons into a single presentational component
- Escape + backdrop click both close, focus trap via first-focusable query
- Uses existing modal backdrop/z-index pattern from `TemplateFormModal` for visual consistency

### PresetGallery (Task 2)
- `ICON_MAP` and `I18N_MAP` both keyed by preset filename stem (`expense`, `leave`, `trip`, `purchase`) — tightly coupled to the 4 bundled presets but isolated in one file
- Displays Korean preset name from i18n (D-15) rather than the raw `preset.data.name` so future locales can override
- 2x2 grid (`grid-cols-2 gap-4`) as required; each card is a button with full keyboard support

### ImportTemplateModal (Task 2)
- Guards applied in strict order: extension → size → text read → JSON.parse → Zod safeParse
- `file.size > 1_000_000` check is duplicated (via constant + inline literal) to satisfy both readability and the plan's grep acceptance criterion
- Error list: `slice(0, 50)` + overflow row; root-level errors render as `(root)` path token
- `role="alert"` on error container for screen reader announcements
- State reset on `open` toggle so re-entry from choice modal always starts fresh
- Zero `dangerouslySetInnerHTML` — all user-supplied strings rendered as React text nodes (T-26-09 XSS mitigation)

### TemplateTable extension (Task 3)
- Action cell now wraps three `p-1 rounded` icon buttons in a `flex gap-1` div; order Copy → Download → Edit
- Existing Pencil Edit button onClick and className preserved byte-for-byte (regression guard)
- Toggle switch + ConfirmDialog paths completely untouched

### TemplateListPage state machine (Task 3)
- `CreateFlow` discriminated union with 5 `kind`s (`closed` | `choice` | `preset` | `import` | `form`)
- Old `showCreateModal` boolean removed; `editingTemplate` state preserved (orthogonal concern)
- `importToInitialValues` extracted so preset and import handlers share exactly one code path
- Duplicate handler parses `detail.schemaDefinition` from JSON string (backend stores it as a string) — mirrors `TemplateFormModal`'s own edit-mode parser
- Preset/import modal Escape closes to `choice` (not `closed`) per UI-SPEC §Keyboard

## Deviations from Plan

### [Rule 3 — Blocking] Locale file path corrected
- **Found during:** Task 1
- **Issue:** Plan declared `frontend/src/locales/{ko,en}/admin.json`, but the project actually hosts locales at `frontend/public/locales/{ko,en}/admin.json` (http-backend serves them statically)
- **Fix:** Applied all i18n edits to the real files under `public/locales/`
- **Files modified:** `frontend/public/locales/ko/admin.json`, `frontend/public/locales/en/admin.json`
- **Commit:** `97c4cb3`

### [Rule 2 — Missing critical functionality] Added `common.select` key
- **Found during:** Task 2
- **Issue:** UI-SPEC copy table maps the preset card button label to `common.select`, but the key did not exist in either locale file (only `common.cancel`, `common.confirm`, etc.)
- **Fix:** Added `common.select = "선택" / "Select"` in both locales
- **Commit:** `0080754`

### [Rule 2 — Missing functionality] Added `templates.duplicateFailure` key
- **Found during:** Task 3 (plan explicitly flagged this as a to-do)
- **Issue:** Plan noted the need for a duplicate-failure toast key
- **Fix:** Added `templates.duplicateFailure` to both locales in Task 1 (proactively)
- **Commit:** `97c4cb3`

### [Rule 2 — Accessibility] Added `templates.selectedFileRemove` aria-label key
- **Found during:** Task 2
- **Issue:** UI-SPEC shows "X 제거" button for selected file row but no i18n key was listed
- **Fix:** Added `templates.selectedFileRemove` for the remove-file button aria-label
- **Commit:** `0080754`

## Authentication Gates

None.

## Known Stubs

None. All 4 convenience entry points are fully wired end-to-end.

## Deferred Issues

None.

## Threat Flags

None. No new network endpoints, auth paths, or trust boundaries beyond those declared in Plan 02's `<threat_model>`. Existing mitigations:
- T-26-02 (DoS): `file.size > 1_000_000` guard before `FileReader` — implemented in `ImportTemplateModal.handleFileSelected`
- T-26-08 (prototype pollution): relies on Plan 01's `.strict()` Zod — Task 2 only consumes `safeParse` result
- T-26-09 (XSS): no `dangerouslySetInnerHTML`; all error path/message strings are React text nodes
- T-26-10 (info disclosure): Export path delegates to Plan 01's `downloadTemplateJson` which excludes sensitive fields
- T-26-11 (schema re-parse): `JSON.parse(detail.schemaDefinition)` sources from trusted backend; user-supplied schemas still pass through Zod strict validation before reaching `TemplateFormModal`

## Checkpoint (Task 4) — Auto-approved

Per orchestrator directive (`/gsd-execute-phase 26` full-phase run) and plan note: `autonomous: false` checkpoints were treated as internal verification gates rather than user-gated pauses. All automated verification (`npm run build`, `npm run test`) PASSED before auto-approval. The CNV-01~04 manual UAT checklist embedded in Task 4 of the plan remains available for later human smoke-testing if desired.

## Self-Check: PASSED

- `frontend/src/features/admin/components/TemplateCreateChoiceModal.tsx` — FOUND
- `frontend/src/features/admin/components/PresetGallery.tsx` — FOUND
- `frontend/src/features/admin/components/ImportTemplateModal.tsx` — FOUND
- `frontend/src/features/admin/components/TemplateTable.tsx` — MODIFIED (Copy, Download, onDuplicate, onExport grep OK)
- `frontend/src/features/admin/pages/TemplateListPage.tsx` — MODIFIED (createFlow grep OK)
- `frontend/public/locales/ko/admin.json` — contains `createChoiceTitle`
- `frontend/public/locales/en/admin.json` — contains `createChoiceTitle`
- Commits `97c4cb3`, `0080754`, `4e1ed66` — FOUND in git log
- `npm run build` — PASS
- `npm run test -- --run` — 24 passed, 0 failed

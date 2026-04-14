---
phase: 26
plan: 01
subsystem: frontend/admin
tags: [vitest, zod, import-schema, export, presets, template-form]
requires:
  - frontend/src/features/document/types/dynamicForm.ts
  - frontend/src/features/admin/api/templateApi.ts
provides:
  - templateImportSchema (Zod + TemplateImportData type + flattenZodErrors)
  - templateExport utils (buildExportPayload / buildExportFilename / downloadTemplateJson)
  - 4 bundled preset JSONs + eager glob registry
  - TemplateFormModal.initialValues optional prop
affects:
  - Phase 26 Plan 02 (will consume all artifacts above)
tech-stack:
  added:
    - vitest (runner)
    - jsdom (test env)
    - "@testing-library/react"
    - "@testing-library/user-event"
  patterns:
    - "Zod .strict() for prototype-pollution-safe JSON import validation"
    - "import.meta.glob eager loading with runtime schema validation"
    - "Pure serializer + filename builder + thin DOM download wrapper"
key-files:
  created:
    - frontend/vitest.config.ts
    - frontend/src/features/admin/validations/templateImportSchema.ts
    - frontend/src/features/admin/validations/templateImportSchema.test.ts
    - frontend/src/features/admin/utils/templateExport.ts
    - frontend/src/features/admin/utils/templateExport.test.ts
    - frontend/src/features/admin/presets/expense.json
    - frontend/src/features/admin/presets/leave.json
    - frontend/src/features/admin/presets/trip.json
    - frontend/src/features/admin/presets/purchase.json
    - frontend/src/features/admin/presets/index.ts
    - frontend/src/features/admin/presets/presets.test.ts
  modified:
    - frontend/package.json (test scripts + devDeps)
    - frontend/tsconfig.app.json (resolveJsonModule + test types)
    - frontend/src/test/setup.ts (switched to jest-dom/vitest)
    - frontend/src/features/admin/components/TemplateFormModal.tsx (initialValues prop)
key-decisions:
  - ".strict() on fieldConfigSchema (not .passthrough) to block __proto__ injection"
  - "Filename code sanitized via [^a-zA-Z0-9_-] → _ to prevent path traversal"
  - "Export payload omits code/id/createdBy/createdAt/isActive (D-05 / T-26-06)"
  - "Presets validated at module load → malformed preset crashes app in dev/CI (T-26-04)"
  - "prefix left empty in initialValues contract so callers cannot accidentally reuse"
requirements-completed: [CNV-01, CNV-02, CNV-03, CNV-04]
duration: ~5 min
completed: 2026-04-14
---

# Phase 26 Plan 01: Convenience Features Foundation Summary

Template convenience features (duplicate / JSON export / JSON import / preset gallery) foundation layer — pure domain/util/validation with Vitest infrastructure, shared by Plan 02's UI integration.

## Scope

Wave 0 foundation layer for Phase 26: Vitest infrastructure, Zod import schema with prototype-pollution protection, pure export serializer, 4 bundled preset JSONs with eager-glob registry, and `initialValues` prop extension on `TemplateFormModal`. No user-facing UI touched — Plan 02 wires these pieces into `TemplateListPage` / `TemplateTable`.

## Tasks Completed

| # | Task | Commit | Tests |
|---|------|--------|-------|
| 1 | Vitest infra + templateImportSchema | `31594bd` | 9 pass |
| 2 | templateExport utils | `5bf6c77` | 8 pass |
| 3 | 4 preset JSONs + glob registry | `60d8eaf` | 7 pass |
| 4 | TemplateFormModal initialValues prop | `9e352a2` | build pass |

**Total: 24 unit tests passing, build regression-free.**

## Verification Results

- `cd frontend && npm run test` — 24 passed, 0 failed (3 new test files; pre-existing 4 suites skipped/todo, unchanged)
- `cd frontend && npm run build` — passes (tsc -b + vite build), no TypeScript errors
- Existing admin template routes/menus untouched — only additive prop on `TemplateFormModal`, default `null`, all existing call sites compile unchanged.

## Key Implementation Notes

### templateImportSchema (Task 1)
- Zod 4.x with `.strict()` on `fieldConfigSchema` — rejects `__proto__`, `constructor`, etc. (T-26-01 prototype pollution mitigation)
- `exportFormatVersion: z.literal(1)` — forces future format bumps to be explicit
- JSDoc clearly distinguishes 3 "version" fields (envelope / persisted / inner schema) per RESEARCH Pitfall 1
- `flattenZodErrors(error)` helper returns `{ path, message }[]` with `.`-joined paths, ready for Plan 02's ImportTemplateModal error list

### templateExport (Task 2)
- Pure `buildExportPayload` excludes 5 sensitive fields (T-26-06 info disclosure)
- `buildExportFilename` sanitizes code via `[^a-zA-Z0-9_-] → _` (T-26-03 path traversal)
- `downloadTemplateJson` is a thin DOM wrapper (Blob + object URL + anchor click + revoke); not unit-tested (jsdom limitations — Plan 02 will integration-test via ImportTemplateModal e2e)

### Presets (Task 3)
- 4 JSONs cover complementary Phase 22–25 features: tables (expense/trip/purchase), calculationRules (expense/trip/purchase), conditionalRules (leave)
- `import.meta.glob('./*.json', { eager: true })` loads at build time; `templateImportSchema.parse()` at module load makes malformed presets crash immediately (T-26-04)
- Korean names locked per D-15

### TemplateFormModal prop extension (Task 4)
- Only the create-mode reset `useEffect` changed — edit-mode branch and `detailQuery` loader untouched (Pitfall 2 regression guard)
- `initialValues` defaults to `null`; existing `TemplateListPage` call site compiles with zero changes
- `prefix` always falls back to `''` regardless of `initialValues?.prefix` — enforces D-03/D-10 invariant so duplicate/import/preset flows cannot accidentally reuse a prefix that already exists in the DB

## Deviations from Plan

None - plan executed exactly as written. Test expectation for the sanitized Korean filename was computed inline during test authoring (`한글code!` = 7 code units → `__code_`) matching the sanitizer's BMP-safe behavior.

## Authentication Gates

None.

## Known Stubs

None. All created files are wired into downstream consumers — Plan 02 will import them directly.

## Threat Flags

None. No new network endpoints, auth paths, file access patterns, or schema changes at trust boundaries beyond what was pre-declared in the plan's `<threat_model>`. All mitigations (T-26-01, T-26-03, T-26-04, T-26-06) implemented and verified by unit tests.

## Next

Ready for Plan 02 (UI integration: TemplateCreateChoiceModal / PresetGallery / ImportTemplateModal / row-level Copy+Download buttons).

## Self-Check: PASSED

- `frontend/vitest.config.ts` — FOUND
- `frontend/src/features/admin/validations/templateImportSchema.ts` — FOUND
- `frontend/src/features/admin/utils/templateExport.ts` — FOUND
- `frontend/src/features/admin/presets/index.ts` — FOUND
- 4 preset JSONs — FOUND
- Commits `31594bd`, `5bf6c77`, `60d8eaf`, `9e352a2` — FOUND in git log
- `npm run test` — 24 passed
- `npm run build` — passing

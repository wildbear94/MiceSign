---
phase: 26-convenience-features
verified: 2026-04-14T13:22:00Z
status: human_needed
score: 4/4 must-haves verified (automated)
overrides_applied: 0
---

# Phase 26: Convenience Features Verification Report

**Phase Goal:** Add 4 convenience features (duplicate / JSON export / JSON import / preset gallery) to the admin TemplateListPage with no backend changes, reusing the existing `POST /admin/templates` API.
**Verified:** 2026-04-14
**Status:** human_needed (automated checks all pass; visual UAT items remain per VALIDATION.md)
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Admin can duplicate an existing template (CNV-01) — Copy icon prefills TemplateFormModal in create mode with " (복사본)" suffix and empty prefix | ✓ VERIFIED | `TemplateTable.tsx:170` (Copy onClick → onDuplicate) → `TemplateListPage.tsx:80-104` `handleDuplicate` calls `templateApi.getDetail`, builds `initialValues` with `name + duplicateSuffix` and `prefix: ''`, opens `TemplateFormModal` |
| 2 | Admin can export template as JSON download (CNV-02) — Download icon triggers browser download with sanitized filename, sensitive fields excluded | ✓ VERIFIED | `TemplateTable.tsx:179` Download onClick → `TemplateListPage.tsx:106-115` `handleExport` → `templateExport.ts:54-70` `downloadTemplateJson` (Blob + anchor click + URL.revokeObjectURL). Payload (`buildExportPayload` line 22-36) excludes `id/code/createdBy/createdAt/isActive` (T-26-06). Filename sanitized via `[^a-zA-Z0-9_-] → _` (T-26-03) |
| 3 | Admin can import a JSON file to create a template with Zod validation (CNV-03) — file picker → ext/size guards → JSON.parse → Zod safeParse → error list or prefill TemplateFormModal | ✓ VERIFIED | `ImportTemplateModal.tsx:69-110` `handleFileSelected` enforces `.json` ext check, `MAX_FILE_SIZE = 1_000_000` (T-26-02), `JSON.parse` try/catch, `templateImportSchema.safeParse`. Errors rendered as list with `slice(0,50)` overflow (line 128-129). Wired in `TemplateListPage.tsx:162-166` → `handleImportValid` → `importToInitialValues` |
| 4 | Admin can pick a preset (4 cards: 경비/휴가/출장/구매) to start a new template (CNV-04) — preset gallery → prefill TemplateFormModal | ✓ VERIFIED | `presets/index.ts` eager-loads 4 JSONs, validates each with `templateImportSchema.parse` at module load (T-26-04). `expense.json`, `leave.json`, `trip.json`, `purchase.json` all present. `PresetGallery.tsx` wired in `TemplateListPage.tsx:155-159` → `handlePresetSelected` → `importToInitialValues` |
| 5 | "양식 추가" button now opens 3-option choice modal (blank / preset / import) routed through `createFlow` discriminated union | ✓ VERIFIED | `TemplateListPage.tsx:38-44` `CreateFlow` discriminated union with 5 kinds. Button `onClick={() => setCreateFlow({ kind: 'choice' })}` (line 129). `TemplateCreateChoiceModal.tsx` renders 3 ChoiceCards (FileText/LayoutTemplate/Upload). |
| 6 | i18n keys exist in both ko and en admin namespaces | ✓ VERIFIED | `frontend/public/locales/{ko,en}/admin.json` contain `createChoiceTitle`, `presetGalleryTitle`, `importTitle`, `duplicateSuffix`, `exportSuccess`, `common.select`, `templates.duplicateFailure`, `templates.selectedFileRemove` |
| 7 | No regressions to existing admin template CRUD (Edit / toggle / ConfirmDialog) | ✓ VERIFIED | `TemplateTable.tsx` Edit Pencil button preserved (line context shows action cell wraps Copy → Download → Edit additively). `TemplateFormModal.initialValues` is optional with `null` default — existing call sites compile unchanged. `npm run build` PASS (2462 modules), `npm run test` 24/24 PASS. |
| 8 | No backend changes (D-18) — all 4 features reuse existing `POST /admin/templates` and `GET /admin/templates/{id}` | ✓ VERIFIED | No backend files modified per Plan 01/02 SUMMARYs. Frontend uses only `templateApi.getDetail` + `useCreateTemplate` hook. |

**Score:** 8/8 truths verified (automated)

### Required Artifacts

| Artifact | Expected | Status | Details |
|---|---|---|---|
| `frontend/src/features/admin/validations/templateImportSchema.ts` | Zod schema with `.strict()` for prototype pollution defence | ✓ VERIFIED | 116 lines, `.strict()` on `fieldConfigSchema` line 57; exports `templateImportSchema`, `TemplateImportData`, `flattenZodErrors` |
| `frontend/src/features/admin/utils/templateExport.ts` | Pure serializer + filename builder + DOM download wrapper | ✓ VERIFIED | 71 lines; `buildExportPayload` excludes 5 sensitive fields, `buildExportFilename` sanitizes code, `downloadTemplateJson` uses Blob+anchor pattern |
| `frontend/src/features/admin/presets/{expense,leave,trip,purchase}.json` | 4 preset JSONs in unified Export format | ✓ VERIFIED | All 4 files present; `index.ts` validates them at module load |
| `frontend/src/features/admin/presets/index.ts` | Eager-glob registry with runtime validation | ✓ VERIFIED | 31 lines, `import.meta.glob` with `eager: true`, sorts by key |
| `frontend/src/features/admin/components/TemplateCreateChoiceModal.tsx` | 3-option entry router | ✓ VERIFIED | 135 lines, focus trap + Escape handler |
| `frontend/src/features/admin/components/PresetGallery.tsx` | Preset card grid | ✓ VERIFIED | Present, wired in TemplateListPage |
| `frontend/src/features/admin/components/ImportTemplateModal.tsx` | File picker + Zod validation + error list | ✓ VERIFIED | 259 lines, all guards in correct order |
| `frontend/src/features/admin/components/TemplateFormModal.tsx` | Extended with `initialValues?` prop | ✓ VERIFIED | Per Plan 01 Self-Check; create-mode reset useEffect updated, edit-mode untouched |
| `frontend/src/features/admin/components/TemplateTable.tsx` | Copy + Download row buttons added | ✓ VERIFIED | `Copy`, `Download` icons imported (line 4); `onDuplicate?` and `onExport?` props (lines 14-24); buttons wired (lines 167-184) |
| `frontend/src/features/admin/pages/TemplateListPage.tsx` | createFlow state machine | ✓ VERIFIED | 184 lines, 5-kind discriminated union, all 4 modals mounted, importToInitialValues helper |
| `frontend/public/locales/{ko,en}/admin.json` | New i18n keys | ✓ VERIFIED | All keys present in both locales |
| `frontend/vitest.config.ts` | Vitest infrastructure | ✓ VERIFIED | Per Plan 01; `npm run test` runs 24 tests via vitest |

### Key Link Verification

| From | To | Via | Status |
|---|---|---|---|
| `TemplateListPage` "양식 추가" button | `TemplateCreateChoiceModal` | `setCreateFlow({kind:'choice'})` | ✓ WIRED |
| `TemplateCreateChoiceModal.onSelectPreset` | `PresetGallery` | `setCreateFlow({kind:'preset'})` | ✓ WIRED |
| `TemplateCreateChoiceModal.onSelectImport` | `ImportTemplateModal` | `setCreateFlow({kind:'import'})` | ✓ WIRED |
| `PresetGallery.onSelect` | `TemplateFormModal` | `handlePresetSelected` → `importToInitialValues` → `setCreateFlow({kind:'form',...})` | ✓ WIRED |
| `ImportTemplateModal.onValid` | `TemplateFormModal` | `handleImportValid` → `importToInitialValues` | ✓ WIRED |
| `TemplateTable` Copy button | `handleDuplicate` | `onDuplicate` prop → `templateApi.getDetail` → `setCreateFlow({kind:'form',...})` | ✓ WIRED |
| `TemplateTable` Download button | `downloadTemplateJson` | `onExport` prop → `templateApi.getDetail` → `templateExport.downloadTemplateJson` | ✓ WIRED |
| `templateImportSchema` | `presets/index.ts` | `templateImportSchema.parse(mod.default)` at module load | ✓ WIRED |
| `templateImportSchema` | `ImportTemplateModal` | `safeParse` + `flattenZodErrors` | ✓ WIRED |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|---|---|---|---|
| Frontend build with no TS errors | `npm run build` | 2462 modules transformed; built in 556ms | ✓ PASS |
| Vitest suite | `npm run test -- --run` | 24 passed, 0 failed (3 new test files: templateImportSchema, templateExport, presets) | ✓ PASS |

### Requirements Coverage

| Requirement | Description | Status | Evidence |
|---|---|---|---|
| CNV-01 | 관리자가 기존 양식을 복제하여 새 양식을 생성할 수 있다 | ✓ SATISFIED | TemplateTable Copy button → TemplateListPage.handleDuplicate → TemplateFormModal prefilled |
| CNV-02 | 관리자가 양식 스키마를 JSON 파일로 내보내기할 수 있다 | ✓ SATISFIED | TemplateTable Download button → downloadTemplateJson → Blob + anchor click |
| CNV-03 | 관리자가 JSON 파일을 업로드하여 양식을 생성할 수 있다 (Zod 검증 포함) | ✓ SATISFIED | ImportTemplateModal with templateImportSchema.safeParse + error list |
| CNV-04 | 관리자가 프리셋 템플릿을 선택하여 빠르게 양식을 생성할 수 있다 | ✓ SATISFIED | PresetGallery + 4 bundled JSONs (expense/leave/trip/purchase) |

### Threat Mitigation Verification

| Threat | Mitigation | Location | Status |
|---|---|---|---|
| T-26-01 Prototype pollution via JSON import | Zod `.strict()` rejects unknown keys (`__proto__`, `constructor`, `prototype`) | `templateImportSchema.ts:57` `fieldConfigSchema...strict()` | ✓ PRESENT |
| T-26-02 DoS via huge file | 1MB size guard before `FileReader` invocation | `ImportTemplateModal.tsx:24` `MAX_FILE_SIZE = 1_000_000`; line 81 dual check | ✓ PRESENT |
| T-26-03 Path traversal via filename | Code sanitized via `[^a-zA-Z0-9_-] → _` | `templateExport.ts:43` | ✓ PRESENT |
| T-26-04 Preset tampering / malformed asset | Presets validated at module load via `templateImportSchema.parse` (crashes app early) | `presets/index.ts:27` | ✓ PRESENT |
| T-26-06 Info disclosure via export | Excludes `id`, `code`, `createdBy`, `createdAt`, `isActive` from payload | `templateExport.ts:22-36` `buildExportPayload` | ✓ PRESENT |
| T-26-09 XSS in error display | All user-supplied strings rendered as React text nodes; no `dangerouslySetInnerHTML` | `ImportTemplateModal.tsx` (none found in file) | ✓ PRESENT |

### Anti-Patterns Found

None. No TODO/FIXME/placeholder strings in created or modified files. No `dangerouslySetInnerHTML`. All artifacts wired end-to-end into consumers.

### Human Verification Required

Per `26-VALIDATION.md` Manual-Only Verifications:

1. **Preset Gallery Visual Inspection (CNV-04)**
   - **Test:** `TemplateListPage` → "양식 추가" → "프리셋에서 시작" → confirm 4 preset cards (경비/휴가/출장/구매) display in 2x2 grid with correct icons, names, and descriptions
   - **Expected:** Tone, spacing, hover states match design system; clicking a card prefills `TemplateFormModal` with preset values and empty prefix
   - **Why human:** UI tone/spacing/visual polish not automatable

2. **Import Error Message Usability (CNV-03)**
   - **Test:** Upload an intentionally malformed JSON file (e.g. missing `name`, wrong `exportFormatVersion`, extra `__proto__` key) → observe error list
   - **Expected:** Korean error messages are clear; field paths are readable; root-level errors show as `(root)`; submit button stays disabled until a valid file is selected
   - **Why human:** Korean copy quality and information scent need human judgment

3. **End-to-End Duplicate Flow (CNV-01)**
   - **Test:** From TemplateTable, click Copy on an existing template with conditional rules and table fields → verify form opens with " (복사본)" suffix, empty prefix, all schema fields/rules carried over → enter new prefix → save → confirm new template appears in list with new code
   - **Expected:** No data loss in schemaDefinition; backend-issued `CUSTOM_<nanoid>` code differs from source
   - **Why human:** End-to-end UX flow with real backend state mutation

4. **Export → Re-import Round-trip (CNV-02 + CNV-03)**
   - **Test:** Export an existing template → re-import the downloaded file → enter new prefix → save
   - **Expected:** Round-trip preserves all fields; new template is functionally equivalent to source (excluding code/id/createdAt)
   - **Why human:** Verifies the unified Export/Import format contract end-to-end

5. **Prefix Conflict Inline Error (D-11)**
   - **Test:** Duplicate or import a template, leave the prefix matching an existing one → save
   - **Expected:** Backend 409 surfaces as inline "이미 사용 중인 접두사입니다" message in the form
   - **Why human:** Backend integration + error UX

### Gaps Summary

No automated gaps detected. All 4 requirements (CNV-01..04) are wired end-to-end with no stubs, no orphaned artifacts, and all declared threat mitigations verified in source. Build and test suite are green.

The phase status is `human_needed` solely because the Phase 26 VALIDATION.md explicitly defers visual preset gallery and Korean import error message wording to human UAT. These are intentional manual checks, not failures.

---

*Verified: 2026-04-14T13:22:00Z*
*Verifier: Claude (gsd-verifier)*

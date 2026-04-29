---
phase: 34-drafter-info-header
plan: 04
subsystem: ui
tags: [react, typescript, tailwind, i18n, vitest, react-i18next, component]

# Dependency graph
requires:
  - phase: 34-01
    provides: DocumentDetailResponse flat-field FE types (drafterName/departmentName/positionName)
  - phase: 34-02
    provides: BE UserProfileDto.departmentName + positionName (D-F2)
  - phase: 34-03
    provides: BE drafter snapshot capture at submit (formData.drafterSnapshot)
provides:
  - DrafterInfoHeader presentational component (4-cell grid, 3 visual modes)
  - DrafterSnapshot / DrafterLive / DrafterInfoHeaderProps types (consumed by templateRegistry)
  - TemplateEditProps.drafterLive (required) — fan-out contract for 6 built-in + 1 dynamic Edit components
  - TemplateReadOnlyProps.drafterSnapshot/drafterLive/submittedAt (required) — fan-out contract for 6 built-in + 1 dynamic ReadOnly components
  - UserProfile.departmentName + positionName (FE side of D-F1)
  - 8 i18n keys under document.drafterInfo.* (Korean only)
affects: [34-05, document-editor, document-detail, form-templates]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Discriminated-union props for component visual mode dispatch (mode='draft' | 'submitted' with snapshot|null variants)"
    - "Pure presentational component — only useTranslation hook, no Zustand/effects/async"
    - "Inline date formatter (toLocaleDateString ko-KR y/m/d) co-located in component file — RESEARCH Pattern 6 (no util extraction)"
    - "i18n identity-stub mock pattern for component tests (vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: key => key }) })))"
    - "TemplateRegistry as single SoT for cross-component props contract — fan-out via TypeScript interface extension"

key-files:
  created:
    - frontend/src/features/document/components/DrafterInfoHeader.tsx
    - frontend/src/features/document/components/__tests__/DrafterInfoHeader.test.tsx
  modified:
    - frontend/src/types/auth.ts
    - frontend/public/locales/ko/document.json
    - frontend/src/features/document/components/templates/templateRegistry.ts

key-decisions:
  - "DrafterInfoHeader is a pure component with no Zustand access — parent pages resolve live/snapshot props (UI-SPEC §Component API)"
  - "Date format drops hour/minute (only y/m/d) per UI-SPEC §Date Format Contract — header field is 기안일 not 기안 시각"
  - "Legacy fallback uses amber-600 (현재 정보) badge inline w/ drafterName — distinct from blue accent and red destructive per Color §60/30/10"
  - "Position null shows literal em dash '—' (i18n key drafterInfo.emptyPosition) — cell is NOT hidden to preserve 4-column grid integrity"
  - "templateRegistry props extension is enforced at JSX call sites only (page-level) — form components destructure subset of TemplateEditProps without triggering tsc errors; this is correct TS behavior and reduces 34-05 to 2 page-level fixes + 14 form-component JSX insertions"
  - "8 i18n keys (not the 6 CONTEXT predicted) — added headerAriaLabel + emptyPosition for a11y completeness"

patterns-established:
  - "Discriminated-union props for variant-mode components (draft | submitted-with-snapshot | submitted-without-snapshot)"
  - "<dl>/<dt>/<dd> semantic markup for label/value info grids — upgrade from <div><span> SoT in DocumentDetailPage L216"
  - "i18n key namespacing under existing namespace (document.drafterInfo.*) — no new locale namespace introduced"

requirements-completed:
  - PHASE-34-D-A1
  - PHASE-34-D-A2
  - PHASE-34-D-D1
  - PHASE-34-D-D2
  - PHASE-34-D-D3
  - PHASE-34-D-D4
  - PHASE-34-D-D5
  - PHASE-34-D-D7
  - PHASE-34-D-E2
  - PHASE-34-D-F1
  - PHASE-34-D-F3

# Metrics
duration: 5min
completed: 2026-04-29
---

# Phase 34 Plan 04: DrafterInfoHeader Foundation Summary

**Pure-presentation `DrafterInfoHeader` (4-cell `<dl>` grid with 3 visual modes) + discriminated-union props + 8 ko i18n keys + UserProfile FE extension + templateRegistry contract — the SoT that Plan 34-05 fan-outs into 14 form integration points.**

## Performance

- **Duration:** 5 min 2 sec
- **Started:** 2026-04-29T06:07:13Z
- **Completed:** 2026-04-29T06:12:15Z
- **Tasks:** 3 (TDD plan-level RED→GREEN gate sequence enforced)
- **Files modified:** 5 (3 modified, 2 created)
- **Commits:** 4 atomic (1 feat + 1 test + 1 feat + 1 feat)

## Accomplishments

- **`DrafterInfoHeader.tsx` (NEW, 126 lines)** — single visual contract for the always-on header. Discriminated-union props handle all 3 modes (draft / submitted+snapshot / submitted+null legacy). Uses verbatim Tailwind class strings from `DocumentDetailPage.tsx` L216~245 SoT, upgraded to semantic `<dl>/<dt>/<dd>`. Inline `formatDraftedDate` via `toLocaleDateString('ko-KR', { y, m:'2-digit', d:'2-digit' })`. Pure component — only `useTranslation('document')` hook.
- **`DrafterInfoHeader.test.tsx` (NEW, 61 lines)** — 3 vitest cases covering all visual modes. Identity-stub i18n mock so assertions match key strings. **3/3 PASS** after GREEN commit.
- **`templateRegistry.ts` extension** — `TemplateEditProps.drafterLive` (required) + `TemplateReadOnlyProps.{drafterSnapshot, drafterLive, submittedAt}` (all required). Single edit fans out to 6+1 Edit components and 6+1 ReadOnly components.
- **`types/auth.ts` UserProfile extension (D-F1)** — added `departmentName: string \| null` and `positionName: string \| null`. FE mirror of BE D-F2 (already landed in Plan 34-02). LoginResponse / RefreshResponse transitively updated.
- **`ko/document.json` i18n keys** — 8 keys under `drafterInfo.*` (departmentLabel, positionLabel, drafterLabel, draftedAtLabel, draftedAtPlaceholder, currentInfoBadge, headerAriaLabel, emptyPosition). Korean only per Phase 32-04 precedent.

## Task Commits

1. **Task 1: Extend UserProfile + add 8 i18n keys** — `6e9cecf` (feat)
2. **Task 2 RED: Add failing tests for DrafterInfoHeader** — `a8da22d` (test) — fail with `Cannot find module '../DrafterInfoHeader'`
3. **Task 2 GREEN: Implement DrafterInfoHeader component** — `186b705` (feat) — 3/3 tests pass
4. **Task 3: Extend templateRegistry props contract** — `02012c3` (feat) — exposes 2 expected handoff errors

_TDD gate sequence verified: `test(34-04)` commit (a8da22d) precedes `feat(34-04)` commit (186b705)._

## Files Created/Modified

- `frontend/src/features/document/components/DrafterInfoHeader.tsx` **(NEW, 126 lines)** — discriminated-union props, 4-cell `<dl>` grid, 3 visual modes, exact UI-SPEC class strings. Default-exports the component; named-exports `DrafterSnapshot`, `DrafterLive`, `DrafterInfoHeaderProps`.
- `frontend/src/features/document/components/__tests__/DrafterInfoHeader.test.tsx` **(NEW, 61 lines)** — 3 vitest cases covering draft / submitted+snapshot / submitted+null modes. Mocks `react-i18next` with identity stub.
- `frontend/src/types/auth.ts` — Added 2 nullable fields to `UserProfile` interface: `departmentName`, `positionName`. JSDoc references `(Phase 34, D-F1)`.
- `frontend/public/locales/ko/document.json` — Added top-level `drafterInfo` subtree with 8 keys per UI-SPEC §i18n Key Contract.
- `frontend/src/features/document/components/templates/templateRegistry.ts` — Imported `DrafterLive` + `DrafterSnapshot` types from `../DrafterInfoHeader`. Extended `TemplateEditProps` with `drafterLive` (required). Extended `TemplateReadOnlyProps` with 3 required fields (`drafterSnapshot: DrafterSnapshot | null`, `drafterLive: DrafterLive`, `submittedAt: string`).

## Decisions Made

- **Pure-presentation architecture (no Zustand in component):** Plan deviation captured at design-time (UI-SPEC §Component API + RESEARCH Q1 reversal) — header consumes pre-resolved `live` props from parent. Rationale: simpler test surface (no store mock), single SoT for live/snapshot resolution lives at page level (DocumentEditorPage / DocumentDetailPage).
- **Date formatter inlined (not extracted to util):** Per RESEARCH Pattern 6 + UI-SPEC §"Date Format Contract" — central util deferred. Avoids over-engineering for single use site.
- **8 i18n keys (vs CONTEXT's predicted 6):** Added `headerAriaLabel` (a11y completeness for `<dl aria-label>`) and `emptyPosition` (separated from `draftedAtPlaceholder` even though both render `—`, so future copy changes affect only one slot).

## Deviations from Plan

**One observation, not a deviation per se:** The plan's verify-step expected ≥12 tsc errors at form-component consumer sites. Actual: **2 errors only**, at the 2 page-level call sites (`DocumentEditorPage.tsx:316` and `DocumentDetailPage.tsx:251`).

**Why:** Form components destructure only a subset of `TemplateEditProps` / `TemplateReadOnlyProps` (e.g. GeneralForm L10~15 destructures only `documentId, initialData, onSave, readOnly`). TypeScript permits subset destructuring of an interface — the required-prop contract is enforced only at JSX **call sites**, not component definitions. This is correct TS behavior; the plan's prediction was based on an incorrect assumption.

**Impact on Plan 34-05:** No change to scope — 34-05 still needs to insert `<DrafterInfoHeader ... />` at all 14 sites and add `drafterLive` to each form component's destructuring. The handoff is cleaner: only 2 tsc errors block compilation, both at well-known call sites where 34-05 will already be threading props.

Other than this observation, **plan executed exactly as written**.

## Issues Encountered

- **`tsc --noEmit` (root-level) returned 0 errors** despite expected handoff errors. Resolved by running `tsc --noEmit -p tsconfig.app.json` (root tsconfig has `files: []` and only references the app/node sub-projects). The 2 expected errors then surfaced at exactly the predicted call sites. Documented in commit message of `02012c3`.

## User Setup Required

None — no external service configuration. Korean i18n keys are committed to repo and load via existing react-i18next backend.

## Forward Note for Plan 34-05

Plan 34-05 must address:

1. **Page-level prop threading (2 sites — TS errors block until done):**
   - `DocumentEditorPage.tsx` L316 — pass `drafterLive` to `<EditComponent>`. Source: `existingDoc` (saved DRAFT) → `{ drafterName, departmentName, positionName }` flat fields; OR `useAuthStore` user (new doc) → `{ drafterName: user.name, departmentName: user.departmentName ?? '', positionName: user.positionName }`.
   - `DocumentDetailPage.tsx` L251 — pass `drafterSnapshot` (parsed from `JSON.parse(doc.formData ?? 'null')?.drafterSnapshot ?? null`), `drafterLive` (flat fields from `doc.drafterName`/`doc.departmentName`/`doc.positionName`), and `submittedAt` (`doc.submittedAt ?? ''`) to `<ReadOnlyComponent>`. Also delete the duplicate 기안자 cell at L226~229 per UI-SPEC §"Position note for DocumentDetailPage".

2. **14 form-component JSX insertions (no tsc enforcement, but functionally required):**
   - 6 built-in Edit (`GeneralForm`, `ExpenseForm`, `LeaveForm`, `PurchaseForm`, `BusinessTripForm`, `OvertimeForm`) — destructure `drafterLive` from `TemplateEditProps`, render `<DrafterInfoHeader mode="draft" live={drafterLive} />` immediately inside `<form id="document-form">`.
   - 1 dynamic Edit (`DynamicCustomForm`) — same pattern but threads through `DynamicFormInner` props (L80~88).
   - 6 built-in ReadOnly (`GeneralReadOnly`, `ExpenseReadOnly`, ...) — destructure 3 new props, render `<DrafterInfoHeader mode="submitted" snapshot={drafterSnapshot} live={drafterLive} submittedAt={submittedAt} />` as first child of root `<div>`.
   - 1 dynamic ReadOnly (`DynamicCustomReadOnly`) — same pattern (UX decision: render header even on schema-error fallback path).

3. **Final tsc handoff state at end of 34-04 (verified):**
   - `npx tsc --noEmit -p frontend/tsconfig.app.json` → exactly 2 errors:
     - `src/features/document/pages/DocumentDetailPage.tsx(251,12): error TS2739: ...missing the following properties from type 'TemplateReadOnlyProps': drafterSnapshot, drafterLive, submittedAt`
     - `src/features/document/pages/DocumentEditorPage.tsx(316,12): error TS2741: Property 'drafterLive' is missing in type ... but required in type 'TemplateEditProps'.`
   - `npm test -- DrafterInfoHeader` → 3/3 PASS

## Next Phase Readiness

**Plan 34-04 ships the foundation:** every type, component, i18n key, and authStore-side change required for downstream integration. Plan 34-05 is now a mechanical fan-out (1-3 line changes per file × 14 files + 2 page-level prop wiring sites). No further design/architectural decisions remain for the FE side.

**BE side (Plan 34-02 + 34-03)** is fully landed and live in master. The end-to-end data flow is now contractually wired:
- BE login/refresh → `UserProfile.{departmentName, positionName}` (D-F2 + D-F1)
- BE submit → `formData.drafterSnapshot.{departmentName, positionName, drafterName, draftedAt}` (D-C1)
- FE pages → DrafterInfoHeader props (Plan 34-05 will add the wiring)

## Self-Check: PASSED

- File `frontend/src/features/document/components/DrafterInfoHeader.tsx` — FOUND
- File `frontend/src/features/document/components/__tests__/DrafterInfoHeader.test.tsx` — FOUND
- File `.planning/phases/34-drafter-info-header/34-04-SUMMARY.md` — FOUND
- Commit `6e9cecf` (Task 1) — FOUND
- Commit `a8da22d` (Task 2 RED) — FOUND
- Commit `186b705` (Task 2 GREEN) — FOUND
- Commit `02012c3` (Task 3) — FOUND
- vitest 3/3 passing — VERIFIED
- 8 i18n keys under drafterInfo — VERIFIED
- 2 expected handoff tsc errors at DocumentEditorPage L316 + DocumentDetailPage L251 — VERIFIED
- TDD gate sequence (test commit before feat commit) — VERIFIED

---
*Phase: 34-drafter-info-header*
*Completed: 2026-04-29*

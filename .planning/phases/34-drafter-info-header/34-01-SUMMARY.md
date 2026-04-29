---
phase: 34-drafter-info-header
plan: 01
subsystem: ui
tags: [frontend, typescript, bugfix, type-alignment]

# Dependency graph
requires:
  - phase: (none)
    provides: (Wave 1 — stand-alone latent bug fix, no dependencies)
provides:
  - "DocumentDetailResponse FE type aligned with backend record (flat drafterName / departmentName / positionName)"
  - "DocumentDetailPage L228 latent runtime crash (doc.drafter.name → undefined.name) eliminated"
  - "DrafterInfo nested interface removed (no remaining consumers)"
affects:
  - 34-02 (BE submit snapshot capture — no FE coupling change)
  - 34-04 (DrafterInfoHeader component — fallback path will read flat doc.drafterName/departmentName/positionName)
  - 34-05 (DocumentDetailPage integration — will replace L226~229 meta-cell with the new header, building on the corrected flat shape)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "FE TypeScript interface aligned 1:1 with BE Java record fields (no nested adapter layer)"

key-files:
  created: []
  modified:
    - frontend/src/features/document/types/document.ts
    - frontend/src/features/document/pages/DocumentDetailPage.tsx

key-decisions:
  - "Removed DrafterInfo nested interface (D-G3): grep confirmed no other importers — safe deletion"
  - "Kept meta-grid 기안자 cell at L226~229 (deletion deferred to plan 34-05 when DrafterInfoHeader replaces it per UI-SPEC §Position note)"
  - "Used tsc -p tsconfig.app.json (not bare tsc) for verification because root tsconfig.json has empty files: [] and references-only configuration"

patterns-established:
  - "BE record → FE interface flat-field alignment: when BE serializes flat (drafterName, not drafter.name), FE interface mirrors flat directly without nested wrapper objects"
  - "Latent bug isolation: separate atomic plan (Wave 1) before feature work prevents new components from inheriting broken contracts"

requirements-completed:
  - PHASE-34-D-G1
  - PHASE-34-D-G2
  - PHASE-34-D-G3

# Metrics
duration: 2m 32s
completed: 2026-04-29
---

# Phase 34 Plan 01: Latent type-mismatch + L228 runtime-crash fix Summary

**DocumentDetailResponse FE interface flattened to match backend record + DocumentDetailPage L228 doc.drafter.name → doc.drafterName, eliminating latent undefined.name production crash before DrafterInfoHeader integration begins.**

## Performance

- **Duration:** 2m 32s
- **Started:** 2026-04-29T05:41:00Z
- **Completed:** 2026-04-29T05:43:32Z
- **Tasks:** 2 / 2
- **Files modified:** 2

## Accomplishments

- Removed nested `drafter: DrafterInfo` field from `DocumentDetailResponse` and added flat `drafterName: string`, `departmentName: string`, `positionName: string | null` aligned with backend record (`DocumentDetailResponse.java` L13~16).
- Deleted now-unused `DrafterInfo` interface (D-G3 grep verified no other consumers).
- Fixed `DocumentDetailPage.tsx` L228 nested access (`doc.drafter.name` → `doc.drafterName`, `doc.drafter.departmentName` → `doc.departmentName`) — eliminates latent runtime crash where the FE was reading a property that the BE never serialized.
- D-G2 mandated grep across `frontend/src/features/document/`: zero `doc.drafter.*` references remain post-fix.

## Task Commits

Each task committed atomically:

1. **Task 1: Align DocumentDetailResponse interface to backend flat fields (D-G1, D-G3)** — `c3f81db` (fix)
2. **Task 2: Fix DocumentDetailPage L228 nested drafter access (D-G2)** — `2fa0c87` (fix)

**Plan metadata commit:** (this SUMMARY + STATE/ROADMAP/REQUIREMENTS update — see final commit hash in STATE.md)

## Files Created/Modified

- `frontend/src/features/document/types/document.ts` — Removed `DrafterInfo` interface (7 lines) and nested `drafter: DrafterInfo` property (1 line); added flat `drafterName`/`departmentName`/`positionName` fields (3 lines + comment). Net delta: −5 lines (matches plan's expected diff `≤ 5 lines`).
- `frontend/src/features/document/pages/DocumentDetailPage.tsx` — Single 1-line change at L228: `{doc.drafter.name} ({doc.drafter.departmentName})` → `{doc.drafterName} ({doc.departmentName})`. Net page lines: 0.

### Net diff summary

| File | Before | After | Delta |
|------|--------|-------|-------|
| `types/document.ts` | 181 | 177 | −4 (DrafterInfo block removed, 1 nested field replaced with 3 flat fields + 1 comment line) |
| `pages/DocumentDetailPage.tsx` | 303 | 303 | 0 (1-line text replacement) |

## Decisions Made

- **DrafterInfo deletion (D-G3):** Pre-flight grep `grep -rn "DrafterInfo" frontend/src` confirmed only 2 self-references (declaration L15 + usage L23). After replacing the L23 use with flat fields, the declaration became dead code. Deletion is the cleanest end-state and matches the plan's instruction.
- **Meta-grid 기안자 cell preserved (L226~229):** UI-SPEC §"Position note for DocumentDetailPage" mandates deletion when `DrafterInfoHeader` is wired (plan 34-05). Plan 34-01 deliberately scopes itself to the bug-fix only; deletion in this plan would create an unstyled gap until 34-05 lands.
- **tsc verification command override:** The plan's `<verify><automated>` block uses `npx tsc --noEmit` (no `-p`), but the repo's root `tsconfig.json` has `files: []` and only references — running bare `tsc --noEmit` produces 0 output (no project loaded). Used `npx tsc -p tsconfig.app.json --noEmit` instead to genuinely typecheck the app source. Both before-fix (Task 1 expected errors at L228) and after-fix (Task 2 zero errors) results were observed correctly with the explicit project flag. **This is a verify-command tightening, not a deviation from plan intent** — the plan's own `<done>` criteria specifies "expected errors at consumer sites", which the bare-tsc command would have missed.

## Deviations from Plan

None — plan executed exactly as written. The tsc command refinement noted above is a verification-tightening within the plan's own intent (plan expected Task 1 to surface consumer-site errors and Task 2 to clear them; the explicit `-p tsconfig.app.json` flag is what actually exposes them).

## Verification Log

Plan-level `<verification>` block (all 4 checks):

1. **`npx tsc -p tsconfig.app.json --noEmit`** → exit 0, **zero `error TS` lines**.
2. **`grep -rn "doc\.drafter\." frontend/src/features/document/`** → **0 matches**.
3. **`grep -rn "DrafterInfo" frontend/src`** → **0 matches** (DrafterInfo deleted).
4. **`cd frontend && npm run build`** → exit 0 (vite build successful, 832ms, 2468 modules). Bundle size warning (>500 kB) is pre-existing and unrelated.

Per-task verify outputs:
- Task 1 verify: tsc reports exactly 2 expected `TS2551 Property 'drafter' does not exist on type 'DocumentDetailResponse'` errors at `DocumentDetailPage.tsx` L228 — these are the consumer-site errors the plan's `<done>` predicted, fixed in Task 2.
- Task 2 verify: tsc clean (0 errors), `doc.drafter.*` grep clean (0 matches), `doc.drafterName` / `doc.departmentName` present at L228.

## Issues Encountered

None.

## Forward Note for Plans 34-04 / 34-05

`DocumentDetailResponse` now exposes flat `drafterName: string`, `departmentName: string`, `positionName: string | null`. The `DrafterInfoHeader` legacy-fallback path (`mode='submitted'`, `snapshot=null`) can read these flat fields directly off `doc` without an adapter:

```tsx
drafterLive={{
  drafterName: doc.drafterName,
  departmentName: doc.departmentName,
  positionName: doc.positionName,
}}
```

This is the contract that PATTERNS.md §7 (page-level props plumbing) was already designed against — the bug fix here makes that pattern type-correct.

## Threat Flags

None — Plan 34-01 only fixes existing FE rendering of trusted server fields. No new endpoints, auth paths, file access, or trust boundaries introduced. Aligns with plan threat model T-34-01-01 (`accept` — no new exposure surface) and mitigates T-34-01-02 / T-34-01-03 as intended.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- Plan 34-01 self-contained and atomic — no blockers for the rest of phase 34.
- Plan 34-02 (BE snapshot capture) can proceed immediately; it has zero FE coupling and is independent of this plan's edits.
- Plans 34-04 (DrafterInfoHeader component) and 34-05 (DocumentDetailPage integration) now have a type-correct base contract to build on. The fallback `live` props can be read directly off `doc.drafterName/departmentName/positionName`.

## Self-Check: PASSED

- ✅ `34-01-SUMMARY.md` exists at `.planning/phases/34-drafter-info-header/`
- ✅ `frontend/src/features/document/types/document.ts` contains `drafterName: string` (L23)
- ✅ `frontend/src/features/document/pages/DocumentDetailPage.tsx` L228 reads `doc.drafterName`
- ✅ Commit `c3f81db` (Task 1) found in git log
- ✅ Commit `2fa0c87` (Task 2) found in git log
- ✅ `tsc -p tsconfig.app.json --noEmit` exit 0, zero errors
- ✅ `grep -rn "doc\\.drafter\\." frontend/src/features/document/` returns 0 matches
- ✅ `grep -rn "DrafterInfo" frontend/src` returns 0 matches
- ✅ `npm run build` exit 0

---
*Phase: 34-drafter-info-header*
*Completed: 2026-04-29*

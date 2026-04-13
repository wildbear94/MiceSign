# Deferred Items — Phase 24.1

Out-of-scope issues discovered during Phase 24.1 execution. These are pre-existing
issues not caused by this phase's changes.

## Build baseline is red (pre-existing, discovered during 24.1-01 Task 2)

`npm run build` in `frontend/` fails with errors **unrelated to Phase 24.1 changes**:

1. **Test infrastructure missing dependencies** (carried over from Phase 24):
   - `src/features/approval/components/__tests__/ApprovalActionPanel.test.tsx`
   - `src/features/approval/components/__tests__/ApprovalLineEditor.test.tsx`
   - `src/features/approval/components/__tests__/ApprovalLineTimeline.test.tsx`
   - `src/features/document/pages/__tests__/DocumentDetailPage.approval.test.tsx`
   - `src/test/setup.ts`
   - Errors: `TS2307: Cannot find module 'vitest'`, `Cannot find module '@testing-library/jest-dom'`
   - Root cause: `vitest` and `@testing-library/jest-dom` not in `package.json` devDependencies

2. **Unused import in ExpenseForm** (pre-existing):
   - `src/features/document/components/templates/ExpenseForm.tsx:6` — `TS6133: 'parseNumericInput' is declared but its value is never read`

**Verification that these are pre-existing:** baseline build on master prior to any 24.1-01 edits produced the identical error list (verified via `git stash` + `npm run build`).

**Impact on Phase 24.1:** None on typing correctness — `npx tsc --noEmit` with the app sources is still usable for downstream plans if the test files are excluded, or the dependencies are installed.

**Recommendation:** Address as a separate /gsd:quick fix before Phase 24.1 Wave with DynamicCustomForm integration, so that downstream verification agents can run `npm run build` cleanly.

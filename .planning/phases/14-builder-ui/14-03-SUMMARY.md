---
phase: 14-builder-ui
plan: 03
subsystem: ui
tags: [react, dnd, hello-pangea-dnd, builder, drag-drop, tailwindcss]

# Dependency graph
requires:
  - phase: 14-01
    provides: builder types, useBuilderReducer, PALETTE_ITEMS, admin template API hooks
  - phase: 13-02
    provides: DynamicForm component for preview rendering
provides:
  - 3-panel builder layout (BuilderLayout) with desktop guard
  - FieldPalette with 8 draggable field types
  - BuilderCanvas with droppable field cards
  - FieldCard with drag handle, selection, and inline toolbar
  - BuilderToolbar with save, preview toggle, JSON export
  - BuilderPreview rendering DynamicForm from builder state
  - TemplateBuilderPage wiring DragDropContext with all panels
affects: [14-04-property-panel]

# Tech tracking
tech-stack:
  added: []
  patterns: [DragDropContext palette-to-canvas pattern, useBuilderReducer dispatch pattern]

key-files:
  created:
    - frontend/src/features/admin/components/builder/BuilderLayout.tsx
    - frontend/src/features/admin/components/builder/FieldPalette.tsx
    - frontend/src/features/admin/components/builder/BuilderToolbar.tsx
    - frontend/src/features/admin/components/builder/BuilderPreview.tsx
    - frontend/src/features/admin/components/builder/BuilderCanvas.tsx
    - frontend/src/features/admin/components/builder/FieldCard.tsx
  modified:
    - frontend/src/features/admin/pages/TemplateBuilderPage.tsx
    - frontend/public/locales/ko/admin.json
    - frontend/public/locales/en/admin.json

key-decisions:
  - "Used window.alert() for save/error toasts as placeholder -- no toast library installed yet"
  - "Palette uses isDropDisabled={true} to prevent drops back into palette"
  - "JSON import handler deferred to Plan 04 (property panel plan)"

patterns-established:
  - "Builder DnD: palette droppableId='palette' with isDropDisabled, canvas droppableId='canvas' as receiver"
  - "Builder state flow: TemplateBuilderPage dispatches to useBuilderReducer, passes state down to child components"
  - "Desktop guard: useMediaQuery pattern with window.matchMedia('(min-width: 1024px)') in BuilderLayout"

requirements-completed: [BLDR-01, BLDR-02, BLDR-03, BLDR-05]

# Metrics
duration: 4min
completed: 2026-04-05
---

# Phase 14 Plan 03: Builder Core Summary

**3-panel drag-and-drop form builder with palette, canvas, field cards, preview toggle, and save/export using @hello-pangea/dnd**

## Performance

- **Duration:** 4 min
- **Started:** 2026-04-05T12:37:03Z
- **Completed:** 2026-04-05T12:41:09Z
- **Tasks:** 3
- **Files modified:** 9

## Accomplishments
- 3-panel layout (200px palette / fluid canvas / 300px property panel) with desktop-only guard at 1024px
- Palette with 8 draggable field types supporting both drag-to-canvas and click-to-append
- Canvas with droppable field cards showing label, type badge, width badge, required indicator, and inline duplicate/delete toolbar
- Builder page wiring DragDropContext for palette-to-canvas drag and canvas reorder
- Live preview mode rendering DynamicForm from current builder state
- Save to API via useUpdateTemplate, JSON schema export as downloadable file
- Unsaved changes warning via beforeunload and confirm dialog on back navigation

## Task Commits

Each task was committed atomically:

1. **Task 1: BuilderLayout, FieldPalette, BuilderToolbar, BuilderPreview** - `6f7d80d` (feat)
2. **Task 2: BuilderCanvas, FieldCard with DnD** - `087716f` (feat)
3. **Task 3: TemplateBuilderPage -- wire DragDropContext, load/save, unsaved warning** - `8284df1` (feat)

## Files Created/Modified
- `frontend/src/features/admin/components/builder/BuilderLayout.tsx` - 3-panel layout container with desktop guard
- `frontend/src/features/admin/components/builder/FieldPalette.tsx` - Left panel with 8 draggable field types
- `frontend/src/features/admin/components/builder/BuilderToolbar.tsx` - Top toolbar with save, preview toggle, JSON dropdown, back
- `frontend/src/features/admin/components/builder/BuilderPreview.tsx` - Preview panel rendering DynamicForm
- `frontend/src/features/admin/components/builder/BuilderCanvas.tsx` - Center droppable canvas with empty state
- `frontend/src/features/admin/components/builder/FieldCard.tsx` - Draggable field card with selection and inline toolbar
- `frontend/src/features/admin/pages/TemplateBuilderPage.tsx` - Builder page wiring all components with DragDropContext
- `frontend/public/locales/ko/admin.json` - Added field type i18n keys
- `frontend/public/locales/en/admin.json` - Added field type i18n keys

## Decisions Made
- Used `window.alert()` for save success/error feedback as a placeholder -- no toast library (sonner/react-hot-toast) is installed. Future plan can add proper toast.
- JSON import handler is a no-op placeholder in Task 3 -- full import with Zod validation is scoped to Plan 04.
- Restored `useBuilderReducer.ts` which was accidentally deleted by a parallel agent in a prior wave (Rule 3: blocking issue fix).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Restored useBuilderReducer.ts deleted by parallel agent**
- **Found during:** Task 1 (reading prerequisite files)
- **Issue:** The file `frontend/src/features/admin/components/builder/useBuilderReducer.ts` was created in Plan 14-01 (commit af688b1) but accidentally deleted by the Plan 14-02 parallel agent (commit 140a831) which ran `git add .` from a misaligned worktree
- **Fix:** Restored file from commit af688b1 via `git checkout af688b1 -- frontend/src/features/admin/components/builder/useBuilderReducer.ts`
- **Files modified:** frontend/src/features/admin/components/builder/useBuilderReducer.ts
- **Verification:** TypeScript compiles without errors
- **Committed in:** 6f7d80d (Task 1 commit)

**2. [Rule 3 - Blocking] Restored DynamicForm and related files deleted by parallel agent**
- **Found during:** Task 1 (reading prerequisite files)
- **Issue:** `DynamicForm.tsx`, `DynamicReadOnly.tsx`, dynamic field components, and `dynamicForm.ts` types were all deleted by the same parallel agent issue
- **Fix:** Restored from their original creation commits (51f1ccc, f283406)
- **Files modified:** Multiple files under frontend/src/features/document/
- **Verification:** TypeScript compiles without errors
- **Committed in:** 6f7d80d (Task 1 commit)

---

**Total deviations:** 2 auto-fixed (2 blocking)
**Impact on plan:** Both fixes were necessary to restore prerequisites from Plan 14-01 and Phase 13 that were accidentally deleted by a parallel worktree agent. No scope creep.

## Issues Encountered
- Parallel agent worktree issue: The Plan 14-02 agent's `git checkout` from a soft-reset base caused mass file deletion. This was resolved by selectively restoring files from their original commits.

## User Setup Required
None - no external service configuration required.

## Known Stubs
- `window.alert()` used for save success/error feedback instead of proper toast component -- acceptable for MVP, can be replaced when a toast library is added
- JSON import `onJsonImport` handler is a no-op -- will be implemented in Plan 04
- Property panel renders placeholder text `t('templates.noFieldSelected')` -- will be implemented in Plan 04

## Next Phase Readiness
- Builder core is fully functional with DnD, save, and preview
- Plan 04 (property panel) can now implement field editing by reading `state.selectedFieldId` and dispatching `UPDATE_FIELD` / `UPDATE_FIELD_CONFIG` actions
- Plan 04 should also implement the JSON import modal with Zod validation

## Self-Check: PASSED

All 8 created files verified present. All 3 task commits verified in git log.

---
*Phase: 14-builder-ui*
*Completed: 2026-04-05*

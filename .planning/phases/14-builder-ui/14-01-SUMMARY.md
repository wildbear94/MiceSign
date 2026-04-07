---
phase: 14-builder-ui
plan: 01
subsystem: ui
tags: [react, typescript, tanstack-query, zustand, i18n, spring-boot, java]

# Dependency graph
requires:
  - phase: 13-dynamic-form-infra
    provides: DynamicForm, DynamicReadOnly, FieldConfig types, template API
provides:
  - Builder type definitions (AdminTemplateResponse, BuilderState, BuilderAction)
  - Admin template CRUD API client (adminTemplateApi)
  - TanStack Query hooks for template management
  - Builder state reducer with 11 action types
  - Admin sidebar template management nav item
  - Routes for /admin/templates and /admin/templates/:id/builder
  - i18n keys for all builder UI strings (ko/en)
  - Half-width field rendering in DynamicForm and DynamicReadOnly
  - Backend FieldConfig width parameter
affects: [14-02, 14-03, 14-04]

# Tech tracking
tech-stack:
  added: [nanoid]
  patterns: [builder-reducer-pattern, admin-template-api-pattern]

key-files:
  created:
    - frontend/src/features/admin/types/builder.ts
    - frontend/src/features/admin/api/adminTemplateApi.ts
    - frontend/src/features/admin/hooks/useAdminTemplates.ts
    - frontend/src/features/admin/components/builder/useBuilderReducer.ts
    - frontend/src/features/admin/pages/TemplateListPage.tsx
    - frontend/src/features/admin/pages/TemplateBuilderPage.tsx
  modified:
    - frontend/src/features/admin/components/AdminSidebar.tsx
    - frontend/src/App.tsx
    - frontend/public/locales/ko/admin.json
    - frontend/public/locales/en/admin.json
    - backend/src/main/java/com/micesign/dto/template/FieldConfig.java
    - frontend/src/features/document/types/dynamicForm.ts
    - frontend/src/features/document/components/templates/DynamicForm.tsx
    - frontend/src/features/document/components/templates/DynamicReadOnly.tsx

key-decisions:
  - "nanoid for field ID generation in builder reducer (lightweight, collision-safe)"
  - "flex-wrap with calc(50%-0.5rem) for half-width field layout to maintain gap consistency"

patterns-established:
  - "Builder reducer pattern: useReducer with discriminated union BuilderAction type"
  - "Admin API client pattern: adminTemplateApi object mirroring backend endpoints"

requirements-completed: [BLDR-01, BLDR-02, BLDR-03, BLDR-04, BLDR-06]

# Metrics
duration: 4min
completed: 2026-04-05
---

# Phase 14 Plan 01: Builder UI Infrastructure Summary

**Builder type system, admin template API client, state reducer with 11 actions, routing/sidebar/i18n, and half-width field rendering support**

## Performance

- **Duration:** 4 min
- **Started:** 2026-04-05T12:21:04Z
- **Completed:** 2026-04-05T12:25:02Z
- **Tasks:** 3
- **Files modified:** 14

## Accomplishments
- Complete builder type system with AdminTemplateResponse, BuilderState, BuilderAction, PALETTE_ITEMS, FIELD_TYPE_DEFAULTS
- Admin template API client covering GET/POST/PUT/DELETE for templates and option-sets
- TanStack Query hooks (useAdminTemplates, useCreateTemplate, useUpdateTemplate, useDeactivateTemplate, useOptionSets)
- Builder state reducer handling all 11 action types with nanoid for field IDs
- AdminSidebar nav item and App.tsx routes for template management
- Full Korean/English i18n keys for builder UI
- Backend FieldConfig width parameter and frontend half-width rendering in DynamicForm/DynamicReadOnly

## Task Commits

Each task was committed atomically:

1. **Task 1: Builder types, Admin template API client, TanStack Query hooks** - `3deb8bd` (feat)
2. **Task 2: Builder state reducer, nanoid install, routing, sidebar, i18n** - `af688b1` (feat)
3. **Task 3: Backend width field + DynamicForm/DynamicReadOnly width support** - `5a7effb` (feat)

## Files Created/Modified
- `frontend/src/features/admin/types/builder.ts` - Builder type definitions, palette items, field defaults
- `frontend/src/features/admin/api/adminTemplateApi.ts` - Admin template CRUD API client
- `frontend/src/features/admin/hooks/useAdminTemplates.ts` - TanStack Query hooks for template operations
- `frontend/src/features/admin/components/builder/useBuilderReducer.ts` - Builder state reducer with 11 actions
- `frontend/src/features/admin/pages/TemplateListPage.tsx` - Placeholder template list page
- `frontend/src/features/admin/pages/TemplateBuilderPage.tsx` - Placeholder template builder page
- `frontend/src/features/admin/components/AdminSidebar.tsx` - Added LayoutTemplate nav item
- `frontend/src/App.tsx` - Added /admin/templates and /admin/templates/:id/builder routes
- `frontend/public/locales/ko/admin.json` - Korean i18n keys for builder UI
- `frontend/public/locales/en/admin.json` - English i18n keys for builder UI
- `backend/src/main/java/com/micesign/dto/template/FieldConfig.java` - Added String width parameter
- `frontend/src/features/document/types/dynamicForm.ts` - Added width?: 'full' | 'half' to FieldConfig
- `frontend/src/features/document/components/templates/DynamicForm.tsx` - flex-wrap half-width rendering
- `frontend/src/features/document/components/templates/DynamicReadOnly.tsx` - flex-wrap half-width rendering

## Decisions Made
- Used nanoid for field ID generation in builder reducer (lightweight, collision-safe, no UUID overhead)
- flex-wrap with `w-[calc(50%-0.5rem)]` for half-width fields to maintain consistent gap spacing with gap-x-4

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

- `frontend/src/features/admin/pages/TemplateListPage.tsx` - Placeholder page returning `<div>Template List</div>`, will be implemented in plan 14-02
- `frontend/src/features/admin/pages/TemplateBuilderPage.tsx` - Placeholder page returning `<div>Template Builder</div>`, will be implemented in plan 14-03

These stubs are intentional infrastructure placeholders required for route registration; full implementations are scheduled in subsequent plans (14-02, 14-03).

## Issues Encountered

None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- All builder types, API client, hooks, and state reducer are ready for plan 14-02 (Template List Page)
- Routes and sidebar navigation are wired up
- DynamicForm/DynamicReadOnly width support is available for the builder property panel

---
*Phase: 14-builder-ui*
*Completed: 2026-04-05*

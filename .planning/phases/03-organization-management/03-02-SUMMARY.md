---
phase: 03-organization-management
plan: 02
subsystem: ui
tags: [react, typescript, tanstack-query, i18n, tailwindcss, dnd]

# Dependency graph
requires:
  - phase: 01-foundation
    provides: React/Vite project scaffolding, API client, auth store
  - phase: 02-authentication
    provides: ProtectedRoute, authStore with role, i18n config
provides:
  - Admin TypeScript types (Department, Position, User)
  - API client functions for all admin CRUD endpoints
  - TanStack Query hooks with cache invalidation
  - AdminLayout with responsive sidebar
  - AdminRoute role-based guard
  - ConfirmDialog and Pagination shared components
  - i18n admin namespace (ko/en)
  - @hello-pangea/dnd dependency for drag-and-drop
affects: [03-organization-management, 04-document-templates]

# Tech tracking
tech-stack:
  added: [@hello-pangea/dnd]
  patterns: [feature-based API/hooks/components structure, admin route guard pattern]

key-files:
  created:
    - frontend/src/types/admin.ts
    - frontend/src/features/admin/api/departmentApi.ts
    - frontend/src/features/admin/api/positionApi.ts
    - frontend/src/features/admin/api/userApi.ts
    - frontend/src/features/admin/hooks/useDepartments.ts
    - frontend/src/features/admin/hooks/usePositions.ts
    - frontend/src/features/admin/hooks/useUsers.ts
    - frontend/src/features/admin/components/AdminLayout.tsx
    - frontend/src/features/admin/components/AdminSidebar.tsx
    - frontend/src/features/admin/components/ConfirmDialog.tsx
    - frontend/src/features/admin/components/Pagination.tsx
    - frontend/src/components/AdminRoute.tsx
    - frontend/public/locales/ko/admin.json
    - frontend/public/locales/en/admin.json
  modified:
    - frontend/src/App.tsx
    - frontend/src/i18n/config.ts
    - frontend/package.json

key-decisions:
  - "Reused existing PageResponse from types/api.ts instead of duplicating in admin.ts"
  - "placeholderData callback for smooth pagination in useUserList (TanStack Query v5 pattern)"

patterns-established:
  - "Feature-based directory: features/admin/{api,hooks,components} for domain grouping"
  - "Admin route guard: AdminRoute wraps admin area, checks role via authStore"
  - "Responsive sidebar: icon-only on lg (1024-1279px), full on xl+ (1280px+), overlay on mobile"

requirements-completed: [ORG-04]

# Metrics
duration: 4min
completed: 2026-04-02
---

# Phase 03 Plan 02: Frontend Admin Infrastructure Summary

**Admin area frontend infrastructure with TypeScript types, API clients, TanStack Query hooks, responsive sidebar layout, role-based route guard, and shared components (ConfirmDialog, Pagination)**

## Performance

- **Duration:** 4 min
- **Started:** 2026-04-02T01:25:01Z
- **Completed:** 2026-04-02T01:29:07Z
- **Tasks:** 2
- **Files modified:** 18

## Accomplishments
- Complete TypeScript type definitions for departments, positions, and users matching backend API contract
- API client functions and TanStack Query hooks with proper cache invalidation strategies for all admin endpoints
- Responsive admin layout with sidebar navigation (3 breakpoints: mobile overlay, lg icon-only, xl full)
- Reusable ConfirmDialog (danger/primary variants, focus trap, keyboard handling) and Pagination components
- Admin route guard protecting /admin/* routes from USER role access
- Korean and English i18n admin namespace with all UI strings, error codes, and toast messages

## Task Commits

Each task was committed atomically:

1. **Task 1: Types, API clients, TanStack Query hooks, i18n, and @hello-pangea/dnd** - `a6ec1ba` (feat)
2. **Task 2: Admin layout, sidebar, route guard, shared components, routing** - `7ec82c3` (feat)

## Files Created/Modified
- `frontend/src/types/admin.ts` - TypeScript interfaces for all admin domain models
- `frontend/src/features/admin/api/departmentApi.ts` - Department CRUD API client
- `frontend/src/features/admin/api/positionApi.ts` - Position CRUD + reorder API client
- `frontend/src/features/admin/api/userApi.ts` - User CRUD + filter API client
- `frontend/src/features/admin/hooks/useDepartments.ts` - Department query/mutation hooks
- `frontend/src/features/admin/hooks/usePositions.ts` - Position query/mutation hooks
- `frontend/src/features/admin/hooks/useUsers.ts` - User query/mutation hooks with pagination
- `frontend/src/features/admin/components/AdminLayout.tsx` - Admin page layout with sidebar
- `frontend/src/features/admin/components/AdminSidebar.tsx` - Responsive navigation sidebar
- `frontend/src/features/admin/components/ConfirmDialog.tsx` - Confirmation modal with variants
- `frontend/src/features/admin/components/Pagination.tsx` - Page navigation with ellipsis
- `frontend/src/components/AdminRoute.tsx` - Role-based route guard
- `frontend/public/locales/ko/admin.json` - Korean admin translations
- `frontend/public/locales/en/admin.json` - English admin translations
- `frontend/src/App.tsx` - Added admin routing structure
- `frontend/src/i18n/config.ts` - Registered admin namespace
- `frontend/package.json` - Added @hello-pangea/dnd dependency

## Decisions Made
- Reused existing `PageResponse` from `types/api.ts` rather than duplicating in `admin.ts` to avoid divergence
- Used `placeholderData: (prev) => prev` pattern (TanStack Query v5) instead of deprecated `keepPreviousData` for smooth pagination transitions

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Known Stubs
- `AdminPlaceholder` component in App.tsx renders "Loading..." text for /admin/departments, /admin/positions, /admin/users, and /admin/users/:id routes. These will be replaced by actual page components in Plans 03 and 04.

## Next Phase Readiness
- All shared admin infrastructure ready for Plan 03 (Department + Position pages) and Plan 04 (User pages)
- Types, API clients, hooks, layout, and shared components are all in place
- Page-level components can directly import and use this infrastructure

## Self-Check: PASSED

All 14 created files verified. Both task commits (a6ec1ba, 7ec82c3) confirmed in git log.

---
*Phase: 03-organization-management*
*Completed: 2026-04-02*

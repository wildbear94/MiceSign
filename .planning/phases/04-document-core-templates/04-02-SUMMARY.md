---
phase: 04-document-core-templates
plan: 02
subsystem: ui
tags: [react, typescript, tanstack-query, zod, tiptap, i18n, routing]

# Dependency graph
requires:
  - phase: 04-document-core-templates/01
    provides: Backend entities, DTOs, migrations for documents, templates, leave types
  - phase: 03-org-management
    provides: Frontend patterns (API client, hooks, Zod schemas, i18n, routing)
provides:
  - Document TypeScript types (DocumentResponse, TemplateResponse, LeaveTypeResponse)
  - Document API clients (documentApi, templateApi, leaveTypeApi)
  - TanStack Query hooks for documents, templates, leave types
  - useAutoSave hook with 30s debounce
  - Zod validation schemas for General, Expense, Leave forms
  - Currency formatter and leave days calculator utilities
  - Template registry type with edit/readOnly component interfaces
  - MainLayout with MainNavbar for all authenticated users
  - Document routes (/documents/my, /documents/new/:templateCode, /documents/:id)
  - i18n document namespace (ko/en)
affects: [04-document-core-templates/03, 05-file-attachments, 07-approval-workflow]

# Tech tracking
tech-stack:
  added: ["@tiptap/react", "@tiptap/starter-kit", "@tiptap/pm", "@tiptap/extension-underline", "@tiptap/extension-table", "@tiptap/extension-table-row", "@tiptap/extension-table-header", "@tiptap/extension-table-cell", "@tiptap/extension-image", "date-fns"]
  patterns: [document feature module structure, useAutoSave debounce hook, template registry pattern]

key-files:
  created:
    - frontend/src/features/document/types/document.ts
    - frontend/src/features/document/api/documentApi.ts
    - frontend/src/features/document/api/templateApi.ts
    - frontend/src/features/document/api/leaveTypeApi.ts
    - frontend/src/features/document/hooks/useDocuments.ts
    - frontend/src/features/document/hooks/useTemplates.ts
    - frontend/src/features/document/hooks/useLeaveTypes.ts
    - frontend/src/features/document/hooks/useAutoSave.ts
    - frontend/src/features/document/validations/generalSchema.ts
    - frontend/src/features/document/validations/expenseSchema.ts
    - frontend/src/features/document/validations/leaveSchema.ts
    - frontend/src/features/document/utils/currency.ts
    - frontend/src/features/document/utils/leaveDays.ts
    - frontend/src/features/document/components/templates/templateRegistry.ts
    - frontend/src/layouts/MainLayout.tsx
    - frontend/src/layouts/MainNavbar.tsx
    - frontend/public/locales/ko/document.json
    - frontend/public/locales/en/document.json
  modified:
    - frontend/package.json
    - frontend/src/App.tsx
    - frontend/src/i18n/config.ts

key-decisions:
  - "Followed Zod v4 { error } syntax for validation schemas per Phase 3 decision"
  - "Root / redirects to /documents/my as primary user view (replacing DashboardPlaceholder)"
  - "MainNavbar admin link gated by SUPER_ADMIN/ADMIN role check"

patterns-established:
  - "Document feature module: types/ api/ hooks/ validations/ utils/ components/templates/"
  - "useAutoSave hook: 30s debounce, skip first render, SaveStatus state for UI indicator"
  - "Template registry: Record<string, TemplateEntry> with edit/readOnly component types"

requirements-completed: [DOC-01, DOC-02, DOC-06]

# Metrics
duration: 4min
completed: 2026-04-02
---

# Phase 04 Plan 02: Frontend Infrastructure Summary

**Tiptap/date-fns installed, document data layer (types, API clients, TanStack Query hooks), Zod validation schemas, MainLayout with navbar, and document route registration**

## Performance

- **Duration:** 4 min
- **Started:** 2026-04-02T04:16:37Z
- **Completed:** 2026-04-02T04:20:47Z
- **Tasks:** 3
- **Files modified:** 21

## Accomplishments
- Complete frontend data layer for documents: TypeScript types, API clients, and TanStack Query hooks with cache invalidation
- Zod v4 validation schemas for all 3 template forms (General, Expense, Leave) plus currency/date utilities
- MainLayout with MainNavbar providing navigation for all authenticated users, admin link gated by role
- Document routes registered under ProtectedRoute with root / redirect to /documents/my

## Task Commits

Each task was committed atomically:

1. **Task 1: Install dependencies, TypeScript types, API clients, and hooks** - `7a5d31f` (feat)
2. **Task 2: Zod schemas, utility functions, template registry, and i18n** - `72f88c4` (feat)
3. **Task 3: MainLayout, MainNavbar, document route registration** - `5f48ade` (feat)

## Files Created/Modified
- `frontend/src/features/document/types/document.ts` - All document-related TypeScript interfaces
- `frontend/src/features/document/api/documentApi.ts` - Document CRUD API client
- `frontend/src/features/document/api/templateApi.ts` - Template list API client
- `frontend/src/features/document/api/leaveTypeApi.ts` - Leave type list API client
- `frontend/src/features/document/hooks/useDocuments.ts` - TanStack Query hooks for document CRUD
- `frontend/src/features/document/hooks/useTemplates.ts` - Template list hook with 5min staleTime
- `frontend/src/features/document/hooks/useLeaveTypes.ts` - Leave type list hook with 5min staleTime
- `frontend/src/features/document/hooks/useAutoSave.ts` - 30s debounced auto-save hook
- `frontend/src/features/document/validations/generalSchema.ts` - General form Zod schema
- `frontend/src/features/document/validations/expenseSchema.ts` - Expense form Zod schema with item array
- `frontend/src/features/document/validations/leaveSchema.ts` - Leave form Zod schema
- `frontend/src/features/document/utils/currency.ts` - KRW currency formatter
- `frontend/src/features/document/utils/leaveDays.ts` - Leave days calculator using date-fns
- `frontend/src/features/document/components/templates/templateRegistry.ts` - Template registry type and lookup
- `frontend/src/layouts/MainLayout.tsx` - Main layout with navbar and content outlet
- `frontend/src/layouts/MainNavbar.tsx` - Top navbar with logo, nav links, user menu
- `frontend/public/locales/ko/document.json` - Korean document translations
- `frontend/public/locales/en/document.json` - English document translations
- `frontend/src/i18n/config.ts` - Added document namespace
- `frontend/src/App.tsx` - Added MainLayout and document routes
- `frontend/package.json` - Added Tiptap and date-fns dependencies

## Decisions Made
- Used Zod v4 `{ error }` syntax for validation message customization per Phase 3 established pattern
- Root `/` now redirects to `/documents/my` replacing the DashboardPlaceholder, since document list is the primary user view
- MainNavbar admin link visibility gated by SUPER_ADMIN/ADMIN role check from authStore

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Known Stubs
- `frontend/src/features/document/components/templates/templateRegistry.ts` - TEMPLATE_REGISTRY is an empty `{}`. Plan 03 will populate with actual template components.
- `frontend/src/App.tsx` - DocumentListPlaceholder, DocumentEditorPlaceholder, DocumentDetailPlaceholder are inline placeholder components. Plan 03 replaces with real page components.

## Next Phase Readiness
- All frontend infrastructure ready for Plan 03 (UI components)
- Types, hooks, validation schemas, and routing in place
- Plan 03 can focus purely on building document list, editor, and detail page components

---
*Phase: 04-document-core-templates*
*Completed: 2026-04-02*

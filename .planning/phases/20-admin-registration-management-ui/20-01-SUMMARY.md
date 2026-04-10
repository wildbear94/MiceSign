---
phase: 20-admin-registration-management-ui
plan: 01
subsystem: frontend
tags: [admin, registration, list-page, sidebar, i18n]
dependency_graph:
  requires: []
  provides: [registration-types, registration-api, registration-hooks, registration-list-page, registration-sidebar-nav]
  affects: [AdminSidebar, App.tsx, admin.ts, admin.json]
tech_stack:
  added: []
  patterns: [TanStack Query hooks, status tab filtering, sortable table, conditional sidebar nav]
key_files:
  created:
    - frontend/src/features/admin/api/registrationApi.ts
    - frontend/src/features/admin/hooks/useRegistrations.ts
    - frontend/src/features/admin/components/RegistrationStatusTabs.tsx
    - frontend/src/features/admin/components/RegistrationTable.tsx
    - frontend/src/features/admin/pages/RegistrationListPage.tsx
  modified:
    - frontend/src/types/admin.ts
    - frontend/src/features/admin/components/AdminSidebar.tsx
    - frontend/src/App.tsx
    - frontend/public/locales/ko/admin.json
    - frontend/public/locales/en/admin.json
decisions:
  - "PENDING default tab with createdAt desc sort for immediate admin workflow"
  - "SUPER_ADMIN-only sidebar conditional rendering with pending count badge"
  - "void selectedRegistration pattern to suppress unused warning until Plan 02 modal"
metrics:
  duration: 3min
  completed: "2026-04-08T06:33:04Z"
  tasks: 2
  files: 10
---

# Phase 20 Plan 01: Registration List Page Infrastructure Summary

Registration list page with tab filtering, sortable table, pagination, and SUPER_ADMIN sidebar navigation for admin registration management.

## What Was Built

### Task 1: Types, API layer, hooks, and i18n keys (d821780)

- Added `RegistrationStatus`, `RegistrationListItem`, `ApproveRegistrationRequest`, `RejectRegistrationRequest`, `RegistrationFilterParams` types to `admin.ts`
- Created `registrationApi` with `getList`, `approve`, `reject` endpoints following `userApi` pattern
- Created TanStack Query hooks: `useRegistrationList` (with placeholderData), `usePendingRegistrationCount` (30s staleTime), `useApproveRegistration`, `useRejectRegistration`
- Added Korean and English i18n keys under `registration` namespace covering tabs, table, modal, actions, statuses, toasts, and validation messages

### Task 2: List page with tabs, table, sidebar, and routing (8962e3a)

- Created `RegistrationStatusTabs` with 6 status tabs (all/pending/approved/rejected/expired/cancelled) using `role="tablist"` and `aria-selected`
- Created `RegistrationTable` with sortable name/email/createdAt columns, color-coded status badges, loading spinner, empty state, and `aria-sort` attributes
- Created `RegistrationListPage` with PENDING default filter, createdAt desc default sort, sort toggle (asc->desc->remove), and Pagination integration
- Updated `AdminSidebar` to conditionally show registration menu with `UserPlus` icon for `SUPER_ADMIN` only, with red pending count badge
- Added `/admin/registrations` route in `App.tsx` under AdminLayout

## Deviations from Plan

None - plan executed exactly as written.

## Verification

- TypeScript compilation: PASSED (npx tsc --noEmit clean)
- All acceptance criteria met for both tasks

## Self-Check: PASSED

All 10 files exist. Both commit hashes (d821780, 8962e3a) verified in git log.

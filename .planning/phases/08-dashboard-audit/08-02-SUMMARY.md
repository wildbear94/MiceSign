---
phase: 08-dashboard-audit
plan: 02
subsystem: ui
tags: [react, typescript, tanstack-query, tailwindcss, i18n, dashboard, zustand]

# Dependency graph
requires:
  - phase: 08-01
    provides: Dashboard summary API endpoint (/api/v1/dashboard/summary), pending approval counts
  - phase: 07
    provides: PendingApprovalResponse type, approvalApi.getPending, usePendingApprovals hook
  - phase: 04
    provides: DocumentResponse type, /documents/my endpoint, TemplateSelectionModal
depends_on: ["08-01"]

provides:
  - DashboardPage as the home route (/) with 3 count cards and 2 preview lists
  - useDashboardSummary hook with 60s auto-refresh
  - usePendingPreview hook (5-item preview of pending approvals)
  - useRecentDocuments hook (5-item preview of user's recent documents)
  - CountCard reusable component with loading skeleton
  - PendingList component with empty state
  - RecentDocumentsList component with empty state
  - MainNavbar red badge on 결재 대기 link showing pending count
  - 대시보드 nav link as first item in navbar
  - dashboard.json i18n namespace (ko + en)

affects: [08-03, future-ui-phases]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "TanStack Query refetchInterval: 60_000 for dashboard auto-refresh polling"
    - "Namespace-based i18n files (dashboard.json) separate from translation.json"
    - "CountCard reusable component pattern with LucideIcon prop and loading skeleton"
    - "Silent degradation: show '-' for count values on API error (not error screen)"

key-files:
  created:
    - frontend/src/features/dashboard/types/dashboard.ts
    - frontend/src/features/dashboard/api/dashboardApi.ts
    - frontend/src/features/dashboard/hooks/useDashboard.ts
    - frontend/src/features/dashboard/components/CountCard.tsx
    - frontend/src/features/dashboard/components/PendingList.tsx
    - frontend/src/features/dashboard/components/RecentDocumentsList.tsx
    - frontend/src/features/dashboard/pages/DashboardPage.tsx
    - frontend/public/locales/ko/dashboard.json
    - frontend/public/locales/en/dashboard.json
  modified:
    - frontend/src/layouts/MainNavbar.tsx
    - frontend/src/App.tsx
    - frontend/src/i18n/config.ts

key-decisions:
  - "Created separate dashboard.json i18n namespace instead of adding to translation.json (follows project namespace-based i18n pattern)"
  - "Home route (/) now renders DashboardPage directly — removed Navigate redirect to /documents/my"
  - "useDashboardSummary shared between DashboardPage (count cards) and MainNavbar (badge) to avoid duplicate API calls"

patterns-established:
  - "Dashboard feature directory: features/dashboard/{types,api,hooks,components,pages}"
  - "60-second polling via refetchInterval for dashboard data freshness"
  - "Silent degradation pattern: API error shows '-' not error boundary"

requirements-completed: [DASH-01, DASH-02, DASH-03]

# Metrics
duration: ~45min
completed: 2026-04-03
---

# Phase 08 Plan 02: Dashboard Frontend Summary

**React dashboard page with 3 auto-refreshing count cards, pending approvals preview, recent documents preview, and navbar pending badge — replacing the / redirect with a full home screen**

## Performance

- **Duration:** ~45 min
- **Started:** 2026-04-03
- **Completed:** 2026-04-03
- **Tasks:** 3 (including human-verify checkpoint)
- **Files modified:** 13

## Accomplishments

- Built complete dashboard home page: 3 count cards (결재 대기, 임시저장, 완료) + pending approvals list (max 5) + recent documents list (max 5) with 60-second auto-refresh
- Updated MainNavbar with 대시보드 first nav link and red badge on 결재 대기 showing live pending count (hidden at 0, shows "99+" overflow)
- Changed home route (/) from Navigate redirect to /documents/my to DashboardPage render, establishing dashboard as the primary landing page

## Task Commits

Each task was committed atomically:

1. **Task 1: Dashboard types, API, hooks, and all components** - `7608ec8` (feat)
2. **Task 2: MainNavbar badge + routing changes** - `6a8ac95` (feat)
3. **Task 3: Visual verification** - Approved by user (checkpoint)

## Files Created/Modified

- `frontend/src/features/dashboard/types/dashboard.ts` - DashboardSummary interface (pendingCount, draftCount, completedCount)
- `frontend/src/features/dashboard/api/dashboardApi.ts` - dashboardApi.getSummary() calling /api/v1/dashboard/summary
- `frontend/src/features/dashboard/hooks/useDashboard.ts` - useDashboardSummary, usePendingPreview, useRecentDocuments hooks (all with 60s refetchInterval)
- `frontend/src/features/dashboard/components/CountCard.tsx` - Reusable badge count card with icon, count, label, loading skeleton, accessible click handling
- `frontend/src/features/dashboard/components/PendingList.tsx` - 5-item pending approvals list with empty state, skeleton loading, 더보기 link
- `frontend/src/features/dashboard/components/RecentDocumentsList.tsx` - 5-item recent documents list with DocumentStatusBadge, TemplateBadge, empty state
- `frontend/src/features/dashboard/pages/DashboardPage.tsx` - Full dashboard layout: header + 새 문서 작성 button + 3-col card grid + 2-col list grid
- `frontend/public/locales/ko/dashboard.json` - Korean i18n strings for dashboard namespace
- `frontend/public/locales/en/dashboard.json` - English i18n strings for dashboard namespace
- `frontend/src/i18n/config.ts` - Added dashboard namespace registration
- `frontend/src/layouts/MainNavbar.tsx` - Added 대시보드 nav link + pending badge with 99+ overflow + aria-label
- `frontend/src/App.tsx` - Changed / route from Navigate redirect to DashboardPage render

## Decisions Made

- Separate dashboard.json i18n namespace: project already uses namespace-based i18n (public/locales/ runtime loaded), adding a "dashboard" key to translation.json would have grown that file significantly. A dedicated namespace follows the existing convention better.
- useDashboardSummary reused in both DashboardPage and MainNavbar: avoids two parallel API calls — TanStack Query deduplicates requests with the same queryKey.
- Silent degradation for count card errors: shows "-" instead of error boundary to keep the page usable even when summary API is temporarily down.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Artifact] Created dashboard.json namespace files instead of adding to translation.json**
- **Found during:** Task 1 (Dashboard types, API, hooks, and all components)
- **Issue:** Plan specified adding a "dashboard" section to `frontend/public/locales/ko/translation.json`. However, the project uses namespace-based i18n (i18next with http-backend), and the existing i18n/config.ts registers separate namespace files. Adding to translation.json would break the namespace pattern and mix concerns.
- **Fix:** Created `frontend/public/locales/ko/dashboard.json` and `frontend/public/locales/en/dashboard.json` as dedicated namespace files, and registered the "dashboard" namespace in i18n/config.ts.
- **Files modified:** frontend/public/locales/ko/dashboard.json (created), frontend/public/locales/en/dashboard.json (created), frontend/src/i18n/config.ts (modified)
- **Verification:** TypeScript compilation passes, i18n namespace resolves at runtime
- **Committed in:** 7608ec8 (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 missing critical — namespace correctness)
**Impact on plan:** Single deviation aligned with existing project i18n pattern. No scope creep. All plan success criteria met.

## Issues Encountered

None — plan executed cleanly after the i18n namespace deviation was resolved.

## User Setup Required

None - no external service configuration required. The dashboard connects to the /api/v1/dashboard/summary endpoint built in Phase 08 Plan 01.

## Next Phase Readiness

- Dashboard frontend complete; ready for Phase 08 Plan 03 (Audit Log UI)
- useDashboardSummary hook available for any other UI that needs pending count
- DashboardPage is the proven home screen pattern for the application

---
*Phase: 08-dashboard-audit*
*Completed: 2026-04-03*

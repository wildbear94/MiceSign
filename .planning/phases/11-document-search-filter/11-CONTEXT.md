# Phase 11: Document Search & Filter - Context

**Gathered:** 2026-04-04
**Status:** Ready for planning

<domain>
## Phase Boundary

Users can find any document they are authorized to see through keyword search and multi-criteria filtering. The existing DocumentListPage is enhanced with search bar, filters, and tab-based view scope — no separate search page.

</domain>

<decisions>
## Implementation Decisions

### Search UI Layout
- **D-01:** Search and filters are integrated into the existing DocumentListPage, not a separate page
- **D-02:** Filter panel is always visible below the search bar (same pattern as AuditLogFilters/NotificationLogFilters)
- **D-03:** Filter area includes a "초기화" (reset) button to clear all filters at once

### Search Behavior
- **D-04:** Search is triggered by Enter key or search button click (not real-time debounce) — consistent with existing filter patterns
- **D-05:** Single unified search bar searches across title, document number, and drafter name (OR logic) — not per-field search inputs
- **D-06:** Search uses LIKE-based partial matching (not full-text search — Out of Scope per REQUIREMENTS.md)

### View Scope / Tabs
- **D-07:** Three tabs for document scope: 내 문서 (my documents) / 결재함 (approval box) / 전체 (all) — default tab is "내 문서"
- **D-08:** "결재함" shows documents where user is on the approval line (pending + completed + reference)
- **D-09:** "전체" tab is visible to ADMIN/SUPER_ADMIN only — shows all documents in the system
- **D-10:** Search and filters operate within the selected tab's scope

### Filter Options
- **D-11:** Filters: status dropdown (DRAFT/SUBMITTED/APPROVED/REJECTED/WITHDRAWN), template type dropdown (all 6 templates), date range (start/end date pickers)
- **D-12:** All filters combine with AND logic
- **D-13:** Template type dropdown shows all 6 templates from TEMPLATE_REGISTRY

### Result Display
- **D-14:** Table columns: title, document number, status, template type (added), drafter, date — extends existing DocumentListTable
- **D-15:** Search keyword highlighting in results (title, document number, drafter name)
- **D-16:** Empty result shows "검색 결과가 없습니다" message with suggestion to adjust filters
- **D-17:** Sort order is fixed to newest first (created date descending) — no user-selectable sorting

### URL State
- **D-18:** All state preserved in URL query parameters: tab, search keyword, filters (status, template, date range), and page number
- **D-19:** Browser back/forward and bookmarking fully supported via URL state sync

### Claude's Discretion
- Table column widths and responsive behavior
- Search keyword highlight styling (bold, background color, etc.)
- Exact empty state illustration/icon choice
- Backend query optimization approach (QueryDSL dynamic predicates vs JPA Specifications)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements
- `docs/PRD_MiceSign_v2.0.md` — Full PRD with DB schema DDL, API patterns
- `docs/FSD_MiceSign_v1.0.md` — Functional specs with API contracts for document endpoints
- `.planning/REQUIREMENTS.md` — SRCH-01 (keyword search), SRCH-02 (multi-criteria filter)

### Existing Patterns (filter UI)
- `frontend/src/features/audit/components/AuditLogFilters.tsx` — Filter component pattern to follow
- `frontend/src/features/notification/components/NotificationLogFilters.tsx` — Most recent filter UI implementation
- `frontend/src/features/admin/components/UserFilterBar.tsx` — Admin filter pattern

### Existing Code (document feature)
- `frontend/src/features/document/pages/DocumentListPage.tsx` — Page to enhance with search/filter
- `frontend/src/features/document/components/DocumentListTable.tsx` — Table component to extend
- `frontend/src/features/document/hooks/useDocuments.ts` — Data fetching hooks to extend
- `backend/src/main/java/com/micesign/repository/DocumentRepository.java` — Repository to add search queries
- `backend/src/main/java/com/micesign/service/DocumentService.java` — Service to add search/filter logic

### Template Registry
- `frontend/src/features/document/components/templates/templateRegistry.ts` — 6 templates for filter dropdown

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `AuditLogFilters` / `NotificationLogFilters`: Filter UI component pattern (localFilter state + handleSearch + handleKeyDown + inputStyle)
- `Pagination` component: Already used in DocumentListPage
- `DocumentListTable`: Existing table component to extend with template type column
- `useMyDocuments` hook: Existing data fetching pattern with TanStack Query

### Established Patterns
- Filter components use local state + explicit search trigger (not real-time)
- All filter UIs use the same Tailwind input styling (`inputStyle` constant)
- Backend repositories use Spring Data JPA with `@Query` for custom queries
- QueryDSL is available in the project for dynamic query building
- URL state management not yet established — this will be the first implementation

### Integration Points
- `DocumentListPage` is the primary integration target (add search bar, filters, tabs)
- `DocumentRepository` needs new search/filter query methods
- `DocumentService` needs search/filter business logic with RBAC enforcement
- Router configuration may need updates for URL query parameter handling
- `App.tsx` routing — no new routes needed (enhancing existing page)

</code_context>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches. Follow existing AuditLogFilters/NotificationLogFilters pattern for UI consistency.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 11-document-search-filter*
*Context gathered: 2026-04-04*

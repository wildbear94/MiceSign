# Phase 11: Document Search & Filter - Research

**Researched:** 2026-04-04
**Domain:** Document search, filtering, URL state management, QueryDSL dynamic queries
**Confidence:** HIGH

## Summary

Phase 11 enhances the existing `DocumentListPage` with keyword search, multi-criteria filtering, tab-based view scoping (my docs / approval box / all), and URL state persistence. The backend needs a new search endpoint that builds dynamic queries based on multiple optional parameters while enforcing RBAC. The frontend needs a filter component (following existing AuditLogFilters pattern), tab navigation, URL-to-state synchronization via `useSearchParams`, and search result highlighting.

The primary complexity lies in the backend: building a dynamic query that combines keyword search (OR across title, doc number, drafter name), filter criteria (AND logic), and view scope (my docs vs approval box vs admin all) into a single paginated query with proper RBAC enforcement. QueryDSL is already in the Gradle build but unused -- this is the ideal use case to introduce it.

**Primary recommendation:** Use QueryDSL `BooleanBuilder` for dynamic predicate construction on the backend. Use React Router `useSearchParams` for URL state sync on the frontend. Follow the existing `AuditLogFilters` / `NotificationLogFilters` pattern for filter UI, adding a reset button and search keyword input.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Search and filters are integrated into the existing DocumentListPage, not a separate page
- **D-02:** Filter panel is always visible below the search bar (same pattern as AuditLogFilters/NotificationLogFilters)
- **D-03:** Filter area includes a "초기화" (reset) button to clear all filters at once
- **D-04:** Search is triggered by Enter key or search button click (not real-time debounce)
- **D-05:** Single unified search bar searches across title, document number, and drafter name (OR logic)
- **D-06:** Search uses LIKE-based partial matching (not full-text search)
- **D-07:** Three tabs: 내 문서 / 결재함 / 전체 -- default tab is "내 문서"
- **D-08:** "결재함" shows documents where user is on the approval line
- **D-09:** "전체" tab visible to ADMIN/SUPER_ADMIN only
- **D-10:** Search and filters operate within the selected tab's scope
- **D-11:** Filters: status dropdown, template type dropdown (all 6 templates), date range
- **D-12:** All filters combine with AND logic
- **D-13:** Template type dropdown shows all 6 templates from TEMPLATE_REGISTRY
- **D-14:** Table columns: title, document number, status, template type, drafter, date
- **D-15:** Search keyword highlighting in results
- **D-16:** Empty result shows "검색 결과가 없습니다" message
- **D-17:** Sort order fixed to newest first (created date descending)
- **D-18:** All state preserved in URL query parameters: tab, search keyword, filters, page
- **D-19:** Browser back/forward and bookmarking fully supported via URL state sync

### Claude's Discretion
- Table column widths and responsive behavior
- Search keyword highlight styling (bold, background color, etc.)
- Exact empty state illustration/icon choice
- Backend query optimization approach (QueryDSL dynamic predicates vs JPA Specifications)

### Deferred Ideas (OUT OF SCOPE)
None
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| SRCH-01 | User can search documents by title, document number, and drafter name | Backend: QueryDSL LIKE predicates with OR logic across 3 fields. Frontend: unified search input. DocumentResponse must be extended with drafterName field. |
| SRCH-02 | User can filter documents by status, date range, and template type | Backend: QueryDSL BooleanBuilder with AND-combined optional predicates. Frontend: filter dropdowns and date pickers following AuditLogFilters pattern. |
</phase_requirements>

## Standard Stack

### Core (already in project)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| QueryDSL | 5.1.0 (jakarta) | Dynamic query building | Already in build.gradle.kts, ideal for multi-criteria optional filtering |
| React Router | 7.13.2 | URL state via `useSearchParams` | Already the routing library; `useSearchParams` provides bidirectional URL-state sync |
| TanStack Query | v5 | Server state management | Already used for all data fetching; queryKey includes filter params for cache separation |
| Axios | existing | HTTP client | Already configured with interceptors |

### Supporting (no new dependencies needed)
This phase requires NO new dependencies. Everything is available in the existing stack.

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| QueryDSL BooleanBuilder | JPA Specifications | Specs are more verbose, less type-safe; QueryDSL already in build |
| QueryDSL BooleanBuilder | JPQL @Query with conditionals | Cannot handle truly dynamic optional predicates without ugly concatenation |
| useSearchParams | Custom URL parsing | useSearchParams is the standard React Router approach, handles encoding |

## Architecture Patterns

### Backend: New Search Endpoint

```
GET /api/v1/documents/search
  ?tab=MY|APPROVAL|ALL          (required, default: MY)
  &keyword=검색어               (optional, LIKE across title/docNumber/drafterName)
  &status=APPROVED              (optional)
  &templateCode=EXPENSE         (optional)
  &startDate=2026-01-01         (optional)
  &endDate=2026-03-31           (optional)
  &page=0                       (default: 0)
  &size=20                      (default: 20)
```

**Why a new endpoint instead of extending `/documents/my`:** The existing `/documents/my` is scoped to drafter-only. The search feature needs three different scopes (my docs, approval box, all) and cross-field keyword search. A dedicated `/documents/search` endpoint is cleaner than overloading the existing endpoint.

### Backend: QueryDSL Repository Pattern

```java
// New custom repository interface
public interface DocumentRepositoryCustom {
    Page<Document> searchDocuments(DocumentSearchCondition condition, Long userId, 
                                   String userRole, Pageable pageable);
}

// Implementation
public class DocumentRepositoryCustomImpl implements DocumentRepositoryCustom {
    private final JPAQueryFactory queryFactory;
    
    // Constructor injection
    
    @Override
    public Page<Document> searchDocuments(DocumentSearchCondition condition, 
                                           Long userId, String userRole, Pageable pageable) {
        QDocument doc = QDocument.document;
        QUser drafter = QUser.user;
        QApprovalLine approvalLine = QApprovalLine.approvalLine;
        
        BooleanBuilder where = new BooleanBuilder();
        
        // Tab scope
        switch (condition.tab()) {
            case MY -> where.and(doc.drafter.id.eq(userId));
            case APPROVAL -> where.and(
                doc.id.in(
                    JPAExpressions.select(approvalLine.document.id)
                        .from(approvalLine)
                        .where(approvalLine.approver.id.eq(userId))
                )
            );
            case ALL -> {
                // ADMIN/SUPER_ADMIN only -- enforced at controller level
            }
        }
        
        // Keyword search (OR across fields)
        if (condition.keyword() != null && !condition.keyword().isBlank()) {
            String kw = "%" + condition.keyword() + "%";
            where.and(
                doc.title.likeIgnoreCase(kw)
                    .or(doc.docNumber.likeIgnoreCase(kw))
                    .or(doc.drafter.name.likeIgnoreCase(kw))
            );
        }
        
        // Filters (AND)
        if (condition.status() != null) where.and(doc.status.eq(condition.status()));
        if (condition.templateCode() != null) where.and(doc.templateCode.eq(condition.templateCode()));
        if (condition.startDate() != null) where.and(doc.createdAt.goe(condition.startDate().atStartOfDay()));
        if (condition.endDate() != null) where.and(doc.createdAt.lt(condition.endDate().plusDays(1).atStartOfDay()));
        
        // Execute with count query for pagination
        List<Document> content = queryFactory
            .selectFrom(doc)
            .leftJoin(doc.drafter, drafter).fetchJoin()
            .where(where)
            .orderBy(doc.createdAt.desc())
            .offset(pageable.getOffset())
            .limit(pageable.getPageSize())
            .fetch();
        
        long total = queryFactory
            .select(doc.count())
            .from(doc)
            .where(where)
            .fetchOne();
        
        return new PageImpl<>(content, pageable, total);
    }
}
```

### Backend: DocumentResponse Must Include Drafter Name

Current `DocumentResponse` record has NO drafter info -- it was designed for "my documents" only. For search results across all users, the response must include drafter name.

**Approach:** Extend `DocumentResponse` with `drafterName` and `drafterDepartmentName` fields:

```java
public record DocumentResponse(
    Long id,
    String docNumber,
    String templateCode,
    String templateName,
    String title,
    String status,
    String drafterName,           // NEW
    String drafterDepartmentName, // NEW
    LocalDateTime createdAt,
    LocalDateTime updatedAt
) {}
```

The MapStruct `DocumentMapper.toResponse()` must be updated to map `document.drafter.name` and `document.drafter.department.name`. Since existing `getMyDocuments` also returns `DocumentResponse`, this is backward-compatible (adds fields to the JSON response).

### Backend: JPAQueryFactory Configuration

QueryDSL's `JPAQueryFactory` needs a Spring bean configuration:

```java
@Configuration
public class QueryDslConfig {
    @Bean
    public JPAQueryFactory jpaQueryFactory(EntityManager em) {
        return new JPAQueryFactory(em);
    }
}
```

### Backend: Q-Class Generation

QueryDSL Q-classes (QDocument, QUser, QApprovalLine) are generated by the annotation processor already configured in `build.gradle.kts`. Running `./gradlew compileJava` generates them to `build/generated/sources/annotationProcessor/`.

### Frontend: URL State Management with useSearchParams

```typescript
// Hook: useDocumentSearchParams.ts
import { useSearchParams } from 'react-router';

interface DocumentSearchState {
  tab: 'MY' | 'APPROVAL' | 'ALL';
  keyword: string;
  status: string;
  templateCode: string;
  startDate: string;
  endDate: string;
  page: number;
}

function useDocumentSearchParams(): [DocumentSearchState, (updates: Partial<DocumentSearchState>) => void] {
  const [searchParams, setSearchParams] = useSearchParams();
  
  const state: DocumentSearchState = {
    tab: (searchParams.get('tab') as DocumentSearchState['tab']) || 'MY',
    keyword: searchParams.get('keyword') || '',
    status: searchParams.get('status') || '',
    templateCode: searchParams.get('templateCode') || '',
    startDate: searchParams.get('startDate') || '',
    endDate: searchParams.get('endDate') || '',
    page: Number(searchParams.get('page')) || 0,
  };
  
  const updateState = (updates: Partial<DocumentSearchState>) => {
    const newParams = new URLSearchParams(searchParams);
    for (const [key, value] of Object.entries(updates)) {
      if (value === '' || value === undefined || value === null || value === 0) {
        newParams.delete(key);
      } else {
        newParams.set(key, String(value));
      }
    }
    // Reset page to 0 when filters change
    if (!('page' in updates)) {
      newParams.delete('page');
    }
    setSearchParams(newParams, { replace: true });
  };
  
  return [state, updateState];
}
```

### Frontend: Search Result Highlighting

```typescript
// Component: HighlightText.tsx
function HighlightText({ text, keyword }: { text: string; keyword: string }) {
  if (!keyword || !text) return <>{text}</>;
  
  const parts = text.split(new RegExp(`(${escapeRegex(keyword)})`, 'gi'));
  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === keyword.toLowerCase() ? (
          <mark key={i} className="bg-yellow-200 dark:bg-yellow-800 rounded px-0.5">
            {part}
          </mark>
        ) : (
          part
        )
      )}
    </>
  );
}
```

### Frontend: Tab Component Pattern

```typescript
// Simple tab bar integrated into DocumentListPage
const TABS = [
  { key: 'MY', label: '내 문서' },
  { key: 'APPROVAL', label: '결재함' },
  { key: 'ALL', label: '전체', adminOnly: true },
] as const;
```

### Recommended Project Structure (changes only)

```
backend/src/main/java/com/micesign/
├── config/
│   └── QueryDslConfig.java            # NEW: JPAQueryFactory bean
├── dto/document/
│   ├── DocumentResponse.java          # MODIFIED: add drafterName fields
│   └── DocumentSearchCondition.java   # NEW: search params DTO
├── repository/
│   ├── DocumentRepository.java        # MODIFIED: extend DocumentRepositoryCustom
│   ├── DocumentRepositoryCustom.java  # NEW: custom search interface
│   └── DocumentRepositoryCustomImpl.java  # NEW: QueryDSL implementation
├── service/
│   └── DocumentService.java           # MODIFIED: add searchDocuments method
├── controller/
│   └── DocumentController.java        # MODIFIED: add search endpoint
└── mapper/
    └── DocumentMapper.java            # MODIFIED: map drafter name

frontend/src/features/document/
├── api/
│   └── documentApi.ts                 # MODIFIED: add searchDocuments API call
├── components/
│   ├── DocumentSearchFilters.tsx      # NEW: filter component
│   ├── DocumentTabs.tsx               # NEW: tab component
│   ├── HighlightText.tsx              # NEW: keyword highlighting
│   └── DocumentListTable.tsx          # MODIFIED: add drafter column, use HighlightText
├── hooks/
│   ├── useDocuments.ts                # MODIFIED: add useSearchDocuments hook
│   └── useDocumentSearchParams.ts     # NEW: URL state management
├── types/
│   └── document.ts                    # MODIFIED: add search types, update DocumentResponse
└── pages/
    └── DocumentListPage.tsx           # MODIFIED: integrate tabs, filters, search
```

### Anti-Patterns to Avoid
- **Multiple separate endpoints for each tab:** Use a single `/documents/search` endpoint with a `tab` parameter, not `/documents/my-search`, `/documents/approval-search`, etc.
- **N+1 queries on drafter:** Always `fetchJoin` the drafter relation in the search query to avoid lazy loading per row.
- **Storing search state in React useState only:** URL must be the single source of truth; `useState` duplicates cause sync bugs.
- **Filtering in Java code post-query:** All filtering must happen in the SQL query, not in the service layer after fetching all documents.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Dynamic query building | Manual JPQL string concatenation | QueryDSL BooleanBuilder | SQL injection risk, type safety, null handling |
| URL state synchronization | Custom window.location parsing | React Router useSearchParams | Handles encoding, history API integration, re-render on change |
| Pagination with dynamic filters | Custom offset/limit logic | Spring Data PageImpl + PageRequest | Consistent with existing pattern, handles edge cases |
| Text highlighting | Manual DOM manipulation | React component with string split | XSS-safe, declarative, handles edge cases in regex |

## Common Pitfalls

### Pitfall 1: LIKE Injection via Keyword
**What goes wrong:** User enters `%` or `_` in search keyword, which are LIKE wildcards in SQL, causing unintended matches.
**Why it happens:** LIKE pattern characters are not escaped before building the query.
**How to avoid:** Escape `%`, `_`, and `\` in the keyword before wrapping with `%keyword%`. QueryDSL's `likeIgnoreCase` does NOT auto-escape these.
**Warning signs:** Searching for `%` returns all documents.

### Pitfall 2: N+1 on Drafter Relation
**What goes wrong:** Each document in the result triggers a separate SQL query to load the drafter's name and department.
**Why it happens:** `Document.drafter` is `FetchType.LAZY`. Without explicit fetch join, accessing `drafter.name` triggers lazy load per row.
**How to avoid:** Use `leftJoin(doc.drafter).fetchJoin()` in the QueryDSL query. Also fetch `drafter.department` if needed.
**Warning signs:** Excessive SQL queries visible in Hibernate log for a single page load.

### Pitfall 3: URL State Race Condition on Page Reset
**What goes wrong:** Changing a filter AND page simultaneously causes the old page number to persist, showing empty results.
**Why it happens:** Filter change should reset page to 0, but if page update is async, the old page stays.
**How to avoid:** When any filter changes, explicitly set page to 0 in the same `setSearchParams` call.
**Warning signs:** After applying a filter that reduces results, you see "no results" even though results exist on page 0.

### Pitfall 4: Tab Permission Enforcement Only on Frontend
**What goes wrong:** Regular USER sends `tab=ALL` directly to the API and sees all documents.
**Why it happens:** Tab permission is only enforced by hiding the UI tab, not on the backend.
**How to avoid:** Backend must check `user.getRole()` when `tab=ALL` is requested and return 403 for non-admin users.
**Warning signs:** Any user can see all documents by modifying URL query params.

### Pitfall 5: QueryDSL Q-Class Not Found
**What goes wrong:** Compilation fails with "cannot find symbol QDocument".
**Why it happens:** Q-classes haven't been generated, or IDE doesn't recognize the generated sources directory.
**How to avoid:** Run `./gradlew compileJava` first. Ensure `build/generated/sources/annotationProcessor/` is marked as a generated source root.
**Warning signs:** Red squiggles on Q-class imports in IDE.

### Pitfall 6: Empty Keyword vs No Keyword
**What goes wrong:** Sending `keyword=""` is treated differently from not sending keyword, causing inconsistent behavior.
**Why it happens:** Backend checks `keyword != null` but not `keyword.isBlank()`.
**How to avoid:** Check both `keyword != null && !keyword.isBlank()` in the condition. Frontend should strip empty string params from URL.
**Warning signs:** Empty search bar produces different results than initial page load.

## Code Examples

### QueryDSL LIKE Escape Helper
```java
// Source: standard practice for LIKE queries
public static String escapeLikePattern(String input) {
    return input
        .replace("\\", "\\\\")
        .replace("%", "\\%")
        .replace("_", "\\_");
}
```

### DocumentSearchCondition DTO
```java
public record DocumentSearchCondition(
    SearchTab tab,
    String keyword,
    DocumentStatus status,
    String templateCode,
    LocalDate startDate,
    LocalDate endDate
) {
    public enum SearchTab { MY, APPROVAL, ALL }
}
```

### Frontend: DocumentResponse Extension
```typescript
// Updated DocumentResponse type
export interface DocumentResponse {
  id: number;
  docNumber: string | null;
  templateCode: string;
  templateName: string;
  title: string;
  status: DocumentStatus;
  drafterName: string;           // NEW
  drafterDepartmentName: string; // NEW
  createdAt: string;
  updatedAt: string;
}
```

### Frontend: Search API Call Pattern
```typescript
// documentApi.ts addition
searchDocuments: (params: DocumentSearchParams) =>
  apiClient.get<ApiResponse<PageResponse<DocumentResponse>>>('/documents/search', { params }),
```

### Frontend: TanStack Query Key Pattern
```typescript
// useSearchDocuments hook
export function useSearchDocuments(params: DocumentSearchParams) {
  return useQuery({
    queryKey: ['documents', 'search', params],
    queryFn: () => documentApi.searchDocuments(params).then((res) => res.data.data!),
    placeholderData: (previousData) => previousData,
  });
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| JPA Criteria API | QueryDSL BooleanBuilder | Stable since 2020 | Much more readable, type-safe dynamic queries |
| Manual URL parsing | useSearchParams (React Router v6+) | React Router v6 (2021) | Built-in URL state management |
| Custom pagination | Spring Data Page + PageImpl | Stable | Consistent server-side pagination |

## Open Questions

1. **Approval box tab - include REFERENCE type?**
   - What we know: D-08 says "documents where user is on the approval line (pending + completed + reference)"
   - What's unclear: The D-08 text explicitly includes reference, so this is clear.
   - Recommendation: Include all approval line types (APPROVE, AGREE, REFERENCE) for the approval box tab.

2. **Should `/documents/my` remain as-is or be deprecated?**
   - What we know: Existing code uses `/documents/my` for the current DocumentListPage.
   - Recommendation: Keep `/documents/my` unchanged for backward compatibility. The new `/documents/search?tab=MY` serves the same purpose but with full search/filter capability. The DocumentListPage will switch to using the search endpoint exclusively.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | JUnit 5 + Spring Boot Test (MockMvc) |
| Config file | `backend/src/test/resources/application-test.yml` |
| Quick run command | `cd backend && JAVA_HOME=$(/usr/libexec/java_home -v 17) ./gradlew test --tests "*DocumentSearch*" -x processTestResources` |
| Full suite command | `cd backend && JAVA_HOME=$(/usr/libexec/java_home -v 17) ./gradlew test -x processTestResources` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SRCH-01 | Keyword search across title/docNumber/drafterName | integration | `./gradlew test --tests "*DocumentSearchTest*keyword*"` | Wave 0 |
| SRCH-01 | Search results respect RBAC (tab scoping) | integration | `./gradlew test --tests "*DocumentSearchTest*tab*"` | Wave 0 |
| SRCH-02 | Filter by status | integration | `./gradlew test --tests "*DocumentSearchTest*status*"` | Wave 0 |
| SRCH-02 | Filter by date range | integration | `./gradlew test --tests "*DocumentSearchTest*date*"` | Wave 0 |
| SRCH-02 | Filter by template type | integration | `./gradlew test --tests "*DocumentSearchTest*template*"` | Wave 0 |
| SRCH-02 | Combined filters with AND logic | integration | `./gradlew test --tests "*DocumentSearchTest*combined*"` | Wave 0 |

### Sampling Rate
- **Per task commit:** `cd backend && JAVA_HOME=$(/usr/libexec/java_home -v 17) ./gradlew test --tests "*DocumentSearch*" -x processTestResources`
- **Per wave merge:** Full backend test suite
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `backend/src/test/java/com/micesign/document/DocumentSearchTest.java` -- integration tests for search endpoint
- [ ] QueryDSL Q-class generation verification (compileJava must succeed)

## Project Constraints (from CLAUDE.md)

- **Tech stack:** Java 17 + Spring Boot 3.x + JPA/Hibernate + QueryDSL (backend), React 18 + TypeScript + Zustand + TanStack Query v5 + TailwindCSS (frontend)
- **Auth:** JWT stateless; use `@AuthenticationPrincipal CustomUserDetails` for user context
- **RBAC:** SUPER_ADMIN, ADMIN, USER -- use `@PreAuthorize` for admin-only features
- **QueryDSL:** Already in build.gradle.kts with jakarta classifier -- requires annotation processor
- **Form templates:** 6 hardcoded templates in TEMPLATE_REGISTRY
- **Existing patterns:** AuditLogFilters/NotificationLogFilters for filter UI; TestTokenHelper + MockMvc + JdbcTemplate cleanup for tests
- **Gradle:** Must use JAVA_HOME pointing to Java 17
- **GSD workflow:** Must use GSD commands for file changes

## Sources

### Primary (HIGH confidence)
- Codebase analysis: DocumentRepository.java, DocumentService.java, DocumentController.java, DocumentListPage.tsx, AuditLogFilters.tsx, NotificationLogFilters.tsx, templateRegistry.ts
- build.gradle.kts: QueryDSL 5.1.0 (jakarta) confirmed in dependencies
- React Router 7.13.2: useSearchParams available (standard API since v6)

### Secondary (MEDIUM confidence)
- QueryDSL BooleanBuilder pattern: well-established pattern for dynamic predicates, widely used with Spring Data JPA
- LIKE escape pattern: standard SQL practice, confirmed QueryDSL does not auto-escape wildcards

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - all libraries already in project, no new dependencies
- Architecture: HIGH - follows established patterns in the codebase (filter UI, repository, controller)
- Pitfalls: HIGH - based on direct codebase analysis (lazy loading on drafter, missing drafter fields in DocumentResponse)

**Research date:** 2026-04-04
**Valid until:** 2026-05-04 (stable stack, no moving targets)

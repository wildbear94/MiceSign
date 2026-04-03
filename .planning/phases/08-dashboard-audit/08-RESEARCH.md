# Phase 8: Dashboard & Audit - Research

**Researched:** 2026-04-03
**Domain:** Dashboard UI + Immutable audit logging (Spring Boot + React)
**Confidence:** HIGH

## Summary

Phase 8 delivers two distinct capabilities: (1) a dashboard home page with badge counts, pending approvals list, and recent documents list, and (2) immutable audit logging for document state changes and key user actions. Both areas are well-understood and build directly on existing code patterns.

The dashboard is primarily a frontend composition task. Existing API endpoints (`/approvals/pending`, `/approvals/completed`, `/documents/my`) already provide most required data. A new summary endpoint (`GET /api/v1/dashboard/summary`) consolidates counts into a single call. The frontend assembles a card-grid layout reusing existing components (TemplateBadge, DocumentStatusBadge, empty state patterns from PendingApprovalsPage).

Audit logging requires a new `AuditLogService` with explicit calls inserted into `DocumentService`, `ApprovalService`, and `AuthController`. The AuditLog entity and repository already exist. The approach is explicit service-layer calls for document/file actions and AOP-based interception for auth events (login/logout). A basic SUPER_ADMIN query UI extends into Phase 1-C scope per D-12.

**Primary recommendation:** Build dashboard backend (summary endpoint) and audit service first, then dashboard frontend, then audit UI last. Reuse existing hooks and API patterns extensively.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Card grid layout -- top row has 3 badge count cards (결재대기, 임시저장, 완료), bottom row has 결재 대기 목록 (left) + 최근 문서 목록 (right) side by side
- **D-02:** Each list shows 5 items max -- full list accessible via existing 결재대기/내문서 pages
- **D-03:** '새 문서 작성' button displayed on dashboard top area for quick access
- **D-04:** Badge counts displayed in both MainNavbar ('결재 대기' link) AND dashboard cards -- navbar badge is a red circle with count number
- **D-05:** Home route (/) renders Dashboard page instead of redirecting to /documents/my
- **D-06:** '대시보드' link added as new tab in MainNavbar navigation (not just logo click)
- **D-07:** When no pending approvals, show encouraging empty state message with icon -- consistent with existing PendingApprovalsPage pattern (ClipboardCheck icon)
- **D-08:** Single summary endpoint: GET /api/v1/dashboard/summary -> { pendingCount, draftCount, completedCount } -- one API call for all badge counts
- **D-09:** TanStack Query refetchInterval of 60 seconds for auto-refresh of counts and lists
- **D-10:** Log these actions: document state changes (create, submit, approve, reject, withdraw) + auth events (login, logout) + file operations (upload, download). Admin CRUD actions deferred to Phase 1-C
- **D-11:** Implementation approach: AOP for auth events (login/logout), explicit service-layer calls for document state changes and file operations
- **D-12:** Include basic audit log query UI for SUPER_ADMIN -- simple list page with filters (action type, user, date range)

### Claude's Discretion
No specific items -- open to standard approaches using existing component patterns.

### Deferred Ideas (OUT OF SCOPE)
- Admin CRUD audit logging (department/position/user management actions) -- deferred to Phase 1-C per PRD phasing
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| DASH-01 | User sees a list of documents pending their approval action | Reuse existing `usePendingApprovals` hook with size=5; dashboard renders compact list |
| DASH-02 | User sees their recent documents with current status | Reuse existing `/documents/my` endpoint with size=5; new `useRecentDocuments` hook |
| DASH-03 | User sees badge counts for pending approvals, in-progress drafts, and completed documents | New `GET /api/v1/dashboard/summary` endpoint with count queries |
| AUD-01 | System records immutable audit log entries for all document state changes and key user actions | New `AuditLogService` + explicit calls in DocumentService/ApprovalService + AOP for auth events |
</phase_requirements>

## Project Constraints (from CLAUDE.md)

- **Tech stack:** Java 17 + Spring Boot 3.x + Spring Security + JWT + JPA/Hibernate + Gradle (backend), React 18 + Vite + TypeScript + Zustand + TanStack Query v5 + TailwindCSS (frontend)
- **Auth:** Stateless JWT with `@AuthenticationPrincipal CustomUserDetails`
- **API pattern:** `ApiResponse<T>` envelope with `success` flag, Spring `Page<T>` for paginated responses
- **Audit log:** Immutable append-only log. Never modify or delete
- **Form templates:** Hardcoded React components per template type
- **i18n:** Translation via `useTranslation` hook, files in `public/locales/`
- **Test pattern:** SpringBootTest + AutoConfigureMockMvc + H2 MariaDB mode + TestTokenHelper

## Standard Stack

### Core (already in project)
| Library | Purpose | Why Standard |
|---------|---------|--------------|
| Spring Boot 3.x + JPA | Backend framework | Already in use throughout project |
| TanStack Query v5 | Server state | Already used for approvals, documents |
| Zustand | Client state | Already used for auth store |
| TailwindCSS | Styling | Already used throughout with dark mode |
| Lucide React | Icons | Already used (ClipboardCheck, LogOut, Settings) |
| Axios | HTTP client | Already configured with interceptors |

### Supporting (no new dependencies needed)
| Library | Purpose | When to Use |
|---------|---------|-------------|
| Spring AOP (`@Aspect`) | Auth event audit logging | Built into Spring Boot -- no additional dependency |
| `RequestContextHolder` | Access HttpServletRequest in service layer | For IP address/user-agent capture in audit logs |

**No new dependencies required.** This phase uses exclusively existing project libraries.

## Architecture Patterns

### Backend: Dashboard Summary Endpoint

```
backend/src/main/java/com/micesign/
  controller/
    DashboardController.java        # GET /api/v1/dashboard/summary
  dto/dashboard/
    DashboardSummaryResponse.java   # record(pendingCount, draftCount, completedCount)
  service/
    DashboardService.java           # Aggregates counts from existing repos
    AuditLogService.java            # Immutable audit log writer
  aspect/
    AuditAspect.java                # AOP for auth event logging
```

### Frontend: Dashboard Feature

```
frontend/src/features/dashboard/
  api/
    dashboardApi.ts                 # API client for summary endpoint
  hooks/
    useDashboard.ts                 # useDashboardSummary, usePendingPreview, useRecentDocuments
  pages/
    DashboardPage.tsx               # Main dashboard page
  components/
    CountCard.tsx                   # Badge count card component
    PendingList.tsx                 # Compact pending approvals list (5 items)
    RecentDocumentsList.tsx         # Compact recent documents list (5 items)
```

### Frontend: Audit Log Feature (SUPER_ADMIN only)

```
frontend/src/features/audit/
  api/
    auditApi.ts                     # API client for audit log queries
  hooks/
    useAuditLogs.ts                 # Query hook with filters
  pages/
    AuditLogPage.tsx                # List page with filters
  types/
    audit.ts                        # AuditLogResponse type
```

### Pattern 1: Dashboard Summary Count Query
**What:** Single endpoint returns all three badge counts via JPA count queries
**When to use:** Dashboard load and 60-second polling

```java
// DashboardController.java
@RestController
@RequestMapping("/api/v1/dashboard")
public class DashboardController {

    @GetMapping("/summary")
    public ApiResponse<DashboardSummaryResponse> getSummary(
            @AuthenticationPrincipal CustomUserDetails user) {
        return ApiResponse.ok(dashboardService.getSummary(user.getUserId()));
    }
}
```

Count queries needed in DashboardService:
- **pendingCount:** Count of ApprovalLines where approver = current user, status = PENDING, document status = SUBMITTED, currentStep matches stepOrder (reuse logic from `findPendingByApproverId`)
- **draftCount:** Count of Documents where drafter = current user, status = DRAFT
- **completedCount:** Count of Documents where drafter = current user, status = APPROVED

### Pattern 2: Explicit Audit Logging in Service Layer
**What:** AuditLogService provides a simple `log()` method called at each document state change point
**When to use:** After document create, submit, approve, reject, withdraw; after file upload/download

```java
// AuditLogService.java
@Service
public class AuditLogService {

    private final AuditLogRepository auditLogRepository;

    public void log(Long userId, String action, String targetType, Long targetId, String detail) {
        AuditLog entry = new AuditLog();
        entry.setUserId(userId);
        entry.setAction(action);
        entry.setTargetType(targetType);
        entry.setTargetId(targetId);
        entry.setDetail(detail);

        // Extract IP and User-Agent from current request context
        try {
            ServletRequestAttributes attrs = (ServletRequestAttributes)
                RequestContextHolder.getRequestAttributes();
            if (attrs != null) {
                HttpServletRequest request = attrs.getRequest();
                entry.setIpAddress(request.getRemoteAddr());
                entry.setUserAgent(request.getHeader("User-Agent"));
            }
        } catch (Exception e) {
            // Non-blocking -- audit log should never fail the main operation
        }

        auditLogRepository.save(entry);
    }
}
```

### Pattern 3: AOP for Auth Event Logging
**What:** Spring AOP aspect intercepts login/logout controller methods to log auth events
**When to use:** Per D-11, auth events use AOP instead of explicit calls

```java
// AuditAspect.java
@Aspect
@Component
public class AuditAspect {

    @AfterReturning(pointcut = "execution(* com.micesign.controller.AuthController.login(..))",
                    returning = "result")
    public void afterLogin(JoinPoint joinPoint, ResponseEntity<?> result) {
        // Extract user info from successful response, log LOGIN action
    }

    @AfterReturning(pointcut = "execution(* com.micesign.controller.AuthController.logout(..))")
    public void afterLogout(JoinPoint joinPoint) {
        // Extract user from security context, log LOGOUT action
    }
}
```

### Pattern 4: TanStack Query with refetchInterval for Dashboard
**What:** Auto-refresh dashboard data every 60 seconds per D-09

```typescript
// useDashboard.ts
export function useDashboardSummary() {
  return useQuery({
    queryKey: ['dashboard', 'summary'],
    queryFn: () => dashboardApi.getSummary().then(res => res.data.data!),
    refetchInterval: 60_000,
  });
}

export function usePendingPreview() {
  return useQuery({
    queryKey: ['approvals', 'pending', 0, 5],
    queryFn: () => approvalApi.getPending({ page: 0, size: 5 }).then(res => res.data.data!),
    refetchInterval: 60_000,
  });
}
```

### Pattern 5: Navbar Badge Count
**What:** Red circle badge on "결재 대기" nav link showing pending count

```typescript
// In MainNavbar.tsx -- use useDashboardSummary() to get pendingCount
// Display badge as:
<span className="absolute -top-1 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
  {count}
</span>
```

The nav link needs `relative` positioning and the badge needs `absolute` positioning.

### Anti-Patterns to Avoid
- **Modifying audit log records:** AuditLog entity has no setters for id/createdAt and @PrePersist handles timestamp. Never expose update/delete operations.
- **Blocking on audit log failures:** Audit logging must never cause the primary operation to fail. Wrap in try-catch or use async.
- **Separate API calls for each count:** D-08 explicitly requires a single summary endpoint for all three counts.
- **Full page queries for dashboard lists:** Dashboard shows only 5 items -- use size=5, not the full paginated list.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Count queries | Raw SQL strings | JPA `@Query` with `COUNT()` or repository `countBy*` methods | Type-safe, consistent with project pattern |
| Request context access | Custom filters/interceptors | `RequestContextHolder.getRequestAttributes()` | Standard Spring mechanism, already thread-safe |
| Auth event interception | Manual calls in AuthController | Spring AOP `@Aspect` with `@AfterReturning` | Per D-11, cleaner separation of concerns |
| Polling/refresh | Custom setInterval | TanStack Query `refetchInterval` | Already in stack, handles background tab, stale data |
| Badge UI | Custom CSS counter | Inline Tailwind with absolute positioning | Consistent with existing Tailwind patterns |

## Common Pitfalls

### Pitfall 1: Audit Log Blocking Main Transaction
**What goes wrong:** If audit log save fails (e.g., DB constraint), it rolls back the main document transaction.
**Why it happens:** Both operations share the same @Transactional boundary.
**How to avoid:** Use try-catch in AuditLogService.log() to swallow exceptions, or use `@Transactional(propagation = Propagation.REQUIRES_NEW)` on the audit method to isolate it. The simpler try-catch approach is sufficient for this scale.
**Warning signs:** Document operations failing with audit_log-related SQL errors.

### Pitfall 2: N+1 Queries in Dashboard Summary
**What goes wrong:** Dashboard summary makes multiple round trips for each count.
**Why it happens:** Using separate repository calls for each count type.
**How to avoid:** This is acceptable for 3 simple COUNT queries. Do NOT over-optimize with a single native query -- the simplicity of 3 `countBy*` methods is more maintainable. At 50 users, 3 count queries per 60 seconds is negligible load.
**Warning signs:** None expected at this scale.

### Pitfall 3: Pending Count Logic Divergence
**What goes wrong:** Dashboard pending count shows a different number than the actual pending approvals list.
**Why it happens:** The count query logic diverges from `findPendingByApproverId` -- missing the `currentStep = stepOrder` condition.
**How to avoid:** Extract the pending count into a dedicated `@Query` method on `ApprovalLineRepository` that mirrors the exact same WHERE clause as `findPendingByApproverId`.
**Warning signs:** Badge shows "3" but list shows only 2 items.

### Pitfall 4: AOP Not Capturing Failed Logins
**What goes wrong:** `@AfterReturning` only fires on successful method returns. Login failures (wrong password, locked account) still return ResponseEntity with error status.
**Why it happens:** AuthController.login() returns ResponseEntity<?> in all cases (success and failure), so @AfterReturning fires for both. Need to inspect the response body to distinguish success from failure.
**How to avoid:** In the AOP aspect, check the response status code or body content before logging. Log both successful and failed login attempts with appropriate action codes (LOGIN_SUCCESS, LOGIN_FAILED).
**Warning signs:** Only successful logins appear in audit log.

### Pitfall 5: Route Change Breaking Existing Bookmarks
**What goes wrong:** Changing `/` from redirect to `/documents/my` to render DashboardPage may break user expectations.
**Why it happens:** Per D-05, home route renders Dashboard instead of redirecting.
**How to avoid:** This is intentional per D-05. Ensure `/documents/my` still works as before (it does -- only the `/` route changes).
**Warning signs:** None -- this is desired behavior.

### Pitfall 6: refetchInterval Running in Background Tabs
**What goes wrong:** TanStack Query v5 by default pauses refetching when the window is not focused.
**Why it happens:** `refetchIntervalInBackground` defaults to `false`.
**How to avoid:** This is actually the desired behavior -- no need to change it. Dashboard updates when user returns to the tab.
**Warning signs:** User reports counts not updating (they will update on tab focus).

## Code Examples

### Dashboard Summary Response DTO

```java
// DashboardSummaryResponse.java
public record DashboardSummaryResponse(
    long pendingCount,
    long draftCount,
    long completedCount
) {}
```

### Count Query for Pending Approvals

```java
// In ApprovalLineRepository.java
@Query("SELECT COUNT(al) FROM ApprovalLine al JOIN al.document d " +
       "WHERE al.approver.id = :userId " +
       "AND al.status = com.micesign.domain.enums.ApprovalLineStatus.PENDING " +
       "AND al.lineType IN (com.micesign.domain.enums.ApprovalLineType.APPROVE, com.micesign.domain.enums.ApprovalLineType.AGREE) " +
       "AND d.status = com.micesign.domain.enums.DocumentStatus.SUBMITTED " +
       "AND d.currentStep = al.stepOrder")
long countPendingByApproverId(@Param("userId") Long userId);
```

### Audit Action Constants

```java
// AuditAction.java -- enum or constants class
public final class AuditAction {
    public static final String DOCUMENT_CREATE = "DOCUMENT_CREATE";
    public static final String DOCUMENT_SUBMIT = "DOCUMENT_SUBMIT";
    public static final String DOCUMENT_APPROVE = "DOCUMENT_APPROVE";
    public static final String DOCUMENT_REJECT = "DOCUMENT_REJECT";
    public static final String DOCUMENT_WITHDRAW = "DOCUMENT_WITHDRAW";
    public static final String LOGIN_SUCCESS = "LOGIN_SUCCESS";
    public static final String LOGIN_FAILED = "LOGIN_FAILED";
    public static final String LOGOUT = "LOGOUT";
    public static final String FILE_UPLOAD = "FILE_UPLOAD";
    public static final String FILE_DOWNLOAD = "FILE_DOWNLOAD";
}
```

### Audit Log Query Endpoint (for SUPER_ADMIN UI per D-12)

```java
// AuditLogController.java
@RestController
@RequestMapping("/api/v1/admin/audit-logs")
@PreAuthorize("hasRole('SUPER_ADMIN')")
public class AuditLogController {

    @GetMapping
    public ApiResponse<Page<AuditLogResponse>> getAuditLogs(
            @RequestParam(required = false) String action,
            @RequestParam(required = false) Long userId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        // Use JPA Specification or @Query with dynamic conditions
    }
}
```

### Dashboard Frontend Type

```typescript
// types/dashboard.ts
export interface DashboardSummary {
  pendingCount: number;
  draftCount: number;
  completedCount: number;
}
```

### Audit Log Filter Query with JPA Specification

```java
// AuditLogSpecification.java
public class AuditLogSpecification {
    public static Specification<AuditLog> withFilters(
            String action, Long userId, LocalDate startDate, LocalDate endDate) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            if (action != null) predicates.add(cb.equal(root.get("action"), action));
            if (userId != null) predicates.add(cb.equal(root.get("userId"), userId));
            if (startDate != null) predicates.add(cb.greaterThanOrEqualTo(root.get("createdAt"), startDate.atStartOfDay()));
            if (endDate != null) predicates.add(cb.lessThan(root.get("createdAt"), endDate.plusDays(1).atStartOfDay()));
            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }
}
```

For this to work, `AuditLogRepository` needs to extend `JpaSpecificationExecutor<AuditLog>`.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | JUnit 5 + Spring Boot Test (MockMvc) + H2 MariaDB mode |
| Config file | `backend/src/test/resources/application-test.yml` |
| Quick run command | `cd backend && ./gradlew test --tests "com.micesign.dashboard.*" -x test` |
| Full suite command | `cd backend && ./gradlew test` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DASH-01 | Pending approvals list on dashboard | integration | `./gradlew test --tests "*.DashboardControllerTest"` | Wave 0 |
| DASH-02 | Recent documents list on dashboard | integration | `./gradlew test --tests "*.DashboardControllerTest"` | Wave 0 |
| DASH-03 | Badge counts (pending, draft, completed) | integration | `./gradlew test --tests "*.DashboardControllerTest"` | Wave 0 |
| AUD-01 | Audit log records for state changes + actions | integration | `./gradlew test --tests "*.AuditLogServiceTest"` | Wave 0 |

### Sampling Rate
- **Per task commit:** `cd backend && ./gradlew test --tests "com.micesign.dashboard.*"` (quick, dashboard-focused)
- **Per wave merge:** `cd backend && ./gradlew test` (full backend suite)
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `backend/src/test/java/com/micesign/dashboard/DashboardControllerTest.java` -- covers DASH-01, DASH-02, DASH-03
- [ ] `backend/src/test/java/com/micesign/dashboard/AuditLogServiceTest.java` -- covers AUD-01 (verify audit entries created)
- [ ] `backend/src/test/java/com/micesign/dashboard/AuditLogControllerTest.java` -- covers D-12 (SUPER_ADMIN query)

## Insertion Points for Audit Logging

These are the exact methods where audit log calls must be inserted:

| Service | Method | Audit Action | Target |
|---------|--------|-------------|--------|
| `DocumentService.createDocument()` | After document save | DOCUMENT_CREATE | DOCUMENT:{id} |
| `DocumentService.submitDocument()` | After status change | DOCUMENT_SUBMIT | DOCUMENT:{id} |
| `ApprovalService.approve()` | After approval save | DOCUMENT_APPROVE | DOCUMENT:{docId} |
| `ApprovalService.reject()` | After rejection save | DOCUMENT_REJECT | DOCUMENT:{docId} |
| `DocumentService.withdrawDocument()` | After withdrawal | DOCUMENT_WITHDRAW | DOCUMENT:{id} |
| `DocumentAttachmentService` (upload method) | After file save | FILE_UPLOAD | DOCUMENT:{docId} |
| `DocumentAttachmentService` (download method) | After file serve | FILE_DOWNLOAD | ATTACHMENT:{id} |
| `AuthController.login()` | Via AOP | LOGIN_SUCCESS/LOGIN_FAILED | USER:{id} |
| `AuthController.logout()` | Via AOP | LOGOUT | USER:{id} |

## Sources

### Primary (HIGH confidence)
- Existing codebase analysis -- all patterns, entities, repositories verified by reading source
- `V1__create_schema.sql` -- audit_log DDL confirmed with indexes
- `AuditLog.java` / `AuditLogRepository.java` -- entity and repo already exist
- `ApprovalLineRepository.findPendingByApproverId` -- exact JPQL for pending logic
- `DocumentRepository` -- existing count/query methods
- `PendingApprovalsPage.tsx` -- existing empty state and table patterns
- `MainNavbar.tsx` -- current nav structure for badge insertion
- `App.tsx` -- current route structure for dashboard route

### Secondary (MEDIUM confidence)
- Spring AOP `@Aspect` / `@AfterReturning` -- standard Spring feature, well-documented
- JPA `JpaSpecificationExecutor` -- standard Spring Data feature for dynamic queries
- TanStack Query `refetchInterval` -- documented v5 feature

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- no new dependencies, all patterns from existing codebase
- Architecture: HIGH -- straightforward composition of existing patterns
- Pitfalls: HIGH -- identified from codebase analysis (query divergence, transaction boundaries)
- Audit logging: HIGH -- entity/table already exist, insertion points clearly mapped

**Research date:** 2026-04-03
**Valid until:** 2026-05-03 (stable -- no external dependency changes)

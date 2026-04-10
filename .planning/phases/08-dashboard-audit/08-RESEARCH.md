# Phase 8: Dashboard & Audit - Research

**Researched:** 2026-04-10
**Domain:** Dashboard verification, audit log gap-filling, admin template management UI
**Confidence:** HIGH

## Summary

Phase 8 is a completeness phase, not a greenfield build. The dashboard (DASH-01/02/03) is already fully implemented with count cards, pending list, recent documents, and 60-second auto-refresh. The audit log infrastructure (AUD-01) exists with `AuditLogService`, `AuditAspect`, and `AuditAction` constants, but several admin operations lack `auditLogService.log()` calls. The template management UI is the only net-new frontend work: a simple admin list page with activate/deactivate toggles.

Research identified exactly which services are missing audit log calls: `UserManagementService` (createUser, updateUser, deactivateUser), `PasswordService` (adminResetPassword), `DepartmentService` (createDepartment, updateDepartment, deactivateDepartment), `PositionService` (createPosition, updatePosition, deactivatePosition), and `TemplateService` (createTemplate, updateTemplate, deactivateTemplate). None of these currently inject or call `AuditLogService`.

**Primary recommendation:** Three work streams -- (1) verify dashboard satisfies requirements as-is, (2) add missing audit log calls to admin services, (3) build template management admin page following existing UserListPage pattern.

<user_constraints>

## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Current dashboard layout is sufficient -- 3 count cards + pending list + recent documents list
- **D-02:** No additional count cards or layout changes needed
- **D-03:** Current list sizes (latest 5 items) and 60-second auto-refresh are adequate
- **D-04:** Focus on finding and filling gaps in audit log calls -- verify ADMIN_USER_EDIT, ADMIN_ORG_EDIT, and any other missing auditLogService.log() calls
- **D-05:** No full audit -- only supplement missing calls. Existing logging for DOC_CREATE/SUBMIT/UPDATE/VIEW/APPROVE/REJECT/WITHDRAW, FILE_UPLOAD/DOWNLOAD, USER_LOGIN/LOGOUT is already in place
- **D-06:** Template management scope is list page with activate/deactivate toggle only -- no full CRUD needed
- **D-07:** Visible to ADMIN and SUPER_ADMIN roles
- **D-08:** Add menu item to AdminSidebar and route in App.tsx. Follow existing admin page patterns

### Claude's Discretion
- Dashboard component details (styling, spacing) -- follow existing DashboardPage patterns
- Audit log gap detection approach
- Template management page layout -- follow existing admin list page patterns

### Deferred Ideas (OUT OF SCOPE)
None.

</user_constraints>

<phase_requirements>

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| DASH-01 | User sees a list of documents pending their approval action | Already implemented: `PendingList` component with `useDashboardSummary` hook. Verify only. |
| DASH-02 | User sees their recent documents with current status | Already implemented: `RecentDocumentsList` component. Verify only. |
| DASH-03 | User sees badge counts for pending approvals, in-progress drafts, and completed documents | Already implemented: 3 `CountCard` components (pending, drafts, completed). Verify only. |
| AUD-01 | System records immutable audit log entries for all document state changes and key user actions | Partially implemented. Document lifecycle + file ops + auth = done. Admin operations (user/dept/position/template edits) = MISSING. |

</phase_requirements>

## Standard Stack

No new libraries needed. This phase uses exclusively existing project infrastructure.

### Core (Already in Project)
| Library | Version | Purpose | Status |
|---------|---------|---------|--------|
| Spring Boot | 3.4.x | Backend framework | In use |
| React 18 | 18.3.x | Frontend framework | In use |
| TanStack Query v5 | 5.x | Server state / data fetching | In use |
| Zustand | 5.x | Client state | In use |
| TailwindCSS | 3.4.x | Styling | In use |
| lucide-react | latest | Icons | In use |
| react-i18next | latest | i18n | In use |

**Installation:** None required. All dependencies already present. [VERIFIED: codebase inspection]

## Architecture Patterns

### Existing Patterns to Follow (No New Patterns)

#### Pattern 1: Admin List Page (for TemplateListPage)
**What:** Header + table + optional pagination, wrapped in AdminLayout
**Reference:** `UserListPage.tsx` -- state for filters, `useQuery` hook for data, table component
**Example structure:**
```typescript
// Source: frontend/src/features/admin/pages/UserListPage.tsx [VERIFIED: codebase]
export default function TemplateListPage() {
  const { data, isLoading } = useTemplateList();
  return (
    <div>
      <h1 className="text-2xl font-semibold ...">양식 관리</h1>
      <TemplateTable templates={data} isLoading={isLoading} />
    </div>
  );
}
```

#### Pattern 2: Audit Log Service Call
**What:** Append-only audit entry via `auditLogService.log(userId, action, targetType, targetId, detail)`
**Reference:** `DocumentService.java` lines 148, 192, 220, 311, 375
**Example:**
```java
// Source: backend/src/main/java/com/micesign/service/DocumentService.java [VERIFIED: codebase]
auditLogService.log(userId, AuditAction.DOC_CREATE, "DOCUMENT", document.getId(), detail);
```

#### Pattern 3: AdminSidebar Nav Item
**What:** Add object to `navItems` array with `to`, `icon`, `labelKey` properties
**Reference:** `AdminSidebar.tsx` line 17-24
**Example:**
```typescript
// Source: frontend/src/features/admin/components/AdminSidebar.tsx [VERIFIED: codebase]
{ to: '/admin/templates', icon: FileText, labelKey: 'sidebar.templates' }
```

#### Pattern 4: Toggle with Confirmation Dialog
**What:** Click toggle -> show confirm dialog -> API call on confirm -> invalidate query -> success toast
**Reference:** Position deactivation flow from Phase 3 (two-state flow)
**State machine:** IDLE -> CONFIRMING -> PROCESSING -> IDLE (with success/error)

### Anti-Patterns to Avoid
- **Don't rebuild dashboard:** D-01/D-02/D-03 confirm existing implementation is sufficient. Verify, don't rebuild.
- **Don't add audit logging via AOP for admin ops:** Existing `AuditAspect` handles login/logout only. Admin audit calls should be explicit in the service methods (like DocumentService does) for clarity and precise detail payloads. [ASSUMED]
- **Don't add pagination to template list:** Template count is small (3-6 items per D-06). No pagination needed.

## Audit Log Gap Analysis

### Currently Logged (No Changes Needed) [VERIFIED: codebase grep]

| Action | Service | Status |
|--------|---------|--------|
| DOC_CREATE | DocumentService | Done |
| DOC_SUBMIT | DocumentService | Done |
| DOC_UPDATE | DocumentService | Done |
| DOC_VIEW | DocumentService | Done |
| DOC_APPROVE | ApprovalService | Done |
| DOC_REJECT | ApprovalService | Done |
| DOC_WITHDRAW | DocumentService | Done |
| FILE_UPLOAD | DocumentAttachmentService | Done |
| FILE_DOWNLOAD | DocumentAttachmentService | Done |
| USER_LOGIN | AuditAspect | Done |
| USER_LOGOUT | AuditAspect | Done |

### Missing Audit Log Calls (Must Add) [VERIFIED: codebase grep -- no auditLogService in these files]

| Service | Methods Missing Audit | Audit Action | Target Type |
|---------|-----------------------|--------------|-------------|
| UserManagementService | createUser | ADMIN_USER_EDIT | USER |
| UserManagementService | updateUser | ADMIN_USER_EDIT | USER |
| UserManagementService | deactivateUser | ADMIN_USER_EDIT | USER |
| PasswordService | adminResetPassword | ADMIN_USER_EDIT | USER |
| DepartmentService | createDepartment | ADMIN_ORG_EDIT | DEPARTMENT |
| DepartmentService | updateDepartment | ADMIN_ORG_EDIT | DEPARTMENT |
| DepartmentService | deactivateDepartment | ADMIN_ORG_EDIT | DEPARTMENT |
| PositionService | createPosition | ADMIN_ORG_EDIT | POSITION |
| PositionService | updatePosition | ADMIN_ORG_EDIT | POSITION |
| PositionService | deactivatePosition | ADMIN_ORG_EDIT | POSITION |
| TemplateService | createTemplate | ADMIN_ORG_EDIT | TEMPLATE |
| TemplateService | updateTemplate | ADMIN_ORG_EDIT | TEMPLATE |
| TemplateService | deactivateTemplate | ADMIN_ORG_EDIT | TEMPLATE |

**Implementation pattern:** Each service needs:
1. Inject `AuditLogService` via constructor
2. Add `auditLogService.log()` call after successful mutation
3. Include meaningful detail (e.g., `Map.of("action", "create", "name", user.getName())`)

**Challenge:** Some service methods (DepartmentService, PositionService) don't currently receive the acting user's ID. The controllers using `@AuthenticationPrincipal` have access, so audit logging may need to happen at the controller level or userId needs to be passed down. [VERIFIED: DepartmentService.createDepartment takes only CreateDepartmentRequest, no userId parameter]

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Toggle switch component | Custom CSS toggle | Inline Tailwind toggle per UI-SPEC | UI-SPEC provides exact classes |
| Confirmation dialog | New dialog component | Existing `ConfirmDialog` from Phase 3 | Already handles focus trap, ESC, a11y |
| Data fetching | Manual fetch + state | TanStack Query hooks | Existing pattern with cache invalidation |
| i18n | Hardcoded Korean strings | `admin.json` translation keys | Established i18n pattern |

## Common Pitfalls

### Pitfall 1: Missing userId in Service Methods
**What goes wrong:** DepartmentService, PositionService, and TemplateService mutation methods don't accept userId parameter, making it impossible to log who performed the action.
**Why it happens:** These services were built before audit logging was prioritized.
**How to avoid:** Either (a) add userId parameter to service methods, or (b) add audit logging at controller level where `@AuthenticationPrincipal` provides the userId. Option (b) is simpler and avoids service method signature changes, but option (a) is more consistent with DocumentService pattern.
**Warning signs:** Audit log entries with null userId.

### Pitfall 2: Transaction Propagation for Audit Logs
**What goes wrong:** If audit logging participates in the same transaction as the business operation and the business operation rolls back, the audit log entry is also lost.
**Why it happens:** Default Spring transaction propagation is REQUIRED (join existing).
**How to avoid:** `AuditLogService.log()` already uses `Propagation.REQUIRES_NEW` -- this is handled. Just ensure callers don't wrap audit calls in try/catch that swallows the new transaction. [VERIFIED: AuditLogService line 44]

### Pitfall 3: Dashboard Verification Scope Creep
**What goes wrong:** Developer starts "verifying" dashboard and ends up refactoring or adding features.
**Why it happens:** The dashboard already works; verification is about confirming behavior matches requirements.
**How to avoid:** Verification = manual testing checklist only. No code changes to dashboard unless a clear bug is found.

### Pitfall 4: Template Activate vs Update API Confusion
**What goes wrong:** Deactivate uses `DELETE /api/v1/admin/templates/{id}` (which sets isActive=false), but activate uses `PUT /api/v1/admin/templates/{id}` with `{ isActive: true }`.
**Why it happens:** Different HTTP methods for semantically similar operations (toggle active state).
**How to avoid:** The UI-SPEC already documents this clearly. Frontend code must use the correct method for each direction.
**Warning signs:** 405 Method Not Allowed errors.

## Code Examples

### Adding Audit Log to a Service (Pattern)
```java
// Source: Derived from DocumentService pattern [VERIFIED: codebase]
@Service
public class DepartmentService {
    private final AuditLogService auditLogService; // ADD: inject

    // In createDepartment:
    auditLogService.log(userId, AuditAction.ADMIN_ORG_EDIT, "DEPARTMENT",
            department.getId(), Map.of("action", "create", "name", department.getName()));
}
```

### Template List React Query Hook
```typescript
// Source: Derived from useUserList pattern [VERIFIED: codebase]
export function useTemplateList() {
  return useQuery({
    queryKey: ['admin', 'templates'],
    queryFn: () => adminTemplateApi.list().then(res => res.data.data!),
  });
}
```

### Toggle Mutation Hook
```typescript
// Source: Derived from existing mutation patterns [VERIFIED: codebase patterns]
export function useToggleTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, isActive }: { id: number; isActive: boolean }) =>
      isActive
        ? adminTemplateApi.update(id, { isActive: true })
        : adminTemplateApi.deactivate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'templates'] });
    },
  });
}
```

## State of the Art

No technology changes relevant to this phase. All patterns are established within the codebase.

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| N/A | N/A | N/A | N/A |

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | JUnit 5 + Spring Boot Test (backend), no frontend tests |
| Config file | `backend/build.gradle` (test dependencies) |
| Quick run command | `cd backend && ./gradlew test --tests "com.micesign.*"` |
| Full suite command | `cd backend && ./gradlew test` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DASH-01 | Pending approval list on dashboard | manual-only | Manual: navigate to / and verify pending list | N/A (existing, verify only) |
| DASH-02 | Recent documents on dashboard | manual-only | Manual: navigate to / and verify recent docs | N/A (existing, verify only) |
| DASH-03 | Badge counts display | manual-only | Manual: verify 3 count cards show correct numbers | N/A (existing, verify only) |
| AUD-01 | Admin operations logged in audit_log table | integration | `./gradlew test --tests "com.micesign.admin.*"` | Needs Wave 0 |

### Wave 0 Gaps
- [ ] `backend/src/test/java/com/micesign/admin/AuditLogGapTest.java` -- verify admin operations produce audit log entries
- [ ] Template management page has no frontend tests (consistent with project -- no frontend test infrastructure exists)

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Admin audit calls should be explicit in service methods rather than AOP | Anti-Patterns | Low -- AOP would also work but explicit is clearer |
| A2 | ConfirmDialog component from Phase 3 is reusable for toggle confirmation | Don't Hand-Roll | Low -- if missing, inline confirm dialog is simple to build |

## Open Questions

1. **userId propagation for DepartmentService/PositionService**
   - What we know: These services don't accept userId in mutation methods
   - What's unclear: Whether to add userId parameter or log at controller level
   - Recommendation: Add userId parameter to service methods for consistency with DocumentService pattern. Minor signature change, but clean.

## Sources

### Primary (HIGH confidence)
- Codebase inspection of all service files for `auditLogService` usage
- `AuditAction.java` -- all defined audit action constants
- `AuditLogService.java` -- transaction propagation and method signatures
- `DashboardService.java` + `DashboardPage.tsx` -- existing dashboard implementation
- `AdminSidebar.tsx` -- nav item pattern
- `UserListPage.tsx` -- admin list page pattern
- `AdminTemplateController.java` -- existing template admin endpoints
- `TemplateService.java` -- activate/deactivate logic
- `08-UI-SPEC.md` -- visual and interaction contracts

### Secondary (MEDIUM confidence)
- None needed -- all findings verified against codebase

### Tertiary (LOW confidence)
- None

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- no new dependencies, all existing
- Architecture: HIGH -- all patterns verified in existing codebase
- Pitfalls: HIGH -- audit log gaps verified by grep, transaction behavior verified in code
- Audit gap analysis: HIGH -- exhaustive grep of `auditLogService` across all backend services

**Research date:** 2026-04-10
**Valid until:** 2026-05-10 (stable -- no external dependency changes)

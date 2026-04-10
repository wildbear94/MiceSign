---
phase: 08-dashboard-audit
reviewed: 2026-04-10T12:00:00Z
depth: standard
files_reviewed: 19
files_reviewed_list:
  - backend/src/main/java/com/micesign/common/AuditAction.java
  - backend/src/main/java/com/micesign/controller/AdminTemplateController.java
  - backend/src/main/java/com/micesign/controller/DepartmentController.java
  - backend/src/main/java/com/micesign/controller/PositionController.java
  - backend/src/main/java/com/micesign/service/DepartmentService.java
  - backend/src/main/java/com/micesign/service/PasswordService.java
  - backend/src/main/java/com/micesign/service/PositionService.java
  - backend/src/main/java/com/micesign/service/TemplateService.java
  - backend/src/main/java/com/micesign/service/UserManagementService.java
  - backend/src/test/java/com/micesign/admin/AuditLogGapTest.java
  - backend/src/test/java/com/micesign/admin/DepartmentServiceTest.java
  - backend/src/test/java/com/micesign/admin/UserManagementServiceTest.java
  - frontend/public/locales/ko/admin.json
  - frontend/src/App.tsx
  - frontend/src/features/admin/api/templateApi.ts
  - frontend/src/features/admin/components/AdminSidebar.tsx
  - frontend/src/features/admin/components/TemplateTable.tsx
  - frontend/src/features/admin/hooks/useTemplates.ts
  - frontend/src/features/admin/pages/TemplateListPage.tsx
findings:
  critical: 0
  warning: 5
  info: 3
  total: 8
status: issues_found
---

# Phase 08: Code Review Report

**Reviewed:** 2026-04-10T12:00:00Z
**Depth:** standard
**Files Reviewed:** 19
**Status:** issues_found

## Summary

Reviewed 19 files spanning backend services (department, position, template, user management, password), controllers, tests, and frontend template management UI. The codebase is generally well-structured with consistent RBAC enforcement, proper audit logging, and good input validation. Key concerns are: (1) missing audit log for password change and account unlock operations, (2) template audit actions use a generic `ADMIN_ORG_EDIT` action instead of a dedicated action, (3) frontend template toggle uses asymmetric API calls (PUT for activate, DELETE for deactivate) which may cause unintended data changes, and (4) the `AdminTemplateController` uses a backward-compat method returning `TemplateResponse` instead of the richer `AdminTemplateResponse`.

## Warnings

### WR-01: Missing audit log for password change and account unlock

**File:** `backend/src/main/java/com/micesign/service/PasswordService.java:90`
**Issue:** The `changePassword` method (line 90) does not write an audit log entry after a successful password change. Similarly, `unlockAccount` (line 185) does not log the unlock action. Per the project's audit requirements (AUD-01), all security-sensitive operations should be logged. Admin password reset correctly logs at line 176, but these two operations are missing coverage.
**Fix:** Add audit log calls after successful operations:
```java
// In changePassword, after line 128 (userRepository.save):
auditLogService.log(userId, AuditAction.ADMIN_USER_EDIT, "USER", userId,
        Map.of("action", "passwordChange"));

// In unlockAccount, after line 203 (userRepository.save):
auditLogService.log(adminUserId, AuditAction.ADMIN_USER_EDIT, "USER", targetUserId,
        Map.of("action", "unlockAccount"));
```

### WR-02: Template operations use generic ADMIN_ORG_EDIT audit action

**File:** `backend/src/main/java/com/micesign/service/TemplateService.java:202`
**Issue:** Template create (line 202), update (line 254), and deactivate (line 274) all log with `AuditAction.ADMIN_ORG_EDIT` and target type `"TEMPLATE"`. While the target type differentiates them, using `ADMIN_ORG_EDIT` for template operations conflates organizational structure changes with template management. This makes audit log filtering and reporting less precise. The `AuditAction` class (line 32-33) only defines `ADMIN_USER_EDIT` and `ADMIN_ORG_EDIT`.
**Fix:** Add a dedicated action constant to `AuditAction.java`:
```java
public static final String ADMIN_TEMPLATE_EDIT = "ADMIN_TEMPLATE_EDIT";
```
Then update all `TemplateService` audit calls to use `AuditAction.ADMIN_TEMPLATE_EDIT`.

### WR-03: Frontend template toggle uses asymmetric API calls

**File:** `frontend/src/features/admin/hooks/useTemplates.ts:14`
**Issue:** The `useToggleTemplate` mutation (line 14) activates a template via `PUT /{id}` with `{ isActive: true }` but deactivates via `DELETE /{id}`. The PUT endpoint (`AdminTemplateController.updateTemplate`) accepts an `UpdateTemplateRequest` with `@Valid` annotation, but only `{ isActive: true }` is sent -- this may fail validation if `UpdateTemplateRequest` has required fields (e.g., name). Meanwhile, DELETE calls `deactivateTemplate` which only sets `active=false`. The asymmetry means re-activation sends a partial update through a general-purpose update endpoint.
**Fix:** Either create a dedicated `PATCH /{id}/activate` endpoint for re-activation (consistent with the deactivation pattern used for departments/positions), or ensure the PUT payload includes all required fields from `UpdateTemplateRequest`.

### WR-04: AdminTemplateController.updateTemplate ignores acting user for audit

**File:** `backend/src/main/java/com/micesign/controller/AdminTemplateController.java:52-57`
**Issue:** The `updateTemplate` endpoint (line 52) injects `@AuthenticationPrincipal CustomUserDetails user` but never passes the user ID to `templateService.updateTemplate(id, request)`. It calls the 2-param backward-compat overload which internally calls the 3-param version with `userId=null` (TemplateService line 217). This means template updates are NOT audit logged (TemplateService line 253 checks `if (userId != null)` before logging).
**Fix:** Pass the user ID to the service:
```java
TemplateDetailResponse response = templateService.updateTemplate(id, request, user.getUserId());
```
Note: The return type would need to handle the `AdminTemplateDetailResponse` if using the 3-param overload directly, or add a new overload that accepts userId and returns `TemplateDetailResponse`.

### WR-05: Deactivating a department does not check for active users

**File:** `backend/src/main/java/com/micesign/service/DepartmentService.java:132-146`
**Issue:** The `deactivateDepartment` method checks for active child departments (line 137) but does NOT check whether the department has active users assigned to it. If a department with active users is deactivated, those users will reference an inactive department, potentially causing issues in approval line selection and user management views. The position deactivation (PositionService line 107-109) correctly blocks deactivation when active users exist.
**Fix:** Add an active user check before deactivation:
```java
long activeUsers = userRepository.countByDepartmentIdAndStatus(id, UserStatus.ACTIVE);
if (activeUsers > 0) {
    throw new BusinessException("ORG_HAS_ACTIVE_USERS", "활성 사용자가 있어 비활성화할 수 없습니다.");
}
```

## Info

### IN-01: AdminSidebar uses hardcoded Korean text

**File:** `frontend/src/features/admin/components/AdminSidebar.tsx:34`
**Issue:** The "back to dashboard" link text on line 34 and line 93 uses hardcoded Korean string `"대시보드로 돌아가기"` instead of using the i18n `t()` function, which is inconsistent with the rest of the sidebar that properly uses translation keys.
**Fix:** Add a translation key (e.g., `sidebar.backToDashboard`) to `admin.json` and use `t('sidebar.backToDashboard')` instead.

### IN-02: PositionService.reorderPositions lacks audit logging

**File:** `backend/src/main/java/com/micesign/service/PositionService.java:92-99`
**Issue:** The `reorderPositions` method does not log an audit entry, unlike create/update/deactivate operations in the same service. While reordering is lower-risk, it is still a mutation operation on organizational data.
**Fix:** Add an audit log call with the acting user ID (requires adding `@AuthenticationPrincipal` to the controller endpoint as well, since `PositionController.reorderPositions` on line 49 does not currently extract the user).

### IN-03: AdminTemplateController returns TemplateResponse instead of AdminTemplateResponse

**File:** `backend/src/main/java/com/micesign/controller/AdminTemplateController.java:31`
**Issue:** The `listAllTemplates` endpoint returns `List<TemplateResponse>` via `templateService.getAllTemplates()`, but the service also has `listAllTemplates()` which returns `List<AdminTemplateResponse>` with richer data (schemaVersion, isCustom, category, icon, budgetEnabled, timestamps). The admin UI may benefit from the additional fields.
**Fix:** Consider updating the controller to use `templateService.listAllTemplates()` with `AdminTemplateResponse` if the admin frontend needs those fields.

---

_Reviewed: 2026-04-10T12:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_

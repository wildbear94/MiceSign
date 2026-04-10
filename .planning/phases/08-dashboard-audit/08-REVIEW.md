---
phase: 08-dashboard-audit
reviewed: 2026-04-10T14:30:00Z
depth: standard
files_reviewed: 21
files_reviewed_list:
  - backend/src/main/java/com/micesign/common/AuditAction.java
  - backend/src/main/java/com/micesign/controller/AdminTemplateController.java
  - backend/src/main/java/com/micesign/controller/DepartmentController.java
  - backend/src/main/java/com/micesign/controller/PositionController.java
  - backend/src/main/java/com/micesign/service/AuthService.java
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
  - backend/src/main/java/com/micesign/domain/AuditLog.java
findings:
  critical: 1
  warning: 8
  info: 5
  total: 14
status: issues_found
---

# Phase 08: Code Review Report

**Reviewed:** 2026-04-10T14:30:00Z
**Depth:** standard
**Files Reviewed:** 21
**Status:** issues_found

## Summary

This report covers both the original 08-01/08-02 findings (19 files) and the new 08-03 gap-closure work adding USER_LOGIN and USER_LOGOUT audit logging to `AuthService.java` with integration tests in `AuditLogGapTest.java`.

The new authentication audit logging is structurally sound — it uses the correct `AuditAction` constants, writes to the correct repository, and the integration tests cover both login and logout paths. However, one critical issue was found: the login audit detail field is constructed via unsafe string concatenation that does not escape the email value, creating a JSON injection vector into the immutable audit log. Additionally, the pre-existing `handleFailedLogin` method uses a raw string `"ACCOUNT_LOCKED"` that has no matching constant in `AuditAction`, leaving an orphaned action in the audit log that cannot be queried by constant.

The logout test's cookie extraction is fragile and should be replaced with the MockMvc native cookie API.

---

## Critical Issues

### CR-01: JSON injection in USER_LOGIN audit log detail via unescaped email

**File:** `backend/src/main/java/com/micesign/service/AuthService.java:114`
**Issue:** The `detail` field for the USER_LOGIN audit entry is built by string concatenation. The `deviceInfo` field is partially escaped (`replace("\"", "\\\"")`) but the `user.getEmail()` value is inserted raw with no escaping:

```java
loginAudit.setDetail("{\"email\":\"" + user.getEmail() + "\",\"deviceInfo\":\"" + ...);
```

A user email containing a `"` character (which can occur in quoted local-parts per RFC 5321, e.g., `"john.doe"@example.com`) would break the JSON structure in the immutable audit log. Since audit logs are never corrected or deleted, a malformed entry is permanent and may cause JSON parsing failures in the audit log viewer.

**Fix:** Use `ObjectMapper` (already on the classpath via Jackson) or at minimum apply the same escaping as `deviceInfo`:
```java
// Option A — use Jackson (recommended)
String detail = objectMapper.writeValueAsString(Map.of(
    "email", user.getEmail(),
    "deviceInfo", deviceInfo != null ? deviceInfo : ""
));
loginAudit.setDetail(detail);

// Option B — minimal inline escaping (acceptable)
loginAudit.setDetail("{\"email\":\"" + user.getEmail().replace("\"", "\\\"")
    + "\",\"deviceInfo\":\"" + (deviceInfo != null ? deviceInfo.replace("\"", "\\\"") : "")
    + "\"}");
```

---

## Warnings

### WR-01: handleFailedLogin uses raw string "ACCOUNT_LOCKED" — no matching AuditAction constant

**File:** `backend/src/main/java/com/micesign/service/AuthService.java:232`
**Issue:** The lockout audit log uses a hardcoded string literal `"ACCOUNT_LOCKED"` that does not exist in `AuditAction.java`. All other audit calls in `AuthService` use `AuditAction.USER_LOGIN` and `AuditAction.USER_LOGOUT` constants. This means:
1. The `ACCOUNT_LOCKED` action is unqueryable via the `AuditAction` API.
2. A typo in the string will silently produce an incorrect action value.
3. The `AuditLog.action` column is `length=50`, so the value fits, but it's inconsistent with the project's approach.

**Fix:** Add the constant to `AuditAction.java` and use it:
```java
// In AuditAction.java
public static final String ACCOUNT_LOCKED = "ACCOUNT_LOCKED";

// In AuthService.java line 232
auditLog.setAction(AuditAction.ACCOUNT_LOCKED);
```

### WR-02: Missing audit log for password change and account unlock

**File:** `backend/src/main/java/com/micesign/service/PasswordService.java:90`
**Issue:** The `changePassword` method does not write an audit log entry after a successful password change. Similarly, `unlockAccount` does not log the unlock action. Per the project's audit requirements (AUD-01), all security-sensitive operations should be logged. Admin password reset correctly logs, but these two operations are missing coverage.
**Fix:** Add audit log calls after successful operations:
```java
// In changePassword, after userRepository.save:
auditLogService.log(userId, AuditAction.ADMIN_USER_EDIT, "USER", userId,
        Map.of("action", "passwordChange"));

// In unlockAccount, after userRepository.save:
auditLogService.log(adminUserId, AuditAction.ADMIN_USER_EDIT, "USER", targetUserId,
        Map.of("action", "unlockAccount"));
```

### WR-03: Template operations use generic ADMIN_ORG_EDIT audit action

**File:** `backend/src/main/java/com/micesign/service/TemplateService.java:202`
**Issue:** Template create, update, and deactivate all log with `AuditAction.ADMIN_ORG_EDIT` and target type `"TEMPLATE"`. Using `ADMIN_ORG_EDIT` for template operations conflates organizational structure changes with template management, making audit log filtering less precise.
**Fix:** Add a dedicated action constant to `AuditAction.java`:
```java
public static final String ADMIN_TEMPLATE_EDIT = "ADMIN_TEMPLATE_EDIT";
```
Then update all `TemplateService` audit calls to use `AuditAction.ADMIN_TEMPLATE_EDIT`.

### WR-04: Frontend template toggle uses asymmetric API calls

**File:** `frontend/src/features/admin/hooks/useTemplates.ts:14`
**Issue:** The `useToggleTemplate` mutation activates a template via `PUT /{id}` with `{ isActive: true }` but deactivates via `DELETE /{id}`. The PUT endpoint accepts an `UpdateTemplateRequest` with `@Valid` annotation, but only `{ isActive: true }` is sent — this may fail validation if `UpdateTemplateRequest` has required fields (e.g., name). The asymmetry means re-activation sends a partial update through a general-purpose update endpoint.
**Fix:** Either create a dedicated `PATCH /{id}/activate` endpoint for re-activation (consistent with the deactivation pattern used for departments/positions), or ensure the PUT payload includes all required fields from `UpdateTemplateRequest`.

### WR-05: AdminTemplateController.updateTemplate ignores acting user for audit

**File:** `backend/src/main/java/com/micesign/controller/AdminTemplateController.java:52-57`
**Issue:** The `updateTemplate` endpoint injects `@AuthenticationPrincipal CustomUserDetails user` but never passes the user ID to `templateService.updateTemplate(id, request)`. It calls the 2-param backward-compat overload which internally calls the 3-param version with `userId=null`. This means template updates are NOT audit logged (TemplateService checks `if (userId != null)` before logging).
**Fix:** Pass the user ID to the service:
```java
TemplateDetailResponse response = templateService.updateTemplate(id, request, user.getUserId());
```

### WR-06: Deactivating a department does not check for active users

**File:** `backend/src/main/java/com/micesign/service/DepartmentService.java:132-146`
**Issue:** The `deactivateDepartment` method checks for active child departments but does NOT check whether the department has active users assigned to it. If a department with active users is deactivated, those users will reference an inactive department, potentially causing issues in approval line selection and user management views. The position deactivation correctly blocks deactivation when active users exist.
**Fix:** Add an active user check before deactivation:
```java
long activeUsers = userRepository.countByDepartmentIdAndStatus(id, UserStatus.ACTIVE);
if (activeUsers > 0) {
    throw new BusinessException("ORG_HAS_ACTIVE_USERS", "활성 사용자가 있어 비활성화할 수 없습니다.");
}
```

### WR-07: logout_producesAuditLog test parses Set-Cookie header manually — fragile

**File:** `backend/src/test/java/com/micesign/admin/AuditLogGapTest.java:184-193`
**Issue:** The test manually splits the `Set-Cookie` header string on `";"` to extract the refresh token value. This approach is brittle: it relies on the cookie value appearing first in the header string (before attributes like `HttpOnly`, `Secure`, `Path=/`), and it does not URL-decode the value. If cookie serialization changes (e.g., a `=` in the value, though unlikely for UUID), the parser would silently produce a wrong token value and the logout would fail with a non-obvious error.

**Fix:** Use MockMvc's native cookie API instead:
```java
// Replace lines 184-194 with:
jakarta.servlet.http.Cookie[] cookies = loginResult.getResponse().getCookies();
String refreshToken = Arrays.stream(cookies)
    .filter(c -> "refreshToken".equals(c.getName()))
    .map(jakarta.servlet.http.Cookie::getValue)
    .findFirst()
    .orElse(null);
assertThat(refreshToken).isNotNull();
```

### WR-08: USER_LOGOUT audit detail contains no contextual information

**File:** `backend/src/main/java/com/micesign/service/AuthService.java:214`
**Issue:** The logout audit `detail` is `{"action":"logout"}`, which provides no forensic value beyond the `action` column itself. The `stored.getDeviceInfo()` is available at the point of logging (line 205 captures `stored`'s data before deletion) but is not included. Compare with the login detail which captures both email and deviceInfo.

**Fix:**
```java
logoutAudit.setDetail("{\"action\":\"logout\",\"deviceInfo\":\""
    + (deviceInfo != null ? deviceInfo.replace("\"", "\\\"") : "")
    + "\"}");
```
Or use Jackson `ObjectMapper` for safe serialization (see CR-01 fix).

---

## Info

### IN-01: AdminSidebar uses hardcoded Korean text

**File:** `frontend/src/features/admin/components/AdminSidebar.tsx:34`
**Issue:** The "back to dashboard" link text uses hardcoded Korean string `"대시보드로 돌아가기"` instead of the i18n `t()` function, inconsistent with the rest of the sidebar.
**Fix:** Add a translation key (e.g., `sidebar.backToDashboard`) to `admin.json` and use `t('sidebar.backToDashboard')` instead.

### IN-02: PositionService.reorderPositions lacks audit logging

**File:** `backend/src/main/java/com/micesign/service/PositionService.java:92-99`
**Issue:** The `reorderPositions` method does not log an audit entry, unlike create/update/deactivate operations in the same service. While reordering is lower-risk, it is still a mutation operation on organizational data.
**Fix:** Add an audit log call with the acting user ID (requires adding `@AuthenticationPrincipal` to the controller endpoint as well, since `PositionController.reorderPositions` does not currently extract the user).

### IN-03: AdminTemplateController returns TemplateResponse instead of AdminTemplateResponse

**File:** `backend/src/main/java/com/micesign/controller/AdminTemplateController.java:31`
**Issue:** The `listAllTemplates` endpoint returns `List<TemplateResponse>` via `templateService.getAllTemplates()`, but the service also has `listAllTemplates()` which returns `List<AdminTemplateResponse>` with richer data (schemaVersion, isCustom, category, icon, budgetEnabled, timestamps). The admin UI may benefit from the additional fields.
**Fix:** Consider updating the controller to use `templateService.listAllTemplates()` with `AdminTemplateResponse` if the admin frontend needs those fields.

### IN-04: login_producesAuditLog test relies on implicit seed data with no reference

**File:** `backend/src/test/java/com/micesign/admin/AuditLogGapTest.java:149`
**Issue:** The test uses hardcoded credentials `"admin@micesign.com"` / `"admin1234!"` which must exist as a seed record in the test database profile. This creates an implicit dependency that is not visible in the test class itself. If the seed changes, this test will fail with a non-obvious 401 rather than a clear setup error.
**Fix:** Add a comment referencing the seed file location:
```java
// Credentials from src/test/resources/data-test.sql — admin seed user
LoginRequest loginRequest = new LoginRequest("admin@micesign.com", "admin1234!", false);
```
Or better, use `TestTokenHelper.createUserAndGetToken(...)` if it supports credential-based creation, to make the test self-contained.

### IN-05: logout_producesAuditLog does not assert audit detail content

**File:** `backend/src/test/java/com/micesign/admin/AuditLogGapTest.java:205-208`
**Issue:** The logout test only checks `count >= 1` with correct `action` and `target_type`, but does not assert anything about the `detail` field — unlike the login test which asserts `detail.contains("admin@micesign.com")`. If WR-08 (deviceInfo) is fixed, the test should also validate the new detail content.
**Fix:** After addressing WR-08, add:
```java
String detail = jdbcTemplate.queryForObject(
    "SELECT detail FROM audit_log WHERE action = ? AND target_type = ? ORDER BY id DESC LIMIT 1",
    String.class, AuditAction.USER_LOGOUT, "USER");
assertThat(detail).contains("logout");
```

---

_Reviewed: 2026-04-10T14:30:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_

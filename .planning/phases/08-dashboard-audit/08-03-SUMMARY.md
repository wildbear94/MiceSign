---
phase: 08-dashboard-audit
plan: 03
subsystem: backend-auth-audit
tags: [audit-log, auth, gap-closure, AUD-01]
dependency_graph:
  requires: []
  provides: [login-audit-logging, logout-audit-logging]
  affects: [AuthService, AuditLogGapTest]
tech_stack:
  added: []
  patterns: [auditLogRepository.save() direct pattern for auth events]
key_files:
  created: []
  modified:
    - backend/src/main/java/com/micesign/service/AuthService.java
    - backend/src/test/java/com/micesign/admin/AuditLogGapTest.java
decisions:
  - "Logout audit log captures userId before token deletion via lambda closure"
  - "Logout endpoint requires Bearer token auth - test includes access token from login"
  - "Cookie name is refreshToken (not refresh_token) matching AuthController constant"
metrics:
  duration: 4min
  completed: 2026-04-10
  tasks: 2
  files: 2
---

# Phase 08 Plan 03: Login/Logout Audit Logging Gap Closure Summary

**One-liner:** USER_LOGIN and USER_LOGOUT audit log entries added to AuthService using existing auditLogRepository.save() pattern, with end-to-end integration tests.

## What Was Done

### Task 1: Add USER_LOGIN and USER_LOGOUT audit log entries in AuthService
- **Commit:** 4f71f50
- Added USER_LOGIN audit entry after successful authentication in `login()` method
- Login audit detail includes email and deviceInfo (escaped for JSON safety per T-08-01)
- Added USER_LOGOUT audit entry in `logout()` method using lambda to capture userId before token deletion
- Follows exact same pattern as existing ACCOUNT_LOCKED audit entry in `handleFailedLogin()`
- `compileJava` passes

### Task 2: Add login/logout integration tests to AuditLogGapTest
- **Commit:** 974acba
- `login_producesAuditLog`: POST login with seed admin credentials, verify audit_log row with USER_LOGIN action and email in detail
- `logout_producesAuditLog`: Login to get tokens, then POST logout with Bearer token + refreshToken cookie, verify audit_log row with USER_LOGOUT action
- All 5 AuditLogGapTest tests pass (3 existing + 2 new)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed cookie name in logout test**
- **Found during:** Task 2
- **Issue:** Plan used `refresh_token` as cookie name, but AuthController uses `refreshToken`
- **Fix:** Changed cookie name in test to `refreshToken` to match `REFRESH_TOKEN_COOKIE` constant
- **Files modified:** AuditLogGapTest.java

**2. [Rule 3 - Blocking] Fixed 401 on logout endpoint**
- **Found during:** Task 2
- **Issue:** Logout endpoint requires authentication (`anyRequest().authenticated()` in SecurityConfig), but plan's test did not include Bearer token
- **Fix:** Extract access token from login response body and include as Authorization header in logout request
- **Files modified:** AuditLogGapTest.java

## Verification Results

| Check | Result |
|-------|--------|
| `compileJava` passes | PASS |
| All 5 AuditLogGapTest tests pass | PASS |
| `grep -c "AuditAction.USER_LOGIN" AuthService.java` = 1 | PASS |
| `grep -c "AuditAction.USER_LOGOUT" AuthService.java` = 1 | PASS |
| Login via API produces audit_log row with USER_LOGIN | PASS (verified by test) |
| Logout via API produces audit_log row with USER_LOGOUT | PASS (verified by test) |

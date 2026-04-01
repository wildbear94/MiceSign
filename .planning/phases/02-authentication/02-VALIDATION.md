---
phase: 2
slug: authentication
status: draft
nyquist_compliant: true
wave_0_complete: true
wave_0_note: "Plan 01 (Wave 1) only runs `compileJava` — never invokes the test suite. Plan 02 (Wave 2) creates all test files AND runs them in the same plan. Therefore, no plan ever invokes tests before the test files exist, satisfying the Nyquist requirement."
created: 2026-04-01
---

# Phase 2 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | JUnit 5 + Spring Boot Test + Spring Security Test |
| **Config file** | `backend/src/test/resources/application-test.yml` |
| **Quick run command** | `cd backend && ./gradlew test --tests "com.micesign.auth.*"` |
| **Full suite command** | `cd backend && ./gradlew test` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd backend && ./gradlew test --tests "com.micesign.auth.*"`
- **After every plan wave:** Run `cd backend && ./gradlew test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | Test Created In | Status |
|---------|------|------|-------------|-----------|-------------------|-----------------|--------|
| 02-01-01 | 01 | 1 | AUTH-01 | integration | `./gradlew test --tests "com.micesign.auth.AuthControllerTest.loginSuccess"` | Plan 02 Task 2 | ⬜ pending |
| 02-01-02 | 01 | 1 | AUTH-01 | integration | `./gradlew test --tests "com.micesign.auth.AuthControllerTest.loginInvalidCredentials"` | Plan 02 Task 2 | ⬜ pending |
| 02-01-03 | 01 | 1 | AUTH-02 | integration | `./gradlew test --tests "com.micesign.auth.AuthControllerTest.refreshSuccess"` | Plan 02 Task 2 | ⬜ pending |
| 02-01-04 | 01 | 1 | AUTH-02 | integration | `./gradlew test --tests "com.micesign.auth.AuthControllerTest.refreshTokenReuse"` | Plan 02 Task 2 | ⬜ pending |
| 02-01-05 | 01 | 1 | AUTH-03 | integration | `./gradlew test --tests "com.micesign.auth.AuthControllerTest.logoutSuccess"` | Plan 02 Task 2 | ⬜ pending |
| 02-01-06 | 01 | 1 | AUTH-04 | integration | `./gradlew test --tests "com.micesign.auth.AuthControllerTest.accountLockout"` | Plan 02 Task 2 | ⬜ pending |
| 02-01-07 | 01 | 1 | AUTH-04 | unit | `./gradlew test --tests "com.micesign.auth.AuthServiceTest.lockoutResetOnSuccess"` | Plan 02 Task 2 | ⬜ pending |
| 02-02-01 | 02 | 2 | AUTH-05 | manual-only | Frontend: browser refresh preserves session | N/A | ⬜ pending |
| 02-03-01 | 03 | 2 | AUTH-06 | integration | `./gradlew test --tests "com.micesign.auth.PasswordControllerTest.changeSuccess"` | Plan 02 Task 2 | ⬜ pending |
| 02-03-02 | 03 | 2 | AUTH-06 | integration | `./gradlew test --tests "com.micesign.auth.PasswordControllerTest.changeInvalidatesOthers"` | Plan 02 Task 2 | ⬜ pending |
| 02-03-03 | 03 | 2 | AUTH-07 | integration | `./gradlew test --tests "com.micesign.auth.AdminPasswordResetTest.resetSuccess"` | Plan 02 Task 2 | ⬜ pending |
| 02-03-04 | 03 | 2 | AUTH-07 | integration | `./gradlew test --tests "com.micesign.auth.AdminPasswordResetTest.adminCannotResetSuperAdmin"` | Plan 02 Task 2 | ⬜ pending |

*Status: ⬜ pending / ✅ green / ❌ red / ⚠️ flaky*

**Nyquist note:** Plan 01 (Wave 1) verification uses only `compileJava` — it never runs the test suite. All test files are created in Plan 02 Task 2 (Wave 2), which also runs them. This means no test invocation occurs before test files exist. The Wave 0 stub requirement is satisfied by Plan 02 creating full tests before any `./gradlew test` command is executed.

---

## Wave 0 Requirements

- [x] Test files created in Plan 02 Task 2 (Wave 2) before any test invocation
- [x] `backend/src/test/resources/db/testmigration/V3__add_auth_columns.sql` — created in Plan 01 Task 1
- [x] jjwt dependencies added to `build.gradle.kts` — created in Plan 01 Task 1

Note: Traditional Wave 0 stub creation is unnecessary here because Plan 01 only verifies via `compileJava` (no test execution). Plan 02 creates all test files and runs them within the same plan, ensuring tests exist before they are invoked.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Session persists across browser refresh | AUTH-05 | Requires browser lifecycle (close/reopen tab) | 1. Login with valid credentials 2. Refresh browser 3. Verify still authenticated (no redirect to login) |
| Remember Me session vs persistent cookie | AUTH-01 | Cookie lifetime behavior requires real browser | 1. Login without "Remember Me" 2. Close browser completely 3. Reopen — should require re-login. 4. Login with "Remember Me" 5. Close and reopen — should stay logged in |
| Live lockout countdown timer | AUTH-04 | Visual timer behavior | 1. Fail login 5 times 2. Verify countdown timer displays and counts down 3. Verify login button disabled during lockout |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references (Plan 02 creates tests before invocation)
- [x] No watch-mode flags
- [x] Feedback latency < 30s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** ready

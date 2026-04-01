---
phase: 2
slug: authentication
status: draft
nyquist_compliant: false
wave_0_complete: false
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

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 02-01-01 | 01 | 1 | AUTH-01 | integration | `./gradlew test --tests "com.micesign.auth.AuthControllerTest.loginSuccess"` | ❌ W0 | ⬜ pending |
| 02-01-02 | 01 | 1 | AUTH-01 | integration | `./gradlew test --tests "com.micesign.auth.AuthControllerTest.loginInvalidCredentials"` | ❌ W0 | ⬜ pending |
| 02-01-03 | 01 | 1 | AUTH-02 | integration | `./gradlew test --tests "com.micesign.auth.AuthControllerTest.refreshSuccess"` | ❌ W0 | ⬜ pending |
| 02-01-04 | 01 | 1 | AUTH-02 | integration | `./gradlew test --tests "com.micesign.auth.AuthControllerTest.refreshTokenReuse"` | ❌ W0 | ⬜ pending |
| 02-01-05 | 01 | 1 | AUTH-03 | integration | `./gradlew test --tests "com.micesign.auth.AuthControllerTest.logoutSuccess"` | ❌ W0 | ⬜ pending |
| 02-01-06 | 01 | 1 | AUTH-04 | integration | `./gradlew test --tests "com.micesign.auth.AuthControllerTest.accountLockout"` | ❌ W0 | ⬜ pending |
| 02-01-07 | 01 | 1 | AUTH-04 | unit | `./gradlew test --tests "com.micesign.auth.AuthServiceTest.lockoutResetOnSuccess"` | ❌ W0 | ⬜ pending |
| 02-02-01 | 02 | 2 | AUTH-05 | manual-only | Frontend: browser refresh preserves session | N/A | ⬜ pending |
| 02-03-01 | 03 | 2 | AUTH-06 | integration | `./gradlew test --tests "com.micesign.auth.PasswordControllerTest.changeSuccess"` | ❌ W0 | ⬜ pending |
| 02-03-02 | 03 | 2 | AUTH-06 | integration | `./gradlew test --tests "com.micesign.auth.PasswordControllerTest.changeInvalidatesOthers"` | ❌ W0 | ⬜ pending |
| 02-03-03 | 03 | 2 | AUTH-07 | integration | `./gradlew test --tests "com.micesign.auth.AdminPasswordResetTest.resetSuccess"` | ❌ W0 | ⬜ pending |
| 02-03-04 | 03 | 2 | AUTH-07 | integration | `./gradlew test --tests "com.micesign.auth.AdminPasswordResetTest.adminCannotResetSuperAdmin"` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `backend/src/test/java/com/micesign/auth/AuthControllerTest.java` — stubs for AUTH-01, AUTH-02, AUTH-03, AUTH-04
- [ ] `backend/src/test/java/com/micesign/auth/AuthServiceTest.java` — stubs for AUTH-04 unit logic
- [ ] `backend/src/test/java/com/micesign/auth/PasswordControllerTest.java` — stubs for AUTH-06
- [ ] `backend/src/test/java/com/micesign/auth/AdminPasswordResetTest.java` — stubs for AUTH-07
- [ ] `backend/src/test/resources/db/testmigration/V3__add_auth_columns.sql` — H2-compatible version of V3 migration
- [ ] jjwt dependencies added to `build.gradle.kts`

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Session persists across browser refresh | AUTH-05 | Requires browser lifecycle (close/reopen tab) | 1. Login with valid credentials 2. Refresh browser 3. Verify still authenticated (no redirect to login) |
| Remember Me session vs persistent cookie | AUTH-01 | Cookie lifetime behavior requires real browser | 1. Login without "Remember Me" 2. Close browser completely 3. Reopen — should require re-login. 4. Login with "Remember Me" 5. Close and reopen — should stay logged in |
| Live lockout countdown timer | AUTH-04 | Visual timer behavior | 1. Fail login 5 times 2. Verify countdown timer displays and counts down 3. Verify login button disabled during lockout |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending

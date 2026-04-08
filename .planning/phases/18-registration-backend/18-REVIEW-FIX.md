---
phase: 18-registration-backend
fixed_at: 2026-04-08T12:30:00Z
review_path: .planning/phases/18-registration-backend/18-REVIEW.md
iteration: 1
findings_in_scope: 5
fixed: 5
skipped: 0
status: all_fixed
---

# Phase 18: Code Review Fix Report

**Fixed at:** 2026-04-08T12:30:00Z
**Source review:** .planning/phases/18-registration-backend/18-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 5 (2 Critical, 3 Warning)
- Fixed: 5
- Skipped: 0

## Fixed Issues

### CR-01: Unauthenticated Status Endpoint Enables Email Enumeration

**Files modified:** `backend/src/main/java/com/micesign/domain/RegistrationRequest.java`, `backend/src/main/java/com/micesign/dto/registration/RegistrationStatusResponse.java`, `backend/src/main/java/com/micesign/controller/RegistrationController.java`, `backend/src/main/java/com/micesign/service/RegistrationService.java`, `backend/src/main/java/com/micesign/repository/RegistrationRequestRepository.java`, `backend/src/main/resources/db/migration/V15__add_registration_tracking_token.sql`, `backend/src/test/resources/db/testmigration/V6__create_registration_request.sql`, `backend/src/test/java/com/micesign/registration/RegistrationControllerTest.java`, `backend/src/test/java/com/micesign/registration/RegistrationServiceTest.java`, `backend/src/test/java/com/micesign/registration/AdminRegistrationControllerTest.java`
**Commits:** `812a18d`, `368a5e9`
**Applied fix:** Added a `tracking_token` (UUID) column to `registration_request` table, auto-generated on entity persist. The status endpoint now requires both `email` and `trackingToken` parameters instead of email alone. The tracking token is returned in the POST submission response so only the original submitter can check status. Created migration V15 to add the column and made `password_hash` nullable (also needed for WR-02). Updated test migration, unit tests, and integration tests to include tracking_token.

### CR-02: Race Condition Allows Duplicate PENDING Registrations

**Files modified:** `backend/src/main/java/com/micesign/repository/RegistrationRequestRepository.java`, `backend/src/main/java/com/micesign/service/RegistrationService.java`, `backend/src/test/java/com/micesign/registration/RegistrationServiceTest.java`
**Commit:** `fa5306a`
**Applied fix:** Replaced the check-then-act pattern (`existsByEmailAndStatus`) with a pessimistic write lock query (`findByEmailAndStatusForUpdate`) using `@Lock(LockModeType.PESSIMISTIC_WRITE)`. This ensures that concurrent requests for the same email are serialized at the database level, preventing duplicate PENDING registrations. Updated unit tests to mock the new repository method.

### WR-01: getStatusByEmail Returns Null Without 404 Response

**Files modified:** (resolved as part of CR-01)
**Commit:** `812a18d`
**Applied fix:** The old `getStatusByEmail` method (which returned null) was replaced with `getStatusByEmailAndToken` which throws `BusinessException("REG_NOT_FOUND", "...")` when no matching registration is found. This was a natural consequence of the CR-01 fix.

### WR-02: Password Hash Retained Indefinitely After Approval

**Files modified:** `backend/src/main/java/com/micesign/service/RegistrationService.java`, `backend/src/test/java/com/micesign/registration/RegistrationServiceTest.java`
**Commit:** `c8b8e69`
**Applied fix:** Added `reg.setPasswordHash(null)` in the `approve()` method after the user is created with the direct hash transfer. The `password_hash` column was made nullable in migration V15 (part of CR-01). Added test assertion to verify the password hash is cleared after approval.

### WR-03: Approve Uses Same Error Code for Department and Position Not Found

**Files modified:** `backend/src/main/java/com/micesign/service/RegistrationService.java`, `backend/src/test/java/com/micesign/registration/RegistrationServiceTest.java`
**Commit:** `ff217ff`
**Applied fix:** Changed error code from `"ORG_NOT_FOUND"` to `"ORG_DEPARTMENT_NOT_FOUND"` for department validation and `"ORG_POSITION_NOT_FOUND"` for position validation. Updated the corresponding test assertion to check for `"ORG_DEPARTMENT_NOT_FOUND"`.

---

_Fixed: 2026-04-08T12:30:00Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_

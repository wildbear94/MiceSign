---
phase: 18-registration-backend
reviewed: 2026-04-08T12:00:00Z
depth: standard
files_reviewed: 20
files_reviewed_list:
  - backend/build.gradle.kts
  - backend/src/main/java/com/micesign/config/SchedulingConfig.java
  - backend/src/main/java/com/micesign/config/SecurityConfig.java
  - backend/src/main/java/com/micesign/controller/AdminRegistrationController.java
  - backend/src/main/java/com/micesign/controller/RegistrationController.java
  - backend/src/main/java/com/micesign/domain/RegistrationRequest.java
  - backend/src/main/java/com/micesign/domain/enums/RegistrationStatus.java
  - backend/src/main/java/com/micesign/dto/registration/ApproveRegistrationRequest.java
  - backend/src/main/java/com/micesign/dto/registration/RegistrationListResponse.java
  - backend/src/main/java/com/micesign/dto/registration/RegistrationStatusResponse.java
  - backend/src/main/java/com/micesign/dto/registration/RegistrationSubmitRequest.java
  - backend/src/main/java/com/micesign/dto/registration/RejectRegistrationRequest.java
  - backend/src/main/java/com/micesign/mapper/RegistrationMapper.java
  - backend/src/main/java/com/micesign/repository/RegistrationRequestRepository.java
  - backend/src/main/java/com/micesign/service/RegistrationService.java
  - backend/src/main/resources/db/migration/V14__create_registration_request.sql
  - backend/src/test/java/com/micesign/registration/AdminRegistrationControllerTest.java
  - backend/src/test/java/com/micesign/registration/RegistrationControllerTest.java
  - backend/src/test/java/com/micesign/registration/RegistrationServiceTest.java
  - backend/src/test/resources/db/testmigration/V6__create_registration_request.sql
findings:
  critical: 2
  warning: 3
  info: 1
  total: 6
status: issues_found
---

# Phase 18: Code Review Report

**Reviewed:** 2026-04-08T12:00:00Z
**Depth:** standard
**Files Reviewed:** 20
**Status:** issues_found

## Summary

The registration backend feature implements a self-service user registration workflow with admin approval. The code is well-structured with proper separation of concerns (controller/service/repository/mapper), good use of validation annotations, audit logging, and comprehensive unit + integration tests. However, there are two critical security concerns: an unauthenticated endpoint that enables email enumeration, and a race condition that could allow duplicate pending registrations. Several warnings address missing error handling and data hygiene issues.

## Critical Issues

### CR-01: Unauthenticated Status Endpoint Enables Email Enumeration

**File:** `backend/src/main/java/com/micesign/controller/RegistrationController.java:29-31`
**Issue:** The `GET /api/v1/registration/status?email=` endpoint is publicly accessible (permitted via SecurityConfig line 42: `requestMatchers("/api/v1/registration/**").permitAll()`). Any unauthenticated user can probe arbitrary email addresses to determine whether someone has submitted a registration request, revealing names, statuses, and timestamps. This is a classic email enumeration vulnerability. An attacker can systematically discover which employees are in the system or have pending registrations.
**Fix:** Require the caller to provide a verification token (e.g., a UUID returned at submission time) instead of querying by email alone. Alternatively, restrict the endpoint to return only the status enum without personal details, or require the email + a secret to be provided together:
```java
@GetMapping("/status")
public ApiResponse<RegistrationStatusResponse> getStatus(
        @RequestParam String email,
        @RequestParam String trackingToken) {
    return ApiResponse.ok(registrationService.getStatusByEmailAndToken(email, trackingToken));
}
```
This would require adding a `tracking_token` column (UUID) to `registration_request` and returning it only in the POST response.

### CR-02: Race Condition Allows Duplicate PENDING Registrations

**File:** `backend/src/main/java/com/micesign/service/RegistrationService.java:62-77`
**Issue:** The `submit()` method performs a check-then-act pattern: it first checks `existsByEmailAndStatus(email, PENDING)` and then saves a new entity. Two concurrent requests with the same email can both pass the check before either inserts, resulting in duplicate PENDING registrations for the same email. The database schema (V14) lacks a unique constraint to enforce this invariant at the DB level.
**Fix:** Add a partial unique index on `(email)` where `status = 'PENDING'` in the migration. MariaDB does not support partial unique indexes natively, but you can use a generated column approach or handle it with a unique constraint and catch the `DataIntegrityViolationException`:
```sql
-- Option A: Add unique constraint on (email, status) and handle at application level
-- This prevents two PENDING rows but allows PENDING + REJECTED for same email
ALTER TABLE registration_request ADD UNIQUE INDEX uq_reg_email_pending (email, status);
```
Note: Option A is too broad (prevents same email from having REJECTED + new PENDING). A better approach is to catch the `DataIntegrityViolationException` from a pessimistic lock:
```java
@Transactional
public RegistrationStatusResponse submit(RegistrationSubmitRequest request) {
    // Use pessimistic locking or SELECT ... FOR UPDATE
    Optional<RegistrationRequest> existing = registrationRequestRepository
        .findByEmailAndStatusForUpdate(request.email(), RegistrationStatus.PENDING);
    if (existing.isPresent()) {
        throw new BusinessException("REG_DUPLICATE_PENDING", "...");
    }
    // ... rest of method
}
```

## Warnings

### WR-01: getStatusByEmail Returns Null Without 404 Response

**File:** `backend/src/main/java/com/micesign/service/RegistrationService.java:86-91`
**Issue:** When no registration is found for the given email, the method returns `null`. The controller at `RegistrationController.java:30-31` wraps this in `ApiResponse.ok(null)`, producing a 200 response with `{"data": null}`. The caller receives a successful response with no data, making it ambiguous whether the email was not found or the data is intentionally empty. This is inconsistent with the rest of the codebase which throws `BusinessException` for not-found cases.
**Fix:** Either throw an exception or return a clearly empty response:
```java
public RegistrationStatusResponse getStatusByEmail(String email) {
    List<RegistrationRequest> requests = registrationRequestRepository
        .findByEmailOrderByCreatedAtDesc(email);
    if (requests.isEmpty()) {
        throw new BusinessException("REG_NOT_FOUND", "등록 신청을 찾을 수 없습니다.");
    }
    return registrationMapper.toStatusResponse(requests.get(0));
}
```

### WR-02: Password Hash Retained Indefinitely After Approval

**File:** `backend/src/main/java/com/micesign/service/RegistrationService.java:139-156`
**Issue:** After a registration is approved and the user account is created, the `password_hash` column in `registration_request` retains the BCrypt hash indefinitely. While the hash is not the plaintext password, keeping it is unnecessary and represents a data minimization concern. If the `registration_request` table is ever exposed (SQL injection, backup leak), attackers get password hashes for all historical registrations.
**Fix:** Clear the password hash after successful approval:
```java
// After creating user and before saving reg
reg.setPasswordHash(null); // or a sentinel like "[cleared]"
reg.setStatus(RegistrationStatus.APPROVED);
```
This requires making `password_hash` nullable in the schema or using a sentinel value.

### WR-03: Approve Uses Same Error Code for Department and Position Not Found

**File:** `backend/src/main/java/com/micesign/service/RegistrationService.java:130-137`
**Issue:** Both department and position validation failures throw `BusinessException` with the same code `"ORG_NOT_FOUND"` and different messages. The caller cannot programmatically distinguish which entity was not found. This makes debugging and frontend error handling harder.
**Fix:** Use distinct error codes:
```java
// Department
.orElseThrow(() -> new BusinessException("ORG_DEPARTMENT_NOT_FOUND", "유효한 부서를 찾을 수 없습니다."));

// Position
.orElseThrow(() -> new BusinessException("ORG_POSITION_NOT_FOUND", "유효한 직급을 찾을 수 없습니다."));
```

## Info

### IN-01: RegistrationListResponse and RegistrationStatusResponse Are Identical

**File:** `backend/src/main/java/com/micesign/dto/registration/RegistrationListResponse.java:1-14` and `backend/src/main/java/com/micesign/dto/registration/RegistrationStatusResponse.java:1-14`
**Issue:** Both records have identical fields (`id`, `name`, `email`, `status`, `rejectionReason`, `createdAt`, `processedAt`). While having separate DTOs for different API contexts can be a deliberate design choice (allowing independent evolution), currently they are exact duplicates. Consider whether one type suffices or whether the list response should omit certain fields (e.g., `rejectionReason` in list view).
**Fix:** If they are intentionally separate for future divergence, add a comment explaining the distinction. Otherwise, consolidate into a single DTO.

---

_Reviewed: 2026-04-08T12:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_

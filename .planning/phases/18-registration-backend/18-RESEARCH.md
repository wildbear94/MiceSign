# Phase 18: Registration Backend - Research

**Researched:** 2026-04-07
**Domain:** Spring Boot backend - user self-registration with admin approval workflow
**Confidence:** HIGH

## Summary

Phase 18 implements a user self-registration backend where unauthenticated users submit registration requests and SUPER_ADMIN approves them to create user accounts. The implementation follows established project patterns (JPA Entity + Repository + Service + Controller) with a new `registration_request` table managed by Flyway, a new enum `RegistrationStatus`, two controllers (public + admin), and a `@Scheduled` cron job for expiring stale requests.

The codebase already provides all building blocks: `PasswordEncoder` for hashing at submission, `BusinessException` for error handling, `ApiResponse<T>` for response wrapping, `AuditLogService` for event logging, and `UserManagementService.createUser()` as a reference pattern for account creation. The primary technical risks are (1) ensuring the password hash is transferred directly from `registration_request` to `user` without double-hashing, and (2) race conditions on email uniqueness checks across two tables.

**Primary recommendation:** Follow existing Entity/Repository/Service/Controller patterns exactly. The registration domain is straightforward CRUD with state machine transitions -- no new libraries needed.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** 5 statuses: PENDING, APPROVED, REJECTED, CANCELLED, EXPIRED
- **D-02:** EXPIRED processing -- 14-day timeout via @Scheduled cron (PENDING -> EXPIRED)
- **D-03:** Rejected email resubmission -- preserve existing REJECTED record, create new PENDING record
- **D-04:** employee_no entered by SUPER_ADMIN at approval time (not auto-generated)
- **D-05:** Department/position assigned by SUPER_ADMIN at approval time
- **D-06:** Created account role always USER (admin promotion is separate process)
- **D-07:** Password hash transferred directly from registration_request to user (no double-hashing)
- **D-08:** Public registration API: `POST /api/v1/registration` (permitAll)
- **D-09:** Public status query API: `GET /api/v1/registration/status?email=xxx` (permitAll)
- **D-10:** Admin APIs: `/api/v1/admin/registrations` -- GET (list), POST `/{id}/approve`, POST `/{id}/reject`
- **D-11:** SecurityConfig: add `/api/v1/registration/**` to permitAll
- **D-12:** registration_request table includes `rejection_reason TEXT` column
- **D-13:** user table NOT NULL constraints on employee_no, department_id unchanged
- **D-14:** registration_request includes `approved_by` (FK to user.id, nullable)

### Claude's Discretion
- Flyway migration version number (post-V13)
- registration_request table index design
- RegistrationService internal method structure
- DTO class design (request/response records)
- @Scheduled cron expression (daily)

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| REG-01 | Unauthenticated user submits registration with name, email, password | Public `POST /api/v1/registration` endpoint, RegistrationRequest DTO, PasswordEncoder for hashing, SecurityConfig permitAll |
| REG-02 | System rejects if email exists in user table or pending registration_request | Dual-table email uniqueness check in RegistrationService, existing `UserRepository.findByEmail()` + new `RegistrationRequestRepository.findByEmailAndStatus()` |
| REG-03 | Rejected email can be used for new registration request | Query only PENDING status in registration_request for duplicate check; REJECTED/CANCELLED/EXPIRED are excluded |
| ADM-04 | Approved registration creates user account with correct password hash | Service copies BCrypt hash directly from registration_request to user entity, sets role=USER, status=ACTIVE, mustChangePassword=false |
</phase_requirements>

## Standard Stack

### Core (already in project)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Spring Boot | 3.5.13 | Application framework | Already in build.gradle.kts [VERIFIED: build.gradle.kts] |
| Spring Security | 6.x (auto) | permitAll config for public endpoints | Already configured [VERIFIED: SecurityConfig.java] |
| Spring Data JPA | (auto) | Repository pattern for registration_request | Already in use [VERIFIED: build.gradle.kts] |
| Flyway | (auto) | Database migration for new table | Already in use, latest migration V13 [VERIFIED: migration files] |
| Jakarta Validation | (auto) | DTO validation (@NotBlank, @Email, etc.) | Already in use [VERIFIED: CreateUserRequest.java] |
| MapStruct | 1.6.3 | Entity-to-DTO mapping | Already in use [VERIFIED: UserMapper.java] |

### New (no additional dependencies)
No new libraries required. This phase uses only existing project dependencies. The `@Scheduled` annotation requires `@EnableScheduling` on a configuration class -- this is part of spring-boot-starter and needs no additional dependency.

## Architecture Patterns

### Recommended Project Structure
```
backend/src/main/java/com/micesign/
├── domain/
│   ├── RegistrationRequest.java           # JPA Entity
│   └── enums/
│       └── RegistrationStatus.java        # PENDING, APPROVED, REJECTED, CANCELLED, EXPIRED
├── repository/
│   └── RegistrationRequestRepository.java # JPA Repository
├── service/
│   └── RegistrationService.java           # Business logic + @Scheduled expiry
├── controller/
│   ├── RegistrationController.java        # Public API (permitAll)
│   └── AdminRegistrationController.java   # Admin API (@PreAuthorize SUPER_ADMIN)
├── dto/
│   └── registration/
│       ├── RegistrationSubmitRequest.java  # Public submission DTO
│       ├── RegistrationStatusResponse.java # Public status query response
│       ├── RegistrationListResponse.java   # Admin list item
│       ├── RegistrationDetailResponse.java # Admin detail view
│       ├── ApproveRegistrationRequest.java # Admin approval with employee_no, dept, position
│       └── RejectRegistrationRequest.java  # Admin rejection with reason
├── mapper/
│   └── RegistrationMapper.java            # MapStruct mapper
└── config/
    └── SchedulingConfig.java              # @EnableScheduling (or add to existing config)
```

### Pattern 1: State Machine via Enum + Service Guard
**What:** Registration status transitions enforced in service layer, not by DB constraints
**When to use:** Simple linear state machines with few transitions
**Example:**
```java
// Source: Existing codebase pattern (UserStatus enum + service-level checks)
public enum RegistrationStatus {
    PENDING,    // Initial state
    APPROVED,   // Terminal -- account created
    REJECTED,   // Terminal -- can resubmit as new record
    CANCELLED,  // Terminal -- applicant self-cancelled
    EXPIRED     // Terminal -- 14-day timeout
}

// In RegistrationService:
private void validateTransition(RegistrationRequest request, RegistrationStatus target) {
    if (request.getStatus() != RegistrationStatus.PENDING) {
        throw new BusinessException("REG_INVALID_STATUS",
            "대기 상태의 신청만 처리할 수 있습니다.");
    }
}
```

### Pattern 2: Password Hash Direct Transfer (D-07)
**What:** BCrypt hash stored at registration time, copied verbatim to user.password at approval
**When to use:** When registration and account creation are separate events
**Critical:** `user.setPassword(registrationRequest.getPasswordHash())` -- NOT `passwordEncoder.encode(...)` again
```java
// At registration submission:
request.setPasswordHash(passwordEncoder.encode(submitRequest.password()));

// At approval (NO re-encoding):
user.setPassword(registrationRequest.getPasswordHash());
```

### Pattern 3: Dual-Table Email Uniqueness (REG-02, REG-03)
**What:** Check both user table and registration_request table (PENDING only) for email conflicts
**Why:** registration_request preserves history; only PENDING requests block new submissions
```java
// In RegistrationService.submit():
if (userRepository.findByEmail(email).isPresent()) {
    throw new BusinessException("REG_DUPLICATE_EMAIL", "이미 등록된 이메일입니다.");
}
if (registrationRequestRepository.existsByEmailAndStatus(email, RegistrationStatus.PENDING)) {
    throw new BusinessException("REG_DUPLICATE_PENDING", "이미 대기 중인 신청이 있습니다.");
}
```

### Pattern 4: Admin API with SUPER_ADMIN-only Access (D-10)
**What:** Registration admin APIs restricted to SUPER_ADMIN only (not ADMIN)
**Why:** Account creation is a privileged operation; CONTEXT.md specifies SUPER_ADMIN handles approval
**Note:** Existing `/api/v1/admin/**` allows both SUPER_ADMIN and ADMIN. Registration admin controller needs explicit `@PreAuthorize("hasRole('SUPER_ADMIN')")` at class level.
```java
@RestController
@RequestMapping("/api/v1/admin/registrations")
@PreAuthorize("hasRole('SUPER_ADMIN')")
public class AdminRegistrationController { ... }
```

### Anti-Patterns to Avoid
- **Double-hashing:** NEVER call `passwordEncoder.encode()` on the stored hash during approval. The hash is already BCrypt-encoded at registration time.
- **Querying all statuses for duplicate check:** Only check PENDING status in registration_request. REJECTED/CANCELLED/EXPIRED emails must be reusable (D-03).
- **Modifying user table constraints:** D-13 explicitly says employee_no and department_id NOT NULL constraints are unchanged. The registration_request table is separate.
- **Using `/api/v1/admin/**` default RBAC:** The default allows ADMIN too (line 42 of SecurityConfig). Registration approval must be SUPER_ADMIN only -- use method-level `@PreAuthorize`.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Password hashing | Custom hash function | `PasswordEncoder.encode()` (BCrypt) | Already configured as Bean, consistent with auth system |
| DTO mapping | Manual field copying | MapStruct `@Mapper` | Project convention, compile-time safe |
| Scheduled tasks | Custom timer/thread | `@Scheduled` + `@EnableScheduling` | Spring-native, zero config |
| Input validation | Manual null checks | Jakarta `@Valid` + constraint annotations | Project convention, automatic error responses |
| Audit logging | Custom logging | `AuditLogService.log()` | Append-only, separate transaction, existing pattern |

## Common Pitfalls

### Pitfall 1: Double-Hashing Password
**What goes wrong:** Approval code calls `passwordEncoder.encode(registrationRequest.getPasswordHash())`, producing a BCrypt hash of a BCrypt hash. Login always fails.
**Why it happens:** Copy-paste from `UserManagementService.createUser()` which receives raw password.
**How to avoid:** Approval code MUST use `user.setPassword(registrationRequest.getPasswordHash())` directly.
**Warning signs:** Newly approved users cannot log in.

### Pitfall 2: Race Condition on Email Uniqueness
**What goes wrong:** Two concurrent registrations with same email both pass the check and both insert PENDING records.
**Why it happens:** Check-then-insert without database-level constraint.
**How to avoid:** Add a UNIQUE partial index or use `INSERT ... ON DUPLICATE KEY` pattern. Alternatively, add a unique constraint on `(email, status)` where status = PENDING, but MariaDB doesn't support partial unique indexes natively. Best approach: catch `DataIntegrityViolationException` as a fallback and add a composite unique index on `(email, status)` where practical, or handle at application level with `@Transactional` + re-check.
**Warning signs:** Duplicate PENDING records for same email.

### Pitfall 3: SecurityConfig Order Matters
**What goes wrong:** `/api/v1/registration/**` is not added before `.anyRequest().authenticated()`, or conflicts with `/api/v1/admin/**` pattern.
**Why it happens:** Spring Security evaluates matchers in order.
**How to avoid:** Add `/api/v1/registration/**` permitAll BEFORE the admin and anyRequest rules. The existing SecurityConfig already has a clear ordering pattern.
**Warning signs:** 401 errors on public registration endpoint.

### Pitfall 4: @Scheduled Without @EnableScheduling
**What goes wrong:** The expiry cron method never fires.
**Why it happens:** No existing `@EnableScheduling` in the codebase (verified: not found in any config file).
**How to avoid:** Create `SchedulingConfig.java` with `@Configuration @EnableScheduling` or add `@EnableScheduling` to an existing config class.
**Warning signs:** PENDING requests never transition to EXPIRED.

### Pitfall 5: Admin Approval Without Department/Position Validation
**What goes wrong:** Approval references non-existent or inactive department/position, then user creation fails with FK violation.
**Why it happens:** Approval DTO is trusted without validation.
**How to avoid:** Validate department and position existence and active status before creating user (same pattern as `UserManagementService.createUser()`).
**Warning signs:** 500 errors during approval.

### Pitfall 6: AuditLogService userId for Unauthenticated Requests
**What goes wrong:** Public registration endpoint has no authenticated user, but `AuditLogService.log()` expects a userId.
**Why it happens:** Registration submission is public (permitAll).
**How to avoid:** Pass `null` for userId in audit log for registration submission events. The AuditLog entity's userId is nullable. For approval/rejection, use the SUPER_ADMIN's userId.
**Warning signs:** NullPointerException or constraint violation on audit log insert.

## Code Examples

### Flyway Migration: V14__create_registration_request.sql
```sql
-- Source: Derived from V1__create_schema.sql user table pattern + CONTEXT.md decisions
CREATE TABLE registration_request (
    id               BIGINT AUTO_INCREMENT PRIMARY KEY,
    name             VARCHAR(50)   NOT NULL COMMENT '신청자 이름',
    email            VARCHAR(150)  NOT NULL COMMENT '신청자 이메일',
    password_hash    VARCHAR(255)  NOT NULL COMMENT 'BCrypt 해시 (가입 시 user.password로 전달)',
    status           ENUM('PENDING','APPROVED','REJECTED','CANCELLED','EXPIRED')
                     NOT NULL DEFAULT 'PENDING' COMMENT '신청 상태',
    rejection_reason TEXT          NULL COMMENT '거부 사유',
    approved_by      BIGINT        NULL COMMENT '승인/거부 처리자',
    processed_at     DATETIME      NULL COMMENT '승인/거부 처리 시간',
    created_at       DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at       DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (approved_by) REFERENCES `user`(id),
    INDEX idx_reg_email_status (email, status),
    INDEX idx_reg_status (status),
    INDEX idx_reg_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='사용자 등록 신청';
```

### RegistrationRequest Entity
```java
// Source: Follows existing User.java entity pattern
@Entity
@Table(name = "registration_request")
public class RegistrationRequest {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 50)
    private String name;

    @Column(nullable = false, length = 150)
    private String email;

    @Column(name = "password_hash", nullable = false, length = 255)
    private String passwordHash;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private RegistrationStatus status;

    @Column(name = "rejection_reason", columnDefinition = "TEXT")
    private String rejectionReason;

    @Column(name = "approved_by")
    private Long approvedBy;

    @Column(name = "processed_at")
    private LocalDateTime processedAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
        if (this.status == null) this.status = RegistrationStatus.PENDING;
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
    // getters/setters
}
```

### Approval Flow (Critical: No Double-Hashing)
```java
// Source: Pattern derived from UserManagementService.createUser() with D-07 constraint
@Transactional
public void approve(Long requestId, ApproveRegistrationRequest dto, CustomUserDetails admin) {
    RegistrationRequest reg = registrationRequestRepository.findById(requestId)
        .orElseThrow(() -> new BusinessException("REG_NOT_FOUND", "등록 신청을 찾을 수 없습니다."));

    validateTransition(reg, RegistrationStatus.APPROVED);

    // Validate employee_no uniqueness
    if (userRepository.existsByEmployeeNo(dto.employeeNo())) {
        throw new BusinessException("ORG_DUPLICATE_EMPLOYEE_NO", "이미 존재하는 사번입니다.");
    }

    // Validate department/position
    departmentRepository.findById(dto.departmentId())
        .filter(Department::isActive)
        .orElseThrow(() -> new BusinessException("ORG_NOT_FOUND", "유효한 부서를 찾을 수 없습니다."));

    if (dto.positionId() != null) {
        positionRepository.findById(dto.positionId())
            .filter(Position::isActive)
            .orElseThrow(() -> new BusinessException("ORG_NOT_FOUND", "유효한 직급을 찾을 수 없습니다."));
    }

    // Create user -- CRITICAL: direct hash transfer, NO re-encoding
    User user = new User();
    user.setEmployeeNo(dto.employeeNo());
    user.setName(reg.getName());
    user.setEmail(reg.getEmail());
    user.setPassword(reg.getPasswordHash());  // Direct transfer!
    user.setDepartmentId(dto.departmentId());
    user.setPositionId(dto.positionId());
    user.setRole(UserRole.USER);              // D-06: always USER
    user.setStatus(UserStatus.ACTIVE);
    user.setMustChangePassword(false);
    userRepository.save(user);

    // Update registration request
    reg.setStatus(RegistrationStatus.APPROVED);
    reg.setApprovedBy(admin.getUserId());
    reg.setProcessedAt(LocalDateTime.now());
    registrationRequestRepository.save(reg);

    // Audit log
    auditLogService.log(admin.getUserId(), "REGISTRATION_APPROVED",
        "REGISTRATION_REQUEST", reg.getId(), Map.of("userId", user.getId()));
}
```

### @Scheduled Expiry Cron
```java
// Source: Spring Framework @Scheduled documentation [ASSUMED]
@Configuration
@EnableScheduling
public class SchedulingConfig { }

// In RegistrationService:
@Scheduled(cron = "0 0 2 * * *")  // Daily at 2 AM
@Transactional
public void expirePendingRequests() {
    LocalDateTime cutoff = LocalDateTime.now().minusDays(14);
    int count = registrationRequestRepository.updateStatusByStatusAndCreatedAtBefore(
        RegistrationStatus.EXPIRED, RegistrationStatus.PENDING, cutoff);
    if (count > 0) {
        log.info("Expired {} pending registration requests", count);
    }
}
```

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | JUnit 5 + Mockito + AssertJ (Spring Boot Test starter) |
| Config file | build.gradle.kts (line 63-64, 67) |
| Quick run command | `cd backend && ./gradlew test --tests "com.micesign.registration.*" -x compileQuerydsl` |
| Full suite command | `cd backend && ./gradlew test` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| REG-01 | Submit registration with name, email, password | unit | `./gradlew test --tests "com.micesign.registration.RegistrationServiceTest.submitRegistration*"` | Wave 0 |
| REG-02 | Reject duplicate email in user table or pending request | unit | `./gradlew test --tests "com.micesign.registration.RegistrationServiceTest.duplicateEmail*"` | Wave 0 |
| REG-03 | Allow resubmission after rejection | unit | `./gradlew test --tests "com.micesign.registration.RegistrationServiceTest.resubmitAfterRejection*"` | Wave 0 |
| ADM-04 | Approval creates user with correct password hash | unit | `./gradlew test --tests "com.micesign.registration.RegistrationServiceTest.approveCreatesUser*"` | Wave 0 |

### Sampling Rate
- **Per task commit:** `cd backend && ./gradlew test --tests "com.micesign.registration.*" -x compileQuerydsl`
- **Per wave merge:** `cd backend && ./gradlew test`
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `backend/src/test/java/com/micesign/registration/RegistrationServiceTest.java` -- covers REG-01, REG-02, REG-03, ADM-04
- [ ] `backend/src/test/java/com/micesign/registration/RegistrationControllerTest.java` -- covers public API endpoints
- [ ] `backend/src/test/java/com/micesign/registration/AdminRegistrationControllerTest.java` -- covers admin API endpoints

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | BCryptPasswordEncoder (existing Bean), password stored as hash at submission |
| V3 Session Management | no | Public endpoints are stateless, admin endpoints use existing JWT |
| V4 Access Control | yes | SecurityConfig permitAll for public, @PreAuthorize("hasRole('SUPER_ADMIN')") for admin |
| V5 Input Validation | yes | Jakarta @Valid + @NotBlank, @Email, @Size constraints on DTOs |
| V6 Cryptography | no | Uses existing BCrypt, no new crypto |

### Known Threat Patterns for Registration

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Email enumeration via status endpoint | Information Disclosure | Return generic message regardless of email existence (or accept risk for UX since D-09 allows public status query) |
| Spam registration submissions | Denial of Service | Rate limiting (deferred to Phase 21 SEC-01) |
| Password brute force on stored hash | Tampering | BCrypt cost factor protects stored hashes |
| IDOR on admin approve/reject | Elevation of Privilege | @PreAuthorize SUPER_ADMIN + validate request ID existence |

**Note on D-09 (public status query):** The `GET /api/v1/registration/status?email=xxx` endpoint reveals whether an email has a pending/approved/rejected registration. This is an intentional UX decision from CONTEXT.md. Rate limiting (Phase 21) will mitigate abuse.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `@Scheduled(cron = "0 0 2 * * *")` is the correct Spring cron syntax for daily 2 AM | Code Examples | LOW -- well-documented Spring feature, easily correctable |
| A2 | MariaDB `ENUM` column type works for 5-value RegistrationStatus | Code Examples | LOW -- same pattern as UserStatus ENUM in V1 schema |
| A3 | AuditLog.userId is nullable (allows null for public registration events) | Pitfalls | MEDIUM -- if NOT NULL, need alternative audit approach for public endpoints |

## Open Questions

1. **AuditLog userId nullability**
   - What we know: `AuditLogService.log()` accepts Long userId. AuditLog entity has userId field.
   - What's unclear: Whether the DB column allows NULL for unauthenticated actions.
   - Recommendation: Check AuditLog entity/DDL. If NOT NULL, use a system user ID (e.g., 0 or skip audit for public submission, only audit admin actions).

2. **Email enumeration risk on status endpoint (D-09)**
   - What we know: CONTEXT.md explicitly decided on public status query by email.
   - What's unclear: Whether the response should distinguish "no registration found" from "registration exists with status X".
   - Recommendation: Return status if found, return a neutral "not found" if no record exists. Accept the enumeration risk as a conscious UX tradeoff per D-09.

## Sources

### Primary (HIGH confidence)
- `SecurityConfig.java` -- current permitAll patterns, PasswordEncoder bean [VERIFIED: codebase]
- `User.java` -- entity structure, NOT NULL fields (employee_no, department_id) [VERIFIED: codebase]
- `UserManagementService.java` -- createUser() pattern, validation sequence [VERIFIED: codebase]
- `AuthService.java` -- PasswordEncoder usage pattern [VERIFIED: codebase]
- `V1__create_schema.sql` -- user table DDL, ENUM usage pattern [VERIFIED: codebase]
- `build.gradle.kts` -- Spring Boot 3.5.13, all dependencies [VERIFIED: codebase]
- `18-CONTEXT.md` -- all locked decisions D-01 through D-14 [VERIFIED: codebase]

### Secondary (MEDIUM confidence)
- Spring `@Scheduled` + `@EnableScheduling` -- standard Spring feature [ASSUMED: well-known Spring API]

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all libraries already in project, zero new dependencies
- Architecture: HIGH -- follows 100% established codebase patterns (Entity/Repo/Service/Controller)
- Pitfalls: HIGH -- derived from actual codebase analysis (double-hashing risk, SecurityConfig ordering)

**Research date:** 2026-04-07
**Valid until:** 2026-05-07 (stable domain, no external dependency changes)

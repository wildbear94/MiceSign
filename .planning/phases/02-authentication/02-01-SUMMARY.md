---
phase: 02-authentication
plan: 01
subsystem: backend-auth
tags: [jwt, spring-security, authentication, lockout, audit]
dependency_graph:
  requires: [01-01, 01-02, 01-03]
  provides: [jwt-token-provider, auth-endpoints, user-entity, refresh-token-rotation, audit-logging]
  affects: [02-02, 02-03, 02-04]
tech_stack:
  added: [jjwt-0.12.6]
  patterns: [stateless-jwt, refresh-token-rotation, sha256-token-hashing, account-lockout, audit-log-append-only]
key_files:
  created:
    - backend/src/main/java/com/micesign/domain/User.java
    - backend/src/main/java/com/micesign/domain/RefreshToken.java
    - backend/src/main/java/com/micesign/domain/AuditLog.java
    - backend/src/main/java/com/micesign/domain/enums/UserRole.java
    - backend/src/main/java/com/micesign/domain/enums/UserStatus.java
    - backend/src/main/java/com/micesign/repository/UserRepository.java
    - backend/src/main/java/com/micesign/repository/RefreshTokenRepository.java
    - backend/src/main/java/com/micesign/repository/AuditLogRepository.java
    - backend/src/main/java/com/micesign/security/JwtTokenProvider.java
    - backend/src/main/java/com/micesign/security/JwtAuthenticationFilter.java
    - backend/src/main/java/com/micesign/security/CustomUserDetails.java
    - backend/src/main/java/com/micesign/controller/AuthController.java
    - backend/src/main/java/com/micesign/service/AuthService.java
    - backend/src/main/java/com/micesign/dto/auth/LoginRequest.java
    - backend/src/main/java/com/micesign/dto/auth/LoginResponse.java
    - backend/src/main/java/com/micesign/dto/auth/UserProfileDto.java
    - backend/src/main/java/com/micesign/dto/auth/RefreshResponse.java
    - backend/src/main/java/com/micesign/dto/auth/AuthErrorResponse.java
    - backend/src/main/resources/db/migration/V3__add_auth_columns.sql
    - backend/src/test/resources/db/testmigration/V3__add_auth_columns.sql
  modified:
    - backend/build.gradle.kts
    - backend/src/main/java/com/micesign/config/SecurityConfig.java
    - backend/src/main/resources/application.yml
decisions:
  - Used result objects (LoginResult, RefreshResult) in AuthService to avoid exceptions for control flow
  - Added AuthErrorResponse record for structured error data (remainingAttempts, lockedUntil) beyond ApiResponse.ErrorDetail
  - Used RETIRED in UserStatus enum to match V1 DDL (plan listed only ACTIVE/INACTIVE but DDL has RETIRED)
  - AuditLog entity maps to user_id column (matching actual DDL), not actor_id (which was in plan context)
metrics:
  duration: 5min
  completed: "2026-04-01T05:58:00Z"
---

# Phase 02 Plan 01: JWT Auth Backend Foundation Summary

JWT authentication backend with jjwt 0.12.6 HMAC-SHA256, refresh token rotation with SHA-256 hashing, 5-attempt account lockout with 15-minute window, and append-only audit logging for lockout events.

## What Was Built

### Task 1: JWT Dependencies, V3 Migration, JPA Entities, JwtTokenProvider, DTOs
- Added jjwt 0.12.6 (api, impl, jackson) to build.gradle.kts
- Created V3 Flyway migration adding `failed_login_count`, `locked_until`, `must_change_password` to user table and dropping stray `position_id` from refresh_token
- Created H2-compatible V3 test migration (no backticks, no COMMENT, no FK drop for non-existent column)
- Created User, RefreshToken, AuditLog JPA entities with explicit getters/setters (no Lombok per CLAUDE.md)
- Created UserRole (SUPER_ADMIN, ADMIN, USER) and UserStatus (ACTIVE, INACTIVE, RETIRED) enums
- Created repositories: UserRepository (findByEmail), RefreshTokenRepository (findByTokenHash, deleteByUserId), AuditLogRepository
- Created JwtTokenProvider with HMAC-SHA256 via `Keys.hmacShaKeyFor`, token generation with user claims (email, name, role, departmentId, mustChangePassword), validation via `Jwts.parser().verifyWith()`
- Created CustomUserDetails implementing UserDetails with ROLE_-prefixed authorities
- Created DTO records: LoginRequest (with validation), LoginResponse, UserProfileDto, RefreshResponse
- Added JWT config to application.yml with env-overridable secret and TTL values

### Task 2: SecurityConfig, JwtAuthFilter, AuthController, AuthService
- Replaced Phase 1 permit-all SecurityConfig with real JWT stateless filter chain
- Added `@EnableMethodSecurity` for `@PreAuthorize` support in later phases
- Configured `authenticationEntryPoint` (401 AUTH_TOKEN_EXPIRED) and `accessDeniedHandler` (403 AUTH_FORBIDDEN) with JSON responses
- Created JwtAuthenticationFilter (OncePerRequestFilter) with `shouldNotFilter` for public paths
- Created AuthService with:
  - Login: credential validation, lockout check/reset, failed attempt counting, token generation
  - Refresh: SHA-256 token lookup, expiry check, token rotation (delete old + create new)
  - Logout: find and delete refresh token by hash
  - Lockout: 5 attempts triggers 15-minute lock, persists ACCOUNT_LOCKED event to audit_log (D-41)
- Created AuthController with:
  - POST /api/v1/auth/login: validates credentials, returns accessToken + sets HttpOnly/Secure/SameSite=Strict refreshToken cookie
  - POST /api/v1/auth/refresh: rotates refresh token, returns new accessToken + user profile
  - POST /api/v1/auth/logout: clears cookie (maxAge=0), deletes token from DB
  - rememberMe=true sets 14-day maxAge; false creates session cookie

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Functionality] Added UserStatus.RETIRED enum value**
- **Found during:** Task 1
- **Issue:** Plan listed only ACTIVE/INACTIVE but V1 DDL defines ENUM('ACTIVE','INACTIVE','RETIRED')
- **Fix:** Added RETIRED to UserStatus enum to match actual DB schema
- **Files modified:** backend/src/main/java/com/micesign/domain/enums/UserStatus.java

**2. [Rule 2 - Missing Functionality] Added AuthErrorResponse DTO**
- **Found during:** Task 2
- **Issue:** Plan suggested extending ApiResponse.ErrorDetail or creating custom error response for lockout details (remainingAttempts, lockedUntil) but no concrete DTO was specified
- **Fix:** Created AuthErrorResponse record with code, message, remainingAttempts, lockedUntil fields; used result objects (LoginResult, RefreshResult) in AuthService for clean control flow
- **Files modified:** backend/src/main/java/com/micesign/dto/auth/AuthErrorResponse.java, backend/src/main/java/com/micesign/service/AuthService.java

**3. [Rule 1 - Bug] AuditLog entity uses user_id not actor_id**
- **Found during:** Task 1
- **Issue:** Plan context described audit_log with `actor_id` column, but actual V1 DDL uses `user_id`
- **Fix:** Mapped AuditLog.userId to `user_id` column matching actual DDL
- **Files modified:** backend/src/main/java/com/micesign/domain/AuditLog.java

**4. [Rule 1 - Bug] H2 test migration skips position_id drop**
- **Found during:** Task 1
- **Issue:** H2 test migration V1 already omits position_id from refresh_token, so V3 drop would fail
- **Fix:** Omitted position_id drop from test migration (only production V3 drops it)
- **Files modified:** backend/src/test/resources/db/testmigration/V3__add_auth_columns.sql

**5. [Rule 3 - Blocking] Fixed JAVA_HOME path for compilation**
- **Found during:** Task 1 verification
- **Issue:** Plan referenced amazon-corretto-17.jdk which doesn't exist; actual path is corretto-17.0.18
- **Fix:** Used correct JAVA_HOME path for verification builds
- **Impact:** Build-time only, no code changes

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| 1 | 9fb0bd9 | JWT dependencies, V3 migration, JPA entities, token provider, DTOs |
| 2 | 6a13f30 | SecurityConfig, JWT filter, AuthController, AuthService with lockout and audit |

## Known Stubs

None. All endpoints are fully wired with real service logic, token generation, and database persistence.

## Verification Results

1. `./gradlew compileJava` -- BUILD SUCCESSFUL
2. SecurityConfig.permitAll -- only auth/login, auth/refresh, swagger, health (not anyRequest)
3. jjwt-api 0.12.6 dependency present in build.gradle.kts
4. V3 migration file exists with auth columns and position_id drop
5. auditLogRepository referenced in AuthService for lockout audit logging

## Self-Check: PASSED

All 10 key files verified present. Both commit hashes (9fb0bd9, 6a13f30) confirmed in git log.

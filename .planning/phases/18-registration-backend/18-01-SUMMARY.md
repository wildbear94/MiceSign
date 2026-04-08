---
phase: 18-registration-backend
plan: 01
subsystem: database, api
tags: [flyway, jpa, mapstruct, spring-security, registration]

requires:
  - phase: 02-authentication
    provides: User entity, SecurityConfig, JWT auth foundation
provides:
  - registration_request Flyway migration (V14)
  - RegistrationStatus enum (PENDING, APPROVED, REJECTED, CANCELLED, EXPIRED)
  - RegistrationRequest JPA entity with full column mapping
  - RegistrationRequestRepository with custom queries
  - 5 registration DTO records with validation
  - RegistrationMapper (MapStruct)
  - SecurityConfig permitAll for /api/v1/registration/**
affects: [18-02-PLAN, 19-registration-frontend]

tech-stack:
  added: []
  patterns: [registration domain entity pattern following User.java conventions]

key-files:
  created:
    - backend/src/main/resources/db/migration/V14__create_registration_request.sql
    - backend/src/main/java/com/micesign/domain/enums/RegistrationStatus.java
    - backend/src/main/java/com/micesign/domain/RegistrationRequest.java
    - backend/src/main/java/com/micesign/repository/RegistrationRequestRepository.java
    - backend/src/main/java/com/micesign/dto/registration/RegistrationSubmitRequest.java
    - backend/src/main/java/com/micesign/dto/registration/RegistrationStatusResponse.java
    - backend/src/main/java/com/micesign/dto/registration/RegistrationListResponse.java
    - backend/src/main/java/com/micesign/dto/registration/ApproveRegistrationRequest.java
    - backend/src/main/java/com/micesign/dto/registration/RejectRegistrationRequest.java
    - backend/src/main/java/com/micesign/mapper/RegistrationMapper.java
  modified:
    - backend/src/main/java/com/micesign/config/SecurityConfig.java

key-decisions:
  - "Used -x compileQuerydsl workaround: task not found in Gradle, compile works without exclusion"

patterns-established:
  - "Registration domain follows User.java entity pattern with @PrePersist/@PreUpdate lifecycle"

requirements-completed: [REG-01, REG-02]

duration: 2min
completed: 2026-04-08
---

# Phase 18 Plan 01: Registration Domain Foundation Summary

**Flyway V14 migration for registration_request table, JPA entity with RegistrationStatus enum, repository with custom queries, 5 DTO records, MapStruct mapper, and SecurityConfig public endpoint access**

## Performance

- **Duration:** 2 min
- **Started:** 2026-04-08T00:51:02Z
- **Completed:** 2026-04-08T00:52:42Z
- **Tasks:** 2
- **Files modified:** 11

## Accomplishments
- V14 Flyway migration creates registration_request table with name, email, password_hash, status ENUM, rejection_reason, approved_by FK, processed_at, timestamps, and 3 indexes
- RegistrationRequest JPA entity with full column mapping, @PrePersist/@PreUpdate lifecycle, and RegistrationStatus enum (5 values)
- Repository with existsByEmailAndStatus, findByEmailOrderByCreatedAtDesc, findByEmailAndStatus, findByStatus (paged), and bulk expiry update query
- 5 DTO records (RegistrationSubmitRequest, RegistrationStatusResponse, RegistrationListResponse, ApproveRegistrationRequest, RejectRegistrationRequest) with Jakarta validation
- MapStruct RegistrationMapper for entity-to-response conversion
- SecurityConfig updated to permit /api/v1/registration/** without authentication

## Task Commits

Each task was committed atomically:

1. **Task 1: Flyway migration, enum, entity, repository** - `75bd929` (feat)
2. **Task 2: DTOs, MapStruct mapper, SecurityConfig update** - `67d9691` (feat)

## Files Created/Modified
- `backend/src/main/resources/db/migration/V14__create_registration_request.sql` - DDL for registration_request table
- `backend/src/main/java/com/micesign/domain/enums/RegistrationStatus.java` - 5-value status enum
- `backend/src/main/java/com/micesign/domain/RegistrationRequest.java` - JPA entity with full mapping
- `backend/src/main/java/com/micesign/repository/RegistrationRequestRepository.java` - Repository with custom queries
- `backend/src/main/java/com/micesign/dto/registration/RegistrationSubmitRequest.java` - Public submit DTO
- `backend/src/main/java/com/micesign/dto/registration/RegistrationStatusResponse.java` - Status check response
- `backend/src/main/java/com/micesign/dto/registration/RegistrationListResponse.java` - Admin list response
- `backend/src/main/java/com/micesign/dto/registration/ApproveRegistrationRequest.java` - Admin approve DTO
- `backend/src/main/java/com/micesign/dto/registration/RejectRegistrationRequest.java` - Admin reject DTO
- `backend/src/main/java/com/micesign/mapper/RegistrationMapper.java` - MapStruct entity-to-DTO mapper
- `backend/src/main/java/com/micesign/config/SecurityConfig.java` - Added registration permitAll

## Decisions Made
- Gradle compileQuerydsl task does not exist in this project; verification uses `./gradlew compileJava` without exclusion flag

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- Plan's verify command used `-x compileQuerydsl` but the task does not exist in the Gradle build; used `./gradlew compileJava` directly instead. No impact on verification.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Domain layer complete: entity, repository, DTOs, mapper all ready for Plan 02
- Plan 02 (service + controller) can build directly on these artifacts
- SecurityConfig already permits public registration endpoints

## Self-Check: PASSED

- All 11 files verified present on disk
- Commits 75bd929 and 67d9691 verified in git log

---
*Phase: 18-registration-backend*
*Completed: 2026-04-08*

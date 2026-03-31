---
phase: 01-project-foundation
plan: 01
subsystem: database, api, infra
tags: [spring-boot, gradle, flyway, mariadb, querydsl, springdoc, mapstruct, swagger]

# Dependency graph
requires: []
provides:
  - "Gradle project with Spring Boot 3.5.13 and all core dependencies"
  - "Flyway V1 migration with 12-table DDL matching PRD schema"
  - "Flyway V2 seed data (departments, positions, SUPER_ADMIN, templates)"
  - "ApiResponse<T> envelope pattern for all API responses"
  - "GlobalExceptionHandler for consistent error responses"
  - "SpringDoc Swagger UI at /swagger-ui.html"
  - "HealthController at /api/v1/health demonstrating envelope pattern"
  - "Spring Security permit-all config (placeholder for Phase 2)"
affects: [02-authentication, 03-organization, 04-document-templates, 05-attachments, 06-submission, 07-approval-workflow, 08-dashboard]

# Tech tracking
tech-stack:
  added: [spring-boot-3.5.13, spring-security-6.5.x, spring-data-jpa, querydsl-5.1.0-jakarta, flyway, springdoc-openapi-2.8.16, mapstruct-1.6.3, mariadb-jdbc, gradle-8.12]
  patterns: [api-response-envelope, flyway-versioned-migrations, spring-profile-config, global-exception-handler]

key-files:
  created:
    - backend/build.gradle.kts
    - backend/settings.gradle.kts
    - backend/src/main/java/com/micesign/MiceSignApplication.java
    - backend/src/main/resources/application.yml
    - backend/src/main/resources/application-dev.yml
    - backend/src/main/resources/application-prod.yml
    - backend/src/main/resources/db/migration/V1__create_schema.sql
    - backend/src/main/resources/db/migration/V2__seed_initial_data.sql
    - backend/src/main/java/com/micesign/common/dto/ApiResponse.java
    - backend/src/main/java/com/micesign/common/exception/GlobalExceptionHandler.java
    - backend/src/main/java/com/micesign/config/SwaggerConfig.java
    - backend/src/main/java/com/micesign/config/SecurityConfig.java
    - backend/src/main/java/com/micesign/controller/HealthController.java
    - backend/.env.example
  modified: []

key-decisions:
  - "Used pre-computed BCrypt hash in V2 migration for reproducible SUPER_ADMIN seeding"
  - "Set JAVA_HOME to Corretto 17 for Gradle execution (system default is Java 24, incompatible with Gradle 8.12)"
  - "Temporary SecurityConfig permits all requests - Phase 2 replaces with JWT auth"

patterns-established:
  - "ApiResponse envelope: ok(data) and error(code, message) factory methods on Java record"
  - "Flyway migration naming: V1 for schema DDL, V2 for seed data"
  - "Spring profile layering: shared application.yml + profile-specific application-{dev,prod}.yml"
  - "Layer-first package structure: controller, service, repository, domain, config, security, dto, common"

requirements-completed: [ORG-05]

# Metrics
duration: 5min
completed: 2026-03-31
---

# Phase 01 Plan 01: Backend Scaffold Summary

**Spring Boot 3.5.13 backend with Gradle 8.12, 12-table Flyway DDL, seed data (7 departments, 7 positions, SUPER_ADMIN, 3 templates), API envelope pattern, and Swagger UI**

## Performance

- **Duration:** 5 min
- **Started:** 2026-03-31T06:10:05Z
- **Completed:** 2026-03-31T06:15:59Z
- **Tasks:** 2
- **Files modified:** 22 (Task 1) + 6 (Task 2) = 28

## Accomplishments
- Fully compilable Spring Boot backend with all Phase 1-A dependencies wired (QueryDSL, Flyway, SpringDoc, MapStruct, Spring Security)
- Complete 12-table DDL matching PRD Section 11.2 exactly, with proper charset, indexes, and foreign keys
- Seed data fulfilling ORG-05: 7 Korean corporate departments, 7 positions (사원 through 대표이사), SUPER_ADMIN account (admin@micesign.com), 3 MVP approval templates (GENERAL, EXPENSE, LEAVE)
- API response envelope pattern (ApiResponse record) and global exception handler established as foundation patterns

## Task Commits

Each task was committed atomically:

1. **Task 1: Create Gradle project with Spring Boot, all dependencies, and configuration** - `ed3508b` (feat)
2. **Task 2: Create Flyway migrations, API envelope, exception handler, Swagger config, health endpoint** - `1b96ccb` (feat)

## Files Created/Modified
- `backend/build.gradle.kts` - Gradle build with Spring Boot 3.5.13, QueryDSL, Flyway, SpringDoc, MapStruct
- `backend/settings.gradle.kts` - Project name: micesign-backend
- `backend/src/main/java/com/micesign/MiceSignApplication.java` - Spring Boot main class
- `backend/src/main/resources/application.yml` - Shared config: JPA validate, Flyway, globally_quoted_identifiers
- `backend/src/main/resources/application-dev.yml` - Dev profile with env var defaults
- `backend/src/main/resources/application-prod.yml` - Prod profile with HikariCP tuning
- `backend/src/main/resources/db/migration/V1__create_schema.sql` - 12-table DDL from PRD
- `backend/src/main/resources/db/migration/V2__seed_initial_data.sql` - Departments, positions, admin, templates
- `backend/src/main/java/com/micesign/common/dto/ApiResponse.java` - API envelope record
- `backend/src/main/java/com/micesign/common/exception/GlobalExceptionHandler.java` - Global error handler
- `backend/src/main/java/com/micesign/config/SwaggerConfig.java` - OpenAPI metadata
- `backend/src/main/java/com/micesign/config/SecurityConfig.java` - Permit-all placeholder
- `backend/src/main/java/com/micesign/controller/HealthController.java` - /api/v1/health endpoint
- `backend/.env.example` - Environment variable documentation

## Decisions Made
- **Pre-computed BCrypt hash:** Generated BCrypt hash for admin1234! at build time and embedded in V2 migration SQL for reproducibility
- **Java 17 via JAVA_HOME:** Gradle 8.12 does not support Java 24 as the daemon JVM; set JAVA_HOME to Corretto 17.0.18 for builds
- **Permit-all security:** Temporary SecurityConfig allows all requests; Phase 2 (Authentication) will replace with JWT filter chain

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Gradle wrapper generation required temp directory approach**
- **Found during:** Task 1 (Gradle wrapper generation)
- **Issue:** Running `gradle wrapper` in the project directory failed because the global Gradle 8.1.1 tried to configure the Spring Boot project and hit a jar creation error with Java 24
- **Fix:** Created a minimal temp directory with empty settings.gradle, ran `gradle wrapper --gradle-version 8.12` there, copied the generated files (gradlew, gradlew.bat, gradle-wrapper.jar) to the project
- **Files modified:** backend/gradlew, backend/gradlew.bat, backend/gradle/wrapper/
- **Verification:** `./gradlew compileJava` succeeds with BUILD SUCCESSFUL
- **Committed in:** ed3508b (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Wrapper generation approach changed but outcome identical. No scope creep.

## Issues Encountered
- Java 24 (system default) is incompatible with Gradle 8.12 for running the daemon. Resolved by setting JAVA_HOME to Corretto 17.0.18 for all Gradle commands. Future developers should do the same or rely on the Gradle toolchain auto-provisioning.

## User Setup Required

None - no external service configuration required. MariaDB must be installed before running the application (documented in .env.example).

## Known Stubs

None - all files contain real implementations, not placeholders.

## Next Phase Readiness
- Backend compiles and all dependencies are resolved
- Database schema and seed data ready for Flyway execution once MariaDB is available
- API envelope pattern and health endpoint ready for Phase 2 (Authentication) to build upon
- SecurityConfig must be replaced in Phase 2 with proper JWT filter chain

## Self-Check: PASSED

All created files verified on disk. Both task commits (ed3508b, 1b96ccb) verified in git log.

---
*Phase: 01-project-foundation*
*Completed: 2026-03-31*

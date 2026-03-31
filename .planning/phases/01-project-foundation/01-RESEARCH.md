# Phase 1: Project Foundation - Research

**Researched:** 2026-03-31
**Domain:** Spring Boot + React project scaffolding, Flyway database migration, seed data
**Confidence:** HIGH

## Summary

Phase 1 establishes a runnable monorepo with Spring Boot backend and React frontend, wires all dependencies, creates the full database schema via Flyway migrations, and seeds initial organization data (departments, positions, SUPER_ADMIN). This is a greenfield setup with no existing code.

The primary challenge is getting the Gradle build correct -- particularly QueryDSL annotation processing with the `jakarta` classifier and Flyway's MariaDB-specific module. The frontend scaffolding is straightforward (Vite + React + TypeScript template). MariaDB is not installed on the development machine and must be installed or run via Docker.

**Primary recommendation:** Use Spring Boot 3.5.x (latest actively maintained 3.x), scaffold backend with Spring Initializr dependencies, scaffold frontend with `npm create vite@latest`, and create all 12 DDL tables in Flyway V1 migration with seed data in V2.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Monorepo -- single repository with `backend/` and `frontend/` directories at root
- **D-02:** Base Java package: `com.micesign` with sub-packages (.controller, .service, .repository, .domain, .config, .security, .dto, .common)
- **D-03:** Single-module Gradle project with Kotlin DSL (`build.gradle.kts`)
- **D-04:** Layer-first backend package structure (com.micesign.controller, .service, .repository, etc.)
- **D-05:** Feature-folder frontend structure (src/features/auth/, src/features/document/, etc.) with shared UI in src/components/ui/
- **D-06:** `docs/` stays at project root level (alongside backend/ and frontend/)
- **D-07:** Realistic Korean company departments (경영지원부, 개발부, 영업부, 인사부 등) -- Claude creates reasonable set
- **D-08:** Standard Korean corporate positions -- 사원, 대리, 과장, 차장, 부장, 이사, 대표이사 with appropriate sort_order
- **D-09:** Fixed default SUPER_ADMIN account: admin@micesign.com with temporary password, created via Flyway migration
- **D-10:** Database connection via environment variables (DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASS) with .env.example provided
- **D-11:** Two Spring profiles: `dev` (application-dev.yml) + `prod` (application-prod.yml) with shared `application.yml`
- **D-12:** Vite dev server proxy for `/api/**` requests to localhost:8080 -- no backend CORS configuration needed for local dev
- **D-13:** Envelope response pattern: `{"success": true, "data": {...}, "error": null}` for all API responses
- **D-14:** API path prefix: `/api/v1` (e.g., /api/v1/users, /api/v1/documents)
- **D-15:** Error responses follow FSD error code system: `{"success": false, "error": {"code": "AUTH_001", "message": "..."}}`
- **D-16:** Pagination defaults: page=0, size=20, using Spring Data Pageable

### Claude's Discretion
- Exact department hierarchy (parent-child relationships)
- Number and names of seed departments (reasonable Korean corporate set)
- Flyway migration file naming and ordering strategy
- SpringDoc OpenAPI configuration details
- Exact .env.example content and variable naming
- Backend port configuration (default 8080)
- Frontend dev server port (default 5173)

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| ORG-05 | Initial data seeding on first run (default departments, positions, SUPER_ADMIN account) | Flyway V2 migration with INSERT statements for departments, positions, and admin user with BCrypt-hashed password |
</phase_requirements>

## Project Constraints (from CLAUDE.md)

- **Java 17** (NOT Java 24 which is the system default -- must configure `sourceCompatibility` and `targetCompatibility`)
- **Spring Boot 3.x** -- use 3.5.x series (3.4.x OSS support ended Dec 2025)
- **QueryDSL 5.1.0** with `jakarta` classifier required for Spring Boot 3.x
- **Flyway** must be included from Phase 1 -- all schema changes through migration files
- **MariaDB 10.11+ LTS** -- avoid 11.x (short-term support only)
- **React 18** + Vite + TypeScript + Zustand + TanStack Query v5 + TailwindCSS
- **No Lombok** -- use Java 17 records for DTOs
- **No Spring WebFlux** -- servlet stack only
- **No Hibernate Envers** -- custom audit_log table
- **No Docker** for deployment (native), but Docker is acceptable for local dev database
- **Hardcoded form components** -- no dynamic form builder
- **Axios** with interceptors for JWT refresh flow (must be wired from start)
- **React Hook Form + Zod** identified as must-have for form management
- **MapStruct** recommended for DTO mapping
- **SpringDoc OpenAPI** for Swagger UI
- **Headless UI / Radix** for accessible UI primitives

## Standard Stack

### Backend
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Spring Boot | 3.5.13 | Application framework | Latest maintained 3.x LTS (OSS support until Jun 2026) |
| Spring Security | 6.5.x | Security framework | Auto-managed by Boot 3.5.x |
| Spring Data JPA | 3.5.x | ORM / repository | Auto-managed by Boot 3.5.x |
| QueryDSL | 5.1.0 (jakarta) | Complex queries | PRD requirement; `jakarta` classifier required |
| Flyway | (Boot-managed) | DB migration | Boot auto-configures; add `flyway-mysql` module for MariaDB |
| SpringDoc OpenAPI | 2.8.16 | Swagger UI | Latest stable compatible with Boot 3.5.x (v3.0.x has compatibility issues) |
| MariaDB JDBC | (Boot-managed) | Database driver | `org.mariadb.jdbc:mariadb-java-client` |
| MapStruct | 1.6.x | DTO mapping | Compile-time safe, reduces boilerplate |
| Jackson | (Boot-managed) | JSON serialization | Auto-included with Boot |

### Frontend
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React | 18.3.x | UI framework | PRD specifies React 18 |
| Vite | 6.x | Build tool / dev server | PRD says "Vite 5" but 6.x is current stable; both work with React 18 |
| TypeScript | 5.x | Type safety | Current stable |
| Zustand | 5.x | Client state | PRD requirement |
| TanStack Query | 5.x | Server state / caching | PRD requirement |
| Axios | 1.x | HTTP client | Required for JWT interceptor pattern |
| React Router | 7.x | Client routing | Current stable for React 18 |
| TailwindCSS | 3.4.x | Styling | CLAUDE.md recommends 3.4.x over v4 |
| React Hook Form | 7.x | Form management | CLAUDE.md identifies as must-have |
| Zod | 4.x | Schema validation | Pairs with React Hook Form |

### Database
| Component | Version | Purpose |
|-----------|---------|---------|
| MariaDB | 10.11 LTS | RDBMS -- utf8mb4/utf8mb4_unicode_ci |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Spring Boot 3.5.x | Spring Boot 3.4.13 | 3.4 OSS ended Dec 2025; 3.5 still receives patches until Jun 2026 |
| Vite 6.x | Vite 5.x | PRD says Vite 5 but 6 is drop-in upgrade; both support React 18 identically |
| TailwindCSS 3.4.x | TailwindCSS 4.x | v4 stable since Jan 2025 but CLAUDE.md explicitly warns against it |
| SpringDoc 2.8.16 | SpringDoc 3.0.2 | 3.0.x has reported compatibility issues with Spring Boot 3.5 |

**Installation (Backend -- build.gradle.kts):**
```kotlin
// Spring Boot plugin
plugins {
    java
    id("org.springframework.boot") version "3.5.13"
    id("io.spring.dependency-management") version "1.1.7"
}

java {
    sourceCompatibility = JavaVersion.VERSION_17
    targetCompatibility = JavaVersion.VERSION_17
}

dependencies {
    implementation("org.springframework.boot:spring-boot-starter-web")
    implementation("org.springframework.boot:spring-boot-starter-data-jpa")
    implementation("org.springframework.boot:spring-boot-starter-security")
    implementation("org.springframework.boot:spring-boot-starter-validation")

    // QueryDSL -- jakarta classifier required for Boot 3.x
    implementation("com.querydsl:querydsl-jpa:5.1.0:jakarta")
    annotationProcessor("com.querydsl:querydsl-apt:5.1.0:jakarta")
    annotationProcessor("jakarta.persistence:jakarta.persistence-api")

    // Flyway -- flyway-mysql covers MariaDB
    implementation("org.flywaydb:flyway-core")
    implementation("org.flywaydb:flyway-mysql")

    // Database
    runtimeOnly("org.mariadb.jdbc:mariadb-java-client")

    // SpringDoc OpenAPI (Swagger UI)
    implementation("org.springdoc:springdoc-openapi-starter-webmvc-ui:2.8.16")

    // MapStruct
    implementation("org.mapstruct:mapstruct:1.6.3")
    annotationProcessor("org.mapstruct:mapstruct-processor:1.6.3")

    // Test
    testImplementation("org.springframework.boot:spring-boot-starter-test")
    testImplementation("org.springframework.security:spring-security-test")
}
```

**Installation (Frontend):**
```bash
npm create vite@latest frontend -- --template react-ts
cd frontend
npm install zustand @tanstack/react-query axios react-router react-hook-form zod
npm install -D tailwindcss@3.4 postcss autoprefixer @types/react @types/react-dom
```

**Version verification notes:**
- Spring Boot 3.5.13: released 2026-03-26, latest 3.5.x
- Spring Boot 3.4.13: released 2025-12-18, final 3.4.x (OSS ended)
- SpringDoc 2.8.16: latest stable, compatible with Boot 3.5
- Vite: npm shows 6.x as latest (PRD says 5 but 6 is current); using 6.x
- React: npm shows 19.2.4 latest but PRD specifies React 18; pin to 18.3.x
- TailwindCSS: npm shows 4.2.2 latest but CLAUDE.md recommends 3.4.x

## Architecture Patterns

### Recommended Project Structure
```
MiceSign/
├── backend/
│   ├── build.gradle.kts
│   ├── settings.gradle.kts
│   ├── gradle/
│   │   └── wrapper/
│   ├── .env.example
│   └── src/
│       ├── main/
│       │   ├── java/com/micesign/
│       │   │   ├── MiceSignApplication.java
│       │   │   ├── common/
│       │   │   │   ├── dto/           # ApiResponse envelope, PageResponse
│       │   │   │   └── exception/     # GlobalExceptionHandler
│       │   │   ├── config/            # WebConfig, SecurityConfig, SwaggerConfig
│       │   │   ├── controller/        # REST controllers
│       │   │   ├── domain/            # JPA entities
│       │   │   ├── dto/               # Request/Response DTOs
│       │   │   ├── repository/        # Spring Data JPA repos
│       │   │   ├── security/          # JWT filter, provider (Phase 2)
│       │   │   └── service/           # Business logic
│       │   └── resources/
│       │       ├── application.yml
│       │       ├── application-dev.yml
│       │       ├── application-prod.yml
│       │       └── db/migration/
│       │           ├── V1__create_schema.sql
│       │           └── V2__seed_data.sql
│       └── test/
│           └── java/com/micesign/
├── frontend/
│   ├── package.json
│   ├── vite.config.ts
│   ├── tsconfig.json
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   ├── index.html
│   └── src/
│       ├── main.tsx
│       ├── App.tsx
│       ├── api/                    # Axios instance, interceptors
│       ├── components/
│       │   └── ui/                 # Shared UI components
│       ├── features/
│       │   ├── auth/               # Login page (Phase 2)
│       │   └── document/           # Document pages (Phase 4+)
│       ├── hooks/                  # Custom hooks
│       ├── stores/                 # Zustand stores
│       ├── types/                  # TypeScript types
│       └── lib/                    # Utilities
├── docs/
│   ├── PRD_MiceSign_v2.0.md
│   └── FSD_MiceSign_v1.0.md
├── .planning/
├── CLAUDE.md
├── .gitignore
└── .env.example
```

### Pattern 1: API Response Envelope
**What:** All API responses wrapped in a standard envelope
**When to use:** Every controller endpoint
**Example:**
```java
// com.micesign.common.dto.ApiResponse
public record ApiResponse<T>(
    boolean success,
    T data,
    ErrorDetail error
) {
    public static <T> ApiResponse<T> ok(T data) {
        return new ApiResponse<>(true, data, null);
    }

    public static <T> ApiResponse<T> error(String code, String message) {
        return new ApiResponse<>(false, null, new ErrorDetail(code, message));
    }

    public record ErrorDetail(String code, String message) {}
}
```

### Pattern 2: Flyway Migration Naming
**What:** Versioned SQL migrations with descriptive names
**When to use:** All schema and seed data changes
**Example:**
```
V1__create_schema.sql          -- All 12 tables from PRD DDL
V2__seed_departments.sql       -- Department hierarchy
V3__seed_positions.sql         -- 7 Korean corporate positions
V4__seed_admin_user.sql        -- SUPER_ADMIN account
```

Alternative simpler approach (recommended for Phase 1 -- fewer files):
```
V1__create_schema.sql          -- All 12 tables
V2__seed_initial_data.sql      -- All seed data (departments, positions, admin)
```

### Pattern 3: Spring Profile Configuration
**What:** Layered YAML configuration with environment variable substitution
**When to use:** Database, server, and service configuration
**Example:**
```yaml
# application.yml (shared)
spring:
  application:
    name: micesign
  jpa:
    hibernate:
      ddl-auto: validate  # Flyway manages schema
    properties:
      hibernate:
        dialect: org.hibernate.dialect.MariaDBDialect
  flyway:
    enabled: true
    locations: classpath:db/migration

server:
  port: 8080
  servlet:
    context-path: /

springdoc:
  api-docs:
    path: /v3/api-docs
  swagger-ui:
    path: /swagger-ui.html

# application-dev.yml
spring:
  datasource:
    url: jdbc:mariadb://${DB_HOST:localhost}:${DB_PORT:3306}/${DB_NAME:micesign}
    username: ${DB_USER:micesign}
    password: ${DB_PASS:micesign}
  jpa:
    show-sql: true
```

### Pattern 4: Vite Dev Proxy
**What:** Proxy `/api/**` to backend during development
**When to use:** Local development only
**Example:**
```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
});
```

### Pattern 5: Health Check Endpoint
**What:** Simple actuator health check for verifying backend is running
**When to use:** Phase 1 success criteria verification
**Example:**
```yaml
# application.yml
management:
  endpoints:
    web:
      exposure:
        include: health
  endpoint:
    health:
      show-details: never
```
Health check at: `GET /actuator/health` returns `{"status": "UP"}`

### Anti-Patterns to Avoid
- **JPA ddl-auto=update in production:** Always use `validate` -- Flyway manages schema
- **Hardcoding database credentials:** Use environment variables with defaults for dev
- **Skipping Flyway from start:** Retrofitting migrations later is painful (per CLAUDE.md)
- **Mixing javax and jakarta:** Spring Boot 3.x is jakarta-only; all dependencies must use jakarta namespace
- **Using `spring.jpa.generate-ddl=true`:** Conflicts with Flyway

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Database migrations | Manual SQL scripts or ddl-auto | Flyway | Version control, rollback tracking, team collaboration |
| API documentation | Manual Swagger YAML/JSON | SpringDoc OpenAPI | Auto-generates from annotations, stays in sync |
| DTO mapping | Manual getter/setter copying | MapStruct | Compile-time safe, handles nested objects, less boilerplate |
| API response wrapping | Per-controller try/catch | Global exception handler + ApiResponse record | Consistent envelope, DRY |
| SUPER_ADMIN password hash | Runtime password generation | Pre-computed BCrypt hash in migration SQL | Reproducible, auditable |

**Key insight:** Phase 1 is foundation -- invest in getting patterns right because every subsequent phase builds on them.

## Common Pitfalls

### Pitfall 1: QueryDSL Missing Jakarta Classifier
**What goes wrong:** `NoClassDefFoundError` at compile time -- Q-classes not generated or reference javax.persistence
**Why it happens:** QueryDSL defaults to javax namespace; Spring Boot 3.x uses jakarta
**How to avoid:** Always use `:jakarta` classifier: `com.querydsl:querydsl-jpa:5.1.0:jakarta` and `com.querydsl:querydsl-apt:5.1.0:jakarta`
**Warning signs:** Build compiles but Q-classes reference `javax.persistence`

### Pitfall 2: Flyway MariaDB Module Missing
**What goes wrong:** `FlywayException: Unsupported Database: MariaDB 10.11`
**Why it happens:** Since Flyway 10.x, database-specific modules are separate. `flyway-core` alone does not include MariaDB support.
**How to avoid:** Add `org.flywaydb:flyway-mysql` dependency (covers both MySQL and MariaDB)
**Warning signs:** Application fails to start with Flyway error even though datasource is correct

### Pitfall 3: Java Version Mismatch
**What goes wrong:** Compilation errors or runtime class version issues
**Why it happens:** System default is Java 24 but project targets Java 17
**How to avoid:** Set `sourceCompatibility = JavaVersion.VERSION_17` and `targetCompatibility = JavaVersion.VERSION_17` in build.gradle.kts. Also set `JAVA_HOME` to Corretto 17.0.18 path or use Gradle toolchain:
```kotlin
java {
    toolchain {
        languageVersion = JavaLanguageVersion.of(17)
    }
}
```
**Warning signs:** `Unsupported class file major version` errors

### Pitfall 4: MariaDB `user` Table Reserved Word
**What goes wrong:** SQL syntax errors when creating or querying the `user` table
**Why it happens:** `user` is a reserved word in MariaDB/MySQL
**How to avoid:** Always backtick-quote the table name in DDL and queries: `` CREATE TABLE `user` (...) ``. In JPA entity, use `@Table(name = "\`user\`")` or configure Hibernate to auto-quote.
**Warning signs:** SQL syntax error near 'user'

### Pitfall 5: BCrypt Hash in Flyway Migration
**What goes wrong:** SUPER_ADMIN password unusable or migration not reproducible
**Why it happens:** BCrypt generates different hashes each time; need a fixed hash for migration SQL
**How to avoid:** Pre-generate a BCrypt hash for the temporary password and hardcode it in V2 migration. Document the temporary password in .env.example or a setup guide. Example: password `admin1234!` with BCrypt hash `$2a$10$...` (generate once, embed in SQL).
**Warning signs:** Cannot log in with expected temporary password

### Pitfall 6: Vite Proxy Not Matching API Paths
**What goes wrong:** Frontend API calls return 404 or CORS errors in dev mode
**Why it happens:** Proxy path doesn't match the actual API prefix
**How to avoid:** Proxy `/api` which covers all `/api/v1/*` paths. Ensure backend context-path doesn't double the prefix.
**Warning signs:** Network tab shows requests going to localhost:5173 instead of 8080

### Pitfall 7: React 19 Auto-Install
**What goes wrong:** `npm create vite@latest` with `react-ts` template installs React 19 instead of 18
**Why it happens:** Vite 6.x template defaults to latest React (currently 19.x)
**How to avoid:** After scaffolding, immediately pin React versions in package.json: `"react": "^18.3.1"`, `"react-dom": "^18.3.1"`, then re-run `npm install`
**Warning signs:** React 19 breaking changes in strict mode, missing React 18 APIs

## Code Examples

### Flyway V1 Migration -- Schema Creation
```sql
-- V1__create_schema.sql
-- Source: PRD_MiceSign_v2.0.md Section 11.2

CREATE TABLE department (
    id          BIGINT AUTO_INCREMENT PRIMARY KEY,
    name        VARCHAR(100) NOT NULL COMMENT '부서명',
    parent_id   BIGINT NULL COMMENT '상위 부서 ID',
    sort_order  INT NOT NULL DEFAULT 0,
    is_active   BOOLEAN NOT NULL DEFAULT TRUE,
    created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (parent_id) REFERENCES department(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ... (all 12 tables from PRD DDL)
```

### Flyway V2 Migration -- Seed Data
```sql
-- V2__seed_initial_data.sql

-- Departments (Korean corporate structure)
INSERT INTO department (id, name, parent_id, sort_order, is_active) VALUES
(1, '대표이사실', NULL, 1, TRUE),
(2, '경영지원부', 1, 2, TRUE),
(3, '인사부', 1, 3, TRUE),
(4, '개발부', 1, 4, TRUE),
(5, '영업부', 1, 5, TRUE),
(6, '마케팅부', 1, 6, TRUE),
(7, '재무부', 1, 7, TRUE);

-- Positions (Korean corporate hierarchy)
INSERT INTO position (id, name, sort_order, is_active) VALUES
(1, '사원', 1, TRUE),
(2, '대리', 2, TRUE),
(3, '과장', 3, TRUE),
(4, '차장', 4, TRUE),
(5, '부장', 5, TRUE),
(6, '이사', 6, TRUE),
(7, '대표이사', 7, TRUE);

-- SUPER_ADMIN account (temporary password: admin1234!)
-- BCrypt hash must be pre-generated
INSERT INTO `user` (employee_no, name, email, password, department_id, position_id, role, status)
VALUES ('ADMIN001', '시스템관리자', 'admin@micesign.com',
        '$2a$10$XXXXX_PRE_GENERATED_BCRYPT_HASH_XXXXX',
        1, 7, 'SUPER_ADMIN', 'ACTIVE');

-- Approval templates (3 MVP forms)
INSERT INTO approval_template (code, name, description, prefix, is_active, sort_order) VALUES
('GENERAL', '일반 업무 기안', '일반 업무에 대한 기안 양식', 'GEN', TRUE, 1),
('EXPENSE', '지출 결의서', '비용 지출에 대한 결의 양식', 'EXP', TRUE, 2),
('LEAVE', '휴가 신청서', '휴가 신청 양식', 'LVE', TRUE, 3);
```

### Gradle Toolchain Configuration
```kotlin
// build.gradle.kts -- ensuring Java 17 regardless of system JDK
java {
    toolchain {
        languageVersion = JavaLanguageVersion.of(17)
    }
}
```

### Axios Instance Setup (Frontend Foundation)
```typescript
// src/api/client.ts
import axios from 'axios';

const apiClient = axios.create({
  baseURL: '/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Response interceptor for envelope unwrapping
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // JWT refresh interceptor will be added in Phase 2
    return Promise.reject(error);
  }
);

export default apiClient;
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Spring Boot 3.4.x | Spring Boot 3.5.x | 3.4 OSS ended Dec 2025 | Use 3.5.13 for active security patches |
| SpringDoc 2.5.x | SpringDoc 2.8.16 | 2.8.9+ required for Boot 3.5 | Earlier versions throw NoSuchMethodError |
| Vite 5.x | Vite 6.x | Vite 6 current stable | Drop-in upgrade, no breaking changes for React projects |
| Tailwind 3.x | Tailwind 4.x stable | Jan 2025 | CLAUDE.md still recommends 3.4.x; v4 is viable but respect project constraint |
| Flyway single module | Flyway core + DB-specific modules | Flyway 10.x | Must add flyway-mysql for MariaDB support |
| React 18 | React 19 available | Dec 2024 | PRD specifies React 18; pin explicitly when using Vite 6 template |

**Deprecated/outdated:**
- SpringFox Swagger: abandoned, replaced by SpringDoc
- QueryDSL javax classifiers: must use jakarta for Spring Boot 3.x
- Spring Boot 3.3.x and below: all past OSS support end dates

## Open Questions

1. **Vite Version: 5 vs 6**
   - What we know: PRD says "Vite 5" but Vite 6 is current stable with no breaking changes for React projects
   - What's unclear: Whether the user intentionally chose Vite 5 or just wrote the version available at PRD time
   - Recommendation: Use Vite 6.x -- it is backward compatible and PRD says "Vite 5" which was current when written. If user objects, downgrade is trivial.

2. **Tailwind 3.4 vs 4.x**
   - What we know: CLAUDE.md says "Tailwind v4 ecosystem maturity uncertain; verify before adopting" and recommends 3.4.x. However, Tailwind v4 has been stable since Jan 2025 (14+ months).
   - What's unclear: Whether this CLAUDE.md guidance should be updated
   - Recommendation: Follow CLAUDE.md and use 3.4.x. Upgrading later is straightforward.

3. **Spring Boot 3.5.x vs 3.4.13**
   - What we know: PRD says "3.x". 3.4 OSS ended Dec 2025; 3.5.13 is latest with active patches until Jun 2026.
   - Recommendation: Use 3.5.13. It is the only 3.x with OSS support. Migration from 3.4 to 3.5 is minor.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Java 17 | Backend compilation | Yes | Corretto 17.0.18 (arm64) | Set JAVA_HOME or use Gradle toolchain |
| Node.js 20.19+ | Frontend build (Vite 6) | Yes | 22.13.0 | -- |
| npm | Package management | Yes | 11.10.0 | -- |
| Gradle | Backend build | Yes | 8.1.1 (global) | Use Gradle wrapper (recommended) |
| MariaDB 10.11+ | Database | **No** | -- | Install via Homebrew (`brew install mariadb@10.11`) or run via Docker (`docker run mariadb:10.11`) |
| Docker | MariaDB fallback | Yes | 29.3.1 | -- |

**Missing dependencies with no fallback:**
- MariaDB 10.11 must be installed or run via Docker before backend can start

**Missing dependencies with fallback:**
- Gradle global (8.1.1) is older; use Gradle Wrapper (`gradle wrapper --gradle-version 8.12`) to pin the project version

**Java 17 activation:**
```bash
# Set for this project via Gradle toolchain (recommended -- no manual JAVA_HOME needed)
# OR manually:
export JAVA_HOME=$(/usr/libexec/java_home -v 17)
```

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | JUnit 5 + Spring Boot Test (backend), Vitest (frontend -- to be set up) |
| Config file | None -- Wave 0 creates them |
| Quick run command | `cd backend && ./gradlew test --tests "*HealthCheck*"` |
| Full suite command | `cd backend && ./gradlew test` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| ORG-05 | Seed data exists after Flyway migration | integration | `./gradlew test --tests "*SeedDataTest*"` | No -- Wave 0 |
| (implicit) | Health check endpoint responds 200 | integration | `./gradlew test --tests "*HealthCheckTest*"` | No -- Wave 0 |
| (implicit) | Flyway migrations run successfully | integration | `./gradlew test --tests "*FlywayMigrationTest*"` | No -- Wave 0 |
| (implicit) | Frontend loads in browser | smoke / manual | `cd frontend && npm run dev` then check browser | Manual |
| (implicit) | Swagger UI accessible | smoke / manual | `curl http://localhost:8080/swagger-ui.html` | Manual |

### Sampling Rate
- **Per task commit:** `cd backend && ./gradlew test`
- **Per wave merge:** Full backend test suite + frontend build check (`cd frontend && npm run build`)
- **Phase gate:** All tests green, backend starts, frontend loads, Swagger UI accessible

### Wave 0 Gaps
- [ ] `backend/src/test/java/com/micesign/SeedDataTest.java` -- verifies departments, positions, admin user exist after migration (covers ORG-05)
- [ ] `backend/src/test/java/com/micesign/HealthCheckTest.java` -- verifies /actuator/health returns 200
- [ ] `backend/src/test/resources/application-test.yml` -- test profile with H2 or testcontainers MariaDB
- [ ] Gradle Wrapper files (`gradlew`, `gradle/wrapper/`) -- must be generated

## Sources

### Primary (HIGH confidence)
- PRD_MiceSign_v2.0.md Section 11.2 -- complete DDL for all 12 tables
- CLAUDE.md -- tech stack validation, critical gaps, what NOT to use
- CONTEXT.md -- all 16 locked decisions for this phase

### Secondary (MEDIUM confidence)
- [Spring Boot endoflife.date](https://endoflife.date/spring-boot) -- 3.5.13 latest, 3.4 OSS ended Dec 2025
- [SpringDoc OpenAPI issue #3041](https://github.com/springdoc/springdoc-openapi/issues/3041) -- 2.8.9+ required for Boot 3.5
- [Spring Boot 3 QueryDSL Gradle setup](https://dev.to/markliu2013/spring-boot-3-integrate-querydsl-with-gradle-2mfp) -- jakarta classifier pattern
- [Flyway MariaDB docs](https://flywaydb.org/documentation/database/mariadb) -- flyway-mysql module required

### Tertiary (LOW confidence)
- Exact latest MapStruct version (stated 1.6.3 based on training data -- verify with Maven Central)
- Exact latest spring-dependency-management plugin version (stated 1.1.7 -- verify)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- versions verified against endoflife.date, npm registry, and web search results
- Architecture: HIGH -- patterns derived directly from PRD and locked CONTEXT.md decisions
- Pitfalls: HIGH -- QueryDSL jakarta issue and Flyway module separation are well-documented community pain points

**Research date:** 2026-03-31
**Valid until:** 2026-04-30 (stable technologies, 30-day validity)

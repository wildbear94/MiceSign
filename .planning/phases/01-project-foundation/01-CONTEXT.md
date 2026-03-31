# Phase 1: Project Foundation - Context

**Gathered:** 2026-03-31
**Status:** Ready for planning

<domain>
## Phase Boundary

A runnable Spring Boot + React project with all dependencies wired, database schema migrated via Flyway, and seed data (departments, positions, SUPER_ADMIN account) loaded on first run. This phase delivers the foundation — no business logic beyond seeding.

</domain>

<decisions>
## Implementation Decisions

### Project Structure
- **D-01:** Monorepo — single repository with `backend/` and `frontend/` directories at root
- **D-02:** Base Java package: `com.micesign` with sub-packages (.controller, .service, .repository, .domain, .config, .security, .dto, .common)
- **D-03:** Single-module Gradle project with Kotlin DSL (`build.gradle.kts`)
- **D-04:** Layer-first backend package structure (com.micesign.controller, .service, .repository, etc.)
- **D-05:** Feature-folder frontend structure (src/features/auth/, src/features/document/, etc.) with shared UI in src/components/ui/
- **D-06:** `docs/` stays at project root level (alongside backend/ and frontend/)

### Seed Data
- **D-07:** Realistic Korean company departments — 일반적인 한국 기업 부서 구조 (경영지원부, 개발부, 영업부, 인사부 등) — Claude creates reasonable set
- **D-08:** Standard Korean corporate positions — 사원, 대리, 과장, 차장, 부장, 이사, 대표이사 with appropriate sort_order
- **D-09:** Fixed default SUPER_ADMIN account: admin@micesign.com with temporary password, created via Flyway migration

### Dev Environment
- **D-10:** Database connection via environment variables (DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASS) with .env.example provided
- **D-11:** Two Spring profiles: `dev` (application-dev.yml) + `prod` (application-prod.yml) with shared `application.yml`
- **D-12:** Vite dev server proxy for `/api/**` requests to localhost:8080 — no backend CORS configuration needed for local dev

### API Conventions
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

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Product Requirements
- `docs/PRD_MiceSign_v2.0.md` — Full product requirements including DB schema DDL, tech stack decisions, architecture
- `docs/FSD_MiceSign_v1.0.md` — Functional specifications with API contracts, error codes, business rules

### Project Planning
- `.planning/ROADMAP.md` — Phase breakdown, success criteria, dependencies
- `.planning/REQUIREMENTS.md` — Requirement IDs and traceability (ORG-05 maps to this phase)
- `CLAUDE.md` — Tech stack validation, critical gaps (Flyway, React Hook Form, Axios), what NOT to use

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- None — greenfield project, no existing code

### Established Patterns
- None — patterns to be established in this phase

### Integration Points
- Flyway migrations create the schema that all subsequent phases depend on
- Seed data provides the departments, positions, and admin account needed for Phase 2 (Authentication) testing
- SpringDoc Swagger UI provides API exploration for all future phases
- .env.example and profile setup establish the configuration pattern for all phases

</code_context>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches. Follow PRD tech stack exactly (Java 17, Spring Boot 3.x, React 18, Vite 5, TypeScript, Zustand, TanStack Query v5, TailwindCSS, MariaDB 10.11+).

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 01-project-foundation*
*Context gathered: 2026-03-31*

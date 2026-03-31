# Stack Research: MiceSign

**Domain:** In-house electronic approval (전자 결재) system
**Date:** 2026-03-31
**Confidence:** MEDIUM-HIGH (versions need verification against current releases)

## PRD Stack Validation

The PRD-specified stack is **validated as cohesive and appropriate** for a 50-user in-house system built by a solo developer.

### Backend — Validated

| Component | PRD Choice | Recommendation | Confidence |
|-----------|-----------|----------------|------------|
| Runtime | Java 17 | **Java 17 LTS** — correct, well-supported | HIGH |
| Framework | Spring Boot 3.x | **Spring Boot 3.4.x** (latest stable) | HIGH |
| Security | Spring Security + JWT | **Spring Security 6.x** (auto with Boot 3.4) + jjwt 0.12.x | HIGH |
| ORM | JPA/Hibernate | **Hibernate 6.x** (auto with Boot 3.4) | HIGH |
| Query | QueryDSL | **QueryDSL 5.1.0 (`jakarta` classifier required)** | HIGH |
| Build | Gradle | **Gradle 8.x** with Kotlin DSL | HIGH |

### Frontend — Validated

| Component | PRD Choice | Recommendation | Confidence |
|-----------|-----------|----------------|------------|
| Framework | React 18 | **React 18.3.x** | HIGH |
| Bundler | Vite 5 | **Vite 5.x or 6.x** (verify current stable) | MEDIUM |
| Language | TypeScript | **TypeScript 5.x** | HIGH |
| Client State | Zustand | **Zustand 5.x** | HIGH |
| Server State | TanStack Query v5 | **TanStack Query v5.x** | HIGH |
| Styling | TailwindCSS | **Tailwind 3.4.x** (v4 ecosystem maturity needs verification) | MEDIUM |

### Database — Validated

| Component | PRD Choice | Recommendation | Confidence |
|-----------|-----------|----------------|------------|
| RDBMS | MariaDB 10.11+ | **MariaDB 10.11 LTS** — avoid 11.x (short-term support only) | HIGH |

### File Storage — Validated

| Component | PRD Choice | Recommendation | Confidence |
|-----------|-----------|----------------|------------|
| Storage | Google Drive API v3 | **google-api-services-drive v3** with Service Account | HIGH |

## Critical Gaps Identified

Libraries missing from the PRD that are required for implementation:

### Must-Have (blocking without these)

| Library | Purpose | Why Required |
|---------|---------|--------------|
| **Flyway** | Database migration | Schema versioning from day one; retrofitting is painful |
| **React Hook Form + Zod** | Form management + validation | Document template forms need complex validation (expense items, date ranges) |
| **Axios** | HTTP client | Interceptors needed for JWT refresh token flow (401 → refresh → retry) |
| **React Router 7** | Client-side routing | SPA navigation between dashboard, document list, form pages |

### Should-Have (significant quality improvement)

| Library | Purpose | Why Recommended |
|---------|---------|-----------------|
| **MapStruct** | DTO ↔ Entity mapping | Reduces boilerplate, compile-time safety for 10+ entity types |
| **SpringDoc OpenAPI** | API documentation | Swagger UI invaluable for solo dev testing/debugging |
| **Headless UI / Radix** | Accessible UI primitives | Complex components like approval line selector, org tree picker |

## What NOT to Use

| Technology | Why Not |
|-----------|---------|
| MariaDB 11.x | Short-term maintenance releases only; 10.11 is LTS |
| Tailwind v4 | Ecosystem maturity uncertain; verify before adopting |
| Lombok | Controversial, IDE issues; Java 17 records handle most use cases |
| Spring WebFlux | Reactive overkill for 50 users; stick with servlet stack |
| Hibernate Envers | Complex for simple audit logging; custom audit_log table is simpler |
| Dynamic form builder | Hardcoded components are correct for this scale |

## Key Setup Notes

- **QueryDSL Gradle setup** is a known pain point — requires annotation processor configuration with `jakarta` classifier for Spring Boot 3.x
- **Flyway** must be included from Phase 1 setup — all schema changes through migration files
- **Axios interceptor pattern** must be designed before building auth — JWT refresh flow is the foundation

## Roadmap Implications

1. Project scaffolding phase must include Flyway, Axios interceptor setup, and QueryDSL annotation processor config
2. Auth module depends on Axios interceptor pattern being in place
3. Form components depend on React Hook Form + Zod being installed
4. Approval line editor needs Headless UI for accessible tree/list components

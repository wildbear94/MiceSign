# Phase 1: Project Foundation - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-03-31
**Phase:** 01-project-foundation
**Areas discussed:** Project structure, Seed data content, Dev environment setup, API conventions

---

## Project Structure

| Option | Description | Selected |
|--------|-------------|----------|
| Monorepo | Single repo with backend/ and frontend/ directories | ✓ |
| Separate repos | Separate backend and frontend repositories | |

**User's choice:** Monorepo
**Notes:** Simpler for solo dev — one git history, one PR for full-stack changes.

### Package Name

| Option | Description | Selected |
|--------|-------------|----------|
| com.micesign | Short and clean | ✓ |
| com.company.micesign | More conventional with company prefix | |

**User's choice:** com.micesign

### Gradle Module

| Option | Description | Selected |
|--------|-------------|----------|
| Single module | One build.gradle for the entire backend | ✓ |
| Multi-module | Separate modules (core, api, infra) | |

**User's choice:** Single module

### Backend Package Pattern

| Option | Description | Selected |
|--------|-------------|----------|
| Layer-first | .controller, .service, .repository, .domain, .config | ✓ |
| Feature-first | .auth, .document, .approval, .organization | |

**User's choice:** Layer-first

### Frontend Structure

| Option | Description | Selected |
|--------|-------------|----------|
| Feature folders | src/features/auth/, src/features/document/, etc. | ✓ |
| Type folders | src/components/, src/hooks/, src/pages/ | |

**User's choice:** Feature folders

### Gradle DSL

| Option | Description | Selected |
|--------|-------------|----------|
| Kotlin DSL | build.gradle.kts — type-safe, modern | ✓ |
| Groovy DSL | build.gradle — more examples online | |

**User's choice:** Kotlin DSL

### Docs Location

| Option | Description | Selected |
|--------|-------------|----------|
| Root level (keep as-is) | docs/ at project root | ✓ |

**User's choice:** Root level

---

## Seed Data Content

### Departments

| Option | Description | Selected |
|--------|-------------|----------|
| Realistic company structure | Match actual Korean corporate departments | ✓ |
| Minimal placeholder | Just 2-3 generic departments | |

**User's choice:** Realistic company structure
**Notes:** Claude creates reasonable Korean department names.

### SUPER_ADMIN Account

| Option | Description | Selected |
|--------|-------------|----------|
| 고정 기본값 | admin@micesign.com / 임시 비밀번호, Flyway로 생성 | ✓ |
| 환경변수로 설정 | ADMIN_EMAIL, ADMIN_PASSWORD 환경변수 | |

**User's choice:** 고정 기본값

### Positions

| Option | Description | Selected |
|--------|-------------|----------|
| 일반적 한국 기업 직급 | 사원, 대리, 과장, 차장, 부장, 이사, 대표이사 | ✓ |
| 간소화된 직급 | 사원, 팀장, 부서장, 임원 (4단계) | |

**User's choice:** 일반적 한국 기업 직급

---

## Dev Environment Setup

### Database Config

| Option | Description | Selected |
|--------|-------------|----------|
| 기본값 | localhost:3306, micesign/micesign | |
| 환경변수 기반 | DB_HOST, DB_PORT 등 환경변수. .env.example 제공 | ✓ |

**User's choice:** 환경변수 기반

### Spring Profiles

| Option | Description | Selected |
|--------|-------------|----------|
| dev + prod | 2개 프로필 (로컬 + 운영) | ✓ |
| dev + staging + prod | 3단계 환경 | |

**User's choice:** dev + prod

### CORS

| Option | Description | Selected |
|--------|-------------|----------|
| Vite proxy | Frontend에서 Vite dev server가 프록시 | ✓ |
| Backend CORS 설정 | Spring Security에서 CORS 허용 | |
| Both | 양쪽 모두 설정 | |

**User's choice:** Vite proxy

---

## API Conventions

### Response Format

| Option | Description | Selected |
|--------|-------------|----------|
| Envelope 패턴 | {"success": true, "data": {...}, "error": null} | ✓ |
| Direct response | 성공 시 데이터 직접 반환 | |

**User's choice:** Envelope 패턴

### API Path Prefix

| Option | Description | Selected |
|--------|-------------|----------|
| /api/v1 | 버전 관리 가능, Nginx 설정 편리 | ✓ |
| /api | 버전 없이 단순하게 | |

**User's choice:** /api/v1

### Error Response

| Option | Description | Selected |
|--------|-------------|----------|
| FSD 에러 코드 따르기 | FSD에 정의된 에러 코드 체계 사용 | ✓ |

**User's choice:** FSD 에러 코드 따르기

### Pagination

| Option | Description | Selected |
|--------|-------------|----------|
| 20건 기본 | page=0, size=20, Spring Data Pageable | ✓ |
| 10건 기본 | page=0, size=10 | |

**User's choice:** 20건 기본

---

## Claude's Discretion

- Exact department hierarchy (parent-child relationships)
- Number and names of seed departments
- Flyway migration file naming and ordering
- SpringDoc OpenAPI configuration
- .env.example content and variable naming
- Port configuration defaults

## Deferred Ideas

None — discussion stayed within phase scope

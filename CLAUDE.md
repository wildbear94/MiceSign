# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

MiceSign is an in-house electronic approval (전자 결재) system replacing legacy tools like Docswave. The project is in pre-development stage with detailed requirements documents in `docs/`.

- **PRD:** `docs/PRD_MiceSign_v2.0.md` — product requirements, tech stack, architecture, DB schema
- **FSD:** `docs/FSD_MiceSign_v1.0.md` — functional specifications with API contracts, business rules, error codes

## Tech Stack

### Backend
- Java 17, Spring Boot 3.x, Spring Security + JWT (stateless)
- JPA (Hibernate) + QueryDSL for complex queries
- MariaDB 10.11+ (utf8mb4/utf8mb4_unicode_ci)
- Google Drive API v3 (Service Account) for file storage
- Gradle build → `.jar` → systemd service

### Frontend
- React 18 + Vite 5 + TypeScript
- Zustand (client state) + TanStack Query v5 (server state)
- TailwindCSS
- Each approval form template is a hardcoded React component (not dynamic rendering)
- Static build → Nginx serving

### Infrastructure
- Native deployment (no Docker) on Linux server
- Nginx reverse proxy + HTTPS (Let's Encrypt)
- GitHub Actions → SSH deploy

## Architecture Decisions

- **JWT Auth:** Access Token in frontend memory (Zustand), Refresh Token in HttpOnly/Secure/SameSite=Strict cookie. Refresh Token Rotation enabled.
- **RBAC:** Three roles — SUPER_ADMIN, ADMIN, USER. Use `@PreAuthorize` annotations.
- **Approval workflow:** Fully manual approval line selection (no auto-routing rules). Sequential processing for APPROVE/AGREE types; REFERENCE is immediate read-only access.
- **Document immutability:** Once submitted (SUBMITTED), document body, attachments, and approval line are locked. Changes require withdrawal → new document.
- **Document states:** DRAFT → SUBMITTED → APPROVED/REJECTED/WITHDRAWN. Resubmission always creates a new document.
- **Document numbering:** `{prefix}-{year}-{sequence}` (e.g., GEN-2026-0001). Assigned at submission, not at draft.
- **Form templates:** Each template type is a separate React component registered in `TEMPLATE_REGISTRY`. Adding a form = new component + registry entry.
- **File storage:** Files stored in Google Drive; only metadata (filename, size, MIME type, Drive File ID) in DB. Folder structure: `MiceSign/{year}/{month}/{docNumber}/`.
- **Audit log:** Immutable append-only log for all document state changes and key user actions. Never modify or delete.

## MVP Phasing

| Phase | Scope |
|-------|-------|
| 1-A (MVP) | Core approval flow, auth, 3 basic forms (GENERAL, EXPENSE, LEAVE) |
| 1-B | Extended forms, SMTP notifications, search/filter, dashboard |
| 1-C | Audit log UI, statistics/reports, handover features |
| 2 | AI-assisted proposal system |

## Database

Key tables: `department`, `position`, `user`, `approval_template`, `document`, `document_content` (JSON body), `approval_line`, `document_attachment`, `doc_sequence`, `notification_log`, `audit_log`, `refresh_token`. Full DDL is in the PRD.

## Language

All documentation is in Korean. UI text, error messages, and business terminology should follow Korean conventions as specified in the FSD.

<!-- GSD:project-start source:PROJECT.md -->
## Project

**MiceSign**

An in-house electronic approval (전자 결재) system for a small company (~50 employees), replacing legacy Docswave. Users can draft documents, set approval lines, and process approvals through a web interface. Built as a solo developer project with AI assistance.

**Core Value:** Employees can submit approval documents and get them approved/rejected through a clear, sequential workflow — replacing the external SaaS dependency with a self-hosted system.

### Constraints

- **Tech stack:** Java 17 + Spring Boot 3.x + Spring Security + JWT + JPA/Hibernate + QueryDSL + Gradle (backend), React 18 + Vite 5 + TypeScript + Zustand + TanStack Query v5 + TailwindCSS (frontend), MariaDB 10.11+ (database)
- **Auth:** Stateless JWT — Access Token in memory (30min TTL), Refresh Token in HttpOnly cookie (14 days TTL) with rotation
- **DB charset:** utf8mb4 / utf8mb4_unicode_ci
- **File storage:** Google Drive API v3 with Service Account — metadata only in DB
- **Form templates:** Hardcoded React components per template type, not a dynamic form builder
- **Approval rules:** 100% manual approval line selection by drafter — no auto-routing
<!-- GSD:project-end -->

<!-- GSD:stack-start source:research/STACK.md -->
## Technology Stack

## PRD Stack Validation
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
<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->
## Conventions

Conventions not yet established. Will populate as patterns emerge during development.
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->
## Architecture

Architecture not yet mapped. Follow existing patterns found in the codebase.
<!-- GSD:architecture-end -->

<!-- GSD:workflow-start source:GSD defaults -->
## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:
- `/gsd:quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd:debug` for investigation and bug fixing
- `/gsd:execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->

<!-- GSD:profile-start -->
## Developer Profile

> Profile not yet configured. Run `/gsd:profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->

## Skill routing

When the user's request matches an available skill, ALWAYS invoke it using the Skill
tool as your FIRST action. Do NOT answer directly, do NOT use other tools first.
The skill has specialized workflows that produce better results than ad-hoc answers.

Key routing rules:
- Product ideas, "is this worth building", brainstorming → invoke office-hours
- Bugs, errors, "why is this broken", 500 errors → invoke investigate
- Ship, deploy, push, create PR → invoke ship
- QA, test the site, find bugs → invoke qa
- Code review, check my diff → invoke review
- Update docs after shipping → invoke document-release
- Weekly retro → invoke retro
- Design system, brand → invoke design-consultation
- Visual audit, design polish → invoke design-review
- Architecture review → invoke plan-eng-review
- Save progress, checkpoint, resume → invoke checkpoint
- Code quality, health check → invoke health

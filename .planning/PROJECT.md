# MiceSign

## What This Is

An in-house electronic approval (전자 결재) system for a small company (~50 employees), replacing legacy Docswave. Users can draft documents, set approval lines, and process approvals through a web interface. Built as a solo developer project with AI assistance.

## Core Value

Employees can submit approval documents and get them approved/rejected through a clear, sequential workflow — replacing the external SaaS dependency with a self-hosted system.

## Requirements

### Validated

- [x] Project scaffolding: Spring Boot 3.x backend + React 18 frontend runnable — Validated in Phase 1: Project Foundation
- [x] Database schema: 12-table Flyway DDL with seed data (departments, positions, SUPER_ADMIN, templates) — Validated in Phase 1: Project Foundation (ORG-05)
- [x] JWT-based authentication (login, token refresh, logout) — Validated in Phase 2: Authentication (AUTH-01, AUTH-02, AUTH-03, AUTH-05)
- [x] Account lockout after failed login attempts — Validated in Phase 2: Authentication (AUTH-04)
- [x] Password management (user change + admin reset) — Validated in Phase 2: Authentication (AUTH-06, AUTH-07)

### Active
- [x] SMTP email notifications for all document state changes — Validated in Phase 9: SMTP Email Notifications (NTF-01, NTF-02, NTF-03)
- [x] Document search/filter (title, doc number, drafter name + status/date/template filters) — Validated in Phase 11: Document Search & Filter (SRCH-01, SRCH-02)
- [x] Additional form templates: purchase request, business trip report, overtime request — Validated in Phase 10: Additional Form Templates (TPL-04, TPL-05, TPL-06)
- [ ] Custom template builder (Admin drag & drop form designer)

## Current Milestone: v1.1 Extended Features

**Goal:** 알림, 검색, 추가 양식, 커스텀 양식 빌더로 전자결재 시스템 확장

**Target features:**
- SMTP 이메일 알림 (모든 문서 상태 변경 — 제출/승인/반려/회수)
- 문서 검색/필터 (제목, 문서번호, 기안자명 검색 + 상태/날짜/양식 필터)
- 추가 양식 템플릿 3종 (구매요청서, 출장보고서, 연장근무신청서)
- 커스텀 템플릿 빌더 (Admin이 드래그&드롭으로 새 양식 생성)

### Validated (Phases 3-8)
- [x] Admin-managed organization structure (departments, positions, users) — Validated in Phase 3: Organization Management (ORG-01, ORG-02, ORG-03, ORG-04)
- [x] RBAC with three roles (SUPER_ADMIN, ADMIN, USER) — Validated in Phase 3: Organization Management
- [x] Document drafting with template-based forms (GENERAL, EXPENSE, LEAVE) — Validated in Phase 4: Document Core & Templates (DOC-01, DOC-02, DOC-05, DOC-06, TPL-01, TPL-02, TPL-03)
- [x] Document immutability after submission (locked body, attachments, approval line) — Validated in Phase 6: Document Submission & Numbering (DOC-03, DOC-04)
- [x] Document numbering system (prefix-year-sequence, assigned at submission) — Validated in Phase 6: Document Submission & Numbering (DOC-07)
- [x] File attachments via Google Drive API (Service Account) — Validated in Phase 5: File Attachments (FILE-01, FILE-02, FILE-03)
- [x] Flexible approval line selection (APPROVE, AGREE, REFERENCE types) — Validated in Phase 7: Approval Workflow (APR-01, APR-02)
- [x] Sequential approval workflow with document state machine (DRAFT → SUBMITTED → APPROVED/REJECTED/WITHDRAWN) — Validated in Phase 7: Approval Workflow (APR-03, APR-04, APR-05, APR-06, APR-07)
- [x] Dashboard with pending approvals, recent documents, badge counts — Validated in Phase 8: Dashboard & Audit (DASH-01, DASH-02, DASH-03)
- [x] Immutable audit trail for all document state changes and key user actions — Validated in Phase 8: Dashboard & Audit (AUD-01)

### Out of Scope

- Statistics/reports — deferred to future milestone
- Handover features — deferred to future milestone
- AI-assisted proposals — deferred to Phase 2
- Data migration from Docswave — fresh start, no migration needed
- Docker containerization — native deployment, local dev for now
- Mobile app — web only

## Context

- **Company size:** ~50 employees, small organization
- **PRD:** `docs/PRD_MiceSign_v2.0.md` — full product requirements with DB schema DDL
- **FSD:** `docs/FSD_MiceSign_v1.0.md` — detailed functional specs with API contracts, error codes, business rules
- **Developer:** Solo developer + AI assistance, familiar with Java/Spring Boot
- **Existing docs:** Korean documentation, Korean UI strings, mixed Korean/English code acceptable
- **Google Drive:** Service Account configured and ready for file storage
- **Deployment target:** Local development environment for now, production server setup later

## Constraints

- **Tech stack:** Java 17 + Spring Boot 3.x + Spring Security + JWT + JPA/Hibernate + QueryDSL + Gradle (backend), React 18 + Vite 5 + TypeScript + Zustand + TanStack Query v5 + TailwindCSS (frontend), MariaDB 10.11+ (database)
- **Auth:** Stateless JWT — Access Token in memory (30min TTL), Refresh Token in HttpOnly cookie (14 days TTL) with rotation
- **DB charset:** utf8mb4 / utf8mb4_unicode_ci
- **File storage:** Google Drive API v3 with Service Account — metadata only in DB
- **Form templates:** Hardcoded React components per template type, not a dynamic form builder
- **Approval rules:** 100% manual approval line selection by drafter — no auto-routing

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Keep Spring Boot despite solo dev | Developer familiarity + company environment | — Pending |
| Google Drive for file storage | Already configured, company infrastructure | — Pending |
| Hardcoded form components | Simpler for MVP, each form is a React component | — Pending |
| Local dev first, deploy later | Focus on building features, server not ready | — Pending |
| Korean/English mixed code | Matches team culture and domain terminology | — Pending |
| Phase 1-A MVP scope only | Ship minimal viable approval flow first | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd:transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd:complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-04-05 — Phase 11 complete (Document Search & Filter: keyword search, multi-criteria filters, tab-scoped RBAC, URL state sync)*

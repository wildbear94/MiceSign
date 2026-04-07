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
- [ ] 로그인 화면에서 사용자 자가 등록 신청 (이름, 이메일, 비밀번호)
- [ ] SUPER_ADMIN이 등록 신청을 승인 또는 거부할 수 있는 관리 화면
- [ ] 승인 시 자동 계정 생성 (부서/직급은 관리자가 이후 설정)
- [ ] 등록 신청/승인/거부 시 이메일 알림 발송

### Out of Scope

- SMTP email notifications — ✓ Shipped in v1.1 Phase 9
- Document search/filtering — ✓ Shipped in v1.1 Phase 11
- Audit log query UI — deferred to Phase 1-C
- Statistics/reports — deferred to Phase 1-C
- Handover features — deferred to Phase 1-C
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

## Current Milestone: v1.3 사용자 등록 신청

**Goal:** 로그인 화면에서 사용자가 직접 계정을 신청하고, SUPER_ADMIN이 승인/거부할 수 있는 셀프 등록 시스템

**Target features:**
- 로그인 화면에서 사용자 자가 등록 신청 (이름, 이메일, 비밀번호)
- SUPER_ADMIN 관리 화면에서 신청 목록 조회 및 승인/거부 처리
- 승인 시 자동 계정 생성 (부서/직급은 관리자가 이후 설정)
- 신청/승인/거부 시 이메일 알림 발송 (기존 Phase 9 이메일 인프라 재활용)

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
*Last updated: 2026-04-07 after Milestone v1.3 started*

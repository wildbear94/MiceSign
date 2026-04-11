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
- [ ] 실시간 미리보기 패널 + 전체화면 미리보기 버튼
- [ ] 표(table) 필드 컬럼 편집기 (컬럼 추가/삭제/순서변경/타입 설정)
- [ ] 조건부 표시 규칙 UI (필드별 설정 패널 내 조건 탭)
- [ ] 계산 규칙 UI (필드별 설정 패널 내 계산 탭)
- [ ] 양식 복제 기능
- [ ] JSON 내보내기/가져오기
- [ ] 기본 양식 템플릿 프리셋

### Out of Scope

- SMTP email notifications — deferred to Phase 1-B
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

## Current Milestone: v1.1 양식 생성 모달 창 고도화

**Goal:** 양식 관리 모달(TemplateFormModal)을 고급 빌더 수준으로 확장하여 관리자가 동적 양식을 시각적으로 설계하고, 미리보기하고, 재사용할 수 있도록 함

**Target features:**
- 실시간 미리보기 패널 + 전체화면 미리보기 버튼
- 표(table) 필드 컬럼 편집기
- 조건부 표시 규칙 UI (필드별 설정)
- 계산 규칙 UI (필드별 설정)
- 양식 복제 기능
- JSON 내보내기/가져오기
- 기본 양식 템플릿 프리셋

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
*Last updated: 2026-04-11 — Milestone v1.1 started (양식 생성 모달 창 고도화)*

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
- [x] 실시간 미리보기 패널 + 전체화면 미리보기 버튼 — Validated in Phase 22 (v1.1)
- [x] 표(table) 필드 컬럼 편집기 — Validated in Phase 23 (v1.1)
- [x] 조건부 표시 규칙 UI — Validated in Phase 24 (v1.1)
- [x] CUSTOM 양식 동적 렌더러 (사용자 기안) — Validated in Phase 24.1 (v1.1)
- [x] 계산 규칙 UI — Validated in Phase 25 (v1.1)
- [x] 양식 복제 / JSON 내보내기·가져오기 / 프리셋 — Validated in Phase 26 (v1.1)
- [x] 대시보드 고도화 (결재 대기/진행 중/승인 완료/반려 4 카드 + role-based 스코프 + mutation 실시간 invalidate + skeleton/empty/error UI) — Validated in Phase 31 (v1.2, DASH-01~05)

### Active
- [ ] SMTP 이메일 알림 (상신/중간 승인/최종 승인/반려/회수 이벤트)
- [ ] 문서 검색/필터링 UI (상태·양식·기간·기안자·문서번호·전문 검색)
- [ ] 추가 기본 제공 양식 또는 CUSTOM 빌더 기반 프리셋 확충

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

## Current Milestone: v1.2 Phase 1-B — 일상 업무 대체 수준

**Goal:** 전자결재 시스템을 일상 업무에서 실제로 대체 사용할 수 있는 수준으로 끌어올리기 위해 알림·검색·대시보드·확장 양식을 구축한다.

**Target features:**
- SMTP 이메일 알림 (상신/중간 승인/최종 승인/반려/회수 — `@TransactionalEventListener` 비동기, `notification_log` 기록)
- 문서 검색/필터링 (상태·양식·기간·기안자·문서번호 복합 필터, 전문 검색, 응답 ≤ 1초)
- 대시보드 고도화 (결재 대기/진행/완료 카운트 위젯, 최근 문서, 내 결재 대기)
- 추가 기본 제공 양식 또는 CUSTOM 빌더 기반 프리셋 확충

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
*Last updated: 2026-04-24 — Phase 31 (대시보드 고도화) complete: DASH-01~05 validated, 4 카드 + role-based scope + mutation invalidate + ErrorState/skeleton/empty UI 통일.*

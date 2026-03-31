# MiceSign

## What This Is

An in-house electronic approval (전자 결재) system for a small company (~50 employees), replacing legacy Docswave. Users can draft documents, set approval lines, and process approvals through a web interface. Built as a solo developer project with AI assistance.

## Core Value

Employees can submit approval documents and get them approved/rejected through a clear, sequential workflow — replacing the external SaaS dependency with a self-hosted system.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] JWT-based authentication (login, token refresh, logout)
- [ ] Admin-managed organization structure (departments, positions, users)
- [ ] RBAC with three roles (SUPER_ADMIN, ADMIN, USER)
- [ ] Document drafting with template-based forms (GENERAL, EXPENSE, LEAVE)
- [ ] Flexible approval line selection (APPROVE, AGREE, REFERENCE types)
- [ ] Sequential approval workflow with document state machine (DRAFT → SUBMITTED → APPROVED/REJECTED/WITHDRAWN)
- [ ] Document immutability after submission (locked body, attachments, approval line)
- [ ] Document numbering system (prefix-year-sequence, assigned at submission)
- [ ] File attachments via Google Drive API (Service Account)
- [ ] Audit trail logging for all document state changes
- [ ] Dashboard showing pending approvals and recent documents

### Out of Scope

- SMTP email notifications — deferred to Phase 1-B
- Document search/filtering — deferred to Phase 1-B
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
*Last updated: 2026-03-31 after initialization*

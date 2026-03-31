# Project Research Summary

**Project:** MiceSign
**Domain:** In-house electronic approval system (전자 결재) — Korean corporate workflow, ~50 employees
**Researched:** 2026-03-31
**Confidence:** HIGH

## Executive Summary

MiceSign is a Korean corporate electronic approval (전자 결재) system replacing Docswave for a ~50-person company. This is a well-understood domain with established feature expectations: the product must faithfully replicate the core workflow of draft → submit → sequential approval → completion, with strict document immutability and full audit trails. The recommended approach is a **layered monolith** (Spring Boot + React SPA) deployed natively on a single server — microservices, BPMN engines, and dynamic form builders are all explicit anti-patterns at this scale and user count.

The PRD-specified stack is valid and coherent. The key additions not in the PRD that are blocking without them: **Flyway** for schema versioning, **React Hook Form + Zod** for form validation, **Axios** for JWT interceptor pattern, and **React Router 7** for SPA navigation. The stack should be finalized in project scaffolding before any business logic begins, because getting QueryDSL annotation processors and the Axios 401 interceptor wrong at the start creates expensive rework.

The primary delivery risk is the **approval line editor UX** (결재선 지정): it is the most complex frontend component, sits on the critical path, and poor UX here directly kills adoption. A second risk is concurrency — document numbering and approval state transitions must use pessimistic locking from day one, not retrofitted later. Both risks are well-understood and have clear mitigations; this is a buildable system with no novel technical uncertainty.

## Key Findings

### Recommended Stack

The PRD stack is validated as cohesive. Spring Boot 3.4.x on Java 17 LTS with Hibernate 6.x and QueryDSL 5.1.0 (`jakarta` classifier) covers the backend. The frontend is React 18.3.x + TypeScript 5.x + Vite 5.x + Zustand 5.x + TanStack Query v5. MariaDB 10.11 LTS (not 11.x) is the correct database choice. Google Drive API v3 with a Service Account handles file storage. Tailwind v3.4.x is preferred over v4 until ecosystem maturity is confirmed.

**Core technologies:**
- **Spring Boot 3.4.x / Java 17 LTS**: backend framework — stable LTS stack, no bleeding-edge risk
- **Spring Security 6.x + jjwt 0.12.x**: authentication — stateless JWT, fits in with Boot 3.4 auto-config
- **QueryDSL 5.1.0 (jakarta)**: complex queries — required for flexible document search/inbox filtering
- **Flyway**: schema migration — must be included from day one; retrofitting is painful
- **React 18.3.x + TypeScript 5.x**: frontend — type safety is essential given the complexity of approval workflows
- **TanStack Query v5**: server state — handles caching and invalidation for document inboxes
- **Axios (with interceptor)**: HTTP client — the 401 → refresh → retry pattern must be designed before building any auth-dependent feature
- **React Hook Form + Zod**: form management — hardcoded template forms require complex structured validation
- **MariaDB 10.11 LTS**: database — LTS release, avoid 11.x (short-term support only)
- **MapStruct**: DTO mapping — compile-time safety for 10+ entity types
- **SpringDoc OpenAPI**: API docs — Swagger UI is critical for solo dev debugging

### Expected Features

**Must have (table stakes) — Phase 1-A:**
- Authentication (login/logout/JWT refresh + account lockout)
- Document drafting with 3 hardcoded form templates (GENERAL, EXPENSE, LEAVE)
- Draft save (임시저장) — users lose trust if work disappears
- Approval line selection editor (결재선 지정) — hardest UX component, invest heavily
- Sequential approval processing (state machine: DRAFT → SUBMITTED → APPROVED/REJECTED/WITHDRAWN)
- Document immutability after submission — legal/audit requirement, non-negotiable
- Approve/Reject with comments (reject comment mandatory)
- Document withdrawal (회수) and re-draft (재기안)
- Document numbering (채번) — assigned at submission, never at draft
- File attachments via Google Drive API
- Document inboxes: My Documents, Pending Approvals, Completed, Reference
- Dashboard with pending count and quick navigation
- Organization management (departments, positions, users + RBAC)
- Audit trail recording (backend) — start recording in Phase 1-A, UI can wait

**Should have (differentiators) — Phase 1-B:**
- Email notifications (SMTP) — highest adoption impact; without this, approvals stall
- Document search/filtering — essential once volume exceeds ~100 docs
- Additional form templates (PURCHASE, BUSINESS_TRIP, OVERTIME)
- Forced password change on first login
- Read/unread status for reference documents

**Defer to Phase 1-C:**
- Audit log query UI (backend is already logging)
- Statistics and reports (needs data volume)
- Retirement/handover processing (edge case, handle manually initially)

**Defer to Phase 2+:**
- AI-assisted document drafting (needs 6+ months corpus)
- Proxy/delegation approval (adds significant state machine complexity)
- PDF export/print
- Approval line favorites
- Parallel approval (over-engineered for 50 users)

### Architecture Approach

The correct architecture is a **vertically-sliced monolith**: a single Spring Boot application organized by business domain (auth, org, template, document, approval, file, dashboard, common), with React SPA served through Nginx as a reverse proxy. No microservices, no BPMN engine, no event sourcing. The document state machine is an enum with 5 states enforced in the service layer — a dedicated workflow engine adds complexity with zero benefit at this scale. Deployment is a Spring Boot JAR via systemd plus React static files via Nginx on a single server; Docker is explicitly an anti-pattern here.

**Major components:**
1. **auth/** — JWT authentication, token management, login/logout, Spring Security filter chain
2. **org/** — Department tree, position hierarchy, user CRUD, RBAC (SUPER_ADMIN/ADMIN/USER)
3. **document/** — Document CRUD, enum-based state machine, document numbering (채번), audit logging
4. **approval/** — Approval line management, sequential processing, pessimistic locking
5. **file/** — Google Drive API v3 integration, upload/download, retry with backoff
6. **dashboard/** — Aggregation queries for pending counts, recent documents
7. **common/** — Cross-cutting: audit logging (AOP/event listener), security config, exception handling
8. **React SPA** — Pages per route, hardcoded template components, approval line editor, Zustand auth store, Axios API client with 401 interceptor

### Critical Pitfalls

1. **Document numbering race condition** — Use `SELECT ... FOR UPDATE` on `doc_sequence` table within transaction; assign number only at SUBMITTED transition, never at DRAFT
2. **Approval state machine race conditions** — Pessimistic lock (`@Lock(PESSIMISTIC_WRITE)`) on approval_line row; idempotency check on current status; frontend button disable on click
3. **JWT refresh token stampede** — Axios interceptor must queue concurrent 401s and retry after single refresh promise resolves; do not let each concurrent request independently attempt a refresh
4. **Access token lost on page refresh** — On app init, always call refresh endpoint to rehydrate access token from httpOnly cookie before rendering protected routes
5. **Document immutability gaps** — Every mutation endpoint must check `document.status == DRAFT`; write integration tests for all mutation endpoints with SUBMITTED document expecting 400/409
6. **Spring @Transactional self-invocation** — Avoid calling @Transactional methods within the same class; document numbering must be in its own transaction entry point
7. **Resubmission with inactive approvers** — When creating re-draft, validate all copied approval line members are still ACTIVE; warn user if any have been deactivated

## Implications for Roadmap

Based on research, suggested phase structure:

### Phase 1: Project Foundation
**Rationale:** All subsequent phases depend on correct infrastructure setup. QueryDSL annotation processor misconfiguration and missing Flyway cause expensive rework. Korean encoding and CORS must be correct from the start.
**Delivers:** Runnable Spring Boot + React project with all dependencies wired, Flyway migrations for initial schema, Axios interceptor skeleton, dev CORS config, Korean encoding setup, SpringDoc OpenAPI endpoint
**Addresses:** All must-have libraries from STACK.md (Flyway, Axios, React Hook Form + Zod, React Router, MapStruct, Headless UI)
**Avoids:** Korean text encoding corruption (Pitfall 12), CORS/cookie misconfiguration (Pitfall 13), QueryDSL setup pain

### Phase 2: Auth + Organization
**Rationale:** Every other feature requires authenticated users and an org structure. Org management must be built before the approval line editor (which browses the org tree). The JWT interceptor pattern (Pitfall 3 + 4) must be implemented here, not retrofitted later.
**Delivers:** Working login/logout/token refresh, RBAC, user account lockout, org tree CRUD, department/position management, admin pages
**Addresses:** FN-AUTH-001–005, FN-ORG-001–008
**Avoids:** JWT refresh stampede (Pitfall 4), access token loss on refresh (Pitfall 8), CORS cookie issues (Pitfall 13)

### Phase 3: Document Core
**Rationale:** Documents are the central entity that everything else touches. Must be correct before approval workflow is layered on top. Immutability enforcement and document numbering locking must be built here — they cannot be retrofitted safely.
**Delivers:** Document CRUD with DRAFT state, 3 hardcoded form templates, draft save, document numbering (채번) with SELECT FOR UPDATE, document immutability enforcement, re-draft from rejected/withdrawn, file attachment (Google Drive), audit log recording
**Addresses:** FN-TPL-001/003, FN-DOC-001–009, FN-FILE-001–003, FN-AUD-001
**Avoids:** Document numbering race condition (Pitfall 1), immutability gaps (Pitfall 3), resubmission with inactive approvers (Pitfall 10), @Transactional self-invocation (Pitfall 11)

### Phase 4: Approval Workflow
**Rationale:** This is the core product. Depends on documents (to approve) and org structure (for approval line selection). The approval line editor is the most complex single component — build and test with real users before building anything else. State machine concurrency must be addressed here.
**Delivers:** Approval line editor UI (org tree browser + search + drag-and-drop ordering + type assignment), document submission (DRAFT → SUBMITTED), sequential approval processing, approve/reject with comments, withdrawal (회수), complete state machine with pessimistic locking
**Addresses:** FN-APR-001–005
**Avoids:** Approval state machine race conditions (Pitfall 2), withdrawal race with approval (Pitfall 7), mixed APPROVE/AGREE step logic (Pitfall 6), approval line editor UX complexity (Pitfall 14)

### Phase 5: Dashboard + Inboxes
**Rationale:** Depends on documents and approval workflow existing. Dashboard and inboxes complete the day-to-day user experience — without them the system has no navigable home base.
**Delivers:** Dashboard (pending count, recent docs, quick links), My Documents inbox, Pending Approvals inbox with badge count, Completed Approvals inbox, Reference Documents inbox
**Addresses:** FN-DASH-001, inbox features
**Avoids:** Audit log performance (Pitfall 9 — ensure proper indexes exist before inbox queries run)

### Phase 6: Notifications + Search + Additional Templates
**Rationale:** These are high-impact differentiators but not blocking for initial deployment. Email notifications have the highest adoption impact of any Phase 1-B feature.
**Delivers:** Email notifications (SMTP, async/event-driven), document search/filtering, additional form templates (PURCHASE, BUSINESS_TRIP, OVERTIME), forced password change on first login, read/unread status for reference docs
**Addresses:** FN-NTF-001, FN-SEARCH-001, additional template FNs

### Phase 7: Admin Tools + Reports
**Rationale:** Meaningful only after sufficient data and workflow history exist. Audit log UI and statistics require a populated database.
**Delivers:** Audit log query UI (SUPER_ADMIN), statistics and reports (approval turnaround times, rejection rates, department volumes), retirement/handover processing (bulk WITHDRAWN/SKIPPED)
**Addresses:** FN-AUD-002, FN-ORG-009, statistics features

### Phase Ordering Rationale

- Phases 1–2 are pure infrastructure and must be sequential — no business logic can start before auth/org exists
- Phase 3 (Document Core) must precede Phase 4 (Approval) because approval acts on document entities; the state machine must be built document-first
- Phase 4 (Approval Line Editor) is the riskiest component and should be prototyped early with actual users; it's the make-or-break UX component
- Phase 5 (Dashboard/Inboxes) is intentionally late because the queries are additive and depend on data from Phases 3–4
- Phases 6–7 follow the PRD's Phase 1-B / Phase 1-C structure — useful but not blocking for initial deployment
- Google Drive file attachment is placed in Phase 3 (Document Core) despite being an external dependency — this is deliberate so attachment behavior is validated alongside the document lifecycle before approval workflow adds complexity

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 2 (Auth):** Axios interceptor queue pattern for concurrent 401s is nuanced — verify against current jjwt 0.12.x and TanStack Query v5 interaction patterns
- **Phase 4 (Approval Workflow):** Approval line editor requires UX research with actual users before committing to implementation; org tree component selection (Headless UI vs Radix) needs evaluation

Phases with standard patterns (skip research-phase):
- **Phase 1 (Foundation):** Standard Spring Boot + Vite scaffolding, well-documented
- **Phase 3 (Document Core):** Standard CRUD + state machine patterns, well-understood
- **Phase 5 (Dashboard):** Aggregation query patterns are straightforward
- **Phase 6 (Notifications/Search):** Spring Mail + JPA full-text search are standard
- **Phase 7 (Admin Tools):** CRUD + filtered query patterns, standard

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | PRD choices validated as cohesive; missing libraries identified with clear rationale |
| Features | HIGH | Based on PRD v2.0, FSD v1.0, and well-established Korean corporate approval system domain |
| Architecture | HIGH | Layered monolith with vertical slicing is the consensus pattern for this scale; anti-patterns clearly identified |
| Pitfalls | HIGH | Concurrency, JWT, and immutability pitfalls are well-documented and have verified mitigations |

**Overall confidence:** HIGH

### Gaps to Address

- **Vite 5 vs 6 / Tailwind 3 vs 4:** Both have "verify current stable" flags in STACK.md. Lock versions explicitly in Phase 1 scaffolding after checking current releases.
- **Headless UI vs Radix UI** for approval line tree component: both are viable but should be evaluated against actual org tree interaction requirements during Phase 4 planning.
- **Google Drive Service Account quota:** Per-second rate limits could cause issues under simultaneous bulk uploads. Validate retry/backoff behavior during Phase 3 testing.
- **Email SMTP provider:** PRD specifies SMTP but does not specify provider. Needs configuration decision before Phase 6 (likely company's existing email infrastructure).

## Sources

### Primary (HIGH confidence)
- PRD v2.0: `/Volumes/USB-SSD/03-code/VibeCoding/MiceSign/docs/PRD_MiceSign_v2.0.md`
- FSD v1.0: `/Volumes/USB-SSD/03-code/VibeCoding/MiceSign/docs/FSD_MiceSign_v1.0.md`
- PROJECT.md: `/Volumes/USB-SSD/03-code/VibeCoding/MiceSign/.planning/PROJECT.md`

### Secondary (MEDIUM confidence)
- Domain knowledge: Korean corporate 전자 결재 systems (Docswave, Hiworks, Hancom Groupware, Samsung SDS Brity Works, LG CNS) — consensus feature set
- Spring Boot 3.4.x + QueryDSL 5.1.0 jakarta classifier setup patterns — community-verified configuration
- JWT refresh token queue pattern — widely documented Axios interceptor pattern

### Tertiary (LOW confidence — verify during implementation)
- Vite 5 vs 6 current stable release
- Tailwind v4 ecosystem readiness
- Google Drive API v3 per-second rate limits for concurrent uploads

---
*Research completed: 2026-03-31*
*Ready for roadmap: yes*

# Architecture Research: MiceSign

**Domain:** In-house electronic approval (전자 결재) system
**Date:** 2026-03-31
**Confidence:** HIGH

## Recommended Architecture Style

**Layered monolith with vertical (domain) slicing** — a single Spring Boot application organized by business domain, not by technical layer.

### Why This Style

- **50 users, solo developer** → microservices/event sourcing/BPMN engines are all anti-patterns at this scale
- Spring Boot monolith is the simplest architecture that satisfies all requirements
- Vertical slicing keeps related code together (controller + service + repository per domain)

### What NOT to Use

| Anti-Pattern | Why Avoid |
|-------------|-----------|
| Microservices | Massive operational overhead for 50 users |
| BPMN workflow engine (Camunda, Flowable) | Over-engineered for a 5-state linear workflow |
| Event sourcing | The audit_log table provides sufficient history |
| Hexagonal/ports-adapters | Adds abstraction layers a solo dev won't benefit from |

## Component Boundaries

### Backend Modules (7 domain + 1 cross-cutting)

```
com.micesign
├── auth/           # JWT authentication, token management, login/logout
│   ├── controller/
│   ├── service/
│   ├── repository/
│   └── dto/
├── org/            # Organization management (departments, positions, users)
│   ├── controller/
│   ├── service/
│   ├── repository/
│   └── dto/
├── template/       # Approval form template master data (CRUD)
│   ├── controller/
│   ├── service/
│   ├── repository/
│   └── dto/
├── document/       # Document CRUD, state machine, numbering
│   ├── controller/
│   ├── service/
│   ├── repository/
│   └── dto/
├── approval/       # Approval line management, approval processing
│   ├── controller/
│   ├── service/
│   ├── repository/
│   └── dto/
├── file/           # Google Drive file upload/download
│   ├── controller/
│   ├── service/
│   └── dto/
├── dashboard/      # Aggregation queries for dashboard views
│   ├── controller/
│   ├── service/
│   └── dto/
└── common/         # Cross-cutting: audit logging, security config, exception handling, base entities
    ├── audit/
    ├── config/
    ├── exception/
    └── entity/
```

### Frontend Structure

```
src/
├── pages/              # Route-level components
│   ├── LoginPage.tsx
│   ├── DashboardPage.tsx
│   ├── DocumentListPage.tsx
│   ├── DocumentCreatePage.tsx
│   ├── DocumentDetailPage.tsx
│   └── admin/
│       ├── UserManagementPage.tsx
│       ├── DepartmentManagementPage.tsx
│       └── TemplateManagementPage.tsx
├── components/
│   ├── templates/      # Form template components (hardcoded per type)
│   │   ├── GeneralApproval.tsx
│   │   ├── ExpenseReport.tsx
│   │   ├── LeaveRequest.tsx
│   │   └── index.ts    # Template registry
│   ├── approval/       # Approval line editor, approval status display
│   ├── common/         # Shared UI components (layout, navigation, etc.)
│   └── ui/             # Base design system components
├── hooks/              # Custom hooks (useAuth, useDocument, etc.)
├── stores/             # Zustand stores (auth store, UI state)
├── api/                # API client (Axios instance, interceptors, API functions)
├── types/              # TypeScript type definitions
└── utils/              # Utility functions
```

## Data Flow

### Core Approval Workflow

```
User (Browser)
    │
    ▼
React App (Vite SPA)
    │  Axios + JWT in Authorization header
    ▼
Nginx (Reverse Proxy)
    │  /api/* → Spring Boot
    │  /* → Static files
    ▼
Spring Boot Application
    │
    ├── Spring Security Filter Chain
    │   └── JWT Authentication Filter
    │       └── Extract user from token → SecurityContext
    │
    ├── Controller Layer
    │   └── Request validation (Jakarta Bean Validation)
    │
    ├── Service Layer
    │   ├── Business logic + state machine transitions
    │   ├── Pessimistic locking for approval processing
    │   ├── Document numbering (SELECT FOR UPDATE)
    │   └── Audit log recording
    │
    ├── Repository Layer (JPA + QueryDSL)
    │   └── MariaDB
    │
    └── External Services
        └── Google Drive API (file upload/download)
```

### Document State Machine (Enum-Based)

```java
// No external workflow engine — simple enum state machine
public enum DocumentStatus {
    DRAFT,       // 임시저장 — editable
    SUBMITTED,   // 상신 — locked, in approval
    APPROVED,    // 승인완료 — final
    REJECTED,    // 반려 — final (can create new doc from this)
    WITHDRAWN    // 회수 — final
}
```

State transitions enforced in service layer:
- `DRAFT → SUBMITTED`: validate form, assign document number, lock document, create approval lines
- `SUBMITTED → APPROVED`: last approver approves
- `SUBMITTED → REJECTED`: any approver rejects
- `SUBMITTED → WITHDRAWN`: drafter withdraws (only if next approver hasn't acted)

### Concurrency Control

- **Document numbering:** `SELECT ... FOR UPDATE` on `doc_sequence` table within transaction
- **Approval processing:** Pessimistic lock on `approval_line` row being processed
- Both are safe at 50-user scale with negligible performance cost

## Build Order (Dependency-Driven)

The build order follows entity dependencies — each phase depends on entities from previous phases.

```
Phase 1: Project Foundation
├── Spring Boot project scaffolding
├── Gradle build with all dependencies
├── MariaDB schema (Flyway migrations)
├── Common config (security skeleton, exception handling, audit base)
└── No business logic yet

Phase 2: Auth + Organization
├── Depends on: user, department, position tables
├── JWT login/refresh/logout
├── RBAC with @PreAuthorize
├── Organization CRUD (admin pages)
└── Enables: everything else (all features need auth)

Phase 3: Document Core
├── Depends on: auth (user context), org (department/position display)
├── Template master data
├── Document CRUD (draft/edit/view)
├── State machine transitions
├── Document numbering (채번)
├── Audit logging
└── Enables: approval workflow

Phase 4: Approval Workflow
├── Depends on: document (to approve), org (for approval line selection)
├── Approval line editor (UI)
├── Sequential approval processing
├── Submission (DRAFT → SUBMITTED)
├── Approve/Reject/Withdraw actions
└── Enables: complete workflow

Phase 5: Files + Dashboard
├── Depends on: document (to attach files to), approval (to show pending items)
├── Google Drive file upload/download
├── Dashboard (pending approvals, recent docs, counts)
└── Additive — can partially parallelize
```

## Key Architecture Decisions

| Decision | Rationale |
|----------|-----------|
| Enum state machine, not BPMN | 5 states, linear flow — BPMN adds complexity with no benefit |
| Pessimistic locking over optimistic | Simpler code, negligible perf cost at 50 users |
| Vertical domain slicing | Related code stays together, easier to navigate for solo dev |
| JSON column for form data | `document_content.content` stores template-specific data as JSON — flexible per form type |
| Audit as cross-cutting concern | AOP or event listener to capture all state changes without polluting business logic |

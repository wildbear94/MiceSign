---
phase: 08
slug: dashboard-audit
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-10
---

# Phase 08 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | JUnit 5 (backend), Vitest (frontend) |
| **Config file** | `backend/build.gradle` / `frontend/vitest.config.ts` |
| **Quick run command** | `cd backend && ./gradlew test --tests '*AuditLog*' && cd ../frontend && npx vitest run --reporter=verbose` |
| **Full suite command** | `cd backend && ./gradlew test && cd ../frontend && npx vitest run` |
| **Estimated runtime** | ~60 seconds |

---

## Sampling Rate

- **After every task commit:** Run quick test command
- **After each wave completes:** Run full suite
- **Before phase sign-off:** Run full suite + manual dashboard verification

---

## Critical Paths

| Path | Test Coverage | Gap |
|------|--------------|-----|
| Audit log service logging | Existing AuditLogService tests | Need to verify all 13 gap methods |
| Dashboard API responses | Existing DashboardController tests | Verify count accuracy |
| Template management CRUD | AdminTemplateController tests exist | Need frontend component tests |
| Admin sidebar navigation | Manual verification | Route and menu item rendering |

---

## Validation Architecture

### Backend Validation
- Existing `AuditLogServiceTest` covers core log/search functionality
- Integration tests verify audit entries are created during service operations
- H2 MariaDB-mode test database for integration tests

### Frontend Validation
- Component rendering tests for new TemplateListPage
- React Query hook tests for template API integration
- Route and navigation tests for admin sidebar additions

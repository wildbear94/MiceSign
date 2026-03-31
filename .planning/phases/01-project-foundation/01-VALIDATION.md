---
phase: 1
slug: project-foundation
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-31
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | JUnit 5 + Spring Boot Test (backend), Vitest (frontend — to be set up) |
| **Config file** | None — Wave 0 creates them |
| **Quick run command** | `cd backend && ./gradlew test --tests "*HealthCheck*"` |
| **Full suite command** | `cd backend && ./gradlew test` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd backend && ./gradlew test`
- **After every plan wave:** Run `cd backend && ./gradlew test && cd ../frontend && npm run build`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 01-01-01 | 01 | 0 | ORG-05 | integration | `./gradlew test --tests "*SeedDataTest*"` | ❌ W0 | ⬜ pending |
| 01-01-02 | 01 | 0 | (implicit) | integration | `./gradlew test --tests "*HealthCheckTest*"` | ❌ W0 | ⬜ pending |
| 01-01-03 | 01 | 0 | (implicit) | integration | `./gradlew test --tests "*FlywayMigrationTest*"` | ❌ W0 | ⬜ pending |
| 01-01-04 | 01 | 1 | (implicit) | smoke/manual | `cd frontend && npm run dev` then check browser | Manual | ⬜ pending |
| 01-01-05 | 01 | 1 | (implicit) | smoke/manual | `curl http://localhost:8080/swagger-ui.html` | Manual | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `backend/src/test/java/com/micesign/SeedDataTest.java` — stubs for ORG-05 (verifies departments, positions, admin user exist after migration)
- [ ] `backend/src/test/java/com/micesign/HealthCheckTest.java` — verifies /actuator/health returns 200
- [ ] `backend/src/test/resources/application-test.yml` — test profile with H2 or testcontainers MariaDB
- [ ] Gradle Wrapper files (`gradlew`, `gradle/wrapper/`) — must be generated

*Wave 0 stubs are created before any implementation begins.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Frontend loads in browser | (implicit) | Requires running dev server + browser | Run `cd frontend && npm run dev`, open http://localhost:5173 |
| Swagger UI accessible | (implicit) | Requires running Spring Boot app | Start backend, visit http://localhost:8080/swagger-ui.html |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending

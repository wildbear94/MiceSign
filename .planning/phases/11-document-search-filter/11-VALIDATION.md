---
phase: 11
slug: document-search-filter
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-04
---

# Phase 11 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | JUnit 5 + Spring Boot Test (MockMvc) |
| **Config file** | `backend/src/test/resources/application-test.yml` |
| **Quick run command** | `cd backend && JAVA_HOME=$(/usr/libexec/java_home -v 17) ./gradlew test --tests "*DocumentSearch*" -x processTestResources` |
| **Full suite command** | `cd backend && JAVA_HOME=$(/usr/libexec/java_home -v 17) ./gradlew test -x processTestResources` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd backend && JAVA_HOME=$(/usr/libexec/java_home -v 17) ./gradlew test --tests "*DocumentSearch*" -x processTestResources`
- **After every plan wave:** Run `cd backend && JAVA_HOME=$(/usr/libexec/java_home -v 17) ./gradlew test -x processTestResources`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 11-01-01 | 01 | 1 | SRCH-01 | integration | `./gradlew test --tests "*DocumentSearchTest*keyword*"` | ❌ W0 | ⬜ pending |
| 11-01-02 | 01 | 1 | SRCH-01 | integration | `./gradlew test --tests "*DocumentSearchTest*tab*"` | ❌ W0 | ⬜ pending |
| 11-01-03 | 01 | 1 | SRCH-02 | integration | `./gradlew test --tests "*DocumentSearchTest*status*"` | ❌ W0 | ⬜ pending |
| 11-01-04 | 01 | 1 | SRCH-02 | integration | `./gradlew test --tests "*DocumentSearchTest*date*"` | ❌ W0 | ⬜ pending |
| 11-01-05 | 01 | 1 | SRCH-02 | integration | `./gradlew test --tests "*DocumentSearchTest*template*"` | ❌ W0 | ⬜ pending |
| 11-01-06 | 01 | 1 | SRCH-02 | integration | `./gradlew test --tests "*DocumentSearchTest*combined*"` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `backend/src/test/java/com/micesign/document/DocumentSearchTest.java` — integration test stubs for search endpoint
- [ ] QueryDSL Q-class generation verification (`compileJava` must succeed)

*Existing test infrastructure (TestTokenHelper, MockMvc, JdbcTemplate cleanup) covers shared fixtures.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Search keyword highlighting in results | SRCH-01 | Visual rendering in browser | 1. Search for "출장" 2. Verify matching text is highlighted in results |
| URL state preserved on bookmark/back/forward | SRCH-02 | Browser navigation behavior | 1. Apply filters 2. Copy URL 3. Open in new tab 4. Verify same filters applied |
| Tab visibility (전체 hidden for USER role) | SRCH-01 | UI rendering based on role | 1. Login as USER 2. Verify only 2 tabs visible 3. Login as ADMIN 4. Verify 3 tabs |
| Filter reset button clears all filters | SRCH-02 | UI interaction | 1. Set multiple filters 2. Click 초기화 3. Verify all filters cleared |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending

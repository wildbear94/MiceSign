---
phase: 17
slug: budget-integration
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-07
---

# Phase 17 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | JUnit 5 + Mockito (Spring Boot Test) |
| **Config file** | build.gradle.kts (testImplementation 설정 완료) |
| **Quick run command** | `cd backend && ./gradlew test --tests "com.micesign.budget.*" -x compileQuerydsl` |
| **Full suite command** | `cd backend && ./gradlew test -x compileQuerydsl` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd backend && ./gradlew test --tests "com.micesign.budget.*" -x compileQuerydsl`
- **After every plan wave:** Run `cd backend && ./gradlew test -x compileQuerydsl`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 17-01-01 | 01 | 1 | BDGT-01 | — | N/A | unit | `./gradlew test --tests "com.micesign.budget.BudgetIntegrationServiceTest"` | ❌ W0 | ⬜ pending |
| 17-01-02 | 01 | 1 | BDGT-01 | — | N/A | unit | `./gradlew test --tests "com.micesign.budget.BudgetDataExtractorTest"` | ❌ W0 | ⬜ pending |
| 17-01-03 | 01 | 1 | BDGT-01 | — | N/A | unit | `./gradlew test --tests "com.micesign.budget.BudgetIntegrationServiceTest#shouldSkipNonBudgetTemplate"` | ❌ W0 | ⬜ pending |
| 17-02-01 | 02 | 1 | BDGT-02 | — | N/A | integration | `./gradlew test --tests "com.micesign.budget.BudgetRetryIntegrationTest"` | ❌ W0 | ⬜ pending |
| 17-02-02 | 02 | 1 | BDGT-02 | — | N/A | unit | `./gradlew test --tests "com.micesign.budget.BudgetIntegrationServiceTest#shouldLogFailedAfterRetries"` | ❌ W0 | ⬜ pending |
| 17-01-04 | 01 | 1 | BDGT-01 | — | N/A | unit | `./gradlew test --tests "com.micesign.budget.BudgetIntegrationServiceTest#shouldSendCancellation"` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `backend/src/test/java/com/micesign/budget/BudgetIntegrationServiceTest.java` — BDGT-01, BDGT-02 unit tests
- [ ] `backend/src/test/java/com/micesign/budget/BudgetDataExtractorTest.java` — 4개 템플릿 매핑 테스트
- [ ] `backend/src/test/java/com/micesign/budget/BudgetRetryIntegrationTest.java` — @Retryable 통합 테스트

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Mock → Real 프로필 전환 시 prod에서 RealBudgetApiClient 활성화 | BDGT-01 | 프로필 활성화는 배포 환경에서만 검증 가능 | spring.profiles.active=prod로 기동 후 bean 확인 |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending

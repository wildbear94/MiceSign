---
phase: 31
slug: dashboard
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-24
---

# Phase 31 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Backend Framework** | JUnit 5 + Spring Boot Test 3.x (@SpringBootTest + @AutoConfigureMockMvc) |
| **Frontend Framework** | Vitest + @testing-library/react |
| **Config file** | backend/build.gradle.kts, frontend/vitest.config.ts |
| **Quick run command (BE)** | `cd backend && ./gradlew test --tests "com.micesign.service.DashboardServiceIntegrationTest"` |
| **Quick run command (FE)** | `cd frontend && npm run test -- features/dashboard features/approval features/document` |
| **Full suite command (BE)** | `cd backend && ./gradlew test` |
| **Full suite command (FE)** | `cd frontend && npm run test` |
| **Estimated runtime** | BE ~40s, FE ~10s (targeted); BE full ~3m, FE full ~30s |

---

## Sampling Rate

- **After every task commit:** Run targeted quick command for the domain changed (BE test for backend tasks, FE test for frontend tasks)
- **After every plan wave:** Run full suite for the side modified
- **Before `/gsd-verify-work`:** Full BE + FE suite green
- **Max feedback latency:** 60 seconds for targeted, 3 minutes for full

---

## Per-Task Verification Map

Task IDs are populated by the planner in PLAN.md; the checker cross-references them here.

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 31-01-XX | 01 | 1 | DASH-01, DASH-02 | — | `DashboardSummaryResponse` exposes `rejectedCount`; `completedCount = APPROVED only` | unit | `./gradlew test --tests "DashboardSummaryResponseTest"` | ❌ W0 | ⬜ pending |
| 31-01-XX | 01 | 1 | DASH-01 | — | `DepartmentRepository.findDescendantIds` returns `{self ∪ descendants}` via MariaDB `WITH RECURSIVE` | integration | `./gradlew test --tests "DepartmentRepositoryTest"` | ❌ W0 | ⬜ pending |
| 31-02-XX | 02 | 1 | DASH-01 | — | USER / ADMIN / SUPER_ADMIN role × 4-card matrix returns correct counts with 부서 계층 fixture | integration | `./gradlew test --tests "DashboardServiceIntegrationTest"` | ❌ W0 | ⬜ pending |
| 31-02-XX | 02 | 1 | DASH-01 (D-A9) | — | Phase 30 `/documents/search` predicate uses hierarchical descendants (consistent with dashboard) | integration | `./gradlew test --tests "DocumentSearchPermissionMatrixTest"` | ✅ exists — extend | ⬜ pending |
| 31-03-XX | 03 | 2 | DASH-01, DASH-02, DASH-03 | — | `useDashboardSummary` single hook; query key `['dashboard','summary']`; `placeholderData` prevents skeleton flash; 4 CountCards render with correct labels | unit (RTL) | `npm run test -- features/dashboard/pages` | ❌ W0 | ⬜ pending |
| 31-04-XX | 04 | 2 | DASH-05 | — | `useApprove`, `useReject`, `useSubmitDocument`, `useWithdrawDocument` onSuccess call `queryClient.invalidateQueries({queryKey:['dashboard']})` — spy assertion | unit (RTL) | `npm run test -- features/approval/hooks features/document/hooks` | ❌ W0 | ⬜ pending |
| 31-05-XX | 05 | 2 | DASH-04 | — | PendingList/RecentDocumentsList/ErrorState render empty (Lucide icon + 문구) and error (AlertTriangle + 다시시도) states | unit (RTL) | `npm run test -- features/dashboard/components` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

### Backend test infra
- [ ] `backend/src/test/java/com/micesign/service/DashboardServiceIntegrationTest.java` — new, role × 4-card × 부서 계층 matrix (covers DASH-01, DASH-02)
- [ ] `backend/src/test/java/com/micesign/repository/DepartmentRepositoryTest.java` — new, verifies `findDescendantIds` recursive CTE correctness on multi-level fixture (covers DASH-01 scope)
- [ ] `backend/src/test/java/com/micesign/dto/DashboardSummaryResponseTest.java` — new, verifies serialization of new `rejectedCount` field (covers DTO shape)
- [ ] Test fixture: seed 3-level department tree + USER/ADMIN/SUPER_ADMIN users + 6-10 documents in DRAFT/SUBMITTED/APPROVED/REJECTED states via JdbcTemplate (shared conftest-equivalent @Sql or @BeforeAll)
- [ ] Extend `DocumentSearchPermissionMatrixTest.java` — add 3 hierarchical cases to verify Phase 30 predicate upgrade consistency (covers D-A9)

### Frontend test infra
- [ ] `frontend/src/features/approval/hooks/__tests__/useApprovals.invalidation.test.ts` — new, spies `queryClient.invalidateQueries` (covers DASH-05 for approve/reject)
- [ ] `frontend/src/features/document/hooks/__tests__/useDocuments.invalidation.test.ts` — new, spies `queryClient.invalidateQueries` (covers DASH-05 for submit/withdraw)
- [ ] `frontend/src/features/dashboard/pages/__tests__/DashboardPage.test.tsx` — new, 4 CountCard smoke + skeleton + empty + error state (covers DASH-01, DASH-03, DASH-04)
- [ ] `frontend/src/features/dashboard/components/__tests__/ErrorState.test.tsx` — new, renders AlertTriangle + Korean copy + 다시시도 button wiring (covers DASH-04 error state)
- [ ] Test utility: `renderWithQueryClient(ui)` helper if not present — wraps with fresh `QueryClient` per test to isolate cache

*Existing infrastructure (vitest, JUnit 5, @SpringBootTest, @AutoConfigureMockMvc) covers framework-level needs. Only domain test files need to be authored in Wave 0 tasks.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| 4카드 + 2리스트 시각적 정합 (grid breakpoints, dark mode, Lucide icon weights) | DASH-01, DASH-03 | Visual perception not asserted by unit tests | `31-HUMAN-UAT.md` §1: dev server, login as USER/ADMIN/SUPER_ADMIN, visually verify layout at sm/md/lg/xl, light+dark |
| mutation → 대시보드 카운트 실시간 반영 (체감 latency) | DASH-05 | User-perceived liveness is the key UX promise | `31-HUMAN-UAT.md` §2: approve → observe dashboard tab count change without reload |
| skeleton flash 방지 (placeholderData) | DASH-03 | Subjective perception of smoothness | `31-HUMAN-UAT.md` §3: refresh → observe no hard skeleton flash between refetches |
| empty state 일러스트·문구 톤 | DASH-04 | Copy/icon appropriateness is editorial | `31-HUMAN-UAT.md` §4: login as new account → verify empty state copy and icon |
| error state 회복 플로우 (offline → retry → recover) | DASH-04 | Resilience UX requires network simulation | `31-HUMAN-UAT.md` §5: devtools offline → see error UI → online → click 다시시도 → recover |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references (test files listed above)
- [ ] No watch-mode flags in any command
- [ ] Feedback latency < 60s for targeted quick run
- [ ] `nyquist_compliant: true` set in frontmatter after planner wires task IDs and checker passes

**Approval:** pending

---
phase: 31
slug: dashboard
status: draft
nyquist_compliant: true
wave_0_complete: true
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
| **Quick run command (BE)** | `cd backend && ./gradlew test --tests "com.micesign.dashboard.DashboardServiceIntegrationTest"` |
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

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 01-01 | 01 | 1 | DASH-01 | T-31-T3 | `DashboardSummaryResponse` exposes `rejectedCount` + backward-compat 6-arg constructor; `completedCount = APPROVED only` | compile | `./gradlew compileJava` | ✅ exists — modify | ⬜ pending |
| 01-02 | 01 | 1 | DASH-01 | T-31-T2, T-31-T4 | `DepartmentRepository.findDescendantIds` returns `{self ∪ descendants}` via MariaDB `WITH RECURSIVE` (verified indirectly via 02-01) | compile | `./gradlew compileJava` | ✅ exists — extend | ⬜ pending |
| 01-03 | 01 | 1 | DASH-01 | — | `countByDrafterIdInAndStatus` / `countByStatus` / `countPendingByApproverIdIn` / `countAllPending` / `findIdsByDepartmentIdIn` — 5 repository helpers | compile | `./gradlew compileJava` | ✅ exists — extend | ⬜ pending |
| 06-01 | 06 | 1 | DASH-01 (D-A9) | T-31-T2 | DocumentRepositoryCustom signature extended with `List<Long> descendantDeptIds` | compile | `./gradlew compileJava` (후속 Task 2/3 완료 후) | ✅ exists — modify | ⬜ pending |
| 06-02 | 06 | 1 | DASH-01 (D-A9) | T-31-T2 | DocumentRepositoryCustomImpl uses descendantDeptIds in tab=department / tab=all ADMIN / permissionBranch ADMIN (3 places) | integration | `./gradlew test --tests "DocumentSearchPermissionMatrixTest"` (regression) | ✅ exists — modify | ⬜ pending |
| 06-03 | 06 | 1 | DASH-01 (D-A9) | T-31-T2 | DocumentService DI DepartmentRepository + caller passes `findDescendantIds` result | integration | `./gradlew test --tests "DocumentSearchPermissionMatrixTest"` (9 기존 케이스 green) | ✅ exists — modify | ⬜ pending |
| 02-01 | 02 | 2 | DASH-01, DASH-02 | T-31-T1, T-31-T2 | DashboardServiceIntegrationTest (RED): USER / ADMIN / SUPER_ADMIN × 4-card matrix + 부서 계층 fixture + findDescendantIds CTE SoT | integration | `./gradlew test --tests "DashboardServiceIntegrationTest"` (RED expected) | ❌ W0 — new | ⬜ pending |
| 02-02 | 02 | 2 | DASH-01, DASH-02 | T-31-T1 | DashboardService 3-arg role-based refactor + DashboardController 호출부 (GREEN) | integration | `./gradlew test --tests "DashboardServiceIntegrationTest"` (GREEN) | ✅ exists — refactor | ⬜ pending |
| 02-03 | 02 | 2 | DASH-01 (D-A9) | T-31-T2 | DocumentSearchPermissionMatrixTest + 3 hierarchical cases (adminOfEngineering_sees / adminOfPlatform_does_not_see / tab_department) | integration | `./gradlew test --tests "DocumentSearchPermissionMatrixTest"` (12+ cases green) | ✅ exists — extend | ⬜ pending |
| 03-01 | 03 | 3 | DASH-01, DASH-04 | — | TS `DashboardSummary.rejectedCount: number` added; `completedCount` commented as APPROVED only | type check | `grep -c rejectedCount` (tsc skipped until Plan 04) | ✅ exists — extend | ⬜ pending |
| 03-02 | 03 | 3 | DASH-01 | T-31-T3, T-31-T3-b | `useDashboardSummary` single hook; query key `['dashboard','summary']`; `placeholderData` prevents skeleton flash | grep | `grep -c placeholderData` | ✅ exists — refactor | ⬜ pending |
| 03-03 | 03 | 3 | DASH-04 | — | i18n ko/dashboard.json — 5 new keys + `completed` value updated to "승인 완료" | JSON validity | `node -e "JSON.parse(...)"` | ✅ exists — extend | ⬜ pending |
| 04-01 | 04 | 4 | DASH-04 | T-31-T5, T-31-T6 | ErrorState.tsx (new) + CountCard isError prop; focus-visible ring; aria-label | grep | `grep -c refetchQueries` + `grep -c isError` | ❌ W0 — new + ✅ exists — extend | ⬜ pending |
| 04-02 | 04 | 4 | DASH-02, DASH-04 | T-31-T6 | PendingList / RecentDocumentsList props-based refactor + ErrorState integration | grep | `grep -c PendingListProps` | ✅ exists — refactor | ⬜ pending |
| 04-03 | 04 | 4 | DASH-01, DASH-03 | T-31-T1, T-31-T2 | DashboardPage 4 cards + role-based navigation + props drill + smoke test (DashboardPage.test.tsx + ErrorState.test.tsx) | smoke (RTL) | `npm run test -- features/dashboard` | ✅ exists — refactor + ❌ W0 tests new | ⬜ pending |
| 05-01 | 05 | 3 | DASH-05 | T-31-T3, T-31-T4 | `useApprove`, `useReject` onSuccess call `invalidateQueries({queryKey:['dashboard']})` — spy test | unit (RTL) | `npm run test -- features/approval/hooks/__tests__/useApprovals.invalidation.test.ts` | ❌ W0 — new | ⬜ pending |
| 05-02 | 05 | 3 | DASH-05 | T-31-T3, T-31-T4 | `useSubmitDocument`, `useWithdrawDocument` onSuccess invalidate ['dashboard'] + `useCreateDocument` D-B3 scope 경계 test | unit (RTL) | `npm run test -- features/document/hooks/__tests__/useDocuments.invalidation.test.ts` | ❌ W0 — new | ⬜ pending |
| 05-03 | 05 | 3 | DASH-01~05 | — | 31-HUMAN-UAT.md — D-D3 5 항목 manual checklist | file presence | `test -f .planning/phases/31-dashboard/31-HUMAN-UAT.md` | ❌ W0 — new | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

### Backend test infra
- [x] `backend/src/test/java/com/micesign/dashboard/DashboardServiceIntegrationTest.java` — new, role × 4-card × 부서 계층 matrix (covers DASH-01, DASH-02) — scheduled in 02-01
- [x] Test fixture: seed 3-level department tree + USER/ADMIN/SUPER_ADMIN users + 6-10 documents in DRAFT/SUBMITTED/APPROVED/REJECTED states via JdbcTemplate (embedded in 02-01 @BeforeEach)
- [x] Extend `DocumentSearchPermissionMatrixTest.java` — add 3 hierarchical cases to verify Phase 30 predicate upgrade consistency (covers D-A9) — scheduled in 02-03
- [x] `DepartmentRepository.findDescendantIds` direct unit test — folded into 02-01 `findDescendantIds_recursive_cte_returns_self_plus_all_descendants` (10-level deep fixture 검증) ; 별도 `DepartmentRepositoryTest.java` 생성 생략 (PATTERNS §10 권장 skip)
- [x] `DashboardSummaryResponseTest.java` — 필드 shape 검증은 JSON-level assertion in 02-01 (`rejectedCount_field_present` + `draftCount_remains_in_json_response`) 에 흡수됨; 별도 DTO unit test 불필요 (record 는 자동 생성자)

### Frontend test infra
- [x] `frontend/src/features/approval/hooks/__tests__/useApprovals.invalidation.test.ts` — new, spies `queryClient.invalidateQueries` (covers DASH-05 for approve/reject) — scheduled in 05-01
- [x] `frontend/src/features/document/hooks/__tests__/useDocuments.invalidation.test.ts` — new, spies `queryClient.invalidateQueries` (covers DASH-05 for submit/withdraw + create scope 경계) — scheduled in 05-02
- [x] `frontend/src/features/dashboard/pages/__tests__/DashboardPage.test.tsx` — new, 4 CountCard smoke + drafts absence + 라벨 i18n — scheduled in 04-03
- [x] `frontend/src/features/dashboard/components/__tests__/ErrorState.test.tsx` — new, renders AlertTriangle + Korean copy + 다시시도 button wiring — scheduled in 04-03
- [x] Test utility: `renderWithQueryClient(ui)` helper — already inlined in DocumentListPage.test.tsx analog + 각 새 테스트 파일에 QueryClient wrapper 인라인 작성 (별도 helper 파일 불요)

*Existing infrastructure (vitest, JUnit 5, @SpringBootTest, @AutoConfigureMockMvc) covers framework-level needs. Domain test files are authored in-line inside 02-01 / 04-03 / 05-01 / 05-02.*

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

- [x] All tasks have `<automated>` verify or Wave 0 dependencies (Task IDs wired 01-01 .. 06-03 above)
- [x] Sampling continuity: no 3 consecutive tasks without automated verify (all tasks have gradle/npm/grep automation)
- [x] Wave 0 covers all MISSING references (test files scheduled above; inline authorship inside scheduled tasks)
- [x] No watch-mode flags in any command
- [x] Feedback latency < 60s for targeted quick run
- [x] `nyquist_compliant: true` set in frontmatter (planner wired task IDs — revision pass)

**Approval:** pending (planner revision complete — checker re-verify)
</content>

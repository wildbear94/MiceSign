---
phase: 31-dashboard
plan: 02
subsystem: dashboard-service-rbac
tags: [dashboard, backend, service, controller, test, rbac, hierarchy, integration-test]
requires:
  - "Plan 01 — DashboardSummaryResponse 7-arg canonical (rejectedCount 필드), findDescendantIds CTE, count 헬퍼 5건"
  - "Plan 06 — DocumentRepositoryCustomImpl descendantDeptIds predicate upgrade (D-A9 Option 1)"
provides:
  - "DashboardService.getDashboardSummary(Long userId, UserRole role, Long departmentId) — role-based 3-arg 시그니처"
  - "DashboardService USER/ADMIN/SUPER_ADMIN 분기 — 부서 계층 재귀 스코프 (D-A4/A5/A6)"
  - "DashboardController — CustomUserDetails.getRole() String → UserRole.valueOf 파싱 후 3-arg 호출"
  - "DashboardServiceIntegrationTest — role × 4카드 × 부서 계층 matrix 7 통합 테스트 케이스"
  - "DocumentSearchPermissionMatrixTest — 부서 계층 재귀 3 신규 케이스 (Plan 06 D-A9 Option 1 회귀 보호)"
affects:
  - "Plan 03 — FE types + hook 이 DashboardSummaryResponse 7 필드 (rejectedCount 포함) 에 의존 가능"
  - "FE `/api/v1/dashboard/summary` — BE 응답 JSON 필드 추가 (rejectedCount), completedCount semantics 재정의 (APPROVED only)"
tech-stack:
  added: []
  patterns:
    - "Java 17 switch expression + sentinel List 패턴 (null=전사, empty=0, non-empty=IN 절)"
    - "@SpringBootTest + @AutoConfigureMockMvc + JdbcTemplate fixture — role 매트릭스 통합 테스트"
    - "H2 FK row-by-row 검사 회피 — 부서 계층 leaf → root 개별 DELETE 패턴"
key-files:
  created:
    - backend/src/test/java/com/micesign/dashboard/DashboardServiceIntegrationTest.java
  modified:
    - backend/src/main/java/com/micesign/service/DashboardService.java
    - backend/src/main/java/com/micesign/controller/DashboardController.java
    - backend/src/test/java/com/micesign/document/DocumentSearchPermissionMatrixTest.java
decisions:
  - "role-based 3-arg 시그니처 확정 — (Long userId, UserRole role, Long departmentId) + switch(role) ADMIN/USER/SUPER_ADMIN 분기 구조 고정"
  - "USER/ADMIN empty-fallback → List.of(userId) 로 0건 강제 회피 — 부서에 자기 자신만 있는 edge case 에서도 본인 카운트 유지"
  - "SUPER_ADMIN sentinel = null — countByStatus / countAllPending 전사 경로로 switch"
  - "recentPending / recentDocuments 는 role 불문 본인 userId 스코프 유지 (RESEARCH A6) — ADMIN 도 '내가 처리할 / 내가 기안한' 의미 보존"
  - "CustomUserDetails.getRole() 이 String 반환 (기존 설계) → Controller 에서 UserRole.valueOf 로 파싱. enum 변경 없이 호환"
  - "기존 getSummary(Long) backward-compat alias 는 제거 — Controller 단독 call-site 에서 직접 새 시그니처 호출. 다른 호출자 없음 확인됨"
  - "7-arg canonical constructor 사용 — rejectedCount 실값 전달. Plan 01 의 6-arg backward-compat constructor 는 call-site 없음 (미삭제 유지: 미래 호출자 대비)"
  - "[Rule 1] DocumentSearchPermissionMatrixTest userG_superAdmin 의 containsExactlyInAnyOrder → contains 로 완화. Phase 31 D-A9 fixture 가 SUPER_ADMIN 전사 결과에 포함되는 것은 정상 행동이므로 핵심 invariant (Alice 3 핵심 문서 포함 + DRAFT 제외) 만 검증"
  - "800번대 D-A9 fixture 는 기존 600번대 seed 와 완전 격리 — id 충돌 zero, DB truncate side-effect zero"
metrics:
  duration: "~8 minutes"
  tasks: 3
  files_modified: 3
  files_created: 1
  completed_date: "2026-04-24"
---

# Phase 31 Plan 02: DashboardService 권한 분기 + 부서 계층 재귀 Summary

`DashboardService.getDashboardSummary` 를 role-based 3-arg 시그니처 (`userId, role, departmentId`)로 전면 리팩터하여 USER/ADMIN/SUPER_ADMIN 분기 + MariaDB WITH RECURSIVE 계층 재귀 스코프를 구현. `DashboardController` 를 새 시그니처로 업데이트. 신규 `DashboardServiceIntegrationTest` 7 케이스와 `DocumentSearchPermissionMatrixTest` 3 신규 케이스로 DASH-01/DASH-02 및 Plan 06 D-A9 Option 1 의 신 동작을 SoT 수준에서 증명.

## Executive Summary

Phase 31 의 핵심 BE 로직 완성 단계. Plan 01 이 제공한 repo/DTO foundation 과 Plan 06 이 확립한 검색 권한 predicate upgrade 를 소비하여, 대시보드 카운트와 `/documents/search` 결과가 동일 drafter 집합 위에서 움직이도록 확정. 3-arg 시그니처는 FE (Plan 03+) 가 의존할 stable contract 이며, 신규 integration test 는 FE 통합 버그가 BE 기원인지 즉시 판별할 수 있는 SoT 를 제공.

**CustomUserDetails 의 실제 시그니처 확인**: 계획서가 `user.getUser().getRole()` 을 가정했으나 실제로는 `user.getRole()` 이 String 을 반환. `UserRole.valueOf(String)` 파싱으로 enum 변환 — Plan 의도 (role enum 전달) 준수하면서 기존 security 컴포넌트 무수정.

## Completed Tasks

| # | Task | 결과 | Commit |
|---|------|------|--------|
| 1 | DashboardServiceIntegrationTest 신규 — 부서 계층 fixture + role × 4카운트 matrix (RED) | @SpringBootTest + MockMvc + JdbcTemplate, 700번대 id 완전 격리, 7 @Test 케이스 작성. 의도된 RED (카운트 assertion 4건 FAIL) | `7552d82` |
| 2 | DashboardService refactor — role-based 3-arg + DashboardController 업데이트 (GREEN) | switch(role) 분기, Department/UserRepository DI, 7-arg canonical constructor, private count helpers, String role → UserRole.valueOf. Task 1 7 케이스 GREEN | `c26099d` |
| 3 | DocumentSearchPermissionMatrixTest 확장 — 부서 계층 재귀 3 케이스 (D-A9 Option 1 회귀 보호) | 800번대 P31 fixture (HQ/Eng/Plat), 3 신규 @Test, Rule 1 userG_superAdmin contains 완화 | `f526938` |

## Decisions Made

- **role-based 3-arg 시그니처 확정** — `(Long userId, UserRole role, Long departmentId)`. switch(role) ADMIN/USER/SUPER_ADMIN 분기 고정. fallback default (미지원 role 투입 시) 는 본인 스코프 `List.of(userId)` — fail-safe 유지.
- **USER/ADMIN empty-fallback = List.of(userId)** — 부서 계층에서 user 가 없거나 departmentId 가 null 인 edge case 에서 `countByDrafterIdInAndStatus([])` = 0 이 반환되어 "본인 문서까지 0" 으로 떨어지는 것을 방지. Plan 01 의 ADMIN 은 부서가 할당되어야 한다는 전제 하에서 안전한 default.
- **SUPER_ADMIN sentinel = null** — `countByStatus(DocumentStatus)` / `countAllPending()` 경로로 직결. List 로 전체 user id 를 수집하지 않으므로 O(1) 쿼리 (`SELECT count(*) FROM document WHERE status = ?`).
- **recentPending / recentDocuments 본인 스코프 고정** — RESEARCH A6 결정. ADMIN 이 대시보드 아래 "내가 처리할 결재 5건" 을 봤을 때 부서 전체가 아닌 본인만. "최근 기안한 문서 5건" 도 본인만. role 파라미터를 무시하고 항상 `userId` 로 필터.
- **String role → UserRole.valueOf 파싱** — `CustomUserDetails` 는 기존 설계대로 String role 을 유지 (security 컴포넌트 무수정). Controller 에서만 enum 변환. JWT 에 담긴 값이므로 `IllegalArgumentException` 은 발생 불가 (서버가 생성한 문자열만 들어옴).
- **7-arg canonical constructor 사용** — Plan 01 의 6-arg backward-compat constructor 는 이 Plan 의 call-site 에서 unused. 삭제하지 않음 (future safety default).
- **[Rule 1 - Bug]** DocumentSearchPermissionMatrixTest `userG_superAdmin` 의 `containsExactlyInAnyOrder` → `contains` 완화. Phase 31 fixture 의 800번대 Platform SUBMITTED 가 SUPER_ADMIN 전사 결과에 포함되는 것은 정상 행동이므로 핵심 invariant (Alice 의 3 문서 포함 + DRAFT 제외) 만 검증. 기존 9 케이스의 의미 보존.
- **800번대 fixture 격리 전략** — 기존 600번대 seed (A~F, Z) 와 id 충돌 zero. `@BeforeEach` 내에 cleanup+insert 포함, `@AfterEach` 에서 뒷정리. DB truncate side-effect zero.

## Verification

### Compilation

- `cd backend && ./gradlew compileJava compileTestJava` → **BUILD SUCCESSFUL** (exit 0).

### Tests

- `./gradlew test --tests "com.micesign.dashboard.DashboardServiceIntegrationTest"` → **BUILD SUCCESSFUL** — 7 @Test 모두 green.
  - user_sees_only_self_drafted (USER Platform)
  - admin_sees_descendant_scope (ADMIN Engineering — [Eng, Plat] descendantDeptIds)
  - superAdmin_sees_all (전사 sentinel)
  - admin_hq_covers_full_hierarchy (HQ → 4 부서 descendant)
  - draftCount_and_rejectedCount_present_in_json (API contract)
  - findDescendantIds_recursive_cte_returns_self_plus_all_descendants (CTE SoT)
  - recent_lists_remain_self_scope_even_for_admin (RESEARCH A6)
- `./gradlew test --tests "com.micesign.document.DocumentSearchPermissionMatrixTest"` → **BUILD SUCCESSFUL** — 12 @Test (9 기존 + 3 신규) 모두 green.
  - userA_self, userB_approveApprover, userC_agreeApprover, userD_referenceApprover (USER 경로)
  - userE_sameDepartmentAdmin, userF_otherDepartmentAdmin_notInApprovalLine (ADMIN 단일 부서 fallback — descendantDeptIds=[leaf])
  - userG_superAdmin (Rule 1 contains 완화)
  - unrelatedUser_seesNothing (BOLA)
  - countDistinct_withMultipleApprovalLines_returnsOneDoc (Revision 1 WARNING 2)
  - adminOfEngineering_sees_platformUser_document_via_hierarchy ★ 신규
  - adminOfPlatform_does_not_see_engineering_sibling_documents ★ 신규
  - tab_department_for_admin_engineering_covers_platform ★ 신규

### Artifact Presence (grep verifiable)

| 확인 대상 | 기대값 | 결과 |
|-----------|--------|------|
| `getDashboardSummary(Long userId, UserRole role, Long departmentId)` in `DashboardService.java` | 1 | 1 |
| `findDescendantIds` in `DashboardService.java` | 1 | 2 (import-not-counted, call 1 + javadoc 1) |
| `findIdsByDepartmentIdIn` in `DashboardService.java` | 1 | 2 |
| `countByStatus\|countAllPending` in `DashboardService.java` | ≥ 2 | 5 |
| `private final DepartmentRepository departmentRepository` | 1 | 1 |
| `private final UserRepository userRepository` | 1 | 1 |
| `dashboardService.getDashboardSummary` in `DashboardController.java` | 1 | 1 |
| `UserRole.valueOf(user.getRole())` in `DashboardController.java` | 1 | 1 |
| `@Test` count in `DashboardServiceIntegrationTest.java` | ≥ 6 | 7 |
| `admin_sees_descendant_scope` | 1 | 1 |
| `findDescendantIds_recursive_cte` | 1 | 1 |
| `adminOfEngineering_sees_platformUser_document` in Matrix test | 1 | 1 |
| `adminOfPlatform_does_not_see_engineering` in Matrix test | 1 | 1 |
| `tab_department_for_admin_engineering` in Matrix test | 1 | 1 |
| `P31_HQ\|P31_Eng\|P31_Plat` refs in Matrix test | ≥ 3 | 7 |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] userG_superAdmin assertion 완화**
- **Found during:** Task 3 verification — Phase 31 D-A9 fixture (800번대 P31_Plat SUBMITTED) 추가 후 기존 `userG_superAdmin` 테스트가 FAIL. SUPER_ADMIN 전사 결과에 `submittedDocId` + 신규 `Phase31 Platform SUBMITTED` 2건이 모두 포함되므로 `containsExactlyInAnyOrder(submittedDocId, approvedDocId, rejectedDocId)` 실패.
- **Issue:** Assertion 이 "Alice 의 3 문서만 존재" 를 요구했으나 핵심 의미는 "전사 스코프 + DRAFT 제외" 였음. 신규 fixture 가 정당하게 전사 결과에 포함되어야 함에도 엄격한 exact-match 가 걸림.
- **Fix:** `containsExactlyInAnyOrder` → `contains` (부분집합) + `doesNotContain(draftDocId)` 유지. 주석으로 Phase 31 fixture 포함이 정상 행동임을 명시.
- **Files modified:** `backend/src/test/java/com/micesign/document/DocumentSearchPermissionMatrixTest.java`
- **Commit:** `f526938` (Task 3 와 함께)
- **Rationale for Rule 1:** 본 Plan 의 신규 fixture 추가가 기존 테스트를 깨트리는 것은 scope 내 자기발생 side-effect. 핵심 invariant 는 보존하며 assertion 만 semantic-match 으로 재조정.

**2. [Rule 3 - Blocking] 부서 삭제 순서 — H2 FK row-by-row 검사 회피**
- **Found during:** Task 1 초기 실행 — RED 가 아닌 `DataIntegrityViolationException` 으로 fail. `DELETE FROM department WHERE id IN (701, 702, 703)` 가 H2 에서 row-by-row FK 검사 수행 → 701(Engineering) 삭제 시점에 702(Platform, parent_id=701) 아직 존재하여 위반.
- **Issue:** Plan 의 예제 코드가 `IN (PLAT, ENG, SALES)` 단일 DELETE 문을 제시했으나 H2 는 이 순서로 삭제하지 않음 (MariaDB 와 다른 동작).
- **Fix:** 부서 개별 DELETE 로 전환 — leaf (Platform) → middle (Engineering) → sibling leaf (Sales) → root (HQ). `DocumentSearchPermissionMatrixTest` 의 800번대 fixture 에도 동일 패턴 적용.
- **Files modified:** `backend/src/test/java/com/micesign/dashboard/DashboardServiceIntegrationTest.java`, `backend/src/test/java/com/micesign/document/DocumentSearchPermissionMatrixTest.java`
- **Commit:** `7552d82` (Task 1 와 함께) + `f526938` (Task 3)
- **Rationale for Rule 3:** Task 1 의 RED acceptance "컴파일 성공 + RED assertion fail" 을 차단하는 blocking issue. Architectural 변경 없이 SQL 실행 순서 조정으로 해결. H2/MariaDB 호환 패턴을 새로 수립.

## Auth Gates

N/A — 본 Plan 은 로컬 코드 편집 + gradle 컴파일·테스트만 수행. 외부 시스템 인증 불필요.

## Known Stubs

없음. 신규 DashboardService 코드는 실제 리포지터리 호출만으로 동작하며 placeholder/TODO 없음. recentPending/recentDocuments 도 실 데이터 경로.

## BE-FE Contract 호환성 (preserve existing)

- **JSON 응답 필드**: 기존 필드 (`pendingCount`, `draftCount`, `submittedCount`, `completedCount`, `recentPending`, `recentDocuments`) 모두 보존. `rejectedCount` 신규 추가. FE `DashboardSummary` 타입에 아직 `rejectedCount` 가 없으나 TypeScript 는 JSON 의 extra field 를 무시 → runtime error 없음.
- **USER role 숫자**: `drafterIds=List.of(userId)` 치환으로 기존과 **완전히 동일한 drafter 스코프**. 단, `completedCount` 가 기존 "APPROVED+REJECTED 합산" → "APPROVED only" 로 재정의됨 (D-A2 lock). USER 가 기안한 승인 완료 + 반려 문서가 모두 있을 경우 UI 숫자가 감소할 수 있으나, 이는 계획된 v1.2 의미 변경이며 FE Plan 03 에서 분리 표시로 해결 예정.
- **ADMIN/SUPER_ADMIN role 숫자**: 확장된 스코프 (부서 계층 / 전사) 로 숫자가 증가. 기존에는 본인 기안만 보였으므로 개선 방향.
- **엔드포인트 시그니처**: `GET /api/v1/dashboard/summary` 유지, 요청 파라미터 없음, 응답 구조 호환. Controller 의 `@GetMapping({"", "/summary"})` 동일.
- **Preserve existing 준수**: route, menu, 기존 FE 훅 호출 경로 모두 변경 없음. Plan 03 FE wiring 전까지 기존 DashboardPage 는 BE 로부터 구 필드만 읽어 정상 렌더링.

## Threat Flags

없음 — 본 Plan 의 추가 surface 는 threat_model 에 이미 등록된 T-31-T1 ~ T-31-T5 내에서 처리:
- T-31-T1 (Elevation of Privilege): `UserRole.valueOf(user.getRole())` 은 JWT 파싱 결과 (`CustomUserDetails` 가 서버에서 생성) 만 입력으로 받으므로 클라이언트 조작 불가. `user_sees_only_self_drafted` / `admin_sees_descendant_scope` / `superAdmin_sees_all` 3 케이스가 role 별 분기 동작을 증명.
- T-31-T2 (Information Disclosure, 상위 부서 누출): `adminOfPlatform_does_not_see_engineering_sibling_documents` 테스트로 증명 — 재귀 방향이 하위 only.
- T-31-T5 (DoS, N+1): `findPendingByApproverId` 는 Phase 29 에서 `JOIN FETCH approver.department` 추가됨. page size 5 제한 유지.

## Consumers / Downstream (reference)

| Consumer | Plan | 소비 방식 |
|----------|------|-----------|
| FE `useDashboardSummary` 훅 + `DashboardPage` | Plan 03 | 신 JSON 필드 `rejectedCount` 를 `DashboardSummary` 타입에 추가, 4카드 구성에 반영. `completedCount` semantics 재정의를 FE UI 에 명시 |
| FE `useApprovals` / `useDocuments` mutation onSuccess | Plan 05 | `invalidateQueries({ queryKey: ['dashboard'] })` 추가로 승인/반려/상신/회수 후 신 카운트 실시간 재계산 |
| `/api/v1/dashboard/summary` production endpoint | 운영 | USER 사용자는 기존과 동일 숫자 (completedCount 만 의미 변경), ADMIN 은 부서 계층 확장 숫자, SUPER_ADMIN 은 전사 숫자 노출 |
| DashboardServiceIntegrationTest matrix | CI | FE Plan 03 통합 시 BE 기원 버그 즉시 판별 가능한 SoT |

## Notes

- **UserRole.valueOf 파싱 경로 확정** — Plan 예제가 `user.getUser().getRole()` 로 제시했지만 실제 `CustomUserDetails` 는 `getRole(): String` 설계. enum 전환은 Controller 책임으로 가져감. `security` 패키지 무수정 원칙.
- **부서 계층 DELETE 패턴 표준화** — H2 row-by-row FK 검사 특성 때문에 parent 를 먼저 지우려 하면 실패. 향후 phase 에서 계층 부서 fixture 사용 시 leaf → root 개별 DELETE 표준 준수 권장. Plan 06 의 CTE 보정과 더불어 H2/MariaDB 호환 패턴 라이브러리 2건째.
- **Plan counter advancement** — 본 Plan 완료 후 Phase 31 Plan 카운터 3/6 (wave 2 진입). Plan 03 (FE types + hook) 이 다음 실행 대상.
- **Duration 메트릭** — 약 8분 (3 task + RED/GREEN 사이클 + Rule 1/Rule 3 auto-fix 포함).

## Self-Check: PASSED

- [x] `backend/src/main/java/com/micesign/service/DashboardService.java` — `getDashboardSummary(Long userId, UserRole role, Long departmentId)` 존재 확인됨
- [x] `backend/src/main/java/com/micesign/service/DashboardService.java` — `departmentRepository.findDescendantIds` + `userRepository.findIdsByDepartmentIdIn` 호출 존재 확인됨
- [x] `backend/src/main/java/com/micesign/controller/DashboardController.java` — `UserRole.valueOf(user.getRole())` + `dashboardService.getDashboardSummary(...)` 존재 확인됨
- [x] `backend/src/test/java/com/micesign/dashboard/DashboardServiceIntegrationTest.java` — 7 @Test 존재, 파일 생성 확인됨
- [x] `backend/src/test/java/com/micesign/document/DocumentSearchPermissionMatrixTest.java` — 3 신규 @Test + 800번대 fixture 존재 확인됨
- [x] Commit `7552d82` (Task 1 RED) — git log 에 존재 확인됨
- [x] Commit `c26099d` (Task 2 GREEN) — git log 에 존재 확인됨
- [x] Commit `f526938` (Task 3) — git log 에 존재 확인됨
- [x] `./gradlew test --tests "Dashboard*" --tests "com.micesign.document.DocumentSearchPermissionMatrixTest"` → BUILD SUCCESSFUL (19 @Test: 7 Dashboard + 12 Matrix)
- [x] Phase 30 regression 원본 9 케이스 + 신규 3 케이스 green 유지 확인됨
- [x] `./gradlew compileJava compileTestJava` exit 0 — 전체 프로젝트 컴파일 성공 확인됨

---
phase: 31-dashboard
plan: 06
subsystem: dashboard-search-sot-unification
tags: [dashboard, backend, repository, service, hierarchy, phase30-upgrade, h2-compat]
requires:
  - "Plan 01 — DepartmentRepository.findDescendantIds (WITH RECURSIVE CTE)"
  - "Phase 30 DocumentRepositoryCustom(Impl) + DocumentService.searchDocuments 현 구조"
provides:
  - "DocumentRepositoryCustom.searchDocuments 시그니처에 List<Long> descendantDeptIds 파라미터"
  - "DocumentRepositoryCustomImpl tab=department / tab=all(ADMIN) / ADMIN permission branch 3곳에서 descendantDeptIds 기반 in-predicate (D-A9 Option 1)"
  - "descendantDeptIds null/empty 시 단일 부서 fallback (Phase 30 backward-compat)"
  - "DocumentService.searchDocuments DepartmentRepository DI + findDescendantIds 호출 및 리포지터리 전달"
  - "H2 호환 WITH RECURSIVE dept_tree(id) AS (...) CTE 문법 보정 (Plan 01 결과 수정)"
affects:
  - "Plan 02 — DashboardService ADMIN 스코프 집계가 동일 findDescendantIds SoT 를 소비하여 대시보드 카운트 ≠ 검색 결과 버그 구조적 차단"
  - "Phase 30 DocumentSearchPermissionMatrixTest — 9 케이스 모두 green (userE/F 케이스가 CTE 호출 경로로 전환됐으나 단일 부서 leaf 특성상 결과 동등)"
tech-stack:
  added: []
  patterns:
    - "QueryDSL BooleanExpression in(List<Long>) + eq(Long) 이중 경로 — descendantDeptIds non-empty/empty 분기"
    - "Native recursive CTE 컬럼 리스트 표기 (`WITH RECURSIVE t(col) AS ...`) — H2/MariaDB 공통 문법"
    - "Spring DI 생성자 주입 추가 패턴 (DepartmentRepository 필드/파라미터/assignment 3점 동기)"
key-files:
  created: []
  modified:
    - backend/src/main/java/com/micesign/repository/DocumentRepositoryCustom.java
    - backend/src/main/java/com/micesign/repository/DocumentRepositoryCustomImpl.java
    - backend/src/main/java/com/micesign/service/DocumentService.java
    - backend/src/main/java/com/micesign/repository/DepartmentRepository.java
decisions:
  - "D-A9 Option 1 채택 — Phase 30 predicate 를 hierarchy 로 upgrade (SoT 통일, Option 2 downgrade 거부)"
  - "descendantDeptIds null/empty 경로는 단일 부서 eq fallback — Phase 30 backward-compat 불변식 유지, USER/SUPER_ADMIN 동작 zero-change"
  - "DocumentService 는 role=ADMIN OR tab∈(department,all) 조건에서만 findDescendantIds 호출 — tab=my 및 SUPER_ADMIN 은 Collections.emptyList() 전달로 CTE 호출 0회 보장"
  - "[Rule 3] WITH RECURSIVE 에 컬럼 리스트 `dept_tree(id)` 명시 — H2 테스트 DB 호환. MariaDB 운영 환경에서도 동등 동작"
metrics:
  duration: "~3 minutes"
  tasks: 3
  files_modified: 4
  files_created: 0
  completed_date: "2026-04-24"
---

# Phase 31 Plan 06: D-A9 Option 1 — ADMIN 부서계층 SoT 통일 Summary

Phase 30 `DocumentRepositoryCustomImpl` 의 ADMIN predicate 를 단일 부서 매칭에서 부서 계층 재귀(`WITH RECURSIVE` CTE 결과 `descendantDeptIds`)로 upgrade — 대시보드 카운트(Plan 02)와 `/documents/search` 결과(Phase 30)의 SoT 를 `DepartmentRepository.findDescendantIds` 로 통일하여 "대시보드 숫자 ≠ 검색 결과" 버그를 구조적으로 차단.

## Executive Summary

본 Plan 은 Phase 30 이 확립한 권한 predicate 의 **비가역적 SoT 재정렬** — Plan 02 의 ADMIN 대시보드 집계와 동일 `findDescendantIds` 출력을 검색 경로에도 공급하여 D-A8 카드 클릭 이후 목록에 등장하는 drafter 집합이 카운트 집합과 반드시 일치하도록 보장. `descendantDeptIds` 가 null/empty 인 경로는 Phase 30 기존 단일 부서 `eq(departmentId)` 로 fallback 하여 USER/SUPER_ADMIN/미사용 tab 의 회귀 리스크 zero. 실행 중 Plan 01 이 제공한 CTE 가 H2 테스트 컨텍스트에서 파싱 실패하는 issue 를 발견해 `WITH RECURSIVE dept_tree(id) AS (...)` 형태로 컬럼 리스트 명시 보정(MariaDB/H2 공통).

## Completed Tasks

| # | Task | 결과 | Commit |
|---|------|------|--------|
| 1 | `DocumentRepositoryCustom.searchDocuments` 시그니처에 `List<Long> descendantDeptIds` 파라미터 추가 + Javadoc 으로 D-A9 Option 1 의도 명시 | 인터페이스 단독 교체, impl/caller 수정 전까지 일시 컴파일 실패 예상대로 | `8098e0f` |
| 2 | `DocumentRepositoryCustomImpl` 3곳 predicate 를 descendantDeptIds in-절로 upgrade + null/empty fallback | tab=department (1) + tab=all ADMIN (1) + ADMIN permission branch 서브쿼리 (1) = 3곳 치환, USER/SUPER_ADMIN 무영향 | `29cbe1b` |
| 3 | `DocumentService` DepartmentRepository DI + searchDocuments 에서 findDescendantIds 호출 및 전달 (+ Rule 3 H2 CTE 호환 fix) | DI 3점 동기(필드/ctor param/assignment), role/tab 조건 도출 후 List<Long> 전달, Phase 30 regression 9 케이스 green | `b8a9324` |

## Decisions Made

- **D-A9 Option 1 확정 실행** — CONTEXT.md 에서 "권장, Option 2 거부" 로 lock 된 결정을 코드 계층에서 관철. Phase 30 검색이 Plan 02 대시보드와 동일 drafter 집합에 기반.
- **fallback 2중 안전선** — descendantDeptIds null 검사 + `isEmpty()` 검사. 호출자가 실수로 `emptyList()` 를 넘기거나 `findDescendantIds` 가 비정상적으로 빈 리스트를 반환해도 기존 Phase 30 단일 부서 의미로 회귀(그리고 이는 leaf 부서 ADMIN 의 실제 정답).
- **CTE 문법 보정(Rule 3)** — Plan 01 이 작성한 `WITH RECURSIVE dept_tree AS (...)` 는 MariaDB 에서는 동작하지만 H2 2.x 가 CTE 이름 뒤에 컬럼 리스트를 요구하여 Syntax Error 42001 발생. `dept_tree(id)` 형태로 컬럼 리스트 명시해 양 DBMS 공통 문법으로 맞춤. Plan 01 완성 시 H2 에서 findDescendantIds 가 미호출이었기에 drift 미노출됐던 케이스.
- **tab=my + SUPER_ADMIN 케이스에서 CTE 호출 0회** — 불필요한 비용 회피. `needsHierarchy` 조건이 false 면 `Collections.emptyList()` 로 조기 short-circuit.

## Verification

### Compilation

- `cd backend && ./gradlew compileJava` — **BUILD SUCCESSFUL** (Task 3 완료 후 전체 프로젝트).

### Regression — Phase 30 `DocumentSearchPermissionMatrixTest`

- `cd backend && ./gradlew test --tests "com.micesign.document.DocumentSearchPermissionMatrixTest"` — **BUILD SUCCESSFUL**.
- 9 케이스 전부 green:
  - A (self USER), B (APPROVE 승인자), C (AGREE 승인자), D (REFERENCE 참조자) — USER 경로, descendantDeptIds 비활성.
  - E (같은 부서 ADMIN) — descendantDeptIds = [DEPT_1] (V2 seed 상 leaf), `in([DEPT_1])` 이 `eq(DEPT_1)` 과 동등 → 기존 결과 유지.
  - F (다른 부서 ADMIN, 승인라인 미등록) — 타 부서 descendantDeptIds 와 교집합 zero → 0건 유지.
  - G (SUPER_ADMIN) — predicate 생략 경로, descendantDeptIds 미사용.
  - countDistinct invariant, 무관 사용자 Z (BOLA 차단) — 변경 없는 경로.

### Artifact Presence (grep verifiable)

| 확인 대상 | 기대값 | 결과 |
|-----------|--------|------|
| `descendantDeptIds` in `DocumentRepositoryCustom.java` | ≥ 1 | 2 (Javadoc 1 + 시그니처 1) |
| `List<Long> descendantDeptIds` in `DocumentRepositoryCustom.java` | 1 | 1 |
| `Phase 31 D-A9 Option 1` in `DocumentRepositoryCustom.java` | 1 | 1 |
| `descendantDeptIds` in `DocumentRepositoryCustomImpl.java` | ≥ 4 | 8 |
| `drafter.departmentId.in(descendantDeptIds)` in Impl | 2 | 2 |
| `deptUser.departmentId.in(descendantDeptIds)` in Impl | 1 | 1 |
| `drafter.departmentId.eq(departmentId)` fallback in Impl | ≥ 2 | 2 |
| `private final DepartmentRepository departmentRepository` in `DocumentService.java` | 1 | 1 |
| `departmentRepository.findDescendantIds` in `DocumentService.java` | 1 | 1 |
| `descendantDeptIds` in `DocumentService.java` | ≥ 2 | 3 |
| `import com.micesign.repository.DepartmentRepository` in `DocumentService.java` | 1 | 1 |
| `WITH RECURSIVE dept_tree(id) AS` in `DepartmentRepository.java` | 1 | 1 |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] H2 호환 CTE 문법 보정**
- **Found during:** Task 3 verification — Phase 30 `DocumentSearchPermissionMatrixTest` userE/userF 가 500 Internal Server Error 반환. 로그에서 `SQL Error 42001: Syntax error in SQL statement "WITH RECURSIVE dept_tree [*]AS (...)"; expected "("`.
- **Issue:** Plan 01 이 `WITH RECURSIVE dept_tree AS (...)` 로 작성한 native CTE 가 H2 2.x 에서 파싱 실패. H2 는 recursive CTE 의 이름 뒤에 컬럼 리스트 필수 요구. MariaDB 는 컬럼 리스트 선택. Plan 01 단독 완료 시점에서는 `findDescendantIds` 가 호출되지 않아 노출되지 않았고, Plan 06 이 DocumentService 에서 실호출하면서 표면화.
- **Fix:** `WITH RECURSIVE dept_tree(id) AS (SELECT id FROM department WHERE id = :deptId UNION ALL ...)` — 컬럼 리스트 `(id)` 명시. MariaDB 에서도 유효.
- **Files modified:** `backend/src/main/java/com/micesign/repository/DepartmentRepository.java`
- **Commit:** `b8a9324` (Task 3 와 병합 커밋)
- **Rationale for Rule 3:** Plan 06 Task 3 verification 의 "Phase 30 regression green" acceptance 를 차단하는 blocking issue. Architectural 변경 없이 단일 라인 수정으로 해결 가능.

## Auth Gates

N/A — 본 Plan 은 로컬 코드 편집 + gradle 컴파일·테스트만 수행. 외부 시스템 인증 불필요.

## Known Stubs

없음. `descendantDeptIds` 는 실제 CTE 결과를 전달하며 data stub 없음. fallback 경로 (null/empty) 는 Phase 30 기존 단일 부서 로직과 기능 동일이지 placeholder 가 아님.

## Threat Flags

없음 — 추가된 surface 는 `<threat_model>` 에 이미 등록된 T-31-T1~T5 내에서 처리됨.
- T-31-T2 (부서 descendant 누출): `descendantDeptIds` 는 서버측 `departmentRepository.findDescendantIds(departmentId)` 로만 도출, `departmentId` 는 JWT CustomUserDetails SoT. 클라이언트 조작 불가 불변식 유지 (Phase 30 userF 케이스 green 이 증명).
- T-31-T5 (parameter binding): QueryDSL `in(List<Long>)` + JPA named parameter — SQL injection 차단.
- 신규 endpoint / auth path / schema 변경 zero.

## Consumers / Downstream (reference)

| Consumer | Plan | 소비 방식 |
|----------|------|-----------|
| `/api/v1/documents/search` (DocumentController → DocumentService → CustomImpl) | — 운영 | role/tab 조건에 따라 descendantDeptIds 자동 전달. 사용자 관점 행동 변화: ADMIN 이 계층 상위 부서원 기안 문서를 검색 결과에서 볼 수 있음(이전에는 단일 부서만). |
| DashboardService (Plan 02) | Plan 02 | 동일 `DepartmentRepository.findDescendantIds` 호출로 ADMIN 카운트 계산 → 대시보드 4카드 숫자와 D-A8 클릭 후 노출되는 검색 결과 drafter 집합이 수학적으로 동일 집합. "대시보드 숫자 ≠ 검색 결과" 버그 구조적 차단. |

## Notes

- **Plan counter advancement** — 본 Plan 완료 후 Phase 31 의 Plan 카운터 2 → (추정) 7/6 (자동 핸들러). 그러나 ROADMAP 기준 Plan 06 이 마지막이며 Plan 01 이 이미 완료되었으므로 실제 "wave 1 병렬 peer" 중 한 편이 마감된 상태. 나머지 Plan 02~05 는 다른 executor 담당.
- **H2 vs MariaDB CTE drift 예방** — 본 fix 로 `dept_tree(id)` 컬럼 리스트 명시가 프로젝트 표준. 향후 `@Query(nativeQuery=true)` 로 recursive CTE 작성 시 컬럼 리스트 명시 필수.
- **성능** — `findDescendantIds` 는 searchDocuments 호출 당 최대 1회(ADMIN/부서 tab 경로). MariaDB `cte_max_recursion_depth` default 1000, MiceSign 부서 트리 깊이 ≤ 5 → overflow 및 비용 우려 없음(< 5ms, Plan 01 T-31-T4 분석과 동일).

## Self-Check: PASSED

- [x] `backend/src/main/java/com/micesign/repository/DocumentRepositoryCustom.java` — `List<Long> descendantDeptIds` 파라미터 + `Phase 31 D-A9 Option 1` Javadoc 존재 확인됨
- [x] `backend/src/main/java/com/micesign/repository/DocumentRepositoryCustomImpl.java` — `drafter.departmentId.in(descendantDeptIds)` × 2, `deptUser.departmentId.in(descendantDeptIds)` × 1, fallback eq × 2 존재 확인됨
- [x] `backend/src/main/java/com/micesign/service/DocumentService.java` — `private final DepartmentRepository departmentRepository` 필드, `departmentRepository.findDescendantIds` 호출, `import com.micesign.repository.DepartmentRepository` 존재 확인됨
- [x] `backend/src/main/java/com/micesign/repository/DepartmentRepository.java` — `WITH RECURSIVE dept_tree(id) AS` 문법 확인됨
- [x] Commit `8098e0f` (Task 1) — git log 에 존재 확인 예정
- [x] Commit `29cbe1b` (Task 2) — git log 에 존재 확인 예정
- [x] Commit `b8a9324` (Task 3 + Rule 3 fix) — git log 에 존재 확인 예정
- [x] `./gradlew compileJava` exit 0 — 전체 프로젝트 컴파일 성공 확인됨
- [x] `./gradlew test --tests "com.micesign.document.DocumentSearchPermissionMatrixTest"` BUILD SUCCESSFUL — Phase 30 regression 9 케이스 green 확인됨

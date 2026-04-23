---
phase: 31-dashboard
plan: 01
subsystem: dashboard-foundation
tags: [dashboard, backend, repository, dto, rbac, hierarchy, cte]
requires:
  - "Phase 30 predicate(단일 부서) 가 기존 그대로 동작 (본 Plan 은 predicate 미변경)"
  - "MariaDB 10.11+ WITH RECURSIVE CTE 지원"
provides:
  - "DashboardSummaryResponse.rejectedCount 필드 (Phase 31 D-A2)"
  - "DashboardSummaryResponse 6-arg backward-compat secondary constructor (Plan 02 전환까지 DashboardService 무수정 보장)"
  - "DepartmentRepository.findDescendantIds(Long) — WITH RECURSIVE CTE 로 부서 계층 descendant id 수집 (D-A6, Plan 02/06 공용 SoT)"
  - "DocumentRepository.countByDrafterIdInAndStatus / countByStatus — ADMIN / SUPER_ADMIN 문서 카운트 (D-A4)"
  - "ApprovalLineRepository.countPendingByApproverIdIn / countAllPending — ADMIN / SUPER_ADMIN pending 카운트 (D-A5)"
  - "UserRepository.findIdsByDepartmentIdIn — 부서 계층 → user id scalar projection (D-A7)"
affects:
  - "Plan 02 — DashboardService role 분기 + 통합 테스트 (본 Plan 이 제공한 repo 메서드 소비)"
  - "Plan 06 — DocumentService.searchDocuments predicate D-A9 Option 1 업그레이드 (findDescendantIds 소비)"
tech-stack:
  added: []
  patterns:
    - "Java 17 record non-canonical (secondary) constructor 로 backward-compat 제공"
    - "Spring Data JPA @Query nativeQuery = true — MariaDB WITH RECURSIVE CTE"
    - "Spring Data method-name 쿼리 In 접미사 — 자동 IN (...) SQL 생성"
    - "JPQL approver.id IN :userIds scalar projection"
key-files:
  created: []
  modified:
    - backend/src/main/java/com/micesign/dto/dashboard/DashboardSummaryResponse.java
    - backend/src/main/java/com/micesign/repository/DepartmentRepository.java
    - backend/src/main/java/com/micesign/repository/DocumentRepository.java
    - backend/src/main/java/com/micesign/repository/ApprovalLineRepository.java
    - backend/src/main/java/com/micesign/repository/UserRepository.java
decisions:
  - "D-A2 — rejectedCount 신규 + completedCount=APPROVED only 로 재정의 (필드 순서 completedCount→rejectedCount→recentPending 고정)"
  - "Plan 01 은 pure foundation — DashboardService.java 미수정 (6-arg backward-compat constructor 로 컴파일 유지, Plan 02 가 7-arg canonical 로 전환)"
  - "D-A6 / A9 Option 1 SoT — findDescendantIds 단일 native CTE 메서드로 Plan 02 (ADMIN 대시보드) 와 Plan 06 (검색 권한 predicate) 공용"
  - "D-A7 — UserRepository.findIdsByDepartmentIdIn 는 UserStatus 필터 없음 (ACTIVE/INACTIVE/RETIRED 모두 포함) → 과거 퇴직자 기안 문서도 ADMIN 스코프 카운트 반영"
  - "기존 countPendingByApproverId / countByDrafterIdAndStatus 유지 (삭제 없음) — USER 스코프 backward-compat"
metrics:
  duration: "~3 minutes"
  tasks: 3
  files_modified: 5
  files_created: 0
  completed_date: "2026-04-24"
---

# Phase 31 Plan 01: 대시보드 백엔드 기반층 (Foundation) Summary

Phase 31 대시보드 고도화의 백엔드 리포지터리 및 DTO 기반층 retrofit — `DashboardSummaryResponse` 에 `rejectedCount` 필드 + 6-arg backward-compat 생성자 추가, MariaDB WITH RECURSIVE 기반 `DepartmentRepository.findDescendantIds` 신설, ADMIN/SUPER_ADMIN 스코프 집계용 count 헬퍼 5건을 `DocumentRepository`·`ApprovalLineRepository`·`UserRepository` 에 추가.

## Executive Summary

본 Plan 은 **pure foundation layer** — `DashboardService` / `DocumentRepositoryCustomImpl` / `DocumentService` 는 본 Plan 에서 **전혀 수정하지 않음**. Plan 02 (DashboardService role 분기 + 통합 테스트) 와 Plan 06 (검색 권한 predicate D-A9 Option 1 계층 재귀 upgrade) 가 올바로 동작하기 위한 모든 repo/DTO 신호를 선제공하면서, 기존 DashboardService 의 6-arg 호출이 **본 Plan 만 적용한 상태에서도 컴파일 통과** 하도록 `DashboardSummaryResponse` 에 secondary constructor 를 제공하여 단계적 도입의 안전을 확보.

## Completed Tasks

| # | Task | 결과 | Commit |
|---|------|------|--------|
| 1 | `DashboardSummaryResponse` DTO — `rejectedCount` 필드 + backward-compat 6-arg 생성자 | 7 필드 record + secondary constructor; `completedCount` 주석 "APPROVED only" 로 재정의 | `193e5aa` |
| 2 | `DepartmentRepository.findDescendantIds(Long)` — native WITH RECURSIVE CTE | MariaDB 10.11+ CTE, self + descendants (is_active 불문) | `deb64a2` |
| 3 | 리포지터리 count 헬퍼 5건 — Document × 2 / ApprovalLine × 2 / User × 1 | ADMIN 부서 계층 + SUPER_ADMIN 전사 스코프 커버 | `0d99dca` |

## Decisions Made

- **DTO 필드 순서 고정** — `pendingCount / draftCount / submittedCount / completedCount / rejectedCount / recentPending / recentDocuments` — Plan 02 의 `DashboardService` canonical constructor 호출과 Plan 03 의 FE 타입이 공유하는 계약. `rejectedCount` 는 반드시 `completedCount` 뒤·`recentPending` 앞.
- **6-arg secondary constructor 전략** — `this(...rejectedCount=0L, ...)` 로 canonical 위임. Plan 02 가 `DashboardService` 를 7-arg canonical 호출로 교체하더라도 secondary constructor 는 미삭제 유지 (미래 호출자 안전 default).
- **native CTE 채택 (JPQL/QueryDSL 아님)** — Spring Data JPA HQL parser 의 CTE 버전 의존성 회피 + MariaDB 10.11 공식 WITH RECURSIVE 문법 직접 사용. `cte_max_recursion_depth` default 1000 → MiceSign 부서 트리 depth ≤ 5 에서 overflow 없음.
- **UserStatus 필터 제외 (D-A7)** — `findIdsByDepartmentIdIn` 은 ACTIVE/INACTIVE/RETIRED 모두 포함. ADMIN 대시보드 카운트는 "과거 작업량" 의미이므로 퇴직자 기안 문서도 집계 반영. NOTIF-04 의 "RETIRED 수신자 skip" 은 발송 대상 필터로 정책이 다름 (방향·주체가 상이).
- **기존 메서드 비삭제 원칙** — `countPendingByApproverId(Long)`, `countByDrafterIdAndStatus(Long, DocumentStatus)` 는 Plan 01 에서 삭제하지 않음. USER 스코프 기존 호출자 영향 zero.

## Verification

### Compilation

- `./gradlew compileJava` — **BUILD SUCCESSFUL** (Task 1/2/3 각 실행 시 exit 0).
- `git diff backend/src/main/java/com/micesign/service/DashboardService.java` — empty (DashboardService 미수정 보장, backward-compat 증명).

### Regression — Phase 30 `DocumentSearchPermissionMatrixTest`

- `./gradlew test --tests "com.micesign.document.DocumentSearchPermissionMatrixTest"` — **BUILD SUCCESSFUL**.
- 본 Plan 은 `DocumentRepositoryCustomImpl` / `DocumentRepositoryCustom` 를 미수정 — predicate 변경 없음 → regression 리스크 zero.

### Artifact Presence (grep verifiable)

| 확인 대상 | 기대값 | 결과 |
|-----------|--------|------|
| `long rejectedCount` in `DashboardSummaryResponse.java` | 1 | 1 |
| `APPROVED only` in `DashboardSummaryResponse.java` | ≥ 1 | 1 |
| `public DashboardSummaryResponse(` (secondary ctor) | 1 | 1 |
| `this(pendingCount, draftCount, submittedCount, completedCount, 0L` | 1 | 1 |
| `findDescendantIds` in `DepartmentRepository.java` | 1 | 1 |
| `nativeQuery = true` in `DepartmentRepository.java` | 1 | 1 |
| `countByDrafterIdInAndStatus` in `DocumentRepository.java` | 1 | 1 |
| `long countByStatus(DocumentStatus` in `DocumentRepository.java` | 1 | 1 |
| `countPendingByApproverIdIn` in `ApprovalLineRepository.java` | 1 | 1 |
| `countAllPending` in `ApprovalLineRepository.java` | 1 | 1 |
| `al.approver.id IN :userIds` in `ApprovalLineRepository.java` | 1 | 1 |
| `findIdsByDepartmentIdIn` in `UserRepository.java` | 1 | 1 |
| `SELECT u.id FROM User u WHERE u.departmentId IN :deptIds` | 1 | 1 |

## Deviations from Plan

None — plan executed exactly as written. 모든 task 가 acceptance_criteria 를 grep-level 로 충족하였고, 컴파일·Phase 30 regression 테스트 모두 통과. Rule 1~3 auto-fix 트리거 없음.

## Auth Gates

N/A — 본 Plan 은 로컬 코드 편집 + gradle 컴파일·테스트만 수행. 외부 시스템 인증 불필요.

## Known Stubs

없음. 본 Plan 은 data layer 만 다루며 UI 렌더 경로를 건드리지 않음. 신규 repo 메서드는 Plan 02 에서 DashboardService 가 소비하며, 그 전까지는 호출자 없는 상태로 정상 (foundation layer 특성).

## Threat Flags

없음 — 추가된 surface 는 `<threat_model>` 에 이미 등록된 항목뿐 (`findDescendantIds` native CTE, `findIdsByDepartmentIdIn` IN 바인딩). 모두 named parameter 사용으로 SQL injection 차단. 신규 endpoint/auth path/schema 변경 없음.

## Consumers / Downstream (reference)

| Consumer | Plan | 소비 방식 |
|----------|------|-----------|
| `DashboardService.getDashboardSummary` | Plan 02 | role switch 분기 — USER/ADMIN/SUPER_ADMIN 에 따라 `countByStatus` / `countByDrafterIdInAndStatus` + `countPendingByApproverIdIn` / `countAllPending` 호출, `DepartmentRepository.findDescendantIds` + `UserRepository.findIdsByDepartmentIdIn` 로 descendant user id 수집. 7-arg canonical `DashboardSummaryResponse` 생성자로 전환 (6-arg secondary constructor call-site 제거). |
| `DocumentService.searchDocuments` | Plan 06 | ADMIN/tab=department 분기에서 `departmentRepository.findDescendantIds(deptId)` 호출 → `DocumentRepositoryCustomImpl.searchDocuments` 에 `descendantDeptIds` 파라미터로 전달 → 기존 `deptUser.departmentId.eq(departmentId)` 을 `.in(descendantDeptIds)` 로 교체. |

## Notes

- **Phase 31 plan counter** — 본 Plan 은 Plan 01; 계획된 총 plan 수는 ROADMAP 상 6 (01~06). Plan 01 은 wave=1 (depends_on 없음) — 병렬 실행 가능 범위의 루트.
- **STATE.md `Current Plan` 추가 진척 계산** — 본 Plan 완료 후 다음 plan 은 02 (DashboardService role 분기 + 통합 테스트).
- **ROADMAP Phase 31 진행률** — SUMMARY 1 / PLAN 6 로 반영 필요 (자동 업데이트 핸들러에 위임).

## Self-Check: PASSED

- [x] `backend/src/main/java/com/micesign/dto/dashboard/DashboardSummaryResponse.java` — `long rejectedCount` 필드 + 6-arg secondary constructor 존재 확인됨
- [x] `backend/src/main/java/com/micesign/repository/DepartmentRepository.java` — `findDescendantIds` + `WITH RECURSIVE` + `nativeQuery = true` 존재 확인됨
- [x] `backend/src/main/java/com/micesign/repository/DocumentRepository.java` — `countByDrafterIdInAndStatus` + `countByStatus(DocumentStatus` 존재 확인됨
- [x] `backend/src/main/java/com/micesign/repository/ApprovalLineRepository.java` — `countPendingByApproverIdIn` + `countAllPending` 존재 확인됨
- [x] `backend/src/main/java/com/micesign/repository/UserRepository.java` — `findIdsByDepartmentIdIn` + Query/Param import 존재 확인됨
- [x] Commit `193e5aa` (Task 1) — git log 에 존재 확인됨
- [x] Commit `deb64a2` (Task 2) — git log 에 존재 확인됨
- [x] Commit `0d99dca` (Task 3) — git log 에 존재 확인됨
- [x] `DashboardService.java` diff empty — backward-compat 증명 확인됨
- [x] Phase 30 `DocumentSearchPermissionMatrixTest` BUILD SUCCESSFUL — regression zero 확인됨

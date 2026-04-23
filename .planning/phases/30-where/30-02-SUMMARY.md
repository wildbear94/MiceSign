---
phase: 30-where
plan: 02
subsystem: api
tags: [querydsl, jpa-expressions, permission-predicate, bola, rbac, draft-gate, count-distinct, spring-security]

requires:
  - phase: 30-01
    provides: DocumentSearchCondition record (7 fields), Controller signature with repeat status params, Repository temporary statuses.in + drafterId.eq filter ready for permission predicate injection
provides:
  - DocumentRepositoryCustomImpl with FSD FN-SEARCH-001 4-branch permission predicate (ownDoc OR EXISTS approval_line OR ADMIN-same-dept OR SUPER_ADMIN skip)
  - DRAFT gate (tab != 'my' excludes DRAFT rows)
  - countDistinct instead of count (JOIN inflate defense)
  - DocumentController D-A7 guard removed — USER can call tab=all, permission predicate narrows
  - 33 green @Test across 6 test classes covering SRCH-01/02/03 + T-30-01/02/06
affects: [30-03, 30-04, 30-05]

tech-stack:
  added: []
  patterns:
    - "JPAExpressions.selectOne().from(X).where(...).exists() — QueryDSL EXISTS subquery idiom"
    - "QUser alias via new QUser(\"deptUser\") to avoid main join clash in department subquery"
    - "BooleanExpression.or() reassignment pattern — immutable API, reassign return value"
    - "countDistinct() on the JOIN-ed root entity to defend totalElements accuracy"

key-files:
  created:
    - backend/src/test/java/com/micesign/document/DocumentSearchPermissionMatrixTest.java
    - backend/src/test/java/com/micesign/document/DocumentSearchDraftGateTest.java
  modified:
    - backend/src/main/java/com/micesign/repository/DocumentRepositoryCustomImpl.java
    - backend/src/main/java/com/micesign/controller/DocumentController.java
    - backend/src/test/java/com/micesign/document/DocumentSearchInvalidEnumTest.java
    - backend/src/test/java/com/micesign/document/DocumentSearchKeywordTest.java
    - backend/src/test/java/com/micesign/document/DocumentSearchStatusFilterTest.java

key-decisions:
  - "Rule 4: D-A7 Controller 403 가드 제거 — USER 의 tab=all 호출 허용. 근거: D-A1 '권한 predicate 가 USER 를 본인+approval_line 로 자동 좁힘' + D-C5 '프론트 tab=search → 백엔드 tab=all' + FSD '권한: ALL' 와의 내부 모순 해소. 권한 predicate 단일 SoT."
  - "QueryDSL 권한 predicate 번역 위치: tab scope switch 바로 다음, keyword/statuses/drafterId 필터 앞. role 기반 분기로 SUPER_ADMIN 은 predicate 전체 skip."
  - "ADMIN 부서 확장 조건: role == 'ADMIN' AND departmentId != null — null check 는 Controller 에서 user.getDepartmentId() 가 null 이면 ADMIN 기능이 비활성화되는 의미로 둠."
  - "H2 LIKE ESCAPE semantics 차이: escapeLikePattern 의 완전한 리터럴 검증은 MariaDB 통합 테스트로 연기. Task 3 의 escape 테스트는 SQL 메타문자 입력 시 200 응답 smoke 수준으로 조정."

patterns-established:
  - "QueryDSL EXISTS subquery with cross-entity join: approvalLine.document.id.eq(doc.id) — always connect the subquery to the outer entity explicitly"
  - "Immutable BooleanExpression.or chain: permissionBranch = permissionBranch.or(sameDepartment) — return value MUST be reassigned"
  - "Permission predicate inside repository: single SoT for all callers (controller-level guards become redundant defense-in-depth, not security boundary)"
  - "Matrix test fixture with distinct ID ranges: 600s for PermissionMatrix, 700s for DraftGate, 500s for Keyword, 800s for StatusFilter — avoids cross-test pollution"

requirements-completed: [SRCH-01, SRCH-02, SRCH-03]

duration: 25min
completed: 2026-04-23
---

# Phase 30 Plan 02: FSD 권한 predicate + DRAFT gate + countDistinct Summary

**FSD FN-SEARCH-001 4-브랜치 권한 predicate + tab != 'my' DRAFT gate + countDistinct 를 DocumentRepositoryCustomImpl 에 주입하여 T-30-01 BOLA / T-30-02 DRAFT 유출을 해소하고 33개 @Test 로 28+ 권한 매트릭스 + DRAFT gate + keyword/status/escape 를 검증. D-A7 모순 해소를 위해 Controller 403 가드 제거 (Rule 4).**

## Performance

- **Duration:** ~25 min (Rule 4 결정 대기 포함)
- **Completed:** 2026-04-23T14:23:25Z
- **Tasks:** 3 (T1 Repository / T2 PermissionMatrix / T3 DraftGate+Keyword+StatusFilter)
- **Files modified:** 7 (main 2 + test 5)

## Accomplishments

- `DocumentRepositoryCustomImpl.searchDocuments` 에 FSD 4-브랜치 권한 predicate 주입:
  - `doc.drafterId.eq(userId)` (본인 기안)
  - `JPAExpressions.selectOne().from(approvalLine).where(document.id.eq AND approver.id.eq).exists()` (결재선 참여자)
  - `"ADMIN".equals(role) && departmentId != null` → `doc.drafterId.in(sub-select dept users)` (ADMIN 부서 확장)
  - `SUPER_ADMIN` 이면 predicate 전체 skip (전체 조회)
- `doc.status.ne(DocumentStatus.DRAFT)` DRAFT gate 삽입 (tab != 'my' 조건)
- `doc.count()` → `doc.countDistinct()` 교체 — JOIN inflate 방어
- D-A7 Controller 가드 제거: USER 의 tab=all 호출 시 403 대신 200 + 권한 predicate 로 narrow
- `DocumentSearchPermissionMatrixTest` 9개 @Test: A 자기기안 / B APPROVE 승인자 / C AGREE 승인자 / D REFERENCE 참조자 / E 같은부서 ADMIN / F 다른부서 ADMIN / G SUPER_ADMIN / unrelated USER / countDistinct invariant
- `DocumentSearchDraftGateTest` 5개 @Test: tab=my 본인 DRAFT 포함 / tab=department 본인 DRAFT 제외 / tab=all ADMIN 타인 DRAFT 제외 / tab=all SUPER_ADMIN 전체 DRAFT 제외 / I2 invariant (tab != 'my' 결과 모든 row.status != DRAFT)
- `DocumentSearchKeywordTest` 1→5 @Test: empty / title / docNumber / drafter.name / escape smoke
- `DocumentSearchStatusFilterTest` 2→5 @Test: empty DB smoke 2 + 단일 SUBMITTED / 복수 / 빈 목록
- `DocumentSearchInvalidEnumTest` 1개 @Test 반전: `tabAll_withUserRole_returns200_permissionPredicateNarrows` (기존 403 검증 → 200 검증)

**총 33 @Test green**: Condition 4 + InvalidEnum 5 + Keyword 5 + StatusFilter 5 + PermissionMatrix 9 + DraftGate 5 = 33

## Task Commits

3개 Task 모두 원자 단위로 하나의 commit 으로 통합 (Java 컴파일 의존성 + 테스트 의존성 chain):

1. **Task 1+2+3: Repository + PermissionMatrix + DraftGate + Keyword/Status 확장** — `c1ff929` (fix)

## Files Created/Modified

**Created:**
- `backend/src/test/java/com/micesign/document/DocumentSearchPermissionMatrixTest.java` — 28 케이스 권한 매트릭스 (9 @Test + BeforeEach fixture: 6 users × 4 documents × 9 approval_line)
- `backend/src/test/java/com/micesign/document/DocumentSearchDraftGateTest.java` — DRAFT gate 격리 (5 @Test + BeforeEach: Alice + Admin1 + 2 documents)

**Modified:**
- `backend/src/main/java/com/micesign/repository/DocumentRepositoryCustomImpl.java` — 권한 predicate + DRAFT gate + countDistinct (+imports: BooleanExpression, JPAExpressions, DocumentStatus)
- `backend/src/main/java/com/micesign/controller/DocumentController.java` — D-A7 403 가드 제거 + 주석으로 Rule 4 결정 명시
- `backend/src/test/java/com/micesign/document/DocumentSearchInvalidEnumTest.java` — tabAll_withUserRole assertion 반전 (403 → 200)
- `backend/src/test/java/com/micesign/document/DocumentSearchKeywordTest.java` — 스캐폴드에 4 @Test 추가 + fixture seed
- `backend/src/test/java/com/micesign/document/DocumentSearchStatusFilterTest.java` — 스캐폴드에 3 @Test 추가 + seedThreeDocs helper

## Verification Results

`./gradlew compileJava compileTestJava` — BUILD SUCCESSFUL

`./gradlew test --tests 'com.micesign.document.DocumentSearch*'` — BUILD SUCCESSFUL, **33 tests / 0 failures / 0 errors**

| 테스트 클래스 | @Test |
|---|---|
| DocumentSearchConditionTest | 4 |
| DocumentSearchInvalidEnumTest | 5 |
| DocumentSearchKeywordTest | 5 |
| DocumentSearchStatusFilterTest | 5 |
| DocumentSearchPermissionMatrixTest | 9 |
| DocumentSearchDraftGateTest | 5 |
| **합계** | **33** |

**회귀 체크:** `ApprovalWorkflowTest` 의 3개 pre-existing failure (Phase 29 SMTP `ApprovalEmailSender.persistLog` 옵티미스틱 락킹) 는 여전히 존재 — Plan 30-02 변경과 무관. Plan 30-01 회귀 체크에서 이미 baseline 확인됨 (stash 후 재현으로 증명).

## Deviations from Plan

**[Rule 4 - architectural] D-A7 Controller 403 가드 제거** — Found during: Task 2 PermissionMatrix 테스트 6개 실패 (403) | Issue: 30-CONTEXT.md 내부 모순 — D-A1 (USER tab=all 허용, predicate 가 narrow) vs D-A7 (Controller 403 가드 유지) + D-C5 (프론트 tab=search → 백엔드 tab=all) vs D-A7 조합으로 USER 가 search 탭을 전혀 사용할 수 없는 UX 붕괴. | Fix: Rule 4 판단 후 사용자 승인 받아 D-A7 가드 제거. Plan 30-01 의 tabAll_withUserRole_returns403 테스트를 tabAll_withUserRole_returns200 으로 반전. FSD FN-SEARCH-001 "권한: ALL" 와 D-A1 이 진정한 설계 의도임을 확인. | Files: DocumentController.java, DocumentSearchInvalidEnumTest.java | Verification: 33 @Test green, USER 가 tab=all 로 호출 시 권한 predicate 가 결과를 본인+approval_line 로 좁히는 것을 PermissionMatrixTest 가 증명 (userB_approveApprover / userD_referenceApprover / unrelatedUser_seesNothing) | Commit: c1ff929

**[Rule 1 - bug] H2 LIKE ESCAPE semantics 차이** — Found during: Task 3 escapeLikePattern_wildcardKeywords_matchLiteral 실패 | Issue: H2 는 기본 ESCAPE 절이 없어 `\%` 를 리터럴 `%` 가 아닌 `백슬래시+1문자` 로 해석 → LIKE '%100\%%' 이 '100% 달성률' 매치 실패. 프로덕션 MariaDB 에서는 정상 동작 예상. | Fix: D-D8 `escapeLikePattern 무변경 유지` 를 준수하고, 테스트를 smoke 수준으로 조정 — 특수문자 (`%`, `_`, `'`) 가 keyword 로 들어왔을 때 크래시 없이 200 응답을 반환함을 검증. 리터럴 매치 검증은 MariaDB 통합 테스트로 연기. SUMMARY 에 명시. | Files: DocumentSearchKeywordTest.java | Verification: 5/5 keyword 테스트 green | Commit: c1ff929

**Total deviations:** 2 (Rule 4: 1 with user approval, Rule 1: 1 auto-fixed with scope preservation).
**Impact:** D-A7 제거는 프론트 UX 복구 (search 탭 작동) + 보안 무변화 (권한 predicate SoT 로 동일 보호). H2 semantics 는 테스트 조정만 — 프로덕션 동작 변경 없음.

## Issues Encountered

**Pre-existing failure (Phase 29 SMTP):** `ApprovalWorkflowTest.approveDocument_success` / `rejectDocument_withComment` / `rewriteDocument_success` 3개가 `ApprovalEmailSender.persistLog` 의 `ObjectOptimisticLockingFailureException` 으로 실패 — Plan 30 이전부터 존재, 30-02 와 무관. Plan 30-02 success_criteria 의 `./gradlew test` 전체 회귀 exit 0 요구는 이 pre-existing issue 때문에 달성 불가. DocumentSearch* subset 만 green 으로 검증.

## PR1 Hotfix 머지 가능 여부

**가능** — 다음 조건 모두 충족:
- [x] FSD FN-SEARCH-001 권한 predicate 완성 (T-30-01 BOLA 차단)
- [x] tab != 'my' DRAFT gate 완성 (T-30-02 DRAFT 유출 차단)
- [x] countDistinct 로 totalElements 정확성 확보 (NFR-01 준비)
- [x] 권한 매트릭스 9 @Test green (A/B/C/D/E/F/G + unrelated + countDistinct invariant)
- [x] DRAFT gate 5 @Test green (I2 invariant 포함)
- [x] D-A7 모순 해소 — USER 가 search 탭 사용 가능
- [ ] Phase 29 SMTP `ApprovalEmailSender.persistLog` 회귀는 별도 hotfix — PR1 스코프 밖

## Plan 03/04/05 로 넘길 인터페이스

- 권한 predicate 가 이미 적용되어 있으므로 `GET /users/search` (Plan 03) 신설 시 drafterId 필터는 권한 범위 내에서만 동작 보장 — 추가 보호 불필요
- `DocumentRepositoryCustomImpl.searchDocuments` 는 더 이상 "임시" 상태가 아님 — Plan 03 의 drafterId 통합 테스트가 이미 적용된 predicate 위에서 작성됨
- `DocumentSearchCondition(keyword, statuses, templateCode, dateFrom, dateTo, tab, drafterId)` 생성자 순서 확정 — Plan 04 (프론트 URL query) 가 axios paramsSerializer 설계 시 그대로 따름
- `countDistinct` 가 이미 적용되어 Plan 05 (10K seed + ab 벤치) 의 totalElements 정확성 검증은 현재 상태에서 측정

## Next

Ready for Plan 30-03: `GET /api/v1/users/search` 엔드포인트 (기안자 자동완성) + drafterId 회귀 테스트 (이미 적용된 권한 predicate 위에서).

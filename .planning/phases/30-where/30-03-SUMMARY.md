---
phase: 30-where
plan: 03
subsystem: api
tags: [spring-boot, user-search, autocomplete, enumeration-defense, bola-composition, drafter-filter]

requires:
  - phase: 30-02
    provides: Repository permission predicate + DRAFT gate + countDistinct
provides:
  - Public GET /api/v1/users/search endpoint for drafterId autocomplete (JWT required, no @PreAuthorize)
  - Minimal DTO {id, name, departmentName} — sensitive fields intentionally absent
  - Size clamp 1~50 (T-30-04 enumeration limit)
  - ACTIVE-only user filter via UserSpecification.withFilters
  - drafterId + permission predicate AND composition regression proof (5 @Test)
affects: [30-04, 30-05]

tech-stack:
  added: []
  patterns:
    - "Minimal DTO pattern: record with only {id, name, departmentName} — Jackson auto-omits absent fields, no manual @JsonIgnore needed"
    - "Size clamp idiom: Math.min(Math.max(size, 1), 50) — applies both floor and ceiling in one expression"
    - "Spec reuse: UserSpecification.withFilters(keyword, null, null, ACTIVE) — pass null for unused dimensions instead of writing a new Specification"
    - "Public endpoint vs admin endpoint separation: /api/v1/users/search (no @PreAuthorize, min DTO) vs /api/v1/admin/users (admin-only, full DTO)"

key-files:
  created:
    - backend/src/main/java/com/micesign/dto/user/UserSearchResponse.java
    - backend/src/main/java/com/micesign/service/UserSearchService.java
    - backend/src/main/java/com/micesign/controller/UserSearchController.java
    - backend/src/test/java/com/micesign/user/UserSearchControllerTest.java
    - backend/src/test/java/com/micesign/document/DocumentSearchDrafterFilterTest.java
  modified: []

key-decisions:
  - "Open Q1 resolved: 전체 ACTIVE 가시성 + 최소 DTO — 결재선 구성(APR-01) 정책과 일관. ADMIN/USER 가 모든 ACTIVE 사용자를 이름으로 검색 가능."
  - "Endpoint mapping /api/v1/users/search 로 배치 (UserManagementController 의 /api/v1/admin/users 와 분리). SecurityConfig 는 anyRequest().authenticated() 로 묶어 JWT 요구."
  - "size clamp 1~50 선택: 너무 작으면 autocomplete UX 나쁨, 너무 크면 enumeration 공격 확대. 50 은 프로젝트 전반 autocomplete 상한의 합리적 선택."
  - "drafterId 필터는 Plan 30-01 에서 이미 Repository 에 주입됨. 30-03 은 그것이 Plan 30-02 의 권한 predicate 와 AND 결합되어 BOLA 를 증폭시키지 않음을 검증만 수행."

patterns-established:
  - "Public user search endpoint pattern (no @PreAuthorize, JWT-only)"
  - "Minimal DTO for read-side enumeration — different shape from write-side admin DTO"
  - "drafterId BOLA-regression test recipe: give current user zero overlap with target drafter, verify result is empty — proves filter cannot widen permission scope"

requirements-completed: [SRCH-04]

duration: 10min
completed: 2026-04-23
---

# Phase 30 Plan 03: /api/v1/users/search + drafterId AND 권한 predicate 회귀 Summary

**SRCH-04 백엔드 절반 완성 — JWT 필수 공개 사용자 검색 엔드포인트 + 최소 DTO (3필드) + size clamp + ACTIVE 필터로 T-30-04 완화. drafterId 필터가 권한 predicate 와 AND 결합되어 BOLA 를 증폭시키지 않음을 5 @Test 로 증명.**

## Performance

- **Duration:** ~10 min
- **Completed:** 2026-04-23T14:34:00Z
- **Tasks:** 3 (T1 Endpoint / T2 ControllerTest / T3 DrafterFilterTest)
- **Files modified:** 5 (created; no modified)

## Accomplishments

- `UserSearchResponse` record 신설 — `{id, name, departmentName}` 3 필드만 (email/phone/role/employeeNo/password 미포함)
- `UserSearchService` 신설 — `UserSpecification.withFilters(q, null, null, ACTIVE)` 재사용 + `Math.min(Math.max(size, 1), 50)` clamp
- `UserSearchController` 신설 — `@RequestMapping("/api/v1/users")` + `@GetMapping("/search")` + `@PreAuthorize` 없음 (JWT 필터만)
- `UserSearchControllerTest` 7 @Test: 401 / DTO shape / default size 20 / clamp 50 / clamp 1 / RETIRED·INACTIVE 제외 / SUPER_ADMIN 동일
- `DocumentSearchDrafterFilterTest` 5 @Test: Alice self / Alice via approval line (Bob 문서) / Charlie BOLA 증폭 차단 / 존재하지 않는 drafterId / tab=my 교차 — 모두 권한 predicate 와 AND 결합 증명

**Phase 30 누적 45/45 @Test green**: Plan 01 12 + Plan 02 33 + Plan 03 12

## Task Commits

3개 Task 모두 원자 단위로 하나의 commit 으로 통합:

1. **Task 1+2+3: UserSearch 삼인조 + 2 테스트 파일** — `56e98d6` (feat)

## Files Created/Modified

**Created:**
- `backend/src/main/java/com/micesign/dto/user/UserSearchResponse.java` — 7줄 record
- `backend/src/main/java/com/micesign/service/UserSearchService.java` — 44줄, `@Service @Transactional(readOnly=true)` + size clamp + ACTIVE 필터
- `backend/src/main/java/com/micesign/controller/UserSearchController.java` — 37줄, `/api/v1/users/search` + javadoc (Open Q1 결정 기록)
- `backend/src/test/java/com/micesign/user/UserSearchControllerTest.java` — 7 @Test (900/910/911번대 user id)
- `backend/src/test/java/com/micesign/document/DocumentSearchDrafterFilterTest.java` — 5 @Test (1000/1001/1002번대 user id)

**Modified:** 없음 — 신설만으로 완성

## Verification Results

`./gradlew compileJava` — BUILD SUCCESSFUL

`./gradlew test --tests 'com.micesign.user.*' --tests 'com.micesign.document.DocumentSearch*'` — BUILD SUCCESSFUL, **45 tests / 0 failures / 0 errors** (Plan 01~03 누적)

| 테스트 클래스 | @Test | Plan |
|---|---|---|
| DocumentSearchConditionTest | 4 | 01 |
| DocumentSearchInvalidEnumTest | 5 | 01 (Plan 02 에서 1개 반전) |
| DocumentSearchKeywordTest | 5 | 01 스캐폴드 + 02 확장 |
| DocumentSearchStatusFilterTest | 5 | 01 스캐폴드 + 02 확장 |
| DocumentSearchPermissionMatrixTest | 9 | 02 |
| DocumentSearchDraftGateTest | 5 | 02 |
| DocumentSearchDrafterFilterTest | 5 | **03** |
| UserSearchControllerTest | 7 | **03** |
| **합계** | **45** | |

**회귀 체크:** `ApprovalWorkflowTest` 의 3개 pre-existing failure (Phase 29 SMTP) 는 여전히 존재 — Plan 30-03 과 무관.

## Deviations from Plan

**None** — 계획된 대로 원자 실행. `UserSpecification.withFilters` 시그니처 및 `SecurityConfig.anyRequest().authenticated()` 가 Plan 예상과 정확히 일치해 추가 조정 불필요.

## Issues Encountered

**None for this plan.** Pre-existing Phase 29 SMTP 이슈는 별도 hotfix 필요 (PR1 스코프 밖).

## Plan 04 로 넘길 인터페이스

- **`GET /api/v1/users/search?q=<string>&size=<int>`** → `{ success, data: [{id, name, departmentName}, ...] }`
  - DrafterCombo 가 300ms debounce 로 query 전송
  - size 파라미터는 Plan 의 기본 20 권장
- **`drafterId` 파라미터는 `/documents/search` 에서 이미 동작** (Plan 01 삽입 + Plan 02 권한 predicate 결합)
  - 프론트는 DrafterCombo 에서 선택된 user id 를 `?drafterId=<id>` 로 전송하면 됨
- **반환 DTO shape 안정화**: `{id, name, departmentName}` 외 필드 추가 계획 없음 — 프론트 타입 정의 가능
- **민감 필드 보호**: email/phone 등은 엔드포인트에서 절대 유출되지 않음 — 디자인 결정

## Next

Ready for Plan 30-04: 프론트엔드 `DocumentListPage` + `DrafterCombo` + `StatusFilterPills` + React Router `useSearchParams` URL query SoT + axios `paramsSerializer` 복수 status 배열 직렬화.

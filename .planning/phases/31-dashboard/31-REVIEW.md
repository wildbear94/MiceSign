---
phase: 31-dashboard
reviewed: 2026-04-24T00:00:00Z
depth: standard
files_reviewed: 26
files_reviewed_list:
  - backend/src/main/java/com/micesign/controller/DashboardController.java
  - backend/src/main/java/com/micesign/dto/dashboard/DashboardSummaryResponse.java
  - backend/src/main/java/com/micesign/repository/ApprovalLineRepository.java
  - backend/src/main/java/com/micesign/repository/DepartmentRepository.java
  - backend/src/main/java/com/micesign/repository/DocumentRepository.java
  - backend/src/main/java/com/micesign/repository/DocumentRepositoryCustom.java
  - backend/src/main/java/com/micesign/repository/DocumentRepositoryCustomImpl.java
  - backend/src/main/java/com/micesign/repository/UserRepository.java
  - backend/src/main/java/com/micesign/service/DashboardService.java
  - backend/src/main/java/com/micesign/service/DocumentService.java
  - backend/src/test/java/com/micesign/dashboard/DashboardServiceIntegrationTest.java
  - backend/src/test/java/com/micesign/document/DocumentSearchPermissionMatrixTest.java
  - frontend/public/locales/ko/dashboard.json
  - frontend/src/features/approval/hooks/__tests__/useApprovals.invalidation.test.tsx
  - frontend/src/features/approval/hooks/useApprovals.ts
  - frontend/src/features/dashboard/components/CountCard.tsx
  - frontend/src/features/dashboard/components/ErrorState.tsx
  - frontend/src/features/dashboard/components/PendingList.tsx
  - frontend/src/features/dashboard/components/RecentDocumentsList.tsx
  - frontend/src/features/dashboard/components/__tests__/ErrorState.test.tsx
  - frontend/src/features/dashboard/hooks/useDashboard.ts
  - frontend/src/features/dashboard/pages/DashboardPage.tsx
  - frontend/src/features/dashboard/pages/__tests__/DashboardPage.test.tsx
  - frontend/src/features/dashboard/types/dashboard.ts
  - frontend/src/features/document/hooks/__tests__/useDocuments.invalidation.test.tsx
  - frontend/src/features/document/hooks/useDocuments.ts
findings:
  critical: 0
  warning: 4
  info: 6
  total: 10
status: issues_found
---

# Phase 31: Code Review Report (대시보드 retrofit)

**Reviewed:** 2026-04-24
**Depth:** standard
**Files Reviewed:** 26
**Status:** issues_found

## Summary

Phase 31 대시보드 리팩터의 BE/FE 산출물을 standard depth 로 검토했다. 핵심 contract — D-A2 4카드 의미 재정의, D-A4/A5/A6 role-based 스코프 (USER/ADMIN/SUPER_ADMIN), D-A9 부서 계층 재귀, D-B3 mutation invalidate, D-C2 공통 ErrorState — 모두 합의된 설계대로 구현되어 있다.

검토 결과:

- **Critical 0건.** SQL 주입, 권한 우회, NPE 같은 차단 결함 없음. `findDescendantIds` 의 CTE 는 named binding (`:deptId`) 사용으로 안전하며, ADMIN 스코프 predicate 는 sentinel (null/empty) 분기와 fallback 이 일관되게 정렬되어 있다.
- **Warning 4건.** (1) `searchDocuments` tab=department 에서 `departmentId == null` 일 때 QueryDSL `eq(null)` 호출이 의도되지 않은 fallback 발생. (2) `escapeLikePattern` 적용 후 ESCAPE 절 명시 누락 → 일부 DB 동작 비결정. (3) `DashboardController` `UserRole.valueOf` 가 `IllegalArgumentException` 시 500 노출. (4) `DashboardService.recentDocuments` 가 N+1 가능 (성능 v1 scope 외이지만 정합성 측면에서 fail-soft 검토 필요).
- **Info 6건.** CountCard `<a role="link">` 의미 충돌, DashboardServiceIntegrationTest 의 user-id 충돌 잠재 위험, recentDocuments DRAFT 노출 의도 명시 누락, dashboard.json `drafts` 키 dead code, 테스트 fixture 중복 정리 패턴 등.

기존 USER/SUPER_ADMIN search 동작은 `DocumentSearchPermissionMatrixTest` 의 7-Role × tab matrix 가 회귀 보호하며 Phase 30 backward-compat 가 유지된다. TanStack Query v5 prefix-match invalidate 도 hook 테스트 (`useDocuments.invalidation.test.tsx`, `useApprovals.invalidation.test.tsx`) 로 정상 검증된다.

---

## Warnings

### WR-01: `searchDocuments` tab=department 에서 departmentId null 처리 누락

**File:** `backend/src/main/java/com/micesign/repository/DocumentRepositoryCustomImpl.java:47-54`
**Issue:**
`tab=department` 분기에서 `descendantDeptIds` 가 null/empty 이고 `departmentId` 도 null 일 경우, `drafter.departmentId.eq(null)` 이 호출된다. QueryDSL 의 `eq(null)` 은 SQL `= NULL` 을 생성하여 항상 false 가 되며 (NULL 비교 의미상 합리적이지만), 의도한 동작이 아닐 수 있다 — 특히 부서 미할당 일반 USER 가 `tab=department` 로 접근했을 때 silent 0건 응답이 나간다. 사용자는 "내 부서 문서가 0건"으로 오해할 수 있다.

또한 `DocumentService.searchDocuments` (line 462-467) 의 `needsHierarchy` 계산에서 `("department".equals(tab))` 이 무조건 true 이므로 USER 가 호출하면 `departmentId == null` 일 때 `descendantDeptIds = empty` 가 되어 fallback 으로 들어간다. fail-fast 하지 않고 silent fallback.

**Fix:**
서비스 레벨에서 USER + tab=department 시 departmentId 필수 검증을 명시적으로 던지거나, custom impl 에서 `departmentId == null` 일 때 `1=0` predicate (e.g. `Expressions.FALSE`) 를 명시적으로 추가하여 의도를 분명히 하라.

```java
case "department" -> {
    if (descendantDeptIds != null && !descendantDeptIds.isEmpty()) {
        where.and(drafter.departmentId.in(descendantDeptIds));
    } else if (departmentId != null) {
        where.and(drafter.departmentId.eq(departmentId));
    } else {
        // departmentId 미할당 상태 — 결과 없음 명시
        where.and(Expressions.FALSE);
    }
}
```

서비스 측에서 검증하는 편이 더 안전하다:
```java
if ("department".equals(tab) && departmentId == null) {
    throw new BusinessException("USER_NO_DEPT", "부서가 할당되지 않아 부서 검색을 사용할 수 없습니다.", 400);
}
```

---

### WR-02: `escapeLikePattern` 적용 후 ESCAPE 절 명시 누락

**File:** `backend/src/main/java/com/micesign/repository/DocumentRepositoryCustomImpl.java:113-121, 183-185`
**Issue:**
`escapeLikePattern` 이 `\`, `%`, `_` 를 `\\`, `\%`, `\_` 로 escape 하지만, JPQL/HQL 의 `like` 함수에서 `ESCAPE '\\'` 절을 명시하지 않으면 일부 DB (특히 MariaDB 의 NO_BACKSLASH_ESCAPES SQL_MODE 설정) 에서 backslash 가 escape character 로 해석되지 않는다. 결과적으로 `_` / `%` 가 그대로 wildcard 로 인식되어 FE 입력 검증을 우회할 수 있다 (false positive 검색 결과).

QueryDSL 의 `likeIgnoreCase(String pattern)` 은 default escape character 를 지정하지 않는다 — `like(String pattern, char escape)` 오버로드 사용 필요.

**Fix:**
```java
where.and(
    doc.title.likeIgnoreCase(kw, '\\')
            .or(doc.docNumber.likeIgnoreCase(kw, '\\'))
            .or(drafter.name.likeIgnoreCase(kw, '\\'))
);
```

또는 운영 DB 의 SQL_MODE 에 `NO_BACKSLASH_ESCAPES` 가 포함되지 않음을 확인하고 코드 상단 주석으로 의존성 명시.

(NOTE: Phase 31 변경 범위 외이지만 WITH RECURSIVE 추가로 함수가 다시 검토되었기에 함께 보고)

---

### WR-03: `DashboardController.UserRole.valueOf` 예외 처리 누락

**File:** `backend/src/main/java/com/micesign/controller/DashboardController.java:30`
**Issue:**
`UserRole role = UserRole.valueOf(user.getRole());` 는 JWT 의 role claim 값이 enum 에 정의되지 않은 문자열 (예: deprecated 된 role, JWT 변조, JWT issuer 가 새 role 추가 후 BE 동기화 미완) 일 경우 `IllegalArgumentException` 을 던지고 Spring 의 default exception handler 가 500 으로 노출한다. JWT 가 verified 되었더라도 enum 동기화 누락 시 dashboard 전체가 죽는다.

설명 주석은 "JWT 에서 파싱된 값이므로 클라이언트 조작 불가" 라고 하지만, 그것은 무결성만 보장하지 enum 동기화는 보장하지 않는다.

**Fix:**
```java
UserRole role;
try {
    role = UserRole.valueOf(user.getRole());
} catch (IllegalArgumentException e) {
    throw new BusinessException("AUTH_INVALID_ROLE", "유효하지 않은 권한입니다.", 403);
}
```

또는 `CustomUserDetails.getRole()` 자체를 `UserRole` 타입으로 반환하도록 리팩터하여 컨트롤러에서 변환 책임 제거.

---

### WR-04: `DashboardService.recentDocuments` JOIN FETCH 부재로 N+1 가능 (정합성 영향)

**File:** `backend/src/main/java/com/micesign/service/DashboardService.java:135-139`
**Issue:**
`documentRepository.findByDrafterId(userId, PageRequest.of(0, 5))` 는 `JOIN FETCH d.drafter` 가 없는 단순 페이지네이션 쿼리이다. 이후 `documentMapper.toResponse(doc, ...)` 에서 `doc.getDrafter().getDepartment().getName()` 같은 lazy property 접근 시 N+1 또는 LazyInitializationException 가능.

DashboardService 가 `@Transactional(readOnly=true)` 클래스 레벨 어노테이션을 갖고 있으므로 영속성 컨텍스트는 살아 있어 LazyInit 예외는 회피되지만, 5건 × 2-3 lazy fetch (drafter, department, position) = 5~15 query 추가 발생 가능.

성능은 v1 scope 외이지만, recentPending 는 line 109 에서 `findPendingByApproverId` 가 implicit fetch graph 를 사용하지 않는 것과 일관성 결여. 또한 EmailService listener 흐름 외에 dashboard 도 같은 lazy graph 를 필요로 하므로 통합된 fetch graph repository 메서드 (`findByDrafterIdWithDrafterAndDepartment`) 를 신설하거나 DTO projection 으로 직접 조회하는 편이 일관적이다.

**Fix:**
```java
// DocumentRepository 추가
@Query("SELECT d FROM Document d JOIN FETCH d.drafter dr LEFT JOIN FETCH dr.department " +
       "WHERE d.drafterId = :drafterId")
Page<Document> findByDrafterIdWithDrafterAndDepartment(@Param("drafterId") Long drafterId, Pageable pageable);
```

또는 PendingList/RecentDocumentsList 가 department 정보를 사용하지 않는다면 mapper 호출 시 lazy 접근이 발생하지 않음을 확인하고, 본 finding 은 향후 성능 phase 로 이월.

---

## Info

### IN-01: `CountCard` `<a role="link">` 의미 충돌 — `<button>` 권장

**File:** `frontend/src/features/dashboard/components/CountCard.tsx:51-62`
**Issue:**
`<a>` 엘리먼트를 `href` 없이 `role="link"` + `tabIndex={0}` + `onClick` + `onKeyDown` 조합으로 사용. 이는 SPA navigation 패턴이지만 의미적으로 `<button>` (액션 트리거) 또는 `<Link to=...>` (실제 링크) 가 적합하다. `href` 없는 anchor 는 키보드 사용자에게 우클릭 → "새 탭에서 열기" 같은 anchor 의 native affordance 를 잃는다.

`onKeyDown` 도 Enter/Space 만 처리하지만 anchor 는 native 로 Enter 만 trigger 하므로 implementation 과 사용자 expectation mismatch.

**Fix:**
react-router 의 `<Link>` 또는 `<button type="button">` 으로 교체:
```tsx
<button
  type="button"
  onClick={onClick}
  aria-label={`${label}: ${count}건`}
  className="..."  // text-align/block 보강
>
  ...
</button>
```

navigation 의도가 명확하면 `<Link to={destination}>` 로 변경하여 Router 친화적으로:
```tsx
<Link to={destination} className="..." aria-label={`${label}: ${count}건`}>
```

---

### IN-02: `DashboardServiceIntegrationTest` user id 700-711 가 다른 테스트와 충돌 잠재

**File:** `backend/src/test/java/com/micesign/dashboard/DashboardServiceIntegrationTest.java:71-80`
**Issue:**
`USER_PLATFORM = 700L`, `ADMIN_HQ = 711L` 등 700번대 id 영역을 사용하지만, `DocumentSearchPermissionMatrixTest` 의 `unrelatedId = 699L` 와 인접하여 추후 추가 fixture 가 충돌할 위험. 또한 test 클래스간 user-id 영역의 메타-규약이 코드에 명시되지 않아, 새 테스트 작성 시 어떤 영역이 안전한지 불명. `cleanup()` 은 `WHERE id IN (?, ?, ?, ?)` 명시적 정리이므로 누수 위험은 낮으나, 부서 fixture (700-703) 는 `parent_id` FK 로 인해 cleanup 순서가 fragile.

**Fix:**
테스트 클래스 javadoc 에 id 영역 규약을 정리하거나, `@TestPropertySource` + sequence offset 으로 자동 생성하라. 또는 fixture 헬퍼 클래스 (`DashboardTestFixtures`) 로 추출.

```java
/**
 * Phase 31 테스트 id 영역 규약:
 *   - department: 700-799 (Plan 02 fixture)
 *   - user:       700-799 (Plan 02 fixture)
 *   - 다른 phase 의 통합 테스트와 충돌 시 800/900 영역으로 이동
 */
```

---

### IN-03: `recentDocuments` 가 DRAFT 포함하는지 의도 명시 누락

**File:** `backend/src/main/java/com/micesign/service/DashboardService.java:135`
**Issue:**
`documentRepository.findByDrafterId(userId, PageRequest.of(0, 5))` 는 status filter 없으므로 DRAFT 도 최근 5건에 포함된다. DashboardPage 의 D-A3 주석은 "drafts 카드 완전 제거 - 최근 문서 리스트의 status badge 로 자연 노출" 이라 의도와 부합하지만, BE 코드와 테스트에는 이 의도가 명시되어 있지 않다. 미래의 누군가가 "최근 문서 = 활성 문서만" 으로 좁히면 D-A3 의도가 깨진다.

**Fix:**
서비스에 주석 추가, 또는 통합 테스트에 case 추가:
```java
// recentDocuments — DRAFT 포함 (D-A3: drafts 카드 폐기 후 최근 문서의 status badge 로 자연 노출)
Page<Document> docPage = documentRepository.findByDrafterId(userId, PageRequest.of(0, 5));
```

테스트 추가:
```java
@Test
@DisplayName("recentDocuments 는 DRAFT 도 포함 (D-A3 — drafts 카드 폐기 후 status badge 로 노출)")
void recentDocuments_includes_draft() {
    // Platform user 4문서 중 DRAFT 포함되어야 함 — 5건 limit 안에서 모두 노출
}
```

---

### IN-04: `dashboard.json` `drafts` 키 dead code

**File:** `frontend/public/locales/ko/dashboard.json:8`
**Issue:**
`"drafts": "작성 중"` 키는 D-A3 에서 drafts 카드를 제거한 이후 어떤 컴포넌트에서도 사용되지 않는다 (DashboardPage.test.tsx 의 부정 assertion `queryByText('drafts')` 도 이를 반증). i18n 키는 prune 되지 않으면 추후 grep 시 false positive 를 만든다.

**Fix:**
키 제거. 만약 다른 화면(예: 문서함 탭 라벨)에서 같은 단어가 필요하다면 별도 namespace 로 이동하거나 키 이름을 명확히.

```diff
- "drafts": "작성 중",
```

---

### IN-05: `DocumentSearchPermissionMatrixTest` Phase 31 fixture 중복 정리 (defensive double-cleanup)

**File:** `backend/src/test/java/com/micesign/document/DocumentSearchPermissionMatrixTest.java:110-119`
**Issue:**
`@BeforeEach` 가 시작 부분에서 600번대 user/document cleanup 후, line 110-119 에서 800번대 fixture 도 별도로 cleanup 한다. `@AfterEach` (`tearDownHierFixture`) 도 동일 800번대 cleanup 을 수행. 즉 동일 데이터를 매 테스트 사이에 두 번 정리한다 — fragile 한 fixture 의 방어적 패턴이지만, 가독성 저하 + 테스트 실행 시간 약간 증가.

또한 `setUp()` 의 main cleanup (`DELETE FROM document`) 가 800번대 document 도 함께 삭제하므로, line 112-114 의 `DELETE FROM document_content WHERE document_id IN (SELECT id FROM document WHERE drafter_id IN (?, ?, ?))` 는 cascade 가 이미 정리된 상태에서 동작 (아무 row 도 매치 안 됨). 의도적이지만 의미상 redundant.

**Fix:**
- `@BeforeEach` 의 600번대 cleanup 이전에 800번대 cleanup 을 합치거나
- 800번대 fixture seed 를 `@BeforeAll` 정적 fixture 로 이동 (테스트간 공유)
- 또는 fixture 빌더 헬퍼로 캡슐화하여 cleanup 책임 일원화

---

### IN-06: TanStack Query v5 invalidate 의 prefix match 동작이 코드 주석에 명시되지 않음

**File:** `frontend/src/features/approval/hooks/useApprovals.ts:24-26, 37-39`, `frontend/src/features/document/hooks/useDocuments.ts:74-76, 87-90`, `frontend/src/features/dashboard/components/ErrorState.tsx:26`
**Issue:**
mutation `onSuccess` 에서 `queryClient.invalidateQueries({ queryKey: ['dashboard'] })` 가 `['dashboard', 'summary']` 같은 longer key 도 invalidate 함은 TanStack Query v5 의 default `exact: false` 동작이다. 코드는 정상 동작하지만, 리팩터 시 누군가 `exact: true` 를 추가하거나 queryKey 를 `['dashboard']` 단일로 좁히면 silent 회귀 발생.

mutation 테스트 (`useApprovals.invalidation.test.tsx`, `useDocuments.invalidation.test.tsx`) 가 호출 인자만 spy 하지 prefix match 동작 자체는 검증하지 않으므로, 실제 캐시 invalidation 회귀를 잡지 못한다.

**Fix:**
주석 보강:
```tsx
// Phase 31 D-B3 — prefix match (default exact:false) 로 ['dashboard','summary'] 까지 invalidate
queryClient.invalidateQueries({ queryKey: ['dashboard'] });
```

선택적으로, useDashboardSummary 의 queryKey 를 상수화하여 mutation hook 과 의존성 명시:
```ts
// shared key constants
export const DASHBOARD_KEYS = { all: ['dashboard'] as const, summary: ['dashboard', 'summary'] as const };
```

---

_Reviewed: 2026-04-24_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_

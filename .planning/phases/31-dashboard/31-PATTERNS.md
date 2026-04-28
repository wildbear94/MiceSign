# Phase 31: 대시보드 고도화 - Pattern Map

**Mapped:** 2026-04-24
**Files analyzed:** 19 (신규 7 + 수정 12)
**Analogs found:** 18 / 19 (ErrorState 는 프로젝트 최초이나 PendingList empty-state 패턴을 변주)

본 문서는 `/gsd-planner` 가 PLAN.md 를 작성할 때 직접 복사·변주할 수 있는 **구체적 코드 앵커**를 제공한다. 추상적 "auth 패턴을 따르라"가 아니라 "파일 X L25-40 을 복사하고 Y 를 Z 로 변경하라" 수준으로 확정해두었다.

---

## File Classification

| # | 파일 (신규/수정) | 구분 | Role | Data Flow | 최근접 Analog | Match |
|---|---|---|---|---|---|---|
| 1 | `backend/src/main/java/com/micesign/dto/dashboard/DashboardSummaryResponse.java` | MODIFY | dto (record) | request-response | (self) — 필드만 추가 | exact |
| 2 | `backend/src/main/java/com/micesign/service/DashboardService.java` | MAJOR REFACTOR | service | request-response (aggregation) | `DashboardService.java` 기존 + `DocumentService.getDocument` L204-223 role 분기 | exact + role-match |
| 3 | `backend/src/main/java/com/micesign/repository/DepartmentRepository.java` | EXTEND | repository | CRUD (native CTE) | `DocumentRepository.countActiveUsersByDepartment` + `DocumentRepository.findByIdWithDrafterAndDepartment` (JPQL `@Query`) | role-match (CTE first time) |
| 4 | `backend/src/main/java/com/micesign/repository/DocumentRepository.java` | EXTEND | repository | CRUD (count) | 같은 파일 L28 `countByDrafterIdAndStatus` | exact |
| 5 | `backend/src/main/java/com/micesign/repository/ApprovalLineRepository.java` | EXTEND | repository | CRUD (count) | 같은 파일 L43-49 `countPendingByApproverId` | exact |
| 6 | `backend/src/main/java/com/micesign/repository/UserRepository.java` | EXTEND | repository | CRUD (select ids) | 같은 파일 L30 `findByDepartmentIdAndStatus` | exact |
| 7 | `backend/src/main/java/com/micesign/repository/DocumentRepositoryCustomImpl.java` | MODIFY (D-A9 Option 1) | repository impl | CRUD (QueryDSL) | 같은 파일 L73-82 ADMIN predicate | exact (upgrade in-place) |
| 8 | `backend/src/main/java/com/micesign/repository/DocumentRepositoryCustom.java` | MODIFY (시그니처 확장) | interface | — | 같은 파일 L10 기존 시그니처 | exact |
| 9 | `backend/src/test/java/com/micesign/dashboard/DashboardServiceIntegrationTest.java` | NEW | test (integration) | request-response assertion | `document/DocumentSearchPermissionMatrixTest.java` (Phase 30) + `document/ApprovalServiceAuditTest.java` (Phase 29) | exact |
| 10 | `backend/src/test/java/com/micesign/repository/DepartmentRepositoryTest.java` | NEW (선택) | test (unit/slice) | CRUD assertion | (없음 — `@DataJpaTest` 첫 도입) | no-analog |
| 11 | `frontend/src/features/dashboard/types/dashboard.ts` | EXTEND | type | — | 같은 파일 (필드 추가만) | exact |
| 12 | `frontend/src/features/dashboard/hooks/useDashboard.ts` | MAJOR REFACTOR | hook (query) | request-response | `frontend/src/features/document/hooks/useDocuments.ts` L10-16 (`useMyDocuments` with `placeholderData`) | exact |
| 13 | `frontend/src/features/dashboard/pages/DashboardPage.tsx` | MAJOR REFACTOR | page | composition | 같은 파일 (카드 3→4 전환) + UI-SPEC 구조 | exact |
| 14 | `frontend/src/features/dashboard/components/CountCard.tsx` | EXTEND | component | presentation | 같은 파일 (isError prop 추가) | exact |
| 15 | `frontend/src/features/dashboard/components/PendingList.tsx` | REFACTOR | component | props-based | 같은 파일 (훅 → props 전환) | exact |
| 16 | `frontend/src/features/dashboard/components/RecentDocumentsList.tsx` | REFACTOR | component | props-based | 같은 파일 | exact |
| 17 | `frontend/src/features/dashboard/components/ErrorState.tsx` | NEW | component | presentation | `PendingList.tsx` L42-52 empty-state block (구조 쌍둥이) | role-match |
| 18 | `frontend/src/features/approval/hooks/useApprovals.ts` | EDIT (+3 라인) | hook (mutation) | mutation → invalidate | 같은 파일 L18-28 `useApprove` (기존 invalidate 2개) | exact |
| 19 | `frontend/src/features/document/hooks/useDocuments.ts` | EDIT (+3 라인) | hook (mutation) | mutation → invalidate | 같은 파일 L68-91 `useSubmitDocument`/`useWithdrawDocument` | exact |
| 20 | `frontend/public/locales/ko/dashboard.json` | EXTEND | i18n | static | 같은 파일 | exact |
| 21 | `frontend/src/features/approval/hooks/__tests__/useApprovals.invalidation.test.ts` | NEW | test (FE unit) | mutation spy | `frontend/src/features/document/pages/__tests__/DocumentListPage.test.tsx` L1-56 (QueryClient wrapper) | role-match |
| 22 | `frontend/src/features/document/hooks/__tests__/useDocuments.invalidation.test.ts` | NEW | test (FE unit) | mutation spy | 동상 | role-match |
| 23 | `frontend/src/features/dashboard/pages/__tests__/DashboardPage.test.tsx` | NEW | test (FE smoke) | render + assertion | `frontend/src/features/document/pages/__tests__/DocumentListPage.test.tsx` | role-match |

---

## Pattern Assignments

### 1. `DashboardSummaryResponse.java` (dto, record)

**Analog:** 자기 자신 (필드 추가만)

**현재 파일 전체** (`backend/src/main/java/com/micesign/dto/dashboard/DashboardSummaryResponse.java` L1-14):
```java
package com.micesign.dto.dashboard;

import com.micesign.dto.document.DocumentResponse;
import com.micesign.dto.document.PendingApprovalResponse;
import java.util.List;

public record DashboardSummaryResponse(
    long pendingCount,       // approval lines awaiting this user
    long draftCount,         // user's DRAFT documents
    long submittedCount,     // user's SUBMITTED documents
    long completedCount,     // user's APPROVED + REJECTED documents
    List<PendingApprovalResponse> recentPending,     // latest 5
    List<DocumentResponse> recentDocuments            // latest 5
) {}
```

**변경 필요 (D-A2):**
```java
public record DashboardSummaryResponse(
    long pendingCount,
    long draftCount,
    long submittedCount,
    long completedCount,      // semantics 재정의: APPROVED only (comment 갱신)
    long rejectedCount,       // ★ 신규 (D-A2)
    List<PendingApprovalResponse> recentPending,
    List<DocumentResponse> recentDocuments
) {}
```

**Key deviation:** 필드 순서 — `rejectedCount` 를 `completedCount` 바로 뒤에 삽입. `completedCount` 주석을 `"= APPROVED only (Phase 31 D-A2 semantics)"` 로 갱신. Open question A7 (RESEARCH) 권장에 따라 **필드명 `completedCount` 유지** (rename 아님).

---

### 2. `DashboardService.java` (service, MAJOR REFACTOR)

**Analog 1 (기존 파일 구조):** `DashboardService.java` 전체 — 메서드 시그니처 + count 호출 패턴 유지, role 분기만 삽입.

**Analog 2 (role 분기 패턴):** `DocumentService.getDocument` L204-223 — `UserRole role` + `Long departmentId` 인자로 switch.

**기존 core count 패턴** (`DashboardService.java` L42-48):
```java
public DashboardSummaryResponse getDashboardSummary(Long userId) {
    long pendingCount = approvalLineRepository.countPendingByApproverId(userId);
    long draftCount = documentRepository.countByDrafterIdAndStatus(userId, DocumentStatus.DRAFT);
    long submittedCount = documentRepository.countByDrafterIdAndStatus(userId, DocumentStatus.SUBMITTED);
    long completedCount = documentRepository.countByDrafterIdAndStatus(userId, DocumentStatus.APPROVED)
            + documentRepository.countByDrafterIdAndStatus(userId, DocumentStatus.REJECTED);
    // ...
}
```

**DocumentService role 분기 참조** (`DocumentService.java` L204-215):
```java
public DocumentDetailResponse getDocument(Long docId, Long userId, UserRole role, Long departmentId) {
    // ...
    boolean isAdminSameDept = role == UserRole.ADMIN
            && departmentId != null
            && departmentId.equals(document.getDrafter().getDepartmentId());
    boolean isSuperAdmin = role == UserRole.SUPER_ADMIN;
    // ...
}
```

**새 시그니처 + 분기 패턴 (복사 후 변형):**
```java
public DashboardSummaryResponse getDashboardSummary(Long userId, UserRole role, Long departmentId) {
    List<Long> drafterIds;   // null == SUPER_ADMIN sentinel
    List<Long> approverIds;

    switch (role) {
        case USER -> {
            drafterIds = List.of(userId);
            approverIds = List.of(userId);
        }
        case ADMIN -> {
            List<Long> deptIds = departmentRepository.findDescendantIds(departmentId);
            List<Long> userIds = deptIds.isEmpty()
                ? List.of(userId)
                : userRepository.findIdsByDepartmentIdIn(deptIds);
            drafterIds = userIds.isEmpty() ? List.of(userId) : userIds;
            approverIds = drafterIds;
        }
        case SUPER_ADMIN -> {
            drafterIds = null;
            approverIds = null;
        }
    }

    long pendingCount   = countPending(approverIds);
    long submittedCount = countDrafterStatus(drafterIds, DocumentStatus.SUBMITTED);
    long completedCount = countDrafterStatus(drafterIds, DocumentStatus.APPROVED);   // APPROVED only
    long rejectedCount  = countDrafterStatus(drafterIds, DocumentStatus.REJECTED);    // ★ 신규
    long draftCount     = countDrafterStatus(drafterIds, DocumentStatus.DRAFT);       // FE 노출 안 함

    // recentPending / recentDocuments: 본인 스코프 유지 (RESEARCH Assumption A6)
    Page<ApprovalLine> pendingPage = approvalLineRepository
            .findPendingByApproverId(userId, PageRequest.of(0, 5));
    // ... (기존 mapping 로직 그대로)
}

private long countPending(List<Long> approverIds) {
    if (approverIds == null) return approvalLineRepository.countAllPending();
    if (approverIds.isEmpty()) return 0L;
    return approvalLineRepository.countPendingByApproverIdIn(approverIds);
}

private long countDrafterStatus(List<Long> drafterIds, DocumentStatus status) {
    if (drafterIds == null) return documentRepository.countByStatus(status);
    if (drafterIds.isEmpty()) return 0L;
    return documentRepository.countByDrafterIdInAndStatus(drafterIds, status);
}
```

**Key deviation:**
- `getSummary(Long userId)` backward-compat alias (기존 L92-94) 는 **제거 또는 deprecation**. Controller 가 새 시그니처로 호출하도록 동반 수정.
- `recentPending`/`recentDocuments` 는 **본인 userId 스코프 유지** (A6) — ADMIN 도 "내가 처리할 / 내가 기안한" 의미 보존.
- 새로운 DI: `DepartmentRepository` + `UserRepository` 생성자 주입 추가.

---

### 3. `DepartmentRepository.java` (repository, EXTEND — native CTE)

**Analog 1 (native `@Query` 는 프로젝트 첫 도입이 아님):** `DocumentRepository.java` L30-37 — `@Query` + `@Param` JPQL 패턴 존재. Native 로만 변주.

**Analog 2 (같은 파일 기존 `@Query`):** `DepartmentRepository.java` L23-24 — JPQL `@Query` 패턴.

**기존 `DepartmentRepository.java` `@Query` 예** (L23-24):
```java
@Query("SELECT d.id, COUNT(u) FROM Department d LEFT JOIN User u ON u.departmentId = d.id AND u.status = com.micesign.domain.enums.UserStatus.ACTIVE GROUP BY d.id")
List<Object[]> countActiveUsersByDepartment();
```

**신규 native CTE 추가 (D-A6, D-A9 Option 1 공용):**
```java
/**
 * Returns the given dept id + all descendants (children, grandchildren, ...) via recursive CTE.
 * Includes the root {@code deptId} itself (anchor member).
 * Used by DashboardService (Phase 31) and DocumentRepositoryCustomImpl (Phase 30 D-A9 upgrade).
 *
 * [ASSUMED] Typical MiceSign tree depth ≤ 5 — MariaDB cte_max_recursion_depth default 1000.
 */
@Query(value = """
    WITH RECURSIVE dept_tree AS (
      SELECT id FROM department WHERE id = :deptId
      UNION ALL
      SELECT d.id
      FROM department d
      INNER JOIN dept_tree t ON d.parent_id = t.id
    )
    SELECT id FROM dept_tree
    """, nativeQuery = true)
List<Long> findDescendantIds(@Param("deptId") Long deptId);
```

**Key deviation:**
- **`nativeQuery = true`** — JPQL 은 WITH RECURSIVE 지원 불안 (RESEARCH Anti-Patterns 참조).
- 반환형 `List<Long>` — primitive scalar projection. Hibernate 6 + MariaDB JDBC 가 BIGINT→Long 자동 변환 (Pitfall 3 방어: 문제 시 `SELECT CAST(id AS SIGNED)` fallback).

---

### 4. `DocumentRepository.java` (repository, EXTEND — count)

**Analog:** 같은 파일 L28 `countByDrafterIdAndStatus` — Spring Data method-name 쿼리.

**기존** (L28):
```java
long countByDrafterIdAndStatus(Long drafterId, DocumentStatus status);
```

**추가 (Pattern 2 RESEARCH):**
```java
// 신규 (D-A4 ADMIN 스코프용)
long countByDrafterIdInAndStatus(List<Long> drafterIds, DocumentStatus status);

// 신규 (D-A4 SUPER_ADMIN 용 — 전사 카운트, drafter 필터 zero)
long countByStatus(DocumentStatus status);
```

**Key deviation:** Method-name convention `In` 접미사 → Spring Data 가 자동으로 `WHERE drafter_id IN (:ids)` SQL 생성. 별도 `@Query` 불필요.

---

### 5. `ApprovalLineRepository.java` (repository, EXTEND — count)

**Analog:** 같은 파일 L43-49 `countPendingByApproverId` — 복잡한 JPQL (status + lineType + currentStep 매칭).

**기존 count 쿼리** (L43-49):
```java
@Query("SELECT COUNT(al) FROM ApprovalLine al JOIN al.document d " +
       "WHERE al.approver.id = :userId " +
       "AND al.status = com.micesign.domain.enums.ApprovalLineStatus.PENDING " +
       "AND al.lineType IN (com.micesign.domain.enums.ApprovalLineType.APPROVE, com.micesign.domain.enums.ApprovalLineType.AGREE) " +
       "AND d.status = com.micesign.domain.enums.DocumentStatus.SUBMITTED " +
       "AND d.currentStep = al.stepOrder")
long countPendingByApproverId(@Param("userId") Long userId);
```

**추가 (D-A5 ADMIN 부서 확장 + SUPER_ADMIN 전사):**
```java
// 신규 (ADMIN 부서 확장)
@Query("SELECT COUNT(al) FROM ApprovalLine al JOIN al.document d " +
       "WHERE al.approver.id IN :userIds " +
       "AND al.status = com.micesign.domain.enums.ApprovalLineStatus.PENDING " +
       "AND al.lineType IN (com.micesign.domain.enums.ApprovalLineType.APPROVE, com.micesign.domain.enums.ApprovalLineType.AGREE) " +
       "AND d.status = com.micesign.domain.enums.DocumentStatus.SUBMITTED " +
       "AND d.currentStep = al.stepOrder")
long countPendingByApproverIdIn(@Param("userIds") List<Long> userIds);

// 신규 (SUPER_ADMIN 전체 PENDING)
@Query("SELECT COUNT(al) FROM ApprovalLine al JOIN al.document d " +
       "WHERE al.status = com.micesign.domain.enums.ApprovalLineStatus.PENDING " +
       "AND al.lineType IN (com.micesign.domain.enums.ApprovalLineType.APPROVE, com.micesign.domain.enums.ApprovalLineType.AGREE) " +
       "AND d.status = com.micesign.domain.enums.DocumentStatus.SUBMITTED " +
       "AND d.currentStep = al.stepOrder")
long countAllPending();
```

**Key deviation:** WHERE 절은 **완전 동일**, `approver.id = :userId` → `approver.id IN :userIds` 1곳만 변경. Anti-pattern 경고: SKIPPED/ASSIGNED 포함 금지 (Pitfall 6 가 아닌, 원문에 "SKIPPED 포함 시 숫자 오염" 경고).

---

### 6. `UserRepository.java` (repository, EXTEND)

**Analog:** 같은 파일 L30 `findByDepartmentIdAndStatus(Long departmentId, UserStatus status)` — method-name.

**기존** (L30):
```java
List<User> findByDepartmentIdAndStatus(Long departmentId, UserStatus status);
```

**추가 (D-A4 ADMIN descendant 에서 userIds 수집):**
```java
// 신규 (D-A4 부서 계층 → user id 수집). UserStatus 필터 없음 (D-A7: ACTIVE/INACTIVE/RETIRED 모두 포함)
@Query("SELECT u.id FROM User u WHERE u.departmentId IN :deptIds")
List<Long> findIdsByDepartmentIdIn(@Param("deptIds") List<Long> deptIds);
```

**Key deviation:**
- scalar projection `u.id` 반환 (`List<Long>`, 엔티티 미로딩).
- **UserStatus 필터 없음** — D-A7 에서 lock 된 "과거 퇴직자 기안 문서도 카운트" 정책 준수.

---

### 7. `DocumentRepositoryCustomImpl.java` (repository, D-A9 Option 1 upgrade)

**Analog:** 같은 파일 L73-82 (기존 ADMIN predicate) — 단일 부서 → descendantIds IN 으로 변경.

**기존** (L73-82):
```java
if ("ADMIN".equals(role) && departmentId != null) {
    QUser deptUser = new QUser("deptUser");
    BooleanExpression sameDepartment = doc.drafterId.in(
            JPAExpressions.select(deptUser.id)
                    .from(deptUser)
                    .where(deptUser.departmentId.eq(departmentId))   // ← 단일
    );
    permissionBranch = permissionBranch.or(sameDepartment);
}
```

**변경 후 (D-A9 Option 1):**
```java
if ("ADMIN".equals(role) && departmentId != null && descendantDeptIds != null && !descendantDeptIds.isEmpty()) {
    QUser deptUser = new QUser("deptUser");
    BooleanExpression sameDepartmentHierarchy = doc.drafterId.in(
            JPAExpressions.select(deptUser.id)
                    .from(deptUser)
                    .where(deptUser.departmentId.in(descendantDeptIds))   // ★ in 으로
    );
    permissionBranch = permissionBranch.or(sameDepartmentHierarchy);
}
```

**tab=department 도 동일 upgrade** (L47):
```java
case "department" -> where.and(drafter.departmentId.in(descendantDeptIds));   // ★ in
```

**Key deviation:** `searchDocuments` 시그니처에 **`List<Long> descendantDeptIds`** 파라미터 추가. 호출측 (`DocumentService.searchDocuments` L452-454) 에서 role/tab 에 따라 `departmentRepository.findDescendantIds(...)` 결과를 전달.

---

### 8. `DocumentRepositoryCustom.java` (interface, 시그니처 확장)

**Analog:** 같은 파일 L10.

**기존** (L8-11):
```java
public interface DocumentRepositoryCustom {
    Page<DocumentResponse> searchDocuments(DocumentSearchCondition condition, Long userId, String role, Long departmentId, Pageable pageable);
}
```

**변경 후:**
```java
public interface DocumentRepositoryCustom {
    Page<DocumentResponse> searchDocuments(
        DocumentSearchCondition condition,
        Long userId, String role,
        Long departmentId,
        List<Long> descendantDeptIds,   // ★ 신규 (D-A9 Option 1)
        Pageable pageable);
}
```

**Key deviation:** `DocumentService.searchDocuments` 에서 role=ADMIN 또는 tab=department 시에만 `findDescendantIds(departmentId)` 호출하여 전달. USER/MY tab 에서는 `List.of(departmentId)` 또는 `Collections.emptyList()` 전달.

---

### 9. `DashboardServiceIntegrationTest.java` (test, NEW)

**Analog 1 (핵심):** `backend/src/test/java/com/micesign/document/DocumentSearchPermissionMatrixTest.java` — `@SpringBootTest + @AutoConfigureMockMvc + JdbcTemplate seed` 풀스택 패턴. role × 권한 매트릭스 구조가 Phase 31 4카드×3role 매트릭스와 쌍둥이.

**Analog 2 (audit 회귀 gate 패턴):** `backend/src/test/java/com/micesign/document/ApprovalServiceAuditTest.java` L30-95 — `@MockBean BudgetApiClient` + JdbcTemplate fixture + cleanup 전략.

**핵심 복사 블록 1 — 테스트 클래스 뼈대** (`DocumentSearchPermissionMatrixTest.java` L30-40):
```java
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@DisplayName("Phase 30 — FSD FN-SEARCH-001 권한 매트릭스 통합 테스트 (SRCH-01, T-30-01)")
class DocumentSearchPermissionMatrixTest {

    @Autowired MockMvc mockMvc;
    @Autowired TestTokenHelper tokenHelper;
    @Autowired JdbcTemplate jdbcTemplate;
    @Autowired ObjectMapper objectMapper;
```

**핵심 복사 블록 2 — JdbcTemplate user seed** (`DocumentSearchPermissionMatrixTest.java` L76-85):
```java
String pwHash = "$2a$10$07mcjXBfvelJFwjs8DnoJOnEqprFy.dnQL1NdnRvlqEWwwmX62SOW";
String userSql = "INSERT INTO \"user\" (id, employee_no, name, email, password, department_id, "
        + "position_id, role, status, failed_login_count, must_change_password) "
        + "VALUES (?, ?, ?, ?, ?, ?, 3, ?, 'ACTIVE', 0, FALSE)";
jdbcTemplate.update(userSql, A_ID, "U_A_PM", "Alice", "alice-pm@test.com", pwHash, DEPT_1, "USER");
// ... 6 users ...
```

**핵심 복사 블록 3 — document/approval_line seed** (L87-102):
```java
draftDocId     = insertDocument(A_ID, DocumentStatus.DRAFT,     null,                                "DRAFT 문서");
submittedDocId = insertDocument(A_ID, DocumentStatus.SUBMITTED, LocalDateTime.now().minusDays(3),    "SUBMITTED 문서");
// ...
insertApprovalLine(submittedDocId, B_ID, ApprovalLineType.APPROVE,   1, ApprovalLineStatus.PENDING);
insertApprovalLine(submittedDocId, C_ID, ApprovalLineType.AGREE,     2, ApprovalLineStatus.PENDING);
```

**핵심 복사 블록 4 — role token 발급** (L122-125):
```java
private String tokenFor(long id, String email, String name, UserRole role, Long deptId) {
    if (role == UserRole.SUPER_ADMIN) return tokenHelper.superAdminToken();
    return tokenHelper.tokenForRole(id, email, name, role, deptId);
}
```

**Key deviation (Phase 31):**
1. **부서 계층 fixture 신규** — V2 seed 부서 (id=1-7, flat) 로는 계층 검증 불가. `INSERT INTO department (id, name, parent_id, ...)` 으로 HQ(11) → Engineering(12, parent=11) → Platform(13, parent=12) + Sales(14, parent=11) 트리 seed.
2. **Phase 29 간섭 차단** — `@MockBean BudgetApiClient budgetApiClient` (ApprovalServiceAuditTest L58 참조) 추가 불필요 — 본 테스트는 SUBMIT mutation 이 없고 read-only `/dashboard/summary` 만 호출. 단 `@SpringBootTest` 컨텍스트 로드 시 EmailService 등 Phase 29 빈이 wiring 되므로 `@ActiveProfiles("test")` 로 `application-test.yml` (SMTP 없음) 활성 필수.
3. **assertion 방식** — `DocumentSearchPermissionMatrixTest.searchDocIds()` 의 JSON path 탐색 패턴 그대로 (L127-145). `root.path("data").path("pendingCount").asLong()` 식.
4. **cleanup** — 동 파일 L64-71 의 FK 역순 `DELETE FROM ... WHERE id IN (...)` 그대로 재사용.

---

### 10. `DepartmentRepositoryTest.java` (test, NEW — 선택적)

**Analog:** 없음 — 프로젝트에 `@DataJpaTest` 패턴 첫 도입. 대안으로 #9 integration test 에서 CTE 동작을 같이 검증 가능하므로 **Planner 가 우선순위 결정**.

**Planner 권장:** integration test (#9) 에 "10-level deep tree 에서도 findDescendantIds 가 종료" (RESEARCH Code Example 7 `deepTreeRecurses`) 테스트 1건 포함하면 별도 파일 생성 생략 가능.

---

### 11. `dashboard.ts` (type, EXTEND)

**Analog:** 같은 파일 L1-8.

**기존** (L1-8):
```typescript
export interface DashboardSummary {
  pendingCount: number;
  draftCount: number;
  submittedCount: number;
  completedCount: number;
  recentPending: PendingApprovalSummary[];
  recentDocuments: RecentDocumentSummary[];
}
```

**변경 후 (D-A2 + A3):**
```typescript
export interface DashboardSummary {
  pendingCount: number;
  draftCount: number;           // FE 노출 안 함이지만 타입은 유지 (D-A3)
  submittedCount: number;
  completedCount: number;       // = APPROVED only (Phase 31 D-A2 재정의)
  rejectedCount: number;        // ★ 신규 (D-A2)
  recentPending: PendingApprovalSummary[];
  recentDocuments: RecentDocumentSummary[];
}
```

**Key deviation:** Open question A7 권장에 따라 `draftCount` 는 **required 유지** (FE 에서 사용 안 하나 API contract 보존). `rejectedCount` 는 non-optional required.

---

### 12. `useDashboard.ts` (hook, MAJOR REFACTOR)

**Analog 1 (핵심 — placeholderData 패턴):** `frontend/src/features/document/hooks/useDocuments.ts` L10-16 `useMyDocuments`.

```typescript
export function useMyDocuments(params: MyDocumentParams) {
  return useQuery({
    queryKey: ['documents', 'my', params],
    queryFn: () => documentApi.getMyDocuments(params).then((res) => res.data.data!),
    placeholderData: (previousData) => previousData,
  });
}
```

**Analog 2 (기존 구조):** 같은 파일 L8-14.

**기존 (제거할 부분 포함)** (L1-35):
```typescript
export function useDashboardSummary() {
  return useQuery({
    queryKey: ['dashboard', 'summary'],
    queryFn: () => dashboardApi.getSummary().then(res => res.data.data!),
    refetchInterval: 60_000,
  });
}
export function usePendingPreview() { /* ... */ }   // ← 제거 (D-B2)
export function useRecentDocuments() { /* ... */ }   // ← 제거 (D-B2)
```

**변경 후 (파일 전체, D-B1/B2/B4/B7):**
```typescript
import { useQuery } from '@tanstack/react-query';
import { dashboardApi } from '../api/dashboardApi';

export function useDashboardSummary() {
  return useQuery({
    queryKey: ['dashboard', 'summary'],
    queryFn: () => dashboardApi.getSummary().then((res) => res.data.data!),
    refetchInterval: 60_000,                              // D-B4 유지
    placeholderData: (previousData) => previousData,      // ★ 신규 D-B7
  });
}
```

**Key deviation:**
- `usePendingPreview`/`useRecentDocuments` **완전 제거** — import 한 `approvalApi`/`apiClient`/`ApiResponse`/`PageResponse`/`DocumentResponse` 도 전부 제거.
- `placeholderData` 구문은 `useMyDocuments` 와 **동일 서명** `(previousData) => previousData` (TanStack v5 권장 — RESEARCH State of the Art).

---

### 13. `DashboardPage.tsx` (page, MAJOR REFACTOR)

**Analog:** 같은 파일 — 카드 3→4 전환. UI-SPEC §5 표 + §6.2 그리드 클래스가 정답지.

**기존 카드 row** (L37-63):
```tsx
<div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
  <CountCard icon={Clock} count={...} label={t('pending')} onClick={() => navigate('/approvals/pending')} iconColor="text-blue-500" />
  <CountCard icon={FileEdit} count={draftCount} label={t('drafts')} ... />   // ← 제거 (D-A3)
  <CountCard icon={CheckCircle2} count={...} label={t('completed')} ... />
</div>
```

**변경 후 구조 (UI-SPEC §5 매핑 + role 분기 navigation D-A8):**
```tsx
import { Clock, Hourglass, CheckCircle2, XCircle, Plus } from 'lucide-react';
// 제거: FileEdit
import { useAuthStore } from '../../../stores/authStore';

const user = useAuthStore((s) => s.user);
const isAdmin = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN';
const statusPath = (status: string) =>
  isAdmin ? `/documents?tab=search&status=${status}` : `/documents/my?status=${status}`;

<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">   {/* ★ D-C3 */}
  <CountCard icon={Clock}        count={summary?.pendingCount   ?? 0} label={t('pending')}   onClick={() => navigate('/approvals/pending')}   isLoading={isLoading} isError={isError} iconColor="text-blue-500 dark:text-blue-400" />
  <CountCard icon={Hourglass}    count={summary?.submittedCount ?? 0} label={t('submitted')} onClick={() => navigate(statusPath('SUBMITTED'))} isLoading={isLoading} isError={isError} iconColor="text-gray-500 dark:text-gray-400" />
  <CountCard icon={CheckCircle2} count={summary?.completedCount ?? 0} label={t('completed')} onClick={() => navigate(statusPath('APPROVED'))} isLoading={isLoading} isError={isError} iconColor="text-green-500 dark:text-green-400" />
  <CountCard icon={XCircle}      count={summary?.rejectedCount  ?? 0} label={t('rejected')}  onClick={() => navigate(statusPath('REJECTED'))} isLoading={isLoading} isError={isError} iconColor="text-red-500 dark:text-red-400" />
</div>
```

**리스트 row 변경 (D-B2 props drill):**
```tsx
<div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
  <PendingList data={summary?.recentPending} isLoading={isLoading} isError={isError} />
  <RecentDocumentsList data={summary?.recentDocuments} isLoading={isLoading} isError={isError} />
</div>
```

**제거 대상** (D-C2 `isError ? '-' : ...` 폐기):
- L17-19 의 `const pendingCount = isError ? '-' : ...` 세 줄.

**Key deviation:**
- 카드 순서 고정 (D-A8): 결재 대기 → 진행 중 → 승인 완료 → 반려.
- `useAuthStore` 로 role 확인. `useAuth().user.role` 이 아닌 `useAuthStore((s)=>s.user)` (해당 프로젝트의 실제 패턴).
- 그리드: `sm:grid-cols-3` → **`md:grid-cols-2 lg:grid-cols-4`** (UI-SPEC 6.2).
- `isError` prop 을 CountCard 로 전달.

---

### 14. `CountCard.tsx` (component, EXTEND — isError prop)

**Analog:** 같은 파일 (props interface + conditional render 확장).

**기존 Props** (L1-10):
```typescript
interface CountCardProps {
  icon: LucideIcon;
  count: number;
  label: string;
  onClick: () => void;
  isLoading?: boolean;
  iconColor?: string;
}
```

**기존 loading branch** (L20-32):
```tsx
if (isLoading) {
  return (
    <div className="bg-white dark:bg-gray-800 border ..." aria-hidden="true">
      <div className="animate-pulse">...</div>
    </div>
  );
}
```

**변경 후 (D-C2 `isError` prop + UI-SPEC §7.1 focus-visible 보강):**
```tsx
import ErrorState from './ErrorState';

interface CountCardProps {
  icon: LucideIcon;
  count: number;
  label: string;
  onClick: () => void;
  isLoading?: boolean;
  isError?: boolean;        // ★ 신규 D-C2
  iconColor?: string;
}

// loading 분기 직후에 추가:
if (isError) {
  return (
    <div
      role="alert"
      aria-live="polite"
      className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 min-h-[152px]"
    >
      <ErrorState variant="card" />
    </div>
  );
}

// default branch 의 <a> 에 focus-visible 추가 (UI-SPEC §9.4):
className="... focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:outline-none"
```

**Key deviation:** UI-SPEC §7.1 에서 제시한 "prop 확장 vs 별도 ErrorCard" 중 **prop 확장** 선택. ErrorState 공통 컴포넌트의 `variant="card"` 를 사용하여 CountCard 내부에서 축소된 크기 (`h-8 w-8` + body 생략) 로 렌더.

---

### 15. `PendingList.tsx` (component, REFACTOR — props-based)

**Analog:** 같은 파일 (훅 의존 → props 전환).

**기존 훅 사용** (L4, L10):
```typescript
import { usePendingPreview } from '../hooks/useDashboard';
// ...
const { data, isLoading } = usePendingPreview();
```

**변경 후 (D-B2):**
```typescript
// import 제거: usePendingPreview
import ErrorState from './ErrorState';
import type { PendingApprovalSummary } from '../types/dashboard';

interface PendingListProps {
  data: PendingApprovalSummary[] | undefined;
  isLoading: boolean;
  isError: boolean;
}

export default function PendingList({ data, isLoading, isError }: PendingListProps) {
  // ...
  // isError 분기 (L42 empty-state 바로 앞에 삽입):
  {!isLoading && isError && <ErrorState variant="list" />}

  // empty 분기 수정:
  {!isLoading && !isError && data && data.length === 0 && (/* 기존 empty block */)}

  // table 분기 수정:
  {!isLoading && !isError && data && data.length > 0 && (/* 기존 table block */)}
}
```

**Key deviation:**
- 기존 코드는 `data.content.length === 0` (PageResponse) 를 체크 — 새 props 는 **`PendingApprovalSummary[]`** 플랫 배열이므로 `data.length === 0` 으로 변경.
- row 에 `data-testid={`pending-row-${item.documentId}`}` 추가 권장 (smoke test 용).
- focus-visible 추가: L83 `className=".. focus-visible:bg-gray-50 dark:focus-visible:bg-gray-800/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500"` (UI-SPEC §7.2).

---

### 16. `RecentDocumentsList.tsx` (component, REFACTOR)

**Analog:** 같은 파일 (PendingList 와 대칭).

**변경 내용:** #15 와 동일한 패턴:
- `useRecentDocuments` 훅 제거 → `RecentDocumentSummary[]` props.
- `data.content.length` → `data.length`.
- `isError` → `<ErrorState variant="list" />`.
- focus-visible 보강.

**Key deviation:** `FileText` 아이콘 + `emptyRecent`/`emptyRecentDesc` i18n key 유지 (UI-SPEC §8.2 LOCKED).

---

### 17. `ErrorState.tsx` (component, NEW — 공통)

**Analog 1:** `PendingList.tsx` L42-52 (empty-state flex layout 구조).
**Analog 2:** RESEARCH Code Example 6 (완결된 구현체 제공).

**PendingList empty-state 구조** (L42-52 — 복사 원본):
```tsx
<div className="flex flex-col items-center justify-center py-10 text-center">
  <ClipboardCheck className="h-12 w-12 text-gray-300 dark:text-gray-600 mb-3" />
  <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
    {t('emptyPending')}
  </p>
  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
    {t('emptyPendingDesc')}
  </p>
</div>
```

**신규 구현 (UI-SPEC §8.3):**
```tsx
import { AlertTriangle, Loader2 } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useState } from 'react';

interface Props { variant?: 'card' | 'list' }

export default function ErrorState({ variant = 'list' }: Props) {
  const { t } = useTranslation('dashboard');
  const qc = useQueryClient();
  const [retrying, setRetrying] = useState(false);

  const handleRetry = async () => {
    setRetrying(true);
    try { await qc.refetchQueries({ queryKey: ['dashboard'] }); }
    finally { setRetrying(false); }
  };

  const iconSize = variant === 'card' ? 'h-8 w-8' : 'h-10 w-10';

  return (
    <div role="alert" aria-live="polite" className="flex flex-col items-center justify-center py-6 text-center">
      <AlertTriangle className={`${iconSize} text-amber-500 dark:text-amber-400 mb-3`} aria-hidden="true" />
      <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">{t('error')}</p>
      {variant !== 'card' && (
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('errorDesc')}</p>
      )}
      <button
        type="button"
        onClick={handleRetry}
        disabled={retrying}
        aria-busy={retrying}
        aria-label={t('retry')}
        className="mt-4 h-10 px-4 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:outline-none disabled:opacity-60"
      >
        {retrying && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
        {t('retry')}
      </button>
    </div>
  );
}
```

**Key deviation:**
- **`refetchQueries({ queryKey: ['dashboard'] })`** — prefix match 로 `['dashboard','summary']` 1개 강제 재실행. `invalidateQueries` 아님 (UI-SPEC §7.4 명시: 즉시 네트워크 호출).
- button 높이 `h-10` (UI-SPEC §9.6 mobile touch target 권장).

---

### 18. `useApprovals.ts` (hook, EDIT — +3 라인)

**Analog:** 같은 파일 L18-28 `useApprove`.

**기존** (L18-28):
```typescript
export function useApprove() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ lineId, comment }: { lineId: number; comment?: string }) =>
      approvalApi.approve(lineId, comment ? { comment } : undefined),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['approvals'] });
      queryClient.invalidateQueries({ queryKey: ['documents'] });
    },
  });
}
```

**변경 후 (D-B3 — 1줄 추가):**
```typescript
onSuccess: () => {
  queryClient.invalidateQueries({ queryKey: ['approvals'] });
  queryClient.invalidateQueries({ queryKey: ['documents'] });
  queryClient.invalidateQueries({ queryKey: ['dashboard'] });   // ★ D-B3
},
```

**`useReject` 도 동일** (L30-40): `onSuccess` 에 동일한 1줄 추가.

**Key deviation:** 기존 라인 유지, 순서는 `approvals` → `documents` → `dashboard` (도메인 → feature 순서 관습).

---

### 19. `useDocuments.ts` (hook, EDIT — +2 훅 × 1 라인)

**Analog:** 같은 파일 L68-78 `useSubmitDocument` + L80-91 `useWithdrawDocument`.

**`useSubmitDocument` 기존** (L68-78):
```typescript
export function useSubmitDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      documentApi.submit(id).then((res) => res.data.data!),
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      queryClient.invalidateQueries({ queryKey: ['documents', id] });
    },
  });
}
```

**변경 후:**
```typescript
onSuccess: (_data, id) => {
  queryClient.invalidateQueries({ queryKey: ['documents'] });
  queryClient.invalidateQueries({ queryKey: ['documents', id] });
  queryClient.invalidateQueries({ queryKey: ['dashboard'] });   // ★ D-B3
},
```

**`useWithdrawDocument` 도 동일** (L85-89): 마지막에 `queryClient.invalidateQueries({ queryKey: ['dashboard'] })` 추가.

**Scope 주의:** D-B3 은 **`useApprove`, `useReject`, `useSubmitDocument`, `useWithdrawDocument` 4개만** 대상. `useCreateDocument`/`useRewriteDocument`/`useDeleteDocument`/`useUpdateDocument` 는 DRAFT 단계라 대시보드 4카드에 영향 zero — **건드리지 않음**.

---

### 20. `dashboard.json` (i18n, EXTEND)

**Analog:** 같은 파일.

**기존** (`frontend/public/locales/ko/dashboard.json`):
```json
{
  "title": "대시보드",
  "newDocument": "새 문서 작성",
  "pending": "결재 대기",
  "drafts": "작성 중",
  "completed": "완료",
  "pendingList": "결재 대기 문서",
  "recentDocuments": "최근 문서",
  "viewAll": "전체 보기",
  "emptyPending": "대기 중인 결재가 없습니다",
  "emptyPendingDesc": "결재 요청이 들어오면 여기에 표시됩니다.",
  "emptyRecent": "최근 문서가 없습니다",
  "emptyRecentDesc": "문서를 작성하면 여기에 표시됩니다."
}
```

**변경 후 (UI-SPEC §8.1 table):**
```json
{
  "title": "대시보드",
  "newDocument": "새 문서 작성",
  "pending": "결재 대기",
  "submitted": "진행 중",
  "completed": "승인 완료",
  "rejected": "반려",
  "drafts": "작성 중",
  "pendingList": "결재 대기 문서",
  "recentDocuments": "최근 문서",
  "viewAll": "전체 보기",
  "emptyPending": "대기 중인 결재가 없습니다",
  "emptyPendingDesc": "결재 요청이 들어오면 여기에 표시됩니다.",
  "emptyRecent": "최근 문서가 없습니다",
  "emptyRecentDesc": "문서를 작성하면 여기에 표시됩니다.",
  "error": "일시적인 오류가 발생했습니다",
  "errorDesc": "잠시 후 다시 시도해 주세요.",
  "retry": "다시 시도"
}
```

**Key deviation:**
- 신규 키 5개: `submitted` / `rejected` / `error` / `errorDesc` / `retry`.
- **값 수정 1개:** `completed` 의 값 "완료" → **"승인 완료"** (UI-SPEC §8.1 값 조정, D-A1 semantics 재정의 반영).
- `drafts` orphan 유지 (D-A3 — 키 삭제 금지, 재사용 대비).
- `en/dashboard.json` 은 **미생성** (RESEARCH Open Q5 권장 — 본 Phase 범위 밖, v1.3+).

---

### 21-22. `useApprovals.invalidation.test.ts` / `useDocuments.invalidation.test.ts` (test, NEW)

**Analog:** `frontend/src/features/document/pages/__tests__/DocumentListPage.test.tsx` L1-56 — QueryClientProvider wrapper + Mock pattern.

**QueryClient wrapper 패턴** (`DocumentListPage.test.tsx` L37-56):
```typescript
const renderWithRouter = (initialEntries: string[]) => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={initialEntries}>
        {/* ... */}
      </MemoryRouter>
    </QueryClientProvider>,
  );
};
```

**신규 테스트 뼈대 (RESEARCH Code Example 4):**
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useApprove } from '../useApprovals';

vi.mock('../../api/approvalApi', () => ({
  approvalApi: {
    approve: vi.fn().mockResolvedValue({ data: { data: { id: 1 } } }),
    reject: vi.fn().mockResolvedValue({ data: { data: null } }),
  },
}));

describe('useApprove onSuccess — D-B3 invalidate 검증', () => {
  let queryClient: QueryClient;
  let invalidateSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
  });

  it('invalidateQueries 가 approvals/documents/dashboard 3개 prefix 모두 호출된다', async () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    const { result } = renderHook(() => useApprove(), { wrapper });
    result.current.mutate({ lineId: 1, comment: undefined });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['approvals'] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['documents'] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['dashboard'] });  // ★ 핵심
  });
});
```

**Key deviation:**
- `useDocuments.invalidation.test.ts` 는 `useSubmitDocument`, `useWithdrawDocument` 각각에 대해 동일 구조 복제.
- `vi.mock('../../api/documentApi', ...)` 로 API 레이어 mock.
- `beforeEach` 에서 QueryClient 재생성 (RESEARCH Pitfall 10 — test isolation).

---

### 23. `DashboardPage.test.tsx` (test, NEW — 4카드 smoke)

**Analog:** `frontend/src/features/document/pages/__tests__/DocumentListPage.test.tsx` L1-25 Mock 구조.

**핵심 Mock 패턴** (`DocumentListPage.test.tsx` L9-29):
```typescript
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: { defaultValue?: string }) => opts?.defaultValue ?? key,
  }),
}));

vi.mock('../../hooks/useDocuments', () => ({
  useMyDocuments: () => ({ data: { ... }, isLoading: false }),
}));
```

**신규 구현 (smoke — 4카드 render 검증):**
```typescript
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router';
import { describe, it, expect, vi } from 'vitest';
import DashboardPage from '../DashboardPage';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}));

vi.mock('../../hooks/useDashboard', () => ({
  useDashboardSummary: () => ({
    data: {
      pendingCount: 3, draftCount: 1, submittedCount: 5, completedCount: 10, rejectedCount: 2,
      recentPending: [], recentDocuments: [],
    },
    isLoading: false,
    isError: false,
  }),
}));

vi.mock('../../../../stores/authStore', () => ({
  useAuthStore: (selector: any) => selector({ user: { role: 'USER', departmentId: 1 } }),
}));

describe('DashboardPage — 4 카드 smoke', () => {
  it('4 카운트 카드 모두 렌더 (pending/submitted/completed/rejected)', () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={qc}>
        <MemoryRouter><DashboardPage /></MemoryRouter>
      </QueryClientProvider>,
    );
    expect(screen.getByText('3')).toBeInTheDocument();   // pending
    expect(screen.getByText('5')).toBeInTheDocument();   // submitted
    expect(screen.getByText('10')).toBeInTheDocument();  // completed
    expect(screen.getByText('2')).toBeInTheDocument();   // rejected
    expect(screen.queryByText('dashboard.drafts')).not.toBeInTheDocument();   // drafts 카드 제거 (D-A3)
  });
});
```

**Key deviation:**
- `useAuthStore` mock — selector 패턴 (`(selector) => selector(state)`) 주의. 실제 코드가 `useAuthStore((s) => s.user)` 로 호출.
- `queryByText('dashboard.drafts')` 가 null 임을 assert → D-A3 회귀 방어.
- ADMIN smoke (별도 it) 에서 navigate path 가 `/documents?tab=search` 인지 검증 (D-A8) 권장.

---

## Shared Patterns

### SP-1: `@Transactional(readOnly = true)` on aggregation service

**Source:** `backend/src/main/java/com/micesign/service/DashboardService.java` L24.
**Apply to:** `DashboardService` 재작성 시 그대로 유지. 새 role 분기도 read-only 내에서 안전.

```java
@Service
@Transactional(readOnly = true)
public class DashboardService { ... }
```

---

### SP-2: Spring Data `@Query` Korean 주석 컨벤션

**Source:** `ApprovalLineRepository.java` L23-26, `DocumentRepository.java` L34-37.
**Apply to:** `DepartmentRepository.findDescendantIds` 주석 블록, `ApprovalLineRepository.countPendingByApproverIdIn` 등.

프로젝트 관습: 복잡한 `@Query` 상단에 한글 주석으로 "Phase XX — 왜 이 쿼리가 필요한가 + LazyInit 회피 등 이유" 기재.

```java
// Phase 29 — approver + approver.department 까지 eager-fetch (EmailService listener 가
// detached 상태에서 line.getApprover()/getDepartment() lazy-load 시
// LazyInitializationException 회피, NotificationLog 발송 흐름 전용)
@Query("SELECT al FROM ApprovalLine al JOIN FETCH al.approver ap ...")
```

**Phase 31 예:**
```java
// Phase 31 — ADMIN 부서 계층 확장 카운트 (D-A5). 본 쿼리의 WHERE 절은
// 기존 countPendingByApproverId(Long) 와 완전 동일, approver.id 만 scalar → IN 으로 확장.
// (향후 pending 의미 변경 시 두 쿼리 동시 수정 필수)
```

---

### SP-3: TanStack Query v5 mutation onSuccess invalidate 체인

**Source:** `frontend/src/features/document/hooks/useDocuments.ts` L73-76 (기존 3-prefix invalidate).
**Apply to:** `useApprove`, `useReject`, `useSubmitDocument`, `useWithdrawDocument` 4 훅 모두.

```typescript
onSuccess: () => {
  queryClient.invalidateQueries({ queryKey: ['approvals'] });
  queryClient.invalidateQueries({ queryKey: ['documents'] });
  queryClient.invalidateQueries({ queryKey: ['dashboard'] });
},
```

**Variants:**
- `useSubmitDocument`/`useWithdrawDocument` 는 mutation variable `id` 수신 — `(_data, id) => { ... invalidateQueries({ queryKey: ['documents', id] }) ... }` 형태 유지.

---

### SP-4: JSON path 기반 통합 테스트 assertion

**Source:** `DocumentSearchPermissionMatrixTest.java` L127-145 `searchDocIds` helper.
**Apply to:** `DashboardServiceIntegrationTest` 의 JSON 파싱 assertion.

```java
MvcResult result = mockMvc.perform(get("/api/v1/dashboard/summary")
        .header("Authorization", "Bearer " + token)
        .accept(MediaType.APPLICATION_JSON))
    .andExpect(status().isOk())
    .andReturn();
JsonNode root = objectMapper.readTree(result.getResponse().getContentAsByteArray());
assertThat(root.path("data").path("pendingCount").asLong()).isEqualTo(expected);
assertThat(root.path("data").path("rejectedCount").asLong()).isEqualTo(expected);   // 신규 D-A2
```

---

### SP-5: JdbcTemplate FK-역순 cleanup + prefix 기반 fixture

**Source:** `DocumentSearchPermissionMatrixTest.java` L61-71 `@BeforeEach`.
**Apply to:** `DashboardServiceIntegrationTest` 의 `@BeforeEach/@AfterEach`.

```java
@BeforeEach
void setUp() {
    // FK 역순 cleanup
    jdbcTemplate.update("DELETE FROM notification_log");
    jdbcTemplate.update("DELETE FROM approval_line");
    jdbcTemplate.update("DELETE FROM document_attachment");
    jdbcTemplate.update("DELETE FROM document_content");
    jdbcTemplate.update("DELETE FROM document");
    jdbcTemplate.update("DELETE FROM doc_sequence");
    jdbcTemplate.update("DELETE FROM \"user\" WHERE id IN (?, ?, ?, ?)", ...);
    // dept 계층 삭제 시: 하위 → 상위 순서
    jdbcTemplate.update("DELETE FROM department WHERE id IN (?, ?, ?)", PLATFORM_ID, ENGINEERING_ID, SALES_ID);
    jdbcTemplate.update("DELETE FROM department WHERE id = ?", HQ_ID);   // 루트는 마지막
    // ...
}
```

**Phase 31 특이점:** 부서 계층 fixture 의 INSERT 순서는 **루트 → 하위** (parent_id FK 제약), DELETE 는 **하위 → 루트**.

---

### SP-6: Lucide Icon naming 일관

**Source:** `DashboardPage.tsx` L3 + `PendingList.tsx` L2 + RESEARCH §Standard Stack (1.7.0 verified).
**Apply to:** DashboardPage 아이콘 교체, ErrorState 아이콘.

**기존 채택 아이콘:** `Clock`, `CheckCircle2`, `FileEdit`(제거), `Plus`, `ClipboardCheck`, `FileText`.

**Phase 31 신규 채택 (UI-SPEC §5 LOCKED + §13.2):**
- `Hourglass` — 진행 중 (`Loader`/`Loader2` 는 spinner 로 예약되어 있으므로 의미 간섭 방지)
- `XCircle` — 반려
- `AlertTriangle` — Error state
- `Loader2` — retry button spinner

Import 라인:
```typescript
// DashboardPage.tsx
import { Clock, Hourglass, CheckCircle2, XCircle, Plus } from 'lucide-react';

// ErrorState.tsx
import { AlertTriangle, Loader2 } from 'lucide-react';
```

---

### SP-7: TailwindCSS dark: prefix 필수

**Source:** 기존 `CountCard.tsx` L22-23 `bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700`.
**Apply to:** ErrorState (신규), CountCard isError 분기, 4개 카드 아이콘 색상.

UI-SPEC §4 표에서 확정된 dark pair:
- `text-blue-500` → `dark:text-blue-400`
- `text-gray-500` → `dark:text-gray-400`
- `text-green-500` → `dark:text-green-400`
- `text-red-500` → `dark:text-red-400`
- `text-amber-500` → `dark:text-amber-400`

모든 semantic color 에 dark pair 필수 (누락 시 dark mode AA 실패).

---

### SP-8: Korean 한글 주석 + i18n value 존댓말

**Source:** CLAUDE.md §Language + FSD §12.2 + UI-SPEC §8 (존댓말 통일).
**Apply to:** 모든 신규 한글 문자열.

- 주석: 한글 (프로젝트 관습).
- UI i18n value: 한글 존댓말 ("..되었습니다", "..해 주세요").
- Error code: 영문 (미변경 — 본 Phase 에서는 error code 신설 없음).

---

### SP-9: `placeholderData: (previousData) => previousData` for v5 seamless refetch

**Source:** `frontend/src/features/document/hooks/useDocuments.ts` L14, L23.
**Apply to:** `useDashboardSummary` (D-B7). 이미 `useMyDocuments`/`useSearchDocuments` 2곳에서 동일 시그니처 사용 중 — 확장 준수.

---

## No Analog Found

| 파일 | Role | Data Flow | 이유 | 대체 가이드 |
|------|------|-----------|------|-----------|
| `DepartmentRepositoryTest.java` | test (slice) | CRUD assertion | 프로젝트에 `@DataJpaTest` 패턴 첫 도입 | **Planner 권장 대안:** `DashboardServiceIntegrationTest` 에 `findDescendantIds` 전용 테스트 케이스 2-3건 포함 (10-level deep tree + 빈 부서) → 별도 파일 생성 skip |

**사실상 1개** — ErrorState 는 "새 컴포넌트" 이지만 `PendingList.tsx` L42-52 의 empty-state flex 레이아웃 구조를 1:1 복제 변주하므로 analog 가 있음 (본 문서 #17 참조).

---

## Metadata

**Analog search scope:**
- `backend/src/main/java/com/micesign/{service,repository,dto,controller,security,domain/enums}/`
- `backend/src/test/java/com/micesign/{document,admin,dashboard}/`
- `frontend/src/features/{dashboard,document,approval,auth}/`
- `frontend/src/{stores,types,hooks,i18n}/`
- `frontend/public/locales/`

**Files scanned (read-only):** 23
- Backend: `DashboardService.java`, `DashboardSummaryResponse.java`, `DashboardController.java`, `DocumentRepository.java`, `ApprovalLineRepository.java`, `DepartmentRepository.java`, `UserRepository.java`, `DocumentRepositoryCustom.java`, `DocumentRepositoryCustomImpl.java`, `CustomUserDetails.java`, `TestTokenHelper.java`, `DocumentSearchPermissionMatrixTest.java`, `ApprovalServiceAuditTest.java`, `UserRole.java`.
- Frontend: `DashboardPage.tsx`, `CountCard.tsx`, `PendingList.tsx`, `RecentDocumentsList.tsx`, `useDashboard.ts`, `useApprovals.ts`, `useDocuments.ts`, `dashboardApi.ts`, `dashboard.ts` (types), `authStore.ts`, `useAuth.ts`, `auth.ts` (types), `DocumentListPage.test.tsx`, `dashboard.json` (ko).

**Pattern extraction date:** 2026-04-24

**Downstream planner 가 PLAN.md 에서 해야 할 일:**
1. 각 파일별로 상기 excerpt 를 "Copy from: [path]:[lines], then change [X] to [Y]" 형식의 concrete action 으로 변환.
2. D-A9 Option 1 (Phase 30 predicate 계층 확장) 을 **first task** 로 배치 — 후속 작업이 SoT 을 공유하기 위함.
3. 테스트 matrix (SP-4, SP-5) 를 Plan 의 validation 섹션에 명시.
4. i18n key 5개 신규 + 1개 value 수정은 별도 task 로 분리 (UAT 검수 용이).

# Phase 30: 검색 권한 WHERE 절 보안 수정 + 필터 확장 - Pattern Map

**Mapped:** 2026-04-23
**Phase:** 30 — 검색 권한 WHERE 절 보안 수정 + 필터 확장
**Output file:** `.planning/phases/30-where/30-PATTERNS.md`

---

## Overview

| 항목 | 수 |
|------|---|
| 총 대상 파일 | 23 |
| 신규 생성 (NEW) | 14 |
| 수정 (MODIFY) | 9 |
| 강한 analog 보유 (exact / role-match) | 21 |
| No-analog (from scratch) | 2 (`SearchBenchmarkSeeder`, `apiClient.test.ts`의 serializer 유닛) |

**벤치마크 코어 파일 (반복 참조):**
- `backend/src/main/java/com/micesign/repository/DocumentRepositoryCustomImpl.java` — **수정 대상 본체 + 자기참조 analog** (BooleanBuilder · Projections · fetchOne count 패턴)
- `backend/src/main/java/com/micesign/service/DocumentService.java:203-223` — **4-브랜치 Java 권한 로직 Gold Standard** (QueryDSL 로 번역하는 본 phase 핵심)
- `backend/src/main/java/com/micesign/common/exception/GlobalExceptionHandler.java` — `@ExceptionHandler` 추가 스타일
- `backend/src/main/java/com/micesign/controller/OrganizationController.java` — **공개 (role-free) `GET` 엔드포인트 컨트롤러 선례** (UserSearchController 신설 템플릿)
- `backend/src/main/java/com/micesign/specification/UserSpecification.java` — keyword OR 3-필드 패턴 (UserSearch service 재사용)
- `backend/src/test/java/com/micesign/document/ApprovalWorkflowTest.java` — **통합 테스트 fixture 스타일** (Phase 29 재사용 기준) : 다중 유저 seed + TestTokenHelper.tokenForRole + notification_log 사전 cleanup
- `backend/src/test/java/com/micesign/admin/TestTokenHelper.java` — role 별 JWT 발급 헬퍼 (**새 테스트가 직접 호출**)
- `frontend/src/api/client.ts` — axios 1.x apiClient 정의부 (paramsSerializer 추가 위치)
- `frontend/src/features/document/pages/DocumentListPage.tsx` — **수정 대상 본체** (useState 다수 → useSearchParams 전환)
- `frontend/src/features/approval/components/OrgTreePickerModal.tsx` — debounced search + useQuery 패턴 (DrafterCombo analog)
- `frontend/src/features/admin/components/Pagination.tsx` — **그대로 재사용** (0-indexed, totalElements 표시)

---

## File Classification

### PR1 (Hotfix 보안)

| 대상 파일 | Role | Data Flow | 최근접 Analog | 매칭 품질 |
|-----------|------|-----------|--------------|-----------|
| `backend/src/main/java/com/micesign/repository/DocumentRepositoryCustomImpl.java` (MODIFY) | repository — QueryDSL BooleanBuilder | request-response (read) — JPA SELECT+COUNT 2-query | **자기 참조 L29-122** (기존 BooleanBuilder 구조 유지) + `ApprovalLineRepository.findPendingByApproverId` (JPQL EXISTS 대안 참조) + `DocumentService.getDocument L203-223` (4-브랜치 Java 로직 번역 원본) | **exact (self-ref + hybrid)** |
| `backend/src/main/java/com/micesign/repository/DocumentRepositoryCustom.java` (MODIFY) | repository interface | signature change only | 자기 참조 L10 | exact |
| `backend/src/main/java/com/micesign/dto/document/DocumentSearchCondition.java` (MODIFY) | DTO record | immutable data carrier | 자기 참조 + `DocumentService.getMyDocuments L462` 의 `List<DocumentStatus>` 시그니처 관례 | exact |
| `backend/src/main/java/com/micesign/controller/DocumentController.java` (MODIFY, L116-144) | controller — `@RequestParam` 수동 enum 변환 + RBAC 가드 | request-response (GET) | 자기 참조 L116-144 (기존 `@RequestParam` 구조) + `UserManagementController.getUsers` (파라미터 enum 자동 바인딩 대안 참조) | exact |
| `backend/src/main/java/com/micesign/service/DocumentService.java` (MODIFY, L452-454) | service — thin wrapper | request-response | 자기 참조 L452-454 | exact |
| `backend/src/main/java/com/micesign/common/exception/GlobalExceptionHandler.java` (MODIFY) | `@RestControllerAdvice` — 핸들러 1개 추가 | cross-cutting error mapping | 자기 참조 L27-33 (`handleValidation`) 의 `ApiResponse.error("VALIDATION_ERROR", ...)` 포맷 | exact |
| `backend/src/test/java/com/micesign/document/DocumentSearchPermissionMatrixTest.java` (NEW) | integration test — 7 유저 × 4 상태 matrix | test (MockMvc GET + JdbcTemplate assert) | `ApprovalWorkflowTest.java` L51-86 (다중 user seed + tokenForRole) + `DocumentSubmitTest.java` (JdbcTemplate cleanup 순서) | **exact** — 패턴 복제 |
| `backend/src/test/java/com/micesign/document/DocumentSearchDraftGateTest.java` (NEW) | integration test — tab × DRAFT gate | test (MockMvc GET) | `ApprovalWorkflowTest.java` fixture + `DocumentControllerTest.java` L40-49 cleanup | exact |
| `backend/src/test/java/com/micesign/document/DocumentSearchKeywordTest.java` (NEW, SRCH-02 회귀) | integration test — keyword OR LIKE | test | `DocumentControllerTest.java` cleanup + 기존 `escapeLikePattern` assert | exact |
| `backend/src/test/java/com/micesign/document/DocumentSearchStatusFilterTest.java` (NEW) | integration test — 복수 `?status=A&status=B` | test | `ApprovalWorkflowTest.java` | exact |
| `backend/src/test/java/com/micesign/document/DocumentSearchInvalidEnumTest.java` (NEW) | integration test — 400 VALIDATION_ERROR (500 방지) | test | `DocumentSubmitTest.java` L150-165 (400 assert 패턴) | exact |

### PR2 (필터 확장 + UI + 벤치)

| 대상 파일 | Role | Data Flow | 최근접 Analog | 매칭 품질 |
|-----------|------|-----------|--------------|-----------|
| `backend/src/main/java/com/micesign/controller/UserSearchController.java` (NEW, 권장 신설) | controller — 공개 (role-free) `GET /users/search` | request-response (GET list) | `OrganizationController.java` (공개 컨트롤러 + `@RequestMapping("/api/v1/organization")`) + `UserManagementController.getUsers` (`@RequestParam keyword` 패턴) | **role-match (hybrid)** |
| `backend/src/main/java/com/micesign/dto/user/UserSearchResponse.java` (NEW) | DTO record — 최소 필드 | data carrier | `UserListResponse.java` (id/name/departmentName 등 record 스타일) — 필드만 축소 | exact |
| `backend/src/main/java/com/micesign/service/UserSearchService.java` (NEW) | service — readOnly 단일 메서드 | request-response | `UserManagementService.getUsers` (Specification + Page.map) + `UserSpecification.withFilters` (keyword OR 패턴) | exact |
| `backend/src/test/java/com/micesign/user/UserSearchControllerTest.java` (NEW) | integration test — `/users/search` 응답 shape + 가시성 | test | `UserManagementControllerTest.java` | exact |
| `backend/src/test/java/com/micesign/document/DocumentSearchDrafterFilterTest.java` (NEW) | integration test — drafterId 필터 | test | `ApprovalWorkflowTest.java` | exact |
| `frontend/src/api/client.ts` (MODIFY) | api client config — paramsSerializer 추가 | config | 자기 참조 L7-13 (`axios.create({...})` 위치) | exact |
| `frontend/src/features/document/types/document.ts` (MODIFY) | TS types | type declarations | 자기 참조 L149-158 (`DocumentSearchParams`) | exact |
| `frontend/src/features/document/api/documentApi.ts` (MODIFY) | api client — 1줄 수정 | request shape | 자기 참조 L39-40 | exact |
| `frontend/src/features/document/hooks/useDocuments.ts` (MODIFY) | TanStack Query hooks — queryKey 확장 | client state | 자기 참조 L18-25 | exact |
| `frontend/src/features/document/pages/DocumentListPage.tsx` (MODIFY — 대대적) | page component — useState → useSearchParams | client state, URL SoT | 자기 참조 L16-96 (기존 구조 retention) + Research §Pattern 4 (useSearchParams callback pattern) | **exact (self-ref) + research skeleton** |
| `frontend/src/features/document/components/DrafterCombo.tsx` (NEW) | component — debounced async combobox | event-driven (input → debounce → fetch) | `OrgTreePickerModal.tsx` L1-90 (debounced 검색 + useQuery `enabled: open`) + Research §Pattern 3 DrafterCombo skeleton | role-match |
| `frontend/src/features/document/components/StatusFilterPills.tsx` (NEW 또는 확장) | component — 복수 선택 pills | client state | 기존 `DocumentListPage.tsx` L157-173 (select 단일) 확장 + `STATUS_OPTIONS` 재사용 | role-match |
| `frontend/src/features/document/api/userSearchApi.ts` (NEW) | api client — `searchUsers(q, size)` + `getById(id)` | request-response | `frontend/src/features/approval/api/organizationApi.ts` (공개 API 호출 스타일) + `frontend/src/features/admin/api/userApi.ts` (`{ params }` 호출) | exact |
| `frontend/src/features/document/pages/__tests__/DocumentListPage.test.tsx` (NEW) | component test (Vitest + jsdom + @testing-library) | test | `frontend/src/features/approval/components/__tests__/ApprovalLineEditor.test.tsx` (`it.todo` + describe 구조 — 실제 구현은 PR2에서) + `frontend/vitest.config.ts` 확인 | role-match |
| `frontend/src/features/document/components/__tests__/DrafterCombo.test.tsx` (NEW) | component test | test | 동상 | role-match |
| `frontend/src/api/__tests__/apiClient.test.ts` (NEW) | unit test — paramsSerializer 동작 | test | 프론트에 pure unit test 선례 없음 → `frontend/src/features/admin/presets/presets.test.ts` (Vitest 순수 unit 스타일) | role-match |
| `backend/src/main/java/com/micesign/tools/SearchBenchmarkSeeder.java` 또는 seed SQL (NEW, `@Profile("bench")`) | utility — CommandLineRunner seed | batch — 10K INSERT | 리포 내 `CommandLineRunner` 선례 0건 → **no-analog**, Research §Code Examples #4 skeleton 채택. 대안: `V1__create_schema.sql` + `V2__seed_initial_data.sql` 의 SQL INSERT 를 참조해 `tools/seed/bench-seed.sql` 로 구현 (Flyway 밖 수동 실행) | **no-analog** |
| `backend/src/main/resources/db/migration/V20__*.sql` (선택적) | Flyway DDL migration | schema change | `V13__add_doc_sequence_unique_constraint.sql` + `V19__add_notification_dedup_unique.sql` (Phase 29) 의 `ALTER TABLE ADD INDEX` 스타일 | exact (필요 시) |

---

## Analog Code Excerpts

### [PR1] 1. `DocumentRepositoryCustomImpl.searchDocuments` 수정 (SRCH-01)

#### 1A. 현재 구조 (자기 참조 analog) — `DocumentRepositoryCustomImpl.java:29-122`

```java
// backend/src/main/java/com/micesign/repository/DocumentRepositoryCustomImpl.java:29-55
@Override
public Page<DocumentResponse> searchDocuments(
        DocumentSearchCondition condition, Long userId, String role,
        Long departmentId, Pageable pageable) {

    QDocument doc = QDocument.document;
    QUser drafter = QUser.user;
    QDepartment dept = QDepartment.department;
    QPosition pos = QPosition.position;
    QApprovalLine approvalLine = QApprovalLine.approvalLine;

    BooleanBuilder where = new BooleanBuilder();

    // Tab scope logic
    String tab = condition.tab() != null ? condition.tab().toLowerCase() : "my";
    switch (tab) {
        case "my" -> where.and(doc.drafterId.eq(userId));
        case "department" -> where.and(drafter.departmentId.eq(departmentId));
        case "all" -> {
            if ("ADMIN".equals(role)) {
                where.and(drafter.departmentId.eq(departmentId));
            }
            // SUPER_ADMIN sees all — no additional predicate
        }
        default -> where.and(doc.drafterId.eq(userId));
    }
```

**복제 포인트:** QApprovalLine alias 이미 import 됨. BooleanBuilder/tab switch 구조 **그대로 유지**, 권한 predicate 블록만 [2] 번 위치에 삽입.

#### 1B. keyword OR 체인 (SRCH-02 회귀 보존) — `DocumentRepositoryCustomImpl.java:57-66`

```java
// backend/src/main/java/com/micesign/repository/DocumentRepositoryCustomImpl.java:57-66
if (condition.keyword() != null && !condition.keyword().isBlank()) {
    String escaped = escapeLikePattern(condition.keyword().trim());
    String kw = "%" + escaped + "%";
    where.and(
            doc.title.likeIgnoreCase(kw)
                    .or(doc.docNumber.likeIgnoreCase(kw))
                    .or(drafter.name.likeIgnoreCase(kw))
    );
}
```

**복제 포인트:** 블록 전체 **무변경**. D-D8 정책 — `escapeLikePattern` + 3-field OR 그대로.

#### 1C. count + content 2-query + Projections — `DocumentRepositoryCustomImpl.java:82-121`

```java
// backend/src/main/java/com/micesign/repository/DocumentRepositoryCustomImpl.java:82-121
// Count query
Long total = queryFactory.select(doc.count())          // ← D-D3: count → countDistinct 로 변경
        .from(doc)
        .join(doc.drafter, drafter)
        .join(drafter.department, dept)
        .leftJoin(drafter.position, pos)
        .where(where)
        .fetchOne();
if (total == null) {
    total = 0L;
}

// Content query with projection to DocumentResponse
List<DocumentResponse> content = queryFactory
        .select(Projections.constructor(DocumentResponse.class,
                doc.id,
                doc.docNumber,
                doc.templateCode,
                doc.templateCode,  // templateName — resolved later or via join
                doc.title,
                doc.status.stringValue(),
                drafter.name,
                dept.name,
                pos.name,
                doc.drafterId,
                doc.submittedAt,
                doc.completedAt,
                doc.createdAt
        ))
        .from(doc)
        .join(doc.drafter, drafter)
        .join(drafter.department, dept)
        .leftJoin(drafter.position, pos)
        .where(where)
        .orderBy(doc.createdAt.desc())
        .offset(pageable.getOffset())
        .limit(pageable.getPageSize())
        .fetch();

return new PageImpl<>(content, pageable, total);
```

**복제 포인트:** 2-query 분리 유지 (D-D4 locked). `doc.count()` → `doc.countDistinct()` 단 1줄 변경 (D-D3). Projection constructor / `new PageImpl<>` 그대로. **Pitfall 7** 재확인: count 쿼리에 `orderBy` 절대 추가 금지 (현재 쿼리도 이미 없음 — 그대로).

#### 1D. 4-브랜치 권한 로직 원본 — `DocumentService.getDocument L203-223` (Java)

```java
// backend/src/main/java/com/micesign/service/DocumentService.java:203-223
@Transactional(readOnly = true)
public DocumentDetailResponse getDocument(Long docId, Long userId, UserRole role, Long departmentId) {
    Document document = documentRepository.findById(docId)
            .orElseThrow(() -> new BusinessException("DOC_NOT_FOUND", "문서를 찾을 수 없습니다.", 404));

    // Check view permission
    boolean isDrafter = document.getDrafter().getId().equals(userId);
    boolean isApprovalParticipant = approvalLineRepository.existsByDocumentIdAndApproverId(docId, userId);
    boolean isAdminSameDept = role == UserRole.ADMIN
            && departmentId != null
            && departmentId.equals(document.getDrafter().getDepartmentId());
    boolean isSuperAdmin = role == UserRole.SUPER_ADMIN;

    if (!isDrafter && !isApprovalParticipant && !isAdminSameDept && !isSuperAdmin) {
        throw new BusinessException("DOC_ACCESS_DENIED", "문서 조회 권한이 없습니다.", 403);
    }
    // ...
}
```

**복제 포인트:** 4 개 boolean → 4 개 QueryDSL predicate 로 **기계적 번역**. 각 조건의 **의미론을 1:1 유지**. 번역 맵:
- `isDrafter` → `doc.drafterId.eq(userId)` (`ownDoc`)
- `isApprovalParticipant` → `JPAExpressions.selectOne().from(approvalLine).where(...).exists()` (서브쿼리, 기존 `existsByDocumentIdAndApproverId` 동형)
- `isAdminSameDept` → `"ADMIN".equals(role)` 외부 if + `doc.drafterId.in(JPAExpressions.select(u.id).from(u).where(u.departmentId.eq(departmentId)))`
- `isSuperAdmin` → 외부 if `"SUPER_ADMIN".equals(role)` — predicate **생략 (skip)**

**Research Example 1 (L642-751)** 가 이미 완성된 QueryDSL 버전을 제공 — planner/executor 는 해당 스니펫을 그대로 삽입.

#### 1E. 참조 `JPQL EXISTS approval_line` 유사 선례 — `ApprovalLineRepository.java:43-49`

```java
// backend/src/main/java/com/micesign/repository/ApprovalLineRepository.java:43-49
@Query("SELECT COUNT(al) FROM ApprovalLine al JOIN al.document d " +
       "WHERE al.approver.id = :userId " +
       "AND al.status = com.micesign.domain.enums.ApprovalLineStatus.PENDING " +
       "AND al.lineType IN (com.micesign.domain.enums.ApprovalLineType.APPROVE, com.micesign.domain.enums.ApprovalLineType.AGREE) " +
       "AND d.status = com.micesign.domain.enums.DocumentStatus.SUBMITTED " +
       "AND d.currentStep = al.stepOrder")
long countPendingByApproverId(@Param("userId") Long userId);
```

**비교 포인트:** 본 phase 의 FSD predicate 는 **필터 없음** — D-A3 per `al.document_id = d.id AND al.approver_id = :userId` 만 검사. APPROVE/AGREE/REFERENCE 모든 타입, PENDING/APPROVED/REJECTED/SKIPPED 모든 상태 포함. 위 예시는 **반대로 필터를 많이 적용한 케이스** — predicate 단순함을 강조하는 대조 참조.

---

### [PR1] 2. `DocumentSearchCondition` record 개편

#### 2A. 현재 record — `DocumentSearchCondition.java:1-12`

```java
// backend/src/main/java/com/micesign/dto/document/DocumentSearchCondition.java:1-12
package com.micesign.dto.document;

import java.time.LocalDate;

public record DocumentSearchCondition(
    String keyword,        // search title, docNumber, drafterName
    String status,         // filter by DocumentStatus
    String templateCode,   // filter by template
    LocalDate dateFrom,
    LocalDate dateTo,
    String tab             // 'my', 'department', 'all'
) {}
```

#### 2B. 대상 shape (Research Example 2 L754-777 + D-B4)

```java
// 목표 — Research §Code Examples Example 2 (L754-777)
public record DocumentSearchCondition(
    String keyword,
    List<DocumentStatus> statuses,   // String → List<Enum>
    String templateCode,
    LocalDate dateFrom,
    LocalDate dateTo,
    String tab,
    Long drafterId                    // 신규
) {
    // Compact constructor — null → emptyList (Pitfall 9 방지)
    public DocumentSearchCondition {
        if (statuses == null) statuses = Collections.emptyList();
    }
}
```

**복제 포인트:** `DocumentService.getMyDocuments` 의 시그니처 `getMyDocuments(Long userId, List<DocumentStatus> statuses, Pageable pageable)` — 이미 `List<DocumentStatus>` 관례 존재. record 의 `List<Enum>` 은 동일 관례 준수.

#### 2C. Controller 호출부 영향 (MODIFY L66-67 + L137-138)

```java
// backend/src/main/java/com/micesign/controller/DocumentController.java:66-67 (getMyDocuments)
DocumentSearchCondition condition = new DocumentSearchCondition(
        null, status, null, null, null, "my");
// ↓ 필드 순서 변경 + statuses/drafterId 적용
// 예시 변경:
// List<DocumentStatus> statuses = (status != null) ? List.of(DocumentStatus.valueOf(status)) : List.of();
// DocumentSearchCondition condition = new DocumentSearchCondition(
//         null, statuses, null, null, null, "my", null);
```

**주의:** `getMyDocuments` 는 Phase 30 scope 밖 (D-D7) — 리포지터리에서 다른 메서드 사용. 단, record 필드 순서 바뀌므로 **compile error 회피용** 최소 수정 필수. 테스트: 기존 `DocumentControllerTest.java` 가 `/documents/my` 를 테스트한다면 regression 자동 감지.

---

### [PR1] 3. `DocumentController.searchDocuments` @RequestParam + 수동 enum 변환

#### 3A. 현재 시그니처 — `DocumentController.java:116-144`

```java
// backend/src/main/java/com/micesign/controller/DocumentController.java:116-144
@GetMapping("/search")
public ResponseEntity<ApiResponse<Page<DocumentResponse>>> searchDocuments(
        @RequestParam(required = false) String keyword,
        @RequestParam(required = false) String status,
        @RequestParam(required = false) String templateCode,
        @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateFrom,
        @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateTo,
        @RequestParam(defaultValue = "my") String tab,
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "20") int size,
        @AuthenticationPrincipal CustomUserDetails user) {

    UserRole role = UserRole.valueOf(user.getRole());

    // RBAC enforcement for ALL tab
    if ("all".equalsIgnoreCase(tab)) {
        if (role != UserRole.SUPER_ADMIN && role != UserRole.ADMIN) {
            throw new BusinessException("AUTH_FORBIDDEN", "권한이 없습니다.", 403);
        }
    }

    DocumentSearchCondition condition = new DocumentSearchCondition(
            keyword, status, templateCode, dateFrom, dateTo, tab);
    PageRequest pageable = PageRequest.of(page, size);

    Page<DocumentResponse> result = documentService.searchDocuments(
            condition, user.getUserId(), role, user.getDepartmentId(), pageable);
    return ResponseEntity.ok(ApiResponse.ok(result));
}
```

**복제 포인트:** RBAC 403 가드 (L131-135) **그대로 유지 (D-A7)**. `@AuthenticationPrincipal CustomUserDetails user`, `UserRole.valueOf` 패턴 유지.

#### 3B. 대상 shape — Research Pattern 3 Option A (L329-358)

```java
// Research §Pattern 3 Option A — 수동 enum 변환
@RequestParam(name = "status", required = false) List<String> rawStatuses,
@RequestParam(required = false) Long drafterId,
// ...
List<DocumentStatus> statuses;
if (rawStatuses == null || rawStatuses.isEmpty()) {
    statuses = Collections.emptyList();
} else {
    try {
        statuses = rawStatuses.stream()
            .filter(s -> s != null && !s.isBlank())   // Pitfall 9: 빈 문자열 필터링
            .map(DocumentStatus::valueOf)
            .toList();
    } catch (IllegalArgumentException ex) {
        throw new BusinessException("VALIDATION_ERROR",
            "상태 값이 올바르지 않습니다: " + rawStatuses, 400);
    }
}
// ...
DocumentSearchCondition condition = new DocumentSearchCondition(
        keyword, statuses, templateCode, dateFrom, dateTo, tab, drafterId);
```

**비교 참조 (role-match) — `UserManagementController.getUsers` L30-38:**

```java
// backend/src/main/java/com/micesign/controller/UserManagementController.java:30-38
@GetMapping
public ApiResponse<Page<UserListResponse>> getUsers(
        @RequestParam(required = false) String keyword,
        @RequestParam(required = false) Long departmentId,
        @RequestParam(required = false) UserRole role,      // ← 단일 enum 자동 바인딩
        @RequestParam(required = false) UserStatus status,  // ← 단일 enum 자동 바인딩
        @PageableDefault(size = 20) Pageable pageable) {
    return ApiResponse.ok(userManagementService.getUsers(keyword, departmentId, role, status, pageable));
}
```

**주의:** 위 `UserRole role`/`UserStatus status` 직접 바인딩은 **단일 enum** 이라 Spring 이 자동 변환 — 잘못된 값 전달 시 `MethodArgumentTypeMismatchException` 발생 → 프로젝트에 핸들러 없으니 500 유출. **본 phase 는 일부러 수동 변환** 채택(Option A) — 한국어 메시지 통제 + 핸들러 추가 의존 없음. Option B 의 `MethodArgumentTypeMismatchException` 핸들러는 부가로 `GlobalExceptionHandler` 에 추가 권장 (Section 4 참조).

---

### [PR1] 4. `GlobalExceptionHandler` 에 enum 핸들러 추가 (선택)

#### 4A. 현재 구조 — `GlobalExceptionHandler.java:1-51`

```java
// backend/src/main/java/com/micesign/common/exception/GlobalExceptionHandler.java:1-51
@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(BusinessException.class)
    public ResponseEntity<ApiResponse<?>> handleBusiness(BusinessException ex) {
        log.warn("BusinessException [{}]: {}", ex.getCode(), ex.getMessage(), ex);
        return ResponseEntity.status(ex.getHttpStatus()).body(ApiResponse.error(ex.getCode(), ex.getMessage()));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiResponse<?>> handleValidation(MethodArgumentNotValidException ex) {
        String message = ex.getBindingResult().getFieldErrors().stream()
            .map(e -> e.getField() + ": " + e.getDefaultMessage())
            .collect(Collectors.joining(", "));
        return ResponseEntity.badRequest().body(ApiResponse.error("VALIDATION_ERROR", message));
    }

    // ...
    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiResponse<Void>> handleException(Exception ex) {
        log.error("Unhandled exception: {} - {}", ex.getClass().getName(), ex.getMessage(), ex);
        return ResponseEntity
            .status(HttpStatus.INTERNAL_SERVER_ERROR)
            .body(ApiResponse.error("SYS_001", "서버 내부 오류가 발생했습니다."));
    }
}
```

**복제 포인트:**
- `@ExceptionHandler` 위치 (BusinessException 다음 줄)
- `ApiResponse.error("VALIDATION_ERROR", ...)` + `ResponseEntity.badRequest()` 포맷
- `log.warn(...)` 우선 (error 가 아님 — 클라이언트 입력 오류는 서버 오류 아님)

#### 4B. 추가 핸들러 (Research Pattern 3 Option B)

```java
// Research §Pattern 3 Option B
@ExceptionHandler(org.springframework.web.method.annotation.MethodArgumentTypeMismatchException.class)
public ResponseEntity<ApiResponse<?>> handleTypeMismatch(
        org.springframework.web.method.annotation.MethodArgumentTypeMismatchException ex) {
    String message = String.format("파라미터 '%s' 의 값이 올바르지 않습니다: %s",
        ex.getName(), ex.getValue());
    log.warn("TypeMismatch on '{}' = '{}' (required type: {})",
        ex.getName(), ex.getValue(), ex.getRequiredType() != null ? ex.getRequiredType().getSimpleName() : "?");
    return ResponseEntity.badRequest().body(ApiResponse.error("VALIDATION_ERROR", message));
}
```

**복제 포인트:** 기존 `handleValidation` 의 로그 warn + ApiResponse.error 포맷 그대로. `ex.getName()`/`ex.getValue()` 는 Spring 6 API 표준.

---

### [PR1] 5. 권한 매트릭스 통합 테스트 fixture

#### 5A. `ApprovalWorkflowTest.setUp` — 다중 유저 seed 패턴 (analog 1순위) L55-86

```java
// backend/src/test/java/com/micesign/document/ApprovalWorkflowTest.java:55-86
@BeforeEach
void setUp() {
    // Phase 29 — notification_log 가 user FK 를 갖고 있어 stub mode 발송 시 INSERT 됨.
    jdbcTemplate.update("DELETE FROM notification_log");
    // Clean document data (order matters due to FK constraints)
    jdbcTemplate.update("DELETE FROM approval_line");
    jdbcTemplate.update("DELETE FROM document_attachment");
    jdbcTemplate.update("DELETE FROM document_content");
    jdbcTemplate.update("DELETE FROM document");
    jdbcTemplate.update("DELETE FROM doc_sequence");

    // Clean up test approver users (keep seed user id=1)
    jdbcTemplate.update("DELETE FROM \"user\" WHERE id IN (?, ?)", APPROVER_ID, APPROVER2_ID);

    // Insert test approver users
    jdbcTemplate.update(
            "INSERT INTO \"user\" (id, employee_no, name, email, password, department_id, position_id, role, status, failed_login_count, must_change_password) " +
                    "VALUES (?, 'APR001', '결재자1', 'approver1@micesign.com', '$2a$10$07mcjXBfvelJFwjs8DnoJOnEqprFy.dnQL1NdnRvlqEWwwmX62SOW', 2, 3, 'USER', 'ACTIVE', 0, FALSE)",
            APPROVER_ID);
    // ...

    drafterToken = tokenHelper.superAdminToken();
    approverToken = tokenHelper.tokenForRole(APPROVER_ID, "approver1@micesign.com", "결재자1",
            com.micesign.domain.enums.UserRole.USER, 2L);
    approver2Token = tokenHelper.tokenForRole(APPROVER2_ID, "approver2@micesign.com", "결재자2",
            com.micesign.domain.enums.UserRole.USER, 2L);
}
```

**복제 포인트:**
- `@SpringBootTest + @AutoConfigureMockMvc + @ActiveProfiles("test")` 3콤보 (DocumentSubmitTest L30-32 참조)
- cleanup 순서: notification_log → approval_line → document_attachment → document_content → document → doc_sequence → user (FK 역순). **notification_log 먼저 지우지 않으면 FK 에러** (Phase 29 hard lesson).
- seed 유저 `password = $2a$10$07mcjXBfvelJFwjs8DnoJOnEqprFy.dnQL1NdnRvlqEWwwmX62SOW` 재사용 (평문 불필요)
- `tokenHelper.tokenForRole(userId, email, name, UserRole, departmentId)` — Role + deptId 조합 자유 커스텀

#### 5B. Permission Matrix 28-case fixture 확장 (Research §Validation Architecture L1020-1045)

```
Dept 1: Alice(USER id=A=300L), Admin1(ADMIN id=E=310L)
Dept 2: Bob(USER id=B=301L), Charlie(USER id=C=302L), Admin2(ADMIN id=F=320L)
Dept 3: David(USER id=D=303L), SuperAdmin(id=G=1L, seed)

docs (drafter=A):
  doc_draft:     DRAFT,     approval_line=[]              (DRAFT 는 결재선 보통 없음)
  doc_submitted: SUBMITTED, approval_line=[APPROVE:B, AGREE:C, REFERENCE:D]
  doc_approved:  APPROVED,  same approval_line (all processed)
  doc_rejected:  REJECTED,  same approval_line (B rejected)

expected matrix (tab=search 기준, tab=my 는 본인 DRAFT 만 예외):
  A (self):                [draft: True(my)/False(search), submitted:T, approved:T, rejected:T]
  B (APPROVE approver):    [draft:F, submitted:T, approved:T, rejected:T]
  C (AGREE approver):      [draft:F, submitted:T, approved:T, rejected:T]
  D (REFERENCE):           [draft:F, submitted:T, approved:T, rejected:T]
  E (same dept ADMIN):     [draft:F(search), submitted:T, approved:T, rejected:T]
  F (other dept ADMIN):    [draft:F, submitted:F, approved:F, rejected:F]
                           EXCEPT: F 가 승인자/참조자로도 등록되면 T (테스트 케이스 분리)
  G (SUPER_ADMIN):         [draft:F(search), submitted:T, approved:T, rejected:T]
```

**주의:** CONTEXT.md `<specifics>` 는 `SUPER_ADMIN` 도 `tab=search` 에서 `draft:F` 명시 — D-A4 ("tab=my 에서만 본인 DRAFT 노출") 가 SUPER_ADMIN 에도 적용됨. Test 시 반드시 확인.

#### 5C. 400 VALIDATION_ERROR assert — `DocumentSubmitTest.java:150-165`

```java
// backend/src/test/java/com/micesign/document/DocumentSubmitTest.java:150-165
@Test
void submitAlreadySubmitted_returns400() throws Exception {
    // ...
    mockMvc.perform(post("/api/v1/documents/" + docId + "/submit")
            .header("Authorization", "Bearer " + token))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.error.code").value("DOC_NOT_DRAFT"));
}
```

**복제 포인트:** `DocumentSearchInvalidEnumTest` 의 모든 assert 는 `status().isBadRequest()` + `jsonPath("$.error.code").value("VALIDATION_ERROR")` 로 통일. 500 이 절대 나오면 안 됨 — Pitfall 2 방어.

---

### [PR2] 6. `UserSearchController` 신설 (공개 엔드포인트)

#### 6A. 선례 analog — `OrganizationController.java:1-36` (공개 컨트롤러)

```java
// backend/src/main/java/com/micesign/controller/OrganizationController.java:1-36
/**
 * Public organization endpoints accessible to all authenticated users.
 * Used by OrgTreePickerModal for approval line selection.
 * Unlike DepartmentController (/api/v1/admin/departments), no ADMIN role required.
 */
@RestController
@RequestMapping("/api/v1/organization")
public class OrganizationController {

    private final DepartmentService departmentService;

    public OrganizationController(DepartmentService departmentService) {
        this.departmentService = departmentService;
    }

    @GetMapping("/departments")
    public ApiResponse<List<DepartmentTreeResponse>> getDepartmentTree() {
        return ApiResponse.ok(departmentService.getDepartmentTree(false));
    }

    @GetMapping("/departments/{id}/members")
    public ApiResponse<List<DepartmentMemberResponse>> getDepartmentMembers(@PathVariable Long id) {
        return ApiResponse.ok(departmentService.getDepartmentMembers(id));
    }
}
```

**복제 포인트:**
- `@RestController + @RequestMapping("/api/v1/users")` (또는 `/users/search` 단일 엔드포인트만 노출)
- `@PreAuthorize` **미부착** = 인증된 모든 사용자 접근 (JWT 필터 통과하면 통과)
- 주석에 명시: "Unlike UserManagementController (/api/v1/admin/users), no ADMIN role required — used by DrafterCombo"

#### 6B. 대상 shape

```java
@RestController
@RequestMapping("/api/v1/users")
public class UserSearchController {

    private final UserSearchService userSearchService;

    public UserSearchController(UserSearchService userSearchService) {
        this.userSearchService = userSearchService;
    }

    @GetMapping("/search")
    public ApiResponse<List<UserSearchResponse>> searchUsers(
            @RequestParam(required = false) String q,
            @RequestParam(defaultValue = "20") int size) {
        return ApiResponse.ok(userSearchService.searchUsers(q, size));
    }
}
```

**주의:**
- 반환형 `List<UserSearchResponse>` (Page 아님) — 자동완성 용도, 단일 페이지면 충분
- `size` upper bound 권장 (예: 50 상한) — service 에서 `Math.min(size, 50)` 적용

---

### [PR2] 7. `UserSearchResponse` DTO

#### 7A. 선례 — `UserListResponse.java:1-12`

```java
// backend/src/main/java/com/micesign/dto/user/UserListResponse.java:1-12
public record UserListResponse(
    Long id,
    String employeeNo,
    String name,
    String email,
    String departmentName,
    String positionName,
    String role,
    String status
) {}
```

#### 7B. 대상 shape (민감 정보 배제, Open Q1)

```java
public record UserSearchResponse(
    Long id,
    String name,
    String departmentName
) {}
```

**복제 포인트:** `record` 스타일 retention. 민감 필드 (`email`, `phone`, `role`, `employeeNo`) **제외** — FSD 가시성 최소 공개. Open Q1 recommendation 따름.

---

### [PR2] 8. `UserSearchService`

#### 8A. 선례 — `UserManagementService.getUsers L49-54`

```java
// backend/src/main/java/com/micesign/service/UserManagementService.java:49-54
public Page<UserListResponse> getUsers(String keyword, Long departmentId,
                                        UserRole role, UserStatus status,
                                        Pageable pageable) {
    Specification<User> spec = UserSpecification.withFilters(keyword, departmentId, role, status);
    return userRepository.findAll(spec, pageable).map(userMapper::toListResponse);
}
```

#### 8B. 선례 — `UserSpecification.withFilters L20-26` (keyword OR 패턴)

```java
// backend/src/main/java/com/micesign/specification/UserSpecification.java:20-26
if (keyword != null && !keyword.isBlank()) {
    String pattern = "%" + keyword.toLowerCase() + "%";
    Predicate nameLike = cb.like(cb.lower(root.get("name")), pattern);
    Predicate emailLike = cb.like(cb.lower(root.get("email")), pattern);
    Predicate employeeNoLike = cb.like(cb.lower(root.get("employeeNo")), pattern);
    predicates.add(cb.or(nameLike, emailLike, employeeNoLike));
}
```

**복제 포인트:** `@Service @Transactional(readOnly = true)` 관례. Specification 재사용. **status = ACTIVE 필터 강제** (inactive 사용자 노출 금지).

#### 8C. 대상 shape

```java
@Service
@Transactional(readOnly = true)
public class UserSearchService {

    private final UserRepository userRepository;

    public UserSearchService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    public List<UserSearchResponse> searchUsers(String q, int size) {
        int limit = Math.min(Math.max(size, 1), 50);
        // ACTIVE 만 + keyword nullable
        Specification<User> spec = UserSpecification.withFilters(q, null, null, UserStatus.ACTIVE);
        Pageable page = PageRequest.of(0, limit);
        return userRepository.findAll(spec, page)
                .map(u -> new UserSearchResponse(
                        u.getId(),
                        u.getName(),
                        u.getDepartment() != null ? u.getDepartment().getName() : null))
                .getContent();
    }
}
```

---

### [PR2] 9. 프론트 `apiClient` paramsSerializer 추가

#### 9A. 현재 구조 — `frontend/src/api/client.ts:1-13`

```typescript
// frontend/src/api/client.ts:1-13
import axios from 'axios';
import type { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '../stores/authStore';
import type { ApiResponse, ErrorDetail } from '../types/api';
import type { RefreshResponse } from '../types/auth';

const apiClient = axios.create({
  baseURL: '/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});
```

#### 9B. 대상 shape (Research Pattern 5 Option B — 의존성 zero)

```typescript
// frontend/src/api/client.ts (MODIFY)
const apiClient = axios.create({
  baseURL: '/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
  paramsSerializer: {
    serialize: (params) => {
      const sp = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value === null || value === undefined) return;
        if (Array.isArray(value)) {
          value.forEach((v) => {
            if (v !== null && v !== undefined && v !== '') sp.append(key, String(v));
          });
        } else if (value !== '') {
          sp.append(key, String(value));
        }
      });
      return sp.toString();
    },
  },
});
```

**복제 포인트:**
- axios.create 블록 내부에만 추가, interceptor 는 **무변경**
- Research Pattern 5 Pitfall 3 방어: `null/undefined/''` 모두 skip — 기존 기본 axios 동작 재현
- `qs` 의존성 회피 (Option B — 의존성 최소 원칙)

**호환성 영향 (Research Finding 10.1 + §Pattern 5):** 프로젝트 내 기존 배열 파라미터 사용 **0건** 확인 — 단일 값 API 는 기존과 동일 직렬화.

---

### [PR2] 10. 프론트 `DocumentSearchParams` 확장

#### 10A. 현재 — `frontend/src/features/document/types/document.ts:149-158`

```typescript
// frontend/src/features/document/types/document.ts:149-158
export interface DocumentSearchParams {
  keyword?: string;
  status?: string;
  templateCode?: string;
  dateFrom?: string;
  dateTo?: string;
  tab?: string;
  page?: number;
  size?: number;
}
```

#### 10B. 대상 shape

```typescript
export interface DocumentSearchParams {
  keyword?: string;
  statuses?: DocumentStatus[];   // string → DocumentStatus[]
  templateCode?: string;
  dateFrom?: string;
  dateTo?: string;
  tab?: 'my' | 'search';         // Literal union — 프론트 기준
  page?: number;
  size?: number;
  drafterId?: number;             // 신규
}
```

**주의:**
- `tab` 은 프론트 literal `'my' | 'search'`, 서버는 여전히 `'my' | 'all'` 수용 — `documentApi.ts` 에서 매핑 (D-C5)
- `statuses` 는 항상 배열 — `paramsSerializer` 가 `statuses=A&statuses=B` 로 직렬화 → 서버는 `status` 이름을 기대 → **`documentApi.ts` 에서 `status` key 로 re-map 필요** (Open Q2 resolution: URL 파라미터 이름 = 단수 `status`, 내부 필드명 = 복수 `statuses`)

---

### [PR2] 11. 프론트 `documentApi.searchDocuments` — params re-mapping

#### 11A. 현재 — `frontend/src/features/document/api/documentApi.ts:39-40`

```typescript
// frontend/src/features/document/api/documentApi.ts:39-40
searchDocuments: (params: DocumentSearchParams) =>
  apiClient.get<ApiResponse<PageResponse<DocumentResponse>>>(`${BASE}/search`, { params }),
```

#### 11B. 대상 shape (URL 파라미터 ↔ 내부 필드명 비대칭 매핑)

```typescript
// frontend/src/features/document/api/documentApi.ts (MODIFY)
searchDocuments: (params: DocumentSearchParams) => {
  const { statuses, tab, ...rest } = params;
  // D-C5: 프론트 'search' → 서버 'all'
  const serverTab = tab === 'search' ? 'all' : tab;
  // Open Q2: URL key = 단수 'status', 내부 = 'statuses'
  const apiParams = {
    ...rest,
    ...(statuses && statuses.length > 0 ? { status: statuses } : {}),
    ...(serverTab ? { tab: serverTab } : {}),
  };
  return apiClient.get<ApiResponse<PageResponse<DocumentResponse>>>(`${BASE}/search`, { params: apiParams });
},
```

**복제 포인트:** axios paramsSerializer 가 `status: ['A', 'B']` → `?status=A&status=B` 자동 직렬화.

---

### [PR2] 12. 프론트 `DocumentListPage` useSearchParams 전환 (핵심)

#### 12A. 현재 구조 (자기참조 analog) — `DocumentListPage.tsx:16-96`

```tsx
// frontend/src/features/document/pages/DocumentListPage.tsx:16-53 (발췌)
export default function DocumentListPage() {
  // ...
  const [page, setPage] = useState(0);
  const [activeTab, setActiveTab] = useState<TabMode>('my');
  const [keywordInput, setKeywordInput] = useState('');
  const [debouncedKeyword, setDebouncedKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [templateFilter, setTemplateFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  // Debounce keyword input
  useEffect(() => {
    debounceRef.current = setTimeout(() => {
      setDebouncedKeyword(keywordInput);
      setPage(0);
    }, 300);
    return () => clearTimeout(debounceRef.current);
  }, [keywordInput]);

  const isSearchActive = activeTab === 'search';

  const searchParams = useMemo<DocumentSearchParams>(() => {
    const params: DocumentSearchParams = { page, size: 20, tab: 'my' };
    if (debouncedKeyword) params.keyword = debouncedKeyword;
    if (statusFilter) params.status = statusFilter;
    if (templateFilter) params.templateCode = templateFilter;
    if (dateFrom) params.dateFrom = dateFrom;
    if (dateTo) params.dateTo = dateTo;
    return params;
  }, [page, debouncedKeyword, statusFilter, templateFilter, dateFrom, dateTo]);
```

**복제 포인트 (전환 시):**
- `useState` 8개 **삭제**, `keywordInput`/`debouncedKeyword` 만 로컬 state 유지 (debounce source/target 분리 용)
- `useMemo(filters)` 로직은 retain, source 만 `searchParams.get(...)` 로 교체

#### 12B. 대상 shape — Research Pattern 4 (L388-442) 에 정확한 스켈레톤

```tsx
// Research §Pattern 4 (L388-442) — 완성 스켈레톤
import { useSearchParams } from 'react-router';
import { useEffect, useMemo, useRef, useState } from 'react';

export default function DocumentListPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const filters = useMemo(() => ({
    tab: (searchParams.get('tab') ?? 'my') as 'my' | 'search',
    keyword: searchParams.get('keyword') ?? '',
    statuses: searchParams.getAll('status'),   // ← Pitfall 5: getAll, not get
    templateCode: searchParams.get('templateCode') ?? '',
    dateFrom: searchParams.get('dateFrom') ?? '',
    dateTo: searchParams.get('dateTo') ?? '',
    drafterId: searchParams.get('drafterId'),
    page: Number(searchParams.get('page') ?? '0'),
  }), [searchParams]);

  // Local input state for keyword (debounce source only)
  const [keywordInput, setKeywordInput] = useState(filters.keyword);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      if (keywordInput === filters.keyword) return;
      setSearchParams(prev => {                  // ← Pitfall 4: callback 패턴 필수
        const next = new URLSearchParams(prev);
        if (keywordInput) next.set('keyword', keywordInput);
        else next.delete('keyword');
        next.set('page', '0');
        return next;
      }, { replace: true });                    // ← history 오염 방지 (debounce only)
    }, 300);
    return () => clearTimeout(debounceRef.current);
  }, [keywordInput, filters.keyword, setSearchParams]);

  const updateFilter = (updates: Record<string, string | string[] | null>) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      Object.entries(updates).forEach(([key, value]) => {
        next.delete(key);
        if (Array.isArray(value)) {
          value.forEach(v => next.append(key, v));
        } else if (value !== null && value !== '') {
          next.set(key, value);
        }
      });
      next.set('page', '0');   // D-C8: filter change = page 0 reset
      return next;
    });
    // no { replace } — intentional history entry
  };

  // ...
}
```

**주의:**
- `setSearchParams(prev => ...)` **callback 패턴 필수** — 동일 tick 충돌 방지 (Pitfall 4)
- `searchParams.getAll('status')` (복수) — `.get('status')` 는 첫 값만 (Pitfall 5)
- 빈 값 → `delete` 로 URL 에서 제거 (D-C4)

#### 12C. 백엔드 `tab` 매핑 (D-C5)

`useSearchDocuments(filters)` 호출 시 `documentApi.searchDocuments` 가 내부적으로 `tab='search'` → `tab='all'` 변환 (Section 11B 참조).

---

### [PR2] 13. 프론트 `DrafterCombo` 컴포넌트

#### 13A. 선례 analog — `OrgTreePickerModal.tsx:1-90` (debounced search + useQuery)

```tsx
// frontend/src/features/approval/components/OrgTreePickerModal.tsx:1-90 (발췌)
import { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { organizationApi } from '../api/organizationApi';
// ...

export default function OrgTreePickerModal({
  open, onClose, onAdd, currentLineUserIds, drafterId, currentCount, maxCount = 10,
}: OrgTreePickerModalProps) {
  const { t } = useTranslation('approval');
  const [searchQuery, setSearchQuery] = useState('');
  const dialogRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Fetch department tree when modal opens
  const { data: tree } = useQuery({
    queryKey: ['department-tree-picker'],
    queryFn: async () => {
      const res = await organizationApi.getTree();
      return res.data.data;
    },
    enabled: open,
    staleTime: 5 * 60 * 1000,
  });
```

**복제 포인트:**
- `useState('')` + `useEffect` debounce 패턴 (본 프로젝트 관용구)
- `useQuery` `enabled` 로 조건부 호출 (빈 쿼리 방지)
- lucide-react icon 일관 (Search, X)
- i18n `useTranslation('document')` 네임스페이스 retention

#### 13B. Research §Pattern 3 Example (L782-846) — 완성 스켈레톤

```tsx
// Research §Pattern 3 Example 3 (L782-846)
interface DrafterComboProps {
  value: string | null;      // from URL searchParams
  onChange: (id: string | null, displayName?: string) => void;
}

export function DrafterCombo({ value, onChange }: DrafterComboProps) {
  const [query, setQuery] = useState('');
  const [candidates, setCandidates] = useState<UserSearchItem[]>([]);
  const [displayName, setDisplayName] = useState('');

  // Load display name when value changes from URL
  useEffect(() => {
    if (value && !displayName) {
      userApi.getById(Number(value)).then(r => setDisplayName(r.data.data.name));
    }
    if (!value) setDisplayName('');
  }, [value]);

  // Debounced query
  useEffect(() => {
    if (!query || query.length < 2) { setCandidates([]); return; }
    const t = setTimeout(() => {
      userApi.search(query, 20).then(r => setCandidates(r.data.data));
    }, 300);
    return () => clearTimeout(t);
  }, [query]);
  // ...
}
```

**주의:** `query.length < 2` 가드 — 1자 쿼리 방지 (과도한 API 호출 예방). 기존 `OrgTreePickerModal` 는 클라이언트 필터라 가드 없음.

---

### [PR2] 14. 프론트 `userSearchApi` 클라이언트

#### 14A. 선례 — `frontend/src/features/approval/api/organizationApi.ts:1-14`

```typescript
// frontend/src/features/approval/api/organizationApi.ts:1-14
import apiClient from '../../../api/client';
import type { ApiResponse } from '../../../types/api';
import type { DepartmentTreeNode, DepartmentMember } from '../../../types/admin';

const BASE = '/organization';

export const organizationApi = {
  getTree: () =>
    apiClient.get<ApiResponse<DepartmentTreeNode[]>>(`${BASE}/departments`),

  getMembers: (id: number) =>
    apiClient.get<ApiResponse<DepartmentMember[]>>(`${BASE}/departments/${id}/members`),
};
```

#### 14B. 대상 shape

```typescript
// frontend/src/features/document/api/userSearchApi.ts (NEW)
import apiClient from '../../../api/client';
import type { ApiResponse } from '../../../types/api';

export interface UserSearchItem {
  id: number;
  name: string;
  departmentName: string | null;
}

const BASE = '/users';

export const userSearchApi = {
  search: (q: string, size: number = 20) =>
    apiClient.get<ApiResponse<UserSearchItem[]>>(`${BASE}/search`, { params: { q, size } }),

  getById: (id: number) =>
    apiClient.get<ApiResponse<UserSearchItem>>(`${BASE}/${id}`),   // 별도 엔드포인트 필요 여부는 planner 결정
};
```

**주의:** `getById` 는 선택 — DrafterCombo 가 URL 의 `drafterId` 로 displayName 복구 시 필요. 대안: 선택 시 displayName 을 `sessionStorage` 에 캐시.

---

### [PR2] 15. 프론트 테스트 스켈레톤

#### 15A. 선례 — `frontend/src/features/approval/components/__tests__/ApprovalLineEditor.test.tsx:1-26`

```tsx
// frontend/src/features/approval/components/__tests__/ApprovalLineEditor.test.tsx:1-26
import { describe, it } from 'vitest';

describe('ApprovalLineEditor', () => {
  it.todo('renders empty state when no approvers added');
  it.todo('calls onAdd when user is selected from org picker');
  // ...
});
```

**복제 포인트:** `it.todo(...)` 로 테스트 케이스 outline 먼저 작성, 구현은 PR2 후반부. Phase 30 에서는 실제 구현 필수 (Research §Validation Architecture).

#### 15B. `frontend/vitest.config.ts:1-19` (확인)

```typescript
// frontend/vitest.config.ts:1-19
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
  },
  // ...
});
```

**주의:** `environment: 'jsdom'` + `globals: true` (vi/describe/it/expect 전역 노출). setup 은 `@testing-library/jest-dom/vitest` 만 (L1).

---

## Shared Patterns (Cross-cutting)

### SP-1. 백엔드 — `ApiResponse.error(code, message)` 포맷 통일

**Source:** `common/dto/ApiResponse.java` (BusinessException 핸들러 L22-25 에서 사용)
**Apply to:** 모든 컨트롤러 에러 응답 (UserSearchController 포함)

```java
return ResponseEntity.badRequest().body(ApiResponse.error("VALIDATION_ERROR", message));
```

에러 code 는 영문 상수, message 는 한국어. FSD §12.2 에러 코드 체계.

### SP-2. 백엔드 — `@AuthenticationPrincipal CustomUserDetails` + `UserRole.valueOf`

**Source:** `DocumentController.java:126-128`
**Apply to:** 모든 인증 필요 컨트롤러 메서드 (UserSearchController 도 동일)

```java
@AuthenticationPrincipal CustomUserDetails user
// ...
UserRole role = UserRole.valueOf(user.getRole());
```

### SP-3. 백엔드 테스트 — `@SpringBootTest + @AutoConfigureMockMvc + @ActiveProfiles("test")` 3콤보

**Source:** `DocumentSubmitTest.java:30-32`, `ApprovalWorkflowTest.java:30-32`
**Apply to:** 모든 Phase 30 통합 테스트 (DocumentSearch*Test, UserSearchControllerTest)

### SP-4. 백엔드 테스트 — cleanup 순서 FK 역순 (notification_log 먼저)

**Source:** `ApprovalWorkflowTest.setUp L55-70`
**Apply to:** 모든 Phase 30 통합 테스트
**Why:** Phase 29 이후 `notification_log` 이 user FK 로 이벤트 발송 시 INSERT — 먼저 지우지 않으면 FK 에러.

```java
jdbcTemplate.update("DELETE FROM notification_log");
jdbcTemplate.update("DELETE FROM approval_line");
jdbcTemplate.update("DELETE FROM document_attachment");
jdbcTemplate.update("DELETE FROM document_content");
jdbcTemplate.update("DELETE FROM document");
jdbcTemplate.update("DELETE FROM doc_sequence");
jdbcTemplate.update("DELETE FROM \"user\" WHERE id IN (...)");
```

### SP-5. 프론트 — TanStack Query 키 `[scope, subscope, params]`

**Source:** `useDocuments.ts:12, 20, 29`
**Apply to:** Phase 30 의 모든 신규 훅

```typescript
useQuery({
  queryKey: ['documents', 'search', params],       // 기존
  queryKey: ['users', 'search', q, size],          // 신규
  queryKey: ['users', 'detail', id],               // 신규 (DrafterCombo displayName 복구)
});
```

### SP-6. 프론트 — i18n `useTranslation('document')` 네임스페이스

**Source:** `DocumentListPage.tsx:17`, `OrgTreePickerModal.tsx:51`
**Apply to:** 신규 `DrafterCombo`, `StatusFilterPills` — 각 기존 네임스페이스 retention (document / approval).

### SP-7. 프론트 — Tailwind 클래스 규격

**Source:** `DocumentListPage.tsx` L107-110 (blue-600/hover:blue-700 primary), L151 (h-10 input), L164-165 (h-9 select)
**Apply to:** 신규 `DrafterCombo`, `StatusFilterPills` — 높이/패딩/색상 일관.

---

## No-Analog / From-Scratch

| 파일 | Role | 대응 |
|------|------|-----|
| `SearchBenchmarkSeeder.java` (또는 `tools/seed/bench-seed.sql`) | 10K seed utility | **no-analog** — 리포에 `CommandLineRunner` / `@Profile("bench")` 선례 0건. Research §Code Examples #4 (L850-877) 의 스켈레톤 채택. SQL seed 대안은 `V1__create_schema.sql` + `V2__seed_initial_data.sql` 의 `INSERT INTO ... VALUES (...)` 스타일 참고. `tools/seed/` 디렉토리는 신규 생성 (Flyway 와 분리). |
| `frontend/src/api/__tests__/apiClient.test.ts` | paramsSerializer unit test | **role-match** — 프론트 pure unit 테스트는 `frontend/src/features/admin/presets/presets.test.ts` 만 유사. Vitest `describe` + `expect(sp.toString()).toBe(...)` 스타일로 작성. paramsSerializer 는 pure function 이므로 jsdom 환경 의존 없음. |
| `V20__*.sql` | 복합 인덱스 추가 | 조건부 (EXPLAIN 결과 필요 시) — 스타일은 `V13__add_doc_sequence_unique_constraint.sql` + `V19__add_notification_dedup_unique.sql` 참조. `ALTER TABLE document ADD INDEX idx_status_submitted (status, submitted_at DESC)` 단일 라인. **D-D1 원칙:** 실측 후 결정, 불필요 시 생략. |

---

## Pitfall Re-check (from RESEARCH.md §Common Pitfalls)

| # | Pitfall | 적용 파일 | Defense |
|---|---------|----------|---------|
| 1 | `BooleanBuilder.and(null)` silently drops | `DocumentRepositoryCustomImpl` | role null-check 는 Controller 의 `UserRole.valueOf(...)` 가 fail-fast — 이미 guard. 테스트에서 28-case matrix 전체 통과로 회귀 검증. |
| 2 | `MethodArgumentTypeMismatchException` → 500 유출 | `DocumentController`, `GlobalExceptionHandler` | Option A (수동 valueOf + try/catch) + Option B (`handleTypeMismatch` 핸들러 보강) 둘 다 적용. `DocumentSearchInvalidEnumTest` 로 400 assert. |
| 3 | axios paramsSerializer 다른 API 파괴 | `frontend/src/api/client.ts` | null/undefined/'' skip — 기존 기본 axios 동작 재현. 프로젝트 내 배열 param 사용 0건 (grep 검증) → 호환성 영향 없음. `apiClient.test.ts` 로 단일값/배열값 양쪽 assert. |
| 4 | `setSearchParams(prev => ...)` 동시 호출 | `DocumentListPage.tsx` | callback 패턴 일관 사용. Clear 버튼과 debounce 분리 — debounce 는 `{ replace: true }`, Clear 는 push. |
| 5 | `getAll('status')` vs `get('status')` | `DocumentListPage.tsx` | `statuses` 는 항상 `getAll`, 단일 필드(`keyword`, `templateCode`, ...)만 `get`. |
| 6 | `deleteByDocumentId` 호출 규약 위반 | ApprovalService (감사) | Finding 9.1 — 현재 호출처 2곳 (DocumentService L188 update DRAFT, L245 delete DRAFT) 모두 DRAFT 제한. Phase 30 은 read-only 라 직접 영향 없음. Matrix test 에 "SKIPPED 라인 접근자도 검색 가능" 케이스 포함. |
| 7 | `countDistinct` + `ORDER BY` | `DocumentRepositoryCustomImpl` count query | count 쿼리에 orderBy 절대 없음 (기존 L82-89 + content L95-119 분리 — 이미 안전). |
| 8 | keyword LIKE `%...%` 인덱스 미스 | `DocumentRepositoryCustomImpl` | 권한/tab/status/date 가 먼저 row 축소 → keyword 는 작은 set 에 적용. EXPLAIN 으로 검증 (D-D1). |
| 9 | `?status=` 빈 값 → `[""]` | `DocumentController` 수동 변환 | `.filter(s -> s != null && !s.isBlank())` 로 빈 문자열 필터링. |
| 10 | `tab=all` 우회 시도 | `DocumentController` L131-135 + QueryDSL predicate | 이중 방어 유지 — Controller 403 가드 + 쿼리 predicate 자동 좁힘. |

---

## Canonical Reference Links

**CONTEXT.md Canonical References 재확인:**
- `docs/FSD_MiceSign_v1.0.md` §FN-SEARCH-001 (L1535-1576) — **4-브랜치 권한 predicate 원문**
- `backend/src/main/java/com/micesign/service/DocumentService.java:203-223` — 4-브랜치 Java 참조 구현
- `backend/src/main/java/com/micesign/repository/DocumentRepositoryCustomImpl.java:29-122` — 수정 대상 본체
- `backend/src/main/resources/db/migration/V1__create_schema.sql:94-118, 137-153` — 기존 인덱스 정의
- `.planning/phases/29-smtp-retrofit/29-*-PLAN.md` — Phase 29 테스트 fixture 스타일 원본

---

## PATTERN MAPPING COMPLETE

**Phase:** 30 — 검색 권한 WHERE 절 보안 수정 + 필터 확장
**Files classified:** 23 (new 14 / modify 9)
**Analogs found:** 21 exact+role-match / 23 total
**No-analog:** 2 (SearchBenchmarkSeeder, apiClient.test.ts 부분)

### Coverage
- 정확 analog (self-ref 또는 exact role+flow): **12**
- Role-match analog (role 같고 data flow 인접): **9**
- No-analog: **2**
- Hybrid (복수 analog 조합): **3** — `DocumentRepositoryCustomImpl` (자기참조 + getDocument + ApprovalLineRepository), `UserSearchController` (OrganizationController + UserManagementController), `DocumentListPage` (자기참조 + Research skeleton)

### Key Patterns Identified
- QueryDSL BooleanBuilder + `JPAExpressions.selectOne().from(...).exists()` 서브쿼리 (신규) + `JPAExpressions.select(u.id).from(u).where(...)` IN 서브쿼리 (신규) — `DocumentRepositoryCustomImpl.java` 기존 구조 유지 + FSD 4-브랜치 predicate 삽입.
- Spring `@RequestParam List<String>` + 수동 `DocumentStatus.valueOf` + `BusinessException("VALIDATION_ERROR", ...)` — Pitfall 2 방어.
- `@SpringBootTest + @AutoConfigureMockMvc + @ActiveProfiles("test")` + `JdbcTemplate cleanup FK 역순` + `TestTokenHelper.tokenForRole(userId, email, name, role, deptId)` — Phase 29 계승 fixture 스타일.
- React Router v7 `useSearchParams` callback 패턴 + 300ms debounce + `{ replace: true }` — Research Pattern 4 skeleton 채택.
- axios 1.x `paramsSerializer: { serialize: URLSearchParams-based }` — `qs` 의존 회피 (Option B).
- `OrganizationController` 공개 엔드포인트 패턴 (`@RequestMapping` w/o `@PreAuthorize`) — `UserSearchController` 신설 템플릿.

### File Created
`.planning/phases/30-where/30-PATTERNS.md`

### Ready for Planning
패턴 매핑 완료. Planner 는 각 Plan action 섹션에서 본 문서의 파일·라인 번호 인용 (예: "copy `DocumentRepositoryCustomImpl.java:57-66` keyword OR 블록 그대로") 가능. Phase 30 핵심 결정사항 모두 analog + code excerpt + pitfall 로 연결됨.

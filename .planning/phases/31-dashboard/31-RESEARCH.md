# Phase 31: 대시보드 고도화 - Research

**Researched:** 2026-04-24
**Domain:** Spring Boot 3.5 / Hibernate 6 + JPA / MariaDB 10.11 WITH RECURSIVE CTE · TanStack Query v5 invalidateQueries + placeholderData · React Testing Library mutation spy · role-based aggregation integration test
**Confidence:** HIGH (모든 주요 의사결정이 코드 레벨로 교차 검증됨)

---

## Summary

Phase 31 은 "대시보드 4카드 + 권한 스코프 확장 + 실시간 갱신" 의 **retrofit 마일스톤**이지만, 단순 FE 작업이 아니다. 백엔드 3대 변경이 동반된다: (1) `DashboardSummaryResponse` 에 `rejectedCount` 추가 + `completedCount` semantics 재정의, (2) `DashboardService` 에 role-based 권한 분기 추가, (3) **부서 계층 재귀 CTE** 를 통한 descendant 부서 집합 수집. FE 쪽은 `['dashboard', 'summary']` 단일 queryKey 로 3 훅 통합, 4 mutation 의 onSuccess 에 `['dashboard']` prefix invalidate 추가, skeleton/empty/error UI 통일이 핵심이다.

**핵심 블로킹 결정 (D-A9)** — Phase 30 의 `DocumentRepositoryCustomImpl.java` 는 이미 운영 중이며 **단일 부서 predicate** 를 사용하고 있다 (`drafter.departmentId.eq(departmentId)`, line 75-78). Phase 31 의 계층 재귀 스코프와 불일치하므로 "대시보드 숫자 ≠ 검색 결과" 버그가 확정적이다. 본 research 는 **Option 1 (Phase 30 predicate 를 계층 재귀로 upgrade)** 를 권장한다 — `DepartmentService.findDescendantIds(Long)` 유틸을 만들어 Phase 30 `DocumentRepositoryCustomImpl` + Phase 31 `DashboardService` 양쪽에서 공용하는 방식이다. 이는 SoT 확보 + v1.3 부서 통계/문서함 등 후속 재사용의 기반이 된다.

**Primary recommendation:**
- 부서 계층은 **MariaDB `WITH RECURSIVE` + `@Query(nativeQuery=true)`** 로 구현 (JPQL WITH 절은 Spring Data JPA 3.2 이하 호환 리스크) → `DepartmentRepository.findDescendantIds(Long)` 유틸 1개 노출 → `DashboardService` 와 Phase 30 `DocumentRepositoryCustomImpl` 모두 사용.
- FE 는 `['dashboard', 'summary']` 단일 키 + `placeholderData: (prev) => prev` + 4 mutation 에 `invalidateQueries({queryKey:['dashboard']})` 1줄 추가.
- 테스트는 **BE `@SpringBootTest` + `@AutoConfigureMockMvc` + `JdbcTemplate` 직접 seed** (Phase 29/30 패턴 그대로) + **FE `renderHook` + QueryClient spy 패턴**.

---

## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-A1** 4카드 라벨/데이터: 결재 대기(pendingCount) / 진행 중(submittedCount) / 승인 완료(approvedCount=APPROVED) / 반려(rejectedCount=REJECTED). REQUIREMENTS v1.2 우선 (FSD §FN-DASH-001 과 충돌).
- **D-A2** `DashboardSummaryResponse` DTO 변경: `rejectedCount` 신규 추가 + `completedCount` semantics 재정의 (APPROVED only). `draftCount` 필드는 유지 (FE 노출만 제거).
- **D-A3** drafts 카드 = 완전 제거 (FE only). `dashboard.drafts` i18n key 는 orphan 보존.
- **D-A4** 권한별 스코프:
  - USER: 본인 drafter_id 기준 (기존 그대로)
  - ADMIN: **본인 + 부서원(계층 재귀) 합산**
  - SUPER_ADMIN: 전사 스코프 (drafter 필터 zero)
- **D-A5** pending 카드도 ADMIN 부서 확장 적용 (approver 기준 본인 + 부서원 앞 PENDING 결재).
- **D-A6** 부서 계층 매칭 = **MariaDB `WITH RECURSIVE` CTE** (parent_id 재귀처리).
- **D-A7** UserStatus 필터링 = **ACTIVE/INACTIVE/RETIRED 모두 포함** (정책 없음).
- **D-A8** 카드 클릭 navigation URL = 스코프 분기:
  - USER: pending → `/approvals/pending`, 진행/승인/반려 → `/documents/my?status=...`
  - ADMIN/SUPER_ADMIN: pending → `/approvals/pending`, 진행/승인/반려 → `/documents?tab=search&status=...`
- **D-A9** Phase 30 predicate 계층 재귀 upgrade — planner 가 첫 task 로 결정 (본 research 가 Option 1 권장안 제시, 아래 §D-A9 Resolution 참조).
- **D-B1** queryKey 구조 = **`['dashboard', 'summary']` 단일 키**.
- **D-B2** 단일 endpoint 로 3위젯 통합 — `usePendingPreview`/`useRecentDocuments` 훅 제거, `useDashboardSummary` 1회 호출.
- **D-B3** mutation onSuccess 에 `['dashboard']` prefix invalidate 만 추가 (기존 `['approvals']`, `['documents']` 유지). 대상: `useApprove`, `useReject`, `useSubmitDocument`, `useWithdrawDocument`.
- **D-B4** `refetchInterval = 60_000` 유지 (fallback safety net).
- **D-B5** optimistic update = 사용 안 함.
- **D-B6** 3위젯 동시 invalidate → 단일 endpoint 호출 (waterfall 자연 해소).
- **D-B7** `placeholderData: (previousData) => previousData` 추가 (skeleton 플래시 방지).
- **D-C1** Empty state = Lucide 아이콘 + 한글 문구 패턴 (SVG 일러스트 도입 안 함).
- **D-C2** Error state 통일 UI = AlertTriangle + 한글 문구 + "다시 시도" 버튼 (3위젯 공통).
- **D-C3** 4카드 그리드 skeleton 재디자인, `grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6`.
- **D-C4** 4카드 색상/아이콘 매핑: 결재 대기(blue-500/Clock), 진행 중(gray-500/Hourglass), 승인 완료(green-500/CheckCircle2), 반려(red-500/XCircle).
- **D-C5** `useDashboardSummary` 통합으로 3위젯 isLoading 자동 동기화.
- **D-D1** CTA 구조 기존 유지 (단일 "새 문서 작성" + TemplateSelectionModal).
- **D-D2** 테스트 범위 = BE `DashboardServiceTest`/IntegrationTest (USER/ADMIN/SUPER_ADMIN × 4카드 × 부서 계층 matrix) + FE RTL (4 mutation onSuccess invalidate 단위) + DashboardPage smoke.
- **D-D3** 수동 UAT 핵심 5항 (4카드 가시성 × 3 role, mutation 실시간 갱신, skeleton, empty, error).
- **D-D4** PR = **단일 PR** (BE DTO + 권한 집계 + FE 4카드 + invalidate + empty/error + test 모두 1 PR).

### Claude's Discretion

- 부서 계층 재귀 SQL 구현 방식 (native CTE vs JPQL WITH vs QueryDSL) — 본 research 가 결정 (native CTE 권장).
- `DashboardSummaryResponse.draftCount` FE 타입 optional/required 표시 — planner.
- "진행 중" Lucide 아이콘 (Hourglass/Loader/Clock 변주) — UI-SPEC 에서 Hourglass 확정.
- Empty state 문구의 정확한 한글 카피 — UI-SPEC 에서 기존 키 재사용 확정.
- Phase 30 predicate 계층 재귀 upgrade 여부 (D-A9) — 본 research 가 Option 1 권장.
- CountCard 그리드 반응형 breakpoint 세부 — UI-SPEC 에서 `md:grid-cols-2 lg:grid-cols-4` 확정.
- `useDashboardSummary` 의 placeholderData 적용 여부 — 본 research 가 `(prev) => prev` 권장.
- Backend 테스트 프레임 선택 (@SpringBootTest vs @DataJpaTest vs MockMvc) — 본 research 가 Phase 29/30 패턴 `@SpringBootTest + @AutoConfigureMockMvc + JdbcTemplate seed` 권장.

### Deferred Ideas (OUT OF SCOPE)

- FSD 의 양식별 바로가기 버튼 (일반기안/지출결의/휴가신청 quick access) → v1.3+ 또는 Phase 32
- 개인화 "최근 사용 양식 top 3" → v1.3+
- SVG 일러스트 empty state → v1.3 브랜딩
- drafts 카드 복원 → v1.3
- Optimistic update (승인/반려 즉시 카운트 -1/+1) → v1.3
- ADMIN "내 문서 / 부서 문서" 토글 → v1.3+
- SUPER_ADMIN 전용 전사 대시보드 페이지 분리 → v1.3+
- 대시보드 export (PDF/Excel) → Phase 33 또는 v1.3+
- 대시보드 webhook/SSE 실시간 스트리밍 → Phase 2
- a11y 상세 감사 (ARIA live region 심화) → v1.3
- 모바일 반응형 세부 → v1.3
- Phase 30 axios paramsSerializer 전역 재검토 → Phase 30 내부 결정

---

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| DASH-01 | 사용자가 대시보드 상단에서 "결재 대기 / 진행 중 / 승인 완료 / 반려" 4종 카운트 카드를 본다 (`submittedCount` 신규 노출) | §Architecture Patterns §5 (4카드 구성), §DashboardSummaryResponse DTO 변경, §DashboardService role-based aggregation |
| DASH-02 | 사용자가 대시보드에서 "내가 처리할 결재 5건" + "내가 기안한 최근 문서 5건" 목록을 본다 | §Existing Code Reuse (기존 `recentPending`/`recentDocuments` 이미 DTO 에 포함, props drill down 리팩터만 필요) |
| DASH-03 | 사용자가 대시보드의 "새 문서 작성" CTA 버튼으로 양식 선택 화면으로 이동할 수 있다 | §D-D1 locked (기존 구조 유지, 변경 없음) |
| DASH-04 | 대시보드에 skeleton 로딩 상태와 빈 상태(empty) UI가 표시된다 | §Interaction States §7 (placeholderData + skeleton + empty + error), §ErrorState 컴포넌트 신설 |
| DASH-05 | 결재 승인/반려/상신/회수 mutation 성공 시 대시보드 쿼리가 자동 무효화되어 카운트·목록이 실시간 갱신된다 (TanStack Query `invalidateQueries(['dashboard'])`) | §TanStack Query v5 §invalidateQueries prefix, §FE Testing Pattern, 4 mutation hook 변경 위치 확정 |

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| 4-card count aggregation | API / Backend (DashboardService + repositories) | Database / Storage (WITH RECURSIVE CTE) | role × status × 부서 계층 집계는 SQL 엔진이 수행해야 효율적 · SoT 1곳 |
| Role-based scope branching | API / Backend (DashboardService Java switch) | — | `@AuthenticationPrincipal` 정보 기반 분기는 controller/service 레벨 책임 |
| 부서 계층 descendant 수집 | Database (MariaDB WITH RECURSIVE) | API (DepartmentRepository.findDescendantIds) | 재귀는 DB 엔진 최적화 포인트. Java 측 in-memory 재귀는 N+1 리스크 |
| recentPending / recentDocuments 5건 조회 | API / Backend (기존 `DashboardSummaryResponse` 재사용) | — | 백엔드가 단일 응답으로 리턴, FE 는 props drill down |
| 4카드 + 2리스트 cache | Frontend client (TanStack Query v5) | — | `['dashboard','summary']` 단일 key, placeholderData, refetchInterval |
| mutation-triggered invalidation | Frontend client (`onSuccess` → `invalidateQueries`) | — | client-side cache 정책 |
| skeleton / empty / error UI | Frontend client (React + TailwindCSS) | — | 순수 프리젠테이션 |
| navigation routing (`/documents/my?status=...` vs `/documents?tab=search&status=...`) | Frontend client (React Router + `useAuth().user.role`) | API (Phase 30 search endpoint) | 라우팅은 FE, 타겟 endpoint 권한 predicate 는 BE SoT |

---

## Standard Stack

### Core (Backend — MiceSign 현행, 변경 없음)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Spring Boot | 3.5.13 | Web/JPA/Security 전체 스택 | [VERIFIED: backend/build.gradle.kts] — 현행 버전, Phase 29/30 과 동일 |
| Hibernate (JPA provider) | 6.x (auto with Boot 3.5) | ORM | [VERIFIED: application.yml `dialect: MariaDBDialect`] |
| QueryDSL | 5.1.0 (jakarta classifier) | Type-safe query builder | [VERIFIED: backend/build.gradle.kts:30-31] |
| Spring Data JPA | 3.5.x (auto with Boot 3.5) | `@Query`, Pageable, native query | [CITED: Boot 3.5 BOM] — `nativeQuery=true` 필수 for WITH RECURSIVE |
| MariaDB | 10.11 LTS | RDBMS | [CITED: PRD §11] — WITH RECURSIVE 지원 (MariaDB 10.2+) |

### Core (Frontend — MiceSign 현행)

| Library | Version (verified) | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React | 18.3.1 | UI | [VERIFIED: frontend/package.json:35] |
| TypeScript | ~5.9.3 | 타입 시스템 | [VERIFIED: frontend/package.json:61] |
| @tanstack/react-query | ^5.95.2 (latest: 5.100.1 published 2026-04) | Server state, invalidation, placeholderData | [VERIFIED: `npm view` → 5.100.1, 5.95.2 가 현재 lock] |
| lucide-react | ^1.7.0 (latest: 1.9.0) | 아이콘 (Clock/Hourglass/CheckCircle2/XCircle/AlertTriangle/Loader2) | [VERIFIED: `npm view`] |
| react-i18next | ^17.0.2 | i18n | [VERIFIED: frontend/package.json:38] |
| react-router | ^7.13.2 | SPA 라우팅 (Phase 30 에서 `useSearchParams` 확립) | [VERIFIED: frontend/package.json:39] |
| axios | ^1.14.0 | HTTP client | [VERIFIED: frontend/package.json:29] |
| zustand | ^5.0.12 | Client state (`useAuth().user.role` 조회) | [VERIFIED: frontend/package.json:42] |

### Core (Testing)

| Library | Version (verified) | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Vitest | ^4.1.4 (latest: 4.1.5) | FE test runner | [VERIFIED: frontend/package.json:64] — 기존 프로젝트 관습 |
| @testing-library/react | ^16.3.2 | RTL — `renderHook`, `waitFor` | [VERIFIED: frontend/package.json:47] |
| @testing-library/jest-dom | ^6.9.1 | DOM matchers | [VERIFIED: frontend/package.json:46] |
| jsdom | ^29.0.2 | Browser environment | [VERIFIED: frontend/package.json:58] |
| JUnit 5 + Spring Boot Test | (Boot 3.5 auto) | BE integration test | [VERIFIED: backend/build.gradle.kts:65] |
| GreenMail | 2.1.3 | Phase 29 테스트용 — Phase 31 미사용 | [VERIFIED: backend/build.gradle.kts:67] |

### Supporting

| Library | Purpose | When to Use |
|---------|---------|-------------|
| JdbcTemplate (Spring) | BE 테스트 fixture seed (department/user/document) | `@SpringBootTest` + `@AutoConfigureMockMvc` 패턴 — Phase 29 `ApprovalServiceAuditTest`, Phase 30 `DocumentSearchPermissionMatrixTest` 에서 확립 |
| MockMvc | BE controller integration 검증 | Dashboard controller 호출 → 4카운트 매트릭스 단언 |
| TestTokenHelper (기존) | BE 테스트용 JWT 발급 helper | Phase 30 `backend/src/test/java/com/micesign/admin/TestTokenHelper.java` 재사용 |
| QueryClientProvider wrapper (FE 테스트) | `renderHook` 격리 실행 | `queryClient.invalidateQueries` spy 로 mutation 검증 |
| `MemoryRouter` (react-router) | FE 라우팅 테스트 | Phase 30 `DocumentListPage.test.tsx` 에서 확립 |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `@Query(nativeQuery=true) WITH RECURSIVE` | JPQL WITH 절 (Hibernate 6+) | **금지** — Spring Data JPA HQL parser 가 3.2.5 까지 CTE 거부 (`BadJpqlGrammarException`). 3.2.6/3.3.0 에서 fix 되었지만 MiceSign 의 Spring Data JPA 버전이 Boot 3.5 BOM 에 묶여 있어 변동 리스크. Native 가 가장 안전 (Hibernate 버전 불문 동작, [CITED: vladmihalcea.com/hibernate-with-recursive-query]) |
| `@Query(nativeQuery=true)` | QueryDSL JPASQLQuery `withRecursive` | QueryDSL SQL 모듈(`querydsl-sql`) 은 프로젝트에 미도입 (`querydsl-jpa:5.1.0` 만 있음). 도입 시 annotation processor · SQL schema generation 별도 설정 필요 → Boot 3.5 + `jakarta` classifier 와의 호환성 리스크. Native `@Query` 가 0-의존성 추가 |
| 단일 CTE 쿼리로 descendant 집합 + COUNT 조인 | `findDescendantIds()` 로 List<Long> 받아와서 `IN (...)` subselect | 후자가 더 SRP. 계층 재귀 결과(보통 최대 10개 이내 부서)를 Java List 로 받아서 별도 count 쿼리에 `IN` 으로 바인딩하면 EXPLAIN 이 단순하고 index(idx_drafter_status) 를 온전히 탈 수 있음. 전자는 CTE 전체 쿼리플랜이 재작성되며 최적화 회피 위험 |
| 계층 재귀 쿼리 매번 실행 | Department tree 를 Spring `@Cacheable` 로 | 50명 × ~10개 부서 규모에서 쿼리 비용 자체가 미미 (< 5ms 예상). 캐시 도입은 invalidation 복잡도(부서 생성/이동 시) 증가. Deferred — v1.3+ 성능 이슈 발생 시 |
| 부서 계층 Java in-memory 재귀 (`DepartmentRepository.findAll()` → Map 순회) | Spring-managed `@Transactional` 로 session 내부 재귀 lazy-load | N+1 쿼리 발생 (각 Department.getChildren() 호출마다 SELECT). 50개 이상 부서일 때 선형 증가. CTE 가 1회 쿼리로 완결 |
| `useDashboardSummary` refetchInterval 제거 (invalidate 만 의존) | 완전 제거 | 다른 탭에서 변경 시 (예: 관리자 페이지에서 문서 승인) 대시보드 탭 reflect 지연. 60s safety net 유지가 견고함 (D-B4 locked) |

**설치:** 신규 dependency 추가 없음 — 모두 기존 스택 재사용.

**Version verification (verified 2026-04-24):**
```bash
# Frontend npm registry 실측
$ npm view @tanstack/react-query version
5.100.1   # 현재 lock: 5.95.2 (compatible, semver ^5.95.2)

$ npm view vitest version
4.1.5     # 현재 lock: 4.1.4

$ npm view lucide-react version
1.9.0     # 현재 lock: 1.7.0 (Hourglass/XCircle 모두 1.x 전역 지원)

# Backend — Spring Boot 3.5.13 pinned in build.gradle.kts (L3)
# Hibernate 6.x 자동 (Boot 3.5 BOM)
# QueryDSL 5.1.0 pinned with jakarta classifier (L30-31)
```

---

## Architecture Patterns

### System Architecture Diagram

```
┌────────────────────────────────────────────────────────────────────────┐
│                       DashboardPage.tsx (FE)                            │
│                                                                         │
│    [헤더: 대시보드 + "새 문서 작성" CTA]                                │
│    ┌─────────────────────────────────────────────────────────────┐     │
│    │ useDashboardSummary()  ← 단일 훅, queryKey ['dashboard','summary']│
│    │   - placeholderData: (prev) => prev  (D-B7, skeleton 플래시 방지)│
│    │   - refetchInterval: 60_000  (D-B4, fallback)                │     │
│    └─────────────────────────────────────────────────────────────┘     │
│      │                                                                  │
│      ▼                                                                  │
│    ┌──────────────────────────────────────────────────────────┐        │
│    │  CountCard grid (md:grid-cols-2 lg:grid-cols-4 gap-6)    │        │
│    │   [결재 대기]  [진행 중]   [승인 완료]  [반려]            │        │
│    │    blue/Clock  gray/Hourglass  green/Check  red/XCircle  │        │
│    │    ↓클릭 onClick (role 분기)                              │        │
│    │      USER → /documents/my?status=...                     │        │
│    │      ADMIN/SA → /documents?tab=search&status=...         │        │
│    └──────────────────────────────────────────────────────────┘        │
│    ┌──────────────────┬────────────────────────┐                       │
│    │ PendingList      │ RecentDocumentsList    │                       │
│    │ (summary.recent  │ (summary.recent        │                       │
│    │    Pending)      │    Documents)          │                       │
│    │                  │                        │                       │
│    │ props drill down (기존 훅 사용 제거, D-B2)                        │
│    └──────────────────┴────────────────────────┘                       │
│                                                                         │
│    ErrorState component (공통, AlertTriangle + 다시시도)               │
└────────────────────────────────────────────────────────────────────────┘
       │ HTTP GET /api/v1/dashboard/summary
       ▼
┌────────────────────────────────────────────────────────────────────────┐
│                  DashboardController (BE)                              │
│                  GET /api/v1/dashboard/summary                         │
│                   @AuthenticationPrincipal CustomUserDetails           │
└────────────────────────────────────────────────────────────────────────┘
       │ userId, role, departmentId
       ▼
┌────────────────────────────────────────────────────────────────────────┐
│                    DashboardService.getSummary()                       │
│      @Transactional(readOnly=true)                                     │
│                                                                         │
│    role = USER | ADMIN | SUPER_ADMIN                                   │
│                                                                         │
│    if role == USER:                                                    │
│      drafterIds = [userId]                                             │
│      approverIds = [userId]                                            │
│    elif role == ADMIN:                                                 │
│      descendantDeptIds = DepartmentRepository.findDescendantIds(deptId)│
│      drafterIds = UserRepository.findIdsByDepartmentIdIn(...)          │
│      approverIds = drafterIds  # 본인 + 부서원                          │
│    elif role == SUPER_ADMIN:                                           │
│      drafterIds = null  # 전체 조회 표식                                │
│      approverIds = null                                                │
│                                                                         │
│    pendingCount = ApprovalLineRepository                               │
│                    .countPendingByApproverIdIn(approverIds OR ALL)     │
│    submittedCount = DocumentRepository                                 │
│                    .countByDrafterIdInAndStatus(drafterIds, SUBMITTED) │
│    approvedCount = ... APPROVED                                        │
│    rejectedCount = ... REJECTED   ← 신규                               │
│    draftCount     = ... DRAFT     ← 유지 (FE 노출 안 함)                │
│                                                                         │
│    recentPending = findPendingByApproverId(userId, pageRequest(0,5))   │
│    recentDocuments = findByDrafterId(userId, pageRequest(0,5))         │
│       ※ 목록 2개는 "본인" 스코프 유지 — CONTEXT Success Criteria 2 참조 │
│                                                                         │
│    return DashboardSummaryResponse(                                    │
│      pendingCount, draftCount, submittedCount,                         │
│      approvedCount,  ← completedCount → approvedCount 필드로 rename?   │
│      rejectedCount,  ← 신규                                             │
│      recentPending, recentDocuments)                                   │
└────────────────────────────────────────────────────────────────────────┘
       │
       ├─► DepartmentRepository.findDescendantIds(deptId)
       │   ┌──────────────────────────────────────────────────────┐
       │   │ @Query(value = """                                    │
       │   │   WITH RECURSIVE dept_tree AS (                       │
       │   │     SELECT id FROM department WHERE id = :deptId      │
       │   │     UNION ALL                                         │
       │   │     SELECT d.id FROM department d                     │
       │   │     INNER JOIN dept_tree t ON d.parent_id = t.id      │
       │   │   )                                                   │
       │   │   SELECT id FROM dept_tree                            │
       │   │   """, nativeQuery = true)                            │
       │   │ List<Long> findDescendantIds(@Param("deptId") Long id)│
       │   └──────────────────────────────────────────────────────┘
       │
       ├─► DocumentRepository.countByDrafterIdInAndStatus(List<Long>, Status)
       │   (SUPER_ADMIN 용 countByStatus 별도 추가 or drafterIds=null 분기)
       │
       ├─► ApprovalLineRepository.countPendingByApproverIdIn(List<Long>)
       │   (기존 countPendingByApproverId 확장, IN 절 native JPQL)
       │
       └─► DocumentRepository.findByDrafterId / ApprovalLineRepository.findPendingByApproverId
           (recentPending, recentDocuments — 기존 그대로)

════════════════════════════════════════════════════════════════════════
                 Mutation → Cache Invalidation Flow (FE)
════════════════════════════════════════════════════════════════════════

User triggers mutation (useApprove/useReject/useSubmitDocument/useWithdrawDocument)
       │
       ▼ axios POST → server 2xx
       │
       ▼
onSuccess: async () => {
  queryClient.invalidateQueries({ queryKey: ['approvals'] });   // 기존
  queryClient.invalidateQueries({ queryKey: ['documents'] });    // 기존
  queryClient.invalidateQueries({ queryKey: ['dashboard'] });    // ★ 신규 (D-B3)
}
       │
       ▼
TanStack Query matches active queries by prefix
       ├─ ['dashboard','summary']  ← 현재 DashboardPage 에서 활성
       │    → refetch 트리거
       │
       ▼
refetch GET /api/v1/dashboard/summary (placeholderData=prev 덕분에 skeleton 플래시 없음)
       │
       ▼
Response 수신 → CountCard 숫자 변화 + PendingList/RecentDocumentsList 업데이트
```

### Recommended Project Structure (변경 위치만 발췌)

```
backend/src/main/java/com/micesign/
├── controller/
│   └── DashboardController.java          # 수정 없음 (시그니처 유지)
├── service/
│   └── DashboardService.java              # MAJOR REFACTOR: role 분기 + descendantIds 조회
├── repository/
│   ├── DashboardRepository.java (NEW or via existing)  # (optional)
│   ├── DepartmentRepository.java          # EXTEND: findDescendantIds(Long) 추가
│   ├── DocumentRepository.java            # EXTEND: countByDrafterIdInAndStatus, countByStatus 추가
│   ├── ApprovalLineRepository.java        # EXTEND: countPendingByApproverIdIn 추가
│   └── DocumentRepositoryCustomImpl.java  # (D-A9 Option 1 시) single-dept → descendantIds
└── dto/dashboard/
    └── DashboardSummaryResponse.java      # EXTEND: rejectedCount 필드 + completedCount→approvedCount

backend/src/test/java/com/micesign/dashboard/
└── DashboardServiceIntegrationTest.java   # NEW (Phase 29 패턴)

frontend/src/features/dashboard/
├── pages/
│   ├── DashboardPage.tsx                  # MAJOR REFACTOR: 3카드→4카드, props drill
│   └── __tests__/
│       └── DashboardPage.test.tsx         # NEW: 4카드 smoke
├── components/
│   ├── CountCard.tsx                      # EXTEND: isError prop
│   ├── PendingList.tsx                    # REFACTOR: props 수신
│   ├── RecentDocumentsList.tsx            # REFACTOR: props 수신
│   └── ErrorState.tsx                     # NEW (공통 AlertTriangle 컴포넌트)
├── hooks/
│   └── useDashboard.ts                    # MAJOR REFACTOR: 단일 훅 + placeholderData
└── types/
    └── dashboard.ts                       # EXTEND: rejectedCount

frontend/src/features/approval/hooks/
├── useApprovals.ts                        # EDIT: useApprove/useReject onSuccess 에 ['dashboard'] invalidate
└── __tests__/
    └── useApprovals.invalidation.test.ts  # NEW: spy-based invalidate 검증

frontend/src/features/document/hooks/
├── useDocuments.ts                        # EDIT: useSubmitDocument/useWithdrawDocument onSuccess 에 ['dashboard']
└── __tests__/
    └── useDocuments.invalidation.test.ts  # NEW: spy-based invalidate 검증

frontend/public/locales/ko/dashboard.json   # EXTEND: submitted/rejected/error/errorDesc/retry 신규, completed 값 수정
frontend/public/locales/en/dashboard.json   # NEW (optional)
```

### Pattern 1: Native WITH RECURSIVE CTE as a utility repository method

**What:** MariaDB `WITH RECURSIVE` 를 `@Query(nativeQuery=true)` 로 래핑하여 descendant ID 리스트 반환.
**When to use:** 계층 데이터 조회가 필요한 모든 경우 (대시보드 / Phase 30 검색 / 향후 통계).
**Example:**
```java
// Source: CITED https://vladmihalcea.com/hibernate-with-recursive-query/
// + CITED https://mariadb.com/docs/server/.../common-table-expressions/recursive-common-table-expressions-overview
// backend/src/main/java/com/micesign/repository/DepartmentRepository.java

public interface DepartmentRepository extends JpaRepository<Department, Long> {
    // ... 기존 메서드 ...

    /**
     * Returns the ID of the given department plus the IDs of all descendants
     * (children, grandchildren, ...) via recursive CTE.
     *
     * Includes the root deptId itself (anchor member).
     * Traversal follows is_active flag? No — returns ALL descendants regardless
     * of is_active (drafter/approver 필터는 소비자가 별도 처리).
     *
     * [ASSUMED] Typical MiceSign tree depth ≤ 5 (본사/팀/파트). MariaDB default
     * cte_max_recursion_depth = 1000 → 여유 충분.
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
}
```

### Pattern 2: Aggregate with `IN (...)` after descendant collection

**What:** descendantIds 를 먼저 조회한 뒤 `IN` 절로 count/find.
**When to use:** 부서 50개 × 사용자 50명 규모에서 CTE 를 매번 조인하지 않고 2 단계 쿼리로 나누어 인덱스 활용 극대화.
**Example:**
```java
// Source: 기존 DocumentRepository.countByDrafterIdAndStatus 확장
public interface DocumentRepository extends JpaRepository<Document, Long>, DocumentRepositoryCustom {
    // 기존: long countByDrafterIdAndStatus(Long drafterId, DocumentStatus status);

    // 신규 (D-A4 ADMIN 스코프 용)
    long countByDrafterIdInAndStatus(List<Long> drafterIds, DocumentStatus status);

    // 신규 (D-A4 SUPER_ADMIN 용) — 전사 카운트
    long countByStatus(DocumentStatus status);
}
```

**사용 예 (DashboardService):**
```java
List<Long> drafterIds;
long submittedCount;

switch (role) {
    case USER -> {
        drafterIds = List.of(userId);
        submittedCount = documentRepository.countByDrafterIdAndStatus(userId, SUBMITTED);
    }
    case ADMIN -> {
        List<Long> deptIds = departmentRepository.findDescendantIds(departmentId);
        drafterIds = userRepository.findIdsByDepartmentIdIn(deptIds);
        submittedCount = drafterIds.isEmpty()
            ? 0L
            : documentRepository.countByDrafterIdInAndStatus(drafterIds, SUBMITTED);
    }
    case SUPER_ADMIN -> {
        drafterIds = null;  // sentinel
        submittedCount = documentRepository.countByStatus(SUBMITTED);
    }
}
```

### Pattern 3: TanStack Query v5 invalidate prefix match + placeholderData

**What:** 단일 prefix 로 여러 쿼리를 한 번에 무효화 + 이전 데이터 유지.
**When to use:** mutation 성공 시 관련된 여러 쿼리 (4카운트 + 2리스트) 가 모두 갱신되어야 하고, skeleton 플래시를 피해야 할 때.
**Example:**
```typescript
// Source: CITED https://tanstack.com/query/v5/docs/reference/QueryClient#queryclientinvalidatequeries
// frontend/src/features/dashboard/hooks/useDashboard.ts (NEW shape)

import { useQuery } from '@tanstack/react-query';
import { dashboardApi } from '../api/dashboardApi';

export function useDashboardSummary() {
  return useQuery({
    queryKey: ['dashboard', 'summary'],
    queryFn: () => dashboardApi.getSummary().then((res) => res.data.data!),
    refetchInterval: 60_000,                              // D-B4 유지
    placeholderData: (previousData) => previousData,      // D-B7 신규 (skeleton 플래시 방지)
  });
}

// usePendingPreview / useRecentDocuments 제거 (D-B2)
```

```typescript
// frontend/src/features/approval/hooks/useApprovals.ts (수정 — 2줄 추가)
export function useApprove() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ lineId, comment }: { lineId: number; comment?: string }) =>
      approvalApi.approve(lineId, comment ? { comment } : undefined),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['approvals'] });   // 기존
      queryClient.invalidateQueries({ queryKey: ['documents'] });   // 기존
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });   // ★ 신규 (D-B3)
    },
  });
}
// useReject, useSubmitDocument, useWithdrawDocument 동일 패턴
```

### Pattern 4: renderHook + spy on `queryClient.invalidateQueries` (FE mutation test)

**What:** QueryClient 의 `invalidateQueries` 를 `vi.spyOn` 으로 감지.
**When to use:** mutation onSuccess 가 정확히 `['dashboard']` 를 invalidate 했는지 단위 검증.
**Example:**
```typescript
// Source: CITED https://github.com/TanStack/query/discussions/4391
// + 프로젝트 pattern: frontend/src/features/document/pages/__tests__/DocumentListPage.test.tsx
// frontend/src/features/approval/hooks/__tests__/useApprovals.invalidation.test.ts

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useApprove } from '../useApprovals';

vi.mock('../../api/approvalApi', () => ({
  approvalApi: {
    approve: vi.fn().mockResolvedValue({ data: { data: { id: 1 } } }),
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

### Pattern 5: `@SpringBootTest + @AutoConfigureMockMvc + JdbcTemplate` seed (BE integration)

**What:** JPA 를 우회하고 SQL 로 직접 fixture seed, MockMvc 로 dashboard endpoint 호출 → COUNT 단언.
**When to use:** role × 4카드 × 부서 계층 매트릭스 검증.
**Example:**
```java
// Source: backend/src/test/java/com/micesign/document/ApprovalServiceAuditTest.java (Phase 29)
// + backend/src/test/java/com/micesign/document/DocumentSearchPermissionMatrixTest.java (Phase 30)
// backend/src/test/java/com/micesign/dashboard/DashboardServiceIntegrationTest.java

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@DisplayName("Phase 31 — DashboardService 권한 × 4카드 × 부서 계층 (DASH-01 matrix)")
class DashboardServiceIntegrationTest {

    @Autowired MockMvc mockMvc;
    @Autowired TestTokenHelper tokenHelper;
    @Autowired JdbcTemplate jdbcTemplate;
    @Autowired DashboardService dashboardService;

    // Fixture tree:
    //   HQ (root)
    //    ├─ Engineering
    //    │    └─ Platform
    //    └─ Sales
    // Users:
    //   adminOfEngineering (ADMIN, dept=Engineering)
    //   userInPlatform (USER, dept=Platform)
    //   userInSales (USER, dept=Sales)
    //   superAdmin (SUPER_ADMIN, dept=HQ)
    // Documents (seeded via SQL):
    //   - userInPlatform × 4: 1 DRAFT, 1 SUBMITTED, 1 APPROVED, 1 REJECTED
    //   - userInSales × 2: 1 SUBMITTED, 1 APPROVED

    @Test
    void adminOfEngineering_sees_descendant_scope() throws Exception {
        String token = tokenHelper.issue(adminId, "ADMIN", engineeringDeptId);
        // /api/v1/dashboard/summary 호출 후
        // submittedCount = 1 (Platform 의 userInPlatform 문서 하나),
        // approvedCount = 1, rejectedCount = 1 기대 (Engineering 재귀 descendants = [Engineering, Platform])
        // Sales 의 문서는 포함 안 됨
    }

    @Test
    void user_sees_only_self_drafted() throws Exception { /* ... */ }

    @Test
    void superAdmin_sees_all() throws Exception {
        // submittedCount = 2, approvedCount = 2, rejectedCount = 1
    }

    @Test
    void admin_pending_scope_covers_department_hierarchy() throws Exception {
        // approval_line.approver_id ∈ [engineering_users + platform_users]
        // PENDING 카운트
    }

    @Test
    void draft_count_remains_internal_field_and_not_exposed_to_FE() throws Exception {
        // JSON response 에 draftCount 필드가 존재함을 단언 (FE가 숨기지만 백엔드는 유지, D-A2)
    }
}
```

### Anti-Patterns to Avoid

- **Java in-memory 재귀 로 descendant 수집:** `Department.getChildren()` 재귀 호출은 JPA lazy-load N+1 발생. CTE 가 유일한 효율적 방법.
- **JPQL WITH 절 사용 (Hibernate 6 기능):** Spring Data JPA 3.2.5 이하에서 `BadJpqlGrammarException`. 프로젝트가 Boot 3.5 BOM 에 묶여 있어 Spring Data JPA 버전이 자동 결정 — 리스크 관리 어려움. native SQL 이 안전.
- **Optimistic update 도입:** ADMIN 스코프에서는 "내 문서 아님" 이 카운트에 영향을 미치므로 rollback 로직이 복잡. D-B5 로 Deferred.
- **queryClient instance 를 module-level 에 생성해 테스트 간 공유:** 테스트 격리 실패. 각 테스트마다 `beforeEach` 에서 새로 생성 ([CITED: tkdodo.eu/blog/testing-react-query]).
- **`useApprove` onSuccess 에 async 없이 여러 invalidate 를 순서 기대:** TanStack Query v5 는 `invalidateQueries` 가 Promise 반환 — 순차 실행이 필요하면 `await` 필수. 본 phase 에서는 병렬로 3 prefix 를 쏘고 각각 독립 refetch 를 허용하면 됨 (순서 의존 없음).
- **`refetchInterval: 60_000` 제거:** fallback safety net — 제거 시 다른 탭에서 변경된 결재가 대시보드에 반영 안 되는 긴 지연 발생.
- **`isError` 시 '-' 문자열 반환 로직 유지:** D-C2 로 에러 UI 전면 교체. 현재 `DashboardPage.tsx` L17-19 의 `const pendingCount = isError ? '-' : ...` 패턴 폐기.
- **`pendingCount` 집계에 SUPER_ADMIN 전체 PENDING 합산 시 SKIPPED 포함:** `ApprovalLineStatus.PENDING AND lineType IN (APPROVE,AGREE) AND doc.status=SUBMITTED AND doc.currentStep=al.stepOrder` 조건을 반드시 유지 (기존 `countPendingByApproverId` 쿼리의 WHERE 절을 IN 으로만 확장).

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| 부서 계층 descendant 수집 | Java in-memory recursion via JPA lazy-load | MariaDB `WITH RECURSIVE` in native query | N+1 회피, SQL 엔진 최적화, cte_max_recursion_depth=1000 default (10단계 이내 트리는 0 리스크) |
| 여러 queryKey invalidate | Custom pub/sub 또는 global event bus | TanStack Query v5 `invalidateQueries({queryKey: ['dashboard']})` prefix match | 공식 API 로 부분 일치 자동 — `['dashboard','summary']`, `['dashboard','stats']` (향후 확장) 모두 한 번에 |
| Skeleton 플래시 방지 | `isFetching` 플래그 수동 처리 + CSS transition | `placeholderData: (prev) => prev` | v5 권장 migration path, `keepPreviousData` deprecated |
| mutation → 다른 쿼리 refetch | Manual `queryClient.refetchQueries` 호출 | `invalidateQueries` (stale mark + auto-refetch if active) | 더 저렴 (active query 만 즉시 refetch, inactive 는 stale mark 로 다음 access 시 refetch) |
| role-based 분기 DB 쿼리 | 단일 거대 SQL 에 role CASE 넣기 | Java switch(role) + 단순 쿼리 3개 | EXPLAIN 쉬움, 단위 테스트 용이, MariaDB 통계 최적화 잘 됨 |
| FE 에서 3개 endpoint 병렬 호출 | `useQueries` or manual Promise.all | 백엔드 `/dashboard/summary` 이미 통합 응답 → 단일 훅 | waterfall 자연 해소 (D-B6), 네트워크 1회 |
| 4카드 skeleton 컴포넌트 | CSS shimmer 직접 작성 | 기존 `CountCard isLoading` prop + `animate-pulse` Tailwind | MiceSign 자산 재활용, 4개 instance 배치만 변경 |
| 부서 계층 트리 매 요청마다 재귀 | Spring `@Cacheable` 도입 | 그대로 CTE 실행 (50 users × ~10 depts, < 5ms) | 캐시 invalidation 복잡도 > 절감 비용. Deferred |
| aria-label 템플릿 직접 구성 | Hardcoded 문자열 | i18next interpolation `"{{label}}: {{count}}건"` | 다국어 지원 + 일관성 |

**Key insight:** 본 Phase 의 "hand-roll 유혹" 은 **부서 계층 재귀를 Java 로 하는 것** 과 **mutation 후 각 훅마다 `refetch()` 호출하는 것** 두 가지다. 둘 다 CTE + TanStack Query 기능으로 완전 해결된다.

---

## Common Pitfalls

### Pitfall 1: Phase 30 predicate 와 Phase 31 스코프 불일치 — "대시보드 숫자 ≠ 검색 결과" (★ 가장 critical)

**What goes wrong:** ADMIN 이 대시보드 "진행 중: 12" 카드를 클릭 → `/documents?tab=search&status=SUBMITTED` 이동 → Phase 30 의 **단일 부서 predicate** 로 인해 **검색 결과가 예: 3건** 표시. 사용자 혼란 + "버그 신고".
**Why it happens:** Phase 30 `DocumentRepositoryCustomImpl.java` (line 75-78) 가 `drafter.departmentId.eq(departmentId)` — 단일 부서만 매칭. Phase 31 은 `findDescendantIds()` 로 계층 재귀.
**How to avoid:** **D-A9 Option 1** — Phase 31 task 1에서 Phase 30 predicate 를 계층 재귀로 upgrade. `DepartmentRepository.findDescendantIds()` 유틸을 먼저 만들고, `DocumentRepositoryCustomImpl.java` 와 `DashboardService` 양쪽이 같은 유틸을 호출하도록 변경. 아래 §D-A9 Resolution 참조.
**Warning signs:** Phase 30 `DocumentSearchPermissionMatrixTest` 의 ADMIN 시나리오에 "descendant department member 의 문서" fixture 추가 → 현재 테스트 통과 여부 검증. 현재 fixture 는 단일 부서 ADMIN scope 이므로 descendant 포함 테스트가 FAIL 해야 정상.

### Pitfall 2: `cte_max_recursion_depth` session default 초과

**What goes wrong:** 부서 트리에 순환 참조(`dept A.parent = B, B.parent = A`) 가 있으면 1000 iteration 후 에러. 또는 MariaDB global 설정이 매우 낮게 튜닝된 경우.
**Why it happens:** MariaDB 기본 1000 iteration 한계 [CITED: mariadb.com / bugs.mysql.com]. 애플리케이션 DDL 상 `parent_id FK` 가 self-reference 이지만 CYCLE 방지 제약 없음.
**How to avoid:**
  1. V1 schema 상 순환 불가 정책 (Admin UI 가 parent 선택 시 본인/하위 선택 차단 — ORG-01 에 암묵적).
  2. CTE 자체에 `UNION ALL` 을 `UNION` 으로 바꾸면 중복 제거되며 순환도 자연 종료 — 본 Phase 는 동일 ID 재등장 불가 (트리 구조 가정) 이므로 `UNION ALL` 유지.
  3. 테스트: 10단계 deep tree fixture 로 통합 테스트 1건 추가 (권장).
**Warning signs:** `ERROR 3636 (HY000): Recursive query aborted after 1001 iterations.`

### Pitfall 3: Native query → `List<Long>` mapping with Spring Data JPA

**What goes wrong:** `@Query(nativeQuery=true)` + `SELECT id FROM ...` 가 `List<BigInteger>` 또는 `List<Number>` 로 반환되어 `List<Long>` cast 실패.
**Why it happens:** MariaDB JDBC driver 가 BIGINT UNSIGNED 를 `BigInteger` 로 매핑하기도 함. Hibernate 6 는 대부분 `Long` 변환해주지만 드라이버/dialect 조합에 따라 다름.
**How to avoid:** Spring Data JPA 2.0+ 는 `List<Long>` 직접 지원 (Hibernate 가 type coercion). 혹시 실패 시 — `SELECT CAST(id AS SIGNED) FROM dept_tree` 로 명시 cast, 또는 projection interface 사용.
**Warning signs:** `ClassCastException: java.math.BigInteger cannot be cast to java.lang.Long` (런타임).

### Pitfall 4: `invalidateQueries` 가 inactive query 를 건드리지 않음

**What goes wrong:** 사용자가 /approvals/pending 페이지에서 승인 → invalidate → 대시보드가 "inactive" 상태 (다른 페이지) → 즉시 refetch 안 됨 → 대시보드로 돌아가면 stale data 순간 노출 후 refetch.
**Why it happens:** `invalidateQueries` 의 `refetchType` default = `'active'` — 현재 마운트된 `useQuery` 만 refetch [CITED: tanstack.com/query/v5/docs/reference/QueryClient].
**How to avoid:** **의도된 동작** — inactive 는 `stale` 마킹만 되고, 대시보드 페이지 재방문 시 자동 refetch. `placeholderData: (prev) => prev` 가 순간 노출을 부드럽게 처리. `refetchType: 'all'` 로 강제하면 불필요한 네트워크 발생.
**Warning signs:** 사용자가 "대시보드로 돌아오면 잠깐 이전 숫자 보였다가 바뀐다" 리포트 — 정상 동작임을 UAT 에서 설명.

### Pitfall 5: Mutation 성공 후 `invalidateQueries` Promise 를 onSuccess 가 await 하지 않으면 `isPending: false` 조기 전환

**What goes wrong:** submit 버튼의 loading 상태가 사용자가 실제 데이터를 보기 전에 해제되어, 눌러야 하는 순간에 "이미 완료된 것 같다" 는 UX.
**Why it happens:** `invalidateQueries` 는 Promise 반환. onSuccess 가 그 Promise 를 리턴/await 하지 않으면 mutation 자체는 바로 success 처리 [CITED: tanstack.com/query docs invalidations-from-mutations].
**How to avoid:** 본 Phase 는 optimistic update 안 함 (D-B5) 이고, 승인 버튼 자체는 `/approvals/pending` 페이지에 있음. 대시보드 는 그 페이지와 분리된 탭이므로 UX 영향 미미. 단 승인 버튼 컴포넌트가 "mutation.isPending 동안 버튼 비활성화" 를 유지하려면 onSuccess 에서 Promise chain 주의 — 현재는 대시보드 invalidate 추가해도 Promise 무시되고 resolve 되면 `isPending: false` 전환. 문제없음.
**Warning signs:** 단위 테스트 `waitFor(() => expect(result.current.isSuccess).toBe(true))` 가 early pass 하면서 spy 가 아직 호출 안 됨 — `await waitFor(() => expect(spy).toHaveBeenCalledWith(...))` 로 assertion 순서 뒤로 이동.

### Pitfall 6: `['dashboard']` prefix invalidate 가 향후 `['dashboard','alert']` 같은 다른 대시보드 쿼리 전부 말려듦

**What goes wrong:** v1.3 에서 `['dashboard','stats']` 같은 추가 쿼리 생기면 mutation 마다 불필요하게 refetch.
**Why it happens:** prefix match 동작. `['dashboard']` 는 `['dashboard', '*']` 전부 매칭 [CITED: tanstack.com/query docs query-invalidation].
**How to avoid:** 현재 Phase 에서는 `['dashboard','summary']` 하나뿐 → 문제없음. v1.3 에 추가 쿼리 도입 시 **각 쿼리가 mutation 에 영향 받는지 판단** — 대부분 Yes (대시보드 전체 리로드 의미) 이므로 prefix 매치가 오히려 편리. 엄격 분리 필요 시 `invalidateQueries({queryKey: ['dashboard','summary']})` 로 정확한 키 지정.
**Warning signs:** 네트워크 탭에서 mutation 1회 직후 /dashboard/summary + /dashboard/stats + ... 여러 호출 발생 → 의도 맞는지 확인.

### Pitfall 7: 테스트에서 `@MockBean JavaMailSender` 또는 BudgetApiClient 누락 → Phase 29 컨텍스트 로드 실패

**What goes wrong:** `@SpringBootTest` 가 Phase 29 의 `ApprovalEmailSender`, `JavaMailSender` 빈, BudgetApiClient 를 자동 wiring. MAIL_HOST env 없으면 `@ConditionalOnProperty` 로 스킵되긴 하지만 submit 테스트에서 BudgetIntegrationEvent 가 mock 안 되면 간섭.
**Why it happens:** DashboardService 는 read-only 이므로 mutation/event publish 가 발생하지 않음 → 직접적 간섭 zero. 그러나 컨텍스트 로드 자체에서 Phase 29 bean 들이 wiring 됨.
**How to avoid:** DashboardServiceTest 는 read-only API 호출만 수행 → 결재/제출 mutation 호출 없음 → Phase 29 bean mock 불필요. 단 **docfixture 를 SQL INSERT 로 넣으면 listener 가 fire 되지 않으므로 깔끔**. (Phase 29 `ApprovalServiceAuditTest` 가 이 패턴 사용). Phase 29 패턴 그대로 차용.
**Warning signs:** 테스트 실행 시 컨텍스트 로드 실패 ApplicationContext 에러 — MAIL_HOST 관련. 해결: `application-test.yml` 에 SMTP 관련 config 부재 확인 (이미 정상).

### Pitfall 8: `userRepository.findIdsByDepartmentIdIn(deptIds)` 가 빈 리스트일 때 JPA IN ()

**What goes wrong:** deptIds 가 빈 List → `SELECT ... WHERE department_id IN ()` → MariaDB 문법 오류.
**Why it happens:** `ADMIN` 역할인데 부서 매칭된 user 가 0명 + descendant 없음 → drafterIds = emptyList → subsequent IN query.
**How to avoid:** Java 레벨 pre-check: `drafterIds.isEmpty() ? 0L : repo.countByDrafterIdIn(...)`. JPA Hibernate 최신 버전은 자동 처리하기도 하지만 방어적 코드 유지.
**Warning signs:** 실 운영에서 신규 ADMIN + 부서원 없음 시나리오에서 500 에러.

### Pitfall 9: Dashboard API 호출 시 role/departmentId 가 `@AuthenticationPrincipal CustomUserDetails` 에서 누락

**What goes wrong:** CustomUserDetails 가 role 또는 departmentId 를 expose 안 하면 DashboardService 가 null 받아서 분기 실패.
**Why it happens:** Phase 29/30 는 이미 `CustomUserDetails.getRole()` / `.getDepartmentId()` 사용 중 — 이미 존재.
**How to avoid:** DashboardController 시그니처 변경 필요 없음. DashboardService 가 `getDashboardSummary(userId, role, departmentId)` 로 파라미터 확장.
**Warning signs:** 런타임 NullPointerException 또는 분기 미동작. 해결: CustomUserDetails 확인 → Phase 30 DocumentController:146 패턴 재사용.

### Pitfall 10: FE test 에서 `refetchInterval: 60_000` 이 테스트 시간 초과

**What goes wrong:** `useDashboardSummary` 훅을 `renderHook` 으로 테스트할 때 refetchInterval 이 실행 중 백그라운드 타이머 남기면 테스트 leak.
**Why it happens:** QueryClient 가 unmount 되지 않으면 interval 계속.
**How to avoid:**
  - 테스트 wrapper 에서 `afterEach(() => queryClient.clear())` 또는 `queryClient.unmount()`.
  - 또는 `refetchInterval: false` 를 테스트용 QueryClient default 에 overriding.
  - Vitest 이미 `jsdom` + test isolation, leak 심각하지 않으면 무시 가능.
**Warning signs:** CI 에서 테스트는 통과하지만 hang 또는 `unhandled promise rejection` 로그.

### Pitfall 11: i18n 키 값 변경 (`dashboard.completed`: "완료" → "승인 완료")

**What goes wrong:** 기존 "완료" 로 표시되던 카드가 갑자기 "승인 완료" 로 변경 — 사용자 문맥 변화. 스크린샷/매뉴얼 업데이트 필요.
**Why it happens:** D-A1 으로 REQUIREMENTS 우선, semantics 도 APPROVED only 로 재정의되어 값 수정 불가피.
**How to avoid:** UAT (D-D3) 로 사용자에게 사전 공지 + 릴리스 노트 반영.
**Warning signs:** 사용자 리포트 "대시보드 '완료' 카드가 '승인 완료' 로 바뀐 이유?" — 정상 동작임 설명.

---

## D-A9 Resolution: Phase 30 predicate 계층 재귀 upgrade (본 research 권고)

### 현황 확인 (코드 레벨)

- Phase 30 의 `DocumentRepositoryCustomImpl.java` 는 이미 운영 중이며 (backend/src/main/java/com/micesign/repository/DocumentRepositoryCustomImpl.java):
  - Line 75-78:
    ```java
    if ("ADMIN".equals(role) && departmentId != null) {
        QUser deptUser = new QUser("deptUser");
        BooleanExpression sameDepartment = doc.drafterId.in(
                JPAExpressions.select(deptUser.id)
                        .from(deptUser)
                        .where(deptUser.departmentId.eq(departmentId))
        );
        permissionBranch = permissionBranch.or(sameDepartment);
    }
    ```
  - `deptUser.departmentId.eq(departmentId)` — **단일 부서만 매칭**.

- Phase 30 테스트 `DocumentSearchPermissionMatrixTest.java` 는 현재 단일 부서 fixture 만 있음 (확인 가능 영역).

- Phase 30 의 tab=department 경로도 동일 단일 부서 매칭 (Line 46-47):
  ```java
  case "department" -> where.and(drafter.departmentId.eq(departmentId));
  ```

### Option 1 (권장): Phase 30 predicate 를 계층 재귀로 upgrade

**접근:**
1. `DepartmentRepository.findDescendantIds(Long)` 를 Phase 31 에서 신설.
2. `DocumentRepositoryCustomImpl.searchDocuments` 파라미터에 `List<Long> descendantDeptIds` 를 추가 (또는 userId/role/departmentId 에서 서비스 레이어가 resolve 해서 전달).
3. QueryDSL BooleanExpression 을 `deptUser.departmentId.in(descendantDeptIds)` 로 변경.
4. tab=department 도 동일 `in(...)` 로 변경.
5. Phase 30 의 `DocumentSearchPermissionMatrixTest` 에 "descendant department 소속 user 의 문서가 ADMIN 에게 보임" 시나리오 추가 (∞회귀 방어).

**코드 diff 예시:**
```java
// DocumentRepositoryCustom.java
Page<DocumentResponse> searchDocuments(
    DocumentSearchCondition condition,
    Long userId, String role,
    Long departmentId,
    List<Long> descendantDeptIds,   // ★ 신규 파라미터
    Pageable pageable);

// DocumentRepositoryCustomImpl.java  Line 73-79 변경
if ("ADMIN".equals(role) && departmentId != null) {
    QUser deptUser = new QUser("deptUser");
    BooleanExpression sameDepartment = doc.drafterId.in(
            JPAExpressions.select(deptUser.id)
                    .from(deptUser)
                    .where(deptUser.departmentId.in(descendantDeptIds))  // ★ in 으로 변경
    );
    permissionBranch = permissionBranch.or(sameDepartment);
}

// Line 46-47 tab=department 변경
case "department" -> where.and(drafter.departmentId.in(descendantDeptIds));  // ★

// DocumentService.searchDocuments 내부에서
List<Long> descendantDeptIds = "ADMIN".equals(role.name()) || "department".equals(condition.tab())
    ? departmentRepository.findDescendantIds(departmentId)
    : List.of(departmentId);  // USER / my tab 에서는 미사용
```

**Pros:**
- 대시보드 숫자 = 검색 결과 (SoT 1곳, Pitfall 1 제거).
- `DepartmentRepository.findDescendantIds` 가 향후 통계/부서 문서함에 재사용.
- Phase 30 `DocumentListPage` 에서 ADMIN 이 tab=search 로 실제 부서 계층 문서를 조회 가능 — FSD FN-SEARCH-001 "ADMIN 부서 범위" 의 원래 의도와 정합 (FSD 가 "부서" 를 계층 의미로 사용한 것인지, 단일 부서 의미인지는 문서 재검토 필요 — [ASSUMED] 계층 의미).
- 본 Phase 의 PR 단일 PR 원칙 (D-D4) 에 자연스럽게 들어감.

**Cons:**
- Phase 30 가 이미 "완료" 로 마킹된 PR 1 이 있다면 (ROADMAP 상 Plans 5개 모두 TBD 상태 — 즉 아직 실 PR 은 배포 전) Phase 31 에 이 변경을 포함. 배포 전이면 문제 없음.
- `DocumentSearchPermissionMatrixTest` matrix 확장 필요 (descendant 시나리오 + tab=department hierarchical case). 추가 ~3 case.
- Phase 30 CONTEXT/PLAN 와의 일관성 — D-A9 에서 "Phase 30 predicate 계층 확장" 명시했으므로 허용 범위.

**Delivery cost:**
- BE 코드: DocumentRepositoryCustom 시그니처 1 확장 + Impl 2 라인 변경 + DocumentService 레벨에서 descendantDeptIds resolve.
- BE 테스트: Phase 30 matrix 에 hierarchical fixture 추가 (3 case), Phase 31 DashboardServiceIntegrationTest 는 새로 작성.
- FE: 변경 없음 (Phase 30 FE 는 이미 tab=search 를 호출, 백엔드가 알아서 처리).

### Option 2: Phase 31 을 단일 부서로 다운그레이드

**Approach:** D-A4/A6 수정 — ADMIN 스코프 = 본인 부서 직속 user 만 (children 미포함).

**Pros:**
- Phase 30 개조 없음, 테스트 변경 없음.
- 구현 단순 (CTE 없음, `findDescendantIds` 유틸 생략).

**Cons:**
- CONTEXT 의 locked 결정 (D-A4/A6) 을 파괴 — 의사결정 거슬러 올라감.
- "계층 구조" 를 가진 부서 트리가 이미 schema 에 있는데 활용 안 함 — spec regression.
- 미래에 이 기능 재도입 시 또 BE + FE + 테스트 개조 필요.

### Recommendation: **Option 1**

**Rationale:**
1. D-A4/A6 이 locked 결정이며 사용자가 명시적 선택했음.
2. Phase 30 가 아직 완료되지 않았음 (ROADMAP `Not started`, Plans 0/5) — 변경 비용 최소.
3. SoT 1곳 보장 + 후속 재사용 가치 높음.
4. CTE 비용 ~5ms 수준, 50 user 규모 문제 zero.
5. 단일 PR 로 Phase 31 에 통합 가능 (D-D4 와 정합).

**Planner 가 할 일:**
- PLAN.md 첫 task: `DepartmentRepository.findDescendantIds()` 추가 + `DocumentRepositoryCustomImpl` tab=department/ADMIN predicate 를 descendantIds IN 으로 변경 + Phase 30 `DocumentSearchPermissionMatrixTest` hierarchical case 3건 추가.
- 두 번째 task: DashboardService role 분기 + DTO 변경.
- 나머지 task: FE 리팩터 + 테스트.

---

## Runtime State Inventory

> 본 Phase 는 rename/refactor/migration 이 아닌 **기능 확장** phase. Runtime state 변경 거의 없으나 캐시/쿠키 관점에서 확인.

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | **None** — verified by: V1~V19 migration + Department/User/Document/ApprovalLine 스키마에 필드 추가/삭제 없음. `DashboardSummaryResponse` 는 transient (JSON 응답만). | 없음 |
| Live service config | **None** — dashboard endpoint 시그니처 동일 (`GET /api/v1/dashboard/summary`). | 없음 |
| OS-registered state | **None** — systemd/cron 무관. | 없음 |
| Secrets/env vars | **None** — JWT/DB/SMTP env 무변경. | 없음 |
| Build artifacts | **FE 클라이언트 캐시** — `['approvals','pending',0,5]`, `['documents','my',0,5]` 쿼리 키가 폐기 (D-B2). 배포 직후 기존 브라우저 세션의 TanStack Query 캐시는 자동 garbage-collect (gcTime 기본 5분). 문제없음. | 없음 (TanStack 자동 처리) |

**Nothing found in any category:** 본 Phase 는 순수 코드 변경 + DTO 필드 확장. Runtime state 영향 zero.

---

## Project Constraints (from CLAUDE.md)

| Directive | Source | Compliance Plan |
|-----------|--------|-----------------|
| Java 17 + Spring Boot 3.x | CLAUDE.md §Tech Stack | ✓ 유지 (Boot 3.5.13) |
| JPA(Hibernate) + QueryDSL 5.1.0 jakarta classifier | CLAUDE.md §Tech Stack | ✓ native `@Query` 는 JPA 표준, QueryDSL 은 Phase 30 predicate 확장에 사용 |
| MariaDB 10.11+ (utf8mb4/utf8mb4_unicode_ci) | CLAUDE.md §Tech Stack | ✓ WITH RECURSIVE 지원 (10.2+) 및 스키마 변경 없음 |
| React 18 + Vite + TypeScript + Zustand + TanStack Query v5 + TailwindCSS | CLAUDE.md §Tech Stack | ✓ 모두 유지 |
| Korean UI/error messages, English error codes | CLAUDE.md §Language, FSD §12.2 | ✓ ErrorState 컴포넌트의 한글 문구 + 기존 ErrorCode 유지 |
| @PreAuthorize for RBAC | CLAUDE.md §Architecture Decisions | N/A (Dashboard endpoint 는 인증만 필요, ADMIN-only 아님. DashboardService 내부에서 role 분기) |
| Flyway — all schema changes through migration files | CLAUDE.md §Critical Gaps | ✓ 본 Phase 는 스키마 변경 없음. V20 가 Phase 30 에서 예약된 상태이지만 Phase 30 벤치용 seed (optional). Phase 31 은 migration 생성 없음. |
| JPA `ddl-auto: validate` | CLAUDE.md §Technology Stack Notes, application.yml:11 | ✓ DTO 필드 추가만, 엔티티 변화 없음 → 검증 통과 |
| GSD workflow — never bypass | CLAUDE.md §GSD Workflow Enforcement | ✓ 본 research 는 `/gsd-research-phase` 로 실행됨 |
| Preserve existing features/menus/routes after work | User MEMORY.md "preserve existing" | ✓ DashboardController URL 유지, `/approvals/pending` `/documents/my` `/documents?tab=search` 라우트 모두 유지. Only 변경: drafts 카드 삭제 (기능적으로 RecentDocuments 의 DocumentStatusBadge 가 DRAFT 표시). |
| All responses in Korean | User MEMORY.md "Korean responses" | ✓ 본 RESEARCH.md 가 한국어 작성됨. |

---

## Code Examples

Verified patterns from official sources + existing codebase.

### 1. Recursive CTE repository method (Spring Data JPA + MariaDB)

```java
// Source: CITED https://vladmihalcea.com/hibernate-with-recursive-query/ §"Native SQL Alternative"
// + Existing pattern: DocumentRepository.java:30-40 @Query with JOIN FETCH
// backend/src/main/java/com/micesign/repository/DepartmentRepository.java (ADD)

public interface DepartmentRepository extends JpaRepository<Department, Long> {
    // ... 기존 메서드 ...

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
}
```

### 2. DashboardService role-based aggregation

```java
// Source: 프로젝트 패턴 (DocumentService.java role 분기 참조)
// backend/src/main/java/com/micesign/service/DashboardService.java (REFACTOR)

@Service
@Transactional(readOnly = true)
public class DashboardService {

    private final DepartmentRepository departmentRepository;
    private final UserRepository userRepository;
    private final DocumentRepository documentRepository;
    private final ApprovalLineRepository approvalLineRepository;
    private final ApprovalTemplateRepository approvalTemplateRepository;
    private final DocumentMapper documentMapper;

    // constructor injection ...

    public DashboardSummaryResponse getDashboardSummary(
            Long userId, UserRole role, Long departmentId) {

        List<Long> drafterIds;    // null = 전체 조회 sentinel
        List<Long> approverIds;   // null = 전체 조회 sentinel

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

        long pendingCount    = countPending(approverIds);
        long submittedCount  = countDrafterStatus(drafterIds, DocumentStatus.SUBMITTED);
        long approvedCount   = countDrafterStatus(drafterIds, DocumentStatus.APPROVED);
        long rejectedCount   = countDrafterStatus(drafterIds, DocumentStatus.REJECTED);
        long draftCount      = countDrafterStatus(drafterIds, DocumentStatus.DRAFT);

        // recentPending / recentDocuments — 본인 스코프 유지 (CONTEXT 에서 ADMIN 도 "본인 앞 결재" 로 해석 가능)
        // 단, D-A5 의 "ADMIN pending 부서 확장" 은 CARD 카운트에만 적용, 리스트는 본인 기준 유지
        // (planner 재확인 필요 — CONTEXT 원문 재해석)
        Page<ApprovalLine> pendingPage = approvalLineRepository
                .findPendingByApproverId(userId, PageRequest.of(0, 5));
        List<PendingApprovalResponse> recentPending = /* 기존 매핑 */;

        Page<Document> docPage = documentRepository.findByDrafterId(userId, PageRequest.of(0, 5));
        List<DocumentResponse> recentDocuments = /* 기존 매핑 */;

        return new DashboardSummaryResponse(
                pendingCount, draftCount, submittedCount,
                approvedCount, rejectedCount,
                recentPending, recentDocuments);
    }

    private long countPending(List<Long> approverIds) {
        if (approverIds == null) {
            return approvalLineRepository.countAllPending();  // NEW — SUPER_ADMIN 용
        }
        if (approverIds.isEmpty()) return 0L;
        return approvalLineRepository.countPendingByApproverIdIn(approverIds);
    }

    private long countDrafterStatus(List<Long> drafterIds, DocumentStatus status) {
        if (drafterIds == null) {
            return documentRepository.countByStatus(status);  // NEW — SUPER_ADMIN 용
        }
        if (drafterIds.isEmpty()) return 0L;
        return documentRepository.countByDrafterIdInAndStatus(drafterIds, status);
    }
}
```

### 3. ApprovalLineRepository.countPendingByApproverIdIn 확장

```java
// Source: Existing ApprovalLineRepository.countPendingByApproverId (line 43-49)
// backend/src/main/java/com/micesign/repository/ApprovalLineRepository.java (EXTEND)

@Query("SELECT COUNT(al) FROM ApprovalLine al JOIN al.document d " +
       "WHERE al.approver.id IN :userIds " +
       "AND al.status = com.micesign.domain.enums.ApprovalLineStatus.PENDING " +
       "AND al.lineType IN (com.micesign.domain.enums.ApprovalLineType.APPROVE, com.micesign.domain.enums.ApprovalLineType.AGREE) " +
       "AND d.status = com.micesign.domain.enums.DocumentStatus.SUBMITTED " +
       "AND d.currentStep = al.stepOrder")
long countPendingByApproverIdIn(@Param("userIds") List<Long> userIds);

@Query("SELECT COUNT(al) FROM ApprovalLine al JOIN al.document d " +
       "WHERE al.status = com.micesign.domain.enums.ApprovalLineStatus.PENDING " +
       "AND al.lineType IN (com.micesign.domain.enums.ApprovalLineType.APPROVE, com.micesign.domain.enums.ApprovalLineType.AGREE) " +
       "AND d.status = com.micesign.domain.enums.DocumentStatus.SUBMITTED " +
       "AND d.currentStep = al.stepOrder")
long countAllPending();
```

### 4. FE — useDashboardSummary with placeholderData (v5)

```typescript
// Source: CITED https://tanstack.com/query/v5/docs/framework/react/guides/paginated-queries §Better Paginated Queries
// frontend/src/features/dashboard/hooks/useDashboard.ts (REFACTOR)

import { useQuery } from '@tanstack/react-query';
import { dashboardApi } from '../api/dashboardApi';

export function useDashboardSummary() {
  return useQuery({
    queryKey: ['dashboard', 'summary'],
    queryFn: () => dashboardApi.getSummary().then((res) => res.data.data!),
    refetchInterval: 60_000,
    placeholderData: (previousData) => previousData,
  });
}

// 제거: usePendingPreview, useRecentDocuments (D-B2)
```

### 5. FE — mutation onSuccess dashboard invalidate (4 mutations)

```typescript
// Source: CITED https://tanstack.com/query/v5/docs/framework/react/guides/invalidations-from-mutations
// frontend/src/features/approval/hooks/useApprovals.ts (EDIT — 2 lines added)

export function useApprove() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ lineId, comment }: { lineId: number; comment?: string }) =>
      approvalApi.approve(lineId, comment ? { comment } : undefined),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['approvals'] });
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });  // ★ D-B3
    },
  });
}
// useReject 동일. useSubmitDocument, useWithdrawDocument @ useDocuments.ts 도 동일 1줄 추가.
```

### 6. FE — ErrorState common component

```tsx
// Source: Project ConfirmDialog pattern + UI-SPEC §8.3
// frontend/src/features/dashboard/components/ErrorState.tsx (NEW)

import { AlertTriangle, Loader2 } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useState } from 'react';

interface Props {
  variant?: 'card' | 'list';  // card (CountCard 내부, 축소) | list (PendingList/RecentDocumentsList, 확장)
}

export default function ErrorState({ variant = 'list' }: Props) {
  const { t } = useTranslation('dashboard');
  const qc = useQueryClient();
  const [retrying, setRetrying] = useState(false);

  const handleRetry = async () => {
    setRetrying(true);
    try {
      await qc.refetchQueries({ queryKey: ['dashboard'] });
    } finally {
      setRetrying(false);
    }
  };

  const iconSize = variant === 'card' ? 'h-8 w-8' : 'h-10 w-10';

  return (
    <div
      role="alert"
      aria-live="polite"
      className="flex flex-col items-center justify-center py-6 text-center"
    >
      <AlertTriangle className={`${iconSize} text-amber-500 mb-3`} aria-hidden="true" />
      <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
        {t('error')}
      </p>
      {variant !== 'card' && (
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          {t('errorDesc')}
        </p>
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

### 7. BE Integration Test — department hierarchy × role × status matrix

```java
// Source: Existing patterns:
// - backend/src/test/java/com/micesign/document/ApprovalServiceAuditTest.java (@SpringBootTest + JdbcTemplate)
// - backend/src/test/java/com/micesign/document/DocumentSearchPermissionMatrixTest.java (role fixture)
// backend/src/test/java/com/micesign/dashboard/DashboardServiceIntegrationTest.java (NEW)

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@DisplayName("Phase 31 — Dashboard 권한 × 4카드 × 부서 계층 matrix (DASH-01 locked)")
class DashboardServiceIntegrationTest {

    @Autowired MockMvc mockMvc;
    @Autowired TestTokenHelper tokenHelper;   // Phase 30 자산 재사용
    @Autowired JdbcTemplate jdbc;
    @Autowired DashboardService dashboardService;
    @Autowired ObjectMapper objectMapper;

    // Fixture:
    //   HQ (root dept, id=11)
    //    ├─ Engineering (id=12, parent=11)
    //    │    └─ Platform (id=13, parent=12)
    //    └─ Sales (id=14, parent=11)
    // Users:
    //   sa (SUPER_ADMIN, dept=HQ)
    //   adminEng (ADMIN, dept=Engineering)
    //   userPlat (USER, dept=Platform)
    //   userSales (USER, dept=Sales)
    // Documents (SQL INSERT, skip ApplicationEvent):
    //   userPlat 기안: 1 DRAFT, 1 SUBMITTED, 1 APPROVED, 1 REJECTED
    //   userSales 기안: 1 SUBMITTED, 1 APPROVED
    // ApprovalLines:
    //   userPlat SUBMITTED → approver=adminEng (PENDING)
    //   userSales SUBMITTED → approver=userPlat (PENDING)

    @BeforeEach
    void seedFixture() { /* JdbcTemplate INSERT 재료 */ }

    @AfterEach
    void cleanup() { /* prefix 기반 삭제 */ }

    @Test
    @DisplayName("USER: self-scope 카운트")
    void userScope() throws Exception {
        String token = tokenHelper.issue(userPlatId, "USER", platformDeptId);
        // expect: pendingCount=1 (userPlat 이 userSales 문서 approver),
        //         submittedCount=1, approvedCount=1, rejectedCount=1, draftCount=1
        callAndAssert(token, 1, 1, 1, 1, 1);
    }

    @Test
    @DisplayName("ADMIN: 본인 + descendants(Engineering + Platform) scope")
    void adminDescendantScope() throws Exception {
        String token = tokenHelper.issue(adminEngId, "ADMIN", engineeringDeptId);
        // descendants = [Engineering, Platform]
        // drafterIds = [adminEng, userPlat]
        // userSales (dept=Sales) 문서는 제외
        // expect:
        //   submittedCount = 1 (userPlat),
        //   approvedCount = 1 (userPlat),
        //   rejectedCount = 1 (userPlat),
        //   pendingCount = 1 (adminEng 가 userPlat SUBMITTED 의 approver)
        callAndAssert(token, /*pending*/ 1, /*sub*/ 1, /*approved*/ 1, /*rejected*/ 1, /*draft*/ 1);
    }

    @Test
    @DisplayName("SUPER_ADMIN: 전사 scope")
    void superAdminAllScope() throws Exception {
        String token = tokenHelper.issue(saId, "SUPER_ADMIN", hqDeptId);
        // expect:
        //   submittedCount = 2, approvedCount = 2, rejectedCount = 1, draftCount = 1
        //   pendingCount = 전체 PENDING (userPlat SUBMITTED + userSales SUBMITTED 의 active step 의 approver 합계 = 2)
        callAndAssert(token, /*pending*/ 2, /*sub*/ 2, /*approved*/ 2, /*rejected*/ 1, /*draft*/ 1);
    }

    @Test
    @DisplayName("rejectedCount 와 approvedCount 가 분리되어 반환된다 (D-A2)")
    void dtoFieldsSeparated() throws Exception {
        String token = tokenHelper.issue(userPlatId, "USER", platformDeptId);
        MvcResult res = mockMvc.perform(get("/api/v1/dashboard/summary").header("Authorization", "Bearer " + token))
            .andExpect(status().isOk())
            .andReturn();
        JsonNode body = objectMapper.readTree(res.getResponse().getContentAsString());
        assertThat(body.at("/data/rejectedCount").asLong()).isEqualTo(1L);
        assertThat(body.at("/data/approvedCount").asLong()).isEqualTo(1L);  // or /completedCount 필드명 결정
        assertThat(body.at("/data/submittedCount").asLong()).isEqualTo(1L);
        assertThat(body.at("/data/pendingCount").asLong()).isEqualTo(1L);
    }

    @Test
    @DisplayName("10단계 deep tree 도 CTE 가 종료된다 (Pitfall 2 방어)")
    void deepTreeRecurses() { /* 10-level dept 체인 seed → ADMIN 이 root dept → 10개 descendant 전부 수집 */ }

    // 기타: 부서에 user 0명일 때, inactive user 도 카운트에 포함, 등
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `keepPreviousData: true` option | `placeholderData: keepPreviousData` helper 또는 `(prev) => prev` | TanStack Query v5 (2024 major) | MiceSign v1.2 는 이미 v5 사용, 동일 패턴 적용 |
| `isPreviousData` flag | `isPlaceholderData` flag | TanStack Query v5 | 테스트 assertion 에서 변경 주의 |
| JPQL WITH 절 (Hibernate 6 기능) | Native `@Query WITH RECURSIVE` | Spring Data JPA 3.2.6 이전까지 JPQL WITH 미지원 | MiceSign 은 native 선택 (리스크 최소) |
| 수동 `queryClient.refetchQueries` | `invalidateQueries` (stale mark + auto-refetch if active) | 2021+ 베스트 프랙티스 | 본 Phase 는 후자 표준 |
| Callback-based Hibernate `ResultTransformer` | Spring Data projection interface 또는 `List<Long>` primitive | Hibernate 5.2+ | MiceSign 은 primitive List 사용 |

**Deprecated/outdated:**
- `keepPreviousData` option: TanStack Query v5 에서 제거 [CITED: tanstack migrating-to-v5 docs]
- `isPreviousData`: `isPlaceholderData` 로 대체
- JPQL WITH 절에 기대하지 말 것 (Spring Data JPA 버전 잠금으로 runtime risk)

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | MariaDB 10.11 `cte_max_recursion_depth` default = 1000 | Pitfall 2, Code Example 1 | 매우 낮음 — 이미 deep tree (>10 단계) 사용 시 문제 되나 MiceSign 부서 트리는 ~3-5 단계 |
| A2 | MiceSign 부서 트리 typical depth ≤ 5 levels | Pitfall 2 | 낮음 — ORG-01 도메인 + 50명 규모에서 현실적 추정 |
| A3 | Spring Data JPA 가 `@Query(nativeQuery=true) SELECT id FROM ...` 를 `List<Long>` 로 자동 매핑 (Hibernate 6 + MariaDB JDBC driver) | Pitfall 3, Code Example 1 | 낮음 — 표준 동작이나 드물게 `BigInteger` 반환 사례 존재. fallback = `CAST(id AS SIGNED)` |
| A4 | FSD "ADMIN 부서 범위" 의 "부서" 가 계층적 의미 | D-A9 Resolution | **중간** — FSD 원문 (§FN-SEARCH-001) 재검토 필요. 단일 부서 의미면 D-A9 Option 2 가 정합. 그러나 CONTEXT D-A4/A6 은 계층으로 결정 → CONTEXT 우선. 사용자 확인 권장 |
| A5 | `CustomUserDetails.getRole()` / `.getDepartmentId()` 가 DashboardService 호출 시점에 non-null 반환 | Pitfall 9 | 낮음 — Phase 29/30 에서 이미 검증 |
| A6 | `recentPending` / `recentDocuments` 목록은 **본인 스코프 유지** (ADMIN 도 "본인 앞 결재" 5건 / "본인이 기안한" 5건) | Code Example 2 | **중간** — D-A5 은 "카드 pendingCount 부서 확장" 만 명시. 목록 스코프는 문서화 부재. planner 재확인 필요 — 가장 일반적 해석은 "목록은 나 개인, 카드는 부서 현황" |
| A7 | D-A2 의 `completedCount` 재정의가 필드명 rename 을 의미 (또는 유지하면서 semantics 만 변경) | Code Example 2, DTO | 낮음 — planner 가 필드명 유지 vs `approvedCount` rename 결정. 필드명 유지가 FE 변경 최소 |
| A8 | Lucide 1.7.x 에 `Hourglass`, `XCircle`, `AlertTriangle`, `Loader2` 모두 포함 | UI-SPEC §5 | 매우 낮음 — Lucide 0.x 이후 포함, 1.x 공식 export |
| A9 | TanStack Query v5 refetchInterval 과 invalidateQueries 가 충돌 없이 공존 (default cancelRefetch=true 로 중복 요청 자동 cancel) | Pitfall 4, D-B4 | 낮음 — [CITED: tanstack docs] 명시. 특이케이스 존재하지만 본 시나리오 무관 |
| A10 | Phase 30 Plans 가 아직 실행 완료되지 않았다 (ROADMAP 0/5) — 따라서 D-A9 Option 1 이 배포 후 회귀 아닌 fresh 작업 | D-A9 Resolution | 낮음 — ROADMAP 기록 + Phase 30 plan files 존재 but not executed. STATE.md `completed_plans: 0` 확인 |

**⚠️ 사용자 확인 권장 (A4, A6):** Phase 31 논의 중 혼선 예방을 위해 planner / 사용자에게 질문 권고.

---

## Open Questions (RESOLVED)

> 모든 Open Question 은 Plan 01-06 에서 plan-level 결정으로 반영됨. 아래 `**RESOLVED:**` 항목 참조.

1. **D-A5 pending 카드 ADMIN 부서 확장의 실제 의미는?**
   - 무엇을 알고 있나: CONTEXT D-A5 = "ADMIN 인 경우 본인 + 부서원 앞 PENDING 결재 합산". "부서원" 이 계층 descendants 포함인지 단일 부서인지 명시 부재 (D-A6 는 drafter 기준으로 얘기하지만 approver 에 대해서는 explicit 아님).
   - 무엇이 불명확한가: `ApprovalLineRepository.countPendingByApproverIdIn(approverIds)` 의 approverIds 가 descendantDeptIds 를 통한 user 합집합인지 단일 부서 user 만인지.
   - 권장: 본 research 는 **descendantDeptIds → userIds** 로 해석 (D-A6 와 일관). planner 가 UAT 에서 최종 확정.
   - **RESOLVED:** descendantDeptIds → userIds (approvers in self + descendant departments); drafter 스코프 D-A6 와 일관. Plan 02 DashboardService ADMIN 분기가 `findDescendantIds → findIdsByDepartmentIdIn` chain 으로 구현.

2. **`recentPending` / `recentDocuments` 목록 스코프는 본인 기준? 아니면 카드와 동일 부서 확장?**
   - 무엇을 알고 있나: CONTEXT D-A4/A5 는 카드 카운트 스코프만 명시. 목록은 본인 스코프가 현재 구현.
   - 무엇이 불명확한가: ADMIN 대시보드의 "결재 대기 문서 5건" 이 부서 전체 PENDING 5건인지, 본인 앞 5건인지.
   - 권장: **목록은 본인 기준 유지** (Assumption A6). 근거: 목록 타이틀이 "내가 처리할 결재 5건" / "내가 기안한 최근 5건" 이며 "내가" 가 key. 부서 현황은 카드 숫자가 제공.
   - **RESOLVED:** 본인 기준 유지 (카드 ≠ 리스트 스코프). ADMIN/SUPER_ADMIN 도 `recentPending`/`recentDocuments` 는 `userId` 기준. Plan 02 DashboardService 가 role 불문 `findPendingByApproverId(userId)` + `findByDrafterId(userId)` 호출.

3. **`DashboardSummaryResponse` 필드명 `completedCount` 유지 vs `approvedCount` rename?**
   - 무엇을 알고 있나: CONTEXT D-A2 = "`completedCount` semantics 재정의(APPROVED only)" — semantics 만 변경, 필드명 유지 읽힘.
   - 무엇이 불명확한가: FE 타입 `dashboard.ts` 에서 `completedCount` 가 "승인 완료" 카드 라벨에 대응되므로 이름 변경하면 가독성 향상.
   - 권장: **필드명 유지 (`completedCount`)** + 주석으로 "= APPROVED only" 명기. FE 변경 최소화 (타입/로직 그대로).
   - **RESOLVED:** 필드 이름 `completedCount` 유지 + 주석 "APPROVED only" (Plan 01 DTO + Plan 03 TS 인터페이스 모두 반영). BE/FE contract break 회피.

4. **Phase 30 의 `DocumentSearchPermissionMatrixTest` fixture 확장 범위**
   - 무엇을 알고 있나: 현재 테스트는 단일 부서 ADMIN fixture.
   - 무엇이 불명확한가: D-A9 Option 1 채택 시 matrix 에 hierarchical fixture 를 얼마나 추가해야 regression 보장?
   - 권장: 최소 3 케이스 — (a) ADMIN 이 본인 부서 descendants 문서까지 검색 결과에 보임, (b) ADMIN 이 descendant 아닌 부서 문서 보이지 않음, (c) tab=department 도 descendant 모두 매칭. planner 가 task 단위에 반영.
   - **RESOLVED:** Plan 02 Task 3 에서 3 hierarchical cases 추가 — `adminOfEngineering_sees_platformUser_document_via_hierarchy` (self + 하위) / `adminOfPlatform_does_not_see_engineering_sibling_documents` (상위 방향 차단) / `tab_department_for_admin_engineering_covers_platform` (tab=department scope). Plan 06 의 D-A9 Option 1 impl 과 연계.

5. **i18n EN 파일 생성 여부**
   - 무엇을 알고 있나: `frontend/public/locales/ko/dashboard.json` 만 존재. UI-SPEC §13.1 이 `en/dashboard.json` 도 신규 생성 권고.
   - 무엇이 불명확한가: 본 Phase 범위에 포함?
   - 권장: **ko 만 수정, en 은 Deferred**. 기존 i18next fallback 이 영어 미존재 시 한국어 표시 → 영문 UI 는 v1.3+.
   - **RESOLVED:** ko-only in this phase. en/dashboard.json 은 v1.3 i18n pass 로 deferred. Plan 03 Task 3 는 ko 만 수정.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Java 17 | Gradle build | ✓ (project constraint) | 17 LTS | — |
| Spring Boot 3.5.13 | Backend runtime | ✓ | 3.5.13 | — |
| MariaDB 10.11+ | CTE WITH RECURSIVE, storage | ✓ (project constraint) | 10.11 LTS | — |
| QueryDSL 5.1.0 jakarta | Phase 30 predicate 확장 | ✓ | 5.1.0 | — |
| Flyway | Schema migration | ✓ | Boot 3.5 BOM | 사용 안 함 (Phase 31 스키마 변경 없음) |
| Node.js | FE build/test | ✓ (project default) | — | — |
| @tanstack/react-query | FE state | ✓ | 5.95.2 | — |
| vitest | FE test runner | ✓ | 4.1.4 | — |
| jsdom | FE test env | ✓ | 29.0.2 | — |
| @testing-library/react | FE RTL | ✓ | 16.3.2 | — |
| lucide-react | UI icons (Hourglass/XCircle/AlertTriangle/Loader2) | ✓ | 1.7.0 | — |
| react-i18next | i18n | ✓ | 17.0.2 | — |

**Missing dependencies with no fallback:** 없음
**Missing dependencies with fallback:** 없음

**신규 의존성 추가:** 없음 (전부 기존 스택 재사용).

---

## Validation Architecture

> `workflow.nyquist_validation: true` (config.json:19) → 본 섹션 포함.

### Test Framework

| Property | Value |
|----------|-------|
| Backend framework | JUnit 5 + Spring Boot Test 3.5.13 + MockMvc + JdbcTemplate (+ H2 runtime) |
| Backend config file | `backend/build.gradle.kts` L65-71 + `backend/src/test/resources/application-test.yml` (기존) |
| Backend quick run | `./gradlew test --tests "com.micesign.dashboard.*"` |
| Backend full suite | `./gradlew test` (전체 약 5-8분) |
| Frontend framework | Vitest 4.1.4 + jsdom 29.0.2 + @testing-library/react 16.3.2 |
| Frontend config file | `frontend/vitest.config.ts` |
| Frontend quick run (hook) | `cd frontend && npx vitest run src/features/approval/hooks/__tests__/useApprovals.invalidation.test.ts src/features/document/hooks/__tests__/useDocuments.invalidation.test.ts src/features/dashboard/pages/__tests__/DashboardPage.test.tsx` |
| Frontend full suite | `cd frontend && npm test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DASH-01 | 4카드 4개 숫자가 role × 부서 계층에 맞게 반환 | integration (BE) | `./gradlew test --tests "DashboardServiceIntegrationTest#userScope"` + `#adminDescendantScope` + `#superAdminAllScope` | ❌ Wave 0 (새 테스트 클래스) |
| DASH-01 | 4카드 FE 렌더링 (Clock/Hourglass/CheckCircle2/XCircle + 색상) | smoke (FE RTL) | `npx vitest run src/features/dashboard/pages/__tests__/DashboardPage.test.tsx` | ❌ Wave 0 |
| DASH-01 | `rejectedCount` 필드 분리 반환 (D-A2) | integration (BE) | `./gradlew test --tests "DashboardServiceIntegrationTest#dtoFieldsSeparated"` | ❌ Wave 0 |
| DASH-02 | `recentPending` + `recentDocuments` 5건씩 반환 | integration (BE, 기존 동작 회귀) | 기존 테스트 + 신규 matrix | ❌ Wave 0 (기존 DashboardService 에 테스트 없음, 신규 생성 시 포함) |
| DASH-03 | "새 문서 작성" CTA → TemplateSelectionModal 오픈 | smoke (FE RTL) | `npx vitest run DashboardPage.test.tsx` (CTA 클릭 → modal role=dialog 단언) | ❌ Wave 0 |
| DASH-04 | Skeleton 로딩 상태 노출 (isLoading=true 시) | smoke (FE RTL) | `DashboardPage.test.tsx` 에서 `useDashboardSummary` mock 이 `isPending=true` 반환 → skeleton block 렌더 확인 | ❌ Wave 0 |
| DASH-04 | Empty 상태 노출 (data.content.length===0) | smoke (FE RTL) | `DashboardPage.test.tsx` 에서 빈 배열 mock → Lucide 아이콘 + 한글 문구 screen.getByText 단언 | ❌ Wave 0 |
| DASH-04 | Error 상태 노출 (isError=true) + "다시 시도" 버튼 | smoke (FE RTL) | `DashboardPage.test.tsx` 에서 isError mock → AlertTriangle + 버튼 click 시 queryClient.refetchQueries 호출 스파이 | ❌ Wave 0 |
| DASH-05 | `useApprove` onSuccess 가 `['dashboard']` invalidate | unit (FE RTL + spyOn) | `useApprovals.invalidation.test.ts` | ❌ Wave 0 |
| DASH-05 | `useReject` onSuccess 가 `['dashboard']` invalidate | unit | 동상 | ❌ Wave 0 |
| DASH-05 | `useSubmitDocument` onSuccess 가 `['dashboard']` invalidate | unit (FE RTL + spyOn) | `useDocuments.invalidation.test.ts` | ❌ Wave 0 |
| DASH-05 | `useWithdrawDocument` onSuccess 가 `['dashboard']` invalidate | unit | 동상 | ❌ Wave 0 |
| **D-A9** | Phase 30 predicate 계층 확장 regression (ADMIN 이 descendant 부서 user 의 문서를 검색 결과에 본다) | integration (BE, Phase 30 matrix 확장) | `./gradlew test --tests "DocumentSearchPermissionMatrixTest#adminSeesDescendantDepartmentDocuments"` | ❌ Wave 0 (새 case 추가) |

### Sampling Rate

- **Per task commit:** `./gradlew test --tests "Dashboard*"` (BE, 해당 task 관련) + `npx vitest run <changed hooks>` (FE)
- **Per wave merge:** `./gradlew test` + `npm test` 전체
- **Phase gate:** `./gradlew test` + `npm test` + HUMAN-UAT 5항 (D-D3) 전부 pass 후 `/gsd-verify-work`

### Wave 0 Gaps

- [ ] `backend/src/test/java/com/micesign/dashboard/DashboardServiceIntegrationTest.java` — DASH-01~02 + D-A2 (5+ 케이스)
- [ ] `backend/src/test/java/com/micesign/document/DocumentSearchPermissionMatrixTest.java` — hierarchical case 3건 추가 (D-A9 regression)
- [ ] `frontend/src/features/approval/hooks/__tests__/useApprovals.invalidation.test.ts` — DASH-05 (useApprove + useReject)
- [ ] `frontend/src/features/document/hooks/__tests__/useDocuments.invalidation.test.ts` — DASH-05 (useSubmitDocument + useWithdrawDocument)
- [ ] `frontend/src/features/dashboard/pages/__tests__/DashboardPage.test.tsx` — DASH-01/03/04 smoke
- [ ] `.planning/phases/31-dashboard/31-HUMAN-UAT.md` — 5항 매뉴얼 (D-D3)

**Framework install:** N/A — 모두 기존 설치됨.

---

## Security Domain

> `security_enforcement` 키가 `.planning/config.json` 에 없음 → 기본 enabled 가정. 단, MiceSign 의 보안 제어 대부분은 Phase 2/Phase 30 SRCH-01 에 확립되어 있고 Phase 31 은 read-only 집계.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes (기존) | `@AuthenticationPrincipal CustomUserDetails` — 이미 Phase 2 에서 확립. 본 Phase 무변경 |
| V3 Session Management | no (변경 없음) | JWT Access Token 유지 |
| V4 Access Control | yes | **Dashboard 는 인증된 모든 사용자가 호출 가능.** 반환 값이 role × scope 에 따라 필터링됨. `@PreAuthorize` 미사용 — Service 레벨 role 분기가 SoT |
| V5 Input Validation | 제한적 적용 | Dashboard endpoint 는 body/query param 없음 (path-only). SQL injection 면역 (모든 쿼리 parameterized) |
| V6 Cryptography | no | 평문 집계 결과, 암호화 무관 |
| V7 Error Handling | yes | 에러 시 500 대신 한글 code + message (GlobalExceptionHandler). FE 는 AlertTriangle UI 로 safe-degrade |
| V8 Data Protection | yes (간접) | `recentPending`/`recentDocuments` 가 본인 스코프 — 타인의 문서 제목/기안자 노출 zero. role 분기 count 도 부서 경계 넘지 않음 |
| V9 Communication | no | HTTPS 는 infrastructure |

### Known Threat Patterns for MiceSign Dashboard

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| 권한 우회 — USER 가 ADMIN 스코프 카운트 엿보기 | Information Disclosure | `CustomUserDetails.getRole()` 이 SoT, 임의로 ADMIN 행세 불가. JWT signature 검증 (Phase 2) |
| SQL injection via CTE | Tampering | `@Query(nativeQuery=true)` 는 named parameter `:deptId` 만 사용 — binding parameter, 문자열 concatenation 없음 [CITED: Spring Data JPA docs] |
| DoS — 깊은 부서 트리로 CTE 무한 루프 | Denial of Service | `cte_max_recursion_depth=1000` MariaDB default (Pitfall 2), 트리 깊이 검증을 ORG-01 admin UI 에서 사전 차단 (기존) |
| 캐시 누락 — 로그아웃 후 다른 사용자 로그인 시 이전 대시보드 숫자 노출 | Information Disclosure | `QueryClientProvider` root 이 login/logout 시 `queryClient.clear()` 호출 (Phase 2 확립). Phase 31 무변경 |
| Timing attack — count 쿼리 응답 시간으로 ADMIN descendants 수 추정 | Information Disclosure | 미치는 정보 극히 제한적 (부서 수만 추정). 운영 acceptable risk |
| Cross-role escalation — ADMIN token 으로 다른 부서 ADMIN 행세 | Elevation of Privilege | `departmentId` 는 CustomUserDetails 에서 주입, 사용자 변조 불가 |
| Race condition — mutation 직후 invalidate 전에 다른 탭에서 fetch | 읽기/쓰기 race | `refetchInterval: 60_000` fallback + 단일 사용자 시나리오 | 50명 규모 negligible |

**Dashboard 는 read-only 집계** → write path 관련 위협 (CSRF, replay 등) 무관. 가장 중요한 위협은 **role 분기의 정확성 검증** — `DashboardServiceIntegrationTest` 가 이를 matrix 로 cover.

---

## Sources

### Primary (HIGH confidence)

- **Context7** `/tanstack/query` — TanStack Query v5 `invalidateQueries` API reference, `placeholderData (previousData) => previousData` migration pattern, `refetchType` default 'active' 의미, prefix matching 규칙, testing with `renderHook` + wrapper.
- **TanStack Query v5 docs** https://tanstack.com/query/v5/docs/reference/QueryClient — `invalidateQueries` 공식 reference (`filters`, `options`, `cancelRefetch: true` default).
- **TanStack Query v5 docs** https://tanstack.com/query/v5/docs/framework/react/guides/query-invalidation — prefix vs exact match 동작.
- **TanStack Query v5 docs** https://tanstack.com/query/v5/docs/framework/react/guides/invalidations-from-mutations — mutation onSuccess 패턴.
- **TanStack Query v5 docs** https://tanstack.com/query/v5/docs/framework/react/guides/testing — renderHook + QueryClientProvider wrapper.
- **TanStack Query v5 migration docs** https://tanstack.com/query/v5/docs/react/guides/migrating-to-v5 — `keepPreviousData` → `placeholderData` migration.
- **MiceSign codebase** — 실 코드 읽기 (verified 2026-04-24):
  - `backend/src/main/java/com/micesign/repository/DocumentRepositoryCustomImpl.java` — Phase 30 현행 predicate 확인
  - `backend/src/main/java/com/micesign/service/DashboardService.java` — DashboardService 현행
  - `backend/src/main/java/com/micesign/repository/ApprovalLineRepository.java:43-49` — countPendingByApproverId 쿼리
  - `backend/src/main/java/com/micesign/domain/Department.java` — parent_id 컬럼 존재
  - `backend/src/main/resources/db/migration/V1__create_schema.sql:5-18` — department table DDL
  - `backend/build.gradle.kts` — 의존성 버전
  - `frontend/package.json` — FE 의존성 버전
  - `frontend/src/features/dashboard/hooks/useDashboard.ts` — 현행 3 훅
  - `frontend/src/features/approval/hooks/useApprovals.ts` / `frontend/src/features/document/hooks/useDocuments.ts` — 현행 invalidate 패턴
  - `frontend/src/features/document/pages/__tests__/DocumentListPage.test.tsx` — FE 테스트 패턴
  - `backend/src/test/java/com/micesign/document/ApprovalServiceAuditTest.java` — BE 테스트 패턴
- **npm registry 실측 2026-04-24**: `@tanstack/react-query@5.100.1`, `vitest@4.1.5`, `lucide-react@1.9.0`.

### Secondary (MEDIUM confidence — WebSearch verified with official source)

- **Vlad Mihalcea** https://vladmihalcea.com/hibernate-with-recursive-query/ — Hibernate 6+ WITH RECURSIVE JPQL & native 패턴.
- **MariaDB docs** https://mariadb.com/docs/server/reference/sql-statements/data-manipulation/selecting-data/common-table-expressions/recursive-common-table-expressions-overview — 공식 recursive CTE syntax + 한계.
- **MariaDB docs runebook** https://runebook.dev/en/docs/mariadb/recursive-common-table-expressions-overview/index — best practices (depth, indexing).
- **Spring Data JPA issue #2981 / #3504** https://github.com/spring-projects/spring-data-jpa/issues/2981 — CTE in HQL parser 지원 역사 (3.2.5 이전 `BadJpqlGrammarException`).
- **MySQL worklog 10972** https://dev.mysql.com/worklog/task/?id=10972 — cte_max_recursion_depth 1000 default (MariaDB 와 공유).
- **Apache Bench + MariaDB** 성능 추정 — 50 users × 50 depts 규모에서 CTE < 5ms 예상 (Vlad Mihalcea article referenced performance for similar patterns).

### Tertiary (LOW confidence — WebSearch only, 단일 소스)

- **GitHub discussion #4391** https://github.com/TanStack/query/discussions/4391 — invalidateQueries spy 패턴 (단일 커뮤니티 소스지만 구체 코드 예시 제공).
- **tkdodo blog** https://tkdodo.eu/blog/testing-react-query — TanStack Query testing practices (maintainer blog).

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — npm registry 실측 + build.gradle.kts verified
- Architecture patterns: HIGH — 기존 MiceSign 패턴 (Phase 29/30) + Context7 공식 docs 교차 검증
- D-A9 Resolution: HIGH — 실 코드 (DocumentRepositoryCustomImpl.java line 75-78) 확인으로 완전 검증
- Pitfalls: HIGH — 공식 docs + 프로젝트 코드 + 주요 라이브러리 이슈 트래커 교차
- Test patterns: HIGH — 기존 프로젝트 테스트 파일 직접 읽음
- Recursive CTE: HIGH — MariaDB 공식 문서 + Spring Data JPA 공식 가이드 확인
- FE testing with spy: MEDIUM — 공식 docs 에서는 mutation test 가이드 제한적, 커뮤니티 패턴 verified against existing project code

**Research date:** 2026-04-24
**Valid until:** 2026-05-24 (30일, stable milestone)

---

*Phase: 31-dashboard*
*Research completed: 2026-04-24*

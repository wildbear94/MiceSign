# Phase 31: 대시보드 고도화 - Context

**Gathered:** 2026-04-24
**Status:** Ready for planning

<domain>
## Phase Boundary

대시보드를 v1.0 기본 수준(3개 CountCard + 60s refetch polling)에서 **(1) 4카드 노출(결재 대기 / 진행 중 / 승인 완료 / 반려) + (2) 결재/문서 mutation 직후 실시간 갱신(`invalidateQueries(['dashboard'])`) + (3) skeleton·empty·error 상태 강화**로 retrofit 한다. 백엔드 `DashboardSummaryResponse` 는 이미 `submittedCount` 포함(노출만 안 됨)이나 본 phase 에서 `rejectedCount` 신설 + `completedCount` semantics 재정의 + ADMIN/SUPER_ADMIN 스코프 확장을 병행한다.

**v1.2 retrofit 마일스톤 — 그러나 순수 FE-only retrofit 아님**: REQUIREMENTS DASH-01 "결재 대기 / 진행 중 / 승인 완료 / 반려" 가 FSD v1.0 의 "대기 / 진행중 / 임시저장 / 승인완료" 와 다르고, ADMIN 부서 스코프 확장이 백엔드 `DashboardService.getDashboardSummary` 개편을 수반. drafts 카드는 UI 에서 제거(Recent Documents 목록 badge 로 대체).

**Requirements (locked via ROADMAP):** DASH-01, DASH-02, DASH-03, DASH-04, DASH-05

**Success Criteria (from ROADMAP):**
1. 대시보드 상단에 "결재 대기 / 진행 중 / 승인 완료 / 반려" 4개의 CountCard — 권한·스코프에 맞는 숫자 표시 (USER=본인, ADMIN=본인+부서 계층, SUPER_ADMIN=전사)
2. 중앙에 "내가 처리할 결재 5건" + "내가 기안한 최근 문서 5건" 목록 + "새 문서 작성" CTA
3. 로딩 중 skeleton UI, 결과 없을 때 위젯별 empty 상태 (일러스트 + 문구)
4. 결재 승인/반려/상신/회수 mutation 성공 시 `queryClient.invalidateQueries(['dashboard'])` 즉시 호출 → 페이지 이동 없이 UI 반영

</domain>

<decisions>
## Implementation Decisions

### A. 카드 구성 · 백엔드 DTO · 권한 스코프

- **D-A1:** 4카드 라벨/데이터 세트 = REQUIREMENTS v1.2 준수 — **결재 대기(pendingCount) / 진행 중(submittedCount) / 승인 완료(approvedCount=APPROVED) / 반려(rejectedCount=REJECTED)**. FSD v1.0 §FN-DASH-001 의 "대기 / 진행중 / 임시저장 / 승인완료" 세트는 REQUIREMENTS 와 충돌하므로 **REQUIREMENTS 가 우선**.
- **D-A2:** `DashboardSummaryResponse` DTO 변경 = **`rejectedCount` 신규 추가** + `completedCount` semantics 재정의(= APPROVED only, 기존 APPROVED+REJECTED 합산 폐기). `draftCount` 필드는 그대로 유지(재사용 가능성 대비, FE 노출만 제거). FE 타입 동기 업데이트 필요.
- **D-A3:** drafts 카드 = **완전 제거 (FE only)** — `DashboardPage.tsx` 의 drafts CountCard 삭제. DRAFT 상태 문서는 "내가 기안한 최근 문서 5건" 목록에서 `DocumentStatusBadge` 로 자연스럽게 노출. 별도 필터 pill 없음. i18n key `dashboard.drafts` 는 향후 재사용 가능성 고려해 삭제하지 않음(orphan key 허용).
- **D-A4:** 권한별 스코프 = **role 기반 분기 backend 구현**:
  - `USER`: 본인 drafter_id 기준 (기존 그대로)
  - `ADMIN`: **본인 + 부서원(계층 재귀) 합산** — 본인이 속한 부서 + 모든 하위 부서(parent_id recursive) 의 사용자들이 drafter 인 문서까지 포함
  - `SUPER_ADMIN`: 전사 스코프 (drafter 필터 zero, 모든 문서)
- **D-A5:** pending 카드도 **ADMIN 부서 확장 적용** — 기본은 approver_id 기준(본인 앞 결재)이지만, ADMIN 인 경우 `본인 + 부서원(계층 재귀) 앞 PENDING 결재` 합산. SUPER_ADMIN 은 전체 PENDING approval_line count. pending 의 "내가 처리할 일" 의미가 다소 흐려지지만 ADMIN 의 "부서 현황판" 의미를 우선.
- **D-A6:** 부서 계층 매칭 = **parent_id 재귀처리** (MariaDB WITH RECURSIVE CTE). `Department` 엔티티는 이미 `parent_id` + `parent/children` 관계 구현됨 — 재귀 CTE 로 descendant_department_ids 수집 후 `user.department_id IN (...)` 로 drafter/approver 필터. 성능은 EXPLAIN 후 필요 시 `idx_user_department` 보강 검토.
- **D-A7:** UserStatus 필터링 = **ACTIVE/INACTIVE/RETIRED 모두 포함** (정책 없음). 기존 `countByDrafterIdAndStatus` 와 일관 — 과거 퇴직자 기안 문서도 카운트에 반영. NOTIF-04 의 "RETIRED 수신자 skip" 은 발송 대상 필터이고, 대시보드 카운트는 "과거 작업량" 의미이므로 다른 정책.
- **D-A8:** 카드 클릭 navigation URL = **스코프에 따라 분기**:
  - USER: 결재 대기 → `/approvals/pending` (기존 유지), 진행/승인/반려 → `/documents/my?status=...`
  - ADMIN/SUPER_ADMIN: 결재 대기 → `/approvals/pending` (본인 기준 유지), 진행/승인/반려 → **`/documents?tab=search&status=...`** (Phase 30 의 권한 predicate 활용으로 대시보드 숫자와 검색 결과 자연 정합)
- **D-A9:** 숫자 정합성 리스크 — Phase 30 의 ADMIN predicate 는 **단일 부서 매칭** (`drafter_id IN (SELECT id FROM user WHERE department_id = :myDepartmentId)`), Phase 31 의 계층 재귀 스코프와 다름. Planner 가 반드시 결정해야 할 안건:
  - **Option 1 (권장)**: Phase 30 predicate 를 계층 재귀로 업그레이드 (Phase 31 에서 수반 변경). 양쪽 일치, SoT 확보.
  - **Option 2**: Phase 31 을 단일 부서로 다운그레이드. 계층 재귀 스코프 포기.
  - 이 결정은 PLAN.md 의 첫 task 또는 research 단계에서 명시.

### B. 실시간 갱신 — invalidateQueries 훅업

- **D-B1:** dashboard queryKey 구조 통일 = **`['dashboard', 'summary']` 단일 키** (도메인 prefix). 기존 분산된 `['dashboard', 'summary']` / `['approvals', 'pending', 0, 5]` / `['documents', 'my', 0, 5]` 3종 패턴 폐기.
- **D-B2:** **단일 endpoint 로 3위젯 통합** — 기존 `usePendingPreview`, `useRecentDocuments` 훅은 **제거**. `DashboardSummaryResponse` 에 `recentPending` + `recentDocuments` 이미 포함되어 있으므로 `useDashboardSummary` 1회 호출로 4카운트 + 2리스트 모두 확보. `PendingList` / `RecentDocumentsList` 는 props (또는 context) 로 리스트 수신 리팩터.
- **D-B3:** mutation onSuccess 에서 **`['dashboard']` prefix invalidate 만 추가** — 기존 `['approvals']`, `['documents']` invalidate 는 그대로 유지. 대상 4 mutation: `useApprove`, `useReject`, `useSubmitDocument`, `useWithdrawDocument`. `useRewriteDocument`, `useCreateDocument` 는 DASH-05 원문에서 제외 (draft 생성은 대시보드 4카드에 영향 zero).
- **D-B4:** refetchInterval = **60_000 유지** (fallback safety net) — invalidate 누락 시 또는 다른 탭 background 에서 외부 변경 반영. 제거하지 않음.
- **D-B5:** optimistic update = **사용 안 함** — mutation onSuccess → `invalidateQueries` → refetch 패턴만. 50 user / <1초 응답 환경에서 체감상 즉시. optimistic 은 롤백 로직 + ADMIN 스코프 복잡도 증가 리스크 → Deferred. (planner 가 UX 요구 정밀도에 따라 재고 가능)
- **D-B6:** 3위젯 동시 invalidate → 단일 endpoint 호출 이므로 **waterfall 자연 해소**. 백엔드 /dashboard/summary 1회로 4카운트 + 2리스트 모두 반환.
- **D-B7:** `placeholderData: (previousData) => previousData` 추가 — invalidate 직후 skeleton 플래시 방지, 이전 데이터 노출하며 부드러운 전환. Phase 30 `useMyDocuments` / `useSearchDocuments` 와 일관 패턴.

### C. 로딩 · 빈 상태 · 에러 UI

- **D-C1:** Empty state = **Lucide 아이콘 + 문구 패턴 유지** (PendingList: ClipboardCheck h-12, RecentDocumentsList: FileText h-12). 외부 SVG 일러스트 도입하지 않음. DASH-04 의 "일러스트" 는 Lucide 아이콘으로 해석.
- **D-C2:** Error state 통일 UI = **아이콘(AlertTriangle) + 한글 문구("일시적인 오류가 발생했습니다") + "다시 시도" 버튼 (queryClient.refetch)** — 3위젯(CountCard row + PendingList + RecentDocumentsList) 전부 동일 패턴. 기존 CountCard '-' 표시 폐기.
- **D-C3:** Skeleton 정비 = **4카드 그리드 skeleton 재디자인** — `sm:grid-cols-3` → `sm:grid-cols-2 lg:grid-cols-4` 전환 수반. 기존 CountCard isLoading prop shimmer 유지하되 4개 placeholder 배치. 리스트 skeleton (animate-pulse 3행) 은 현 패턴 유지.
- **D-C4:** 4카드 색상/아이콘 매핑:
  - 결재 대기: `text-blue-500` + `Clock` (기존)
  - 진행 중: `text-gray-500` + `Hourglass` 또는 `Loader` (Lucide)
  - 승인 완료: `text-green-500` + `CheckCircle2` (기존)
  - 반려: **`text-red-500` + `XCircle`** (신규, 버건 계열)
- **D-C5:** useDashboardSummary 통합으로 **3위젯 isLoading 자동 동기화** — 현재 분산된 3 쿼리가 각기 다른 타이밍에 skeleton 해제되어 깜빡이던 이슈 자연 해소.

### D. CTA · 테스트 · UAT · PR

- **D-D1:** "새 문서 작성" CTA = **기존 구조 유지** (단일 상단 파란 버튼 + `TemplateSelectionModal` 모달). FSD 의 "양식별 바로가기(일반기안/지출결의/휴가신청)" 은 Deferred — Phase 32 CUSTOM 프리셋 확장과 중복 투자 회피.
- **D-D2:** 테스트 범위 = **핵심 2레이어**:
  - **Backend**: `DashboardServiceTest` 또는 `DashboardControllerIntegrationTest` — USER/ADMIN/SUPER_ADMIN × 4카드 권한 matrix (6 seed 문서 + 부서 계층 fixture 기반). `rejectedCount`/`approvedCount` 분리 검증, 부서 계층 재귀 정확성 검증, pending approver 스코프 확장 검증.
  - **Frontend RTL (vitest + @testing-library/react)**: `useApprove`/`useReject`/`useSubmit`/`useWithdraw` onSuccess 훅이 `queryClient.invalidateQueries({ queryKey: ['dashboard'] })` 를 호출하는지 mock 기반 단위 검증. DashboardPage 4카드 렌더링 smoke test.
- **D-D3:** 수동 UAT 핵심 5항 (`31-HUMAN-UAT.md` 수록):
  1. 4카드 가시성(USER/ADMIN/SUPER_ADMIN 3 role 각각, 카드 수 · 라벨 · 카운트 값 확인)
  2. mutation 실시간 갱신 (승인/반려/상신/회수 각 1회씩 → 대시보드 카운트 즉시 변화)
  3. skeleton (리프레시 후 4카드+2리스트 skeleton 한 번에 표시)
  4. empty state (신규 계정으로 로그인 → 빈 리스트 Lucide 아이콘 + 한글 문구 확인)
  5. error state (network offline → 3위젯 에러 UI + 다시시도 버튼 동작)
- **D-D4:** PR 분할 = **단일 PR** — BE DTO + 권한 집계(WITH RECURSIVE CTE) + FE 4카드 + invalidate 훅업 + empty/error/skeleton + test 모두 1 PR. v1.1 Phase 21-26 retrofit 패턴과 일치. PR 제목 예: `feat(31): 대시보드 4카드 + 권한 스코프 + 실시간 갱신 (DASH-01~05)`.

### Claude's Discretion

- 부서 계층 재귀 SQL 의 정확한 구현 방식 (MariaDB `WITH RECURSIVE` CTE vs JPA `@Query` native vs QueryDSL NumberExpression.list() + loop) — planner 결정. MariaDB 10.11 은 WITH RECURSIVE 지원.
- `DashboardSummaryResponse` 에 `draftCount` 필드 유지 여부의 최종 결정 (현재 유지로 결정되었지만 FE 타입에서 optional 로 표시할지 required 로 유지할지) — planner.
- 4카드 아이콘 "진행 중" 의 정확한 Lucide 컴포넌트 (Hourglass vs Loader vs Clock 변주) — UI 구현 단계 결정.
- Empty state 문구의 정확한 한글 카피 ("아직 처리할 결재가 없습니다" / "내가 기안한 문서가 없습니다" 등) — i18n 작업 시 결정. 기존 `emptyPending` / `emptyRecent` 키 재사용 또는 확장.
- Phase 30 predicate 계층 재귀 upgrade 여부 (D-A9) — planner 가 첫 research task 로 결정. 불일치 허용은 권장 아님.
- CountCard 그리드 반응형 breakpoint (sm:2 vs md:2 vs lg:4) 세부 — 디자인 tweak, 현재 `sm:grid-cols-3` 에서 `md:grid-cols-2 lg:grid-cols-4` 식으로 확장.
- `useDashboardSummary` 의 `placeholderData` 적용 여부와 정확한 세부 (initialData vs placeholderData) — planner 결정.
- Backend 테스트 프레임 선택 (@SpringBootTest vs @DataJpaTest vs Controller MockMvc slice test) — Phase 29/30 패턴 추종.

### Folded Todos

없음 — 현재 Pending Todos "None yet" (STATE.md 기준).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### 프로젝트 스펙 (필수)
- `.planning/REQUIREMENTS.md` §v1.2/DASH/NFR-03 — **DASH-01~05 locked** (4카드 라벨 · invalidateQueries 의무 · skeleton/empty)
- `.planning/ROADMAP.md` §Phase 31 — Success Criteria 4항 locked
- `.planning/PROJECT.md` — core value, constraints, v1.2 milestone goal
- `docs/FSD_MiceSign_v1.0.md` §FN-DASH-001 (L1478-1531) — **참고용**, 단 REQUIREMENTS 와 4카드 라벨 충돌 부분은 REQUIREMENTS 우선 (D-A1)
- `docs/PRD_MiceSign_v2.0.md` — 제품 요구사항, DB schema DDL, RBAC 정의

### 직전 Phase 참조
- `.planning/phases/30-where/30-CONTEXT.md` — Phase 30 권한 predicate 원문. **D-A9 불일치 이슈 평가 시 필독**
- `.planning/phases/29-smtp-retrofit/29-CONTEXT.md` — `@Transactional` / `@Async` / afterCommit 패턴. 대시보드 mutation 간섭 없음이나 테스트 패턴 참조 가능
- `.planning/STATE.md` §Blockers/Concerns — 현 Phase 31 에 영향 없는 것들이나 `app.base-url` 등 공용 설정 참조

### 수정 대상 (Phase 31 작업 범위)

**Backend (변경 필요):**
- `backend/src/main/java/com/micesign/dto/dashboard/DashboardSummaryResponse.java` — **`rejectedCount` 필드 신규 추가**, `completedCount` 주석 semantics 재정의 (D-A2)
- `backend/src/main/java/com/micesign/service/DashboardService.java` — getDashboardSummary() 권한 분기 + 부서 계층 재귀 집계 (D-A4, D-A5, D-A6)
- `backend/src/main/java/com/micesign/repository/DocumentRepository.java` — countByDrafterIdsInAndStatus 등 신규 쿼리 메서드 (또는 QueryDSL 확장)
- `backend/src/main/java/com/micesign/repository/ApprovalLineRepository.java` — countPendingByApproverIdsIn 신규 (pending 부서 확장 D-A5)
- `backend/src/main/java/com/micesign/repository/DepartmentRepository.java` 또는 신규 Custom repo — `findDescendantIds(Long deptId)` 계층 재귀 CTE 쿼리 (D-A6)

**Frontend (변경 필요):**
- `frontend/src/features/dashboard/types/dashboard.ts` — `DashboardSummary.rejectedCount` 필드 추가, `draftCount` optional 유지/제거 여부 결정
- `frontend/src/features/dashboard/hooks/useDashboard.ts` — **`usePendingPreview`, `useRecentDocuments` 제거** (D-B2), queryKey → `['dashboard', 'summary']` (D-B1)
- `frontend/src/features/dashboard/pages/DashboardPage.tsx` — **drafts 카드 삭제 + 4카드 재구성 (진행/반려 추가) + 그리드 4열 + ADMIN 스코프 navigation 분기** (D-A1, D-A3, D-A8, D-C3)
- `frontend/src/features/dashboard/components/PendingList.tsx` — `usePendingPreview` 의존 제거, props 로 리스트 수신 + 에러 UI 추가 (D-B2, D-C2)
- `frontend/src/features/dashboard/components/RecentDocumentsList.tsx` — `useRecentDocuments` 의존 제거, props 기반 + 에러 UI (D-B2, D-C2)
- `frontend/src/features/dashboard/components/CountCard.tsx` — (선택) isError prop 추가 또는 별도 ErrorCard 컴포넌트 신설
- `frontend/src/features/approval/hooks/useApprovals.ts` — **useApprove, useReject onSuccess 에 `['dashboard']` invalidate 추가** (D-B3)
- `frontend/src/features/document/hooks/useDocuments.ts` — **useSubmitDocument, useWithdrawDocument onSuccess 에 `['dashboard']` invalidate 추가** (D-B3)
- `frontend/src/features/dashboard/i18n/*.json` (또는 중앙 i18n config) — 신규 키: `dashboard.submitted`, `dashboard.rejected`, `dashboard.error`, `dashboard.retry`

### 참조 지점 (수정 금지 경계)
- `backend/src/main/java/com/micesign/domain/Department.java` — parent_id 관계 활용만 (수정 금지)
- `backend/src/main/java/com/micesign/domain/enums/DocumentStatus.java` — DRAFT/SUBMITTED/APPROVED/REJECTED/WITHDRAWN (기존 유지)
- `backend/src/main/java/com/micesign/domain/enums/UserRole.java` — SUPER_ADMIN/ADMIN/USER (기존 유지)
- `backend/src/main/java/com/micesign/controller/DashboardController.java` — endpoint 시그니처 `GET /api/v1/dashboard/summary` 유지

### 스키마·마이그레이션
- `backend/src/main/resources/db/migration/V1__create_schema.sql` — department.parent_id 컬럼 + user.department_id FK (기존). 추가 스키마 변경 없음 예상.
- 필요 시 `V21__add_idx_user_department.sql` — `idx_user_department(department_id)` 인덱스 (EXPLAIN 후 결정)
- 다음 migration 번호 = **V21** (Phase 30 에서 V20 예약됨 — Phase 30 CONTEXT D-D2 참조)

### 테스트 파일 (신규/확장)
- `backend/src/test/java/com/micesign/service/DashboardServiceTest.java` 또는 `DashboardIntegrationTest.java` — 신규, 권한 × 4카드 matrix (D-D2)
- `frontend/src/features/approval/hooks/__tests__/useApprovals.test.ts` — 신규 또는 확장, invalidate 단위 검증
- `frontend/src/features/document/hooks/__tests__/useDocuments.test.ts` — 확장, invalidate 단위 검증
- `frontend/src/features/dashboard/pages/__tests__/DashboardPage.test.tsx` — 신규, 4카드 smoke
- `.planning/phases/31-dashboard/31-HUMAN-UAT.md` — 신규, 5항 핵심 UAT (D-D3)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets (적극 재사용)
- **`DocumentRepository.countByDrafterIdAndStatus(Long, DocumentStatus)`**: 기존 USER 스코프 카운트. ADMIN 스코프 확장 시 `countByDrafterIdInAndStatus(List<Long>, DocumentStatus)` 또는 QueryDSL 로 확장.
- **`ApprovalLineRepository.countPendingByApproverId(Long)`**: USER pending 카운트. `countPendingByApproverIdIn(List<Long>)` 로 확장 (D-A5).
- **`Department.getParentId()` / `Department.getParent()` / `Department.getChildren()` 관계**: 계층 재귀 구현의 기반. MariaDB WITH RECURSIVE CTE 또는 JPA in-memory 재귀 로딩 사용 가능.
- **`DashboardSummaryResponse` record (수정 대상)**: `recentPending` + `recentDocuments` 이미 포함 — FE 의 3분산 훅을 1 훅으로 통합 가능 (D-B2).
- **기존 `CountCard` 컴포넌트**: isLoading prop 지원, iconColor prop 지원. 4번째 카드 추가 + isError prop 확장만.
- **기존 `PendingList` / `RecentDocumentsList` 컴포넌트**: skeleton + empty state 이미 동작. props 기반으로 리팩터 후 에러 처리만 추가.
- **TemplateSelectionModal**: 이미 DashboardPage 와 연결. CTA 재사용 그대로 (D-D1).
- **Phase 30 `useSearchParams` 패턴**: 대시보드 → `/documents?tab=search` navigation 링크 생성 시 재활용 (D-A8).

### Established Patterns (따라야 할 관습)
- **TanStack Query v5 mutation onSuccess**: `queryClient.invalidateQueries({ queryKey: [...] })` 체인 — 기존 5개 mutation 훅이 표본. `['dashboard']` prefix 만 추가 (D-B3).
- **QueryDSL `BooleanBuilder` + `JPAExpressions`**: Phase 30 에서 확립. 권한 predicate 확장 시 동일 패턴.
- **JPA `@Transactional(readOnly = true)`**: `DashboardService` 기존 적용. 유지.
- **FE RBAC: `useAuth().user.role`**: ADMIN/SUPER_ADMIN 분기 navigation URL 결정에 활용 (D-A8). 기존 훅 또는 Zustand store 확인.
- **Korean 오류 메시지 + 영문 코드**: FSD §12.2 — 에러 UI 문구는 한글, 에러 코드는 영문 (D-C2).
- **Lucide 아이콘 일관성**: Clock/CheckCircle2/FileEdit 사용 중. XCircle 반려 카드에 추가 (D-C4).
- **TailwindCSS dark: prefix**: CountCard / PendingList / RecentDocumentsList 모두 dark 모드 대응. 에러 UI 추가 시 동일 필수.

### Integration Points (수정 금지 경계)
- `ApprovalService.approve/reject` — 결재 상태 전이 로직. 변경 금지, invalidate 는 FE 에서만.
- `DocumentService.submit/withdraw` — 문서 상태 전이. 변경 금지.
- `NotificationLog` / Phase 29 자산 — 완전 독립.
- `PendingApprovalsPage` / `CompletedDocumentsPage` — 대시보드와 queryKey 공유하지 않음 (각자 page/size 포함 키). 대시보드 리팩터 영향 없음.
- `DocumentController.searchDocuments` (Phase 30) — D-A8 의 `/documents?tab=search` navigation 이 호출. Phase 30 권한 predicate 와 정합 필요 (D-A9).

### Creative Options (연관 활용 가능성)
- 부서 계층 재귀 쿼리 유틸을 **`DepartmentService.findDescendantIds(Long)`** 로 노출하면 v1.3 이후 "부서 문서함", "부서별 통계" 등 재사용 가능.
- 대시보드 `useDashboardSummary` 의 통합 패턴을 다른 aggregation endpoint (v1.3 통계 대시보드 등) 에 동일하게 적용 가능.

</code_context>

<specifics>
## Specific Ideas

- **Phase 30 ADMIN predicate 불일치 재평가 (D-A9)**: Phase 30 CONTEXT §§D-A2, D-A6 참조. 현재 `drafter_id IN (SELECT id FROM user WHERE department_id = :myDepartmentId)` 은 단일 부서. Phase 31 계층 재귀와 다름. Planner 는 PLAN.md 첫 task 로 "Phase 30 predicate 계층 재귀 확장" 을 명시 검토 (비가역적 결정).
- **대시보드 mutation 흐름 예시**: 사용자가 `/approvals/pending` 에서 `useApprove.mutate(lineId)` 호출 → 서버 2xx → `onSuccess`: `invalidateQueries(['approvals'])`, `invalidateQueries(['documents'])`, **`invalidateQueries(['dashboard'])`** → 대시보드 탭 재방문 시 fresh data. 직접 같은 탭이면 즉시 refetch.
- **부서 계층 재귀 CTE 예시** (MariaDB 10.11+):
  ```sql
  WITH RECURSIVE dept_tree AS (
    SELECT id FROM department WHERE id = :myDeptId
    UNION ALL
    SELECT d.id FROM department d
    INNER JOIN dept_tree t ON d.parent_id = t.id
  )
  SELECT id FROM dept_tree
  ```
  JPA native query 또는 `@Query(value = ..., nativeQuery = true)` 사용 가능.
- **4카드 그리드 반응형**: `grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6` — 모바일 1열, 태블릿 2×2, 데스크톱 4열.
- **에러 UI 한글 문구 예시**: "일시적인 오류가 발생했습니다. 다시 시도해 주세요." + 다시 시도 버튼 label: "다시 시도".
- **PR 제목 예**: `feat(31): 대시보드 4카드 + 권한 스코프 확장 + 실시간 갱신 (DASH-01~05)`

</specifics>

<deferred>
## Deferred Ideas

### UX / 디자인
- FSD 의 "양식별 바로가기 버튼" (일반기안/지출결의/휴가신청 3-4 quick access) → v1.3+ 또는 Phase 32 CUSTOM 프리셋 확장과 통합 재고
- 개인화: "내가 최근 사용한 양식 top 3" 수평배열 CTA → v1.3+ (BE endpoint 신설 필요)
- SVG 일러스트 도입 (undraw.co 풍) empty state → v1.3 브랜딩 작업 때
- drafts 카드 복원 (사용자 피드백으로 필요 시) → v1.3
- 대시보드 정렬·달력 필터 → v1.3
- 목표 지표(OKR/KPI) 위젯 → v2.x
- 상황별 알림 인디케이터 (내 앞 결재 urgency) → v1.3+
- 다크모드 세부 토큰 재정리 → v1.3 디자인 시스템 정비

### 기능 확장
- Optimistic update (승인/반려 즉시 카운트 -1/+1) → v1.3 UX 개선 (롤백 로직 설계 필요)
- ADMIN 대시보드 상단 "내 문서 / 부서 문서" 탭 토글 → v1.3+ (scope 파라미터 API 신설)
- SUPER_ADMIN 전용 전사 대시보드 페이지 분리 → v1.3+ (관리 영역 재구성)
- 대시보드 위젯 드래그 재배열 / 즐겨찾기 → v1.3+
- 대시보드 export (PDF/Excel) → Phase 33 또는 v1.3+

### 기술적 개선
- useDashboardSummary 의 optimistic.ts mutation 캐시 업데이트 패턴 → v1.3 (ADMIN 스코프 복잡도 재고 후)
- 대시보드 전용 webhook/SSE 실시간 스트리밍 (polling 제거) → Phase 2 AI 결합 시 재검토
- accessibility (a11y) 상세 감사 (ARIA live region 등) → v1.3
- 모바일 반응형 상세 (breakpoints, touch targets) → v1.3
- Phase 30 의 axios paramsSerializer 전역 검토 (D-A8 의 `tab=search` 링크와 정합) → Phase 30 진행 중 결정

</deferred>

---

*Phase: 31-dashboard*
*Context gathered: 2026-04-24*

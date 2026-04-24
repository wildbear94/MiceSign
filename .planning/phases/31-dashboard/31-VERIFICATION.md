---
phase: 31-dashboard
verified: 2026-04-24T09:38:30Z
status: human_needed
score: 4/4 must-haves verified (자동 검증 가능 범위 100%)
overrides_applied: 0
human_verification:
  - test: "USER 로 로그인 → 대시보드 4 카드 (결재 대기/진행 중/승인 완료/반려) 가시성 확인"
    expected: "4개 카드 좌→우 순서, 본인 기안 기준 카운트, drafts 카드 비노출, '승인 완료' 라벨 (not '완료')"
    why_human: "ROADMAP SC-1 의 '권한·스코프에 맞는 숫자가 표시된다 (USER vs ADMIN 경계 유지)' 는 실제 로그인 컨텍스트 + 운영 DB seed 가 필요. 자동 통합테스트 (DashboardServiceIntegrationTest) 가 BE 로직을 증명하나 FE 렌더링 + 라벨 + 시각적 4 카드 확인은 사람 눈으로만 가능"
  - test: "ADMIN 로 로그인 → 4 카드 카운트가 USER 보다 크거나 같음 확인 + 진행/승인/반려 카드 클릭 시 /documents?tab=search&status=... 로 이동"
    expected: "ADMIN 카운트 ≥ USER 카운트 (부서 계층 재귀 합산), URL 라우트 분기 정확"
    why_human: "DASH-01 'USER vs ADMIN 경계 유지' 의 실측 + role-based navigation (D-A8) 의 URL 동작은 브라우저 위치 변경 + Zustand authStore 가 실제 JWT role 로 채워진 상태에서만 검증 가능"
  - test: "SUPER_ADMIN 로 로그인 → 카운트가 전사 범위로 가장 큼 확인"
    expected: "전사 sentinel 경로 (countByStatus/countAllPending) 가 호출되어 ADMIN 보다 같거나 큰 카운트"
    why_human: "DashboardServiceIntegrationTest superAdmin_sees_all 가 BE 측 sentinel 경로를 증명하나, 실제 SUPER_ADMIN seed 계정이 운영 DB 의 다양한 부서/문서 위에서 노출되는 숫자 합리성은 사람 검증 영역"
  - test: "결재 승인/반려/상신/회수 mutation 직후 대시보드 카운트 + 목록이 페이지 이동 없이 자동 갱신되는지 확인"
    expected: "대시보드 탭을 띄워둔 채 다른 탭에서 액션 → 대시보드 복귀 시 또는 같은 탭 내 액션 후 최대 2초 이내 카운트/리스트 변화 반영, skeleton 플래시 없음 (placeholderData 효과)"
    why_human: "DASH-05 '실시간 갱신' 의 사용자 체감은 invalidateQueries spy 만으로는 증명 못 함. 실제 TanStack Query refetch → 응답 → 리렌더 까지 end-to-end 흐름과 placeholderData (D-B7) 의 부드러운 전환 UX 가 사람 눈으로만 평가 가능"
  - test: "Skeleton / Empty / Error UI 시각 통일 확인"
    expected: "Cmd+Shift+R 새로고침 시 4 카드 + 2 리스트 모두 동시에 skeleton 표시 → 동시에 해제. 신규 계정 로그인 시 PendingList(ClipboardCheck), RecentDocumentsList(FileText) empty 일러스트+문구 표시. DevTools Network Offline 후 새로고침 시 3 위젯 모두 AlertTriangle + '일시적인 오류가 발생했습니다' + '다시 시도' 버튼 표시"
    why_human: "DASH-04 '로딩 중 skeleton, 결과 없을 때 empty UI' 의 시각적 통일 (D-C5 동시 해제) 과 ErrorState 의 retry → refetchQueries 동작 + 다크모드 색상 매핑은 브라우저에서만 확인 가능. ErrorState.test.tsx 가 click handler 만 검증하고 시각 일관성은 검증 못 함"
---

# Phase 31: 대시보드 고도화 (DASH-01~05) Verification Report

**Phase Goal:** 사용자가 대시보드 한 화면에서 결재 대기/진행 중/승인 완료/반려 4종 카운트와 처리할 결재 5건·내가 기안한 최근 5건을 보며, 승인·반려·상신·회수 액션 직후 카운트와 목록이 자동 갱신된다

**Verified:** 2026-04-24T09:38:30Z
**Status:** human_needed
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths (ROADMAP Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | 대시보드 상단에 "결재 대기 / 진행 중 / 승인 완료 / 반려" 4개의 CountCard 가 나타나고, 로그인 사용자의 권한·스코프에 맞는 숫자가 표시된다 (USER vs ADMIN 경계 유지) | ✓ VERIFIED (BE) + ? HUMAN (FE 시각) | `DashboardPage.tsx:54-91` 에 4 CountCard (Clock/Hourglass/CheckCircle2/XCircle) grid 렌더. `DashboardService.java:68-99` switch(role) USER/ADMIN/SUPER_ADMIN 분기 + descendant CTE 호출 (line 83). `DashboardServiceIntegrationTest` 7 케이스 green (admin_sees_descendant_scope, superAdmin_sees_all 포함). `dashboard.json` `pending/submitted/completed/rejected` 4 키 존재. **시각적 카드 가시성 + 라벨 → human_verification #1~3** |
| 2 | 대시보드 중앙에 "내가 처리할 결재 5건" + "내가 기안한 최근 문서 5건" 목록이 나란히 렌더되며, "새 문서 작성" CTA 버튼이 양식 선택 화면으로 이동시킨다 | ✓ VERIFIED | `DashboardPage.tsx:94-105` 에 PendingList + RecentDocumentsList grid. `DashboardService.java:109` PageRequest.of(0, 5), line 135 동일. `DashboardPage.tsx:44-50` "새 문서 작성" 버튼 + `TemplateSelectionModal` (line 108-112) → onSelect 시 `/documents/new/{templateCode}` 이동 |
| 3 | 로딩 중에는 skeleton UI, 결과가 없을 때는 각 위젯 내 empty 상태(일러스트 + 문구)가 표시된다 | ✓ VERIFIED (자동) + ? HUMAN (시각 통일) | CountCard.tsx:23-36 skeleton (animate-pulse), PendingList.tsx:39-50 + RecentDocumentsList.tsx:42-52 리스트 skeleton (3행). PendingList.tsx:56-66 ClipboardCheck + emptyPending/emptyPendingDesc, RecentDocumentsList.tsx:58-68 FileText + emptyRecent/emptyRecentDesc. `dashboard.json` 4 i18n 키 존재. **3 위젯 동시 skeleton 해제 + dark mode 색상 → human_verification #5** |
| 4 | 사용자가 결재를 승인·반려·상신·회수하는 mutation 이 성공하면 `queryClient.invalidateQueries(['dashboard'])` 가 즉시 호출되어 카운트·목록이 재조회되고 UI 에 반영된다 (페이지 이동 없이) | ✓ VERIFIED (mutation/spy) + ? HUMAN (체감) | useApprovals.ts L26, L39 (useApprove/useReject) + useDocuments.ts L76, L90 (useSubmitDocument/useWithdrawDocument) 4 훅의 onSuccess 에 `queryClient.invalidateQueries({ queryKey: ['dashboard'] })` 호출. `useDashboardSummary` queryKey ['dashboard','summary'] 와 prefix match. `useApprovals.invalidation.test.tsx` 2 tests + `useDocuments.invalidation.test.tsx` 3 tests (scope 경계 포함) green. **end-to-end refetch → 리렌더 + placeholderData 부드러운 전환 → human_verification #4** |

**Score:** 4/4 ROADMAP SC 자동 검증 가능 부분 통과 (5 항목은 human UAT 대기)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `backend/src/main/java/com/micesign/dto/dashboard/DashboardSummaryResponse.java` | rejectedCount 필드 + 6-arg backward-compat 생성자 | ✓ VERIFIED | L12 `long rejectedCount`, L22-30 secondary constructor (`this(...0L,...)`), L11 completedCount 주석 "APPROVED only" |
| `backend/src/main/java/com/micesign/repository/DepartmentRepository.java` | findDescendantIds native CTE | ✓ VERIFIED | L37-46 `WITH RECURSIVE dept_tree(id) AS` + nativeQuery=true, Param import L6 |
| `backend/src/main/java/com/micesign/repository/DocumentRepository.java` | countByDrafterIdInAndStatus + countByStatus | ✓ VERIFIED | grep -c = 3 (메서드 2건 + 기존 호환) |
| `backend/src/main/java/com/micesign/repository/ApprovalLineRepository.java` | countPendingByApproverIdIn + countAllPending | ✓ VERIFIED | grep -c = 2 |
| `backend/src/main/java/com/micesign/repository/UserRepository.java` | findIdsByDepartmentIdIn scalar projection | ✓ VERIFIED | grep -c = 1 |
| `backend/src/main/java/com/micesign/service/DashboardService.java` | role-based 3-arg 시그니처 + USER/ADMIN/SUPER_ADMIN switch | ✓ VERIFIED | L68 `getDashboardSummary(Long userId, UserRole role, Long departmentId)`, L72-99 switch, L83 findDescendantIds, L86 findIdsByDepartmentIdIn, L142-145 7-arg canonical constructor |
| `backend/src/main/java/com/micesign/controller/DashboardController.java` | UserRole.valueOf 파싱 + 3-arg 호출 | ✓ VERIFIED | L30 UserRole.valueOf(user.getRole()), L31-32 dashboardService.getDashboardSummary 3-arg |
| `backend/src/main/java/com/micesign/repository/DocumentRepositoryCustomImpl.java` | descendantDeptIds 기반 ADMIN/department predicate (D-A9 Option 1) | ✓ VERIFIED | L33 시그니처 확장, L48-54 tab=department 분기, L60-64 tab=all ADMIN 분기, L89-95 ADMIN permission branch (3곳 모두 in/eq fallback) |
| `backend/src/main/java/com/micesign/service/DocumentService.java` | DepartmentRepository DI + findDescendantIds 호출 | ✓ VERIFIED | L466 `departmentRepository.findDescendantIds(departmentId)` 조건부 호출 |
| `frontend/src/features/dashboard/types/dashboard.ts` | DashboardSummary.rejectedCount 필드 | ✓ VERIFIED | L6 `rejectedCount: number` (required, BE long primitive 매핑) |
| `frontend/src/features/dashboard/hooks/useDashboard.ts` | useDashboardSummary 단일 훅 + placeholderData + queryKey | ✓ VERIFIED | L15-22 단일 export, L17 ['dashboard','summary'], L19 refetchInterval 60_000, L20 placeholderData (prev) |
| `frontend/src/features/dashboard/pages/DashboardPage.tsx` | 4 카드 + role-based statusPath + props drill | ✓ VERIFIED | L54 grid-cols-1 md:grid-cols-2 lg:grid-cols-4, L55-90 4 CountCard, L31-35 isAdmin + statusPath, L96/L101 props drill, FileEdit import 제거 (코드 0건; line 16 주석에만 D-A3 설명) |
| `frontend/src/features/dashboard/components/CountCard.tsx` | isError prop + a11y | ✓ VERIFIED | L10 isError prop, L38-48 ErrorState variant=card, L54 aria-label, L62 focus-visible:ring-2 |
| `frontend/src/features/dashboard/components/ErrorState.tsx` (신규) | AlertTriangle + retry refetchQueries | ✓ VERIFIED | L40 AlertTriangle, L26 refetchQueries({queryKey:['dashboard']}), L36 role="alert", L52-62 retry 버튼 + Loader2 + aria-busy |
| `frontend/src/features/dashboard/components/PendingList.tsx` | props-based + ErrorState 통합 | ✓ VERIFIED | L8-12 PendingListProps (data/isLoading/isError), L53 ErrorState variant="list", usePendingPreview import 0건 |
| `frontend/src/features/dashboard/components/RecentDocumentsList.tsx` | props-based + ErrorState 통합 | ✓ VERIFIED | 동일 구조, useRecentDocuments import 0건 |
| `frontend/src/features/approval/hooks/useApprovals.ts` | useApprove/useReject onSuccess invalidate | ✓ VERIFIED | L26 + L39 `queryKey: ['dashboard']` invalidate (2건), 기존 ['approvals']/['documents'] 유지 |
| `frontend/src/features/document/hooks/useDocuments.ts` | useSubmit/useWithdraw onSuccess invalidate | ✓ VERIFIED | L76 + L90 `queryKey: ['dashboard']` invalidate (2건), useCreateDocument 미변경 (D-B3 scope) |
| `frontend/public/locales/ko/dashboard.json` | submitted/rejected/error/errorDesc/retry 신규 키 + completed='승인 완료' | ✓ VERIFIED | L4-7 4 카드 키, L6 "completed":"승인 완료" (재정의), L16-18 error/errorDesc/retry, L8 drafts orphan 보존 (D-A3) |
| `backend/src/test/java/com/micesign/dashboard/DashboardServiceIntegrationTest.java` (신규) | role × 4카운트 매트릭스 7 케이스 | ✓ VERIFIED | 7 @Test green (user_sees_only_self / admin_sees_descendant_scope / superAdmin_sees_all / admin_hq_covers_full_hierarchy / draftCount_and_rejectedCount_present / findDescendantIds_recursive_cte / recent_lists_remain_self) |
| `frontend/src/features/dashboard/pages/__tests__/DashboardPage.test.tsx` (신규) | 4 카드 smoke + drafts 비노출 | ✓ VERIFIED | 3 tests green |
| `frontend/src/features/dashboard/components/__tests__/ErrorState.test.tsx` (신규) | retry → refetchQueries | ✓ VERIFIED | 3 tests green |
| `frontend/src/features/approval/hooks/__tests__/useApprovals.invalidation.test.tsx` (신규) | dashboard invalidate spy | ✓ VERIFIED | 2 tests green |
| `frontend/src/features/document/hooks/__tests__/useDocuments.invalidation.test.tsx` (신규) | dashboard invalidate spy + scope 경계 | ✓ VERIFIED | 3 tests green (useCreateDocument 가 dashboard invalidate 하지 않음 증명 포함) |
| `.planning/phases/31-dashboard/31-HUMAN-UAT.md` (신규) | D-D3 5 항목 + Visual QA 체크리스트 | ✓ VERIFIED | 46 체크박스, 5 locked sections (4카드 가시성/mutation 갱신/skeleton/empty/error) + 추가 Visual QA + 회귀 + Sign-off |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| DashboardController | DashboardService.getDashboardSummary(userId, role, departmentId) | @AuthenticationPrincipal CustomUserDetails | ✓ WIRED | DashboardController.java L30-33 |
| DashboardService (ADMIN 분기) | DepartmentRepository.findDescendantIds | switch(role) ADMIN case | ✓ WIRED | DashboardService.java L83 |
| DashboardService (ADMIN 분기) | UserRepository.findIdsByDepartmentIdIn | descendantDeptIds → userIds | ✓ WIRED | DashboardService.java L86 |
| DashboardService (USER/ADMIN/SUPER_ADMIN) | DocumentRepository (count*) | sentinel null/empty/list 분기 | ✓ WIRED | L168-172 countDrafterStatus helper |
| DashboardService (USER/ADMIN/SUPER_ADMIN) | ApprovalLineRepository (countPending*) | sentinel null/empty/list 분기 | ✓ WIRED | L156-160 countPending helper |
| DocumentService.searchDocuments (ADMIN/tab) | DepartmentRepository.findDescendantIds | needsHierarchy 조건부 | ✓ WIRED | DocumentService.java L466 |
| DocumentRepositoryCustomImpl (3곳) | descendantDeptIds in-predicate | tab=department/all + ADMIN permission | ✓ WIRED | L51, L61, L91 (3 곳 모두 in + eq fallback) |
| DashboardPage.tsx | useDashboardSummary | const { data, isLoading, isError } | ✓ WIRED | L27 |
| DashboardPage.tsx CountCard onClick | role-based statusPath | useAuthStore + statusPath helper | ✓ WIRED | L30-35, L68/L77/L86 |
| DashboardPage.tsx | PendingList/RecentDocumentsList | props drill (data/isLoading/isError) | ✓ WIRED | L94-105 |
| ErrorState 다시 시도 버튼 | ['dashboard'] refetch | refetchQueries({queryKey:['dashboard']}) | ✓ WIRED | ErrorState.tsx L26 |
| useApprove/useReject onSuccess | ['dashboard'] invalidate | TanStack Query v5 prefix match | ✓ WIRED | useApprovals.ts L26, L39 |
| useSubmitDocument/useWithdrawDocument onSuccess | ['dashboard'] invalidate | TanStack Query v5 prefix match | ✓ WIRED | useDocuments.ts L76, L90 |
| /api/v1/dashboard/summary BE JSON | DashboardSummary TS interface | axios → res.data.data → useQuery | ✓ WIRED | dashboardApi.getSummary().then(...) |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|-------------------|--------|
| DashboardPage.tsx | summary (pendingCount/submittedCount/completedCount/rejectedCount/recentPending/recentDocuments) | useDashboardSummary → /api/v1/dashboard/summary → DashboardService → DocumentRepository.count*/ApprovalLineRepository.countPending* + JOIN FETCH 쿼리 | ✓ FLOWING | DashboardServiceIntegrationTest 의 7 통합테스트가 BE→DB→JSON 경로를 직접 검증; ?? fallback (`summary?.pendingCount ?? 0`) 은 placeholderData 가 처음 undefined 일 때만 적용되고 BE 응답 후 실값으로 채워짐 |
| CountCard.tsx | count (long primitive) | DashboardPage props drill | ✓ FLOWING | 4 카드 모두 summary?.{field}Count ?? 0 으로 props 전달, DashboardPage.test.tsx 가 mock 한 카운트 (3/5/10/2) 4건 모두 렌더 검증 |
| PendingList.tsx | data (PendingApprovalSummary[]) | summary?.recentPending props | ✓ FLOWING | DashboardService L109-128 가 ApprovalLineRepository.findPendingByApproverId(userId, PageRequest.of(0,5)) 결과를 PendingApprovalResponse 로 매핑 (실제 doc.title/drafter.name 등 lazy 로드) |
| RecentDocumentsList.tsx | data (RecentDocumentSummary[]) | summary?.recentDocuments props | ✓ FLOWING | DashboardService L135-139 가 documentRepository.findByDrafterId(userId, PageRequest.of(0,5)) → documentMapper.toResponse 로 매핑. WR-04 (N+1 가능) info-level finding 이나 데이터는 흐름 |
| ErrorState retry button | refetchQueries 결과 | useDashboardSummary refetch → 동일 BE 경로 | ✓ FLOWING | ErrorState.test.tsx (3 tests) 가 클릭 → refetchQueries 호출 검증, 실제 retry 동작은 human #5 |

### Behavioral Spot-Checks

자동화된 명령형 스폿체크는 컴파일 + 단위/통합 테스트로 대체.

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Backend Java 전체 컴파일 | `cd backend && ./gradlew compileJava compileTestJava` | BUILD SUCCESSFUL (640ms, UP-TO-DATE) | ✓ PASS |
| DashboardServiceIntegrationTest (Plan 02) | `./gradlew test --tests com.micesign.dashboard.DashboardServiceIntegrationTest` | BUILD SUCCESSFUL — 7 @Test green | ✓ PASS |
| DocumentSearchPermissionMatrixTest (Plan 02 + 06 회귀) | `./gradlew test --tests com.micesign.document.DocumentSearchPermissionMatrixTest` | BUILD SUCCESSFUL — 12 @Test green (9 기존 + 3 신규 hierarchical) | ✓ PASS |
| Frontend TS 빌드 | `cd frontend && npx tsc --noEmit -p tsconfig.app.json` | EXIT=0 | ✓ PASS |
| Frontend Vitest (dashboard + invalidation) | `npm test -- features/dashboard features/approval/hooks/__tests__/useApprovals.invalidation features/document/hooks/__tests__/useDocuments.invalidation --run` | Test Files 4 passed, Tests 11 passed (1.37s) | ✓ PASS |
| Phase 31 commits 존재 | `git log --oneline | grep -E "<18 hashes>" | wc -l` | 18 (Plan 01-06 모든 task 커밋) | ✓ PASS |
| 대시보드 라우트 보존 (preserve existing) | `grep DashboardPage frontend/src/App.tsx` | L17 import + L69 `<Route path="/" element={<DashboardPage />} />` | ✓ PASS |

**비고:** ApprovalWorkflowTest 의 사전 존재 3 실패 (approveDocument_success, rejectDocument_withComment, rewriteDocument_success) 는 Phase 31 범위 밖 — 사용자 노트에 기록된 대로 Phase 7 의 `BusinessException [APR_NO_APPROVER]` 회귀이며 Phase 31 은 submitDocument 경로 미수정이므로 본 검증에서 OUT-OF-SCOPE.

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| DASH-01 (v1.2) | 01, 02, 03, 04, 06 | 결재 대기 / 진행 중 / 승인 완료 / 반려 4종 카운트 카드 + 권한 스코프 | ✓ SATISFIED (자동) + ? HUMAN (시각/role) | DashboardPage.tsx 4 카드 grid + DashboardService switch(role) + DashboardServiceIntegrationTest 7 케이스 + i18n 4 키. 시각 라벨/role 별 숫자 → human #1~3 |
| DASH-02 | 02, 04 | "내가 처리할 결재 5건" + "내가 기안한 최근 5건" | ✓ SATISFIED | DashboardPage.tsx PendingList + RecentDocumentsList grid, DashboardService L109/L135 PageRequest.of(0,5), recent_lists_remain_self_scope_even_for_admin 통합테스트 |
| DASH-03 | 04 | "새 문서 작성" CTA → 양식 선택 화면 | ✓ SATISFIED | DashboardPage.tsx L44-50 버튼 + L108-112 TemplateSelectionModal + onSelect navigate(`/documents/new/${templateCode}`) |
| DASH-04 | 03, 04 | skeleton + empty + error UI | ✓ SATISFIED (자동) + ? HUMAN (시각 통일) | CountCard skeleton + PendingList/RecentDocumentsList skeleton + ClipboardCheck/FileText empty + ErrorState 3-위젯 통일. 시각 동시 해제/dark mode → human #5 |
| DASH-05 | 03, 05 | mutation 후 invalidateQueries(['dashboard']) 자동 갱신 | ✓ SATISFIED (자동) + ? HUMAN (체감) | useApprovals/useDocuments 4 mutation 훅 onSuccess invalidate, useApprovals.invalidation.test.tsx + useDocuments.invalidation.test.tsx 5 tests green. end-to-end UI 갱신 → human #4 |

**Orphaned 요구사항:** 없음 — REQUIREMENTS.md Phase 31 매핑 5건 모두 Plan frontmatter `requirements` 필드에서 적어도 1회 이상 선언됨.

### Anti-Patterns Found

(REVIEW.md 결과 동일 — Phase 31 변경 파일에 한정)

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| backend/src/main/java/com/micesign/repository/DocumentRepositoryCustomImpl.java | 47-54 | `tab=department` 분기에서 departmentId null 시 silent `eq(null)` fallback (WR-01) | ⚠️ Warning | 부서 미할당 USER 가 tab=department 검색 시 silent 0건. 본 phase 의 4-카드 카운트 + 카드 클릭 navigation flow 와는 직접 연관 없음 (대시보드는 ADMIN 만 statusPath 가 search tab 사용) |
| backend/src/main/java/com/micesign/repository/DocumentRepositoryCustomImpl.java | 113-121 | LIKE 검색 ESCAPE 절 명시 누락 (WR-02) | ⚠️ Warning | Phase 30 잔여, 운영 DB SQL_MODE 의존성. Phase 31 도입 변경 아님 |
| backend/src/main/java/com/micesign/controller/DashboardController.java | 30 | `UserRole.valueOf(user.getRole())` 예외 처리 누락 → 500 (WR-03) | ⚠️ Warning | enum 동기화 누락 시 dashboard 전체 down. 현재는 enum 3-value 안정 |
| backend/src/main/java/com/micesign/service/DashboardService.java | 135-139 | `findByDrafterId` JOIN FETCH 부재로 N+1 가능 (WR-04) | ⚠️ Warning | 5 row × 3-15 lazy fetch, 현재 spec 외 (성능 phase) |
| frontend/src/features/dashboard/components/CountCard.tsx | 51-62 | `<a role="link">` 의미 충돌 — `<button>` 또는 `<Link>` 권장 (IN-01) | ℹ️ Info | a11y semantic — Tab 순회 + click 동작 정상 |
| backend/src/test/java/com/micesign/dashboard/DashboardServiceIntegrationTest.java | 71-80 | 700번대 user-id 영역 명시 규약 없음 (IN-02) | ℹ️ Info | 미래 fixture 충돌 잠재 |
| backend/src/main/java/com/micesign/service/DashboardService.java | 135 | recentDocuments DRAFT 포함 의도 주석 없음 (IN-03) | ℹ️ Info | D-A3 의도와 부합 (status badge 자연 노출) 하지만 코드에는 미명시 |
| frontend/public/locales/ko/dashboard.json | 8 | `drafts` 키 dead code (D-A3 orphan key 보존 결정) (IN-04) | ℹ️ Info | 의도된 보존 (D-A3 lock — 향후 재사용 대비) |
| backend/src/test/java/com/micesign/document/DocumentSearchPermissionMatrixTest.java | 110-119 | Phase 31 fixture defensive double-cleanup (IN-05) | ℹ️ Info | 가독성 저하만, 동작 정상 |
| frontend/src/features/approval/hooks/useApprovals.ts, useDocuments.ts, ErrorState.tsx | (각각) | TanStack v5 prefix match 동작 주석 미명시 (IN-06) | ℹ️ Info | 향후 `exact: true` 추가 시 silent 회귀 위험 |

**Blocker 0 / Warning 4 / Info 6** — REVIEW.md 와 일치, 차단 결함 없음. Warning 4건은 모두 본 phase 의 goal achievement 와 직접 연관 없음 (WR-01/02 는 Phase 30 잔여 또는 검색 경로, WR-03 은 운영 사고 시나리오, WR-04 는 성능).

### Human Verification Required

Phase 31 의 핵심 outcome 은 사용자 체감 + 시각 통일 + role 별 숫자 정합성으로, 자동 검증 (compile + unit/integration test + grep) 으로는 다음 5 항목을 증명 못 함. 이미 Plan 05 가 작성한 `31-HUMAN-UAT.md` (46 체크박스) 가 실행 대기 중.

#### 1. USER 4 카드 가시성 + 본인 스코프 카운트

**Test:** USER 계정으로 로그인 → 대시보드 진입 → 4 카드 좌→우 순서 / 라벨 / drafts 비노출 / 본인 기안 카운트 일치 확인 (`31-HUMAN-UAT.md` §1.1)
**Expected:** 4 카드 (결재 대기·진행 중·승인 완료·반려) 좌→우, "승인 완료" 라벨 (not "완료"), Clock/Hourglass/CheckCircle2/XCircle 아이콘 색상 매핑, drafts 카드 없음
**Why human:** ROADMAP SC-1 의 "권한·스코프에 맞는 숫자가 표시" 는 실 JWT/seed 데이터 + 브라우저 렌더링 위에서만 검증 가능

#### 2. ADMIN 부서 계층 카운트 + role-based navigation URL

**Test:** ADMIN 계정으로 로그인 → 4 카드 카운트가 USER 보다 ≥ 인지 + 진행/승인/반려 카드 클릭 시 `/documents?tab=search&status=...` URL 이동 확인 (§1.2)
**Expected:** ADMIN 카운트 ≥ USER (부서 계층 재귀 합산), URL 라우트 분기 정확
**Why human:** D-A8 navigation URL 분기 (`useAuthStore.role` selector + `statusPath` helper) + 실제 부서 데이터에서 ADMIN ≥ USER 의 수학적 검증은 사람 눈으로만 가능

#### 3. SUPER_ADMIN 전사 카운트

**Test:** SUPER_ADMIN 계정으로 로그인 → 카운트가 ADMIN 보다 ≥ 인지 (전사 sentinel) + 카드 클릭 시 `/documents?tab=search&status=...` 이동 (§1.3)
**Expected:** 전사 합계 (countByStatus/countAllPending 호출 결과)
**Why human:** DashboardServiceIntegrationTest superAdmin_sees_all 가 BE 측을 증명, FE seed 환경의 합리성은 사람 검증

#### 4. Mutation 실시간 갱신 — end-to-end 체감

**Test:** 대시보드 탭 띄운 채 별도 탭 또는 같은 탭에서 승인/반려/상신/회수 액션 → 대시보드 카운트/리스트 자동 갱신 확인 (페이지 전환 없이) (§2.1-2.5)
**Expected:** 최대 2초 이내 카운트 변화, skeleton 플래시 없음 (placeholderData 효과)
**Why human:** invalidate spy 는 호출만 검증, 실제 refetch → 서버 응답 → 리렌더 + placeholderData 의 부드러운 전환 UX 는 체감 영역

#### 5. Skeleton/Empty/Error 시각 통일

**Test:** 강제 새로고침 → 4 카드 + 2 리스트 동시 skeleton → 동시 해제 / 신규 계정 로그인 시 ClipboardCheck + FileText empty UI / DevTools Offline 후 새로고침 시 3 위젯 모두 AlertTriangle + "다시 시도" 버튼 + 클릭 → 정상 복구 (§3-5)
**Expected:** 시각 통일 + dark mode 색상 매핑 + retry 동작
**Why human:** D-C5 (단일 훅 동기화) 의 동시 해제 + ErrorState retry → refetchQueries 회복은 브라우저에서만 확인 가능

### Gaps Summary

자동 검증 가능한 모든 truth/artifact/key link/data flow/test 가 통과한다. ROADMAP Phase 31 의 4 success criteria 모두 BE/FE 코드 + 22 자동 테스트 (BE 19 + FE 11) 로 backed. 단 **Plan 05 가 명시적으로 생성한 `31-HUMAN-UAT.md`** (46 체크박스, 5 sections) 가 아직 실행되지 않아 시각 통일 / role 체감 / mutation end-to-end 의 5 항목은 사람 검증을 기다리고 있다. 이는 결함이 아니라 **의도된 final gate** — Phase 31 SUMMARY.md 들이 일관되게 "Human UAT 통과 후 Phase close" 를 명시하고 있다.

REVIEW.md 의 4 Warning + 6 Info finding 은 모두 본 phase 의 goal achievement 차단 요인이 아닌 quality / 미래 안전 / Phase 30 잔여로 분류되며, Phase 31 close 와 별도로 follow-up 가능.

---

_Verified: 2026-04-24T09:38:30Z_
_Verifier: Claude (gsd-verifier)_

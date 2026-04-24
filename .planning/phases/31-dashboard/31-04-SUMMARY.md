---
phase: 31-dashboard
plan: 04
subsystem: dashboard-fe-ui
tags: [dashboard, frontend, ui, retrofit, a11y, DASH-01, DASH-02, DASH-03, DASH-04]
requirements: [DASH-01, DASH-02, DASH-03, DASH-04]
one_liner: "DashboardPage 4 카드 (결재 대기/진행 중/승인 완료/반려) + role-based navigation + 리스트 props drill + 공통 ErrorState 컴포넌트 신설 + CountCard isError + smoke test 6 tests green"
dependency_graph:
  requires:
    - "Plan 03 — useDashboardSummary 단일 훅 (queryKey ['dashboard','summary'] + placeholderData)"
    - "Plan 03 — DashboardSummary.rejectedCount required + ko/dashboard.json 신규 키 5개"
    - "Plan 02 — BE /api/v1/dashboard/summary role-based 7-arg DTO"
  provides:
    - "ErrorState 공통 컴포넌트 (variant card/list, refetchQueries(['dashboard']))"
    - "CountCard isError prop + focus-visible/aria-label 보강"
    - "PendingList/RecentDocumentsList props-based 시그니처 (data: T[] | undefined, isLoading, isError)"
    - "DashboardPage 4 카드 + role-based statusPath helper + props drill"
    - "DashboardPage smoke test (3 tests) + ErrorState test (3 tests)"
  affects:
    - "Plan 03 SUMMARY 의 'Known Consuming-Side Errors' 해소 (TS 컴파일 복구)"
    - "Plan 05 의 mutation invalidate 가 본 plan 의 isError prop 으로 노출되는 ErrorState UX 와 결합"
tech_stack:
  added: []
  patterns:
    - "TanStack Query v5 refetchQueries({queryKey:['dashboard']}) — invalidate 가 아닌 즉시 네트워크 호출 (사용자 명시 retry 의도)"
    - "Zustand selector 형태 — useAuthStore((s) => s.user?.role) 로 부분 구독 + 테스트 mock 도 selector 형태"
    - "단일 훅 → props drill 패턴 — 3 위젯이 1 endpoint 를 공유, isLoading/isError 자동 동기화 (D-C5)"
    - "공통 ErrorState 컴포넌트 + variant prop — CountCard 내부 (card) vs 리스트 위젯 (list) 크기/body 변주"
key_files:
  created:
    - "frontend/src/features/dashboard/components/ErrorState.tsx"
    - "frontend/src/features/dashboard/pages/__tests__/DashboardPage.test.tsx"
    - "frontend/src/features/dashboard/components/__tests__/ErrorState.test.tsx"
  modified:
    - "frontend/src/features/dashboard/components/CountCard.tsx"
    - "frontend/src/features/dashboard/components/PendingList.tsx"
    - "frontend/src/features/dashboard/components/RecentDocumentsList.tsx"
    - "frontend/src/features/dashboard/pages/DashboardPage.tsx"
decisions:
  - "ErrorState refetchQueries(['dashboard']) 채택 — invalidate(stale 마킹 후 next mount 시 refetch) 가 아닌 즉시 네트워크 호출. 사용자가 retry 버튼을 누르는 의도와 일치"
  - "ErrorState 클래스 컴포넌트가 아닌 함수 컴포넌트 + useState retrying 로컬 상태 — 다른 retry button 인스턴스와 격리"
  - "CountCard 내부에서 isError 시 ErrorState variant=card 사용 (별도 ErrorCard 아님) — 재사용 + variant prop 으로 크기/body 차별화 (UI-SPEC §7.1)"
  - "리스트 row data-testid 추가 — pending-row-{documentId} / recent-row-{id}. smoke test 가 리스트 row 검증 시 활용 가능 (현재 smoke 테스트는 빈 리스트만 검증, future-proof)"
  - "PendingList/RecentDocumentsList 의 props 타입에서 data 를 'T[] | undefined' 로 — placeholderData 가 처음에는 undefined, 그 후 prev 데이터 유지하므로 undefined 가드 필요"
  - "RecentDocumentsList 의 doc.status 를 DocumentStatus union 으로 cast — RecentDocumentSummary.status 는 string 이지만 BE 가 항상 5개 값 중 하나만 보내므로 안전. dashboard.ts 타입은 Plan 03 결정 보존"
  - "DashboardPage 의 statusPath helper inline — 별도 util 추출 안 함. 단일 사용처 + 3줄 분량으로 over-engineering 회피"
  - "isAdmin = role === 'ADMIN' || role === 'SUPER_ADMIN' — UI URL 만 공유, BE 권한 predicate 가 SUPER_ADMIN vs ADMIN 별도 분기 (Phase 31 Plan 06 D-A9 upgrade 가 보장)"
  - "smoke test 의 i18n mock 은 t = (k) => k — namespace 없이 raw key 반환. expect 도 raw key ('pending', 'submitted', ...) 로 검증"
metrics:
  duration_seconds: 315
  duration_human: "~5 min"
  completed_date: "2026-04-24"
  tasks_total: 3
  tasks_completed: 3
  files_created: 3
  files_modified: 4
  tests_added: 6
  commits: 3
---

# Phase 31 Plan 4: DASH-01~04 Dashboard UI 4 카드 Retrofit Summary

## 한 줄 요약

DashboardPage 를 drafts 카드 (3 카드) 에서 결재 대기/진행 중/승인 완료/반려 4 카드 구조로 재구성하고, role-based navigation (USER vs ADMIN/SUPER_ADMIN URL 분기) 적용, 두 리스트 컴포넌트를 props drill 로 리팩터하여 Plan 03 SUMMARY 가 명시한 "Known Consuming-Side Errors" 해소, 공통 ErrorState 컴포넌트 신설로 3 위젯 (CountCard row + PendingList + RecentDocumentsList) 에러 UI 통일, CountCard 에 isError prop + focus-visible/aria-label a11y 보강. vitest 6 tests green, tsc PASS, vite build PASS.

## 달성 요지

- **DASH-01 4 카드 노출**: drafts 카드 완전 제거 (FileEdit import 삭제) + 4 카드 (Clock/Hourglass/CheckCircle2/XCircle, blue-500/gray-500/green-500/red-500). grid `grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6`
- **DASH-02 리스트 + CTA**: PendingList + RecentDocumentsList 가 useDashboardSummary 단일 훅 호출의 recentPending/recentDocuments 를 props drill 로 수신. TemplateSelectionModal 기존 구조 보존
- **DASH-03 새 문서 작성**: 헤더 우측 파란 버튼 + TemplateSelectionModal — focus-visible 보강만 추가, 기능 변경 zero
- **DASH-04 skeleton/empty/error 통일**: ErrorState 공통 컴포넌트 (variant card/list) 가 3 위젯에서 동일 패턴으로 노출. retry 버튼 → refetchQueries(['dashboard']) 즉시 네트워크 호출. role="alert" + aria-live="polite" + aria-busy + Loader2 spinner
- **role-based navigation (D-A8)**: useAuthStore((s) => s.user?.role) selector + isAdmin = role === 'ADMIN' || role === 'SUPER_ADMIN' + statusPath helper. 3 status 카드는 role 분기, 결재 대기 카드는 role 불문 /approvals/pending
- **Plan 03 의 의도된 BREAKING 해소**: PendingList/RecentDocumentsList 의 제거된 훅 (usePendingPreview/useRecentDocuments) import 가 본 plan 의 props 리팩터로 컴파일 복구. tsc --noEmit PASS

## Tasks 완료 내역

| Task | 내용 | 커밋 | 주요 파일 |
| ---- | --- | --- | --- |
| 1 | ErrorState.tsx 신규 + CountCard isError prop + a11y 보강 | `0bbe924` | `ErrorState.tsx` (NEW), `CountCard.tsx` |
| 2 | PendingList/RecentDocumentsList props-based 리팩터 + ErrorState 통합 | `219b22d` | `PendingList.tsx`, `RecentDocumentsList.tsx` |
| 3 | DashboardPage 4 카드 + role-based navigation + props drill + smoke test 2 파일 | `5243b93` | `DashboardPage.tsx`, `RecentDocumentsList.tsx` (DocumentStatus cast), `DashboardPage.test.tsx` (NEW), `ErrorState.test.tsx` (NEW) |

## Decisions Made

- **ErrorState 가 refetchQueries 사용** (invalidate 아님) — 사용자가 retry 버튼 누른 의도와 일치. invalidate 는 stale 마킹 후 다음 mount 시 refetch 이지만 retry 버튼은 즉시 네트워크 호출 의미 (UI-SPEC §7.4)
- **ErrorState variant prop** — card 는 body 생략 (CountCard 내부 공간 제약), list 는 heading + body + button. 공통 컴포넌트 1 파일에 분기
- **CountCard 내부에서 ErrorState variant=card 사용** — 별도 ErrorCard 분리 안 함. UI-SPEC §7.1 의 "prop 확장 vs 별도 ErrorCard" 중 prop 확장 채택
- **리스트 row data-testid** 도입 — 현재 smoke 테스트가 빈 리스트만 검증하지만 향후 row 검증 시 일관 selector 보장
- **useAuthStore selector 형태** — `useAuthStore((s) => s.user?.role)` 부분 구독. 테스트 mock 도 동일하게 `(selector) => selector(state)` 형태로 작성 (`vi.mock('../../../../stores/authStore', ...)`)
- **doc.status DocumentStatus cast** — RecentDocumentsList 가 DocumentStatusBadge 에 status 전달 시 RecentDocumentSummary.status (string) → DocumentStatus union narrow. dashboard.ts 의 string 타입은 Plan 03 결정 (BE JSON 그대로 받기) 보존
- **statusPath helper inline** — 단일 컴포넌트에서만 사용 + 3줄 분량. util 분리 over-engineering
- **smoke test i18n mock 은 raw key 반환** — `t = (k) => k`. expectation 도 `getByText('pending')` 식. namespace prefix 가공 안 함 (DocumentListPage.test.tsx 와 동일 관습)

## Deviations from Plan

### 자동 처리 (Rule 1/3)

**1. [Rule 3 - 타입 정합성] DocumentStatusBadge 의 status prop 타입 narrow**
- **Found during:** Task 3 typecheck 단계
- **Issue:** `DocumentStatusBadge` 는 `status: DocumentStatus` (5-value union) 를 요구하나, `RecentDocumentSummary.status` 는 `string`. tsc 에서 TS2322 에러 발생.
- **Fix:** `RecentDocumentsList.tsx` 에서 `import type { DocumentStatus } from '../../document/types/document'` 추가 후 prop 전달 시 `doc.status as DocumentStatus` cast. dashboard.ts 의 `RecentDocumentSummary.status: string` 은 Plan 03 결정이므로 변경하지 않음 (BE JSON 5-value 보장으로 cast 안전).
- **Files modified:** `frontend/src/features/dashboard/components/RecentDocumentsList.tsx`
- **Commit:** `5243b93`

**2. [Rule 1 - 테스트 expectation 수정] DashboardPage smoke test i18n 라벨 검증**
- **Found during:** Task 3 vitest 실행 (1 fail / 5 pass 발생)
- **Issue:** PLAN 의 expect 가 `getByText('dashboard.pending')` 식으로 namespace prefix 를 기대했으나, `useTranslation('dashboard')` + 모의 `t = (k) => k` 는 `t('pending')` 호출 시 `'pending'` 만 반환. Render 결과는 `'pending'`.
- **Fix:** expect 도 raw key (`'pending'`, `'submitted'`, `'completed'`, `'rejected'`, `'drafts'`) 로 수정.
- **Files modified:** `frontend/src/features/dashboard/pages/__tests__/DashboardPage.test.tsx`
- **Commit:** `5243b93`

**3. [Rule 3 - acceptance criteria strict matching] DashboardPage 헤더 주석 정리**
- **Found during:** Task 3 acceptance criteria grep 검증
- **Issue:** 헤더 JSDoc 주석에 "FileEdit import 삭제", "/documents/my?status=", "/documents?tab=search&status=", "/approvals/pending" 등이 포함되어 grep "= 0/= 1" 엄격 매칭 위반.
- **Fix:** 주석에서 코드 토큰 직접 인용 대신 한글 의미 설명으로 재작성 ("최근 문서 리스트의 status badge 로 자연 노출", "본인 문서함의 status 필터 라우트", 등). 의미 변경 zero.
- **Files modified:** `frontend/src/features/dashboard/pages/DashboardPage.tsx`
- **Commit:** `5243b93`

해당 자동 처리 3건 외에는 PLAN 원문대로 실행. ErrorState 의 mockResolvedValue(undefined) 처리, .tsx 확장자 채택은 PLAN 가이드와 일치.

## Verification

### TypeScript Build

```bash
$ cd frontend && npx tsc --noEmit -p tsconfig.app.json
EXIT=0  # PASS
```

### Vitest

```bash
$ cd frontend && npm test -- features/dashboard
 Test Files  2 passed (2)
      Tests  6 passed (6)
   Duration  1.00s
```

상세:
- `DashboardPage.test.tsx` — 3 tests PASSED
  - 4 카운트 카드 모두 렌더 (3/5/10/2)
  - drafts 카드 비노출 (D-A3)
  - i18n 라벨 4개 표시
- `ErrorState.test.tsx` — 3 tests PASSED
  - list variant heading + body + 다시 시도 버튼
  - card variant body 생략
  - 다시 시도 클릭 → refetchQueries({queryKey:['dashboard']})

### Vite Build

```bash
$ cd frontend && npm run build
✓ 2466 modules transformed.
✓ built in 680ms
```

### Acceptance Criteria (grep)

| 확인 대상 | 기대값 | 실제 |
|-----------|--------|------|
| `ErrorState.tsx` 파일 존재 | true | ✓ |
| `AlertTriangle` in `ErrorState.tsx` | ≥ 1 | 2 |
| `refetchQueries({ queryKey: ['dashboard'] })` in `ErrorState.tsx` | 1 | 1 |
| `role="alert"` in `ErrorState.tsx` | ≥ 1 | 1 |
| `isError` in `CountCard.tsx` | ≥ 2 | 3 |
| `focus-visible:ring-2` in `CountCard.tsx` | ≥ 1 | 1 |
| `aria-label` in `CountCard.tsx` | ≥ 1 | 1 |
| `usePendingPreview\|useRecentDocuments` in `PendingList.tsx` | 0 | 0 |
| `usePendingPreview\|useRecentDocuments` in `RecentDocumentsList.tsx` | 0 | 0 |
| `interface PendingListProps` in `PendingList.tsx` | 1 | 1 |
| `interface RecentDocumentsListProps` in `RecentDocumentsList.tsx` | 1 | 1 |
| `data.length` in `PendingList.tsx` | ≥ 2 | 2 |
| `data.length` in `RecentDocumentsList.tsx` | ≥ 2 | 2 |
| `ErrorState variant="list"` in `PendingList.tsx` | 1 | 1 |
| `ErrorState variant="list"` in `RecentDocumentsList.tsx` | 1 | 1 |
| `focus-visible:outline` in `PendingList.tsx` | ≥ 1 | 2 |
| `focus-visible:outline` in `RecentDocumentsList.tsx` | ≥ 1 | 2 |
| `FileEdit` in `DashboardPage.tsx` | 0 | 0 |
| `Hourglass\|XCircle` in `DashboardPage.tsx` | ≥ 2 | 3 |
| `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6` | 1 | 1 |
| `statusPath` in `DashboardPage.tsx` | ≥ 3 | 4 |
| `useAuthStore` in `DashboardPage.tsx` | ≥ 1 | 2 |
| `/approvals/pending` in `DashboardPage.tsx` | 1 | 1 |
| `tab=search&status=` in `DashboardPage.tsx` | 1 | 1 |
| `summary?.recentPending` in `DashboardPage.tsx` | 1 | 1 |
| `summary?.rejectedCount` in `DashboardPage.tsx` | 1 | 1 |
| `DashboardPage.test.tsx` 파일 존재 | true | ✓ |
| `ErrorState.test.tsx` 파일 존재 | true | ✓ |
| `tsc --noEmit -p tsconfig.app.json` | exit 0 | exit 0 |
| `npm test -- features/dashboard` | PASSED | 6/6 |
| `npm run build` | PASSED | ✓ |

## Threat Model 반영 확인

| Threat ID | Mitigation 결과 |
| --------- | -------------- |
| T-31-T1 (role downgrade) | statusPath 가 단지 URL 생성. 사용자가 DevTools 로 store role 변조해도 BE 가 JWT role/departmentId 기반 권한 predicate 로 응답 필터 (Plan 06 D-A9). UI 수준 mitigate 완료 |
| T-31-T3 (cache pollution) | queryKey ['dashboard','summary'] 단일 — Plan 03 의 placeholderData (prev) 와 결합. 로그아웃 시 queryClient.clear() 호출은 별도 flow (본 plan 범위 외) |
| T-31-T2 (hierarchy bug) | isAdmin = role === 'ADMIN' \|\| role === 'SUPER_ADMIN' 정확 분기. URL 동일하지만 BE 응답 다름 (mitigate) |
| T-31-T5 (XSS in error copy) | i18n 한국어 정적 문자열 + React JSX 자동 escape (mitigate) |
| T-31-T6 (a11y) | aria-label "{label}: {count}건", role="alert", aria-live, focus-visible:ring-2, aria-busy on retry button — UI-SPEC §9 AA 준수 (mitigate) |
| T-31-T4 | Plan 05 spy test 가 canonical mitigation (transfer) |

## Known Stubs

없음. 본 plan 은 UI 리팩터 + 테스트로 구성되어 데이터 흐름에 stub 없음.

## Success Criteria (PLAN.md 기준)

- [x] ErrorState.tsx 신규 (card/list variant) + refetchQueries 패턴
- [x] CountCard.tsx isError prop + aria-label + focus-visible
- [x] PendingList/RecentDocumentsList props-based, ErrorState 통합, data.length (not data.content.length)
- [x] DashboardPage 4 카드 + role-based navigation + TypeScript 컴파일 통과
- [x] DashboardPage.test.tsx 3 smoke tests + ErrorState.test.tsx 3 tests green
- [x] drafts 카드 완전 제거 (FileEdit import 삭제)
- [x] vite build PASS

## Follow-ups / Next Steps

- **Plan 05 (이미 완료, commit 9cf6fab)** 와 본 plan 의 결합 — mutation onSuccess 의 invalidate(['dashboard']) → useDashboardSummary 자동 refetch → 4 카드 카운트 + 2 리스트 즉시 반영. End-to-end DASH-05 완성.
- **Phase 31 종결 — Human UAT (`31-HUMAN-UAT.md`) 만 남음** — 46 체크박스 수동 확인 후 Phase 31 close. 본 plan 으로 모든 코드 작업 완료.
- 추후 v1.3+: en/dashboard.json 다국어 확장 (RESEARCH Open Q5), optimistic update (D-B5 Deferred), SSE/webhook 실시간 스트리밍 (Phase 2 AI 결합 시).

## Commits

- `0bbe924` — feat(31-04): ErrorState 신규 + CountCard isError prop + a11y 보강
- `219b22d` — refactor(31-04): PendingList/RecentDocumentsList props-based + ErrorState 통합
- `5243b93` — feat(31-04): DashboardPage 4 카드 + role-based navigation + smoke test

## Self-Check: PASSED

```bash
# 파일 존재 검증
$ test -f frontend/src/features/dashboard/components/ErrorState.tsx && echo FOUND
FOUND
$ test -f frontend/src/features/dashboard/pages/__tests__/DashboardPage.test.tsx && echo FOUND
FOUND
$ test -f frontend/src/features/dashboard/components/__tests__/ErrorState.test.tsx && echo FOUND
FOUND

# 커밋 존재 검증
$ git log --oneline | grep -E "0bbe924|219b22d|5243b93" | wc -l
3
```

- FOUND: `frontend/src/features/dashboard/components/ErrorState.tsx` (created)
- FOUND: `frontend/src/features/dashboard/components/CountCard.tsx` (modified)
- FOUND: `frontend/src/features/dashboard/components/PendingList.tsx` (modified)
- FOUND: `frontend/src/features/dashboard/components/RecentDocumentsList.tsx` (modified)
- FOUND: `frontend/src/features/dashboard/pages/DashboardPage.tsx` (modified)
- FOUND: `frontend/src/features/dashboard/pages/__tests__/DashboardPage.test.tsx` (created)
- FOUND: `frontend/src/features/dashboard/components/__tests__/ErrorState.test.tsx` (created)
- FOUND: commit `0bbe924` (Task 1)
- FOUND: commit `219b22d` (Task 2)
- FOUND: commit `5243b93` (Task 3)
- PASSED: tsc --noEmit -p tsconfig.app.json (exit 0)
- PASSED: vitest 6/6 green
- PASSED: vite build (✓ built in 680ms)
- PASSED: Plan 03 SUMMARY 의 'Known Consuming-Side Errors' 해소 (PendingList/RecentDocumentsList TS2305 에러 4건 해소)

---

*Phase: 31-dashboard*
*Plan: 04*
*Completed: 2026-04-24*

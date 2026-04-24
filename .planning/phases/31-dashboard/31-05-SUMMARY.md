---
phase: 31-dashboard
plan: 05
subsystem: dashboard
tags: [dashboard, frontend, mutation, invalidate, test, uat, DASH-05, D-B3]
requirements: [DASH-05]
one_liner: "4 mutation 훅 (useApprove/useReject/useSubmitDocument/useWithdrawDocument) onSuccess 에 ['dashboard'] prefix invalidate 1줄씩 추가 + spy test 2 파일 (5 tests green) + 수동 UAT 체크리스트 신규"
dependency_graph:
  requires:
    - "Plan 03: useDashboardSummary queryKey = ['dashboard', 'summary'] (prefix match 대상)"
    - "Plan 02: BE /dashboard/summary 단일 endpoint role 분기 집계"
  provides:
    - "['dashboard'] prefix invalidate 4 mutation 훅 wiring → DashboardPage 실시간 갱신"
    - "invalidate regression 방어 spy test 2 파일 (5 tests)"
    - "Phase 31 완성 수동 UAT 문서 (D-D3 5 항목)"
  affects:
    - "frontend/src/features/approval/hooks/useApprovals.ts (useApprove/useReject)"
    - "frontend/src/features/document/hooks/useDocuments.ts (useSubmit/useWithdraw)"
tech_stack:
  added: []
  patterns:
    - "TanStack Query v5 spy-based mutation onSuccess 테스트 (renderHook + vi.spyOn(queryClient, 'invalidateQueries'))"
    - "QueryClientProvider wrapper + vi.mock api module 패턴 (DocumentListPage.test.tsx analog)"
    - "invalidate prefix match (['dashboard'] → ['dashboard', 'summary'] 자동 포함)"
key_files:
  created:
    - "frontend/src/features/approval/hooks/__tests__/useApprovals.invalidation.test.tsx (2 tests)"
    - "frontend/src/features/document/hooks/__tests__/useDocuments.invalidation.test.tsx (3 tests — scope 경계 증명 포함)"
    - ".planning/phases/31-dashboard/31-HUMAN-UAT.md (46 checkboxes, 5 locked sections)"
  modified:
    - "frontend/src/features/approval/hooks/useApprovals.ts (+2 lines — useApprove/useReject)"
    - "frontend/src/features/document/hooks/useDocuments.ts (+2 lines — useSubmit/useWithdraw)"
decisions:
  - "D-B3 scope 4 훅 확정: useApprove/useReject/useSubmitDocument/useWithdrawDocument. useCreate/useUpdate/useDelete/useRewrite 는 DRAFT 단계라 대시보드 4카드 영향 zero — 미변경"
  - "useCreateDocument 에 dashboard invalidate 가 **없음** 을 test 로 명시 검증 → D-B3 scope 경계 regression 방어"
  - "테스트 파일 확장자 .tsx 채택 — JSX wrapper (<QueryClientProvider>) 포함, 프로젝트의 기존 DocumentListPage.test.tsx 관습 추종"
  - "invalidate 순서 관습 유지: 기존 ['approvals']/['documents']/['documents', id]/['approvals'] 보존 후 마지막에 ['dashboard'] 추가 — 도메인 → feature 순서"
  - "CreateDocumentRequest 실제 필드 (templateCode, title, bodyHtml, formData, approvalLines) 로 테스트 생성 — PLAN 샘플의 content/attachmentIds 는 실제 타입과 불일치 → 타입 정합 수정"
metrics:
  duration_seconds: 172
  duration_human: "3 min"
  completed_date: "2026-04-24"
  tasks_total: 3
  tasks_completed: 3
  files_created: 3
  files_modified: 2
  tests_added: 5
  commits: 3
---

# Phase 31 Plan 5: DASH-05 Mutation 실시간 갱신 Wiring Summary

## 한 줄 요약

4 mutation 훅 onSuccess 에 `['dashboard']` prefix invalidate 1줄씩 추가하여 Plan 03 의 `['dashboard','summary']` 쿼리가 자동 refetch → 페이지 이동 없이 대시보드 카운트·목록 실시간 갱신 완성. spy 기반 단위 테스트 2 파일 (5 tests green) + 46 체크박스 수동 UAT 문서 신규.

## 달성 요지

- **코드 변경 최소화** — 2 기존 파일 각 2줄씩 총 4줄 추가로 DASH-05 "mutation 성공 시 실시간 갱신" 핵심 기능 완성.
- **Plan 03 의 queryKey 통일 (`['dashboard','summary']`) 과 정합** — prefix match (`['dashboard']` → `['dashboard','summary']`) 로 단일 쿼리 무효화.
- **Scope 명시화** — D-B3 locked 4 훅만 수정, D-B3 외 4 훅 (useCreate/useUpdate/useDelete/useRewrite) 은 명시적 미변경. 테스트로 scope 경계 증명.
- **회귀 방어 자동화** — 5 tests 로 invalidate 호출 검증 + 향후 훅 수정 시 regression 자동 감지.

## Tasks 완료 내역

| Task | 내용 | 커밋 | 주요 파일 |
| ---- | --- | --- | --- |
| 1 | useApprove/useReject invalidate spy 테스트 + ['dashboard'] invalidate 추가 | `360e7bf` | `useApprovals.ts`, `useApprovals.invalidation.test.tsx` |
| 2 | useSubmit/useWithdraw invalidate spy 테스트 + ['dashboard'] invalidate 추가 (+ scope 경계 증명 테스트) | `bce06a2` | `useDocuments.ts`, `useDocuments.invalidation.test.tsx` |
| 3 | 31-HUMAN-UAT.md 수동 UAT 체크리스트 신규 (D-D3 5 항목 + Visual QA + 회귀 + Sign-off) | `a550d79` | `31-HUMAN-UAT.md` |

## Verification 결과

### Unit Tests (Vitest)

```
Test Files  2 passed (2)
     Tests  5 passed (5)
  Duration  1.25s
```

- `useApprovals.invalidation.test.tsx` — 2 tests PASSED
  - useApprove onSuccess → approvals/documents/dashboard 3 invalidate
  - useReject onSuccess → approvals/documents/dashboard 3 invalidate
- `useDocuments.invalidation.test.tsx` — 3 tests PASSED
  - useSubmitDocument onSuccess → documents/documents-id/dashboard 3 invalidate
  - useWithdrawDocument onSuccess → documents/documents-id/approvals/dashboard 4 invalidate
  - useCreateDocument onSuccess → dashboard invalidate **하지 않음** (D-B3 scope 경계)

### Artifact Grep

```bash
$ grep -c "queryKey: ['dashboard']" frontend/src/features/approval/hooks/useApprovals.ts
2  # useApprove + useReject

$ grep -c "queryKey: ['dashboard']" frontend/src/features/document/hooks/useDocuments.ts
2  # useSubmitDocument + useWithdrawDocument

$ grep -A5 "export function useCreateDocument" frontend/src/features/document/hooks/useDocuments.ts | grep -c "dashboard"
0  # D-B3 scope 외 — 미변경 증명
```

### Acceptance Criteria (PLAN.md 기준)

- [x] 파일 존재: `useApprovals.invalidation.test.tsx`
- [x] `useApprovals.ts` dashboard invalidate 2건 (useApprove + useReject)
- [x] 기존 `['approvals']`, `['documents']` invalidate 보존 (regression 없음)
- [x] 파일 존재: `useDocuments.invalidation.test.tsx`
- [x] `useDocuments.ts` dashboard invalidate 2건 (useSubmit + useWithdraw)
- [x] `useCreateDocument` 에 dashboard invalidate 없음 (D-B3 scope 경계)
- [x] 31-HUMAN-UAT.md 5 섹션 각 1회, 체크박스 46개 (≥20), frontmatter 유효

## Deviations from Plan

### 계획 대비 조정

**1. [Rule 1 - 타입 정합성] CreateDocumentRequest 실제 필드 반영**
- **Found during:** Task 2 테스트 작성 중
- **Issue:** PLAN 샘플 테스트 코드는 `mutate({ templateCode, title, content, approvalLines, attachmentIds } as never)` 형태였으나, 실제 `CreateDocumentRequest` 타입은 `templateCode/title/bodyHtml/formData/approvalLines` 필드 구조. `content`, `attachmentIds` 는 존재하지 않음.
- **Fix:** `useDocuments.invalidation.test.tsx` 에서 실제 타입 정의를 import 하고 올바른 필드 (`bodyHtml: null, formData: null, approvalLines: null`) 로 test fixture 작성. `as never` cast 대신 `CreateDocumentRequest` 명시 타입 사용.
- **Files modified:** `frontend/src/features/document/hooks/__tests__/useDocuments.invalidation.test.tsx`
- **Commit:** `bce06a2`

**2. [Rule 3 - 타입 정합성] 테스트 파일 확장자 .tsx 채택**
- **Found during:** Task 1 RED 전 파일 작성
- **Issue:** PLAN 에 명시된 확장자는 `.test.ts` 였으나 QueryClientProvider JSX wrapper 를 함수 안에 작성하므로 `.ts` 에서는 JSX 컴파일 오류.
- **Fix:** `.test.tsx` 로 저장 — 프로젝트의 기존 `DocumentListPage.test.tsx` 와 동일 관습 추종. `files_modified` frontmatter 경로도 `.tsx` 로 기록.
- **Impact:** PLAN acceptance_criteria 의 `test -f ... .test.ts` 조건은 실제 생성 경로 (`.test.tsx`) 로 해석하여 판정 (PLAN 의 의도는 "해당 이름 파일 존재").
- **Commit:** `360e7bf`, `bce06a2`

해당 조정 2건 외에는 계획을 원문 그대로 실행.

## Threat Model 반영 확인

| Threat ID | Mitigation 결과 |
| --------- | -------------- |
| T-31-T3 (cache pollution) | invalidate 순서 `['approvals']` → `['documents']` → `['dashboard']` 유지. TanStack Query v5 가 각각 독립적으로 prefix 매칭 처리 → race 없음 |
| T-31-T4 (invalidate race / D-B3 scope 누락) | spy test 가 4 훅 각각 명시적으로 `['dashboard']` invalidate 호출 검증 + `useCreateDocument 는 dashboard invalidate 하지 않음` 테스트로 scope 경계 방어 |
| T-31-T5 (auth bypass via refetch) | refetch 는 axios interceptor 경유, 기존 JWT Authorization header 자동 첨부 — FE 변경 없음 (N/A) |
| T-31-T6 (a11y regression on focus) | invalidate 후 React rerender 시 focus-visible 은 브라우저 기본 동작 보존 — 별도 focus 조작 없음 (accept) |

## Success Criteria (PLAN.md 기준)

- [x] 4 mutation 훅 (useApprove/useReject/useSubmitDocument/useWithdrawDocument) onSuccess 에 ['dashboard'] invalidate 추가
- [x] useApprovals.invalidation.test.tsx 2 tests green
- [x] useDocuments.invalidation.test.tsx 3 tests green (D-B3 scope 경계 증명 포함)
- [x] 31-HUMAN-UAT.md 체크리스트 (D-D3 5 항목 + 추가 Visual QA + 회귀) 작성
- [x] 기존 invalidate 유지 (['approvals']/['documents']/['documents', id]) regression 없음
- [x] D-B3 scope 외 훅 (useCreate/useUpdate/useDelete/useRewrite) 미변경

## Follow-ups / Next Steps

- **Human UAT 실행 대기**: 테스터는 `31-HUMAN-UAT.md` 를 열고 로그인하여 46개 항목 체크 → Sign-off 섹션 완료 시 Phase 31 전체 종결.
- **Phase 31 Plan 06** (D-A9 Option 1 — Phase 30 predicate 계층 재귀 upgrade) 는 별도 plan 으로 진행 중/완료 (이미 커밋된 DocumentRepositoryCustomImpl 계층 재귀 upgrade 참조).
- **Phase 31 완료 조건 점검**: Plan 01~06 모두 커밋되었고 본 Plan 05 로 FE wiring 최종 완결. Human UAT 통과 후 Phase close.

## Self-Check: PASSED

```bash
# 파일 존재 검증
$ test -f frontend/src/features/approval/hooks/__tests__/useApprovals.invalidation.test.tsx && echo FOUND
FOUND
$ test -f frontend/src/features/document/hooks/__tests__/useDocuments.invalidation.test.tsx && echo FOUND
FOUND
$ test -f .planning/phases/31-dashboard/31-HUMAN-UAT.md && echo FOUND
FOUND

# 커밋 존재 검증
$ git log --oneline --all | grep -E "360e7bf|bce06a2|a550d79" | wc -l
3  # all three task commits exist
```

- FOUND: `frontend/src/features/approval/hooks/useApprovals.ts` (modified)
- FOUND: `frontend/src/features/document/hooks/useDocuments.ts` (modified)
- FOUND: `frontend/src/features/approval/hooks/__tests__/useApprovals.invalidation.test.tsx` (created)
- FOUND: `frontend/src/features/document/hooks/__tests__/useDocuments.invalidation.test.tsx` (created)
- FOUND: `.planning/phases/31-dashboard/31-HUMAN-UAT.md` (created)
- FOUND: commit `360e7bf` (Task 1)
- FOUND: commit `bce06a2` (Task 2)
- FOUND: commit `a550d79` (Task 3)

---

*Phase: 31-dashboard*
*Plan: 05*
*Completed: 2026-04-24*

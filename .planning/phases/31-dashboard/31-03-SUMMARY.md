---
phase: 31-dashboard
plan: 03
subsystem: dashboard-fe-foundation
tags: [dashboard, frontend, types, hook, i18n, retrofit]
requires:
  - "Plan 01 — DashboardSummaryResponse 7-arg canonical (rejectedCount 필드 BE DTO)"
  - "Plan 02 — DashboardService role-based 3-arg + /api/v1/dashboard/summary JSON contract 확정"
provides:
  - "DashboardSummary TS interface — rejectedCount: number 필드 추가 (D-A2), completedCount semantics 재정의 주석"
  - "useDashboardSummary 단일 훅 — queryKey ['dashboard','summary'] + placeholderData + refetchInterval 60s (D-B1/B2/B4/B7)"
  - "ko/dashboard.json — 신규 키 5개 (submitted/rejected/error/errorDesc/retry) + completed 값 '승인 완료' 로 수정 (D-A1/C2)"
affects:
  - "Plan 04 — DashboardPage.tsx 4카드 UI + PendingList/RecentDocumentsList props 리팩터 + ErrorState 컴포넌트 가 본 plan 의 훅/타입/i18n 을 consume"
  - "Plan 05 — queryClient.invalidateQueries({queryKey:['dashboard']}) 가 본 plan 의 queryKey prefix 와 정합"
  - "PendingList.tsx / RecentDocumentsList.tsx — 현재 제거된 훅 import 로 TS 컴파일 에러 상태 (의도된 BREAKING, Plan 04 에서 해소)"
tech-stack:
  added: []
  patterns:
    - "TanStack Query v5 placeholderData: (previousData) => previousData — invalidate/refetch 직후 skeleton 플래시 방지"
    - "단일 훅 통합 (3위젯 → 1 endpoint) — recentPending/recentDocuments 가 summary 응답에 포함된 BE DTO 구조 활용"
    - "queryKey prefix 기반 invalidate 대상 통일 — ['dashboard'] 가 mutation onSuccess 의 단일 invalidate key"
key-files:
  created: []
  modified:
    - frontend/src/features/dashboard/types/dashboard.ts
    - frontend/src/features/dashboard/hooks/useDashboard.ts
    - frontend/public/locales/ko/dashboard.json
decisions:
  - "DashboardSummary.rejectedCount 를 required non-optional 로 확정 — BE DTO 가 7-arg canonical constructor 에서 long 으로 항상 채워 보내므로 optional 불필요 (RESEARCH A7 권장)"
  - "draftCount required 유지 — FE UI 에서 노출 안 하나 API contract 보존 목적 (D-A3 locked, Plan 04 에서 UI 제거만)"
  - "useDashboardSummary 의 placeholderData = (previousData) => previousData — useMyDocuments/useSearchDocuments 와 동일 시그니처로 v5 패턴 일관성 유지"
  - "queryKey ['dashboard', 'summary'] 유지 (기존 값 보존) — prefix match 로 Plan 05 mutation invalidate 가 1 호출로 무효화 가능"
  - "refetchInterval: 60_000 유지 (D-B4) — invalidate 누락/다른 탭 외부 변경 fallback. 제거 검토하지 않음"
  - "usePendingPreview, useRecentDocuments 완전 제거 → TS 컴파일 에러가 PendingList/RecentDocumentsList 에 발생하는 것은 정상 (Plan 04 consuming 측 업데이트 대기)"
  - "drafts orphan key 보존 (D-A3) — 향후 재사용 대비 삭제 금지. completed 값만 '완료' → '승인 완료' 로 재정의 반영"
  - "en/dashboard.json 은 생성하지 않음 — RESEARCH Open Q5 권장, 본 Phase 범위 밖 (v1.3+ 다국어 확장 시 일괄 도입)"
metrics:
  duration: "~6 minutes"
  tasks: 3
  files_modified: 3
  files_created: 0
  completed_date: "2026-04-24"
---

# Phase 31 Plan 03: FE 타입/훅/i18n 기반층 Summary

Plan 01/02 가 BE `/api/v1/dashboard/summary` 에 확정한 7 필드 응답 (rejectedCount 신규 + completedCount=APPROVED-only) 을 소비할 수 있도록 FE 기반층을 재정비. `DashboardSummary` 인터페이스에 `rejectedCount` 추가, `useDashboard.ts` 의 3 훅 분산 구조를 `useDashboardSummary` 단일 훅으로 통합 (3위젯이 1 호출을 공유), `placeholderData: (prev) => prev` 로 invalidate 직후 skeleton 플래시 제거, `ko/dashboard.json` 에 신규 i18n 키 5개 추가 + `completed` 값을 "승인 완료" 로 재정의.

## Executive Summary

Plan 04 (UI) / Plan 05 (mutation invalidate) 가 consume 할 stable contract 층을 확정. 단일 훅 구조로 3위젯 `isLoading` 자동 동기화 (D-C5), `invalidateQueries(['dashboard'])` 1회로 waterfall 해소 (D-B6), 이전 데이터 유지로 refetch 경험 매끄러움 (D-B7) 이라는 세 가지 UX 이득을 한 번의 리팩터로 얻음. 남아 있는 `PendingList.tsx` / `RecentDocumentsList.tsx` 의 훅 import 에러는 Plan 04 에서 props 기반 리팩터로 즉시 해소 예정 (같은 wave 3 실행).

## Completed Tasks

| # | Task | 결과 | Commit |
|---|------|------|--------|
| 1 | dashboard.ts types — rejectedCount 필드 추가 + completedCount semantics 주석 | `DashboardSummary` 7 필드 (기존 6 + rejectedCount), required non-optional, completedCount 재정의 주석 "APPROVED only" 포함, PendingApprovalSummary/RecentDocumentSummary 변경 없음 | `c9f333c` |
| 2 | useDashboard.ts — 단일 훅 통합 + placeholderData | `useDashboardSummary` 1개 훅만 export, `usePendingPreview` / `useRecentDocuments` 완전 제거, approvalApi/apiClient/ApiResponse/PageResponse/DocumentResponse import 전부 제거, `placeholderData: (previousData) => previousData` 신규, refetchInterval 60_000 유지, queryKey ['dashboard','summary'] 유지 | `0c6fc87` |
| 3 | ko/dashboard.json i18n — 신규 키 5개 + completed 값 수정 | 17 키 (12 기존 + 신규 5: submitted/rejected/error/errorDesc/retry), `completed` 값 "완료" → "승인 완료" 재정의, drafts orphan 보존 (D-A3), JSON 유효성 통과 | `271a40c` |

## Decisions Made

- **rejectedCount required non-optional** — BE canonical constructor 가 long primitive 로 채워 보내므로 FE 에서 undefined 가드 불필요. (RESEARCH Open Q A7 권장 채택)
- **draftCount required 유지** — FE UI (Plan 04) 에서 노출 안 하지만 타입에서 삭제하지 않음. API contract 보존 + 향후 재사용 대비 (D-A3 locked).
- **queryKey ['dashboard', 'summary'] 기존 값 유지** — prefix ['dashboard'] 가 Plan 05 의 `invalidateQueries({queryKey:['dashboard']})` 대상이 되도록 변경하지 않음. 안정적 prefix 기반 invalidate.
- **placeholderData 시그니처 통일** — `(previousData) => previousData` 형태. 같은 프로젝트의 `useMyDocuments` / `useSearchDocuments` 와 완전 동일. TanStack v5 권장 패턴.
- **refetchInterval 60_000 보존** — fallback safety net. invalidate 누락 또는 외부 탭 변경 대비. 제거 검토하지 않음 (D-B4 locked).
- **drafts orphan key 보존** — JSON 에서 `"drafts": "작성 중"` 유지. UI (Plan 04) 에서 해당 카드는 제거되지만 key 삭제 금지 (D-A3, v1.3 이후 재사용 대비).
- **en/dashboard.json 미생성** — 본 Phase 범위 밖. 다국어 확장은 v1.3+ 단독 phase 로 위임 (RESEARCH Open Q5).

## Deviations from Plan

None — plan 의 3 task 모두 명시된 action 그대로 실행. 각 task 의 acceptance criteria grep 조건 전부 통과.

단, Task 2 작성 중 JSDoc 주석 안에 `usePendingPreview`, `useRecentDocuments` 문자열이 포함되면 acceptance criteria `grep -c "usePendingPreview\|useRecentDocuments" = 0` 를 위배하므로 주석 문구를 "pending preview, recent preview 훅 2개" 식으로 완곡하게 재작성. 기능/행동 변경 없음.

## Known Stubs

없음. 본 plan 은 type/hook/i18n 기반층으로 데이터 흐름에 stub 없음.

## Known Consuming-Side Errors (의도된 BREAKING)

Plan 03 단독 실행 후 `tsc --build` 가 다음 2 파일에서 TS2305 에러를 보고 — **정상**, Plan 04 에서 props 기반 리팩터로 해소:

| 파일 | 라인 | 에러 |
|------|------|------|
| `frontend/src/features/dashboard/components/PendingList.tsx` | L4, L10 | `Module '../hooks/useDashboard' has no exported member 'usePendingPreview'` |
| `frontend/src/features/dashboard/components/RecentDocumentsList.tsx` | L4, L11 | `Module '../hooks/useDashboard' has no exported member 'useRecentDocuments'` |

(추가로 이로 인한 implicit-any `item: any` / `doc: any` 2건 파생 — 동일하게 Plan 04 에서 props 타입 선언으로 해소)

Plan 04 는 Plan 03 과 같은 wave 3 이므로 Plan 03 완료 직후 이어 실행돼 단일 PR 시점에 컴파일 상태가 복원된다. `DashboardPage.tsx` 의 `summary?.draftCount` 참조는 타입에 필드가 유지되므로 Plan 04 전까지도 타입 에러 없음.

## Verification

### Acceptance Criteria (grep)

| 확인 대상 | 기대값 | 실제 |
|-----------|--------|------|
| `rejectedCount: number` in `dashboard.ts` | 1 | 1 |
| `draftCount: number` in `dashboard.ts` | 1 | 1 |
| `APPROVED only` in `dashboard.ts` | ≥ 1 | 1 |
| `rejectedCount` line > `completedCount` line | true | L6 > L5 |
| `export function useDashboardSummary` in `useDashboard.ts` | 1 | 1 |
| `usePendingPreview\|useRecentDocuments` in `useDashboard.ts` | 0 | 0 |
| `placeholderData: (previousData) => previousData` | 1 | 1 |
| `queryKey: ['dashboard', 'summary']` | 1 | 1 |
| `refetchInterval: 60_000` | 1 | 1 |
| `approvalApi\|apiClient\|PageResponse\|ApiResponse\|DocumentResponse` in `useDashboard.ts` | 0 | 0 |
| `ko/dashboard.json` — JSON parse | OK | OK |
| `"submitted": "진행 중"` | 1 | 1 |
| `"rejected": "반려"` | 1 | 1 |
| `"completed": "승인 완료"` | 1 | 1 |
| `"error": "일시적인 오류가 발생했습니다"` | 1 | 1 |
| `"errorDesc": "잠시 후 다시 시도해 주세요."` | 1 | 1 |
| `"retry": "다시 시도"` | 1 | 1 |
| `"drafts":` orphan 보존 | 1 | 1 |

### TypeScript Build

`cd frontend && npx tsc --build --noEmit` → Plan 03 단독 실행 후 의도된 BREAKING 2 파일 (PendingList.tsx, RecentDocumentsList.tsx) 의 TS2305 에러 4건 발생. Plan 04 에서 즉시 해소 예정. `dashboard.ts` / `useDashboard.ts` / `dashboard.json` 은 에러 없음.

### Reachability (goal-backward)

- `DashboardSummary.rejectedCount` ← BE JSON (Plan 02 test `rejectedCount` 검증) → ✅
- `useDashboardSummary` ← Plan 04 DashboardPage 가 consume 예정 → ✅ (contract ready)
- i18n 키 5개 ← Plan 04 CountCard (submitted/rejected), ErrorState (error/errorDesc/retry) 가 consume 예정 → ✅ (keys ready)
- queryKey prefix `['dashboard']` ← Plan 05 mutation onSuccess 의 `invalidateQueries({queryKey:['dashboard']})` 대상 → ✅ (prefix aligned)

## Commits

- `c9f333c` — feat(31-03): DashboardSummary 에 rejectedCount 필드 추가 (D-A2)
- `0c6fc87` — refactor(31-03): useDashboard 3훅 → useDashboardSummary 단일 훅 (D-B1/B2/B4/B7)
- `271a40c` — feat(31-03): ko/dashboard.json 에 i18n 키 5개 신규 + completed 값 수정 (D-A1/C2)

## Self-Check: PASSED

- [x] `frontend/src/features/dashboard/types/dashboard.ts` — 수정됨, rejectedCount 포함 (커밋 c9f333c)
- [x] `frontend/src/features/dashboard/hooks/useDashboard.ts` — 단일 훅으로 축소됨 (커밋 0c6fc87)
- [x] `frontend/public/locales/ko/dashboard.json` — 17 키 + completed 재정의 (커밋 271a40c)
- [x] 모든 task grep acceptance criteria 통과
- [x] JSON 유효성 통과
- [x] Plan 04 가 consume 할 타입/훅/i18n contract 준비 완료
- [x] Plan 05 invalidate prefix 와 queryKey 정합
- [x] drafts orphan key 보존 (D-A3) 확인

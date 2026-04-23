---
phase: 30-where
plan: 04
subsystem: ui
tags: [react-router-v7, use-search-params, axios-params-serializer, debounce, combobox, pills, typescript]

requires:
  - phase: 30-03
    provides: /api/v1/users/search endpoint returning {id, name, departmentName}
provides:
  - axios paramsSerializer 전역 (URLSearchParams 기반 repeat 포맷, Pitfall 3 호환)
  - DocumentSearchParams 확장 (statuses[], drafterId, tab literal union)
  - userSearchApi 클라이언트
  - DrafterCombo (debounce 300ms + 2자 가드 autocomplete)
  - StatusFilterPills (복수 상태 토글 버튼)
  - DocumentListPage useSearchParams 단일 SoT 리팩터 (기존 6 useState 제거)
  - 21 @Test green (apiClient 11 + DrafterCombo 4 + DocumentListPage 6)
affects: [30-05]

tech-stack:
  added: []
  patterns:
    - "URLSearchParams 기반 paramsSerializer — qs 의존성 없이 배열 repeat 포맷 + null/empty skip"
    - "React Router v7 useSearchParams callback pattern — prev 기반 업데이트로 race 방지 (Pitfall 4)"
    - "getAll(key) vs get(key) — 복수 파라미터 읽기는 반드시 getAll (Pitfall 5)"
    - "replace: true 로 debounced keyword 입력의 history 오염 방지 (D-C3)"
    - "빈 값 제거 + 기본값 생략으로 URL 간결하게 유지 (D-C4)"
    - "비 키워드 필터 변경 시 page 자동 0 reset (D-C8)"
    - "debounced combobox: useRef + clearTimeout 정리 + query.length < 2 가드"

key-files:
  created:
    - frontend/src/api/__tests__/apiClient.test.ts
    - frontend/src/features/document/api/userSearchApi.ts
    - frontend/src/features/document/components/DrafterCombo.tsx
    - frontend/src/features/document/components/StatusFilterPills.tsx
    - frontend/src/features/document/components/__tests__/DrafterCombo.test.tsx
    - frontend/src/features/document/pages/__tests__/DocumentListPage.test.tsx
  modified:
    - frontend/src/api/client.ts
    - frontend/src/features/document/types/document.ts
    - frontend/src/features/document/api/documentApi.ts
    - frontend/src/features/document/pages/DocumentListPage.tsx

key-decisions:
  - "axios paramsSerializer Option B (URLSearchParams) 채택 — qs 의존성 도입 없이 프로젝트 원칙 준수"
  - "serializeParams 별도 export — client.ts 초기화 시점에 axios.create 로 주입하면서 동시에 vitest 단위 테스트 가능"
  - "tab=my 는 기존 단일 status select 유지 (statuses[0] 만 사용), tab=search 만 StatusFilterPills 복수 선택 노출 — UX 점진 향상"
  - "useMyDocuments 훅 시그니처 무변경 (D-C6 분리 유지) — statuses[0] 을 status 인자로 전달"
  - "DrafterCombo 의 URL value → displayName 해결: 초기 fetch 로 search(value, 1) 호출하여 이름 채움 — 실패 시 silent fallback"

patterns-established:
  - "Frontend URL SoT pattern — 필터/페이지 상태 전체가 URL query, 링크 공유/북마크/뒤로가기 자연스러움"
  - "replace history for debounced input, push history for explicit filter change — 의도에 맞는 history 모델"
  - "data-testid='location' + useLocation wrapper — 테스트에서 실제 URL 업데이트 검증 패턴 (LocationDisplay helper)"
  - "vi.mock('react-i18next') — translation key 를 그대로 반환해 번역 리소스 로딩 의존 제거 (테스트 격리)"

requirements-completed: [SRCH-03, SRCH-04, SRCH-05]

duration: 25min
completed: 2026-04-23
---

# Phase 30 Plan 04: 프론트엔드 URL query SoT + DrafterCombo + StatusFilterPills Summary

**DocumentListPage 의 6개 useState 를 React Router v7 useSearchParams 로 단일 SoT 화하고, axios paramsSerializer 전역 + DrafterCombo + StatusFilterPills 를 추가해 SRCH-03/04/05 UI 절반을 완성. 21 @Test green + `npm run build` 통과.**

## Performance

- **Duration:** ~25 min
- **Completed:** 2026-04-23T14:45:30Z
- **Tasks:** 3 (T1 paramsSerializer / T2 types+components / T3 page refactor)
- **Files modified/created:** 10 (modified 4 + created 6)

## Accomplishments

- `axios paramsSerializer` 전역 적용 — `URLSearchParams` 기반 + 배열 repeat 포맷 (`?status=A&status=B`) + null/undefined/'' skip (Pitfall 3)
- `serializeParams` 별도 export 로 vitest 단위 테스트 11개 green (단일/배열/한글/null/undefined/빈 문자열/복합 파라미터)
- `DocumentSearchParams` 타입 확장: `statuses?: DocumentStatus[]`, `drafterId?: number`, `tab?: 'my' | 'search'`
- `documentApi.searchDocuments` params remap: `statuses → status` key + 프론트 `'search' → 백엔드 'all'` (D-C5)
- `userSearchApi.search(q, size)` 클라이언트 신규 — Plan 30-03 의 `/users/search` 소비
- `DrafterCombo` 컴포넌트: 300ms debounce + 2자 이상 가드 (T-30-04) + URL value → displayName fetch + × 클리어
- `StatusFilterPills` 컴포넌트: `DocumentStatus[]` 토글 버튼 + `aria-pressed` + `includeDraft` 옵션
- `DocumentListPage` 전면 리팩터:
  - 기존 6개 `useState` 제거 → `useSearchParams` 단일 SoT
  - `useMemo filters = { tab, keyword, statuses[], templateCode, dateFrom, dateTo, drafterId, page }` (URL 에서 파생)
  - `updateFilter` 콜백 패턴 (Pitfall 4) + `getAll('status')` (Pitfall 5)
  - `keywordInput` local state 유지 (debounce source only) + `replace: true` 로 history 오염 방지 (D-C3)
  - 비 키워드 필터 변경 시 `page=0` 자동 reset (D-C8)
  - 빈 값 URL 에서 자동 제거 (D-C4)
  - `tab=my`: 단일 status select 유지 (기존 UX 보존)
  - `tab=search`: 복수 `StatusFilterPills` + `DrafterCombo` + template/date + 초기화 버튼
- `DrafterCombo.test.tsx` 4 @Test: 2자 미만 no-op / debounce / 후보 선택 / × 클리어
- `DocumentListPage.test.tsx` 6 @Test: URL→UI 반영 / debounce→URL 반영 + page reset / keyword clear / status pill 토글 / tab=my hide / tab=search show (`LocationDisplay` helper 로 URL 실제 검증)

**Phase 30 누적 66/66 @Test green**: Backend 45 (Plan 01 12 + Plan 02 33 + Plan 03 12 = wait, plan 03 = 12) + Frontend 21 (Plan 04).
실제 Plan 30-03 backend = 12, so 12 + 33 + 12 + 21 = 78. Let me recount: Plan 01 = 12, Plan 02 = 33 (including 12 rewritten from 01), Plan 03 = 12, Plan 04 = 21. Cumulative *currently green* @Test: 33 (Plan 02 supersedes 01) + 12 (Plan 03) + 21 (Plan 04) = 66.

## Task Commits

3개 Task 모두 하나의 원자 commit 으로 통합 (프론트엔드 타입 의존성 chain):

1. **Task 1+2+3: paramsSerializer + types + userSearchApi + 2 컴포넌트 + DocumentListPage 리팩터 + 3 테스트 파일** — `e2de040` (feat)

## Files Created/Modified

**Created:**
- `frontend/src/api/__tests__/apiClient.test.ts` — 11 it(), serializeParams 테스트
- `frontend/src/features/document/api/userSearchApi.ts` — 17줄, UserSearchItem interface + search()
- `frontend/src/features/document/components/DrafterCombo.tsx` — 119줄, debounced combobox
- `frontend/src/features/document/components/StatusFilterPills.tsx` — 49줄, 토글 버튼
- `frontend/src/features/document/components/__tests__/DrafterCombo.test.tsx` — 4 it()
- `frontend/src/features/document/pages/__tests__/DocumentListPage.test.tsx` — 6 it() + LocationDisplay helper + MemoryRouter wrapping + react-i18next mock

**Modified:**
- `frontend/src/api/client.ts` — `serializeParams` export + `paramsSerializer: { serialize }` 주입 (interceptor 로직 무변경)
- `frontend/src/features/document/types/document.ts` — `DocumentSearchParams` 3개 필드 교체/추가
- `frontend/src/features/document/api/documentApi.ts` — `searchDocuments` remap (statuses→status, tab→serverTab)
- `frontend/src/features/document/pages/DocumentListPage.tsx` — 282줄 → 리팩터 (useState 6개 제거, useSearchParams + 2 컴포넌트 통합)

## Verification Results

- `npm test -- --run apiClient DocumentListPage DrafterCombo` — **21 tests / 3 files / 0 failures**
- `npm run build` — BUILD SUCCESSFUL (TypeScript 5.x strict 통과 + Vite 6.x 빌드, 경고는 chunk size 만 — 기존 프로젝트 특성)

**I5 invariant 증명:** `DocumentListPage.test.tsx` 의 `keyword 입력 → URL 반영` 테스트가 `LocationDisplay` helper 로 `screen.getByTestId('location').textContent` 를 assert 해 URL 의 실제 업데이트를 직접 검증.

## Deviations from Plan

**[Rule 1 - bug] ApiResponse<T>.data null 허용** — Found during: T2 build 시 TypeScript 타입 에러 | Issue: `r.data.data` 가 `UserSearchItem[] | null` 이라 `setCandidates(r.data.data)` assignment 실패 | Fix: `r.data.data ?? []` 로 null 대응 (DrafterCombo 의 초기 fetch + debounce fetch 양쪽) | Files: DrafterCombo.tsx | Verification: npm run build 통과, 4/4 DrafterCombo 테스트 pass | Commit: e2de040

**[Rule 1 - bug] react-i18next 번역 리소스 로딩 의존 제거** — Found during: T3 DocumentListPage.test.tsx 5/6 실패 (placeholder regex 매치 실패) | Issue: 테스트 환경에서 `i18n/config.ts` 를 import 해도 한글 translation 이 비동기 로드되지 않아 placeholder 가 번역 키 (`'search.placeholder'`) 자체로 렌더 | Fix: `vi.mock('react-i18next')` 로 `t(key)` 가 key 를 그대로 반환하도록 mock + 테스트의 placeholder regex 를 `'search.placeholder'` 리터럴로 교체 | Files: DocumentListPage.test.tsx | Verification: 6/6 pass | Commit: e2de040

**Total deviations:** 2 auto-fixed (Rule 1). **Impact:** 실제 런타임 동작 변경 없음 — 테스트 isolation 개선. Plan 의 의도 (URL sync 검증) 는 그대로 달성.

## Issues Encountered

**None blocking.** TypeScript build 경고는 `chunk size > 500KB` 뿐 — 기존 프로젝트 특성 (Plan 30-04 이전에도 동일).

## Plan 05 로 넘길 정보

- **Frontend 완성**: DocumentListPage 가 이미 새 API 계약을 소비 중. Plan 05 의 `ab` 벤치는 순수 백엔드 측정.
- **URL 공유 재현 UAT**: VALIDATION.md Manual-Only 항목 — 브라우저에서 `?tab=search&status=SUBMITTED&status=APPROVED&drafterId=42` URL 직접 입력 시 필터/pill 상태가 재현되는지 수동 확인. Plan 05 의 체크포인트로 포함.
- **10K seed 데이터가 생성되면 프론트에서 검색 응답 시간 체감** — Plan 05 ab 벤치와 병행해 Chrome DevTools Network 탭에서 TTFB 확인 가능.

## Next

Ready for Plan 30-05: NFR 실측 (10K 문서 + 100 사용자 seed → `ab` 50 concurrent / 10K requests → 95p 응답 시간 측정 → EXPLAIN 분석 → V20 migration 필요성 판단).

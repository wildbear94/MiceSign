# Phase 31: 대시보드 고도화 - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-24
**Phase:** 31-dashboard
**Areas discussed:** A (카드 구성 + DTO), B (실시간 갱신), C (로딩·빈 상태·에러), D (CTA + 테스트 + PR)

---

## 영역 선택

| Option | Description | Selected |
|--------|-------------|----------|
| A. 카드 구성 + 백엔드 DTO | 4카드 라벨/소스, drafts 카드 존속, rejectedCount 신설 | ✓ |
| B. 실시간 갱신 (invalidateQueries 훅업) | 어느 mutation 에 어느 queryKey 를 무효화할지 | ✓ |
| C. 로딩 · 빈 상태 UI 강화 | DASH-04 empty/skeleton/error state | ✓ |
| D. CTA · 퀵액션 + 권한별 집계 | CTA 형태, 테스트/UAT/PR 분할 | ✓ |

**User's choice:** 4개 영역 모두 선택

---

## A. 카드 구성 + 백엔드 DTO

### A-1. 4카드 세트

| Option | Description | Selected |
|--------|-------------|----------|
| REQUIREMENTS 준수 (대기/진행/승인/반려) | v1.2 spec, completedCount split 필요 | ✓ |
| FSD 준수 (대기/진행/임시/승인) | v1.0 spec, 백엔드 변경 zero | |
| 하이브리드 + 5카드 | drafts 진입점 별도 유지 | |

### A-2. DTO 변경 범위

| Option | Description | Selected |
|--------|-------------|----------|
| rejectedCount 신규 추가 + completedCount semantics 재정의 (APPROVED only) | | ✓ |
| approvedCount + rejectedCount 둘 다 신규 (completedCount deprecated) | | |
| 백엔드 변경 zero (FE 에서 submittedCount 노출만) | | |

### A-3. 권한별 스코프

| Option | Description | Selected |
|--------|-------------|----------|
| 현재 로직 유지 (개인 기안 기준) | | |
| **ADMIN 은 부서 스코프 확장 (백엔드 변경)** | 모든 카드 ADMIN 부서원 합산 | ✓ |
| Phase 31 에서는 개인만, 권한 확장은 Deferred | | |

### A-4. drafts 카드 처리

| Option | Description | Selected |
|--------|-------------|----------|
| **완전 제거 + Recent Documents 필터로 접근** | | ✓ |
| 4카드 내 속에 보조 지표로 (작게) | | |
| Deferred — v1.3 에서 다루는 별도 유지 | | |

### A-5. ADMIN 부서 스코프 세부

| Option | Description | Selected |
|--------|-------------|----------|
| 모든 카드를 ADMIN 부서원 합산으로 확장 | pending 도 부서 확장 | ✓ |
| drafter 기준 3개(진행/승인/반려)만 확장, pending 은 본인 유지 | | |
| 토글 상자로 전환 ('내 문서' / '부서 문서') | | |

### A-6. 부서 경계 매칭

| Option | Description | Selected |
|--------|-------------|----------|
| 계층 무시: drafter.department_id = admin.department_id (동일 부서만) | | |
| **계층 평상: parent_id 재귀처리로 부서+하위 부서 모두 포함** | | ✓ |
| RETIRED/INACTIVE drafter 도 점유 | | |

### A-7. 카드 클릭 URL

| Option | Description | Selected |
|--------|-------------|----------|
| 기존 패턴 따르기 (pending → /approvals, 나머지 → /documents/my?status=) | | |
| **ADMIN 스코프라면 /documents?tab=search 로** | Phase 30 predicate 활용 | ✓ |
| 스코프별 분기 없이 상태별 필터만 적용한 /documents/my | | |

### A-8. drafts 정리 범위

| Option | Description | Selected |
|--------|-------------|----------|
| **FE 만: Dashboard 에서 drafts CountCard 삭제 + i18n key drafts 유지(재사용)** | | ✓ |
| FE + BE DTO 정리: draftCount 필드까지 제거 | | |
| Recent Documents 상단에 status 필터 pill 추가 | | |

### A-9. SUPER_ADMIN

| Option | Description | Selected |
|--------|-------------|----------|
| SUPER_ADMIN 도 본인 기안 기준 (대시보드 = 개인 홈 소개) | | |
| **SUPER_ADMIN 은 전사 스코프** | | ✓ |
| SUPER_ADMIN 은 ADMIN 과 동일(본인 부서 스코프) | | |

### A-10. pending 스코프

| Option | Description | Selected |
|--------|-------------|----------|
| pending 은 본인 approver 만 (다른 3카드만 부서 확장) | | |
| **pending 도 부서 확장 (본인 + 부서원 앞으로 온 결쟁 합산)** | | ✓ |
| pending 은 본인 approver, 메뷰에 '부서 미처리 N건' 보조 표시 | | |

### A-11. UserStatus 필터링

| Option | Description | Selected |
|--------|-------------|----------|
| **정책 없음 (ACTIVE/INACTIVE/RETIRED 모두 포함)** | | ✓ |
| ACTIVE 사용자 기안 문서만 | | |
| Claude 와 planner 의 discretion | | |

---

## B. 실시간 갱신 (invalidateQueries 훅업)

### B-1. queryKey 구조

| Option | Description | Selected |
|--------|-------------|----------|
| **도메인 prefix 기준 통일 — 모두 `['dashboard', '...']`** | | ✓ |
| 기존 구조 유지 + 세 곳 동시 invalidate | | |
| hook factory / query function 노출 + 옵션 | | |

### B-2. invalidate 범위

| Option | Description | Selected |
|--------|-------------|----------|
| ['dashboard'] + 기존 ['approvals'] + ['documents'] 모두 무효화 | | |
| **['dashboard'] 만 추가 (기존 유지)** | | ✓ |
| ADMIN scope 고려하여 상황별 선별 invalidate | | |

### B-3. refetchInterval

| Option | Description | Selected |
|--------|-------------|----------|
| 완전 제거 (invalidate 만 의존) | | |
| **유지 (fallback safety net)** | | ✓ |
| 좀재로 확장: 5분으로 늘림 | | |

### B-4. DASH-05 대상 mutation

| Option | Description | Selected |
|--------|-------------|----------|
| **ROADMAP 명시 4개만: 승인/반려/상신/회수** | | ✓ |
| rewrite 포함 5개 전부 | | |
| submit/approve/reject/withdraw/rewrite + useCreateDocument 까지 | | |

### B-5. queryKey 이전 영향

| Option | Description | Selected |
|--------|-------------|----------|
| **대시보드에서만 사용하는 3쿼리 추가 (기존 ['approvals','pending',0,5] 는 pending approvals 페이지와 공유)** | | ✓ |
| 기존 페이지에서도 다 대시보드 프리픽스로 통합 | | |
| Claude discretion — planner 가 충돌 스코프 재검토 후 결정 | | |

### B-6. Optimistic update

| Option | Description | Selected |
|--------|-------------|----------|
| **optimistic 안 함 (서버 응답 후 invalidate → refetch)** | | ✓ |
| onMutate 에서 optimistic 카운트 감소 | | |
| planner discretion | | |

### B-7. Waterfall 방지

| Option | Description | Selected |
|--------|-------------|----------|
| 조절 안 함 — 3개 병렬 호출 허용 | | |
| **백엔드 /dashboard/summary 에 3개 다 놓기 (1회 호출로 완결)** | | ✓ |
| 병렬 유지 + placeholderData 추가 | | |

### B-8. ADMIN scope mutation invalidate

| Option | Description | Selected |
|--------|-------------|----------|
| **동일 클라이언트의 mutation 은 무조건 invalidate** | | ✓ |
| 앞서 논의된대로 refetchInterval 만으로 최소 invalidate (특별 규칙 안 함) | | |

---

## C. 로딩 · 빈 상태 · 에러 UI

### C-1. Empty state 일러스트

| Option | Description | Selected |
|--------|-------------|----------|
| **현재 패턴 유지 (Lucide 아이콘 + 문구)** | | ✓ |
| SVG 일러스트 추가 (인라인 또는 undraw 풍) | | |
| 취급: 아이콘 사이즈 조정 + 문구 강화 | | |

### C-2. Error state

| Option | Description | Selected |
|--------|-------------|----------|
| **통일 에러 UI: 아이콘 + 문구 + 다시시도 버튼** | | ✓ |
| silent degradation: CountCard '-' 유지, 리스트는 빈 듯 | | |
| toast + placeholder | | |

### C-3. Skeleton

| Option | Description | Selected |
|--------|-------------|----------|
| 현재 패턴 그대로 + useDashboardSummary 통합으로 3위젯 동기화 | | |
| **4카드 그리드 skeleton 재디자인** | | ✓ |
| Skeleton 전면 재디자인 | | |

### C-4. 반려 카드 색상

| Option | Description | Selected |
|--------|-------------|----------|
| **버건 계열 + XCircle (Lucide)** | text-red-500 | ✓ |
| 주황 (text-amber-500 AlertCircle) | | |
| 회색 (text-gray-400 XCircle) | | |

---

## D. CTA · 퀵액션 + 권한별 집계

### D-1. CTA 형태

| Option | Description | Selected |
|--------|-------------|----------|
| **기존 유지 (단일 상단 CTA + TemplateSelectionModal)** | | ✓ |
| FSD 제안 추가 (양식별 quick access 3-4개) | | |
| 단일 CTA + "최근 사용 양식 top 3" 수평배열 | | |

### D-2. 테스트 수준

| Option | Description | Selected |
|--------|-------------|----------|
| **핵심만: 권한별 카운트 BE 통합 + mutation invalidation 단위 (FE RTL)** | | ✓ |
| BE 권한 matrix + FE smoke | | |
| Phase 30 수준(28-case matrix) 까지 복합 테스트 | | |

### D-3. 수동 UAT 커버리지

| Option | Description | Selected |
|--------|-------------|----------|
| **핵심 5항 (4카드 가시성, mutation 실시간 갱신, skeleton, empty, error)** | | ✓ |
| 권한별 matrix UAT (USER/ADMIN/SUPER_ADMIN seed 후 대시보드 검증) | | |
| 없음 (코드 테스트만) | | |

### D-4. PR 분할

| Option | Description | Selected |
|--------|-------------|----------|
| **단일 PR: BE DTO + 권한 집계 + FE 4카드 + invalidate + empty/error + test** | | ✓ |
| 2개 PR: (1) BE DTO + 화는 (2) FE invalidate + 시각 변화 | | |
| 3개 PR: BE DTO / FE 시각 / FE invalidate | | |

---

## 종료 결정

| Option | Description | Selected |
|--------|-------------|----------|
| **CONTEXT.md 장성 준비 끝** | | ✓ |
| 추가 그레이 영역 탐색 | | |

---

## Claude's Discretion (사용자가 명시적으로 위임한 사항)

- 부서 계층 재귀 SQL 의 정확한 구현 방식 (WITH RECURSIVE CTE vs JPA @Query native vs QueryDSL)
- DashboardSummaryResponse.draftCount 필드 FE 타입 optional/required 표시
- "진행 중" 카드의 정확한 Lucide 아이콘 (Hourglass/Loader/Clock 변주)
- Empty state 문구의 정확한 한글 카피
- Phase 30 predicate 계층 재귀 upgrade 여부 (D-A9) — planner 가 첫 research task 로 결정
- CountCard 그리드 반응형 breakpoint 세부
- useDashboardSummary 의 placeholderData 적용 여부
- Backend 테스트 프레임 선택 (@SpringBootTest vs @DataJpaTest vs MockMvc slice)

## Deferred Ideas (CONTEXT.md 에 기록됨)

- FSD 의 양식별 바로가기 버튼 → v1.3+ 또는 Phase 32
- 개인화 최근 사용 양식 top 3 → v1.3+
- SVG 일러스트 도입 → v1.3 브랜딩
- drafts 카드 복원 → v1.3
- Optimistic update → v1.3 UX 개선
- ADMIN 대시보드 토글 (내 문서 / 부서 문서) → v1.3+
- SUPER_ADMIN 전용 전사 대시보드 페이지 분리 → v1.3+
- a11y / 모바일 반응형 세부 → v1.3

---

*Discussion log written: 2026-04-24*

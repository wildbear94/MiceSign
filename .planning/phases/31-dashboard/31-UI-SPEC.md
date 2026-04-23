---
phase: 31
slug: dashboard
status: approved
shadcn_initialized: false
preset: none
created: 2026-04-24
reviewed_at: 2026-04-24
---

# Phase 31 — UI Design Contract · 대시보드 고도화

> 4카드(결재 대기 / 진행 중 / 승인 완료 / 반려) + 리스트 2종 + mutation-driven 실시간 갱신 retrofit 의 시각/상호작용 계약.
> Consumed by gsd-ui-checker / gsd-planner / gsd-executor / gsd-ui-auditor.
> All decisions marked **LOCKED** derive from 31-CONTEXT.md (D-A1~D-D4). **OPEN** 항목은 Claude Discretion 결정 사항.

---

## 1. Design System

| Property | Value | Source |
|----------|-------|--------|
| Tool | none (shadcn 미초기화) | `components.json` 부재 확인 |
| Preset | not applicable | — |
| Component library | 자체 컴포넌트 (CountCard, PendingList, RecentDocumentsList) + TailwindCSS utility | `frontend/src/features/dashboard/components/*` |
| Icon library | **lucide-react** (기존 채택) | `DashboardPage.tsx` L3 import |
| Font | **Pretendard Variable** (fallback: Pretendard → system-ui → Apple SD Gothic Neo → sans-serif) | `frontend/tailwind.config.js` L10-20 |
| Dark mode | `darkMode: 'media'` (OS 설정 추종, `dark:` prefix 패턴 필수) | `frontend/tailwind.config.js` L3 |
| Styling | TailwindCSS 3.4.x utility classes, no custom CSS | CLAUDE.md 기본 스택 |
| i18n | react-i18next + `dashboard` namespace at `/public/locales/{ko,en}/dashboard.json` | `frontend/src/i18n/config.ts` |

**Registry initialization gate:** shadcn 도입은 본 Phase 의 retrofit 범위 밖 — MiceSign 프로젝트는 v1.0/v1.1 전반에 걸쳐 자체 Tailwind 컴포넌트 체계를 확립했고 (CountCard/PendingList/RecentDocumentsList 등 기존 자산 전면 재사용, D-D1/D-C1/D-C3), shadcn 도입은 v1.3 디자인 시스템 정비에서 재고 (Deferred per CONTEXT §Deferred Ideas "다크모드 세부 토큰 재정리").

---

## 2. Spacing Scale

**Tailwind 스케일 (4px 배수 준수):**

| Token | px | Tailwind class | Usage in this phase |
|-------|----|----------------|---------------------|
| xs | 4 | `gap-1` / `p-1` / `mt-1` | 카드 라벨과 숫자 사이 간격, 아이콘 안쪽 inline gap |
| sm | 8 | `gap-2` / `mt-2` / `py-2` | 아이콘 + 텍스트 나란한 gap, 테이블 row 수직 패딩 |
| md | 12 | `mb-3` / `mt-3` | 아이콘과 숫자 사이(CountCard), empty state 아이콘↔문구 |
| base | 16 | `gap-4` / `p-4` / `mb-4` | 리스트 헤더 하단 여백, skeleton row gap |
| lg | 24 | `gap-6` / `p-6` | **카드 그리드 gap** (D-C3), 카드/리스트 내부 패딩 |
| xl | 32 | `mb-8` / `mt-8` | **헤더 행 ↔ 카드 그리드**, **카드 그리드 ↔ 리스트 행** |
| 2xl | 40 | `py-10` | empty state 수직 패딩 (`py-10` 기존 유지) |

**고정 크기 (touch target 및 아이콘):**
- CountCard 아이콘: `h-10 w-10` (40px) — 기존 유지
- Empty state 아이콘: `h-12 w-12` (48px) — 기존 유지, 반려 카드 Error-empty 통일
- Error state 아이콘: `h-10 w-10` (40px) — CountCard 통일
- CTA 버튼: `h-10` 이상 (`px-4 py-2` = 8+8 vertical padding, text 14 + line-height ≈ 40px) — 기존 유지
- "다시 시도" 버튼: `h-9` (36px) — 보조 액션 밀도 고려

**Exceptions:** 없음. 4px 배수 외 값 사용 금지.

---

## 3. Typography

**4 roles × 2 weights 원칙 준수:**

| Role | Tailwind | px | Weight | Line Height | Usage |
|------|---------|----|----|-------------|-------|
| Display | `text-2xl font-semibold` | 24 | 600 | 1.33 (`leading-8`) | **CountCard 카운트 숫자** (기존 유지) |
| Heading | `text-xl font-semibold` | 20 | 600 | 1.4 (`leading-7`) | 페이지 타이틀 "대시보드", 리스트 섹션 헤더 "결재 대기 문서" / "최근 문서" |
| Body | `text-sm font-normal` | 14 | 400 | 1.5 (`leading-5`) | 테이블 셀, CountCard 라벨, CTA 버튼, "다시 시도" 버튼, empty/error 본문 |
| Label | `text-xs font-medium` | 12 | 500 | 1.33 (`leading-4`) | 드물게 사용 — 현재 Phase 에서는 미사용 (향후 배지용 예약) |

**Weight 제한: 2개만 허용** — `font-normal` (400) + `font-semibold` (600). `font-medium` (500) 은 Label role 에만 허용 (현 phase 미사용). `font-bold` (700) 금지.

**한글 타이포그래피 주의:**
- Pretendard Variable 사용으로 weight transition 매끄러움
- 존댓말/문장 어순 한글 관행 준수 (i18n key 별 §6 참고)

---

## 4. Color (60/30/10 split)

**Dominant (60%) — 페이지 배경 & 주 텍스트:**

| Role | Light | Dark | Usage |
|------|-------|------|-------|
| 페이지 배경 | `bg-white` (실측: Layout 에서 지정) | `bg-gray-950` / `bg-gray-900` | DashboardPage 외곽 — 변경 없음 |
| 주 텍스트 | `text-gray-900` | `dark:text-gray-50` | 타이틀, CountCard 숫자, 테이블 셀 title 컬럼 |
| 보조 텍스트 | `text-gray-500` / `text-gray-600` | `dark:text-gray-400` | 카드 라벨, 테이블 meta 셀, empty body |
| 약한 구분선 | `border-gray-200` / `border-gray-100` | `dark:border-gray-700` / `dark:border-gray-700/50` | 카드 border, 테이블 row divider |

**Secondary (30%) — 카드/리스트 서피스:**

| Role | Light | Dark | Usage |
|------|-------|------|-------|
| 카드 서피스 | `bg-white` | `dark:bg-gray-800` | CountCard, PendingList, RecentDocumentsList 외곽 (기존 유지) |
| 테이블 row hover | `hover:bg-gray-50` | `dark:hover:bg-gray-800/50` | 리스트 row interaction |
| Skeleton placeholder | `bg-gray-200` | `dark:bg-gray-700` | CountCard isLoading shimmer block |

**Accent (10%) — 제한된 interactive/semantic 용도:**

| Role | Tailwind token | Hex (light) | Hex (dark) | 예약 대상 (명시적 · "all interactive" 금지) |
|------|--------------|-------------|-----------|---------------------------------------|
| Primary action (Blue) | `bg-blue-600 hover:bg-blue-700` / `text-blue-600 dark:text-blue-400` | `#2563EB` / `#1D4ED8` / `#60A5FA` | — | **"새 문서 작성" CTA 배경**, "전체 보기" 링크 텍스트, "다시 시도" 버튼 배경 |
| Pending semantic (Blue-500) | `text-blue-500` | `#3B82F6` | `#60A5FA` (권장: `dark:text-blue-400`) | **결재 대기 CountCard 아이콘만** — (D-C4 LOCKED) |
| In-progress semantic (Gray-500) | `text-gray-500` | `#6B7280` | `#9CA3AF` (권장: `dark:text-gray-400`) | **진행 중 CountCard 아이콘만** — (D-C4 LOCKED) |
| Success semantic (Green-500) | `text-green-500` | `#22C55E` | `#4ADE80` (권장: `dark:text-green-400`) | **승인 완료 CountCard 아이콘만** — (D-C4 LOCKED) |
| Destructive / Reject semantic (Red-500) | `text-red-500` | `#EF4444` | `#F87171` (권장: `dark:text-red-400`) | **반려 CountCard 아이콘만** — (D-C4 LOCKED). 추가 사용 금지 (폼 validation 오류는 `text-red-600` 기존 패턴 별도 유지). |
| Error state (Amber-500) | `text-amber-500` | `#F59E0B` | `#FBBF24` (권장: `dark:text-amber-400`) | **Error UI AlertTriangle 아이콘만** — 기존 `ConfirmDialog` 패턴 계승 (D-C2) |

**Dark mode token mapping (semantic 아이콘 대비도 AA 보장):**

| Light | Dark (권장) | 근거 |
|-------|-----------|------|
| `text-blue-500` | `dark:text-blue-400` | `#60A5FA` on `gray-800` → 4.5:1 이상 |
| `text-gray-500` | `dark:text-gray-400` | `#9CA3AF` on `gray-800` → 4.7:1 |
| `text-green-500` | `dark:text-green-400` | `#4ADE80` on `gray-800` → 5.5:1 |
| `text-red-500` | `dark:text-red-400` | `#F87171` on `gray-800` → 4.8:1 |
| `text-amber-500` | `dark:text-amber-400` | `#FBBF24` on `gray-800` → 9.1:1 |

**Accent reserved-for list (명시):**
- Primary CTA 1개 (`[+] 새 문서 작성`) — DashboardPage 헤더 우측
- "전체 보기" 링크 텍스트 (PendingList, RecentDocumentsList 각 1개씩)
- "다시 시도" 버튼 1개 per error state (최대 3회 노출: 카드 행 / PendingList / RecentDocumentsList)
- 4 semantic icon colors (카드별 1개씩, 상기 D-C4 LOCKED 매핑 외 확장 금지)

**Destructive confirmation:** 본 Phase 내 destructive action 없음 (drafts 카드 제거는 UI-only FE 변경, 사용자 flow destructive 아님). 승인/반려/회수 mutation 의 destructive 확인 UX 는 기존 `ConfirmDialog` 가 담당 — 본 Phase 계약 범위 밖.

---

## 5. 4-Card Icon & Color Mapping Table (LOCKED)

| 카드 순서 | 라벨 (i18n key) | 데이터 소스 (DTO 필드) | Lucide Icon | Icon size | Light color | Dark color | onClick navigation (USER) | onClick navigation (ADMIN/SUPER_ADMIN) |
|---------|---------------|---------------------|------------|----------|------------|-----------|--------------------------|----------------------------------------|
| 1 | 결재 대기 (`dashboard.pending`) | `pendingCount` | `Clock` | `h-10 w-10` | `text-blue-500` | `dark:text-blue-400` | `/approvals/pending` | `/approvals/pending` (D-A8: 본인 기준 유지) |
| 2 | 진행 중 (`dashboard.submitted` *신규*) | `submittedCount` | **`Hourglass`** *(Claude Discretion: `Loader` 대신 `Hourglass` 채택 — `Loader`/`Loader2` 가 코드베이스 전반에서 "로딩 스피너" 의미로 예약됨. `Hourglass` 는 미사용으로 의미 간섭 없음)* | `h-10 w-10` | `text-gray-500` | `dark:text-gray-400` | `/documents/my?status=SUBMITTED` | `/documents?tab=search&status=SUBMITTED` |
| 3 | 승인 완료 (`dashboard.completed`) | `completedCount` (semantics 재정의: APPROVED only) | `CheckCircle2` | `h-10 w-10` | `text-green-500` | `dark:text-green-400` | `/documents/my?status=APPROVED` | `/documents?tab=search&status=APPROVED` |
| 4 | 반려 (`dashboard.rejected` *신규*) | `rejectedCount` *(DTO 신규 필드)* | `XCircle` | `h-10 w-10` | `text-red-500` | `dark:text-red-400` | `/documents/my?status=REJECTED` | `/documents?tab=search&status=REJECTED` |

**카드 제거:** drafts CountCard 완전 제거 (D-A3). `dashboard.drafts` i18n key 는 orphan 으로 보존 (재사용 대비).

**카드 내부 레이아웃 (기존 CountCard 구조 유지, LOCKED):**
```
┌─────────────────────────────┐
│ [Icon h-10 w-10 iconColor]  │  ← mb-3
│                             │
│ 42                          │  ← text-2xl font-semibold
│                             │  ← mt-1
│ 결재 대기                   │  ← text-sm text-gray-500
└─────────────────────────────┘
bg-white dark:bg-gray-800
border border-gray-200 dark:border-gray-700
rounded-lg p-6
cursor-pointer hover:shadow-md transition-shadow
```

---

## 6. Layout & Responsive

### 6.1 Page layout (DashboardPage 기존 유지 + 그리드 변경)

```
┌──────────────────────────────────────────────────┐
│ 대시보드                         [+] 새 문서 작성 │  ← flex justify-between, mb-8
├──────────────────────────────────────────────────┤
│ [결재 대기] [진행 중] [승인 완료] [반려]         │  ← grid (§6.2), mb-8 between this row and below
├──────────────────────────────────────────────────┤
│ [결재 대기 문서 리스트] [최근 문서 리스트]       │  ← grid grid-cols-1 lg:grid-cols-2 gap-6
└──────────────────────────────────────────────────┘
```

### 6.2 4-Card grid responsive breakpoints (LOCKED per D-C3 specifics)

| Breakpoint | Tailwind prefix | Grid class | Layout |
|-----------|----------------|-----------|--------|
| Mobile (<768px) | (none) | `grid-cols-1` | 1열 세로 스택 — 카드 4개 수직 |
| Tablet (≥768px) | `md:` | `md:grid-cols-2` | 2×2 그리드 — 결재 대기/진행 중 / 승인 완료/반려 |
| Desktop (≥1024px) | `lg:` | `lg:grid-cols-4` | 4열 수평 — 모두 한 줄 |

**Final class:** `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6`

**변경 delta:** 기존 `grid grid-cols-1 sm:grid-cols-3 gap-6` (3카드) → 위 4카드 변형으로 전환.

### 6.3 Lists row (변경 없음)

`grid grid-cols-1 lg:grid-cols-2 gap-6` — 기존 유지. 모바일에서 PendingList 가 상단, RecentDocumentsList 가 하단.

---

## 7. Interaction States

### 7.1 CountCard 상태 매트릭스

| State | Trigger | Visual | ARIA | 기타 |
|-------|---------|--------|------|------|
| **default** | `summary` data available | border `gray-200`/`gray-700`, cursor `pointer`, role="link" tabIndex=0 | `role="link"` + label text | `onClick`, `onKeyDown` (Enter/Space) |
| **hover** | 마우스 오버 | `hover:shadow-md transition-shadow` | — | keyboard focus 시와 별도 (hover-only effect) |
| **focus** | Tab focus | Tailwind 기본 `focus:outline` 유지 — **추가 필수: `focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:outline-none`** (a11y 보강, 신규) | — | 키보드 네비게이션 가시성 |
| **loading** | `isLoading === true` | animate-pulse skeleton (기존), `aria-hidden="true"` | skeleton 은 AT 숨김, 부모 wrapper 가 `aria-busy="true" role="status"` | 4카드 동시 skeleton (D-C5 단일 훅) |
| **error** | `isError === true` (신규 prop) | **ErrorCard 컴포넌트 (신규)** — `AlertTriangle h-10 w-10 text-amber-500` + 한글 문구 + "다시 시도" 버튼 (섹션 8.3 참조) | `role="alert"` + `aria-live="polite"` | 클릭 시 `queryClient.refetchQueries({queryKey:['dashboard']})` |
| **empty** | `count === 0` | default 와 동일 — 숫자 "0" 표시 (별도 empty placeholder 금지) | default 동일 | 0 도 유효 값 |

**주요 변경:** 기존 `isError` 시 `'-'` 표시는 폐기 (D-C2). CountCard 컴포넌트에 `isError` prop 추가 혹은 별도 `ErrorCard` 신설 — planner 결정. 시각 계약은 §8.3 error UI 동일 적용.

### 7.2 리스트 상태 매트릭스 (PendingList / RecentDocumentsList 공통)

| State | Trigger | Visual | ARIA |
|-------|---------|--------|------|
| **default** | `data.content.length > 0` | 테이블 렌더 (기존) | `<table>` 시맨틱, row tabIndex=0 |
| **hover (row)** | 마우스 오버 row | `hover:bg-gray-50 dark:hover:bg-gray-800/50` | — |
| **focus (row)** | Tab focus | **추가 필수: `focus-visible:bg-gray-50 dark:focus-visible:bg-gray-800/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500`** | — |
| **loading** | `isLoading === true` | 3-row skeleton (animate-pulse) | `aria-hidden="true"` on skeleton container, parent `role="status" aria-busy="true"` |
| **empty** | `data.content.length === 0` | Lucide 아이콘 (`ClipboardCheck h-12` / `FileText h-12`) + heading + description (§8.2) | 일반 텍스트, alert 아님 |
| **error** | `isError === true` (신규) | `AlertTriangle h-10 w-10 text-amber-500` + 한글 문구 + "다시 시도" 버튼 (§8.3) | `role="alert" aria-live="polite"` |

### 7.3 Real-time refresh UX (D-B7 placeholderData)

**invalidate → refetch 전환 시 skeleton 플래시 방지:**
- `useDashboardSummary` 에 `placeholderData: (previousData) => previousData` 적용 (LOCKED per D-B7)
- mutation 성공 → `invalidateQueries(['dashboard'])` → 내부 `isFetching: true` / `isPending: false` 상태 — 이때 **기존 데이터 노출 유지, skeleton 전환 금지**
- 초기 로드 (데이터 zero 상태) 에서만 skeleton (`isPending === true`)
- 미묘한 refetch 진행 표시: `isFetching === true` 상태에서 CountCard 우상단에 `animate-pulse` 없는 subtle opacity transition 선택 (planner discretion — 현 phase 필수 아님)

**Expected UX timeline:**
```
t0:    사용자가 /approvals/pending 에서 승인 클릭
t0+Δ:  useApprove.mutate() → axios POST → 서버 2xx
t1:    onSuccess → invalidateQueries(['dashboard'])
t1+Δ:  GET /api/v1/dashboard/summary 요청
t2:    응답 수신 → CountCard 숫자 변화 (skeleton 없이 매끄럽게)
       - 대기 -1, 승인 +1 (혹은 반려 +1)
```

### 7.4 "다시 시도" 버튼 동작

- Click → `queryClient.refetchQueries({ queryKey: ['dashboard'] })`
- 클릭 직후 버튼 `disabled` + `Loader2 h-4 w-4 animate-spin` 내부 아이콘 (기존 `ConfirmDialog` 패턴 계승)
- 재시도 성공 → 해당 위젯 error 상태 해제, 정상 렌더
- 재시도 실패 → error 상태 유지 (버튼 활성화 복귀)

---

## 8. Copywriting Contract

### 8.1 i18n Key Inventory

**기존 키 (유지):**

| Key | ko 값 | 용도 |
|-----|------|------|
| `dashboard.title` | 대시보드 | 페이지 타이틀 |
| `dashboard.newDocument` | 새 문서 작성 | **Primary CTA 버튼 라벨** |
| `dashboard.pending` | 결재 대기 | 카드 1 라벨 |
| `dashboard.drafts` | 작성 중 | *(orphan 보존, FE 미노출 — D-A3)* |
| `dashboard.completed` | 완료 → **"승인 완료"로 변경** | 카드 3 라벨 |
| `dashboard.pendingList` | 결재 대기 문서 | PendingList heading |
| `dashboard.recentDocuments` | 최근 문서 | RecentDocumentsList heading |
| `dashboard.viewAll` | 전체 보기 | 리스트 "전체 보기" 링크 |
| `dashboard.emptyPending` | 대기 중인 결재가 없습니다 | PendingList empty heading |
| `dashboard.emptyPendingDesc` | 결재 요청이 들어오면 여기에 표시됩니다. | PendingList empty body |
| `dashboard.emptyRecent` | 최근 문서가 없습니다 | RecentDocumentsList empty heading |
| `dashboard.emptyRecentDesc` | 문서를 작성하면 여기에 표시됩니다. | RecentDocumentsList empty body |

**신규 키 (추가):**

| Key | ko 값 | en 값 (참고) | 용도 |
|-----|------|------------|------|
| `dashboard.submitted` | **진행 중** | In Progress | 카드 2 라벨 (신규) |
| `dashboard.rejected` | **반려** | Rejected | 카드 4 라벨 (신규) |
| `dashboard.error` | **일시적인 오류가 발생했습니다** | A temporary error occurred | Error UI heading (3 위젯 공통) |
| `dashboard.errorDesc` | **잠시 후 다시 시도해 주세요.** | Please try again in a moment. | Error UI body (3 위젯 공통, 한글 존댓말) |
| `dashboard.retry` | **다시 시도** | Retry | "다시 시도" 버튼 라벨 |

**값 조정:**
- `dashboard.completed`: 기존 "완료" → **"승인 완료"** 로 수정 (D-A1 REQUIREMENTS 표현 일치, semantics 재정의 `completedCount = APPROVED only`)

### 8.2 Empty state copy (LOCKED 기존 유지)

| 위젯 | heading (i18n key) | body (i18n key) | 아이콘 |
|------|-------------------|----------------|-------|
| PendingList | 대기 중인 결재가 없습니다 (`emptyPending`) | 결재 요청이 들어오면 여기에 표시됩니다. (`emptyPendingDesc`) | `ClipboardCheck h-12 w-12 text-gray-300 dark:text-gray-600` |
| RecentDocumentsList | 최근 문서가 없습니다 (`emptyRecent`) | 문서를 작성하면 여기에 표시됩니다. (`emptyRecentDesc`) | `FileText h-12 w-12 text-gray-300 dark:text-gray-600` |
| CountCard (count=0) | — | — | 별도 empty placeholder 없음, "0" 숫자 표시 |

### 8.3 Error state copy (신규, 3 위젯 공통 통일 LOCKED per D-C2)

```
┌────────────────────────────────────┐
│  [AlertTriangle amber-500 h-10]    │  ← mb-3
│                                    │
│  일시적인 오류가 발생했습니다       │  ← text-sm font-semibold text-gray-700 dark:text-gray-300
│                                    │
│  잠시 후 다시 시도해 주세요.        │  ← text-sm text-gray-500 dark:text-gray-400, mt-1
│                                    │
│        ┌─────────────┐            │  ← mt-4
│        │  다시 시도  │            │  ← h-9 px-4, text-sm font-medium
│        └─────────────┘            │     bg-blue-600 hover:bg-blue-700 text-white rounded-lg
└────────────────────────────────────┘
```

- heading: `dashboard.error` → "일시적인 오류가 발생했습니다" (한글, 존댓말)
- body: `dashboard.errorDesc` → "잠시 후 다시 시도해 주세요." (한글, 존댓말)
- button: `dashboard.retry` → "다시 시도"
- CountCard 내부 적용 시 크기 축소: 아이콘 `h-8 w-8`, body 생략 (공간 제약) — heading + 버튼만

### 8.4 CTA (LOCKED per D-D1)

| Element | Copy | 구조 |
|---------|------|------|
| Primary CTA 버튼 | **"새 문서 작성"** (`dashboard.newDocument`) | `[Plus h-4 w-4] 새 문서 작성` — `bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium` (기존 유지) |
| CTA 클릭 동작 | TemplateSelectionModal 오픈 → 템플릿 선택 → `/documents/new/{templateCode}` 이동 | 기존 구조 유지 — 변경 없음 |

### 8.5 Destructive actions

본 Phase 내 destructive UI action 없음. (drafts 카드 제거는 internal refactor). 관련된 mutation 의 destructive 확인 UX (승인/반려/회수) 는 기존 `ConfirmDialog` 가 담당 — 계약 범위 밖.

---

## 9. Accessibility (a11y)

### 9.1 Semantic structure

- `<h1>` 페이지 타이틀 1개 (기존 `{t('title')}`)
- `<h2>` 리스트 섹션 2개 ("결재 대기 문서", "최근 문서")
- CountCard 는 `role="link"` + `tabIndex={0}` + `aria-label="{라벨}: {count}건"` (신규 보강 권장 — screen reader 에서 "결재 대기: 42건" 로 읽힘)

### 9.2 ARIA patterns

| Component | Pattern | 구현 |
|-----------|---------|-----|
| Loading skeleton (4카드) | `role="status" aria-busy="true" aria-live="polite"` on wrapper | SR 에 로딩 중임을 알림 |
| Loading skeleton (리스트) | 동일 패턴 | |
| Error UI | `role="alert" aria-live="polite"` | SR 이 자동으로 에러 메시지 읽음 |
| "다시 시도" 버튼 | `type="button" aria-label="다시 시도"` + disabled 시 `aria-busy="true"` | |
| 4 CountCards | `role="link" aria-label="결재 대기: {N}건. 상세 보기"` 권장 | 숫자까지 읽히도록 |
| Skeleton visible content | `aria-hidden="true"` on skeleton block | SR 중복 읽기 방지 |
| TemplateSelectionModal | 기존 `role="dialog" aria-modal="true"` — 변경 없음 | |

### 9.3 Keyboard navigation (Tab 순서)

1. **"새 문서 작성" CTA 버튼** (page 상단 우측)
2. CountCard #1 "결재 대기" → #2 "진행 중" → #3 "승인 완료" → #4 "반려" (좌→우, 4 카드)
3. **"결재 대기 문서" 의 "전체 보기" 링크**
4. PendingList rows (있을 경우, 5행)
5. **"최근 문서" 의 "전체 보기" 링크**
6. RecentDocumentsList rows (있을 경우, 5행)
7. Error state 시: error UI 의 "다시 시도" 버튼 (각 위젯별 개별 Tab stop)

**Enter / Space 처리:** CountCard, 리스트 row 모두 `onKeyDown` 에서 Enter/Space 처리 (기존 구현 유지). "다시 시도" 버튼은 native `<button>` 이므로 기본 동작.

### 9.4 Focus visibility

- 모든 interactive 요소에 `focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:outline-none` 명시 필수 (기존 구현 미흡 — 본 Phase 에서 보강)
- Dark mode: `dark:focus-visible:ring-offset-gray-900` 추가

### 9.5 Color contrast (WCAG AA)

- Body text 14px at gray-500 on white → 4.6:1 (pass AA)
- CountCard 숫자 24px bold at gray-900 on white → 15.5:1 (pass AAA)
- 4 semantic icon colors at respective shades → 모두 ≥4.5:1 (§4 표 참조)
- Dark mode 토큰 (gray-800 배경 기준) 모두 ≥4.5:1 보장

### 9.6 Touch targets (mobile)

- CountCard 전체 (`p-6` padding + min height content) → 96px+ 높이 — ≥44×44 WCAG 충족
- "다시 시도" 버튼 `h-9 px-4` (36×80+) → 폭은 충분, 세로 36px 로 약간 부족 → **`h-10` (40px) 로 상향 권장** (planner 최종 결정)
- "전체 보기" 링크 → 텍스트-only, 터치 정밀도 낮음 — `py-1 -my-1` 로 클릭 영역 확장 권장 (선택)
- "새 문서 작성" CTA → `px-4 py-2 text-sm` (≥40×120) — 충족

---

## 10. Visual Hierarchy

### 10.1 Page hierarchy (Z-order 및 우선순위)

```
Priority 1:  CountCards row     (대형 숫자 24px, 4개 나란히 — 한눈에 KPI)
Priority 2:  Page title + CTA   (타이틀 20px 좌, CTA 우 — 액션 진입점)
Priority 3:  Lists row          (상세 5건씩, 우선순위 낮음)
Priority 4:  Empty/Error states (데이터 없을 때만 노출, 보조)
```

### 10.2 카드 간 시각 weight 균등화 (4 카드)

- 4 카드 모두 동일 크기 / 동일 내부 여백 / 동일 typography
- 차이점: 아이콘 색상만 (semantic) — 의미적 구분 강화
- 반려 카드 (red) 는 **시각적으로 튀지만 제한적 사용** → 숫자 0 일 때도 동일 display (강조 없음, 0 이 기본값)

### 10.3 리스트 vs 카드 대비

- 카드 행 (KPI) 상단, 리스트 행 (detail) 하단 — 정보 밀도 점증
- 카드: 큰 숫자 · 적은 텍스트
- 리스트: 작은 글씨 · 많은 행 (표 형태)
- 시각적 "읽기 흐름" 일관: Top-down, Left-right

### 10.4 Dark mode hierarchy 유지

- Light 의 `gray-50 / gray-200 / gray-500 / gray-900` 계단을 Dark 에서 `gray-900 / gray-700 / gray-400 / gray-50` 으로 반전 — 동일 계단 유지
- Shadow 는 dark mode 에서 `shadow-none` 또는 매우 옅게 (기존 `hover:shadow-md` 가 dark 에서 거의 안 보임 → `dark:hover:shadow-black/50` 추가 검토, 선택)

---

## 11. Registry Safety

| Registry | Blocks Used | Safety Gate |
|----------|-------------|-------------|
| shadcn official | — (shadcn 미초기화) | not applicable |
| Third-party | — (none declared) | not applicable |

**Conclusion:** 본 Phase 는 shadcn 미사용 · 외부 블록 미도입 — vetting gate N/A.

---

## 12. Locked vs Open Decisions

### 12.1 LOCKED (변경 불가, upstream 결정)

- **D-A1** 4 카드 라벨 세트: 결재 대기 / 진행 중 / 승인 완료 / 반려
- **D-A3** drafts 카드 완전 제거 (FE only, i18n key 보존)
- **D-A8** 카드 클릭 navigation 스코프별 분기 (USER → `/documents/my?status=...`, ADMIN/SUPER_ADMIN → `/documents?tab=search&status=...`)
- **D-B1** queryKey `['dashboard', 'summary']` 단일 통일
- **D-B7** `placeholderData: (prev) => prev` 로 skeleton 플래시 방지
- **D-C1** Empty state = Lucide 아이콘 (`ClipboardCheck` / `FileText` h-12) + 한글 문구 — SVG 일러스트 금지
- **D-C2** Error state = AlertTriangle + 한글 문구 + "다시 시도" 버튼 (3 위젯 통일)
- **D-C3** 4카드 그리드 `grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6` · isLoading prop 기존 구조 유지
- **D-C4** 4 카드 색상/아이콘 매핑 (§5 표):
  - 결재 대기: blue-500 + Clock
  - 진행 중: gray-500 + Hourglass/Loader
  - 승인 완료: green-500 + CheckCircle2
  - 반려: red-500 + XCircle
- **D-C5** useDashboardSummary 단일 훅 → 3위젯 isLoading 동기화
- **D-D1** CTA 구조 기존 유지 (단일 "새 문서 작성" + TemplateSelectionModal)
- **Tailwind spacing**: 4px 배수 스케일 strict
- **Typography**: 4 roles × 2 weights (`font-normal` + `font-semibold`)
- **60/30/10 color split**: dominant gray scale / secondary card surface / 10% accent (blue primary + 4 semantic icons + amber error)
- **Dark mode**: `darkMode: 'media'` 전면 적용 (`dark:` prefix 필수)
- **Font**: Pretendard Variable

### 12.2 OPEN (본 UI-SPEC 이 해결)

- **"진행 중" 카드 Lucide 아이콘 최종 선택:** Claude Discretion — **`Hourglass`** 선택 (`Loader`/`Loader2` 가 코드베이스에서 "로딩 스피너" 의미로 이미 예약됨. `Hourglass` 는 미사용이라 의미 간섭 zero. "멈추지 않고 진행 중" 시각 은유가 submitted=진행 중 semantic 과 정합). **확정.**
- **Error state 한글 카피 최종:** Claude Discretion — heading "일시적인 오류가 발생했습니다" / body "잠시 후 다시 시도해 주세요." / button "다시 시도" 확정 (CONTEXT specifics 카피 + 존댓말 통일). **확정.**
- **Empty state 한글 카피 재사용 vs 확장:** 기존 `emptyPending`/`emptyPendingDesc`/`emptyRecent`/`emptyRecentDesc` 재사용 확정 — 신규 키 추가 불필요. **확정.**
- **`dashboard.completed` 값 조정:** "완료" → **"승인 완료"** 로 값만 수정 (key 유지). **확정.**
- **그리드 breakpoint 세부:** `md:grid-cols-2 lg:grid-cols-4` 확정 (Tailwind 기본 `md=768px`, `lg=1024px`). **확정.**
- **Focus visibility 강화:** 기존 코드에 `focus-visible:ring-*` 누락 — 4 CountCard / 리스트 row / "다시 시도" 버튼 모두 `focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2` 추가 필수. **본 spec 에서 확정.**
- **CountCard `isError` prop 도입 방식:** planner 결정 (prop 확장 vs 별도 ErrorCard 신설). 시각 계약은 §8.3 통일 — 구현 세부만 변수.
- **CountCard `aria-label` 포함 범위:** "결재 대기: {N}건" 권장 — planner 가 i18n 템플릿 적용 방식 (interpolation `"{{label}}: {{count}}건"`) 결정.
- **Touch target "다시 시도" 버튼 높이:** `h-9` → `h-10` 상향 권장. planner 최종 결정.
- **Dark mode shadow 처리:** `dark:hover:shadow-black/50` 등 세부 — 선택적 개선. 기본은 기존 `hover:shadow-md` 유지.

### 12.3 Deferred (본 Phase 범위 밖)

- SVG 일러스트 empty state → v1.3 브랜딩
- Optimistic update → v1.3
- 모바일 전용 breakpoint 세부 (sm:, xs: 신설) → v1.3 디자인 시스템 정비
- 대시보드 위젯 드래그 재배열 / 커스터마이즈 → v1.3+
- 양식별 quick access 카드 → Phase 32 또는 v1.3+

---

## 13. Component Inventory (planner 참고)

### 13.1 신규 작업

| 파일 | 변경 유형 | 설명 |
|------|---------|------|
| `frontend/src/features/dashboard/pages/DashboardPage.tsx` | MAJOR REFACTOR | 3카드 → 4카드, drafts 삭제, 진행/반려 추가, grid 클래스 변경, role-based navigation, props drill down (리스트) |
| `frontend/src/features/dashboard/components/CountCard.tsx` | EXTEND | `isError?: boolean` prop 추가 (or ErrorCard 신설), focus-visible 보강, `aria-label` 정제 |
| `frontend/src/features/dashboard/components/PendingList.tsx` | REFACTOR | `usePendingPreview` 의존 제거 → props 수신, error state UI 추가, focus-visible 보강 |
| `frontend/src/features/dashboard/components/RecentDocumentsList.tsx` | REFACTOR | 동상 |
| `frontend/src/features/dashboard/components/ErrorState.tsx` (신규 권장) | CREATE | AlertTriangle + heading + body + retry button 공통 컴포넌트. CountCard 크기 variant 와 리스트 크기 variant 2종 지원 |
| `frontend/src/features/dashboard/hooks/useDashboard.ts` | MAJOR REFACTOR | `usePendingPreview`, `useRecentDocuments` 제거. `useDashboardSummary` 에 `placeholderData` 추가 |
| `frontend/src/features/dashboard/types/dashboard.ts` | EXTEND | `rejectedCount: number` 추가, `draftCount?: number` (optional 변경 검토) |
| `frontend/public/locales/ko/dashboard.json` | EXTEND | `submitted`/`rejected`/`error`/`errorDesc`/`retry` 추가, `completed` 값 수정 |
| `frontend/public/locales/en/dashboard.json` | CREATE (부재) | 동일 키 영문 (ko 우선, en 은 폴백) |

### 13.2 Icon imports 변경

**DashboardPage.tsx** 기존:
```tsx
import { Clock, FileEdit, CheckCircle2, Plus } from 'lucide-react';
```

**변경 후:**
```tsx
import { Clock, Hourglass, CheckCircle2, XCircle, Plus } from 'lucide-react';
// 제거: FileEdit (drafts 카드 삭제)
// 추가: Hourglass (진행 중), XCircle (반려)
```

**ErrorState.tsx** (신규):
```tsx
import { AlertTriangle, Loader2 } from 'lucide-react';
```

---

## 14. Visual QA Checklist (planner → executor 이관용)

- [ ] 4 CountCard 데스크톱 1024px+ 에서 한 줄 정렬, 등폭
- [ ] 4 CountCard 태블릿 768-1023px 에서 2×2
- [ ] 4 CountCard 모바일 <768px 에서 1열 수직
- [ ] drafts 카드 완전 비노출
- [ ] 4 카드 아이콘 색상 LOCKED 매핑 (blue / gray / green / red)
- [ ] 4 카드 아이콘 Lucide 컴포넌트 (Clock / Hourglass / CheckCircle2 / XCircle)
- [ ] Dark mode 전환 시 4 카드 모두 색상 대비 유지 (dark:text-{color}-400 매핑)
- [ ] Skeleton 상태: 4 CountCard + 2 리스트 동시에 나타남 (단일 쿼리 동기화)
- [ ] Error 상태: 3 위젯 모두 AlertTriangle amber-500 + "일시적인 오류가 발생했습니다" + "다시 시도" 버튼
- [ ] Empty 상태: PendingList `ClipboardCheck h-12`, RecentDocumentsList `FileText h-12`
- [ ] mutation 성공 후 page 이동 없이 카운트 숫자 변화 (skeleton 플래시 없음)
- [ ] "다시 시도" 버튼 클릭 시 해당 위젯 refetch
- [ ] 4 카드 role="link" + aria-label="{라벨}: {count}건"
- [ ] 모든 interactive 요소 focus-visible ring 노출 (keyboard Tab 순회)
- [ ] Tab 순서: CTA → 4 카드 (좌→우) → 리스트1 전체보기 → 리스트1 rows → 리스트2 전체보기 → 리스트2 rows
- [ ] `dashboard.completed` 표시값 "승인 완료" (기존 "완료" 아님)
- [ ] USER navigate: `/documents/my?status=...`, ADMIN/SUPER_ADMIN: `/documents?tab=search&status=...`
- [ ] 카드 순서: 결재 대기 → 진행 중 → 승인 완료 → 반려 (좌→우)

---

## 15. Checker Sign-Off

- [ ] **Dimension 1 Copywriting**: Empty/Error/CTA/라벨 모두 한글 존댓말 통일, i18n 키 5 신규·1 수정 정의됨 (§8)
- [ ] **Dimension 2 Visuals**: 4 카드 icon·color 매핑 LOCKED, 시각적 weight 균등, empty/error/default/hover/focus/loading 6 상태 정의됨 (§5, §7)
- [ ] **Dimension 3 Color**: 60/30/10 split 명시, accent 예약 리스트 구체적 (Primary CTA 1 + 4 semantic icons + amber error), dark mode 매핑 완료 (§4)
- [ ] **Dimension 4 Typography**: 4 roles × 2 weights (normal 400 + semibold 600), 한글 Pretendard, 4 px 배수 line-height (§3)
- [ ] **Dimension 5 Spacing**: Tailwind 4px 배수 스케일, `gap-6` 카드 그리드, `mb-8` 섹션 간격, 예외 없음 (§2)
- [ ] **Dimension 6 Registry Safety**: shadcn 미사용, third-party 미도입, N/A (§11)

**Approval:** pending (gsd-ui-checker 검증 후 승인 시 `approved YYYY-MM-DD` 로 갱신)

---

*Phase: 31-dashboard*
*UI-SPEC drafted: 2026-04-24*
*Pre-populated from: 31-CONTEXT.md (D-A1~D-D4, 30+ decisions), REQUIREMENTS.md (DASH-01~05), ROADMAP.md (Phase 31 Success Criteria), 기존 frontend 자산 scan (tailwind.config.js, CountCard.tsx, PendingList.tsx, RecentDocumentsList.tsx, useDashboard.ts, dashboard.json, authStore.ts)*

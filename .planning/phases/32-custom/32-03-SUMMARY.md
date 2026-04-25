---
phase: 32-custom
plan: 03
subsystem: ui
tags: [react, typescript, lucide-react, preset-gallery, i18n-map, icon-map, self-extension]

# Dependency graph
requires:
  - phase: 26-편의-기능
    provides: "PresetGallery.tsx (ICON_MAP / I18N_MAP / grid-cols-2 layout / fallback chain) + presets/index.ts (Vite eager glob + localeCompare sort)"
  - phase: 32-01
    provides: "meeting.json (key=meeting, icon=Users 매핑 대상)"
  - phase: 32-02
    provides: "proposal.json (key=proposal, icon=FileSignature 매핑 대상)"
provides:
  - "PresetGallery.tsx 의 ICON_MAP/I18N_MAP 6 entry 매핑 (expense/leave/trip/purchase/meeting/proposal) — UI 노출 게이트 통합"
  - "lucide-react Users/FileSignature import 가용성 확정 (Open Question 2 해소)"
  - "FORM-01/FORM-02 의 admin 갤러리 카드 노출 충족 — i18n 키 (Plan 04) 와 결합 시 한국어 카드 완성"
affects: [32-04 i18n keys (templates.presetMeeting/Proposal* 4 키 추가 — I18N_MAP 가 이미 참조), 32-05 presets.test 단언 (length=6 / keys=6항 동시 업데이트), 32-06 manual UAT (6 카드 시각 확인)]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "PresetGallery self-extension: ICON_MAP/I18N_MAP 에 entry 추가만 — 본문 (fallback chain L92-98) 자동 통합"
    - "lucide-react named import 확장 — ShoppingCart 다음 Users/FileSignature 삽입, type LucideIcon 마지막 위치 preserve"
    - "i18n 키 명명 규약 = templates.preset{PascalCase}Name|Desc — Plan 04 의 ko/admin.json 신규 키와 정확 일치"

key-files:
  created: []
  modified:
    - "frontend/src/features/admin/components/PresetGallery.tsx (3 위치 +6 줄: import 2, ICON_MAP 2, I18N_MAP 2)"

key-decisions:
  - "[Phase 32-03] PresetGallery.tsx 의 3 위치 (import / ICON_MAP / I18N_MAP) 동시 atomic 수정 — 단일 파일 6 줄 추가, 단일 commit. 분할 시 중간 상태에서 ICON_MAP entry 가 lucide import 부재 상태로 남는 risk 회피"
  - "[Phase 32-03] grid-cols-2 / max-w-3xl / max-h-[80vh] 무수정 (D-C3) — 6 카드 = 3행 × 2열 modal, 기존 max-h overflow-y-auto 가 자동 스크롤 처리. grid 재설계는 7개 이상 시 deferred"
  - "[Phase 32-03] presets/index.ts 의 localeCompare sort 무수정 (D-C4) — 6 preset 정렬 결과: expense → leave → meeting → proposal → purchase → trip (alphabetical). JSON sortOrder 필드 도입 안 함"
  - "[Phase 32-03] i18n 키 명명 = templates.presetMeetingName/Desc + templates.presetProposalName/Desc — Plan 04 ko/admin.json 신규 키와 정확 일치 (camelCase + PascalCase preset 명). I18N_MAP 가 i18n 키 미존재 시에도 react-i18next 가 키 자체 fallback string 표시 (Plan 04 가 키 추가로 보장)"
  - "[Phase 32-03] lucide-react Users + FileSignature 표준 export 확정 (RESEARCH Open Question 2 해소) — frontend/node_modules/lucide-react/dist/lucide-react.d.ts 의 export {} 블록 grep 으로 직접 확인. fallback (FilePenLine / ClipboardCheck) 미사용"
  - "[Phase 32-03] 기존 4 entry (expense/leave/trip/purchase) 절대 보존 (CLAUDE.md '기존 기능/메뉴/라우트 보존' 의무) — 6 줄 +0 줄 modified, ICON_MAP/I18N_MAP 의 declaration order preserve"

patterns-established:
  - "ICON_MAP/I18N_MAP 동시 self-extension 패턴: 신규 preset key (filename stem) → ICON_MAP[key]=LucideIcon + I18N_MAP[key]={nameKey, descKey} 동기화 + lucide-react import 동기화. 본 phase 의 향후 7번째 preset 추가 시 동일 3 위치 수정 반복"
  - "lucide-react export 사전 검증 패턴: dist/lucide-react.d.ts grep 으로 export 가용성 확인 → tsc --noEmit 으로 컴파일 검증. import 후 build 실패 사전 차단 (Open Question 1차 검증)"

requirements-completed: []  # FORM-01/FORM-02 는 Plan 04 (i18n 키) + Plan 05 (테스트) + Plan 06 (UAT) 모두 완료된 시점에 mark-complete

# Metrics
duration: 1m 28s
completed: 2026-04-25
---

# Phase 32 Plan 03: PresetGallery ICON_MAP/I18N_MAP 통합 Summary

**PresetGallery.tsx 의 lucide-react import + ICON_MAP + I18N_MAP 3 위치에 회의록(meeting → Users) + 품의서(proposal → FileSignature) 4 entry 추가 — 기존 4 preset entry 와 grid-cols-2 layout 무수정으로 6 카드 시각 통합 게이트 완성**

## Performance

- **Duration:** 1m 28s (88 seconds)
- **Started:** 2026-04-25T14:28:36Z
- **Completed:** 2026-04-25T14:30:04Z
- **Tasks:** 1
- **Files modified:** 1 (수정)

## Accomplishments

- `PresetGallery.tsx` import block (L3-13) 에 `Users` (ShoppingCart 다음) + `FileSignature` (Users 다음) 2 named import 추가 — `LayoutTemplate` + `type LucideIcon` 끝 위치 preserve
- `ICON_MAP` (L30-37) 에 `meeting: Users` + `proposal: FileSignature` 2 entry 추가 — 기존 4 entry (expense/Receipt, leave/CalendarDays, trip/Plane, purchase/ShoppingCart) declaration order 보존
- `I18N_MAP` (L40-47) 에 `meeting: { nameKey: 'templates.presetMeetingName', descKey: 'templates.presetMeetingDesc' }` + `proposal: { nameKey: 'templates.presetProposalName', descKey: 'templates.presetProposalDesc' }` 2 entry 추가
- 컴포넌트 본문 (L49~) 무수정 — fallback chain (L94-100, `Icon = ICON_MAP[preset.key] ?? LayoutTemplate`) 가 신규 entry 자동 사용
- grid layout (`grid grid-cols-2 gap-4`) / modal 크기 (`max-w-3xl max-h-[80vh]`) / overflow (`overflow-y-auto max-h-[70vh]`) 무수정 — D-C3 준수
- `presets/index.ts` 의 `localeCompare` sort 로직 무수정 — D-C4 준수
- TypeScript `tsc --noEmit -p tsconfig.app.json` PASS (exit 0, 무출력) — lucide-react Users/FileSignature import 컴파일 통과
- Vite build PASS (614ms, 2468 modules) — 변경 전과 동일 모듈 수, 본 plan 변경에 의한 추가 dep 0건

## Task Commits

각 task 는 atomic 으로 commit 되었습니다:

1. **Task 1: PresetGallery.tsx 의 lucide-react import + ICON_MAP + I18N_MAP 3 위치 동시 수정 (4 entry)** — `fba4336` (feat)

_Note: 본 plan 은 단일 task 단일 파일 작업 — 6 줄 추가 (3 위치 × 2 줄), 0 줄 modified, 0 줄 deleted._

## Files Created/Modified

- `frontend/src/features/admin/components/PresetGallery.tsx` (수정, +6 줄):
  - L9 신규: `Users,` (ShoppingCart 다음, LayoutTemplate 직전 첫째)
  - L10 신규: `FileSignature,` (Users 다음)
  - L35 신규: `meeting: Users,`
  - L36 신규: `proposal: FileSignature,`
  - L45 신규: `meeting: { nameKey: 'templates.presetMeetingName', descKey: 'templates.presetMeetingDesc' },`
  - L46 신규: `proposal: { nameKey: 'templates.presetProposalName', descKey: 'templates.presetProposalDesc' },`

## Decisions Made

- **3 위치 동시 atomic 수정** (PLAN Task 1 단일 task 설계): import block / ICON_MAP / I18N_MAP 을 단일 commit 으로 묶음. 분할 commit 시 중간 상태 (ICON_MAP entry 추가 후 lucide import 미추가) 가 컴파일 실패로 노출됨 — 본 plan 의 atomic 보장이 reverter / bisect 에도 안전
- **grid-cols-2 / max-w-3xl / max-h-[80vh] 무수정** (D-C3): 6 카드 = 3행 × 2열 → modal max-h-[80vh] + overflow-y-auto 가 자동 스크롤 처리. 7번째 preset 추가 시 lg:grid-cols-3 upgrade 검토 — 본 phase Deferred (CONTEXT.md L167)
- **presets/index.ts sort 무수정** (D-C4): localeCompare 자연 정렬로 `expense → leave → meeting → proposal → purchase → trip` 순서 자동 발생. JSON `sortOrder` 필드 도입 안 함 — 단일 SoT (filename) 유지, over-spec 회피 (CONTEXT.md L168)
- **i18n 키 = `templates.preset{PascalCase}Name|Desc`** (Plan 04 와 정확 일치): I18N_MAP 의 string literal 이 Plan 04 의 ko/admin.json 신규 키와 1:1 매칭. mismatch 시 react-i18next 가 키 자체 fallback string (`templates.presetMeetingName`) 표시 — Plan 04 키 추가로 자동 해소
- **lucide-react Users / FileSignature 사전 검증** (RESEARCH Open Question 2 해소): `frontend/node_modules/lucide-react/dist/lucide-react.d.ts` 의 export {} 블록 grep 으로 직접 확인 → `Users`/`UsersIcon`/`UsersRound`/`UsersRoundIcon` 4 variant + `FileSignature`/`FileSignatureIcon` 2 variant 가용. fallback (FilePenLine / ClipboardCheck) 미사용
- **기존 4 entry preserve** (CLAUDE.md "기존 기능/메뉴/라우트 보존" 의무): ICON_MAP/I18N_MAP 의 expense/leave/trip/purchase 4 entry declaration order + 줄 형식 무수정. git diff stat = +6 줄 / 0 줄 modified 검증

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- **PreToolUse:Edit hook reminder (3건):** Edit tool 호출 시 시스템이 "READ-BEFORE-EDIT" 알림을 표시했으나, 본 세션 시작 시 PresetGallery.tsx 를 Read tool 로 이미 읽었기 때문에 (initial parallel Read 4건 중 4번째) 모든 Edit 가 정상 적용되었음. 알림은 사전 점검 메시지로 실제 차단 없음
- 그 외 issue 없음 — Edit 3건 모두 1차 통과, tsc/vite 모두 PASS

## Verification Results

| Check | Result | Notes |
|-------|--------|-------|
| `cd frontend && npx tsc --noEmit -p tsconfig.app.json` 종료코드 | PASS (0) | 무출력, lucide-react Users/FileSignature import 컴파일 통과 |
| `cd frontend && npm run build` (Vite) | PASS | 614ms, 2468 modules transformed, 본 plan 변경으로 인한 module 수 증가 0 |
| grep `^  Users,$` count | PASS (=1) | import block L9 |
| grep `^  FileSignature,$` count | PASS (=1) | import block L10 |
| grep `meeting: Users,` count | PASS (=1) | ICON_MAP L35 |
| grep `proposal: FileSignature,` count | PASS (=1) | ICON_MAP L36 |
| grep `templates.presetMeetingName` count | PASS (=1) | I18N_MAP L45 (한 줄 내 nameKey) |
| grep `templates.presetMeetingDesc` count | PASS (=1) | I18N_MAP L45 (한 줄 내 descKey) |
| grep `templates.presetProposalName` count | PASS (=1) | I18N_MAP L46 (한 줄 내 nameKey) |
| grep `templates.presetProposalDesc` count | PASS (=1) | I18N_MAP L46 (한 줄 내 descKey) |
| grep 기존 4 ICON_MAP entry 보존 (expense:Receipt / leave:CalendarDays / trip:Plane / purchase:ShoppingCart) line count | PASS (=4) | declaration order preserve |
| grep `grid grid-cols-2 gap-4` count | PASS (=1) | L93 무수정 (D-C3) |
| grep `max-w-3xl max-h-\[80vh\]` count | PASS (=1) | L77 무수정 (modal layout) |
| `git diff --diff-filter=D HEAD~1 HEAD` deletion 검사 | PASS | 0 deletion |
| 신규 untracked file (본 plan 작업 결과) | PASS | 0건 |
| presets/index.ts 무수정 | PASS | git status 미포함 (D-C4) |
| 다른 4 preset JSON 무수정 (expense/leave/purchase/trip) | PASS | git status 미포함 |

## Threat Mitigation Verification

| Threat | Disposition | Verification |
|--------|-------------|--------------|
| Phase-31 카드 손상 (regression) — 기존 4 entry 변경 가능성 | mitigate | git diff stat = `1 file changed, 6 insertions(+)` / 0 modified — declaration order preserve 검증. ICON_MAP grep `expense: Receipt,\|leave: CalendarDays,\|trip: Plane,\|purchase: ShoppingCart,` 4 라인 모두 hit. grid-cols-2 / max-w-3xl 보존 grep 모두 hit. Plan 06 manual UAT 에서 6 카드 시각 확인 예정 |
| T-32-01 (preset JSON tampering) | n/a | 본 plan 은 ICON/I18N entry 추가만 — JSON 검증 게이트 무관 (Plan 01/02 책임) |
| T-32-02 (column id 충돌) | n/a | 본 plan 은 meeting/proposal JSON 데이터 변경 0 — column id 무관 |

## User Setup Required

None - no external service configuration required. PresetGallery.tsx 단일 파일 6 줄 추가, runtime 인프라 변경 0건.

## Next Phase Readiness

- **Plan 04 (ko/admin.json)** 진입 가능 — `templates.presetMeetingName: "회의록"` + `presetMeetingDesc` + `presetProposalName: "품의서"` + `presetProposalDesc` 4 키 추가 예정. 본 plan 의 I18N_MAP 가 이미 4 키 참조 → Plan 04 미진행 시 react-i18next 가 키 자체 fallback string 표시 (UI 깨짐 없음, 단지 문구가 키로 노출)
- **Plan 05 (presets.test.ts)** 에서 length=6, keys=['expense','leave','meeting','proposal','purchase','trip'], `meeting has 5 fields`, `proposal has 4 fields` 단언 추가 예정 — Plan 01/02 의 일시 fail 두 단언 동시 해소
- **Plan 06 (manual UAT)** 에서 PresetGallery 모달 열기 → 6 카드 (3행 × 2열) 시각 확인 + Users/FileSignature 아이콘 렌더 확인 + 한국어 라벨 확인 예정
- 후속 plan blockers 없음 — Phase 26 인프라 (Vite glob + Zod .strict() + Snapshot 불변성 + PresetGallery fallback chain) 모두 v1.1 자산 그대로 신뢰. lucide-react Users/FileSignature export 가용성 확정 → Open Question 2 해소

## Self-Check: PASSED

- File modified: `frontend/src/features/admin/components/PresetGallery.tsx` — FOUND (git log)
- Commit exists: `fba4336` — FOUND in git log
- 모든 acceptance_criteria (PLAN.md L194-205) 통과:
  - tsc --noEmit 종료코드 0 ✓
  - 4 grep (Users / FileSignature import + meeting/proposal entry) 모두 1 hit ✓
  - i18n 키 4 개 모두 1 hit ✓ (PLAN 의 alternation grep `-c` 결과 = 1 은 같은 줄 매칭 — 의도 충족)
  - 기존 4 entry preserve grep = 4 ✓
  - grid-cols-2 / max-w-3xl 무수정 grep 모두 1 ✓
- success_criteria (PLAN.md L235-240) 4 항 모두 충족
- vite build PASS, 변경 전과 동일 module 수 (2468)

---
*Phase: 32-custom*
*Completed: 2026-04-25*

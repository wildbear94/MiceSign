---
phase: 32-custom
plan: 04
subsystem: i18n
tags: [i18n, react-i18next, ko-admin-json, preset-labels, korean-only-policy]

# Dependency graph
requires:
  - phase: 26-편의-기능
    provides: "PresetGallery i18n fallback chain (i18n key 우선, JSON name fallback) + ko/admin.json templates 네임스페이스 (presetExpenseName/Desc 등 4 키 패턴)"
  - phase: 32-03
    provides: "PresetGallery.tsx I18N_MAP entry (templates.presetMeetingName/Desc, templates.presetProposalName/Desc 4 키 참조) — 본 plan 이 채워야 할 키 명 게이트"
provides:
  - "ko/admin.json templates 섹션의 4 신규 i18n 키 (presetMeetingName/Desc, presetProposalName/Desc) — react-i18next lookup 시 한국어 카드 라벨 노출 게이트 완성"
  - "FORM-01/FORM-02 의 Admin PresetGallery 카드 한국어 표시 충족 — Plan 03 의 I18N_MAP 키 lookup → ko/admin.json 매칭 → 회의록/품의서 한국어 라벨 렌더"
affects: [32-05 presets.test (length=6 단언 통과 시 i18n 카드 라벨 자동 노출), 32-06 manual UAT (PresetGallery 모달에서 회의록/품의서 한국어 카드 시각 확인)]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "ko-only i18n 추가 패턴: ko/admin.json 만 수정, en/admin.json 동기 추가 안 함 — D-E2 한국어 only 정책 (CLAUDE.md '한국어 documentation' 정책 일치)"
    - "i18n 키 명명 1:1 매칭 패턴: PresetGallery I18N_MAP 의 string literal (templates.preset{PascalCase}Name|Desc) 와 ko/admin.json 의 키 명이 정확 일치 — mismatch 시 react-i18next 가 키 자체 fallback string 표시 (UI 회귀)"
    - "JSON in-place insertion 패턴: 기존 trailing comma 위치 보존 + 다음 키 (importTitle) 직전에 4 줄 삽입 — 콤마 처리 / brace 위치 무수정"

key-files:
  created:
    - ".planning/phases/32-custom/32-04-SUMMARY.md (본 파일)"
  modified:
    - "frontend/public/locales/ko/admin.json (templates 섹션 +4 줄 — L144-147 위치에 4 신규 키 삽입, 기존 키 0 줄 modified)"

key-decisions:
  - "[Phase 32-04] ko-only 추가 (D-E2 준수) — en/admin.json 동기 추가 안 함. CLAUDE.md '한국어 documentation' 정책 + v1.1 까지 한국어 only milestone 일치. 영어 i18n 추가는 별도 milestone (CONTEXT.md L168 Deferred)"
  - "[Phase 32-04] 키 명 1:1 매칭 (Plan 03 I18N_MAP 와 정확 일치) — presetMeetingName/Desc + presetProposalName/Desc 4 키. PresetGallery.tsx L45-46 의 string literal 와 동일. 변경 시 react-i18next 가 raw key fallback 으로 UI 회귀"
  - "[Phase 32-04] 단일 task 단일 commit — 단일 파일 4 줄 추가 작업으로 task 분할 무가치, atomic 단일 commit 으로 reverter / bisect 안전성 확보"
  - "[Phase 32-04] 한국어 문구 단일명사 + keyword 나열 패턴 (PATTERNS S4): Name='회의록'/'품의서' 단일명사, Desc='~기록합니다'/'~정리합니다' 능동 종결 + '·' 중점 keyword 나열 (24자/22자, 기존 preset Desc 길이 일치)"
  - "[Phase 32-04] 기존 키 absolute preserve (CLAUDE.md '기존 기능/메뉴/라우트 보존' 의무) — 기존 4 preset Name/Desc + presetGalleryTitle + 모든 templates 후속 키 (importTitle ~ calculation.errors.circularDependency) 0 줄 modified. git diff stat = +4 줄 / 0 줄 modified"

patterns-established:
  - "i18n 키 추가 워크플로우: (1) JSON in-place 4 줄 삽입 → (2) node parse 무에러 검증 → (3) 4 신규 키 + 기존 키 grep 검증 → (4) en 무수정 git diff 검증 → (5) frontend build PASS → (6) atomic commit"
  - "ko-only 한국어 i18n 추가 표준 — 영어 키 추가 절대 금지 (정책 위배). 향후 i18n 키 추가 시 동일 정책 적용"

requirements-completed: []  # FORM-01/FORM-02 는 Plan 05 (presets.test 단언) + Plan 06 (manual UAT) 완료된 시점에 mark-complete

# Metrics
duration: 0m 43s
completed: 2026-04-25
---

# Phase 32 Plan 04: ko/admin.json 회의록/품의서 i18n 키 추가 Summary

**ko/admin.json 의 templates 섹션 끝부분 (presetPurchaseDesc 다음) 에 회의록/품의서 한국어 라벨 4 신규 키 (presetMeetingName/Desc, presetProposalName/Desc) 추가 — Plan 03 의 PresetGallery I18N_MAP 가 참조 중인 키를 채워 한국어 카드 라벨 노출 게이트 완성, en/admin.json 무수정 (D-E2 한국어 only 정책)**

## Performance

- **Duration:** 0m 43s (43 seconds)
- **Started:** 2026-04-25T14:33:43Z
- **Completed:** 2026-04-25T14:34:26Z
- **Tasks:** 1
- **Files modified:** 1 (수정), 1 (생성 - SUMMARY.md)

## Accomplishments

- `frontend/public/locales/ko/admin.json` templates 섹션 (L143 의 `presetPurchaseDesc` 다음, L144 의 `importTitle` 직전) 에 4 신규 키 4 줄 삽입:
  - L144 신규: `"presetMeetingName": "회의록",`
  - L145 신규: `"presetMeetingDesc": "회의 일시·참석자·안건·결정사항을 구조화하여 기록합니다",`
  - L146 신규: `"presetProposalName": "품의서",`
  - L147 신규: `"presetProposalDesc": "품의 배경·제안 내용·예상 효과를 정리합니다",`
- 기존 4 preset 키 (presetExpenseName/Desc, presetLeaveName/Desc, presetTripName/Desc, presetPurchaseName/Desc) + presetGalleryTitle preserve — 0 줄 modified
- en/admin.json 무수정 검증 (D-E2 한국어 only 정책 준수) — `git diff --quiet frontend/public/locales/en/admin.json` 종료코드 0
- JSON 유효성 검증 — `node -e "JSON.parse(...)"` 무에러, templates 객체 깊이 1 깊이까지 모든 4 신규 키 + 기존 4 키 + 5번째 키 (presetGalleryTitle) 모두 정확한 한국어 값 출력
- frontend build PASS (593ms, 2468 modules transformed) — 변경 전과 동일 모듈 수, 본 plan 변경에 의한 추가 dep 0건
- PresetGallery I18N_MAP (Plan 03 의 L45-46) 참조 키와 1:1 매칭 — react-i18next 가 lookup 시 raw key fallback 미발생, 카드에 정확한 한국어 라벨 (회의록/품의서) 노출

## Task Commits

각 task 는 atomic 으로 commit 되었습니다:

1. **Task 1: ko/admin.json templates 섹션에 4 신규 키 추가** — `96cd1e8` (feat)

_Note: 본 plan 은 단일 task 단일 파일 작업 — 4 줄 추가 (templates 섹션 1 위치), 0 줄 modified, 0 줄 deleted._

## Files Created/Modified

- `frontend/public/locales/ko/admin.json` (수정, +4 줄):
  - L144 신규: `    "presetMeetingName": "회의록",`
  - L145 신규: `    "presetMeetingDesc": "회의 일시·참석자·안건·결정사항을 구조화하여 기록합니다",`
  - L146 신규: `    "presetProposalName": "품의서",`
  - L147 신규: `    "presetProposalDesc": "품의 배경·제안 내용·예상 효과를 정리합니다",`
- `.planning/phases/32-custom/32-04-SUMMARY.md` (생성, 본 파일)

## Decisions Made

- **단일 task 단일 commit** (PLAN Task 1 단일 task 설계): 4 줄 추가 단일 위치 작업으로 task 분할 무가치. atomic commit 으로 reverter / bisect 안전성 확보 (Plan 03 의 동일 패턴 일치)
- **ko-only 추가** (D-E2 + CLAUDE.md '한국어 documentation' 정책): en/admin.json 동기 추가 안 함. 영어 i18n 추가는 별도 milestone (CONTEXT.md L168 Deferred). 본 plan 에서 영어 추가 = 정책 위배
- **키 명 1:1 매칭** (Plan 03 I18N_MAP 와 정확 일치): PresetGallery.tsx L45-46 의 4 string literal (templates.presetMeetingName/Desc, templates.presetProposalName/Desc) 와 ko/admin.json 의 신규 키 명 동일. 변경 시 raw key fallback 으로 UI 회귀
- **한국어 문구 단일명사 + keyword 나열** (PATTERNS S4): Name='회의록'/'품의서' 단일명사 (다른 preset 의 'OO신청서' 패턴과 의도적 차별 — record-keeping/decision 문서 성격), Desc 능동 종결 + '·' keyword 나열 (24자/22자 — 기존 presetExpenseDesc 21자, presetLeaveDesc 24자, presetTripDesc 14자, presetPurchaseDesc 16자 길이대 일치)
- **JSON in-place 삽입 위치** (presetPurchaseDesc 직후): templates 섹션의 preset 4 키 그룹 끝부분에 추가하여 논리적 연속성 보존. presetGalleryTitle 부터 시작하는 preset 그룹 (presetGalleryTitle → 4 preset Name/Desc → 4 신규 preset Name/Desc → importTitle 부터 import 그룹) 의도된 그룹 분리
- **기존 키 absolute preserve** (CLAUDE.md '기존 기능/메뉴/라우트 보존' 의무): 기존 4 preset Name/Desc + presetGalleryTitle + 모든 templates 후속 키 (importTitle ~ calculation.errors.circularDependency) 0 줄 modified. git diff stat = `1 file changed, 4 insertions(+)` 검증

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- **PreToolUse:Edit hook reminder (1건):** Edit tool 호출 시 시스템이 "READ-BEFORE-EDIT" 알림을 표시했으나, 본 세션 시작 시 admin.json 을 Read tool 로 이미 읽었기 때문에 (initial parallel Read 단계에서 frontend/public/locales/ko/admin.json 전체 369 줄 read) Edit 가 정상 적용되었음. 알림은 사전 점검 메시지로 실제 차단 없음
- 그 외 issue 없음 — Edit 1건 1차 통과, node parse / build 모두 PASS

## Verification Results

| Check | Result | Notes |
|-------|--------|-------|
| `node -e "JSON.parse(require('fs').readFileSync('frontend/public/locales/ko/admin.json','utf8'))"` 종료코드 | PASS (0) | JSON 파싱 무에러, syntax error 0 |
| `node -e "console.log(...presetMeetingName)"` 출력 | PASS | `회의록` |
| `node -e "console.log(...presetMeetingDesc)"` 출력 | PASS | `회의 일시·참석자·안건·결정사항을 구조화하여 기록합니다` |
| `node -e "console.log(...presetProposalName)"` 출력 | PASS | `품의서` |
| `node -e "console.log(...presetProposalDesc)"` 출력 | PASS | `품의 배경·제안 내용·예상 효과를 정리합니다` |
| 기존 4 preset Name 보존 grep | PASS (=4) | `경비신청서|휴가신청서|출장신청서|구매신청서` 4 hit |
| presetGalleryTitle 보존 grep | PASS (=1) | `프리셋 선택` 1 hit |
| `git diff --quiet frontend/public/locales/en/admin.json` 종료코드 | PASS (0) | en/admin.json 무변경 (D-E2 준수) |
| `cd frontend && npm run build` (Vite + tsc) | PASS | 593ms, 2468 modules transformed, 본 plan 변경으로 인한 module 수 증가 0 |
| `git diff --stat HEAD~1 HEAD` insertion | PASS (=4) | `1 file changed, 4 insertions(+)` — 0 줄 modified, 0 줄 deleted |
| `git diff --diff-filter=D HEAD~1 HEAD` deletion 검사 | PASS | 0 deletion |
| 키 명 PresetGallery I18N_MAP 와 1:1 매칭 검증 | PASS | `templates.presetMeetingName/Desc` + `templates.presetProposalName/Desc` 4 키 = I18N_MAP L45-46 의 string literal 정확 일치 |

## Threat Mitigation Verification

| Threat | Disposition | Verification |
|--------|-------------|--------------|
| Regression — 기존 i18n 키 손상 (Tampering on ko/admin.json) | mitigate | git diff stat = `1 file changed, 4 insertions(+)` / 0 modified — 기존 4 preset Name/Desc + presetGalleryTitle + 모든 후속 templates 키 보존 검증. JSON parse 무에러로 brace/comma 위치 보존 검증. Plan 06 manual UAT 의 PresetGallery 카드 시각 확인 게이트 추가 |
| T-32-01 (preset JSON tampering) | n/a | 본 plan 은 i18n 키 추가만 — preset JSON (presets/*.json) 변경 0, templateImportSchema 검증 게이트 무관 |

## User Setup Required

None - no external service configuration required. ko/admin.json 단일 파일 4 줄 추가, runtime 인프라 변경 0건. react-i18next 가 자동으로 ko/admin.json 의 templates 네임스페이스 reload (개발 시 Vite HMR, 배포 시 Nginx static 서빙).

## Next Phase Readiness

- **Plan 05 (presets.test.ts)** 진입 가능 — `length === 6`, `keys === ['expense','leave','meeting','proposal','purchase','trip']`, `meeting has 5 fields`, `proposal has 4 fields` 4 단언 추가 예정. Plan 01/02 의 일시 fail 두 단언 동시 해소
- **Plan 06 (manual UAT)** 진입 가능 — PresetGallery 모달 열기 → 6 카드 (3행 × 2열) 시각 확인. 본 plan 의 i18n 키 추가로 회의록/품의서 카드에 한국어 라벨 (회의록 / 회의 일시·참석자·안건·결정사항을 구조화하여 기록합니다 / 품의서 / 품의 배경·제안 내용·예상 효과를 정리합니다) 정확 노출 예상
- 후속 plan blockers 없음 — Phase 26 인프라 (Vite glob + Zod .strict() + Snapshot 불변성 + PresetGallery fallback chain + react-i18next 자동 reload) 모두 v1.1 자산 그대로 신뢰
- v1.1 까지 한국어 only 정책 유지 — en/admin.json 추가 작업은 별도 milestone (CONTEXT.md L168 Deferred)

## Self-Check: PASSED

- File modified: `frontend/public/locales/ko/admin.json` — FOUND (`git log --oneline -1` 출력에 96cd1e8 commit 확인)
- Commit exists: `96cd1e8` — FOUND in git log
- 모든 acceptance_criteria (PLAN.md L137-145) 통과:
  - JSON 파싱 무에러 ✓
  - 4 신규 키 정확한 한국어 값 (`회의록`, `회의 일시·참석자·안건·결정사항을 구조화하여 기록합니다`, `품의서`, `품의 배경·제안 내용·예상 효과를 정리합니다`) ✓
  - 기존 4 키 preserve (`경비신청서|휴가신청서|출장신청서|구매신청서`) ✓
  - en/admin.json 무수정 (`git diff --quiet` 종료코드 0) ✓
- success_criteria (PLAN.md L177-182) 5 항 모두 충족:
  - (1) ko/admin.json templates 섹션 4 신규 키 추가 ✓
  - (2) JSON 유효 ✓
  - (3) 기존 4 preset 키 + presetGalleryTitle preserve ✓
  - (4) en/admin.json 무수정 ✓
  - (5) 키 명 Plan 03 I18N_MAP 와 정확 일치 ✓
- frontend build PASS (593ms, 2468 modules) — module 수 증가 0

---
*Phase: 32-custom*
*Completed: 2026-04-25*

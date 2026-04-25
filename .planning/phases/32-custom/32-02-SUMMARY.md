---
phase: 32-custom
plan: 02
subsystem: ui
tags: [react, typescript, vite, zod, json-preset, custom-form, lucide-react, textarea]

# Dependency graph
requires:
  - phase: 26-편의-기능
    provides: "preset 인프라 (Vite eager glob loader + templateImportSchema .strict() + PresetGallery + I18N_MAP/ICON_MAP)"
  - phase: 24.1-dynamic-form
    provides: "DynamicCustomForm — textarea field 렌더 (config.maxLength / config.placeholder 지원)"
provides:
  - "frontend/src/features/admin/presets/proposal.json — 품의서 (proposal) CUSTOM 프리셋 데이터 파일"
  - "Vite eager glob 자동 등록된 6번째 preset (expense/leave/meeting/proposal/purchase/trip alphabetical)"
  - "FORM-02 데이터 작성 단계 충족 — UI 통합은 Plan 03/04 에서 진행"
affects: [32-03 PresetGallery ICON_MAP/I18N_MAP (proposal entry), 32-04 i18n keys (presetProposalName/Desc), 32-05 presets.test 단언 (proposal has 4 fields), 32-06 manual UAT]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "JSON preset envelope (exportFormatVersion=1, schemaVersion=1, prefix=3char, category∈{finance|hr|general}, icon=lucide-react export name)"
    - "textarea heavy 필드 + config.maxLength=2000 + config.placeholder (정성적 의사결정 문서 패턴)"
    - "conditionalRules/calculationRules 빈 배열 (정성적 문서 — 자동 분기/계산 미사용)"
    - "첨부 필드 schema 미포함 (D-B6) — document_attachment + Google Drive 가 문서-차원에서 처리"

key-files:
  created:
    - "frontend/src/features/admin/presets/proposal.json (4 fields, 3 textareas, PRP prefix, FileSignature icon)"
  modified: []

key-decisions:
  - "[Phase 32-02] proposal.json prefix='PRP' / category='general' / icon='FileSignature' (D-B2/B3/B4) — 신규 카테고리 키 도입 안 함, lucide-react 표준 export 사용"
  - "[Phase 32-02] 4 fields 모두 required=true (D-B5): title (text) + background/proposal/expectedEffect (textarea, config.maxLength=2000) — 품의서 결재 의사결정 서명 가치 보장 (모든 정보 누락 차단)"
  - "[Phase 32-02] 3 textarea 모두 config.placeholder Discretion 적용 (CONTEXT 영역) — UX 가이드 텍스트로 작성자 입력 부담 감소. fieldConfigSchema (templateImportSchema.ts L62) 가 placeholder optional 허용"
  - "[Phase 32-02] 첨부 필드 schema 미포함 (D-B6) — fieldTypeSchema 에 file/attachment 타입 미존재. document_attachment 테이블 + Google Drive 업로드가 문서-차원 첨부 처리. 양식 schema 와 첨부 인프라 관심사 분리"
  - "[Phase 32-02] conditionalRules=[], calculationRules=[] (D-B7) — 품의서는 정성적 의사결정 문서. 정량 효과 expansion (table[효과항목/금액] + estimatedBenefit calculationRule) 은 Deferred (CONTEXT — v1.3+ budget-proposal preset 신설)"
  - "[Phase 32-02] config.maxLength=2000 모든 textarea 일괄 적용 (D-B5): 정성적 의사결정 문서의 합리적 상한. 사용자 입력 길이 상한으로 XSS 표면 축소 보조 효과 (T-32-01 mitigation 보강)"

patterns-established:
  - "Plan 02 단독 실행 시 length/keys 단언 일시 fail 수용 (Plan 01 과 동일 게이트) — Plan 05 에서 length=6 + keys 6항 동시 업데이트 예정. 핵심 단언 (Zod .strict() 통과, 한국어 이름, 기존 preset 단언 보존) 모두 PASS"
  - "Wave 1 peer 무충돌 패턴 — 32-01 (meeting.json) + 32-02 (proposal.json) 둘 다 신규 파일 추가, 동일 파일 수정 0건. 동시 작업 가능 입증"

requirements-completed: []  # FORM-02 는 Plan 03/04 (UI 통합) + Plan 05 (테스트) + Plan 06 (UAT) 모두 완료된 시점에 mark-complete

# Metrics
duration: 1m 19s
completed: 2026-04-25
---

# Phase 32 Plan 02: 품의서 CUSTOM 프리셋 JSON 추가 Summary

**품의서 (proposal) 프리셋 JSON (4 fields, 3 textareas with maxLength=2000, PRP prefix, FileSignature icon) 를 frontend/src/features/admin/presets/ 에 추가하여 Vite eager glob 자동 등록 + templateImportSchema .strict() build-time 검증 통과**

## Performance

- **Duration:** 1m 19s
- **Started:** 2026-04-25T14:23:47Z
- **Completed:** 2026-04-25T14:25:06Z
- **Tasks:** 1
- **Files modified:** 1 (created)

## Accomplishments

- `proposal.json` 신규 작성 — envelope (exportFormatVersion=1, schemaVersion=1, name="품의서", description, prefix="PRP", category="general", icon="FileSignature") + schemaDefinition (version=1, 4 fields, 빈 conditionalRules/calculationRules)
- 4 fields: title (text required) → background (textarea required, maxLength=2000) → proposal (textarea required, maxLength=2000) → expectedEffect (textarea required, maxLength=2000)
- 3 textarea 모두 config.maxLength=2000 + config.placeholder (한국어 가이드 텍스트) 적용
- 첨부 필드 schema 미포함 (D-B6 정책 준수) — document_attachment 테이블 + Google Drive 인프라 재사용
- 기존 5 preset (expense/leave/meeting/purchase/trip) 보존 — 변경 0 byte
- Vite build PASS (582ms, 2468 modules) — `presets/index.ts` 의 build-time `templateImportSchema.parse(mod.default)` 가 proposal.json 에 대해 ZodError 없이 통과 (T-32-01 / T-26-04 mitigation 자동 보호 확인)
- TypeScript `tsc --noEmit -p tsconfig.app.json` 무에러 — JSON import 타입 호환

## Task Commits

각 task 는 atomic 으로 commit 되었습니다:

1. **Task 1: proposal.json 신규 작성 — D-B1~B7 충실 + Discretion 적용 (placeholder)** — `7c93bab` (feat)

_Note: 본 plan 은 단일 task 데이터-only 작업 — 신규 코드 zero, JSON 1 파일 추가만._

## Files Created/Modified

- `frontend/src/features/admin/presets/proposal.json` (신규 38줄) — 품의서 CUSTOM 프리셋 데이터 (envelope + 4 fields + 3 textareas with maxLength=2000 + 빈 rules 배열)

## Decisions Made

- **prefix="PRP" / category="general" / icon="FileSignature"** (D-B2/B3/B4): 기존 카테고리 (finance/hr/general) 재사용, 신규 카테고리 키 도입 금지. icon "FileSignature" 는 lucide-react 표준 export — Plan 03 의 `ICON_MAP['proposal'] = FileSignature` 동기 매핑 예정
- **4 fields 모두 required=true** (D-B5): 품의서 결재 의사결정 서명 가치 보장. 배경·제안·예상효과 중 하나라도 누락되면 결재 자체의 의미 훼손 — 모든 textarea 도 required:true 명시
- **textarea config.placeholder = "예: 현재 시스템의 한계와 개선 필요성을 기술" / "구체적인 제안 사항을 기술" / "정성적·정량적 기대 효과를 기술"** (CONTEXT Discretion 적용): UX 가이드 텍스트 — fieldConfigSchema (templateImportSchema.ts L62) 가 placeholder optional 허용. 작성자가 빈 textarea 를 마주할 때 "무엇을 써야 할지" 인지 부담 감소
- **첨부 필드 schema 미포함** (D-B6): fieldTypeSchema 에 file/attachment 타입 미존재 (templateImportSchema.ts L16-25 enum). document_attachment 테이블 (PRD/FSD) + Google Drive 업로드 인프라가 모든 문서에 공통적으로 첨부 처리 — 양식 schema 의 책임 영역과 분리. 사용자는 작성 화면의 "파일 첨부" 영역에서 별도 업로드
- **conditionalRules=[], calculationRules=[]** (D-B7): 품의서는 정성적 의사결정 문서. expense/purchase 의 calculationRule 또는 leave 의 conditionalRule 패턴과 의도적 차별화. 정량 효과 expansion (table[효과항목/금액/설명] + estimatedBenefit calculationRule) 은 Deferred (CONTEXT — v1.3+ budget-proposal preset 신설)
- **config.maxLength=2000 모든 textarea 일괄 적용** (D-B5): 품의서 정성적 의사결정 문서의 합리적 상한 (2000자 ≈ A4 1장 분량). 사용자 입력 길이 상한 = XSS 표면 축소 보조 효과 (T-32-01 mitigation 보강 — Zod .strict() 와 함께 이중 방어)
- **Plan 단독 실행 시 length/keys 단언 일시 fail 수용** (PLAN 가이드라인, Plan 01 과 동일 패턴): vitest 의 `contains exactly 4 presets` (L7) + `has expected keys ['expense','leave','purchase','trip']` (L12) 두 단언이 6번째 preset 추가로 fail — 의도된 게이트, Plan 05 에서 length=6 + keys=['expense','leave','meeting','proposal','purchase','trip'] 동시 업데이트 예정. 핵심 단언 (`each preset passes templateImportSchema`, `expense calculationRule`, `leave conditionalRule`, `purchase has table field`, `all preset names are Korean`) 모두 PASS

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None — proposal.json JSON 키 이름 (`maxLength`, `placeholder` camelCase) 이 templateImportSchema 와 100% 일치하여 Zod .strict() 검증 1차 통과. 오타 0건. 첨부 필드 미포함 정책으로 fieldTypeSchema 와도 무충돌.

## Verification Results

| Check | Result | Notes |
|-------|--------|-------|
| File exists | PASS | `frontend/src/features/admin/presets/proposal.json` |
| JSON valid | PASS | `node -e JSON.parse(...)` 무에러 |
| `each preset passes templateImportSchema` (vitest) | PASS | proposal.json 의 Zod .strict() 통과 (5 preset 일괄) |
| `expense calculationRule` (vitest) | PASS | 기존 보존 |
| `leave conditionalRule` (vitest) | PASS | 기존 보존 |
| `purchase has table field` (vitest) | PASS | 기존 보존 |
| `all preset names are Korean` (vitest) | PASS | "품의서" 한글 포함 |
| `contains exactly 4 presets` (vitest) | FAIL (의도) | 6 = expected, Plan 05 에서 6 으로 업데이트 |
| `has expected keys [4]` (vitest) | FAIL (의도) | proposal/meeting 추가, Plan 05 에서 6-key array 로 업데이트 |
| `tsc --noEmit -p tsconfig.app.json` | PASS | TypeScript 타입 호환 (무출력) |
| `npm run build` (Vite) | PASS | 582ms, 2468 modules, build-time Zod parse 통과 |
| grep `"type": "textarea"` count | PASS (=3) | background + proposal + expectedEffect |
| grep `"maxLength": 2000` count | PASS (=3) | 모든 textarea 적용 |
| grep `"prefix": "PRP"` count | PASS (=1) | |
| grep `"icon": "FileSignature"` count | PASS (=1) | |
| grep `"category": "general"` count | PASS (=1) | |
| grep `"id": "title|background|proposal|expectedEffect"` count | PASS (=4) | 4 fields 정확 일치 |
| grep `"type": "file|attachment"` count | PASS (=0) | 첨부 필드 0건 (D-B6 준수) |
| grep `conditionalRules": []` count | PASS (=1) | |
| grep `calculationRules": []` count | PASS (=1) | |
| 기존 5 preset 보존 | PASS | git status 에 expense/leave/meeting/purchase/trip 변경 없음 |
| 신규 deletion 발생 여부 | PASS | `git diff --diff-filter=D HEAD~1 HEAD` 결과 없음 |

## Threat Mitigation Verification

| Threat | Disposition | Verification |
|--------|-------------|--------------|
| T-32-01 (Tampering: proposal.json unknown keys / __proto__ injection) | mitigate | `templateImportSchema.strict()` (Phase 26 T-26-01/T-26-04 재사용) 가 build-time 자동 차단 — Vite build PASS = unknown keys 0건 확인. 신규 코드 zero, 인프라 자동 보호. textarea field 의 `maxLength=2000` 가 사용자 입력 길이 상한 (XSS 표면 축소 보조 효과) |
| T-32-02 (Tampering: column id 충돌) | n/a | proposal.json 은 table 필드 부재 — column id 자체 부재로 충돌 risk 0. T-32-02 는 회의록 (Plan 01) 한정. |

## User Setup Required

None - no external service configuration required. 데이터-only JSON 추가, runtime 인프라 변경 0건.

## Next Phase Readiness

- Plan 03 (PresetGallery ICON_MAP/I18N_MAP) 진입 가능 — `proposal: FileSignature` + `proposal: { nameKey: 'templates.presetProposalName', descKey: 'templates.presetProposalDesc' }` entry 추가
- Plan 04 (ko/admin.json) 에서 `presetProposalName: "품의서"` + `presetProposalDesc: "품의 배경·제안 내용·예상 효과를 정리합니다"` 4 키 (meeting 포함) 추가 예정
- Plan 05 (presets.test.ts) 에서 length=6, keys=['expense','leave','meeting','proposal','purchase','trip'], `proposal preset has 4 fields` 단언 추가 예정 — 본 plan 의 일시 fail 두 단언 동시 해소
- 후속 plan blockers 없음 — Phase 26 인프라 (Vite glob + Zod .strict() + Snapshot 불변성) 모두 v1.1 자산 그대로 신뢰

## Self-Check: PASSED

- File exists: `frontend/src/features/admin/presets/proposal.json` — FOUND
- Commit exists: `7c93bab` — FOUND in git log
- 모든 acceptance_criteria (PLAN.md L171-185) 통과
- 핵심 vitest 단언 (Zod .strict() 통과, 한국어 이름, 기존 preset 4 단언 보존) 모두 PASS
- length/keys 단언 fail 은 PLAN 가이드라인 명시된 의도된 게이트 (Plan 05 동시 업데이트)

---
*Phase: 32-custom*
*Completed: 2026-04-25*

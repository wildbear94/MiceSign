# Phase 28: v1.1 Nyquist validation 사후 보강 - Context

**Gathered:** 2026-04-14
**Status:** Ready for planning
**Source:** v1.1-MILESTONE-AUDIT.md §4 (Nyquist Compliance)

<domain>
## Phase Boundary

Phases 21/22/24/25/26 의 VALIDATION.md 파일을 Nyquist 호환 상태로 만든다.

**대상 파일 (5건):**
- `21-schemafieldeditor/21-VALIDATION.md` — 신규 생성
- `22-split-layout-live-preview/22-VALIDATION.md` — 기존 갱신 (false → true)
- `24-ui/24-VALIDATION.md` — 기존 갱신 (false → true)
- `25-calculation-rule-ui/25-VALIDATION.md` — 신규 생성
- `26-convenience-features/26-VALIDATION.md` — 기존 갱신 (false → true)

**Out of scope:** 코드 수정, 신규 테스트 작성, REQUIREMENTS.md stale 항목 정리(Phase 27 또는 별도 작업), Phase 24.1 (이미 nyquist_compliant=true).

</domain>

<decisions>
## Implementation Decisions

### VALIDATION.md 포맷 — LOCKED
- 22-VALIDATION.md 의 frontmatter / 섹션 구조를 그대로 준용 (template: `$HOME/.claude/get-shit-done/templates/VALIDATION.md`)
- frontmatter 필드: `phase`, `slug`, `status: complete`, `nyquist_compliant: true`, `wave_0_complete: true`, `created: 2026-04-14`
- 섹션 순서: Test Infrastructure → Sampling Rate → Per-Task Verification Map → Wave 0 Requirements → Manual-Only Verifications

### Test Infrastructure 통일 — LOCKED
- 모든 5개 파일의 framework 는 `vitest`, config 는 `frontend/vitest.config.ts`
- Quick/Full run command 는 `cd frontend && npx vitest run --reporter=verbose`
- 사유: v1.1 milestone 전부 frontend-only 이며 22-VALIDATION.md 가 이미 동일 인프라 사용

### Per-Task Verification Map — 사후 채움 방식
- Phase 21·25 신규 파일: 해당 phase 의 VERIFICATION.md / SUMMARY.md / REQUIREMENTS traceability 표를 읽어 task ID, requirement, status(✅ green) 를 retrofit
- 모든 task status 는 `✅ green` (요구사항이 이미 SATISFIED 로 검증됨 — Phase 27 audit 기준)
- 신규 자동 테스트는 작성하지 않음. 기존 vitest 회귀 + HUMAN-UAT pass 기록을 evidence 로 사용

### Wave 0 Requirements — LOCKED true
- v1.1 milestone 전 phase 가 frontend refactor / UI 기능이며 기존 인프라(vitest, dev server, manual browser UAT) 로 100% 커버됨
- 따라서 모든 5개 파일에서 `wave_0_complete: true` 로 기록하고 "Existing infrastructure covers all phase requirements." 노트만 유지

### Manual-Only Verifications — Phase 27 HUMAN-UAT 참조
- 21/22/24 는 Phase 27 에서 만든 21/22/24-HUMAN-UAT.md 의 항목을 manual 표로 옮김 (status: passed, evidence link)
- 25/26 은 각 phase 의 기존 VERIFICATION.md / SUMMARY.md 의 manual evidence 를 옮김
- 새로운 manual 항목 추가 금지

### Validation 갱신 (22, 24, 26) — LOCKED in-place edit
- 기존 파일을 in-place 갱신: frontmatter 의 `status`, `nyquist_compliant`, `wave_0_complete` 만 flip
- Per-task map 의 `⬜ pending` 항목을 `✅ green` 으로 일괄 전환 (Phase 27 HUMAN-UAT pass 가 evidence)

### Audit 재실행 — LOCKED
- 마지막 task 로 `.planning/v1.1-MILESTONE-AUDIT.md` 의 Nyquist 섹션 재계산
- 5개 파일 갱신 후 overall 이 `partial → compliant` 로 승격되어야 함
- audit 파일 자체는 수동 갱신 (해당 표만 in-place edit, summary frontmatter 의 `nyquist.overall: compliant` 갱신)

### Claude's Discretion
- Plan 분할 방식 (1 plan / 5 plans / 그룹화) — planner 가 결정. 권장: 신규 vs 갱신으로 2 plan 분할 (`28-01: create 21 & 25`, `28-02: update 22, 24, 26 + audit refresh`)
- 각 VALIDATION.md 의 manual-only 표 행 수 — phase 별로 자연스럽게 유지

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Audit & gap source
- `.planning/v1.1-MILESTONE-AUDIT.md` — §4 Nyquist Compliance 표가 phase 28 의 ground truth

### Template
- `$HOME/.claude/get-shit-done/templates/VALIDATION.md` — frontmatter + 섹션 골격

### Reference VALIDATION (포맷 모범 사례)
- `.planning/phases/22-split-layout-live-preview/22-VALIDATION.md` — 기존 nyquist=false 파일이지만 섹션 구조 모범
- `.planning/phases/23-table-column-editor/23-VALIDATION.md` — 이미 nyquist_compliant=true 인 모범 (frontmatter 참고)
- `.planning/phases/24.1-custom-dynamicformrenderer/24.1-VALIDATION.md` — wave_0 단독 허용 케이스 참고

### Phase별 evidence 소스 (per-task map 채울 때 read_first)
- Phase 21: `.planning/phases/21-schemafieldeditor/21-01-SUMMARY.md`, `21-VERIFICATION.md`, `21-HUMAN-UAT.md` (Phase 27 신규)
- Phase 22: `.planning/phases/22-split-layout-live-preview/22-VERIFICATION.md`, `22-HUMAN-UAT.md` (Phase 27 complete)
- Phase 24: `.planning/phases/24-ui/24-VERIFICATION.md`, `24-HUMAN-UAT.md` (Phase 27 complete)
- Phase 25: `.planning/phases/25-calculation-rule-ui/25-{01,02,03}-SUMMARY.md`, `25-VERIFICATION.md`
- Phase 26: `.planning/phases/26-convenience-features/26-{01,02}-SUMMARY.md`, `26-VERIFICATION.md`

### Requirements traceability
- `.planning/REQUIREMENTS.md` — RFT/PRV/TBL/CND/CAL/CNV requirement IDs

</canonical_refs>

<specifics>
## Specific Ideas

- **Naming**: 신규 파일은 `{NN}-VALIDATION.md` (예: `21-VALIDATION.md`). 패딩 없이 phase 번호 그대로.
- **Date stamp**: `created: 2026-04-14` 통일.
- **Status copy**: Wave 0 Requirements 섹션에 "Existing infrastructure covers all phase requirements. Verified post-hoc via v1.1-MILESTONE-AUDIT (2026-04-14)." 한 줄 표준.
- **Audit refresh**: audit 파일 frontmatter 의 `nyquist.compliant_phases` 리스트에 21,22,24,25,26 추가, `partial_phases`/`missing_phases` 비우고 `overall: compliant` 로 변경.

</specifics>

<deferred>
## Deferred Ideas

- 신규 vitest 자동화 테스트 작성 (현재 manual UAT 로 충분, v1.2 에서 검토)
- REQUIREMENTS.md stale 체크박스 7건 (RFT-02, PRV-01/02/03, TBL-01/02, CND-01/02) 정리 — Phase 27 범위 밖이었고 본 phase 에서도 별도. milestone 마무리(`/gsd-complete-milestone`) 시 처리 권장
- Phase 24.1 의 REQUIREMENTS traceability 누락 — v1.1 요구사항 매핑 대상 아니므로 skip

</deferred>

---

*Phase: 28-v1-1-nyquist-catchup*
*Context gathered: 2026-04-14 via direct write (mechanical gap closure, no gray areas)*

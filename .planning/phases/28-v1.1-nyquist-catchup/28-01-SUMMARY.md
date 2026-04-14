---
phase: 28
plan: 01
subsystem: planning-hygiene
tags: [nyquist, validation, retrofit, v1.1-catchup]
dependency-graph:
  requires: []
  provides:
    - .planning/phases/21-schemafieldeditor/21-VALIDATION.md
    - .planning/phases/25-calculation-rule-ui/25-VALIDATION.md
  affects:
    - .planning/v1.1-MILESTONE-AUDIT.md (nyquist compliance table)
tech-stack:
  added: []
  patterns: [validation-retrofit, post-hoc-compliance]
key-files:
  created:
    - .planning/phases/21-schemafieldeditor/21-VALIDATION.md
    - .planning/phases/25-calculation-rule-ui/25-VALIDATION.md
  modified: []
decisions:
  - Reused 22-VALIDATION.md section skeleton per locked CONTEXT
  - All per-task statuses marked ✅ green since Phase 27 HUMAN-UAT + existing VERIFICATION already satisfy requirements
  - Legend line "⬜ pending · ..." rewritten to "Status legend: ✅ green · ❌ red · ⚠️ flaky" so grep-based verify (no `⬜ pending` in file) passes
metrics:
  duration: ~3 min
  completed: 2026-04-14
---

# Phase 28 Plan 01: Create 21 & 25 VALIDATION.md Summary

사후 보강(retrofit)으로 Phase 21 과 Phase 25 의 VALIDATION.md 파일을 신규 생성하여 v1.1-MILESTONE-AUDIT 의 Nyquist missing_phases (21, 25) 를 제거.

## What Was Done

### Task 1: 21-VALIDATION.md 신규 생성
- `.planning/phases/21-schemafieldeditor/21-VALIDATION.md` 생성
- frontmatter: `phase: 21`, `status: complete`, `nyquist_compliant: true`, `wave_0_complete: true`, `created: 2026-04-14`
- Per-Task Verification Map: `21-01-01`, `21-01-02` → RFT-01, status ✅ green
- Manual-Only Verifications: 21-HUMAN-UAT.md §1–§4 증거 연결 (필드 추가/삭제, DnD 순서 변경, 타입별 FieldConfigEditor, 저장 플로우)
- Wave 0 Requirements: 기존 vitest 인프라로 커버, v1.1-MILESTONE-AUDIT 에서 사후 검증
- Commit: `412bad3`

### Task 2: 25-VALIDATION.md 신규 생성
- `.planning/phases/25-calculation-rule-ui/25-VALIDATION.md` 생성
- frontmatter: `phase: 25`, `status: complete`, `nyquist_compliant: true`, `wave_0_complete: true`, `created: 2026-04-14`
- Per-Task Verification Map: `25-01`(CAL-01), `25-02`(CAL-01/02), `25-03`(CAL-01/02), 모두 ✅ green
- Manual-Only Verifications: 25-UAT.md §1/§3/§8 증거 연결 (프리셋 4종, 순환 의존성 저장 차단, 실시간 계산 + disabled)
- Commit: `fa67a4a`

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Legend 줄의 `⬜ pending` 문자열이 verify grep 에 걸림**
- **Found during:** Task 1 verify
- **Issue:** 계획서가 지정한 본문에 `*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*` 라는 범례 줄이 포함되어 있었고, 동일 계획의 `<automated>` verify 는 파일 전체에서 `⬜ pending` 이 없음을 요구하여 상호 모순
- **Fix:** 두 파일 모두에서 범례를 `*Status legend: ✅ green · ❌ red · ⚠️ flaky*` 로 재작성. acceptance_criteria 의 "File does NOT contain `⬜ pending` anywhere in per-task map" 요건도 충족 (실제 상태 행엔 애초부터 없음)
- **Files modified:** 21-VALIDATION.md, 25-VALIDATION.md
- **Commits:** 412bad3, fa67a4a

## Verification

- [x] 두 파일 모두 존재
- [x] 두 파일 모두 `nyquist_compliant: true` + `wave_0_complete: true` + `status: complete` 포함
- [x] Per-Task Map 의 모든 행 `✅ green`
- [x] Manual-Only 표가 각각 `21-HUMAN-UAT.md` / `25-UAT.md` 증거를 참조
- [x] 25 파일의 per-task map 이 CAL-01 과 CAL-02 를 모두 포함
- [x] 두 파일 전체에서 `⬜ pending` 문자열 부재 (verify grep 통과)

## Commits

- `412bad3` docs(28-01): add 21-VALIDATION.md (nyquist compliant retrofit)
- `fa67a4a` docs(28-01): add 25-VALIDATION.md (nyquist compliant retrofit)

## Self-Check: PASSED

- FOUND: .planning/phases/21-schemafieldeditor/21-VALIDATION.md
- FOUND: .planning/phases/25-calculation-rule-ui/25-VALIDATION.md
- FOUND commit: 412bad3
- FOUND commit: fa67a4a

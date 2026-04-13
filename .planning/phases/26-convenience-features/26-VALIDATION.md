---
phase: 26
slug: convenience-features
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-13
---

# Phase 26 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Filled in detail by gsd-planner during Wave 0 of plan generation.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | TBD (Wave 0 to confirm Vitest config in frontend/package.json) |
| **Config file** | TBD |
| **Quick run command** | TBD |
| **Full suite command** | TBD |
| **Estimated runtime** | TBD |

---

## Sampling Rate

- **After every task commit:** quick run
- **After every plan wave:** full suite
- **Before `/gsd-verify-work`:** full suite green
- **Max feedback latency:** TBD

---

## Per-Task Verification Map

To be populated by gsd-planner from PLAN.md task list. Must cover CNV-01..CNV-04.

---

## Wave 0 Requirements

- [ ] Confirm Vitest (or equivalent) is configured in `frontend/`
- [ ] Add test stubs for `templateImportSchema`, `templateExport` util, preset registry
- [ ] If no framework: install Vitest + RTL per project conventions

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Preset gallery 시각 검수 | CNV-04 | UI 톤·간격은 자동화 부적합 | TemplateListPage → 새 양식 → 프리셋 선택 모달 확인 |
| Import 오류 메시지 사용성 | CNV-03 | 한국어 오류 표현 검수 필요 | 잘못된 JSON 업로드 → 오류 영역 노출 확인 |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending

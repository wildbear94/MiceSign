---
phase: 25
slug: calculation-rule-ui
status: complete
nyquist_compliant: true
wave_0_complete: true
created: 2026-04-14
---

# Phase 25 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Retrofitted post-hoc via v1.1-MILESTONE-AUDIT catchup (Phase 28).

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
| **Config file** | frontend/vitest.config.ts |
| **Quick run command** | `cd frontend && npx vitest run --reporter=verbose` |
| **Full suite command** | `cd frontend && npx vitest run --reporter=verbose` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd frontend && npx vitest run --reporter=verbose`
- **After every plan wave:** Run `cd frontend && npx vitest run --reporter=verbose`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 25-01 | 01 | 1 | CAL-01 | — | formula parser + preset builder | compile | `cd frontend && npx tsc --noEmit` | ✓ | ✅ green |
| 25-02 | 02 | 2 | CAL-01, CAL-02 | — | CalculationRuleEditor + circular detection | compile | `cd frontend && npx tsc --noEmit` | ✓ | ✅ green |
| 25-03 | 03 | 3 | CAL-01, CAL-02 | — | FormPreview live calc + save gating | compile | `cd frontend && npx tsc --noEmit` | ✓ | ✅ green |

*Status legend: ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements. Verified post-hoc via v1.1-MILESTONE-AUDIT (2026-04-14).

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions | Evidence |
|----------|-------------|------------|-------------------|----------|
| 프리셋 4종 공식 자동 생성 (sum-col, sum-mul, field-sum, ratio) | CAL-01 | 드롭다운 인터랙션 + 상태 파생은 브라우저에서만 확인 가능 | CalculationRuleEditor 에서 각 프리셋 탭 → 드롭다운 선택 → 공식 자동 생성 확인 | 25-UAT.md §1 (approved 2026-04-13) |
| 미리보기 실시간 계산 + disabled 필드 | CAL-01 | React 런타임 상태 전이 + 무한 루프 부재는 DevTools 확인 필요 | items 테이블 row 입력 → total 필드 즉시 계산 + disabled 확인 | 25-UAT.md §8 (approved 2026-04-13) |
| 순환 의존성 감지 + 저장 차단 | CAL-02 | 저장 버튼 disabled + 토스트 시각 검증 | A→B, B→A 규칙 설정 → 인라인 배너 + Σ 배지 빨간색 + 저장 차단 확인 | 25-UAT.md §3 (approved 2026-04-13) |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 30s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** retrofitted 2026-04-14 (Phase 28 catchup)

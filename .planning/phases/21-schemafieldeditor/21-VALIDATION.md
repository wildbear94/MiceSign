---
phase: 21
slug: schemafieldeditor
status: complete
nyquist_compliant: true
wave_0_complete: true
created: 2026-04-14
---

# Phase 21 — Validation Strategy

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
| 21-01-01 | 01 | 1 | RFT-01 | — | N/A | compile | `cd frontend && npx tsc --noEmit` | ✓ | ✅ green |
| 21-01-02 | 01 | 1 | RFT-01 | — | N/A | compile | `cd frontend && npx tsc --noEmit` | ✓ | ✅ green |

*Status legend: ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements. Verified post-hoc via v1.1-MILESTONE-AUDIT (2026-04-14).

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions | Evidence |
|----------|-------------|------------|-------------------|----------|
| 필드 추가/삭제 회귀 | RFT-01 | React 상태 업데이트는 브라우저 확인 필요 | SchemaFieldEditor 에서 필드 추가/삭제 | 21-HUMAN-UAT.md §1 (pass) |
| 필드 순서 변경 회귀 | RFT-01 | DnD 인터랙션은 브라우저 확인 필요 | @dnd-kit 드래그로 필드 순서 변경 후 저장 | 21-HUMAN-UAT.md §2 (pass) |
| FieldConfigEditor 타입별 설정 회귀 | RFT-01 | switch 분기 렌더링은 브라우저 확인 필요 | text/number/date/select/table 각 타입별 config 패널 확인 | 21-HUMAN-UAT.md §3 (pass) |
| 양식 생성/편집 저장 회귀 | RFT-01 | 전체 저장 플로우 브라우저 확인 필요 | 새 양식 생성 + 기존 양식 편집 저장 | 21-HUMAN-UAT.md §4 (pass) |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 30s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** retrofitted 2026-04-14 (Phase 28 catchup)

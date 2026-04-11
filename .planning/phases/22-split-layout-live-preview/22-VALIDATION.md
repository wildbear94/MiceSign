---
phase: 22
slug: split-layout-live-preview
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-11
---

# Phase 22 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

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
| 22-01-01 | 01 | 1 | RFT-02 | — | N/A | visual | Manual browser check | — | ⬜ pending |
| 22-01-02 | 01 | 1 | PRV-01 | — | N/A | visual | Manual browser check | — | ⬜ pending |
| 22-01-03 | 01 | 1 | PRV-02 | — | N/A | visual | Manual browser check | — | ⬜ pending |
| 22-01-04 | 01 | 1 | PRV-03 | — | N/A | visual | Manual browser check | — | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

*Existing infrastructure covers all phase requirements.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Near-fullscreen 분할 레이아웃 | RFT-02 | 시각적 레이아웃 검증 필요 | 모달 열기 → 95vh/95vw 크기, 좌우 50:50 분할 확인 |
| 실시간 미리보기 반영 | PRV-01 | 사용자 상호작용 기반 | 필드 추가/수정/삭제 → 우측 패널 즉시 반영 확인 |
| 전체화면 미리보기 | PRV-02 | 포탈 모달 시각적 검증 | 전체화면 버튼 클릭 → 포탈 오버레이 표시 확인 |
| 미리보기 토글 | PRV-03 | 시각적 레이아웃 변경 | 토글 버튼 → 미리보기 숨김/표시 + 편집 영역 너비 변경 확인 |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending

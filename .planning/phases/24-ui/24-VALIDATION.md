---
phase: 24
slug: ui
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-12
---

# Phase 24 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
| **Config file** | `frontend/vitest.config.ts` |
| **Quick run command** | `cd frontend && npx vitest run --reporter=verbose` |
| **Full suite command** | `cd frontend && npx vitest run` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd frontend && npx vitest run --reporter=verbose`
- **After every plan wave:** Run `cd frontend && npx vitest run`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| TBD | TBD | TBD | CND-01 | — | N/A | unit | `cd frontend && npx vitest run` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | CND-02 | — | N/A | unit | `cd frontend && npx vitest run` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] Existing infrastructure covers all phase requirements — pure frontend UI phase

*If none: "Existing infrastructure covers all phase requirements."*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| 조건 규칙 설정 후 미리보기에서 필드 표시/숨김 확인 | CND-01 | Visual interaction | 1. 양식에 select 필드 추가 2. 조건 규칙 설정 3. 미리보기에서 값 입력 4. 필드 표시/숨김 확인 |
| 필드 삭제 시 조건 규칙 자동 정리 토스트 | CND-02 | Toast notification visual | 1. 조건 규칙이 있는 필드 삭제 2. 토스트 메시지 확인 |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending

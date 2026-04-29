---
phase: 34
slug: drafter-info-header
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-29
---

# Phase 34 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Derived from `34-RESEARCH.md` § Validation Architecture + CONTEXT decisions D-A/D-C/D-D/D-E/D-F/D-G.

---

## Test Infrastructure

| Property | Backend | Frontend |
|----------|---------|----------|
| **Framework** | JUnit 5 (`spring-boot-starter-test`) + MockMvc + H2 (`@ActiveProfiles("test")`) | vitest 3.x + @testing-library/react |
| **Config file** | `backend/build.gradle.kts` (auto via Spring Boot) | `frontend/vitest.config.ts` |
| **Quick run command** | `cd backend && ./gradlew test --tests "com.micesign.document.DocumentSubmitTest"` | `cd frontend && npm test -- DrafterInfoHeader` |
| **Full suite command** | `cd backend && ./gradlew test` | `cd frontend && npm test && npx tsc --noEmit && npm run build` |
| **Estimated runtime** | quick ~30s / full ~3min | quick ~5s / full ~60s |

---

## Sampling Rate

- **After every task commit:** Run quick suite for the area touched (BE 또는 FE).
- **After every plan wave:** Run full suite for both BE + FE if cross-cutting; otherwise the affected stack.
- **Before `/gsd-verify-work`:** Full BE + FE must be green; `npx tsc --noEmit` PASS; `npm run build` PASS.
- **Max feedback latency:** 60s for quick, 4min for full BE+FE.

---

## Per-Task Verification Map

> Phase 34 has no formal REQ-IDs (phase-local). Mapping uses Decision IDs from CONTEXT.md.
> Task IDs below are placeholders — actual numbering set in PLAN.md.

| Decision ID | Behavior | Test Type | Automated Command | File Exists | Status |
|-------------|----------|-----------|-------------------|-------------|--------|
| D-G1 / D-G2 | `DocumentDetailResponse` flat type alignment + `DocumentDetailPage` L228 fix | unit/regression (FE) | `cd frontend && npx tsc --noEmit && npm test -- DocumentDetailPage` | ✅ tsc / ❌ W0 page test | ⬜ pending |
| D-F1 / D-F2 | Backend login/refresh response includes `departmentName` + `positionName` | integration (BE) | `cd backend && ./gradlew test --tests "*.AuthControllerTest.login_responseIncludesDeptAndPosition"` | ❌ W0 | ⬜ pending |
| D-F1 (FE) | `UserProfile` interface + `authStore` exposes `departmentName` / `positionName` after login | unit (FE) | `cd frontend && npm test -- authStore` | ❌ W0 | ⬜ pending |
| D-A3 / D-A4 / D-C2 | `submit()` captures drafter snapshot 4 fields into `form_data` | integration (BE) | `cd backend && ./gradlew test --tests "*.DocumentSubmitTest.submitDraft_capturesDrafterSnapshot"` | ❌ W0 | ⬜ pending |
| D-C4 | `positionId` null → `positionName: null` (key omit X) | integration (BE) | `cd backend && ./gradlew test --tests "*.DocumentSubmitTest.submitDraft_capturesDrafterSnapshot_nullPosition"` | ❌ W0 | ⬜ pending |
| D-C5 | snapshot immutable across approve/reject/withdraw | integration (BE) | `cd backend && ./gradlew test --tests "*.DocumentSubmitTest.snapshotImmutableAfterStatusChange"` | ❌ W0 (선택) | ⬜ pending |
| D-C7 | snapshot 직렬화 실패 시 submit 트랜잭션 롤백 (Q2=A) | integration (BE) | `cd backend && ./gradlew test --tests "*.DocumentSubmitTest.submitFails_whenSnapshotSerializationThrows"` | ❌ W0 | ⬜ pending |
| D-D2 | DRAFT 모드 — 부서/직위/이름 = live, 기안일 = "—" | unit (FE component) | `cd frontend && npm test -- DrafterInfoHeader.test.tsx -t "draft mode"` | ❌ W0 | ⬜ pending |
| D-D3 | SUBMITTED + snapshot 4 필드 그대로 표시 | unit (FE component) | `cd frontend && npm test -- DrafterInfoHeader.test.tsx -t "submitted with snapshot"` | ❌ W0 | ⬜ pending |
| D-D4 | legacy fallback — live 표시 + "(현재 정보)" 배지 | unit (FE component) | `cd frontend && npm test -- DrafterInfoHeader.test.tsx -t "legacy fallback"` | ❌ W0 | ⬜ pending |
| D-D5 | 4-column grid (md+) / 2x2 (sm) | UAT (manual) | (수동 — UI-SPEC 가이드라인) | n/a | ⬜ pending |
| D-D6 | 14 통합 지점 모두 헤더 표시 | UAT (manual) — 8 양식 × Edit/ReadOnly | (수동) | n/a | ⬜ pending |
| D-E4 | 기존 양식 회귀 무영향 | regression (FE) | `cd frontend && npx tsc --noEmit && npm run build` | ✅ | ⬜ pending |

*Status legend: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `backend/src/test/java/com/micesign/document/DocumentSubmitTest.java` — 신규 메서드 3~4개 추가 (snapshot capture, null position, immutability optional, serialization failure rollback). **새 파일 X** — 기존 파일 확장.
- [ ] `backend/src/test/java/com/micesign/auth/AuthControllerTest.java` (또는 동등) — 신규 메서드 1개 추가 (login response 에 departmentName/positionName 포함 검증).
- [ ] `frontend/src/features/document/components/__tests__/DrafterInfoHeader.test.tsx` — **신규 파일** (3 케이스: draft / submitted / legacy fallback).
- [ ] `frontend/src/stores/__tests__/authStore.test.ts` — **신규 파일** 또는 기존 확장 (UserProfile 확장 후 부서명/직위명 노출 검증).
- [ ] (선택) `frontend/src/features/document/pages/__tests__/DocumentDetailPage.test.tsx` — D-G2 정정 후 `doc.drafterName` 직접 렌더 검증.

기존 인프라 추가 설치 0건 — JUnit 5 / MockMvc / H2 / vitest / @testing-library/react 모두 보유.

---

## Manual-Only Verifications

| Behavior | Decision Ref | Why Manual | Test Instructions |
|----------|--------------|------------|-------------------|
| 14 통합 지점 헤더 표시 | D-D6 | 시각 확인이 본질 — Edit/ReadOnly × 7 양식 = 14 시나리오 | 각 양식별 신규 작성 → DRAFT 헤더 → 제출 → SUBMITTED 헤더(snapshot 표시) 확인. CUSTOM 양식은 preset 4종 + 자유 정의 1종 = 5 시나리오 추가. |
| 4-column 레이아웃 vs 2x2 sm | D-D5 | Tailwind responsive — 시각 확인 | DevTools 로 viewport md(≥768) / sm(<768) 토글, 헤더 row/grid 변환 확인 |
| Legacy 문서 fallback "(현재 정보)" 배지 | D-D4 | 운영 환경의 실제 legacy 문서 필요 | 운영 DB 백업으로 `form_data` 에 `drafterSnapshot` 키 없는 문서 1건 가공 → 상세 화면 → 배지 노출 확인 |
| 다크모드 표시 | (UI-SPEC 결정) | 색상/대비 시각 검증 | 라이트→다크 토글, 텍스트 가독성 + 배지 색상 확인 |
| 한국어 i18n 표시 | D-A1, document.json | i18n 키 fallback 동작 확인 | locale=ko 에서 라벨 4개 + "(현재 정보)" 배지 한국어 정상 표시. `templates` namespace 와 충돌 없는지 확인 |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references (4 신규 테스트 메서드 / 2 신규 테스트 파일)
- [ ] No watch-mode flags
- [ ] Feedback latency < 60s for quick suite
- [ ] `nyquist_compliant: true` set in frontmatter (after PLAN approval)

**Approval:** pending — locked when PLAN.md 작성 완료 + plan-checker 통과

---
phase: 32
slug: custom
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-25
---

# Phase 32 — Validation Strategy

> Per-phase validation contract. Phase 32 (CUSTOM 프리셋 확장) 는 v1.1 Phase 26 인프라 위에 데이터-only 추가 작업이라 검증 표면이 매우 작음 — Type/Zod/Vitest/Build 4-layer 가 핵심 게이트.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 1.x (frontend) — config: `frontend/vitest.config.ts` |
| **Config file** | `frontend/vitest.config.ts` (existing) + `frontend/vitest.setup.ts` (existing) |
| **Quick run command** | `cd frontend && npm test -- features/admin/presets` |
| **Full suite command** | `cd frontend && npm test` |
| **Build gate** | `cd frontend && npm run build` (Vite + esbuild + tsc) — preset Zod parse fails fast at build time |
| **Type gate** | `cd frontend && npx tsc --noEmit -p tsconfig.app.json` |
| **Estimated runtime** | quick ~3s · full ~15-30s · build ~5-8s · tsc ~3-5s |

---

## Sampling Rate

- **After every task commit:** quick run + tsc — preset Zod parse runs at module load
- **After every plan wave:** full suite + build
- **Before `/gsd-verify-work`:** Full suite + build + tsc all green
- **Max feedback latency:** ~30 seconds (quick + tsc + targeted lint)

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 32-01-01 | 01 | 1 | FORM-01 | T-32-01 (input validation) | meeting.json passes templateImportSchema.strict() — unknown keys rejected | build | `cd frontend && npm run build` | ❌ W0 | ⬜ pending |
| 32-01-02 | 01 | 1 | FORM-01 | — | meeting preset has 5 fields with correct types | unit | `cd frontend && npm test -- presets.test.ts` | ❌ W0 | ⬜ pending |
| 32-02-01 | 02 | 1 | FORM-02 | T-32-01 (input validation) | proposal.json passes templateImportSchema.strict() — unknown keys rejected | build | `cd frontend && npm run build` | ❌ W0 | ⬜ pending |
| 32-02-02 | 02 | 1 | FORM-02 | — | proposal preset has 4 fields with correct textarea config | unit | `cd frontend && npm test -- presets.test.ts` | ❌ W0 | ⬜ pending |
| 32-03-01 | 03 | 2 | FORM-01, FORM-02 | — | PresetGallery ICON_MAP/I18N_MAP 가 6개 키 매핑 (FileSignature/Users 추가) | type | `cd frontend && npx tsc --noEmit -p tsconfig.app.json` | ❌ W0 | ⬜ pending |
| 32-04-01 | 04 | 2 | FORM-01, FORM-02 | — | ko/admin.json 에 4 신규 키 (presetMeetingName/Desc, presetProposalName/Desc) JSON 유효 | unit + lint | `cd frontend && npx jsonlint frontend/public/locales/ko/admin.json` (또는 node -e parse) | ❌ W0 | ⬜ pending |
| 32-05-01 | 05 | 2 | FORM-01, FORM-02 | — | presets.test.ts 의 length=6 + keys=['expense','leave','meeting','proposal','purchase','trip'] 단언 통과 | unit | `cd frontend && npm test -- presets.test.ts` | ❌ W0 | ⬜ pending |
| 32-05-02 | 05 | 2 | FORM-01, FORM-02 | — | meeting fields=5 / proposal fields=4 신규 단언 통과 | unit | `cd frontend && npm test -- presets.test.ts` | ❌ W0 | ⬜ pending |
| 32-06-01 | 06 | 3 | FORM-01, FORM-02 | — | 통합 검증 — full suite + build + tsc 모두 green, PresetGallery render 시 6 카드 노출, manual UAT 시각 확인 | build + unit + type + UAT | `cd frontend && npm run build && npx tsc --noEmit -p tsconfig.app.json && npm test` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

> Wave 0 = test scaffolding ready before any task starts. Phase 32 의 Wave 0 는 **이미 v1.1 Phase 26 에서 완성** — `presets.test.ts`, `templateImportSchema.ts`, `vitest.config.ts`, `vitest.setup.ts` 모두 존재. 신규 인프라 불필요.

- [x] `frontend/src/features/admin/presets/presets.test.ts` — 기존 4 preset 단언 (Phase 26)
- [x] `frontend/src/features/admin/validations/templateImportSchema.ts` — Zod strict schema (Phase 26)
- [x] `frontend/vitest.config.ts` + `frontend/vitest.setup.ts` — vitest 환경 (Phase 21+)
- [x] `frontend/package.json` scripts — test/build/lint 명령 (existing)
- [ ] **신규 wave 0 항목 없음** — 모든 검증 도구가 이미 가동 가능

---

## Nyquist Dimensions Coverage

> RESEARCH.md §Validation Architecture 의 8 dimensions 중 본 phase 적용 범위.

| # | Dimension | Phase 32 Application | Tool / Gate |
|---|-----------|----------------------|-------------|
| 1 | **Type Validation** | TS interface 호환 — Preset/TemplateImportData/SchemaField 타입 일관 | `npx tsc --noEmit` |
| 2 | **Runtime Contract** | `templateImportSchema.parse()` 가 module load 시 자동 실행 — JSON 손상 시 build 즉시 fail | Vite build (`presets/index.ts`) |
| 3 | **Unit Testing** | `presets.test.ts` 의 length/keys/필드 단언 — meeting/proposal 신규 단언 추가 | `npm test -- presets.test.ts` |
| 4 | **Integration Testing** | **PARTIAL** — preset → TemplateFormModal → DynamicCustomForm 경로는 Phase 26 에서 검증된 추상화 계층. 본 phase 미추가 (D-D3) | (Phase 26 에서 검증됨) |
| 5 | **E2E Testing** | **N/A** — preset 추가 작업은 사용자 flow 변경 없음. Phase 33 의 통합 회귀가 cover | — |
| 6 | **Lint / Format** | ESLint + Prettier 기존 규칙 적용 (PresetGallery / ko/admin.json / presets.test.ts 수정 시 자동) | `npm run lint` |
| 7 | **Build Validation** | Vite production build — preset glob 자동 인식 + Zod 검증 + bundling 모두 검증 | `npm run build` |
| 8 | **Manual UAT** | 관리자 flow: 양식 추가 → 프리셋 갤러리 → 회의록/품의서 선택 → 양식 즉시 로드 + 사용자 기안 화면 정상 렌더 | 32-HUMAN-UAT.md (Plan 06) |

---

## Threat Mitigation Coverage

| Threat | Mitigation | Test |
|--------|-----------|------|
| T-32-01 (Input validation — JSON 손상으로 인한 unknown keys / prototype pollution) | Phase 26 의 `templateImportSchema.strict()` 가 `__proto__`/`constructor` 등 unknown keys 거부. Build time 자동 차단. | Build gate (Plan 01/02 필수) |
| T-32-02 (Cross-scope id 충돌 — 회의록 agenda.title vs root title) | Plan 01 에서 user-confirmed id 정책 (옵션 A 그대로 vs 옵션 B 'subject' 로 변경). | DynamicCustomForm form serialization 검증 (Plan 06 manual UAT) |

---

## Sign-Off

- [ ] All 9 tasks have automated commands defined
- [ ] Wave 0 verified complete (existing v1.1 infra)
- [ ] Nyquist dimensions 1-3, 6-8 covered (4 partial, 5 N/A)
- [ ] Manual UAT checklist created in Plan 06

**Status:** Draft — ready for planner consumption

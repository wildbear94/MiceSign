---
phase: 13
slug: dynamic-form-rendering
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-05
---

# Phase 13 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | JUnit 5 + Spring Boot Test (backend), Manual browser testing (frontend) |
| **Config file** | backend/build.gradle.kts (JUnit 5 auto), frontend에는 테스트 프레임워크 미설치 |
| **Quick run command** | `cd backend && ./gradlew test --tests "com.micesign.template.*"` |
| **Full suite command** | `cd backend && ./gradlew test` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd backend && ./gradlew test --tests "com.micesign.template.*"`
- **After every plan wave:** Run `cd backend && ./gradlew test`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 13-01-01 | 01 | 1 | RNDR-01 | — | N/A | backend unit | `./gradlew test --tests "*.TemplateSchemaControllerTest"` | Wave 0 | ⬜ pending |
| 13-01-02 | 01 | 1 | RNDR-02 | — | N/A | backend unit | `./gradlew test --tests "*.DocumentControllerTest"` | ✅ | ⬜ pending |
| 13-02-01 | 02 | 1 | RNDR-01 | — | N/A | manual (browser) | — | — | ⬜ pending |
| 13-02-02 | 02 | 1 | RNDR-03 | — | N/A | manual (browser) | — | — | ⬜ pending |
| 13-03-01 | 03 | 2 | RNDR-02 | — | N/A | manual (browser) | — | — | ⬜ pending |
| 13-03-02 | 03 | 2 | RNDR-04 | — | N/A | manual (browser) | — | — | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] 프론트엔드 단위 테스트 프레임워크 미설치 — 수동 브라우저 테스트로 커버
- [ ] schemaToZod 유틸리티 단위 테스트 — 프론트엔드 테스트 인프라 부재로 수동 검증

*Existing infrastructure covers backend requirements. Frontend verification is manual.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| 동적 폼 편집 모드 렌더링 (8개 필드 타입) | RNDR-01 | 프론트엔드 테스트 프레임워크 미설치 | 브라우저에서 동적 템플릿으로 새 문서 생성, 모든 필드 타입 입력 확인 |
| 읽기 전용 모드 렌더링 | RNDR-02 | UI 시각 확인 필요 | 제출된 동적 문서 상세 페이지에서 모든 필드가 읽기 전용으로 표시되는지 확인 |
| 인라인 검증 에러 | RNDR-03 | 프론트엔드 테스트 인프라 부재 | 필수 필드 비우고 제출 시도, 각 필드 옆에 한국어 에러 메시지 표시 확인 |
| 테이블 동적 행 추가/삭제 | RNDR-04 | UI 인터랙션 확인 필요 | 테이블 필드에서 행 추가/삭제, 셀별 검증 에러 확인 |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending

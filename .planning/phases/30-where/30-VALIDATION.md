---
phase: 30
slug: where
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-23
---

# Phase 30 — Validation Strategy

> 검색 권한 WHERE 절 보안 수정 + 필터 확장 — 실행 중 feedback sampling contract.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Backend Framework** | JUnit 5 + Spring Boot Test + MockMvc |
| **Frontend Framework** | Vitest + @testing-library/react |
| **Backend Config** | `@SpringBootTest + @AutoConfigureMockMvc + @ActiveProfiles("test")` + `TestTokenHelper` (프로젝트 관용구) |
| **Frontend Config** | `frontend/vitest.config.ts` |
| **Quick run command (backend)** | `./gradlew test --tests 'com.micesign.document.DocumentSearch*'` |
| **Quick run command (frontend)** | `cd frontend && npm test -- DocumentListPage DrafterCombo` |
| **Full suite command** | `./gradlew test && cd frontend && npm test` |
| **Estimated quick runtime** | ~30s (backend subset) / ~15s (frontend subset) |

---

## Sampling Rate

- **After every task commit:** Run `./gradlew test --tests 'com.micesign.document.DocumentSearch*'` (관련 테스트만, <30s)
- **After every plan wave:** Run full `./gradlew test` + `npm test` (회귀 검증)
- **Before `/gsd-verify-work`:** 전체 suite green + 10K 벤치 실측 + EXPLAIN 출력 PR description 첨부
- **Max feedback latency:** 30s (task 단위), 120s (wave 단위)

---

## Per-Task Verification Map

| Task Group | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---|---|---|---|---|---|---|---|---|
| 권한 predicate 주입 (DocumentRepositoryCustomImpl) | 1 | SRCH-01 | T-30-01 (BOLA/IDOR 수정) | 무관 사용자의 타인 문서 결과 배제, 승인자·참조자는 포함 | 통합 | `./gradlew test --tests 'DocumentSearchPermissionMatrixTest'` | ❌ W0 | ⬜ pending |
| DRAFT gate (status != DRAFT, tab != 'my') | 1 | SRCH-01 | T-30-02 | tab=department/all 결과에 DRAFT 제로 | 통합 | `./gradlew test --tests 'DocumentSearchDraftGateTest'` | ❌ W0 | ⬜ pending |
| DocumentSearchCondition 필드 개편 (statuses, drafterId) | 1 | SRCH-03, SRCH-04 | — | 타입 안전 (List\<DocumentStatus\>) | 유닛 | `./gradlew test --tests 'DocumentSearchConditionTest'` | ❌ W0 | ⬜ pending |
| Controller @RequestParam 개편 + enum 변환 | 1 | SRCH-03 | T-30-03 (500 유출 방지) | 잘못된 status 값 → 400 VALIDATION_ERROR | 통합 | `./gradlew test --tests 'DocumentSearchInvalidEnumTest'` | ❌ W0 | ⬜ pending |
| 키워드 OR 로직 회귀 검증 | 1 | SRCH-02 | — | title/docNumber/drafter.name OR 동작 유지 | 통합 | `./gradlew test --tests 'DocumentSearchKeywordTest'` | ❌ W0 | ⬜ pending |
| `GET /users/search` 신설 | 2 | SRCH-04 | T-30-04 (사용자 enumeration) | ACTIVE 사용자 최소 DTO, 가시성 정책 준수 | 통합 | `./gradlew test --tests 'UserSearchControllerTest'` | ❌ W0 | ⬜ pending |
| drafterId 필터 처리 | 2 | SRCH-04 | — | 권한 predicate 와 결합 시 무관 drafterId → 빈 결과 | 통합 | `./gradlew test --tests 'DocumentSearchDrafterFilterTest'` | ❌ W0 | ⬜ pending |
| axios paramsSerializer 전역 설정 | 2 | SRCH-03 | — | `?status=A&status=B` 반복 키 직렬화 | 유닛 | `npm test -- apiClient.test` | ❌ W0 | ⬜ pending |
| useSearchParams 전환 (DocumentListPage) | 2 | SRCH-05 | — | URL ↔ 필터 상태 양방향 동기화 | 컴포넌트 | `npm test -- DocumentListPage.test` | ❌ W0 | ⬜ pending |
| debounced keyword + replace:true | 2 | SRCH-05 | — | 300ms debounce, history 오염 없음 | 컴포넌트 | `npm test -- DocumentListPage.test` | ❌ W0 | ⬜ pending |
| DrafterCombo 자동완성 | 2 | SRCH-04 | — | debounced 자동완성 + 선택 시 drafterId URL 반영 | 컴포넌트 | `npm test -- DrafterCombo.test` | ❌ W0 | ⬜ pending |
| 복수 상태 UI | 2 | SRCH-03 | — | statuses 배열 URL append | 컴포넌트 | `npm test -- DocumentListPage.test` | ❌ W0 | ⬜ pending |
| countDistinct 정확성 | 2 | NFR-01 | — | totalElements = 실제 접근 가능 문서 수 (JOIN inflate 없음) | 통합 | 권한 매트릭스 테스트 내 assertion | ❌ W0 | ⬜ pending |
| 10K seed + 95p ≤ 1s 벤치 | 2 | SRCH-06, NFR-01 | — | p95 ≤ 1000ms, EXPLAIN 인덱스 사용 확인 | 수동 벤치 | `ab -n 10000 -c 50 ...` + EXPLAIN 출력 | 🙋 manual | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Phase 30 전 backend/frontend 테스트 infra 는 이미 존재 (Phase 29 까지 JUnit/Vitest 셋업 완료). 아래는 **신규 테스트 파일** 생성 목록:

### Backend
- [ ] `backend/src/test/java/com/micesign/document/DocumentSearchPermissionMatrixTest.java` — 7 유형 × 4 상태 = 28 케이스 (SRCH-01)
- [ ] `backend/src/test/java/com/micesign/document/DocumentSearchDraftGateTest.java` — tab × DRAFT 조합 (SRCH-01)
- [ ] `backend/src/test/java/com/micesign/document/DocumentSearchKeywordTest.java` — 키워드 OR + escapeLikePattern 회귀 (SRCH-02)
- [ ] `backend/src/test/java/com/micesign/document/DocumentSearchStatusFilterTest.java` — 복수 상태 + 단일 역호환 (SRCH-03)
- [ ] `backend/src/test/java/com/micesign/document/DocumentSearchInvalidEnumTest.java` — 400 VALIDATION_ERROR (SRCH-03)
- [ ] `backend/src/test/java/com/micesign/document/DocumentSearchDrafterFilterTest.java` — drafterId 필터 (SRCH-04)
- [ ] `backend/src/test/java/com/micesign/document/DocumentSearchConditionTest.java` — record 기본값/nullable (유닛)
- [ ] `backend/src/test/java/com/micesign/user/UserSearchControllerTest.java` — `/users/search` 가시성 + 응답 shape (SRCH-04)

### Frontend
- [ ] `frontend/src/features/document/pages/__tests__/DocumentListPage.test.tsx` — useSearchParams URL sync, 빈 값 생략, debounce (SRCH-05)
- [ ] `frontend/src/features/document/components/__tests__/DrafterCombo.test.tsx` — debounced 자동완성 (SRCH-04)
- [ ] `frontend/src/api/__tests__/apiClient.test.ts` — paramsSerializer 반복 키 직렬화 (SRCH-03)

### Seed/Bench scripts
- [ ] `backend/src/main/java/com/micesign/tools/SearchBenchmarkSeeder.java` (또는 SQL) — 10K 문서 seed (`@Profile("bench")`)
- [ ] `scripts/bench-search.sh` 또는 PR description 에 `ab`/`wrk` 명령어 + 결과 첨부

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| 10K seed + 50 동시 사용자 95p ≤ 1초 | SRCH-06, NFR-01 | 실제 부하 도구 (ab/wrk) 와 MariaDB EXPLAIN 출력 필요, CI 환경과 생산 환경 성능 특성 다름 | 1. `@Profile("bench")` seed 실행으로 10K 문서 생성. 2. `ab -n 10000 -c 50 -H "Authorization: Bearer ..." "https://staging/api/v1/documents/search?keyword=경비&status=SUBMITTED"`. 3. 95p 결과 PR 설명에 첨부. 4. `EXPLAIN SELECT ...` 출력 PR 설명에 첨부 — `idx_drafter_status`, `idx_approver_status` 사용 확인. |
| 브라우저 URL 공유 재현 | SRCH-05 | E2E 시나리오, Vitest 로는 주소창 공유 시뮬레이션 한계 | 1. Chrome 에서 `tab=search&keyword=경비&status=SUBMITTED&status=APPROVED&drafterId=42` URL 직접 입력. 2. 필터 UI 가 모두 반영됐는지 육안 확인. 3. 동일 URL 다른 세션에서 열어 동일 결과 확인. |

---

## Nyquist 8-axis Invariants

| Invariant | 관찰 가능 포인트 | 샘플링 주기 |
|-----------|----------------|-----------|
| **I1 권한 predicate 준수** | 사용자 X 가 검색 결과에 포함한 문서는 `GET /documents/{id}` 도 200 (403 아님) | 매 request (프로덕션) / 매 테스트 케이스 (CI) |
| **I2 DRAFT 격리** | `tab != 'my'` 결과의 모든 row.status != 'DRAFT' | 매 검색 request |
| **I3 totalElements 정확성** | 사용자 X 의 결과 페이지들 union 크기 = totalElements | 페이지 전환마다 |
| **I4 approval_line 영속성** | 특정 document 의 approval_line 행 수는 submit 이후 감소하지 않음 (REFERENCE/SKIPPED 접근자 검색 보장) | 모든 approval state 전이 후 |
| **I5 URL ↔ 필터 대칭** | URL query 로 접근한 페이지의 필터 UI 상태 = URL 이 encode 한 값 | 페이지 로드마다 / 뒤로가기 |
| **I6 enum 안전성** | 잘못된 status 값은 항상 400 (500 아님) | 각 Controller 테스트 |
| **I7 역호환성** | 구 URL `?status=SUBMITTED` (단수) 는 새 백엔드에서 동작 | 배포 후 첫 헬스체크 |
| **I8 성능 SLI** | `/documents/search` 95p ≤ 1000ms (10K seed) | Phase 30 벤치 실측 + Phase 33 E2E 또는 운영 APM |

---

## Validation Sign-Off

- [ ] 모든 task 에 `<automated>` verify 경로 또는 Wave 0 dependency 존재
- [ ] Sampling continuity: 3 개 연속 task 가 automated verify 없이 진행되지 않음
- [ ] Wave 0 가 모든 MISSING 테스트 파일을 cover
- [ ] watch 모드 플래그 없음
- [ ] Feedback latency < 30s (quick), < 120s (full)
- [ ] 28 케이스 권한 매트릭스 테스트 통과
- [ ] 10K 벤치 실측 결과 PR description 첨부
- [ ] EXPLAIN 출력 PR description 첨부
- [ ] `nyquist_compliant: true` frontmatter 설정

**Approval:** pending

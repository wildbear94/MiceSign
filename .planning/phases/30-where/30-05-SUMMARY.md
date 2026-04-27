---
phase: 30-where
plan: 05
subsystem: backend-tools
tags: [bench, command-line-runner, jdbc-template, apache-bench, nfr-01, deferral]

requires:
  - phase: 30-04
    provides: "DocumentListPage useSearchParams + DrafterCombo + StatusFilterPills (URL ↔ UI 자동화 검증으로 I5 invariant 단위 테스트 21 green)"
  - phase: 30-03
    provides: "/api/v1/users/search 엔드포인트 (DrafterCombo 가 호출하는 자동완성 소스)"
  - phase: 30-02
    provides: "DocumentRepositoryCustomImpl 권한 predicate (EXISTS approval_line) — 부하 테스트 시 측정 대상"

provides:
  - "SearchBenchmarkSeeder.java (@Profile('bench') CommandLineRunner — 100 users + 10K documents + ~27K approval_lines, idempotent, baseUserId=1000+ 격리)"
  - "application-bench.yml (bench 프로필 전용 파라미터: user-count/document-count/batch-size/base-user-id)"
  - "scripts/bench-search.sh (3 시나리오 × ab -n 10000 -c 50, 95p/p99/RPS 자동 추출 + REPORT append)"
  - "30-BENCH-REPORT.md (실행 방법 6 단계 + EXPLAIN 표 + 판정 체크리스트 + V20 후보 A/B 문서화)"
  - "Phase 33 으로 이관된 NFR-01 실측 책임 (deferral decision 명시)"

affects:
  - "Phase 33 (E2E 검증 + 운영 전환): Success Criteria 2 의 95p ≤ 1초 실측이 본 plan 의 deferred 책임 인계처. SearchBenchmarkSeeder + bench-search.sh 그대로 재활용."
  - "운영 모니터링: slow query log + APM 신호가 인덱스 보강 트리거. 발동 시 V20 migration 후보 (idx_status_submitted / idx_approver_doc) 검토."

tech-stack:
  added: []
  patterns:
    - "@Profile('bench') CommandLineRunner — 운영 격리된 부하 테스트 인프라 (T-30-10 mitigation: prod 프로필 자동 차단)"
    - "JdbcTemplate 직접 사용 — JPA 엔티티 우회로 10K 삽입 성능 + 엔티티 의존성 최소화"
    - "결정론적 seed (Random seed=42) + idempotent cleanup (baseUserId 범위만 DELETE) — 재실행 안전성"
    - "ConfigurableApplicationContext.close() 자동 종료 패턴 — bootRun 으로 부팅 후 seed 완료 시 프로세스 자체 종료"
    - "ab -n × -c × -H 'Authorization: Bearer' + awk 로 95p/p99/mean/RPS 추출 → 마크다운 리포트 자동 append"
    - "Deferral 명시 패턴 — must_have 미충족을 무근거 PASS 가 아닌 명시적 'DEFERRED to Phase X' 로 기록 + 사유 + 재개 트리거 + 후속 게이트 문서화"

key-files:
  created:
    - backend/src/main/java/com/micesign/tools/SearchBenchmarkSeeder.java
    - backend/src/main/resources/application-bench.yml
    - scripts/bench-search.sh
    - .planning/phases/30-where/30-BENCH-REPORT.md
    - .planning/phases/30-where/30-05-SUMMARY.md
  modified:
    - .planning/phases/30-where/30-BENCH-REPORT.md  # 2026-04-28: Deferral Decision 섹션 + 측정/EXPLAIN/판정 섹션 갱신

key-decisions:
  - "T-3 deferral: 사용자 (drafter) 가 사내 ~50인 규모에서 10K/50동시 합성 부하의 측정 가치가 낮다고 판단 → NFR-01 실측을 Phase 33 + 운영 모니터링 게이트로 이관."
  - "인프라 (Task 1 + Task 2) 는 폐기하지 않고 그대로 보존 — 추후 부하 의심 시 즉시 재활용."
  - "URL 공유 재현 UAT 의 자동화 부분 (Plan 30-04 의 DocumentListPage.test.tsx 21 @Test) 은 검증된 것으로 채택, 브라우저 수동 부분만 deferral."

patterns-established:
  - "must_have 미달 시 deferral 절차: (1) 사용자 명시 결정 (2) BENCH-REPORT.md 등 산출물에 'Deferral Decision' 섹션 추가 (3) 사유 + 보존 산출물 + 후속 게이트 (어느 Phase / 어떤 트리거) + 재개 절차 문서화 (4) SUMMARY.md 의 deviations 에 Rule 2 로 기록 (5) verifier 단계에서 해당 must_have 를 명시적 deferred 로 인식할 수 있게 해야 함."
  - "@Profile('bench') 인프라 자체는 재사용 가능한 '도구' 로 보존 — phase 단위 deferral 이 코드 폐기를 의미하지 않음."

requirements-completed:
  - SRCH-06  # bench 인프라 (seeder + script + report 템플릿) 자체는 완성. 실측은 Phase 33 으로 이관.

requirements-deferred:
  - NFR-01   # 95p ≤ 1초 실측은 Phase 33 또는 운영 모리터링 게이트 발동 시 측정.

metrics:
  duration: ~5min  # BENCH-REPORT deferral 섹션 + SUMMARY 작성 시간 (Task 1+2 코드는 2026-04-25 기 commit 됨)
  completed: 2026-04-28
---

## Phase 30 Plan 05: SearchBenchmarkSeeder + bench-search.sh + Deferral 결정 — Summary

**SearchBenchmarkSeeder (10K 문서 + 100 사용자 idempotent seed) 와 bench-search.sh (3 시나리오 × ab) 인프라를 완성했고, 사용자 결정으로 NFR-01 95p ≤ 1초 실측은 Phase 33 (E2E 검증 + 운영 전환) 으로 이관함 (Deferral). 인프라는 그대로 보존되며 운영 모니터링 게이트 발동 시 즉시 재활용 가능하다.**

### Performance

- **Duration:** Task 1+2 = 2026-04-25 기 (총 ~30 min). Task 3 (deferral 결정 + 문서화) = 2026-04-28 ~5 min.
- **Completed:** 2026-04-28T (Asia/Seoul 기준)

### Accomplishments

**Task 1: SearchBenchmarkSeeder (commit `c4ec024`)**
- `@Profile("bench")` `CommandLineRunner` — `./gradlew bootRun --args='--spring.profiles.active=bench'` 로 활성
- 100 users (id 1000~1099) + 10,000 documents + 평균 3 행 approval_line/문서
- 분포: DRAFT 10% / SUBMITTED 30% / APPROVED 50% / REJECTED 7% / WITHDRAWN 3% — 운영 패턴 근사
- 결정론적 seed (`Random(42)`) — 반복 실행 시 동일 분포 재현
- Idempotent cleanup — `drafter_id BETWEEN 1000 AND 1099` 범위만 DELETE → V2 seed (id 1-20) 안전
- `LAST_INSERT_ID()` 기반 docId 회수 (auto_increment 안정)
- `ConfigurableApplicationContext.close()` 로 seed 완료 후 프로세스 자동 종료
- BCrypt 해시는 V2 SUPER_ADMIN 동일 (`admin1234!`) — 벤치 사용자로 직접 로그인 가능
- `application-bench.yml` 의 `bench.*` 파라미터로 규모 조정 (`user-count`, `document-count`, `batch-size`, `base-user-id`)
- T-30-10 mitigation: prod 프로필에서는 절대 실행되지 않아 운영 DB 오염 차단

**Task 2: bench-search.sh + 30-BENCH-REPORT.md (commit `e071dbd`)**
- `scripts/bench-search.sh` (chmod +x)
  - `BENCH_JWT` 환경변수 미설정 시 SUPER_ADMIN 수동 로그인 안내 후 `exit 1` (자동 로그인 없음 — Plan Revision 1 WARNING 4 일치)
  - 3 시나리오:
    1. 기본 검색 (`tab=search&page=0&size=20`)
    2. 키워드 검색 (`keyword=문서`)
    3. 복합 필터 (`status=SUBMITTED&status=APPROVED&templateCode=GENERAL&drafterId=1001`)
  - 각 시나리오 `ab -n 10000 -c 50 -H 'Authorization: Bearer'`
  - `awk` 로 95p/p99/mean/RPS/Failed 추출 → `30-BENCH-REPORT.md` 의 "실측 결과" 섹션에 자동 append
  - 95p < 1000ms 자동 PASS/FAIL 판정 + V20 권장 표시 (`bc` 사용)
- `30-BENCH-REPORT.md` 스캐폴드
  - 실행 방법 6 단계 (seed → 일반 재기동 → JWT → ab → EXPLAIN → URL UAT)
  - 측정 환경 표 (placeholder, deferral 후 placeholder 라벨로 갱신)
  - EXPLAIN 출력 표 2 시나리오 (deferral 후 `(deferred)` 셀로 갱신)
  - 판정 체크리스트 (NFR-01 × 3 + 인덱스 사용 × 3 + URL 공유 UAT × 3)
  - V20 후보 A (`idx_status_submitted (status, submitted_at DESC)`) / B (`idx_approver_doc (approver_id, document_id)`) 명시

**Task 3: 사용자 결정으로 Deferral (2026-04-28)**
- 사용자 (drafter) 명시 결정: 사내 ~50인 규모에서 10K/50동시 합성 부하 측정의 가치 < 운영 모니터링 신호의 가치 → NFR-01 실측을 Phase 33 + 운영 모니터링 게이트로 이관.
- BENCH-REPORT.md 상단에 "Deferral Decision" 섹션 추가 — 결정자 / 일자 / 사유 (3 항목) / 보존된 산출물 / 후속 단계 / 재개 트리거 / 막는 위험 vs 막지 않는 위험 명시.
- 측정 환경 / EXPLAIN / 실측 결과 / 판정 / 후속 조치 섹션 모두 `(deferred)` 또는 `[-]` 로 갱신 — 무근거 PASS 가 아닌 **명시적 미실시** 표기.

### Task Commits

1. **Task 1: SearchBenchmarkSeeder + application-bench.yml** — `c4ec024` (`feat(30-05): SearchBenchmarkSeeder + application-bench.yml — 10K seed runner`, 2026-04-25)
2. **Task 2: bench-search.sh + 30-BENCH-REPORT.md 스캐폴드** — `e071dbd` (`feat(30-05): bench-search.sh + 30-BENCH-REPORT.md 스캐폴드`, 2026-04-25)
3. **Task 3: BENCH-REPORT.md 의 Deferral Decision 갱신 + 30-05-SUMMARY.md 작성** — (this commit) `docs(30-05): defer NFR-01 measurement to Phase 33 — small-company scale rationale + plan SUMMARY`

### Files Created / Modified

**Created:**
- `backend/src/main/java/com/micesign/tools/SearchBenchmarkSeeder.java` (~277 lines, `commit c4ec024`)
- `backend/src/main/resources/application-bench.yml` (`commit c4ec024`)
- `scripts/bench-search.sh` (`commit e071dbd`)
- `.planning/phases/30-where/30-BENCH-REPORT.md` (`commit e071dbd`, then deferral 섹션 추가)
- `.planning/phases/30-where/30-05-SUMMARY.md` (this commit)

**Modified:**
- `.planning/phases/30-where/30-BENCH-REPORT.md` — Deferral Decision 섹션 추가 + 측정/EXPLAIN/판정/후속 조치 섹션을 deferral 표기로 갱신 (this commit)

### Verification Results

**자동 검증 (모두 PASS, 2026-04-28 재확인):**
- `./gradlew compileJava` exit 0 (Java 17 / Spring Boot 3.x 컴파일 그린)
- `bash -n scripts/bench-search.sh` exit 0 (syntax)
- `test -x scripts/bench-search.sh` exit 0 (executable)
- `grep` acceptance criteria 모두 PASS:
  - `@Profile("bench")` ✓ / `CommandLineRunner` ✓ / `context.close()` ✓ / `DELETE FROM approval_line` ✓ / `on-profile: bench` ✓
  - `ab -n` ✓ / `Authorization: Bearer` ✓ / `run_scenario` 4회 ✓
  - BENCH-REPORT.md 의 `NFR-01` ✓ / `EXPLAIN` ✓ / `V20` ✓
- I5 invariant (URL ↔ UI 동기화) — Plan 30-04 의 `DocumentListPage.test.tsx` `LocationDisplay` helper 가 21 @Test 로 자동 검증 (commit `e2de040`)

**수동 검증 (deferred):**
- 10K seed 실제 삽입 / EXPLAIN 인덱스 사용 / 95p ≤ 1000ms / 브라우저 수동 UAT — Phase 33 또는 운영 모니터링 게이트 발동 시.

### Deviations from Plan

**[Rule 2 - intent change] NFR-01 실측 미실시 (사용자 명시 결정)**
- Found during: Task 3 checkpoint 진입 시 (executor 가 검증 결과 보고 후 사용자 PASS 응답 대기 중)
- Issue: Plan must_have "측정된 95p 응답 시간이 1000ms 미만 (NFR-01 통과)" 와 "EXPLAIN 출력이 BENCH-REPORT.md 에 기록" 항목이 미충족 상태에서 사용자가 명시적 PASS 결정 요청
- Original intent: ab -n 10000 -c 50 으로 실제 95p 측정 + EXPLAIN 수집 + V20 필요성 결정
- Revised intent (사용자 결정 2026-04-28): 사내 ~50인 운영 규모 vs 10K/50동시 합성 부하의 가치 비대칭 → NFR-01 실측 책임을 Phase 33 + 운영 모니터링 게이트로 이관. 인프라 (Task 1 + Task 2) 는 보존하여 발동 시 재활용.
- Fix: BENCH-REPORT.md 의 모든 `_TBD_` placeholder 를 `(deferred)` / `[-]` 로 갱신하고 상단에 "Deferral Decision" 섹션 추가 — 사유 (3 항목), 보존 산출물, 후속 단계 (Phase 33 + 운영 트리거 3 종), 재개 절차, 막는 위험 vs 막지 않는 위험 모두 문서화.
- Files: `.planning/phases/30-where/30-BENCH-REPORT.md`
- Verification: deferral 사유가 명시되어 있고, NFR-01 의 후속 게이트 (Phase 33 Success Criteria 2) 가 ROADMAP.md 에 이미 존재함을 cross-reference 로 확인.
- Commit: this commit
- **Total deviations:** 1 (Rule 2 — 사용자 명시 결정).
- **Impact:** Phase 30 의 PR1 (hotfix 권한 predicate) + PR2 (필터 + URL sync + bench 인프라) 는 머지 가능. NFR 실측 게이트는 Phase 33 으로 이전. 운영 환경에서 검색 지연 신호 관측 시 본 인프라로 즉시 측정.

### Issues Encountered

**None blocking.** Deferral 결정은 issue 가 아닌 사용자 명시 의사결정으로 처리.

### Next Steps

**Phase 30 종결:**
- [x] PR1 (hotfix) 권한 predicate (Plan 30-01/02) — 운영 보안 사고 해소
- [x] PR2 (feature) 필터 + URL sync (Plan 30-03/04) — 21 @Test green
- [x] PR2 인프라 — bench seeder + script + report 템플릿 (Plan 30-05 Task 1+2)
- [x] PR2 NFR 실측 deferral 명시 (Plan 30-05 Task 3) — Phase 33 으로 이관
- [ ] PR description 작성 시 본 SUMMARY.md + BENCH-REPORT.md (특히 Deferral Decision 섹션) 링크 첨부 → 코드 리뷰 시 deferral 근거 가시화

**Phase 33 의 인계 사항:**
- Phase 33 Success Criteria 2 가 NFR-01 의 공식 게이트가 됨
- `SearchBenchmarkSeeder.java` + `scripts/bench-search.sh` + `30-BENCH-REPORT.md` 그대로 재활용 — 별도 인프라 작성 불필요
- 운영 SMTP 런북과 함께 NFR-01 실측을 Phase 33 의 단일 deliverable 로 통합

**운영 모니터링 게이트:**
- 운영 전환 후 1주차에 다음 신호 중 하나라도 관측되면 본 인프라로 즉시 재측정:
  - 사용자 체감 검색 지연 신고 1건 이상
  - MariaDB slow query log 에 `/api/v1/documents/search` 백엔드 쿼리가 1초 초과로 1회 이상 기록
  - 동시 활성 사용자 30 명 초과 시점 도달

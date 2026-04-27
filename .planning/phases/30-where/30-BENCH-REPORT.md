# Phase 30 Bench Report — SRCH-06 / NFR-01 실측

**목적:** 10,000 문서 + 100 사용자 seed 환경에서 `/api/v1/documents/search` 의 95p ≤ 1초 (NFR-01) 충족 여부를 실측 검증. 실측 결과는 PR2 description 에 첨부되어 코드 리뷰 시 객관적 근거로 사용.

**관련 결정:**
- D-D1: 기존 인덱스(`idx_drafter_status`, `idx_status`, `idx_template_code`, `idx_submitted_at`, `idx_approver_status`, `idx_document_step`)로 먼저 실측
- D-D2: EXPLAIN 결과에서 `type=ALL` (full scan) 발생 시 V20 migration 보강 후 재측정
- D-D5: Phase 30 내 간단 벤치 (CommandLineRunner + ab) — Phase 33 E2E 와 별도

---

## ⚠ Deferral Decision (2026-04-28)

**판정: DEFERRED — Phase 33 E2E 운영 모니터링으로 이관**

**결정자:** park sang young (drafter / 단독 의사결정자)
**결정 일자:** 2026-04-28

### 사유

본 시스템은 사내 ~50명 규모의 in-house 결재 시스템 (PROJECT.md "Core Value") 으로, 다음 이유로 10K 문서 / 50 동시 사용자 합성 부하 테스트는 운영 현실과 동떨어져 측정 가치가 낮다고 판단:

1. **운영 동시 사용자 수 ≪ 50** — 실제 동시 결재 처리는 일과 시간 중에도 한 자릿수 수준이 일반적이며, 50 동시 ab 부하는 운영 트래픽의 ~50배 초과.
2. **문서 누적량 < 10K (장기적으로도)** — 50명 × 일평균 1-2건 × 영업일 250일 = 연간 ~25,000건이지만 5년차에도 활성 검색 대상은 보통 3-12개월 윈도우로 좁혀지며 실효 인덱스 적용 row 수는 수천대.
3. **인프라 복잡도 vs 가치** — 합성 seed (10K + approval_line) 실행에 별도 DB 격리·복원 절차 필요. 운영 DB 관측 (slow query log, MariaDB performance_schema, APM) 이 더 신뢰성 있는 NFR 증거.

### 보존된 산출물

본 deferral 은 인프라 자체 (Task 1 + Task 2) 까지 폐기하지 않는다 — 추후 부하 의심이 생기거나 50인 → 200인 확장 시점에 즉시 재활용:

- `backend/src/main/java/com/micesign/tools/SearchBenchmarkSeeder.java` (`@Profile("bench")` 격리, `commit c4ec024`)
- `backend/src/main/resources/application-bench.yml` (`commit c4ec024`)
- `scripts/bench-search.sh` (3 시나리오 ab + 95p/p99/RPS 자동 추출, `commit e071dbd`)
- 본 BENCH-REPORT.md 의 "실행 방법" 섹션 6 단계

### 후속 단계 (NFR-01 의 실효 검증 경로)

1. **Phase 33 (E2E 검증 + 운영 전환)** 으로 NFR-01 실측 책임을 공식 이관. ROADMAP.md Phase 33 의 Success Criteria 2 ("10,000 문서 seed + 50 동시 사용자 부하 테스트에서 `/api/v1/documents/search` 95p ≤ 1초가 실측 통과") 가 본 결정의 후속 게이트.
2. **운영 모니터링 게이트** — 운영 전환 후 1주차에 다음 신호 중 하나라도 관측되면 본 인프라로 즉시 측정:
   - 사용자 체감 검색 지연 신고 1건 이상
   - MariaDB slow query log 에 `/api/v1/documents/search` 백엔드 쿼리가 1초 초과로 1회 이상 기록
   - 동시 활성 사용자 30 명 초과 시점 도달
3. **재측정 트리거 시 절차** — 본 리포트의 "실행 방법" 6 단계 그대로 수행 + EXPLAIN 수집 + V20 migration 후보 (idx_status_submitted / idx_approver_doc) 채택 검토.

### 본 deferral 이 막는 위험

- **막지 않는 위험:** 운영 환경에서 검색 지연이 실제로 발생할 가능성 — Phase 33 + 운영 모니터링 게이트로 커버.
- **막는 위험:** 합성 부하가 실제 패턴과 다른 경우의 거짓 PASS/FAIL (예: ab 의 동시 50 connection 이 운영 connection pool 동작을 왜곡, GC pause 패턴 차이 등).

---

## 실행 방법

### 1. Bench seed 생성 (약 2-5 분 소요)

```bash
cd backend
./gradlew bootRun --args='--spring.profiles.active=bench'
# 로그에서 '=== Bench Seed COMPLETE ===' 확인 후 프로세스 자동 종료
```

DB 검증:
```sql
SELECT COUNT(*) FROM document      WHERE drafter_id BETWEEN 1000 AND 1099;  -- 10000
SELECT COUNT(*) FROM `user`        WHERE id        BETWEEN 1000 AND 1099;  -- 100
SELECT COUNT(*) FROM approval_line WHERE document_id IN
  (SELECT id FROM document WHERE drafter_id BETWEEN 1000 AND 1099);         -- ~27000 (DRAFT 10% 제외 × 3 행)
```

### 2. 일반 프로필로 백엔드 재기동

```bash
cd backend && ./gradlew bootRun
```

### 3. SUPER_ADMIN JWT 획득

V2__seed_initial_data.sql 의 SUPER_ADMIN 계정:
- email: `admin@micesign.com`
- password: `admin1234!`

```bash
TOKEN=$(curl -s -X POST http://localhost:8080/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@micesign.com","password":"admin1234!"}' \
  | jq -r .data.accessToken)
export BENCH_JWT="$TOKEN"
echo "$BENCH_JWT" | head -c 40   # JWT 일부 확인
```

### 4. 부하 테스트 실행

```bash
# 프로젝트 루트에서
./scripts/bench-search.sh
# 3 시나리오 × 10000 requests × 50 concurrency, 약 1-3 분 소요
# 결과는 본 파일의 '실측 결과' 섹션에 자동 append
```

### 5. EXPLAIN 수동 수집

```bash
mysql -h <DB_HOST> -u <user> -p <database> << 'SQL'
EXPLAIN SELECT d.id FROM document d
  JOIN `user` u ON d.drafter_id = u.id
  WHERE EXISTS (
    SELECT 1 FROM approval_line al
    WHERE al.document_id = d.id AND al.approver_id = 1001
  )
  AND d.status != 'DRAFT'
  ORDER BY d.created_at DESC
  LIMIT 20;
SQL
```

출력 표를 아래 "EXPLAIN 출력" 섹션에 복붙.

### 6. 브라우저 URL 공유 UAT

`frontend/` 에서 `npm run dev` 실행 후 다음 URL 들을 직접 입력해 동작 확인:

- `http://localhost:5173/documents?tab=search&keyword=경비&status=SUBMITTED&status=APPROVED&drafterId=1001&page=0`
- 확인 항목:
  - keyword 입력창에 "경비" 표시
  - "결재 대기" + "승인" pill 이 active (파란 배경)
  - 기안자 콤보에 ID=1001 사용자 이름 로드
  - 다른 탭/시크릿 세션에서 같은 URL 열기 → 동일 결과 재현 (로그인 필요)

---

## 측정 환경

> **DEFERRED — 본 phase 에서는 측정 미실시.** Phase 33 또는 운영 모니터링 게이트 발동 시 채워질 예정.

| 항목 | 값 |
|---|---|
| 실행 일시 | (deferred to Phase 33) |
| Spring 프로필 | bench (seed) → default (측정) |
| seed 규모 (users / documents / approval_line) | (deferred) |
| 측정 머신 (호스트명 / OS / CPU / RAM) | (deferred) |
| MariaDB 버전 | (deferred) |
| Java 버전 | (deferred) |
| JWT 계정 role | SUPER_ADMIN (최악 케이스 — 권한 predicate skip 됨) |
| ab 버전 | (deferred) |

---

## EXPLAIN 출력

### 시나리오 1: 기본 검색 (approval_line EXISTS)

```sql
EXPLAIN SELECT d.id FROM document d
  JOIN `user` u ON d.drafter_id = u.id
  WHERE EXISTS (
    SELECT 1 FROM approval_line al
    WHERE al.document_id = d.id AND al.approver_id = 1001
  )
  AND d.status != 'DRAFT'
  ORDER BY d.created_at DESC
  LIMIT 20;
```

| id | select_type | table | type | possible_keys | key | rows | Extra |
|----|-------------|-------|------|---------------|-----|------|-------|
| (deferred) | (deferred) | (deferred) | (deferred) | (deferred) | (deferred) | (deferred) | (deferred) |

**Pass 기준:**
- `approval_line` 의 `type=ref` + `key=idx_approver_status`
- `document` 의 `type=range` 또는 `ref` + `key=idx_drafter_status` 또는 `idx_status`
- `type=ALL` (full scan) 이 핵심 테이블에서 발생하면 V20 migration 후보

### 시나리오 2: 키워드 + 복합 필터

```sql
EXPLAIN SELECT d.id FROM document d
  JOIN `user` u ON d.drafter_id = u.id
  WHERE d.status IN ('SUBMITTED', 'APPROVED')
    AND d.template_code = 'GENERAL'
    AND d.drafter_id = 1001
    AND (LOWER(d.title) LIKE LOWER('%문서%')
         OR LOWER(d.doc_number) LIKE LOWER('%문서%')
         OR LOWER(u.name) LIKE LOWER('%문서%'))
  ORDER BY d.created_at DESC
  LIMIT 20;
```

| id | select_type | table | type | possible_keys | key | rows | Extra |
|----|-------------|-------|------|---------------|-----|------|-------|
| (deferred) | (deferred) | (deferred) | (deferred) | (deferred) | (deferred) | (deferred) | (deferred) |

---

## 실측 결과

> **DEFERRED.** Phase 33 또는 운영 모니터링 게이트 발동 시 `./scripts/bench-search.sh` 실행 결과가 본 섹션에 append 될 예정.

---

## 판정

### 시나리오별 NFR-01 (95p ≤ 1000ms)

- [-] 시나리오 1: 기본 검색 — DEFERRED to Phase 33
- [-] 시나리오 2: 키워드 검색 — DEFERRED to Phase 33
- [-] 시나리오 3: 복합 필터 — DEFERRED to Phase 33

### EXPLAIN 인덱스 사용 확인

- [-] `approval_line` `idx_approver_status` 사용 검증 — DEFERRED
- [-] `document` `idx_drafter_status` / `idx_status` 사용 검증 — DEFERRED
- [-] `idx_submitted_at` / `idx_template_code` 활용 검증 — DEFERRED

### URL 공유 재현 UAT (I5 invariant)

> Plan 30-04 의 `DocumentListPage.test.tsx` `LocationDisplay` 단위 테스트가 URL ↔ UI 동기화를 자동 검증 (21 @Test green) — 브라우저 수동 UAT 의 자동화 대체.

- [x] 자동 단위 테스트로 URL → UI 복원 검증 완료 (Plan 30-04 commit `e2de040`)
- [-] 브라우저 수동 UAT — 부하 측정과 함께 Phase 33 으로 이관 (필요 시)

### 전체 판정

**판정:** **DEFERRED** (Phase 33 / 운영 모니터링 게이트로 이관)

**V20 migration 필요 여부:** **결정 보류** — 운영 환경에서 인덱스 풀스캔 신호 (slow query log) 관측 시 후보 A/B 검토.

- 미관측: 기존 V1 인덱스만 운용 (D-D1 가설 잠정 채택, 운영 검증으로 확정)
- 관측 시: Phase 33 또는 신규 hotfix phase 에서 다음 채택
  - V20 후보 A: `idx_status_submitted (status, submitted_at DESC)`
  - V20 후보 B: `idx_approver_doc (approver_id, document_id)`

**V20 migration 작성:** Phase 33 또는 운영 트리거 발동 시 작성.

---

## 후속 조치

### 본 phase 에서 (DEFERRED 결정 반영)
- [x] BENCH-REPORT.md 의 deferral 사유 + 보존 산출물 + 후속 단계 문서화 (본 리포트 상단 "Deferral Decision" 섹션)
- [ ] `30-05-SUMMARY.md` 작성 시 deferral 을 deviation 으로 기록 (Rule 2 — 사용자 결정 명시)
- [ ] Phase 33 의 SUCCESS Criteria 2 (10K seed + 50 동시 부하 95p ≤ 1초) 가 본 결정의 후속 게이트임을 SUMMARY 에 명시

### Phase 33 또는 운영 트리거 발동 시 재개 절차
- [ ] 본 리포트 상단 "실행 방법" 6 단계 그대로 수행 (`backend/.../SearchBenchmarkSeeder.java` + `scripts/bench-search.sh` 그대로 활용)
- [ ] EXPLAIN 결과를 본 리포트 "EXPLAIN 출력" 섹션 표에 기입
- [ ] 95p > 1초 시 V20 후보 채택 + `./gradlew flywayMigrate` + 재측정
- [ ] 본 리포트 "전체 판정" 을 DEFERRED → PASS / FAIL 로 갱신

---

## 참고

- **NFR-01:** 50 동시 사용자 / 10K 문서 환경에서 검색 응답 95p ≤ 1초 (REQUIREMENTS.md) — 본 phase 에서 측정 미실시, Phase 33 으로 이관.
- **D-D6 PR 분할:** PR1 (hotfix) = 권한 predicate, PR2 (feature) = 필터 + URL sync + 본 벤치 인프라 (실측 deferred).
- **Plan 30-05 SUMMARY 작성 트리거:** 사용자가 deferral 결정 (2026-04-28) 함에 따라 본 리포트의 "전체 판정" 이 DEFERRED 로 확정된 시점부터 SUMMARY.md 작성 가능.

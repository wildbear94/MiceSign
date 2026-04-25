# Phase 30 Bench Report — SRCH-06 / NFR-01 실측

**목적:** 10,000 문서 + 100 사용자 seed 환경에서 `/api/v1/documents/search` 의 95p ≤ 1초 (NFR-01) 충족 여부를 실측 검증. 실측 결과는 PR2 description 에 첨부되어 코드 리뷰 시 객관적 근거로 사용.

**관련 결정:**
- D-D1: 기존 인덱스(`idx_drafter_status`, `idx_status`, `idx_template_code`, `idx_submitted_at`, `idx_approver_status`, `idx_document_step`)로 먼저 실측
- D-D2: EXPLAIN 결과에서 `type=ALL` (full scan) 발생 시 V20 migration 보강 후 재측정
- D-D5: Phase 30 내 간단 벤치 (CommandLineRunner + ab) — Phase 33 E2E 와 별도

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

> 실측 시 채워주세요.

| 항목 | 값 |
|---|---|
| 실행 일시 | _TBD_ |
| Spring 프로필 | bench (seed) → default (측정) |
| seed 규모 (users / documents / approval_line) | _TBD_ / _TBD_ / _TBD_ |
| 측정 머신 (호스트명 / OS / CPU / RAM) | _TBD_ |
| MariaDB 버전 | _TBD_ |
| Java 버전 | _TBD_ |
| JWT 계정 role | SUPER_ADMIN (최악 케이스 — 권한 predicate skip 됨) |
| ab 버전 | _TBD_ (`ab -V` 출력) |

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
| _TBD_ | _TBD_ | _TBD_ | _TBD_ | _TBD_ | _TBD_ | _TBD_ | _TBD_ |

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
| _TBD_ | _TBD_ | _TBD_ | _TBD_ | _TBD_ | _TBD_ | _TBD_ | _TBD_ |

---

## 실측 결과

> `./scripts/bench-search.sh` 실행 시 본 섹션 아래에 자동 append 됩니다. 비어있다면 아직 실행 전.

---

## 판정

### 시나리오별 NFR-01 (95p ≤ 1000ms)

- [ ] 시나리오 1: 기본 검색 (필터 없음)
- [ ] 시나리오 2: 키워드 검색
- [ ] 시나리오 3: 복합 필터 (status×2 + templateCode + drafterId)

### EXPLAIN 인덱스 사용 확인

- [ ] `approval_line` EXISTS 서브쿼리에서 `idx_approver_status` 가 `ref` 타입으로 사용
- [ ] `document` 테이블에서 `idx_drafter_status` 또는 `idx_status` 가 사용 (full scan 없음)
- [ ] `idx_submitted_at` / `idx_template_code` 가 적절히 활용 (필터/정렬 결합 시)

### URL 공유 재현 UAT (I5 invariant)

- [ ] 브라우저에서 `?tab=search&keyword=경비&status=SUBMITTED&status=APPROVED&drafterId=1001` URL 직접 입력 시 필터 UI 가 정확히 재현
- [ ] 다른 탭/시크릿 세션에서 같은 URL 열기 → 동일 결과
- [ ] 뒤로가기 시 이전 필터 상태 복원

### 전체 판정

**판정:** _PASS / FAIL — 실측 후 기입_

**V20 migration 필요 여부:** _No / Yes_

- No 인 경우: 기존 V1 인덱스만으로 NFR-01 충족 → D-D1 가설 검증
- Yes 인 경우: 다음 중 어느 것 채택?
  - V20 후보 A: `idx_status_submitted (status, submitted_at DESC)` — 상태+기간 정렬 결합 쿼리
  - V20 후보 B: `idx_approver_doc (approver_id, document_id)` — approval_line EXISTS 가속

**V20 migration 작성 (FAIL 시):**

```sql
-- backend/src/main/resources/db/migration/V20__<name>.sql
-- TBD (FAIL 시 작성 후 재측정)
```

---

## 후속 조치

### PASS 시
- [ ] PR2 PR description 에 본 BENCH-REPORT.md 링크 첨부
- [ ] D-D2 skip — V20 migration 불필요
- [ ] 30-05-SUMMARY.md 작성, Phase 30 종결

### FAIL 시
- [ ] V20 migration 추가 (위 V20 후보 중 채택)
- [ ] `cd backend && ./gradlew flywayMigrate` 실행
- [ ] `./scripts/bench-search.sh` 재측정
- [ ] 본 리포트의 "실측 결과" 섹션에 재측정 데이터 추가, "판정" 섹션 갱신
- [ ] 그래도 FAIL 이면 추가 인덱스 또는 쿼리 리팩터 (covering index, projection 축소) 후보 검토

---

## 참고

- **NFR-01:** 50 동시 사용자 / 10K 문서 환경에서 검색 응답 95p ≤ 1초 (REQUIREMENTS.md)
- **D-D6 PR 분할:** PR1 (hotfix) = 권한 predicate, PR2 (feature) = 필터 + URL sync + 본 벤치
- **Plan 30-05 SUMMARY 작성 트리거:** 본 리포트의 "전체 판정" 이 PASS 또는 FAIL+V20 재측정 PASS 로 결정된 시점

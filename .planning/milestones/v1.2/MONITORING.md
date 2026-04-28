# MiceSign NFR-01 운영 모니터링 + 재실측 런북 (v1.2)

**작성:** 2026-04-28 (Phase 33-03, 결정 ID **D-S2**)
**대상 청자:** DBA / 운영자 (출시 담당 개발자가 §3 재실측 절차 수행 시 동석)
**선결 조건:**
- Phase 30 (검색 권한 + 필터) 완료, V19 까지의 인덱스 적용됨
- Plan 30-05 deferral 결정 합의 (`.planning/phases/30-where/30-BENCH-REPORT.md` §Deferral Decision 2026-04-28)
- Plan 30-05 산출물 보존 — `SearchBenchmarkSeeder.java` + `scripts/bench-search.sh` + `application-bench.yml` 미삭제

**참조:**
- 인계 결정: `.planning/phases/30-where/30-BENCH-REPORT.md` §Deferral Decision (D-S2 의 source)
- 인계 결정: `.planning/phases/30-where/30-05-SUMMARY.md` §Deviations from Plan (Rule 2 deferral 기록)
- 인계 결정: `.planning/phases/33-e2e/33-CONTEXT.md` §D-S2 (3 신호 채택)
- **역참조:** `.planning/milestones/v1.2/SMTP-RUNBOOK.md` §6.4 가 본 문서를 cross-reference. SMTP 운영 게이트는 SMTP-RUNBOOK 책임, 검색 성능 게이트는 본 문서 책임 — 두 문서는 청자 (사내 IT vs DBA) 와 트리거 (메일 발송 실패 vs 검색 지연) 가 달라 의도적으로 분리됨.
- Plan 30-05 보존 산출물:
  - `backend/src/main/java/com/micesign/tools/SearchBenchmarkSeeder.java` — `@Profile("bench")` 10K 문서 idempotent seeder
  - `backend/src/main/resources/application-bench.yml` — bench profile 설정
  - `scripts/bench-search.sh` — 3 시나리오 ab 부하 + REPORT auto-append

---

## 목차

1. 본 문서의 목적 + 위치
2. MariaDB `slow_query_log` 활성화 + 영구화 + log rotation
3. 3 신호 정의 (D-S2) — 발동 트리거
4. 신호 발동 시 재실측 절차 — Plan 30-05 인프라 재활용
5. 의사결정 플로우 + 본 문서가 다루지 않는 것

---

## §1. 본 문서의 목적 + 위치

### 1.1 본 문서가 책임지는 것

NFR-01 (`/api/v1/documents/search` 응답 95p ≤ 1초, 10K 문서 + 50 동시 부하 기준) 의 **운영 모니터링 게이트**.

구체적으로:
- MariaDB `slow_query_log` 활성화 + 영구화 + 디스크 보호 절차 (§2)
- 운영 환경에서 NFR-01 위반 가능성을 감지하는 **3 신호** 정의 + 일일/주간 점검 SQL (§3)
- 신호 발동 시 Plan 30-05 의 보존 인프라 (`SearchBenchmarkSeeder` + `bench-search.sh`) 를 그대로 재활용하여 합성 부하 실측을 재개하는 절차 (§4)
- 측정 결과 → V20 migration 후보 검토 → 출시 게이트의 의사결정 플로우 (§5)

### 1.2 본 문서의 위치 — Plan 30-05 deferral 의 후속 게이트

Plan 30-05 가 NFR-01 합성 부하 실측 (10K seed + 50 동시 ab) 을 **DEFERRED** 결정한 배경 (BENCH-REPORT.md §Deferral Decision):

> "본 시스템은 사내 ~50명 규모의 in-house 결재 시스템 (PROJECT.md 'Core Value') 으로, 다음 이유로 10K 문서 / 50 동시 사용자 합성 부하 테스트는 운영 현실과 동떨어져 측정 가치가 낮다고 판단:
> 1. 운영 동시 사용자 수 ≪ 50
> 2. 문서 누적량 < 10K (장기적으로도)
> 3. 합성 seed 의 인프라 복잡도 vs 가치"

본 문서는 이 deferral 의 **후속 게이트** — 합성 측정을 영구 폐기하지 않고 **운영 신호 기반 발동형 게이트** 로 대체. 인프라 자체 (Task 1 + Task 2 = `SearchBenchmarkSeeder` + `bench-search.sh`) 는 보존되어 발동 시 즉시 재활용.

### 1.3 SMTP-RUNBOOK 과의 관계

`SMTP-RUNBOOK.md` §6.4 ("NFR-01 운영 모니터링 — Cross-reference") 가 본 문서를 명시적으로 위임:

> "본 런북은 SMTP 운영에 집중. NFR-01 (검색 응답 95p ≤ 1초) 의 운영 모니터링은 별도 문서 책임:
> - 참조: `.planning/milestones/v1.2/MONITORING.md` (Phase 33-03 산출물)
> - 신호 발동 시: `MONITORING.md` 의 재실측 절차 (= `SearchBenchmarkSeeder` + `bench-search.sh` 재활용)"

청자 분리:
- **SMTP-RUNBOOK.md** — 사내 IT (메일 릴레이 협업) + 출시 담당 개발자
- **MONITORING.md** (본 문서) — DBA + 운영자 (검색 지연 신고 접수자) + 측정 재개 시 출시 담당 개발자

### 1.4 본 문서가 다루지 않는 것 (Deferred / Out-of-scope)

- **자동 cron 알림 파이프라인** — D-S2 신호 (b/c) 의 SQL 점검을 cron 화하여 Slack/SMS/PagerDuty 자동 통보. 50인 규모 + 주간 수동 SQL 로 충분하다고 판단. 운영 워크로드 증가 (예: 200인 확장) 시점 또는 v1.3/Phase 1-C 에서 검토.
- **APM 도구 도입** (DataDog / NewRelic / Pinpoint / Pyroscope) — 부하가 실제 발생하는 시점에 검토. 현재는 MariaDB `slow_query_log` + 사용자 신고로 충분하다고 판단 (33-CONTEXT §Deferred 명시).
- **분산 측정 / 다중 인스턴스 부하** — PRD 의 "사내 단일 서버 systemd" 가정 (PROJECT.md Constraints) 과 충돌. v2 또는 분산 전환 시 별도 phase.
- **검색 성능 보강 코드 변경** (V20 후보 인덱스 추가, fetch join 재작성, countDistinct 최적화 등) — 본 문서는 측정 + 의사결정 플로우만. 실제 보강은 신호 발동 후 별도 GSD phase (`/gsd:debug` 또는 후속 search-perf phase) 로 분리.

---

## §2. MariaDB `slow_query_log` 활성화 (1회 작업)

본 § 의 모든 명령은 운영 DB (MariaDB 10.11+) 에서 1회 수행. 출시 직전 또는 출시 직후 D+1 이내 완료 권장.

### 2.1 임시 활성화 (재시작 시 초기화 — 검증용)

```sql
SET GLOBAL slow_query_log = ON;
SET GLOBAL long_query_time = 1.0;       -- NFR-01 의 95p ≤ 1초 와 동기화
SET GLOBAL slow_query_log_file = '/var/log/mysql/slow.log';
SET GLOBAL log_output = 'FILE,TABLE';   -- file (grep 용) + mysql.slow_log table (SQL 용) 둘 다
```

검증:
```sql
SHOW VARIABLES LIKE 'slow_query%';
SHOW VARIABLES LIKE 'long_query_time';
SHOW VARIABLES LIKE 'log_output';
```

기대 출력:
- `slow_query_log` = `ON`
- `long_query_time` = `1.000000`
- `slow_query_log_file` = `/var/log/mysql/slow.log`
- `log_output` = `FILE,TABLE`

### 2.2 영구화 (재시작 후 유지)

`/etc/mysql/mariadb.conf.d/50-server.cnf` 의 `[mysqld]` 섹션에 추가:

```ini
[mysqld]
# --- NFR-01 모니터링 (Phase 33-03 D-S2) ---
slow_query_log = 1
long_query_time = 1.0
slow_query_log_file = /var/log/mysql/slow.log
log_output = FILE,TABLE
```

적용:
```bash
sudo systemctl restart mariadb
mysql -uroot -e "SHOW VARIABLES LIKE 'slow_query%';"
```

기대: §2.1 의 임시 활성화와 동일 출력 (재시작 후에도 유지).

### 2.3 로그 파일 권한

```bash
sudo install -d -o mysql -g mysql -m 750 /var/log/mysql
sudo touch /var/log/mysql/slow.log
sudo chown mysql:mysql /var/log/mysql/slow.log
sudo chmod 640 /var/log/mysql/slow.log
```

### 2.4 log rotation (디스크 full 방지 — T-33-10 mitigation)

`/etc/logrotate.d/mariadb-slow` 신규 작성:

```
/var/log/mysql/slow.log {
    weekly
    rotate 12
    compress
    delaycompress
    missingok
    notifempty
    sharedscripts
    create 640 mysql mysql
    postrotate
        mysqladmin -uroot flush-logs
    endscript
}
```

**검증:**
```bash
sudo logrotate -d /etc/logrotate.d/mariadb-slow   # dry-run, "rotating" 출력 확인
sudo logrotate -f /etc/logrotate.d/mariadb-slow   # 강제 1회 실행
ls -la /var/log/mysql/                             # slow.log + slow.log.1 확인
```

**일일 점검 SQL — 어제 슬로우 쿼리 요약:**
```sql
SELECT
  DATE(start_time) AS day,
  COUNT(*)         AS slow_count,
  MAX(query_time)  AS max_query_time,
  ROUND(AVG(query_time), 3) AS avg_query_time
FROM mysql.slow_log
WHERE start_time >= DATE_SUB(NOW(), INTERVAL 1 DAY)
GROUP BY DATE(start_time);
```

**주간 집계 SQL — 검색 백엔드 쿼리만 시나리오별 분포:**
```sql
SELECT
  DATE(start_time) AS day,
  COUNT(*)         AS slow_count,
  MAX(query_time)  AS p100,
  ROUND(AVG(query_time), 3)                                 AS avg,
  ROUND(SUBSTRING_INDEX(GROUP_CONCAT(query_time ORDER BY query_time SEPARATOR ','),
                        ',', CEIL(COUNT(*) * 0.95)), 3)     AS p95_approx
FROM mysql.slow_log
WHERE start_time >= DATE_SUB(NOW(), INTERVAL 7 DAY)
  AND sql_text LIKE '%FROM document%'
  AND sql_text LIKE '%approval_line%'
GROUP BY DATE(start_time)
ORDER BY day DESC;
```

파일 모드 백업 점검 (TABLE 모드가 비활성화된 비상 시):
```bash
sudo grep -B 1 -A 5 'FROM document' /var/log/mysql/slow.log \
  | grep 'Query_time:' \
  | awk '{print $2}' \
  | sort -n -r \
  | head -20
```

---

## §3. 3 신호 정의 — D-S2

본 § 는 33-CONTEXT.md 의 **D-S2 결정** 을 그대로 실행. 아래 **3 신호 중 하나라도** 발동 시 §4 재실측 절차로 진입.

### 3.1 신호 (a) — 사용자 체감 검색 지연 신고

- **트리거 조건:** 내부 사용자 1명 이상이 "문서 검색이 느리다", "결과가 안 나온다", "검색이 멈춘다" 등을 신고.
- **관측 채널:** 사내 메신저 / 이메일 / GSD issue tracker / 직접 보고.
- **1차 대응:**
  1. 신고자에게 ack 회신 + 신고 시각/검색 키워드/필터 조합 청취.
  2. 운영자가 §4 재실측 절차로 즉시 진입.
  3. 동시에 §3.2 신호 (b) SQL 을 7일 → 24시간 → 1시간 윈도우로 좁혀 신고와 시간적 상관관계 확인.
- **이 신호의 가치:** 합성 부하 측정으로 잡히지 않는 실제 사용 패턴 (예: 특정 키워드 + 특정 필터 조합) 의 회귀를 가장 빠르게 포착.

### 3.2 신호 (b) — `slow_query_log` 의 검색 쿼리 1초 초과

- **트리거 조건:** §2.4 의 주간 집계 SQL 결과에서 `slow_count > 0` 한 행이라도 발견. 즉 지난 7일 내 `/api/v1/documents/search` 의 백엔드 SQL (Hibernate 가 발급하는 `SELECT ... FROM document ... approval_line ...`) 이 1초 초과로 1회 이상 기록됨.
- **관측 방법:**
  - **주기:** 매주 월요일 오전 (DBA / 운영자) — 주간 집계 SQL 실행.
  - **일일 옵션:** §2.4 의 일일 점검 SQL 을 매일 오전 실행하여 24시간 내 발생 추세 확인.
- **1차 대응:**
  1. `slow_count` 가 1-2 → §2.4 의 SQL 의 윈도우를 1시간 단위로 좁혀 시간대 / 동시 활동 사용자수와 상관관계 확인. 일시적 일회성이면 §3.4 의 cumulative 카운트만 갱신, §4 재실측은 보류.
  2. `slow_count >= 3` 또는 매주 반복 발생 → §4 재실측 절차로 진입 (cumulative 패턴 의심).
  3. `max_query_time > 3.0` 이면 즉시 §4 재실측 (`p95 > 1.0` 인 위험 신호).
- **이 신호의 가치:** 사용자 신고 전에 백엔드 측에서 객관적으로 측정되는 1차 알람.

### 3.3 신호 (c) — 동시 활성 사용자 30명 초과

- **트리거 조건:** 직전 5분 윈도우 내 활동한 distinct user 수가 30명 이상에 도달.
- **관측 방법:** `audit_log` 기반 근사치 SQL (별도 세션 추적 테이블 미도입 — D-S2 결정).

  ```sql
  -- 지난 5분 활동 사용자 수 (근사치)
  SELECT COUNT(DISTINCT actor_id) AS active_users
  FROM audit_log
  WHERE created_at >= DATE_SUB(NOW(), INTERVAL 5 MINUTE);
  ```

  > **참고:** `audit_log.actor_id` 컬럼명은 V1 schema 기준. 실제 컬럼명이 `user_id` 라면 운영 시점에 컬럼명 치환 (DBA 가 `DESC audit_log` 로 사전 확인 후 SQL 적용).

- **1차 대응:**
  1. `active_users >= 30` 도달 → 사전 예방적 §4 재실측 (실제 부하 발생 전에 95p 마진 확인).
  2. 도달이 일과 시간 피크 (10-11시, 14-15시 등) 에 한정 → 피크 윈도우만 ab 부하 재현하여 측정.
  3. 도달이 지속 (30분 이상 유지) → 50인 환경의 정상 패턴을 초과한 상태 — 회사 인원 증가 / 외부 연동 의심, 인프라 capacity planning 별도 phase.
- **이 신호의 가치:** Plan 30-05 deferral 의 가정 (운영 동시 사용자 ≪ 50) 이 깨지는 시점을 포착.
- **자동화 (선택):** cron 으로 active_users 임계 알람을 자동화하는 옵션은 §1.4 에 따라 본 문서 범위 밖. 발동 시점에 별도 plan 으로 추가.

### 3.4 신호 발동 cumulative 카운트

운영자가 신호 발동을 트래킹할 간이 시트 (예: `.planning/milestones/v1.2/MONITORING-LOG.md` 또는 사내 위키) 에 다음 형식 행 추가:

| 일자 | 신호 | 상세 (slow_count / active_users / 신고 키워드) | 1차 대응 결과 | §4 진입 여부 |
|------|------|------|----------|--------|
| 2026-MM-DD | (a) | "검색이 느려요" 신고 1건, 키워드='월간보고' | ack + §3.2 윈도우 좁혀 확인 | 진입함 |
| 2026-MM-DD | (b) | 7일 slow_count=2, max_query_time=1.4s | 윈도우 1시간 좁힘, 일회성 패턴 | 보류 (cumulative 4회 도달 시 재검토) |

**누적 정책:** §3.4 의 보류 행이 3개월 내 3회 이상 누적되면 §4 진입을 강제 (cumulative regression 의심).

---

## §4. 신호 발동 시 재실측 절차 — Plan 30-05 인프라 재활용

> ## ⚠ 운영 DB 격리 경고 (T-33-12 mitigation — 필수 사전 확인)
>
> 본 § 의 모든 명령은 **반드시 운영 DB 와 격리된 환경에서만 수행**한다.
>
> - **권장:** staging DB (운영 DB 의 최근 dump 를 별도 인스턴스에 복원) 또는 별도 dev/bench 전용 DB 인스턴스.
> - **`@Profile("bench")` 격리:** Plan 30-05 의 `SearchBenchmarkSeeder` 는 `@Profile("bench")` 어노테이션으로 prod / dev 프로필에서는 자동 비활성화된다. 즉 운영 서버에 실수로 `bench` profile 을 주입하지 않는 한 운영 DB 에 10K seed 가 INSERT 되지 않는다.
> - **`baseUserId=1000+` 격리는 보조 수단:** SearchBenchmarkSeeder 가 user_id 1000-1099 / drafter_id 1000-1099 범위로 격리 INSERT 하지만, 이는 운영 DB 에 실행되었을 때 충돌 회피 목적이지 운영 데이터 무결성 보장 수단이 아니다. 동일 ID 범위의 운영 row 가 미래에 추가되면 충돌 가능.
> - **출시 담당자 사전 확인 의무:**
>   1. `echo $SPRING_PROFILES_ACTIVE` — `bench` 만 포함되었는지.
>   2. `mysql -e "SELECT @@hostname, DATABASE()"` — staging / dev 인스턴스인지.
>   3. 운영 DB 에 절대 연결 안 됨을 application-bench.yml 의 `spring.datasource.url` 로 재확인.
> - **사고 시나리오:** 운영 서버 SSH 콘솔에서 실수로 `--spring.profiles.active=bench,prod` 를 동시 활성화하면 격리가 깨진다. 의도적이지 않다면 절대 prod 와 bench 를 함께 활성화하지 말 것.

### 4.1 보존된 산출물 사전 확인

```bash
cd /path/to/MiceSign  # repo root
test -f backend/src/main/java/com/micesign/tools/SearchBenchmarkSeeder.java  && echo PASS || echo MISSING
test -f backend/src/main/resources/application-bench.yml                     && echo PASS || echo MISSING
test -f scripts/bench-search.sh                                              && echo PASS || echo MISSING
```

전부 PASS 인지 확인. MISSING 발생 시:
```bash
git log --all -- \
  backend/src/main/java/com/micesign/tools/SearchBenchmarkSeeder.java \
  backend/src/main/resources/application-bench.yml \
  scripts/bench-search.sh
# → commit c4ec024 / e071dbd 에서 복원
```

### 4.2 Step 1 — bench profile 로 10K seed 실행

```bash
cd backend
./gradlew bootRun --args='--spring.profiles.active=bench'
# 첫 실행 시 약 2-5분 소요 (10K 문서 + approval_line + content INSERT).
# 동일 프로파일 재실행 시 SearchBenchmarkSeeder 의 idempotent 검사로 skip.
# 로그 끝에 "=== Bench Seed COMPLETE ===" 확인 후 Ctrl+C 또는 자동 종료.
```

DB 검증 (staging DB 에서):
```sql
SELECT COUNT(*) FROM document      WHERE drafter_id BETWEEN 1000 AND 1099;  -- 기대 10000
SELECT COUNT(*) FROM `user`        WHERE id        BETWEEN 1000 AND 1099;  -- 기대 100
SELECT COUNT(*) FROM approval_line WHERE document_id IN
  (SELECT id FROM document WHERE drafter_id BETWEEN 1000 AND 1099);         -- 기대 ~27000 (DRAFT 10% 제외 × 3 행)
```

### 4.3 Step 2 — 일반 프로필로 백엔드 재기동 + JWT 획득

```bash
cd backend && ./gradlew bootRun
# 별도 터미널에서:
TOKEN=$(curl -s -X POST http://localhost:8080/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@micesign.com","password":"admin1234!"}' \
  | jq -r .data.accessToken)
export BENCH_JWT="$TOKEN"
echo "$BENCH_JWT" | head -c 40   # JWT 일부 sanity check
```

### 4.4 Step 3 — `bench-search.sh` 3 시나리오 ab 부하

```bash
cd /path/to/MiceSign
BENCH_JWT="$BENCH_JWT" ./scripts/bench-search.sh
# 환경변수 옵션:
#   BENCH_BASE_URL    (기본 http://localhost:8080)
#   BENCH_N           (기본 10000 — 총 요청 수)
#   BENCH_CONCURRENCY (기본 50  — 동시 connection)
```

스크립트가 자동 수행:
- 시나리오 1: 기본 검색 (필터 없음)
- 시나리오 2: 키워드 검색 (`q=` 파라미터)
- 시나리오 3: 복합 필터 (status + 결재 라인 + 기간)
- 결과를 `.planning/phases/30-where/30-BENCH-REPORT.md` 의 "실측 결과" 섹션에 자동 append (T-33-13 mitigation — 결과 누락 불가능).

### 4.5 Step 4 — EXPLAIN 수동 수집 (시나리오 1, 2)

`bench-search.sh` 가 ab 측정만 수행하므로 EXPLAIN 은 별도로:

```sql
-- 시나리오 1 (기본 검색) — Hibernate query log 또는 SearchService 의 실제 SQL 복사
EXPLAIN
SELECT d.* FROM document d
WHERE d.drafter_id = ?
   OR EXISTS (
     SELECT 1 FROM approval_line al
     WHERE al.document_id = d.id AND al.approver_id = ?
   )
ORDER BY d.submitted_at DESC LIMIT 20;

-- 시나리오 2 (키워드 검색) — JOIN document_content
EXPLAIN
SELECT d.* FROM document d
LEFT JOIN document_content dc ON dc.document_id = d.id
WHERE (d.title LIKE ? OR dc.body LIKE ?)
  AND ( d.drafter_id = ? OR EXISTS (...) )
ORDER BY d.submitted_at DESC LIMIT 20;
```

`type=ALL` (full scan) 또는 `Using filesort` 발견 시 §4.7 의 V20 후보 검토.

### 4.6 Step 5 — `30-BENCH-REPORT.md` 갱신

bench-search.sh 의 auto-append 결과를 사람이 검수 + 다음 갱신:
- 상단 §Deferral Decision 의 **판정** 라인을 `DEFERRED` → `PASS` (95p ≤ 1.0s) 또는 `FAIL` (95p > 1.0s) 로 변경.
- §실측 결과 표에 측정 일자 / 환경 / hardware spec 입력.
- §EXPLAIN 출력 표 (시나리오 1, 2) 의 `(deferred)` cell 을 §4.5 결과로 갱신.
- §후속 조치 섹션에 본 재실측의 트리거 신호 (a/b/c 중 하나) 와 cumulative 카운트 (§3.4) 인용.

### 4.7 Step 6 — FAIL 시 V20 migration 후보 검토

`/path/to/MiceSign/backend/src/main/resources/db/migration/V20__*.sql` 후보:

| 후보 인덱스 | 컬럼 조합 | 적용 시나리오 | 근거 |
|-------------|-----------|---------------|------|
| `idx_status_submitted` | `(status, submitted_at DESC)` | 기본 목록 + 최신순 정렬 | Plan 30-02 EXPLAIN 에서 `Using filesort` 가 status 필터 + submitted_at ORDER BY 조합에서 발견됨 |
| `idx_approver_doc` | `approval_line(approver_id, document_id, status)` | EXISTS subquery 의 covering index | 결재자 권한 검색이 N+1 으로 의심될 때 |

적용 절차:
```bash
# 1. V20 migration 작성 (별도 phase 로 plan 작성 권장)
vi backend/src/main/resources/db/migration/V20__add_search_indexes.sql

# 2. staging 에 flywayMigrate (운영 DB 직접 적용 절대 금지 — 별도 출시 프로세스로)
cd backend && ./gradlew flywayMigrate -Pspring.profiles.active=bench

# 3. §4.4 Step 3 부하 재측정 (V20 적용 후)
BENCH_JWT="$BENCH_JWT" ./scripts/bench-search.sh

# 4. 95p ≤ 1.0s 재달성 확인 → 본 V20 을 운영 출시 plan 으로 승격
```

V20 적용 자체는 **본 문서 범위 밖** — 별도 GSD phase 로 분리 (`/gsd:execute-phase NN-search-perf` 또는 `/gsd:debug`).

---

## §5. 의사결정 플로우 + 종료 조건

### 5.1 신호 발동 → 재실측 → 보강의 의사결정 체크리스트

```
[신호 (a) 사용자 신고] ──┐
[신호 (b) slow_query_log >0] ─┼─→ §3.4 cumulative 카운트 행 추가
[신호 (c) active_users >=30] ─┘                     │
                                                     ▼
                              ┌──────────────────────────────┐
                              │ 1차 대응 가능 (윈도우 좁히기) │
                              └─────────────┬────────────────┘
                              일회성 패턴 ◄──┴──► 패턴 의심 / 누적 3회
                                  │                  │
                                  ▼                  ▼
                              §3.4 보류 행      §4 재실측 절차 진입 ──┐
                                                                       │
                                       Step 1-3: bench seed + ab 부하  │
                                                                       │
                                       Step 4: EXPLAIN 수집 ───────────┤
                                                                       │
                                       Step 5: 30-BENCH-REPORT 갱신    │
                                                                       │
                                                                       ▼
                                                      ┌───── PASS (95p ≤ 1.0s) ──→ 운영 가속 유지, §3.4 cumulative 리셋
                                                      │
                                                      └───── FAIL (95p > 1.0s) ──→ Step 6: V20 migration 후보 검토
                                                                                          │
                                                                                          ▼
                                                                                별도 GSD phase 로 분리 (search-perf)
```

### 5.2 본 모니터링 게이트의 종료 조건

아래 둘 중 하나에 도달 시 본 게이트는 v1.3 또는 후속 마일스톤으로 이관 검토:

1. **3 신호가 6개월간 무발동** — NFR-01 운영 안정 입증 + 모니터링 부담만 잔존. APM 도구 도입 검토 (§1.4 에 따라 본 문서 범위 밖) 또는 본 문서의 §3 SQL 을 dashboard 화 (사내 Grafana 도입 시).
2. **신호 발동 → 재실측 → 보강 → 재측정 PASS 사이클 1회 이상 완료** — 본 게이트의 효용 검증됨, 동일 패턴을 v1.3 의 다른 NFR (NFR-02 / NFR-03 등) 에 확장 적용.

종료 결정은 본 문서 범위 밖 — `/gsd:complete-milestone v1.2` 시점 또는 별도 결정 세션에서 ROADMAP.md 갱신과 함께 처리.

### 5.3 변경 이력

| 일자 | 변경 | 작성자 |
|------|------|--------|
| 2026-04-28 | v1.2 초판 (Phase 33-03 D-S2) | (출시 담당) |

---

*문서 끝. 본 문서는 NFR-01 합성 부하 실측의 **운영 게이트 단일 source** — 출시 후 §2 활성화 + §3 정기 점검 + 신호 발동 시 §4 재실측. 본 게이트의 deferral 사유 + 보존 산출물 + 재개 절차는 모두 자기완결적으로 본 문서에 담김.*

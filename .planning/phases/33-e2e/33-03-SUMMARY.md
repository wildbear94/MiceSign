---
phase: 33
plan: 03
subsystem: ops
tags: [monitoring, nfr-01, slow-query-log, deferral-followup, runbook, dba]
requires:
  - .planning/phases/30-where/30-BENCH-REPORT.md   # 2026-04-28 Deferral Decision (D-S2 source) + 보존 산출물 cross-reference
  - .planning/phases/30-where/30-05-SUMMARY.md     # Rule 2 deferral 기록 (Plan 30-05)
  - .planning/phases/33-e2e/33-CONTEXT.md          # D-S2 (3 신호 채택)
  - backend/src/main/java/com/micesign/tools/SearchBenchmarkSeeder.java   # 재활용 (인용만 — 코드 수정 없음)
  - backend/src/main/resources/application-bench.yml                       # 재활용 (인용만)
  - scripts/bench-search.sh                                                 # 재활용 (인용만)
  - .planning/milestones/v1.2/SMTP-RUNBOOK.md      # §6.4 가 본 산출물을 cross-reference (역방향 link)
provides:
  - "NFR-01 운영 모니터링 게이트 — slow_query_log 활성화 + 영구화 + logrotate (§2)"
  - "D-S2 3 신호 정의 + 일일/주간 점검 SQL + cumulative 카운트 정책 (§3)"
  - "신호 발동 시 Plan 30-05 인프라 재활용 6 step + T-33-12 운영 DB 격리 경고 + V20 migration 후보 검토 (§4)"
  - "의사결정 플로우 + 게이트 종료 조건 (§5)"
affects:
  - .planning/milestones/v1.2/AUDIT.md             # 33-04 Plan 의 Deferred 추적 섹션이 본 문서를 NFR-01 의 보존 경로 source 로 인용 예정
tech-stack:
  added: []
  patterns:
    - "MariaDB 10.11 slow_query_log + log_output=FILE,TABLE 동시 활용 — file (grep) + table (SQL) 양 모드 점검"
    - "logrotate (weekly + rotate 12 + compress) 로 슬로우 로그 디스크 full 방지 (T-33-10 mitigation)"
    - "신호 → cumulative 카운트 → 발동 임계 (3회 또는 max_query_time>3.0) → §4 진입 의사결정 패턴"
    - "Plan 30-05 deferral 의 후속 게이트 패턴 — 보존 인프라 (SearchBenchmarkSeeder + bench-search.sh) 재활용 절차 자기완결적 문서화"
key-files:
  created:
    - .planning/milestones/v1.2/MONITORING.md
  modified: []
decisions:
  - "D-S2 3 신호 (a) 사용자 신고 1건 (b) slow log 1초 초과 1회 (c) active_users >=30 명 — Plan 30-05 deferral 의 트리거를 그대로 채택, 절차로 구체화"
  - "MONITORING.md 와 SMTP-RUNBOOK.md 분리 — DBA/운영자 vs 사내 IT/출시담당 청자 구분, 트리거 (검색 지연 vs 메일 발송 실패) 도 분리"
  - "T-33-12 mitigation 강화 — `@Profile(\"bench\")` 격리 + baseUserId=1000+ 보조 + 운영 DB 격리 경고 박스 + 출시 담당자 사전 확인 3 항목 (SPRING_PROFILES_ACTIVE / hostname / datasource.url)"
  - "V20 후보 인덱스 2 안 (idx_status_submitted / idx_approver_doc) 만 명시 — 실제 적용은 본 문서 범위 밖, 별도 GSD phase 로 분리"
metrics:
  duration: "~5min"
  date: "2026-04-28"
requirements: [NFR-01]
---

# Phase 33 Plan 03: NFR-01 운영 모니터링 게이트 — Summary

**Plan 30-05 가 deferral 결정한 NFR-01 합성 부하 실측을 운영 신호 기반 발동형 게이트로 대체했다. `MONITORING.md` (450 lines, 5 섹션) 가 slow_query_log 활성화 + 3 신호 정의 + 신호 발동 시 보존 인프라 (SearchBenchmarkSeeder + bench-search.sh) 재활용 절차를 자기완결적으로 담는다.**

## What Was Done

### Task 1: `MONITORING.md` 작성 — 단일 deliverable

`.planning/milestones/v1.2/MONITORING.md` (450 lines) 신규 작성. 5 섹션:

**§1. 본 문서의 목적 + 위치**
- 1.1 책임 범위 — slow_query_log 활성화 / 3 신호 / 재실측 / V20 의사결정
- 1.2 Plan 30-05 deferral 의 후속 게이트로 자리 매김 — BENCH-REPORT §Deferral Decision 사유 인용 (사내 50인 ≪ 50 동시 / 문서 < 10K / 합성 비용 vs 가치)
- 1.3 SMTP-RUNBOOK.md §6.4 역참조 명시 — 두 문서의 청자 / 트리거 분리
- 1.4 다루지 않는 항목 (Out-of-scope) — 자동 cron / APM / 분산 측정 / V20 코드 적용

**§2. MariaDB slow_query_log 활성화**
- 2.1 임시 활성화 SQL (`SET GLOBAL slow_query_log=ON; long_query_time=1.0; log_output='FILE,TABLE'`)
- 2.2 영구화 — `/etc/mysql/mariadb.conf.d/50-server.cnf` `[mysqld]` 섹션 4줄
- 2.3 로그 파일 권한 (mysql:mysql 640, /var/log/mysql 750)
- 2.4 logrotate (weekly + rotate 12 + compress + flush-logs postrotate) — T-33-10 mitigation. 일일/주간 점검 SQL + 파일 모드 grep 백업 절차 포함.

**§3. D-S2 3 신호 정의**
| 신호 | 트리거 조건 | 1차 대응 |
|------|-------------|----------|
| (a) 사용자 신고 | "검색이 느리다" 신고 1건 이상 | ack + §3.2 윈도우 좁혀 확인 + §4 즉시 진입 |
| (b) slow_query_log | 7일 내 검색 SQL 1초 초과 1회 이상 | slow_count 1-2 일회성 → 보류, ≥3 또는 max_query_time>3 → §4 진입 |
| (c) active_users | 직전 5분 distinct user ≥30 | 사전 예방적 §4 진입 (audit_log 기반 근사 SQL) |

추가: §3.4 cumulative 카운트 시트 + 누적 정책 (보류 행 3개월 3회 누적 시 §4 강제 진입).

**§4. 신호 발동 시 재실측 절차 — Plan 30-05 인프라 재활용**
- 첫 줄에 ⚠ **운영 DB 격리 경고** (T-33-12 mitigation) — `@Profile("bench")` 격리 + baseUserId=1000+ 보조 + 출시 담당자 사전 확인 3 항목.
- Step 1: bench profile seed (`./gradlew bootRun --args='--spring.profiles.active=bench'`) + DB 검증 SQL (10K/100/27K count)
- Step 2: 일반 프로필 재기동 + JWT 획득 (BENCH_JWT 환경변수)
- Step 3: `BENCH_JWT="$BENCH_JWT" ./scripts/bench-search.sh` — 3 시나리오 ab + 30-BENCH-REPORT.md auto-append (T-33-13 mitigation)
- Step 4: EXPLAIN 수동 수집 (시나리오 1, 2)
- Step 5: 30-BENCH-REPORT.md 갱신 — 판정 DEFERRED → PASS / FAIL
- Step 6: FAIL 시 V20 후보 (idx_status_submitted / idx_approver_doc) 검토 + flywayMigrate + 재측정. V20 적용은 별도 GSD phase 로 분리.

**§5. 의사결정 플로우 + 종료 조건**
- 신호 → cumulative → §4 진입 → PASS/FAIL → V20 분리의 ASCII 다이어그램
- 종료 조건 2 가지: (1) 6개월 무발동 → APM/dashboard 검토 (2) 1회 PASS 사이클 완료 → v1.3 NFR 에 패턴 확장

## D-S2 의 3 신호 매핑

| D-S2 결정 (33-CONTEXT) | MONITORING.md 위치 | 점검 SQL/방법 | 발동 임계 |
|------------------------|---------------------|---------------|-----------|
| (a) 사용자 체감 검색 지연 신고 1건 이상 | §3.1 | 사내 메신저/이메일/issue tracker 채널 | 신고 1건 즉시 |
| (b) MariaDB slow query log 1초 초과 1회 | §3.2 + §2.4 | 주간 집계 SQL (`mysql.slow_log`) + 일일 SQL 옵션 | slow_count ≥1 (cumulative 정책) |
| (c) 동시 활성 사용자 30명 초과 | §3.3 | `audit_log` 5분 윈도우 distinct count | active_users ≥30 |

3 신호가 정확히 a/b/c 의 3개로 매핑되어 D-S2 와 1:1 대응.

## Plan 30-05 인프라 재활용 명령 시퀀스 (§4 요약)

```bash
# Step 1: bench seed (staging DB 에서)
cd backend && ./gradlew bootRun --args='--spring.profiles.active=bench'

# Step 2: 일반 프로필 + JWT
cd backend && ./gradlew bootRun
TOKEN=$(curl -s -X POST http://localhost:8080/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@micesign.com","password":"admin1234!"}' | jq -r .data.accessToken)
export BENCH_JWT="$TOKEN"

# Step 3: 3 시나리오 ab + REPORT auto-append
BENCH_JWT="$BENCH_JWT" ./scripts/bench-search.sh

# Step 4: EXPLAIN 수동 수집 (시나리오 1, 2)
# Step 5: 30-BENCH-REPORT.md 의 판정 라인을 DEFERRED → PASS/FAIL
# Step 6 (FAIL 시): V20 후보 검토 + flywayMigrate + 재측정
```

코드/스크립트 수정 0건 — Plan 30-05 산출물을 그대로 인용/재활용.

## 33-04 AUDIT.md 와의 연계

본 문서는 `.planning/milestones/v1.2/AUDIT.md` (Phase 33-04 산출물 예정) 의 **Deferred 추적 섹션** 에서 NFR-01 의 **보존 경로 source** 로 인용될 예정:

- AUDIT.md §Deferred 항목 "NFR-01 합성 부하 실측" 의 후속 게이트 = `MONITORING.md`
- AUDIT.md §출시 게이트 체크리스트의 "MariaDB slow_query_log 활성화 완료" 항목 = `MONITORING.md` §2.2 영구화 적용 여부

이 연계는 Plan 33-04 가 작성될 때 AUDIT.md 측에서 명시적 link 로 처리.

## Files Created

| File | Purpose | Lines |
|------|---------|-------|
| `.planning/milestones/v1.2/MONITORING.md` | NFR-01 운영 모니터링 + 재실측 런북 (DBA/운영자 청자) | 450 |

## Files Modified

(없음 — SearchBenchmarkSeeder.java / bench-search.sh / application-bench.yml 모두 인용만, 수정 0)

## Commits

| Task | Hash | Message |
|------|------|---------|
| Task 1 | `3fa5fe0` | docs(33-03): add NFR-01 ops monitoring runbook (MONITORING.md) |

## Verification

자동 검증 (Plan 의 verify automated 명령) 모두 PASS:

- ✅ 파일 존재 + 450 lines (≥120 요구)
- ✅ §1 ~ §5 모든 섹션 grep PASS
- ✅ 핵심 키워드 8개 grep PASS — `slow_query_log` / `long_query_time` / `SearchBenchmarkSeeder` / `bench-search\.sh` / `30-BENCH-REPORT` / `D-S2` / `V20` / `spring\.profiles\.active=bench`
- ✅ §1 SMTP-RUNBOOK §6.4 역참조 인용 (line 14, 57)
- ✅ §1.4 다루지 않는 항목 (cron / APM / 분산) 명시 (line 69-71)
- ✅ §4 첫 줄 운영 DB 격리 경고 박스 (T-33-12 mitigation, line 261-273)
- ✅ atomic commit 1개 + 다른 미커밋 변경 미접촉

## Deviations from Plan

None — plan exactly as written. 추가 보강 수준은 모두 plan_specifics 의 권장 5 섹션 + threat 인용 의무 범위 내.

## Threat Flags

(없음 — 본 plan 은 운영 절차 문서 작성만, 신규 코드 surface 추가 0)

## Self-Check

- [x] `.planning/milestones/v1.2/MONITORING.md` 존재 + 450 lines
- [x] commit `3fa5fe0` 존재 (`git log --oneline -3` 확인)

## Self-Check: PASSED

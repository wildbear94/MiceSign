---
phase: 35-backend-logging
plan: 01
subsystem: infrastructure/logging
tags:
  - backend
  - config
  - logging
  - logback
  - operations
status: AWAITING-HUMAN-UAT
requires: []
provides:
  - "Spring Boot 3.x 표준 logging 인프라 (일별 롤링 + 30일 보관 + UTF-8 + gzip + 1GB cap + clean-on-start)"
  - "프로필 분리 — base=INFO, dev=DEBUG, prod=base 상속 (D-D2)"
  - "${LOG_DIR:-logs} env-var override 패턴 (dev=상대경로 / prod=systemd EnvironmentFile 주입)"
  - "운영 인계 메모 (sudo install + LOG_DIR 카탈로그 in .example)"
affects:
  - "backend/src/main/resources/application.yml"
  - "backend/src/main/resources/application-dev.yml"
  - "backend/src/main/resources/application-prod.yml.example"
  - ".gitignore"
tech-stack:
  added: []
  patterns:
    - "Spring Boot 3.x logging.* properties (no logback-spring.xml)"
    - "logging.logback.rollingpolicy.* (file-name-pattern + max-history + max-file-size + total-size-cap + clean-history-on-start)"
    - "${LOG_DIR:-logs} env-var fallback (dev/prod 분기 패턴 — Phase 33 D-C1 mimicking)"
key-files:
  created:
    - ".planning/phases/35-backend-logging/35-HUMAN-UAT.md"
    - ".planning/phases/35-backend-logging/35-01-SUMMARY.md"
  modified:
    - "backend/src/main/resources/application.yml (Task 1: +19 lines logging block)"
    - "backend/src/main/resources/application-dev.yml (Task 2-A: +1 line root: DEBUG)"
    - "backend/src/main/resources/application-prod.yml.example (Task 2-B: +7 lines LOG_DIR catalog)"
    - ".gitignore (Task 2-C: +1 line backend/logs/)"
decisions:
  - "D-A1 채택 — logback-spring.xml 미생성, Spring Boot 3.x 표준 properties 만 사용 (요구 4건 모두 충족)"
  - "D-D2 무수정 정책 — application-prod.yml 변경 0건 (root=INFO 가 base 에서 상속). Phase 33 D-C1 위생 보존"
  - "D-G3 인계 — SMTP-RUNBOOK.md 직접 수정 안 함, .example 카탈로그 inline 메모로 출시 시점 운영 절차에 흡수"
  - "D-F3 시나리오 3·4 (30일 max-history 자동 삭제 / 1GB total-size-cap fallback) 코드 검증 불가 — 운영 모니터링 인계"
  - "Claude Discretion — logging 블록 위치를 spring: 뒤 jwt: 앞에 배치 (자연스러운 순서)"
metrics:
  duration: "143s (Task 1+2 only — Task 3 awaiting human UAT)"
  completed-date: ""
  tasks-completed: "2/3 (Task 3 = checkpoint:human-verify, blocking gate)"
  files-modified: 4
  commits: 2
---

# Phase 35 Plan 01: 백엔드 로그 설정 (logback 일별 롤링) Summary

**One-liner:** Spring Boot 3.x logging.* properties 만으로 (logback-spring.xml 미생성) 일별 롤링 + 30일 보관 + UTF-8 한글 + gzip + 1GB cap + clean-on-start 구현, dev=DEBUG/prod=INFO 프로필 분리.

**Status:** AWAITING HUMAN UAT — Task 1+2 (config 변경) 완료, Task 3 (dev/prod 부팅 smoke 검증) 은 사용자 수동 실행 대기.

---

## What Changed

| File | Change | Lines | Commit |
|------|--------|-------|--------|
| `backend/src/main/resources/application.yml` | logging 블록 신규 추가 (spring: 뒤, jwt: 앞) | +19 | `4eea6f1` |
| `backend/src/main/resources/application-dev.yml` | logging.level 에 root: DEBUG 첫 줄 추가 | +1 | `0348499` |
| `backend/src/main/resources/application-prod.yml.example` | LOG_DIR 카탈로그 블록 + sudo install inline 안내 append | +7 | `0348499` |
| `.gitignore` | backend/logs/ 명시적 차단 | +1 | `0348499` |

**Total:** 4 files, +28 lines, 2 commits. Java/TS 코드 무수정 (config-only, D-G1/G2 준수).

**무수정 확인 (D-D2 / D-D4):**
- `application-prod.yml` 변경 0건 (root=INFO 가 base 에서 상속)
- `application-bench.yml` 변경 0건 (Phase 30 검색 벤치 환경, 본 phase scope-out)

---

## Decision Traceability — D-A1 ~ D-G3 매핑

| Decision | What it means | Where applied |
|----------|---------------|---------------|
| D-A1 | logback-spring.xml 미생성 | application.yml `logging:` 블록만 (xml 파일 0건 신규) |
| D-A2 | Profile-based 분기 = `application-{profile}.yml` 의 `logging.level.root` override | application-dev.yml `root: DEBUG` |
| D-B1 | `${LOG_DIR:-logs}/micesign.log` env-var path | application.yml L43 + L52 |
| D-B2 | `.gitignore` 에 `backend/logs/` 추가 | .gitignore L36 |
| D-B3 | LOG_DIR 디렉터리 생성 + 권한 운영자 수행 절차 | application-prod.yml.example `# sudo install -d -o micesign -g micesign -m 750 /var/log/micesign` |
| D-C1 | `file-name-pattern: ...micesign-%d{yyyy-MM-dd}.%i.log.gz` | application.yml `rollingpolicy.file-name-pattern` |
| D-C2 | `max-history: 30` | application.yml `rollingpolicy.max-history` |
| D-C3 | `max-file-size: 100MB` | application.yml `rollingpolicy.max-file-size` |
| D-C4 | `total-size-cap: 1GB` | application.yml `rollingpolicy.total-size-cap` |
| D-C5 | `clean-history-on-start: true` | application.yml `rollingpolicy.clean-history-on-start` |
| D-D1 | base `logging.level.root: INFO` | application.yml `logging.level.root: INFO` |
| D-D2 | application-prod.yml 무수정 (root=INFO 상속) | application-prod.yml 변경 0건 — git diff 검증됨 |
| D-D3 | application-dev.yml `logging.level.root: DEBUG` 추가 | application-dev.yml `root: DEBUG` 첫 줄 추가, 기존 com.micesign/org.hibernate.SQL DEBUG 보존 |
| D-D4 | application-bench.yml 무수정 | application-bench.yml 변경 0건 — git diff 검증됨 |
| D-D5 | TRACE 미설정 (필요 시 임시 활성화) | 미적용 (의도된 omission) |
| D-E1 | `logging.pattern.file` 명시 안 함 (Spring Boot 기본 사용) | logging.pattern 블록 부재 (의도된 omission) |
| D-E2 | `logging.charset.file: UTF-8` | application.yml `logging.charset.file: UTF-8` |
| D-F1 | 자동 검증 = `./gradlew compileJava` PASS + bootRun smoke | Task 1+2 자동 verify PASS, Task 3 awaiting human |
| D-F2 | Spring Boot logging 자체는 단위 테스트 대상 아님 | 신규 단위 테스트 0건 (의도) |
| D-F3 | 4 시나리오 (1·2 실측 / 3·4 인계) | Task 3 HUMAN-UAT 에 시나리오 1·2 staged, 3·4 = Deferred |
| D-G1 | Phase 33 자격증명 위생 무영향 | spring/jwt/app/google/server/management/springdoc/budget 블록 무수정 |
| D-G2 | 결재 흐름/SMTP/대시보드/검색 등 기존 기능 무영향 | Java/TS 코드 변경 0건 |
| D-G3 | SMTP-RUNBOOK.md 직접 수정 안 함, 출시 시점 별도 phase | application-prod.yml.example 의 inline 메모로 인계 — 본 SUMMARY 의 'Ops 인계 메모' 섹션 |

---

## Task Execution Results

### Task 1 — application.yml 에 base logging 블록 추가 — PASS

- **Commit:** `4eea6f1`
- **Verify:**
  - `./gradlew compileJava -q` → PASS (yml 파싱 OK)
  - `grep -A 14 "^logging:" .../application.yml | grep -E "(max-history: 30|file-name-pattern|charset|root: INFO|clean-history-on-start: true|total-size-cap: 1GB)" | wc -l` → `6` (기대값)
- **Done criteria 모두 충족:**
  - logging 블록이 spring: 뒤 jwt: 앞에 추가
  - 6 핵심 키 모두 명시
  - 컴파일 PASS
  - spring/jwt/app/google/server/management/springdoc/budget 블록 무수정

### Task 2 — dev override + ops 인계 + .gitignore 보강 — PASS

- **Commit:** `0348499` (3 파일 atomic)
- **Verify:**
  - `./gradlew compileJava -q` → PASS
  - `grep -E "^\s+root:\s+DEBUG\s*$" application-dev.yml` → 매치 (root: DEBUG)
  - `grep -E "^# LOG_DIR=" application-prod.yml.example` → 매치 (`# LOG_DIR=/var/log/micesign`)
  - `grep -E "^backend/logs/$" .gitignore` → 매치 (backend/logs/)
- **Done criteria 모두 충족:**
  - application-dev.yml 의 logging.level 에 `root: DEBUG` 추가, 기존 com.micesign/org.hibernate.SQL DEBUG 보존
  - application-prod.yml.example 끝에 카탈로그 블록 + sudo install 안내 append
  - .gitignore 에 `backend/logs/` 추가, 기존 `*.log` / `logs/` 보존
  - application-prod.yml 무수정 (D-D2)
  - application-bench.yml 무수정 (D-D4)

### Task 3 — dev + prod 프로필 부팅 smoke 검증 — AWAITING HUMAN UAT

- **Type:** `checkpoint:human-verify` (gate=blocking, autonomous=false)
- **Status:** UAT 체크리스트 staged at `.planning/phases/35-backend-logging/35-HUMAN-UAT.md`
- **Pending gates (7 items):**
  - 시나리오 1 (dev profile) — 4 게이트:
    1. logs/micesign.log 파일 존재 (size > 0)
    2. DEBUG 라인 ≥1 (Hibernate SQL 또는 com.micesign 패키지)
    3. UTF-8 호환 인코딩
    4. .gitignore 차단 동작 (`git status backend/logs/` empty)
  - 시나리오 2 (prod profile + LOG_DIR override) — 3 게이트:
    1. ${LOG_DIR}/micesign.log 파일 존재
    2. DEBUG 라인 카운트 = 0 (가장 핵심)
    3. INFO 라인 카운트 ≥1
- **Resume signal:** 사용자 "approved" 응답 시 → Phase 35 종결 단계 진입 (state advance + ROADMAP 업데이트 + 종결 commit)

---

## Smoke Verification Results

**Task 1+2 자동 검증 (이미 PASS):**
- `./gradlew compileJava` PASS — 양쪽 yml 모두 파싱 OK
- 6 핵심 키 grep 매치 카운트 정확히 6
- root: DEBUG / # LOG_DIR= / backend/logs/ 모두 grep 매치

**Task 3 사용자 UAT (대기 중):** 35-HUMAN-UAT.md 의 7 게이트 — 사용자 실측 후 결과 기록 예정.

---

## Deviations from Plan

**None — plan executed exactly as written.**

(Task 1+2 모두 plan 의 yaml 블록을 그대로 적용. Edit 명령 3건 모두 단순 추가형 변경 — diff 가 깔끔, 기존 라인 수정/삭제 0건.)

---

## Authentication Gates

**None.** 본 plan 은 config-only 변경으로 외부 인증 흐름과 무관.

---

## Ops 인계 메모 (D-G3 — 출시 시점)

다음 항목들은 application-prod.yml.example 의 카탈로그 블록에 inline 으로 메모되어 있음. 출시 시점에 운영 담당자가 수행:

1. **systemd EnvironmentFile (`/etc/micesign/.env.production`) 에 추가:**
   ```
   LOG_DIR=/var/log/micesign
   ```
2. **사전 디렉터리 생성 + 권한 (root 권한 필요):**
   ```bash
   sudo install -d -o micesign -g micesign -m 750 /var/log/micesign
   ```
3. **SMTP-RUNBOOK.md 의 systemd unit 절차 (Phase 33-02 산출물) 에 LOG_DIR 라인 추가 권장** — 본 phase 에서는 SMTP-RUNBOOK.md 직접 수정하지 않음 (D-G3 — 출시 시점 별도 phase 또는 운영 절차에 흡수). 35-01-PLAN 의 `application-prod.yml.example` inline 메모로 운영자가 자기완결적으로 수행 가능.

---

## Deferred 인계 (D-F3 #3·#4 — 코드 검증 불가)

| 항목 | 인계 위치 | 트리거 |
|------|----------|--------|
| 30일 후 `max-history` 자동 삭제 | 운영 모니터링 단계 | 30일 도래 시점 1회 확인 (`ls /var/log/micesign/*.log.gz` → 30일 이전 파일 부재) |
| `total-size-cap=1GB` fallback 동작 | 코드 검증 거의 불가 | 50인 환경에서는 `max-history: 30` 이 먼저 트리거되므로 실측 가능성 낮음. 1GB 도달은 비상상황 (로그 폭주) — 발생 시 `clean-history-on-start: true` 가 재시작 후 정합성 보장 |

---

## Phase 35 종결 후 후속 phase 권장사항 (Deferred items)

- **logback-spring.xml 신규 작성** — 어펜더 세밀 제어, JSON 포맷, MDC trace-id 자동 주입 등 → 별도 phase
- **외부 로그 집계** — ELK / Grafana Loki / CloudWatch → 별도 phase 또는 별도 milestone
- **Sentry / Bugsnag 같은 에러 트래커** → 별도 phase
- **로그 알림** — ERROR 레벨 발생 시 Slack/이메일 → 별도 phase
- **structured logging (JSON)** + MDC trace-id 자동 주입 → 별도 phase
- **로그 보존 기간 정책 변경** (30일 → 7일/90일 등) — 운영 모니터링 후 별도 phase
- **DB 로그 테이블** (audit_log 와 별개) — 별도 phase
- **TRACE 레벨 토글 UI** → 별도 phase
- **application-bench.yml logging 정책** — Phase 30 검색 벤치 환경, 본 phase 무수정 (D-D4)

---

## Threat Model — Mitigation Status

| Threat ID | Disposition | Mitigation Confirmed |
|-----------|-------------|----------------------|
| T-35-01 (LOG_DIR path tampering) | accept | systemd EnvironmentFile root chmod 600 — accept rationale documented |
| T-35-02 (Information disclosure — 민감 정보 로깅) | accept | 기존 컨벤션, password 필드 미로깅 — Phase 34 AuthService.buildUserProfile 도 동일 |
| T-35-03 (Log injection — CRLF) | mitigate | Spring Boot logback default `%msg` pattern 이 자동 escape 처리 (default 유지 D-E1 = 자동 mitigation) |
| T-35-04 (Disk DoS — 로그 폭주) | mitigate | 4중 안전망 적용: total-size-cap=1GB / max-history=30 / clean-history-on-start=true / max-file-size=100MB |
| T-35-05 (LOG_DIR 미생성 startup 실패) | mitigate | `${LOG_DIR:-logs}` default fallback (dev) + .example 의 sudo install 메모 (prod, D-B3) |
| T-35-06 (chmod too-permissive) | mitigate | .example 의 inline `chmod 750` 안내 — 운영자 검증 책임 |

추가 신규 위협 표면 없음 — config-only 변경으로 새로운 endpoint / auth path / 파일 access 패턴 / schema 변경 0건.

---

## Self-Check: PASSED (Task 1+2 scope)

**Files verified (6/6 FOUND):**
- `backend/src/main/resources/application.yml` (modified, Task 1)
- `backend/src/main/resources/application-dev.yml` (modified, Task 2-A)
- `backend/src/main/resources/application-prod.yml.example` (modified, Task 2-B)
- `.gitignore` (modified, Task 2-C)
- `.planning/phases/35-backend-logging/35-HUMAN-UAT.md` (created)
- `.planning/phases/35-backend-logging/35-01-SUMMARY.md` (this file)

**Commits verified (2/2 FOUND):**
- `4eea6f1` — feat(35-01): add base logging block to application.yml
- `0348499` — feat(35-01): wire dev DEBUG override + LOG_DIR catalog + gitignore

**Note:** Task 3 자체의 PASS 여부는 사용자 UAT 후 결정. 본 self-check 는 Task 1+2 의 자동 검증 + 산출물 무결성 확인까지만 포함. UAT sign-off 후 STATE/ROADMAP/REQUIREMENTS 의 마킹 진행.

---
phase: 33
plan: "01"
subsystem: ops-security
tags: [security, ops, secrets, gitignore, prod-config]
requires: []
provides:
  - "운영 자격증명을 env var only 로 강제 — application-prod.yml hardcoded default 제거"
  - "운영자 참조용 env 변수 카탈로그 (application-prod.yml.example)"
  - "운영 secret 파일 git 추적 차단 (.env.production 패턴)"
affects:
  - "33-02 SMTP-RUNBOOK 의 1단계 (자격증명 위생) 산출물 인계"
  - ".planning/milestones/v1.2/AUDIT.md 출시 게이트 체크리스트의 'DB 자격증명 위생' 항목"
tech_stack:
  added: []
  patterns:
    - "${VAR:} 빈 default + EnvironmentFile= 주입 — fail-fast"
    - "secret 카탈로그 .example 파일 패턴 (실값 미포함, git 추적 대상)"
key_files:
  created:
    - "backend/src/main/resources/application-prod.yml.example"
  modified:
    - "backend/src/main/resources/application-prod.yml"
    - ".gitignore"
decisions:
  - "Phase 33 D-C1 — 운영 자격증명은 env var only. systemd EnvironmentFile=/etc/micesign/.env.production (chmod 600) 으로 주입. 미주입 시 HikariCP startup 실패 (fail-fast)."
  - "secret 도구 미도입 (D-C2 결정 계승) — 50인 단일 환경에서 systemd EnvironmentFile + 600 권한 충분"
  - ".env.production 은 .env.*.local 패턴 미매칭 → .gitignore 에 명시적 라인 추가 + /etc/micesign/.env.production 절대경로 안전망 추가"
metrics:
  duration: "1m 26s"
  tasks: 3
  files_changed: 3
  completed: "2026-04-28"
task_commits:
  - "Task 1: b1b710c — fix(33-01): remove hardcoded DB default in application-prod.yml"
  - "Task 2: 7fe42e0 — feat(33-01): add application-prod.yml.example — 운영 env 카탈로그"
  - "Task 3: 12fc094 — chore(33-01): block .env.production from git tracking"
---

# Phase 33 Plan 01: application-prod.yml 자격증명 위생 Summary

운영 환경 yml 의 hardcoded DB 자격증명 default 를 빈 default 로 복원하고, 운영자 참조용 env 카탈로그 파일과 `.env.production` git 차단 패턴을 추가하여 D-C1 (자격증명 위생) 5단계 절차의 **1단계 (소스/설정 위생)** 를 완결.

## Outcome

- working tree 에 미커밋으로 남아있던 hardcoded `${DB_USER:miceleech}` / `${DB_PASS:leech0511!}` 가 git history 로 새어나가는 것을 차단 — HEAD 의 빈 default 상태로 working tree 동기 + D-C1 의도 한국어 주석 3줄 추가
- 운영자가 `/etc/micesign/.env.production` 을 작성할 때 단일 파일 (`application-prod.yml.example`) 만 참조하면 되도록 DB / APP_BASE_URL / SMTP (Phase 29 MAIL_*) / 선택적 secret 카탈로그 + 권한·EnvironmentFile 운영 절차 주석 제공
- `.env.production` 이 기존 `.env.*.local` 패턴에 매칭되지 않던 gap 을 닫고 `/etc/micesign/.env.production` 절대경로 안전망까지 추가

## Tasks Executed

### Task 1 — application-prod.yml hardcoded DB default 제거 (commit `b1b710c`)

- **Pre-state:** working tree 미커밋 변경으로 `username: ${DB_USER:miceleech}` / `password: ${DB_PASS:leech0511!}` 노출. HEAD 는 이미 빈 default (`${DB_USER:}` / `${DB_PASS:}`)
- **Action:** `git checkout HEAD -- backend/src/main/resources/application-prod.yml` 로 working tree 복원 → datasource 블록 위에 D-C1 의도 한국어 주석 3줄 추가:
  ```yaml
  # Phase 33 D-C1 — 운영 자격증명은 env var only.
  # /etc/micesign/.env.production (chmod 600) 에서 EnvironmentFile= 로 주입.
  # default 비워둠으로써 미주입 시 HikariCP startup 실패 → 사고 fail-fast.
  ```
- **Verify:** `grep '${DB_(USER|PASS):}' = 2` PASS, `miceleech|leech0511` grep 부재 PASS, `git diff` 가 주석 3줄 추가만 — 다른 키 변경 없음

### Task 2 — application-prod.yml.example 신규 작성 (commit `7fe42e0`)

- **Created:** `backend/src/main/resources/application-prod.yml.example` (46 lines)
- **Catalog scope:**
  - DB 5개 (`DB_HOST/PORT/NAME/USER/PASS`)
  - 앱 base URL 1개 (`APP_BASE_URL` — Phase 29 D-D2 BaseUrlGuard 가 localhost 검증)
  - SMTP 4개 (`MAIL_HOST/PORT/USERNAME/PASSWORD` — Phase 29 D-M1)
  - 선택 항목 (`APP_MAIL_RETRY_DELAY_MS`, `JWT_SECRET`, `COOKIE_SECURE`, `GOOGLE_DRIVE_CREDENTIALS_PATH`)
- **운영 절차 주석:** `sudo install -o micesign -g micesign -m 600 /dev/null /etc/micesign/.env.production` + `EnvironmentFile=/etc/micesign/.env.production` + `systemctl daemon-reload && systemctl restart micesign` + 33-02 SMTP-RUNBOOK cross-reference
- **Verify:** 7개 grep 단언 모두 PASS (DB_USER/DB_PASS 빈 값 / APP_BASE_URL 존재 / MAIL_HOST 존재 / EnvironmentFile 주석 / chmod 주석 / 실 secret 부재)

### Task 3 — .gitignore 에 .env.production 차단 (commit `12fc094`)

- **Modified:** `.gitignore` Environment 섹션 (line 24-31) 에 2줄 추가:
  ```
  .env.production
  /etc/micesign/.env.production
  ```
- **Rationale:** 기존 `.env.*.local` 패턴은 `.local` suffix 가 있어 `.env.production` 미매칭. Task 2 가 도입한 운영 secret 파일 명을 명시 차단. 절대경로 라인은 운영자가 실수로 `etc/` 디렉토리를 repo 안에 만들어도 안전망 동작
- **Verify:** `grep -q '^\.env\.production$' .gitignore` PASS, `git check-ignore --no-index -v .env.production` PASS (line 28 매칭)

## D-C1 절차 진척 (5단계 중 본 plan 커버 범위)

| 단계 | 내용 | 본 plan 처리 | 후속 |
|------|------|--------------|------|
| 1 | application-prod.yml 빈 default 복원 | ✅ Task 1 (commit b1b710c) | — |
| 2 | /etc/micesign/.env.production 작성 (DB_USER/PASS/MAIL_HOST/APP_BASE_URL ... 채움) | 카탈로그 제공 (Task 2) — **실제 작성은 33-02 RUNBOOK 운영 시점** | 33-02 SMTP-RUNBOOK |
| 3 | chmod 600 + chown micesign:micesign | 카탈로그 주석에 명령 명시 (Task 2) — **실 적용은 33-02 RUNBOOK** | 33-02 SMTP-RUNBOOK |
| 4 | systemd unit 의 EnvironmentFile= 추가 | 카탈로그 주석에 명시 (Task 2) — **실 적용은 33-02 RUNBOOK** | 33-02 SMTP-RUNBOOK |
| 5 | systemctl restart + Phase 29 D-D2 listener PASS / DB 연결 검증 | 운영 시점 절차 — **33-02 RUNBOOK + 출시 게이트 체크리스트** | 33-02 + AUDIT.md |

본 plan 은 **소스/설정 위생** 만 책임. 호스트 측 secret 파일 작성·권한·systemd 주입은 RUNBOOK 으로 이관.

## Threat Mitigation Status

| Threat ID | Disposition | Status | Evidence |
|-----------|-------------|--------|----------|
| T-33-01 (yml hardcoded default 유출) | mitigate | DONE | grep `miceleech\|leech0511` 부재 + `${DB_(USER|PASS):}` 빈 default 2개 |
| T-33-02 (.env.production 실수 commit) | mitigate | DONE | `.gitignore` line 28 `.env.production` + `git check-ignore` PASS |
| T-33-03 (env var 미주입 시 startup fail) | accept | INTENDED | HikariCP 가 빈 username 으로 connection 실패 → 운영자에게 즉시 visible |
| T-33-04 (.example 에 실값 잘못 커밋) | mitigate | DONE | example 에서 `miceleech\|leech0511` grep 부재 |

## AUDIT.md cross-reference

본 plan 의 산출물은 `.planning/milestones/v1.2/AUDIT.md` (Phase 33 D-A1 deliverable, 별도 plan 에서 작성) 의 **출시 게이트 체크리스트** 중 다음 항목의 evidence:

- "DB 자격증명 위생" — Task 1 commit b1b710c
- "운영 env 변수 카탈로그 제공" — Task 2 commit 7fe42e0
- "secret 파일 git 차단" — Task 3 commit 12fc094

## Deviations from Plan

None — plan 이 명시한 3 task 의 action / verify / acceptance criteria 를 그대로 수행. dirty working tree 상의 hardcoded 변경은 plan critical_dirty_tree_handling 가 예상한 대로 `git checkout HEAD --` 로 폐기 + HEAD 위에 D-C1 주석을 추가하는 단일 commit 으로 정리. 다른 unrelated dirty 파일 (29/31/32 planning, frontend SchemaFieldEditor 등) 미접촉.

## Self-Check: PASSED

- [x] `backend/src/main/resources/application-prod.yml` — modified at commit b1b710c (`git log --oneline | grep b1b710c` PASS)
- [x] `backend/src/main/resources/application-prod.yml.example` — created at commit 7fe42e0 (`test -f` PASS)
- [x] `.gitignore` — modified at commit 12fc094 (`grep -q '^\.env\.production$'` PASS)
- [x] All three commits exist in git log: `b1b710c`, `7fe42e0`, `12fc094`
- [x] No unintended deletions across all 3 commits
- [x] Other unrelated dirty files (29/31/32 planning, frontend SchemaFieldEditor) untouched — `git status --short` 비교 PASS

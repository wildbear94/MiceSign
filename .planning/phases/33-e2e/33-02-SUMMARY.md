---
phase: 33
plan: "02"
subsystem: ops-runbook
tags: [ops, smtp, runbook, systemd, audit, milestone-v1.2]
requires:
  - "33-01: application-prod.yml.example (env 변수 카탈로그) + .env.production gitignore"
  - "Phase 29 D-D2: BaseUrlGuard listener (이미 backend 에 구현됨)"
  - "Phase 29 D-A11: stale PENDING 수동 FAILED 전환 SQL 인계"
  - "Phase 29 D-B6: NOTIF FAILED 주간 조회 SQL 인계 (운영자 push 알림 deferred 보완)"
provides:
  - "운영자가 단일 markdown 파일을 위에서 아래로 따라가면 사내 IT 협업 → env 작성 → systemd 재시작 → 5종 smoke → 주간 점검까지 완수할 수 있는 자기완결 런북"
  - "33-04 AUDIT.md 출시 게이트 체크리스트의 source (§7.2)"
  - "사내 IT 부서와 §1 만 발췌하여 공유 가능한 협의 체크리스트"
affects:
  - ".planning/milestones/v1.2/AUDIT.md (Phase 33-04 작성 시 본 런북의 §3-5, §7.2 항목 인용 예정)"
  - ".planning/milestones/v1.2/MONITORING.md (Phase 33-03 산출물 — 본 런북 §6.4 에서 cross-reference)"
tech_stack:
  added: []
  patterns:
    - "Markdown 체크리스트 + 단계별 절차 + 검증 SQL/curl (D-M2)"
    - "사내 메일 릴레이 (D-M1) — IP allowlist 우선, SMTP AUTH fallback"
    - "systemd drop-in override 패턴 (`systemctl edit`) — 기존 unit 무수정 보강"
    - "fail-fast startup 게이트 (Phase 29 D-D2 BaseUrlGuard) 의 운영 절차 활용"
    - "수동 운영 SQL — D-C2 (secret 도구 미도입) + D-A11/D-B6 (자동 cron 미도입) 보완"
key_files:
  created:
    - ".planning/milestones/v1.2/SMTP-RUNBOOK.md"
  modified: []
decisions:
  - "Phase 33 D-M1 — 사내 메일 릴레이 채택 (Gmail/O365/SES 거절). §1 IT 협의 체크리스트 4항목 (host/port/IP allowlist/From 도메인) 으로 구체화."
  - "Phase 33 D-M2 — Markdown 체크리스트 + 단계별 절차 + 검증 SQL/curl 형식. 사내 IT 와 §1 만 발췌 공유 가능 + 6개월 후 재현자 자기완결성 보장."
  - "Phase 33 D-M3 — 5종 이벤트 (상신/중간/최종/반려/회수) 수동 1회 smoke 검증 표 (§5.2) + audit_log/notification_log SQL 스팟 (§5.3-5.4)."
  - "Phase 33 D-C2 인용 — secret 도구 (Vault/SOPS/git-crypt) 미도입 명시 메모를 §2 인트로에 inline. 50인 단일 환경 가정."
  - "systemd drop-in override (`systemctl edit`) 채택 — 기존 unit 파일 직접 수정 회피로 deployment 안전성 향상."
  - "BaseUrlGuard 검증을 2-게이트 패턴으로 강화 (§4.2) — 게이트 1: 로그 존재 / 게이트 2: localhost 부재. grep + grep -v 조합으로 fail-fast 실증."
  - "§6.4 NFR-01 모니터링은 본 런북 범위 밖 — Phase 33-03 MONITORING.md 로 위임 (cross-reference 명시)."
metrics:
  duration: "6m 16s"
  tasks: 2
  files_changed: 1
  completed: "2026-04-28"
task_commits:
  - "Task 1: 08f9843 — docs(33-02): SMTP-RUNBOOK §1-2 — 사내 IT 협업 + env 파일 작성"
  - "Task 2: 4e79479 — docs(33-02): SMTP-RUNBOOK §3-6 — systemd + 검증 + 5종 smoke + 트러블슈팅"
---

# Phase 33 Plan 02: 운영 SMTP 전환 런북 작성 Summary

운영자 1명이 `.planning/milestones/v1.2/SMTP-RUNBOOK.md` 단일 파일을 위에서 아래로 따라가면 **사내 IT 협업 → `/etc/micesign/.env.production` 작성 → systemd `EnvironmentFile=` 도입 → 재시작 + BaseUrlGuard 게이트 → 5종 이벤트 수동 smoke → 출시 후 주간 점검 사이클** 까지 v1.2 운영 SMTP 전환의 모든 절차를 자기완결적으로 수행할 수 있는 480-line 런북을 작성. D-M1 (사내 릴레이) / D-M2 (markdown 체크리스트) / D-M3 (5종 smoke) 결정의 실행이며, Phase 29 가 인계한 D-D2 (BaseUrlGuard) / D-A11 (stale PENDING SQL) / D-B6 (NOTIF FAILED 주간 SQL) 을 운영 절차에 흡수.

## Outcome

- **단일 파일 자기완결성 확보** — `SMTP-RUNBOOK.md` (480 lines) 하나로 출시 담당자 + 사내 IT + 6개월 후 재현자 3 청자 모두에 대응. §1 만 발췌하여 IT 와 공유, §2-7 은 운영 담당.
- **D-M1 (사내 릴레이) 의 실행 가능성** — §1.1 의 4항목 체크리스트 (MAIL_HOST / MAIL_PORT / 인증 방식 / From 도메인 + 테스트 메일 1통 송신) 가 IT 회신을 strucutured 하게 받게 함. IP allowlist 우선, SMTP AUTH fallback 두 패턴 모두 절차화.
- **D-D2 (BaseUrlGuard) fail-fast 가 출시 게이트로 통합** — §4.2 의 2-게이트 grep 패턴 (게이트 1: `grep BaseUrlGuard`, 게이트 2: `grep -v localhost`) 으로 메일 본문에 `localhost` 가 새어나갈 가능성을 startup 시점에 차단하는 운영 절차 명문화.
- **D-A11 / D-B6 인계 흡수** — Phase 29 가 자동화 거절한 두 항목 (stale PENDING cron, push 알림 파이프라인) 의 보완 SQL 을 §6.2 / §6.3 에 인용. 50인 환경에서 수동 운영으로 충분하다는 결정의 실행 가능성을 SQL 텍스트로 입증.
- **NFR-01 모니터링 분리 책임 명시** — §6.4 가 Phase 33-03 의 `MONITORING.md` 를 cross-reference. 본 런북은 SMTP / startup / notification_log 에 한정, 검색 성능은 별도 문서로 위임.
- **출시 게이트 체크리스트 source 확립** — §7.2 의 8항목이 33-04 AUDIT.md 의 출시 게이트 source 가 됨을 명시.

## Tasks Executed

### Task 1 — SMTP-RUNBOOK §1-2 (사내 IT 협업 + env 파일 작성) — commit `08f9843`

- **Created:** `.planning/milestones/v1.2/SMTP-RUNBOOK.md` (138 lines 초기)
- **신규 디렉토리:** `.planning/milestones/v1.2/` (이전엔 `v1.1/` 만 존재)
- **§0 본 런북 사용법** — 3 청자 (출시 담당자 / 사내 IT / 재현자) 에 대한 사용 패턴 명시. 체크박스 checklist 의미, 명령 표기 규칙 (`$VAR` 치환).
- **§1 사전 준비 (D-M1):**
  - §1.1 사내 메일 릴레이 정보 4항목 체크리스트 (MAIL_HOST / MAIL_PORT / 인증 방식 / From 도메인) + 테스트 메일 1통 송신 검증 요청.
  - §1.2 운영 서버 사전 점검 (systemd / micesign user / `/etc/micesign/` 700 권한 / unit 파일 / DB / Flyway 적용 가능 상태).
- **§2 환경변수 설정 (D-C1 + D-M1):**
  - §2.1 `.env.production` 작성 — race-free `install -m 600` + 임시 파일 `shred -u` 패턴.
  - §2.2 권한 검증 — `stat -c '%a %U:%G %n'` 기대 출력 명시 + 미충족 시 `chmod`/`chown` 즉시 보정.
  - §2.3 9-항목 필수 변수 체크리스트 (DB 5 + APP_BASE_URL + MAIL_HOST/PORT + 선택 USERNAME/PASSWORD).
  - §2.4 위생 검증 — 개발자 PC 에서 실수 commit 차단 확인 (Phase 33-01 `.gitignore` 의 운영 검증).
- **D-C2 (secret 도구 미도입) 한 줄 메모** — §2 인트로에 inline. "50인 단일 환경에서 systemd `EnvironmentFile=` + `chmod 600` 으로 충분. Vault/SOPS/git-crypt/AWS Secrets Manager 도입 거절."
- **Verify:** 8 grep 단언 모두 PASS (§1/§2 헤더 / MAIL_HOST / chmod-600 / `application-prod.yml.example` ref / D-M1·D-M2·D-C1 ID).

### Task 2 — SMTP-RUNBOOK §3-6 (systemd + 검증 + 5종 smoke + 트러블슈팅) — commit `4e79479`

- **Modified:** `.planning/milestones/v1.2/SMTP-RUNBOOK.md` (138 → 480 lines, +342)
- **§3 systemd `EnvironmentFile=` 도입 (D-C1 4단계):**
  - §3.1 기존 unit 확인 (`systemctl cat`).
  - §3.2 drop-in override 채택 (`systemctl edit`) — 기존 unit 파일 무수정 보강.
  - §3.3 효과 확인 (`systemctl show -p EnvironmentFiles`).
  - §3.4 권한 매트릭스 표 (3행: `/etc/micesign/` 700 / `.env.production` 600 / `override.conf` 644).
- **§4 재시작 + startup 검증 (Phase 29 D-D2 BaseUrlGuard):**
  - §4.1 `systemctl restart` + `systemctl status` 기대 출력.
  - §4.2 BaseUrlGuard **2-게이트 grep 패턴** (게이트 1: `BaseUrlGuard|app\.base-url` 로그 존재 / 게이트 2: `grep -v localhost` 가 라인 제거 안 함). HikariPool 시작 로그 추가 검증.
  - §4.3 SMTP 핸드셰이크 — `telnet` / `nc` / `openssl s_client` 3 도구 alternative 제공 (STARTTLS 포트 587 대응).
- **§5 5종 이벤트 수동 smoke (D-M3):**
  - §5.1 사전 준비 — 테스트 문서 3건 (5 시나리오 분리: 일반/반려/회수).
  - §5.2 5×5 체크리스트 표 (시나리오 5 × 검증항목 5: prefix / 한글 subject / 본문 / 바로가기 URL / From 도메인).
  - §5.3 audit_log SQL — NFR-03 cnt=1 검증. cnt≥2 시 release 보류 + Phase 29 `ApprovalServiceAuditTest` 재실행 절차.
  - §5.4 notification_log SQL — `(event_type, recipient_id)` 별 SUCCESS/cnt=1 검증. PENDING 잔존 → §6.2 분기.
- **§6 트러블슈팅 + 주기적 점검:**
  - §6.1 BaseUrlGuard 실패 — `IllegalStateException` 인지 + APP_BASE_URL 수정 + 재시작 + §4.2 게이트 재실행 회로.
  - §6.2 stale PENDING (10분 이상) — **Phase 29 D-A11 인계 SQL** 그대로 인용 + 후속 (SMTP 재검증 / 재상신은 운영자 판단).
  - §6.3 주간 점검 (Phase 29 D-B6 인계) — 7일 FAILED 카운트 SQL + `error_message` 분류 SQL + 4 분기 (timeout / AUTH fail / template error / `[수동전환]` 흔적).
  - §6.4 NFR-01 운영 모니터링 cross-reference — `.planning/milestones/v1.2/MONITORING.md` 위임 + Plan 30-05 의 3 신호 (사용자 신고 / slow log / 30 동시 활성) 인용.
- **§7 변경 이력 + 출시 게이트 체크리스트** — 8항목 출시 게이트 = 33-04 AUDIT.md source.
- **Verify:** 17 grep 단언 모두 PASS (§3/§4/§5/§6 헤더 / EnvironmentFile= / BaseUrlGuard / audit_log / notification_log / PENDING / MONITORING.md / D-A11 / D-B6 / D-M3 / D-C2 / 5종 이벤트 / app.base-url / chmod 600). 총 480 lines (200+ 요건 충족).

## Decision Mapping (D-* → 런북 §)

본 plan 의 must_haves 의 5 truths 가 어디에 흡수되었는지 명시:

| 결정 / 인계 항목 | 런북 §  | 근거 |
|------------------|---------|------|
| **D-M1** 사내 메일 릴레이 채택 | §1.1 | 4항목 IT 협의 체크리스트 + IP allowlist / SMTP AUTH 두 패턴 |
| **D-M2** Markdown 체크리스트 + 단계별 절차 + 검증 SQL/curl | 전체 구조 | §1 IT 공유 가능 / 체크박스 / SQL 블록 / `telnet`/`nc`/`openssl` curl 등가 |
| **D-M3** 5종 이벤트 수동 1회 smoke | §5.2 + §5.3 + §5.4 | 5×5 표 + audit_log SQL + notification_log SQL |
| **D-C1** env var only + EnvironmentFile= | §2 + §3 | install -m 600 / chown / drop-in override / 권한 매트릭스 |
| **D-C2** secret 도구 미도입 | §2 인트로 메모 | "50인 단일 환경에서 systemd EnvironmentFile + 600 충분" |
| **D-S2** NFR-01 3 신호 모니터링 | §6.4 cross-ref | MONITORING.md 위임 (Phase 33-03 책임) |
| **Phase 29 D-D2** BaseUrlGuard | §4.2 | 2-게이트 grep PASS 패턴 (로그 존재 + localhost 부재) |
| **Phase 29 D-A11** stale PENDING SQL | §6.2 | 10분 INTERVAL UPDATE SQL 인용 |
| **Phase 29 D-B6** NOTIF FAILED 주간 SQL | §6.3 | 7일 INTERVAL COUNT(*) SQL + error_message 분류 SQL |

## Threat Mitigation Status

본 plan 의 `<threat_model>` 가 정의한 5 위협:

| Threat ID | Disposition | Status | Evidence |
|-----------|-------------|--------|----------|
| T-33-05 (.env.production 권한 부주의 → secret 노출) | mitigate | DONE | §2.2 `stat -c '%a %U:%G %n'` 명시적 검증 + 600 외 즉시 chmod/chown 지시 / §3.4 권한 매트릭스 표 |
| T-33-06 (localhost 가 APP_BASE_URL 에 주입되어 메일 본문 비공개 URL 발송) | mitigate | DONE | §4.2 BaseUrlGuard 2-게이트 grep 패턴 (Phase 29 D-D2 listener fail-fast 활용) |
| T-33-07 (SMTP IP allowlist 미등록 → 5종 이벤트 모두 FAILED) | mitigate | DONE | §1.1 IT 협의 체크리스트 + §4.3 telnet/nc 핸드셰이크 검증 + §6.2 stale PENDING 수동 청소 |
| T-33-08 (audit_log 중복 INSERT — SMTP listener 부작용) | mitigate | DONE | §5.3 SQL 로 각 action_type cnt=1 검증 + cnt≥2 시 release 보류 명시 + Phase 29 자동 회귀 재실행 절차 |
| T-33-09 (사내 메일 도메인 git public 노출) | accept | INTENDED | 본 런북 모든 표기 placeholder (`<MAIL_HOST>` / `사내도메인` / `mail.사내도메인`) — 실값 미포함 |

## Phase 29 인계 사항 흡수 위치

Phase 33 CONTEXT 의 canonical_refs 에 명시된 4가지 인계 항목이 본 런북에 흡수된 위치:

| Phase 29 인계 | 본 런북 흡수 위치 |
|---------------|-------------------|
| **D-D1** 운영 SMTP 공급자 결정 → Phase 33 책임 | §1.1 IT 협의 체크리스트 4항목 (사내 메일 릴레이 = D-M1 으로 closure) |
| **D-D2** BaseUrlGuard listener (구현 완료) | §4.2 2-게이트 grep PASS 패턴 — 운영 절차의 fail-fast 게이트로 활용 |
| **D-A11** stale PENDING 수동 FAILED 전환 SQL | §6.2 SQL 그대로 인용 + 후속 운영자 판단 분기 명시 |
| **D-B6** 운영자 push 알림 파이프라인 deferral | §6.3 주간 SQL + `error_message` 분류 + 4 조치 분기 — push 알림 미도입의 보완 |

## 33-04 AUDIT.md cross-reference

본 런북의 §7.2 출시 게이트 체크리스트 8항목은 `.planning/milestones/v1.2/AUDIT.md` (Phase 33-04 산출물) 의 출시 게이트 체크리스트로 그대로 인용 예정:

1. §1.1 사내 IT 협의 4항목 회신 완료
2. §2.2 stat 출력 600 micesign:micesign
3. §3.3 systemctl show -p EnvironmentFiles 출력
4. §4.2 BaseUrlGuard 2-게이트 PASS
5. §4.3 SMTP 핸드셰이크 PASS
6. §5.2 5 시나리오 × 5 검증항목 PASS
7. §5.3 audit_log cnt=1
8. §5.4 notification_log SUCCESS / cnt=1

## Deviations from Plan

None — plan 이 명시한 2 task 의 action / verify / acceptance criteria 를 그대로 수행. 모든 must_haves truth (운영자 단일 파일 / IT 와 §1 공유 / D-D2 PASS 게이트 / D-A11 인용 / D-B6 인용) 가 명시 위치에 흡수됨. min_lines 200 요건 대비 480 lines (2.4×) 로 여유 있게 충족. 다른 미커밋 변경 (29/31 planning, frontend SchemaFieldEditor 등) 미접촉.

Discretion 적용:
- §0 본 런북 사용법 (3 청자 명시) 추가 — must_haves 미정 항목, 자기완결성 강화 목적.
- §3.4 권한 매트릭스 표 추가 — 출시 전 마지막 게이트로 구체화 (T-33-05 mitigation 강화).
- §4.3 의 SMTP 핸드셰이크 검증을 `telnet`/`nc`/`openssl` 3 도구 alternative 로 확장 — 운영 서버에 telnet 미설치 케이스 대응.
- §7 변경 이력 + 출시 게이트 체크리스트 섹션 추가 — 33-04 AUDIT.md source 명시.

## Self-Check: PASSED

- [x] `.planning/milestones/v1.2/SMTP-RUNBOOK.md` 존재 — `test -f` PASS
- [x] 480 lines (≥200 요건) — `wc -l` PASS
- [x] §1, §2, §3, §4, §5, §6 6 섹션 모두 존재 — 6 grep PASS
- [x] 핵심 키워드 grep PASS: MAIL_HOST / EnvironmentFile= / chmod 600 / app.base-url / notification_log / 5종 이벤트 / D-M1 / D-M2 / D-M3 / D-A11 / D-B6 / D-C2 / BaseUrlGuard / audit_log / PENDING / MONITORING.md
- [x] §6.4 MONITORING.md cross-reference 텍스트 존재 (Phase 33-03 산출물 — 본 plan 작성 시점에 미존재 OK, plan_specifics 명시)
- [x] D-C2 secret 도구 거절 한 줄 메모 §2 인트로에 존재
- [x] 두 atomic commit 모두 git log 존재: `08f9843`, `4e79479`
- [x] 두 commit 모두 deletion 0건 (post-commit deletion check PASS)
- [x] 다른 unrelated dirty 파일 (29/31/32 planning, frontend SchemaFieldEditor 등) 미접촉 — `git status --short` 비교 시 추가/제거된 stage 없음

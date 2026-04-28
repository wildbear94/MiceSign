---
phase: 33
slug: e2e
status: complete
nyquist_compliant: true
wave_0_complete: true
created: 2026-04-28
---

# Phase 33 — Validation Strategy

> Per-phase validation contract. Phase 33 (E2E 검증 + 운영 전환) 는 **doc-only / wrap-up phase** — 4 markdown 산출물 + 1 yml 위생 한 줄 변경. 자동 회귀 테스트 신규 추가 없음 (Phase 29/30/31 자산이 v1.2 자동 회귀를 보장). 검증은 grep + `test -f` + cross-reference 무결성으로 수행.

---

## Phase 특성 — Doc-Only Validation

본 phase 의 deliverable 형식 분포:
- **markdown 문서 4건** (SMTP-RUNBOOK 480 / MONITORING 450 / AUDIT 436 / 33-VALIDATION) — 운영 절차 + 모니터링 게이트 + 출시 audit
- **yml 위생 한 줄 변경 1건** (`application-prod.yml` hardcoded default 제거) — secret 노출 방지, 빌드/런타임 동작 변경 없음
- **신규 코드 0건** — Java/TypeScript/SQL 파일 수정 없음
- **신규 자동 테스트 0건** — Phase 29 (GreenMail / ApprovalServiceAuditTest) + Phase 30 (28-case 권한 매트릭스 / DocumentListPage.test) + Phase 31 (DashboardServiceIntegrationTest / invalidate spy) 가 v1.2 의 자동 회귀를 이미 보장

따라서 본 phase 의 검증 표면은 **markdown 산출물 무결성 + cross-reference 정합성** 으로 환원되며, 자동 테스트 추가 의무 없음 (Nyquist Dimension 3-5 는 인계받은 phase 에서 cover).

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Verification Tool** | `grep` + `test -f` + `wc -l` (POSIX shell) |
| **Source artifacts** | `.planning/milestones/v1.2/{SMTP-RUNBOOK,MONITORING,AUDIT}.md` + `backend/src/main/resources/application-prod.yml{,.example}` + `.gitignore` |
| **Quick run command** | Plan 33-05 Task 1 의 통합 grep one-liner (자동 verify 블록) |
| **Estimated runtime** | ~2 seconds (8개 grep + 4개 wc -l) |
| **Inherited regression** | Phase 29 GreenMail 5종 / Phase 30 28-case 매트릭스 / Phase 31 DashboardServiceIntegrationTest + invalidate spy / Phase 32 presets.test.ts (32-06 PASS 시점) |

---

## Sampling Rate

- **After every plan commit:** Plan-specific verify (33-01 yml grep / 33-02 SMTP-RUNBOOK 키워드 / 33-03 MONITORING 키워드 / 33-04 AUDIT 키워드 + 9 게이트)
- **After Plan 33-05 Task 1:** 통합 grep — 4 산출물 + cross-reference 무결성 일괄 검증
- **Before milestone archive:** 본 phase 종결 + ROADMAP `[x]` + STATE 갱신 + cross-reference 정합 확인
- **Max feedback latency:** 즉시 (grep 단일 명령)

---

## Per-Plan Verification Map

| Plan | Wave | Requirement | Threat Ref | Secure Behavior | Verification Type | Automated Command | Status |
|------|------|-------------|------------|-----------------|-------------------|-------------------|--------|
| 33-01 | 1 | (security hygiene) | T-33-01 (secret leak) | hardcoded `miceleech`/`leech0511` 부재 + `${DB_USER:}` 빈 default + `.env.production` gitignore | grep | `! grep -qE 'miceleech\|leech0511' application-prod.yml && grep -q '^\.env\.production$' .gitignore` | green |
| 33-02 | 2 | MAIL-01~05 (release runbook) | T-33-T2 | SMTP-RUNBOOK.md ≥200 lines + EnvironmentFile/BaseUrlGuard/MONITORING.md cross-ref | grep + line count | `[ "$(wc -l < SMTP-RUNBOOK.md)" -ge 200 ] && grep -q 'EnvironmentFile=\|BaseUrlGuard\|MONITORING\.md'` | green |
| 33-03 | 2 | NFR-01 (monitoring gate) | T-33-T3 | MONITORING.md ≥120 lines + SearchBenchmarkSeeder + bench-search.sh 인용 | grep + line count | `[ "$(wc -l < MONITORING.md)" -ge 120 ] && grep -q 'SearchBenchmarkSeeder\|bench-search'` | green |
| 33-04 | 3 | (milestone audit) | T-33-T18/19 | AUDIT.md ≥250 lines + §0~§5 + 9 게이트 G1-G9 + cross-ref to SMTP-RUNBOOK/MONITORING | grep + line count | `[ "$(wc -l < AUDIT.md)" -ge 250 ] && grep -q '출시 게이트\|MONITORING\.md\|SMTP-RUNBOOK\.md'` | green |
| 33-05 | 4 | (wrap-up) | — | 33-01~04 산출물 grep PASS + ROADMAP `[x]` + STATE 갱신 + 33-VALIDATION (this) | 통합 grep | Plan 33-05 Task 1 verify block | green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

> Wave 0 = 검증 인프라가 phase 시작 전 이미 ready. 본 phase 의 Wave 0 는 **POSIX shell + git** 만 필요 — 신규 인프라 없음.

- [x] `grep` / `test -f` / `wc -l` — POSIX shell (무조건 가용)
- [x] git 추적 파일 — 4 산출물 모두 git tracked, history 추적 가능
- [x] **신규 wave 0 항목 없음** — markdown 검증은 도구 추가 불필요

**Inherited Wave 0 (자동 회귀 자산):**
- [x] Phase 29 — `ApprovalNotificationIntegrationTest` (GreenMail 5 events) + `ApprovalServiceAuditTest` (NFR-03 COUNT=1) + `ApprovalEmailSenderRetryTest`
- [x] Phase 30 — `DocumentSearchPermissionMatrixTest` (28 case) + `DocumentListPage.test` (URL ↔ UI) + `DrafterCombo.test`
- [x] Phase 31 — `DashboardServiceIntegrationTest` (role × 4-card matrix) + `useApprovals.invalidation.test` + `useDocuments.invalidation.test`
- [x] Phase 32 — `presets.test.ts` (length=6 + meeting/proposal 단언) — 32-06 시점 PASS

---

## Manual-Only Verifications

본 phase 의 manual 검증은 **release-time** 으로 deferred (CONTEXT.md D-M3 결정). phase 종결 시점이 아닌 출시 직전에 출시 담당자가 수행.

| Behavior | Requirement | Why Manual / Why Release-time | Test Instructions |
|----------|-------------|-------------------------------|-------------------|
| 5종 이벤트 운영 SMTP smoke (상신 / 중간 승인 / 최종 승인 / 반려 / 회수) | MAIL-01~05 | 운영 SMTP 연결성 + 한글 subject 디코딩 + From/Reply-To 헤더 + 실 메일 클라이언트 렌더링 — 운영 환경에서만 검증 가능 | SMTP-RUNBOOK.md §5 절차 + AUDIT.md §G5.1~5.5 체크박스 마킹 (release-time) |
| audit_log COUNT=1 per action SQL 스팟 | NFR-03 | 운영 DB 의 실 데이터에서 검증 — 자동 회귀 (`ApprovalServiceAuditTest`) 가 이미 cover하지만 출시 직후 1회 운영 DB 스팟 권장 | SMTP-RUNBOOK.md §5.3 SQL + AUDIT.md §G6.1 체크박스 마킹 (release-time) |
| notification_log no PENDING orphan | NFR-03 | 운영 DB 실측 — 5분 retry 윈도우 후 PENDING 부재 확인 | SMTP-RUNBOOK.md §5.4 SQL + AUDIT.md §G6.2 체크박스 마킹 (release-time) |
| `app.base-url` BaseUrlGuard startup PASS | (operational gate) | 운영 systemd unit + EnvironmentFile 적용 후 startup 로그 확인 | SMTP-RUNBOOK.md §3 + AUDIT.md §G4 체크박스 마킹 (release-time) |
| slow_query_log 활성화 + log rotation | NFR-01 (monitoring) | 운영 MariaDB 설정 변경 — phase 시점 적용 불필요 | MONITORING.md §3 절차 + AUDIT.md §G7 체크박스 마킹 (release-time) |

**Release-time gate 패턴 (33-04 RELEASE-DEFERRED 결정):** 본 phase 의 deliverable 은 **gate 정의 + 절차 문서화** 이며, gate 통과 마킹은 출시 시점에 별도 수행. AUDIT.md §G5.1-5.5 / §G6.1-G6.2 / §5.1-5.3 모두 unchecked / unfilled 보존이 의도된 동작.

---

## Nyquist Dimensions Coverage

> 본 phase 가 cover 하는 dimension + 인계받는 dimension 명시.

| # | Dimension | Phase 33 Application | Tool / Source |
|---|-----------|----------------------|----------------|
| 1 | **Type Validation** | yml 환경변수 syntax (`${VAR:default}`) — Spring Boot 자동 파싱 | application.yml runtime |
| 2 | **Runtime Contract** | BaseUrlGuard fail-fast listener (Phase 29 D-D2 인계) — startup 시 localhost 검출 시 abort | Phase 29 `BaseUrlGuard.java` |
| 3 | **Unit Testing** | **N/A (인계)** — 본 phase 신규 코드 없음. Phase 29-31 unit 테스트가 v1.2 cover | Phase 29-31 test suites |
| 4 | **Integration Testing** | **N/A (인계)** — Phase 29 GreenMail / Phase 30 권한 매트릭스 / Phase 31 DashboardServiceIntegrationTest | Phase 29-31 integration suites |
| 5 | **E2E Testing** | **Release-time** — D-M3 의 5종 smoke + audit_log SQL 스팟 (출시 직전 1회) | SMTP-RUNBOOK §5 + AUDIT.md §G5/G6 |
| 6 | **Lint / Format** | markdown 본문 한국어 일관 + 코드 fence 영문 식별자 — 시각 검토 (자동 lint 미적용) | Editor visual review |
| 7 | **Build Validation** | yml 변경의 Spring Boot startup 영향 — Phase 29 의 `BaseUrlGuard` 가 prod profile startup 시 자동 검증 | systemd startup logs |
| 8 | **Manual UAT** | **Release-time** — 운영 환경 G2-G8 출시 게이트 + 5종 smoke 시각 확인 | AUDIT.md §G5-G8 (release-time) |

---

## Threat Mitigation Coverage

| Threat | Mitigation | Verification |
|--------|-----------|--------------|
| T-33-01 (secret leak via git history) | Plan 33-01 — hardcoded default 제거 + `.env.production` gitignore + `application-prod.yml.example` 카탈로그 | grep `! miceleech\|leech0511` + `^\.env\.production$` in .gitignore |
| T-33-T2 (operational base-url misconfiguration) | Phase 29 BaseUrlGuard listener (인계) + SMTP-RUNBOOK §3 startup 검증 절차 | Release-time: systemd startup log grep |
| T-33-T3 (NFR-01 운영 시점 회귀 미감지) | MONITORING.md §3 — 3 신호 (사용자 신고 / slow_query >1s / active_users >=30) + Plan 30-05 인프라 재활용 절차 | Release-time: MariaDB slow query log + 주간 점검 |
| T-33-18 (Repudiation — ROADMAP `[x]` 마크 + 일자 정확성) | Plan 33-05 Task 2 자동 grep (`completed 2026-04-28` + `5/5 plans complete`) | Plan 33-05 Task 2 verify |
| T-33-19 (Tampering — STATE/VALIDATION 갱신 시 다른 phase 손상) | Plan 33-05 Task 3/4 — read_first 단계 + 명시 섹션만 변경 + diff review | git diff review |

---

## Cross-Reference Integrity

> 4 markdown 산출물의 상호 인용 무결성 — 단일 진실 공급원 (single source of truth) 패턴.

| From | To | Pattern |
|------|----|---------|
| SMTP-RUNBOOK.md §2.1 | application-prod.yml.example | env catalog 인용 (`grep '${MAIL_HOST}'`) |
| SMTP-RUNBOOK.md §6.4 | MONITORING.md | NFR-01 모니터링 게이트 인계 |
| AUDIT.md §1 (SC 매트릭스) | Phase 29-32 테스트 ID + UAT.md | evidence 링크 |
| AUDIT.md §2 (Deferred) | 30-BENCH-REPORT / 29-CONTEXT D-A11/D-B6 | deferral 출처 |
| AUDIT.md §4 (출시 게이트) | SMTP-RUNBOOK / MONITORING / 30-BENCH-REPORT | 검증 절차 source |
| ROADMAP.md Phase 33 | AUDIT.md §0 출시 결정 절차 | milestone summary |
| STATE.md "Deferred 항목 인계" | AUDIT.md §2 + SMTP-RUNBOOK.md §6 | release-time 인계 |

**자동 검증:** Plan 33-05 Task 1 의 통합 grep 이 위 cross-ref 의 핵심 키워드 (`MONITORING.md`, `SMTP-RUNBOOK.md`, `SearchBenchmarkSeeder`, `BaseUrlGuard`, `EnvironmentFile`) 부재를 fail 로 감지.

---

## Validation Sign-Off

- [x] 4 markdown 산출물 모두 line count + 핵심 키워드 grep PASS (Plan 33-05 Task 1)
- [x] application-prod.yml 의 hardcoded secret 부재 grep PASS
- [x] Cross-reference 무결성 grep PASS (SMTP-RUNBOOK / MONITORING / AUDIT 상호 인용)
- [x] ROADMAP.md Phase 33 `[x]` + completed 2026-04-28 + 5/5 plans (Plan 33-05 Task 2)
- [x] STATE.md v1.2 ship-ready + 다음 행동 후보 명시 (Plan 33-05 Task 3)
- [x] Inherited regression — Phase 29-31 자동 테스트가 v1.2 자동 회귀 cover
- [x] Release-time manual gates — AUDIT.md §G5/§G6/§5 placeholder unchecked 보존 (의도된 동작)
- [x] `nyquist_compliant: true` + `wave_0_complete: true` frontmatter 설정

**Approval:** Phase 33 종결 — doc-only validation. v1.2 archive 시점은 Plan 33-05 Task 6 (checkpoint:decision) 사용자 결정 대기.

---

## Rationale — Why Doc-Only Validation Is Sufficient

본 phase 가 자동 테스트 추가 없이 nyquist_compliant 인 근거:

1. **Phase 33 의 deliverable 형식이 markdown 문서 + yml 한 줄 위생 변경 한정** — 신규 코드 / 비즈니스 로직 / 사용자 flow 변경 0건. 따라서 회귀 위험 표면이 자동 테스트 작성 비용 대비 매우 작음.

2. **v1.2 의 자동 회귀는 인계된 Phase 29-31 자산이 보장** — GreenMail 5종 + 28-case 권한 매트릭스 + DashboardServiceIntegrationTest + invalidate spy 가 NOTIF/SRCH/DASH/NFR-03 모두 cover.

3. **운영 환경 검증은 release-time 으로 명시 deferred** (D-M3 + Plan 33-04 RELEASE-DEFERRED) — 5종 smoke + audit_log SQL + slow_query_log 활성화 + BaseUrlGuard startup 모두 운영 환경에서만 의미. AUDIT.md §G5/§G6 placeholder 가 출시 담당자의 release-time playbook 으로 작동.

4. **markdown 산출물의 회귀 위험 = git history + cross-ref grep 으로 충분** — phase 33-05 Task 1 의 자동 grep 이 핵심 키워드 부재 시 fail. 임의 수정 시 ROADMAP/STATE/AUDIT cross-ref 도 동시 갱신 필요 (단일 진실 공급원).

5. **NFR-01 (95p ≤ 1초) 합성 부하 실측은 D-S1/D-S2 결정에 따라 운영 모니터링 게이트로 이관** — Plan 30-05 deferral 패턴 계승. 운영 신호 (사용자 신고 / slow_query / active_users) 발동 시 Plan 30-05 인프라 (SearchBenchmarkSeeder + bench-search.sh) 재활용으로 즉시 재실측 가능.

따라서 본 phase 는 자동 테스트 신규 추가 없이도 Nyquist 8 dimension 의 검증 표면을 모두 커버 — Dimension 3/4/5 는 인계, Dimension 1/2/6/7/8 는 markdown grep + 인계된 BaseUrlGuard + release-time playbook 으로 cover.

**Phase 33 = 자동 회귀의 새 추가가 아닌 v1.2 의 운영 전환 + 출시 audit 의 wrap-up phase** — Nyquist Dimension 추가가 아닌 인계 + 정리에 의의.

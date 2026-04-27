# Phase 33: E2E 검증 + 운영 전환 - Context

**Gathered:** 2026-04-28
**Status:** Ready for planning

<domain>
## Phase Boundary

v1.2 마일스톤 (Phase 29 SMTP / 30 검색 권한 / 31 대시보드 / 32 CUSTOM 프리셋) 을 **운영 환경 배포 가능 상태로 끌어올리는 wrap-up phase**.

ROADMAP 의 Context 노트 ("선택적 wrap-up phase. Phase 29-32 가 각자 단위 검증을 끝냈다면 본 phase 는 축소 가능") 와 사용자 결정에 따라 **축소 scope** 로 운영. Phase 29 의 GreenMail/audit 통합 테스트 + Plan 30-04 의 URL ↔ UI 단위 테스트가 자동 검증 자산으로 이미 확보되어 있어, 본 phase 의 가치는 **운영 환경 1회 smoke + 운영 SMTP 런북 + DB 자격증명 위생 + v1.2-MILESTONE-AUDIT** 에 집중.

**범위에 들어가는 것:**
- 사내 메일 릴레이 SMTP 런북 (`MAIL_HOST/MAIL_PORT/...` 환경변수 + 사내 IT 협업 절차)
- `application-prod.yml` 의 hardcoded DB 자격증명 default 제거 + `systemd EnvironmentFile` 도입 절차
- 출시 직전 1회 수동 5종 이벤트 smoke (MailHog 또는 운영 후보 SMTP)
- audit_log SQL 스팟 확인 (각 action 당 row 수 = 1)
- NFR-01 재측정 트리거 (Plan 30-05 의 3 신호) 운영 모니터링 절차 문서화
- `.planning/milestones/v1.2/AUDIT.md` 통합 audit + 출시 게이트 체크리스트

**범위에서 빠지는 것 (deferred to 운영 모니터링 또는 v1.3):**
- 10K seed + 50 동시 부하 합성 측정 (Plan 30-05 deferral 결정 계승; 운영 신호 발동 시 재개)
- 운영자 push 알림 파이프라인 (Phase 29 D-B6 에서 Phase 1-C 로 이관)
- stale PENDING 자동 청소 cron (Phase 29 D-A11 에서 수동 운영으로 결정)
- v1.3 신규 기능 (FORM/SRCH/DASH 신규 요구사항 없음)

</domain>

<decisions>
## Implementation Decisions

### S. Scope & Strategy

- **D-S1:** Phase 33 scope = **축소 (Reduced)**. Phase 29 의 GreenMail 통합 테스트 (D-D5) + audit_log COUNT=1 ApprovalServiceAuditTest (D-D6) + Plan 30-04 의 URL/UI 단위 테스트가 SC1/SC3 의 자동 검증 부분을 이미 커버. 본 phase 는 **운영 SMTP 런북 + DB 자격증명 위생 + 출시 전 수동 smoke + audit_log SQL 스팟 + v1.2-MILESTONE-AUDIT** 4 가지 deliverable 에 집중. 풀스코프 (NFR 부하 실측 포함) 는 Plan 30-05 deferral 결정과 충돌하므로 채택하지 않음. 예상 소요: 1-2일.
- **D-S2:** NFR-01 (95p ≤ 1초) 재측정 트리거 = **Plan 30-05 의 3 신호 그대로 채택** — (a) 사용자 체감 검색 지연 신고 1건 이상, (b) MariaDB slow query log 에 `/api/v1/documents/search` 백엔드 쿼리가 1초 초과로 1회 이상 기록, (c) 동시 활성 사용자 30명 초과 시점 도달. Phase 33 런북에 3 신호 모니터링 절차 (slow query log 활성화 방법, 일일/주간 확인 SQL, 신호 발동 시 재개 절차 = `SearchBenchmarkSeeder` + `bench-search.sh` 그대로 재활용) 포함.

### M. SMTP & Operations

- **D-M1:** 운영 SMTP 공급자 = **사내 메일 릴레이** (회사 IT 부서 관리). `MAIL_HOST` / `MAIL_PORT` 만 환경변수로 주입 (인증은 IP allowlist 기반 일반적). From 주소는 회사 도메인 (`micesign@사내도메인` 혹은 `noreply@사내도메인`) 으로 IT 협의. Gmail Workspace / O365 / SES 채택하지 않음 — 사내 인프라 위에서 동작하는 in-house 시스템 정체성과 일치.
- **D-M2:** 운영 런북 형식 = **Markdown 체크리스트 + 단계별 절차 + 검증 SQL/curl**. 사내 IT 와 공유 가능한 단일 파일 (`.planning/milestones/v1.2/SMTP-RUNBOOK.md` 또는 `33-SMTP-RUNBOOK.md`). 자동 verify 스크립트 (옵션 B) 와 단순 환경변수 표 (옵션 C) 는 채택하지 않음 — 사내 IT 협업 + 출시 담당자 순차 수행 + 귀환 시 재현 가능성이 핵심.
- **D-M3:** 5종 이벤트 출시 전 smoke 검증 = **수동 1회** (MailHog 또는 운영 후보 SMTP). Phase 29 의 GreenMail 통합 테스트가 자동 회귀를 이미 보장하므로, 본 smoke 는 **운영 SMTP 연결성 + 한글 제목 디코딩 + From/Reply-To 헤더 + 실제 메일 클라이언트 렌더링** 의 시각 확인이 목적. 5 시나리오 (상신 / 중간 승인 / 최종 승인 / 반려 / 회수) 각 1회.

### C. Configuration & Security

- **D-C1:** `application-prod.yml` 의 DB 자격증명 default 처리 = **env var only 복원 + systemd EnvironmentFile**. 현재 working tree 의 `username: ${DB_USER:miceleech}` / `password: ${DB_PASS:leech0511!}` hardcoded default 는 commit 시 git history 에 secret 영구 노출 위험. 처리 절차:
  1. `application-prod.yml` 을 `username: ${DB_USER:}` / `password: ${DB_PASS:}` (빈 default) 로 복원
  2. `/etc/micesign/.env.production` 파일 작성 — `DB_USER=...` / `DB_PASS=...` / `MAIL_HOST=...` / `APP_BASE_URL=...` 등 모든 secret + 운영 변수 한 곳
  3. `chmod 600 /etc/micesign/.env.production` + `chown micesign:micesign`
  4. systemd unit (`/etc/systemd/system/micesign.service`) 의 `[Service]` 섹션에 `EnvironmentFile=/etc/micesign/.env.production` 추가
  5. `systemctl restart micesign` 후 startup 로그에서 D-D2 (Phase 29) 의 `app.base-url localhost 검증 listener` PASS 확인 + DB 연결 성공 확인
- **D-C2:** secret 도구 (git-crypt / SOPS / Vault / AWS Secrets Manager) 도입 = **하지 않음**. 50인 단일 환경에서 systemd EnvironmentFile + 파일 권한 600 이 충분. 외부 secret 매니저는 Phase 1-C 또는 v2 이후 확장 시 검토.

### A. Audit Artifact

- **D-A1:** `.planning/milestones/v1.2/AUDIT.md` 산출물 그림 = **통합 audit + 출시 게이트**. 4 섹션:
  1. **Phase별 SC 충족도 매트릭스** — Phase 29/30/31/32 의 ROADMAP Success Criteria 각 항목을 자동 검증 (테스트 ID 링크) / 매뉴얼 (UAT.md / HUMAN-UAT.md 참조) / Deferred (사유 + 후속 게이트) 로 구분.
  2. **Deferred 항목 추적** — Plan 30-05 NFR-01 (Phase 33 → 운영 모니터링), Phase 29 D-A11 stale PENDING 청소 (수동 운영), Phase 29 D-B6 운영자 push 알림 (Phase 1-C). 각 항목의 후속 게이트와 트리거 명시.
  3. **Requirements 매핑** — REQUIREMENTS.md 의 모든 ID (FORM-01/02, SRCH-01~06, NFR-01~03, DASH-01~05, MAIL-01~05 등) → 검증된 phase + 자동 테스트 ID + 잔존 부채.
  4. **출시 게이트 체크리스트** — DB 마이그레이션 V1~V19 적용 / SMTP 연결 검증 (`telnet $MAIL_HOST $MAIL_PORT`) / 5종 smoke 통과 / audit_log SQL 스팟 / `app.base-url` listener PASS / 디스크 / log rotation / 백업 정책 명시 / 롤백 절차.

### Claude's Discretion

- 런북 / AUDIT.md 의 정확한 마크다운 구조와 헤더 분할 — 위 결정을 만족하는 한 자유.
- audit_log SQL 스팟 쿼리 형식 — `SELECT action_type, COUNT(*) FROM audit_log WHERE ... GROUP BY ...` 베이스 + 5 시나리오 reproduction.
- NFR 모니터링 SQL 쿼리 (slow query log 활성화 / `performance_schema.events_statements_summary_by_digest` 활용 등) — DBA 표준 패턴 채택.
- v1.2 → v1.3 전환 시점 결정은 본 phase 범위 밖 — `/gsd-complete-milestone` 사용 시점에 별도 결정.

### Folded Todos

[현재 pending 폴더에 활성 todo 없음. 추후 todo 등록 시 본 섹션 갱신.]

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents (researcher / planner / executor) MUST read these before planning or implementing.**

### Phase Goal & Requirements
- `.planning/ROADMAP.md` — Phase 33 섹션 (§Phase Details > Phase 33: E2E 검증 + 운영 전환): Goal / Depends on / Requirements / Context / Success Criteria 1-3.
- `.planning/REQUIREMENTS.md` — NFR-01 (95p ≤ 1초), NFR-02, NFR-03 (audit_log integrity), MAIL-01~05 (이벤트별 발송 규약). 본 phase 는 새 요구사항 없이 기존 NFR/MAIL 의 운영 검증.
- `.planning/PROJECT.md` — Core Value (사내 ~50인 in-house 결재 시스템), Constraints (Java 17 / Spring Boot 3.x / MariaDB 10.11 / 사내 배포). 운영 SMTP 공급자 결정 (D-M1 사내 릴레이) 의 정체성 근거.

### Inherited Decisions (Phase 29 SMTP — Phase 33 가 인계받는 항목)
- `.planning/phases/29-smtp-retrofit/29-CONTEXT.md` §D — 운영·테스트 환경 결정. 특히:
  - `D-D1` 운영 SMTP 공급자 결정 = Phase 33 책임 → **본 phase 의 D-M1 (사내 릴레이) 로 closure**
  - `D-D2` `application-prod.yml` 의 `app.base-url` startup 검증 listener = 이미 구현됨 → 본 phase 의 D-C1 환경변수 절차에서 검증 단계로 활용
  - `D-A11` stale PENDING 수동 FAILED 전환 스크립트 문서화 = Phase 33 런북 → **본 phase 의 D-M2 런북에 포함**
  - `D-B6` 최종 실패 알림 파이프라인 deferral = Phase 33/1-C → **본 phase 의 D-A1 deferred 추적 섹션에 기록**
- `.planning/phases/29-smtp-retrofit/29-RESEARCH.md` §Operations Patterns — `@Profile` 격리 / `@ConditionalOnProperty` SMTP bean / GreenMail vs MailHog 사용처. 본 phase 의 D-M3 수동 smoke 시 GreenMail 자산 재활용 결정 근거.

### Plan 30-05 Deferral 인계 (NFR-01)
- `.planning/phases/30-where/30-BENCH-REPORT.md` §Deferral Decision (2026-04-28) — Plan 30-05 의 NFR-01 deferral 결정 전문. 본 phase 의 D-S2 가 이를 그대로 계승 + 운영 모니터링 절차로 구체화.
- `.planning/phases/30-where/30-05-SUMMARY.md` §Deviations from Plan — Rule 2 사용자 결정 deviation 기록. 본 phase 의 D-A1 Deferred 추적 섹션에서 cross-reference.
- `backend/src/main/java/com/micesign/tools/SearchBenchmarkSeeder.java` — `@Profile("bench")` 10K seed CommandLineRunner. 운영 모니터링 게이트 발동 시 그대로 재활용.
- `scripts/bench-search.sh` — 3 시나리오 ab 부하 + REPORT append 스크립트. 동일하게 발동 시 재활용.

### 운영 환경 파일 (수정 대상)
- `backend/src/main/resources/application-prod.yml` — 본 phase 의 D-C1 절차로 hardcoded default 제거 (현재 working tree 미커밋 변경의 secret 노출 위험 해소).
- `backend/src/main/resources/application.yml` — env var binding 패턴 (`${DB_USER:}` 등) 의 baseline. 수정 없음.

### 검증 자산 (자동 회귀 — Phase 29/30/31 자산 인계)
- `backend/src/test/java/com/micesign/notification/ApprovalNotificationIntegrationTest.java` (Phase 29 D-D5) — GreenMail 5종 이벤트 자동 회귀. 본 phase 의 D-M3 수동 smoke 의 자동 보완.
- `backend/src/test/java/com/micesign/approval/ApprovalServiceAuditTest.java` (Phase 29 D-D6) — audit_log COUNT=1 per action. 본 phase 의 D-A1 SC 매트릭스에서 NFR-03 자동 검증 cell 의 근거.
- `frontend/src/features/document/pages/__tests__/DocumentListPage.test.tsx` (Plan 30-04) — URL ↔ UI 단위 회귀. SC 매트릭스에서 SRCH-04 (URL shareable) 자동 검증 cell 의 근거.

### v1.2-MILESTONE-AUDIT 산출물 위치
- `.planning/milestones/v1.2/AUDIT.md` — 본 phase 의 D-A1 deliverable. 4 섹션 (SC 매트릭스 / Deferred / Requirements 매핑 / 출시 게이트 체크리스트).
- `.planning/milestones/v1.2/SMTP-RUNBOOK.md` — D-M2 런북. 별도 파일 또는 AUDIT.md 의 부록 — planner 가 결정.

### Architecture & Conventions
- `CLAUDE.md` — Java 17 / Spring Boot 3.x / MariaDB 10.11 / Korean response. 본 phase 의 모든 산출물 한국어.
- `backend/src/main/resources/db/migration/V1__create_schema.sql` ~ `V19__*` — DB 마이그레이션 history. 출시 게이트 체크리스트의 마이그레이션 적용 검증 대상.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `application-prod.yml` 환경변수 패턴 — `${VAR:}` (빈 default) 또는 `${VAR:fallback}` 형식. 본 phase 의 D-C1 가 모든 secret을 빈 default 로 통일.
- `@Profile` 기반 환경 격리 — `bench` (Plan 30-05 seeder), `prod` (Phase 29 D-D2 listener), `local` / `dev` (개발). 본 phase 는 신규 profile 추가 없음.
- Phase 29 의 `ApplicationReadyEvent` listener (`app.base-url` localhost 검증) — 본 phase 의 D-C1 절차에서 startup 검증 단계로 활용.
- `SearchBenchmarkSeeder.java` + `bench-search.sh` — Plan 30-05 의 NFR 측정 인프라. 본 phase 에서 재실측은 안 하지만 D-S2 트리거 발동 시 재활용 절차 문서화.
- GreenMail / MailHog — 자동 회귀 (CI) / 수동 시각 검증 (출시 직전) 의 두 자산. 본 phase 의 D-M3 가 둘 다 활용.

### Established Patterns
- secret 처리 = env var + 외부 파일 (`/etc/.../.env.production`). git 추적 대상 yml/properties 에 hardcoded 절대 금지 — D-C1 가 명시적 enforcement.
- 운영 결정의 deferral 패턴 = (a) 명시적 결정자 / 일자 기록 (b) 사유 (c) 보존 산출물 (d) 후속 게이트 + 재개 절차. Plan 30-05 의 Deferral Decision 섹션이 표준 — 본 phase 의 D-A1 가 동일 패턴으로 v1.2 의 모든 deferred 추적.
- 한국어 본문 + 영어 식별자 (Java/SQL/yml key) — Phase 29/30 의 일관된 패턴. 본 phase 의 모든 산출물 (AUDIT.md, RUNBOOK.md) 한국어.

### Integration Points
- systemd unit (`/etc/systemd/system/micesign.service`) — 운영 환경 가정. 본 phase 의 D-C1 절차가 unit 파일 수정 단계 포함. 만약 systemd 가 아니라 Docker / Kubernetes 라면 planner 가 D-C1 절차를 해당 환경 등가 패턴으로 매핑 (env file mount).
- 사내 메일 릴레이 (D-M1) — 외부 의존성. 회사 IT 부서와 협업 필요. 본 phase 의 D-M2 런북에 IT 협업 단계 (host/port 협의 / IP allowlist 요청 / 테스트 메일 1통 송신 검증) 포함.
- MariaDB slow query log — D-S2 모니터링 게이트의 데이터 소스. 운영 DB 의 `slow_query_log = ON` + `long_query_time = 1.0` 설정 필요 — 런북 또는 별도 DBA 가이드.

</code_context>

<specifics>
## Specific Ideas

- 운영 환경은 사내 Linux 서버 (PRD 가정 + 회사 IT 가 운용). systemd 단일 인스턴스. Docker / 클러스터 / multi-AZ 등 분산 가정 없음.
- "사내 ~50인" 가정이 phase 의 모든 결정에 반복 등장 — 50인을 넘어 200인 규모로 확장 시점에 본 phase 의 deferred 항목 (NFR 부하, 운영자 push 알림, secret 매니저) 모두 재검토 트리거.
- v1.2-MILESTONE-AUDIT.md 는 사내 보고용 산출물로도 의도 — 한국어 + 비기술 stakeholder (대표 / 부서장) 도 SC 충족도 매트릭스 + 출시 게이트 체크리스트는 읽을 수 있게 작성.
- secret 노출 사고 (working tree 의 hardcoded DB password) 가 본 phase 시작 시점에 발견됨 — D-C1 의 절차가 "신규 시스템 도입" 이 아닌 **"발견된 위험 해소"** 로 framing 되어야 함. AUDIT.md 의 Deferred 추적이 아닌 별도 "보안 보강" 또는 "위생" 라벨로 표기.

</specifics>

<deferred>
## Deferred Ideas

### 본 phase 에서 다루지 않는 것 (다른 phase 또는 운영 시점으로 이관)

- **NFR-01 합성 부하 실측** — Plan 30-05 deferral 결정 계승. Phase 33 본 phase 가 아닌 운영 모니터링 게이트 발동 시 (D-S2 의 3 신호) 또는 Phase 1-C / v1.3 의 명시적 부하 phase 에서 재개. 본 phase 는 트리거 + 절차 문서화만.
- **운영자 push 알림 파이프라인** (이메일 발송 최종 실패 시 Slack/SMS/PagerDuty) — Phase 29 D-B6 에서 Phase 1-C / v2 로 deferred. 50인 규모에서 주기적 수동 SQL 조회 (`SELECT COUNT(*) FROM notification_log WHERE status='FAILED' ...`) 로 충분.
- **stale PENDING 자동 청소 cron** — Phase 29 D-A11 에서 수동 운영으로 결정. 50인 + 드문 서버 재시작 가정에서 cron 도입은 과스펙. 본 phase 의 D-M2 런북에 수동 FAILED 전환 SQL 만 포함.
- **secret 관리 도구 도입** (git-crypt / SOPS / Vault / AWS Secrets Manager) — D-C2 에서 명시적 거절. 50인 + 단일 환경에서 systemd EnvironmentFile + 파일 권한 600 이 충분.
- **분산 / 다중 인스턴스 / 무중단 배포** — PRD 의 "사내 단일 서버 systemd" 가정과 충돌. v2 또는 50인 → 200인 확장 시점.
- **APM 도구 도입** (DataDog / NewRelic / Pinpoint) — D-S2 의 모니터링 게이트는 MariaDB slow query log + 사용자 신고 로 충분하다고 판단. APM 은 부하가 실제로 발생하는 시점에 검토.
- **v1.3 신규 기능** — 본 phase 는 v1.2 wrap-up 전용. v1.3 신규 기능은 `/gsd-complete-milestone` 후 `/gsd-new-milestone` 으로 별도 사이클.

### Reviewed Todos (not folded)

[현재 pending 폴더에 활성 todo 없음.]

</deferred>

---

*Phase: 33-e2e*
*Context gathered: 2026-04-28*

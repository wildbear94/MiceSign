# Phase 33: E2E 검증 + 운영 전환 - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in 33-CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-28
**Phase:** 33-e2e
**Areas discussed:** Scope 축소 정도, NFR-01 부하 측정 정책, 운영 SMTP 공급자 + 런북 형식, application-prod.yml 자격증명 처리, v1.2-MILESTONE-AUDIT 산출물 정의

---

## Area Selection (multiSelect)

| Option | Description | Selected |
|--------|-------------|----------|
| Scope 축소 정도 (Recommended) | ROADMAP 의 "선택적 wrap-up" 을 어디까지 줄일지. 풀스코프 vs 축소 vs 최소. Plan 30-05 deferral 과 정합 필요. | ✓ |
| NFR-01 부하 측정 정책 (Recommended) | Plan 30-05 deferral 과 Phase 33 SC2 의 화해 — 운영 모니터링 트리거 재정의 vs 출시 전 1회 baseline vs staging 1회. | ✓ |
| 운영 SMTP 공급자 + 런북 형식 (Recommended) | Phase 29 D-D1 deferred. 사내 릴레이 / Gmail Workspace / O365 / SES 중 선택 + 환경변수 주입 절차. | ✓ |
| application-prod.yml 자격증명 처리 (Security) | working tree 의 DB_USER/DB_PASS hardcoded default — commit 시 secret 노출 위험. | ✓ |

**User's choice:** 4개 모두 선택
**Notes:** Phase 29 D-D1/D-D2/D-A11/D-B6 가 이미 일부 항목을 Phase 33 로 위임해 둔 상태였고, Plan 30-05 의 NFR-01 deferral 결정 (2026-04-28) 도 Phase 33 SC2 와 직접 충돌/연결. 추가 보안 이슈 (working tree 의 hardcoded secret) 도 발견되어 선택지에 추가.

---

## Area 1: Scope 축소 정도

| Option | Description | Selected |
|--------|-------------|----------|
| 축소 (Recommended) | SC1 런북 + 출시 전 수동 5종 smoke + audit_log SQL 스팟 + v1.2-MILESTONE-AUDIT. NFR 부하는 운영 모니터링 게이트로 이관. 1-2일. | ✓ |
| 풀스코프 | SC1+SC2+SC3 모두 실측 (런북 + 10K seed + ab 부하 + 수동 5종 + audit 통합). Plan 30-05 결정 변경 필요. 3-5일. | |
| 최소 | 런북 + 자격증명 복원만. smoke / NFR / AUDIT 도 운영 시점으로. 0.5일. 출시 검증 증거 약함. | |

**User's choice:** 축소
**Notes:** Phase 29 의 GreenMail 통합 테스트 (D-D5) + audit_log COUNT=1 ApprovalServiceAuditTest (D-D6) + Plan 30-04 의 URL/UI 단위 테스트가 SC1/SC3 의 자동 검증 부분을 이미 커버한다는 분석에 기반. 풀스코프는 Plan 30-05 의 사용자 명시 deferral 결정과 직접 충돌하므로 거절. 최소는 출시 검증 증거 부재로 위험.

---

## Area 2: NFR-01 부하 측정 정책

| Option | Description | Selected |
|--------|-------------|----------|
| Plan 30-05 그대로 채택 (Recommended) | (a) 사용자 체감 검색 지연 신고 1건 이상 (b) MariaDB slow query log 1초 초과 1회 이상 (c) 동시 활성 30명 초과. Phase 33 런북에 3 신호 모니터링 절차 포함. | ✓ |
| 더 엄격하게 | 월간 1회 performance_schema 조사 + APM 메트릭 p95 관찰 + cron 자동 스크립트 알림. 운영 워크로드 증가. | |
| 더 가볍게 | 사용자 신고 1건만 트리거. slow query 관찰 없음, 도구만 제공. | |

**User's choice:** Plan 30-05 그대로 채택
**Notes:** Plan 30-05 의 deferral 결정에서 이미 합의된 3 신호를 그대로 유지함으로써 의사결정 일관성 확보. Phase 33 의 deliverable 은 트리거 자체가 아니라 **트리거 발동 시 절차의 문서화** + slow query log 활성화 가이드 + 재실측 시 SearchBenchmarkSeeder + bench-search.sh 재활용 절차.

---

## Area 3-1: 운영 SMTP 공급자

| Option | Description | Selected |
|--------|-------------|----------|
| Gmail Workspace SMTP | smtp.gmail.com:587 + App Password. 일일 2,000통 한도. 2-step 인증 필수. | |
| Microsoft 365 SMTP | smtp.office365.com:587. SMTP AUTH 활성화 필요. 일일 10,000통. | |
| 사내 메일 릴레이 | 회사 IT 부서 관리 내부 SMTP (Postfix 등). MAIL_HOST/PORT 만 설정. From 회사 도메인 자유. IT 협업 필요. | ✓ |
| Amazon SES | smtp-relay.sendmail.com (region) :587. 도메인 verification + DKIM. sandbox 해제 신청. 사내용 과스펙. | |

**User's choice:** 사내 메일 릴레이
**Notes:** "in-house 결재 시스템" 정체성과 일치. 외부 SMTP 의존성 회피. 인증은 IP allowlist 기반 (사내 인프라에서 일반적). From 주소는 회사 도메인 자유 제어. IT 부서와 협업 필수.

## Area 3-2: 운영 런북 형식

| Option | Description | Selected |
|--------|-------------|----------|
| 체크리스트 + 단계별 절차 (Recommended) | Markdown 체크리스트 + 각 항목 명령/SQL/검증 쿼리. 출시 담당자 순차 수행 + 체크. 귀환 시 동일 파일로 재현. 사내 IT 와 공유 용이. | ✓ |
| 자동 검증 스크립트 | scripts/verify-prod-config.sh — MAIL_HOST/PORT 연결성, app.base-url 구성, DB 자격증명 로드 자동 테스트. CI 도 재활용. | |
| 단순 환경변수 설명서 | MAIL_HOST/PORT/USERNAME/PASSWORD/APP_BASE_URL/DB_USER/DB_PASS 표 하나. 절차 설명은 수동. 최소 시간 투자. | |

**User's choice:** 체크리스트 + 단계별 절차
**Notes:** 출시 담당자가 한 사람이 아니라 IT 부서와 협업해야 하는 상황 + 귀환 시 (다음 milestone 출시) 재현 가능성이 핵심. 자동 스크립트는 D-D2 (Phase 29 의 startup listener) 가 이미 제공하므로 보완재. 단순 표는 협업 시 컨텍스트 부족.

---

## Area 4: application-prod.yml 자격증명 처리

| Option | Description | Selected |
|--------|-------------|----------|
| env var only 복원 + systemd EnvironmentFile (Recommended) | application-prod.yml 을 ${DB_USER:} ${DB_PASS:} 로 복원. /etc/micesign/.env.production 작성 + chmod 600 + systemd EnvironmentFile=. 런북에 절차 포함. | ✓ |
| git-crypt 또는 SOPS | secret 자체는 암호화하여 repo 에 저장 (.env.production.enc), 해독 키는 배포 서버에만. 50인 규모 + 단일 환경에서 과스펙. | |
| Vault / AWS Secrets Manager | 외부 secret 관리 서비스 도입. 운영 인프라 추가 복잡도. 50인 규모에서 ROI 낮음. | |
| 그대로 두고 commit (위험⚠) | git history 에 secret 영구 노출. 권하지 않음. | |

**User's choice:** env var only 복원 + systemd EnvironmentFile
**Notes:** 50인 + 단일 환경에서 systemd 표준 패턴. 추가 도구 도입 없이 즉시 적용 가능. 외부 secret 매니저는 Phase 1-C 또는 v2 확장 시 재검토. 본 결정으로 working tree 의 미커밋 hardcoded secret 도 동시 해소.

---

## Area 5: v1.2-MILESTONE-AUDIT 산출물 그림

| Option | Description | Selected |
|--------|-------------|----------|
| 통합 audit + 출시 게이트 (Recommended) | .planning/milestones/v1.2/AUDIT.md 4 섹션: SC 충족도 매트릭스 / Deferred 추적 / Requirements 매핑 / 출시 게이트 체크리스트. 사내 보고용으로도 활용. | ✓ |
| 단순 INDEX | phase별 SUMMARY 링크 + 한 줄 결과 + 출시 날짜. 30분 작성. 증거 약하지만 이관 수월. | |
| 생략 | phase 별 SUMMARY 로 충분. 출시 게이트만 Phase 33 런북 마지막 섹션에. | |

**User's choice:** 통합 audit + 출시 게이트
**Notes:** 축소 scope 결정 후 본 산출물이 phase 의 가장 큰 deliverable 이 됨. 사내 비기술 stakeholder (대표/부서장) 도 SC 매트릭스 + 출시 게이트는 읽을 수 있게 한국어로 작성. Deferred 추적 섹션이 Plan 30-05 NFR-01 / Phase 29 D-A11 / D-B6 등을 cross-reference 하는 단일 진실 공급원 역할.

---

## Claude's Discretion

- 런북 / AUDIT.md 의 정확한 마크다운 구조 (헤더 분할, 표 vs 리스트 등)
- audit_log SQL 스팟 쿼리 형식 (action_type 별 GROUP BY 베이스)
- NFR 모니터링 SQL 형식 (slow_query_log 활성화 / performance_schema 활용)
- v1.2 → v1.3 전환 시점 결정 (별도 `/gsd-complete-milestone`)

## Deferred Ideas

본 phase 범위에서 명시적으로 빠진 항목:

- NFR-01 합성 부하 실측 — 운영 모니터링 게이트 발동 시 또는 v1.3 의 명시적 부하 phase
- 운영자 push 알림 파이프라인 — Phase 1-C / v2
- stale PENDING 자동 청소 cron — 수동 운영 (Phase 29 D-A11 결정 계승)
- secret 관리 도구 (git-crypt / SOPS / Vault / AWS Secrets Manager) — Phase 1-C 또는 v2 확장
- 분산 / 다중 인스턴스 / 무중단 배포 — v2 또는 50인 → 200인 확장
- APM 도구 — 부하 실제 발생 시점
- v1.3 신규 기능 — 별도 milestone 사이클

# MiceSign v1.2 마일스톤 통합 Audit + 출시 게이트

**작성:** 2026-04-28 (Phase 33 Plan 04, 결정 ID **D-A1**)
**마일스톤:** v1.2 — Phase 1-B "일상 업무 대체 수준"
**포함 phase:** 29 (SMTP 알림), 30 (검색 권한 + 필터), 31 (대시보드 고도화), 32 (CUSTOM 프리셋), 33 (본 검증 + 운영 전환)
**대상 청자:**
- 비기술 stakeholder (대표 / 부서장) — §0 요약 + §4 출시 게이트만 읽고 출시 가능 여부 의사결정 가능
- 출시 담당 개발자 — §1-5 전체 + §G5/§G6 의 수동 sign-off 수행
- DBA / 운영자 — §G7 (slow query log + 모니터링 게이트 활성화)

**연계 산출물 (cross-reference):**
- `.planning/milestones/v1.2/SMTP-RUNBOOK.md` — Phase 33-02 산출물, §G1-G4/§G5 source
- `.planning/milestones/v1.2/MONITORING.md` — Phase 33-03 산출물, §2-A / §G7 source
- `.planning/phases/30-where/30-BENCH-REPORT.md` — Plan 30-05 NFR-01 deferral source
- `.planning/milestones/v1.1-MILESTONE-AUDIT.md` — 형식 참조 (이전 마일스톤 audit 표준)

---

## 목차

- [§0. 요약 (비기술 stakeholder 용)](#0-요약-비기술-stakeholder-용)
- [§1. Phase별 SC (Success Criteria) 충족도 매트릭스](#1-phase별-sc-success-criteria-충족도-매트릭스)
- [§2. Deferred 항목 추적](#2-deferred-항목-추적)
- [§3. Requirements ID 매핑 표](#3-requirements-id-매핑-표)
- [§4. 출시 게이트 체크리스트](#4-출시-게이트-체크리스트)
- [§5. 출시 결정 기록](#5-출시-결정-기록)

---

## §0. 요약 (비기술 stakeholder 용)

v1.2 는 v1.0 (MVP 결재 플로우) + v1.1 (양식 빌더) 위에 **일상 업무 대체 수준의 알림·검색·대시보드·CUSTOM 프리셋** 4개 축을 올린 마일스톤. Docswave 등 외부 SaaS 의존을 사내 자체 시스템으로 대체하는 단계.

| 축 | Phase | 핵심 가치 (사용자 관점) | 출시 가능 여부 판단 근거 |
|----|-------|------------------------|------------------------|
| SMTP 이메일 알림 | 29 | 결재 5종 이벤트 (상신/중간 승인/최종 승인/반려/회수) 발생 시 자동 한글 HTML 메일 수신 | §1 Phase 29 표 + §4 §G2-G6 |
| 검색 권한 + 필터 | 30 | 본인 권한 범위만 검색 (보안 수정) + 키워드/상태/양식/기간/기안자 복합 필터 + URL 공유 가능 | §1 Phase 30 표 + §4 §G7 |
| 대시보드 고도화 | 31 | 4 카운트 카드 (대기/진행/완료/반려) + 결재/기안 5건 목록 + mutation 후 실시간 자동 갱신 | §1 Phase 31 표 |
| CUSTOM 프리셋 확장 | 32 | 회의록·품의서 프리셋 즉시 로드 (관리자가 양식 빌더에서 클릭 1회로 생성) | §1 Phase 32 표 |

**출시 결정 절차:** §4 출시 게이트 체크리스트의 **모든 항목 PASS** 시 출시 가능. 하나라도 FAIL 또는 미확인 시 보류 + 원인 해소 후 재실행. §G5 (5종 메일 수동 smoke) + §G6 (audit_log SQL 스팟) 은 출시 직전 운영 SMTP 환경에서 **수동 sign-off 필수**.

**Deferred 항목 5건 (§2 참조):**
1. NFR-01 합성 부하 실측 (검색 95p ≤ 1초) → 운영 모니터링 게이트로 이관 (`MONITORING.md`)
2. stale PENDING 자동 청소 cron → 수동 운영으로 결정 (`SMTP-RUNBOOK §6.2`)
3. 운영자 push 알림 (Slack/SMS) → Phase 1-C / v2 로 deferred
4. secret 매니저 (Vault/SOPS 등) → 50인 단일 환경에서 systemd EnvironmentFile + chmod 600 충분
5. APM 도구 (DataDog/NewRelic) → 부하 발생 시점에 검토

**v1.2 신규 기능 요구사항 충족 현황:** 21개 ID 중 **자동 회귀로 18개 PASS / Deferred 2개 (SRCH-06 + NFR-01 동일 항목 중복) / 자동 + 출시 전 SQL 스팟 보강 1개 (NFR-03)**. 미매핑 (gap) 0건.

---

## §1. Phase별 SC (Success Criteria) 충족도 매트릭스

각 Success Criterion (이하 SC) 은 다음 셋 중 하나로 분류:

- **자동** = 자동 회귀 테스트가 검증, 테스트 ID 명시
- **매뉴얼** = HUMAN-UAT.md / UAT.md 의 수동 검증 항목, 파일 경로 + 결과 명시
- **Deferred** = 본 마일스톤 출시 게이트 외로 이관, §2 와 cross-reference

ROADMAP.md 의 Phase 29-32 Success Criteria 원문을 그대로 옮겨 분류.

### Phase 29: SMTP 이메일 알림 인프라 (Retrofit)

**Goal (ROADMAP):** 기안자/결재자가 결재 이벤트 5종 발생 시 한글 HTML 이메일을 자동 수신, 발송이 결재 트랜잭션을 블로킹하지 않으며 실패는 `notification_log` 에 PENDING→SUCCESS/FAILED 로 기록된다.

| SC# | 내용 (요약) | 분류 | 검증 source |
|-----|------------|------|-------------|
| SC1 | 상신 시 첫 비-REFERENCE 승인자에게 `[MiceSign] 결재 요청: {docNumber} {title}` 한글 HTML 메일 도착 | 자동 + 매뉴얼 | `ApprovalNotificationIntegrationTest.submit_deliversToFirstNonReferenceApprover_koreanSubject` (GreenMail) + `29-VERIFICATION.md` Truth#1 PASS + `29-HUMAN-UAT.md` Test 1 (시각 렌더링 PASS) + 출시 §G5.1 |
| SC2 | 메일 본문 "문서 바로가기" CTA → `{app.base-url}/documents/{id}` 이동, 한글 subject UTF-8 보존 | 자동 + 매뉴얼 | `ApprovalNotificationIntegrationTest` (subject + body URL 단언) + `BaseUrlGuard.java` `@Profile("prod")` localhost 차단 + `29-HUMAN-UAT.md` Test 1 + 출시 §G4 + §G5 |
| SC3 | SMTP 실패 시 `@Retryable(maxAttempts=3)` 5분 간격 재시도 + 최종 실패 시 `notification_log.status=FAILED` + `error_message` 기록, PENDING 고아 행 없음 | 자동 | `ApprovalEmailSenderRetryTest.mailSendException_retriesThreeTimes_thenRecoversToFailed` (Plan 29-04) — `verify(mailSender, times(3))` + status=FAILED 단언 PASS |
| SC4 | RETIRED/INACTIVE 수신자 자동 제외 + 동일 (document_id, event_type, recipient_id) 조합 중복 SUCCESS 행 zero | 자동 | `ApprovalNotificationIntegrationTest.skipInactiveUsers` + `duplicateInsert_throwsDataIntegrityViolation` + V19 `uk_notification_dedup` UNIQUE 제약 |
| SC5 | 결재 API 응답이 메일 발송 결과와 독립 (`@Async` + `AFTER_COMMIT`) + 리스너에서 audit_log 추가 INSERT 없이 COUNT=1 per action | 자동 + 매뉴얼 | `ApprovalServiceAuditTest` 5 메서드 모두 `isEqualTo(1)` PASS (NFR-03 자동 회귀) + `29-HUMAN-UAT.md` Test 2 (응답 timing) PASS + 출시 §G6 SQL 스팟 |

**Phase 29 종합 판정:** 5/5 SC 모두 자동 회귀 + 매뉴얼 UAT (2026-04-23 sign-off) PASS. `29-VERIFICATION.md` status=verified, score=7/7 truths verified.

---

### Phase 30: 검색 권한 WHERE 절 보안 수정 + 필터 확장

**Goal (ROADMAP):** 본인 권한 범위 내 문서만 검색/필터링 (타인 DRAFT 노출 금지) + 제목·문서번호·상태·양식·기간·기안자 복합 조건을 URL-shareable 페이지네이션으로 제공. **운영 중 보안 취약점(SRCH-01) 을 첫 PR 로 해소**.

| SC# | 내용 (요약) | 분류 | 검증 source |
|-----|------------|------|-------------|
| SC1 | 사용자 A 의 SUBMITTED 문서가 승인자 B 의 검색 결과에 포함, 무관한 사용자 C 의 결과에서 제외 (FSD FN-SEARCH-001 권한 predicate) | 자동 | `DocumentRepositoryCustomImpl` QueryDSL 28-case 권한 매트릭스 테스트 (Plan 30-02) + `EXISTS approval_line` 분기 회귀 |
| SC2 | tab=department / tab=all 에서 status != DRAFT 보장, tab=my 에서만 본인 DRAFT 노출 (타인 DRAFT 노출 zero) | 자동 | DRAFT gate 매트릭스 (Plan 30-02) + tab 별 분기 단위 테스트 |
| SC3 | 키워드 + 상태(복수) + 양식 + 기간 + 기안자 복합 검색이 URL query 에 반영, 링크 공유로 동일 결과 재현 | 자동 | `DocumentListPage.test.tsx` (Plan 30-04) — 21 `@Test` URL ↔ UI 단위 회귀 + `paramsSerializer` 단언 |
| SC4 | 10K 문서 + 50 동시 사용자에서 95p ≤ 1초 (EXPLAIN 인덱스 사용 확인, countDistinct 정확) | **Deferred** | Plan 30-05 deferral 결정 (2026-04-28) → §2-A (`MONITORING.md`). EXPLAIN 정적 인덱스 사용 검증은 Plan 30-02 PASS — 합성 부하 ab 측정만 운영 모니터링 게이트로 이관 |
| SC5 | 페이지 크기 20 offset 페이지네이션 동작, totalElements 가 접근 가능 문서 수와 일치 (JOIN 중복 inflate 없음) | 자동 | `countDistinct` 단위 테스트 (Plan 30-02) + `DocumentRepositoryCustomImpl` JOIN distinct 회귀 |

**Phase 30 종합 판정:** 5 SC 중 4개 자동 회귀 PASS + 1개 (SC4) 운영 모니터링 게이트로 이관. 본 deferral 은 Plan 30-05 의 사용자 결정 (Rule 2 deviation, 2026-04-28) 으로 명시 기록 — 50인 사내 시스템에서 10K 문서 + 50 동시 활성 도달은 6-12개월 후 시나리오로 합성 부하 측정값과 실 사용자 분포 차이 비대칭. EXPLAIN 정적 검증 PASS + 운영 신호 발동 시 재실측 인프라 (`SearchBenchmarkSeeder` + `bench-search.sh`) 보존.

---

### Phase 31: 대시보드 고도화

**Goal (ROADMAP):** 대시보드 한 화면에서 결재 대기/진행 중/승인 완료/반려 4종 카운트 + 처리할 결재 5건 + 기안 5건 목록 + 승인·반려·상신·회수 직후 자동 갱신.

| SC# | 내용 (요약) | 분류 | 검증 source |
|-----|------------|------|-------------|
| SC1 | 4 CountCard (결재 대기 / 진행 중 / 승인 완료 / 반려) + 권한·스코프 (USER vs ADMIN vs SUPER_ADMIN) 별 정확한 카운트 | 자동 + 매뉴얼 | `DashboardServiceIntegrationTest` matrix (Plan 31-02) — 3 role × 4 카운트 = 12 case 모두 PASS + `31-UAT.md` Test 1-3 (USER/ADMIN/SUPER_ADMIN 가시성 PASS) |
| SC2 | "내가 처리할 결재 5건" + "내가 기안한 최근 5건" + "새 문서 작성" CTA → 양식 선택 화면 | 자동 + 매뉴얼 | `DashboardPage` smoke test (Plan 31-04) + role-based statusPath helper + `31-UAT.md` Test 14 (CTA 클릭 → TemplateSelectionModal PASS) |
| SC3 | 로딩 중 skeleton + 결과 없을 때 empty 상태 (일러스트 + 문구) | 매뉴얼 | `31-UAT.md` Test 9 (skeleton 동기화 PASS — D-C5 단일 훅) + Test 10 (empty state PendingList/RecentDocumentsList PASS) + Test 11 (error state PASS) |
| SC4 | mutation (승인/반려/상신/회수) 성공 시 `queryClient.invalidateQueries(['dashboard'])` 즉시 호출 → 카운트·목록 자동 재조회 (페이지 이동 없이) | 자동 + 매뉴얼 | invalidate spy 테스트 (Plan 31-05, useApprove/useReject/useSubmitDocument/useWithdrawDocument 4 mutation 훅) + `31-UAT.md` Test 4-7 (4 mutation 실시간 갱신 PASS) + Test 8 (placeholderData 효과 — skeleton 플래시 없음) |

**Phase 31 종합 판정:** 4 SC 모두 자동 회귀 + `31-UAT.md` 14/14 PASS (2026-04-25 sign-off, 0 issues). `31-VERIFICATION.md` status=passed, human_uat_resolved.

---

### Phase 32: CUSTOM 프리셋 확장

**Goal (ROADMAP):** 관리자가 v1.1 CUSTOM 빌더의 프리셋 갤러리에서 회의록/품의서 JSON 프리셋을 선택해 양식 즉시 생성 — **신규 하드코딩 컴포넌트 없이** 프리셋 JSON 추가만으로 확장.

| SC# | 내용 (요약) | 분류 | 검증 source |
|-----|------------|------|-------------|
| SC1 | "회의록" 프리셋 선택 → 회의 일시/참석자/안건/결정사항 5 fields CUSTOM 스키마 즉시 로드, 저장 없이 편집 가능 | 자동 + 매뉴얼 | `presets.test.ts` 9 단언 GREEN (length=6, meeting fields=5) + `32-HUMAN-UAT.md` 섹션 1-2 (1-22, 16 항목) PASS |
| SC2 | "품의서" 프리셋 선택 → 품의 배경·제안 내용·예상 효과 4 fields CUSTOM 스키마 즉시 로드 | 자동 + 매뉴얼 | `presets.test.ts` (proposal fields=4) + `32-HUMAN-UAT.md` 섹션 3 (23-30, 8 항목) PASS — 첨부 미포함 시각 확인 (D-B6) |
| SC3 | 두 프리셋 JSON 모두 v1.1 `templateImportSchema` Zod 검증 통과 + DynamicCustomForm 정상 렌더 + 과거 문서 snapshot 불변성 유지 | 자동 + 매뉴얼 | `presets.test.ts` (Zod `.strict()` 통과 build-time fail-fast) + Vite build PASS (646ms) + `32-HUMAN-UAT.md` 섹션 4-5 (31-37, 7 항목) PASS — 기존 4 preset 회귀 0건, snapshot 불변성 |

**Phase 32 종합 판정:** 3 SC 모두 자동 회귀 + `32-HUMAN-UAT.md` 37/37 PASS (2026-04-26 sign-off, 0 issues, T-32-02 옵션 A 확정). `32-06-SUMMARY.md` 자동 검증 (vitest 60 passed / Vite build / tsc) 모두 GREEN.

---

### Phase별 SC 매트릭스 종합

| Phase | 총 SC | 자동 PASS | 매뉴얼 PASS | Deferred | 종합 |
|-------|-------|-----------|-------------|----------|------|
| 29 SMTP | 5 | 5 | 2 (Test 1, 2) | 0 | **PASS** |
| 30 검색 | 5 | 4 | 0 | 1 (SC4 → §2-A) | **PASS (1 deferred)** |
| 31 대시보드 | 4 | 4 | 14 (UAT 14/14) | 0 | **PASS** |
| 32 CUSTOM | 3 | 3 | 37 (UAT 37/37) | 0 | **PASS** |
| **합계** | **17** | **16** | **53 항목** | **1** | **17/17 출시 가능 (1건 운영 모니터링 게이트로 이관)** |

---

## §2. Deferred 항목 추적

아래 항목은 v1.2 출시 게이트가 아닌 **운영 모니터링 게이트** 또는 **후속 마일스톤** (Phase 1-C / v2 / v1.3) 으로 이관됨. 모든 deferred 항목은 **출처 + 결정 사유 + 후속 게이트 + 발동 트리거 + 보존 산출물 + 종료 조건** 6개 항을 명시하여 추적 누락 위험을 zero 로 한다.

### §2-A. NFR-01 (검색 95p ≤ 1초 합성 부하 실측)

| 항목 | 내용 |
|------|------|
| **출처** | Phase 30 SC4, REQUIREMENTS NFR-01 + SRCH-06 (동일 요구사항 중복 명시) |
| **결정** | Plan 30-05 deferral (2026-04-28) — `30-BENCH-REPORT.md` §Deferral Decision |
| **사유** | 50인 사내 시스템에서 10K 문서 + 50 동시 활성 도달은 6-12개월 후 시나리오. 합성 부하 (ab) 측정값과 실 사용자 분포 차이 비대칭. 정적 분석 게이트 (QueryDSL 28-case 권한 매트릭스 + EXPLAIN 인덱스 사용) PASS 로 1차 안전망 확보. |
| **후속 게이트** | 운영 모니터링 — `.planning/milestones/v1.2/MONITORING.md` (Phase 33-03 산출물, 450 lines) |
| **트리거 (3 신호 — D-S2)** | (a) 사용자 체감 검색 지연 신고 1건 이상 / (b) MariaDB slow_query_log 의 `/api/v1/documents/search` 백엔드 쿼리가 1초 초과로 1회 이상 기록 / (c) 동시 활성 사용자 30명 도달 |
| **보존 산출물** | `backend/src/main/java/com/micesign/tools/SearchBenchmarkSeeder.java` (`@Profile("bench")` idempotent 10K seeder) + `scripts/bench-search.sh` (3 시나리오 ab 부하 + REPORT auto-append) + `backend/src/main/resources/application-bench.yml` + `30-BENCH-REPORT.md` (재실측 결과 append 위치) |
| **재개 절차** | `MONITORING.md` §4 — `./gradlew bootRun --args='--spring.profiles.active=bench'` → JWT 획득 → `BENCH_JWT="$BENCH_JWT" ./scripts/bench-search.sh` → `30-BENCH-REPORT.md` 갱신 → FAIL 시 V20 인덱스 후보 검토 (별도 phase) |
| **종료 조건** | (1) 3 신호 6개월 무발동 → APM 도입 검토로 이관 / (2) 신호 발동 → 재실측 + 보강 1회 완료 시 cumulative 카운트 리셋 |

### §2-B. stale PENDING 자동 청소 cron

| 항목 | 내용 |
|------|------|
| **출처** | Phase 29 D-A11 |
| **결정** | 자동화 거절 — 수동 운영 채택 (cron 도입은 과스펙) |
| **사유** | 50인 + 드문 서버 재시작 가정. cron 도입 시 추가 운영 surface (실패 알림 / 모니터링 / cron 자체의 장애) 발생. PENDING-first 패턴 (Phase 29 D-A1) 의 의도된 trade-off. |
| **후속 게이트** | `SMTP-RUNBOOK.md` §6.2 — 수동 FAILED 전환 SQL 운영 절차 (`UPDATE notification_log SET status='FAILED' ... WHERE created_at < DATE_SUB(NOW(), INTERVAL 10 MINUTE)`) |
| **트리거** | 주간 점검 시 PENDING 행이 10분 이상 잔존 발견 (`SMTP-RUNBOOK §6.2` SQL 실행 결과) |
| **보존 산출물** | `SMTP-RUNBOOK.md` §6.2 (수동 UPDATE SQL 그대로 복붙 가능) + Phase 29 의 `notification_log.created_at` / `status` 컬럼 (V6 migration) |
| **종료 조건** | (1) 사용자 50인 → 200인 확장 시 cron 또는 scheduled task 도입 검토 / (2) Phase 1-C 운영 자동화 phase 에서 흡수 |

### §2-C. 운영자 push 알림 파이프라인 (Slack/SMS/PagerDuty)

| 항목 | 내용 |
|------|------|
| **출처** | Phase 29 D-B6 — `@Retryable` 최종 실패 시 push 알림 |
| **결정** | ERROR 로그 + `notification_log.status=FAILED` 기록 only (Phase 1-C / v2 로 이관) |
| **사유** | 50인 규모 + 주간 수동 SQL 조회로 충분. push 통합 시 외부 의존성 추가 (Slack API / Twilio / PagerDuty 등) + 인증 토큰 secret 관리 비용. |
| **후속 게이트** | `SMTP-RUNBOOK.md` §6.3 — 주간 NOTIF FAILED 조회 SQL (`SELECT event_type, COUNT(*) FROM notification_log WHERE status='FAILED' AND created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY) GROUP BY event_type`) |
| **트리거** | 주간 점검 시 `failed_cnt > 0` 발견 시 `error_message` 별 빈도 SQL 로 원인 분기 |
| **보존 산출물** | `SMTP-RUNBOOK.md` §6.3 SQL + Phase 29 의 ERROR 로그 발생 지점 (`ApprovalEmailSender.@Recover` 메서드) |
| **종료 조건** | Phase 1-C 운영 자동화 phase 에서 push 통합 검토 또는 v2 마일스톤에서 흡수 |

### §2-D. secret 관리 도구 (git-crypt / SOPS / Vault / AWS Secrets Manager)

| 항목 | 내용 |
|------|------|
| **출처** | Phase 33 D-C2 |
| **결정** | 도입하지 않음 — 50인 단일 환경에서 systemd EnvironmentFile + chmod 600 충분 |
| **사유** | 외부 secret 매니저 도입 = 추가 인프라 + 운영자 학습 비용. 현재 1 서버 단일 환경에서 ROI 부정. PRD "사내 단일 서버 systemd" 가정 (`PROJECT.md` Constraints) 과 일치. |
| **후속 게이트** | (없음) — Phase 1-C 또는 v2 확장 시 재검토 |
| **트리거** | (a) multi-environment 분리 (staging / prod) 도입 / (b) compliance 요구 (ISO 27001 / 사내 보안 정책 등) 발생 / (c) 50인 → 200인 확장 |
| **보존 산출물** | `application-prod.yml` (env var only 패턴, hardcoded default 미포함 — Phase 33-01 commit `12fc094`) + `application-prod.yml.example` (운영 변수 카탈로그) + `.gitignore` 의 `.env.production` 차단 line + `SMTP-RUNBOOK.md` §2 절차 |

### §2-E. APM 도구 도입 (DataDog / NewRelic / Pinpoint / Pyroscope)

| 항목 | 내용 |
|------|------|
| **출처** | Phase 33 D-S2 의 대안 검토 (33-CONTEXT §Deferred 명시) |
| **결정** | 도입하지 않음 — slow_query_log + 사용자 신고로 충분 |
| **사유** | APM 라이센스 비용 + 50인 트래픽 양에서 과스펙. 부하가 실제 발생하는 시점까지는 `MONITORING.md` 의 SQL 점검 사이클로 대체. |
| **후속 게이트** | `MONITORING.md` §5.2 종료 조건 (1) — 3 신호 6개월 무발동 시 APM 검토 또는 사내 Grafana 도입 시 dashboard 화 |
| **트리거** | (a) 부하 발생 빈도 증가 / (b) 다중 서비스 운영 시작 / (c) `MONITORING.md` §3 의 cumulative 카운트 누적 |
| **보존 산출물** | `MONITORING.md` (모든 절차 자기완결적으로 문서화 — APM 도입 시 자동 export 또는 dashboard 패널 변환 가능 형식) |

---

## §3. Requirements ID 매핑 표

`REQUIREMENTS.md` 의 v1.2 ID 21개 모두 등재. 각 ID 의 검증 phase + 자동 테스트 ID + 매뉴얼 UAT 또는 잔존 부채 명시.

### §3-A. SMTP 이메일 알림 (NOTIF-01~05 + NFR-02 + NFR-03)

| ID | 요구사항 (요약) | 검증 phase | 자동 테스트 | 매뉴얼 / 잔존 부채 |
|----|----------------|------------|-------------|------|
| NOTIF-01 | 5종 이벤트 자동 메일 발송 | Phase 29 | `ApprovalNotificationIntegrationTest` (5 이벤트 + skipInactive) | `29-HUMAN-UAT.md` Test 1 PASS |
| NOTIF-02 | 메일 "문서 바로가기" → app.base-url 절대 URL + 한글 subject UTF-8 | Phase 29 | `ApprovalNotificationIntegrationTest` (subject + body URL 단언) + `BaseUrlGuard.java` localhost 차단 | `29-HUMAN-UAT.md` Test 1 PASS |
| NOTIF-03 | `@Retryable(maxAttempts=3)` 재시도 + `notification_log` PENDING→SUCCESS/FAILED | Phase 29 | `ApprovalEmailSenderRetryTest.mailSendException_retriesThreeTimes_thenRecoversToFailed` (Plan 29-04) | (없음) |
| NOTIF-04 | RETIRED/INACTIVE 수신자 자동 skip + 동일 (doc, event, recipient) 중복 SUCCESS zero | Phase 29 | `ApprovalNotificationIntegrationTest.skipInactiveUsers` + `duplicateInsert_throwsDataIntegrityViolation` + V19 unique constraint | (없음) |
| NOTIF-05 | `[MiceSign]` prefix + 한글 UTF-8 본문 (MimeMessageHelper UTF-8 강제) | Phase 29 | `ApprovalNotificationIntegrationTest` (subject UTF-8) + `approval-base.html` UTF-8 meta + Malgun Gothic CJK 폰트 | `29-HUMAN-UAT.md` Test 1 PASS |
| NFR-02 | `@Async` + AFTER_COMMIT (트랜잭션 비블로킹) | Phase 29 | `ApprovalServiceAuditTest` (트랜잭션 분리) | `29-HUMAN-UAT.md` Test 2 PASS (timing) |
| NFR-03 | audit_log 중복 INSERT 방지 (COUNT=1 per action) | Phase 29 | `ApprovalServiceAuditTest` 5 메서드 모두 `isEqualTo(1)` PASS | **출시 §G6 SQL 스팟 보강** (5종 smoke 직후 운영 환경 manual confirmation) |

### §3-B. 검색/필터링 (SRCH-01~06 + NFR-01)

| ID | 요구사항 (요약) | 검증 phase | 자동 테스트 | 매뉴얼 / 잔존 부채 |
|----|----------------|------------|-------------|------|
| SRCH-01 | 권한 WHERE 절 보안 수정 (FSD FN-SEARCH-001) | Phase 30 | QueryDSL 28-case 권한 매트릭스 (Plan 30-02) — `EXISTS approval_line` 분기 회귀 | (없음 — 보안 수정 자동 회귀로 충분) |
| SRCH-02 | 키워드 LIKE 검색 (제목/문서번호) | Phase 30 | `DocumentRepositoryCustomImpl` 단위 테스트 (Plan 30-02) | (없음) |
| SRCH-03 | 상태(복수) + 양식 + 기간 필터 | Phase 30 | `DocumentListPage.test.tsx` (Plan 30-04) + repo 단위 테스트 | (없음) |
| SRCH-04 | 기안자(드롭다운) 필터 | Phase 30 | `/users/search` 엔드포인트 테스트 (Plan 30-03) + `DrafterCombo` 컴포넌트 단위 테스트 | (없음) |
| SRCH-05 | offset 페이지네이션 + URL query 동기화 | Phase 30 | `DocumentListPage.test.tsx` 21 `@Test` (Plan 30-04) — `paramsSerializer` + `useSearchParams` 회귀 | (없음) |
| SRCH-06 | 95p ≤ 1초 (10K seed + 50 동시) | Phase 30 → **Deferred** | EXPLAIN 정적 인덱스 사용 검증 PASS (Plan 30-02) | §2-A (`MONITORING.md` 운영 모니터링 게이트) |
| NFR-01 | 검색 응답 95p ≤ 1초 (NFR 관점, SRCH-06 와 중복 명시) | Phase 30 → **Deferred** | (동일 — SRCH-06) | §2-A (동일) |

### §3-C. 대시보드 고도화 (DASH-01~05)

| ID | 요구사항 (요약) | 검증 phase | 자동 테스트 | 매뉴얼 / 잔존 부채 |
|----|----------------|------------|-------------|------|
| DASH-01 (v1.2) | 4 카운트 카드 + role-based (USER/ADMIN/SUPER_ADMIN) | Phase 31 | `DashboardServiceIntegrationTest` matrix (Plan 31-02) — 3 role × 4 카운트 = 12 case | `31-UAT.md` Test 1-3 PASS |
| DASH-02 (v1.2) | "내가 처리할 결재 5건" + "내가 기안한 최근 5건" | Phase 31 | `DashboardPage` smoke test (Plan 31-04) | `31-UAT.md` Test 14 PASS |
| DASH-03 (v1.2) | "새 문서 작성" CTA → 양식 선택 화면 | Phase 31 | `DashboardPage` 라우팅 단언 (Plan 31-04) | `31-UAT.md` Test 14 PASS (TemplateSelectionModal) |
| DASH-04 | skeleton + empty state UI | Phase 31 | smoke test (Plan 31-04) | `31-UAT.md` Test 9-11 PASS (skeleton 동기화 / empty / error state) |
| DASH-05 | mutation 후 `invalidateQueries(['dashboard'])` | Phase 31 | invalidate spy 테스트 4 mutation 훅 (Plan 31-05) — useApprove/useReject/useSubmitDocument/useWithdrawDocument | `31-UAT.md` Test 4-7 PASS (4 mutation 실시간 갱신) + Test 8 (skeleton 플래시 없음 — placeholderData 효과) |

### §3-D. 양식 확장 (FORM-01~02)

| ID | 요구사항 (요약) | 검증 phase | 자동 테스트 | 매뉴얼 / 잔존 부채 |
|----|----------------|------------|-------------|------|
| FORM-01 | "회의록" 프리셋 즉시 로드 (5 fields, prefix=MTG, icon=Users) | Phase 32 | `presets.test.ts` 9 단언 GREEN (length=6 + meeting fields=5 + Zod `.strict()` 통과) | `32-HUMAN-UAT.md` 섹션 1-2 (1-22, 16 항목) PASS — T-32-02 옵션 A 확정 |
| FORM-02 | "품의서" 프리셋 즉시 로드 (4 fields, prefix=PRP, icon=FileSignature, 첨부 미포함) | Phase 32 | `presets.test.ts` (proposal fields=4) + Vite build PASS (646ms) | `32-HUMAN-UAT.md` 섹션 3 (23-30, 8 항목) PASS — D-B6 첨부 미포함 시각 확인 |

### §3-E. 매핑 커버리지 종합

- **v1.2 requirements 총량:** 21 ID
- **자동 회귀로 PASS (잔존 부채 없음):** 18 (NOTIF-01/02/03/04/05 + NFR-02 + SRCH-01/02/03/04/05 + DASH-01/02/03/04/05 + FORM-01/02)
- **Deferred (운영 모니터링 게이트):** 2 (SRCH-06 + NFR-01 — 동일 요구사항 중복 명시)
- **자동 + 출시 전 SQL 스팟 보강:** 1 (NFR-03 → §4 §G6)
- **미매핑 (gap):** 0

**판독:** v1.2 의 모든 요구사항 ID 가 단일 표에서 검증 경로 추적 가능. Deferred 2건은 §2-A 의 후속 게이트로 보존 + NFR-03 1건은 §G6 SQL 스팟으로 자동 회귀 보강. 출시 게이트 결정에 누락된 요구사항 zero.

---

## §4. 출시 게이트 체크리스트

아래 모든 항목 PASS 시 v1.2 운영 출시 가능. 하나라도 FAIL 또는 미확인 시 보류 + 원인 해소 후 재실행. 각 항목 좌측 체크박스는 출시 담당자가 수동으로 채움. 본 plan 의 Task 4 (수동 5종 smoke 체크포인트) 가 §G5 + §G6 를 PASS 마크.

총 9개 게이트 그룹 (G1-G9), 30+ 검증 항목.

### G1. DB 마이그레이션 적용 검증

- [ ] **G1.1** Flyway 가 V1~V19 마이그레이션을 모두 success 로 기록함
  - 검증: `mysql -u$DB_USER -p$DB_PASS $DB_NAME -e "SELECT version, description, success FROM flyway_schema_history ORDER BY installed_rank;"`
  - 기대: 18 rows (V1-V6, V8-V19 — V7 결번), 모두 `success=1`
  - 마지막 row 의 `version=19` (V19 = `add_notification_dedup_unique`, NOTIF-04 unique constraint)
- [ ] **G1.2** charset / collation = utf8mb4 / utf8mb4_unicode_ci
  - 검증: `mysql -u$DB_USER -p$DB_PASS -e "SELECT default_character_set_name, default_collation_name FROM information_schema.schemata WHERE schema_name = '$DB_NAME';"`
  - 기대: `utf8mb4 / utf8mb4_unicode_ci` (한글 본문 / subject UTF-8 보존의 전제)

### G2. 환경변수 + 자격증명 위생 (Phase 33 D-C1)

- [ ] **G2.1** `application-prod.yml` 의 username/password 가 모두 빈 default (`${DB_USER:}` / `${DB_PASS:}`)
  - 검증: `grep -E '\$\{DB_(USER|PASS):' backend/src/main/resources/application-prod.yml | grep -E ':\}$'`
  - 기대: 2 줄 출력 (`DB_USER:}` + `DB_PASS:}`). hardcoded default 값이 있으면 git history secret 노출 위험 — Phase 33-01 commit `12fc094` 누락
- [ ] **G2.2** `/etc/micesign/.env.production` 권한 = 600, owner = micesign:micesign
  - 검증 (운영 서버): `stat -c '%a %U:%G' /etc/micesign/.env.production`
  - 기대: `600 micesign:micesign`
  - SMTP-RUNBOOK §2.2 절차로 보정 가능
- [ ] **G2.3** systemd unit 의 `EnvironmentFile=/etc/micesign/.env.production` 설정 + daemon-reload 완료
  - 검증: `sudo systemctl show micesign.service -p EnvironmentFiles | grep .env.production`
  - 기대: `EnvironmentFiles=/etc/micesign/.env.production (ignore_errors=no)`
  - SMTP-RUNBOOK §3.3 절차로 보정

### G3. SMTP 운영 연결 (Phase 33 D-M1)

- [ ] **G3.1** `MAIL_HOST` / `MAIL_PORT` 가 `.env.production` 에 채워짐 (빈 값 → JavaMailSender bean 생성 skip + stub fallback)
  - 검증 (운영 서버): `sudo grep -E '^MAIL_(HOST|PORT)=' /etc/micesign/.env.production` (값 노출 안 되도록 운영자 직접 확인)
- [ ] **G3.2** 사내 IT 가 운영 서버 IP 를 SMTP allowlist 에 추가 + From 도메인 승인 (SMTP-RUNBOOK §1.1 4 항목 회신 완료)
  - 검증: 사내 IT 측 회신 메일 또는 협의 기록
- [ ] **G3.3** 운영 서버에서 `telnet $MAIL_HOST $MAIL_PORT` 핸드셰이크 PASS (SMTP banner `220 ... ESMTP ...` 출력)
  - 검증: SMTP-RUNBOOK §4.3 절차 (`telnet` 또는 `nc -zv` 또는 `openssl s_client -starttls smtp`)
  - 도달 불가 시 §G3.2 의 IT 협의로 회귀

### G4. BaseUrlGuard startup 검증 (Phase 29 D-D2)

- [ ] **G4.1** `APP_BASE_URL` 이 사내 실 도메인 (`https://micesign.사내도메인` 형식, localhost / 127.0.0.1 미포함)
  - 검증: `sudo grep '^APP_BASE_URL=' /etc/micesign/.env.production`
  - 기대: `localhost` / `127.0.0.1` / 빈 값 zero
- [ ] **G4.2** `sudo systemctl restart micesign` 후 `journalctl -u micesign | grep BaseUrlGuard` 가 PASS 로그 + IllegalStateException 부재
  - 검증 (게이트 1): `sudo journalctl -u micesign -n 500 --no-pager | grep -E 'BaseUrlGuard|app\.base-url'` — 1줄 이상 출력
  - 검증 (게이트 2): 위 출력의 어떤 라인에도 `localhost` 미포함 (`grep -v localhost` 가 모두 살아남음)
  - 추가: `HikariPool-1 - Start completed` 로그 존재 (DB 연결 성공)
  - SMTP-RUNBOOK §4.2 + §6.1 트러블슈팅 참조

### G5. 5종 이벤트 수동 smoke (Phase 33 D-M3 — 본 plan Task 4 에서 수동 sign-off)

상세 절차: `SMTP-RUNBOOK.md` §5.1-5.2

- [ ] **G5.1** 시나리오 1 (상신, DRAFT → SUBMITTED) — `[MiceSign]` prefix + 한글 subject UTF-8 + 본문 정상 + "문서 바로가기" 버튼 동작 + From 도메인 §1 IT 승인
- [ ] **G5.2** 시나리오 2 (중간 승인, step N → step N+1) — 동일 5 항목
- [ ] **G5.3** 시나리오 3 (최종 승인, last step → APPROVED) — 동일 5 항목 + 본문에 "최종 승인" 또는 등가 한글 표현
- [ ] **G5.4** 시나리오 4 (반려, any step → REJECTED) — 동일 5 항목 + 반려 사유 표시
- [ ] **G5.5** 시나리오 5 (회수, SUBMITTED → WITHDRAWN) — 동일 5 항목

검증 환경: 운영 SMTP (출시 직전) 또는 MailHog (개발 환경 사전 검증). MailHog UI = `http://localhost:8025`.

### G6. audit_log SQL 스팟 검증 (Phase 33 NFR-03 출시 전 보강)

상세 SQL: `SMTP-RUNBOOK.md` §5.3-5.4

- [ ] **G6.1** §G5 5 시나리오 각 문서별 `audit_log` COUNT=1 per action_type 확인
  ```sql
  SELECT action_type, COUNT(*) AS cnt
  FROM audit_log
  WHERE document_id = ?    -- 시나리오 별 문서 ID 치환
  GROUP BY action_type
  ORDER BY action_type;
  ```
  - 기대: 모든 action_type 의 `cnt = 1` (SMTP listener 의 중복 INSERT 부재 — Phase 29 D-D6 자동 회귀의 manual confirmation)
  - `cnt >= 2` 발견 시 즉시 출시 보류 + Phase 29 D-D6 회귀 조사 (`./gradlew test --tests com.micesign.approval.ApprovalServiceAuditTest`)
- [ ] **G6.2** §G5 5 시나리오 각 문서별 `notification_log` status=SUCCESS, cnt=1 확인 (NOTIF-04 dedup unique constraint 회귀 검증)
  ```sql
  SELECT event_type, recipient_id, status, COUNT(*) AS cnt
  FROM notification_log
  WHERE document_id = ?
  GROUP BY event_type, recipient_id, status
  ORDER BY event_type, recipient_id;
  ```
  - 기대: 모든 행 `status = SUCCESS`, 각 (event_type, recipient_id) 조합 `cnt = 1`
  - PENDING / FAILED 행 발견 시 SMTP-RUNBOOK §6.2 / §6.3 트러블슈팅으로

### G7. NFR-01 운영 모니터링 게이트 활성화 (Phase 33 D-S2)

상세 절차: `MONITORING.md` §2

- [ ] **G7.1** MariaDB `slow_query_log = ON` + `long_query_time = 1.0` + my.cnf 영구화
  - 검증: `mysql -uroot -e "SHOW VARIABLES WHERE variable_name IN ('slow_query_log', 'long_query_time', 'slow_query_log_file', 'log_output');"`
  - 기대: `slow_query_log=ON / long_query_time=1.000000 / slow_query_log_file=/var/log/mysql/slow.log / log_output=FILE,TABLE`
  - MONITORING.md §2.1 (임시) + §2.2 (영구화 — `/etc/mysql/mariadb.conf.d/50-server.cnf`) 참조
- [ ] **G7.2** logrotate 설정 (`/etc/logrotate.d/mariadb-slow`) 적용
  - 검증: `sudo logrotate -d /etc/logrotate.d/mariadb-slow` (dry-run, "rotating" 출력) + 파일 권한 = `mysql:mysql 640`
  - MONITORING.md §2.4 참조 — T-33-10 디스크 full mitigation
- [ ] **G7.3** `MONITORING.md` §3 정기 점검 사이클이 운영자 캘린더에 등록됨 (주간 월요일 오전 — 주간 집계 SQL 실행)
  - 검증: 운영자 측 캘린더 / 운영 노트 등록 확인

### G8. 디스크 + 백업 + 롤백 절차

- [ ] **G8.1** 디스크 사용량 < 70%
  - 검증: `df -h /var/lib/mysql /var/log /opt/micesign`
  - 기대: 3 디렉토리 모두 `Use% < 70%` (slow_query_log 누적 + DB 성장 여유 확보)
- [ ] **G8.2** MariaDB 일일 dump 백업 cron 등록 (또는 사내 IT 백업 정책 적용)
  - 검증: `sudo crontab -u mysql -l | grep mysqldump` 또는 사내 IT 측 백업 정책 문서
  - 보관 정책: 30일 (사내 IT 표준 따름)
- [ ] **G8.3** Google Drive Service Account credentials 파일 권한 600 + backup 1부 별도 보관
  - 검증: `stat -c '%a %U:%G' /etc/micesign/google-drive-credentials.json`
  - 기대: `600 micesign:micesign`
  - backup: 사내 IT 측 secret 보관소 또는 별도 암호화 USB
- [ ] **G8.4** 롤백 절차 작성 — 직전 `.jar` 보존 + 롤백 시 systemd unit 의 ExecStart 라인 swap 절차
  - 검증: `/opt/micesign/` 디렉토리에 `app.jar` (현재) + `app.jar.previous` (직전) 동시 존재
  - 롤백 명령 (1줄): `sudo cp /opt/micesign/app.jar.previous /opt/micesign/app.jar && sudo systemctl restart micesign`

### G9. 산출물 cross-reference 무결성

- [ ] **G9.1** `SMTP-RUNBOOK.md` §6.4 가 `MONITORING.md` 를 cross-reference (33-02 verify 단계에서 자동 확인)
  - 검증: `grep -q 'MONITORING.md' .planning/milestones/v1.2/SMTP-RUNBOOK.md` (PASS)
- [ ] **G9.2** `application-prod.yml.example` 이 `SMTP-RUNBOOK.md` §2.1 에 명시 (33-01 산출물이 33-02 절차에 통합됨)
  - 검증: `grep -q 'application-prod.yml.example' .planning/milestones/v1.2/SMTP-RUNBOOK.md` (PASS)
- [ ] **G9.3** 본 AUDIT.md 의 §1 SC 매트릭스 / §2 Deferred / §3 Requirements / §4 게이트 4 섹션 모두 작성됨 + §5 출시 결정 기록 placeholder 존재
  - 검증: 본 문서 §0 목차 6 항목 모두 §0/§1/§2/§3/§4/§5 헤더 존재

---

## §5. 출시 결정 기록 (출시 시점에 채움)

본 § 는 출시 담당자가 §1-4 모든 게이트 PASS 확인 후 출시 시점에 직접 채움. 출시 사인오프의 **단일 source of truth** — 본 표가 채워지면 v1.2 운영 출시 완료로 간주.

### §5.1 출시 메타데이터

| 항목 | 값 |
|------|-----|
| 출시 일시 | YYYY-MM-DD HH:MM (KST) |
| 출시 담당자 | (이름) |
| 사인오프 결과 | PASS / FAIL |
| FAIL 시 사유 | (해당 시 기재) |
| §4 모든 게이트 PASS 여부 | YES / NO |
| 운영 모니터링 게이트 활성화 (§G7) | YES / NO |
| 다음 점검 예정일 | YYYY-MM-DD (출시일 + 7일 — 첫 주간 점검) |

### §5.2 게이트 그룹별 PASS 결과 요약 (출시 시점 기록)

| 게이트 | 결과 | 비고 |
|--------|------|------|
| G1 DB 마이그레이션 | PASS / FAIL | (V1-V19 적용 결과) |
| G2 환경변수 + 자격증명 위생 | PASS / FAIL | (`stat`, systemd 결과) |
| G3 SMTP 운영 연결 | PASS / FAIL | (telnet PASS / IT allowlist) |
| G4 BaseUrlGuard startup | PASS / FAIL | (BaseUrlGuard 게이트 1+2 결과) |
| G5 5종 이벤트 수동 smoke | PASS / FAIL | (Task 4 사용자 sign-off) |
| G6 audit_log SQL 스팟 | PASS / FAIL | (Task 4 SQL cnt=1 확인) |
| G7 NFR-01 운영 모니터링 게이트 | PASS / FAIL | (slow_query_log + logrotate) |
| G8 디스크 + 백업 + 롤백 | PASS / FAIL | (df / mysqldump cron / 롤백 1줄) |
| G9 산출물 cross-reference 무결성 | PASS / FAIL | (자동 grep PASS) |

### §5.3 v1.2 archive 결정 (Plan 33-05 에서 처리)

- [ ] 출시 후 최소 7일간 경과 + 첫 주간 점검 (`MONITORING.md` §3 + `SMTP-RUNBOOK.md` §6.3) 무이슈 PASS
- [ ] `gsd:complete-milestone v1.2` 실행 → REQUIREMENTS.md v1.2 21 ID 모두 `[x]` 마크 + Traceability 표 Status `Complete`
- [ ] `.planning/milestones/v1.2/` 디렉토리 archive 처리 (본 AUDIT.md + SMTP-RUNBOOK.md + MONITORING.md 보존)

---

## 변경 이력

| 일자 | 변경 | 작성자 |
|------|------|--------|
| 2026-04-28 | v1.2 초판 (Phase 33 Plan 04 D-A1, §0-§5 작성) | (출시 담당) |

---

*문서 끝. 본 audit 는 v1.2 의 단일 출시 결정 source — §1-3 검증 + §4 게이트 PASS + §5 결정 기록 완료 시 출시. 비기술 stakeholder 도 §0 + §4 만 보고 출시 가능 여부 판단 가능 (D-A1 must-have).*



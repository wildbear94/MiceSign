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


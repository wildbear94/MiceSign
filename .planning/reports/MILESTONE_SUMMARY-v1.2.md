# Milestone v1.2 — MiceSign Project Summary

**Generated:** 2026-04-30
**Purpose:** Team onboarding and project review
**Status:** ✓ All 9 phases complete · ship-ready · `defer-archive` 결정 (출시 트리거 대기)

---

## 1. Project Overview

**MiceSign** 은 약 50명 규모 사내 조직을 위한 사내 전자 결재(電子決裁) 시스템이다. 외부 SaaS(Docswave) 의존을 자체 호스팅 시스템으로 대체하기 위해 **AI 보조 + 1인 개발자** 체제로 구축되었다.

**Core Value:** 직원이 결재 문서를 작성·상신하고, 명확한 순차 워크플로로 결재/반려를 처리할 수 있다.

**Stack:**
- **Backend:** Java 17 + Spring Boot 3.x + Spring Security + JWT + JPA(Hibernate) + QueryDSL + Gradle
- **Frontend:** React 18 + Vite 5 + TypeScript + Zustand + TanStack Query v5 + TailwindCSS 3.x
- **Database:** MariaDB 10.11+ (utf8mb4)
- **File storage:** Google Drive API v3 (Service Account, metadata only in DB)
- **Mail:** JavaMailSender + Thymeleaf (HTML templates) + sociable retry/PENDING-first 패턴
- **Logging:** logback (Spring Boot 표준 logging.* properties, 일별 롤링 + 30일 보관)
- **Deployment:** Native deployment (no Docker), systemd service + Nginx reverse proxy

**v1.2 의 의의:**
> v1.2 는 retrofit/wiring 마일스톤 — 인프라 70% 가 v1.0/v1.1 에서 이미 스캐폴딩되어 있으며 백엔드 신규 의존성 zero. v1.0(MVP) → v1.1(양식 빌더 고도화) → **v1.2(일상 업무 대체 수준 + ship-ready)**.

---

## 2. Architecture & Technical Decisions

### 핵심 결정 (v1.2)

- **결정:** SMTP 알림 PENDING-first 로깅 패턴
  - **Why:** `@TransactionalEventListener` + `@Retryable` 격리로 결재 트랜잭션과 메일 발송 분리, 메일 실패가 결재 실패를 야기하지 않음
  - **Phase:** 29 (SMTP retrofit)

- **결정:** 검색 권한 WHERE 절 보안 수정 (FN-SEARCH-001)
  - **Why:** SUBMITTED 문서만 검색 + 본인 기안 + 결재 참여자 + ADMIN 부서 + SUPER_ADMIN 전체. tab=my 외 DRAFT 비노출 — 운영 중 발견된 보안 사고
  - **Phase:** 30 (Search/Security) — 첫 PR 로 조기 착수

- **결정:** MariaDB FULLTEXT/ngram/Elasticsearch **배제**, LIKE + 기존 인덱스만 사용
  - **Why:** 50 user × <10K 문서 규모에서 95p ≤ 1초 NFR 충족 가능. 운영 모니터링 게이트(slow_query_log + 3 신호) 로 fallback 마련
  - **Phase:** 30 (Roadmap v1.2 결정)

- **결정:** 대시보드 4 카드 통일 (`SubmittedCount` 신규 노출)
  - **Why:** 결재 대기/진행/완료/반려 4 카드 + role-based scope (USER/ADMIN/SUPER_ADMIN). DashboardSummaryResponse canonical 7-arg constructor + `useDashboardSummary` 단일 훅 + `invalidateQueries(['dashboard'])` prefix-match
  - **Phase:** 31 (Dashboard)

- **결정:** CUSTOM 프리셋만 추가 (회의록/품의서 JSON), 신규 컴포넌트 0
  - **Why:** v1.1 의 templateImportSchema Zod 검증 + auto-glob loader + DynamicCustomForm 인프라 100% 재활용
  - **Phase:** 32 (CUSTOM presets)

- **결정:** Document 기안자 정보 헤더 always-on, SUBMITTED-time snapshot 박제
  - **Why:** 기안자 부서/직위가 인사이동·승진해도 옛 값 보존(법적/감사 추적성). `document_content.form_data` JSON 의 `drafterSnapshot` 키 — Flyway 미적용
  - **Phase:** 34 (Drafter header) — v1.2 ship-ready 이후 추가

- **결정:** Spring Boot 표준 logging.* properties only (logback-spring.xml 미생성)
  - **Why:** 사용자 4 요구사항(일별 롤링/30일 보관/prod=INFO/dev=전체) 이 application.yml 만으로 충족. logback-spring.xml 신규 작성은 별도 phase 로 이관
  - **Phase:** 35 (Backend logging) — v1.2 ship-ready 이후 추가

- **결정:** CUSTOM 양식 한 줄 최대 3 필드 grid layout, 데이터 모델 옵션 (i) `rowGroup?: number`
  - **Why:** built-in 6 양식 무수정(CUSTOM only) + schemaSnapshot 으로 zero layout shift on legacy + md+ only (sm 1-col fallback). 3-layer hard cap=3 (Zod refine + UI disable + 200ms flash)
  - **Phase:** 36 (Form row layout) — v1.2 ship-ready 이후 추가

### Operational hygiene (Phase 33 + 35)

- **`application-prod.yml` 자격증명 위생:** hardcoded DB defaults 제거, `.env.production` 카탈로그, `.gitignore` 차단 (Phase 33-01)
- **운영 SMTP 런북:** 사내 IT 협업 + systemd EnvironmentFile + 5종 smoke + 트러블슈팅 (`SMTP-RUNBOOK.md` 480 lines, Phase 33-02)
- **NFR-01 운영 모니터링 게이트:** slow_query_log + 3 신호 + Plan 30-05 인프라 재활용 (`MONITORING.md`, Phase 33-03)
- **로그 인프라:** `${LOG_DIR:-logs}/micesign.log`, 일별 gzip 롤링, 30일 보관, 1GB total-size-cap, clean-history-on-start (Phase 35)

---

## 3. Phases Delivered

| Phase | Name | Plans | Status | One-Liner |
|-------|------|-------|--------|-----------|
| 24.1 | 사용자 측 동적 폼 렌더러 (INSERTED) | 5/5 | ✓ Complete (2026-04-13) | CUSTOM 템플릿 동적 폼 렌더링 + schemaSnapshot 불변성 |
| 29 | SMTP 이메일 알림 인프라 (Retrofit) | 5/5 | ✓ Complete (2026-04-23) | EmailService stub → JavaMailSender + PENDING-first + @Retryable + 5종 Thymeleaf 템플릿 |
| 30 | 검색 권한 WHERE 절 보안 + 필터 확장 | 5/5 | ✓ Complete (2026-04-27) | FN-SEARCH-001 권한 predicate(보안 수정) + 필터 + URL query 동기화 페이지네이션 |
| 31 | 대시보드 고도화 | 6/6 | ✓ Complete (2026-04-24) | 4 카운트 카드 + role-based scope + invalidateQueries 실시간 갱신 + 로딩/빈 상태 UI |
| 32 | CUSTOM 프리셋 확장 | 6/6 | ✓ Complete (2026-04-26) | 회의록/품의서 JSON 프리셋 2종 추가 (하드코딩 컴포넌트 0) |
| 33 | E2E 검증 + 운영 전환 | 5/5 | ✓ Complete (2026-04-28) | 자격증명 위생 + SMTP 런북 + NFR-01 모니터링 게이트 + v1.2-MILESTONE-AUDIT |
| 34 | 양식 기안자 정보 헤더 자동 채움 | 6/6 | ✓ Complete (2026-04-29) | 14 통합 지점 always-on `DrafterInfoHeader` + SUBMITTED snapshot 박제 + DRAFT live + legacy fallback |
| 35 | 백엔드 로그 설정 | 1/1 | ✓ Complete (2026-04-29) | Spring Boot logging.* + 일별 롤링 + 30일 보관 + prod=INFO/dev=DEBUG 프로필 분리 + UTF-8 + gzip + 1GB cap |
| 36 | 양식 필드 한 줄 최대 3개 레이아웃 | 4/4 | ✓ Complete (2026-04-30) | CUSTOM 양식 grid layout (1/2/3 cols) + RowPositionSelector 빌더 UI + schemaSnapshot zero layout shift |

**Totals:** 9 phases · 44 plans · 8 days (2026-04-22 → 2026-04-30) · UAT 100% PASS (각 phase 별 7~37 게이트)

---

## 4. Requirements Coverage

### v1.2 신규 요구사항

| Group | ID | Status | Phase |
|-------|-----|--------|-------|
| **NOTIF** | NOTIF-01~05 (5건) | ✓ Validated | 29 |
| **SRCH** | SRCH-01~06 (6건) | ✓ Validated *(REQUIREMENTS.md 표기 stale — Phase 30 SUMMARY 와 ROADMAP 은 Complete)* | 30 |
| **DASH** | DASH-01~05 (5건) | ✓ Validated | 31 |
| **FORM** | FORM-01, FORM-02 (2건) | ✓ Validated | 32 |
| **NFR** | NFR-01 (검색 응답 95p ≤ 1초) | ⚠️ Deferred | 33 — 운영 모니터링 게이트로 이관 (실 부하 환경에서 측정) |

### v1.0 / v1.1 (이전 milestone)

- 모든 v1.0 요구사항 (AUTH/ORG/DOC/APR/TPL/FILE/DASH/AUD): ✓ Validated
- 모든 v1.1 요구사항 (RFT/PRV/TBL/CND/CAL/CNV): ✓ Validated

### Out of Scope (v1.2)

- Audit log 조회 UI (AUD-02): Phase 1-C 이관
- 통계/리포트 (STAT-01): Phase 1-C 이관
- 추가 양식 (TPL-04~06: 구매요청/출장보고/연장근무): Phase 1-B 후속 (별도 milestone)
- AI 작성 보조 (AI-01): Phase 2 (별도 milestone)

### Phase-local 결정 IDs (REQUIREMENTS 신규 ID 비할당)

- Phase 34: D-A1~G4 (양식 헤더, 23 결정)
- Phase 35: D-A1~G3 (로그 설정, 23 결정)
- Phase 36: D-A1~G5 (행 레이아웃, 26 결정)

---

## 5. Key Decisions Log (cross-phase)

| ID | Decision | Phase | Rationale |
|----|----------|-------|-----------|
| Roadmap v1.2 | v1.2 = retrofit/wiring milestone | All | 인프라 70% 이미 스캐폴딩, 백엔드 신규 의존성 0 |
| Roadmap v1.2 | Phase 29(SMTP) 먼저 | 29 | 함정 밀도 최고 + 내부 의존 체인. PENDING-first 로깅 패턴 확립이 다른 phase 의 기준 |
| Roadmap v1.2 | Phase 30 SRCH-01 첫 PR 조기 착수 | 30 | 운영 중 보안 사고 (타인 DRAFT 노출 가능성) |
| Roadmap v1.2 | MariaDB LIKE only (FULLTEXT 배제) | 30 | 50 user × <10K 문서에서 NFR 충족, 운영 모니터링 fallback |
| Phase 31-01 | DashboardSummaryResponse 6→7-arg 점진 전환 | 31 | Plan 01 단독 적용 시 컴파일 보장 |
| Phase 31-06 | DocumentRepositoryCustomImpl WITH RECURSIVE CTE | 31 | 부서 트리 SoT 통일 (대시보드 + 검색 drafter 집합 정합성) |
| Phase 32 D-A5/T-32-02 | 회의록 agenda.title 컬럼 옵션 A | 32 | DynamicTableField path namespace 격리 (UAT 통과) |
| Phase 33 D-S1 | NFR-01 합성 부하 실측 → 운영 모니터링 게이트로 이관 | 33 | 합성 환경 비용 > 운영 실측 가치 |
| Phase 33 D-M3 | 5종 smoke + audit_log SQL sign-off → release-time gate | 33 | phase-completion gate 와 release-time gate 분리 |
| Phase 33-04 | release-time gate 패턴 정립 | 33 | wrap-up phase 의 deliverable = 'gate 정의 + 절차 문서화' (실제 마킹은 출시 시점) |
| Phase 34 Q1=A (D-F) | UserProfile 확장 (departmentName/positionName) | 34 | 신규 작성 시 DRAFT 헤더 데이터 source 부재 해소 |
| Phase 34 Q2=A (D-C7) | snapshot 직렬화 실패 시 트랜잭션 롤백 | 34 | 데이터 일관성 우선 (RESEARCH 권고 swallow+WARN 거절) |
| Phase 34 Q3=A (D-G) | latent FE 타입 버그 동시 정정 | 34 | DocumentDetailPage L228 production runtime undefined access 즉시 해소 |
| Phase 35 D-A1 | logback-spring.xml 미생성 (logging.* properties only) | 35 | 4 요구사항이 application.yml 만으로 충족 |
| Phase 36 Q1=a (D-A) | 관리자 빌더에서 row 그룹 명시 (자동 휴리스틱 미도입) | 36 | UX 통제 + 회귀 위험 최소화 |
| Phase 36 Q2=a (D-B) | CUSTOM 양식만 적용 (built-in 6 양식 무수정) | 36 | 12 hardcoded 양식 retrofit 은 별도 phase 로 이관 |
| Phase 36 Q4=b (D-D) | schemaSnapshot 인프라 재활용 (Phase 24.1 SoT) | 36 | 기존 SUBMITTED 문서 zero layout shift 보장 |

**Archive 결정 (2026-04-28):** `defer-archive` 채택
- 사유: AUDIT.md §G5/§G6/§5 의 RELEASE-DEFERRED 패턴 정합 — 실 출시 + 운영 안정화 후 archive 시점 동기화
- 트리거: 출시 일자 결정 + 1-2주 운영 모니터링 무이슈 → `/gsd-complete-milestone v1.2`
- 영향: Phase 34/35/36 가 v1.2 ship-ready 이후 추가됐지만 archive 시점 결정 무관

---

## 6. Tech Debt & Deferred Items

### Pre-existing flakiness (release-time 결정)

- **ApprovalWorkflowTest 3건 flakiness** — `ApprovalEmailSender.persistLog` ObjectOptimisticLockingFailureException
  - 파일: [.planning/phases/34-drafter-info-header/deferred-items.md](.planning/phases/34-drafter-info-header/deferred-items.md)
  - master 에서 동일 재현 검증 (Phase 34 무관)
  - 처리 옵션: 별도 phase (`/gsd-add-phase ApprovalEmailSender 동시성 안정화`) 또는 출시 후 모니터링 결과로 결정

### Release-time gates (출시 시점 마킹 대기, AUDIT.md §G5/§G6/§5)

- **5종 smoke 사용자 sign-off** (G5.1~5) — 출시 전 1회 SMTP 실 발송 검증
- **audit_log SQL sign-off** (G6.1~2) — 5종 이벤트당 정확히 1 row 검증
- **출시 결정 메타데이터** (§5.1~3) — 출시 일자, 운영 안정화 모니터링 종료일, archive 결정자
- **NFR-01 실측** — 운영 모니터링 3 신호 발동 시 SearchBenchmarkSeeder + bench-search.sh 재활용 ([.planning/milestones/v1.2/MONITORING.md](.planning/milestones/v1.2/MONITORING.md))

### v1.3+ 후보 (Phase 1-C / Phase 2 또는 별도 milestone)

- TPL-04 (구매 요청서), TPL-05 (출장 보고서), TPL-06 (연장 근무 신청서) — 추가 양식
- AUD-02 — Audit log 조회 UI (SUPER_ADMIN)
- STAT-01 — 통계/리포트 (Admin)
- AI-01 — AI 작성 보조
- 양식 빌더 row 레이아웃을 built-in 6 양식에도 retrofit (Phase 36 deferred)
- preset 양식의 row 정의 추가 (Phase 36 D-B3)
- sm/xs 모바일 row 적용 (Phase 36 D-E1 deferred)
- 다국어 i18n (현재 한국어 only)
- secret manager / APM 도입 (Phase 33 deferred — 50→200 확장 시점)

### v1.2 sync 정정 메모 (2026-04-29)

- Phase 32 가 실제로 2026-04-26 완료됐으나 ROADMAP/STATE 표기가 stale 했던 문제 발견 + 정정. Phase 33/34 의 STATE 갱신이 누락 → 누적 표기 오류. Phase 34 종결 시 발견하여 sync.
- 32-REVIEW-FIX 4건 적용 (WR-02 brittle 단언, IN-01 한국어 정규식, IN-02 sort dependency, IN-03 type modifier). 3건 skipped (CONTEXT/UAT 결정 존중).

### Stale 표기 (REQUIREMENTS.md)

- v1.2 SRCH-01~06 가 unchecked `[ ]` 상태로 남아 있음. 실제로는 Phase 30 에서 모두 완료(2026-04-27, ROADMAP `5/5 Complete`). REQUIREMENTS.md 갱신 필요 — `/gsd-audit-milestone` 또는 수동 fix 권장.

---

## 7. Getting Started

### 빌드/실행

```bash
# Backend (terminal 1)
cd backend
./gradlew bootRun --args='--spring.profiles.active=dev'

# Frontend (terminal 2)
cd frontend
npm install
npm run dev

# Tests
cd backend && ./gradlew test
cd frontend && npm test
```

### 핵심 디렉터리 (v1.2 기준)

| 경로 | 역할 |
|------|------|
| `backend/src/main/java/com/micesign/domain/` | JPA 엔티티 (User, Document, ApprovalLine 등) |
| `backend/src/main/java/com/micesign/service/` | 핵심 서비스 (DocumentService, ApprovalService, NotificationService 등) |
| `backend/src/main/java/com/micesign/controller/` | REST 컨트롤러 |
| `backend/src/main/resources/db/migration/` | Flyway DDL (V1~V18) |
| `backend/src/main/resources/templates/email/` | Thymeleaf HTML 이메일 템플릿 (5종 결재 + 4종 등록 + 1종 budget) |
| `frontend/src/features/document/` | 문서 작성/조회 (Phase 24.1 동적 렌더러 + Phase 34 헤더 + Phase 36 grid) |
| `frontend/src/features/admin/` | 관리자 영역 (양식 빌더, 사용자/조직, 옵션셋) |
| `frontend/src/features/auth/` | 로그인/세션 |
| `.planning/phases/` | GSD 워크플로 phase 디렉터리 (CONTEXT/RESEARCH/PLAN/SUMMARY/UAT) |
| `.planning/milestones/v1.2/` | v1.2 milestone 산출물 (AUDIT, SMTP-RUNBOOK, MONITORING) |

### 어디부터 보면 좋은가

1. **`docs/PRD_MiceSign_v2.0.md`** — 제품 요구사항, DB 스키마 DDL, 기술 스택 근거
2. **`docs/FSD_MiceSign_v1.0.md`** — API 계약, 비즈니스 룰, 에러 코드, FN-* 요구사항 ID
3. **`CLAUDE.md`** — 코드 작업 컨벤션, GSD 워크플로 enforcement
4. **`backend/src/main/java/com/micesign/service/DocumentService.java`** — `loadAndVerifyOwnerDraft()` (L600) 가 모든 mutation 의 단일 guard. 이 메서드만 보면 immutability/소유권 enforce 패턴 이해 가능
5. **`frontend/src/features/document/components/dynamic/DynamicCustomForm.tsx`** — CUSTOM 양식 동적 렌더링 (Phase 24.1 + 34 + 36 가 켜이는 핵심 지점)
6. **`.planning/milestones/v1.2/AUDIT.md`** — 비기술 stakeholder 용 §0 요약 + 출시 게이트
7. **`.planning/reports/MILESTONE_SUMMARY-v1.2.md`** — 본 문서

### 운영 배포 체크리스트 (release-time)

1. `application-prod.yml` 의 자격증명/secret 환경변수 주입 (systemd EnvironmentFile)
2. `LOG_DIR=/var/log/micesign` env var 추가 + `sudo install -d -o app-user -g app-user -m 750 /var/log/micesign`
3. SMTP 자격증명 + `app.base-url` 운영 도메인으로 설정
4. Flyway 자동 마이그레이션 (`spring.flyway.enabled=true`)
5. 5종 smoke 발송 ([SMTP-RUNBOOK.md](.planning/milestones/v1.2/SMTP-RUNBOOK.md) §5)
6. audit_log SQL sign-off ([AUDIT.md](.planning/milestones/v1.2/AUDIT.md) §G6)
7. slow_query_log 활성화 + 모니터링 알람 설정 ([MONITORING.md](.planning/milestones/v1.2/MONITORING.md) §3)
8. 1-2주 운영 안정화 후 `/gsd-complete-milestone v1.2` 실행 → v1.3 진입

---

## Stats

- **Timeline:** 2026-04-22 (v1.2 roadmap 작성) → 2026-04-30 (Phase 36 종결) — **8 days**
- **Phases:** 9 / 9 (24.1 inserted + 29 + 30 + 31 + 32 + 33 + 34 + 35 + 36)
- **Plans:** 44 / 44 (100%)
- **Total tasks:** 100+ (UAT 7~37 게이트/phase)
- **Active blockers:** 0
- **Verification debt:** 0 (audit-uat 통과)
- **Pending todos:** 0
- **Active debug sessions:** 0

**Code change volume:** Phase 34 (가장 큰 phase) 가 ~23 files (BE 5 + FE 18). Phase 36 14 files. 전체 합산 정확치는 git stat 필요.

**Contributors:** park sang young (project owner) + AI 보조 (Claude Opus 4.7 via Claude Code, GSD 워크플로)

---

*Source artifacts:*
- `.planning/PROJECT.md`, `.planning/ROADMAP.md`, `.planning/REQUIREMENTS.md`, `.planning/STATE.md`
- `.planning/milestones/v1.2/{AUDIT,SMTP-RUNBOOK,MONITORING}.md`
- `.planning/phases/{29,30,31,32,33,34,35,36}-*/CONTEXT.md`, `*-SUMMARY.md`, `*-VERIFICATION.md`, `*-HUMAN-UAT.md`

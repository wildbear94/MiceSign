# Project Research Summary — v1.2 Phase 1-B

**Project:** MiceSign (전자 결재 시스템)
**Domain:** In-house electronic approval — v1.2 Phase 1-B (일상 업무 대체 수준)
**Researched:** 2026-04-22
**Confidence:** HIGH

## Executive Summary

v1.2 Phase 1-B는 **greenfield 마일스톤이 아니라 retrofit/wiring 마일스톤**이다. 네 개 리서치 영역이 독립적으로 같은 결론에 도달했다: Phase 1-A/v1.1에서 Phase 1-B 인프라의 약 70%가 이미 스캐폴딩되어 있으며, 이번 마일스톤은 대부분 **스텁 완성, 빠진 WHERE 절 보강, 기존 이벤트 발행 지점의 실제 발송 연결, UI 폴리싱**이 중심이다. `spring-boot-starter-mail`, `spring-boot-starter-thymeleaf`, `spring-retry`, `@EnableAsync`, `NotificationLog` 엔티티, `ApprovalNotificationEvent` + 5개 `publishEvent()` 호출 지점, QueryDSL 기반 `searchDocuments()`, `DashboardController/Service`는 모두 이미 존재한다. **백엔드에는 단 하나의 신규 의존성도 추가하지 않는다.** 프론트엔드도 기껏해야 `react-day-picker` 1개(선택) 수준.

**권장 접근:** `EmailService` 스텁을 `RegistrationEmailService`(이미 실제 SMTP 발송 검증됨)를 모델로 교체하고, `DocumentRepositoryCustomImpl.searchDocuments()`의 누락된 FSD FN-SEARCH-001 권한 WHERE 절(드래프터 OR `EXISTS approval_line` OR ADMIN-부서 OR SUPER_ADMIN, 그리고 `status != DRAFT` except `tab=my`)을 추가하며, 대시보드에 `submittedCount` 카드 1개(이미 응답에 포함) 노출, 양식은 v1.1 CUSTOM 빌더의 프리셋 JSON으로만 확장한다. MariaDB FULLTEXT/Mroonga/Elasticsearch/ngram은 **모두 배제** — 50명 × <10K 문서 규모에서 LIKE + 인덱스로 ≤1초 NFR을 안정적으로 만족하며, MariaDB는 ngram 파서를 지원하지도 않는다(MDEV-10267 open).

**핵심 리스크는 비즈니스가 아니라 아키텍처 함정에 있다:** `@TransactionalEventListener(AFTER_COMMIT)` + `@Async` + `@Retryable`의 프록시 체인이 같은 빈 내 self-invocation을 조용히 우회시키고, `notification_log` 저장-발송 순서를 잘못 잡으면 중복 이메일 또는 유령 PENDING 행이 생긴다. `ApprovalService`가 이미 동기로 `audit_log`를 기록하므로 리스너에서 "일관성을 위해" 감사 로깅을 추가하면 **중복 감사 행**이 생긴다. 검색 쿼리의 권한 WHERE 절 누락은 **보안 사고**로 분류된다(타인 DRAFT 노출, REFERENCE 라인 접근자가 아무 문서도 못 봄). 이 세 함정은 계획 단계에서 룰로 못박고 첫 PR에서 바로 잡아야 한다.

## Key Findings

### Recommended Stack

Phase 1-B는 **stack expansion 제로**가 결론이다. `backend/build.gradle.kts`와 `application.yml`에 필요한 모든 부품이 이미 선언되어 있으며, `RegistrationEmailService`가 `JavaMailSender` + `MimeMessageHelper` + `SpringTemplateEngine` 패턴을 실 SMTP로 이미 구현·검증해놨다. 검색은 QueryDSL 5.1.0 `BooleanBuilder`가 이미 돌고 있으며 FN-SEARCH-001 필터 컬럼은 전부 인덱싱되어 있다(`idx_status`, `idx_submitted_at`, `idx_template_code`, `idx_drafter_status`). 양식 확장은 v1.1의 CUSTOM 빌더로 처리.

**Core technologies (확인):**
- Spring Boot 3.5.13 — Spring Mail 6.2.x, Thymeleaf-Spring6 3.1.x, Spring Retry 2.x
- `spring-boot-starter-mail` + `spring-boot-starter-thymeleaf` — SMTP + HTML 템플릿 (선언 완료)
- `spring-retry` + `spring-boot-starter-aop` — `@Retryable(maxAttempts=3, backoff=@Backoff(delay=300000L))` + `@Recover` (FSD "2회 재시도 5분 간격")
- QueryDSL 5.1.0 (`jakarta`) — 동적 필터, Projections.constructor로 N+1 회피
- MariaDB 10.11 LTS + Flyway — FULLTEXT/ngram 없이 LIKE + 기존 인덱스
- React 18.3 + TanStack Query v5 + Zustand 5 + RHF + Zod — 설치 완료
- (선택) react-day-picker 9.1 — 날짜 범위 팝오버 필요시; 없으면 `<input type="date">` 2개

**NOT to use:** MariaDB FULLTEXT+ngram, Mroonga, Elasticsearch/OpenSearch/Meilisearch, WebFlux, Quartz, RabbitMQ/Kafka, Hibernate Envers, Lombok, 하드코딩 React 양식.

### Expected Features

**Must have (P1 — 20개):**
- 이메일: A1(5종 이벤트), A2(직링크), A4(재시도), A5(notification_log), A6(비활성 스킵), A7(제목 prefix)
- 검색: B1(키워드), B2(상태복수), B3(양식), B4(기간), B5(기안자), **B6(권한 WHERE — 보안)**, B7(DRAFT 제외), B8(페이지), B10(URL 동기화)
- 대시보드: C2(대기 5건), C3(최근 5건), C5(빠른 작성), C6(빈/로딩)
- 양식: D 최소 1종 CUSTOM 프리셋

**Should have (P2):** A3(HTML+Plain), E1(앞 승인자 comment), E4(오래 대기 배지), E5(알림 on/off), E9(브랜딩)

**Defer (v1.3+):** E2(양식별 요약), E3(검색 프리셋), E8(CSV), E6(단축키), MariaDB FULLTEXT

**Anti-features:** 멀티채널, WebSocket 푸시, 에스컬레이션, 다국어, 고급 쿼리 파서, ES, 대시보드 커스텀, 이메일 인라인 결재, 다이제스트, 정렬 옵션, 하드코딩 양식.

### Architecture Approach

기존 아키텍처 유지, 통합 지점만 수정. POJO Event → `@TransactionalEventListener(AFTER_COMMIT)` → `@Async("micesign-async")` → `@Retryable` 격리 컴포넌트 → `JavaMailSender` + Thymeleaf. `RegistrationEmailService`가 이미 증명. 검색은 QueryDSL `BooleanBuilder` + `Projections.constructor` + 명시적 JOIN. 대시보드는 단일 `/api/v1/dashboard/summary` 유지, TanStack Query staleTime만.

**Major components (변경 지점):**
1. `EmailService` — 스텁 제거, `JavaMailSender`/`SpringTemplateEngine` 주입, `@Transactional(REQUIRES_NEW)` 명시
2. `ApprovalEmailSender` (신규 @Component) — `@Retryable` 격리 (self-invocation 방지)
3. 5개 Thymeleaf 템플릿 — `registration-submit.html` 레이아웃 복제
4. `DocumentRepositoryCustomImpl.searchDocuments()` — FSD 권한 predicate + `drafterId` 필드
5. `DashboardPage.tsx` — 4번째 CountCard (`submittedCount` 바인딩만)
6. `presets/*.json` — CUSTOM 빌더 프리셋 1~2종

이벤트 발행은 이미 5지점 완료: `DocumentService.submitDocument/withdrawDocument`, `ApprovalService.approve` 분기 2개, `ApprovalService.reject`.

### Critical Pitfalls

1. **`notification_log` 저장-발송 순서 (PENDING-first)** — 현재 "send→save" 순서. 실 SMTP 시 save 실패 = 유령 PENDING + 재시도 중복 발송. 해결: INSERT PENDING → send → UPDATE SUCCESS/FAILED. `UNIQUE(document_id, event_type, recipient_id)` V19 마이그레이션.
2. **`@Retryable` + `@Async` self-invocation 우회** — 같은 빈 내 `this.send()`는 프록시 안 탐. 해결: `ApprovalEmailSender`를 별도 `@Component`로 분리.
3. **검색 권한 WHERE 절 누락 (보안 사고)** — 현재 `tab` 스코프만. `EXISTS approval_line` 분기 + `status != DRAFT` (tab=my 예외) 누락. REFERENCE 접근자가 아무것도 못 찾고, 타인 DRAFT 노출. 첫 PR에서 수정.
4. **리스너에서 중복 감사 로그** — `ApprovalService`가 이미 동기로 `audit_log` 기록. 리스너 추가하면 중복, `audit_log` 불변이라 복구 비용 큼. CLAUDE.md에 룰 명시 + `COUNT=1 per action` 테스트.
5. **대시보드/검색 lazy 네비게이션 N+1** — `doc.getDrafter().getDepartment().getName()` 스트림이 `DashboardService:62`에 이미 존재. `Projections.constructor` + 명시 JOIN만 사용. `hibernate.generate_statistics=true` 쿼리 카운트 어서트.
6. **한글 이메일 제목 `?????` 인코딩 버그** — `new MimeMessageHelper(message, true, "UTF-8")` 3-arg 생성자 강제 + `spring.mail.default-encoding: UTF-8` + `spring.mail.properties.mail.mime.charset: UTF-8`.

## Implications for Roadmap

### Phase 1: SMTP 이메일 알림 인프라 (Retrofit)
**Rationale:** 함정 밀도 최고, 내부 의존 체인. 이벤트 발행은 이미 완료되어 listener 완성 + 재시도 격리 + 템플릿 5개가 실제 작업.
**Delivers:** 5종 이벤트 실 SMTP, PENDING-first 로깅, 2회 재시도, 5개 Thymeleaf, MailHog 설정.
**Addresses:** A1-A7 (이메일 전체), X1-X2 배제 유지.
**Avoids:** Pitfall 1/2/3/11/12/13/17/18/19/24.
**Uses:** 기존 starter-mail/thymeleaf/retry, AsyncConfig, EmailService 스켈레톤, RegistrationEmailService 참조.

### Phase 2: 검색 권한 WHERE 절 보안 수정 + 기안자 필터
**Rationale:** 현재 운영 중 보안 취약점. Phase 1과 병렬 가능, 독립 작업.
**Delivers:** FSD FN-SEARCH-001 권한 predicate, `drafterId` 필드, A/B/C/ADMIN/SUPER_ADMIN 테스트 매트릭스.
**Addresses:** B1-B10 중 B6/B7(보안 필수), B5(기안자 신규).
**Avoids:** Pitfall 4(최우선), 5, 7(FULLTEXT 함정), 8(DATE 함수), 15(JOIN 중복), 21.
**Uses:** 기존 DocumentRepositoryCustomImpl + `JPAExpressions.selectOne().exists()`.

### Phase 3: 대시보드 "진행 중" 카드 + 무효화
**Rationale:** 가장 가벼움. 백엔드 `submittedCount` 이미 반환 중. 프론트 1 파일 수정 + mutation invalidate.
**Delivers:** 4번째 CountCard, `staleTime: 30s`, `invalidateQueries(['dashboard'])`.
**Addresses:** C1-C6 (대부분 완성), PROJECT 대시보드 고도화.
**Avoids:** Pitfall 5, 6, 14(`@Cacheable` 안티), 20.
**Uses:** 기존 DashboardService + CountCard. 신규 의존성 없음.

### Phase 4: 양식 확장 (CUSTOM 프리셋 1~2종)
**Rationale:** 위험도 최저, skip 가능. v1.1 CUSTOM 빌더 SHIPPED.
**Delivers:** 회의록/품의서 등 프리셋 JSON 1~2종.
**Addresses:** D1-D4 (CUSTOM 방식, X10 하드코딩 금지).
**Avoids:** Pitfall 9(스키마 스냅샷 불변성), 10(import XSS).
**Uses:** v1.1 빌더 + `template_schema_version`.

### Phase 5: E2E 검증 + 운영 전환
**Rationale:** 인크리멘털 테스트 후 통합 시나리오. NFR 실측.
**Delivers:** MailHog→운영 SMTP 런북, 성능 벤치.
**Avoids:** 최종 회귀.

### Phase Ordering Rationale
- SMTP 우선: 함정 밀도 최고, 의존 체인.
- 검색 권한 보안 수정 빠르게: Pitfall 4는 운영 중 버그.
- 대시보드/양식 경량: SMTP 번인 사이 휴식.
- 양식 선택적: 정책 결정 시 skip.
- 검증 마지막: 조기 최적화 방지.

### Research Flags
**Needs research:** Phase 1 (Spring Boot 3.5 `@TransactionalEventListener` 경계 Context7 재확인), Phase 2 (QueryDSL `exists()` EXPLAIN + Korean fixture).
**Standard patterns (skip):** Phase 3 (UI 바인딩), Phase 4 (JSON 작성).

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | 공식 문서 + MDEV-10267 부정 검증 + 코드베이스 전수 |
| Features | HIGH | PRD §9/FSD FN-NTF/FN-SEARCH/FN-DASH 명세 완료 |
| Architecture | HIGH | 실 코드 라인 참조, 통합 지점 명확 |
| Pitfalls | HIGH | 25개 함정 구체 라인 + Spring GitHub 1차 소스 |

**Overall confidence:** HIGH

### Gaps to Address
- `app.base-url` 운영 프로필 값 확인 (localhost면 이메일 링크 깨짐)
- 운영 SMTP 공급자 결정 (사내 릴레이 / Gmail Workspace / O365 / SES)
- 양식 확장 범위 사용자 최종 확인 (skip 가능)
- 10K 문서 seed 부하 테스트 후 FULLTEXT/composite index 여부 결정
- `user.email_notifications` 컬럼(E5) P2로 유지 — V20 마이그레이션 시점은 피드백 후
- MailHog vs Mailpit 선택 (동등, 환경에 설치된 것)

## Sources

### Primary (HIGH)
- 코드베이스 직접 분석: EmailService.java, RegistrationEmailService.java, DocumentService/ApprovalService (publishEvent 5곳), DashboardService.java, DocumentRepositoryCustomImpl.java, AsyncConfig.java, NotificationLog.java, application.yml, V1/V6/V16/V18 마이그레이션, registration-*.html 5개 템플릿, DocumentListPage.tsx, DashboardPage.tsx, templateRegistry.ts, package.json, build.gradle.kts
- [Spring Boot 3.5 IO/Email](https://docs.spring.io/spring-boot/reference/io/email.html)
- [Thymeleaf + Spring Mail official](https://www.thymeleaf.org/doc/articles/springmail.html)
- [Spring Framework Transaction-bound Events](https://docs.spring.io/spring-framework/reference/data-access/transaction/event.html)
- [Spring GitHub #35395](https://github.com/spring-projects/spring-framework/issues/35395) (nested listener 금지)
- [MariaDB MDEV-10267](https://jira.mariadb.org/browse/MDEV-10267) (ngram 미지원)
- [Mroonga MariaDB docs](https://mariadb.com/docs/server/server-usage/storage-engines/mroonga/about-mroonga)
- [QueryDSL Reference](http://querydsl.com/static/querydsl/4.0.8/reference/html_single/) + [fetchCount #2504](https://github.com/querydsl/querydsl/issues/2504)
- [react-day-picker v9](https://daypicker.dev/)
- PRD_MiceSign_v2.0.md, FSD_MiceSign_v1.0.md, v1.1-REQUIREMENTS.md

### Secondary (MEDIUM)
- Baeldung Spring Email templates, Nidhal Naffati async-retry, DZone Transaction Sync, PkgPulse Recharts 2026, Kissflow, Atlassian Approval

### Tertiary (LOW)
- Medium Samyak Moon (성능 벤치 참고), Docswave(UX 참조)

---
*Research completed: 2026-04-22*
*Ready for roadmap: yes*

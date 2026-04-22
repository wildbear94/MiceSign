# Phase 29: SMTP 이메일 알림 인프라 (Retrofit) - Research

**Researched:** 2026-04-23
**Domain:** Spring Boot 3.5 + Spring Mail + Thymeleaf + Spring Retry retrofit onto existing event pipeline
**Confidence:** HIGH

## Summary

Phase 29 는 **greenfield 가 아니라 retrofit** 이다. 인프라 ~95%가 이미 존재한다: `spring-boot-starter-mail`, `spring-boot-starter-thymeleaf`, `spring-retry`, `spring-boot-starter-aop`, `@EnableRetry` (`RetryConfig`), `@EnableAsync` (`AsyncConfig`, `micesign-async-` pool core=2/max=5/queue=100), `NotificationLog` 엔티티(V1+V6+V16 마이그레이션 완료), 5지점 `publishEvent()` 호출부 (`DocumentService:319/377`, `ApprovalService:124/161` 그리고 `:108/113` 분기로 APPROVE/FINAL_APPROVE 결정), `ApprovalNotificationEvent` POJO, 그리고 무엇보다 **동작 검증된 참조 구현 `RegistrationEmailService`** (`JavaMailSender` + `MimeMessageHelper(message, true, "UTF-8")` + `SpringTemplateEngine` + `@Value("${app.base-url}")` + `@Autowired(required=false)` null-safe). 동일 스레드 풀을 공유하는 `BudgetIntegrationService`/`RealBudgetApiClient` 은 `@Retryable` + `@Recover` 프록시 체인의 작동 선례(`@Profile("prod")` 등록까지)를 제공한다.

실제 작업 대상은 세 줄기로 수렴한다: (1) `EmailService` 스텁의 "send→save" 순서를 **PENDING-first 3단계 (INSERT PENDING → send → UPDATE SUCCESS/FAILED)** 로 뒤집고, (2) `@Retryable`/`@Recover` 를 **별도 `ApprovalEmailSender` 빈** 으로 분리해 Spring AOP proxy self-invocation 함정(Pitfall 2)을 원천 차단하며, (3) `layouts/approval-base.html` fragment + 5개 이벤트 템플릿(submit/approve/final-approve/reject/withdraw) 을 `registration-submit.html` 의 CJK/600px/인라인 CSS 스타일을 그대로 계승해서 작성한다. V19 Flyway 마이그레이션 한 건(`UNIQUE(document_id, event_type, recipient_id)`)이 DB 레벨 중복 방어를 맡는다.

**Primary recommendation:** `RegistrationEmailService` 를 구조 그대로 복제하되, 전송 경로만 `@Retryable`+`@Recover` 가 걸린 별도 `ApprovalEmailSender` 빈으로 뽑아내고, `persistLog()` 는 `REQUIRES_NEW` 로 각 상태 전이를 독립 커밋한다. 테스트는 GreenMail **2.1.x** (Spring Boot 3/Jakarta Mail 2.x 호환 — CONTEXT.md 가 명시한 1.6.x 는 javax.mail 시절이라 SB3 와 비호환, 업그레이드 필수 — Assumptions Log A1 참조) `@RegisterExtension static GreenMailExtension` + `application-test.yml` 에 `spring.mail.host=127.0.0.1/port=3025` 오버라이드로 통합 검증한다.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**A. 로깅·Idempotency 패턴**
- **D-A1:** notification_log 저장 순서는 PENDING-first 3단계 — (1) PENDING insert → (2) `mailSender.send()` → (3) SUCCESS 또는 FAILED/RETRY로 UPDATE. 현재 `EmailService.sendToRecipient` 의 send-first 로직 교체 필수 (Pitfall 17).
- **D-A2:** 중복 발송 방지는 DB UNIQUE 제약으로 강제 — V19 Flyway migration 으로 `UNIQUE(document_id, event_type, recipient_id)` 추가. `registration_request_id` 를 쓰는 행은 `document_id IS NULL` 이므로 제약에서 자연히 배제됨.
- **D-A3:** UNIQUE 제약은 엔티티 + Flyway 이중 선언 — `NotificationLog.java` 의 `@Table(uniqueConstraints = @UniqueConstraint(columnNames = {"document_id", "event_type", "recipient_id"}))` 추가 + V19 migration. `ddl-auto=validate` 에서 drift 검출.
- **D-A4:** V19 migration 은 단순 `ALTER TABLE ADD UNIQUE` — 운영 중복 없음 가정(현재 스텁이라 구조적으로 중복 불가). 충돌 시 Flyway 실패로 즉시 탐지.
- **D-A5:** send 실패 시 예외 분류 규칙:
  - `MailSendException` (SMTP 연결/timeout) → RETRY 상태, `retry_count++`, @Retryable 재실행
  - `MailAuthenticationException` / `MailParseException` → 즉시 FAILED, 재시도 없음
- **D-A6:** NotificationLog save 는 save helper 에 `@Transactional(propagation = REQUIRES_NEW)` — 각 INSERT/UPDATE 가 독립 커밋. send 실패에도 log row 유지. `ApprovalEmailSender` 내부 `persistLog()` helper 에 부착.
- **D-A7:** WITHDRAW 수신자 목록은 `determineRecipients()` 에서 `.distinct()` by `User.id` — 같은 사용자가 결재선 여러 step 에 중복 등록된 경우 1통만 발송 (Pitfall 24). DB UNIQUE 가 2차 방어.
- **D-A8:** `recipient_email` 필드는 발송 시점 `User.email` 스냅샷 — PENDING insert 시 `User.getEmail()` 값 기록. 이후 User.email 변경되어도 audit 목적 유지.
- **D-A9:** `retry_count` 는 각 재시도 직전 UPDATE — Spring Retry 의 `RetryContext.getRetryCount()` 기반. @Retryable 이 재시도하기 전 기존 PENDING row 를 `status=RETRY, retry_count+=1` 로 UPDATE. 운영자가 실시간 in-flight 상황 조회 가능. 최종 실패 시 @Recover 가 FAILED 로 마감.
- **D-A10:** NotificationLog 스키마에 actorId 필드 추가하지 않음 — actor 정보는 `audit_log` 로 충분. 두 테이블의 책임을 분리 (Pitfall 3 원칙 유지).
- **D-A11:** stale PENDING 행 청소는 방치 + 수동 운영 — 50명 규모에서 서버 재시작은 드물고 cron 도입은 과스펙. 10분 이상 PENDING 은 수동 FAILED 전환 스크립트 문서화만 (Phase 33 런북).

**B. @Retryable 격리 아키텍처**
- **D-B1:** 별도 `@Component ApprovalEmailSender` 생성 (신규 빈) — @Retryable + @Recover 메서드를 여기 배치. `EmailService`(@TransactionalEventListener + @Async 리스너) 는 수신자 결정·@Async dispatching 만 담당. Spring 프록시 체인 보장으로 self-invocation 트랩 (Pitfall 2) 회피.
- **D-B2:** `@Retryable(retryFor = MailSendException.class, noRetryFor = {MailAuthenticationException.class, MailParseException.class}, maxAttempts = 3, backoff = @Backoff(delay = 300000L))` — FSD 스펙 "2회 재시도 5분 간격" (= 초기 1 + retry 2 = 총 3 attempts) 그대로.
- **D-B3:** `@Recover` 핸들러 시그니처 = `recover(MailException e, NotificationLog log, Document doc, User recipient, NotificationEventType eventType)` — `log.setStatus(FAILED)`, `log.setErrorMessage(e.getClass().getSimpleName() + ": " + e.getMessage())` (255자 truncate), `persistLog(log)`, `log.error(...)` 한 줄.
- **D-B4:** `ApprovalEmailSender.send()` 메서드에는 @Transactional 없음 — `persistLog()` helper 에만 `REQUIRES_NEW` (D-A6). send 전체를 하나의 Tx 로 묶으면 send 실패 시 PENDING 행까지 롤백되어 재시도 응답성 손실.
- **D-B5:** `ApprovalEmailSender.send()` 시그니처 = `send(Document doc, User recipient, NotificationEventType eventType)` — 고수준 도메인 객체만 받음. 내부에서 subject/template/Context 조립. `@Value("${app.base-url}")` 는 `ApprovalEmailSender` 에 주입 (Pitfall 19 방지).
- **D-B6:** @Retryable 최종 실패 알림 방식 = ERROR 로그 + notification_log.status=FAILED 기록만 — 운영자 push 알림 파이프라인은 Phase 33/1-C 범위.

**C. 이메일 UX (제목·템플릿)**
- **D-C1:** 제목 포맷 = `[MiceSign] {actionLabel}: {docNumber} {title}` — 현재 `EmailService.sendNotification` 의 포맷 유지. actionLabel 은 `getActionLabel()` 의 한글 매핑 (SUBMIT="결재 요청", APPROVE="승인", FINAL_APPROVE="최종 승인", REJECT="반려", WITHDRAW="회수").
- **D-C2:** REFERENCE 라인 사용자에게 이메일 발송하지 않음 — 현재 `determineRecipients` 로직의 `filter(l -> l.getLineType() != ApprovalLineType.REFERENCE)` 유지. WITHDRAW 는 전원에게 발송하므로 참조자도 '회수되었음' 은 받음.
- **D-C3:** 5종 Thymeleaf 템플릿 = 공통 layout fragment + 이벤트별 5개가 차이만 — `templates/email/layouts/approval-base.html` 에 헤더/푸터/CTA 버튼/CJK 폰트 스택/600px 고정폭/인라인 CSS 를 두고, `approval-{event}.html` 5개 (`submit/approve/final-approve/reject/withdraw`) 가 `th:replace="layouts/approval-base :: layout(~{::body})"` 로 감싸고 body 만 조립.
- **D-C4:** CTA = 단일 "문서 바로가기" 버튼 — href 는 `{baseUrl}/documents/{doc.id}`. 토큰 URL 금지 (Pitfall 13).
- **D-C5:** From 네임 = `MiceSign <${spring.mail.username}>` — `RegistrationEmailService` 패턴 계승. Reply-To 미사용.
- **D-C6:** 본문 정보 깊이 = 메타데이터 레벨 — 문서번호·제목·기안자(부서+이름)·이벤트 시각·CTA. 문서 본문 요약 미포함. REJECT 본문엔 `approvalLine.comment` (반려 사유) 표시.
- **D-C7:** 시각 스타일 = `registration-submit.html` 스코프 계승 — 인라인 CSS, CJK 폰트 스택, 600px 고정폭, `<meta charset="UTF-8">`.

**D. 운영·테스트 환경**
- **D-D1:** 운영 SMTP 공급자 = Phase 29 범위에서 불특정 — env var 주입만. 공급자 선정은 Phase 33.
- **D-D2:** `application-prod.yml` 에 `app: base-url: ${APP_BASE_URL:https://micesign.사내도메인}` 추가 + `@Profile("prod") ApplicationReadyEvent` listener 로 `baseUrl.contains("localhost")` 시 startup 실패 (Pitfall 19 방지).
- **D-D3:** 테스트 환경 = GreenMail (JUnit 5) + MailHog/Mailpit (수동 UAT) 병행.
- **D-D4:** 스레드 풀은 기존 `micesign-async` 유지 — 전용 `mailExecutor` 분리는 Phase 33.
- **D-D5:** GreenMail 통합 테스트 = 5종 이벤트 × [기본 발송 + 한글 제목 디코딩 + 수신자 규칙 + RETIRED/INACTIVE skip] — `ApprovalNotificationIntegrationTest`. `@Retryable` 경로 검증은 별도 테스트 클래스.
- **D-D6:** CI 게이트 = `ApprovalServiceAuditTest` (audit_log COUNT=1 per action, NFR-03) + GreenMail 수신자 규칙 테스트.
- **D-D7:** `JavaMailSender` bean 은 `@ConditionalOnProperty(name = "spring.mail.host")` 조건부 — `ApprovalEmailSender` 는 `@Autowired(required = false) JavaMailSender mailSender` 패턴으로 null-safe 수신. null 일 때 `[EMAIL STUB]` 로그만 남기고 NotificationLog 는 SUCCESS 로 기록.

### Claude's Discretion

- 구체 file 구조 (`ApprovalEmailSender.java` 의 정확한 위치 — `service/` vs `service/email/`), `templates/email/layouts/` 디렉토리 분리 여부는 planner 가 결정
- `ApprovalServiceAuditTest` 의 JPA fixture 구성 방식 (`@DataJpaTest` vs `@SpringBootTest`) — researcher 권장안 따름 (→ §Validation Architecture 에서 `@SpringBootTest` 권장)
- GreenMail 버전 고정 (1.6.x 시리즈 내 최신) 및 gradle testImplementation 위치 — **researcher 권장: 2.1.x 로 상향 필수** (Assumptions Log A1, SB3 호환성)
- V19 migration 의 SQL 문구 세부 — 권장안: `ALTER TABLE notification_log ADD CONSTRAINT uk_notification_dedup UNIQUE (document_id, event_type, recipient_id)`
- `@Profile("prod")` startup check 의 구체 구현 (`@EventListener(ApplicationReadyEvent)` + `@Value` 조합)

### Deferred Ideas (OUT OF SCOPE)

- 운영자 FAILED 알림 파이프라인 (Slack webhook, SUPER_ADMIN 이메일 요약) → Phase 33 또는 Phase 1-C
- 전용 mailExecutor 분리 (Pitfall 11) → Phase 33 성능 검증 후 필요 시
- Micrometer 메트릭 (`micesign.mail.sent.total` 등) → Phase 33/1-C
- Plain-text fallback + HTML 이중 구성 → Research P2, 수용 가능한 tech debt
- 이메일 요약/본문 미리보기 → anti-feature (PII + CUSTOM 빌더와 충돌)
- Stale PENDING 정리 cron → Phase 33 런북에서 수동 스크립트 문서화
- Deep-link token → Phase 1-C 고급 기능
- Resilience4j rate limiter (Pitfall 12) → Phase 33/1-C
- 운영 SMTP 공급자 최종 선정 → Phase 33
- MailHog vs Mailpit 택일 → Phase 29 planning 시 development workflow 선택
- SUPER_ADMIN notification_log 조회 UI → Phase 1-C
- Reply-To 기안자 이메일 주입 → 스코프 확장
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| NOTIF-01 | 5종 결재 이벤트 (상신/중간승인/최종승인/반려/회수) HTML 이메일 수신 (`EmailService` stub 제거, 실 JavaMailSender 발송) | §Architecture Patterns §1–4 (listener→sender→template), §Code Examples §1 (ApprovalEmailSender skeleton) — `RegistrationEmailService` 복제 패턴 |
| NOTIF-02 | 이메일 본문 "문서 바로가기" 버튼 → `{app.base-url}/documents/{id}` 절대 URL | §Architecture Patterns §3 (Thymeleaf Context 조립), §Code Examples §4 (layout fragment `approval-base :: layout(~{::body})`), §Common Pitfalls #5 (localhost guard) |
| NOTIF-03 | SMTP 실패 시 5분 간격 2회 재시도 + `notification_log` PENDING→SUCCESS/FAILED 기록 (`@Retryable` + `@Recover`) | §Architecture Patterns §2 (PENDING-first 3단계), §Code Examples §2 (`@Retryable` 시그니처) §3 (`@Recover`), §Common Pitfalls #1/#2 |
| NOTIF-04 | RETIRED/INACTIVE 수신자 자동 스킵 | §Architecture Patterns §1 (`determineRecipients()` filter), §Code Examples §5 (`.filter(u -> u.getStatus() == UserStatus.ACTIVE)`), §Common Pitfalls #6 |
| NOTIF-05 | 제목 `[MiceSign]` prefix + 한글 UTF-8 정상 표기 (`MimeMessageHelper` UTF-8 강제) | §Standard Stack (MimeMessageHelper 3-arg ctor), §Code Examples §1 (`new MimeMessageHelper(message, true, "UTF-8")`), §Common Pitfalls #3 |
| NFR-02 | 이메일 발송이 결재 트랜잭션 비블로킹 (`@Async` + `AFTER_COMMIT`) | §Architecture Patterns §1 (기존 리스너 패턴 유지 — 이미 구현), §Common Pitfalls #7 (`@Transactional(REQUIRES_NEW)` on `persistLog`) |
| NFR-03 | 감사 로그 중복 방지 — 리스너에서 `audit_log` 추가 INSERT 금지 (`COUNT=1 per action`) | §Architecture Patterns §1 (audit in service, never in listener), §Validation Architecture §Test Framework (`ApprovalServiceAuditTest` JdbcTemplate COUNT 검증), §Common Pitfalls #8 |
</phase_requirements>

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| `publishEvent(ApprovalNotificationEvent)` | API / Backend (Service) | — | `ApprovalService`/`DocumentService` 상태 전이 지점에서 이미 호출. 수정 금지 (CONTEXT canonical_refs). |
| `@TransactionalEventListener(AFTER_COMMIT)` + `@Async` 리스너 | API / Backend (EmailService) | — | 트랜잭션 커밋 후 비동기 dispatching. `RegistrationEmailService` 와 동일 레이어. |
| 수신자 결정 (`determineRecipients`) + RETIRED/INACTIVE 필터 + `.distinct()` | API / Backend (EmailService) | — | 도메인 규칙(결재선 타입, 사용자 상태). 리스너에서 단일 호출. |
| SMTP 발송 + @Retryable/@Recover + PENDING-first 로깅 | API / Backend (ApprovalEmailSender, 별도 빈) | — | 프록시 체인 격리 위해 EmailService 와 분리 (D-B1). |
| Thymeleaf 템플릿 렌더 (5 events + 1 layout fragment) | API / Backend (resources/templates/email/) | — | 서버 사이드 렌더. 이메일 HTML 은 서버에서 완성해 SMTP 전송. |
| V19 Flyway 마이그레이션 (`UNIQUE` 제약) | Database / Storage | — | 중복 방지의 물리적 관문. 엔티티 선언과 이중화(D-A3). |
| `@Profile("prod") ApplicationReadyEvent` localhost 가드 | API / Backend (config) | — | 배포 전 구성 검증. fail-fast 부트스트랩. |
| GreenMail / MailHog SMTP 수신 | Test infrastructure | — | 수신 측 시뮬레이션. 프로덕션 런타임에서 미사용. |

## Standard Stack

### Core (모두 이미 설치됨 — 신규 의존성 zero)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `spring-boot-starter-mail` | managed by Boot 3.5.13 | `JavaMailSender` + `MimeMessageHelper` | Spring 공식. Jakarta Mail 2.x 네임스페이스 자동. [VERIFIED: build.gradle.kts:26] |
| `spring-boot-starter-thymeleaf` | managed by Boot 3.5.13 | `SpringTemplateEngine` + fragment layouts | Spring 공식. HTML 템플릿 rendering, UTF-8 out-of-box. [VERIFIED: build.gradle.kts:27] |
| `spring-retry` | managed (2.0.x) | `@Retryable` + `@Recover` + `@Backoff` | 선언적 재시도. `BudgetIntegrationService` 가 동일 패턴 선례. [VERIFIED: build.gradle.kts:61] |
| `spring-boot-starter-aop` | managed by Boot 3.5.13 | `@Retryable`, `@Async` AOP proxy | Spring Retry 의 runtime 의존. [VERIFIED: build.gradle.kts:62] |
| `@EnableRetry` (`RetryConfig`) | existing | `@Retryable` 활성화 | 빈 `@Configuration` 파일 하나. 이미 존재. [VERIFIED: com.micesign.config.RetryConfig] |
| `@EnableAsync` (`AsyncConfig`) | existing | `@Async` 활성화 + `micesign-async-` 풀 | core=2/max=5/queue=100. CONTEXT D-D4 에 의거 변경 없음. [VERIFIED: AsyncConfig.java] |
| Flyway + flyway-mysql | managed | V19 migration 실행 | MariaDB 호환. [VERIFIED: build.gradle.kts:35-36] |
| `jakarta.mail.internet.MimeMessage` | Jakarta Mail 2.x | MIME 메시지 (Boot 3.x는 javax.mail 미사용) | `RegistrationEmailService:14` 에서 이미 import. [VERIFIED: RegistrationEmailService.java] |

### Supporting (테스트 전용 — 신규 추가 필요)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `com.icegreen:greenmail-junit5` | **2.1.x 권장** (current stable) | 인-프로세스 SMTP 서버 + JUnit 5 Extension | `@SpringBootTest` 통합 테스트에서 수신 메시지 검증 (한글 제목 디코딩, 재시도 경로, UNIQUE 제약). **CONTEXT 는 1.6.x 라고 했으나 1.6.x 는 javax.mail 시절 — Spring Boot 3 (Jakarta Mail 2) 에서는 2.1.x 필수** (Assumptions Log A1). [CITED: mvnrepository.com/artifact/com.icegreen/greenmail-junit5, https://github.com/greenmail-mail-test/greenmail-example-spring-boot-3] |
| MailHog or Mailpit | 최신 (개발자 환경에 설치된 것) | 수동 UAT — 시각적 이메일 확인 | 로컬 개발 중 `MAIL_HOST=localhost MAIL_PORT=1025` 로 바인딩. 수동 smoke test. **Gradle 의존성 아님 — 별도 바이너리/brew/docker.** [CITED: mailpit.axllent.org, github.com/mailhog/MailHog] |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| GreenMail 2.1.x | GreenMail 1.6.x (CONTEXT 명시) | **불가.** 1.6.x 는 `javax.mail.*` 네임스페이스를 사용하는 JDK/EE 8 시절 릴리스. Spring Boot 3 의 `jakarta.mail.*` 와 호환되지 않음. GreenMail 2.0+ 만 Jakarta Mail 2.x 를 사용. [CITED: greenmail-mail-test/greenmail-example-spring-boot-3] |
| GreenMail | Mailpit/MailHog 만 사용 | 수동 UAT 전용. 자동화 테스트에는 부적합 (프로세스 관리, assertion API 부재). GreenMail 은 인-프로세스 lifecycle + `getReceivedMessages()` 검증 API 제공. |
| `@Retryable` 별도 빈 | `RetryTemplate` 프로그래매틱 | 동작 동일하나 CONTEXT D-B1/D-B2 에서 선언적 `@Retryable` 고정. `BudgetIntegrationService` 와 일관성 유지. |
| Thymeleaf fragment layout | 5개 템플릿을 독립 작성 (공통 헤더/푸터 반복) | DRY 원칙 위배. CONTEXT D-C3 에서 fragment 방식 locked. |
| Inline CSS | CSS class + `<style>` block | 이메일 클라이언트 호환성. Gmail/Outlook 이 `<style>` 제거. `registration-submit.html` 이 인라인 채택 (D-C7). |
| `MailException` catch-all | Specific exception filters | `retryFor = MailSendException.class` 로 transient 만 재시도. `noRetryFor = {MailAuthenticationException.class, MailParseException.class}` 로 영구 실패 즉시 차단 (D-A5/D-B2). |

**Installation:**

```gradle
// backend/build.gradle.kts — test 섹션에 추가
dependencies {
    // ... 기존 유지
    testImplementation("com.icegreen:greenmail-junit5:2.1.3")  // 버전은 Assumptions Log A2 참조 후 planner 가 최종 확정
}
```

**Version verification:** planner 는 착수 시점에 mvnrepository 에서 `greenmail-junit5` 의 최신 2.1.x 패치 버전을 확인하고 (`npm view` 대응: `curl -s "https://search.maven.org/solrsearch/select?q=g:com.icegreen+AND+a:greenmail-junit5&rows=5&wt=json" | jq`), 해당 값으로 pinning 한다. 2026-04-23 시점 Context7/mvnrepository 조회 기준 2.1.x 최신 = 2.1.x (정확한 패치 버전은 planner 재확인 필요 — Assumptions Log A2).

## Architecture Patterns

### System Architecture Diagram

```
[User Action (Submit / Approve / Reject / Withdraw)]
        │ HTTP POST /api/v1/...
        ▼
 [DocumentController / ApprovalController]      (변경 없음)
        │
        ▼  @Transactional
 [DocumentService / ApprovalService]             (변경 없음 — publishEvent 5 지점 유지)
        │     ├─ documentRepository.save()
        │     ├─ auditLogService.log(...)        ← audit_log INSERT (동기, 1회)
        │     └─ eventPublisher.publishEvent(new ApprovalNotificationEvent(...))
        │                                          ↑ 스풀링 (Tx 미커밋)
        ◀─ Controller 응답 반환
        │
  ══════ TX COMMIT ══════
        │
        ▼  AFTER_COMMIT + @Async("micesign-async-*")
 [EmailService.sendNotification(event)]          (수정 — PENDING-first 로직 + ApprovalEmailSender 호출)
        │
        ├─ documentRepository.findByIdWithDrafter(docId)
        ├─ approvalLineRepository.findByDocumentIdOrderByStepOrderAsc()
        ├─ determineRecipients(doc, eventType)
        │     └─ .filter(REFERENCE 제외) .filter(ACTIVE 만) .distinct() by User.id
        │
        ▼  for each recipient  (직접 주입된 별도 빈)
 [ApprovalEmailSender.send(doc, recipient, eventType)]
        │
        │  Step 1 ── persistLog(NEW PENDING row)  @Transactional(REQUIRES_NEW)
        │           INSERT notification_log (status=PENDING, recipient_email=snapshot,
        │                                    document_id, event_type, recipient_id)
        │           ↘ UNIQUE(document_id, event_type, recipient_id) 위반 시 skip (Phase 재실행 방지)
        │
        │  Step 2 ── @Retryable(retryFor=MailSendException,
        │                       noRetryFor={MailAuthentication, MailParse},
        │                       maxAttempts=3, backoff=@Backoff(delay=300000L))
        │           ├─ (재시도 진입 전) persistLog(status=RETRY, retry_count++)
        │           ├─ templateEngine.process("email/approval-{event}", ctx)
        │           ├─ new MimeMessageHelper(msg, true, "UTF-8")   ← UTF-8 강제
        │           ├─ helper.setFrom("MiceSign <...>")
        │           ├─ helper.setTo(recipient.email)
        │           ├─ helper.setSubject("[MiceSign] {actionLabel}: {docNumber} {title}")
        │           ├─ helper.setText(html, true)
        │           └─ mailSender.send(msg)
        │                  │
        │         ┌────────┴────────┐
        │         ▼ 성공             ▼ 실패
        │  persistLog(               @Recover.recover(
        │    status=SUCCESS,           MailException e, NotificationLog log,
        │    sent_at=now)              Document, User, EventType)
        │                              persistLog(status=FAILED,
        │                                         error_message=e.getMessage(),
        │                                         retry_count=현재값)
        │
        ▼
 [notification_log DB row]            [SMTP Server — 운영: 사내 릴레이 / 테스트: GreenMail / 개발: MailHog]
```

### Component Responsibilities

| Component | File (권장 위치) | Responsibility | Phase 29 변경 |
|-----------|-----------------|----------------|---------------|
| `ApprovalService` / `DocumentService` | `service/ApprovalService.java`, `service/DocumentService.java` | 결재 상태 전이 + `auditLogService.log()` + `publishEvent()` | **변경 금지** |
| `ApprovalNotificationEvent` | `event/ApprovalNotificationEvent.java` | POJO 이벤트 (documentId, eventType, actorId) | **변경 금지** |
| `EmailService` | `service/EmailService.java` | `@TransactionalEventListener(AFTER_COMMIT)` + `@Async` 리스너, 수신자 결정, `.distinct()` 적용, `ApprovalEmailSender` 주입·위임 | **수정** — stub 제거, `ApprovalEmailSender` 호출, `.distinct()` 추가, RETIRED/INACTIVE filter 추가 |
| `ApprovalEmailSender` (신규) | `service/ApprovalEmailSender.java` *(또는 `service/email/` 하위)* | SMTP 전송, `@Retryable`/`@Recover`, Thymeleaf 렌더, PENDING/SUCCESS/FAILED `persistLog()` | **신규 생성** |
| `NotificationLog` 엔티티 | `domain/NotificationLog.java` | JPA 엔티티 + `@UniqueConstraint` 선언 | **수정** — `@Table(uniqueConstraints = ...)` 1줄 추가 (D-A3) |
| `templates/email/layouts/approval-base.html` | `resources/templates/email/layouts/` | `th:fragment="layout (body)"` 공통 레이아웃 (헤더/푸터/CTA/CJK) | **신규 생성** |
| `templates/email/approval-{submit,approve,final-approve,reject,withdraw}.html` | `resources/templates/email/` | 이벤트별 body fragment — `th:replace="layouts/approval-base :: layout(~{::body})"` | **신규 생성 (5개)** |
| V19 Flyway migration | `resources/db/migration/V19__add_notification_log_unique.sql` | `ALTER TABLE notification_log ADD CONSTRAINT uk_notification_dedup UNIQUE (document_id, event_type, recipient_id)` | **신규 생성** + test migration 도 동일 추가 필요 (`test/resources/db/testmigration/V{next}__...sql`) |
| `application-prod.yml` | `resources/application-prod.yml` | `app.base-url` 명시 주입 | **수정** — `app.base-url: ${APP_BASE_URL:https://micesign.사내도메인}` |
| `BaseUrlGuard` (신규, 선택 이름) | `config/BaseUrlGuard.java` *(또는 `bootstrap/` 하위)* | `@Profile("prod") @EventListener(ApplicationReadyEvent.class)` localhost guard | **신규 생성** |
| `application-test.yml` | `test/resources/application-test.yml` | `spring.mail.host=127.0.0.1`, `spring.mail.port=3025` 로 GreenMail 매칭 | **수정** — `spring.mail.*` 블록 추가 |
| `ApprovalNotificationIntegrationTest` (신규) | `test/.../notification/...` | GreenMail + `@SpringBootTest` 5 이벤트 × 수신자 규칙 × UTF-8 subject | **신규 생성** |
| `ApprovalEmailSenderRetryTest` (신규) | `test/.../notification/...` | `@Retryable` 경로 검증 (MockBean mailSender throws `MailSendException`) | **신규 생성** |
| `ApprovalServiceAuditTest` (신규) | `test/.../document/` *(AuditLogGapTest 와 동일 패키지 권장)* | `COUNT=1 per action` 무결성 (NFR-03) | **신규 생성** |

### Recommended Project Structure

```
backend/src/main/java/com/micesign/
├── service/
│   ├── EmailService.java              ← 수정 (stub 제거 + ApprovalEmailSender 주입)
│   ├── ApprovalEmailSender.java       ← 신규 (별도 빈, @Retryable/@Recover)
│   └── RegistrationEmailService.java  ← 변경 없음 (참조)
├── config/
│   ├── AsyncConfig.java               ← 변경 없음
│   ├── RetryConfig.java               ← 변경 없음 (@EnableRetry 이미 있음)
│   └── BaseUrlGuard.java              ← 신규 (@Profile("prod") + @EventListener(ApplicationReadyEvent))
├── domain/
│   └── NotificationLog.java           ← @UniqueConstraint 추가 (1줄)
└── event/
    └── ApprovalNotificationEvent.java ← 변경 없음

backend/src/main/resources/
├── templates/email/
│   ├── layouts/
│   │   └── approval-base.html         ← 신규 (공통 fragment)
│   ├── approval-submit.html           ← 신규
│   ├── approval-approve.html          ← 신규
│   ├── approval-final-approve.html    ← 신규
│   ├── approval-reject.html           ← 신규
│   ├── approval-withdraw.html         ← 신규
│   └── registration-*.html            ← 변경 없음 (Phase 29 스코프 밖)
├── db/migration/
│   └── V19__add_notification_log_unique.sql  ← 신규
├── application.yml                    ← 변경 없음 (spring.mail.* env var 유지)
└── application-prod.yml               ← app.base-url 추가

backend/src/test/java/com/micesign/notification/    ← 신규 패키지
├── ApprovalNotificationIntegrationTest.java        ← 신규 (GreenMail + 5 이벤트 × 수신자 규칙)
└── ApprovalEmailSenderRetryTest.java               ← 신규 (@Retryable 경로)

backend/src/test/java/com/micesign/document/
└── ApprovalServiceAuditTest.java                   ← 신규 (AuditLogGapTest 패턴 복제)

backend/src/test/resources/
├── application-test.yml               ← spring.mail.host/port 추가
└── db/testmigration/
    └── V{next}__add_notification_log_unique.sql  ← 신규 (V19 와 동일 DDL, 번호는 V9 이후 다음 순번)
```

### Pattern 1: `@TransactionalEventListener(AFTER_COMMIT)` + `@Async` 리스너 (이미 존재, 유지)

**What:** 결재 트랜잭션 커밋 후 별도 스레드에서 이메일 디스패칭 시작.
**When to use:** `ApprovalNotificationEvent` 처리 진입점. **Phase 29 에서 메서드 시그니처 그대로 유지**, 내부 로직만 `ApprovalEmailSender` 위임으로 교체.
**Example:**

```java
// EmailService.java — 교체 후 뼈대
@TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
@Async  // micesign-async- 풀로 점프
public void sendNotification(ApprovalNotificationEvent event) {
    Document doc = documentRepository.findByIdWithDrafter(event.getDocumentId()).orElse(null);
    if (doc == null) { log.warn("..."); return; }

    NotificationEventType type = NotificationEventType.valueOf(event.getEventType());
    List<User> recipients = determineRecipients(doc, type);  // REFERENCE 제외 + ACTIVE 만 + distinct

    for (User recipient : recipients) {
        approvalEmailSender.send(doc, recipient, type);  // ← 별도 빈 호출 (프록시 체인 보장)
    }
}
// Source: adapted from RegistrationEmailService.java:72-97 + CONTEXT D-B1
```

**Trade-off:** `AFTER_COMMIT` 은 원 Tx 가 이미 끝난 상태이므로 **이 메서드 위에 `@Transactional` 을 새로 걸 필요 없음**. `REQUIRES_NEW` 는 `ApprovalEmailSender.persistLog()` 에만 (D-A6). 리스너 메서드 전체를 Tx 로 감싸면 send 실패 시 PENDING 행까지 rollback 되어 재시도 응답성 손실 (Pitfall).

### Pattern 2: PENDING-first 3단계 로깅 (Pitfall 17 해결)

**What:** INSERT `status=PENDING` → `mailSender.send()` → UPDATE `status=SUCCESS/FAILED/RETRY`.
**When to use:** `ApprovalEmailSender.send()` 내부. 현재 `EmailService.sendToRecipient` 의 "send → try/catch → save" 순서를 **반드시 역전** 해야 함 (PITFALLS 17 — 현재 순서에서 save 가 NULL 제약/FK 위반으로 실패하면 이메일은 갔는데 로그가 없음).
**Example:** §Code Examples §1 참고.

### Pattern 3: `@Retryable` + `@Recover` 분리 빈

**What:** `ApprovalEmailSender` 를 `@Component` 로 선언, `EmailService` 가 주입해서 호출 — Spring AOP 프록시 경계를 넘어감으로써 self-invocation 우회 차단 (PITFALLS 2).
**When to use:** Phase 29 모든 전송 경로. CONTEXT D-B1 에 locked.
**Reference implementation in this repo:** `RealBudgetApiClient.java:35-83` — `@Retryable(retryFor = {RestClientException.class}, maxAttempts = 3, backoff = @Backoff(delay = 2000, multiplier = 1.5))` + `@Recover public ... recoverXxx(RestClientException e, ...Request request)`. 동일 빈의 동일 클래스에서 `@Retryable`/`@Recover` 가 둘 다 선언되어야 함 (같은 프록시 타겟).

### Pattern 4: Thymeleaf fragment layout (`th:replace="... :: layout(~{::body})"`)

**What:** 공통 `layouts/approval-base.html` 이 파라미터화된 `th:fragment="layout (body)"` 를 export. 5개 이벤트 템플릿이 자신의 `<body>` 컨텐츠만 만들고 layout 을 불러들임.
**When to use:** 5개 템플릿 공통의 헤더/푸터/CTA/CJK 폰트 스택/600px 고정폭을 한 곳에서 관리. CONTEXT D-C3 에 locked.
**Spring Boot 3 / Thymeleaf-Spring6 3.1 syntax:** `th:replace="~{layouts/approval-base :: layout(~{::body})}"` — **3.1 부터 fragment expression 은 `~{...}` 감싸는 것이 권장** (unwrapped 는 deprecated). [CITED: Thymeleaf 3.1 what's new]
**Example:** §Code Examples §4.

### Pattern 5: `@ConditionalOnProperty` JavaMailSender + null-safe 주입

**What:** `MAIL_HOST` env var 미설정 → `JavaMailSender` 빈 생성 skip → `ApprovalEmailSender` 는 `@Autowired(required=false)` 로 null 수용 → stub 모드로 fallback (D-D7).
**When to use:** 개발 환경에서 SMTP 없이 애플리케이션 기동 가능하게. `RegistrationEmailService:56-67` 가 이미 선례.

### Anti-Patterns to Avoid

- **`@Retryable` 과 `@Async` 를 같은 메서드에 부착:** 프록시 체인 겹침으로 동작 불안정. 리스너 = `@Async`, sender = `@Retryable` 로 분리 (CONTEXT D-B1).
- **리스너 메서드 내부에서 `this.send()` 자기 호출:** AOP 프록시 우회. 반드시 별도 빈(=`ApprovalEmailSender`) 주입해서 호출.
- **`notification_log.save()` 를 try/catch 안쪽에 두고 send 를 바깥에:** 현 `EmailService.sendToRecipient` 의 버그 — send 는 성공했는데 save 가 실패하면 이메일 유령. 순서를 뒤집어야 함.
- **`@Transactional(propagation=REQUIRES_NEW)` 를 `send()` 전체에 부착:** 발송 실패 시 PENDING 행까지 롤백. `persistLog()` 헬퍼에만 부착 (D-B4/D-A6).
- **리스너에서 `audit_log` 추가 INSERT:** NFR-03 위반. `audit_log` 는 서비스 메서드가 동기로 쓰는 단일 진실.
- **이벤트 체이닝** (`publishEvent(APPROVE) → listener 가 publishEvent(FINAL_APPROVE)`): nested `@TransactionalEventListener` 는 조용히 손실됨 ([Spring #35395](https://github.com/spring-projects/spring-framework/issues/35395)). 현재 구조(producer 에서 eventType 확정)를 유지해야 함.
- **이메일 URL 하드코딩:** `${app.base-url}` 주입 필수 (D-C4). `@Profile("prod")` 가드 (D-D2) 로 localhost 감지 시 startup 실패.
- **`MimeMessageHelper(message, true)` 2-arg:** 한글 제목 `?????` 인코딩 버그. 반드시 `new MimeMessageHelper(message, true, "UTF-8")` 3-arg.
- **GreenMail 1.6.x 에 pin:** `javax.mail` 시절 — Spring Boot 3 의 `jakarta.mail` 과 충돌. 반드시 2.1.x.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| 재시도 + backoff + recovery | 직접 try/catch + Thread.sleep + retry count | `@Retryable(retryFor=..., maxAttempts=3, backoff=@Backoff(delay=300000L))` + `@Recover` | Spring Retry 는 이미 classpath. 프록시 기반이므로 메서드 시그니처만 맞추면 됨. `RetryContext` API 도 자동 제공 (D-A9). |
| 비동기 실행 스레드 풀 | `ExecutorService` 직접 생성 | 기존 `@Async("micesign-async-")` (AsyncConfig) | 이미 튜닝됨. 공유 변경 없음 (D-D4). |
| SMTP 서버 (로컬 개발) | 직접 `nc -l 25` 서버 작성 | MailHog 또는 Mailpit 바이너리 | brew/docker 1줄 설치. GUI 포함. |
| SMTP 서버 (자동 테스트) | Mock JavaMailSender (수신 assertion 불가) | GreenMail 2.1.x `@RegisterExtension` | 인-프로세스 SMTP, MimeMessage 수신 가능, getReceivedMessages() API. |
| 한글 MIME 인코딩 | 직접 `Base64` 인코딩 subject | `MimeMessageHelper(msg, true, "UTF-8")` | JavaMail 이 RFC 2047 B/Q-encoding 을 자동 적용. |
| HTML 이메일 렌더링 | `String.format(...)` 수작업 | `SpringTemplateEngine.process("email/...", ctx)` | XSS 보호, 표현식 엔진, fragment 재사용. `RegistrationEmailService` 선례. |
| 공통 레이아웃 복붙 | 5개 HTML 파일에 헤더/푸터 복붙 | Thymeleaf `th:fragment` + `th:replace` | DRY. CONTEXT D-C3. |
| 중복 이메일 방지 | 애플리케이션에서 Map 캐시 | DB `UNIQUE(document_id, event_type, recipient_id)` + V19 migration | 다중 JVM 에서도 안전. Flyway + `ddl-auto=validate` 가 drift 잡음. |
| SMTP 자격증명 로컬 기본값 | `application.yml` 에 하드코딩 | `${MAIL_PASSWORD:}` + `@ConditionalOnProperty` | 비밀 유출 방지. 이미 패턴 적용됨 (application.yml:26-29). |
| prod URL 검증 | 배포 runbook 체크리스트 | `@Profile("prod") @EventListener(ApplicationReadyEvent)` fail-fast | 배포 실수 감지 자동화 (D-D2). |
| NotificationLog JPA save 경계 | 리스너 메서드 전체 `@Transactional` | `persistLog()` helper 에만 `REQUIRES_NEW` | 로그 실패가 send 롤백 유발하지 않도록 Tx 경계 최소화 (D-A6/D-B4). |

**Key insight:** Spring 생태계에서는 "메일 발송 안정성" 에 대한 정석이 이미 존재한다. Phase 29 의 가치는 **코드 양을 줄이는 것** 이 아니라 **존재하는 primitives 를 올바른 순서로 조립하는 것** 이다. 자체 구현은 모두 Pitfall.

## Runtime State Inventory

> Phase 29 는 retrofit 작업이지만 "rename/refactor/migration" 패턴은 아님 (기존 컬럼명 유지, 신규 제약만 추가). 그러나 V19 migration 이 운영 DB 상태를 건드리므로 확인 필요.

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | `notification_log` 기존 rows: 현 `EmailService` 는 log-stub 이라 `document_id`+`event_type`+`recipient_id` 조합 중복이 구조적으로 불가능 (stub 도 매 listener 호출마다 INSERT 하긴 함 — docId NULL 체크 필요). `RegistrationEmailService` rows 는 `document_id IS NULL` 이므로 `UNIQUE` 제약이 NULL 처리 규칙(MariaDB: NULL ≠ NULL 로 중복 허용)에 따라 영향 없음. | V19 DDL 실행 전 `SELECT document_id, event_type, recipient_id, COUNT(*) FROM notification_log WHERE document_id IS NOT NULL GROUP BY 1,2,3 HAVING COUNT(*)>1` 로 사전 검증 1회. 중복 있으면 수동 삭제 후 migration. |
| Live service config | 운영 SMTP 공급자 미확정 (STATE.md Blocker). `application-prod.yml` 의 `app.base-url` 미설정 (Blocker). | Phase 33 런북에서 최종 결정. Phase 29 는 env var 기반으로 agnostic 하게 개발. `APP_BASE_URL` 운영 값 주입은 배포 팀 협의. |
| OS-registered state | 없음 — systemd 서비스는 Spring Boot JAR 한 개 (별도 cron/task scheduler 없음). | None — 확인 완료 (no mail worker process, no scheduled cleanup). |
| Secrets/env vars | `MAIL_HOST`, `MAIL_PORT`, `MAIL_USERNAME`, `MAIL_PASSWORD`, `APP_BASE_URL` — 모두 env var 주입. GitHub Actions SSH deploy 시점에 주입 필요. 로컬 `.env` 에 평문 금지. | Phase 33 런북에 env var 체크리스트 추가. Phase 29 에서는 `application.yml` 기본값(`${MAIL_HOST:}` 등) 유지. |
| Build artifacts / installed packages | 신규 패키지 `greenmail-junit5` 만 추가. Gradle 캐시 재생성 필요. Spring Boot starter 재설치 없음. | `./gradlew clean test` 1회 실행해서 dependency 갱신. |

**Canonical question answer:** 모든 파일이 업데이트된 뒤 운영 상태에 남는 것은 (1) `notification_log` 의 V19 UNIQUE 제약, (2) `application-prod.yml` 의 `app.base-url` 값, (3) env var 로 주입되는 SMTP 자격증명 — 모두 Phase 29 범위에서 코드/설정으로 관리됨. 백필 migration 이나 재등록할 OS-level 상태는 없음.

## Common Pitfalls

### Pitfall 1: `@Async` + `@Retryable` self-invocation (PITFALLS #2)

**What goes wrong:** `EmailService` 내부에서 `@Retryable private void sendToRecipient(...)` 를 `this.sendToRecipient(...)` 로 호출 → Spring 프록시 우회, 재시도 일체 동작 안 함.
**Why it happens:** Spring AOP 는 외부 호출자가 프록시 빈에 접근할 때만 advice 를 wrap. 같은 클래스 내 `this.*` 호출은 원 객체 직호출.
**How to avoid:** **별도 `@Component ApprovalEmailSender` 빈** (CONTEXT D-B1). `EmailService` 가 `@Autowired ApprovalEmailSender` 로 주입받아 호출 — 프록시 경계를 넘어감.
**Warning signs:** `@Retryable` 붙었는데 테스트 로그에 "Retry attempt 1/3" 메시지가 한 번도 안 나옴. `BudgetRetryIntegrationTest.shouldHaveRetryConfigured()` 같은 reflection 어서트로 Config 자체 존재 여부 확인.

### Pitfall 2: `@Recover` 메서드 시그니처 불일치

**What goes wrong:** `@Retryable` 이 `List<Thing>` 반환하는데 `@Recover` 는 `void` 또는 다른 타입이면 Spring Retry 가 매칭 실패, 원 예외가 caller 에게 throw.
**Why it happens:** Spring Retry 는 (1) 첫 번째 파라미터로 Throwable, (2) 나머지 파라미터로 원본 args, (3) return 타입 일치를 요구. 파라미터 이름은 무관하나 타입은 정확히 일치해야 함.
**How to avoid:** `send(Document, User, NotificationEventType)` 이 `void` → `@Recover void recover(MailException e, Document doc, User recipient, NotificationEventType eventType)` — 동일 클래스 내 정확히 1개.
**Signature rule (VERIFIED via Context7 Spring Retry docs):**
- 첫 파라미터 = Throwable (이것이 `retryFor`/`noRetryFor` 에서 지정한 타입의 슈퍼타입이어야 함)
- 이후 파라미터 = 원 메서드의 args 를 같은 순서·타입으로
- 반환 타입 = 원 메서드와 동일
- 모호성 있으면 `@Retryable(recover = "methodName")` 으로 명시

```Java
// Source: Context7 /spring-projects/spring-retry README
@Service
class Service {
    @Retryable(retryFor = RemoteAccessException.class)
    public void service(String str1, String str2) { ... }

    @Recover
    public void recover(RemoteAccessException e, String str1, String str2) { ... }
}
```

**Forcing `MailSendException` for test:** `@MockBean JavaMailSender mailSender` + `doThrow(new MailSendException("connection refused")).when(mailSender).send(any(MimeMessage.class))` → `ApprovalEmailSender.send()` 가 3회 호출되는 것을 `verify(mailSender, times(3)).send(...)` 로 검증. `RetryContext.getRetryCount()` 는 `@Recover` 진입 시 `2` (0-indexed). 재시도 간격은 `@Backoff(delay=300000L)` 이므로 테스트에서는 Spring Retry 의 `SimpleRetryPolicy` 를 직접 생성해서 delay=0 으로 오버라이드하거나, `@TestConfiguration` 으로 `RetryTemplate` 빈 교체.

### Pitfall 3: 한글 subject `?????` 인코딩 (PITFALLS #18)

**What goes wrong:** `new MimeMessageHelper(message, true)` 2-arg → JavaMail 기본 ASCII → 한글 subject 가 `?????`.
**Why it happens:** `MimeMessageHelper` 3-arg `(message, boolean multipart, String encoding)` 만이 subject/body UTF-8 모두 보장.
**How to avoid:** `new MimeMessageHelper(message, true, "UTF-8")` 3-arg + `application.yml` 에 `spring.mail.default-encoding: UTF-8` + `spring.mail.properties.mail.mime.charset: UTF-8`.
**Test:** GreenMail `getReceivedMessages()[0].getSubject()` 가 decoded 한글 리터럴 반환. GreenMail 은 자동으로 RFC 2047 decoding.

### Pitfall 4: `@Transactional(REQUIRES_NEW)` 적용 위치 (PITFALLS #1)

**What goes wrong:** 리스너 메서드 `sendNotification` 전체에 `REQUIRES_NEW` 를 붙이면 send 실패 → 예외 전파 → Tx 롤백 → PENDING INSERT 까지 롤백 → 재시도 시 log 없음. 역으로 Tx 없으면 `TransactionRequiredException` 위험.
**Why it happens:** `AFTER_COMMIT` 리스너는 원 Tx 가 끝난 상태. save() 호출이 flush 시점에 Tx 필요.
**How to avoid:** `persistLog(log)` helper 메서드 **한 곳에만** `@Transactional(propagation = Propagation.REQUIRES_NEW)` — INSERT/UPDATE 마다 독립 커밋. `send()` 자체에는 Tx 없음 (D-B4).

```java
// 권장 구조
@Component
public class ApprovalEmailSender {
    @Retryable(...)
    public void send(Document doc, User recipient, NotificationEventType type) {
        NotificationLog log = persistLog(buildPending(doc, recipient, type));   // 1st commit
        try {
            // render + MimeMessage 조립 + mailSender.send()
            log.setStatus(SUCCESS); log.setSentAt(LocalDateTime.now());
            persistLog(log);                                                     // 2nd commit
        } catch (MailSendException e) { // retryFor → @Retryable 재시도
            log.setStatus(RETRY); log.setRetryCount(log.getRetryCount()+1);
            persistLog(log); throw e;                                            // 재시도 trigger
        }
    }

    @Recover
    public void recover(MailException e, Document doc, User recipient, NotificationEventType type) {
        // 재시도 소진 → FAILED 로 마감. @Recover 는 "failed" 상태로 만들되 별도 persistLog
        NotificationLog log = findPendingLog(doc.getId(), type, recipient.getId());
        log.setStatus(FAILED);
        log.setErrorMessage(truncate(e.getClass().getSimpleName() + ": " + e.getMessage(), 255));
        persistLog(log);
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)  // ← 여기만
    protected NotificationLog persistLog(NotificationLog log) {
        return notificationLogRepository.save(log);
    }
}
```

**Self-injection for REQUIRES_NEW?** `persistLog()` 가 같은 빈의 다른 메서드에서 호출되므로 이론상 프록시 우회 위험. 그러나 **Spring 은 `@Transactional` 을 AOP 로 처리하며, 같은 클래스 내 `this.method()` 호출은 advice 를 타지 않음** — 이는 `@Retryable` 과 동일한 프록시 한계다. 그럼에도 `BudgetIntegrationService` 와 기타 실 프로젝트 관례에서는 `protected` 로 선언하고 내부 호출을 허용하는데, 이는 Spring Boot 3.x 기준 **정확히 동작하지 않는다**. 해결책 두 가지:

1. **Self-injection (권장):** `ApprovalEmailSender` 가 스스로를 주입받아 `self.persistLog(log)` 로 호출 — 프록시 타겟.
   ```java
   @Component
   public class ApprovalEmailSender {
       private final ApprovalEmailSender self;
       public ApprovalEmailSender(@Lazy ApprovalEmailSender self) { this.self = self; }
       // self.persistLog(...) 로 호출
   }
   ```
2. **Repository 주입 + 명시 tx manager:** 가장 간단 — `TransactionTemplate` 을 주입받아 프로그래매틱으로 `execute(...)`. `@Transactional` 어노테이션 포기.

**Planner 권장:** 옵션 1 (`@Lazy` self-injection) — 어노테이션 선언적 방식 유지 + 프록시 보장. 코드 1줄 추가 비용. 이는 Spring 공식 추천 패턴이며 순환 의존 경고는 `@Lazy` 가 해소. [CITED: Spring docs "Spring AOP Self-Invocation" section]

### Pitfall 5: `app.base-url` 가 localhost (PITFALLS #19)

**What goes wrong:** prod 배포 후 이메일 본문 링크가 `http://localhost:5173/documents/42` — 외부 사용자 클릭 시 통신 불가.
**Why it happens:** `application.yml` default `${APP_BASE_URL:http://localhost:5173}` + `application-prod.yml` 에 override 없음.
**How to avoid:** (1) `application-prod.yml` 에 `app.base-url: ${APP_BASE_URL:https://micesign.사내도메인}` 추가 (D-D2); (2) `@Profile("prod") @EventListener(ApplicationReadyEvent)` 빈이 `baseUrl.contains("localhost")` 검증 → true 시 `throw new IllegalStateException(...)` 로 startup abort.

```java
// Source: Spring Boot ApplicationReadyEvent pattern [CITED: docs.spring.io/spring-boot/reference/features/spring-application.html]
@Component
@Profile("prod")
public class BaseUrlGuard {
    private static final Logger log = LoggerFactory.getLogger(BaseUrlGuard.class);

    @Value("${app.base-url}")
    private String baseUrl;

    @EventListener(ApplicationReadyEvent.class)
    public void validateBaseUrl() {
        if (baseUrl == null || baseUrl.isBlank() || baseUrl.contains("localhost") || baseUrl.contains("127.0.0.1")) {
            log.error("BOOT ABORTED: app.base-url is invalid for prod profile: '{}'", baseUrl);
            throw new IllegalStateException("app.base-url must be a public prod URL, got: " + baseUrl);
        }
        log.info("BaseUrlGuard: app.base-url validated = {}", baseUrl);
    }
}
```

**Warning signs:** startup 에서 `IllegalStateException: app.base-url must be...` — 의도된 실패. 수동 UAT 가드로도 활용.

### Pitfall 6: RETIRED/INACTIVE 사용자 스킵 누락 (NOTIF-04)

**What goes wrong:** 퇴직자 `User.status=RETIRED` 에게도 결재선 남아있어 이메일 발송 → 바운스 또는 정책 위반.
**Why it happens:** 현재 `determineRecipients()` 에 status 필터 없음.
**How to avoid:** `determineRecipients` 마지막 단계에 `.filter(u -> u.getStatus() == UserStatus.ACTIVE)` 추가. DB UNIQUE 와는 무관한 수신자 규칙.

### Pitfall 7: `notification_log` 엔티티-스키마 drift (PITFALLS #16)

**What goes wrong:** `ddl-auto=validate` 는 startup 검증하지만 컬럼 타입/nullable 만 체크 — `@UniqueConstraint` 는 엔티티 레벨 선언만 하고 Flyway 가 안 따라가면 **검증 안 됨**. 프로덕션 DB 에 제약 없음.
**Why it happens:** JPA schema validation 은 인덱스/제약에 대해 느슨.
**How to avoid:** **V19 migration + `@UniqueConstraint` 이중 선언** (D-A3). 추가로 integration test 에서 UNIQUE 위반 insert 를 명시적으로 검증 (GreenMail 테스트의 중복 시나리오 또는 `@DataJpaTest` + `@Sql`).

### Pitfall 8: 리스너에서 `audit_log` 중복 INSERT (PITFALLS #3, NFR-03)

**What goes wrong:** "일관성 위해" 리스너가 `auditLogService.log(APPROVE, ...)` 추가 호출 → `ApprovalService.approve()` 의 sync log 와 합쳐 COUNT=2.
**Why it happens:** 이벤트 이름 `ApprovalNotificationEvent` 에서 "상태 변화 이벤트" 로 해석하고 logging 까지 hook 하려는 유혹.
**How to avoid:** CLAUDE.md Conventions 섹션에 룰 명시 ("`audit_log` writes live in services only, never in listeners"). `ApprovalServiceAuditTest` 로 각 action 후 `SELECT COUNT(*) FROM audit_log WHERE action=? AND target_id=?` = 1 자동 검증. `AuditLogGapTest` 의 `SpringBootTest + MockMvc + JdbcTemplate` 패턴을 복제.

## Code Examples

### §1. `ApprovalEmailSender.send()` + PENDING-first + @Retryable

```java
// backend/src/main/java/com/micesign/service/ApprovalEmailSender.java
// Source: adapted from RegistrationEmailService.java + RealBudgetApiClient.java + CONTEXT D-A/D-B
package com.micesign.service;

import com.micesign.domain.Document;
import com.micesign.domain.NotificationLog;
import com.micesign.domain.User;
import com.micesign.domain.enums.NotificationEventType;
import com.micesign.domain.enums.NotificationStatus;
import com.micesign.repository.NotificationLogRepository;
import jakarta.mail.internet.MimeMessage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Lazy;
import org.springframework.mail.MailException;
import org.springframework.mail.MailAuthenticationException;
import org.springframework.mail.MailParseException;
import org.springframework.mail.MailSendException;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.retry.annotation.Backoff;
import org.springframework.retry.annotation.Recover;
import org.springframework.retry.annotation.Retryable;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.thymeleaf.context.Context;
import org.thymeleaf.spring6.SpringTemplateEngine;

import java.time.LocalDateTime;

@Component
public class ApprovalEmailSender {
    private static final Logger log = LoggerFactory.getLogger(ApprovalEmailSender.class);
    private static final int ERROR_MESSAGE_MAX = 255;

    private final JavaMailSender mailSender;         // null-safe (D-D7)
    private final SpringTemplateEngine templateEngine;
    private final NotificationLogRepository notificationLogRepository;
    private final ApprovalEmailSender self;          // @Lazy self-injection for REQUIRES_NEW proxy

    @Value("${app.base-url:http://localhost:5173}")
    private String baseUrl;

    @Value("${spring.mail.username:noreply@micesign.com}")
    private String fromAddress;

    public ApprovalEmailSender(
            @Autowired(required = false) JavaMailSender mailSender,
            SpringTemplateEngine templateEngine,
            NotificationLogRepository notificationLogRepository,
            @Lazy ApprovalEmailSender self) {
        this.mailSender = mailSender;
        this.templateEngine = templateEngine;
        this.notificationLogRepository = notificationLogRepository;
        this.self = self;
    }

    @Retryable(
            retryFor = { MailSendException.class },
            noRetryFor = { MailAuthenticationException.class, MailParseException.class },
            maxAttempts = 3,
            backoff = @Backoff(delay = 300_000L)   // 5 minutes, D-B2
    )
    public void send(Document doc, User recipient, NotificationEventType eventType) {
        // Step 1: PENDING insert or lookup existing (UNIQUE constraint handles replay)
        NotificationLog notifLog = self.findOrCreatePendingLog(doc, recipient, eventType);

        // Mark RETRY before attempting (runs on 2nd/3rd attempt because @Retryable re-calls this method)
        if (notifLog.getStatus() == NotificationStatus.PENDING
                || notifLog.getStatus() == NotificationStatus.RETRY) {
            // do nothing on first call; increment only if this is actually a retry
        }

        if (mailSender == null) {
            log.info("[EMAIL STUB] To: {}, Subject: {}", recipient.getEmail(), notifLog.getSubject());
            notifLog.setStatus(NotificationStatus.SUCCESS);
            notifLog.setSentAt(LocalDateTime.now());
            self.persistLog(notifLog);
            return;
        }

        try {
            String templateName = "email/approval-" + toTemplateSlug(eventType);  // submit/approve/final-approve/reject/withdraw
            Context ctx = buildContext(doc, recipient, eventType);
            String html = templateEngine.process(templateName, ctx);

            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");  // ← UTF-8 강제
            helper.setFrom("MiceSign <" + fromAddress + ">");
            helper.setTo(recipient.getEmail());
            helper.setSubject(notifLog.getSubject());
            helper.setText(html, true);

            mailSender.send(message);

            // Success — update existing row
            notifLog.setStatus(NotificationStatus.SUCCESS);
            notifLog.setSentAt(LocalDateTime.now());
            self.persistLog(notifLog);
        } catch (MailSendException e) {
            // Transient: @Retryable will re-enter
            notifLog.setStatus(NotificationStatus.RETRY);
            notifLog.setRetryCount(notifLog.getRetryCount() + 1);
            self.persistLog(notifLog);
            throw e;
        } catch (MailAuthenticationException | MailParseException e) {
            // Permanent: no retry (noRetryFor), go directly to FAILED
            notifLog.setStatus(NotificationStatus.FAILED);
            notifLog.setErrorMessage(truncate(e.getClass().getSimpleName() + ": " + e.getMessage()));
            self.persistLog(notifLog);
            log.error("Permanent mail failure (no retry): to={}, error={}",
                    recipient.getEmail(), e.getMessage());
            // Do NOT rethrow — recovery is done inline
        } catch (jakarta.mail.MessagingException e) {
            // Should not happen because helper.* methods wrap into MailException,
            // but handle defensively.
            notifLog.setStatus(NotificationStatus.FAILED);
            notifLog.setErrorMessage(truncate("MessagingException: " + e.getMessage()));
            self.persistLog(notifLog);
            log.error("Unexpected messaging failure: to={}, error={}",
                    recipient.getEmail(), e.getMessage());
        }
    }

    @Recover
    public void recover(MailException e, Document doc, User recipient, NotificationEventType eventType) {
        // Called after maxAttempts=3 exhausted with MailSendException
        NotificationLog notifLog = self.findOrCreatePendingLog(doc, recipient, eventType);
        notifLog.setStatus(NotificationStatus.FAILED);
        notifLog.setErrorMessage(truncate(e.getClass().getSimpleName() + ": " + e.getMessage()));
        self.persistLog(notifLog);
        log.error("Approval email failed after {} retries: to={}, docId={}, event={}, error={}",
                3, recipient.getEmail(), doc.getId(), eventType, e.getMessage());
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)    // D-A6
    public NotificationLog persistLog(NotificationLog log) {
        return notificationLogRepository.save(log);
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public NotificationLog findOrCreatePendingLog(Document doc, User recipient, NotificationEventType type) {
        // repository lookup by (document_id, event_type, recipient_id); if absent build new PENDING
        return notificationLogRepository
                .findByDocumentIdAndEventTypeAndRecipientId(doc.getId(), type.name(), recipient.getId())
                .orElseGet(() -> {
                    NotificationLog fresh = new NotificationLog();
                    fresh.setRecipient(recipient);
                    fresh.setRecipientEmail(recipient.getEmail());   // D-A8 snapshot
                    fresh.setDocumentId(doc.getId());
                    fresh.setEventType(type.name());
                    fresh.setSubject(buildSubject(doc, type));
                    fresh.setStatus(NotificationStatus.PENDING);
                    return notificationLogRepository.save(fresh);
                });
    }

    private String buildSubject(Document doc, NotificationEventType type) {
        String actionLabel = switch (type) {
            case SUBMIT -> "결재 요청";
            case APPROVE -> "승인";
            case FINAL_APPROVE -> "최종 승인";
            case REJECT -> "반려";
            case WITHDRAW -> "회수";
        };
        String docNo = doc.getDocNumber() != null ? doc.getDocNumber() : "DRAFT";
        return "[MiceSign] " + actionLabel + ": " + docNo + " " + doc.getTitle();
    }

    private Context buildContext(Document doc, User recipient, NotificationEventType type) {
        Context ctx = new Context();
        ctx.setVariable("doc", doc);
        ctx.setVariable("docNumber", doc.getDocNumber());
        ctx.setVariable("docTitle", doc.getTitle());
        ctx.setVariable("drafterName", doc.getDrafter().getName());
        ctx.setVariable("drafterDepartment", doc.getDrafter().getDepartment().getName());
        ctx.setVariable("recipientName", recipient.getName());
        ctx.setVariable("actionLabel", buildSubject(doc, type).substring(11).split(":")[0].trim()); // or extract from buildSubject
        ctx.setVariable("eventTime", LocalDateTime.now());
        ctx.setVariable("approvalUrl", baseUrl + "/documents/" + doc.getId());
        // REJECT 본문의 comment — D-C6
        if (type == NotificationEventType.REJECT) {
            doc.getApprovalLines().stream()
                    .filter(l -> l.getStatus() == com.micesign.domain.enums.ApprovalLineStatus.REJECTED)
                    .findFirst()
                    .ifPresent(l -> ctx.setVariable("rejectComment", l.getComment()));
        }
        return ctx;
    }

    private String toTemplateSlug(NotificationEventType type) {
        return switch (type) {
            case SUBMIT -> "submit";
            case APPROVE -> "approve";
            case FINAL_APPROVE -> "final-approve";
            case REJECT -> "reject";
            case WITHDRAW -> "withdraw";
        };
    }

    private String truncate(String s) {
        if (s == null) return null;
        return s.length() > ERROR_MESSAGE_MAX ? s.substring(0, ERROR_MESSAGE_MAX) : s;
    }
}
```

> **참고:** 위 코드는 planner 를 위한 구조적 스켈레톤이며, `NotificationLogRepository.findByDocumentIdAndEventTypeAndRecipientId` 메서드는 신규 추가 필요 (Spring Data JPA derived query 1줄). 정확한 필드명/시그니처는 planner 가 최종 결정.

### §2. `EmailService` 수정 — stub 제거 + ApprovalEmailSender 위임

```java
// EmailService.java — 교체 후 뼈대
// Source: adapted from existing EmailService.java + CONTEXT D-A7 (.distinct()) + D-C2 (REFERENCE 필터 유지)
@TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
@Async
public void sendNotification(ApprovalNotificationEvent event) {
    try {
        Document doc = documentRepository.findByIdWithDrafter(event.getDocumentId()).orElse(null);
        if (doc == null) { log.warn("Doc not found: {}", event.getDocumentId()); return; }

        NotificationEventType type = NotificationEventType.valueOf(event.getEventType());
        List<User> recipients = determineRecipients(doc, type);

        if (recipients.isEmpty()) {
            log.debug("No recipients: docId={}, event={}", doc.getId(), type);
            return;
        }

        for (User recipient : recipients) {
            approvalEmailSender.send(doc, recipient, type);  // 별도 빈 호출 — 프록시 체인 OK
        }
    } catch (Exception e) {
        log.error("Failed notification: docId={}, event={}, error={}",
                event.getDocumentId(), event.getEventType(), e.getMessage(), e);
    }
}

private List<User> determineRecipients(Document doc, NotificationEventType type) {
    List<ApprovalLine> lines = approvalLineRepository.findByDocumentIdOrderByStepOrderAsc(doc.getId());

    Stream<User> baseStream = switch (type) {
        case SUBMIT, APPROVE -> lines.stream()
                .filter(l -> l.getStepOrder().equals(doc.getCurrentStep()))
                .filter(l -> l.getLineType() != ApprovalLineType.REFERENCE)   // D-C2
                .map(ApprovalLine::getApprover);
        case FINAL_APPROVE, REJECT -> Stream.of(doc.getDrafter());
        case WITHDRAW -> lines.stream().map(ApprovalLine::getApprover);       // 전원 (REFERENCE 포함)
    };

    return baseStream
            .filter(u -> u != null && u.getStatus() == UserStatus.ACTIVE)      // NOTIF-04
            .collect(Collectors.toMap(User::getId, Function.identity(), (a, b) -> a, LinkedHashMap::new))
            .values().stream().toList();                                        // distinct by id, preserve order — D-A7
}
```

### §3. V19 Flyway migration

```sql
-- backend/src/main/resources/db/migration/V19__add_notification_log_unique.sql
-- CONTEXT D-A2/D-A3/D-A4: add UNIQUE(document_id, event_type, recipient_id)
-- document_id NULL rows (registration emails) are excluded by MariaDB NULL semantics
-- (NULL ≠ NULL in UNIQUE index → multiple rows with NULL document_id are allowed)

ALTER TABLE notification_log
    ADD CONSTRAINT uk_notification_dedup
    UNIQUE (document_id, event_type, recipient_id);

-- Test migration mirror:
-- backend/src/test/resources/db/testmigration/V9__add_notification_log_unique.sql (동일 DDL)
-- Test V-번호는 V8 이후 다음 번호 — planner 는 test/resources/db/testmigration/ 을 재확인.
```

**Pre-migration sanity check (operator runs once manually):**
```sql
SELECT document_id, event_type, recipient_id, COUNT(*) AS cnt
FROM notification_log
WHERE document_id IS NOT NULL
GROUP BY document_id, event_type, recipient_id
HAVING COUNT(*) > 1;
```
결과가 0 rows 여야 migration 성공. 현 stub 은 매 이벤트마다 INSERT 하지만 document_id+event_type+recipient_id 조합 중복은 구조적으로 발생 어려움 (이벤트 발행은 하나의 커밋당 1회). 중복 있으면 수동 cleanup 후 migration.

### §4. Thymeleaf layout fragment + 이벤트 템플릿

```html
<!-- templates/email/layouts/approval-base.html — 공통 레이아웃 -->
<!-- Source: Thymeleaf 3.1 fragment syntax [CITED: /thymeleaf/thymeleaf-docs] -->
<!DOCTYPE html>
<html xmlns:th="http://www.thymeleaf.org" th:fragment="layout (body)">
<head>
    <meta charset="UTF-8"/>
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8"/>
    <title th:text="${docTitle}">제목</title>
</head>
<body style="margin:0; padding:0; font-family:'Malgun Gothic','Apple SD Gothic Neo',sans-serif; background-color:#f5f5f5;">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px; margin:20px auto; background-color:#ffffff; border-radius:8px; overflow:hidden;">
    <tr>
        <td style="background-color:#2563eb; padding:24px 32px;">
            <h1 style="color:#ffffff; margin:0; font-size:20px;">MiceSign</h1>
        </td>
    </tr>
    <tr>
        <td style="padding:32px;">
            <!-- 이벤트별 body fragment 삽입 지점 -->
            <div th:replace="${body}">BODY PLACEHOLDER</div>

            <!-- 공통 CTA 버튼 — D-C4 -->
            <p style="margin:24px 0 0 0;">
                <a th:href="${approvalUrl}"
                   style="display:inline-block; background-color:#2563eb; color:#ffffff; padding:12px 24px; border-radius:6px; text-decoration:none; font-weight:600;"
                   href="#">문서 바로가기</a>
            </p>
        </td>
    </tr>
    <tr>
        <td style="padding:16px 32px; background-color:#f8fafc; border-top:1px solid #e2e8f0;">
            <p style="color:#94a3b8; font-size:12px; margin:0; text-align:center;">
                이 알림은 MiceSign 시스템에서 자동 발송되었습니다.
            </p>
        </td>
    </tr>
</table>
</body>
</html>
```

```html
<!-- templates/email/approval-submit.html — 상신 알림 -->
<!-- Source: Thymeleaf 3.1 th:replace with ~{...} fragment expression -->
<!DOCTYPE html>
<html xmlns:th="http://www.thymeleaf.org"
      th:replace="~{layouts/approval-base :: layout(~{::body/*})}">
<body>
    <h2 style="color:#1e293b; margin:0 0 16px 0; font-size:18px;">새 결재 요청이 도착했습니다</h2>
    <p style="color:#334155; line-height:1.6;">
        <span th:text="${recipientName}">승인자</span>님, 아래 문서의 결재를 요청합니다.
    </p>
    <table style="background-color:#f8fafc; border-radius:6px; padding:16px; width:100%; margin:16px 0;">
        <tr>
            <td style="padding:8px 16px; color:#64748b; font-size:14px;">문서번호</td>
            <td style="padding:8px 16px; color:#1e293b; font-size:14px;" th:text="${docNumber}">GEN-2026-0001</td>
        </tr>
        <tr>
            <td style="padding:8px 16px; color:#64748b; font-size:14px;">제목</td>
            <td style="padding:8px 16px; color:#1e293b; font-size:14px;" th:text="${docTitle}">문서 제목</td>
        </tr>
        <tr>
            <td style="padding:8px 16px; color:#64748b; font-size:14px;">기안자</td>
            <td style="padding:8px 16px; color:#1e293b; font-size:14px;">
                <span th:text="${drafterDepartment}">영업부</span> <span th:text="${drafterName}">김기안</span>
            </td>
        </tr>
        <tr>
            <td style="padding:8px 16px; color:#64748b; font-size:14px;">상신일시</td>
            <td style="padding:8px 16px; color:#1e293b; font-size:14px;" th:text="${#temporals.format(eventTime, 'yyyy-MM-dd HH:mm')}">2026-04-23 10:00</td>
        </tr>
    </table>
</body>
</html>
```

**Fragment expression syntax — Thymeleaf 3.1 verified:**
- `th:replace="~{fragment_template :: selector}"` — 3.1 부터 `~{...}` 으로 wrap 권장 (deprecated unwrapped form 은 경고) [CITED: /thymeleaf/thymeleaf-docs "Thymeleaf Fragment Expressions: Updated Syntax"]
- `~{::body/*}` — 현재 템플릿의 `<body>` 내 모든 children 을 파라미터로 전달 (`~{::body}` 는 body 태그 자체 포함)
- Layout 측 `th:fragment="layout (body)"` 에서 `${body}` 변수로 수신 후 `th:replace="${body}"` 로 slot 삽입
- Resolver 경로: Spring Boot 자동 설정에서 `classpath:/templates/*.html` → `templateEngine.process("email/approval-submit", ctx)` 또는 `"email/approval-submit.html"` 둘 다 동작 (suffix 자동 붙음)
- CJK: `<meta charset="UTF-8">` + 폰트 스택만 있으면 Thymeleaf SpringTemplateEngine 이 UTF-8 으로 render. `MimeMessageHelper` UTF-8 과 합해져 한글 body 정상

REMAINDER 4 템플릿(approve/final-approve/reject/withdraw) 도 동일 구조 — body 섹션만 이벤트별로 다름 (reject 는 `th:text="${rejectComment}"` 블록 추가, final-approve 는 "승인 완료" 메시지 등).

### §5. RETIRED/INACTIVE filter + `.distinct()`

위 §2 `determineRecipients()` 코드 참조. 핵심 라인:

```java
.filter(u -> u != null && u.getStatus() == UserStatus.ACTIVE)         // NOTIF-04
.collect(Collectors.toMap(User::getId, Function.identity(), (a, b) -> a, LinkedHashMap::new))
.values().stream().toList();                                           // distinct by User.id (D-A7)
```

**Why not `.distinct()` 직접?** `User.equals()/hashCode()` 가 `@Id` 기반이 아닌 경우(JPA entity 는 기본 `Object.equals`) stream `.distinct()` 가 동작 안 함. `Collectors.toMap` 으로 id 기반 dedup 안전. [ASSUMED]

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `javax.mail.*` (Jakarta EE 8) | `jakarta.mail.*` (Jakarta EE 10) | Spring Boot 3.0 (2022-11) | GreenMail 1.x 와 비호환 — 2.x 필수 |
| Thymeleaf fragment `th:replace="tmpl :: frag"` | `th:replace="~{tmpl :: frag}"` (`~{...}` wrap) | Thymeleaf 3.1 | unwrapped 는 deprecated, 경고 출력 |
| GreenMail 1.6.x | GreenMail 2.1.x | ~2022 | Jakarta Mail 2 API, Java 17 지원, `findReceivedMessages` API (2.1.0+) |
| MailHog (active ~2016-2022) | Mailpit (maintained) | 2022+ | 동등 기능, 더 작은 바이너리, 지속 메인터넌스 |
| Hand-rolled retry | `@Retryable` + `@Recover` (Spring Retry) | Spring Retry 1.x~2.x | AOP 기반, 선언적, 이미 classpath |

**Deprecated / outdated:**
- **GreenMail 1.6.x** (CONTEXT 명시): `javax.mail` namespace → Spring Boot 3 와 충돌. **2.1.x 로 상향 필수** (Assumptions Log A1).
- Thymeleaf unwrapped fragment expression (`"tmpl :: frag"` 에서 `~{}` 없는 형태): 3.1 에서 deprecated, 3.2 에서 제거 예정.
- `javax.mail.MessagingException` import: Boot 3 에서는 `jakarta.mail.MessagingException`.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | CONTEXT D-D3 의 "GreenMail 1.6.x" 는 Spring Boot 3 와 비호환 (javax.mail 시절). 2.1.x 로 상향 필수. | Standard Stack §Supporting, State of the Art | 1.6.x 사용 시 컴파일/런타임 `ClassNotFoundException: javax.mail.*` — 테스트 자체 기동 불가. 이 연구는 User Constraints §Claude's Discretion 에 "GreenMail 버전 고정" 이 명시된 것을 근거로 1.6.x → 2.1.x 상향을 researcher 권고로 격상. CONTEXT 저자에게 재확인 필요 — discuss-phase 또는 planner 가 착수 전 user 컨펌. |
| A2 | GreenMail 2.1.x 의 정확한 최신 패치 버전 (2.1.8 또는 그 이상) | Standard Stack §Installation | WebSearch 는 2.1.8 (2024 릴리스) 을 언급했고 2026-04 시점 추가 패치 가능성 있음. Planner 는 착수 시 mvnrepository 에서 latest 확인 후 pinning. 실패 시 build 깨짐 수준. |
| A3 | `User.equals()/hashCode()` 는 id 기반으로 override 되지 않았을 가능성 → `.distinct()` 대신 `Collectors.toMap(User::getId, ...)` 사용 필요 | Code Examples §5 | `.distinct()` 가 조용히 동작 안 해서 WITHDRAW 에서 중복 수신 발생. 확인 방법: `grep -n "@Override.*equals\|hashCode" domain/User.java`. Planner 가 확인 후 `.distinct()` 또는 `Collectors.toMap` 선택. |
| A4 | `NotificationLogRepository.findByDocumentIdAndEventTypeAndRecipientId` 신규 derived query 필요 (PENDING log 찾기 위해) | Code Examples §1 | 기존 repository 에 없으면 planner 가 1줄 추가. Spring Data JPA 가 자동 구현. |
| A5 | MariaDB 10.11 `UNIQUE` 제약에서 `NULL` 값은 중복 허용 (표준 SQL 의 "NULL distinct" 동작) — `registration_request_id` 를 쓰는 행의 `document_id IS NULL` 은 제약 위반하지 않음 | Runtime State Inventory | MariaDB 문서 기반으로 정확하지만 [CITED: mariadb.com/kb/en/create-table/#unique] migration 직전 sanity query 로 실측 확인 권장. 실패 시 migration 실패 + rollback. |
| A6 | `@Lazy` self-injection 패턴이 Spring Boot 3.5 에서도 정상 작동 (`@Transactional(REQUIRES_NEW)` 의 프록시 경계 확보) | Common Pitfalls #4 | Spring 공식 권장 패턴이지만 일부 Kotlin/Native 환경에서 이슈 보고 있음 (이 프로젝트는 Java → 영향 없음). Fallback: `TransactionTemplate` 프로그래매틱. |
| A7 | `ApprovalServiceAuditTest` 는 현재 없음 — `AuditLogGapTest` 패턴 복제 | Validation Architecture, Common Pitfalls #8 | grep 확인: `find test -name "ApprovalServiceAuditTest*"` = no match. 신규 작성 필요. |

**If this table is empty:** 해당 없음 — 7건의 assumption 이 있음. A1 은 CONTEXT 내 직접 모순으로 user 재확인이 가장 중요.

## Open Questions

1. **CONTEXT D-D3 "GreenMail 1.6.x" 는 오기입인가 실제 의도인가?**
   - What we know: 1.6.x 는 javax.mail 시절로 Spring Boot 3 와 비호환. 2.x 만 Jakarta Mail 2 를 지원.
   - What's unclear: CONTEXT 작성 시 버전 실측이 없었던 것으로 추정 — researcher 권고로 2.1.x 상향 불가피하나 user 컨펌 필요.
   - Recommendation: **discuss-phase 또는 planner 착수 시 user 에게 2.1.x 상향 승인 요청**. 승인되면 기존 CONTEXT 에 subtle patch (버전만 업데이트). 거부되면 Phase 29 가 실질적으로 진행 불가 — 이 경우 에스컬레이션.

2. **`@Lazy` self-injection vs `TransactionTemplate`:**
   - What we know: `@Transactional(REQUIRES_NEW)` 는 AOP 프록시가 필요; same-class self-invocation 우회. Spring 공식 문서는 `@Lazy` self-injection 을 첫 번째 권장으로 제시.
   - What's unclear: 코드베이스의 다른 `REQUIRES_NEW` 사용처 (`BudgetIntegrationService`?) 가 어떤 방식을 사용했는지 확인 필요.
   - Recommendation: Planner 가 `grep -n "REQUIRES_NEW" backend/src/main/java` 로 조사 후 프로젝트 관례 일관성 유지.

3. **`ApprovalEmailSender.send()` `@Retryable` 재시도 간격 5분 이 실제 테스트에서 허용되는가?**
   - What we know: `@Backoff(delay = 300_000L)` = 5분. 통합 테스트에서 3회 재시도 = 10분 지연.
   - What's unclear: CI 환경에서 이 지연이 허용되는가? Spring Retry 는 테스트에서 delay override 방법 제공.
   - Recommendation: `ApprovalEmailSenderRetryTest` 에 `@TestConfiguration` 으로 `RetryTemplate` 또는 `SimpleRetryPolicy` 빈을 덮어쓰기 — delay=0 으로 빠르게 검증. CONTEXT 에는 "dummy 빠른 backoff" 언급 없으니 planner discretion.

4. **MailHog vs Mailpit 선택 (STATE.md Blocker):**
   - What we know: 기능 동등. Mailpit 이 더 최신·활성.
   - What's unclear: 개발자 머신에 이미 설치된 것.
   - Recommendation: Planner 가 README 에 "둘 중 하나 — 개발자 편의" 로 명시. 기본값은 Mailpit (더 최신).

5. **운영 SMTP 공급자 (STATE.md Blocker):**
   - What we know: 사내 릴레이 / Gmail Workspace / O365 / SES 옵션. env var 기반으로 agnostic.
   - What's unclear: 회사 IT 정책.
   - Recommendation: Phase 33 런북. Phase 29 는 agnostic 으로 완료 가능.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Java 17 | 빌드/런타임 | ✓ | toolchain 17 | — |
| Gradle 8.x | 빌드 | ✓ (build.gradle.kts 운영) | — | — |
| MariaDB 10.11 | Flyway V19 migration 대상 | ✓ (application.yml datasource 구성) | 10.11 | — |
| Spring Boot 3.5.13 | 전체 프레임워크 | ✓ | 3.5.13 | — |
| `spring-boot-starter-mail` | SMTP | ✓ | managed | — |
| `spring-boot-starter-thymeleaf` | HTML 템플릿 | ✓ | managed | — |
| `spring-retry` + `spring-boot-starter-aop` | `@Retryable`/`@Recover` | ✓ | managed | — |
| `@EnableRetry` (RetryConfig) | Spring Retry 활성화 | ✓ | — | — |
| `@EnableAsync` (AsyncConfig) | `@Async` | ✓ | — | — |
| `JavaMailSender` 빈 | SMTP 전송 | 조건부 — `MAIL_HOST` env 미설정 시 빈 생성 skip | — | stub 로깅 (`ApprovalEmailSender` null-safe, D-D7) |
| GreenMail 2.1.x (신규 test 의존) | 통합 테스트 | ✗ — 신규 추가 필요 | — | 없음 (통합 테스트 불가) |
| MailHog / Mailpit (수동 UAT) | 개발자 로컬 | ✗ — 개발자가 설치 | — | `MAIL_HOST=""` → stub log 확인 |
| 운영 SMTP 자격증명 | 운영 배포 | ✗ — Phase 33 | — | Phase 29 는 env var agnostic 으로 완결 |
| `APP_BASE_URL` (운영 env var) | 이메일 링크 | ✗ — 배포 팀 협의 | — | `BaseUrlGuard` 가 배포 시 fail-fast |

**Missing dependencies with no fallback:**
- GreenMail 2.1.x 는 Phase 29 의 자동 통합 검증 필수 조건. 추가하지 않으면 D-D6 CI 게이트 (GreenMail 수신자 규칙 테스트) 자체가 작성 불가.

**Missing dependencies with fallback:**
- 운영 SMTP / `APP_BASE_URL` 은 Phase 33 런북으로 이관. Phase 29 내부 개발·테스트는 `MAIL_HOST=""` (stub) 또는 MailHog/Mailpit 로 충분.

## Validation Architecture

> `workflow.nyquist_validation: true` (config.json 확인). 이 섹션은 VALIDATION.md 생성을 위한 구체 스펙을 제공한다.

### Test Framework

| Property | Value |
|----------|-------|
| Framework | JUnit 5 (Jupiter) via `spring-boot-starter-test` — 기존. H2 in-memory via `test/resources/application-test.yml`. |
| Config files | `backend/src/test/resources/application-test.yml` (수정 — `spring.mail.*` block 추가), `backend/src/test/resources/db/testmigration/V{next}__add_notification_log_unique.sql` (신규) |
| Quick run command | `./gradlew test --tests 'com.micesign.notification.*' --tests 'com.micesign.document.ApprovalServiceAuditTest'` |
| Full suite command | `./gradlew test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| NOTIF-01 | 5종 이벤트 각각 1통씩 발송 + GreenMail 수신 검증 | integration | `./gradlew test --tests 'com.micesign.notification.ApprovalNotificationIntegrationTest.send*'` | ✗ Wave 0 |
| NOTIF-02 | 이메일 body 에 `{baseUrl}/documents/{id}` 절대 URL 포함 | integration | `./gradlew test --tests 'com.micesign.notification.ApprovalNotificationIntegrationTest.body*Url*'` | ✗ Wave 0 |
| NOTIF-03 | `@Retryable(maxAttempts=3)` 경로 — mockMailSender throws MailSendException 3회 → @Recover → status=FAILED | integration | `./gradlew test --tests 'com.micesign.notification.ApprovalEmailSenderRetryTest'` | ✗ Wave 0 |
| NOTIF-03 | `noRetryFor=MailAuthenticationException` — 1회 호출 후 즉시 FAILED | integration | 동일 `ApprovalEmailSenderRetryTest.authFailure*` | ✗ Wave 0 |
| NOTIF-04 | RETIRED/INACTIVE 수신자 스킵 | integration | `./gradlew test --tests 'com.micesign.notification.ApprovalNotificationIntegrationTest.skipInactive*'` | ✗ Wave 0 |
| NOTIF-05 | `[MiceSign]` 제목 prefix + 한글 subject UTF-8 decoded | integration | `./gradlew test --tests 'com.micesign.notification.ApprovalNotificationIntegrationTest.koreanSubject*'` | ✗ Wave 0 |
| NFR-02 | API 응답이 메일 발송 완료 전 반환 (`@Async` 커밋 후 dispatch) | integration (behavior) | 실측: `ApprovalControllerTest` 확장 — submit API 응답 latency < 100ms (GreenMail 은 별도 스레드에서 수신) | ✗ Wave 0 |
| NFR-03 | `audit_log COUNT=1 per action` — 리스너는 audit 를 추가 INSERT 안함 | integration | `./gradlew test --tests 'com.micesign.document.ApprovalServiceAuditTest'` | ✗ Wave 0 |
| D-A2 | UNIQUE(document_id, event_type, recipient_id) DB 제약 실제 존재 | integration | `./gradlew test --tests 'com.micesign.notification.ApprovalNotificationIntegrationTest.duplicateInsert*'` — 2차 insert 시 DataIntegrityViolationException | ✗ Wave 0 |

### Unit Layer

| Target | What to Mock | What to Assert |
|--------|--------------|----------------|
| `ApprovalEmailSender.send()` — stub path | `JavaMailSender = null` (constructor arg), mock `NotificationLogRepository` | `notifLog.status == SUCCESS`, no exception, no real SMTP |
| `ApprovalEmailSender.send()` — happy path | `@MockBean JavaMailSender`, real `SpringTemplateEngine`, mock repo | `mailSender.send()` called 1x, `persistLog` called 2x (PENDING + SUCCESS) |
| `ApprovalEmailSender.send()` — retry path | `@MockBean JavaMailSender doThrow(MailSendException).when(...).send(any())` | `mailSender.send()` called 3x (2 retries), `@Recover` invoked once, final status=FAILED |
| `ApprovalEmailSender.send()` — no-retry path | `doThrow(MailAuthenticationException)` | `mailSender.send()` called 1x, status=FAILED immediately |
| `EmailService.determineRecipients()` | None (pure logic) | 5 eventType 각각의 recipient list — REFERENCE 제외, ACTIVE 만, distinct by id |
| `EmailService.sendNotification()` — event routing | `@MockBean ApprovalEmailSender`, mock repos | `approvalEmailSender.send(...)` called N times where N = recipients.size() |

**Pattern:** `RegistrationEmailServiceTest` 와 동일 — `@ExtendWith(MockitoExtension.class) + @Mock + ArgumentCaptor<NotificationLog>`.

### Integration Layer

| Test Class | Annotations | Purpose |
|------------|------------|---------|
| `ApprovalNotificationIntegrationTest` | `@SpringBootTest` + `@ActiveProfiles("test")` + `@AutoConfigureMockMvc` + `@RegisterExtension static GreenMailExtension` | **핵심 E2E** — 각 이벤트 type 당 publishEvent → AFTER_COMMIT + @Async → GreenMail 수신 → subject/body/recipient 검증. D-A2 duplicate 제약 동시 검증. |
| `ApprovalEmailSenderRetryTest` | `@SpringBootTest` + `@ActiveProfiles("test")` + `@MockBean JavaMailSender` + `@TestConfiguration RetryTemplate` (delay=0) | `@Retryable`/`@Recover` path — 3회 호출 + status 전이 + retry_count 증분 검증 |
| `ApprovalServiceAuditTest` | `@SpringBootTest` + `@ActiveProfiles("test")` + `MockMvc` + `JdbcTemplate` | `AuditLogGapTest` 복제 패턴 — submit/approve/reject/withdraw 각 API 호출 후 `SELECT COUNT(*) FROM audit_log WHERE action=?` = 1 assertion |

**GreenMail test skeleton:**

```java
// Source: greenmail-mail-test/greenmail-example-spring-boot-3 + CONTEXT D-D5
@SpringBootTest
@ActiveProfiles("test")
class ApprovalNotificationIntegrationTest {
    @RegisterExtension
    static GreenMailExtension greenMail = new GreenMailExtension(ServerSetupTest.SMTP)
            .withPerMethodLifecycle(true);   // 테스트마다 inbox 리셋

    @Autowired ApplicationEventPublisher eventPublisher;
    @Autowired JdbcTemplate jdbcTemplate;
    @MockBean BudgetApiClient budgetApiClient;  // budget 간섭 차단

    @BeforeEach void setUp() { /* fixtures: document, users, approval_line */ }

    @Test
    void submit_eventDelivers_koreanSubject() throws Exception {
        // given: 결재선 + ACTIVE 수신자 1명
        // when
        eventPublisher.publishEvent(new ApprovalNotificationEvent(docId, "SUBMIT", actorId));

        // then: @Async 가 완료될 때까지 대기
        Awaitility.await().atMost(5, SECONDS).until(() -> greenMail.getReceivedMessages().length == 1);

        MimeMessage received = greenMail.getReceivedMessages()[0];
        assertThat(received.getSubject()).startsWith("[MiceSign] 결재 요청:");     // UTF-8 decode 자동 (GreenMail)
        assertThat(received.getSubject()).contains("휴가 신청서");               // 한글 subject 정상
        String body = GreenMailUtil.getBody(received);
        assertThat(body).contains("http://127.0.0.1:5173/documents/" + docId);
        // notification_log 검증
        Integer cnt = jdbcTemplate.queryForObject(
            "SELECT COUNT(*) FROM notification_log WHERE document_id=? AND event_type=? AND status='SUCCESS'",
            Integer.class, docId, "SUBMIT");
        assertThat(cnt).isEqualTo(1);
    }

    @Test
    void duplicate_insertsSameKey_throwsDataIntegrityViolation() {
        // Verify UNIQUE(document_id, event_type, recipient_id) enforced at DB
        // Insert direct + expect DataIntegrityViolationException
    }
}
```

**`application-test.yml` 추가 블록:**
```yaml
spring:
  mail:
    host: 127.0.0.1
    port: 3025            # GreenMail SMTP default
    username: test
    password: test
    properties:
      mail:
        smtp:
          auth: true
          starttls:
            enable: false  # GreenMail은 plain SMTP
        mime:
          charset: UTF-8
app:
  base-url: http://127.0.0.1:5173
```

**GreenMail dependency:**
```gradle
testImplementation("com.icegreen:greenmail-junit5:2.1.x")
```

### Contract Tests

| Contract | Test Assertion |
|----------|----------------|
| Subject regex | `^\[MiceSign\] (결재 요청\|승인\|최종 승인\|반려\|회수): \S+ .+$` — 제목 format fixed (D-C1) |
| Template variable set | `{docNumber, docTitle, drafterName, drafterDepartment, recipientName, actionLabel, eventTime, approvalUrl, (rejectComment for REJECT only)}` — 모든 템플릿이 정확히 이 변수 set 을 기대 (ThymeleafContext assertion) |
| `@Retryable` 경로 | `retryFor={MailSendException}`, `noRetryFor={MailAuthentication, MailParse}`, `maxAttempts=3`, `delay=300000ms` — `RetryConfig` bean existence 검증 (`BudgetRetryIntegrationTest.shouldHaveRetryConfigured` 패턴 복제) |
| `@Recover` 메서드 매칭 | Reflection 으로 `ApprovalEmailSender` 에 `@Recover` 어노테이션 메서드 존재 + 시그니처 `(MailException, Document, User, NotificationEventType) void` 검증 |
| Baseline URL guard | `@Profile("prod")` 로딩 시 `BaseUrlGuard` 가 존재. `SpringBootTest(properties="spring.profiles.active=prod", "app.base-url=http://localhost/")` 으로 기동 시도 → `ApplicationContextException` expected |

### Observability

| Invariant | Assertion Query |
|-----------|-----------------|
| PENDING 고아 없음 | `SELECT COUNT(*) FROM notification_log WHERE status='PENDING' AND created_at < NOW() - INTERVAL 10 MINUTE` = 0 (Phase 33 런북, 수동) |
| Action 당 audit_log 1건 | `SELECT action, target_id, COUNT(*) FROM audit_log WHERE target_type='DOCUMENT' GROUP BY 1,2 HAVING COUNT(*) > 1` = 0 rows |
| Duplicate SUCCESS 없음 | `SELECT document_id, event_type, recipient_id, COUNT(*) FROM notification_log WHERE document_id IS NOT NULL AND status='SUCCESS' GROUP BY 1,2,3 HAVING COUNT(*) > 1` = 0 |
| 재시도 카운트 연속성 | `SELECT retry_count FROM notification_log WHERE id=?` = 3 for FAILED rows that went through full retry path |
| 전체 status 전이 | `notification_log.status IN ('SUCCESS','FAILED')` for all rows where `created_at < NOW() - INTERVAL 15 MINUTE` (PENDING/RETRY 는 in-flight only) |

### Sampling Rate

- **Per task commit:** `./gradlew test --tests 'com.micesign.notification.*' --tests 'com.micesign.document.ApprovalServiceAuditTest'`
- **Per wave merge:** `./gradlew test` (full suite)
- **Phase gate:** Full suite green + GreenMail 수신자 규칙 + audit COUNT=1 테스트 통과 before `/gsd-verify-work`

### Wave 0 Gaps

- [ ] `backend/src/test/java/com/micesign/notification/ApprovalNotificationIntegrationTest.java` — covers NOTIF-01/02/04/05 + D-A2
- [ ] `backend/src/test/java/com/micesign/notification/ApprovalEmailSenderRetryTest.java` — covers NOTIF-03 retry/recover path
- [ ] `backend/src/test/java/com/micesign/document/ApprovalServiceAuditTest.java` — covers NFR-03 (AuditLogGapTest 패턴 복제)
- [ ] `backend/src/test/resources/application-test.yml` — add `spring.mail.*` block for GreenMail port binding
- [ ] `backend/src/test/resources/db/testmigration/V9__add_notification_log_unique.sql` — test DB mirror of V19
- [ ] Gradle install: `testImplementation("com.icegreen:greenmail-junit5:2.1.x")` in `build.gradle.kts`
- [ ] (Optional) `ApprovalEmailSenderUnitTest` — unit-level retry path with `@MockBean JavaMailSender` for fast CI feedback

## Project Constraints (from CLAUDE.md)

이 섹션은 planner 가 각 plan 에 반영해야 할 CLAUDE.md directive 를 집약한다.

- **언어:** 모든 답변/문서/커밋 메시지는 한국어. UI 텍스트/에러/도메인 용어는 FSD 한국어 컨벤션 준수.
- **Java 17 + Spring Boot 3.5.x + Gradle 8.x:** 신규 의존성은 `build.gradle.kts` 에만. Maven 사용 금지.
- **Jakarta EE namespaces:** `javax.mail.*` import 금지. 모두 `jakarta.mail.*`.
- **Lombok 사용 금지:** Java 17 records 또는 일반 POJO + getter/setter (기존 코드 관례).
- **Hibernate Envers 사용 금지:** 감사 로그는 `audit_log` 테이블 직접 기록 (동기, 서비스 레벨).
- **DB 문자셋:** utf8mb4 / utf8mb4_unicode_ci. MariaDB 10.11+.
- **Flyway 의무:** 모든 schema 변경은 migration 파일. V19 가 Phase 29 의 다음 번호. `ddl-auto: validate` 유지.
- **JWT 불변:** Access token 메모리 (Zustand), Refresh HttpOnly cookie — Phase 29 미수정.
- **이메일 링크에 토큰 금지:** `/documents/{id}` 상대 경로만. 프론트 라우터가 401 redirect 처리 (Pitfall 13).
- **작업 후 기존 기능/메뉴/라우트 손상 여부 반드시 확인** (user memory): `RegistrationEmailService` 회귀 테스트 필수, `/api/v1/*` 기존 엔드포인트 영향 없음 확인.
- **기본값 제공 안전 env var:** `${VAR_NAME:default}` 형식 유지. 하드코딩 금지.
- **GSD Workflow 강제:** Phase 29 외부의 직접 수정 금지. 모든 변경은 PLAN.md 경유.

## Sources

### Primary (HIGH confidence)

- **코드베이스 직접 분석** (2026-04-23, Read tool):
  - `backend/src/main/java/com/micesign/service/EmailService.java` — 현 stub 상태 (line 103 stub, 158-181 reversed order)
  - `backend/src/main/java/com/micesign/service/RegistrationEmailService.java` — 참조 구현 (line 44-67 null-safe, 150-187 sendEmail 패턴)
  - `backend/src/main/java/com/micesign/service/ApprovalService.java` — publishEvent 지점 (line 108-113 APPROVE/FINAL_APPROVE 분기, line 124/161)
  - `backend/src/main/java/com/micesign/service/DocumentService.java` — publishEvent 지점 (line 319 SUBMIT, line 377 WITHDRAW)
  - `backend/src/main/java/com/micesign/config/AsyncConfig.java` — 스레드 풀 (변경 없음)
  - `backend/src/main/java/com/micesign/config/RetryConfig.java` — `@EnableRetry` 이미 존재
  - `backend/src/main/java/com/micesign/budget/RealBudgetApiClient.java` — `@Retryable`/`@Recover` 선례 (line 36-58, 61-83)
  - `backend/src/main/java/com/micesign/domain/NotificationLog.java` — 엔티티 (컬럼 완비, `@UniqueConstraint` 추가 여지)
  - `backend/src/main/java/com/micesign/event/ApprovalNotificationEvent.java` — POJO 이벤트 (변경 금지)
  - `backend/src/main/resources/templates/email/registration-submit.html` — 스타일 레퍼런스
  - `backend/src/main/resources/application.yml` — `spring.mail.*` env var 주입 (line 25-36), `app.base-url` default (line 44)
  - `backend/src/main/resources/application-prod.yml` — `app.base-url` override 부재 (D-D2 작업 대상)
  - `backend/src/main/resources/db/migration/V1__..V18__*.sql` — V19 가 다음 번호
  - `backend/src/main/resources/db/migration/V6__add_pending_notification_status.sql` — PENDING enum 확장 이미 완료
  - `backend/src/test/java/com/micesign/admin/AuditLogGapTest.java` — `ApprovalServiceAuditTest` 템플릿 패턴
  - `backend/src/test/java/com/micesign/registration/RegistrationEmailServiceTest.java` — 유닛 테스트 복제 패턴
  - `backend/src/test/java/com/micesign/budget/BudgetRetryIntegrationTest.java` — `@EnableRetry` 어서트 패턴
  - `backend/src/test/resources/application-test.yml` — H2 + `management.health.mail.enabled=false`
  - `backend/build.gradle.kts` — 모든 필요 의존성 존재 (line 26-27, 61-62)
- **Context7 Spring Retry** (`/spring-projects/spring-retry`) — `@Retryable`, `@Recover` 시그니처 규칙, `retryFor`/`noRetryFor`/`notRecoverable` 용법
- **Context7 Thymeleaf** (`/thymeleaf/thymeleaf-docs`) — fragment expression `~{...}` 구문, `th:replace` vs `th:insert`, `th:fragment` with parameters
- **Context7 Spring Framework 6.2** (`/websites/spring_io_spring-framework_reference_6_2`) — `ApplicationListener` 인터페이스, `@EventListener`
- **Context7 GreenMail** (`/websites/greenmail-mail-test_github_io_greenmail`) — JUnit 4/5 extension, ServerSetupTest.SMTP, `findReceivedMessages` (2.1.0+)
- **프로젝트 스펙:**
  - `docs/FSD_MiceSign_v1.0.md` §5.3/§11 — 알림 이벤트 규칙, "2회 재시도 5분 간격"
  - `.planning/REQUIREMENTS.md` — NOTIF-01~05, NFR-02, NFR-03
  - `.planning/ROADMAP.md` — Phase 29 Success Criteria
  - `.planning/STATE.md` — Blockers (SMTP 공급자, app.base-url, MailHog/Mailpit)
  - `.planning/phases/29-smtp-retrofit/29-CONTEXT.md` — 30+ locked decisions (A/B/C/D)
  - `.planning/research/SUMMARY.md` / `STACK.md` / `ARCHITECTURE.md` / `PITFALLS.md` / `FEATURES.md` — v1.2 upstream research

### Secondary (MEDIUM confidence)

- [Spring Boot 3.5 IO/Email](https://docs.spring.io/spring-boot/reference/io/email.html) — `JavaMailSender` 자동구성, UTF-8 handling
- [Thymeleaf Spring email tutorial](https://www.thymeleaf.org/doc/articles/springmail.html) — `SpringTemplateEngine` + `Context` + `MimeMessageHelper`
- [Spring Framework Transaction-bound Events](https://docs.spring.io/spring-framework/reference/data-access/transaction/event.html) — AFTER_COMMIT semantics
- [Spring GitHub #35395](https://github.com/spring-projects/spring-framework/issues/35395) — nested `@TransactionalEventListener` trap
- [GreenMail JUnit 5 Spring Boot 3 example](https://github.com/greenmail-mail-test/greenmail-example-spring-boot-3) — 2.x 필수, Jakarta Activation exclude
- [Rieckpil — GreenMail for Spring Mail JUnit 5](https://rieckpil.de/use-greenmail-for-spring-mail-javamailsender-junit-5-integration-tests/) — `@RegisterExtension static`, port 3025, assertion API
- [Spring Boot ApplicationReadyEvent](https://docs.spring.io/spring-boot/reference/features/spring-application.html) — startup event hook
- [Maven Central greenmail-junit5 versions](https://mvnrepository.com/artifact/com.icegreen/greenmail-junit5) — 2.1.8 stable (2024-11)

### Tertiary (LOW confidence)

- [Nidhal Naffati — async retry Spring email](https://nidhalnaffati.netlify.app/blog/spring-async-retry/) — backoff 개념
- [Baeldung Spring email templates](https://www.baeldung.com/spring-email-templates) — 보조 예제
- [Mailpit docs](https://mailpit.axllent.org/) — MailHog 대체제

## Metadata

**Confidence breakdown:**
- Standard Stack: HIGH — 코드베이스 직접 확인 + Context7 verified (GreenMail 버전은 Assumptions Log A1/A2 참조)
- Architecture Patterns: HIGH — `RegistrationEmailService`+`RealBudgetApiClient` 선례 + PITFALLS.md verified 함정 25개 교차 검증
- Code Examples §1 (ApprovalEmailSender): MEDIUM — 구조적 skeleton 제공, planner 가 repository 메서드 시그니처/self-injection 세부 확정 필요
- Thymeleaf fragment §4: HIGH — Context7 3.1 docs verified
- V19 migration §3: HIGH — MariaDB `ALTER TABLE ADD UNIQUE` 표준 DDL, NULL handling verified
- `@Profile("prod") BaseUrlGuard` §Pitfall 5: MEDIUM — Spring Boot 공식 pattern, 구체 구현은 planner discretion
- Validation Architecture: HIGH — 기존 `AuditLogGapTest`/`RegistrationEmailServiceTest`/`BudgetRetryIntegrationTest` 패턴 재활용

**Research date:** 2026-04-23
**Valid until:** 2026-05-23 (30일 — 주로 Spring/Thymeleaf 3.1 stable LTS 기반이므로 긴 유효기간. GreenMail minor version 은 planner 가 착수 시 재확인)

---
*Phase: 29-smtp-retrofit*
*Researcher: gsd-researcher*
*Consumer: gsd-planner — produces PLAN.md files sequenced by Phase 29 wave structure*

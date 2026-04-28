# Phase 29: SMTP 이메일 알림 인프라 (Retrofit) - Context

**Gathered:** 2026-04-23
**Status:** Ready for planning

<domain>
## Phase Boundary

이미 스캐폴딩된 SMTP 인프라(스텁 `EmailService`, `spring-boot-starter-mail`, thymeleaf, spring-retry, `@EnableAsync`, 5개 `publishEvent()` 호출 지점, `NotificationLog` 엔티티)를 **실제 JavaMailSender 발송으로 전환**하고, 결재 이벤트 5종(SUBMIT/APPROVE/FINAL_APPROVE/REJECT/WITHDRAW)에 대한 한글 HTML 이메일을 PENDING-first 로깅 + @Retryable 격리 + 5종 Thymeleaf 템플릿으로 완성한다.

**Retrofit 마일스톤** — 신규 백엔드 의존성 zero, 이벤트 아키텍처/트리거 지점 변경 없음.

**Requirements (locked via ROADMAP):** NOTIF-01, NOTIF-02, NOTIF-03, NOTIF-04, NOTIF-05, NFR-02, NFR-03

**Success Criteria (from ROADMAP):**
1. 기안자 상신 시 첫 번째 비-REFERENCE 승인자에게 `[MiceSign] 결재 요청: {docNumber} {title}` HTML 이메일 도착 (MailHog/GreenMail 검증)
2. 본문 "문서 바로가기" 버튼이 `{app.base-url}/documents/{id}`로 이동, UTF-8 한글 subject 깨지지 않음
3. SMTP 연결 실패·transient 에러 시 `@Retryable(maxAttempts=3, backoff=5min)` 재시도, 최종 실패 시 `notification_log.status = FAILED` + `error_message` 기록 (PENDING 고아 행 없음)
4. RETIRED/INACTIVE 수신자 자동 제외, 동일 (`document_id`, `event_type`, `recipient_id`) 조합 중복 SUCCESS 행 없음
5. 결재 API 응답은 메일 발송 결과와 독립적으로 즉시 반환 (`@Async` + `AFTER_COMMIT`), 리스너에서 `audit_log` 추가 INSERT 없이 `COUNT=1 per action` 통과

</domain>

<decisions>
## Implementation Decisions

### A. 로깅·Idempotency 패턴

- **D-A1:** notification_log 저장 순서는 **PENDING-first 3단계** — (1) PENDING insert → (2) `mailSender.send()` → (3) SUCCESS 또는 FAILED/RETRY로 UPDATE. 현재 `EmailService.sendToRecipient`의 send-first 로직 교체 필수 (Pitfall 17).
- **D-A2:** 중복 발송 방지는 **DB UNIQUE 제약**으로 강제 — V19 Flyway migration으로 `UNIQUE(document_id, event_type, recipient_id)` 추가. `registration_request_id`를 쓰는 행은 `document_id IS NULL`이므로 제약에서 자연히 배제됨.
- **D-A3:** UNIQUE 제약은 **엔티티 + Flyway 이중 선언** — `NotificationLog.java`의 `@Table(uniqueConstraints = @UniqueConstraint(columnNames = {"document_id", "event_type", "recipient_id"}))` 추가 + V19 migration. `ddl-auto=validate`에서 drift 검출.
- **D-A4:** V19 migration은 단순 `ALTER TABLE ADD UNIQUE` — 운영 중복 없음 가정(현재 스텁이라 구조적으로 중복 불가). 충돌 시 Flyway 실패로 즉시 탐지.
- **D-A5:** send 실패 시 예외 분류 규칙:
  - `MailSendException` (SMTP 연결/timeout) → **RETRY** 상태, `retry_count++`, @Retryable 재실행
  - `MailAuthenticationException` / `MailParseException` → 즉시 **FAILED**, 재시도 없음
- **D-A6:** NotificationLog save는 **save helper에 `@Transactional(propagation = REQUIRES_NEW)`** — 각 INSERT/UPDATE가 독립 커밋. send 실패에도 log row 유지. `ApprovalEmailSender` 내부 `persistLog()` helper에 부착.
- **D-A7:** WITHDRAW 수신자 목록은 `determineRecipients()`에서 **`.distinct()` by `User.id`** — 같은 사용자가 결재선 여러 step에 중복 등록된 경우 1통만 발송(Pitfall 24). DB UNIQUE가 2차 방어.
- **D-A8:** `recipient_email` 필드는 **발송 시점 User.email 스냅샷** — PENDING insert 시 `User.getEmail()` 값 기록. 이후 User.email 변경되어도 audit 목적 유지.
- **D-A9:** `retry_count`는 **각 재시도 직전 UPDATE** — Spring Retry의 `RetryContext.getRetryCount()` 기반. @Retryable이 재시도하기 전 기존 PENDING row를 `status=RETRY, retry_count+=1`로 UPDATE. 운영자가 실시간 in-flight 상황 조회 가능. 최종 실패 시 @Recover가 FAILED로 마감.
- **D-A10:** NotificationLog 스키마에 **actorId 필드 추가하지 않음** — actor 정보는 `audit_log`로 충분. 두 테이블의 책임을 분리 (Pitfall 3 원칙 유지).
- **D-A11:** stale PENDING 행 청소는 **방치 + 수동 운영** — 50명 규모에서 서버 재시작은 드물고 cron 도입은 과스펙. 10분 이상 PENDING은 수동 FAILED 전환 스크립트 문서화만 (Phase 33 런북).

### B. @Retryable 격리 아키텍처

- **D-B1:** **별도 `@Component ApprovalEmailSender`** 생성 (신규 빈) — @Retryable + @Recover 메서드를 여기 배치. `EmailService`(@TransactionalEventListener + @Async 리스너)는 수신자 결정·@Async dispatching만 담당. Spring 프록시 체인 보장으로 self-invocation 트랩(Pitfall 2) 회피.
- **D-B2:** `@Retryable(retryFor = MailSendException.class, noRetryFor = {MailAuthenticationException.class, MailParseException.class}, maxAttempts = 3, backoff = @Backoff(delay = 300000L))` — FSD 스펙 "2회 재시도 5분 간격"(= 초기 1 + retry 2 = 총 3 attempts) 그대로.
- **D-B3:** `@Recover` 핸들러 시그니처 = `recover(MailException e, NotificationLog log, Document doc, User recipient, NotificationEventType eventType)` — `log.setStatus(FAILED)`, `log.setErrorMessage(e.getClass().getSimpleName() + ": " + e.getMessage())` (255자 truncate), `persistLog(log)`, `log.error(...)` 한 줄.
- **D-B4:** `ApprovalEmailSender.send()` 메서드에는 **@Transactional 없음** — `persistLog()` helper에만 `REQUIRES_NEW` (D-A6). send 전체를 하나의 Tx로 묶으면 send 실패 시 PENDING 행까지 롤백되어 재시도 응답성 손실.
- **D-B5:** `ApprovalEmailSender.send()` 시그니처 = `send(Document doc, User recipient, NotificationEventType eventType)` — 고수준 도메인 객체만 받음. 내부에서 subject/template/Context 조립. `@Value("${app.base-url}")`는 `ApprovalEmailSender`에 주입(Pitfall 19 방지).
- **D-B6:** @Retryable 최종 실패 알림 방식 = **ERROR 로그 + notification_log.status=FAILED 기록만** — 운영자 push 알림 파이프라인은 Phase 33/1-C 범위. 50명 규모에서는 주기적 수동 조회(`SELECT COUNT(*) FROM notification_log WHERE status='FAILED' AND created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)`)로 충분.

### C. 이메일 UX (제목·템플릿)

- **D-C1:** 제목 포맷 = **`[MiceSign] {actionLabel}: {docNumber} {title}`** — 현재 `EmailService.sendNotification`의 포맷 유지. actionLabel은 getActionLabel()의 한글 매핑(SUBMIT="결재 요청", APPROVE="승인", FINAL_APPROVE="최종 승인", REJECT="반려", WITHDRAW="회수"). 모바일 클라이언트 truncate 시 title 잘리고 docNumber 보존.
- **D-C2:** **REFERENCE 라인 사용자에게 이메일 발송하지 않음** — 현재 `determineRecipients` 로직의 `filter(l -> l.getLineType() != ApprovalLineType.REFERENCE)` 유지. 참조자는 문서 상세 페이지에서 즉시 접근 가능. WITHDRAW는 전원에게 발송하므로 참조자도 '회수되었음'은 받음.
- **D-C3:** 5종 Thymeleaf 템플릿 = **공통 layout fragment + 이벤트별 5개가 차이만** — `templates/email/layouts/approval-base.html`에 헤더/푸터/CTA 버튼/CJK 폰트 스택/600px 고정폭/인라인 CSS를 두고, `approval-{event}.html` 5개(`submit/approve/final-approve/reject/withdraw`)가 `th:replace="layouts/approval-base :: layout(~{::body})"`로 감싸고 body만 조립. 유지보수 ↑ 일관성 ↑.
- **D-C4:** CTA = **단일 "문서 바로가기" 버튼** — href는 `{baseUrl}/documents/{doc.id}`. 토큰 URL 금지(Pitfall 13). 프론트 라우터가 401 시 login redirect 처리.
- **D-C5:** From 네임 = **`MiceSign <${spring.mail.username}>`** — `RegistrationEmailService` 패턴 계승. 운영 시 `spring.mail.username`은 사내 릴레이 계정으로 env 주입 (`D-D1` 참조). Reply-To 미사용.
- **D-C6:** 본문 정보 깊이 = **메타데이터 레벨** — 문서번호·제목·기안자(부서+이름)·이벤트 시각(상신/승인/반려 일시)·CTA. 문서 본문 요약 미포함(PII 보호, 이메일 클라이언트 조재). REJECT 본문엔 `approvalLine.comment`(반려 사유, FSD 필수 입력) 표시.
- **D-C7:** 시각 스타일 = **`registration-submit.html` 스코프 계승** — 인라인 CSS, CJK 폰트 스택(`'Malgun Gothic','Apple SD Gothic Neo',sans-serif`), 600px 고정폭, 혜색 배지, `<meta charset="UTF-8">`. 신규 브랜딩 작업 없음.

### D. 운영·테스트 환경

- **D-D1:** 운영 SMTP 공급자 = **Phase 29 범위에서 불특정** — `application.yml`의 `spring.mail.*`은 env var(`MAIL_HOST/MAIL_PORT/MAIL_USERNAME/MAIL_PASSWORD`) 주입만 유지, 공급자 최종 결정(사내 릴레이 / Gmail Workspace / O365 / SES)은 Phase 33 ops 런북. Phase 29는 공급자 agnostic.
- **D-D2:** `application-prod.yml`에 **`app: base-url: ${APP_BASE_URL:https://micesign.사내도메인}` 추가** + **`@Profile("prod") ApplicationReadyEvent` listener**로 `baseUrl.contains("localhost")` 시 startup 실패 (Pitfall 19 방지). `APP_BASE_URL` env var는 배포 시 설정.
- **D-D3:** 테스트 환경 = **GreenMail 2.1.x(JUnit 5, Jakarta Mail 2.x) + MailHog/Mailpit(수동 UAT) 병행** — GreenMail은 `@SpringBootTest` 통합 테스트용(한글 제목 디코딩, retry 경로, UNIQUE 제약 검증), MailHog는 개발자 수동 UAT(시각적 확인). *(2026-04-23 updated: 1.6.x는 javax.mail 기반으로 Spring Boot 3/Jakarta Mail과 비호환 — RESEARCH Assumptions Log A1/A2 참조, planner가 mvnrepository에서 최신 2.1.x 패치 pinning)*
- **D-D4:** 스레드 풀은 **기존 `micesign-async` 유지** — 50명 규모에서 core=2/max=5/queue=100 충분. 전용 `mailExecutor` 분리는 Phase 33 성능 실측 후 필요 시 추가(research P2).
- **D-D5:** GreenMail 통합 테스트 = **5종 이벤트 × [기본 발송 + 한글 제목 디코딩 + 수신자 규칙 + RETIRED/INACTIVE skip]** — `ApprovalNotificationIntegrationTest`. `@Retryable` 경로 검증(MailSendException 강제 주입 → 3회 시도 → FAILED)은 별도 테스트 클래스.
- **D-D6:** CI 게이트 = **`ApprovalServiceAuditTest` (audit_log COUNT=1 per action, NFR-03) + GreenMail 수신자 규칙 테스트** — 두 셋트가 통과해야 Phase 29 완료.
- **D-D7:** `JavaMailSender` bean은 **`@ConditionalOnProperty(name = "spring.mail.host")` 조건부** — `MAIL_HOST` env 미설정 시 bean 생성 skip. `ApprovalEmailSender`는 `@Autowired(required = false) JavaMailSender mailSender` 패턴으로 null-safe 수신. null일 때 `[EMAIL STUB]` 로그만 남기고 NotificationLog는 SUCCESS로 기록(기존 `RegistrationEmailService` 패턴 유지).

### Claude's Discretion

- 구체 file 구조(`ApprovalEmailSender.java`의 정확한 위치 — `service/` vs `service/email/`), `templates/email/layouts/` 디렉토리 분리 여부는 planner가 결정
- `ApprovalServiceAuditTest`의 JPA fixture 구성 방식 (`@DataJpaTest` vs `@SpringBootTest`) — researcher 권장안 따름
- GreenMail 버전 고정(1.6.x 시리즈 내 최신) 및 gradle testImplementation 위치
- V19 migration의 SQL 문구 세부 (`ALTER TABLE notification_log ADD CONSTRAINT uk_notification_dedup UNIQUE (document_id, event_type, recipient_id)` 형식)
- @Profile("prod") startup check의 구체 구현(`@EventListener(ApplicationReadyEvent)` + `@Value` 조합)

### Folded Todos

없음 — 현재 Pending Todos "None".

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### 프로젝트 스펙 (필수)
- `docs/PRD_MiceSign_v2.0.md` — 제품 요구사항, DB schema DDL (notification_log 포함)
- `docs/FSD_MiceSign_v1.0.md` §5.3 / §11 — 이메일 알림 이벤트 규칙, 수신자 정책, "2회 재시도 5분 간격" 스펙
- `.planning/REQUIREMENTS.md` §v1.2/NOTIF/NFR — NOTIF-01~05, NFR-02, NFR-03 locked
- `.planning/ROADMAP.md` §Phase 29 — Success Criteria 5항 locked
- `.planning/PROJECT.md` — core value, constraints, stack

### v1.2 Phase 1-B 리서치 (직접 참조)
- `.planning/research/SUMMARY.md` §SMTP — "EmailService 스텁을 RegistrationEmailService 모델로 교체" 권장
- `.planning/research/STACK.md` §Mail — Spring Mail 6.2, Thymeleaf-Spring6 3.1, Spring Retry 2.x 확인
- `.planning/research/ARCHITECTURE.md` §Event + Async — `AFTER_COMMIT + @Async + @Retryable` 프록시 체인
- `.planning/research/PITFALLS.md` Pitfall 1, 2, 3, 11, 12, 13, 17, 18, 19, 24 — 이 phase에서 반드시 회피
- `.planning/research/FEATURES.md` — P1/P2/P3 feature matrix

### 참조 구현 (코드 레벨 벤치마크)
- `backend/src/main/java/com/micesign/service/RegistrationEmailService.java` — SMTP 발송 패턴 모델 (복제 대상)
- `backend/src/main/resources/templates/email/registration-submit.html` — Thymeleaf 템플릿 시각 스타일 기준
- `backend/src/main/java/com/micesign/service/EmailService.java` — 교체 대상 스텁 (수신자 규칙 로직만 보존)
- `backend/src/main/java/com/micesign/config/AsyncConfig.java` — 현 executor 설정, Phase 29에서 변경 없음

### 트리거 지점 (수정 금지, 참조용)
- `backend/src/main/java/com/micesign/service/ApprovalService.java` L100-125, L156-165 — APPROVE/REJECT publishEvent
- `backend/src/main/java/com/micesign/service/DocumentService.java` L315-390 — SUBMIT/WITHDRAW publishEvent
- `backend/src/main/java/com/micesign/event/ApprovalNotificationEvent.java` — POJO event 정의 (변경 금지)
- `backend/src/main/java/com/micesign/domain/enums/NotificationEventType.java` — 5종 event enum
- `backend/src/main/java/com/micesign/domain/enums/NotificationStatus.java` — PENDING/SUCCESS/FAILED/RETRY

### 스키마·마이그레이션
- `backend/src/main/resources/db/migration/V1__create_schema.sql` — 최초 notification_log DDL
- `backend/src/main/resources/db/migration/V6__add_pending_notification_status.sql` — PENDING enum 확장
- `backend/src/main/resources/db/migration/V16__extend_notification_log_for_registration.sql` — recipient_id nullable, registration_request_id 추가
- `backend/src/main/java/com/micesign/domain/NotificationLog.java` — JPA 엔티티 (D-A3에서 uniqueConstraints 추가 예정)

### 설정 파일
- `backend/src/main/resources/application.yml` — spring.mail, app.base-url, management.health.mail 설정
- `backend/src/main/resources/application-prod.yml` — D-D2에서 app.base-url 추가 예정

### 마일스톤 히스토리
- `.planning/STATE.md` — Blockers/Concerns 3건(SMTP 공급자, app.base-url prod, MailHog vs Mailpit)
- `.planning/milestones/v1.1-MILESTONE-AUDIT.md` — v1.1 audit, notification 무관

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets (적극 재사용)
- **`RegistrationEmailService`**: SMTP 발송 패턴의 Gold Standard. `JavaMailSender` + `MimeMessageHelper(message, true, "UTF-8")` + `SpringTemplateEngine` + `@Value("${app.base-url}")` + `@Autowired(required=false)` null-safe. `ApprovalEmailSender`의 설계 모델.
- **`EmailService.determineRecipients()`**: 5종 이벤트별 수신자 결정 로직은 살려서 이동 (REFERENCE 필터 포함). `.distinct()` 추가만 신규.
- **`EmailService.getActionLabel()`**: 한글 eventType → actionLabel 매핑 (결재 요청/승인/최종 승인/반려/회수) 유지.
- **`AsyncConfig`**: `@EnableAsync`, `micesign-async-` ThreadPoolTaskExecutor, `AsyncUncaughtExceptionHandler` — 변경 없이 사용.
- **Thymeleaf `templates/email/registration-submit.html`**: 시각 스타일·CJK 폰트 스택·인라인 CSS·600px 폭 — approval layout의 직접 모델.
- **`NotificationLog` 엔티티**: 모든 필드(recipient, recipientEmail, eventType, documentId, subject, status, retryCount, errorMessage, sentAt, createdAt) 이미 존재. D-A3의 uniqueConstraints만 추가.
- **`NotificationStatus.PENDING`**: V6에서 이미 추가됨. PENDING-first 3단계 패턴에 그대로 사용.

### Established Patterns (따라야 할 관습)
- **이벤트 리스너**: `@TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT) + @Async` — `EmailService`와 `RegistrationEmailService` 동일. 신규 리스너 작성 시 복제.
- **이벤트 publisher**: producer(ApprovalService/DocumentService)에서 eventType을 결정해서 `publishEvent()`. listener에서 재분류 금지 (Spring nested @TransactionalEventListener trap).
- **Audit 로그**: 동기 방식으로 service method에서 `auditLogService.log(...)` 호출. listener에서 audit INSERT 금지 (Pitfall 3).
- **Thymeleaf Context**: `new Context()` + `setVariable()` + `templateEngine.process("email/" + templateName, ctx)`.
- **env var 주입**: `${VAR_NAME:default_value}` 형식으로 안전한 기본값 제공.
- **JPA `ddl-auto: validate`**: 엔티티와 실제 DB 스키마 drift는 startup validation에서 잡음.

### Integration Points (수정 금지 경계)
- `ApprovalService.approve/reject` + `DocumentService.submitDocument/withdrawDocument`의 `publishEvent()` 호출부 (5지점) — 완전 변경 금지. Phase 29 작업은 listener 쪽에만.
- `BudgetIntegrationService`의 `@Async` 사용 — 공유 executor, 경쟁 상태 주의.
- `V18__add_additional_templates.sql` 이후 migration 번호 = **V19이 다음 번호**. 병렬 작업자 없으므로 V19 안전.
- `RegistrationEmailService`는 완전 독립 동작 — 작업 중 regression 발생 시 즉시 회귀로 간주.

### Creative Options (연관 활용 가능성)
- 공통 `layouts/approval-base.html` 작성 경험을 Registration에도 소급 리팩터링 가능(후순위). 단 Phase 29 범위 밖.
- GreenMail 통합 테스트 클래스는 Registration 회귀 테스트도 확장 가능한 패턴 제공.

</code_context>

<specifics>
## Specific Ideas

- **ActionLabel 한글 매핑 재사용**: 현재 `EmailService.getActionLabel()`의 5개 케이스(결재 요청/승인/최종 승인/반려/회수)를 그대로 `ApprovalEmailSender`로 이동. 변경 없이.
- **RegistrationEmailService 패턴 그대로**: "SMTP null 안전 fallback → stub log 출력 + status=SUCCESS" 동작을 approval에서도 재현 (dev 환경에서 SMTP 없이도 애플리케이션 기동 가능).
- **REJECT 본문의 comment 필드**: FSD FN-APR-005에 반려 comment 필수 입력. 이메일 본문에 comment를 그대로 표출. `document.getApprovalLines()` 중 status=REJECTED line의 comment.
- **WITHDRAW .distinct() 구현**: Java 8 stream `.distinct()`는 `User.equals()/hashCode()` 의존 — `User` entity의 `@Id` 기준 equals/hashCode 구현 확인 필요(없으면 `.map(User::getId).distinct().map(userRepo::findById)`).

</specifics>

<deferred>
## Deferred Ideas

- **운영자 FAILED 알림 파이프라인** (Slack webhook, SUPER_ADMIN 이메일 요약) → Phase 33 또는 Phase 1-C
- **전용 mailExecutor 분리** (Pitfall 11) → Phase 33 성능 검증 후 필요 시
- **Micrometer 메트릭** (`micesign.mail.sent.total`, `.failed.total`, `.queue.size`) → Phase 33/1-C 모니터링 페이즈
- **Plain-text fallback + HTML 이중 구성** (`setText(plain, html)` 멀티파트) → Research P2, 수용 가능한 tech debt
- **이메일 요약/본문 미리보기** (기안 내용 요약) → anti-feature. PII 노출 위험 + v1.1 CUSTOM 빌더와 충돌
- **Stale PENDING 정리 cron** (@Scheduled 5분) → 서버 재시작 빈도 낮음 + 50명 규모에서 과스펙, Phase 33 런북에서 수동 스크립트 문서화
- **Deep-link token** (24시간 단발성 서명 URL) → Phase 1-C 고급 기능, JWT URL 포함 금지 원칙 유지
- **`ApprovalEmailSender.send()`의 Resilience4j rate limiter** (Pitfall 12) → Phase 33/1-C 프로덕션 가드
- **운영 SMTP 공급자 최종 선정** (사내 릴레이 / Gmail Workspace / O365 / SES) → Phase 33 운영 전환 런북
- **MailHog vs Mailpit 택일** → 동등, 개발자 개인 환경 선호로. Phase 29 planning에서 development workflow 선택.
- **SUPER_ADMIN 대시보드의 notification_log 조회 UI** → Phase 1-C
- **Reply-To에 기안자 이메일 주입** → 유용하지만 Phase 29 스코프 확장

</deferred>

---

*Phase: 29-smtp-retrofit*
*Context gathered: 2026-04-23*

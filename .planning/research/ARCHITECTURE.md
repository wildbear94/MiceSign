# Architecture Research — v1.2 Phase 1-B Integration

**Domain:** 전자결재 (MiceSign) — v1.1 완료 후 Phase 1-B 기능 확장
**Researched:** 2026-04-22
**Scope:** SMTP 알림 / 문서 검색·필터 / 대시보드 고도화 / 양식 확장 4개 축의 기존 아키텍처 통합
**Confidence:** HIGH — 실제 코드베이스 전수 조사 기반

---

## Executive Summary — 결정적 발견

이번 v1.2 통합 연구의 가장 중요한 발견은:

> **v1.2 Phase 1-B 인프라의 70%는 이미 Phase 1-A/1.1 에서 스캐폴딩되어 있다.** 신규 설계(green-field)가 아니라 **기존 stub 의 완성·재활용** 중심의 retrofit 마일스톤이다.

| 축 | 신규 설계 필요 | 기존 자산 | 실제 작업 |
|----|---------------|----------|----------|
| **SMTP 알림** | 거의 없음 | `EmailService` stub + `ApprovalNotificationEvent` + 5 위치 `publishEvent()` + `AsyncConfig` + `spring-boot-starter-mail` 의존성 + `RegistrationEmailService` 참조 구현 + `NotificationLog` 엔티티 | stub을 `JavaMailSender`/Thymeleaf 기반 실발송으로 교체 + 5개 이메일 템플릿 작성 + 재시도 로직 |
| **문서 검색/필터** | 거의 없음 | `GET /api/v1/documents/search` 엔드포인트 + `DocumentRepositoryCustomImpl` QueryDSL 구현 + `DocumentSearchCondition` DTO + `DocumentListPage` 탭·필터 UI + `useSearchDocuments` 훅 | 전문검색(FULLTEXT) 추가, 성능 검증, 기안자 필터 1개 추가, 응답 ≤ 1초 검증 |
| **대시보드 고도화** | 부분 | `GET /api/v1/dashboard/summary` + `DashboardService.getDashboardSummary()` + `DashboardPage` + 3개 CountCard + 2개 List | "진행 중" 카운트(submittedCount 는 이미 있지만 UI 미노출) 카드 1개 추가, "내 결재 대기" 위젯은 이미 존재 — 실제로는 UI 폴리싱 + 옵션 성능개선 |
| **양식 확장** | 없음 | v1.0 에 PURCHASE/BUSINESS_TRIP/OVERTIME 3개 추가(V18 마이그레이션) 완료 + React 폼/ReadOnly 컴포넌트 등록 완료 + v1.1 CUSTOM 빌더 + 프리셋 4종(expense/leave/purchase/trip) | 프리셋 1~2개 추가(예: 품의서, 회의록) 또는 정책 검토 후 skip |

**주의:** `EmailService.sendToRecipient()` 는 현재 stub 이지만 `notification_log` 저장 로직은 이미 구현되어 있다. **중복 구현을 피하기 위해 반드시 기존 코드를 읽고 확장해야 한다.**

---

## System Overview — 기존 MiceSign 아키텍처

```
┌──────────────────────────────────────────────────────────────────────────┐
│                          Frontend (React 18 + Vite)                       │
│                                                                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │   features/  │  │   features/  │  │   features/  │  │   features/  │ │
│  │   dashboard  │  │   document   │  │   approval   │  │    admin     │ │
│  │              │  │              │  │              │  │              │ │
│  │ pages/       │  │ pages/       │  │ pages/       │  │ pages/       │ │
│  │ components/  │  │ components/  │  │ components/  │  │ presets/     │ │
│  │ hooks/       │  │ hooks/       │  │ hooks/       │  │ hooks/       │ │
│  │ api/         │  │ api/         │  │ api/         │  │ components/  │ │
│  │ types/       │  │ types/       │  │ types/       │  │ validations/ │ │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘ │
│         │                 │                 │                 │          │
│         └────── TanStack Query v5 (server state) ──────────────┘         │
│         └────── Zustand (auth/client state) ──────────────────┘          │
└─────────────────────────────────┬────────────────────────────────────────┘
                                  │ Axios + JWT (AT memory / RT HttpOnly cookie)
                                  │ GET/POST /api/v1/...
┌─────────────────────────────────▼────────────────────────────────────────┐
│                       Backend (Spring Boot 3.5.13)                       │
│                                                                           │
│  ┌─────────────── controller/ (@RestController) ────────────────────┐   │
│  │ DocumentController  ApprovalController   DashboardController      │   │
│  │ AuthController      AuditLogController   NotificationLogController│   │
│  │ AdminTemplateController  RegistrationController  ...              │   │
│  └───────────────────────────────┬───────────────────────────────────┘   │
│                                  │ @PreAuthorize / DTO 검증              │
│  ┌─────────────── service/ (@Service + @Transactional) ─────────────┐   │
│  │ DocumentService     ApprovalService      DashboardService         │   │
│  │ EmailService        RegistrationEmailService                      │   │
│  │ AuthService         AuditLogService       TemplateService         │   │
│  │ TemplateSchemaService                                             │   │
│  │                                                                   │   │
│  │ ── ApplicationEventPublisher.publishEvent() ──┐                   │   │
│  └───────────────────────────────┬──────────────┼───────────────────┘   │
│                                  │              │                       │
│  ┌─────── event/ POJO ────────────┐             │                       │
│  │ ApprovalNotificationEvent      │             │                       │
│  │ RegistrationNotificationEvent  │             │                       │
│  │ BudgetIntegrationEvent         │             │                       │
│  │ BudgetCancellationEvent        │             │                       │
│  └───────────────┬────────────────┘             │                       │
│                  │                              │                       │
│  ┌──── @TransactionalEventListener(AFTER_COMMIT) + @Async ─────────┐    │
│  │ EmailService.sendNotification()           (stub → 실발송)       │    │
│  │ RegistrationEmailService.handleRegistration() (실발송 완료)     │    │
│  │ BudgetIntegrationService.handleIntegration()  (실발송 완료)     │    │
│  └────────────────────────────────────────────────────────────────┘    │
│                                                                          │
│  ┌─────────────── repository/ (Spring Data JPA + QueryDSL) ─────────┐  │
│  │ DocumentRepository + DocumentRepositoryCustomImpl (QueryDSL)      │  │
│  │ ApprovalLineRepository  NotificationLogRepository  ...            │  │
│  └───────────────────────────────┬───────────────────────────────────┘  │
│                                  │ Hibernate 6.x                        │
└──────────────────────────────────┼──────────────────────────────────────┘
                                   │
                       ┌───────────▼─────────────┐     ┌──────────────────┐
                       │ MariaDB 10.11            │     │ Google Drive API │
                       │ (Flyway V1~V18)          │     │ (Service Account)│
                       │ document / approval_line │     │ 첨부 저장         │
                       │ notification_log         │     └──────────────────┘
                       │ audit_log                │     ┌──────────────────┐
                       │ approval_template        │     │ SMTP (Phase 1-B) │
                       └──────────────────────────┘     │ spring-boot-mail │
                                                        └──────────────────┘
```

### 핵심 사실
- **패키지 구조:** `com.micesign.{aspect, budget, common, config, controller, domain, dto, event, mapper, repository, security, service, specification}`
- **API prefix:** `/api/v1/*` (예: `/api/v1/documents`, `/api/v1/dashboard`, `/api/v1/documents/search`)
- **인증:** `@AuthenticationPrincipal CustomUserDetails` — userId, role, departmentId 획득
- **이벤트 패턴:** POJO 이벤트(`ApplicationEvent` 미상속) + `@TransactionalEventListener(AFTER_COMMIT) + @Async` → `micesign-async-` 스레드 풀(core 2, max 5, queue 100)
- **트랜잭션:** 모든 Service 메서드는 기본 `@Transactional` (클래스 레벨). Read-only Service (`DashboardService`) 는 `@Transactional(readOnly = true)` 선언됨
- **QueryDSL:** Jakarta classifier 5.1.0 + `JPAQueryFactory` 빈(`QueryDslConfig`) + `Q*` 클래스 주입 사용. 이미 동작 중

---

## 기능별 통합 포인트 (핵심 섹션)

### 1. SMTP 이메일 알림 — Retrofit, not green-field

#### 현재 상태 (2026-04-22 기준)

**이미 구현된 자산:**
```
backend/src/main/java/com/micesign/
├── event/ApprovalNotificationEvent.java               ← POJO 이벤트 (SUBMIT/APPROVE/FINAL_APPROVE/REJECT/WITHDRAW)
├── service/EmailService.java                           ← @TransactionalEventListener + @Async 껍데기, 수신자 결정 로직 완비
├── service/RegistrationEmailService.java               ← JavaMailSender + Thymeleaf 실발송 레퍼런스 구현 (RegEvent용)
├── config/AsyncConfig.java                             ← micesign-async- 스레드 풀
├── domain/NotificationLog.java + enums/NotificationStatus.java (PENDING/SUCCESS/FAILED/RETRY)
├── domain/enums/NotificationEventType.java             ← SUBMIT/APPROVE/FINAL_APPROVE/REJECT/WITHDRAW 정의 완료
├── service/DocumentService.java                        ← submitDocument()/withdrawDocument() 에서 publishEvent() 2곳 호출
├── service/ApprovalService.java                        ← approve()/reject() 에서 publishEvent() 2곳 호출 (approve 는 분기 내부)
└── build.gradle.kts                                    ← spring-boot-starter-mail + spring-boot-starter-thymeleaf 이미 선언
```

**아직 stub / 미구현:**
- `EmailService.sendToRecipient()` 가 `log.info("[EMAIL STUB] ...")` 호출만 수행 — 실제 SMTP 미연결
- Thymeleaf 이메일 템플릿 5개 (SUBMIT/APPROVE/FINAL_APPROVE/REJECT/WITHDRAW) 미작성 — `templates/email/` 에는 registration-* / budget-failure-notification 만 존재
- 재시도 로직 미구현 (`retry_count` 컬럼은 있으나 증가 로직 없음) — FSD 요구: 최대 2회 재시도
- `application-*.yml` 에 `spring.mail.*` 플레이스홀더만 있음 (`MAIL_HOST: ""` 기본값), 실제 SMTP host/username 미설정

#### 통합 지점

**이벤트 발행은 이미 이루어지고 있다 — 추가 리팩터링 불필요.**

| 서비스 메서드 | 발행 이벤트 | 라인 | 상태 |
|--------------|------------|------|------|
| `DocumentService.submitDocument()` | `SUBMIT` | 319 | 완료 |
| `DocumentService.withdrawDocument()` | `WITHDRAW` | 377 | 완료 |
| `ApprovalService.approve()` (중간 승인) | `APPROVE` | 124 (분기) | 완료 |
| `ApprovalService.approve()` (최종 승인) | `FINAL_APPROVE` | 124 (분기) | 완료 |
| `ApprovalService.reject()` | `REJECT` | 161 | 완료 |

#### `@TransactionalEventListener(AFTER_COMMIT)` + `@Transactional` 상호작용

```
Controller
  └─▶ DocumentService.submitDocument()   ── @Transactional (클래스)
        ├─ documentRepository.save(...)
        ├─ auditLogService.log(...)
        └─ eventPublisher.publishEvent(new ApprovalNotificationEvent(...))
                                         ↑ 이 시점엔 스풀링만 (TX 미커밋)
  ◀─ return buildDetailResponse(...)    
                                         
TX COMMIT ──────────────────────────────
  │
  └─▶ Spring 이 등록된 listener 를 AFTER_COMMIT 단계에서 호출
        └─▶ EmailService.sendNotification(event)   ── @Async
               │ 별도 스레드(micesign-async-*) 로 점프
               └─ JavaMailSender.send(...)
               └─ notificationLogRepository.save(notifLog)
                  ※ 이 save 는 listener 의 새 Tx 에서 수행됨
                  (listener 가 재진입 Tx 필요 시 @Transactional 명시)
```

**중요한 함정 3가지 (PITFALLS.md 와 연계):**

1. **`@Transactional(REQUIRES_NEW)` 필요 여부.** `AFTER_COMMIT` 단계에서는 원 Tx 가 이미 끝났으므로 `notificationLogRepository.save()` 는 트랜잭션 없이 실행될 수 있다. → `EmailService.sendNotification()` 또는 `sendToRecipient()` 에 `@Transactional(propagation = Propagation.REQUIRES_NEW)` 명시 권장. 현재 `RegistrationEmailService` 는 명시 없이 동작하지만 이는 Spring 의 OpenEntityManagerInViewInterceptor 나 Hibernate 의 AUTO_FLUSH 에 의존하는 것이며 안정적이지 않음.

2. **메일 발송 실패 시 원본 문서 Tx 는 이미 커밋됨.** 비동기 listener 에서 예외가 발생해도 사용자 요청은 성공으로 반환됨 — 이는 의도된 동작(알림 실패가 결재 흐름을 막지 않음). 실패는 `notification_log.status = FAILED` 로만 기록.

3. **자체 호출(self-invocation) 이슈.** `EmailService` 내부 메서드에서 `this.sendToRecipient()` 호출은 `@Async` 프록시를 우회한다. 하지만 현재 구현은 listener 메서드에서 직접 반복문으로 `sendToRecipient()` 호출하므로 **listener 메서드 하나에만 @Async 를 붙이고 재시도는 별도 컴포넌트로 분리**해야 한다.

#### 재시도 전략

**권장 방식 — 별도 컴포넌트로 분리하여 기존 `@Retryable`/`@Recover` 패턴 활용 (BudgetIntegrationService 선례):**

```java
// 신규 빈: ApprovalEmailSender
@Component
public class ApprovalEmailSender {
    private final JavaMailSender mailSender;

    @Retryable(
        retryFor = { MailException.class, MessagingException.class },
        maxAttempts = 3,
        backoff = @Backoff(delay = 2000, multiplier = 2.0)
    )
    public void send(MimeMessage message, NotificationLog notifLog) throws MessagingException {
        mailSender.send(message);
        notifLog.setStatus(NotificationStatus.SUCCESS);
        notifLog.setSentAt(LocalDateTime.now());
    }

    @Recover
    public void recover(Exception e, MimeMessage message, NotificationLog notifLog) {
        notifLog.setStatus(NotificationStatus.FAILED);
        notifLog.setErrorMessage(e.getMessage());
        notifLog.setRetryCount(3);
    }
}
```

주의: `@Retryable` 은 프록시 기반이므로 **같은 빈 내부의 private 메서드 호출 시 동작 안 함**. `ApprovalEmailSender` 를 **별도 @Component 로 분리**하여 `EmailService` 가 주입해서 사용해야 한다. `@Async` 메서드 내부에서도 다른 빈의 `@Retryable` 메서드 호출은 정상 동작한다.

**대안:** `notification_log.status = RETRY` 로 표시한 뒤 스케줄러(`@Scheduled`)로 재발송. `SchedulingConfig` 이미 존재함 — 재사용 가능. 장애 복구 시 유리.

#### 이메일 템플릿 (Thymeleaf)

**기존 패턴 재활용:** `templates/email/registration-*.html` 파일 5개가 이미 작성되어 있음. 인라인 CSS 기반 600px 카드 레이아웃, `Malgun Gothic` 한글 폰트, 블루 헤더(#2563eb), 한국어 본문. **이 템플릿을 그대로 복제하여 approval-*.html 5개 작성.**

```
templates/email/
├── approval-submit.html         ← 신규
├── approval-approve.html        ← 신규 (중간 승인)
├── approval-final-approve.html  ← 신규 (최종 승인 — 기안자에게)
├── approval-reject.html         ← 신규
└── approval-withdraw.html       ← 신규
```

**Thymeleaf 변수 (표준 패턴):**
- `${docNumber}`, `${docTitle}`, `${drafterName}`, `${drafterDepartment}`, `${currentStep}`, `${approverName}`, `${comment}`, `${approvalUrl}` — 결재 상세 링크는 `${baseUrl}/documents/{id}`
- `baseUrl` 은 `RegistrationEmailService` 와 동일하게 `@Value("${app.base-url:http://localhost:5173}")` 주입

**i18n:** 현재 이메일 템플릿은 **한국어 하드코딩**. FSD 가 한국어 single-locale 이므로 i18n 인프라 불필요. 단, 제목의 prefix `[MiceSign]` 와 action label("결재 요청", "승인", "최종 승인", "반려", "회수") 은 `EmailService.getActionLabel()` 메서드에 이미 정의되어 있음 — 그대로 재사용.

#### MVC 맥락에서의 view resolution

Spring Boot + Thymeleaf 기본 설정은 `classpath:/templates/*.html` 을 자동 해석. `SpringTemplateEngine` 은 auto-configured. `RegistrationEmailService` 가 `templateEngine.process("email/registration-submit", ctx)` 로 경로 접근 → **동일 패턴 그대로 차용**.

별도 view resolver 설정 불필요. 단, 이메일용 Thymeleaf 와 REST 응답용 view 는 충돌 가능성이 있으므로 **백엔드는 @RestController 만 사용(현재 맞음)**.

---

### 2. 문서 검색 / 필터링 — 이미 동작 중, 확장 지점만 검토

#### 현재 상태

**완전 구현됨:**
```
GET /api/v1/documents/search?keyword=...&status=...&templateCode=...
                            &dateFrom=...&dateTo=...&tab=my|department|all
                            &page=0&size=20
```

- `DocumentController.searchDocuments()` (라인 116-144): RBAC 검증(`tab=all` 은 ADMIN+만) 포함
- `DocumentRepositoryCustomImpl.searchDocuments()` (QueryDSL): `BooleanBuilder` + LIKE 이스케이프 + 탭 스코프 로직 완비
- `DocumentSearchCondition` record DTO
- 프론트엔드 `DocumentListPage` 에 탭 토글 + 키워드 입력(300ms 디바운스) + status/templateCode/dateFrom/dateTo 필터 UI 완성
- `useSearchDocuments` hook + `useMyDocuments` hook 분리, 탭 전환 시 enable 토글

#### API 설계 판단 — GET 유지 (POST /search 불필요)

| 기준 | GET /api/v1/documents/search | POST /api/v1/documents/search | 결정 |
|------|------------------------------|-------------------------------|------|
| URL 북마킹 가능 | 가능 | 불가 | GET 승 |
| 쿼리 파라미터 복잡도 | 6개 — 한도 내 | - | GET 충분 |
| 캐싱 가능 | 가능 (브라우저·CDN) | 불가 | GET 승 |
| 검색어 PII 노출 | 로그에 남을 수 있음 | - | 민감하지 않음, 허용 |
| 요청 본문 크기 제한 | ~2KB | 무제한 | 현 스키마에 여유 |

**결정:** 현재의 GET 유지. POST 로 전환할 정당한 근거 없음.

#### 기존 `/api/documents?state=...` 와 레이어링

**PRD §12.2 는 `GET /api/documents` 를 단일 엔드포인트로 명시**했으나, 실제 구현은 분리되어 있다:
- `GET /api/v1/documents/my` — 내 문서만 (간단 필터)
- `GET /api/v1/documents/search` — 복합 필터 + 전문 검색 + 탭 스코프

이 분리는 **의도된 최적화**이며 유지 권장:
- `/my` 는 단순 조회(2개 파라미터), 캐시 무효화 주기가 짧음 → 간단한 `Page<DocumentResponse>` 반환
- `/search` 는 QueryDSL dynamic query, RBAC 검증, 더 무거움

**단, 프론트 상태 관리:** `DocumentListPage` 에서 탭 전환 시 두 쿼리를 `enabled` 로 토글하므로 중복 호출 없음. TanStack Query 캐시 키가 다르므로 서로 간섭하지 않음.

#### 페이지네이션 전략 — Offset 유지

| 전략 | 장단점 | 현재 규모(~50 users, 연간 문서 <10K) |
|------|--------|--------------------------------------|
| **Offset (page/size)** | 단순, 임의 페이지 점프 가능, deep pagination 시 느려짐(OFFSET 100000 등) | 충분 — 현재 스크롤/이동 패턴 cover |
| Cursor (createdAt + id) | deep pagination 빠름, 구현 복잡, 페이지 번호 안됨 | 과잉설계 |
| Keyset | cursor 와 유사 | 불필요 |

**결정:** Offset 유지. 전체 문서 수가 100K 를 넘길 때(수년 후) cursor 로 마이그레이션 검토.

#### 전문 검색 성능 목표 (≤ 1초)

현재 `DocumentRepositoryCustomImpl` 의 LIKE 패턴 검색은:
```sql
WHERE LOWER(doc.title) LIKE '%kw%' OR LOWER(doc.doc_number) LIKE '%kw%' OR LOWER(drafter.name) LIKE '%kw%'
```
선행 와일드카드(`%kw%`) 때문에 **인덱스 사용 불가** — 풀 테이블 스캔. 10K 문서까지는 수백 ms, 100K 이상에서 문제.

**단계적 대응 (v1.2 범위):**
1. 현재 구현 유지 + 실측(`EXPLAIN`, 로드 테스트). 10K 문서 이하에서 ≤ 1초 달성 가능성 높음.
2. 느릴 경우: MariaDB FULLTEXT 인덱스 추가 (`ALTER TABLE document ADD FULLTEXT INDEX ft_title (title)`). 마이그레이션 V19 에서 추가 — 단, `utf8mb4_unicode_ci` + ngram parser 필요(한글 2-3자 토큰).
3. `document_content.body_html` 검색은 **v1.2 범위 밖** — 양식 field 검색은 별도 이슈(JSON path 검색 필요, MariaDB 10.6+ `JSON_VALUE` + generated column + index).

#### 필요한 확장 — 기안자 필터

PROJECT.md 요구: "기안자" 필터 추가. 현재 `DocumentSearchCondition` 에 `drafterId` 없음. `keyword` 에 이름 LIKE 로만 매칭됨.

```java
// DocumentSearchCondition — drafterId: Long 추가
public record DocumentSearchCondition(
    String keyword, String status, String templateCode,
    LocalDate dateFrom, LocalDate dateTo, String tab,
    Long drafterId          // ← 신규
) {}

// DocumentRepositoryCustomImpl — where 절에 추가
if (condition.drafterId() != null) {
    where.and(doc.drafterId.eq(condition.drafterId()));
}
```

프론트엔드는 `UserFilterBar` 컴포넌트 이미 `features/admin/` 에 존재 — 이식하거나 Combobox(autocomplete) 컴포넌트 신규 작성.

---

### 3. 대시보드 고도화 — UI 폴리싱 중심

#### 현재 상태

**구현 완료:**
- `GET /api/v1/dashboard/summary` + `/api/v1/dashboard` (alias)
- `DashboardService.getDashboardSummary(userId)` — 4개 카운트(pending/draft/submitted/completed) + 5개 pending approval list + 5개 recent document list
- `DashboardSummaryResponse` record
- 프론트 `DashboardPage` + `CountCard` + `PendingList` + `RecentDocumentsList` 3개 컴포넌트

**누락된 것 (PROJECT.md 요구 기준):**
- "**진행 중**" 카운트 UI — `submittedCount` 는 backend 에 있으나 DashboardPage 는 3개 카드(pending/drafts/completed) 만 표시. 4번째 카드 추가 필요.
- "내 결재 대기" 위젯은 이미 `PendingList` 로 존재함 — PROJECT 요구사항 중 이 부분은 **이미 완료**.

#### 엔드포인트 설계 — 단일 `/api/v1/dashboard/summary` 유지

**질문: 별도 엔드포인트 여러개 vs 단일 composite?**

| 설계 | 장단점 | 결정 |
|-----|--------|------|
| **단일 `/summary`** (현재) | 1 round-trip, 데이터 일관성, 캐싱 명확 | 유지 |
| 분리(`/counts`, `/recent-documents`, `/pending`) | 부분 실패 격리, 증분 로딩 | 불필요 — 대시보드는 atomic 표시 |
| 클라이언트에서 기존 `/documents`, `/approvals` 컴포지션 | backend 단순, FE 복잡 | 비권장 — N+1 round-trip, RBAC 중복, 집계 비효율 |

**결정:** 단일 `/summary` 엔드포인트 유지. `submittedCount` 필드는 이미 응답에 포함되어 있으므로 프론트만 카드 1개 추가.

#### 집계 쿼리 성능

현재 `DashboardService.getDashboardSummary()` 는 **6개 쿼리** 실행:
1. `approvalLineRepository.countPendingByApproverId(userId)`
2. `documentRepository.countByDrafterIdAndStatus(userId, DRAFT)`
3. `documentRepository.countByDrafterIdAndStatus(userId, SUBMITTED)`
4. `documentRepository.countByDrafterIdAndStatus(userId, APPROVED)` + `REJECTED` (2회)
5. `approvalLineRepository.findPendingByApproverId(userId, PageRequest.of(0, 5))` — approval_line + document + drafter + department JOIN
6. `documentRepository.findByDrafterId(userId, PageRequest.of(0, 5))` — drafter join

50 user 규모에서 각 count 가 ms 단위. 최적화 불필요.

#### 캐싱 전략 — 현재로서는 불필요

**Spring Cache `@Cacheable`?** → **현재 스케일(50 users)에서 과잉.**

- 대시보드 데이터는 **사용자별로 다름** (userId key) — 캐시 히트율 낮음
- **Write-through 무효화 복잡** — 문서 상신/승인/반려/회수 때마다 캐시 flush 필요
- 응답 시간 이미 빠름

**TanStack Query client-side cache 로 충분:** `useDashboardSummary` 가 30초~5분 staleTime 설정하면 재방문 시 네트워크 호출 없음. 확대 옵션:
- `staleTime: 30_000` (30초) + `refetchOnWindowFocus: true` — 탭 복귀 시 최신화
- 승인/상신 mutation 성공 시 `queryClient.invalidateQueries(['dashboard'])` 호출

---

### 4. 양식 확장 — 거의 완료 상태

#### 현재 상태

**이미 이루어진 작업(V18 마이그레이션 + 하드코딩 컴포넌트 3개):**
```sql
-- V18__add_additional_templates.sql
INSERT IGNORE INTO approval_template (code, name, description, prefix, ...) VALUES
('PURCHASE', '구매 요청서', ...),
('BUSINESS_TRIP', '출장 보고서', ...),
('OVERTIME', '연장 근무 신청서', ...);
```

프론트엔드 `templateRegistry.ts` 에도 6개 양식 모두 등록 완료:
- GENERAL, EXPENSE, LEAVE (Phase 1-A)
- PURCHASE, BUSINESS_TRIP, OVERTIME (Phase 1-B 에 해당하는 기본 제공 양식 3개)

**v1.1 CUSTOM 빌더 및 프리셋 현황:**
- `features/admin/presets/` 에 expense.json / leave.json / purchase.json / trip.json 프리셋 4종
- `DynamicCustomForm` / `DynamicCustomReadOnly` fallback 렌더러
- `TemplateFormModal` 에서 JSON import/export 지원

#### v1.2 에서 남은 선택지

**선택 A — 프리셋 1~2 종 추가 (가벼움):**
- `presets/meeting-minutes.json` (회의록)
- `presets/proposal.json` (품의서/기획안)
- 신규 백엔드 테이블 / 코드 변경 없음 — 프리셋 JSON 파일만 추가, `presets/index.ts` 에 등록

**선택 B — 정책 검토 후 skip:**
- v1.1 에서 CUSTOM 빌더로 관리자가 직접 프리셋을 만들 수 있게 되었으므로 추가 하드코딩은 불필요할 수도 있음
- 실사용자(관리자) 피드백 기반 결정 권장

**주의 — 하드코딩 양식 추가 시:**
- 신규 Flyway 마이그레이션(`V19__add_...`) + React 폼·ReadOnly 컴포넌트 2종 + Zod 스키마 + `templateRegistry.ts` 등록 + i18n 번역 5개
- CUSTOM 빌더 프리셋으로 충당 가능한 건 하드코딩 안 하는 것이 관리 비용 절감

#### CUSTOM 빌더 프리셋 확충과 하드코딩의 분기점

| 기준 | 하드코딩 컴포넌트 (PURCHASE 등) | CUSTOM 프리셋 |
|-----|----------------------------------|--------------|
| 특수 UI 필요 (조건부 계산, 복잡한 표) | 하드코딩 | 동적 렌더러 한계 |
| 예산 연동 (`isBudgetEnabled`) | 하드코딩 | 연동 로직 없음 |
| 표준 필드만으로 충분 | 과잉설계 | 프리셋 |
| 사용자가 직접 조정하고 싶어함 | 비권장 | 프리셋 |

---

## Frontend 구조 — 통합 지점

```
frontend/src/features/
├── admin/
│   ├── pages/            ← TemplateListPage 는 CUSTOM 빌더 진입점, 변경 없음
│   ├── components/       ← TemplateFormModal (JSON import/export) 유지
│   ├── presets/          ← (v1.2) 프리셋 1~2개 JSON 추가 지점
│   └── validations/      ← schema validation (변경 없음)
│
├── approval/
│   ├── pages/            ← PendingApprovalsPage, CompletedDocumentsPage (변경 없음)
│   └── hooks/useApprovals.ts  ← 승인/반려 mutation — 성공 시 dashboard invalidate 추가
│
├── dashboard/
│   ├── pages/DashboardPage.tsx           ← (v1.2) 4번째 "진행 중" (submittedCount) 카드 추가
│   ├── components/
│   │   ├── CountCard.tsx                 ← 재사용
│   │   ├── PendingList.tsx               ← 재사용
│   │   └── RecentDocumentsList.tsx       ← 재사용
│   ├── hooks/useDashboard.ts             ← staleTime 정책 검토
│   └── api/dashboardApi.ts               ← 변경 없음
│
└── document/
    ├── pages/
    │   └── DocumentListPage.tsx          ← (v1.2) 기안자 필터(Combobox) 추가, 전문검색 placeholder 갱신
    ├── hooks/useDocuments.ts             ← drafterId param 추가
    ├── api/documentApi.ts                ← DocumentSearchParams type 에 drafterId 추가
    └── components/templates/
        └── templateRegistry.ts            ← 신규 양식 하드코딩 시 등록
```

**신규 컴포넌트 (선택 사항):**
- `features/document/components/DrafterCombobox.tsx` — 기안자 선택 autocomplete (react-select or Headless UI Combobox)
- `features/admin/pages/NotificationLogPage.tsx` — 이미 `NotificationLogController` 가 존재하므로 프론트엔드 화면 추가 고려 (범위 외 검토)

---

## Data Flow Examples

### Flow 1: 기안자가 문서를 상신 → 이메일 알림 발송

```
[사용자 클릭: "상신"]
    │
    ▼
POST /api/v1/documents/{id}/submit
    │
    ▼ JWT 검증 (SecurityFilter)
    │
DocumentController.submitDocument()
    │
    ▼ @Transactional (DocumentService.submitDocument)
    │
    ├─ 문서 번호 생성 (docSequenceRepository)
    ├─ document.status = SUBMITTED, submittedAt = now
    ├─ 첨부 파일을 Google Drive 영구 폴더로 이동
    ├─ auditLogService.log(DOC_SUBMIT, ...)  ← audit_log INSERT
    └─ eventPublisher.publishEvent(
           new ApprovalNotificationEvent(docId, "SUBMIT", userId))  ← spool
    │
    ◀─ HTTP 201 응답 (DocumentDetailResponse)
    │
TX COMMIT ─────────────────────────────────────
                                                │
                                                ▼  (AFTER_COMMIT)
                                EmailService.sendNotification(event)
                                                │  @Async → micesign-async-1
                                                │
                                                ├─ documentRepository.findByIdWithDrafter(docId)
                                                ├─ approvalLineRepository.findByDocumentIdOrderByStepOrderAsc()
                                                ├─ determineRecipients() — 1단계 비-REFERENCE 승인자들
                                                │
                                                ▼ 수신자 루프
                                                │
                                     sendToRecipient(user, subject, "SUBMIT", doc)
                                                │
                                                ├─ Thymeleaf: "email/approval-submit" 렌더
                                                ├─ ApprovalEmailSender.send(MimeMessage, notifLog)
                                                │      @Retryable maxAttempts=3
                                                │      실패 시 @Recover → status=FAILED
                                                └─ notificationLogRepository.save(
                                                     NotificationLog with
                                                       event_type=SUBMIT,
                                                       status=SUCCESS|FAILED,
                                                       retry_count=0~2,
                                                       sent_at=now)
```

### Flow 2: 문서 검색 (탭=search, keyword="예산")

```
[사용자 입력] "예산" in DocumentListPage
    │
    ▼ 300ms 디바운스 (useEffect)
    │
useSearchDocuments({ keyword: '예산', tab: 'my', page: 0, size: 20 })
    │
    ▼ TanStack Query: queryKey = ['documents', 'search', { ... }]
    │
axios.get('/api/v1/documents/search?keyword=%EC%98%88%EC%82%B0&tab=my&page=0&size=20')
    │
    ▼ JWT 검증 + @AuthenticationPrincipal
    │
DocumentController.searchDocuments()
    │  └─ RBAC check: tab=all 이면 ADMIN+ 확인, 'my' 는 pass
    │
    ▼
DocumentService.searchDocuments(condition, userId, role, departmentId, pageable)
    │
    ▼ (QueryDSL)
DocumentRepositoryCustomImpl.searchDocuments()
    │
    ├─ BooleanBuilder 조립:
    │    doc.drafterId = :userId        (tab=my)
    │    AND (LOWER(doc.title) LIKE '%예산%'
    │         OR LOWER(doc.doc_number) LIKE '%예산%'
    │         OR LOWER(drafter.name) LIKE '%예산%')
    │
    ├─ COUNT 쿼리 실행
    └─ 내용 쿼리 실행 (Projections.constructor → DocumentResponse)
    │
    ◀─ Page<DocumentResponse>
    │
    ◀─ ApiResponse.ok(page) → JSON
    │
    ▼
DocumentListTable 렌더 + Pagination
```

### Flow 3: 대시보드 진입

```
[사용자 라우팅] /dashboard
    │
    ▼ useDashboardSummary()
    │
GET /api/v1/dashboard/summary
    │
DashboardController → DashboardService.getDashboardSummary(userId)
    │
    ├─ [query 1] approvalLineRepository.countPendingByApproverId(userId)
    ├─ [query 2] documentRepository.countByDrafterIdAndStatus(userId, DRAFT)
    ├─ [query 3] documentRepository.countByDrafterIdAndStatus(userId, SUBMITTED)  ← "진행 중"
    ├─ [query 4] 2x countByDrafterIdAndStatus(APPROVED + REJECTED)
    ├─ [query 5] approvalLineRepository.findPendingByApproverId(userId, Page(0,5))
    └─ [query 6] documentRepository.findByDrafterId(userId, Page(0,5))
    │
    ▼ DashboardSummaryResponse(pendingCount, draftCount, submittedCount,
                                completedCount, recentPending, recentDocuments)
    │
    ▼ 프론트 렌더
DashboardPage:
    ├─ CountCard ×4  (pending / draft / submitted / completed)
    ├─ PendingList       ← 5 items
    └─ RecentDocumentsList ← 5 items
```

---

## 필수 변경사항 (New vs Modified)

### Backend

#### 신규 파일

| 파일 | 목적 |
|------|------|
| `backend/src/main/resources/templates/email/approval-submit.html` | 상신 알림 이메일 |
| `backend/src/main/resources/templates/email/approval-approve.html` | 중간 승인 |
| `backend/src/main/resources/templates/email/approval-final-approve.html` | 최종 승인 (기안자) |
| `backend/src/main/resources/templates/email/approval-reject.html` | 반려 |
| `backend/src/main/resources/templates/email/approval-withdraw.html` | 회수 |
| `backend/src/main/java/com/micesign/service/ApprovalEmailSender.java` | @Retryable 격리 컴포넌트 (JavaMailSender wrapper) |
| `backend/src/main/resources/db/migration/V19__add_fulltext_search_indexes.sql` | (조건부) FULLTEXT 인덱스 — 성능 실측 후 결정 |

#### 수정 파일

| 파일 | 변경 내용 |
|------|----------|
| `service/EmailService.java` | stub 제거 → `SpringTemplateEngine` + `ApprovalEmailSender` 주입, Thymeleaf 렌더 + 실발송, `@Transactional(REQUIRES_NEW)` 추가, `NotificationLog.retryCount` 업데이트 |
| `dto/document/DocumentSearchCondition.java` | `drafterId` 필드 추가 (record 이므로 호출부 전수 영향) |
| `repository/DocumentRepositoryCustomImpl.java` | `drafterId` BooleanBuilder 조건 추가 |
| `controller/DocumentController.java` | `/search` 엔드포인트에 `@RequestParam(required=false) Long drafterId` 추가 |
| `application.yml` (+ `-prod.yml`) | `spring.mail.host`, `spring.mail.username`, `spring.mail.password` 실 설정 |

#### 변경 없음 (확인용)

- `DocumentService.java` — 이벤트 발행은 이미 이루어짐
- `ApprovalService.java` — 이벤트 발행 이미 이루어짐
- `AsyncConfig.java` — 스레드 풀 그대로 사용
- `DashboardService.java` — 필드 모두 이미 반환중
- `ApprovalNotificationEvent.java` — 이벤트 스키마 확정
- `NotificationLog` / `NotificationStatus` / `NotificationEventType` 도메인

### Frontend

#### 신규 파일 (선택적)

| 파일 | 목적 |
|------|------|
| `features/document/components/DrafterCombobox.tsx` | 기안자 필터 autocomplete |
| `features/admin/presets/meeting-minutes.json` (or 유사) | CUSTOM 프리셋 확충 |
| `features/admin/pages/NotificationLogPage.tsx` | (선택) 알림 로그 조회 UI — backend 컨트롤러는 이미 있음 |

#### 수정 파일

| 파일 | 변경 내용 |
|------|----------|
| `features/dashboard/pages/DashboardPage.tsx` | 4번째 "진행 중" CountCard 추가 (`submittedCount` 바인딩) |
| `features/document/pages/DocumentListPage.tsx` | 기안자 필터 UI 추가, placeholder 문구 갱신 |
| `features/document/types/document.ts` | `DocumentSearchParams` 에 `drafterId?: number` |
| `features/document/api/documentApi.ts` | query param 전달 |
| `features/document/hooks/useDocuments.ts` | queryKey 에 `drafterId` 포함 |
| `features/admin/presets/index.ts` | 신규 프리셋 등록 (추가 시) |
| `features/approval/hooks/useApprovals.ts` | 승인/반려 mutation 성공 시 `queryClient.invalidateQueries(['dashboard'])` |
| `frontend/src/i18n/dashboard.ko.*` | "진행 중" / "inProgress" label 추가 |

---

## 빌드 순서 (Phase Ordering)

**의존성 다이어그램:**
```
[Phase A: SMTP 이벤트 검증]
    ├─ 기존 publishEvent() 호출부 5곳 AFTER_COMMIT 동작 E2E 테스트 (MailHog)
    └─ notification_log 저장 확인
        │
        ▼
[Phase B: Thymeleaf 템플릿 5개 + EmailService 실발송]
    ├─ templates/email/approval-*.html 5개
    ├─ EmailService: log-stub → SpringTemplateEngine + JavaMailSender 전환
    └─ application.yml SMTP 설정 (개발: MailHog / 운영: 실제 SMTP)
        │
        ▼
[Phase C: 재시도 + 실패 추적]
    ├─ ApprovalEmailSender 별도 @Component 로 @Retryable 격리
    ├─ notification_log.retry_count, error_message 업데이트
    └─ (선택) @Scheduled 재발송 잡
        │
        ┕━━━━━━━━━━━━━━━━━━━━━━━━ (병렬 가능 시점부터) ━━━━━━━━━━━━━
        
[Phase D: 검색 확장 — drafterId 필터]  ← 독립, 언제든 가능
    ├─ Backend: Condition + RepositoryImpl + Controller
    ├─ Frontend: DrafterCombobox + filter state
    └─ 성능 실측 → FULLTEXT 인덱스 여부 결정

[Phase E: 대시보드 "진행 중" 카드]  ← 독립, 가장 빠름 (FE 1 파일)
    └─ DashboardPage 에 CountCard 추가

[Phase F: 양식 확장 — 프리셋 1~2개]  ← 독립, 가장 간단
    └─ presets/*.json + presets/index.ts

[Phase G: E2E 테스트 + 성능 검증]
    ├─ SMTP 전체 플로우(MailHog) 5개 이벤트 시나리오
    ├─ 검색 ≤ 1초 목표 측정
    └─ 대시보드 렌더 속도
```

### 권장 순서 근거

1. **SMTP 우선(A → B → C)** — 가장 복잡, 의존성(템플릿 ← EmailService 실발송 ← 재시도) 있음. 이벤트 발행은 이미 구현되어 있으므로 실제로는 "listener 완성" 만 필요.
2. **검색(D)** 과 **대시보드(E)** 는 **독립** — SMTP 와 병렬 가능. 개인 개발자라면 D/E 를 휴식 사이클로 두고 SMTP 난제와 번갈아가며 작업하는 전략 권장.
3. **양식(F)** 가장 마지막 또는 skip — 위험도 낮고 언제든 추가 가능. 관리자 피드백 수집 후 결정이 합리적.
4. **E2E 검증(G)** 각 Phase 마다 인크리멘털하게 — 특히 SMTP 는 MailHog 로 개발환경 검증 후 운영 SMTP 로 전환.

### 의존성 체크리스트

- [x] `spring-boot-starter-mail` 의존성 (이미 선언됨)
- [x] `spring-boot-starter-thymeleaf` 의존성 (이미 선언됨)
- [x] `spring-retry` + `spring-boot-starter-aop` (이미 선언됨)
- [x] `AsyncConfig` (이미 활성)
- [x] `ApplicationEventPublisher` 주입 (이미 두 서비스에 완료)
- [x] `NotificationLog` 엔티티 + 스키마 (이미 DDL V1 에 존재)
- [x] `notification_log.retry_count` 컬럼 (이미 존재)
- [ ] SMTP 실 계정 또는 MailHog (dev) — **환경 설정 필요**
- [ ] `app.base-url` 환경변수 운영/개발 구분 (`application-prod.yml` 점검)

---

## Architectural Patterns — 유지·적용

### Pattern 1: POJO Domain Event + AFTER_COMMIT + @Async (검증된 v1.0 패턴)

**이미 사용 중 — v1.2 에서도 동일 패턴 유지.**

```java
// 1. 이벤트 선언 (POJO)
public class ApprovalNotificationEvent {
    private final Long documentId;
    private final String eventType;
    private final Long actorId;
    // ... constructor, getters
}

// 2. 발행 (트랜잭션 내부)
@Service
public class DocumentService {
    private final ApplicationEventPublisher eventPublisher;
    
    @Transactional
    public DocumentDetailResponse submitDocument(Long docId, Long userId) {
        // ... 비즈니스 로직
        eventPublisher.publishEvent(
            new ApprovalNotificationEvent(docId, "SUBMIT", userId));
        return response; // TX COMMIT 이 일어나야 listener 호출
    }
}

// 3. 리스너 (트랜잭션 밖, 비동기)
@Service
public class EmailService {
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    @Async
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void sendNotification(ApprovalNotificationEvent event) {
        // 메일 발송. 예외는 로그만 — 원 Tx 는 이미 커밋됨
    }
}
```

**이 패턴이 적합한 이유 (v1.0 결정 그대로 유효):**
- 알림 실패가 결재 흐름을 막지 않아야 함 (SRP)
- 메일 발송이 느려도 API 응답 시간 무관
- 확장 용이 — 추후 Slack, SMS 등을 동일 이벤트에 listener 추가만 하면 됨

**Trade-off:**
- 이벤트 발행 후 Tx 커밋 전 앱 crash 시 이벤트 **손실 가능** (현재 in-memory ApplicationEventPublisher 는 durability 없음)
- 50 user 규모에서 수용 가능 — 실패 시 추적을 위해 `notification_log` PENDING 상태를 Tx 내부에서 먼저 INSERT 하고 listener 에서 업데이트하는 outbox-lite 패턴도 고려 가능 (v1.2 에서는 과잉)

### Pattern 2: QueryDSL + BooleanBuilder + Projections.constructor (검증된 검색 패턴)

**이미 사용 중.**

```java
public class DocumentRepositoryCustomImpl implements DocumentRepositoryCustom {
    @Override
    public Page<DocumentResponse> searchDocuments(DocumentSearchCondition c, ...) {
        QDocument doc = QDocument.document;
        BooleanBuilder where = new BooleanBuilder();
        
        if (c.keyword() != null) { where.and(...); }
        if (c.status() != null) { where.and(doc.status.eq(...)); }
        // ... 다중 optional 조건 조립
        
        Long total = queryFactory.select(doc.count()).from(doc)...fetchOne();
        List<DocumentResponse> content = queryFactory
            .select(Projections.constructor(DocumentResponse.class, ...))
            .from(doc).where(where).offset(...).limit(...).fetch();
        
        return new PageImpl<>(content, pageable, total);
    }
}
```

**v1.2 drafterId 추가는 2~3줄 변경.**

### Pattern 3: CustomUserDetails + RBAC Guard (검증)

```java
@GetMapping("/search")
public ResponseEntity<...> searchDocuments(
        @RequestParam ...,
        @AuthenticationPrincipal CustomUserDetails user) {
    UserRole role = UserRole.valueOf(user.getRole());
    if ("all".equalsIgnoreCase(tab) && role != UserRole.SUPER_ADMIN && role != UserRole.ADMIN) {
        throw new BusinessException("AUTH_FORBIDDEN", "권한이 없습니다.", 403);
    }
    // ...
}
```

### Pattern 4: DTO ↔ Entity 매핑 (MapStruct)

`DocumentMapper` 이미 `mapper/` 에 존재. 신규 매핑 필요시 동일 패턴 추가.

---

## Anti-Patterns — 피해야 할 설계

### Anti-Pattern 1: EmailService 내부에서 `@Transactional` 누락

**실수:** `@TransactionalEventListener(AFTER_COMMIT)` + `@Async` 리스너는 **원 Tx 가 이미 끝난 상태**에서 실행됨. 이 안에서 `notificationLogRepository.save()` 를 호출하면 Hibernate 가 Tx 없이 flush 를 시도하여 런타임에서 `TransactionRequiredException` 또는 조용한 실패를 일으킬 수 있다.

**해결:** 리스너 메서드에 `@Transactional(propagation = Propagation.REQUIRES_NEW)` 명시.

```java
@TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
@Async
@Transactional(propagation = Propagation.REQUIRES_NEW)  // ← 중요
public void sendNotification(ApprovalNotificationEvent event) { ... }
```

### Anti-Pattern 2: 동일 클래스 안에서 `@Async` / `@Retryable` 메서드를 self-invoke

**실수:**
```java
@Service
public class EmailService {
    @TransactionalEventListener(AFTER_COMMIT) @Async
    public void sendNotification(...) {
        for (User u : recipients) {
            this.sendToRecipient(u, ...);  // ← 프록시 우회, @Retryable 동작 안 함
        }
    }
    @Retryable(...)
    private void sendToRecipient(...) { ... }
}
```

**해결:** `ApprovalEmailSender` 빈을 별도 `@Component` 로 분리하여 주입하거나 `RetryTemplate` 프로그래매틱 사용.

### Anti-Pattern 3: 검색 API 에 `/api/documents/search` POST 도입

**실수:** "복잡한 검색은 POST" 라는 일반화로 리팩터링. URL bookmarking, 브라우저 history, CDN 캐싱 모두 잃음.

**해결:** 현재 GET 유지. 파라미터 수가 10개를 넘거나 JSON 구조가 필요해질 때만 재검토.

### Anti-Pattern 4: 대시보드에 `@Cacheable` 추가

**실수:** "성능을 위해 캐시" 라는 방어적 최적화. userId-per-key 캐시는 히트율 낮고 무효화 로직이 결재 승인/반려/상신 경로에 침투함.

**해결:** TanStack Query staleTime(30초~5분) 으로 충분. Backend 캐시는 트래픽이 실제로 문제가 될 때 도입.

### Anti-Pattern 5: 전문검색을 v1.2 에서 body_html LIKE 로 박제

**실수:** `WHERE body_html LIKE '%검색어%'` 를 `document_content` 에 추가 → MariaDB 풀 테이블 스캔, 10K 문서에서 초 단위 지연.

**해결:** v1.2 에서는 `document.title` + `document.doc_number` + `user.name` LIKE 만 유지. body 검색은 v1.3 이후 FULLTEXT INDEX(ngram parser) 또는 별도 검색 엔진 결정.

### Anti-Pattern 6: 하드코딩 양식과 CUSTOM 프리셋 혼동

**실수:** CUSTOM 빌더로 만들 수 있는 양식을 하드코딩 컴포넌트로 추가 → 번역·테스트·스키마·Zod·registry 등록 등 6개 파일 수정, 유지보수 비용 증가.

**해결:** 하드코딩 기준(예산 연동 / 특수 UI) 을 통과하지 않으면 프리셋 JSON 만 추가.

---

## Scaling Considerations

| 사용자/문서 규모 | 필요 조정 |
|---|---|
| **~50 user, <10K 문서** (현재) | 현 아키텍처 그대로 충분. SMTP 큐는 메모리(AsyncConfig, queue 100) 로 OK |
| **50~500 user, 10K~100K 문서** | FULLTEXT INDEX 추가, notification queue 는 여전히 in-memory OK (메일 발송률 낮음), TanStack Query cache 조정 |
| **500+ user, 100K+ 문서** | 메시지 큐(RabbitMQ/Redis Streams) 로 이메일 전용, cursor pagination, 검색 Elasticsearch, Dashboard 집계 materialized view |

**첫 번째 병목 예측:** 전문검색 LIKE 성능. 10K 문서 임계치.

**두 번째 병목:** 영구 로그 테이블 크기(`audit_log`, `notification_log`). 파티셔닝 검토.

---

## Integration Points

### External Services

| 서비스 | 통합 방식 | v1.2 변경점 |
|-------|----------|-----------|
| SMTP server | `JavaMailSender` autowired (host/user/pass in `application.yml`) + `@Retryable`. MailHog 추천(dev) | 신규 설정 필요 |
| Google Drive API v3 | 기존 `GoogleDriveService` (Service Account) | 변경 없음 |
| Budget API | `BudgetIntegrationService` + `@Retryable` + `BudgetIntegrationEvent` | 변경 없음 |
| 회원 등록 알림 | `RegistrationEmailService` (실 SMTP 발송 이미 구현) | SMTP 공통 설정 공유 |

### Internal Boundaries

| 경계 | 통신 방식 | 주석 |
|-----|----------|-----|
| `DocumentService` → `EmailService` | POJO event (loose coupling) | 변경 없음 |
| `ApprovalService` → `EmailService` | POJO event | 변경 없음 |
| `EmailService` → `ApprovalEmailSender` | 직접 주입 (프록시 경계) | 신규 |
| `DocumentController` → `DocumentService` | 직접 호출 (@AuthenticationPrincipal → userId/role 전달) | 변경 없음 |
| Frontend ↔ Backend | REST `/api/v1/*` + JWT | 변경 없음 |
| Frontend cache 관리 | TanStack Query `queryKey` + mutation invalidation | `dashboard` invalidate 추가 |

---

## Sources

- 실 코드베이스 파일 검증 (2026-04-22)
  - `backend/src/main/java/com/micesign/service/EmailService.java` — stub 현황
  - `backend/src/main/java/com/micesign/service/RegistrationEmailService.java` — Thymeleaf + SMTP 참조 구현
  - `backend/src/main/java/com/micesign/service/DocumentService.java` — publishEvent 2곳
  - `backend/src/main/java/com/micesign/service/ApprovalService.java` — publishEvent 2곳 (approve 분기 포함 효과적 3곳)
  - `backend/src/main/java/com/micesign/repository/DocumentRepositoryCustomImpl.java` — 검색 QueryDSL
  - `backend/src/main/java/com/micesign/service/DashboardService.java` — 대시보드 집계
  - `backend/src/main/java/com/micesign/config/AsyncConfig.java` — 스레드 풀
  - `backend/build.gradle.kts` — `spring-boot-starter-mail`, `thymeleaf`, `spring-retry` 의존성 확인
  - `backend/src/main/resources/db/migration/V18__add_additional_templates.sql` — 추가 양식 완료
  - `backend/src/main/resources/templates/email/registration-*.html` — 템플릿 참조
  - `backend/src/main/resources/application.yml` — mail 설정 뼈대
  - `frontend/src/features/document/pages/DocumentListPage.tsx` — 검색 UI 완성도
  - `frontend/src/features/dashboard/pages/DashboardPage.tsx` — 3-카드 현 구성
  - `frontend/src/features/document/components/templates/templateRegistry.ts` — 6 양식 등록
- Spring Framework: `@TransactionalEventListener` (Spring 6 docs) — HIGH
- Spring Boot: autoconfiguration of `JavaMailSender`, `SpringTemplateEngine` — HIGH
- PRD §9 알림 시스템, §11 DDL, §12 API — HIGH (internal)
- FSD v1.0 — 에러코드, 재시도 정책 — HIGH (internal)

---

*Architecture research for: MiceSign v1.2 Phase 1-B (통합)*
*Researched: 2026-04-22*
*Confidence: HIGH — 실 코드베이스 전수 조사 기반*

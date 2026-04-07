# Phase 17: Budget Integration - Research

**Researched:** 2026-04-07
**Domain:** Spring Boot 비동기 이벤트 기반 외부 REST API 연동, spring-retry, Flyway 마이그레이션
**Confidence:** HIGH

## Summary

Phase 17은 재무 관련 문서(지출 결의서, 구매 요청서, 출장 보고서, 연장 근무 신청서) 제출 시 외부 예산 시스템에 비동기적으로 데이터를 전송하는 기능을 구현한다. 기존 프로젝트에 이미 확립된 패턴들 ---- `@TransactionalEventListener` + `@Async` (NotificationService), POJO 이벤트 (ApprovalNotificationEvent), Strategy 패턴 (FormValidationStrategy) ---- 을 거의 그대로 복제하여 적용할 수 있어 기술적 위험이 낮다.

핵심 추가 의존성은 `spring-retry` (+ `spring-boot-starter-aop`)뿐이며, Spring Boot 3.5.x BOM에서 버전이 관리된다. RestClient는 Spring Boot 3.5에 내장되어 별도 의존성이 필요 없다. Mock/Real 전환은 `@Profile` 기반 인터페이스 구현으로 해결한다.

**Primary recommendation:** 기존 NotificationService 패턴을 그대로 복제하되, 재시도 로직만 spring-retry의 `@Retryable`로 선언적으로 처리. AOP 레이어 분리(D-08)를 반드시 준수하여 self-invocation 문제를 방지.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** 일반적인 REST 패턴(POST /api/budget/expenses)으로 인터페이스 설계, 나중에 실제 스펙에 맞춰 조정
- **D-02:** HTTP 클라이언트로 Spring Boot 3.x 내장 RestClient 사용
- **D-03:** 외부 API 설정(base URL, timeout, 인증 정보)은 application.yml에서 관리
- **D-04:** RestClient timeout: connectTimeout=3초, readTimeout=5초
- **D-05:** BudgetApiClient 인터페이스 + MockBudgetApiClient(@Profile("!prod")) + RealBudgetApiClient(@Profile("prod"))
- **D-06:** @TransactionalEventListener(phase=AFTER_COMMIT) 비동기 이벤트 방식
- **D-07:** 호출 시점 = 문서 제출 시(DRAFT -> SUBMITTED)
- **D-08:** @Async는 BudgetIntegrationService.handleBudgetEvent()에만, @Retryable은 BudgetApiClient.sendExpenseData()에만 적용
- **D-09:** handleBudgetEvent()에서 try-catch 감싸기
- **D-10:** REJECTED/WITHDRAWN 시 BudgetCancellationEvent 발행
- **D-11:** ApprovalService.reject() + DocumentService.withdrawDocument() 둘 다에서 취소 이벤트 발행
- **D-12:** 취소도 동일한 비동기 + 재시도 패턴
- **D-13:** 대상 양식 4개: EXPENSE, PURCHASE, BUSINESS_TRIP, OVERTIME
- **D-14:** ApprovalTemplate에 budget_enabled boolean 컬럼 추가
- **D-15:** Flyway V12 마이그레이션으로 4개 템플릿 budget_enabled = true
- **D-16:** 새 템플릿 budget_enabled 기본값 false
- **D-17:** templateCode별 고정 키 매핑 (BudgetDataExtractor + Map<String, BudgetDataMapper>)
- **D-18:** 공통 필드 + details 확장 구조 DTO
- **D-19:** spring-retry @Retryable(maxAttempts=3, backoff=2초)
- **D-20:** 최종 실패 시 FAILED 로그 + SUPER_ADMIN SMTP 알림
- **D-21:** 문서 제출은 예산 API 성공/실패와 무관하게 정상 진행
- **D-22:** budget_integration_log 전용 테이블
- **D-23:** 요청/응답 payload 모두 저장
- **D-24:** 최종 결과만 1건 INSERT, attempt_count 기록
- **D-25:** 로그 무기한 보존
- **D-26:** Flyway V12__add_budget_integration.sql
- **D-27:** budget_enabled 컬럼 + budget_integration_log 테이블 생성
- **D-28:** Unit + Integration 테스트

### Claude's Discretion
- 재시도 backoff 정확한 설정값 (2초 기반)
- BudgetIntegrationService 내부 메서드 구조
- 알림 메일 Thymeleaf 템플릿 디자인
- budget_integration_log 인덱스 설계

### Deferred Ideas (OUT OF SCOPE)
- 관리자 수동 재시도 UI/엔드포인트 (FAILED 건 재처리)
- Circuit breaker 패턴
- 동적 템플릿의 budget 필드 자동 감지
- 스키마 버전별 매핑 전략
- 예산 시스템 대시보드/통계
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| BDGT-01 | 재무 문서 제출 시 외부 예산 시스템에 REST API로 expense 데이터 전송 | D-01~D-09, D-13~D-18: 이벤트 기반 비동기 전송, RestClient, Mock/Real 전환, 데이터 추출 전략 |
| BDGT-02 | 실패 시 재시도(설정된 횟수까지) + 모든 시도 로깅, 문서 제출 워크플로우 차단 없음 | D-19~D-25: spring-retry, budget_integration_log 테이블, 비동기 분리 |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| spring-retry | 2.0.x (Boot 관리) | 선언적 재시도 (@Retryable) | Spring 공식 재시도 라이브러리, Boot BOM에서 버전 관리 [VERIFIED: central.sonatype.com -- latest 2.0.12] |
| spring-boot-starter-aop | 3.5.13 (Boot 관리) | @Retryable AOP 프록시 지원 | spring-retry가 AOP 프록시 필요, 현재 프로젝트에 미포함 [VERIFIED: build.gradle.kts에 aop starter 없음] |
| RestClient | Spring Boot 3.5 내장 | 외부 예산 API HTTP 호출 | Spring 6.1+의 동기 HTTP 클라이언트, 별도 의존성 불필요 [VERIFIED: Spring Boot 3.5.13 사용 중] |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Jackson (ObjectMapper) | Boot 내장 | formData JSON 파싱 및 payload 생성 | BudgetDataExtractor에서 JSON 키 추출 시 |
| Thymeleaf (SpringTemplateEngine) | 기존 설치됨 | 실패 알림 이메일 템플릿 | SUPER_ADMIN 알림 메일 렌더링 시 (EmailService 재사용) |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| spring-retry | 수동 재시도 루프 (NotificationService 방식) | 현재 NotificationService가 수동 루프 사용 중이나 D-19에서 @Retryable 사용 결정됨. 선언적이고 backoff 전략 변경 용이 |
| RestClient | WebClient | WebClient는 reactive stack 의존. D-02에서 RestClient 결정됨 |

**Installation:**
```bash
# build.gradle.kts에 추가
implementation("org.springframework.retry:spring-retry")
implementation("org.springframework.boot:spring-boot-starter-aop")
```

**Version verification:** spring-retry 버전은 Spring Boot 3.5.x BOM에서 자동 관리됨. spring-boot-starter-aop도 Boot 버전과 동일하게 관리됨. [VERIFIED: Spring Boot 4.0 Migration Guide에서 spring-retry 관리가 4.0에서 제거됨 -- 3.5.x에서는 여전히 관리됨]

## Architecture Patterns

### Recommended Project Structure
```
backend/src/main/java/com/micesign/
├── event/
│   ├── BudgetIntegrationEvent.java     # 제출 시 발행 이벤트 POJO
│   └── BudgetCancellationEvent.java    # 반려/회수 시 발행 이벤트 POJO
├── budget/
│   ├── BudgetApiClient.java            # 인터페이스
│   ├── MockBudgetApiClient.java        # @Profile("!prod") 구현
│   ├── RealBudgetApiClient.java        # @Profile("prod") 구현
│   ├── BudgetIntegrationService.java   # @Async 이벤트 핸들러
│   ├── BudgetDataExtractor.java        # templateCode별 JSON 매핑
│   ├── BudgetExpenseRequest.java       # 공통 + details DTO
│   └── BudgetCancellationRequest.java  # 취소 요청 DTO
├── domain/
│   └── BudgetIntegrationLog.java       # 로그 엔티티
├── repository/
│   └── BudgetIntegrationLogRepository.java
└── config/
    └── RetryConfig.java                # @EnableRetry 설정
```

### Pattern 1: @TransactionalEventListener + @Async (기존 확립)
**What:** 트랜잭션 커밋 후 비동기 이벤트 처리
**When to use:** 메인 트랜잭션과 분리된 부가 작업 (알림, 외부 API 호출)
**Example:**
```java
// Source: NotificationService.java line 55-57 (기존 코드)
@TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
@Async
public void handleBudgetEvent(BudgetIntegrationEvent event) {
    // @Async 스레드에서 document를 ID로 재조회 (LazyInitializationException 방지)
    // D-09: try-catch로 감싸서 예외 유실 방지
}
```

### Pattern 2: AOP 레이어 분리 (D-08 핵심)
**What:** @Async와 @Retryable을 서로 다른 Bean 메서드에 분리
**When to use:** self-invocation 문제 방지. 같은 클래스 내 메서드 호출은 AOP 프록시를 거치지 않음
**Example:**
```java
// BudgetIntegrationService (@Async만)
@Async
public void handleBudgetEvent(BudgetIntegrationEvent event) {
    // ... 준비 로직 ...
    budgetApiClient.sendExpenseData(request); // 다른 Bean 호출 -> AOP 프록시 동작
}

// BudgetApiClient 구현체 (@Retryable만)
@Retryable(maxAttempts = 3, backoff = @Backoff(delay = 2000))
public BudgetApiResponse sendExpenseData(BudgetExpenseRequest request) {
    // RestClient 호출
}

@Recover
public BudgetApiResponse recoverSendExpenseData(Exception e, BudgetExpenseRequest request) {
    // 최종 실패 처리 -> 로그 기록
    return null; // or throw
}
```

### Pattern 3: Strategy 패턴 데이터 추출 (DocumentFormValidator 참고)
**What:** templateCode별로 JSON에서 budget 데이터를 추출하는 매퍼 맵
**When to use:** 4개 템플릿별로 formData JSON 키 구조가 다를 때
**Example:**
```java
// Source: DocumentFormValidator.java의 Map<String, FormValidationStrategy> 패턴 참고
public class BudgetDataExtractor {
    private final Map<String, BudgetDataMapper> mappers;
    // EXPENSE: items, totalAmount
    // PURCHASE: items, totalAmount, supplier, deliveryDate
    // BUSINESS_TRIP: expenses, totalExpense, destination, startDate/endDate
    // OVERTIME: hours (hourlyRate는 formData에 없을 수 있음 -- 주의)
}
```

### Anti-Patterns to Avoid
- **Self-invocation:** @Retryable 메서드를 같은 클래스 내에서 호출하면 AOP 프록시를 우회하여 재시도가 동작하지 않음. D-08이 이를 방지
- **@Async 스레드에서 Lazy 엔티티 접근:** Hibernate 세션이 닫혀 LazyInitializationException 발생. document ID로 재조회 필요 (NotificationService line 59-60 패턴)
- **@Recover 메서드 시그니처 불일치:** @Recover 메서드는 첫 번째 파라미터가 Exception, 나머지는 @Retryable 메서드와 동일해야 함

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| 재시도 로직 | 수동 for 루프 + Thread.sleep | spring-retry @Retryable | backoff 전략, maxAttempts, @Recover 등 선언적 관리. NotificationService의 수동 재시도보다 깔끔 |
| HTTP 클라이언트 | HttpURLConnection | RestClient (Boot 내장) | timeout, error handling, JSON 직렬화 자동 처리 |
| 비동기 이벤트 | 직접 Thread 생성 | @TransactionalEventListener + @Async | 스레드 풀 관리, 트랜잭션 경계 자동 처리 |

**Key insight:** 이 Phase의 대부분은 기존 NotificationService 패턴의 변형이다. 새로운 기술은 spring-retry뿐이며, 나머지는 이미 확립된 패턴을 복제한다.

## Common Pitfalls

### Pitfall 1: @Retryable + @Async Self-Invocation
**What goes wrong:** 같은 Bean 내에서 @Retryable 메서드를 호출하면 AOP 프록시를 거치지 않아 재시도가 작동하지 않음
**Why it happens:** Spring AOP는 외부 호출만 인터셉트함
**How to avoid:** D-08 결정대로 @Async는 BudgetIntegrationService, @Retryable은 BudgetApiClient로 분리
**Warning signs:** 재시도 없이 한 번에 실패하는 경우 self-invocation 의심

### Pitfall 2: @EnableRetry 누락
**What goes wrong:** @Retryable 어노테이션이 무시됨
**Why it happens:** spring-retry는 @EnableRetry 없이 자동 활성화되지 않음
**How to avoid:** RetryConfig 클래스에 @EnableRetry 추가
**Warning signs:** 재시도 로그가 없이 바로 실패

### Pitfall 3: spring-boot-starter-aop 의존성 누락
**What goes wrong:** @Retryable이 동작하지 않거나 BeanCreationException 발생
**Why it happens:** spring-retry는 AOP 프록시가 필요한데, 현재 build.gradle.kts에 aop starter가 없음 [VERIFIED: build.gradle.kts 확인]
**How to avoid:** spring-boot-starter-aop 의존성 반드시 추가
**Warning signs:** 앱 시작 시 AOP 관련 에러, 또는 @Retryable이 무시됨

### Pitfall 4: OVERTIME 양식의 totalAmount 부재
**What goes wrong:** BudgetExpenseRequest에 totalAmount가 필수인데 OVERTIME formData에는 hours만 있고 hourlyRate/totalAmount가 없을 수 있음
**Why it happens:** OVERTIME 양식 스펙에는 hours, reason만 있고 금액 필드가 없음 [VERIFIED: OvertimeFormValidator.java]
**How to avoid:** OVERTIME 매퍼에서 totalAmount 대신 hours만 전송하거나, totalAmount를 0으로 설정하는 명시적 처리 필요. D-17에서 "hours/hourlyRate"로 정의했으나, formData에 hourlyRate 필드가 실제로 존재하지 않음
**Warning signs:** OVERTIME 문서 제출 시 NullPointerException 또는 0원 전송

### Pitfall 5: UserRepository에 findByRole 메서드 미존재
**What goes wrong:** D-20의 SUPER_ADMIN 전원 알림 발송 시 쿼리 메서드가 없음
**Why it happens:** 기존에 역할별 사용자 조회 기능이 필요 없었음 [VERIFIED: UserRepository.java에 findByRole 없음]
**How to avoid:** UserRepository에 `List<User> findByRole(UserRole role)` 추가 필요
**Warning signs:** 컴파일 에러

### Pitfall 6: Flyway 마이그레이션 버전 충돌
**What goes wrong:** 기존 V6, V8, V9에 중복 파일이 존재함 [VERIFIED: migration 디렉토리에 V6 2개, V8 2개, V9 2개]
**Why it happens:** 이전 Phase에서 마이그레이션 파일 충돌이 해결되지 않은 상태
**How to avoid:** V12를 사용하되, 기존 마이그레이션 파일의 checksum이 DB와 일치하는지 확인. 개발 환경에서 `flyway.validateMigrationNaming=false` 또는 repair 필요할 수 있음
**Warning signs:** FlywayException: Found more than one migration with version X

### Pitfall 7: @Recover 반환 타입 불일치
**What goes wrong:** @Recover 메서드가 호출되지 않음
**Why it happens:** @Recover 메서드의 반환 타입이 @Retryable 메서드와 다르면 매칭 실패
**How to avoid:** @Retryable과 @Recover의 반환 타입을 정확히 일치시킴
**Warning signs:** 재시도 소진 후에도 @Recover가 호출되지 않고 예외가 전파됨

## Code Examples

### 기존 이벤트 발행 패턴 (DocumentService.submitDocument() line 219)
```java
// Source: DocumentService.java line 219-220
applicationEventPublisher.publishEvent(
        new ApprovalNotificationEvent(document, NotificationEventType.SUBMIT, userId, null));
// 여기 바로 뒤에 BudgetIntegrationEvent 발행 추가
```

### 기존 이벤트 핸들러 패턴 (NotificationService line 55-78)
```java
// Source: NotificationService.java line 55-78
@TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
@Async
public void handleNotificationEvent(ApprovalNotificationEvent event) {
    try {
        Document document = documentRepository.findByIdWithDrafter(event.getDocument().getId())
                .orElse(null);
        // ... 처리 로직 ...
    } catch (Exception e) {
        log.error("...", e);
    }
}
```

### formData JSON 키 구조 (4개 대상 양식)
```json
// EXPENSE: { "items": [...], "totalAmount": 50000 }
// PURCHASE: { "supplier": "...", "deliveryDate": "...", "purchaseReason": "...", "items": [...], "totalAmount": 100000 }
// BUSINESS_TRIP: { "destination": "...", "startDate": "...", "endDate": "...", "purpose": "...", "itinerary": [...], "expenses": [...], "totalExpense": 30000 }
// OVERTIME: { "workDate": "...", "startTime": "...", "endTime": "...", "hours": 3.0, "reason": "..." }
```
[VERIFIED: ExpenseFormValidator, PurchaseFormValidator, BusinessTripFormValidator, OvertimeFormValidator 코드에서 확인]

### @Retryable + @Recover 패턴
```java
// Source: spring-retry 공식 패턴 [ASSUMED]
@Retryable(
    retryFor = {RestClientException.class},
    maxAttempts = 3,
    backoff = @Backoff(delay = 2000, multiplier = 1.5)
)
public BudgetApiResponse sendExpenseData(BudgetExpenseRequest request) {
    return restClient.post()
        .uri("/api/budget/expenses")
        .body(request)
        .retrieve()
        .body(BudgetApiResponse.class);
}

@Recover
public BudgetApiResponse recoverSendExpenseData(RestClientException e, BudgetExpenseRequest request) {
    log.error("Budget API call failed after retries: {}", e.getMessage());
    return null; // 또는 실패 응답 객체
}
```

### RestClient 설정 패턴
```java
// Source: Spring Boot 3.5 RestClient [ASSUMED]
@Configuration
public class BudgetApiConfig {
    @Bean
    public RestClient budgetRestClient(
            @Value("${budget.api.base-url}") String baseUrl,
            @Value("${budget.api.connect-timeout}") int connectTimeout,
            @Value("${budget.api.read-timeout}") int readTimeout) {
        return RestClient.builder()
            .baseUrl(baseUrl)
            .requestFactory(new SimpleClientHttpRequestFactory() {{
                setConnectTimeout(Duration.ofSeconds(connectTimeout));
                setReadTimeout(Duration.ofSeconds(readTimeout));
            }})
            .build();
    }
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| RestTemplate | RestClient | Spring 6.1 / Boot 3.2 | RestTemplate 유지보수 모드, RestClient가 동기 HTTP 표준 |
| 수동 재시도 루프 | @Retryable 선언적 재시도 | spring-retry 2.0 | 코드 간결, backoff 전략 변경 용이 |
| spring-retry Boot 관리 | 명시적 버전 필요 | Spring Boot 4.0 | 현재 3.5.x에서는 여전히 BOM 관리됨 |

**Deprecated/outdated:**
- RestTemplate: 유지보수 모드. 새 코드에는 RestClient 사용 권장 [ASSUMED]

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | @Retryable의 retryFor 파라미터로 RestClientException.class 지정 가능 | Code Examples | LOW -- spring-retry 표준 기능이나 정확한 예외 클래스명 확인 필요 |
| A2 | RestClient의 timeout 설정이 SimpleClientHttpRequestFactory를 통해 가능 | Code Examples | LOW -- Boot 3.5에서는 ClientHttpRequestFactorySettings 사용할 수도 있음 |
| A3 | Spring Boot 3.5.13 BOM에서 spring-retry 2.0.x 관리 | Standard Stack | LOW -- 4.0에서 제거 확인, 3.5.x는 관리됨이 확실 |
| A4 | @Backoff(delay = 2000, multiplier = 1.5) 문법이 spring-retry 2.0.x에서 유효 | Code Examples | LOW -- spring-retry 표준 backoff 설정 |

**If this table is empty:** N/A -- 위 4건은 모두 LOW risk이며 spring-retry 표준 기능임

## Open Questions

1. **OVERTIME formData에 hourlyRate 필드가 없음**
   - What we know: D-17에서 OVERTIME 매핑을 "hours/hourlyRate"로 정의했으나, 실제 OvertimeFormValidator에는 hours만 있고 hourlyRate/totalAmount 필드가 없음
   - What's unclear: 예산 시스템에 시간 기반 데이터만 보내도 되는지, 아니면 금액 계산이 필요한지
   - Recommendation: OVERTIME은 totalAmount=0 또는 null로 전송하고, hours 정보만 details에 포함. 예산 시스템 측에서 시급 계산 처리

2. **기존 Flyway 마이그레이션 버전 중복 (V6, V8, V9)**
   - What we know: 동일 버전 번호로 2개씩 파일 존재. 개발 DB에서 이미 적용됨 (dev 환경에서 문제 없이 동작 중일 것)
   - What's unclear: DB의 flyway_schema_history 테이블 상태
   - Recommendation: V12는 새 버전이므로 중복 문제 없음. 다만 새 환경에서 DB 초기화 시 충돌 가능 -- 별도 이슈로 추적

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | JUnit 5 + Mockito (Spring Boot Test) |
| Config file | build.gradle.kts (testImplementation 설정 완료) |
| Quick run command | `cd backend && ./gradlew test --tests "com.micesign.budget.*" -x compileQuerydsl` |
| Full suite command | `cd backend && ./gradlew test -x compileQuerydsl` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| BDGT-01 | 재무 문서 제출 시 예산 API 호출 | unit | `./gradlew test --tests "com.micesign.budget.BudgetIntegrationServiceTest"` | Wave 0 |
| BDGT-01 | templateCode별 데이터 추출 | unit | `./gradlew test --tests "com.micesign.budget.BudgetDataExtractorTest"` | Wave 0 |
| BDGT-01 | budget_enabled=false 템플릿은 skip | unit | `./gradlew test --tests "com.micesign.budget.BudgetIntegrationServiceTest#shouldSkipNonBudgetTemplate"` | Wave 0 |
| BDGT-02 | @Retryable 재시도 동작 | integration | `./gradlew test --tests "com.micesign.budget.BudgetRetryIntegrationTest"` | Wave 0 |
| BDGT-02 | 최종 실패 시 FAILED 로그 기록 | unit | `./gradlew test --tests "com.micesign.budget.BudgetIntegrationServiceTest#shouldLogFailedAfterRetries"` | Wave 0 |
| BDGT-01 | 반려/회수 시 취소 이벤트 발행 | unit | `./gradlew test --tests "com.micesign.budget.BudgetIntegrationServiceTest#shouldSendCancellation"` | Wave 0 |

### Sampling Rate
- **Per task commit:** `cd backend && ./gradlew test --tests "com.micesign.budget.*" -x compileQuerydsl`
- **Per wave merge:** `cd backend && ./gradlew test -x compileQuerydsl`
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `backend/src/test/java/com/micesign/budget/BudgetIntegrationServiceTest.java` -- BDGT-01, BDGT-02 unit tests
- [ ] `backend/src/test/java/com/micesign/budget/BudgetDataExtractorTest.java` -- 4개 템플릿 매핑 테스트
- [ ] `backend/src/test/java/com/micesign/budget/BudgetRetryIntegrationTest.java` -- @Retryable 통합 테스트

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | -- |
| V3 Session Management | no | -- |
| V4 Access Control | no | 예산 API는 서버 간 통신, 사용자 접근 없음 |
| V5 Input Validation | yes | formData는 이미 DocumentFormValidator에서 검증됨. BudgetDataExtractor는 검증된 데이터만 처리 |
| V6 Cryptography | no | API 인증 정보는 application.yml에서 환경 변수로 관리 (D-03) |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| 외부 API 인증 정보 노출 | Information Disclosure | application.yml에서 환경 변수로 주입 (${BUDGET_API_KEY}), 코드에 하드코딩 금지 |
| 요청/응답 payload 로그에 민감 정보 | Information Disclosure | budget_integration_log에 저장되는 payload에서 개인정보 마스킹 고려 (현재는 금액 정보 위주라 LOW risk) |
| Mock 클라이언트가 prod에서 활성화 | Spoofing | @Profile("!prod") 조건 확인. prod 환경에서는 반드시 RealBudgetApiClient 활성화 |

## Sources

### Primary (HIGH confidence)
- 기존 코드베이스: NotificationService.java, ApprovalNotificationEvent.java, AsyncConfig.java, DocumentService.java, ApprovalService.java -- 이벤트 발행/처리 패턴
- 기존 코드베이스: ExpenseFormValidator.java, PurchaseFormValidator.java, BusinessTripFormValidator.java, OvertimeFormValidator.java -- formData JSON 키 구조
- 기존 코드베이스: build.gradle.kts -- 현재 의존성, Spring Boot 3.5.13 확인
- 기존 코드베이스: ApprovalTemplate.java -- budget_enabled 컬럼 추가 대상 엔티티

### Secondary (MEDIUM confidence)
- [Sonatype Central](https://central.sonatype.com/artifact/org.springframework.retry/spring-retry) -- spring-retry 최신 버전 2.0.12 확인
- [Spring Boot 4.0 Migration Guide](https://github.com/spring-projects/spring-boot/wiki/Spring-Boot-4.0-Migration-Guide) -- 3.5.x에서 spring-retry BOM 관리 확인

### Tertiary (LOW confidence)
- spring-retry @Retryable/@Recover 정확한 API 시그니처 -- 트레이닝 데이터 기반

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- 2개 의존성만 추가, Boot BOM 관리
- Architecture: HIGH -- 기존 NotificationService 패턴 거의 1:1 복제
- Pitfalls: HIGH -- 코드베이스 검증으로 7개 pitfall 확인
- Data extraction: MEDIUM -- OVERTIME formData의 hourlyRate 부재 이슈 존재

**Research date:** 2026-04-07
**Valid until:** 2026-05-07 (안정적 기술 스택, 30일)

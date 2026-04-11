---
phase: 19-registration-email-notifications
verified: 2026-04-08T13:55:00Z
status: human_needed
score: 4/4 must-haves verified
overrides_applied: 0
human_verification:
  - test: "실제 SMTP 환경에서 등록 신청 시 이메일 수신 확인"
    expected: "신청자 이메일로 '[MiceSign] 등록 신청 접수 확인' 이메일이 수신되어야 한다"
    why_human: "개발 환경에서는 JavaMailSender가 null이므로 로그만 출력됨. 실제 SMTP 발송 여부는 프로덕션 환경에서만 확인 가능"
  - test: "SMTP 발송 실패 시 notification_log에 FAILED 상태 저장 확인"
    expected: "SMTP 연결 실패 시 status=FAILED, errorMessage 저장, 애플리케이션 예외 없음"
    why_human: "SMTP 에러 시나리오는 실제 메일 서버 없이는 테스트 불가"
---

# Phase 19: Registration Email Notifications Verification Report

**Phase Goal:** All registration lifecycle events trigger appropriate email notifications so applicants know their status and admins know about new requests
**Verified:** 2026-04-08T13:55:00Z
**Status:** human_needed
**Re-verification:** No - 초기 검증

## Goal Achievement

### Observable Truths (Roadmap Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|---------|
| 1 | 이메일 인프라가 문서와 무관한 등록 이벤트를 지원한다 (notification_log에 registration_request_id 컬럼, recipient_id nullable) | VERIFIED | `NotificationLog.java` L15-32: recipient_id/recipientEmail nullable=true, registrationRequestId 필드 추가. V16 마이그레이션에서 컬럼 추가 및 FK nullable 변경 확인 |
| 2 | 신청자는 등록 신청 즉시 확인 이메일을 수신한다 | VERIFIED | `RegistrationService.submit()` L89-91: REGISTRATION_SUBMIT 이벤트 발행. `RegistrationEmailService.handleRegistrationEvent()` switch REGISTRATION_SUBMIT에서 `sendSubmitConfirmation()` 호출. 테스트 `test_handleSubmitEvent_sendsConfirmationToApplicant()` 통과 |
| 3 | 신청자는 승인/거부 시 결과 이메일을 수신한다 (거부 시 사유 포함) | VERIFIED | `RegistrationService.approve()` L172-174: REGISTRATION_APPROVE 이벤트. `reject()` L196-198: REGISTRATION_REJECT 이벤트. `sendRejectResult()`에서 `rejectionReason` 변수 전달. 테스트 test_handleApproveEvent, test_handleRejectEvent 통과 |
| 4 | 새 신청 접수 시 모든 SUPER_ADMIN에게 알림 이메일이 발송된다 | VERIFIED | `RegistrationEmailService.notifySuperAdmins()` L130-143: `userRepository.findByRoleAndStatus(UserRole.SUPER_ADMIN, UserStatus.ACTIVE)` 조회 후 각 admin에게 이메일 발송. 테스트 `test_handleSubmitEvent_notifiesSuperAdmins()` 3회 save 확인 |

**Score:** 4/4 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `backend/build.gradle.kts` | spring-boot-starter-mail, thymeleaf 의존성 | VERIFIED | L26-27에서 두 의존성 확인 |
| `backend/src/main/resources/db/migration/V16__extend_notification_log_for_registration.sql` | notification_log 스키마 확장 | VERIFIED | recipient_id BIGINT NULL, registration_request_id 컬럼+인덱스, FK 이름 주석 포함 |
| `backend/src/test/resources/db/testmigration/V7__extend_notification_log_for_registration.sql` | H2 테스트용 스키마 확장 | VERIFIED | ALTER COLUMN recipient_id BIGINT NULL, registration_request_id 추가 |
| `backend/src/main/resources/application.yml` | spring.mail.* 설정, app.base-url | VERIFIED | L25-36: mail 설정(환경변수 기반), L44: base-url 설정 |
| `backend/src/main/java/com/micesign/domain/NotificationLog.java` | recipient nullable, registrationRequestId 필드 | VERIFIED | recipient_id nullable=true, recipientEmail nullable=true, registrationRequestId Long 필드 + getter/setter 완비 |
| `backend/src/main/java/com/micesign/event/RegistrationEventType.java` | 3개 이벤트 타입 enum | VERIFIED | REGISTRATION_SUBMIT, REGISTRATION_APPROVE, REGISTRATION_REJECT 모두 포함 |
| `backend/src/main/java/com/micesign/event/RegistrationNotificationEvent.java` | 이벤트 POJO | VERIFIED | registrationRequestId, eventType 필드 + 생성자 + getter 완비 |
| `backend/src/main/java/com/micesign/service/RegistrationEmailService.java` | 이메일 발송 서비스 | VERIFIED | @TransactionalEventListener(AFTER_COMMIT) + @Async + Optional JavaMailSender(dev/prod 듀얼 모드) + notificationLogRepository.save() + templateEngine.process() |
| `backend/src/main/resources/templates/email/registration-submit.html` | 신청 접수 이메일 템플릿 | VERIFIED | th:text="${name}", th:text="${submittedDate}", xmlns:th, 한국어 |
| `backend/src/main/resources/templates/email/registration-approve.html` | 승인 이메일 템플릿 | VERIFIED | th:text="${name}", th:href="${loginUrl}", th:text="${approvedDate}", 로그인 링크 포함 |
| `backend/src/main/resources/templates/email/registration-reject.html` | 거부 이메일 템플릿 | VERIFIED | th:text="${name}", th:text="${rejectionReason}", 재신청 안내 포함 |
| `backend/src/main/resources/templates/email/registration-admin-notify.html` | SUPER_ADMIN 알림 템플릿 | VERIFIED | th:text="${applicantName}", th:text="${applicantEmail}", th:text="${submittedDate}" |
| `backend/src/main/java/com/micesign/service/RegistrationService.java` | 이벤트 발행이 추가된 등록 서비스 | VERIFIED | submit()/approve()/reject() 각각에 publishEvent() 3회 호출 확인 |
| `backend/src/test/java/com/micesign/registration/RegistrationEmailServiceTest.java` | 이메일 서비스 단위 테스트 | VERIFIED | 8개 테스트, @ExtendWith(MockitoExtension.class), ArgumentCaptor 사용, 전체 통과 |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| RegistrationService.submit() | RegistrationEmailService.handleRegistrationEvent() | ApplicationEventPublisher.publishEvent(REGISTRATION_SUBMIT) | WIRED | RegistrationService L89-91: publishEvent(new RegistrationNotificationEvent(entity.getId(), REGISTRATION_SUBMIT)) |
| RegistrationService.approve() | RegistrationEmailService.handleRegistrationEvent() | ApplicationEventPublisher.publishEvent(REGISTRATION_APPROVE) | WIRED | RegistrationService L172-174: publishEvent(new RegistrationNotificationEvent(reg.getId(), REGISTRATION_APPROVE)) |
| RegistrationService.reject() | RegistrationEmailService.handleRegistrationEvent() | ApplicationEventPublisher.publishEvent(REGISTRATION_REJECT) | WIRED | RegistrationService L196-198: publishEvent(new RegistrationNotificationEvent(reg.getId(), REGISTRATION_REJECT)) |
| RegistrationEmailService | NotificationLog | notificationLogRepository.save() | WIRED | RegistrationEmailService L186: notificationLogRepository.save(notifLog) |
| RegistrationEmailService | Thymeleaf templates | templateEngine.process("email/" + templateName) | WIRED | RegistrationEmailService L168: templateEngine.process("email/" + templateName, ctx) |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| RegistrationEmailService | reg (RegistrationRequest) | registrationRequestRepository.findById() | Yes - DB 조회 | FLOWING |
| RegistrationEmailService | admins (List<User>) | userRepository.findByRoleAndStatus(SUPER_ADMIN, ACTIVE) | Yes - DB 조회 | FLOWING |
| Thymeleaf templates | name, submittedDate 등 | reg.getName(), reg.getCreatedAt() 등 entity 필드에서 직접 추출 | Yes | FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| RegistrationEmailServiceTest 전체 통과 | `./gradlew test --tests '*RegistrationEmailServiceTest*'` | BUILD SUCCESSFUL | PASS |
| 전체 Registration 테스트 통과 | `./gradlew test --tests '*Registration*'` | BUILD SUCCESSFUL in 5s | PASS |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|---------|
| MAIL-01 | 19-01-PLAN.md | 기존 스텁 EmailService를 실제 SMTP 발송으로 교체한다 | SATISFIED | RegistrationEmailService: mailSender null이면 로그, 주입되면 실제 MimeMessageHelper + JavaMailSender.send() 사용. @Autowired(required=false) 패턴으로 dev/prod 듀얼 모드 지원 |
| MAIL-02 | 19-02-PLAN.md | 신청 접수 시 신청자에게 확인 이메일을 발송한다 | SATISFIED | RegistrationService.submit() -> REGISTRATION_SUBMIT 이벤트 -> sendSubmitConfirmation(reg.getEmail()) |
| MAIL-03 | 19-02-PLAN.md | 승인/거부 시 신청자에게 결과 이메일을 발송한다 | SATISFIED | approve() -> REGISTRATION_APPROVE -> sendApproveResult(), reject() -> REGISTRATION_REJECT -> sendRejectResult() (사유 포함) |
| MAIL-04 | 19-02-PLAN.md | 새 신청이 접수되면 SUPER_ADMIN에게 알림 이메일을 발송한다 | SATISFIED | REGISTRATION_SUBMIT -> notifySuperAdmins() -> findByRoleAndStatus(SUPER_ADMIN, ACTIVE) -> 각 admin에게 이메일 |

### Anti-Patterns Found

반환 null, stub, 미연결 패턴 없음. 주요 확인 사항:

| File | Pattern | Severity | Impact |
|------|---------|----------|--------|
| RegistrationEmailService.java | mailSender == null 체크로 dev 모드 진입 | INFO | 의도된 설계 — MAIL_HOST 미설정 시 로그 출력. 프로덕션에서는 환경변수 필수 |

th:utext 사용 없음 (모두 th:text로 XSS 방지 준수), SMTP 비밀번호 환경변수 분리 확인.

### Human Verification Required

#### 1. 실제 SMTP 발송 검증

**Test:** MAIL_HOST, MAIL_USERNAME, MAIL_PASSWORD 환경변수를 실제 SMTP 서버로 설정하고 등록 신청 API를 호출한다
**Expected:** 신청자 이메일 수신함에 '[MiceSign] 등록 신청 접수 확인' 이메일이 도착해야 한다. 한국어 HTML 이메일이 올바르게 렌더링되어야 한다.
**Why human:** 개발 환경에서는 mailSender=null이므로 로그만 출력됨. 실제 SMTP 발송 경로(MimeMessageHelper, 인코딩, 헤더 등)는 자동 검증 불가

#### 2. SMTP 실패 시 graceful degradation 검증

**Test:** MAIL_HOST를 잘못된 값으로 설정하고 등록 신청 API를 호출한다
**Expected:** 이메일 발송 실패 시 notification_log에 status=FAILED, errorMessage 저장. 등록 신청 트랜잭션은 정상 완료되어야 함 (이메일 실패가 등록 차단 금지)
**Why human:** SMTP 연결 실패 시나리오는 실제 네트워크 환경 필요. @TransactionalEventListener(AFTER_COMMIT)로 분리되어 있어 이론적으로 안전하지만 실 환경 확인 필요

### Gaps Summary

갭 없음. 4개 Roadmap Success Criteria 모두 검증됨. MAIL-01~04 요구사항 모두 충족.

자동 검증 결과: 14개 아티팩트 모두 존재하고 실질적 구현 포함, 5개 핵심 연결(key link) 모두 배선 확인, 8개 단위 테스트 전체 통과.

인간 검증이 필요한 이유: 실제 SMTP 발송 경로는 자동 검증 범위 외 (외부 서비스 의존).

---

_Verified: 2026-04-08T13:55:00Z_
_Verifier: Claude (gsd-verifier)_

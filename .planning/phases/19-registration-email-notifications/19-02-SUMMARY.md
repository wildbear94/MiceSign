---
phase: 19-registration-email-notifications
plan: 02
subsystem: registration-email
tags: [event-publishing, email-notification, unit-test]
dependency_graph:
  requires: [19-01]
  provides: [registration-event-pipeline]
  affects: [RegistrationService, RegistrationEmailService]
tech_stack:
  added: []
  patterns: [Spring ApplicationEventPublisher, TransactionalEventListener, Mockito unit testing]
key_files:
  created:
    - backend/src/test/java/com/micesign/registration/RegistrationEmailServiceTest.java
  modified:
    - backend/src/main/java/com/micesign/service/RegistrationService.java
    - backend/src/main/java/com/micesign/service/RegistrationEmailService.java
    - backend/src/test/java/com/micesign/registration/RegistrationServiceTest.java
decisions:
  - "Spring 6.2+에서 @TransactionalEventListener + @Transactional 조합 불가 -> @Transactional 제거"
metrics:
  duration: "4min"
  completed: "2026-04-08T04:46:22Z"
  tasks_completed: 2
  tasks_total: 2
  tests_added: 8
  files_changed: 4
---

# Phase 19 Plan 02: Registration Event Publishing & Email Service Tests Summary

RegistrationService의 submit/approve/reject 메서드에 ApplicationEventPublisher 이벤트 발행을 추가하고, RegistrationEmailService 8개 단위 테스트로 전체 이벤트 파이프라인 검증 완료

## Completed Tasks

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 1 | RegistrationService에 ApplicationEventPublisher 주입 및 이벤트 발행 추가 | eef9aaf | RegistrationService.java, RegistrationServiceTest.java |
| 2 | RegistrationEmailService 단위 테스트 (8개) | c06d62f | RegistrationEmailServiceTest.java, RegistrationEmailService.java |

## Implementation Details

### Task 1: Event Publishing Integration
- RegistrationService 생성자에 `ApplicationEventPublisher` 파라미터 추가
- `submit()`: `REGISTRATION_SUBMIT` 이벤트 발행 (return 직전)
- `approve()`: `REGISTRATION_APPROVE` 이벤트 발행 (auditLog 후)
- `reject()`: `REGISTRATION_REJECT` 이벤트 발행 (auditLog 후)
- 기존 RegistrationServiceTest에 `@Mock ApplicationEventPublisher` 추가하여 호환성 유지

### Task 2: RegistrationEmailService Unit Tests
8개 테스트 작성 (Mockito 기반, mailSender=null 로그 모드):
1. SUBMIT -> 신청자 확인 이메일 로그 기록
2. SUBMIT -> SUPER_ADMIN들에게 알림 (신청자 1 + 관리자 N)
3. APPROVE -> 승인 이메일 (subject에 "승인" 포함)
4. REJECT -> 거부 이메일 (subject에 "결과" 포함)
5. 미존재 registrationRequestId -> 예외 없음, save 0회
6. NotificationLog.registrationRequestId 정확성 검증
7. NotificationLog.eventType 정확성 검증
8. SUPER_ADMIN 없음 -> 신청자만 알림, 에러 없음

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] @TransactionalEventListener + @Transactional 호환성 오류**
- **Found during:** Task 2 (통합 테스트 실행 시)
- **Issue:** Spring 6.2+에서 `@TransactionalEventListener` 메서드에 `@Transactional(readOnly = true)` 사용 불가. `RestrictedTransactionalEventListenerFactory`가 REQUIRES_NEW 또는 NOT_SUPPORTED만 허용
- **Fix:** `RegistrationEmailService.handleRegistrationEvent()`에서 `@Transactional(readOnly = true)` 어노테이션 제거. 이벤트 리스너는 트랜잭션 커밋 후 실행되므로 별도 트랜잭션 관리 불필요
- **Files modified:** backend/src/main/java/com/micesign/service/RegistrationEmailService.java
- **Commit:** c06d62f

**2. [Rule 3 - Blocking] RegistrationServiceTest에 eventPublisher Mock 누락**
- **Found during:** Task 1
- **Issue:** RegistrationService 생성자에 ApplicationEventPublisher 추가 후, `@InjectMocks`가 해당 의존성을 주입하지 못함
- **Fix:** RegistrationServiceTest에 `@Mock private ApplicationEventPublisher eventPublisher` 추가
- **Files modified:** backend/src/test/java/com/micesign/registration/RegistrationServiceTest.java
- **Commit:** eef9aaf

## Verification

- `./gradlew test --tests '*Registration*'` -- 전체 통과 (RegistrationServiceTest, RegistrationEmailServiceTest, RegistrationControllerTest, AdminRegistrationControllerTest)
- RegistrationService에 publishEvent 3회 호출 확인 (submit, approve, reject)
- RegistrationEmailServiceTest 8개 테스트 모두 통과

## Self-Check: PASSED

- [x] RegistrationEmailServiceTest.java exists
- [x] RegistrationService.java exists with event publishing
- [x] Commit eef9aaf found (Task 1)
- [x] Commit c06d62f found (Task 2)
- [x] All Registration tests pass

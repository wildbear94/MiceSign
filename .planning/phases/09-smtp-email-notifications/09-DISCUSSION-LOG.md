# Phase 9: SMTP Email Notifications - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-03
**Phase:** 09-smtp-email-notifications
**Areas discussed:** 이메일 발송 방식, 이메일 콘텐츠 & 템플릿, 재시도 & 실패 처리, SMTP 설정 & 개발환경

---

## 이메일 발송 방식

### 트랜잭션 분리 전략

| Option | Description | Selected |
|--------|-------------|----------|
| Spring Event + @Async (추천) | 결재 상태 변경 시 ApplicationEvent 발행 → @EventListener + @Async로 비동기 발송 | ✓ |
| AuditLogService 패턴 동일하게 | REQUIRES_NEW 트랜잭션에서 동기 발송, 예외 삼키기 | |
| Claude에게 맡김 | 기술적 구현 방식을 연구/플래닝 단계에서 결정 | |

**User's choice:** Spring Event + @Async (추천)
**Notes:** 결재 트랜잭션과 완전 분리

### 이벤트 발행 시점

| Option | Description | Selected |
|--------|-------------|----------|
| 트랜잭션 커밋 후 (추천) | @TransactionalEventListener(AFTER_COMMIT) — 롤백 시 불필요한 메일 방지 | ✓ |
| 트랜잭션 내부 | @EventListener — 트랜잭션 안에서 이벤트 발행 | |
| Claude에게 맡김 | 기술적 판단에 따라 결정 | |

**User's choice:** 트랜잭션 커밋 후 (추천)
**Notes:** DB 커밋 확정 후 이벤트 발행

### 이벤트 타입 구성

| Option | Description | Selected |
|--------|-------------|----------|
| 단일 이벤트 (추천) | ApprovalNotificationEvent 하나로 통합, event_type 필드로 구분 | ✓ |
| 이벤트별 분리 | DocumentSubmittedEvent 등 이벤트 타입 각각 정의 | |
| Claude에게 맡김 | 코드 구조에 따라 판단 | |

**User's choice:** 단일 이벤트 (추천)
**Notes:** 단순하고 확장 쉬움

### 알림 수신자 결정 로직

| Option | Description | Selected |
|--------|-------------|----------|
| NotificationService 내부 (추천) | EventListener가 호출하는 NotificationService에서 이벤트 타입별 수신자 결정 | ✓ |
| 이벤트에 수신자 포함 | 이벤트 발행 시점에 수신자 목록을 미리 결정 | |
| Claude에게 맡김 | 구현 시 적절히 판단 | |

**User's choice:** NotificationService 내부 (추천)

### 알림 수신 On/Off 설정

| Option | Description | Selected |
|--------|-------------|----------|
| 포함하지 않음 (추천) | 이번 Phase는 기본 알림에 집중, 수신 설정은 추후 Phase | ✓ |
| 간단히 포함 | 백엔드만 준비 (notification_enabled 컬럼) | |
| 전체 포함 | 백엔드 + API + 프론트엔드 설정 UI 모두 | |

**User's choice:** 포함하지 않음 (추천)
**Notes:** 추후 Phase로 연기

---

## 이메일 콘텐츠 & 템플릿

### 이메일 포맷

| Option | Description | Selected |
|--------|-------------|----------|
| HTML 이메일 (추천) | 로고 + 문서 정보 테이블 + 바로가기 버튼 | ✓ |
| 플레인 텍스트 | 단순 텍스트 메일 | |
| Claude에게 맡김 | 적절한 포맷을 연구/플래닝에서 결정 | |

**User's choice:** HTML 이메일 (추천)

### HTML 템플릿 엔진

| Option | Description | Selected |
|--------|-------------|----------|
| Thymeleaf (추천) | Spring Boot 기본 템플릿 엔진, HTML 파일로 관리 | ✓ |
| 직접 문자열 조합 | String.format/StringBuilder로 HTML 조합 | |
| Claude에게 맡김 | 구현 시 판단 | |

**User's choice:** Thymeleaf (추천)

### 이메일 본문 포함 정보

| Option | Description | Selected |
|--------|-------------|----------|
| 기본 정보 (추천) | 문서 제목, 문서번호, 기안자, 상태 변경, 승인 코멘트, 바로가기 URL | ✓ |
| 상세 정보 | 기본 + 결재라인 전체 현황 + 문서 본문 미리보기 | |
| 최소 정보 | 문서 제목과 상태 변경만, 바로가기 링크로 유도 | |

**User's choice:** 기본 정보 (추천)

### 템플릿 분리

| Option | Description | Selected |
|--------|-------------|----------|
| 타입별 분리 (추천) | SUBMIT, APPROVE, REJECT, WITHDRAW 각각 별도 Thymeleaf 템플릿 | ✓ |
| 단일 템플릿 | 하나의 템플릿에서 th:if/th:switch로 분기 | |
| Claude에게 맡김 | 코드 구조에 따라 판단 | |

**User's choice:** 타입별 분리 (추천)

---

## 재시도 & 실패 처리

### 재시도 방식

| Option | Description | Selected |
|--------|-------------|----------|
| 즉시 재시도 (추천) | @Async 내에서 바로 재시도 (1초, 3초 간격). 50명 규모에 충분 | ✓ |
| 스케줄러 기반 | @Scheduled로 주기적으로 FAILED/RETRY 상태 조회 재발송 | |
| Claude에게 맡김 | 구현 시 판단 | |

**User's choice:** 즉시 재시도 (추천)
**Notes:** 최대 2회 재시도, notification_log에 retry_count 기록

### 최종 실패 시 처리

| Option | Description | Selected |
|--------|-------------|----------|
| 로그만 기록 (추천) | notification_log에 FAILED + error_message 저장 | ✓ |
| 로그 + 관리자 알림 | FAILED 기록 + SUPER_ADMIN에게 알림 이메일 발송 | |
| Claude에게 맡김 | 구현 시 판단 | |

**User's choice:** 로그만 기록 (추천)

### SUPER_ADMIN 알림 이력 UI

| Option | Description | Selected |
|--------|-------------|----------|
| 이번 Phase에 포함 (추천) | 알림 이력 관리 페이지 (필터 + 목록 테이블) | ✓ |
| API만 구현 | 백엔드 API만, UI는 추후 | |
| Claude에게 맡김 | 요구사항 범위에 맞게 판단 | |

**User's choice:** 이번 Phase에 포함 (추천)
**Notes:** NTF-05 요구사항 충족

### 수동 재발송 기능

| Option | Description | Selected |
|--------|-------------|----------|
| 포함 (추천) | FAILED 상태 항목에 '재발송' 버튼 | ✓ |
| 나중으로 | 이번 Phase에서는 조회만 | |

**User's choice:** 포함 (추천)
**Notes:** 사용자가 직접 요청한 기능

---

## SMTP 설정 & 개발환경

### 로컬 SMTP 테스트

| Option | Description | Selected |
|--------|-------------|----------|
| MailPit (추천) | MailHog 후속작, 활발히 유지보수 중 | |
| MailHog | 기존에 많이 사용, 유지보수 중단 | ✓ |
| Claude에게 맡김 | 연구/플래닝에서 결정 | |

**User's choice:** MailHog
**Notes:** 사용자 선호

### 프로덕션 SMTP 제공자

| Option | Description | Selected |
|--------|-------------|----------|
| Gmail SMTP | Google Workspace/Gmail SMTP, App Password 필요 | |
| Naver Works | 회사 Naver Works SMTP 활용 | |
| 환경별 설정 분리 | application-{profile}.yml로 분리, 배포 시 결정 | ✓ |
| Claude에게 맡김 | 구현 시 판단 | |

**User's choice:** 환경별 설정 분리
**Notes:** 프로덕션 제공자는 배포 시 결정

### 발신자 주소 형식

| Option | Description | Selected |
|--------|-------------|----------|
| noreply@회사도메인 (추천) | 'MiceSign <noreply@example.com>' 형식 | |
| 회사 공용 메일 | 'MiceSign 전자결재 <approval@example.com>' 등 | ✓ |
| Claude에게 맡김 | 적절히 판단 | |

**User's choice:** 회사 공용 메일
**Notes:** 실제 주소는 yml 설정에서 관리

---

## Claude's Discretion

- 이메일 제목(subject) 포맷 결정
- HTML 템플릿 디자인/스타일링 세부사항
- @Async 스레드풀 설정

## Deferred Ideas

- 사용자별 알림 수신 On/Off 설정 (user 테이블 변경 + UI 필요)
- 발송 실패율 모니터링
- 야간/주말 발송 지연

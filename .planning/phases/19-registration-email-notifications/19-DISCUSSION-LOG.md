# Phase 19: Registration Email Notifications - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-08
**Phase:** 19-registration-email-notifications
**Areas discussed:** SMTP 구현 범위, 이벤트 아키텍처, 이메일 내용/디자인, notification_log 확장

---

## SMTP 구현 범위

| Option | Description | Selected |
|--------|-------------|----------|
| 등록 알림만 SMTP | 이번 페이즈에서는 등록 관련 이메일만 실제 SMTP로 발송. 기존 결재 알림은 스텁 유지. | ✓ |
| 전체 SMTP 교체 | JavaMailSender 도입하여 등록 + 기존 결재 알림 모두 실제 발송으로 교체 | |
| Claude 재량 | Claude가 판단 | |

**User's choice:** 등록 알림만 SMTP
**Notes:** MAIL-01의 원래 의도는 전체 교체이지만, 범위 최소화를 위해 등록 알림만 먼저 구현

### SMTP 설정 방식

| Option | Description | Selected |
|--------|-------------|----------|
| application.yml에 직접 | spring.mail.* 설정을 application.yml에 추가. 비밀번호는 환경변수로 분리. | ✓ |
| 별도 프로필 | 메일 설정을 별도 프로필로 분리 | |
| Claude 재량 | Claude가 판단 | |

**User's choice:** application.yml에 직접

### 템플릿 엔진

| Option | Description | Selected |
|--------|-------------|----------|
| Thymeleaf | spring-boot-starter-thymeleaf 의존성 추가. HTML 템플릿에 변수 바인딩. | ✓ |
| String 직접 조합 | 템플릿 엔진 없이 Java 코드에서 직접 HTML 문자열 조합 | |
| Claude 재량 | Claude가 판단 | |

**User's choice:** Thymeleaf

### 재시도 정책

| Option | Description | Selected |
|--------|-------------|----------|
| 재시도 없음 | 등록 알림은 실패 시 로그만 기록. 재시도 로직 없이 단순하게. | ✓ |
| 기존 패턴 유지 | retry_count 2회 패턴 그대로 적용 | |
| Claude 재량 | Claude가 판단 | |

**User's choice:** 재시도 없음

### SMTP 서버

| Option | Description | Selected |
|--------|-------------|----------|
| Gmail SMTP | smtp.gmail.com:587 | |
| Naver SMTP | smtp.naver.com:587 | |
| Claude 재량 | 환경변수로 설정 가능하게 구현 | ✓ |

**User's choice:** Claude 재량

### 기존 스텁 처리

| Option | Description | Selected |
|--------|-------------|----------|
| 등록만 SMTP | 새로운 등록 알림 메서드만 SMTP. 기존 sendEmail()/sendNotification() 스텁 유지. | ✓ |
| 전체 SMTP 전환 | sendEmail()도 Thymeleaf + JavaMailSender로 교체 | |
| Claude 재량 | Claude가 판단 | |

**User's choice:** 등록만 SMTP

### 테스트 환경 처리

| Option | Description | Selected |
|--------|-------------|----------|
| 프로필 분리 | dev에서는 SMTP 미설정(로그만), prod만 SMTP 활성화 | ✓ |
| 플래그 제어 | app.mail.enabled=true/false 커스텀 프로퍼티로 제어 | |
| MailHog | 개발 환경에 모의 SMTP 서버 사용 | |
| Claude 재량 | Claude가 판단 | |

**User's choice:** 프로필 분리

---

## 이벤트 아키텍처

### 이벤트 타입

| Option | Description | Selected |
|--------|-------------|----------|
| 별도 이벤트 | RegistrationNotificationEvent 새로 생성. 기존 ApprovalNotificationEvent와 완전 분리. | ✓ |
| 통합 이벤트 | 기존 ApprovalNotificationEvent를 범용으로 리팩터링 | |
| Claude 재량 | Claude가 판단 | |

**User's choice:** 별도 이벤트

### 이벤트 발행 시점

| Option | Description | Selected |
|--------|-------------|----------|
| 서비스 레이어 | RegistrationService의 submit/approve/reject에서 ApplicationEventPublisher 사용 | ✓ |
| 컨트롤러 레이어 | Controller에서 이벤트 발행 | |
| Claude 재량 | Claude가 판단 | |

**User's choice:** 서비스 레이어

### 리스너 위치

| Option | Description | Selected |
|--------|-------------|----------|
| 별도 서비스 | RegistrationEmailService 새로 생성 | ✓ |
| 기존 EmailService 확장 | EmailService에 새로운 리스너 메서드 추가 | |
| Claude 재량 | Claude가 판단 | |

**User's choice:** 별도 서비스

### @Async 적용

| Option | Description | Selected |
|--------|-------------|----------|
| 동일 패턴 적용 | @Async + @TransactionalEventListener(AFTER_COMMIT) — 기존 결재 패턴과 동일 | ✓ |
| 동기 처리 | 이벤트 리스너에서 동기로 처리 | |
| Claude 재량 | Claude가 판단 | |

**User's choice:** 동일 패턴 적용

### SUPER_ADMIN 조회

| Option | Description | Selected |
|--------|-------------|----------|
| 기존 메서드 사용 | findByRoleAndStatus(SUPER_ADMIN, ACTIVE)로 활성 SUPER_ADMIN 전체에게 알림 | ✓ |
| 알림 수신 옵션 | SUPER_ADMIN이 등록 알림 수신을 on/off 할 수 있는 설정 추가 | |
| Claude 재량 | Claude가 판단 | |

**User's choice:** 기존 메서드 사용

### 이벤트 타입 enum

| Option | Description | Selected |
|--------|-------------|----------|
| 별도 enum | RegistrationEventType enum 새로 생성 | ✓ |
| 기존 enum 확장 | NotificationEventType에 REGISTRATION_* 추가 | |
| Claude 재량 | Claude가 판단 | |

**User's choice:** 별도 enum

### SUPER_ADMIN 알림 범위

| Option | Description | Selected |
|--------|-------------|----------|
| 신청 접수만 | MAIL-04 요구사항 그대로 — 신규 신청 접수 시에만 SUPER_ADMIN 알림 | ✓ |
| 전체 이벤트 | 신청 접수 + 승인/거부 결과 모두 SUPER_ADMIN에게 알림 | |
| Claude 재량 | Claude가 판단 | |

**User's choice:** 신청 접수만

### 이벤트 페이로드

| Option | Description | Selected |
|--------|-------------|----------|
| 최소 페이로드 | registrationRequestId + eventType만. 리스너에서 DB 조회. | ✓ |
| 풀 페이로드 | applicantName, applicantEmail, rejectionReason 모두 포함 | |
| Claude 재량 | Claude가 판단 | |

**User's choice:** 최소 페이로드

### 이벤트 순서 보장

| Option | Description | Selected |
|--------|-------------|----------|
| AFTER_COMMIT+Async 충분 | 트랜잭션 커밋 후 비동기 발송. 이메일 실패가 등록 롤백하지 않음. | ✓ |
| 이벤트 큐 도입 | 이벤트를 큐에 저장하고 별도 워커가 처리 | |
| Claude 재량 | Claude가 판단 | |

**User's choice:** AFTER_COMMIT+Async 충분

---

## 이메일 내용/디자인

### 디자인 수준

| Option | Description | Selected |
|--------|-------------|----------|
| 심플 HTML | 인라인 CSS로 간단한 스타일링. 로고 없이 텍스트 중심. | ✓ |
| 브랜딩 포함 | MiceSign 로고, 컬러 테마, 헤더/푸터 포함 | |
| 텍스트 전용 | HTML 없이 plain text만 | |
| Claude 재량 | Claude가 판단 | |

**User's choice:** 심플 HTML

### 제목 형식

| Option | Description | Selected |
|--------|-------------|----------|
| [MiceSign] 접두사 | 기존 결재 패턴과 동일하게 [MiceSign] 접두사 사용 | ✓ |
| 접두사 없음 | 내용만 | |
| Claude 재량 | Claude가 판단 | |

**User's choice:** [MiceSign] 접두사

### 이메일 내용

| Option | Description | Selected |
|--------|-------------|----------|
| 필수 정보만 | 신청확인: 이름/신청일. 승인: 이름/승인일. 거부: 이름/거부사유/재신청안내. ADMIN: 신청자명/이메일/신청일시. | ✓ |
| 상세 정보 포함 | 필수 + 관리 페이지 링크, 신청 번호, 처리 상태 등 | |
| Claude 재량 | Claude가 판단 | |

**User's choice:** 필수 정보만

### 이메일 언어

| Option | Description | Selected |
|--------|-------------|----------|
| 100% 한국어 | FSD 규정 따라 이메일 본문 전체 한국어 | ✓ |
| 한국어+영어 혼용 | 본문 한국어, 기술용어/버튼만 영어 | |
| Claude 재량 | Claude가 판단 | |

**User's choice:** 100% 한국어

### 승인 후 안내문

| Option | Description | Selected |
|--------|-------------|----------|
| 로그인 URL 포함 | 승인 이메일에 '이제 로그인하실 수 있습니다' + 로그인 페이지 URL 포함 | ✓ |
| 텍스트만 | '등록이 승인되었습니다' 텍스트만. URL 없이. | |
| Claude 재량 | Claude가 판단 | |

**User's choice:** 로그인 URL 포함

### 거부 재신청 안내

| Option | Description | Selected |
|--------|-------------|----------|
| 재신청 안내 포함 | 거부 이메일에 '거부 사유: {reason}' + '다시 신청하실 수 있습니다' 안내문 포함 | ✓ |
| 거부 사유만 | 거부 사유만 포함. 재신청 안내 없음. | |
| Claude 재량 | Claude가 판단 | |

**User's choice:** 재신청 안내 포함

### ADMIN 알림 내용

| Option | Description | Selected |
|--------|-------------|----------|
| 기본 정보 | 신청자명, 이메일, 신청일시. 관리 페이지 URL은 Phase 20 이후 추가. | ✓ |
| 기본 + 관리 URL | 신청자명, 이메일, 신청일시 + 등록 관리 페이지 URL | |
| Claude 재량 | Claude가 판단 | |

**User's choice:** 기본 정보

### From 표시명

| Option | Description | Selected |
|--------|-------------|----------|
| MiceSign | From: 'MiceSign <noreply@...>'. 영문 제품명 사용. | ✓ |
| 마이스사인 | From: '마이스사인 <noreply@...>'. 한국어 제품명 사용. | |
| Claude 재량 | Claude가 판단 | |

**User's choice:** MiceSign

### 템플릿 파일명 규칙

| Option | Description | Selected |
|--------|-------------|----------|
| registration-{event}.html | registration-submit.html, registration-approve.html 등. 기존 패턴과 일관. | ✓ |
| reg-{event}.html | 짧은 접두사 사용 | |
| Claude 재량 | Claude가 판단 | |

**User's choice:** registration-{event}.html

### 템플릿 구조

| Option | Description | Selected |
|--------|-------------|----------|
| 각각 독립 | 4개 별도 Thymeleaf HTML 템플릿. 각 이메일이 독립적으로 수정 가능. | ✓ |
| 공통 레이아웃 + 콘텐츠 | base-layout.html 공통 템플릿 + 각 이메일별 콘텐츠 fragment | |
| Claude 재량 | Claude가 판단 | |

**User's choice:** 각각 독립

---

## notification_log 확장

### recipient_id 처리

| Option | Description | Selected |
|--------|-------------|----------|
| nullable로 변경 | Flyway 마이그레이션으로 recipient_id를 nullable로 변경. 미등록 신청자는 recipient=null. | ✓ |
| 별도 로그 테이블 | registration_notification_log 별도 테이블 생성 | |
| 등록 알림 로그 안 함 | notification_log에 등록 알림 기록 안 함. 앱 로그만 사용. | |
| Claude 재량 | Claude가 판단 | |

**User's choice:** nullable로 변경

### event_type 구분

| Option | Description | Selected |
|--------|-------------|----------|
| 기존 컬럼 사용 | VARCHAR(50)에 REGISTRATION_SUBMIT 등 값 저장. 별도 컬럼 불필요. | ✓ |
| event_category 추가 | APPROVAL, REGISTRATION, BUDGET 등 카테고리 컬럼 추가 | |
| Claude 재량 | Claude가 판단 | |

**User's choice:** 기존 컬럼 사용

### registration_request_id 컬럼

| Option | Description | Selected |
|--------|-------------|----------|
| 추가 | BIGINT NULL 컬럼 추가. document_id와 대칭. | ✓ |
| 추가 안 함 | event_type과 recipient_email로만 구분 | |
| Claude 재량 | Claude가 판단 | |

**User's choice:** 추가

### NotificationLog 엔티티 수정

| Option | Description | Selected |
|--------|-------------|----------|
| @JoinColumn nullable=true | recipient 매핑을 nullable=true로 변경. 기존 결재 알림은 계속 recipient 설정. | ✓ |
| 시스템 계정 사용 | 등록 알림에서 시스템 계정(ID=1 등)을 recipient로 설정 | |
| Claude 재량 | Claude가 판단 | |

**User's choice:** @JoinColumn nullable=true

### NotificationLogController 수정

| Option | Description | Selected |
|--------|-------------|----------|
| 포함 안 함 | 기존 알림 목록 API 수정 안 함. 등록 알림은 내부 로그만. | ✓ |
| 함께 조회 | 기존 API에 event_type 필터 추가하여 REGISTRATION_* 타입도 조회 가능 | |
| Claude 재량 | Claude가 판단 | |

**User's choice:** 포함 안 함

---

## Claude's Discretion

- Flyway 마이그레이션 버전 번호
- RegistrationEmailService 내부 메서드 구조
- Thymeleaf 템플릿 HTML/CSS 상세 디자인
- SMTP 기본 설정값
- app.base-url 설정 키 이름 및 기본값

## Deferred Ideas

None — discussion stayed within phase scope

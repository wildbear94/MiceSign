# Phase 9: SMTP Email Notifications - Context

**Gathered:** 2026-04-03
**Status:** Ready for planning

<domain>
## Phase Boundary

결재 워크플로우 이벤트(제출/승인/반려/회수)에 대한 SMTP 이메일 알림을 비동기로 발송하고, 발송 이력을 기록하며, SUPER_ADMIN이 이력을 조회하고 실패 건을 수동 재발송할 수 있는 기능을 구현한다.

</domain>

<decisions>
## Implementation Decisions

### 이메일 발송 방식
- **D-01:** Spring ApplicationEvent + @Async로 비동기 발송. 결재 트랜잭션과 완전 분리하여 메일 실패가 승인 처리에 영향 없음
- **D-02:** @TransactionalEventListener(AFTER_COMMIT) — DB 커밋이 확정된 후에만 이벤트 발행. 롤백 시 불필요한 메일 방지
- **D-03:** 단일 이벤트 클래스 (ApprovalNotificationEvent) + event_type 필드로 SUBMIT/APPROVE/REJECT/WITHDRAW 구분
- **D-04:** NotificationService 내부에서 이벤트 타입별 수신자 결정 로직 관리 (SUBMIT → 승인라인 전체, APPROVE/REJECT → 기안자, 등)

### 이메일 콘텐츠 & 템플릿
- **D-06:** HTML 형식 이메일 (로고 + 문서 정보 테이블 + 바로가기 버튼)
- **D-07:** Thymeleaf 템플릿 엔진으로 이메일 HTML 관리 (spring-boot-starter-thymeleaf 추가)
- **D-08:** 이메일 본문 포함 정보: 문서 제목, 문서번호, 기안자, 상태 변경 내용, 승인 코멘트(있는 경우), 바로가기 URL
- **D-09:** 이벤트 타입별 별도 Thymeleaf 템플릿 파일 (submit.html, approve.html, reject.html, withdraw.html)

### 재시도 & 실패 처리
- **D-10:** 즉시 재시도 — @Async 내에서 실패 시 바로 재시도 (1초, 3초 간격, 최대 2회). notification_log에 retry_count 기록
- **D-11:** 최종 실패 시 notification_log에 FAILED 상태 + error_message 저장. 별도 관리자 알림 없음
- **D-12:** SUPER_ADMIN 전용 알림 이력 관리 페이지 포함 — 상태/날짜 필터 + 목록 테이블. NTF-05 요구사항 충족
- **D-13:** SUPER_ADMIN이 FAILED 상태 알림을 수동 재발송할 수 있는 기능 포함 (재발송 API + UI 버튼)

### SMTP 설정 & 개발환경
- **D-14:** 로컬 개발 환경에서 MailHog 사용 (SMTP 테스트 서버)
- **D-15:** application-{profile}.yml로 SMTP 설정 환경별 분리 (dev: MailHog, prod: 실제 SMTP)
- **D-16:** 발신자 형식 — 회사 공용 메일 계정 사용 (예: 'MiceSign 전자결재 <approval@example.com>'). 실제 주소는 yml 설정에서 관리

### Claude's Discretion
- 이메일 제목(subject) 포맷 — 적절한 한국어 형식으로 결정 (예: '[MiceSign] 문서명 - 상태')
- HTML 템플릿 디자인/스타일링 세부사항
- @Async 스레드풀 설정 (SimpleAsyncTaskExecutor vs ThreadPoolTaskExecutor 등)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### 요구사항
- `docs/PRD_MiceSign_v2.0.md` — 전체 제품 요구사항, DB 스키마 DDL (notification_log 테이블 정의 포함)
- `docs/FSD_MiceSign_v1.0.md` — API 계약, 비즈니스 규칙, 에러 코드
- `.planning/REQUIREMENTS.md` §v1.1 Requirements > Notifications — NTF-01~NTF-05 요구사항

### 기존 코드 (참고)
- `backend/src/main/java/com/micesign/service/ApprovalService.java` — 승인/반려 처리 로직 (이벤트 발행 지점)
- `backend/src/main/java/com/micesign/service/DocumentService.java` — 제출/회수 처리 로직 (이벤트 발행 지점)
- `backend/src/main/java/com/micesign/service/AuditLogService.java` — REQUIRES_NEW + 예외 삼키기 패턴 참고
- `backend/src/main/resources/db/migration/V1__create_schema.sql` — notification_log 테이블 DDL (이미 정의됨)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **AuditLogService 패턴**: REQUIRES_NEW 트랜잭션 + 예외 삼키기 — NotificationService의 non-blocking 패턴 참고
- **notification_log DDL**: V1 마이그레이션에 이미 정의됨 (recipient_id, event_type, status, retry_count, error_message 등)
- **ApprovalService.approve/reject**: 이벤트 발행 지점 — 여기에 ApplicationEventPublisher.publishEvent() 추가

### Established Patterns
- **서비스 구조**: @Service + 생성자 주입, @Transactional 사용
- **감사 로깅**: AuditLogService.log()를 각 상태 변경 시 호출 — 동일한 지점에서 알림 이벤트 발행
- **에러 처리**: BusinessException으로 비즈니스 규칙 위반 처리

### Integration Points
- **ApprovalService**: approve(), reject() 메서드에 이벤트 발행 추가
- **DocumentService**: submitDocument(), withdrawDocument() 메서드에 이벤트 발행 추가
- **Frontend**: SUPER_ADMIN 메뉴에 알림 이력 관리 페이지 추가 (사이드바 네비게이션)
- **Gradle**: spring-boot-starter-mail, spring-boot-starter-thymeleaf 의존성 추가

</code_context>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches

</specifics>

<deferred>
## Deferred Ideas

- **사용자별 알림 수신 On/Off 설정** — user 테이블 컬럼 추가 + 설정 API + 설정 UI 필요. 별도 Phase로 분리
- **발송 실패율 모니터링** — 일정 기간 내 실패율 경고 로그 기능. 추후 고려
- **야간/주말 발송 지연** — 근무 시간 외 발송 지연 기능. 추후 고려

</deferred>

---

*Phase: 09-smtp-email-notifications*
*Context gathered: 2026-04-03*

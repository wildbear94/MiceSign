# Phase 18: Registration Backend - Context

**Gathered:** 2026-04-07
**Status:** Ready for planning

<domain>
## Phase Boundary

사용자 셀프 등록 신청 백엔드 API 구현. 비인증 사용자가 등록을 신청하고, SUPER_ADMIN이 승인하면 자동으로 계정이 생성되는 전체 백엔드 로직.

프론트엔드 UI (Phase 20, 21), 이메일 알림 (Phase 19), rate limiting (Phase 21)은 이 페이즈에 포함되지 않음.

</domain>

<decisions>
## Implementation Decisions

### 등록 신청 상태 관리
- **D-01:** 5개 상태값 사용: PENDING, APPROVED, REJECTED, CANCELLED, EXPIRED
- **D-02:** EXPIRED 처리 — 14일 경과 시 @Scheduled 크론으로 PENDING → EXPIRED 자동 변경
- **D-03:** 거부된 이메일로 재신청 시 기존 REJECTED 레코드는 그대로 보존하고 새로운 PENDING 레코드 생성 (신청 이력 보존)

### 승인 시 계정 생성
- **D-04:** employee_no(사원번호)는 SUPER_ADMIN이 승인 시 직접 입력 (자동 생성 아님)
- **D-05:** 부서/직급은 SUPER_ADMIN이 승인 시 함께 지정 (ADM-02 요구사항 일치)
- **D-06:** 생성되는 계정의 role은 항상 USER 고정. 관리자 승격은 별도 프로세스
- **D-07:** 비밀번호 해시는 registration_request에서 user로 직접 전달 (이중 해싱 없음) — STATE.md에서 확정

### API 엔드포인트 구조
- **D-08:** 공개 등록 신청 API: `POST /api/v1/registration` (permitAll)
- **D-09:** 공개 상태 조회 API: `GET /api/v1/registration/status?email=xxx` (permitAll, 인증 없이 이메일로 조회)
- **D-10:** 관리자 API: `/api/v1/admin/registrations` 하위 — GET (목록), POST `/{id}/approve`, POST `/{id}/reject`
- **D-11:** SecurityConfig에 `/api/v1/registration/**` 추가 (permitAll)

### Flyway 마이그레이션
- **D-12:** registration_request 테이블에 rejection_reason TEXT 컬럼 포함
- **D-13:** user 테이블의 employee_no, department_id NOT NULL 제약 변경 없음. 승인 시 모든 필수값 입력 필수
- **D-14:** registration_request에 approved_by (FK to user.id, nullable) 컬럼 추가 — 승인/거부 처리자 추적

### Claude's Discretion
- Flyway 마이그레이션 버전 번호 (V10 이후 적절한 번호)
- registration_request 테이블의 인덱스 설계
- RegistrationService 내부 메서드 구조
- DTO 클래스 설계 (request/response records)
- @Scheduled 크론 표현식 (매일 1회 등)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### 요구사항
- `docs/PRD_MiceSign_v2.0.md` — DB 스키마 DDL, 기술 아키텍처, user 테이블 구조
- `docs/FSD_MiceSign_v1.0.md` — API 계약, 에러 코드 규칙, 비즈니스 규칙 상세
- `.planning/REQUIREMENTS.md` §v1.3 — REG-01, REG-02, REG-03, ADM-04 요구사항 정의

### 기존 코드 패턴
- `backend/src/main/java/com/micesign/config/SecurityConfig.java` — permitAll 패턴 참조
- `backend/src/main/java/com/micesign/domain/User.java` — User 엔티티 구조, NOT NULL 필드 확인
- `backend/src/main/java/com/micesign/service/UserManagementService.java` — 계정 생성 로직 패턴
- `backend/src/main/java/com/micesign/service/AuthService.java` — PasswordEncoder 사용 패턴
- `backend/src/main/java/com/micesign/domain/enums/UserStatus.java` — 기존 enum 패턴

### 프로젝트 상태
- `.planning/STATE.md` — v1.3 관련 사전 결정사항 (별도 테이블, 비밀번호 해시 전달, SecurityConfig 변경)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `PasswordEncoder` (BCryptPasswordEncoder) — SecurityConfig에서 Bean 등록됨, 신청 시 비밀번호 해싱에 재사용
- `ApiResponse<T>` — 공통 응답 래퍼, 모든 API에서 사용
- `BusinessException` — 비즈니스 에러 처리 패턴 (에러코드 + 메시지)
- `UserRepository` — 이메일 중복 검증에 기존 findByEmail 활용 가능
- `AuditLogService` — 등록 신청/승인/거부 감사 로그 기록

### Established Patterns
- JPA Entity + Repository + Service + Controller 계층 구조
- DTO: Java record 사용 (dto 패키지 하위 도메인별 분리)
- Enum: `domain/enums` 패키지에 별도 enum 클래스
- Flyway: `resources/db/migration/V{N}__description.sql` 형식
- 관리자 API: `/api/v1/admin/**` + `@PreAuthorize("hasRole('SUPER_ADMIN')")` 패턴

### Integration Points
- `SecurityConfig.filterChain()` — permitAll 목록에 등록 API 추가
- `UserManagementService.createUser()` — 승인 시 계정 생성 로직 참조 (유사하지만 employee_no/부서/직급을 관리자가 지정)
- `AuditLogService` — 등록 신청, 승인, 거부 이벤트 감사 로그 기록

</code_context>

<specifics>
## Specific Ideas

- 상태 전이: PENDING → APPROVED/REJECTED/CANCELLED/EXPIRED (APPROVED/REJECTED/EXPIRED에서는 더 이상 전이 없음)
- CANCELLED: 신청자가 대기 중 직접 취소 (향후 프론트엔드에서 사용)
- 이메일 중복 검증: user 테이블 + registration_request 테이블(PENDING 상태만)에서 검증. REJECTED/CANCELLED/EXPIRED 상태의 이메일은 재신청 가능
- 승인 시 필수 입력: employee_no, department_id, position_id (모두 SUPER_ADMIN이 지정)

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 18-registration-backend*
*Context gathered: 2026-04-07*

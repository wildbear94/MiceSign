# Phase 18: Registration Backend - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-07
**Phase:** 18-registration-backend
**Areas discussed:** 등록 신청 상태 관리, 승인 시 계정 생성 기본값, API 엔드포인트 구조, Flyway 마이그레이션 설계

---

## 등록 신청 상태 관리

### 상태값 설계

| Option | Description | Selected |
|--------|-------------|----------|
| 3개 상태 (Recommended) | PENDING, APPROVED, REJECTED만 사용. 단순하게 유지 | |
| 4개 상태 | PENDING, APPROVED, REJECTED, CANCELLED 추가. 취소 기능 포함 | |
| 5개 상태 | PENDING, APPROVED, REJECTED, CANCELLED, EXPIRED 추가. 자동 만료 포함 | ✓ |

**User's choice:** 5개 상태
**Notes:** CANCELLED(신청자 취소)와 EXPIRED(기간 초과 자동 만료) 모두 포함

### 만료 기간

| Option | Description | Selected |
|--------|-------------|----------|
| 7일 | 1주일 동안 처리되지 않으면 자동 만료 | |
| 14일 | 2주일 대기 후 만료. 관리자에게 충분한 처리 시간 제공 | ✓ |
| 30일 (Recommended) | 1개월 대기 후 만료. ~50명 소규모 회사에서 관리자 부재 등 고려 | |
| Claude에게 위임 | Claude가 적절한 기간을 결정 | |

**User's choice:** 14일
**Notes:** None

### 만료 처리 방식

| Option | Description | Selected |
|--------|-------------|----------|
| 스케줄러 (Recommended) | @Scheduled 크론이 주기적으로 PENDING 상태를 스캔하여 기간 초과 시 EXPIRED로 변경 | ✓ |
| 조회 시 지연 판단 | 만료 여부를 DB에 저장하지 않고, 조회 시 created_at 기준으로 판단하여 표시 | |

**User's choice:** 스케줄러
**Notes:** None

### 거부 후 재신청 처리

| Option | Description | Selected |
|--------|-------------|----------|
| 새 레코드 생성 (Recommended) | 기존 REJECTED 레코드는 그대로 두고 새로운 PENDING 레코드 생성. 신청 이력 보존 가능 | ✓ |
| 상태 리셋 | 기존 REJECTED 레코드를 PENDING으로 변경하고 데이터 업데이트. 레코드 수 최소화 | |

**User's choice:** 새 레코드 생성
**Notes:** None

---

## 승인 시 계정 생성 기본값

### 사원번호 처리

| Option | Description | Selected |
|--------|-------------|----------|
| 관리자가 직접 입력 (Recommended) | 승인 시 SUPER_ADMIN이 employee_no를 직접 입력. Phase 20 관리 UI에서 입력 필드 제공 | ✓ |
| 자동 생성 | 시스템이 EMP-YYYY-NNNN 형식으로 자동 배정. 관리자 개입 최소화 | |
| 임시값 후 수정 | 승인 시 임시 employee_no 자동 배정, 이후 관리자가 수정 가능 | |

**User's choice:** 관리자가 직접 입력
**Notes:** None

### 부서/직급 배정

| Option | Description | Selected |
|--------|-------------|----------|
| 승인 시 지정 (Recommended) | SUPER_ADMIN이 승인하면서 부서와 직급을 함께 지정. ADM-02 요구사항과 일치 | ✓ |
| 기본 부서 배정 | 승인 시 '미배정' 부서에 자동 배치, 이후 관리자가 변경 | |
| user 테이블 수정 | department_id를 nullable로 변경하여 승인 시 null 허용, 이후 설정 | |

**User's choice:** 승인 시 지정
**Notes:** None

### 기본 Role

| Option | Description | Selected |
|--------|-------------|----------|
| USER 고정 (Recommended) | 등록 신청으로 생성된 계정은 항상 USER 역할. 관리자 승격은 별도 처리 | ✓ |
| 승인 시 선택 | SUPER_ADMIN이 승인 시 USER/ADMIN 역할을 선택 가능 | |

**User's choice:** USER 고정
**Notes:** None

---

## API 엔드포인트 구조

### 공개 등록 API URL

| Option | Description | Selected |
|--------|-------------|----------|
| /api/v1/registration (Recommended) | POST /api/v1/registration. SecurityConfig permitAll()에 추가. STATE.md에 이미 명시된 패턴 | ✓ |
| /api/v1/auth/register | auth 네임스페이스 하위로 배치. 인증 관련 API와 그룹화 | |
| /api/v1/public/registration | 공개 API임을 URL에서 명시적으로 표현 | |

**User's choice:** /api/v1/registration
**Notes:** None

### 관리자 API URL

| Option | Description | Selected |
|--------|-------------|----------|
| /api/v1/admin/registrations (Recommended) | 기존 admin 패턴 활용. GET (목록), POST /{id}/approve, POST /{id}/reject | ✓ |
| /api/v1/registrations | admin 접두어 없이 @PreAuthorize로 권한 제어 | |
| Claude에게 위임 | Claude가 기존 코드베이스 패턴에 맞게 결정 | |

**User's choice:** /api/v1/admin/registrations
**Notes:** None

### 상태 조회 인증

| Option | Description | Selected |
|--------|-------------|----------|
| 이메일로 조회 (Recommended) | GET /api/v1/registration/status?email=xxx. 인증 없이 이메일로 조회. 로그인 전 상태 확인 가능 | ✓ |
| 토큰기반 조회 | 신청 시 발급된 UUID 토큰으로 조회. 이메일 노출 없이 안전하게 조회 | |

**User's choice:** 이메일로 조회
**Notes:** None

---

## Flyway 마이그레이션 설계

### 거부 사유 컬럼

| Option | Description | Selected |
|--------|-------------|----------|
| 포함 (Recommended) | rejection_reason TEXT 컬럼 추가. ADM-03에서 SUPER_ADMIN이 거부 사유를 입력하도록 요구 | ✓ |
| 별도 테이블 | 이력/로그 테이블에 거부 사유 저장. 신청 테이블은 단순하게 유지 | |

**User's choice:** 포함
**Notes:** None

### user 테이블 변경

| Option | Description | Selected |
|--------|-------------|----------|
| 변경 없음 (Recommended) | user 테이블 그대로 유지. 승인 시 SUPER_ADMIN이 employee_no, 부서, 직급을 모두 지정해야 계정 생성 가능 | ✓ |
| employee_no nullable | employee_no를 nullable로 변경. 승인 시 사원번호 없이도 계정 생성 가능 | |
| department_id nullable | department_id를 nullable로 변경. '미배정' 상태 허용 | |

**User's choice:** 변경 없음
**Notes:** None

### 승인자 기록

| Option | Description | Selected |
|--------|-------------|----------|
| 기록 (Recommended) | approved_by (FK to user.id, nullable) 컬럼 추가. 누가 승인/거부했는지 추적 가능 | ✓ |
| 미기록 | audit_log에만 남김. 테이블 단순화 | |

**User's choice:** 기록
**Notes:** None

---

## Claude's Discretion

- Flyway 마이그레이션 버전 번호
- registration_request 테이블 인덱스 설계
- RegistrationService 내부 메서드 구조
- DTO 클래스 설계
- @Scheduled 크론 표현식

## Deferred Ideas

None

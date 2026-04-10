# Phase 20: Admin Registration Management UI - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-08
**Phase:** 20-admin-registration-management-ui
**Areas discussed:** 목록/필터링 레이아웃, 승인 워크플로우 UI, 거부 워크플로우 UI, 네비게이션/진입점, 에러 처리/토스트, 이미 처리된 신청 보기, 로딩/스켈레톤 UI, i18n/다국어

---

## 목록/필터링 레이아웃

### 필터 방식

| Option | Description | Selected |
|--------|-------------|----------|
| 탭 버튼 필터 | 상단에 전체/대기중/승인/거부 탭 클릭으로 전환 | ✓ |
| 드롭다운 필터바 | UserFilterBar 패턴 드롭다운 선택 | |
| 필터 없이 전체 표시 | 상태 배지로 구분, 필터 없음 | |

**User's choice:** 탭 버튼 필터
**Notes:** 이후 EXPIRED/CANCELLED 탭도 추가하여 6개 탭으로 확정.

### 테이블 컬럼

| Option | Description | Selected |
|--------|-------------|----------|
| 기본 정보 | 신청자명, 이메일, 신청일, 상태 배지 | ✓ |
| 상세 정보 포함 | 기본 + 처리자명, 거부사유(툴팁), 부서/직급 | |

**User's choice:** 기본 정보

### 행 클릭 동작

| Option | Description | Selected |
|--------|-------------|----------|
| 상세 모달 열기 | 행 클릭 시 신청 상세 모달 | ✓ |
| 상세 페이지로 이동 | /admin/registrations/:id로 라우팅 | |
| 인라인 확장 | 테이블 내에서 행 확장 | |

**User's choice:** 상세 모달 열기

### 기본 탭

| Option | Description | Selected |
|--------|-------------|----------|
| 대기중 | 가장 먼저 처리할 신청들 | ✓ |
| 전체 | 모든 상태 한눈에 | |
| 탭 위에 대기건수 배지 | 대기중 탭 옆에 미처리 건수 | |

**User's choice:** 대기중

### 정렬 방식

| Option | Description | Selected |
|--------|-------------|----------|
| 신청일 역순 | 최신 신청이 위에 | ✓ |
| 신청일 순서 | 오래된 신청부터 | |
| Claude 재량 | 적절한 기본 정렬 결정 | |

**User's choice:** 신청일 역순

### 페이지네이션

| Option | Description | Selected |
|--------|-------------|----------|
| 페이지네이션 포함 | Pagination 컴포넌트 재사용 | ✓ |
| 페이지네이션 없이 | 전체 목록 한번에 | |

**User's choice:** 페이지네이션 포함

### 빈 상태

| Option | Description | Selected |
|--------|-------------|----------|
| 간단한 텍스트 | "등록 신청이 없습니다" | ✓ |
| 아이콘 + 텍스트 | 시각적으로 더 친절 | |
| Claude 재량 | 기존 패턴에 맞춰 처리 | |

**User's choice:** 간단한 텍스트

### 탭 수정 (재방문)

| Option | Description | Selected |
|--------|-------------|----------|
| EXPIRED/CANCELLED 탭 추가 | 6개 탭: 전체/대기중/승인/거부/만료/취소 | ✓ |
| 탭 개수 줄이기 | 대기중/완료 2개만 | |
| 탭에 건수 표시 | 각 탭 라벨에 건수 | |

**User's choice:** EXPIRED/CANCELLED 탭 추가

---

## 승인 워크플로우 UI

### 승인 폼 형태

| Option | Description | Selected |
|--------|-------------|----------|
| 승인 모달 | 별도 모달에서 부서/직급/사원번호 입력 | ✓ |
| 상세 모달 내 인라인 | 상세 모달 하단에 승인 영역 포함 | |
| 별도 승인 페이지 | /admin/registrations/:id/approve | |

**User's choice:** 승인 모달
**Notes:** 이후 "하나의 통합 모달" 결정으로 상세+승인이 하나의 모달에 통합됨.

### 부서 선택 UI

| Option | Description | Selected |
|--------|-------------|----------|
| 드롭다운 | 간단한 드롭다운 선택 | ✓ |
| 트리 선택기 | DepartmentTree 컴포넌트 재사용 | |

**User's choice:** 드롭다운

### 승인 확인

| Option | Description | Selected |
|--------|-------------|----------|
| 확인 없이 바로 승인 | 모달에서 바로 처리 | ✓ |
| 확인 다이얼로그 | "승인하시겠습니까?" 추가 확인 | |

**User's choice:** 확인 없이 바로 승인

### 승인 후 동작

| Option | Description | Selected |
|--------|-------------|----------|
| 목록으로 돌아가기 | 모달 닫고 목록 새로고침 + 토스트 | ✓ |
| 다음 대기 신청으로 | 자동으로 다음 PENDING 모달 | |

**User's choice:** 목록으로 돌아가기

### 모달 구성

| Option | Description | Selected |
|--------|-------------|----------|
| 신청자 정보 + 입력 폼 | 상단 정보 + 하단 입력 | ✓ |
| 입력 폼만 | 정보는 상세 모달에서 | |

**User's choice:** 신청자 정보 + 입력 폼

### 사원번호

| Option | Description | Selected |
|--------|-------------|----------|
| 수동 입력만 | SUPER_ADMIN이 직접 입력 | ✓ |
| 자동생성 + 수정 가능 | 기본값 제안 + 수정 | |

**User's choice:** 수동 입력만

### 모달 관계

| Option | Description | Selected |
|--------|-------------|----------|
| 하나의 통합 모달 | 상세 + 승인/거부 액션이 하나의 모달 | ✓ |
| 두 단계 모달 | 상세 모달 → 승인 모달 분리 | |
| 상세 모달 + 승인 섹션 확장 | 슬라이드 다운으로 확장 | |

**User's choice:** 하나의 통합 모달

### 유효성 검증

| Option | Description | Selected |
|--------|-------------|----------|
| 필수값 검증만 | 부서/직급/사원번호 필수 입력 | ✓ |
| 사원번호 중복 검증 추가 | 실시간 중복 확인 | |
| Claude 재량 | 적절한 검증 수준 결정 | |

**User's choice:** 필수값 검증만

---

## 거부 워크플로우 UI

### 거부 UI

| Option | Description | Selected |
|--------|-------------|----------|
| 통합 모달 내 입력 | 거부 버튼 클릭 시 거부 사유 영역 표시 | ✓ |
| 별도 거부 다이얼로그 | ConfirmDialog 확장한 거부 다이얼로그 | |

**User's choice:** 통합 모달 내 입력

### 사유 입력 형태

| Option | Description | Selected |
|--------|-------------|----------|
| 텍스트에어리아 | 여러 줄 텍스트 입력 | ✓ |
| 드롭다운 + 텍스트 | 사전 정의 사유 + 상세 입력 | |

**User's choice:** 텍스트에어리아

### 거부 확인

| Option | Description | Selected |
|--------|-------------|----------|
| 확인 다이얼로그 표시 | "거부하시겠습니까?" 확인 | ✓ |
| 확인 없이 바로 거부 | 사유 입력이 이미 의도적 | |
| Claude 재량 | 적절한 확인 로직 결정 | |

**User's choice:** 확인 다이얼로그 표시

### 사유 길이

| Option | Description | Selected |
|--------|-------------|----------|
| 최소 길이 제한 | 의미 없는 입력 방지 | ✓ |
| 빈값만 검증 | 비어있지만 않으면 OK | |
| Claude 재량 | 적절한 검증 수준 결정 | |

**User's choice:** 최소 길이 제한

### 거부 후 동작

| Option | Description | Selected |
|--------|-------------|----------|
| 목록으로 돌아가기 | 모달 닫고 새로고침 + 토스트 | ✓ |
| 다음 대기 신청으로 | 자동으로 다음 PENDING 모달 | |

**User's choice:** 목록으로 돌아가기

---

## 네비게이션/진입점

### 메뉴 위치

| Option | Description | Selected |
|--------|-------------|----------|
| 사용자 관리 아래 | 사용자 관련 메뉴 그룹화 | ✓ |
| 맨 위에 배치 | 긴급한 작업이므로 첫 번째 | |
| Claude 재량 | 적절한 위치 결정 | |

**User's choice:** 사용자 관리 아래

### 라우트 경로

| Option | Description | Selected |
|--------|-------------|----------|
| /admin/registrations | 기존 패턴 일관성 | ✓ |
| /admin/registration-requests | 더 명시적 경로명 | |

**User's choice:** /admin/registrations

### 대기 건수 배지

| Option | Description | Selected |
|--------|-------------|----------|
| 배지 표시 | PENDING 건수 배지 | ✓ |
| 배지 없음 | 목록에서 확인 | |

**User's choice:** 배지 표시

---

## 에러 처리/토스트

| Option | Description | Selected |
|--------|-------------|----------|
| 기존 토스트 패턴 사용 | 프로젝트 기존 패턴 재사용 | ✓ |
| Claude 재량 | 기존 에러 처리 패턴 확인 후 구현 | |

**User's choice:** 기존 토스트 패턴 사용

### 동시 처리 충돌

| Option | Description | Selected |
|--------|-------------|----------|
| 에러 토스트 + 목록 새로고침 | "이미 처리된 신청" 에러 + 자동 새로고침 | ✓ |
| Claude 재량 | 백엔드 에러 응답 확인 후 처리 | |

**User's choice:** 에러 토스트 + 목록 새로고침

---

## 이미 처리된 신청 보기

| Option | Description | Selected |
|--------|-------------|----------|
| 읽기 전용 모달 | 동일 모달에서 버튼 숨김 | ✓ |
| 모달 없이 목록만 | 처리된 신청은 클릭 불가 | |
| Claude 재량 | 적절히 처리 | |

**User's choice:** 읽기 전용 모달

---

## 로딩/스켈레톤 UI

| Option | Description | Selected |
|--------|-------------|----------|
| 스피너 | 간단한 로딩 스피너 | ✓ |
| 스켈레톤 UI | 테이블 형태 스켈레톤 | |
| Claude 재량 | 기존 패턴 확인 후 구현 | |

**User's choice:** 스피너

---

## i18n/다국어

| Option | Description | Selected |
|--------|-------------|----------|
| i18n 키 사용 | admin 네임스페이스에 registration 키 추가 | ✓ |
| 하드코딩 한국어 | 컴포넌트에 직접 문자열 | |
| Claude 재량 | 기존 패턴 확인 후 구현 | |

**User's choice:** i18n 키 사용

---

## Claude's Discretion

- 거부 사유 최소 길이 구체적 값
- 승인/거부 버튼 스타일
- 모달 크기 및 세부 디자인
- 탭 API 최적화 (캐시, debounce)
- 로딩 스피너 위치/스타일
- 상태 배지 색상
- PENDING 건수 배지 API 호출 주기

## Deferred Ideas

None — discussion stayed within phase scope

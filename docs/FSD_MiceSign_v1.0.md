# [기능 정의서 v1.0] MiceSign 사내 맞춤형 전자 결재 시스템

> **문서 버전:** v1.0  
> **기준 PRD:** v2.0 (2026-03-31)  
> **최종 수정일:** 2026-03-31  
> **작성자:** P30 (부장 파트장)  
> **상태:** Draft → Review

---

## 목차

1. [문서 개요](#1-문서-개요)
2. [FN-AUTH: 인증 및 세션 관리](#2-fn-auth-인증-및-세션-관리)
3. [FN-ORG: 조직도 관리](#3-fn-org-조직도-관리)
4. [FN-TPL: 결재 양식 관리](#4-fn-tpl-결재-양식-관리)
5. [FN-DOC: 결재 문서 관리](#5-fn-doc-결재-문서-관리)
6. [FN-APR: 결재 처리](#6-fn-apr-결재-처리)
7. [FN-FILE: 첨부파일 관리](#7-fn-file-첨부파일-관리)
8. [FN-NTF: 알림 시스템](#8-fn-ntf-알림-시스템)
9. [FN-AUD: 감사 로그](#9-fn-aud-감사-로그)
10. [FN-DASH: 대시보드](#10-fn-dash-대시보드)
11. [FN-SEARCH: 문서 검색](#11-fn-search-문서-검색)
12. [공통 요구사항](#12-공통-요구사항)
13. [Phase별 기능 매핑](#13-phase별-기능-매핑)

---

## 1. 문서 개요

### 1.1. 목적
본 문서는 MiceSign 전자 결재 시스템 PRD v2.0에 정의된 요구사항을 기반으로, 각 기능 모듈의 상세 동작, 비즈니스 규칙, 입출력 명세, 화면 요구사항, 예외 처리를 정의한다.

### 1.2. 기능 ID 체계

```
FN-{모듈코드}-{시퀀스 3자리}
예: FN-AUTH-001 (인증 모듈의 첫 번째 기능)
```

### 1.3. 릴리스 Phase 범례

| Phase | 코드 | 설명 |
|-------|------|------|
| Phase 1-A | `P1A` | MVP: 핵심 결재 플로우 |
| Phase 1-B | `P1B` | 양식 확장, 알림, 검색 |
| Phase 1-C | `P1C` | 감사 로그 UI, 통계, 인수인계 |
| Phase 2 | `P2` | AI 연동 고도화 |

### 1.4. 역할 범례

| 코드 | 역할 |
|------|------|
| `SA` | SUPER_ADMIN |
| `AD` | ADMIN |
| `US` | USER |
| `ALL` | 인증된 모든 사용자 |
| `PUB` | 인증 불필요 (공개) |

---

## 2. FN-AUTH: 인증 및 세션 관리

### FN-AUTH-001. 로그인

| 항목 | 내용 |
|------|------|
| **Phase** | `P1A` |
| **권한** | `PUB` |
| **API** | `POST /api/auth/login` |
| **화면** | `/login` |

**기능 설명:**
사용자가 이메일(ID)과 비밀번호를 입력하여 시스템에 로그인한다. 인증 성공 시 Access Token과 Refresh Token을 발급한다.

**입력:**

| 필드 | 타입 | 필수 | 검증 규칙 |
|------|------|:----:|-----------|
| email | String | ✅ | 이메일 형식, 최대 150자 |
| password | String | ✅ | 8~50자 |

**처리 로직:**

1. 이메일로 사용자 조회
2. 사용자 상태 확인
   - `ACTIVE`가 아닌 경우 → 에러: "비활성 계정입니다. 관리자에게 문의하세요."
3. 계정 잠금 상태 확인
   - 잠금 중인 경우 → 에러: "계정이 잠겨 있습니다. {남은시간}분 후 재시도하세요."
4. 비밀번호 검증 (BCrypt 매칭)
   - 불일치 시 → 실패 횟수 +1 기록
   - **5회 연속 실패 시 → 15분 계정 잠금** (잠금 시각 기록)
5. 인증 성공 처리
   - 실패 횟수 초기화
   - Access Token 발급 (TTL: 30분)
   - Refresh Token 발급 (TTL: 14일), `HttpOnly` + `Secure` + `SameSite=Strict` 쿠키 설정
   - Refresh Token 해시를 `refresh_token` 테이블에 저장
   - `last_login_at` 갱신
   - 감사 로그: `USER_LOGIN`

**출력 (성공):**

```json
{
  "accessToken": "eyJhbG...",
  "user": {
    "id": 1,
    "name": "홍길동",
    "email": "hong@miceleech.com",
    "employeeNo": "EMP001",
    "departmentName": "기획팀",
    "positionName": "부장",
    "role": "USER",
    "profileImage": null
  }
}
```

**에러 응답:**

| 상황 | HTTP 상태 | 코드 | 메시지 |
|------|-----------|------|--------|
| 이메일 없음 | 401 | `AUTH_INVALID_CREDENTIALS` | 이메일 또는 비밀번호가 일치하지 않습니다 |
| 비밀번호 불일치 | 401 | `AUTH_INVALID_CREDENTIALS` | 이메일 또는 비밀번호가 일치하지 않습니다 |
| 비활성 계정 | 403 | `AUTH_ACCOUNT_INACTIVE` | 비활성 계정입니다. 관리자에게 문의하세요 |
| 퇴직 계정 | 403 | `AUTH_ACCOUNT_RETIRED` | 퇴직 처리된 계정입니다 |
| 계정 잠금 | 423 | `AUTH_ACCOUNT_LOCKED` | 계정이 잠겨 있습니다. {분}분 후 재시도하세요 |

**화면 요구사항:**
- 이메일, 비밀번호 입력 필드 + 로그인 버튼
- 비밀번호 표시/숨김 토글
- 로그인 실패 시 에러 메시지 인라인 표시
- 잠금 시 남은 시간 카운트다운 표시
- 로그인 성공 시 대시보드(`/`)로 리다이렉트

---

### FN-AUTH-002. 토큰 갱신

| 항목 | 내용 |
|------|------|
| **Phase** | `P1A` |
| **권한** | 유효한 Refresh Token 보유자 |
| **API** | `POST /api/auth/refresh` |

**기능 설명:**
Access Token 만료 시 Refresh Token을 이용하여 새로운 Access Token과 Refresh Token을 발급받는다. (Refresh Token Rotation)

**입력:**
- Refresh Token: `HttpOnly` 쿠키에서 자동 추출 (별도 파라미터 없음)

**처리 로직:**

1. 쿠키에서 Refresh Token 추출
2. 토큰 유효성 검증 (만료, 서명)
3. `refresh_token` 테이블에서 해시 매칭 확인
   - 매칭 실패 (이미 사용된 토큰) → **토큰 탈취 의심: 해당 사용자의 모든 RT 무효화**
4. 기존 Refresh Token 삭제
5. 새 Access Token + Refresh Token 발급
6. 새 Refresh Token 해시를 DB에 저장

**출력 (성공):**

```json
{
  "accessToken": "eyJhbG...(새 토큰)"
}
```
- 새 Refresh Token은 `Set-Cookie` 헤더로 설정

**에러 응답:**

| 상황 | HTTP 상태 | 코드 |
|------|-----------|------|
| RT 쿠키 없음 | 401 | `AUTH_REFRESH_REQUIRED` |
| RT 만료 | 401 | `AUTH_REFRESH_EXPIRED` |
| RT 재사용 감지 (탈취 의심) | 401 | `AUTH_TOKEN_REUSE_DETECTED` |

**프론트엔드 연동:**
- Axios/Fetch 인터셉터에서 401 응답 시 자동으로 `/api/auth/refresh` 호출
- 갱신 성공 시 원래 요청 재시도
- 갱신 실패 시 로그인 페이지로 리다이렉트

---

### FN-AUTH-003. 로그아웃

| 항목 | 내용 |
|------|------|
| **Phase** | `P1A` |
| **권한** | `ALL` |
| **API** | `POST /api/auth/logout` |

**기능 설명:**
현재 세션의 Refresh Token을 무효화하고 쿠키를 삭제한다.

**처리 로직:**

1. 쿠키에서 Refresh Token 추출
2. `refresh_token` 테이블에서 해당 토큰 삭제
3. 쿠키 삭제 (`Set-Cookie: Max-Age=0`)
4. 프론트엔드 메모리의 Access Token 삭제 (클라이언트 측)
5. 감사 로그: `USER_LOGOUT`

**출력:**

```json
{ "message": "로그아웃 되었습니다." }
```

---

### FN-AUTH-004. 비밀번호 변경

| 항목 | 내용 |
|------|------|
| **Phase** | `P1A` |
| **권한** | `ALL` |
| **API** | `PUT /api/auth/password` |

**기능 설명:**
사용자 본인이 현재 비밀번호를 확인한 후 새 비밀번호로 변경한다.

**입력:**

| 필드 | 타입 | 필수 | 검증 규칙 |
|------|------|:----:|-----------|
| currentPassword | String | ✅ | 현재 비밀번호 |
| newPassword | String | ✅ | 영문 + 숫자 + 특수문자 조합, 8자 이상 50자 이하 |
| confirmPassword | String | ✅ | newPassword와 동일 |

**처리 로직:**

1. 현재 비밀번호 BCrypt 매칭 검증
2. 새 비밀번호 복잡도 검증
3. 현재 비밀번호와 새 비밀번호 동일 여부 체크 (동일 시 거부)
4. 새 비밀번호 BCrypt 해시 후 저장
5. 해당 사용자의 **모든 Refresh Token 무효화** (전체 세션 로그아웃)
6. 감사 로그 기록

**에러 응답:**

| 상황 | HTTP 상태 | 코드 |
|------|-----------|------|
| 현재 비밀번호 불일치 | 400 | `AUTH_WRONG_PASSWORD` |
| 복잡도 미충족 | 400 | `AUTH_WEAK_PASSWORD` |
| 현재와 동일 | 400 | `AUTH_SAME_PASSWORD` |

---

### FN-AUTH-005. 초기 비밀번호 발급 (관리자)

| 항목 | 내용 |
|------|------|
| **Phase** | `P1A` |
| **권한** | `SA`, `AD` |
| **API** | `POST /api/admin/users/{id}/reset-password` |

**기능 설명:**
관리자가 신규 사용자 등록 또는 비밀번호 분실 시 초기 비밀번호를 발급한다.

**처리 로직:**

1. 대상 사용자 권한 검증 (ADMIN은 SUPER_ADMIN의 비밀번호 리셋 불가)
2. 임시 비밀번호 자동 생성 (12자, 영문+숫자+특수문자)
3. BCrypt 해시 후 저장
4. 해당 사용자의 모든 Refresh Token 무효화
5. 응답으로 임시 비밀번호 반환 (관리자가 대상자에게 전달)
6. 감사 로그: `ADMIN_USER_EDIT` (비밀번호 리셋)

**비즈니스 규칙:**
- 임시 비밀번호 발급 후 사용자 최초 로그인 시 비밀번호 변경 강제 → Phase 1-B에서 구현 (Phase 1-A에서는 수동 변경 안내)

---

## 3. FN-ORG: 조직도 관리

### FN-ORG-001. 부서 목록 조회 (트리)

| 항목 | 내용 |
|------|------|
| **Phase** | `P1A` |
| **권한** | `ALL` |
| **API** | `GET /api/departments/tree` |

**기능 설명:**
전체 부서를 계층 트리 구조로 조회한다. 결재선 편집기의 조직도 검색, 관리 페이지 등에서 사용한다.

**처리 로직:**

1. `department` 테이블에서 `is_active = true`인 부서 전체 조회
2. `parent_id` 기준으로 트리 구조 변환
3. 각 노드에 `sort_order` 기준 정렬 적용

**출력:**

```json
[
  {
    "id": 1,
    "name": "경영지원본부",
    "parentId": null,
    "sortOrder": 1,
    "children": [
      {
        "id": 2,
        "name": "인사팀",
        "parentId": 1,
        "sortOrder": 1,
        "children": []
      },
      {
        "id": 3,
        "name": "재무팀",
        "parentId": 1,
        "sortOrder": 2,
        "children": []
      }
    ]
  }
]
```

---

### FN-ORG-002. 부서 등록

| 항목 | 내용 |
|------|------|
| **Phase** | `P1A` |
| **권한** | `SA`, `AD` |
| **API** | `POST /api/admin/departments` |

**입력:**

| 필드 | 타입 | 필수 | 검증 규칙 |
|------|------|:----:|-----------|
| name | String | ✅ | 1~100자, 동일 레벨에서 중복 불가 |
| parentId | Long | ❌ | NULL이면 최상위 부서 |
| sortOrder | Integer | ✅ | 0 이상 |

**처리 로직:**

1. parentId 유효성 검증 (존재 여부, 활성 상태)
2. 동일 parentId 하위에서 name 중복 체크
3. 부서 생성
4. 감사 로그: `ADMIN_ORG_EDIT`

---

### FN-ORG-003. 부서 수정

| 항목 | 내용 |
|------|------|
| **Phase** | `P1A` |
| **권한** | `SA`, `AD` |
| **API** | `PUT /api/admin/departments/{id}` |

**입력:**

| 필드 | 타입 | 필수 | 검증 규칙 |
|------|------|:----:|-----------|
| name | String | ✅ | 1~100자 |
| parentId | Long | ❌ | 자기 자신 및 하위 부서로 이동 불가 |
| sortOrder | Integer | ✅ | 0 이상 |
| isActive | Boolean | ✅ | - |

**비즈니스 규칙:**
- 비활성화 시 해당 부서에 `ACTIVE` 상태의 사용자가 존재하면 → 에러: "활성 사용자가 있는 부서는 비활성화할 수 없습니다."
- 순환 참조 방지: parentId를 변경할 때 자기 자신 또는 자신의 하위 부서를 parent로 지정 불가

---

### FN-ORG-004. 직급 목록 조회

| 항목 | 내용 |
|------|------|
| **Phase** | `P1A` |
| **권한** | `ALL` |
| **API** | `GET /api/positions` |

**출력:** 직급 목록 (`sort_order` ASC 정렬)

```json
[
  { "id": 1, "name": "사원", "sortOrder": 1 },
  { "id": 2, "name": "대리", "sortOrder": 2 },
  { "id": 3, "name": "과장", "sortOrder": 3 },
  { "id": 4, "name": "차장", "sortOrder": 4 },
  { "id": 5, "name": "부장", "sortOrder": 5 },
  { "id": 6, "name": "이사", "sortOrder": 6 },
  { "id": 7, "name": "대표이사", "sortOrder": 7 }
]
```

---

### FN-ORG-005. 직급 등록/수정

| 항목 | 내용 |
|------|------|
| **Phase** | `P1A` |
| **권한** | `SA` |
| **API** | `POST /api/admin/positions`, `PUT /api/admin/positions/{id}` |

**입력:**

| 필드 | 타입 | 필수 | 검증 규칙 |
|------|------|:----:|-----------|
| name | String | ✅ | 1~50자, 전체 중복 불가 |
| sortOrder | Integer | ✅ | 1 이상 |
| isActive | Boolean | ✅ | - |

**비즈니스 규칙:**
- 비활성화 시 해당 직급을 가진 `ACTIVE` 사용자가 존재하면 거부

---

### FN-ORG-006. 사용자 목록 조회

| 항목 | 내용 |
|------|------|
| **Phase** | `P1A` |
| **권한** | `ALL` (범위 상이) |
| **API** | `GET /api/users` |

**기능 설명:**
사용자 목록을 조회한다. 두 가지 용도로 사용된다:
1. **결재선 검색용 (ALL):** 결재선 편집기에서 사용자를 검색할 때 사용. `ACTIVE` 사용자만 반환.
2. **관리 목록 (AD+):** 관리 페이지에서 전체 사용자 관리. 모든 상태 포함.

**쿼리 파라미터:**

| 파라미터 | 타입 | 설명 |
|----------|------|------|
| keyword | String | 이름 또는 사번 검색 |
| departmentId | Long | 부서 필터 |
| positionId | Long | 직급 필터 |
| status | String | 상태 필터 (관리용) |
| role | String | 역할 필터 (관리용) |
| page | Integer | 페이지 번호 (0부터) |
| size | Integer | 페이지 크기 (기본 20) |

**출력 (단건):**

```json
{
  "id": 1,
  "employeeNo": "EMP001",
  "name": "홍길동",
  "email": "hong@miceleech.com",
  "departmentId": 2,
  "departmentName": "기획팀",
  "positionId": 5,
  "positionName": "부장",
  "role": "USER",
  "status": "ACTIVE",
  "phone": "010-1234-5678"
}
```

---

### FN-ORG-007. 사용자 등록

| 항목 | 내용 |
|------|------|
| **Phase** | `P1A` |
| **권한** | `SA`, `AD` |
| **API** | `POST /api/admin/users` |

**입력:**

| 필드 | 타입 | 필수 | 검증 규칙 |
|------|------|:----:|-----------|
| employeeNo | String | ✅ | 1~20자, 전체 고유 |
| name | String | ✅ | 1~50자 |
| email | String | ✅ | 이메일 형식, 전체 고유, 최대 150자 |
| departmentId | Long | ✅ | 활성 부서 존재 |
| positionId | Long | ✅ | 활성 직급 존재 |
| role | Enum | ✅ | `USER`, `ADMIN`, `SUPER_ADMIN` |
| phone | String | ❌ | 전화번호 형식, 최대 20자 |

**처리 로직:**

1. 입력값 검증 (이메일 중복, 사번 중복)
2. 초기 비밀번호 자동 생성 (12자, 영문+숫자+특수문자)
3. BCrypt 해시 처리
4. `user` 테이블에 `ACTIVE` 상태로 등록
5. 감사 로그: `ADMIN_USER_EDIT`
6. 응답에 임시 비밀번호 포함 (관리자가 사용자에게 전달)

**권한 제약:**
- `ADMIN` 역할은 `SUPER_ADMIN` 계정 생성 불가
- `SUPER_ADMIN`만 `SUPER_ADMIN` 계정 생성 가능

---

### FN-ORG-008. 사용자 수정

| 항목 | 내용 |
|------|------|
| **Phase** | `P1A` |
| **권한** | `SA`, `AD` |
| **API** | `PUT /api/admin/users/{id}` |

**입력:**

| 필드 | 타입 | 필수 | 검증 규칙 |
|------|------|:----:|-----------|
| name | String | ✅ | 1~50자 |
| departmentId | Long | ✅ | 활성 부서 존재 |
| positionId | Long | ✅ | 활성 직급 존재 |
| role | Enum | ✅ | `USER`, `ADMIN`, `SUPER_ADMIN` |
| status | Enum | ✅ | `ACTIVE`, `INACTIVE`, `RETIRED` |
| phone | String | ❌ | - |

**비즈니스 규칙:**
- `RETIRED` 전환 시 미완료 결재건 확인 → 경고 메시지 + 관리자 확인 후 처리
- `RETIRED` 전환 후에는 `ACTIVE`로 복귀 불가
- `ADMIN`은 `SUPER_ADMIN`의 정보 수정 불가
- 이메일, 사번은 등록 후 수정 불가 (변경 필요 시 SUPER_ADMIN에게 요청)

---

### FN-ORG-009. 퇴직자 결재건 일괄 처리

| 항목 | 내용 |
|------|------|
| **Phase** | `P1C` |
| **권한** | `SA`, `AD` |
| **API** | `POST /api/admin/users/{id}/handle-retirement` |

**기능 설명:**
퇴직 처리 대상 사용자의 미완료 결재건을 일괄 정리한다.

**처리 로직:**

1. 대상 사용자가 **기안자**인 DRAFT/SUBMITTED 문서 → `WITHDRAWN` 상태로 일괄 변경
2. 대상 사용자가 **결재선**에 포함된 PENDING 라인 → `SKIPPED` 처리
   - 해당 문서의 다음 결재 단계로 자동 진행
   - 해당 결재선의 마지막 단계였다면 → 이전 단계 승인 기준으로 문서 상태 갱신
3. 사용자 상태를 `RETIRED`로 변경
4. 모든 Refresh Token 무효화
5. 감사 로그 기록 (처리된 문서 목록 포함)

**출력:**

```json
{
  "withdrawnDocuments": 3,
  "skippedApprovalLines": 2,
  "message": "퇴직 처리가 완료되었습니다."
}
```

---

## 4. FN-TPL: 결재 양식 관리

### FN-TPL-001. 양식 목록 조회

| 항목 | 내용 |
|------|------|
| **Phase** | `P1A` |
| **권한** | `ALL` |
| **API** | `GET /api/templates` |

**기능 설명:**
사용 가능한 결재 양식 목록을 조회한다. 문서 작성 시 양식 선택 드롭다운에 사용된다.

**처리 로직:**
- 일반 사용자: `is_active = true`인 양식만 반환
- 관리자: 전체 양식 반환 (비활성 포함)

**출력:**

```json
[
  {
    "id": 1,
    "code": "GENERAL",
    "name": "일반 업무 기안",
    "description": "일반적인 업무 기안 및 보고에 사용합니다.",
    "prefix": "GEN",
    "isActive": true,
    "sortOrder": 1
  }
]
```

---

### FN-TPL-002. 양식 등록/수정

| 항목 | 내용 |
|------|------|
| **Phase** | `P1B` |
| **권한** | `SA`, `AD` |
| **API** | `POST /api/admin/templates`, `PUT /api/admin/templates/{id}` |

**기능 설명:**
양식 마스터 데이터를 등록/수정한다. 실제 양식 컴포넌트는 하드코딩이므로, 이 API는 **메타데이터(이름, 코드, 접두사, 활성 여부)** 관리 용도이다.

**입력:**

| 필드 | 타입 | 필수 | 검증 규칙 |
|------|------|:----:|-----------|
| code | String | ✅ | 영대문자+언더스코어, 1~20자, 전체 고유 |
| name | String | ✅ | 1~100자 |
| description | String | ❌ | 최대 500자 |
| prefix | String | ✅ | 영대문자, 2~10자, 전체 고유 |
| sortOrder | Integer | ✅ | 0 이상 |
| isActive | Boolean | ✅ | - |

**비즈니스 규칙:**
- 코드(code)와 접두사(prefix)는 등록 후 변경 불가
- 비활성화 시 해당 양식으로 DRAFT 상태인 문서가 존재하면 경고 표시 (진행은 허용)
- 새 양식 코드에 매핑되는 프론트엔드 컴포넌트가 배포되어 있어야 실제 사용 가능

---

### FN-TPL-003. 양식별 폼 데이터 스키마 (하드코딩)

**기능 설명:**
각 양식 컴포넌트가 `document_content.form_data`에 저장하는 JSON 구조를 정의한다.

**GENERAL (일반 업무 기안):**

```json
{
  "type": "GENERAL"
}
```
- `body_html` 필드에 Rich Text HTML 본문 저장
- `form_data`는 양식 유형 식별자만 포함

**EXPENSE (지출 결의서):**

```json
{
  "type": "EXPENSE",
  "items": [
    {
      "description": "회의실 대관료",
      "quantity": 1,
      "unitPrice": 500000,
      "amount": 500000,
      "note": "3층 대회의실"
    }
  ],
  "totalAmount": 1200000,
  "paymentMethod": "CORPORATE_CARD",
  "accountInfo": "기획팀 법인카드"
}
```

| 필드 | 타입 | 필수 | 검증 |
|------|------|:----:|------|
| items | Array | ✅ | 1개 이상 |
| items[].description | String | ✅ | 1~200자 |
| items[].quantity | Integer | ✅ | 1 이상 |
| items[].unitPrice | Long | ✅ | 0 이상 |
| items[].amount | Long | ✅ | quantity × unitPrice (자동계산) |
| items[].note | String | ❌ | 최대 200자 |
| totalAmount | Long | ✅ | items[].amount 합계 (자동계산) |
| paymentMethod | Enum | ✅ | `CORPORATE_CARD`, `CASH`, `TRANSFER` |
| accountInfo | String | ❌ | 최대 200자 |

**LEAVE (휴가 신청서):**

```json
{
  "type": "LEAVE",
  "leaveType": "ANNUAL",
  "startDate": "2026-04-01",
  "endDate": "2026-04-03",
  "days": 3.0,
  "reason": "개인 사유",
  "emergencyContact": "010-9999-8888"
}
```

| 필드 | 타입 | 필수 | 검증 |
|------|------|:----:|------|
| leaveType | Enum | ✅ | `ANNUAL`(연차), `HALF_AM`(오전반차), `HALF_PM`(오후반차), `SICK`(병가), `FAMILY`(경조) |
| startDate | LocalDate | ✅ | 오늘 이후 |
| endDate | LocalDate | ✅ | startDate 이후 |
| days | Double | ✅ | 자동계산: 반차=0.5, 그 외=영업일 기준 계산 |
| reason | String | ✅ | 1~500자 |
| emergencyContact | String | ❌ | 전화번호 형식 |

---

## 5. FN-DOC: 결재 문서 관리

### FN-DOC-001. 문서 생성 (임시저장)

| 항목 | 내용 |
|------|------|
| **Phase** | `P1A` |
| **권한** | `ALL` |
| **API** | `POST /api/documents` |
| **화면** | `/documents/new` |

**기능 설명:**
새 결재 문서를 DRAFT 상태로 생성한다. 문서번호는 아직 부여되지 않는다.

**입력:**

| 필드 | 타입 | 필수 | 검증 규칙 |
|------|------|:----:|-----------|
| templateCode | String | ✅ | 활성 양식 코드 |
| title | String | ✅ | 1~300자 |
| bodyHtml | String | ❌ | Rich Text HTML (GENERAL 양식) |
| formData | JSON | ❌ | 양식별 구조화 데이터 |
| approvalLines | Array | ❌ | 결재선 (임시저장 시 미지정 허용) |

**approvalLines 항목:**

| 필드 | 타입 | 필수 | 검증 규칙 |
|------|------|:----:|-----------|
| approverId | Long | ✅ | ACTIVE 상태의 사용자 |
| lineType | Enum | ✅ | `APPROVE`, `AGREE`, `REFERENCE` |
| stepOrder | Integer | ✅ | 1 이상 (REFERENCE는 0) |

**처리 로직:**

1. 양식 코드 유효성 검증
2. `document` 테이블에 `DRAFT` 상태로 INSERT (`doc_number`는 NULL)
3. `document_content` 테이블에 본문/폼데이터 INSERT
4. 결재선 지정 시 `approval_line` 테이블에 INSERT
5. 감사 로그: `DOC_CREATE`

**출력:**

```json
{
  "id": 42,
  "docNumber": null,
  "templateCode": "GENERAL",
  "title": "2026년 상반기 마케팅 전략 보고",
  "status": "DRAFT",
  "createdAt": "2026-03-31T10:30:00"
}
```

---

### FN-DOC-002. 임시저장 문서 수정

| 항목 | 내용 |
|------|------|
| **Phase** | `P1A` |
| **권한** | 기안자 본인 |
| **API** | `PUT /api/documents/{id}` |

**비즈니스 규칙:**
- `DRAFT` 상태의 문서만 수정 가능
- 기안자 본인만 수정 가능
- `templateCode`는 수정 불가 (양식 변경 시 새 문서 생성)
- 결재선, 본문, 첨부파일 모두 자유롭게 수정 가능

**처리 로직:**

1. 문서 상태 확인 (`DRAFT`가 아니면 → 에러: "임시저장 상태의 문서만 수정할 수 있습니다.")
2. 기안자 본인 확인
3. `document`, `document_content` UPDATE
4. 결재선 변경 시: 기존 `approval_line` 전체 삭제 후 새로 INSERT

---

### FN-DOC-003. 문서 상신

| 항목 | 내용 |
|------|------|
| **Phase** | `P1A` |
| **권한** | 기안자 본인 |
| **API** | `POST /api/documents/{id}/submit` |

**기능 설명:**
DRAFT 상태의 문서를 결재선에 올린다. 이 시점에 문서번호가 채번되고, 문서가 Lock된다.

**사전 검증:**

| 검증 항목 | 에러 시 메시지 |
|-----------|---------------|
| 문서 상태가 DRAFT | 임시저장 상태의 문서만 상신할 수 있습니다 |
| 기안자 본인 | 기안자만 상신할 수 있습니다 |
| 제목 입력 | 문서 제목을 입력해 주세요 |
| 결재선에 APPROVE 유형 1명 이상 | 결재자를 1명 이상 지정해 주세요 |
| 결재선에 자기 자신 미포함 | 기안자 본인을 결재선에 포함할 수 없습니다 |
| 양식별 필수 필드 검증 | (양식별 상이) |

**처리 로직:**

1. 사전 검증 통과
2. **채번 처리** (트랜잭션 내 비관적 잠금):
   ```sql
   SELECT last_sequence FROM doc_sequence
   WHERE template_code = ? AND year = ?
   FOR UPDATE;
   ```
   - 시퀀스 +1 후 UPDATE
   - 문서번호 생성: `{prefix}-{year}-{sequence:4자리 제로패딩}`
3. `document` 상태 → `SUBMITTED`, `doc_number` 설정, `submitted_at` 기록
4. `current_step` → 1 (첫 번째 결재 단계)
5. 감사 로그: `DOC_SUBMIT`
6. **(Phase 1-B)** 첫 번째 결재자에게 이메일 알림 발송 이벤트 발행

**에러 응답:**

| 상황 | HTTP 상태 | 코드 |
|------|-----------|------|
| DRAFT가 아닌 상태 | 409 | `DOC_INVALID_STATUS` |
| 결재선 미지정 | 400 | `DOC_NO_APPROVAL_LINE` |
| 양식 필수값 누락 | 400 | `DOC_INVALID_FORM_DATA` |

---

### FN-DOC-004. 문서 상세 조회

| 항목 | 내용 |
|------|------|
| **Phase** | `P1A` |
| **권한** | 열람 권한자 (PRD 7.3 참조) |
| **API** | `GET /api/documents/{id}` |
| **화면** | `/documents/:id` |

**열람 권한 검증 우선순위:**

1. 기안자 본인 → 허용
2. 결재선(APPROVE/AGREE) 포함자 → 허용
3. 참조(REFERENCE) 포함자 → 허용
4. ADMIN + 기안자가 소속 부서원 → 허용
5. SUPER_ADMIN → 허용
6. 그 외 → 403 Forbidden

**출력:**

```json
{
  "id": 42,
  "docNumber": "GEN-2026-0001",
  "templateCode": "GENERAL",
  "templateName": "일반 업무 기안",
  "title": "2026년 상반기 마케팅 전략 보고",
  "status": "SUBMITTED",
  "drafter": {
    "id": 1,
    "name": "홍길동",
    "departmentName": "기획팀",
    "positionName": "부장"
  },
  "content": {
    "bodyHtml": "<p>본문 내용...</p>",
    "formData": null
  },
  "approvalLines": [
    {
      "id": 101,
      "lineType": "APPROVE",
      "stepOrder": 1,
      "status": "APPROVED",
      "comment": "검토 완료, 승인합니다.",
      "actedAt": "2026-03-31T11:00:00",
      "approver": {
        "id": 5,
        "name": "김팀장",
        "departmentName": "기획팀",
        "positionName": "이사"
      }
    },
    {
      "id": 102,
      "lineType": "APPROVE",
      "stepOrder": 2,
      "status": "PENDING",
      "comment": null,
      "actedAt": null,
      "approver": {
        "id": 10,
        "name": "박대표",
        "departmentName": "경영지원본부",
        "positionName": "대표이사"
      }
    }
  ],
  "attachments": [
    {
      "id": 201,
      "originalName": "마케팅전략.pdf",
      "fileSize": 2048000,
      "mimeType": "application/pdf",
      "uploadedBy": "홍길동",
      "createdAt": "2026-03-31T10:25:00"
    }
  ],
  "currentStep": 2,
  "submittedAt": "2026-03-31T10:30:00",
  "completedAt": null,
  "sourceDocId": null,
  "createdAt": "2026-03-31T10:20:00"
}
```

**화면 요구사항:**
- **문서 정보 영역:** 문서번호, 양식, 기안자, 상신일, 상태 뱃지
- **결재선 현황 영역:** 결재선 시각화 (카드 또는 스텝 형태), 각 단계의 상태(대기/승인/반려) 색상 구분, 결재 의견 표시
- **문서 본문 영역:** 양식별 하드코딩 컴포넌트의 읽기 전용(Read-Only) 뷰 렌더링
- **첨부파일 영역:** 파일명, 용량, 다운로드 버튼
- **액션 버튼 영역:** 상태 및 권한에 따라 동적 표시

| 상태 | 기안자 | 현재 결재자 | 그 외 |
|------|--------|------------|-------|
| DRAFT | 수정, 상신, 삭제 | - | - |
| SUBMITTED | 회수 | 승인, 반려 | (열람만) |
| APPROVED | (열람만) | - | (열람만) |
| REJECTED | 재기안 | - | (열람만) |
| WITHDRAWN | (열람만) | - | (열람만) |

**부가 처리:**
- 감사 로그: `DOC_VIEW` (상세 조회 시마다 기록)

---

### FN-DOC-005. 문서 회수

| 항목 | 내용 |
|------|------|
| **Phase** | `P1A` |
| **권한** | 기안자 본인 |
| **API** | `POST /api/documents/{id}/withdraw` |

**사전 검증:**

| 검증 항목 | 에러 시 |
|-----------|---------|
| 문서 상태가 SUBMITTED | SUBMITTED 상태의 문서만 회수할 수 있습니다 |
| 기안자 본인 | 기안자만 회수할 수 있습니다 |
| 현재 결재 단계 미처리 | 이미 결재가 진행된 단계가 있으면 회수할 수 없습니다 |

**회수 가능 조건 상세:**
- `current_step`에 해당하는 결재자가 아직 `PENDING` 상태일 때만 회수 가능
- 이미 1명이라도 승인/반려 처리를 했다면 회수 불가

**처리 로직:**

1. 사전 검증
2. `document.status` → `WITHDRAWN`, `completed_at` 기록
3. 모든 PENDING 상태의 `approval_line` → `SKIPPED` 처리
4. 감사 로그: `DOC_WITHDRAW`
5. **(Phase 1-B)** 결재선 전체에 회수 알림 메일 발송

---

### FN-DOC-006. 재기안 (내용 복사하여 새 문서 생성)

| 항목 | 내용 |
|------|------|
| **Phase** | `P1A` |
| **권한** | 기안자 본인 |
| **API** | `POST /api/documents/{id}/rewrite` |

**기능 설명:**
반려(`REJECTED`) 또는 회수(`WITHDRAWN`) 상태의 문서 내용을 복사하여 새로운 DRAFT 문서를 생성한다.

**사전 검증:**
- 원본 문서 상태가 `REJECTED` 또는 `WITHDRAWN`
- 기안자 본인

**처리 로직:**

1. 사전 검증
2. 새 `document` 레코드 생성 (`DRAFT` 상태, `doc_number` = NULL)
   - `source_doc_id` = 원본 문서 ID (추적용)
3. 원본 `document_content` 복사 → 새 `document_content` 생성
4. 원본 `approval_line` 복사 → 새 `approval_line` 생성 (모든 상태 `PENDING`으로 리셋)
5. **첨부파일은 복사하지 않음** (Google Drive 파일은 재업로드 필요)
6. 감사 로그: `DOC_CREATE` (source_doc_id 기록)

**출력:**

```json
{
  "id": 55,
  "docNumber": null,
  "sourceDocId": 42,
  "status": "DRAFT",
  "message": "재기안 문서가 생성되었습니다. 내용을 확인 후 상신해 주세요."
}
```

---

### FN-DOC-007. 임시저장 문서 삭제

| 항목 | 내용 |
|------|------|
| **Phase** | `P1A` |
| **권한** | 기안자 본인 |
| **API** | `DELETE /api/documents/{id}` |

**비즈니스 규칙:**
- `DRAFT` 상태만 삭제 가능
- 기안자 본인만 삭제 가능
- 물리적 삭제 (soft delete 아님) — DRAFT는 공식 문서가 아니므로
- 연관 `document_content`, `approval_line`, `document_attachment` 함께 삭제
- 첨부파일이 있다면 Google Drive에서도 삭제 시도 (실패 시 로그만 남기고 진행)

---

### FN-DOC-008. 내 문서함 조회

| 항목 | 내용 |
|------|------|
| **Phase** | `P1A` |
| **권한** | `ALL` |
| **API** | `GET /api/documents/my` |
| **화면** | `/documents/my` |

**기능 설명:**
로그인한 사용자가 기안한 문서 목록을 조회한다.

**쿼리 파라미터:**

| 파라미터 | 타입 | 설명 | 기본값 |
|----------|------|------|--------|
| status | String | 상태 필터 (복수 가능, 콤마 구분) | 전체 |
| templateCode | String | 양식 필터 | 전체 |
| startDate | LocalDate | 생성일 시작 | - |
| endDate | LocalDate | 생성일 종료 | - |
| keyword | String | 제목 검색 | - |
| page | Integer | 페이지 번호 | 0 |
| size | Integer | 페이지 크기 | 20 |
| sort | String | 정렬 | `createdAt,desc` |

**출력 (목록 항목):**

```json
{
  "id": 42,
  "docNumber": "GEN-2026-0001",
  "templateName": "일반 업무 기안",
  "title": "2026년 상반기 마케팅 전략 보고",
  "status": "SUBMITTED",
  "currentApprover": "김팀장 이사",
  "submittedAt": "2026-03-31T10:30:00",
  "createdAt": "2026-03-31T10:20:00"
}
```

**화면 요구사항:**
- 상태별 탭 또는 필터 칩 (전체, 임시저장, 결재진행, 승인완료, 반려, 회수)
- 각 상태에 맞는 뱃지 색상
- 임시저장 건은 목록에서 직접 삭제 가능 (휴지통 아이콘)
- 결재진행 건은 현재 결재자명 표시
- 행 클릭 시 상세 페이지(`/documents/:id`)로 이동

---

### FN-DOC-009. 참조 문서함 조회

| 항목 | 내용 |
|------|------|
| **Phase** | `P1A` |
| **권한** | `ALL` |
| **API** | `GET /api/documents/referenced` |
| **화면** | `/references` |

**기능 설명:**
로그인한 사용자가 참조(`REFERENCE`)로 지정된 문서 목록을 조회한다.

**쿼리 파라미터:** FN-DOC-008과 동일 (status 필터 제외)

**비즈니스 규칙:**
- `SUBMITTED` 이상 상태의 문서만 표시 (DRAFT 제외)
- 읽음/안읽음 표시는 Phase 1-B에서 구현

---

## 6. FN-APR: 결재 처리

### FN-APR-001. 결재 대기 목록 조회

| 항목 | 내용 |
|------|------|
| **Phase** | `P1A` |
| **권한** | `ALL` |
| **API** | `GET /api/approvals/pending` |
| **화면** | `/approvals/pending` |

**기능 설명:**
로그인한 사용자가 현재 결재해야 할 (자신의 차례인) 문서 목록을 조회한다.

**조회 조건:**
```sql
SELECT d.*, al.*
FROM approval_line al
JOIN document d ON al.document_id = d.id
WHERE al.approver_id = :currentUserId
  AND al.status = 'PENDING'
  AND al.line_type IN ('APPROVE', 'AGREE')
  AND d.status = 'SUBMITTED'
  AND d.current_step = al.step_order
ORDER BY d.submitted_at ASC;
```

**출력 (목록 항목):**

```json
{
  "approvalLineId": 102,
  "lineType": "APPROVE",
  "document": {
    "id": 42,
    "docNumber": "GEN-2026-0001",
    "templateName": "일반 업무 기안",
    "title": "2026년 상반기 마케팅 전략 보고",
    "drafter": {
      "name": "홍길동",
      "departmentName": "기획팀",
      "positionName": "부장"
    },
    "submittedAt": "2026-03-31T10:30:00"
  }
}
```

**화면 요구사항:**
- 대기 건수 뱃지 (헤더 네비게이션에도 표시)
- 상신일 기준 오래된 순 기본 정렬
- 행 클릭 시 문서 상세 페이지로 이동 (즉시 결재 가능)
- 긴급도 표시는 Phase 2 검토

---

### FN-APR-002. 결재 완료 목록 조회

| 항목 | 내용 |
|------|------|
| **Phase** | `P1A` |
| **권한** | `ALL` |
| **API** | `GET /api/approvals/completed` |
| **화면** | `/approvals/completed` |

**조회 조건:**
```sql
WHERE al.approver_id = :currentUserId
  AND al.status IN ('APPROVED', 'REJECTED', 'SKIPPED')
ORDER BY al.acted_at DESC;
```

---

### FN-APR-003. 승인 처리

| 항목 | 내용 |
|------|------|
| **Phase** | `P1A` |
| **권한** | 현재 결재 차례인 결재/합의자 |
| **API** | `POST /api/approvals/{lineId}/approve` |

**입력:**

| 필드 | 타입 | 필수 | 검증 규칙 |
|------|------|:----:|-----------|
| comment | String | ❌ | 최대 1000자 |

**사전 검증:**

| 검증 항목 | 에러 시 |
|-----------|---------|
| 결재 라인 존재 | 유효하지 않은 결재 라인입니다 |
| 결재자 본인 | 본인에게 할당된 결재만 처리할 수 있습니다 |
| 라인 상태가 PENDING | 이미 처리된 결재입니다 |
| 문서 상태가 SUBMITTED | 결재 진행 중인 문서가 아닙니다 |
| 현재 자신의 결재 차례 | 아직 결재 차례가 아닙니다 |

**처리 로직:**

1. 사전 검증 통과
2. `approval_line` 상태 → `APPROVED`, `comment` 저장, `acted_at` 기록
3. **다음 단계 진행 판단:**
   - 현재 step_order에 해당하는 모든 라인이 처리 완료 확인
   - 다음 step_order의 APPROVE/AGREE 라인이 존재하는지 확인
     - **존재 O →** `document.current_step` +1
     - **존재 X (마지막 단계) →** `document.status` → `APPROVED`, `completed_at` 기록
4. 감사 로그: `DOC_APPROVE`
5. **(Phase 1-B)** 알림 이벤트 발행:
   - 다음 단계 존재 시 → 다음 결재자에게 결재 요청 메일
   - 최종 승인 시 → 기안자에게 승인 완료 메일

**동시성 제어:**
- 결재 처리 시 `approval_line`에 대해 **비관적 잠금(Pessimistic Lock)** 적용
- 동일 결재 라인에 대한 중복 처리 방지

---

### FN-APR-004. 반려 처리

| 항목 | 내용 |
|------|------|
| **Phase** | `P1A` |
| **권한** | 현재 결재 차례인 결재/합의자 |
| **API** | `POST /api/approvals/{lineId}/reject` |

**입력:**

| 필드 | 타입 | 필수 | 검증 규칙 |
|------|------|:----:|-----------|
| comment | String | ✅ | 1~1000자 (**반려 사유 필수**) |

**처리 로직:**

1. 사전 검증 (FN-APR-003과 동일)
2. `approval_line` 상태 → `REJECTED`, `comment` 저장, `acted_at` 기록
3. **즉시 문서 반려 처리:**
   - `document.status` → `REJECTED`, `completed_at` 기록
   - 남은 PENDING 상태의 결재 라인 → 상태 변경 없음 (PENDING 유지, 자연스러운 이력)
4. 감사 로그: `DOC_REJECT`
5. **(Phase 1-B)** 기안자에게 반려 알림 메일 발송

**비즈니스 규칙:**
- 반려 사유(comment)는 **필수** 입력 — 사유 없는 반려 불가
- 1명이라도 반려하면 문서 전체가 즉시 `REJECTED` 처리 (후속 결재자의 처리 불요)

---

### FN-APR-005. 결재선 편집기 (프론트엔드 컴포넌트)

| 항목 | 내용 |
|------|------|
| **Phase** | `P1A` |
| **권한** | `ALL` |
| **화면** | 문서 작성/수정 페이지 내 임베드 |

**기능 설명:**
문서 작성 시 결재선을 구성하는 인터랙티브 컴포넌트.

**UX 요구사항:**

1. **조직도 패널 (왼쪽)**
   - 부서 트리를 펼침/접힘으로 탐색
   - 부서 클릭 시 해당 부서원 목록 표시
   - 이름/사번 검색 필드 (실시간 필터링)
   - 각 사용자에 이름, 직급, 부서 표시

2. **결재선 구성 패널 (오른쪽)**
   - 3개 섹션: 결재, 합의, 참조
   - 조직도에서 사용자를 **더블클릭** 또는 **드래그** 하여 결재선에 추가
   - 추가 시 유형(결재/합의/참조) 선택 또는 섹션에 드롭
   - 결재/합의 섹션 내에서 **드래그 앤 드롭**으로 순서 변경
   - 각 항목에 삭제(X) 버튼
   - 기안자 본인은 결재선에 추가 불가 (추가 시 경고 표시)
   - 동일 인물 중복 추가 불가

3. **결재선 프리뷰**
   - 기안자 → 결재1 → 결재2 → 합의1 → ... 형태로 시각화
   - 각 카드에 이름, 직급, 부서, 유형 아이콘 표시

**상태 관리 (Zustand):**

```typescript
interface ApprovalLineStore {
  lines: ApprovalLineItem[];
  addLine: (user: UserInfo, type: LineType) => void;
  removeLine: (index: number) => void;
  reorderLines: (fromIndex: number, toIndex: number) => void;
  changeType: (index: number, type: LineType) => void;
  reset: () => void;
  validate: () => ValidationResult;
}
```

---

## 7. FN-FILE: 첨부파일 관리

### FN-FILE-001. 파일 업로드

| 항목 | 내용 |
|------|------|
| **Phase** | `P1A` |
| **권한** | 기안자 본인 (DRAFT 문서) |
| **API** | `POST /api/documents/{docId}/attachments` |

**입력:**
- `multipart/form-data` 형식
- 필드: `files` (다중 파일)

**사전 검증:**

| 검증 항목 | 에러 조건 | 메시지 |
|-----------|-----------|--------|
| 문서 상태 | DRAFT가 아님 | 임시저장 문서에만 파일을 첨부할 수 있습니다 |
| 단일 파일 용량 | 50MB 초과 | 파일 크기가 50MB를 초과합니다: {파일명} |
| 문서당 총 용량 | 기존 + 신규 합계 200MB 초과 | 문서당 첨부파일 총 용량은 200MB를 초과할 수 없습니다 |
| 문서당 파일 수 | 기존 + 신규 합계 10개 초과 | 문서당 첨부파일은 최대 10개입니다 |
| 확장자 | 차단 확장자 | 허용되지 않는 파일 형식입니다: {확장자} |

**처리 로직:**

1. 사전 검증
2. Google Drive 폴더 경로 결정: `MiceSign/{연도}/{월}/DRAFT-{docId}/`
   - 상신 시 `{문서번호}/`로 폴더명 변경 (또는 그대로 유지하고 DB에만 경로 기록)
3. Google Drive API v3로 파일 업로드
   - 실패 시 최대 3회 재시도 (지수 백오프: 1초, 2초, 4초)
4. `document_attachment` 테이블에 메타데이터 INSERT
5. 감사 로그: `FILE_UPLOAD`

**출력:**

```json
[
  {
    "id": 201,
    "originalName": "마케팅전략.pdf",
    "fileSize": 2048000,
    "mimeType": "application/pdf",
    "createdAt": "2026-03-31T10:25:00"
  }
]
```

---

### FN-FILE-002. 파일 다운로드

| 항목 | 내용 |
|------|------|
| **Phase** | `P1A` |
| **권한** | 문서 열람 권한자 |
| **API** | `GET /api/attachments/{attachmentId}/download` |

**처리 로직:**

1. 첨부파일 소속 문서의 열람 권한 검증 (FN-DOC-004 권한 규칙 적용)
2. Google Drive API로 파일 바이너리 조회 (`gdrive_file_id` 사용)
3. 프록시로 클라이언트에 스트리밍 응답
   - `Content-Type`: 원본 MIME Type
   - `Content-Disposition`: `attachment; filename="{원본파일명}"`
4. 감사 로그: `FILE_DOWNLOAD`

**에러 처리:**
- Google Drive에서 파일을 찾을 수 없는 경우: "파일을 찾을 수 없습니다. 관리자에게 문의하세요."
- Google Drive API 오류: "파일 서버에 일시적인 오류가 발생했습니다. 잠시 후 다시 시도해 주세요."

---

### FN-FILE-003. 파일 삭제

| 항목 | 내용 |
|------|------|
| **Phase** | `P1A` |
| **권한** | 기안자 본인 (DRAFT 문서) |
| **API** | `DELETE /api/attachments/{attachmentId}` |

**비즈니스 규칙:**
- `DRAFT` 상태의 문서 첨부파일만 삭제 가능
- 기안자 본인만 삭제 가능

**처리 로직:**

1. 권한 및 상태 검증
2. Google Drive API로 파일 삭제 시도
   - 삭제 실패 시 로그 기록 후 진행 (DB 레코드는 삭제)
3. `document_attachment` 레코드 삭제

---

## 8. FN-NTF: 알림 시스템

### FN-NTF-001. 이메일 알림 발송

| 항목 | 내용 |
|------|------|
| **Phase** | `P1B` |
| **권한** | 시스템 내부 (사용자 직접 호출 불가) |

**기능 설명:**
결재 상태 변경 시 이벤트 기반으로 관련자에게 이메일 알림을 비동기 발송한다.

**이벤트 → 알림 매핑:**

| 이벤트 | 수신자 | 메일 제목 패턴 | 본문 포함 내용 |
|--------|--------|---------------|---------------|
| 상신 | 첫 결재자 | [MiceSign] 결재 요청: {docNumber} {title} | 기안자명, 양식명, 제목, 문서 링크 |
| 승인(중간) | 다음 결재자 | [MiceSign] 결재 요청: {docNumber} {title} | 기안자명, 이전 승인자명, 문서 링크 |
| 최종 승인 | 기안자 | [MiceSign] 승인 완료: {docNumber} {title} | 최종 승인자명, 문서 링크 |
| 반려 | 기안자 | [MiceSign] 반려: {docNumber} {title} | 반려자명, 반려 사유, 문서 링크 |
| 회수 | 결재선 전체 | [MiceSign] 회수: {docNumber} {title} | 기안자명, 문서 링크 |

**구현 방식:**

```java
// 이벤트 발행 (서비스 계층)
applicationEventPublisher.publishEvent(
    new ApprovalEvent(document, eventType, targetUsers)
);

// 이벤트 리스너 (비동기 처리)
@TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
@Async
public void handleApprovalEvent(ApprovalEvent event) {
    // 메일 발송 + notification_log 기록
}
```

**재시도 정책:**
- 발송 실패 시 최대 2회 재시도 (5분 간격)
- 최종 실패 시 `notification_log.status` = `FAILED`, `error_message` 기록
- SUPER_ADMIN 대시보드에서 실패 알림 건 확인 가능 (Phase 1-C)

---

## 9. FN-AUD: 감사 로그

### FN-AUD-001. 감사 로그 기록 (시스템 내부)

| 항목 | 내용 |
|------|------|
| **Phase** | `P1A` (기록), `P1C` (조회 UI) |
| **권한** | 시스템 내부 자동 기록 |

**기능 설명:**
사용자의 모든 주요 액션을 `audit_log` 테이블에 불변 기록한다.

**기록 방식:**
- AOP(`@Aspect`) 또는 Service 계층에서 명시적으로 `AuditLogService.log()` 호출
- 비동기 기록 (`@Async`) — 감사 로그 기록 실패가 비즈니스 트랜잭션에 영향 없도록

**기록 데이터:**

```json
{
  "userId": 1,
  "action": "DOC_APPROVE",
  "targetType": "DOCUMENT",
  "targetId": 42,
  "detail": {
    "docNumber": "GEN-2026-0001",
    "approvalLineId": 102,
    "comment": "검토 완료, 승인합니다.",
    "previousStatus": "SUBMITTED",
    "newStatus": "SUBMITTED"
  },
  "ipAddress": "192.168.1.100",
  "userAgent": "Mozilla/5.0 ..."
}
```

---

### FN-AUD-002. 감사 로그 조회

| 항목 | 내용 |
|------|------|
| **Phase** | `P1C` |
| **권한** | `SA` |
| **API** | `GET /api/admin/audit-logs` |

**쿼리 파라미터:**

| 파라미터 | 타입 | 설명 |
|----------|------|------|
| userId | Long | 특정 사용자 필터 |
| action | String | 액션 코드 필터 (복수 가능) |
| targetType | String | 대상 엔티티 타입 필터 |
| targetId | Long | 대상 엔티티 ID 필터 |
| startDate | LocalDateTime | 기간 시작 |
| endDate | LocalDateTime | 기간 종료 |
| page | Integer | 페이지 |
| size | Integer | 크기 (기본 50) |

---

## 10. FN-DASH: 대시보드

### FN-DASH-001. 메인 대시보드

| 항목 | 내용 |
|------|------|
| **Phase** | `P1A` |
| **권한** | `ALL` |
| **API** | `GET /api/dashboard` |
| **화면** | `/` |

**기능 설명:**
로그인 후 첫 화면. 사용자의 결재 관련 현황을 한눈에 보여준다.

**출력 데이터:**

```json
{
  "pendingApprovals": 5,
  "myDraftDocuments": 2,
  "mySubmittedDocuments": 3,
  "recentDocuments": [
    {
      "id": 42,
      "docNumber": "GEN-2026-0001",
      "title": "...",
      "status": "SUBMITTED",
      "templateName": "일반 업무 기안",
      "createdAt": "2026-03-31T10:20:00"
    }
  ],
  "recentApprovals": [
    {
      "approvalLineId": 102,
      "documentId": 42,
      "docNumber": "GEN-2026-0001",
      "title": "...",
      "lineType": "APPROVE",
      "submittedAt": "2026-03-31T10:30:00"
    }
  ]
}
```

**화면 요구사항:**

| 영역 | 내용 |
|------|------|
| **요약 카드** | 결재 대기(건수+아이콘), 기안 진행중, 임시저장, 최근 승인완료 |
| **결재 대기 목록** | 최근 5건, "전체 보기" 링크 → `/approvals/pending` |
| **내 최근 문서** | 최근 5건, "전체 보기" 링크 → `/documents/my` |
| **빠른 작성 버튼** | 양식별 바로가기 (일반기안, 지출결의, 휴가신청) |

---

## 11. FN-SEARCH: 문서 검색

### FN-SEARCH-001. 통합 문서 검색

| 항목 | 내용 |
|------|------|
| **Phase** | `P1B` |
| **권한** | `ALL` (결과는 열람 권한 필터 적용) |
| **API** | `GET /api/documents/search` |

**기능 설명:**
사용자가 접근 가능한 모든 문서(기안, 결재, 참조)에 대해 통합 검색을 수행한다.

**쿼리 파라미터:**

| 파라미터 | 타입 | 설명 |
|----------|------|------|
| keyword | String | 제목 + 문서번호 검색 (LIKE) |
| templateCode | String | 양식 필터 |
| status | String | 상태 필터 (복수 가능) |
| drafterId | Long | 기안자 필터 |
| departmentId | Long | 기안자 소속 부서 필터 |
| startDate | LocalDate | 상신일 시작 |
| endDate | LocalDate | 상신일 종료 |
| page | Integer | 페이지 |
| size | Integer | 크기 (기본 20) |

**열람 권한 필터 (WHERE 절):**

```sql
-- 사용자가 접근 가능한 문서만 반환
WHERE (
  d.drafter_id = :currentUserId                              -- 내가 기안한 문서
  OR EXISTS (
    SELECT 1 FROM approval_line al
    WHERE al.document_id = d.id AND al.approver_id = :currentUserId
  )                                                           -- 내가 결재선에 포함된 문서
  OR (:role = 'ADMIN' AND d.drafter_id IN (
    SELECT id FROM user WHERE department_id = :myDepartmentId
  ))                                                          -- ADMIN: 소속 부서원 문서
  OR :role = 'SUPER_ADMIN'                                    -- SA: 전체
)
AND d.status != 'DRAFT'  -- 타인의 임시저장은 검색 제외
```

---

## 12. 공통 요구사항

### 12.1. API 공통 응답 포맷

**성공 (단건):**

```json
{
  "success": true,
  "data": { ... },
  "message": null
}
```

**성공 (페이징):**

```json
{
  "success": true,
  "data": {
    "content": [ ... ],
    "totalElements": 150,
    "totalPages": 8,
    "page": 0,
    "size": 20,
    "first": true,
    "last": false
  }
}
```

**에러:**

```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "DOC_INVALID_STATUS",
    "message": "임시저장 상태의 문서만 수정할 수 있습니다.",
    "details": null
  }
}
```

**유효성 검증 에러:**

```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "입력값 검증에 실패했습니다.",
    "details": [
      { "field": "title", "message": "문서 제목을 입력해 주세요." },
      { "field": "approvalLines", "message": "결재자를 1명 이상 지정해 주세요." }
    ]
  }
}
```

### 12.2. 에러 코드 체계

| 접두사 | 모듈 | 예시 |
|--------|------|------|
| `AUTH_` | 인증 | `AUTH_INVALID_CREDENTIALS`, `AUTH_ACCOUNT_LOCKED` |
| `DOC_` | 문서 | `DOC_INVALID_STATUS`, `DOC_NOT_FOUND` |
| `APR_` | 결재 | `APR_NOT_YOUR_TURN`, `APR_ALREADY_PROCESSED` |
| `FILE_` | 파일 | `FILE_SIZE_EXCEEDED`, `FILE_TYPE_NOT_ALLOWED` |
| `ORG_` | 조직 | `ORG_DUPLICATE_NAME`, `ORG_HAS_ACTIVE_USERS` |
| `COMMON_` | 공통 | `COMMON_ACCESS_DENIED`, `COMMON_NOT_FOUND` |
| `VALIDATION_` | 검증 | `VALIDATION_ERROR` |

### 12.3. 공통 HTTP 상태 코드 매핑

| 상태 | 의미 | 사용 상황 |
|------|------|-----------|
| 200 | OK | 조회, 수정 성공 |
| 201 | Created | 생성 성공 |
| 400 | Bad Request | 유효성 검증 실패, 비즈니스 규칙 위반 |
| 401 | Unauthorized | 인증 실패, 토큰 만료 |
| 403 | Forbidden | 권한 없음 |
| 404 | Not Found | 리소스 없음 |
| 409 | Conflict | 상태 충돌 (이미 처리됨 등) |
| 423 | Locked | 계정 잠금 |
| 500 | Internal Error | 서버 내부 오류 |

### 12.4. 프론트엔드 공통 컴포넌트

| 컴포넌트 | 설명 | 사용 위치 |
|----------|------|-----------|
| `AppLayout` | 사이드바 + 헤더 + 본문 레이아웃 | 전체 |
| `Sidebar` | 네비게이션 메뉴 (결재대기 건수 뱃지) | 전체 |
| `PageHeader` | 페이지 제목 + 브레드크럼 | 전체 |
| `DataTable` | 정렬, 페이징, 필터 통합 테이블 | 목록 페이지 |
| `StatusBadge` | 문서 상태별 색상 뱃지 | 목록, 상세 |
| `ApprovalLineEditor` | 결재선 편집기 (FN-APR-005) | 문서 작성/수정 |
| `ApprovalLineViewer` | 결재선 읽기전용 시각화 | 문서 상세 |
| `FileUploader` | 드래그앤드롭 파일 업로드 | 문서 작성 |
| `RichTextEditor` | Rich Text 편집기 (Tiptap 등) | GENERAL 양식 |
| `ConfirmDialog` | 확인/취소 모달 | 상신, 회수, 삭제 등 |
| `Toast` | 성공/에러 알림 토스트 | 전체 |
| `EmptyState` | 데이터 없음 표시 | 목록 |
| `LoadingSpinner` | 로딩 상태 | 전체 |

### 12.5. 상태별 뱃지 색상

| 상태 | 색상 | TailwindCSS |
|------|------|-------------|
| DRAFT | 회색 | `bg-gray-100 text-gray-700` |
| SUBMITTED | 파랑 | `bg-blue-100 text-blue-700` |
| APPROVED | 초록 | `bg-green-100 text-green-700` |
| REJECTED | 빨강 | `bg-red-100 text-red-700` |
| WITHDRAWN | 주황 | `bg-amber-100 text-amber-700` |

---

## 13. Phase별 기능 매핑

### Phase 1-A (MVP)

| ID | 기능 | 우선순위 |
|----|------|----------|
| FN-AUTH-001 | 로그인 | 필수 |
| FN-AUTH-002 | 토큰 갱신 | 필수 |
| FN-AUTH-003 | 로그아웃 | 필수 |
| FN-AUTH-004 | 비밀번호 변경 | 필수 |
| FN-AUTH-005 | 초기 비밀번호 발급 | 필수 |
| FN-ORG-001 | 부서 트리 조회 | 필수 |
| FN-ORG-002 | 부서 등록 | 필수 |
| FN-ORG-003 | 부서 수정 | 필수 |
| FN-ORG-004 | 직급 목록 조회 | 필수 |
| FN-ORG-005 | 직급 등록/수정 | 필수 |
| FN-ORG-006 | 사용자 목록 조회 | 필수 |
| FN-ORG-007 | 사용자 등록 | 필수 |
| FN-ORG-008 | 사용자 수정 | 필수 |
| FN-TPL-001 | 양식 목록 조회 | 필수 |
| FN-TPL-003 | 양식별 폼 스키마 (GENERAL, EXPENSE, LEAVE) | 필수 |
| FN-DOC-001 | 문서 생성 (임시저장) | 필수 |
| FN-DOC-002 | 임시저장 문서 수정 | 필수 |
| FN-DOC-003 | 문서 상신 | 필수 |
| FN-DOC-004 | 문서 상세 조회 | 필수 |
| FN-DOC-005 | 문서 회수 | 필수 |
| FN-DOC-006 | 재기안 | 필수 |
| FN-DOC-007 | 임시저장 문서 삭제 | 필수 |
| FN-DOC-008 | 내 문서함 조회 | 필수 |
| FN-DOC-009 | 참조 문서함 조회 | 필수 |
| FN-APR-001 | 결재 대기 목록 | 필수 |
| FN-APR-002 | 결재 완료 목록 | 필수 |
| FN-APR-003 | 승인 처리 | 필수 |
| FN-APR-004 | 반려 처리 | 필수 |
| FN-APR-005 | 결재선 편집기 | 필수 |
| FN-FILE-001 | 파일 업로드 | 필수 |
| FN-FILE-002 | 파일 다운로드 | 필수 |
| FN-FILE-003 | 파일 삭제 | 필수 |
| FN-DASH-001 | 메인 대시보드 | 필수 |
| FN-AUD-001 | 감사 로그 기록 (백엔드) | 필수 |

**Phase 1-A 합계: 34개 기능**

### Phase 1-B

| ID | 기능 |
|----|------|
| FN-TPL-002 | 양식 등록/수정 (관리) |
| FN-TPL-003 | 추가 양식 (PURCHASE, BUSINESS_TRIP, OVERTIME) |
| FN-NTF-001 | 이메일 알림 발송 |
| FN-SEARCH-001 | 통합 문서 검색 |
| - | 참조 문서 읽음/안읽음 표시 |
| - | 최초 로그인 시 비밀번호 변경 강제 |

### Phase 1-C

| ID | 기능 |
|----|------|
| FN-ORG-009 | 퇴직자 결재건 일괄 처리 |
| FN-AUD-002 | 감사 로그 조회 UI |
| - | 알림 발송 실패 모니터링 UI |
| - | 결재 소요시간 통계 |
| - | 부서별/양식별 결재 현황 리포트 |

---

## 부록: 기능 ID 인덱스

| ID | 기능명 | Phase |
|----|--------|-------|
| FN-AUTH-001 | 로그인 | P1A |
| FN-AUTH-002 | 토큰 갱신 | P1A |
| FN-AUTH-003 | 로그아웃 | P1A |
| FN-AUTH-004 | 비밀번호 변경 | P1A |
| FN-AUTH-005 | 초기 비밀번호 발급 | P1A |
| FN-ORG-001 | 부서 트리 조회 | P1A |
| FN-ORG-002 | 부서 등록 | P1A |
| FN-ORG-003 | 부서 수정 | P1A |
| FN-ORG-004 | 직급 목록 조회 | P1A |
| FN-ORG-005 | 직급 등록/수정 | P1A |
| FN-ORG-006 | 사용자 목록 조회 | P1A |
| FN-ORG-007 | 사용자 등록 | P1A |
| FN-ORG-008 | 사용자 수정 | P1A |
| FN-ORG-009 | 퇴직자 결재건 일괄 처리 | P1C |
| FN-TPL-001 | 양식 목록 조회 | P1A |
| FN-TPL-002 | 양식 등록/수정 | P1B |
| FN-TPL-003 | 양식별 폼 데이터 스키마 | P1A |
| FN-DOC-001 | 문서 생성 (임시저장) | P1A |
| FN-DOC-002 | 임시저장 문서 수정 | P1A |
| FN-DOC-003 | 문서 상신 | P1A |
| FN-DOC-004 | 문서 상세 조회 | P1A |
| FN-DOC-005 | 문서 회수 | P1A |
| FN-DOC-006 | 재기안 | P1A |
| FN-DOC-007 | 임시저장 문서 삭제 | P1A |
| FN-DOC-008 | 내 문서함 조회 | P1A |
| FN-DOC-009 | 참조 문서함 조회 | P1A |
| FN-APR-001 | 결재 대기 목록 | P1A |
| FN-APR-002 | 결재 완료 목록 | P1A |
| FN-APR-003 | 승인 처리 | P1A |
| FN-APR-004 | 반려 처리 | P1A |
| FN-APR-005 | 결재선 편집기 | P1A |
| FN-FILE-001 | 파일 업로드 | P1A |
| FN-FILE-002 | 파일 다운로드 | P1A |
| FN-FILE-003 | 파일 삭제 | P1A |
| FN-NTF-001 | 이메일 알림 발송 | P1B |
| FN-AUD-001 | 감사 로그 기록 | P1A |
| FN-AUD-002 | 감사 로그 조회 | P1C |
| FN-DASH-001 | 메인 대시보드 | P1A |
| FN-SEARCH-001 | 통합 문서 검색 | P1B |

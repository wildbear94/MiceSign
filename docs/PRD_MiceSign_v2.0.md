# [PRD v2.0] MiceSign 사내 맞춤형 전자 결재 시스템

> **문서 버전:** v2.0  
> **최종 수정일:** 2026-03-31  
> **작성자:** P30 (부장 파트장)  
> **상태:** Draft → Review

---

## 1. 프로젝트 개요

### 1.1. 목표
기존 레거시 시스템(Docswave 등)을 대체하고, 사내 환경에 완벽히 최적화된 독립적인 전자 결재 시스템을 백지상태(Clean Start)에서 신규 구축한다.

### 1.2. 핵심 가치
- **데이터 자산화:** 결재 문서 및 첨부파일의 체계적 축적
- **프로세스 내재화:** 외부 SaaS 의존 제거, 자체 결재 워크플로우 확보
- **AI 기반 확장:** Phase 2에서 축적 데이터를 활용한 AI 제안서 보조 시스템 도입 기반 마련

### 1.3. MVP 전략 (점진적 릴리스)

| Phase | 범위 | 목표 |
|-------|------|------|
| **Phase 1-A (MVP)** | 핵심 결재 플로우 (기안→결재→승인/반려), 사용자 인증, 기본 양식 2~3종 | 최소 운영 가능 상태 |
| **Phase 1-B** | 양식 확장, SMTP 알림, 문서 검색/필터링, 대시보드 고도화 | 일상 업무 대체 수준 |
| **Phase 1-C** | 감사 로그 조회 UI, 통계/리포트, 인수인계 기능 | 관리자 운영 편의 완성 |
| **Phase 2** | AI 제안서 보조 시스템 (축적 데이터 기반) | 고도화 |

---

## 2. 기술 스택 및 배포 아키텍처

컨테이너(Docker) 가상화를 배제하고, 운영 서버 OS 환경에 직접(Native) 배포하여 직관적인 시스템 관리를 지향한다.

### 2.1. Backend
- **Runtime:** Java 17, Spring Boot 3.x (LTS)
- **Security:** Spring Security + JWT (Stateless)
- **ORM:** JPA (Hibernate) + QueryDSL (복잡 조회)
- **Mail:** Spring Mail (JavaMailSender, SMTP 연동)
- **File:** Google Drive API v3 (Service Account)
- **빌드/배포:** Gradle → `.jar` 빌드 → `systemd` 서비스 구동

### 2.2. Frontend
- **Framework:** React 18 + Vite 5 + TypeScript
- **상태 관리:** Zustand (클라이언트 상태) + TanStack Query v5 (서버 상태)
- **스타일링:** TailwindCSS
- **빌드/호스팅:** 정적 자산(Static Assets) 빌드 → Nginx 서빙
- **양식 렌더링:** 양식별 하드코딩 React 컴포넌트 방식

### 2.3. Database
- **RDBMS:** MariaDB 10.11+ (서버 직접 설치)
- **백업:** Crontab + `mysqldump` (일일 풀백업, binlog 7일 보관)
- **문자셋:** `utf8mb4` / `utf8mb4_unicode_ci`

### 2.4. 인프라
- **웹서버:** Nginx (리버스 프록시 + 정적 파일 서빙 + HTTPS)
- **SSL:** Let's Encrypt (Certbot 자동 갱신)
- **CI/CD:** GitHub Actions → SSH 배포

---

## 3. 사용자 및 조직도 관리

### 3.1. 수동 관리 체계
관리자(Admin)가 전용 관리 페이지에서 임직원 계정, 부서, 직급 등의 조직도 정보를 직접 등록하고 수정하는 수동 관리 방식을 채택한다.

### 3.2. 직급 체계
시스템에서 관리하는 직급은 결재선 UI에서의 표시 용도이며, 결재 순서 강제 등의 자동화 로직에는 사용하지 않는다.

```
사원 → 대리 → 과장 → 차장 → 부장 → 이사 → 대표이사
(sort_order: 1 → 2 → 3 → 4 → 5 → 6 → 7)
```

### 3.3. 계정 상태 관리

| 상태 | 설명 |
|------|------|
| `ACTIVE` | 정상 사용 |
| `INACTIVE` | 비활성 (휴직 등) |
| `RETIRED` | 퇴직 처리 (로그인 불가, 기존 결재 이력 보존) |

---

## 4. RBAC (역할 기반 접근 제어)

### 4.1. 역할 정의

| 역할 | 설명 |
|------|------|
| `SUPER_ADMIN` | 시스템 전체 관리 (1~2명 한정) |
| `ADMIN` | 조직도/양식 관리, 소속 부서 문서 열람 |
| `USER` | 일반 사용자 (기안, 결재 처리) |

### 4.2. 권한 매트릭스

| 기능 | SUPER_ADMIN | ADMIN | USER |
|------|:-----------:|:-----:|:----:|
| 시스템 설정 | ✅ | ❌ | ❌ |
| 조직도 관리 (계정/부서/직급) | ✅ | ✅ | ❌ |
| 양식 관리 | ✅ | ✅ | ❌ |
| 문서 기안 | ✅ | ✅ | ✅ |
| 결재 처리 | ✅ | ✅ | ✅ |
| 전체 문서 열람 | ✅ | ❌ (소속 부서만) | ❌ |
| 감사 로그 조회 | ✅ | ❌ | ❌ |
| 통계/리포트 | ✅ | ✅ | ❌ |

---

## 5. 결재 문서 양식 (Template) 체계

### 5.1. 양식별 하드코딩 컴포넌트 방식

각 결재 양식은 독립된 React 컴포넌트로 구현한다. 양식 추가 시 새로운 컴포넌트를 개발하여 배포한다.

```
src/
  components/
    templates/
      GeneralApproval.tsx      // 일반 업무 기안
      ExpenseReport.tsx        // 지출 결의서
      LeaveRequest.tsx         // 휴가 신청서
      PurchaseRequest.tsx      // 구매 요청서
      BusinessTripReport.tsx   // 출장 보고서
      OvertimeRequest.tsx      // 연장 근무 신청서
      index.ts                 // 양식 레지스트리 (templateCode → Component 매핑)
```

### 5.2. 양식 레지스트리

```typescript
// src/components/templates/index.ts
export const TEMPLATE_REGISTRY: Record<string, TemplateConfig> = {
  GENERAL: {
    code: 'GENERAL',
    name: '일반 업무 기안',
    component: lazy(() => import('./GeneralApproval')),
    prefix: 'GEN',
    active: true,
  },
  EXPENSE: {
    code: 'EXPENSE',
    name: '지출 결의서',
    component: lazy(() => import('./ExpenseReport')),
    prefix: 'EXP',
    active: true,
  },
  LEAVE: {
    code: 'LEAVE',
    name: '휴가 신청서',
    component: lazy(() => import('./LeaveRequest')),
    prefix: 'LEV',
    active: true,
  },
  // ... 확장 시 여기에 추가
};
```

### 5.3. 문서 채번 규칙

**형식:** `{양식접두사}-{연도}-{시퀀스 4자리}`

- 예: `GEN-2026-0001`, `EXP-2026-0042`, `LEV-2026-0007`
- 시퀀스는 **양식별 + 연도별** 독립 관리
- 상신(SUBMITTED) 시점에 채번 확정 (임시저장 시에는 미채번)

### 5.4. MVP 양식 (Phase 1-A)

| 양식 | 코드 | 고유 필드 |
|------|------|-----------|
| 일반 업무 기안 | `GENERAL` | 제목, 본문(Rich Text), 첨부파일 |
| 지출 결의서 | `EXPENSE` | 지출 항목 테이블(품목, 수량, 단가, 금액), 합계 자동계산, 증빙 첨부 |
| 휴가 신청서 | `LEAVE` | 휴가 유형(연차/반차/병가/경조), 시작일, 종료일, 사용일수 자동계산, 사유 |

---

## 6. 결재선 및 워크플로우 (Workflow)

### 6.1. 100% 자율 결재선 지정

시스템에 의한 자동 결재 조건(Rule) 없이, 기안자가 문서 성격에 맞춰 결재선을 전적으로 자율 선택한다.

### 6.2. 결재선 유형

| 유형 | 코드 | 설명 | 결재 행위 |
|------|------|------|-----------|
| 결재 | `APPROVE` | 순차적 승인 권한자 | 승인/반려 가능 |
| 합의 | `AGREE` | 관련 부서 협의 권한자 | 동의/반려 가능 |
| 참조 | `REFERENCE` | 열람 대상자 | 열람만 가능 (결재 행위 없음) |

### 6.3. 결재 순서 규칙

- **결재(APPROVE)와 합의(AGREE):** 기안자가 지정한 `step_order` 순서대로 **순차 처리**
- **참조(REFERENCE):** 상신 즉시 열람 가능 (순서 무관)
- **Phase 1 스코프 아웃:** 대결(代決), 위임, 후결 기능은 Phase 1에서 제외. 필요 시 Phase 1-C 이후 검토

### 6.4. 문서 상태 전이 (State Machine)

```
                          ┌──────────────┐
                          │  DRAFT       │  임시저장
                          │  (미채번)     │
                          └──────┬───────┘
                                 │ [상신]
                                 ▼
                          ┌──────────────┐
                   ┌──────│  SUBMITTED   │  상신 완료 (채번 확정)
                   │      │  (결재진행중)  │
                   │      └──────┬───────┘
                   │             │
                   │    ┌────────┴────────┐
                   │    │                 │
                   │    ▼                 ▼
            ┌──────────────┐    ┌──────────────┐
            │  APPROVED    │    │  REJECTED    │
            │  (승인완료)    │    │  (반려)       │
            └──────────────┘    └──────┬───────┘
                                       │ [재기안]
                                       ▼
                                ┌──────────────┐
                                │  새 DRAFT    │  기존 내용 복사된 신규 문서
                                │  (신규 채번)   │
                                └──────────────┘

            ※ 회수(WITHDRAWN): SUBMITTED 상태에서만 가능
               → 기안자 본인만 가능
               → 다음 결재자가 아직 미처리 상태일 때만 허용
               → 회수 시 DRAFT로 복귀하지 않고 WITHDRAWN 상태로 확정
               → 재상신 시 기존 내용 복사하여 새 문서로 생성
```

### 6.5. 상태 코드 정의

| 상태 | 코드 | 설명 |
|------|------|------|
| 임시저장 | `DRAFT` | 작성 중, 미상신 |
| 상신(결재진행중) | `SUBMITTED` | 결재선에 올라간 상태, **문서 수정 불가(Lock)** |
| 승인완료 | `APPROVED` | 모든 결재/합의자가 승인 |
| 반려 | `REJECTED` | 결재/합의자 중 1인이라도 반려 |
| 회수 | `WITHDRAWN` | 기안자가 직접 회수 (결재 미처리 건에 한해) |

### 6.6. 결재 무결성 보장

- 상신(SUBMITTED) 이후 문서 본문, 첨부파일, 결재선 **수정 절대 불가(Lock)**
- 내용 변경이 필요한 경우: 회수 → 새 문서로 재기안 (기존 내용 자동 복사)
- 반려된 문서에서 재기안 시에도 동일하게 새 문서 생성

---

## 7. 보안 및 인증

### 7.1. JWT 토큰 정책

| 항목 | 정책 |
|------|------|
| Access Token 저장 | 프론트엔드 메모리 (Zustand Store) |
| Access Token TTL | 30분 |
| Refresh Token 저장 | `HttpOnly` + `Secure` + `SameSite=Strict` 쿠키 |
| Refresh Token TTL | 14일 |
| Refresh Token Rotation | 적용 (갱신 시 기존 토큰 즉시 무효화) |
| 동시 로그인 | 허용 (멀티 디바이스) |
| 비밀번호 암호화 | BCrypt (strength 10) |

### 7.2. API 보안

- 모든 API 엔드포인트는 JWT 인증 필수 (로그인/토큰갱신 제외)
- 역할 기반 접근 제어: `@PreAuthorize` 어노테이션 활용
- XSS 방어: Access Token은 메모리 보관, Refresh Token은 HttpOnly 쿠키
- CSRF: Stateless JWT 구조이므로 CSRF 토큰 불필요 (SameSite 쿠키로 대체)

### 7.3. 문서 열람 권한 정책

| 대상 | 열람 가능 범위 |
|------|---------------|
| 기안자 본인 | 본인이 작성한 모든 문서 |
| 결재선 포함자 (결재/합의) | 해당 문서에 한해 열람 |
| 참조자 | 해당 문서에 한해 열람 |
| ADMIN | 소속 부서원의 문서 |
| SUPER_ADMIN | 전체 문서 |
| 그 외 | 열람 불가 |

---

## 8. 파일 스토리지 (Google Drive 통합)

> ※ 사내 보안 검토 완료 확인

### 8.1. 아키텍처

- **저장소:** 시스템 전용 Google 서비스 계정(Service Account) → 사내 중앙 관리 폴더
- **DB 저장:** 파일 원본명, 용량, MIME Type, Google Drive File ID (메타데이터만)
- **폴더 구조:** `MiceSign/{연도}/{월}/{문서번호}/`

### 8.2. 파일 업로드 정책

| 항목 | 정책 |
|------|------|
| 단일 파일 최대 용량 | 50MB |
| 문서당 총 첨부 용량 | 200MB |
| 문서당 최대 첨부 수 | 10개 |
| 허용 확장자 | pdf, doc, docx, xls, xlsx, ppt, pptx, hwp, hwpx, jpg, jpeg, png, zip |
| 차단 확장자 | exe, bat, sh, cmd, js, vbs 등 실행 파일 |

### 8.3. 장애 대응

- 업로드 실패 시 최대 3회 자동 재시도 (지수 백오프)
- 3회 실패 시 사용자에게 오류 메시지 표시 + 관리자 알림
- Google Drive API 장애 시에도 결재 프로세스 자체는 중단되지 않음 (첨부 없는 결재는 정상 진행)
- Service Account 키 파일: 서버 로컬 보관, 환경변수로 경로 지정, Git 추적 제외

---

## 9. 알림 시스템 (Notification)

### 9.1. SMTP 이메일 알림 (Phase 1-B)

| 이벤트 | 수신자 | 메일 제목 예시 |
|--------|--------|---------------|
| 상신 | 첫 번째 결재자 | [MiceSign] 결재 요청: {문서번호} {제목} |
| 승인 (중간) | 다음 순서 결재자 | [MiceSign] 결재 요청: {문서번호} {제목} |
| 최종 승인 | 기안자 | [MiceSign] 승인 완료: {문서번호} {제목} |
| 반려 | 기안자 | [MiceSign] 반려: {문서번호} {제목} |
| 회수 | 결재선 전체 | [MiceSign] 회수: {문서번호} {제목} |

### 9.2. 구현 방식

- Spring `@TransactionalEventListener`를 활용한 이벤트 기반 비동기 발송
- 메일 발송 실패 시 최대 2회 재시도
- 발송 이력 DB 기록 (`notification_log` 테이블)

---

## 10. 감사 로그 (Audit Trail)

### 10.1. 기록 원칙

결재 문서의 모든 상태 변경 및 주요 사용자 액션을 **불변(Immutable)** 로그로 기록한다. 감사 로그는 수정/삭제 불가하며, SUPER_ADMIN만 조회할 수 있다.

### 10.2. 기록 대상 액션

| 액션 코드 | 설명 |
|-----------|------|
| `DOC_CREATE` | 문서 생성 (임시저장) |
| `DOC_SUBMIT` | 상신 |
| `DOC_APPROVE` | 승인 |
| `DOC_REJECT` | 반려 |
| `DOC_WITHDRAW` | 회수 |
| `DOC_VIEW` | 문서 열람 |
| `FILE_UPLOAD` | 첨부파일 업로드 |
| `FILE_DOWNLOAD` | 첨부파일 다운로드 |
| `USER_LOGIN` | 로그인 |
| `USER_LOGOUT` | 로그아웃 |
| `ADMIN_USER_EDIT` | 관리자의 사용자 정보 수정 |
| `ADMIN_ORG_EDIT` | 관리자의 조직도 수정 |

---

## 11. 데이터베이스 스키마 (ERD)

### 11.1. 테이블 목록

```
[조직/사용자]
  ├── department           -- 부서
  ├── position             -- 직급
  └── user                 -- 사용자 (임직원)

[결재 문서]
  ├── approval_template    -- 양식 마스터 (코드, 이름, 접두사, 활성여부)
  ├── document             -- 결재 문서 (메인)
  ├── document_content     -- 문서 본문/양식별 데이터 (JSON)
  ├── approval_line        -- 결재선 (결재/합의/참조 각 라인)
  └── document_attachment  -- 첨부파일 메타데이터

[시스템]
  ├── doc_sequence         -- 채번 시퀀스 (양식별 + 연도별)
  ├── notification_log     -- 알림 발송 이력
  ├── audit_log            -- 감사 로그
  └── refresh_token        -- Refresh Token 저장소
```

### 11.2. 주요 테이블 DDL

```sql
-- ============================================
-- 부서
-- ============================================
CREATE TABLE department (
    id          BIGINT AUTO_INCREMENT PRIMARY KEY,
    name        VARCHAR(100) NOT NULL COMMENT '부서명',
    parent_id   BIGINT NULL COMMENT '상위 부서 ID (NULL이면 최상위)',
    sort_order  INT NOT NULL DEFAULT 0 COMMENT '정렬 순서',
    is_active   BOOLEAN NOT NULL DEFAULT TRUE,
    created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (parent_id) REFERENCES department(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='부서';

-- ============================================
-- 직급
-- ============================================
CREATE TABLE position (
    id          BIGINT AUTO_INCREMENT PRIMARY KEY,
    name        VARCHAR(50) NOT NULL COMMENT '직급명',
    sort_order  INT NOT NULL COMMENT '서열 순서 (낮을수록 하위)',
    is_active   BOOLEAN NOT NULL DEFAULT TRUE,
    created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='직급';

-- ============================================
-- 사용자
-- ============================================
CREATE TABLE `user` (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,
    employee_no     VARCHAR(20) NOT NULL UNIQUE COMMENT '사번',
    name            VARCHAR(50) NOT NULL COMMENT '이름',
    email           VARCHAR(150) NOT NULL UNIQUE COMMENT '이메일 (로그인 ID)',
    password        VARCHAR(255) NOT NULL COMMENT 'BCrypt 해시',
    department_id   BIGINT NOT NULL,
    position_id     BIGINT NOT NULL,
    role            ENUM('SUPER_ADMIN','ADMIN','USER') NOT NULL DEFAULT 'USER',
    status          ENUM('ACTIVE','INACTIVE','RETIRED') NOT NULL DEFAULT 'ACTIVE',
    phone           VARCHAR(20) NULL,
    profile_image   VARCHAR(500) NULL COMMENT '프로필 이미지 URL',
    last_login_at   DATETIME NULL,
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (department_id) REFERENCES department(id),
    FOREIGN KEY (position_id) REFERENCES position(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='사용자';

-- ============================================
-- 결재 양식 마스터
-- ============================================
CREATE TABLE approval_template (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,
    code            VARCHAR(20) NOT NULL UNIQUE COMMENT '양식 코드 (GENERAL, EXPENSE, LEAVE 등)',
    name            VARCHAR(100) NOT NULL COMMENT '양식명',
    description     VARCHAR(500) NULL COMMENT '양식 설명',
    prefix          VARCHAR(10) NOT NULL COMMENT '채번 접두사',
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    sort_order      INT NOT NULL DEFAULT 0,
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='결재 양식 마스터';

-- ============================================
-- 채번 시퀀스
-- ============================================
CREATE TABLE doc_sequence (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,
    template_code   VARCHAR(20) NOT NULL COMMENT '양식 코드',
    year            INT NOT NULL COMMENT '연도',
    last_sequence   INT NOT NULL DEFAULT 0 COMMENT '마지막 발급 시퀀스',
    UNIQUE KEY uk_template_year (template_code, year)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='채번 시퀀스';

-- ============================================
-- 결재 문서 (메인)
-- ============================================
CREATE TABLE document (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,
    doc_number      VARCHAR(30) NULL UNIQUE COMMENT '문서번호 (상신 시 채번, DRAFT는 NULL)',
    template_code   VARCHAR(20) NOT NULL COMMENT '양식 코드',
    title           VARCHAR(300) NOT NULL COMMENT '문서 제목',
    drafter_id      BIGINT NOT NULL COMMENT '기안자 ID',
    status          ENUM('DRAFT','SUBMITTED','APPROVED','REJECTED','WITHDRAWN')
                    NOT NULL DEFAULT 'DRAFT',
    current_step    INT NULL COMMENT '현재 결재 단계 (step_order)',
    submitted_at    DATETIME NULL COMMENT '상신 일시',
    completed_at    DATETIME NULL COMMENT '최종 처리 일시 (승인/반려/회수)',
    source_doc_id   BIGINT NULL COMMENT '재기안 원본 문서 ID (추적용)',
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (drafter_id) REFERENCES `user`(id),
    FOREIGN KEY (source_doc_id) REFERENCES document(id),
    INDEX idx_drafter_status (drafter_id, status),
    INDEX idx_status (status),
    INDEX idx_template_code (template_code),
    INDEX idx_submitted_at (submitted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='결재 문서';

-- ============================================
-- 문서 본문 / 양식별 데이터
-- ============================================
CREATE TABLE document_content (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,
    document_id     BIGINT NOT NULL UNIQUE COMMENT '문서 ID (1:1)',
    body_html       LONGTEXT NULL COMMENT '본문 (Rich Text HTML) - GENERAL 양식용',
    form_data       JSON NULL COMMENT '양식별 구조화 데이터 (JSON)',
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (document_id) REFERENCES document(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='문서 본문 및 양식 데이터';

-- ============================================
-- 결재선
-- ============================================
CREATE TABLE approval_line (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,
    document_id     BIGINT NOT NULL,
    approver_id     BIGINT NOT NULL COMMENT '결재/합의/참조자 ID',
    line_type       ENUM('APPROVE','AGREE','REFERENCE') NOT NULL COMMENT '결재선 유형',
    step_order      INT NOT NULL COMMENT '결재 순서 (REFERENCE는 0)',
    status          ENUM('PENDING','APPROVED','REJECTED','SKIPPED')
                    NOT NULL DEFAULT 'PENDING',
    comment         TEXT NULL COMMENT '결재 의견',
    acted_at        DATETIME NULL COMMENT '처리 일시',
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (document_id) REFERENCES document(id),
    FOREIGN KEY (approver_id) REFERENCES `user`(id),
    INDEX idx_approver_status (approver_id, status),
    INDEX idx_document_step (document_id, step_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='결재선';

-- ============================================
-- 첨부파일 메타데이터
-- ============================================
CREATE TABLE document_attachment (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,
    document_id     BIGINT NOT NULL,
    original_name   VARCHAR(500) NOT NULL COMMENT '원본 파일명',
    file_size       BIGINT NOT NULL COMMENT '파일 크기 (bytes)',
    mime_type       VARCHAR(100) NOT NULL,
    gdrive_file_id  VARCHAR(200) NOT NULL COMMENT 'Google Drive File ID',
    gdrive_folder   VARCHAR(500) NULL COMMENT 'Google Drive 폴더 경로',
    uploaded_by     BIGINT NOT NULL,
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (document_id) REFERENCES document(id),
    FOREIGN KEY (uploaded_by) REFERENCES `user`(id),
    INDEX idx_document (document_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='첨부파일 메타데이터';

-- ============================================
-- 감사 로그 (불변)
-- ============================================
CREATE TABLE audit_log (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id         BIGINT NULL COMMENT '액션 수행자 (시스템 액션은 NULL)',
    action          VARCHAR(50) NOT NULL COMMENT '액션 코드',
    target_type     VARCHAR(50) NULL COMMENT '대상 엔티티 (DOCUMENT, USER 등)',
    target_id       BIGINT NULL COMMENT '대상 엔티티 ID',
    detail          JSON NULL COMMENT '상세 정보 (변경 전/후 등)',
    ip_address      VARCHAR(50) NULL,
    user_agent      VARCHAR(500) NULL,
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_user_action (user_id, action),
    INDEX idx_target (target_type, target_id),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='감사 로그';

-- ============================================
-- 알림 발송 이력
-- ============================================
CREATE TABLE notification_log (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,
    recipient_id    BIGINT NOT NULL COMMENT '수신자 ID',
    recipient_email VARCHAR(150) NOT NULL,
    event_type      VARCHAR(50) NOT NULL COMMENT '이벤트 유형 (SUBMIT, APPROVE 등)',
    document_id     BIGINT NULL,
    subject         VARCHAR(500) NOT NULL COMMENT '메일 제목',
    status          ENUM('SUCCESS','FAILED','RETRY') NOT NULL,
    retry_count     INT NOT NULL DEFAULT 0,
    error_message   TEXT NULL,
    sent_at         DATETIME NULL,
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (recipient_id) REFERENCES `user`(id),
    INDEX idx_document (document_id),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='알림 발송 이력';

-- ============================================
-- Refresh Token 저장소
-- ============================================
CREATE TABLE refresh_token (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id         BIGINT NOT NULL,
    token_hash      VARCHAR(255) NOT NULL UNIQUE COMMENT 'SHA-256 해시',
    device_info     VARCHAR(500) NULL COMMENT '디바이스 정보',
    expires_at      DATETIME NOT NULL,
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES `user`(id),
    INDEX idx_user (user_id),
    INDEX idx_expires (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Refresh Token';
```

### 11.3. ER 다이어그램 관계 요약

```
department  1 ──── N  user
position    1 ──── N  user
user        1 ──── N  document (drafter)
user        1 ──── N  approval_line (approver)
document    1 ──── 1  document_content
document    1 ──── N  approval_line
document    1 ──── N  document_attachment
document    N ──── 1  document (self-ref: source_doc_id)
```

---

## 12. 주요 API 엔드포인트 (Phase 1-A)

### 12.1. 인증

| Method | Endpoint | 설명 |
|--------|----------|------|
| POST | `/api/auth/login` | 로그인 (AT + RT 발급) |
| POST | `/api/auth/refresh` | Access Token 갱신 |
| POST | `/api/auth/logout` | 로그아웃 (RT 무효화) |

### 12.2. 결재 문서

| Method | Endpoint | 설명 |
|--------|----------|------|
| GET | `/api/documents` | 문서 목록 조회 (필터: 상태, 양식, 기간) |
| POST | `/api/documents` | 문서 생성 (임시저장) |
| GET | `/api/documents/{id}` | 문서 상세 조회 |
| PUT | `/api/documents/{id}` | 임시저장 문서 수정 (DRAFT만) |
| POST | `/api/documents/{id}/submit` | 상신 (채번 + Lock) |
| POST | `/api/documents/{id}/withdraw` | 회수 |
| POST | `/api/documents/{id}/rewrite` | 재기안 (기존 내용 복사 → 새 문서) |
| DELETE | `/api/documents/{id}` | 임시저장 문서 삭제 (DRAFT만) |

### 12.3. 결재 처리

| Method | Endpoint | 설명 |
|--------|----------|------|
| GET | `/api/approvals/pending` | 내 결재 대기 목록 |
| GET | `/api/approvals/completed` | 내 결재 완료 목록 |
| POST | `/api/approvals/{lineId}/approve` | 승인 (의견 포함) |
| POST | `/api/approvals/{lineId}/reject` | 반려 (의견 필수) |

### 12.4. 첨부파일

| Method | Endpoint | 설명 |
|--------|----------|------|
| POST | `/api/documents/{id}/attachments` | 파일 업로드 (Google Drive) |
| GET | `/api/attachments/{id}/download` | 파일 다운로드 (Google Drive Proxy) |
| DELETE | `/api/attachments/{id}` | 첨부 삭제 (DRAFT 문서만) |

### 12.5. 조직도 / 관리

| Method | Endpoint | 설명 |
|--------|----------|------|
| GET | `/api/users` | 사용자 목록 (결재선 검색용 포함) |
| GET | `/api/departments/tree` | 부서 트리 조회 |
| POST/PUT | `/api/admin/users` | 사용자 등록/수정 (ADMIN+) |
| POST/PUT | `/api/admin/departments` | 부서 등록/수정 (ADMIN+) |

---

## 13. 프론트엔드 화면 구성

### 13.1. 페이지 목록 (Phase 1-A)

| 페이지 | 경로 | 권한 | 설명 |
|--------|------|------|------|
| 로그인 | `/login` | 공개 | 이메일 + 비밀번호 |
| 대시보드 | `/` | USER+ | 결재 대기/진행/완료 요약, 최근 문서 |
| 문서 작성 | `/documents/new` | USER+ | 양식 선택 → 하드코딩 컴포넌트 렌더링 |
| 문서 상세 | `/documents/:id` | 권한자 | 문서 내용 + 결재선 현황 + 결재 처리 |
| 내 문서함 | `/documents/my` | USER+ | 내가 기안한 문서 목록 |
| 결재 대기함 | `/approvals/pending` | USER+ | 내가 처리할 결재 목록 |
| 결재 완료함 | `/approvals/completed` | USER+ | 내가 처리한 결재 이력 |
| 참조 문서함 | `/references` | USER+ | 나를 참조로 지정한 문서 목록 |
| 사용자 관리 | `/admin/users` | ADMIN+ | 계정 CRUD |
| 부서 관리 | `/admin/departments` | ADMIN+ | 부서 트리 CRUD |

### 13.2. 핵심 UX: 결재선 편집기

결재선 편집기는 전자결재 시스템의 가장 중요한 UX 컴포넌트이다.

**기능 요구사항:**
- 조직도 트리에서 사용자 검색/선택 (부서별 필터, 이름 검색)
- 결재 유형(결재/합의/참조) 지정
- 드래그 앤 드롭으로 결재 순서 조정
- 결재선 프리뷰 (순서 + 유형 + 이름 + 직급 + 부서 한눈에 확인)

---

## 14. 비기능 요구사항 (NFR)

### 14.1. 성능

| 항목 | 목표 |
|------|------|
| 동시 접속자 | 50명 이내 (마이스리치 임직원 규모) |
| 페이지 응답 시간 | 95th percentile ≤ 2초 |
| 파일 업로드 | 50MB 파일 기준 ≤ 30초 |
| 검색 응답 | ≤ 1초 (인덱스 최적화) |

### 14.2. 가용성 및 백업

| 항목 | 목표 |
|------|------|
| 시스템 가용성 | 99.5% (연간 허용 다운타임 ~44시간) |
| DB 백업 | 매일 02:00 풀백업 (mysqldump) |
| binlog 보관 | 7일 |
| 백업 보관 | 최근 30일분 로컬 보관 |
| RPO (복구 시점 목표) | ≤ 24시간 |
| RTO (복구 시간 목표) | ≤ 4시간 |

### 14.3. 보안

- HTTPS 필수 (Let's Encrypt)
- 비밀번호 복잡도: 영문+숫자+특수문자 8자 이상
- 로그인 실패 5회 시 계정 15분 잠금
- 모든 사용자 액션 감사 로그 기록

### 14.4. 반응형

- Phase 1: 데스크탑 우선 (1280px 이상 최적화)
- 태블릿/모바일: 결재 처리(승인/반려) 최소 지원
- 본격적 모바일 대응: Phase 1-C 이후 검토

---

## 15. 인수인계 및 퇴직 처리

### 15.1. 퇴직자 처리 정책

| 상황 | 처리 방법 |
|------|-----------|
| 미완료 결재 (기안자가 퇴직) | ADMIN이 해당 문서를 일괄 `WITHDRAWN` 처리 |
| 미처리 결재선 (결재자가 퇴직) | ADMIN이 해당 결재 라인을 `SKIPPED` 처리 후 다음 단계로 진행 |
| 기존 완료 문서 | 퇴직자 정보 그대로 보존 (이력 무결성) |
| 퇴직자 계정 | `RETIRED` 상태로 변경, 로그인 불가, 데이터 보존 |

---

## 16. 향후 로드맵 (Phase 2)

### 16.1. AI 제안서 보조 시스템
Phase 1에서 축적된 결재 문서 및 제안서 데이터를 바탕으로, 과거 RFP를 분석하여 신규 문서 작성 시 템플릿 초안을 자동으로 생성해 주는 AI 연동 기능을 도입한다.

### 16.2. Phase 2 검토 후보 기능
- 대결(代決) / 결재 위임
- 후결 프로세스
- 결재선 즐겨찾기(자주 쓰는 결재선 저장)
- 병렬 결재 (동시 합의)
- 문서 인쇄 템플릿 (PDF 출력)
- 인앱 실시간 알림 (WebSocket/SSE)
- 통계 대시보드 (부서별 결재 소요시간, 반려율 등)

---

## 부록 A. 용어 정의

| 용어 | 설명 |
|------|------|
| 기안 | 결재 문서를 최초 작성하는 행위 |
| 기안자 | 문서를 작성하여 결재를 요청하는 사람 |
| 상신 | 작성된 문서를 결재선에 올리는 행위 |
| 결재선 | 해당 문서의 승인 프로세스에 참여하는 사람들의 순서 목록 |
| 결재권자 | 결재선에서 승인/반려 권한을 가진 사람 |
| 합의 | 관련 부서의 동의를 구하는 결재 유형 |
| 참조 | 문서를 열람만 하는 대상 |
| 회수 | 기안자가 상신한 문서를 취소하는 행위 |
| 반려 | 결재권자가 문서를 거부하는 행위 |
| 재기안 | 반려/회수된 문서의 내용을 복사하여 새로운 문서로 다시 상신하는 행위 |
| 채번 | 문서에 고유 번호를 부여하는 행위 |

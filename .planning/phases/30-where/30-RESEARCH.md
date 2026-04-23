# Phase 30: 검색 권한 WHERE 절 보안 수정 + 필터 확장 - Research

**Researched:** 2026-04-23
**Domain:** QueryDSL 권한 predicate + Spring `@RequestParam List<Enum>` + axios params 배열 직렬화 + React Router v7 `useSearchParams`
**Confidence:** HIGH — 기존 코드 전수 조사 완료, Context7 로 React Router v7 / QueryDSL / axios 1.x / Spring 6 최신 문서 검증 완료, 모든 주요 주장이 `[VERIFIED]` 또는 `[CITED]`.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**A. 권한 WHERE 절 + DRAFT 정책 (SRCH-01 보안 수정)**
- **D-A1:** `tab` 스코프와 FSD 권한 predicate 는 병행 AND — tab(my/department/all) 은 기존 유지, FSD 권한 predicate 4-브랜치(본인 OR `EXISTS approval_line` OR `ADMIN AND 부서 일치` OR `SUPER_ADMIN`) 를 **항상 AND** 로 추가. 단일 SoT.
- **D-A2:** 권한 predicate 는 **QueryDSL 빌더 내부에서 role 기반 분기** — `SUPER_ADMIN` 이면 권한 predicate 자체를 스킵(전체 조회 허용), `ADMIN` 이면 "본인 OR EXISTS approval_line OR 본인 부서원의 문서", `USER` 이면 "본인 OR EXISTS approval_line". Controller 의 `tab=all` 403 검사는 API 경계 가드로 유지.
- **D-A3:** `EXISTS approval_line` 서브쿼리 조건 = `al.document_id = d.id AND al.approver_id = :currentUserId` — **line_type / status 제한 없음**. APPROVE/AGREE/REFERENCE 모든 타입 포함, PENDING/APPROVED/REJECTED/SKIPPED 모든 상태 포함.
- **D-A4:** `tab=my` 에서만 본인 DRAFT 노출. `tab=department`, `tab=all` 에서는 ADMIN·SUPER_ADMIN 이라도 본인 DRAFT 제외.
- **D-A5:** `status != DRAFT` 강제는 QueryDSL 빌더 내부 — `if (!"my".equals(tab)) where.and(doc.status.ne(DocumentStatus.DRAFT));`.
- **D-A6:** `tab=my` 는 `drafter_id = currentUserId` 만으로 충분 — 본인 DRAFT 도 조회 가능해야 하므로 `status != DRAFT` 면제.
- **D-A7:** `tab=all` Controller 403 가드 유지 — SUPER_ADMIN / ADMIN 만 접근.

**B. 필터 확장 + 복수 상태 API 계약**
- **D-B1:** `status` 복수 = 반복 쿼리 파라미터 `?status=SUBMITTED&status=APPROVED` (Spring `@RequestParam List<String> status` 매핑). axios `paramsSerializer` 재검토 필요.
- **D-B2:** `drafterId` = 검색 가능한 콤보박스 + `GET /users/search?q={}&size=20` 엔드포인트 (없으면) + 300ms debounce 자동완성.
- **D-B3:** `departmentId` 필터 이번 phase 에서 제외.
- **D-B4:** `DocumentSearchCondition` record 개편 — `String status` → `List<DocumentStatus> statuses`, `Long drafterId` 추가, 기존 `keyword/templateCode/dateFrom/dateTo/tab` 유지.
- **D-B5:** Controller 시그니처 개편 — `@RequestParam(required = false) List<String> status` → `DocumentStatus.valueOf` 변환, `@RequestParam(required = false) Long drafterId` 추가.
- **D-B6:** 쿼리 빌더에서 `if (!statuses.isEmpty()) where.and(doc.status.in(statuses));`.
- **D-B7:** `drafterId` 는 `where.and(doc.drafterId.eq(drafterId))` 단순 적용 — 권한 predicate 가 가시성 처리.

**C. URL query sync + 페이지네이션**
- **D-C1:** React Router `useSearchParams` 가 프론트 단일 SoT — 기존 `useState` 제거.
- **D-C2:** URL 반영 범위 = 모든 필터 + page + tab.
- **D-C3:** keyword 는 300ms debounce 후 URL 반영 + `replace: true` 로 history 오염 방지.
- **D-C4:** 빈 값 생략.
- **D-C5:** 프론트 tab = `my` / `search` → 백엔드 tab = `my` / `all`.
- **D-C6:** `useMyDocuments` + `useSearchDocuments` 두 훅 분리 유지.
- **D-C7:** 페이지 크기 20 고정.
- **D-C8:** 필터 변경 시 page=0 reset.
- **D-C9:** nuqs 도입 금지.

**D. 성능 · 인덱스 · count · 롤아웃**
- **D-D1:** 기존 인덱스로 먼저 실측 — V20 migration 은 EXPLAIN 결과 필요 시에만.
- **D-D2:** 필요 시 V20 후보 — `idx_status_submitted (status, submitted_at DESC)` 또는 approval_line `idx_approver_doc (approver_id, document_id)`.
- **D-D3:** `count(distinct doc.id)` 사용.
- **D-D4:** count query 와 content query 분리 유지.
- **D-D5:** Phase 30 내 간단 벤치 (10K seed + EXPLAIN + 병렬 스크립트). 결과는 PR description 에.
- **D-D6:** **PR 2 개 분할** — PR1 (hotfix 보안 + 스키마 개편) + PR2 (필터 확장·UI·벤치).
- **D-D7:** `tab=my` 엔드포인트(`/documents/my`) 는 Phase 30 범위 밖.
- **D-D8:** 기존 keyword 검색 OR 구조 변경 금지 (SRCH-02 재사용).

### Claude's Discretion

- `DocumentSearchCondition` record 의 `List<DocumentStatus>` 기본값 처리(Controller default value, null-check) 의 정확한 문법
- `GET /users/search` 엔드포인트의 정확한 시그니처 · DTO · 기존 UserController 확장 여부
- 프론트 복수 상태 선택 UI 의 구체 컴포넌트 스타일(체크박스 vs pills vs multi-select)
- V20 migration 필요 여부와 내용 (EXPLAIN 결과 기반)
- 벤치 스크립트 구체 도구 (`ab` / `wrk` / Spring ExecutorService)
- 10K seed 스크립트 구체 구현 (SQL INSERT / Flyway / CommandLineRunner)
- 권한 매트릭스 통합 테스트의 JPA fixture 스타일 (`@DataJpaTest` vs `@SpringBootTest`)
- axios `paramsSerializer` 변경이 전역에 미치는 영향 평가와 기존 API 호환성 점검

### Deferred Ideas (OUT OF SCOPE)

- `departmentId` 필터 → Phase 33 또는 v1.3
- 페이지 크기 사용자 조절 UI (10/20/50/100) → Phase 33 또는 v1.3
- 복합 인덱스 선제적 추가 → EXPLAIN 결과 기반
- `useMyDocuments` 와 `useSearchDocuments` 통합 → Phase 33 리팩토링
- 3-PR 분할 → 2-PR 분할이 충분 (D-D6)
- nuqs · URL state 라이브러리 도입 → 기본 `useSearchParams` 로 충분
- `GET /documents/search` 를 POST 로 전환 → API 호환성 깨짐
- Elasticsearch / OpenSearch / MariaDB FULLTEXT → ROADMAP 배제
- 검색 결과 하이라이팅 → v1.3 이후
- 저장된 필터 프리셋 → Phase 1-C 고급 기능
- 결재 상태별 빠른 탭 → Phase 31 대시보드 중복 투자
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| SRCH-01 | [보안 수정] 본인 기안 + `EXISTS approval_line` + ADMIN 부서 범위 + SUPER_ADMIN 전체 권한 WHERE 절 적용, 타인 DRAFT 노출 금지 | §2 QueryDSL 권한 predicate 패턴, §9 approval_line 삭제 경로 확인 (Finding 9.1: DRAFT 업데이트/삭제 시만 delete, SUBMITTED 이후 영구 보존) |
| SRCH-02 | 키워드(제목/문서번호/기안자) LIKE 검색 | Finding 3.1: 기존 `escapeLikePattern` + OR 구조 그대로 재사용 |
| SRCH-03 | 상태(복수 선택), 양식(단일), 기간 필터 | §2 `doc.status.in(statuses)`, §3 `@RequestParam List<DocumentStatus>` 직접 바인딩 |
| SRCH-04 | 기안자(드롭다운/검색) 필터 | §3 `GET /users/search` 신설 필요 — 기존 `/api/v1/admin/users` 는 `@PreAuthorize` ADMIN 전용이라 재사용 불가 |
| SRCH-05 | 오프셋 페이지네이션(크기 20) + URL query string 동기화 | §4 React Router v7 `useSearchParams` 콜백 패턴 |
| SRCH-06 | 10K 문서 · 50 동시 사용자 · 95p ≤ 1초 | §5 `countDistinct` 안전성, §7 부하 스크립트 옵션 |
| NFR-01 | 검색 응답 95p ≤ 1초 (SRCH-06 과 동일, NFR 관점) | §7 벤치 전략 |
</phase_requirements>

## Overview

본 phase 의 기술 도전은 **다섯 계층에 걸친 좁은 변경**이다:

1. **백엔드 QueryDSL (핵심)** — `DocumentRepositoryCustomImpl.searchDocuments` 에 FSD FN-SEARCH-001 의 4-브랜치 권한 predicate 를 `JPAExpressions.selectOne().from(QApprovalLine).where(...).exists()` 서브쿼리 + `drafter.departmentId.eq(:myDept)` IN 서브쿼리 조합으로 주입. 동시에 `status != DRAFT` gate 를 `tab != 'my'` 조건부로 추가. 현재 코드에는 tab 스코프만 존재하고 권한 predicate 자체가 없어 **운영 중 보안 사고** (REFERENCE 라인 접근자 누락 + ADMIN 이 타부서 DRAFT 조회 가능).

2. **백엔드 DTO / Controller** — `DocumentSearchCondition` record 의 `String status` → `List<DocumentStatus> statuses`, `Long drafterId` 추가. Controller `@RequestParam List<String> status` 를 수동으로 enum 변환 (Spring 6 의 자동 enum 바인딩은 단일 enum `@RequestParam` 에는 작동하지만 `List<Enum>` 바인딩 시 `MethodArgumentTypeMismatchException` 핸들러가 프로젝트에 없어 500 유출 위험).

3. **백엔드 UserController (신설)** — 현재 프로젝트에 `UserController` 가 **없음**. `UserManagementController (/api/v1/admin/users)` 는 `@PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN')")` 이므로 일반 USER 의 drafterId 자동완성에는 사용 불가. `/api/v1/users/search` 를 신설해야 함 (혹은 UserManagementController 의 @PreAuthorize 를 메서드 레벨로 낮추고 특정 경로만 공개).

4. **프론트 axios client** — 현재 `apiClient` 에 `paramsSerializer` 설정이 **없음**. axios 1.x 기본은 `status[]=A&status[]=B` (bracket 포맷) — Spring `@RequestParam List<String>` 도 이 포맷을 수용은 하지만, URL 공유성/RESTful 관례상 `status=A&status=B` (repeat) 이 표준. `qs` 의존성 추가 or 순수 `URLSearchParams` 기반 serializer 선택 필요.

5. **프론트 DocumentListPage** — `useState` 6개(page, keyword, debouncedKeyword, statusFilter, templateFilter, dateFrom, dateTo) + `setPage(0)` 보일러플레이트 곳곳. React Router v7 `useSearchParams` 단일 SoT 로 전환하고 drafterId 콤보박스(AsyncSelect) 신규 추가. 복수 상태 UI (체크박스/pills) 로 `STATUS_OPTIONS` 확장.

**핵심 레버리지:** 권한 로직은 이미 **`DocumentService.getDocument()` L204-223** 에 4-브랜치 Java 코드로 **정확히** 구현되어 있다 (isDrafter / isApprovalParticipant / isAdminSameDept / isSuperAdmin). QueryDSL 로 옮기는 건 Java 의 4개 boolean 을 4개 QueryDSL predicate 로 번역하는 기계적 작업. 4-브랜치 OR 의미론도 이미 검증됨.

**Primary recommendation:** PR1 에서 QueryDSL 권한 predicate + DRAFT gate + `DocumentSearchCondition` 필드 개편 + 수동 enum 변환 + `MethodArgumentTypeMismatchException` 핸들러 보강 + 7×4 권한 매트릭스 통합 테스트 28 케이스. PR2 에서 `GET /users/search` + axios paramsSerializer + React Router v7 `useSearchParams` 전환 + 복수 상태 UI + 10K seed + `ab` 벤치.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| 권한 predicate (SRCH-01) | API/Backend (QueryDSL 빌더) | — | FSD 원문이 WHERE 절 로 명시. 단일 SoT 가 쿼리 레이어에 있어야 다른 호출 경로(관리자 페이지, 배치)도 자동 보호 (D-A5). |
| DRAFT gate | API/Backend (QueryDSL 빌더) | — | D-A5 locked. 서비스/컨트롤러 가 우회하더라도 쿼리는 안전. |
| tab=all RBAC 가드 | API/Backend (Controller) | — | API 경계의 early reject (D-A7). 쿼리 predicate 와 이중 방어. |
| 복수 상태 enum 변환 | API/Backend (Controller) | — | `MethodArgumentTypeMismatchException` 이 Spring 의 바인딩 단계에서 던져지므로 컨트롤러 인자 타입·핸들러로만 해결 가능. |
| drafterId 자동완성 데이터 | API/Backend (UserController 신설) | — | 가시성은 role 기반. 백엔드가 필터링 책임. |
| URL query sync | Browser (useSearchParams) | — | SPA 상태 — 서버는 파라미터만 소비. |
| keyword debounce | Browser (useEffect + setTimeout) | — | 타이핑 UX 는 브라우저 측 관심사. |
| count(distinct) | API/Backend (QueryDSL) | Database | QueryDSL 이 SQL 생성, MariaDB 가 실행. 인덱스가 성능 좌우. |
| 복수 상태 UI (체크박스/pills) | Browser (React component) | — | UX. |
| 10K seed | Database / Build Tool | — | CommandLineRunner(@Profile="seed") 또는 SQL INSERT 스크립트 — 일회성. |

## Standard Stack

### Core (기존 프로젝트 스택 — 추가 없음)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| QueryDSL JPA | 5.1.0 (프로젝트 사용 중) | 권한 predicate + IN 서브쿼리 + BooleanBuilder | 프로젝트 전체 retention. 새 의존성 zero. [VERIFIED: backend/build.gradle 및 DocumentRepositoryCustomImpl 사용] |
| Spring Boot | 3.x (프로젝트 사용 중) | `@RequestParam List<Enum>` 자동 변환, `@RestControllerAdvice` | Spring Boot 3.x + Spring Framework 6 은 `List<Enum>` 바인딩을 기본 지원. [CITED: Context7 /spring-projects/spring-boot] |
| React Router | 7.13.2 | `useSearchParams` + `replace: true` + 콜백 setter | 프로젝트 이미 v7 사용. `useSearchParams` 가 URL SoT 에 적합. [VERIFIED: frontend/package.json L36 "react-router": "^7.13.2"] |
| TanStack Query | 5.95.2 | useQuery 키로 searchParams 수용 | 프로젝트 이미 사용. 쿼리 키에 params 배열 삽입 시 자동 무효화. [VERIFIED: package.json L22] |
| axios | 1.14.0 | paramsSerializer 재설정 | 프로젝트 이미 사용. 1.x 는 `paramsSerializer: { serialize: (p) => ... }` 객체 포맷 지원. [CITED: Context7 /axios/axios] |

### Supporting (추가 의존성 — 선택적)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `qs` | ^6.11.x | `qs.stringify(params, { arrayFormat: 'repeat' })` — 배열을 `status=A&status=B` 로 | axios paramsSerializer 커스터마이징 시. 번들 크기 ~16KB gzipped. [CITED: Context7 /axios/axios upgrade-guide 에서 이 패턴 공식 권장] |

**추가 의존성 불필요 경로:** `URLSearchParams` 기반 수동 serializer 로 동일한 효과 달성 가능 — `qs` 미설치 옵션 (§3 Recommended Approach 의 Option B 참조). 의존성 최소화 원칙에 부합.

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| 수동 `List<String>` → `DocumentStatus.valueOf` | `@RequestParam List<DocumentStatus> statuses` 직접 바인딩 | 직접 바인딩이 깔끔하지만 잘못된 값 전달 시 `MethodArgumentTypeMismatchException` 이 `GlobalExceptionHandler` 에 핸들러 **없으므로** 500 반환 — **결정적 함정.** 핸들러 먼저 추가 후 직접 바인딩 권장. |
| `JPAExpressions.selectOne().from(QApprovalLine).where(...).exists()` | 네이티브 `@Query SQL` | QueryDSL 로 옮기는 게 type-safe + IDE 추적 가능 + 기존 빌더 패턴과 일관 |
| `count(distinct doc.id)` | `count(doc.id)` | `count` 로 충분할 수도 있지만 (EXISTS 는 inflate 없음), D-D3 locked 이고 보수적 방어가 올바름. 성능 차이는 10K 규모에서 무시할 수준. |
| `nuqs` 같은 URL state 라이브러리 | React Router v7 `useSearchParams` | D-C9 locked — 의존성 최소화. `useSearchParams` 가 v7 에서 충분히 성숙. |
| React Router `<Form>` + submit | 프로그래매틱 `setSearchParams` | 본 phase 는 필터 UI 가 실시간 반응 — `setSearchParams` 가 자연스러움. |

**Installation (PR2, 선택):**

```bash
npm install qs
npm install --save-dev @types/qs
```

**Version verification:**

```bash
npm view qs version    # 6.13.x 예상 — 배열 포맷 API 안정
```

## Architecture Patterns

### System Architecture Diagram

```
┌────────────────────────────────────────────────────────────────────────────┐
│                            Browser (React SPA)                             │
│                                                                            │
│   DocumentListPage                                                         │
│   ├── useSearchParams() ─ URL SoT ─ [keyword, status×N, templateCode,     │
│   │                                   dateFrom, dateTo, drafterId,        │
│   │                                   page, tab]                          │
│   ├── useDebounce(keywordInput, 300ms) → setSearchParams(replace:true)    │
│   ├── DrafterCombo (신규) ─ onInput ─ debounce ─ GET /users/search        │
│   └── useSearchDocuments(params) ─ TanStack Query                         │
│                  │                                                         │
│                  │   axios apiClient.get('/documents/search', { params }) │
│                  │   paramsSerializer: repeat format → ?status=A&status=B │
│                  ▼                                                         │
├────────────────────────────────────────────────────────────────────────────┤
│                         Spring Boot Backend                                │
│                                                                            │
│   DocumentController.searchDocuments (GET /api/v1/documents/search)       │
│   ├── @RequestParam(required=false) List<String> status                   │
│   │     ↓ valueOf (수동)                                                  │
│   │     List<DocumentStatus> statuses  (잘못된 값 → 400 VALIDATION_ERROR) │
│   ├── tab=all RBAC 가드 (403 if USER)                                    │
│   ├── DocumentSearchCondition record (확장: statuses, drafterId)         │
│   └── DocumentService.searchDocuments()                                  │
│              │                                                             │
│              ▼                                                             │
│   DocumentRepositoryCustomImpl.searchDocuments (QueryDSL)                 │
│   ├── BooleanBuilder where                                                │
│   ├── [1] tab scope (기존)                                                │
│   ├── [2] 권한 predicate (신규, role 기반 분기):                          │
│   │       - SUPER_ADMIN: 생략                                             │
│   │       - ADMIN: doc.drafterId.eq(me) OR EXISTS(approval_line) OR       │
│   │                doc.drafterId.in(JPAExpressions.select(u.id)           │
│   │                                 .from(QUser).where(u.deptId = mine)) │
│   │       - USER:  doc.drafterId.eq(me) OR EXISTS(approval_line)          │
│   ├── [3] DRAFT gate (신규): if (!tab.equals("my")) where.and(            │
│   │                           doc.status.ne(DRAFT))                       │
│   ├── [4] 필터: statuses.in, templateCode.eq, dateFrom/To, drafterId.eq   │
│   ├── [5] keyword OR (기존): title | docNumber | drafter.name            │
│   ├── count query: select doc.id.countDistinct()                          │
│   └── content query: Projections.constructor + offset/limit + orderBy     │
│                                                                            │
│   UserController (신설 /api/v1/users/search)                              │
│   └── q + size → UserRepository.findActiveByNameStartingWith              │
├────────────────────────────────────────────────────────────────────────────┤
│                         MariaDB 10.11                                      │
│                                                                            │
│   document (idx_drafter_status, idx_status, idx_template_code,            │
│             idx_submitted_at)                                              │
│   approval_line (idx_approver_status, idx_document_step)                  │
│   user (pk, fk department_id)                                             │
└────────────────────────────────────────────────────────────────────────────┘
```

### Recommended Project Structure (변경 범위)

```
backend/src/main/java/com/micesign/
├── repository/
│   ├── DocumentRepositoryCustom.java       # 시그니처 유지 (DocumentSearchCondition 만 확장)
│   └── DocumentRepositoryCustomImpl.java   # 권한 predicate + DRAFT gate + statuses.in + drafterId.eq
├── dto/document/
│   └── DocumentSearchCondition.java        # record 확장: List<DocumentStatus> statuses, Long drafterId
├── controller/
│   ├── DocumentController.java             # L116-144 @RequestParam 시그니처 개편 + enum 수동 변환
│   └── UserController.java                 # 신설 — /api/v1/users/search (role 공개)
├── common/exception/
│   └── GlobalExceptionHandler.java         # MethodArgumentTypeMismatchException 핸들러 추가
└── dto/user/
    └── UserSearchItem.java (신설)           # id/name/departmentName 최소 DTO
backend/src/main/resources/db/migration/
└── V20__*.sql                               # EXPLAIN 결과 필요 시에만 생성 (YAGNI)

frontend/src/
├── api/
│   └── client.ts                            # paramsSerializer 설정 추가
├── features/
│   ├── document/
│   │   ├── pages/DocumentListPage.tsx      # useState → useSearchParams
│   │   ├── components/
│   │   │   ├── DrafterCombo.tsx (신규)     # debounced async combobox
│   │   │   └── StatusMultiSelect.tsx (신규) # 체크박스 pills
│   │   ├── types/document.ts                # DocumentSearchParams: statuses?: string[], drafterId?: number
│   │   ├── api/documentApi.ts               # searchDocuments params shape update
│   │   └── hooks/useDocuments.ts            # queryKey 확장
│   └── user/                                # 신규 feature 폴더
│       └── api/userApi.ts                   # searchUsers(q, size)
```

### Pattern 1: QueryDSL 권한 predicate (role 기반 분기)

**What:** FSD FN-SEARCH-001 의 4-브랜치 SQL 을 QueryDSL 빌더로 번역. role 이 SUPER_ADMIN/ADMIN/USER 에 따라 predicate 를 조건부로 조립.
**When to use:** 본 phase 의 SRCH-01 구현. 다른 검색 엔드포인트에도 소급 가능 (Phase 31 대시보드 등).
**Example:**

```java
// Source: verified project pattern (DocumentService.getDocument L204-223 의 Java 4-브랜치를
// QueryDSL 로 번역) + Context7 /openfeign/querydsl 의 JPAExpressions + BooleanBuilder 조합
import com.querydsl.core.BooleanBuilder;
import com.querydsl.core.types.dsl.BooleanExpression;
import com.querydsl.jpa.JPAExpressions;

// 4-브랜치 권한 predicate 생성 (role 기반)
// SUPER_ADMIN: predicate 자체 생략 → 전체 조회
// ADMIN:   drafterId=me OR EXISTS(approval_line) OR drafterId IN (user.deptId=myDept)
// USER:    drafterId=me OR EXISTS(approval_line)
if ("SUPER_ADMIN".equals(role)) {
    // no additional predicate — full visibility (D-A2)
} else {
    BooleanExpression ownDoc = doc.drafterId.eq(userId);

    BooleanExpression approvalParticipant = JPAExpressions
        .selectOne()
        .from(approvalLine)
        .where(approvalLine.document.id.eq(doc.id)
               .and(approvalLine.approver.id.eq(userId)))
        .exists();

    BooleanExpression permissionBranch = ownDoc.or(approvalParticipant);

    if ("ADMIN".equals(role) && departmentId != null) {
        QUser u = new QUser("deptUser");  // alias to avoid clash with main drafter join
        BooleanExpression sameDepartment = doc.drafterId.in(
            JPAExpressions.select(u.id).from(u)
                .where(u.departmentId.eq(departmentId))
        );
        permissionBranch = permissionBranch.or(sameDepartment);
    }
    where.and(permissionBranch);
}
```

**핵심 주의:**
- `JPAExpressions.selectOne().from(...).exists()` → SQL `EXISTS(SELECT 1 FROM ...)` 생성. [CITED: Context7 /openfeign/querydsl "JPA Subqueries with QueryDSL"]
- `doc.drafterId.in(JPAExpressions.select(u.id).from(u).where(...))` → SQL `IN (SELECT id FROM user WHERE ...)` 생성. [CITED: 동일 문서 "Subquery with IN clause"]
- `permissionBranch = permissionBranch.or(sameDepartment)` — `BooleanExpression.or()` 은 immutable, 반환값을 반드시 재할당. [VERIFIED: QueryDSL API]
- **Pitfall:** `BooleanBuilder.and(null)` 은 silently drop — 만약 role 이 null 이면 권한 predicate 자체가 없어지므로 **보안 사고**. role null-check 는 Controller 에서 `UserRole.valueOf(...)` 가 이미 가드 (현재 DocumentController L128).

### Pattern 2: DRAFT gate (tab 조건부)

**What:** `tab != 'my'` 인 경우 `doc.status != DRAFT` 강제.
**Example:**

```java
String tab = condition.tab() != null ? condition.tab().toLowerCase() : "my";
if (!"my".equals(tab)) {
    where.and(doc.status.ne(DocumentStatus.DRAFT));
}
```

**주의:** 이 `where.and(...)` 는 권한 predicate **뒤에** 와야 SQL AND 체인의 의미가 명확 (둘 다 AND 이므로 실제로는 순서 무관하지만 가독성).

### Pattern 3: Spring `@RequestParam List<String>` 수동 enum 변환

**What:** `List<String>` 으로 받아 Java 코드에서 `DocumentStatus.valueOf` 로 변환. 잘못된 값 처리 명확화.
**Why:** `@RequestParam List<DocumentStatus>` 직접 바인딩은 Spring 6 에서 동작하나, 잘못된 enum 값 전달 시 `MethodArgumentTypeMismatchException` 을 던지고, 프로젝트 `GlobalExceptionHandler` 에 이 예외 핸들러가 **없음** → `handleException(Exception)` catch-all 로 떨어져 500 반환. 사용자에게 400 + 명확 메시지를 보내려면 (1) 수동 변환 또는 (2) 핸들러 추가 중 선택.

**Example (Option A — 수동 변환, 의존성 최소):**

```java
@GetMapping("/search")
public ResponseEntity<ApiResponse<Page<DocumentResponse>>> searchDocuments(
        @RequestParam(required = false) String keyword,
        @RequestParam(name = "status", required = false) List<String> rawStatuses,
        @RequestParam(required = false) String templateCode,
        @RequestParam(required = false) Long drafterId,
        @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateFrom,
        @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateTo,
        @RequestParam(defaultValue = "my") String tab,
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "20") int size,
        @AuthenticationPrincipal CustomUserDetails user) {

    List<DocumentStatus> statuses;
    if (rawStatuses == null || rawStatuses.isEmpty()) {
        statuses = Collections.emptyList();
    } else {
        try {
            statuses = rawStatuses.stream().map(DocumentStatus::valueOf).toList();
        } catch (IllegalArgumentException ex) {
            throw new BusinessException("VALIDATION_ERROR",
                "상태 값이 올바르지 않습니다: " + rawStatuses, 400);
        }
    }
    // ... existing code
}
```

**Example (Option B — 직접 바인딩 + 핸들러):**

```java
// Controller
@RequestParam(name = "status", required = false) List<DocumentStatus> statuses

// GlobalExceptionHandler 보강
@ExceptionHandler(org.springframework.web.method.annotation.MethodArgumentTypeMismatchException.class)
public ResponseEntity<ApiResponse<?>> handleTypeMismatch(MethodArgumentTypeMismatchException ex) {
    String message = String.format("파라미터 '%s' 의 값이 올바르지 않습니다: %s",
        ex.getName(), ex.getValue());
    return ResponseEntity.badRequest().body(
        ApiResponse.error("VALIDATION_ERROR", message));
}
```

**권장:** **Option A (수동 변환)** — 에러 메시지를 한국어로 통제할 수 있고, `GlobalExceptionHandler` 시그니처 확장이 불필요. 단, Option B 핸들러도 다른 enum 파라미터(`UserRole` 등) 보호용으로 함께 추가하면 더 안전 — 이는 Phase 30 의 2차 선택으로 기록.

### Pattern 4: React Router v7 `useSearchParams` + debounce

**What:** URL 을 단일 SoT 로 두고, 모든 필터 상태를 `searchParams` 에서 파생. 키보드 입력은 debounce 후 URL 에 반영.
**Example:**

```tsx
// Source: Context7 /remix-run/react-router "Manage URL Search Parameters with useSearchParams Hook"
import { useSearchParams } from 'react-router';
import { useEffect, useMemo, useRef, useState } from 'react';

export default function DocumentListPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  // Derive filter object from URL (single SoT)
  const filters = useMemo(() => ({
    tab: (searchParams.get('tab') ?? 'my') as 'my' | 'search',
    keyword: searchParams.get('keyword') ?? '',
    statuses: searchParams.getAll('status'),
    templateCode: searchParams.get('templateCode') ?? '',
    dateFrom: searchParams.get('dateFrom') ?? '',
    dateTo: searchParams.get('dateTo') ?? '',
    drafterId: searchParams.get('drafterId'),  // string | null
    page: Number(searchParams.get('page') ?? '0'),
  }), [searchParams]);

  // Local input state for keyword (debounce target)
  const [keywordInput, setKeywordInput] = useState(filters.keyword);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      if (keywordInput === filters.keyword) return;
      setSearchParams(prev => {
        const next = new URLSearchParams(prev);
        if (keywordInput) next.set('keyword', keywordInput);
        else next.delete('keyword');
        next.set('page', '0');
        return next;
      }, { replace: true });
    }, 300);
    return () => clearTimeout(debounceRef.current);
  }, [keywordInput]);

  // Helper for non-keyword filter changes
  const updateFilter = (updates: Record<string, string | string[] | null>) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      Object.entries(updates).forEach(([key, value]) => {
        next.delete(key);  // clear existing
        if (Array.isArray(value)) {
          value.forEach(v => next.append(key, v));
        } else if (value !== null && value !== '') {
          next.set(key, value);
        }
      });
      next.set('page', '0');  // reset page on filter change (D-C8)
      return next;
    });  // no replace — filter changes are intentional history entries
  };

  // TanStack Query key includes derived filters
  const searchQuery = useSearchDocuments(filters, filters.tab === 'search');
  // ...
}
```

**핵심 주의:**
- `setSearchParams` 의 콜백은 React useState 큐잉 **미지원** — 동일 tick 에서 여러 번 호출하면 마지막만 적용. [CITED: Context7 /remix-run/react-router "setSearchParams Function Notes"]
- `replace: true` 는 debounced keyword 에만 사용 (history 폭주 방지). 명시적 필터 변경에는 `push` (기본값) — 사용자가 뒤로가기로 이전 필터 복구 가능.
- `searchParams.getAll('status')` → `string[]` (여러 값). `searchParams.get('status')` → 첫 번째 값만.

### Pattern 5: axios paramsSerializer (repeat format)

**What:** `?status=A&status=B` (repeat) 생성. Spring `@RequestParam List<String> status` 가 가장 자연스럽게 받는 포맷.
**Why:** axios 1.x 기본은 `status[]=A&status[]=B` (brackets). Spring 도 수용하지만 (1) URL 공유 시 덜 깔끔, (2) Java ecosystem RESTful 관례 (Swagger, SpringDoc OpenAPI 기본값 = `simple` aka repeat).

**Option A — `qs` 사용 (Context7 권장 패턴):**

```typescript
// frontend/src/api/client.ts
// Source: Context7 /axios/axios upgrade-guide
import qs from 'qs';

const apiClient = axios.create({
  baseURL: '/api/v1',
  paramsSerializer: {
    serialize: (params) => qs.stringify(params, { arrayFormat: 'repeat' }),
  },
  // ... existing config
});
```

**Option B — 순수 `URLSearchParams` (의존성 zero):**

```typescript
// frontend/src/api/client.ts
// Source: W3C URLSearchParams spec + axios docs
const apiClient = axios.create({
  baseURL: '/api/v1',
  paramsSerializer: {
    serialize: (params) => {
      const sp = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value === null || value === undefined) return;
        if (Array.isArray(value)) {
          value.forEach(v => {
            if (v !== null && v !== undefined && v !== '') sp.append(key, String(v));
          });
        } else if (value !== '') {
          sp.append(key, String(value));
        }
      });
      return sp.toString();
    },
  },
  // ... existing config
});
```

**권장:** **Option B** — 추가 의존성 zero + URLSearchParams 는 브라우저 표준 + 빈 값 생략 로직을 한 곳에 집중. 프로젝트 원칙 (의존성 최소화) 에 부합.

**기존 API 호환성 영향 분석** (D-B1 caveat, §10 Pitfall 참조):

| 기존 API | 배열 파라미터 사용? | 영향 |
|----------|------------------|------|
| `/documents/my` | `status` 단일 | 없음 (객체 serializer 도 단일 값은 반복 없이 `status=A`) |
| `/documents/{id}/attachments` | 경로 변수만 | 없음 |
| `/admin/users` | `keyword/role/status` 단일 | 없음 |
| 기타 모든 `apiClient.get(url, { params })` | 단일 값만 | 없음 (`grep` 결과: 배열을 `params` 에 전달하는 기존 호출 없음) |

**결론:** `paramsSerializer` 전역 추가가 **기존 API 파괴 없음** — 안전 (Finding 10.1).

### Pattern 6: `count(distinct doc.id)`

**What:** JOIN inflate 방지를 위한 보수적 count.
**Example:**

```java
// Source: Context7 /openfeign/querydsl + 프로젝트 기존 count 패턴 (DocumentRepositoryCustomImpl L83-89)
Long total = queryFactory
    .select(doc.countDistinct())   // 또는 doc.id.countDistinct()
    .from(doc)
    .join(doc.drafter, drafter)
    .join(drafter.department, dept)
    .leftJoin(drafter.position, pos)
    .where(where)
    .fetchOne();
if (total == null) total = 0L;
```

**주의:**
- `doc.countDistinct()` 는 SQL `count(distinct doc.id)` 생성 (id 가 PK 이므로 동일). QueryDSL 관용구.
- `EXISTS approval_line` 는 서브쿼리이므로 inflate 없음. 하지만 `drafter JOIN user`, `drafter JOIN department` 는 1:1 FK 이므로 이론상 inflate 없음. D-D3 는 보수적 방어.
- `countDistinct` + `ORDER BY` 함께 쓰면 MariaDB 에서 ONLY_FULL_GROUP_BY 충돌 가능 (§10 Pitfall 7) — 하지만 count query 에는 orderBy 가 없으므로 본 phase 는 안전.

### Anti-Patterns to Avoid

- **`BooleanBuilder.and(null)`:** null predicate 는 silently 무시 → role null 시 권한 predicate 자체 증발 → 보안 사고. 각 분기마다 BooleanExpression 이 non-null 인지 assert.
- **`@RequestParam List<DocumentStatus> statuses` (핸들러 없이):** 잘못된 enum 값 → 500 Internal Server Error. 반드시 Option A (수동) 또는 Option B (핸들러) 선택.
- **`setSearchParams({ status: ['A', 'B'] })` 직접 호출:** v7 에서 동작하지만 콜백 패턴(`setSearchParams(prev => ...)`) 이 동일 tick 내 충돌 방지. [CITED: Context7 react-router]
- **debounce 없이 URL 업데이트:** 타이핑 중 history 폭주 (20자 입력 시 20개 history entry). 반드시 `replace: true` + 300ms debounce.
- **`status[]=A&status[]=B` (bracket):** Spring 이 받긴 하지만 URL 공유 시 brackets 인코딩으로 지저분 (`status%5B%5D=A`). repeat 이 표준.
- **`approvalLineRepository.deleteByDocumentId` 호출 경로 확장:** 현재는 DRAFT 업데이트/삭제 시만 — 이 호출 규약을 깨면 REFERENCE 접근자의 과거 기록 접근 권한이 사라짐 (Finding 9.1).
- **QueryDSL content query 에 `.distinct()` 추가 without countDistinct:** count 와 content 가 불일치 → 페이지네이션 버그. 둘 다 distinct 또는 둘 다 non-distinct.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| 권한 predicate | `@Query` 네이티브 SQL 인라인 | QueryDSL `JPAExpressions.selectOne().from(...).exists()` | Type-safe, IDE 리팩토링 추적, BooleanBuilder 와 조합 가능 |
| URL query 파싱 | `window.location.search` 직접 파싱 | React Router `useSearchParams` | URL 변경 감지 + React 리렌더 자동 통합 |
| debounce | 직접 `setTimeout` + cleanup | `useEffect + setTimeout + ref` (현재 프로젝트 패턴) — 또는 custom `useDebounce` 훅 | 프로젝트에 이미 DocumentListPage L34-40 에 패턴 존재 — 재사용 |
| axios 배열 직렬화 | 수동 `?status=A&status=B` 문자열 조립 | `paramsSerializer` 전역 설정 | 모든 API 호출에서 자동. 개별 호출 시 반복 코드 제거 |
| enum 변환 | reflection 기반 generic converter | `DocumentStatus.valueOf(String)` 직접 호출 + try-catch | Java 표준 라이브러리. ~5줄. |
| 10K seed 데이터 | 일일이 INSERT SQL 작성 | Spring `CommandLineRunner` + `@Profile("seed")` + Faker 라이브러리 또는 단순 반복문 | 재현 가능, 프로필로 격리, 운영에 혼입 안 됨 |
| 부하 테스트 | Java `ExecutorService` + HttpClient + 타이머 자체 작성 | `ab` (Apache Bench) 또는 `wrk` — CLI 한 줄 | 95p/p99 자동 계산, 결과 리포트 표준 포맷 |

**Key insight:** 본 phase 의 모든 복잡도는 **기존 프로젝트 라이브러리**로 커버된다. 신규 의존성은 `qs` (optional, Option B 로 회피 가능) 뿐.

## Runtime State Inventory

> 본 phase 는 **rename/refactor/migration 이 아님** — 필드 추가(`statuses`/`drafterId`) 및 QueryDSL 로직 주입 중심. 아래는 PR2 롤아웃 시 고려할 런타임 상태.

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | `approval_line` 행 = SRCH-01 의 `EXISTS approval_line` 판정 근거 — SUBMITTED 이후 delete 되지 않고 status 전이만 발생 (Finding 9.1 에서 검증) | 없음 — 기존 데이터 그대로 권한 predicate 가 기대대로 동작 |
| Live service config | 없음 — 본 phase 는 외부 서비스 의존 zero (Google Drive, SMTP 모두 비관련) | — |
| OS-registered state | 없음 | — |
| Secrets/env vars | 없음 — `application.yml` 변경 없음 | — |
| Build artifacts | QueryDSL Q-class 재생성 필요? | `DocumentSearchCondition` record 변경은 Q-class 생성 대상이 아님 (DTO). 엔티티 미변경 → `./gradlew compileJava` 만으로 충분. |
| Frontend routing | URL 포맷 변경 (statuses/drafterId 신규) | 북마크·공유된 링크는 기존 format 이므로 신규 필터 없이 동작. 역호환성 유지. |

**Nothing found in categories (Live service config, OS-registered state, Secrets/env vars):** 본 phase 는 순수 백엔드 쿼리 로직 + 프론트 URL sync — 런타임 인프라 변경 zero.

## Common Pitfalls

### Pitfall 1: `BooleanBuilder.and(null)` silently drops
**What goes wrong:** role 이 null 이거나 오타로 branch 가 빠지면 권한 predicate 전체가 사라져 **모든 사용자가 모든 문서 조회 가능** — 보안 사고 등급 상승.
**Why it happens:** QueryDSL `BooleanBuilder.and(Predicate)` 는 null 인자를 예외 대신 무시 (dynamic query builder 의 편의 기능이 양날의 검).
**How to avoid:** (1) Controller 에서 `UserRole.valueOf(user.getRole())` 이 이미 fail-fast — role 이 null 이면 `NullPointerException` 먼저 뜸. (2) 테스트에서 **Matrix test** 로 각 role×상태 조합 검증 (§Validation Architecture).
**Warning signs:** `where.and(predicate)` 후 생성된 SQL 에서 WHERE 절 누락 → 테스트의 count 가 seed 수와 동일하면 의심.

### Pitfall 2: `MethodArgumentTypeMismatchException` → 500 유출
**What goes wrong:** `@RequestParam List<DocumentStatus> statuses` 에 `?status=INVALID` 전달 시 Spring 은 `MethodArgumentTypeMismatchException` 던짐 → `GlobalExceptionHandler.handleException(Exception)` 로 떨어져 500 "서버 내부 오류" 반환.
**Why it happens:** `GlobalExceptionHandler` 에 `MethodArgumentTypeMismatchException` 전용 핸들러가 **없음** (Finding 3.2).
**How to avoid:** Pattern 3 Option A (수동 `List<String>` + valueOf + BusinessException) 또는 Option B (직접 바인딩 + 핸들러 추가). 본 phase 는 enum 이 아닌 `Long drafterId` 도 동일 취약 → 핸들러 추가가 더 포괄적.
**Warning signs:** 악의적/오타 사용자가 `status=XXX` 보냈을 때 로그에 `ERROR ... Unhandled exception` 반복.

### Pitfall 3: axios `paramsSerializer` 변경이 다른 API 파괴?
**What goes wrong:** 전역 serializer 를 변경했더니 기존 단일 값 API 가 이상한 방식으로 직렬화됨.
**Why it happens:** axios 1.x paramsSerializer 의 `serialize` 함수가 **모든 객체 호출에 적용**. 단일 값에 `arrayFormat: 'repeat'` 은 의미 없지만(단일 값은 repeat 대상이 아님), 순수 URLSearchParams 버전에서 `null`/`undefined` 처리가 변경될 수 있음.
**How to avoid:** Pattern 5 Option B 의 serializer 에 `if (value === null || value === undefined) return;` + `if (value !== '') sp.append(...)` 명시 — 기존 기본 동작 재현.
**Warning signs:** 기존 페이지(`/documents/my`, `/admin/users`) 에서 필터 안 먹거나 뒤로가기 깨짐 → `paramsSerializer` 가 의심. 회귀 테스트 필수.

### Pitfall 4: React Router v7 `setSearchParams(prev => ...)` 동시 호출
**What goes wrong:** 동일 tick 에 여러 `setSearchParams` 호출 시 **마지막 것만 적용** — 예: debounce 콜백과 Clear 버튼이 동시 실행되면 누락.
**Why it happens:** React Router 콜백 setter 는 useState 큐잉 로직 **미지원** (Context7 문서 명시).
**How to avoid:** (1) debounce + Clear 버튼이 같은 파생 상태를 조작하지 않도록 UI 에서 분리. (2) 필요 시 `useState` 로 임시 집계 후 한 번만 `setSearchParams` 호출.
**Warning signs:** Clear 버튼 눌렀는데 필터 일부만 지워짐.

### Pitfall 5: `searchParams.getAll('status')` vs. `.get('status')`
**What goes wrong:** `.get('status')` 는 첫 값만 반환 → 복수 상태 필터가 항상 1 개만 적용.
**Why it happens:** `URLSearchParams.get` 과 `.getAll` 의 미묘한 API 차이.
**How to avoid:** 복수 파라미터는 반드시 `.getAll(key)` — `string[]` 반환.
**Warning signs:** URL 에 `?status=A&status=B` 있는데 체크박스는 하나만 선택된 상태로 렌더.

### Pitfall 6: `deleteByDocumentId` 호출 규약 위반
**What goes wrong:** 누군가 ApprovalService 에 "승인 완료 시 이력 정리" 같은 코드를 추가하면 REFERENCE 라인 접근자의 과거 기록 접근이 사라짐 → `EXISTS approval_line` 이 false → 검색 결과 누락.
**Why it happens:** 본 phase 의 SRCH-01 은 approval_line 영구 보존을 **암묵적 전제**. 이 전제가 깨지면 검색 결과가 silently 사라짐.
**How to avoid:** (1) `ApprovalLineRepository.deleteByDocumentId` 호출처를 감사 (현재 DocumentService 2곳, Finding 9.1). (2) Phase 30 테스트에 "SKIPPED 라인 접근자도 검색 가능" 케이스 포함 (Matrix test 의 B 타입).
**Warning signs:** 과거 결재 이력이 있는 사용자가 문서 검색에서 일부를 찾지 못함.

### Pitfall 7: `countDistinct` + `ORDER BY` + `GROUP BY`
**What goes wrong:** `count(distinct doc.id)` 와 `ORDER BY d.created_at` 을 동시에 같은 쿼리에 넣으면 MariaDB `ONLY_FULL_GROUP_BY` sql_mode 에서 SQL error.
**Why it happens:** 표준 SQL 의 group_by 규칙.
**How to avoid:** 현재 프로젝트 구조처럼 **count query 와 content query 분리** (D-D4). count 에는 orderBy 제거, content 에만 orderBy. QueryDSL 에서는 각 쿼리가 별개 체인이라 자연히 분리됨.
**Warning signs:** count query 실행 시 `Expression #N of SELECT list is not in GROUP BY clause` 에러.

### Pitfall 8: Keyword LIKE `%...%` 가 인덱스 미스
**What goes wrong:** `doc.title.likeIgnoreCase("%keyword%")` 는 **좌측 와일드카드** → `idx_title` (없지만) 사용 불가. Full-scan 이 되면 10K 에서 slow.
**Why it happens:** B-tree 인덱스는 좌측 접두사만 사용.
**How to avoid:** 권한 predicate + tab + status + dateFrom/To 필터가 **먼저** row 축소 — keyword LIKE 는 작은 row set 에 적용되어 문제없음 (D-D1). EXPLAIN 에서 `idx_drafter_status` 또는 `idx_submitted_at` 이 사용되는지 확인 — `Using index condition` + 적은 `rows`.
**Warning signs:** EXPLAIN 에서 `type=ALL` + `rows≈10000` → 권한 predicate 가 인덱스 안 타고 있다는 신호 → V20 migration 필요.

### Pitfall 9: `@RequestParam(required=false) List<String>` 빈 리스트 vs null
**What goes wrong:** Spring 은 파라미터 없으면 `null` 반환, `?status=` (빈 값) 이면 `[""]` (빈 문자열 포함한 리스트). `DocumentStatus.valueOf("")` → `IllegalArgumentException`.
**Why it happens:** Spring binding 의 미묘함.
**How to avoid:** Pattern 3 Option A 의 변환 로직 = `rawStatuses == null || rawStatuses.isEmpty()` 초기 체크 + 이후 각 요소 `isBlank()` 필터링:
```java
statuses = rawStatuses.stream()
    .filter(s -> s != null && !s.isBlank())
    .map(DocumentStatus::valueOf)
    .toList();
```

### Pitfall 10: `tab=all` 우회 시도
**What goes wrong:** USER 가 `?tab=all` 보내면 Controller 403 가드(D-A7) 가 첫 번째 방어. 하지만 Controller 가드 제거 시 쿼리 predicate (D-A2) 만으로 USER 의 권한 범위가 자동 좁혀짐 — **이중 방어가 안전.**
**Why it happens:** 경계 방어만 의지하면 내부 변경에 취약.
**How to avoid:** Controller L131-135 의 `AUTH_FORBIDDEN` 403 유지 + QueryDSL 권한 predicate 가 USER 의 `tab=all` 에서도 본인+approval_line 로 자동 좁힘. 두 방어 모두 유지.
**Warning signs:** USER 가 `tab=all` 요청 보냈을 때 403 이 아니라 200 (권한 predicate 만으로는 error 아님).

## Code Examples

### Example 1: 완성된 QueryDSL `searchDocuments` (핵심 변경)

```java
// Source: 현재 DocumentRepositoryCustomImpl.java L29-122 의 수정 가이드
// FSD FN-SEARCH-001 (docs/FSD_MiceSign_v1.0.md L1560-1576) 권한 predicate + DRAFT gate 주입

@Override
public Page<DocumentResponse> searchDocuments(
        DocumentSearchCondition condition, Long userId, String role,
        Long departmentId, Pageable pageable) {

    QDocument doc = QDocument.document;
    QUser drafter = QUser.user;  // 기존 alias
    QDepartment dept = QDepartment.department;
    QPosition pos = QPosition.position;
    QApprovalLine approvalLine = QApprovalLine.approvalLine;

    BooleanBuilder where = new BooleanBuilder();
    String tab = condition.tab() != null ? condition.tab().toLowerCase() : "my";

    // [1] Tab scope (기존)
    switch (tab) {
        case "my" -> where.and(doc.drafterId.eq(userId));
        case "department" -> where.and(drafter.departmentId.eq(departmentId));
        case "all" -> {
            if ("ADMIN".equals(role)) where.and(drafter.departmentId.eq(departmentId));
            // SUPER_ADMIN: no additional predicate
        }
        default -> where.and(doc.drafterId.eq(userId));
    }

    // [2] FSD 권한 predicate (신규, D-A1/A2/A3)
    if (!"SUPER_ADMIN".equals(role)) {
        BooleanExpression ownDoc = doc.drafterId.eq(userId);
        BooleanExpression approvalParticipant = JPAExpressions
            .selectOne().from(approvalLine)
            .where(approvalLine.document.id.eq(doc.id)
                   .and(approvalLine.approver.id.eq(userId)))
            .exists();
        BooleanExpression permissionBranch = ownDoc.or(approvalParticipant);
        if ("ADMIN".equals(role) && departmentId != null) {
            QUser u = new QUser("deptUser");
            permissionBranch = permissionBranch.or(doc.drafterId.in(
                JPAExpressions.select(u.id).from(u)
                    .where(u.departmentId.eq(departmentId))
            ));
        }
        where.and(permissionBranch);
    }

    // [3] DRAFT gate (신규, D-A4/A5/A6)
    if (!"my".equals(tab)) {
        where.and(doc.status.ne(DocumentStatus.DRAFT));
    }

    // [4] Keyword (기존, SRCH-02)
    if (condition.keyword() != null && !condition.keyword().isBlank()) {
        String escaped = escapeLikePattern(condition.keyword().trim());
        String kw = "%" + escaped + "%";
        where.and(doc.title.likeIgnoreCase(kw)
                .or(doc.docNumber.likeIgnoreCase(kw))
                .or(drafter.name.likeIgnoreCase(kw)));
    }

    // [5] Statuses (복수, D-B6)
    if (condition.statuses() != null && !condition.statuses().isEmpty()) {
        where.and(doc.status.in(condition.statuses()));
    }

    // [6] Template + dates (기존)
    if (condition.templateCode() != null && !condition.templateCode().isBlank()) {
        where.and(doc.templateCode.eq(condition.templateCode()));
    }
    if (condition.dateFrom() != null) {
        where.and(doc.submittedAt.goe(condition.dateFrom().atStartOfDay()));
    }
    if (condition.dateTo() != null) {
        where.and(doc.submittedAt.lt(condition.dateTo().plusDays(1).atStartOfDay()));
    }

    // [7] drafterId (신규, D-B7)
    if (condition.drafterId() != null) {
        where.and(doc.drafterId.eq(condition.drafterId()));
    }

    // [8] countDistinct (D-D3)
    Long total = queryFactory.select(doc.countDistinct())
            .from(doc)
            .join(doc.drafter, drafter)
            .join(drafter.department, dept)
            .leftJoin(drafter.position, pos)
            .where(where)
            .fetchOne();
    if (total == null) total = 0L;

    // [9] Content query (기존 projection 유지)
    List<DocumentResponse> content = queryFactory
            .select(Projections.constructor(DocumentResponse.class, /* ... */))
            .from(doc)
            .join(doc.drafter, drafter)
            .join(drafter.department, dept)
            .leftJoin(drafter.position, pos)
            .where(where)
            .orderBy(doc.createdAt.desc())
            .offset(pageable.getOffset())
            .limit(pageable.getPageSize())
            .fetch();

    return new PageImpl<>(content, pageable, total);
}
```

### Example 2: `DocumentSearchCondition` record 개편 (D-B4)

```java
// Before
public record DocumentSearchCondition(
    String keyword, String status, String templateCode,
    LocalDate dateFrom, LocalDate dateTo, String tab
) {}

// After
public record DocumentSearchCondition(
    String keyword,
    List<DocumentStatus> statuses,   // 단일 → List<Enum>
    String templateCode,
    LocalDate dateFrom,
    LocalDate dateTo,
    String tab,
    Long drafterId                    // 신규
) {
    // Compact constructor — 기본값 처리 (Claude's Discretion)
    public DocumentSearchCondition {
        if (statuses == null) statuses = Collections.emptyList();
    }
}
```

**영향:** `DocumentController` L66 (`/documents/my`), L137 (`/documents/search`) 양쪽의 생성자 호출 업데이트 필요. `DocumentService.getMyDocuments` 는 이미 `List<DocumentStatus>` 시그니처 (DocumentService.java L462).

### Example 3: React Router v7 DrafterCombo (자동완성)

```tsx
// Source: Context7 /remix-run/react-router + useSearchParams pattern
import { useState, useEffect } from 'react';
import { userApi } from '../../user/api/userApi';

interface DrafterComboProps {
  value: string | null;      // from URL searchParams
  onChange: (id: string | null, displayName?: string) => void;
}

export function DrafterCombo({ value, onChange }: DrafterComboProps) {
  const [query, setQuery] = useState('');
  const [candidates, setCandidates] = useState<UserSearchItem[]>([]);
  const [displayName, setDisplayName] = useState('');

  // Load display name when value changes from URL
  useEffect(() => {
    if (value && !displayName) {
      userApi.getById(Number(value)).then(r => setDisplayName(r.data.data.name));
    }
    if (!value) setDisplayName('');
  }, [value]);

  // Debounced query
  useEffect(() => {
    if (!query || query.length < 2) { setCandidates([]); return; }
    const t = setTimeout(() => {
      userApi.search(query, 20).then(r => setCandidates(r.data.data));
    }, 300);
    return () => clearTimeout(t);
  }, [query]);

  return (
    <div>
      <input
        value={value ? displayName : query}
        onChange={e => {
          if (value) onChange(null);  // clear selection on new input
          setQuery(e.target.value);
        }}
        placeholder="기안자 이름"
      />
      {candidates.length > 0 && (
        <ul>
          {candidates.map(u => (
            <li key={u.id} onClick={() => {
              onChange(String(u.id), u.name);
              setDisplayName(u.name);
              setQuery('');
              setCandidates([]);
            }}>
              {u.name} ({u.departmentName})
            </li>
          ))}
        </ul>
      )}
      {value && (
        <button onClick={() => { onChange(null); setDisplayName(''); }}>×</button>
      )}
    </div>
  );
}
```

### Example 4: 10K Seed CommandLineRunner

```java
// backend/src/main/java/com/micesign/seed/BenchSeedRunner.java
@Component
@Profile("seed")
public class BenchSeedRunner implements CommandLineRunner {
    private final DocumentRepository documentRepository;
    private final UserRepository userRepository;
    // ...

    @Override
    public void run(String... args) {
        // Create 100 users across 10 departments (reused from V2 seed)
        // Create 10,000 documents with mixed template/status/drafter distribution
        for (int i = 0; i < 10_000; i++) {
            Document d = new Document();
            d.setTemplateCode(pickTemplate(i));  // GENERAL 70%, EXPENSE 20%, LEAVE 10%
            d.setTitle("성능 테스트 문서 #" + i);
            d.setDrafterId(1L + (i % 100));      // 100 drafters round-robin
            d.setStatus(pickStatus(i));          // DRAFT 10%, SUBMITTED 60%, APPROVED 25%, REJECTED 5%
            d.setSubmittedAt(d.getStatus() != DRAFT ? randomDateLastYear() : null);
            documentRepository.save(d);
            if (i % 100 == 0) entityManager.flush(); entityManager.clear();  // batch
        }
    }
}

// Run: ./gradlew bootRun --args='--spring.profiles.active=seed'
```

### Example 5: Apache Bench 명령 (벤치)

```bash
# 50 concurrent users, 10K requests total, Authorization header from real token
ab -n 10000 -c 50 \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  "http://localhost:8080/api/v1/documents/search?tab=search&page=0&size=20&status=SUBMITTED"

# Expected output section: "95%" row < 1000ms for NFR-01 pass
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `@Query` 네이티브 SQL with `:role` 문자열 | QueryDSL `JPAExpressions` + Java if 분기 | QueryDSL 5.x 안정 | Type-safe, IDE 리팩토링 추적, 테스트 가능 |
| React Router v6 `useSearchParams` (mutable URLSearchParams 반환) | v7 `useSearchParams` (immutable 값 + 콜백 패턴) | React Router v7 (2025) | 콜백 `prev => new URLSearchParams(prev)` 가 관용구. 동시 호출 주의. [CITED: Context7 /remix-run/react-router] |
| axios 0.x `paramsSerializer: function` | axios 1.x `paramsSerializer: { serialize, indexes }` 객체 | axios 1.0 (2022-10) | 프로젝트 현재 1.14.0 — 객체 포맷만 사용. [CITED: Context7 /axios/axios] |
| Spring MVC `@RequestParam List<Enum>` → 500 on invalid | Spring 6.x 동일 + `MethodArgumentTypeMismatchException` 핸들러 권장 | Spring Framework 6 | 여전히 수동 핸들러 필요 — 자동 400 변환 없음. [CITED: Context7 /spring-projects/spring-boot] |

**Deprecated/outdated:**
- `qs` 라이브러리의 `arrayFormat: 'indices'` 기본값 — axios 1.x 에서는 brackets 기본. 명시적으로 `'repeat'` 지정 필요.
- React Router v5/v6 패턴 (`useHistory`, `useLocation` 로 수동 파싱) — v7 에서 `useSearchParams` 가 표준.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `approval_line` 행은 DRAFT 업데이트/삭제 시만 삭제되고 SUBMITTED 이후 영구 보존 | §9 Runtime State | [VERIFIED via grep — `deleteByDocumentId` 호출처는 DocumentService L188 (update, DRAFT 한정) + L245 (delete, DRAFT 한정)]. 향후 `ApprovalService` 변경 시 가정 재확인. |
| A2 | 10K 문서 + 50 user 에서 기존 인덱스로 95p ≤ 1초 달성 | §5 QueryDSL + D-D1 | [ASSUMED] — EXPLAIN + 실측 필요. 실패 시 V20 migration 추가 (D-D2). PR2 작업. |
| A3 | axios 1.x `paramsSerializer` 전역 변경이 기존 단일값 API 호환성 파괴 없음 | §Pattern 5 | [VERIFIED via grep — 프로젝트 내 배열 파라미터 사용 zero]. 새 API 추가 시 재확인. |
| A4 | Spring 6.x 의 `@RequestParam List<String>` 은 `?status=A&status=B` (repeat) 와 `?status=A,B` (CSV) 둘 다 자동 수용 | §3 Controller | [CITED: Spring Boot 문서 + Context7]. 다만 D-B1 은 repeat format locked. |
| A5 | React Router v7.13.2 의 `useSearchParams` API 가 Context7 문서의 7.x 최신과 동일 | §Pattern 4 | [VERIFIED: 프로젝트 package.json "react-router": "^7.13.2" + Context7 /remix-run/react-router (v7.8.2 기준 동일 API)]. |
| A6 | `count(distinct doc.id)` 와 `doc.countDistinct()` QueryDSL API 동일 | §Pattern 6 | [CITED: QueryDSL 5.x API]. 필요 시 generated SQL 확인. |
| A7 | `/api/v1/admin/users` 는 `@PreAuthorize` ADMIN 전용이라 일반 USER 의 drafterId 콤보박스에 재사용 불가 | §UserController 신설 | [VERIFIED: UserManagementController.java L21 `@PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN')")`]. USER 에게도 전체 사용자 이름 자동완성은 허용되어야 함 (다른 부서원에게도 결재 요청 가능). |

## Open Questions

### Q1: `GET /users/search` 의 가시성 정책
**What we know:** FSD 에 명시 없음. D-B2 는 "일반 정책 따름" 으로 모호.
**What's unclear:** USER 가 다른 부서원도 검색 가능해야 하는가? (APR-01 결재선 구성에서는 전체 조직 가능)
**Recommendation:** **전체 ACTIVE 사용자 검색 허용** — 결재선 구성(APR-01)과 일관. 단, 응답 DTO 에서 민감 정보(email, phone, role) 배제하고 `{id, name, departmentName}` 최소만 노출. Planner 결정 사항.

### Q2: `@RequestParam List<String> statuses` vs. `status` 파라미터 이름
**What we know:** D-B1 URL 예시 = `?status=A&status=B` (단수형). D-B4 는 내부 필드명 `statuses` (복수형).
**What's unclear:** Controller `@RequestParam` name 을 `status` 로 하고 record 필드를 `statuses` 로 하는 비대칭 vs. 양쪽 일관 `statuses` (URL 은 `?statuses=A&statuses=B`).
**Recommendation:** `@RequestParam(name = "status") List<String> rawStatuses` — URL 은 단수 (공유성/관례), 내부는 복수 (자바 관례). Swagger/OpenAPI 관례도 단수 파라미터명 선호.

### Q3: 복수 상태 UI 컴포넌트 선택
**What we know:** Claude's Discretion. `STATUS_OPTIONS` 상수 재사용 locked.
**What's unclear:** 체크박스 리스트 vs. pills (토글 버튼) vs. multi-select dropdown.
**Recommendation:** **pills (토글 버튼 그룹)** — 모바일 친화 + 즉시 시각 피드백 + DocumentListPage 의 기존 버튼 스타일 패턴과 일관. 5개 상태면 가로 배치 적절.

### Q4: V20 migration 필요성
**What we know:** D-D1/D2 — 실측 후 결정.
**What's unclear:** EXPLAIN 이 어떤 인덱스를 실제로 탈지는 MariaDB optimizer 결정.
**Recommendation:** PR1 완료 후 10K seed 상태에서 EXPLAIN 측정 — `idx_approver_status` 가 `approval_line` EXISTS 서브쿼리에서 `ref` 타입으로 사용되면 OK. `ALL`(full-scan) 이면 `idx_approver_doc (approver_id, document_id)` 추가 (D-D2 경우 2).

### Q5: 벤치 도구 선택
**What we know:** Claude's Discretion.
**What's unclear:** `ab` / `wrk` / JMeter / Spring `ExecutorService`.
**Recommendation:** **`ab` (Apache Bench)** — macOS/Linux 기본 설치, CLI 한 줄, 95p 자동 계산, 프로젝트 운영체제(Linux) 에서 실행 가능. JWT 토큰은 테스트 시작 전 수동 발급 후 `-H` 헤더로 주입. 대안: Spring 내부 `MockMvc` + `CompletableFuture.allOf()` — 실 HTTP 경유 안 함으로 순수 쿼리 성능만 측정.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Java 17 | 백엔드 빌드 | ✓ | (프로젝트 설정) | — |
| Gradle 8.x | 백엔드 빌드 | ✓ | (wrapper) | — |
| MariaDB 10.11 | DB | ✓ (dev 환경 가정) | 10.11 LTS | docker-compose 으로 로컬 기동 |
| Node.js 20.x | 프론트 빌드 | ✓ (추정) | package.json 기준 | — |
| Apache Bench (`ab`) | 벤치 스크립트 | 운영자 OS 에 따라 다름 | — | `wrk` 또는 MockMvc 기반 병렬 테스트 |
| `qs` npm 패키지 | axios paramsSerializer (Option A) | ✗ (미설치) | — | Pattern 5 Option B (URLSearchParams 순수) |

**Missing dependencies with fallback:**
- `ab`: 운영 환경 없으면 `wrk` 또는 Spring `MockMvc` + `ExecutorService` 기반 병렬 테스트.
- `qs`: 추가 의존성 회피 시 `URLSearchParams` 기반 serializer.

**Missing dependencies with no fallback:** 없음 — 모든 핵심 도구가 프로젝트에 이미 존재.

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Backend framework | JUnit 5 + Spring Boot Test + MockMvc |
| Frontend framework | Vitest + @testing-library/react |
| Backend config | `@SpringBootTest + @AutoConfigureMockMvc + @ActiveProfiles("test")` + `TestTokenHelper` |
| Frontend config | `vitest.config.*` (프로젝트 존재) |
| Quick run command | `./gradlew test --tests 'com.micesign.document.DocumentSearchTest'` |
| Full suite command | `./gradlew test && cd frontend && npm test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SRCH-01 | 7 유형 사용자 × 4 상태 = 28 케이스 권한 매트릭스 (A 본인, B APPROVE 승인자, C REFERENCE 참조자, D 무관, E 같은 부서 ADMIN, F 다른 부서 ADMIN, G SUPER_ADMIN) | 통합 | `./gradlew test --tests 'com.micesign.document.DocumentSearchPermissionMatrixTest'` | ❌ Wave 0 |
| SRCH-01a | `tab=department` / `tab=all` 에서 `status != DRAFT` | 통합 | `./gradlew test --tests 'DocumentSearchDraftGateTest'` | ❌ Wave 0 |
| SRCH-01b | `tab=my` 에서 본인 DRAFT 노출 | 통합 | 동일 | ❌ Wave 0 |
| SRCH-02 | 키워드 LIKE (title/docNumber/drafter.name) 기존 유지 | 통합 | `./gradlew test --tests 'DocumentSearchKeywordTest'` | ❌ Wave 0 |
| SRCH-03 | 복수 상태 `?status=A&status=B` + 단일 status 역호환 | 통합 | `./gradlew test --tests 'DocumentSearchStatusFilterTest'` | ❌ Wave 0 |
| SRCH-03a | 잘못된 enum 값 → 400 VALIDATION_ERROR (500 아님) | 통합 | `./gradlew test --tests 'DocumentSearchInvalidEnumTest'` | ❌ Wave 0 |
| SRCH-04 | drafterId 필터 + `GET /users/search` 자동완성 | 통합 | `./gradlew test --tests 'UserSearchControllerTest'` | ❌ Wave 0 |
| SRCH-05 | URL query sync + 새로고침 재현 | 프론트 컴포넌트 (Vitest + jsdom) | `npm test -- DocumentListPage` | ❌ Wave 0 |
| SRCH-05a | 빈 값 URL 생략 | 프론트 유닛 | 동일 | ❌ Wave 0 |
| SRCH-05b | debounced keyword → `replace: true` | 프론트 유닛 | 동일 | ❌ Wave 0 |
| SRCH-06 / NFR-01 | 10K · 50 user · 95p ≤ 1초 | 수동 벤치 (`ab`) + EXPLAIN 기록 | `ab -n 10000 -c 50 ...` + PR description 에 결과 | 🙋 manual |
| NFR-01 invariant | `count(distinct)` = 실제 접근 가능 문서 수 | 통합 | 권한 매트릭스 테스트 내 `totalElements` assertion | ❌ Wave 0 |

### Sampling Rate

- **Per task commit:** `./gradlew test --tests 'com.micesign.document.DocumentSearch*'` (백엔드 해당 테스트만, < 30 초)
- **Per wave merge:** `./gradlew test` (백엔드 전체) + `npm test` (프론트 전체) — 회귀 검증
- **Phase gate:** 10K 벤치 실측 + EXPLAIN 출력 + PR description 첨부 → `/gsd-verify-work`

### Wave 0 Gaps

- [ ] `backend/src/test/java/com/micesign/document/DocumentSearchPermissionMatrixTest.java` — 28 케이스 권한 매트릭스 (SRCH-01)
- [ ] `backend/src/test/java/com/micesign/document/DocumentSearchDraftGateTest.java` — tab × DRAFT 조합 (SRCH-01)
- [ ] `backend/src/test/java/com/micesign/document/DocumentSearchKeywordTest.java` — 키워드 OR + escapeLikePattern 회귀 (SRCH-02)
- [ ] `backend/src/test/java/com/micesign/document/DocumentSearchStatusFilterTest.java` — 복수 상태 + 단일 호환 (SRCH-03)
- [ ] `backend/src/test/java/com/micesign/document/DocumentSearchInvalidEnumTest.java` — 400 VALIDATION_ERROR (SRCH-03)
- [ ] `backend/src/test/java/com/micesign/user/UserSearchControllerTest.java` — `/users/search` 가시성 + 응답 shape (SRCH-04)
- [ ] `frontend/src/features/document/pages/__tests__/DocumentListPage.test.tsx` — useSearchParams URL sync (SRCH-05)
- [ ] `frontend/src/features/document/components/__tests__/DrafterCombo.test.tsx` — debounced 자동완성 (SRCH-04)

### Nyquist 8-axis Invariants

| Invariant | 관찰 가능 포인트 | 샘플링 주기 |
|-----------|----------------|-----------|
| **I1 권한 predicate 준수** | 사용자 X 가 검색 결과에 포함한 문서는 `getDocument(id)` 도 200 (403 아님) | 매 request (프로덕션) / 매 테스트 케이스 (CI) |
| **I2 DRAFT 격리** | `tab != 'my'` 결과의 모든 row.status != 'DRAFT' | 매 검색 request |
| **I3 totalElements 정확성** | 사용자 X 의 결과 페이지들 union 크기 = totalElements | 페이지 전환마다 |
| **I4 approval_line 보존** | 특정 document 의 approval_line 행 수는 submit 이후 감소하지 않음 | 모든 approval state 전이 후 |
| **I5 URL ↔ 필터 대칭** | URL query 로 접근한 페이지의 필터 UI 상태 = URL 이 encode 한 값 | 페이지 로드마다 / 뒤로가기 |
| **I6 enum 안전성** | 잘못된 status 값은 항상 400 (500 아님) | 각 Controller 테스트 |
| **I7 역호환성** | 구 URL `?status=SUBMITTED` (단수) 는 새 백엔드에서 동작 | 배포 후 첫 헬스체크 |
| **I8 성능 SLI** | `/documents/search` 95p ≤ 1000ms (10K seed) | Phase 33 E2E 또는 운영 APM |

### 권한 매트릭스 Fixture 구조 (핵심 산출물)

```
fixture setup:
  - Dept 1: Alice(USER id=A), Admin1(ADMIN id=E)
  - Dept 2: Bob(USER id=B), Charlie(USER id=C), Admin2(ADMIN id=F)
  - Dept 3: David(USER id=D), SuperAdmin(id=G)

test documents (drafter=A, all 4 statuses):
  - doc_draft:     status=DRAFT,     drafter=A
  - doc_submitted: status=SUBMITTED, drafter=A, approval_line=[APPROVE:B, AGREE:C, REFERENCE:D]
  - doc_approved:  status=APPROVED,  drafter=A, same approval_line (all processed)
  - doc_rejected:  status=REJECTED,  drafter=A, same approval_line (B rejected)

matrix:
  A (self):         [draft:T(my)/F(search), submitted:T, approved:T, rejected:T]
  B (APPROVE approver):   [draft:F, submitted:T, approved:T, rejected:T]
  C (AGREE approver):     [draft:F, submitted:T, approved:T, rejected:T]
  D (REFERENCE):          [draft:F, submitted:T, approved:T, rejected:T]
  E (same dept ADMIN, dept=1 as Alice): [draft:F(search), submitted:T, approved:T, rejected:T]
  F (other dept ADMIN, dept=2):         [draft:F, submitted:F, approved:F, rejected:F] — EXCEPT
                                         F 가 승인자·참조자로 등록된 경우는 T (테스트 케이스 분리)
  G (SUPER_ADMIN):        [draft:F(search)/T(my if drafted), submitted:T, approved:T, rejected:T]
```

`tab=my` 에서만 A 가 자신의 DRAFT 를 볼 수 있음 (기타 조합 DRAFT=False).

**Fixture style:** `@SpringBootTest + @AutoConfigureMockMvc + TestTokenHelper` (프로젝트 관용구, `@DataJpaTest` 미사용). `JdbcTemplate` 으로 `@BeforeEach` 에서 DELETE 후 재삽입.

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | Spring Security + JWT (기존) — `@AuthenticationPrincipal CustomUserDetails` |
| V3 Session Management | yes | Access Token in memory + Refresh Token in HttpOnly cookie (기존) |
| V4 Access Control | **yes (CORE)** | FSD 4-브랜치 권한 predicate — **SRCH-01 의 본질은 ASVS V4 Broken Access Control 수정** |
| V5 Input Validation | yes | `@RequestParam` 바인딩 + enum valueOf + 400 VALIDATION_ERROR |
| V6 Cryptography | no | 신규 암호 처리 없음 |
| V7 Error Handling | yes | `MethodArgumentTypeMismatchException` → 500 유출 방지 |
| V11 Logic | yes | DRAFT gate = 비즈니스 로직 보안 |

### Known Threat Patterns for Spring Boot + React SPA

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| BOLA/IDOR (Broken Object-Level Authorization) = 현재 SRCH-01 취약점 | Elevation of Privilege | QueryDSL 권한 predicate (본 phase 의 핵심 수정) |
| Enum injection / 파라미터 조작으로 500 유출 | Information Disclosure | GlobalExceptionHandler 에 `MethodArgumentTypeMismatchException` 핸들러 |
| tab=all 우회 시도 | Elevation of Privilege | Controller 403 가드 + 쿼리 predicate 이중 방어 (D-A7) |
| SQL injection via keyword | Tampering | `escapeLikePattern` (기존) + QueryDSL parameterized |
| Mass assignment (`@RequestBody`) | Tampering | 본 phase 는 GET 만 — 해당 없음 |
| 권한 bypass via stale approval_line | Elevation of Privilege | approval_line 영구 보존 (Finding 9.1) |

## Sources

### Primary (HIGH confidence)

- **Context7 `/openfeign/querydsl`** — JPA Subqueries (`JPAExpressions.select...exists()`, `IN` subquery), BooleanBuilder, pagination
- **Context7 `/remix-run/react-router`** — `useSearchParams` v7, `setSearchParams` callback pattern, `replace: true`
- **Context7 `/axios/axios`** — `paramsSerializer: { serialize, indexes }` (axios 1.x), `qs.stringify` 권장 패턴
- **Context7 `/spring-projects/spring-boot`** — `@RestControllerAdvice` + `MethodArgumentNotValidException` / `MethodArgumentTypeMismatchException`
- **docs/FSD_MiceSign_v1.0.md L1535-1576** — FN-SEARCH-001 권한 predicate 원문 SQL
- **프로젝트 소스 전수 조사** — DocumentRepositoryCustomImpl, DocumentService.getDocument (L204-223 의 Java 4-브랜치 참조 구현), GlobalExceptionHandler, apiClient, DocumentListPage, UserManagementController, ApprovalLineRepository, TestTokenHelper, V1__create_schema.sql

### Secondary (MEDIUM confidence)

- **React Router v7.13.2 릴리스** — 프로젝트 `package.json` 에서 확인, Context7 의 v7 문서와 API 호환성 검증 (v7.8.2 기준 동일)
- **MariaDB 10.11 인덱스 사용 패턴** — 기존 V1 migration 의 인덱스 정의 + 일반적 B-tree 동작

### Tertiary (LOW confidence)

- **95p ≤ 1초 달성 가능성** — 10K/50user 에서 기존 인덱스 충분 여부는 실측 필요 (A2)
- **V20 migration 필요 여부** — EXPLAIN 출력에 좌우

## Metadata

**Confidence breakdown:**
- 권한 predicate QueryDSL 패턴: **HIGH** — `DocumentService.getDocument` L204-223 에 4-브랜치가 Java 로 이미 구현되어 있어 QueryDSL 번역은 기계적. Context7 /openfeign/querydsl 에서 서브쿼리 API 검증.
- axios paramsSerializer 전역 변경 호환성: **HIGH** — grep 으로 전 프로젝트 배열 파라미터 사용 zero 확인.
- `MethodArgumentTypeMismatchException` 500 유출 취약점: **HIGH** — `GlobalExceptionHandler.java` 직접 확인, 핸들러 부재 확인.
- approval_line 영구 보존 가정: **HIGH** — `deleteByDocumentId` 호출처 grep 으로 2 곳 (둘 다 DRAFT 전제) 확인.
- React Router v7 `useSearchParams` API: **HIGH** — Context7 v7 문서 + 프로젝트 v7.13.2.
- 10K/50user 성능 달성: **MEDIUM-LOW** — 실측 필요 (A2). 권장: Phase 30 내 벤치 실행 후 결정 (D-D5).
- 권한 매트릭스 테스트 28 케이스 fixture: **MEDIUM** — 원칙은 명확하나 실제 구현 시 edge case 발견 가능 (F ADMIN 이 승인자로도 등록된 경우 등).

**Research date:** 2026-04-23
**Valid until:** 2026-05-23 (30 days — 핵심 API 안정, React Router/axios/QueryDSL 모두 성숙)

## RESEARCH COMPLETE

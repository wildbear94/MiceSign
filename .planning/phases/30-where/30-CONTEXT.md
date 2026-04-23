# Phase 30: 검색 권한 WHERE 절 보안 수정 + 필터 확장 - Context

**Gathered:** 2026-04-23
**Status:** Ready for planning

<domain>
## Phase Boundary

`DocumentRepositoryCustomImpl.searchDocuments()` 에 **FSD FN-SEARCH-001 의 4-브랜치 권한 predicate**(본인 기안 OR `EXISTS approval_line` OR `ADMIN AND 부서 일치` OR `SUPER_ADMIN`) 와 **`status != DRAFT` 강제**(tab=my 제외) 를 주입해 **운영 중 보안 사고(SRCH-01)** 를 해소하고, `drafterId` 드롭다운 · `statuses` 복수 선택 · 키워드·양식·기간 기존 필터를 **URL query string 에 동기화된 오프셋 페이지네이션**(페이지 크기 20, `countDistinct`) 으로 완성한다.

**Retrofit 마일스톤** — 신규 백엔드 의존성 zero, MariaDB FULLTEXT/ngram/ES 배제(LIKE + 기존 인덱스로 1초 NFR 충족), 프론트 필터 UI 70% 이미 완성(`drafterId` 콤보박스만 신규).

**Requirements (locked via ROADMAP):** SRCH-01, SRCH-02, SRCH-03, SRCH-04, SRCH-05, SRCH-06, NFR-01

**Success Criteria (from ROADMAP):**
1. 사용자 A 가 기안한 SUBMITTED 문서의 approval_line 에 승인자로 등록된 사용자 B 가 `/api/v1/documents/search` 를 호출하면 결과에 포함되고, 무관한 사용자 C 는 제외된다 (FSD FN-SEARCH-001 권한 predicate 통과)
2. `tab=department` / `tab=all` 결과에서는 `status != DRAFT` 가 보장되며, `tab=my` 에서만 본인 DRAFT 가 노출된다 (타인 DRAFT 노출 zero)
3. 키워드 + 상태(복수) + 양식(단일) + 기간 + 기안자 조합 검색 + URL query string 동기화로 링크 공유 가능
4. 10K 문서 seed + 50 동시 사용자 부하에서 95p ≤ 1초 (EXPLAIN 기반 인덱스 사용 확인, `countDistinct` 로 페이지 총개수 정확)
5. 페이지 크기 20 의 오프셋 페이지네이션, `totalElements` 가 실제 접근 가능 문서 수와 일치 (JOIN inflate 없음)

</domain>

<decisions>
## Implementation Decisions

### A. 권한 WHERE 절 + DRAFT 정책 (SRCH-01 보안 수정)

- **D-A1:** `tab` 스코프와 FSD 권한 predicate 는 **병행 AND** — tab(my/department/all) 은 기존 그대로 유지하고, FSD 권한 predicate 4-브랜치(본인 OR `EXISTS approval_line` OR `ADMIN AND 부서 일치` OR `SUPER_ADMIN`) 를 **항상 AND** 로 추가. 예: `tab=all & role=USER` 요청이 들어와도 권한 predicate 가 USER 를 본인+approval_line 로 자동 좁힘. 단일 SoT, 버그 표면 최소.
- **D-A2:** 권한 predicate 는 **QueryDSL 빌더 내부에서 role 기반 분기** — `SUPER_ADMIN` 이면 권한 predicate 자체를 스킵(전체 조회 허용), `ADMIN` 이면 "본인 OR EXISTS approval_line OR 본인 부서원의 문서", `USER` 이면 "본인 OR EXISTS approval_line". 한 곳에서 모든 권한 로직 일원화. Controller 의 `tab=all` 403 검사는 API 경계 가드로 유지.
- **D-A3:** `EXISTS approval_line` 서브쿼리 조건은 **FSD 원문 그대로** = `al.document_id = d.id AND al.approver_id = :currentUserId` — `line_type` / `status` 제한 없음. APPROVE/AGREE/REFERENCE 모든 타입 포함, PENDING/APPROVED/REJECTED/SKIPPED 모든 상태 포함. 참조자도 검색 가능해야 하며 이미 SKIPPED 된 라인도 과거 기록 열람 권한 보존.
- **D-A4:** **`tab=my` 에서만 본인 DRAFT 노출** (FSD 원문) — `tab=department`, `tab=all` 에서는 ADMIN·SUPER_ADMIN 이라도 본인 DRAFT 제외. 본인 DRAFT 를 보려면 tab=my 로 전환해야 함. 가장 엄격 · 일관된 정책.
- **D-A5:** `status != DRAFT` 강제는 **QueryDSL 빌더 내부** — `DocumentRepositoryCustomImpl.searchDocuments` 안에서 `if (!"my".equals(tab)) where.and(doc.status.ne(DocumentStatus.DRAFT));`. 리포지터리를 호출하는 모든 경로(현재 `/documents/search`, 향후 관리자 페이지·배치) 가 동일 보호. 단일 SoT.
- **D-A6:** `tab=my` 는 권한 predicate 없이 `drafter_id = currentUserId` 만으로 충분 — 본인이 기안한 DRAFT 도 조회 가능해야 하므로 `status != DRAFT` 강제 면제. Controller 의 기존 `/documents/my` 경로(`DocumentService.getMyDocuments`) 는 영향 범위 **밖** (리포지터리 다른 메서드 사용).
- **D-A7:** `tab=all` Controller 403 가드 유지 — SUPER_ADMIN / ADMIN 만 접근 가능. USER 가 `tab=all` 호출 시 쿼리 빌더 내부 권한 predicate 만으로도 자동으로 본인+approval_line 로 좁혀지지만, API 경계에서 명시 거부가 더 안전(Pitfall 방지).

### B. 필터 확장 + 복수 상태 API 계약

- **D-B1:** `status` 복수 선택은 **반복 쿼리 파라미터** = `?status=SUBMITTED&status=APPROVED` — Spring `@RequestParam List<String> statuses` 로 매핑. axios 는 `paramsSerializer` 에서 `qs.stringify(params, { arrayFormat: 'repeat' })` 또는 `indices: false` 로 자동 직렬화 (프로젝트 apiClient 전체 정책 영향 → planner 확인).
- **D-B2:** `drafterId` 는 **검색 가능한 콤보박스** — `GET /users/search?q={이름}&size=20` 엔드포인트 신설(없을 시) + 300ms debounce 자동완성. 가시성은 일반 정책 따름(SUPER_ADMIN 전체, ADMIN·USER 는 본인 부서). `drafterId` 선택 시 API 파라미터 = `?drafterId={id}`.
- **D-B3:** **departmentId 필터는 이번 phase 에서 제외** — ROADMAP Success Criteria 명시 목록(상태/양식/기간/기안자) 에 없음. FSD 엔 있지만 Phase 30 스코프 준수. Deferred Ideas 에 기록, Phase 33 또는 v1.3 에서 재검토.
- **D-B4:** `DocumentSearchCondition` record 필드 개편:
  - `String status` → **`List<DocumentStatus> statuses`** (enum 기반 타입 안전성 + `Collections.emptyList()` 기본값)
  - **`Long drafterId`** 추가 (nullable)
  - 기존 `keyword`, `templateCode`, `dateFrom`, `dateTo`, `tab` 필드 유지
- **D-B5:** Controller `searchDocuments` 의 `@RequestParam` 시그니처 개편:
  - `@RequestParam(required = false) List<String> status` → `DocumentStatus.valueOf` 로 enum 변환 (잘못된 값은 400 `VALIDATION_ERROR`)
  - `@RequestParam(required = false) Long drafterId` 추가
  - 기존 파라미터 시그니처 유지
- **D-B6:** 쿼리 빌더의 `statuses` 필터 처리 = `if (!statuses.isEmpty()) where.and(doc.status.in(statuses));` — 단일/복수 값 모두 자연스럽게 처리.
- **D-B7:** `drafterId` 필터는 `where.and(doc.drafterId.eq(drafterId))` 단순 적용 — 권한 predicate 가 이미 가시성 제한하므로 추가 검사 불필요. 무관한 drafter ID 를 보냈을 때는 그냥 결과 0건.

### C. URL query sync + 페이지네이션

- **D-C1:** **React Router `useSearchParams` 가 프론트 단일 SoT** — 기존 `useState` 제거, 모든 필터 값을 `searchParams.get('keyword')` 등으로 직접 파싱. `useMemo` 로 `searchParams` → `DocumentSearchParams` 파생. 두 SoT 동기화 버그 방지.
- **D-C2:** URL 반영 범위 = **모든 필터 + page + tab** — keyword, statuses(`getAll('status')`), templateCode, dateFrom, dateTo, drafterId, page, tab 전부 URL query. 새로고침/링크 공유 시 완전 재현.
- **D-C3:** keyword 는 **300ms debounce 후 URL 반영** — 타자 중 history thrashing 방지. `setSearchParams` 호출을 `replace: true` 로 해서 브라우저 history 오염 최소화.
- **D-C4:** **빈 값 생략** — `keyword=''`, `statuses=[]`, `date=''`, `page=0`, `tab='my'`(default) 이면 URL query 에서 제거. URL 짧고 공유 시 깔끔.
- **D-C5:** **tab 도 URL query 로 매핑** — 프론트 UI tab 2 종(`my` / `search`) → URL `?tab=my` (기본, 생략) / `?tab=search`. 백엔드 매핑은 프론트 `tab=my` → 백엔드 `tab=my`, 프론트 `tab=search` → 백엔드 `tab=all` (권한 predicate 가 가시성 처리, ADMIN 이면 부서 확장 자동 적용).
- **D-C6:** 기존 `useMyDocuments` + `useSearchDocuments` **두 훅 분리 유지** — tab 전환 시 다른 엔드포인트 호출 (`/documents/my` vs `/documents/search`). `isSearchActive = tab === 'search'` 로 분기. 통합은 스코프 외.
- **D-C7:** 페이지 크기는 **20 고정** — Success Criteria 5 에 명시. 사용자 조절 UI 는 Deferred Ideas.
- **D-C8:** 필터 변경 시 page=0 reset 정책 유지 — `setSearchParams` 로 page 자동 0 으로 초기화 (기존 `setPage(0)` 로직을 searchParams 업데이트 헬퍼로 이동).
- **D-C9:** nuqs 같은 외부 라이브러리 도입하지 않음 — React Router 기본 `useSearchParams` 로 충분. 프로젝트 의존성 최소화 원칙 유지.

### D. 성능 · 인덱스 · count · 롤아웃

- **D-D1:** **기존 인덱스로 먼저 실측** — `idx_drafter_status (drafter_id, status)`, `idx_status`, `idx_template_code`, `idx_submitted_at`, approval_line `idx_approver_status (approver_id, status)`, `idx_document_step (document_id, step_order)` 이 FSD predicate + 복합 필터 의 대부분을 cover. 10K seed + EXPLAIN + 간단 병렬 스크립트 통과하면 V20 migration 불필요(YAGNI).
- **D-D2:** EXPLAIN 결과 필요 시에만 **V20 migration 보강** — 경우 1: `idx_status_submitted (status, submitted_at DESC)` — 상태+기간 정렬 결합 쿼리에 유리. 경우 2: approval_line 검색이 full scan 이면 `idx_approver_doc (approver_id, document_id)`. 실측 후 결정.
- **D-D3:** **`count(distinct doc.id)`** 사용 — ROADMAP Success Criteria 4 명시. `approval_line EXISTS` 는 서브쿼리라 inflate 없지만 `drafter JOIN` · `department JOIN` · `position LEFT JOIN` 이 1:1 이어도 Projection 기반 JPA 에서 드물게 중복 발생 가능 → 보수적 방어.
- **D-D4:** **count query 와 content query 분리 유지** — 현재 코드 패턴 유지(두 번 쿼리). count 에는 orderBy/select projection 제외해서 최적화. content query 만 `Projections.constructor(...)` 유지.
- **D-D5:** **Phase 30 내에 간단 벤치** 실행 — `V20_seed_benchmark_data.sql` 같은 수동 seed 스크립트 또는 Spring Boot CommandLineRunner 로 1K → 10K 문서 + 50 유저 생성 + `ab` 또는 간단 `ExecutorService` 병렬 스크립트. 95p 계측 데이터를 CONTEXT.md 가 아니라 PR 설명에 첨부. Phase 33 E2E 는 운영 환경 최종 확인.
- **D-D6:** **PR 2 개로 분할** (ROADMAP "SRCH-01 첫 PR 로 조기 착수" 원칙):
  - **PR1 (hotfix):** 권한 predicate + DRAFT gate + `DocumentSearchCondition` 필드 개편(`statuses`/`drafterId` 스키마만) + Controller 시그니처 + 권한 매트릭스 통합 테스트. 프론트 영향 최소(기존 status 단일 값은 `statuses=[value]` 로 서버가 자동 호환 처리, 또는 프론트 영향 없이 배포).
  - **PR2 (feature):** `drafterId` 콤보박스 UI + URL query sync 전환 + 복수 상태 UI(체크박스 pills) + `/users/search` 엔드포인트 (없으면) + 벤치 스크립트 + 10K seed.
- **D-D7:** `tab=my` 엔드포인트(`/documents/my` → `DocumentService.getMyDocuments`) 는 **Phase 30 범위 밖** — 기존 `DocumentRepository.findByDrafterId...` 메서드 사용, `searchDocuments` 와 다른 경로. Regression 체크 항목으로만 유지.
- **D-D8:** 기존 keyword 검색 동작(`title.likeIgnoreCase OR docNumber.likeIgnoreCase OR drafter.name.likeIgnoreCase`) 변경 금지 — SRCH-02 는 기존 로직 재사용. `escapeLikePattern` 함수 그대로.

### Claude's Discretion

- `DocumentSearchCondition` record 의 `List<DocumentStatus>` 기본값 처리(Controller default value, null-check) 의 정확한 문법 — planner 결정.
- `GET /users/search` 엔드포인트의 정확한 시그니처 · DTO · 기존 UserController 확장 여부 — planner 가 기존 endpoint 매핑 확인 후 결정.
- 프론트 복수 상태 선택 UI 의 구체 컴포넌트 스타일(체크박스 리스트 vs pills vs multi-select dropdown) — UI 구현 단계에서 결정. 기존 `STATUS_OPTIONS` 배열 재사용.
- V20 migration 필요 여부와 내용 — EXPLAIN 결과 기반. 불필요하면 migration 자체 생략.
- 벤치 스크립트의 구체 도구(`ab` vs `wrk` vs Spring Boot 테스트 내 `ExecutorService`) — planner 결정. 결과는 PR description 에 첨부.
- 10K seed 스크립트의 구체 구현(SQL INSERT vs Flyway migration vs CommandLineRunner) — `flyway:migrate` 의존성 피하려면 일회성 스크립트 선호.
- 권한 매트릭스 통합 테스트의 JPA fixture 스타일(`@DataJpaTest` vs `@SpringBootTest`) — 기존 Phase 29 테스트 패턴 따름.
- axios `paramsSerializer` 변경이 전역에 미치는 영향 평가와 기존 API 호환성 점검 — planner 의 responsibility.

### Folded Todos

없음 — 현재 Pending Todos "None yet".

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### 프로젝트 스펙 (필수)
- `docs/FSD_MiceSign_v1.0.md` §FN-SEARCH-001 (L1535-1576) — **권한 predicate 원문** (핵심, 절대 필독)
- `docs/PRD_MiceSign_v2.0.md` — 제품 요구사항, DB schema DDL
- `.planning/REQUIREMENTS.md` §v1.2/SRCH/NFR — SRCH-01~06, NFR-01 locked
- `.planning/ROADMAP.md` §Phase 30 — Success Criteria 5 항 locked
- `.planning/PROJECT.md` — core value, constraints, stack

### 수정 대상 (Phase 30 작업 범위)
- `backend/src/main/java/com/micesign/repository/DocumentRepositoryCustomImpl.java` — **핵심 수정 대상** (권한 predicate + DRAFT gate + statuses in + drafterId)
- `backend/src/main/java/com/micesign/repository/DocumentRepositoryCustom.java` — 인터페이스 시그니처 변경 가능성
- `backend/src/main/java/com/micesign/dto/document/DocumentSearchCondition.java` — record 필드 개편 (D-B4)
- `backend/src/main/java/com/micesign/controller/DocumentController.java` L116-144 — `@RequestParam` 시그니처 개편 (D-B5)
- `backend/src/main/java/com/micesign/service/DocumentService.java` — `searchDocuments` 시그니처 전파
- `frontend/src/features/document/pages/DocumentListPage.tsx` — `useState` → `useSearchParams` 전환
- `frontend/src/features/document/types/document.ts` §`DocumentSearchParams` — `statuses?: string[]`, `drafterId?: number` 추가
- `frontend/src/features/document/api/documentApi.ts` — `searchDocuments` params 직렬화
- `frontend/src/features/document/hooks/useDocuments.ts` — 쿼리 키 갱신

### 참조 지점 (수정 금지)
- `backend/src/main/java/com/micesign/domain/Document.java` — 엔티티 정의
- `backend/src/main/java/com/micesign/domain/ApprovalLine.java` — approval_line 엔티티
- `backend/src/main/java/com/micesign/domain/enums/DocumentStatus.java` — DRAFT/SUBMITTED/APPROVED/REJECTED/WITHDRAWN enum
- `backend/src/main/java/com/micesign/domain/enums/ApprovalLineType.java` — APPROVE/AGREE/REFERENCE
- `backend/src/main/java/com/micesign/domain/enums/UserRole.java` — SUPER_ADMIN/ADMIN/USER

### 스키마·마이그레이션
- `backend/src/main/resources/db/migration/V1__create_schema.sql` L96-115 — `document` 테이블 + 기존 인덱스 (idx_drafter_status/idx_status/idx_template_code/idx_submitted_at)
- `backend/src/main/resources/db/migration/V1__create_schema.sql` L138-153 — `approval_line` + 인덱스(idx_approver_status/idx_document_step)
- 다음 migration 번호 = **V20** (V19 는 Phase 29 notification_dedup_unique)

### 사용자 검색 엔드포인트 (신설 필요 여부 확인)
- `backend/src/main/java/com/micesign/controller/UserController.java` — 기존 `/users` 엔드포인트. `/users/search` 신설 또는 기존 확장 (planner 판단)
- `frontend/src/features/document/components/ApprovalLineEditor.tsx` — 유사 콤보박스 패턴 있을 가능성, 재사용 후보

### 마일스톤 히스토리
- `.planning/phases/29-smtp-retrofit/29-CONTEXT.md` — Phase 29 의 코드 변경과 Phase 30 이 직접 간섭 없음 (별 경로). 단, `application.yml` · `@Transactional` · `@Async` 설정 공유.
- `.planning/STATE.md` — Blockers/Concerns 없음 (Phase 30 은 순수 백엔드+프론트, 외부 서비스 의존성 zero)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets (적극 재사용)
- **`DocumentRepositoryCustomImpl.escapeLikePattern`**: 이미 SQL 이스케이프 구현. keyword 처리 로직 그대로 유지.
- **`DocumentRepositoryCustomImpl.searchDocuments` 의 keyword OR 구조**: `title.likeIgnoreCase(kw).or(docNumber.likeIgnoreCase(kw)).or(drafter.name.likeIgnoreCase(kw))` — SRCH-02 그대로 유지.
- **`DocumentRepositoryCustomImpl` 의 Projection**: `Projections.constructor(DocumentResponse.class, ...)` 패턴 유지. drafter·department·position JOIN 결과 평탄화.
- **Controller `tab=all` RBAC 가드**: `AUTH_FORBIDDEN` 403 응답 유지.
- **프론트 `DocumentListPage`**: 필터 UI 70% 완성. keyword/status/template/date 섹션 재사용, `drafterId` 콤보박스만 신규.
- **프론트 `useSearchDocuments` 훅**: TanStack Query 기반 존재. searchParams 전환만.
- **`STATUS_OPTIONS` / `TEMPLATE_OPTIONS` 상수**: 복수 선택 UI 로 확장 시 재사용.

### Established Patterns (따라야 할 관습)
- **QueryDSL BooleanBuilder**: `where.and(...)` 체이닝. 서브쿼리는 `JPAExpressions.selectOne().from(...).where(...).exists()`.
- **SpringDataJpa Page 반환**: `new PageImpl<>(content, pageable, total)`.
- **Controller @RequestParam**: nullable 파라미터 = `@RequestParam(required = false)`. 기본값은 `defaultValue = "..."`.
- **프론트 apiClient**: axios 기반 공통 클라이언트 (`frontend/src/api/client.ts`). 이 단계에서 `paramsSerializer` 정책 재검토 가능.
- **프론트 TanStack Query 키**: `[queryName, ...params]` 배열. searchParams 변경 시 자동 무효화.
- **Korean error messages**: FSD §12.2 에러 코드 체계 (`DOC_INVALID_STATUS` 등). 404/403 은 한글 메시지 + 영문 code.
- **JPA `ddl-auto: validate`**: 엔티티/스키마 drift 는 startup validation 에서 잡음 → V20 시 엔티티 변화 없으면 안전.

### Integration Points (수정 금지 경계)
- `DocumentService.getMyDocuments` / `DocumentRepository.findByDrafterId...` — `/documents/my` 경로. Phase 30 변경 **범위 밖**. Regression 체크 항목으로만.
- `DocumentService.createDocument/submitDocument/approveDocument` — 문서 상태 전이 로직 변경 금지. Phase 30 은 조회만.
- `ApprovalService` 전체 — approval_line 생성/수정 로직 변경 금지. 검색은 read-only.
- `NotificationLog` / Phase 29 자산 — 완전 독립, 간섭 zero.
- 기존 `Pagination` 컴포넌트(`frontend/src/features/admin/components/Pagination.tsx`) — 재사용 그대로.

### Creative Options (연관 활용 가능성)
- `GET /users/search` 엔드포인트를 신설하면 Phase 31 대시보드·Phase 24.1 결재선 편집기에서도 재활용 가능.
- useSearchParams 전환 패턴이 Phase 31 대시보드 필터에도 확장 적용 가능.
- `DocumentSearchCondition` record 의 타입 안전 패턴을 다른 조회 Condition DTO 에도 소급 가능(후순위).

</code_context>

<specifics>
## Specific Ideas

- **FSD 4-브랜치 권한 predicate**:
  ```sql
  (
    d.drafter_id = :currentUserId
    OR EXISTS (SELECT 1 FROM approval_line al WHERE al.document_id = d.id AND al.approver_id = :currentUserId)
    OR (:role = 'ADMIN' AND d.drafter_id IN (SELECT id FROM user WHERE department_id = :myDepartmentId))
    OR :role = 'SUPER_ADMIN'
  )
  ```
  QueryDSL 로 옮길 때 `JPAExpressions.selectOne().from(QApprovalLine).where(...).exists()` 사용. role 은 Java 변수로 분기 (QueryDSL 내부에 문자열 비교 `:role` 대신 Java if 로 predicate 생성).
- **axios 복수 status 직렬화**: 현재 프로젝트 `apiClient` 가 `paramsSerializer` 를 지정했는지 확인 필요. 지정 안 했으면 axios 기본은 `status[]=A&status[]=B` (Spring 은 `status=A&status=B` 선호) → `paramsSerializer: (params) => qs.stringify(params, { arrayFormat: 'repeat' })` 필요.
- **keyword LIKE 성능**: `%keyword%` 는 인덱스 타지 않음. 하지만 tab/status/date 범위 필터가 먼저 적용되어 row 수 작아지면 문제없음. EXPLAIN 에서 filter 순서 확인.
- **권한 매트릭스 테스트 표**: (drafter=A, SUBMITTED, approver=B, reference=C) 문서 1 개 seed → 사용자 별 (A, B, C, D, admin_same_dept, admin_other_dept, super_admin) 7 유형 × 기대 결과 테이블.
- **URL 예시**: `/documents?tab=search&keyword=경비&status=SUBMITTED&status=APPROVED&templateCode=EXPENSE&dateFrom=2026-01-01&dateTo=2026-03-31&drafterId=42&page=2` — 링크 공유로 완전 재현.
- **첫 PR (hotfix) 제목 예**: `fix(30): 검색 권한 WHERE 절 보안 수정 (SRCH-01)` — SRCH-02~06 는 D-D6 의 PR2 에.

</specifics>

<deferred>
## Deferred Ideas

- **departmentId 필터** (FSD 명시 but ROADMAP 미요구) → Phase 33 또는 v1.3. SUPER_ADMIN/ADMIN 전용 노출.
- **페이지 크기 사용자 조절 UI** (10/20/50/100) → Phase 33 또는 v1.3.
- **복합 인덱스 선제적 추가**(`idx_status_submitted`, `idx_approver_doc`) → EXPLAIN 결과 필요 시 Phase 30 내 V20, 아니면 Phase 33 성능 튜닝.
- **useMyDocuments 와 useSearchDocuments 통합** (tab=my 인 경우도 search endpoint 호출) → Phase 33 리팩토링, 현 스코프에선 규모 벗어남.
- **3-PR 분할** (보안 / 백엔드 필터 / 프론트 URL sync) → 2-PR 분할이 충분 (D-D6). 향후 체크포인트에서 변경 가능.
- **nuqs · URL state 라이브러리 도입** → 기본 `useSearchParams` 로 충분. 프로젝트 전반에 URL state 패턴 도입 시 재검토.
- **`GET /documents/search` 를 POST 로 전환** (JSON body 필터) → API 호환성 깨짐, Phase 30 스코프 벗어남.
- **Elasticsearch/OpenSearch/MariaDB FULLTEXT 도입** → ROADMAP 배제 결정 (50 user × <10K 문서 규모에서 LIKE + 인덱스 충분).
- **검색 결과 하이라이팅** (keyword 일치 부분 강조) → UX 향상 but v1.3 이후.
- **저장된 필터 프리셋** ("내 자주 쓰는 검색") → Phase 1-C 고급 기능.
- **결재 상태별 빠른 탭** (진행 중/완료/반려) → Phase 31 대시보드가 이미 카운트 카드 제공, 중복 투자.
- **URL 상태 bookmarkable pagination bar** (숫자 클릭 시 URL 갱신) → useSearchParams 전환하면 자동 달성.

</deferred>

---

*Phase: 30-where*
*Context gathered: 2026-04-23*

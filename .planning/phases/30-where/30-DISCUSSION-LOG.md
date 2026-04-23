# Phase 30: 검색 권한 WHERE 절 보안 수정 + 필터 확장 - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-23
**Phase:** 30-where
**Areas discussed:** A. 권한 WHERE 절 + DRAFT 정책, B. 필터 확장 + 복수 상태 API 계약, C. URL query sync + 페이지네이션, D. 성능·인덱스·롤아웃

---

## A. 권한 WHERE 절 + DRAFT 정책

### Q1. tab 스코프와 FSD 권한 predicate 결합 방식

| Option | Description | Selected |
|--------|-------------|----------|
| 병행 AND | tab 스코프 유지 + FSD predicate 를 항상 AND 로 추가 | ✓ |
| tab 을 권한 predicate 로 통합 | tab 분기 SWITCH 내부에서 predicate 재조립 | |
| tab 파라미터 제거 + 순수 권한 필터 | tab deprecate + 명시 필터 | |

**User's choice:** 병행 AND (추천)
**Notes:** 단일 SoT, 버그 표면 최소. 기존 Controller tab=all 403 검사는 API 경계로 유지.

### Q2. SUPER_ADMIN/ADMIN 권한 확장 처리

| Option | Description | Selected |
|--------|-------------|----------|
| 권한 predicate 내부에서 role 분기 | QueryDSL 빌더 내부에서 role 기반 분기 | ✓ |
| tab=all + role 검사 혼합 | Controller + Repo 이중 지점 | |
| tab=all 을 SUPER_ADMIN 전용으로 제한 | ADMIN 은 tab=department 강제 | |

**User's choice:** 권한 predicate 내부에서 role 분기 (추천)

### Q3. ADMIN 의 department/all 탭 본인 DRAFT 노출

| Option | Description | Selected |
|--------|-------------|----------|
| tab=my 에서만 본인 DRAFT 노출 (FSD 원문) | tab!=my 에선 status!=DRAFT 강제 | ✓ |
| 상태 필터 명시 시에만 허용 | 조건부 정책 | |
| drafter=me 분기에서는 DRAFT 허용 | 4-브랜치 중 본인 기안 분기만 허용 | |

**User's choice:** tab=my 에서만 본인 DRAFT 노출 (추천 / FSD 문구)

### Q4. status != DRAFT 강제 위치

| Option | Description | Selected |
|--------|-------------|----------|
| QueryDSL 빌더 내부 | 단일 SoT, 모든 호출 경로 보호 | ✓ |
| 서비스 계층 | DocumentService 에서 condition 보정 | |
| Controller 계층 | API 경계 | |

**User's choice:** QueryDSL 빌더 내부 (추천)

---

## B. 필터 확장 + 복수 상태 API 계약

### Q1. status 복수 선택 쿼리스트링 표현

| Option | Description | Selected |
|--------|-------------|----------|
| 반복 쿼리 파라미터 ?status=A&status=B | Spring List<String> 표준 | ✓ |
| CSV ?status=A,B | split 처리 | |
| JSON 배열 body (POST) | RESTful 관습 벗어남 | |

**User's choice:** 반복 쿼리 파라미터 (추천)
**Notes:** axios paramsSerializer 확인 필요.

### Q2. drafterId 드롭다운 데이터 범위

| Option | Description | Selected |
|--------|-------------|----------|
| 검색 가능한 콤보박스 | debounced 자동완성 엔드포인트 | ✓ |
| 권한 범위 내 전체 로드 | ACTIVE 유저 일괄 응답 | |
| 본인 부서만 고정 | 타 부서 기안자는 키워드로 | |

**User's choice:** 검색 가능한 콤보박스 (추천)

### Q3. FSD 의 departmentId 필터 포함 여부

| Option | Description | Selected |
|--------|-------------|----------|
| 미포함 Phase 33 이후로 이월 | ROADMAP Success Criteria 에 없음 | ✓ |
| 포함 — 완전한 FSD 대응 | 단번에 필터 완성 | |
| 포함하되 비관리자에게 숨김 | 스키마만 추가 | |

**User's choice:** 미포함 Phase 33 이후로 이월 (추천)

### Q4. DocumentSearchCondition record status 필드 타입

| Option | Description | Selected |
|--------|-------------|----------|
| List<DocumentStatus> 로 전환 | enum 타입 안전성 | ✓ |
| List<String> 유지 | Repository 안에서 enum 변환 | |
| Set<DocumentStatus> | 중복 방지, 바인딩 추가 변환 | |

**User's choice:** List<DocumentStatus> 로 전환 (추천)

---

## C. URL query sync + 페이지네이션

### Q1. URL query 반영 범위와 타이밍

| Option | Description | Selected |
|--------|-------------|----------|
| 모든 필터 + page 즉시 반영 | 완벽 재현 | ✓ |
| 필터는 URL · keyword 는 state 만 | 입력 타이핑 단순 | |
| 명시 적용 버튼으로만 반영 | 현재 UX 변경 | |

**User's choice:** 모든 필터 + page 즉시 반영 (추천)

### Q2. URL sync 구현 패턴

| Option | Description | Selected |
|--------|-------------|----------|
| useSearchParams 단일 SoT | React state 제거 | ✓ |
| useState 유지 + useEffect sync | 단방향 sync | |
| nuqs 라이브러리 도입 | 스택 추가 | |

**User's choice:** useSearchParams 단일 SoT (추천)

### Q3. 빈 필터 값 URL 처리

| Option | Description | Selected |
|--------|-------------|----------|
| 빈 값 생략 | URL 깔끔 | ✓ |
| 모든 필드 명시 | URL 일관성 | |
| 사용자 수정한 필드만 명시 | 중간 복잡도 | |

**User's choice:** 빈 값 생략 (추천)

### Q4. tab(my/search) 과 search 모드 필터의 관계

| Option | Description | Selected |
|--------|-------------|----------|
| tab 도 URL query 로 매핑 | ?tab=my / ?tab=search | ✓ |
| tab 미사용 + 필터 유무로 유도 | 훅 통합 필요 | |
| tab = backend tab (my/department/all) 로 동기화 | UX 정교화 | |

**User's choice:** tab 도 URL query 로 매핑 (추천)

---

## D. 성능 · 인덱스 · count · 롤아웃

### Q1. 10K/50-user 95p 1초 달성을 위한 인덱스 보강

| Option | Description | Selected |
|--------|-------------|----------|
| 기존 인덱스로 실측 먼저 | YAGNI | ✓ |
| 복합 인덱스 선제적 추가 | V20 에서 idx_status_submitted 등 | |
| V20 에서 필요한 것만 추가 | 실측 후 보강 | |

**User's choice:** 기존 인덱스로 실측 먼저 (추천)

### Q2. 페이지 총개수 count 전략

| Option | Description | Selected |
|--------|-------------|----------|
| count(distinct doc.id) | ROADMAP 명시, 보수적 방어 | ✓ |
| count(doc.id) 로 충분 | JOIN 가벼움 | |
| 도메인 모델 기반 선택 | 모델 수정 시 재검토 | |

**User's choice:** count(distinct doc.id) (추천)

### Q3. EXPLAIN · 부하 검증 시점

| Option | Description | Selected |
|--------|-------------|----------|
| Phase 30 내 간단 벤치 | 1K·10K seed + EXPLAIN + 간단 병렬 | ✓ |
| Phase 33 에 이월 | E2E 에서 50-user 벤치 | |
| 스킵 — 관습적 설계만 | 최소 EXPLAIN 은 해야 | |

**User's choice:** Phase 30 내 간단 벤치 (추천)

### Q4. PR 분할 전략

| Option | Description | Selected |
|--------|-------------|----------|
| SRCH-01 보안 hotfix 먼저 + 필터 확장 뒤에 | ROADMAP 지침 준수 | ✓ |
| 단일 PR | 일관성 | |
| 3 개 PR (권한 / 백엔드 필터 / 프론트 URL sync) | 세분화 과다 | |

**User's choice:** SRCH-01 보안 hotfix 먼저 + 필터 확장 뒤에 (추천)

---

## Claude's Discretion

- `DocumentSearchCondition` record 의 `List<DocumentStatus>` 기본값 처리 문법
- `GET /users/search` 엔드포인트 시그니처 및 신설 여부
- 프론트 복수 상태 선택 UI 의 구체 컴포넌트 스타일 (체크박스 vs pills vs multi-select)
- V20 migration 필요 여부와 내용 (EXPLAIN 결과 기반)
- 벤치 스크립트 구체 도구 (`ab` / `wrk` / Spring ExecutorService)
- 10K seed 스크립트 구체 구현
- 권한 매트릭스 통합 테스트의 JPA fixture 스타일
- axios paramsSerializer 변경의 전역 영향 평가

## Deferred Ideas

- departmentId 필터 → Phase 33 또는 v1.3
- 페이지 크기 사용자 조절 UI → Phase 33 또는 v1.3
- 복합 인덱스 선제적 추가 → EXPLAIN 결과 기반
- useMyDocuments 와 useSearchDocuments 통합 → Phase 33 리팩토링
- 3-PR 분할 → 2-PR 분할이 충분
- nuqs 라이브러리 도입 → 기본 useSearchParams 로 충분
- `GET /documents/search` 를 POST 로 전환 → 호환성 깨짐
- Elasticsearch/FULLTEXT 도입 → ROADMAP 배제 결정
- 검색 결과 하이라이팅 → v1.3 이후
- 저장된 필터 프리셋 → Phase 1-C
- 결재 상태별 빠른 탭 → Phase 31 대시보드 중복 투자

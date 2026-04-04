# Phase 11: Document Search & Filter - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-04
**Phase:** 11-document-search-filter
**Areas discussed:** 검색 UI 배치, 검색 범위와 동작, 필터 조합 방식, 결과 표시 방식, 탭 구성 상세, 정렬 옵션, URL 상태 보존 범위

---

## 검색 UI 배치

| Option | Description | Selected |
|--------|-------------|----------|
| 문서목록에 통합 | 기존 DocumentListPage 상단에 검색바+필터 추가. AuditLogFilters 패턴 재사용 | ✓ |
| 별도 검색 페이지 | 새 /documents/search 경로에 전용 검색 페이지. GNB에 검색 아이콘 추가 | |

**User's choice:** 문서목록에 통합 (Recommended)
**Notes:** None

## 필터 UI 표시

| Option | Description | Selected |
|--------|-------------|----------|
| 항상 표시 | 검색바 아래에 필터 옵션이 항상 보임. 기존 패턴과 동일 | ✓ |
| 접기/펼치기 | 토글 버튼으로 숨기기/표시 | |
| 사이드바/드로어 | 오른쪽 사이드바나 상단 드로어 | |

**User's choice:** 항상 표시 (Recommended)
**Notes:** None

## 검색 트리거

| Option | Description | Selected |
|--------|-------------|----------|
| 검색 버튼/엔터 | 검색어 입력 후 검색 버튼 클릭 또는 Enter로 실행 | ✓ |
| 실시간 검색 (debounce) | 타이핑하면서 300ms debounce로 자동 검색 | |

**User's choice:** 검색 버튼/엔터 (Recommended)
**Notes:** None

## 검색 범위

| Option | Description | Selected |
|--------|-------------|----------|
| 통합 검색 | 하나의 검색바에 입력하면 제목/문서번호/기안자명 모두에서 OR 검색 | ✓ |
| 필드별 검색 | 제목/문서번호/기안자 각각 별도 입력필드 | |
| 통합 + 필드 선택 | 검색바 왼쪽에 드롭다운으로 검색 대상 선택 | |

**User's choice:** 통합 검색 (Recommended)
**Notes:** None

## 필터 초기화

| Option | Description | Selected |
|--------|-------------|----------|
| 초기화 버튼 추가 | 필터 영역에 '초기화' 버튼을 두어 모든 필터를 한 번에 리셋 | ✓ |
| 필요 없음 | 각 필터를 개별적으로 빈값으로 변경하여 초기화 | |

**User's choice:** 초기화 버튼 추가 (Recommended)
**Notes:** None

## 보기 범위 프리셋

| Option | Description | Selected |
|--------|-------------|----------|
| 탭 방식 | 내 문서 / 결재함 / 전체 등의 탭으로 보기 범위 전환 | ✓ |
| 필터로 통합 | 보기 범위도 필터 드롭다운으로 처리 | |
| 필요 없음 | 현재처럼 '내 문서'만 표시 | |

**User's choice:** 탭 방식 (Recommended)
**Notes:** None

## 결과 컬럼

| Option | Description | Selected |
|--------|-------------|----------|
| 현재 + 양식유형 | 기존 컬럼 + 양식유형 컬럼 추가. 검색어 하이라이트 포함 | ✓ |
| 확장 컬럼 | 제목, 문서번호, 상태, 양식유형, 기안자, 날짜, 현재 결재자 | |
| Claude 재량 | 기존 테이블 패턴을 유지하면서 적절히 확장 | |

**User's choice:** 현재 + 양식유형 (Recommended)
**Notes:** None

## 빈 결과

| Option | Description | Selected |
|--------|-------------|----------|
| 안내 메시지 | '검색 결과가 없습니다' + 필터 조건 변경 제안 | ✓ |
| 상세 안내 | 적용된 필터 조건을 보여주며 '필터 초기화' 버튼 함께 표시 | |

**User's choice:** 안내 메시지 (Recommended)
**Notes:** None

## 탭 구성 상세

| Option | Description | Selected |
|--------|-------------|----------|
| 내 문서 / 결재함 / 전체 | 3개 탭. 기본탭: 내 문서. 전체는 관리자만 | ✓ |
| 내 문서 / 결재 대기 / 참조 / 전체 | 4개 탭. 결재 대기와 참조를 분리 | |
| Claude 재량 | RBAC 역할별로 적절한 탭 구성을 판단 | |

**User's choice:** 내 문서 / 결재함 / 전체 (Recommended)
**Notes:** None

## 정렬

| Option | Description | Selected |
|--------|-------------|----------|
| 최신순 고정 | 문서 생성일 기준 내림차순 고정 | ✓ |
| 컬럼 헤더 정렬 | 테이블 헤더 클릭으로 정렬 토글 | |

**User's choice:** 최신순 고정 (Recommended)
**Notes:** None

## URL 상태 보존

| Option | Description | Selected |
|--------|-------------|----------|
| 전체 보존 | 탭+검색어+필터+페이지 모두 URL 쿼리 파라미터로 보존 | ✓ |
| 탭+필터만 | 검색어는 URL에 보존하지 않음 | |

**User's choice:** 전체 보존 (Recommended)
**Notes:** None

## Claude's Discretion

- Table column widths and responsive behavior
- Search keyword highlight styling
- Empty state illustration/icon
- Backend query optimization approach (QueryDSL vs JPA Specifications)

## Deferred Ideas

None — discussion stayed within phase scope

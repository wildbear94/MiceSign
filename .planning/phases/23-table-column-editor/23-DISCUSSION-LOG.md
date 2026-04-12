# Phase 23: 테이블 컬럼 편집기 - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-12
**Phase:** 23-table-column-editor
**Areas discussed:** 컬럼 편집 UI 구조, 컬럼 타입 지원 범위, 컬럼 순서 변경 방식, 미리보기 연동, 컬럼 기본값/최소 컬럼 수, 타입 데이터 구조, 행 설정 (minRows/maxRows), 드래그&드롭 라이브러리, 컬럼 삭제 확인

---

## 컬럼 편집 UI 구조

### UI 배치

| Option | Description | Selected |
|--------|-------------|----------|
| FieldConfigEditor 내부 (추천) | select 타입의 옵션 편집처럼 switch문에 case 'table' 추가. 기존 패턴과 일관 | ✓ |
| 별도 편집 패널/모달 | 컬럼 편집 버튼 클릭 시 별도 패널이나 서브 모달이 열림. 더 넓은 공간이지만 컨텍스트 전환 필요 | |

**User's choice:** FieldConfigEditor 내부 (추천)
**Notes:** 기존 select 옵션 편집 패턴과 일관성 유지

### 세부 설정 표시

| Option | Description | Selected |
|--------|-------------|----------|
| 접기/펼치기 (추천) | 각 컬럼 행 클릭 시 세부 설정 펼쳐짐. FieldCard 패턴과 동일 | ✓ |
| 항상 표시 | 모든 컬럼의 세부 설정이 항상 보임. 단순하지만 UI가 길어짐 | |

**User's choice:** 접기/펼치기 (추천)
**Notes:** 컬럼이 많아도 깨끗한 목록 유지

---

## 컬럼 타입 지원 범위

| Option | Description | Selected |
|--------|-------------|----------|
| 4개 기본 타입 (추천) | text, number, date, select — Success Criteria에 명시된 4가지만 | |
| 확장 타입 포함 | 4개 기본 + textarea, checkbox, staticText | ✓ |

**User's choice:** 확장 타입 포함
**Notes:** 7가지 타입 (text, number, date, select, textarea, checkbox, staticText)

### 추가 타입 선택

| Option | Description | Selected |
|--------|-------------|----------|
| textarea | 여러 줄 텍스트 입력 | ✓ |
| checkbox | 체크박스 (boolean 값) | ✓ |
| staticText | 수정 불가 고정 텍스트 | ✓ |

**User's choice:** 3개 모두 선택

---

## 컬럼 순서 변경 방식

| Option | Description | Selected |
|--------|-------------|----------|
| 위/아래 버튼 (추천) | 기존 필드 순서 변경과 동일한 패턴 | |
| 드래그 & 드롭 | 컬럼을 드래그해서 순서 변경. 라이브러리 의존성 추가 필요 | ✓ |

**User's choice:** 드래그 & 드롭
**Notes:** Phase 21에서 필드 순서는 버튼 방식이지만, 컬럼은 드래그&드롭으로 차별화

---

## 미리보기 연동

| Option | Description | Selected |
|--------|-------------|----------|
| 헤더 + 샘플 행 (추천) | 컬럼 헤더와 1-2개 빈 샘플 행을 테이블로 표시 | ✓ |
| 헤더만 | 컬럼 헤더만 표시하고 샘플 행은 생략 | |

**User's choice:** 헤더 + 샘플 행 (추천)
**Notes:** 실제 문서에서 테이블이 어떻게 보일지 직관적 확인 가능

---

## 컬럼 기본값/최소 컬럼 수

| Option | Description | Selected |
|--------|-------------|----------|
| 빈 상태로 시작 (추천) | 컬럼 0개로 시작, 최소 1개 필요(저장 시 밸리데이션), 최대 20개 | ✓ |
| 기본 컬럼 1개 포함 | 자동으로 'Column 1' (text 타입) 생성 | |

**User's choice:** 빈 상태로 시작 (추천)

---

## 타입 데이터 구조

| Option | Description | Selected |
|--------|-------------|----------|
| TableColumn 타입 신규 (추천) | types.ts에 TableColumn 인터페이스 추가. SchemaFieldConfig에 columns?: TableColumn[] 추가 | ✓ |
| SchemaField 재활용 | 기존 SchemaField 타입을 컬럼에도 사용. table 안에 table 중첩 가능성 문제 | |

**User's choice:** TableColumn 타입 신규 (추천)

---

## 행 설정 (minRows/maxRows)

| Option | Description | Selected |
|--------|-------------|----------|
| 포함 (추천) | 컬럼 편집 UI 아래에 minRows/maxRows 설정. 백엔드 이미 지원 | ✓ |
| 제외 | 이 phase에서는 컬럼 편집만 집중 | |

**User's choice:** 포함 (추천)

---

## 드래그&드롭 라이브러리

| Option | Description | Selected |
|--------|-------------|----------|
| @dnd-kit/core (추천) | 현대적 React DnD. 훅 기반, 경량, 접근성 우수 | ✓ |
| react-beautiful-dnd | Atlassian 개발. 유지보수 중단 (deprecated) | |

**User's choice:** @dnd-kit/core (추천)

---

## 컬럼 삭제 확인

| Option | Description | Selected |
|--------|-------------|----------|
| 즉시 삭제 (추천) | 확인 없이 즉시 삭제. select 옵션 삭제와 동일 패턴 | ✓ |
| 확인 다이얼로그 | 삭제 전 확인. 실수 방지지만 워크플로우 느려짐 | |

**User's choice:** 즉시 삭제 (추천)

---

## Claude's Discretion

- 컬럼 편집 UI의 정확한 Tailwind 스타일링
- 접기/펼치기 애니메이션 여부
- 드래그 핸들 아이콘 선택
- 빈 상태 안내 메시지 문구
- TableColumn 타입 정의 세부 사항

## Deferred Ideas

None

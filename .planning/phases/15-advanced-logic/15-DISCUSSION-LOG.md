# Phase 15: Advanced Logic - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-06
**Phase:** 15-advanced-logic
**Areas discussed:** 조건부 규칙 설계, 계산 필드, 순환 의존성 감지, 시각적 섹션, 조건부 규칙 데이터 구조, 백엔드 순환 검증, 조건부 + 섹션 결합, 조건부 required 동작, 계산 필드 Builder UI

---

## 조건부 규칙 설계

### 연산자 범위

| Option | Description | Selected |
|--------|-------------|----------|
| 기본 세트 | equals, not_equals, is_empty, is_not_empty — select 필드의 값 비교와 비어있음 검사 | ✓ |
| 확장 세트 | + contains, greater_than, less_than — 숫자 비교와 문자열 포함 검사까지 | |
| 최소한 | equals, not_equals만 | |

**User's choice:** 기본 세트

### AND/OR 조합

| Option | Description | Selected |
|--------|-------------|----------|
| AND만 | 모든 조건이 충족되어야 규칙 적용 | |
| AND + OR 선택식 | matchType: 'all' \| 'any' 선택 | ✓ |
| 중첩 그룹 | AND/OR를 중첩 그룹으로 조합 (Notion 필터 스타일) | |

**User's choice:** AND + OR 선택식

### 규칙 UI 배치

| Option | Description | Selected |
|--------|-------------|----------|
| PropertyPanel 탭 추가 | 기존 3탭 옆에 'Conditions' 탭 추가 | ✓ |
| 별도 규칙 패널 | Builder 레이아웃에 4번째 패널 추가 | |
| 필드 카드 인라인 | 캔버스의 각 필드 카드에 조건 아이콘/배지 표시 + 클릭 시 편집 | |

**User's choice:** PropertyPanel 탭 추가

### 숨김 동작

| Option | Description | Selected |
|--------|-------------|----------|
| DOM에서 제거 | 조건 미충족 시 필드를 DOM에서 완전히 제거하고 값도 초기화 | ✓ |
| CSS로 숨김 | display:none으로 숨기고 값은 유지 | |
| 사용자 선택 | 규칙에 hide_remove \| hide_keep 옵션 | |

**User's choice:** DOM에서 제거

---

## 계산 필드

### 표시 방식

| Option | Description | Selected |
|--------|-------------|----------|
| 읽기 전용 number 필드 | 기존 number 필드 확장, calculationType 설정 시 readonly | ✓ |
| 별도 calculation 필드 타입 | 새로운 FieldType 추가 | |
| 텍스트 레이블 | 계산 결과를 텍스트 레이블로 표시 | |

**User's choice:** 읽기 전용 number 필드

### 테이블 합계

| Option | Description | Selected |
|--------|-------------|----------|
| 테이블 외부 합계 필드 | 테이블 바깥에 계산 필드, sourceFields에 'table.columnId' 형식 참조 | ✓ |
| 테이블 내부 footer 행 | 테이블 컴포넌트 자체에 footer 행 추가 | |
| 둘 다 | 외부 합계 + 내부 footer 모두 | |

**User's choice:** 테이블 외부 합계 필드

### 백엔드 검증

| Option | Description | Selected |
|--------|-------------|----------|
| 프론트엔드만 | 계산은 프론트에서만 실행, 백엔드는 제출된 값 그대로 저장 | ✓ |
| 백엔드 재계산 검증 | 백엔드에서도 계산 규칙을 실행해 프론트 계산값과 일치 여부 검증 | |

**User's choice:** 프론트엔드만

---

## 순환 의존성 감지

### 검사 시점

| Option | Description | Selected |
|--------|-------------|----------|
| 저장 시 검증 | 템플릿 저장 버튼 클릭 시 전체 규칙 그래프 검사 | ✓ |
| 실시간 검증 | 규칙 편집 중 즉시 순환 검사 | |
| 둘 다 | 편집 중 실시간 경고 + 저장 시 최종 차단 | |

**User's choice:** 저장 시 검증

### 에러 표시

| Option | Description | Selected |
|--------|-------------|----------|
| 토스트 알림 | 화면 상단 빨간 토스트로 순환 경로 표시 | ✓ |
| 필드 카드 하이라이트 | 순환 관여 필드 카드를 빨간 테두리로 표시 + 툴팁 설명 | |
| 둘 다 | 토스트 + 필드 카드 하이라이트 동시 적용 | |

**User's choice:** 토스트 알림

---

## 시각적 섹션

### 섹션 구현

| Option | Description | Selected |
|--------|-------------|----------|
| section 필드 타입 추가 | FieldType에 'section' 추가, 팔레트에 추가, DnD로 배치 | ✓ |
| 중첩 구조 | fields 배열을 중첩 구조로 변경: sections[].fields[] | |
| 메타데이터 방식 | 필드에 sectionId 속성 추가 + 별도 sections[] 배열 관리 | |

**User's choice:** section 필드 타입 추가

### 접기/펼치기

| Option | Description | Selected |
|--------|-------------|----------|
| 접기/펼치기 지원 | 각 섹션 헤더를 클릭하면 해당 섹션의 필드를 접기/펼치기 | ✓ |
| 항상 펼침 상태 | 섹션은 시각적 구분만 제공, 접기 기능 없음 | |

**User's choice:** 접기/펼치기 지원

---

## 조건부 규칙 데이터 구조 (추가 논의)

### conditionalRules JSON

| Option | Description | Selected |
|--------|-------------|----------|
| 필드별 규칙 (타겟 기준) | targetFieldId 기준으로 규칙 그룹화 | ✓ |
| 소스별 규칙 | sourceFieldId 기준 + effects 배열 | |

**User's choice:** 필드별 규칙 (타겟 기준)

### calculationRules JSON

| Option | Description | Selected |
|--------|-------------|----------|
| 타겟 필드 기준 | targetFieldId + operation + sourceFields | ✓ |
| 수식 기반 | targetFieldId + formula string + sourceFields | |

**User's choice:** 타겟 필드 기준

---

## 백엔드 순환 검증 (추가 논의)

| Option | Description | Selected |
|--------|-------------|----------|
| 백엔드에서도 검증 | 템플릿 저장 API에서 순환 검사 수행 | ✓ |
| 프론트엔드만 | Builder UI에서만 검증 | |

**User's choice:** 백엔드에서도 검증

---

## 조건부 + 섹션 결합 (추가 논의)

| Option | Description | Selected |
|--------|-------------|----------|
| 섹션 조건부 지원 | section 필드도 conditionalRules의 targetFieldId로 사용 가능 | ✓ |
| 필드 단위만 | 조건부 규칙은 개별 필드에만 적용 | |
| 별도 sectionRules | 섹션용 별도 규칙 배열 추가 | |

**User's choice:** 섹션 조건부 지원

---

## 조건부 required 동작 (추가 논의)

### Zod 처리

| Option | Description | Selected |
|--------|-------------|----------|
| Zod 동적 재생성 | 조건 변경 시 schemaToZod를 재실행하여 required/optional 동적 전환 | ✓ |
| Zod superRefine | 기본 스키마는 모두 optional, superRefine에서 동적 검증 | |

**User's choice:** Zod 동적 재생성

### required 관계

| Option | Description | Selected |
|--------|-------------|----------|
| OR 관계 | required=true이면 항상 필수, 조건부 require는 추가 필수 조건 | ✓ |
| 조건부가 우선 | 조건부 require 규칙이 있으면 FieldDefinition.required 무시 | |

**User's choice:** OR 관계

---

## 계산 필드 Builder UI (추가 논의)

### 배치

| Option | Description | Selected |
|--------|-------------|----------|
| Advanced 탭에 통합 | 기존 PropertyAdvancedTab에 계산 설정 섹션 추가 | ✓ |
| 별도 Calculation 탭 | PropertyPanel에 5번째 탭 추가 | |
| 툴바 버튼 | BuilderToolbar에 모달로 편집 | |

**User's choice:** Advanced 탭에 통합

### sourceFields 선택 UI

| Option | Description | Selected |
|--------|-------------|----------|
| 드롭다운 리스트 | number 필드와 table.column을 그룹화하여 드롭다운, 다중 선택 | ✓ |
| 체크박스 리스트 | 모든 수치 필드/칸럼을 체크박스로 나열 | |

**User's choice:** 드롭다운 리스트

---

## Claude's Discretion

- 순환 감지 알고리즘 선택
- 조건부 규칙 평가 엔진 내부 구현
- 계산 필드 소수점 처리
- Conditions 탭 세부 UI 레이아웃
- 섹션 접기/펼치기 애니메이션

## Deferred Ideas

None — discussion stayed within phase scope

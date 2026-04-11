# Phase 13: Dynamic Form Rendering - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-05
**Phase:** 13-dynamic-form-rendering
**Areas discussed:** 동적 폼 통합 방식, 필드 컴포넌트 UX, Zod 런타임 생성 전략, 읽기 전용 렌더링

---

## 동적 폼 통합 방식

### 통합 패턴

| Option | Description | Selected |
|--------|-------------|----------|
| Registry fallback | TEMPLATE_REGISTRY에 없는 코드일 때 DynamicForm 자동 렌더링 | ✓ |
| Registry 동적 등록 | 앱 시작 시 API에서 동적 템플릿 가져와 registry에 등록 | |
| 별도 라우팅 | /documents/dynamic/:templateId 별도 경로 | |

**User's choice:** Registry fallback
**Notes:** 기존 EditorPage/DetailPage 최소 변경으로 통합

### 제목 필드 처리

| Option | Description | Selected |
|--------|-------------|----------|
| 기존 제목 필드 유지 | DocumentEditorPage가 제목 관리, DynamicForm은 스키마 필드만 | ✓ |
| 스키마에 제목 포함 | DynamicForm이 제목까지 스키마 필드로 관리 | |

**User's choice:** 기존 제목 필드 유지

### 템플릿 선택 모달

| Option | Description | Selected |
|--------|-------------|----------|
| 통합 리스트 | 하드코딩 + 동적을 한 리스트에 표시 | ✓ |
| 그룹 분리 | "기본 양식" / "커스텀 양식" 그룹 분리 | |
| 카테고리별 표시 | category 필드로 분류 | |

**User's choice:** 통합 리스트

---

## 필드 컴포넌트 UX

### Select 필드 UI

| Option | Description | Selected |
|--------|-------------|----------|
| 네이티브 select | HTML <select> + Tailwind | |
| Headless UI Combobox | 검색 가능한 드롭다운 | ✓ |
| Radix Select | 접근성 우수, 키보드 네비게이션 | |

**User's choice:** Headless UI Combobox
**Notes:** 옵션이 많을 때 검색 기능이 유용

### Date 필드 UI

| Option | Description | Selected |
|--------|-------------|----------|
| 네이티브 input[type=date] | 브라우저 기본 피커 | |
| react-day-picker | 커스텀 캘린더 UI | ✓ |
| date-fns + 커스텀 | 직접 캘린더 구현 | |

**User's choice:** react-day-picker

### Table 필드 UX

| Option | Description | Selected |
|--------|-------------|----------|
| 하단 추가 버튼 + 행별 X | ExpenseForm과 동일한 패턴 | ✓ |
| 행 드래그 정렬 + 버튼 | 순서 변경 가능한 드래그 핸들 | |
| 인라인 생성 | Tab 누르면 자동 행 추가 | |

**User's choice:** 하단 추가 버튼 + 행별 X
**Notes:** 기존 ExpenseForm과 일관성 유지

### 필드 레이아웃

| Option | Description | Selected |
|--------|-------------|----------|
| 단일 칼럼 스택 | 모든 필드 세로 한 칸씩 쌓임 | ✓ |
| 2칸 그리드 | 짧은 필드 2칸, textarea/table 전체 폭 | |
| 스키마 정의 레이아웃 | Builder에서 width 설정 가능 | |

**User's choice:** 단일 칼럼 스택
**Notes:** 기존 하드코딩 양식과 동일한 패턴

---

## Zod 런타임 생성 전략

### 생성 타이밍

| Option | Description | Selected |
|--------|-------------|----------|
| 폼 마운트 시 한 번 | useMemo로 생성, zodResolver 전달 | ✓ |
| 제출 시만 검증 | 입력 중 검증 없음 | |
| 듀얼 검증 | 프론트 Zod + 백엔드 이중 검증 | |

**User's choice:** 폼 마운트 시 한 번
**Notes:** 실시간 인라인 검증 지원

### 에러 메시지 처리

| Option | Description | Selected |
|--------|-------------|----------|
| 한국어 메시지 직접 생성 | 필드 label 활용한 한국어 메시지 | ✓ |
| i18n 키 기반 | 다국어 지원 가능 | |
| 백엔드 에러 매핑 | 서버 검증 메시지 그대로 표시 | |

**User's choice:** 한국어 메시지 직접 생성
**Notes:** 기존 양식과 동일한 언어 경험

### Table 필드 Zod 처리

| Option | Description | Selected |
|--------|-------------|----------|
| 중첩 자동 변환 | columns를 재귀적으로 z.object 변환 | ✓ |
| 행 단위 검증만 | z.array(z.record(z.any())) 느슨 처리 | |
| 별도 테이블 검증기 | Zod와 분리된 전용 validator | |

**User's choice:** 중첩 자동 변환
**Notes:** 셀별 검증 자동 지원

---

## 읽기 전용 렌더링

### 레이아웃

| Option | Description | Selected |
|--------|-------------|----------|
| 폼 구조 유지 | 편집 모드와 동일한 라벨-값 레이아웃 | ✓ |
| 요약 카드 | 카드 형태로 압축 표시 | |
| PDF 스타일 | 출력 용도 최적화 레이아웃 | |

**User's choice:** 폼 구조 유지
**Notes:** GeneralReadOnly와 동일한 패턴

### 빈 필드 표시

| Option | Description | Selected |
|--------|-------------|----------|
| 라벨 + "—" 표시 | 빈 필드도 라벨 보여주고 em dash 표시 | ✓ |
| 빈 필드 숨김 | 값 없는 필드 렌더링하지 않음 | |
| 라벨 + 회색 표시 | "미입력" 회색 텍스트 | |

**User's choice:** 라벨 + "—" 표시

---

## Claude's Discretion

- DynamicForm/DynamicReadOnly 컴포넌트 내부 구조
- schemaToZod 유틸리티 함수 구조
- checkbox/radio, staticText/hidden 세부 스타일링
- number 필드 coerce 처리 방식

## Deferred Ideas

- 필드 width 설정 — Phase 14 Builder UI
- 조건부 필드 표시/숨김 — Phase 15 Advanced Logic
- 계산 필드 자동 계산 — Phase 15 Advanced Logic
- PDF 출력용 레이아웃 — 별도 phase

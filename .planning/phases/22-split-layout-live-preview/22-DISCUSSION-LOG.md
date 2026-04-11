# Phase 22: 분할 레이아웃 + 라이브 미리보기 - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-11
**Phase:** 22-분할 레이아웃 + 라이브 미리보기
**Areas discussed:** 모달→분할 레이아웃 전환, 미리보기 렌더링 방식, 전체화면 미리보기 UX, 미리보기 토글 동작

---

## 모달→분할 레이아웃 전환

### 모달 크기

| Option | Description | Selected |
|--------|-------------|----------|
| near-fullscreen (95vh/95vw) | 화면 거의 전체를 차지하되 배경 딘 페이지가 살짝 보임. 빌더 툴 느낌 | ✓ |
| 완전 fullscreen (100vh/100vw) | 화면 전체를 차지. 데스크톱 앱 느낌 | |
| max-w-7xl 확장형 | 현재 max-w-4xl을 max-w-7xl로 키우고 분할. 모달 느낌 유지 | |

**User's choice:** near-fullscreen (95vh/95vw)

### 분할 비율

| Option | Description | Selected |
|--------|-------------|----------|
| 50:50 균등 분할 | 편집과 미리보기에 동일한 공간 부여. 단순하고 예측 가능 | ✓ |
| 55:45 편집 우선 | 편집 영역을 약간 더 넓게. 필드 설정 UI가 복잡하므로 더 많은 공간 필요할 수 있음 | |
| 리사이즈 가능 분할 | 드래그할 수 있는 구분선으로 사용자가 비율 조정. 구현 복잡도 증가 | |

**User's choice:** 50:50 균등 분할

### 탭 배치

| Option | Description | Selected |
|--------|-------------|----------|
| 좌측 패널에 탭 유지 | 좌측에 info/fields 탭을 그대로 두고, 우측은 오직 미리보기. 기존 UX 흐름 유지 | ✓ |
| 상단 헤더에 탭 이동 | info/fields 탭을 모달 헤더 영역으로 올리고, 아래 전체를 분할 | |
| 탭 제거, 단일 편집 영역 | info와 fields를 하나의 스크롤 영역으로 통합 | |

**User's choice:** 좌측 패널에 탭 유지

---

## 미리보기 렌더링 방식

### 렌더링 컴포넌트

| Option | Description | Selected |
|--------|-------------|----------|
| 전용 FormPreview 컴포넌트 | 스키마 필드 배열을 받아 읽기 전용 폼 모양을 렌더링하는 경량 컴포넌트 | ✓ |
| DynamicForm 재사용 | Phase 13에서 계획된 DynamicForm을 먼저 만들고 재사용 | |
| 상태에 따라 다른 뷰 | 필드가 없을 때는 안내 일러스트, 있을 때는 폼 미리보기 | |

**User's choice:** 전용 FormPreview 컴포넌트

### 스타일링 방향

| Option | Description | Selected |
|--------|-------------|----------|
| 종이 문서 느낌 | 흑색 배경 위에 흰색 종이 카드 + 밀은 그림자. 실제 문서가 어떻게 보일지 직관적 확인 | ✓ |
| 편평한 라이브 렌더링 | 배경 구분 없이 필드를 직접 렌더링 | |

**User's choice:** 종이 문서 느낌

---

## 전체화면 미리보기 UX

### 동작 방식

| Option | Description | Selected |
|--------|-------------|----------|
| 포탈 오버레이 | 현재 모달 위에 새 포탈 모달이 뜸. 편집 상태 유지된 채 폼만 크게 표시 | ✓ |
| 편집 모달 대체 | 편집 모달 자체가 전체화면 미리보기로 전환 | |

**User's choice:** 포탈 오버레이

### 버튼 위치

| Option | Description | Selected |
|--------|-------------|----------|
| 미리보기 패널 헤더 | 우측 미리보기 패널 상단에 전체화면 아이콘 버튼 | ✓ |
| 모달 헤더 상단 | 모달 제목 옆에 전체화면 버튼 배치 | |

**User's choice:** 미리보기 패널 헤더

---

## 미리보기 토글 동작

### 전환 애니메이션

| Option | Description | Selected |
|--------|-------------|----------|
| 즉각 전환 | 애니메이션 없이 즉시 토글. 편집 영역이 즉시 100% 너비로 확장/축소 | ✓ |
| 슬라이드 애니메이션 | 미리보기 패널이 좌우로 슬라이드하며 나타나고 사라짐 | |
| 접기 애니메이션 | 미리보기 패널 너비가 0으로 애니메이션되며 편집 영역이 확장 | |

**User's choice:** 즉각 전환

### 토글 버튼 위치

| Option | Description | Selected |
|--------|-------------|----------|
| 미리보기 패널 헤더 | 전체화면 버튼 옆에 토글 아이콘 버튼 배치 | ✓ |
| 분할선 중앙 | 좌우 패널 사이 구분선에 토글 버튼 | |
| 좌측 편집 패널 하단 | 편집 영역 하단에 '미리보기 보기/숨기기' 버튼 | |

**User's choice:** 미리보기 패널 헤더

---

## Claude's Discretion

- FormPreview 내부 필드 렌더링 구조 및 컴포넌트 분리 방식
- 미리보기 패널 헤더의 정확한 아이콘 선택
- 포탈 모달의 정확한 크기 및 패딩
- 필드가 없을 때 미리보기 패널의 빈 상태 UI
- 미리보기 패널 내부 스크롤 처리 방식

## Deferred Ideas

None — discussion stayed within phase scope

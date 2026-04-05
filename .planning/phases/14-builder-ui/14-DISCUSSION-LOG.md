# Phase 14: Builder UI - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-05
**Phase:** 14-builder-ui
**Areas discussed:** 빌더 레이아웃, 드래그 앤 드롭 인터랙션, 속성 패널 설계, 템플릿 관리 페이지, 템플릿 저장/발행, 빈 상태/에러 처리, 드래그 앤 드롭 세부 UX, 필드 복제/타입 변경, 필드 너비 설정, JSON 가져오기/내보내기

---

## 빌더 레이아웃

| Option | Description | Selected |
|--------|-------------|----------|
| 고정 3패널 | 좌측 팔레트(200px), 중앙 캔버스(유동), 우측 속성 패널(300px) | ✓ |
| 리사이즈 가능 3패널 | 좌/우 패널 경계 드래그로 크기 조절 | |
| 축소 가능 패널 | 좌/우 패널을 아이콘만 남기고 축소 | |

**User's choice:** 고정 3패널
**Notes:** 간결하고 예측 가능한 UX

| Option | Description | Selected |
|--------|-------------|----------|
| 토글 버튼 | 캔버스 상단 편집/프리뷰 토글 | ✓ |
| 우측 슬라이드 패널 | 속성 패널 자리에 프리뷰 슬라이드 | |
| 하단 실시간 프리뷰 | 캔버스 아래에 항상 표시 | |

**User's choice:** 토글 버튼
**Notes:** DynamicForm 읽기 전용 재사용

| Option | Description | Selected |
|--------|-------------|----------|
| 데스크톱 전용 | min-width: 1024px, 모바일은 안내 메시지 | ✓ |
| 탭 전환 레이아웃 | 소형 화면에서 팔레트/캔버스/속성 탭 전환 | |

**User's choice:** 데스크톱 전용
**Notes:** Admin 기능이므로 적절

---

## 드래그 앤 드롭 인터랙션

| Option | Description | Selected |
|--------|-------------|----------|
| 드래그 + 클릭 병행 | 팔레트에서 드래그 + 클릭으로 맨 아래 추가 | ✓ |
| 드래그 전용 | 팔레트에서 캔버스로만 드래그 | |
| 클릭 전용 | 팔레트 클릭으로만 추가, 드래그 없음 | |

**User's choice:** 드래그 + 클릭 병행

| Option | Description | Selected |
|--------|-------------|----------|
| 드래그로 재정렬 | 캔버스 내 필드 드래그 재정렬 | ✓ |
| 위/아래 화살표 버튼 | ↑↓ 버튼으로 순서 이동 | |

**User's choice:** 드래그로 재정렬

| Option | Description | Selected |
|--------|-------------|----------|
| 클릭 선택 + 툴바 | 필드 클릭 시 선택 + 툴바에 복제/삭제 | ✓ |
| 우클릭 컨텍스트 메뉴 | 필드 우클릭 시 액션 메뉴 | |

**User's choice:** 클릭 선택 + 툴바

---

## 드래그 앤 드롭 세부 UX

| Option | Description | Selected |
|--------|-------------|----------|
| 파란선 인디케이터 | 드롭 위치에 파란색 가로선 + 반투명 ghost | ✓ |
| 플레이스홀더 카드 | 드롭 위치에 점선 카드 표시 | |

**User's choice:** 파란선 인디케이터

| Option | Description | Selected |
|--------|-------------|----------|
| 좌측 그립 아이콘 | ⋮⋮ GripVertical 아이콘, hover 시 grab cursor | ✓ |
| 전체 카드 드래그 | 카드 어디든 잡아서 드래그 | |

**User's choice:** 좌측 그립 아이콘

---

## 속성 패널 설계

| Option | Description | Selected |
|--------|-------------|----------|
| 탭 그룹화 | 기본 + 검증 + 고급 탭 분리 | ✓ |
| 아코디언 섹션 | 접을 수 있는 섹션 | |
| 플랫 리스트 | 모든 설정 세로 나열 | |

**User's choice:** 탭 그룹화

| Option | Description | Selected |
|--------|-------------|----------|
| 인라인 직접 입력 | 속성 패널에서 value/label 직접 입력 + option_set 불러오기 | ✓ |
| 별도 옵션 관리 페이지 | 옵션 세트 전용 CRUD 페이지 | |
| 모달 팝업 관리 | 옵션 편집 모달 | |

**User's choice:** 인라인 직접 입력

| Option | Description | Selected |
|--------|-------------|----------|
| 속성 패널 내 칼럼 리스트 | 칼럼 추가/삭제/순서변경 + 칼럼별 속성 편집 | ✓ |
| 별도 모달로 칼럼 구성 | 모달에서 칼럼 CRUD | |

**User's choice:** 속성 패널 내 칼럼 리스트

---

## 템플릿 관리 페이지

| Option | Description | Selected |
|--------|-------------|----------|
| 테이블 목록 | 기존 Admin 테이블 패턴과 일관 | ✓ |
| 카드 그리드 | 템플릿별 카드 표시 | |

**User's choice:** 테이블 목록

| Option | Description | Selected |
|--------|-------------|----------|
| 이름/코드 입력 후 빌더 진입 | 모달에서 기본 정보 입력 → 빌더 이동 | ✓ |
| 빈 빌더에서 시작 | 바로 빌더로 이동 | |

**User's choice:** 이름/코드 입력 후 빌더 진입

| Option | Description | Selected |
|--------|-------------|----------|
| 기존 사이드바 하단 추가 | AdminSidebar navItems에 '양식 관리' 추가 | ✓ |
| 새 그룹으로 분리 | 사이드바에 구분선 + 양식 관리 섹션 | |

**User's choice:** 기존 사이드바 하단 추가

---

## 템플릿 저장/발행

| Option | Description | Selected |
|--------|-------------|----------|
| 즉시 저장 | 저장 버튼 클릭 시 바로 API 호출 | ✓ |
| 임시저장/발행 분리 | 로컬 임시저장 + 발행 버튼으로 API 저장 | |
| 자동 저장 + 발행 | debounce 자동 저장 + 발행 확인 | |

**User's choice:** 즉시 저장

| Option | Description | Selected |
|--------|-------------|----------|
| 확인 대화상자 | 비활성화 클릭 시 확인 모달 | ✓ |
| 토글 스위치 | 목록에서 토글 | |

**User's choice:** 확인 대화상자

---

## 빈 상태/에러 처리

| Option | Description | Selected |
|--------|-------------|----------|
| 안내 + 드래그 유도 | 안내 텍스트 + 점선 영역 | ✓ |
| 단순 빈 영역 | 빈 영역만 표시 | |

**User's choice:** 안내 + 드래그 유도

| Option | Description | Selected |
|--------|-------------|----------|
| 템플릿 전체 설정 | 미선택 시 이름/코드/설명/카테고리/아이콘 표시 | ✓ |
| 안내 메시지 | '필드를 선택하면 여기에 속성이 표시됩니다' | |

**User's choice:** 템플릿 전체 설정

---

## 필드 복제/타입 변경

| Option | Description | Selected |
|--------|-------------|----------|
| 복제 지원 | 툴바 복제 버튼, 새 nanoid + '(복사본)' 라벨 | ✓ |
| 복제 없음 | 팔레트에서만 추가 | |

**User's choice:** 복제 지원

| Option | Description | Selected |
|--------|-------------|----------|
| 타입 변경 없음 | 삭제 후 새 타입으로 추가 | ✓ |
| 타입 변경 지원 | 속성 패널에서 타입 드롭다운 변경 | |

**User's choice:** 타입 변경 없음

---

## 필드 너비 설정

| Option | Description | Selected |
|--------|-------------|----------|
| Phase 14에 포함 | 속성 패널 고급 탭에서 full/half 선택 | ✓ |
| 나중에 추가 | 모든 필드 full-width | |

**User's choice:** Phase 14에 포함

---

## JSON 가져오기/내보내기

| Option | Description | Selected |
|--------|-------------|----------|
| 내보내기만 포함 | JSON 다운로드만 | |
| 둘 다 포함 | 내보내기 + 가져오기(업로드 → 검증 → 적용) | ✓ |
| 둘 다 제외 | 나중에 추가 | |

**User's choice:** 둘 다 포함

---

## Claude's Discretion

- 캔버스 필드 카드 세부 스타일링
- 팔레트 필드 타입별 아이콘
- 속성 패널 탭 내부 배치
- 저장/프리뷰 상태 관리 방식
- 빌더 페이지 라우팅 URL 구조
- 에러 토스트 컴포넌트

## Deferred Ideas

- 옵션 세트 전용 관리 페이지
- 템플릿 복제 기능
- 카테고리별 필터링
- 멀티 필드 선택/일괄 삭제
- 조건부 로직 UI (Phase 15)
- 계산 필드 UI (Phase 15)

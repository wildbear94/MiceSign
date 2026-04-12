# Phase 24: 조건부 표시 규칙 UI - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-12
**Phase:** 24-조건부 표시 규칙 UI
**Areas discussed:** 규칙 편집 UI 배치, 조건 설정 인터랙션, 미리보기 연동 방식, 필드 삭제 시 규칙 정리, 유효성 검사, i18n 키 설계, 타입 정의 확장

---

## 규칙 편집 UI 배치

| Option | Description | Selected |
|--------|-------------|----------|
| FieldConfigEditor 탭 추가 | 기존 필드 설정 영역에 '조건' 탭 추가 | ✓ (초기) |
| 별도 조건 패널 | 필드 목록 아래/사이드에 전체 조건 규칙 패널 | |
| 필드카드 하단 인라인 | 각 필드카드 아래에 조건 요약 표시 | |

**User's choice:** FieldConfigEditor 탭 추가 → 이후 **설정 아래 접기/펼치기 섹션으로 변경**
**Notes:** Phase 23의 테이블 컬럼 설정과 동일한 접기/펼치기 패턴을 원함

### 탭 전환 UI 구성

| Option | Description | Selected |
|--------|-------------|----------|
| 기본/조건 2개 탭 | 2개 탭으로 구분 | ✓ (초기) |
| 설정 아래 접기/펼치기 섹션 | 기본 설정 아래에 접기/펼치기 추가 | ✓ (최종) |
| Claude 재량 | | |

**User's choice:** 설정 아래 접기/펼치기 섹션 (재논의 후 변경)

### 필드당 규칙 수

| Option | Description | Selected |
|--------|-------------|----------|
| 1개만 | 필드당 조건 규칙 1개만 허용 | ✓ |
| 복수 규칙 (AND) | 여러 규칙 AND 조합 | |
| 복수 규칙 (AND/OR) | AND/OR 조합 | |

**User's choice:** 1개만

### 빈 상태 표시

| Option | Description | Selected |
|--------|-------------|----------|
| 안내 + 추가 버튼 | 안내 문구와 추가 버튼 | ✓ |
| 조건 필드 즉시 표시 | 바로 IF-THEN 입력 필드 표시 | |

**User's choice:** 안내 + 추가 버튼

### 타겟 제외 필드 타입

| Option | Description | Selected |
|--------|-------------|----------|
| staticText, hidden 제외 | 고정/숨김 필드 제외 | ✓ |
| table도 제외 | 테이블도 제외 | |
| 제외 없음 | 모든 타입 허용 | |

**User's choice:** staticText, hidden 제외

### 소스 필드 타입

| Option | Description | Selected |
|--------|-------------|----------|
| text, number, date, select | 비교 가능한 필드만 | ✓ |
| 입력 가능한 모든 필드 | textarea, table 포함 | |

**User's choice:** text, number, date, select

### 규칙 존재 시각적 표시

| Option | Description | Selected |
|--------|-------------|----------|
| 아이콘 배지 | 필드카드 헤더에 아이콘 표시 | ✓ |
| 표시 없음 | | |
| 텍스트 레이블 | | |

**User's choice:** 아이콘 배지

---

## 조건 설정 인터랙션

### IF-THEN 규칙 입력 UI

| Option | Description | Selected |
|--------|-------------|----------|
| 드롭다운 조합 | IF [필드] [연산자] [값] THEN [액션] | ✓ |
| 자연어 스타일 | 레이블로 연결된 드롭다운 | |

**User's choice:** 드롭다운 조합

### 연산자 필터링

| Option | Description | Selected |
|--------|-------------|----------|
| 타입별 필터링 | 소스 타입에 맞는 연산자만 표시 | ✓ |
| 전체 노출 | 10개 모두 표시 | |

**User's choice:** 타입별 필터링

### 연산자/액션 언어

| Option | Description | Selected |
|--------|-------------|----------|
| 한국어 레이블 | eq='값이 같음' 등 | ✓ |
| 영어 코드 그대로 | eq, neq 등 | |

**User's choice:** 한국어 레이블

### select 타입 값 입력

| Option | Description | Selected |
|--------|-------------|----------|
| 옵션 드롭다운 | 소스 필드의 옵션 목록 표시 | ✓ |
| 자유 텍스트 입력 | | |

**User's choice:** 옵션 드롭다운

### in/notIn 복수 값 입력

| Option | Description | Selected |
|--------|-------------|----------|
| 체크박스 목록 | select 옵션을 체크박스로 복수 선택 | ✓ |
| 태그 입력 | 값 입력 시 태그로 추가 | |

**User's choice:** 체크박스 목록

### 자기참조

| Option | Description | Selected |
|--------|-------------|----------|
| 자기참조 차단 | IF 드롭다운에서 현재 필드 제외 | ✓ |
| 자기참조 허용 | | |

**User's choice:** 자기참조 차단

### 순환 참조

| Option | Description | Selected |
|--------|-------------|----------|
| 설정 시 차단 | 순환이 발생하는 필드를 드롭다운에서 제외 | ✓ |
| 경고 표시 | 경고만 표시, 설정 허용 | |

**User's choice:** 설정 시 차단

### 규칙 삭제

| Option | Description | Selected |
|--------|-------------|----------|
| 즉시 삭제 | 확인 없이 즉시 제거 | ✓ |
| 확인 다이얼로그 | | |

**User's choice:** 즉시 삭제

### 데이터 관리 위치

| Option | Description | Selected |
|--------|-------------|----------|
| 중앙 배열 유지 | conditionalRules[]에서 관리, UI에서 필터링 | ✓ |
| 필드별 내장 | SchemaField에 속성 추가 | |

**User's choice:** 중앙 배열 유지

---

## 미리보기 연동 방식

### 미리보기 동작

| Option | Description | Selected |
|--------|-------------|----------|
| 입력 가능 미리보기 | 모든 필드에 값 입력 가능, 조건 실시간 확인 | ✓ |
| 시뮬레이션 버튼 | 별도 모달에서 값 설정 후 결과 확인 | |
| 시각적 표시만 | 조건 대상 필드에 배지만 표시 | |

**User's choice:** 입력 가능 미리보기

### 전환 효과

| Option | Description | Selected |
|--------|-------------|----------|
| 즉시 전환 | 애니메이션 없이 즉시 표시/숨김 | ✓ |
| 페이드 애니메이션 | 부드러운 전환 효과 | |

**User's choice:** 즉시 전환

### 필수 표시

| Option | Description | Selected |
|--------|-------------|----------|
| * 표시 추가 | require 충족 시 빨간 * 표시 | ✓ |
| 별도 아이콘 + 텍스트 | '조건부 필수' 레이블 | |

**User's choice:** * 표시 추가

### 미리보기 입력 범위

| Option | Description | Selected |
|--------|-------------|----------|
| 모든 필드 입력 가능 | 조건 소스 외 모든 필드도 입력 가능 | ✓ |
| 조건 소스 필드만 | IF 필드만 입력 가능 | |

**User's choice:** 모든 필드 입력 가능

### 미리보기 초기 상태

| Option | Description | Selected |
|--------|-------------|----------|
| 모두 표시 (초기값) | 조건 미충족으로 모든 필드 기본 표시 | ✓ |
| 조건 평가 후 표시 | isEmpty 등 조건만 동작 | |

**User's choice:** 모두 표시

### 초기화 버튼

| Option | Description | Selected |
|--------|-------------|----------|
| 초기화 버튼 추가 | 모든 입력값 리셋 버튼 | ✓ |
| 필요 없음 | | |

**User's choice:** 초기화 버튼 추가

---

## 필드 삭제 시 규칙 정리

### 삭제 시 처리

| Option | Description | Selected |
|--------|-------------|----------|
| 자동 삭제 + 토스트 | 관련 규칙 자동 제거, 토스트 알림 | ✓ |
| 삭제 전 확인 다이얼로그 | 확인 후 삭제 | |
| 경고 표시 + 수동 정리 | 경고만, 규칙은 유지 | |

**User's choice:** 자동 삭제 + 토스트

### 양방향 정리

| Option | Description | Selected |
|--------|-------------|----------|
| 둘 다 정리 | 타겟이든 소스든 모두 제거 | ✓ |
| 소스만 정리 | | |

**User's choice:** 둘 다 정리

### 토스트 상세

| Option | Description | Selected |
|--------|-------------|----------|
| 개수만 표시 | '조건 규칙 N개 자동 제거' | ✓ |
| 상세 정보 표시 | 어떤 규칙이 제거되었는지 표시 | |

**User's choice:** 개수만 표시

### 라벨 변경 영향

| Option | Description | Selected |
|--------|-------------|----------|
| 영향 없음 | ID 기반 참조이므로 무관 | ✓ |
| 라벨 변경 시 알림 | | |

**User's choice:** 영향 없음

### 타입 변경 시

| Option | Description | Selected |
|--------|-------------|----------|
| 규칙 자동 제거 + 토스트 | 호환성 문제 방지를 위해 안전하게 제거 | ✓ |
| 타입 호환 시 유지 | 호환되는 변경은 유지 | |

**User's choice:** 규칙 자동 제거 + 토스트

---

## 유효성 검사

| Option | Description | Selected |
|--------|-------------|----------|
| 프론트엔드만 | 저장 시 프론트에서 검증 | ✓ |
| 프론트 + 백엔드 | 양쪽에서 검증 | |

**User's choice:** 프론트엔드만

| Option | Description | Selected |
|--------|-------------|----------|
| 토스트 + 저장 차단 | 에러 토스트 표시, 저장 불가 | ✓ |
| 경고 표시 + 저장 허용 | | |

**User's choice:** 토스트 + 저장 차단

## i18n 키 설계

| Option | Description | Selected |
|--------|-------------|----------|
| templates.condition.* | admin 네임스페이스 내 기존 패턴 유지 | ✓ |
| condition.* 별도 네임스페이스 | 별도 파일 분리 | |

**User's choice:** templates.condition.*

## 타입 정의 확장

| Option | Description | Selected |
|--------|-------------|----------|
| dynamicForm.ts 재사용 | ConditionalRule import, 추가 타입만 types.ts에 | ✓ |
| 별도 타입 정의 | 편집용 타입 새로 정의 | |

**User's choice:** dynamicForm.ts 재사용

---

## Claude's Discretion

- 접기/펼치기 섹션 Tailwind 스타일링
- 드롭다운 구체적 구현 방식
- 아이콘 배지 선택
- 안내 문구 한국어 텍스트
- 미리보기 초기화 버튼 위치/스타일

## Deferred Ideas

None

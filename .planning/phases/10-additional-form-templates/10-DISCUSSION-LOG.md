# Phase 10: Additional Form Templates - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-03
**Phase:** 10-additional-form-templates
**Areas discussed:** 구매요청서 필드 구성, 출장보고서 필드 구성, 연장근무신청서 필드 구성, 백엔드 Validator 리팩토링

---

## 구매요청서 필드 구성

### Q1: 품목 테이블 외 추가 필드

| Option | Description | Selected |
|--------|-------------|----------|
| 납품업체/납기일 (권장) | 구매처(납품업체명) + 희망 납품일. 한국 기업 구매요청서 표준 필드 | ✓ |
| 결제조건/결제방법 | 법인카드/계좌이체/현금 등 결제 방식 선택. 경리팀 필수 정보 | ✓ |
| 구매 사유/용도 | 왜 구매하는지 텍스트 입력. 결재자가 판단하는 핵심 정보 | ✓ |
| 최소한만 (Claude 재량) | 품목 테이블 + 합계 + 첨부만으로 간결하게 | |

**User's choice:** 납품업체/납기일, 결제조건/결제방법, 구매 사유/용도 (3개 모두 선택)
**Notes:** 없음

### Q2: 품목 테이블 구조

| Option | Description | Selected |
|--------|-------------|----------|
| 동일 구조 재사용 (권장) | 품목명/수량/단가/금액 동일. ExpenseForm 코드와 유틸 최대 공유 가능 | |
| 확장 구조 | 규격/사양 컬럼 추가. 품목별 더 상세한 정보 입력 가능 | ✓ |
| Claude 재량 | PRD와 한국 기업 표준을 참고해서 Claude가 적절히 판단 | |

**User's choice:** 확장 구조
**Notes:** 없음

---

## 출장보고서 필드 구성

### Q1: 일정표(itinerary) 구성

| Option | Description | Selected |
|--------|-------------|----------|
| 날짜별 테이블 (권장) | 날짜/장소/일정내용 행 추가 가능한 테이블. 다일 출장에도 대응 가능 | ✓ |
| 시작일/종료일 + 텍스트 | 출장 기간만 date picker로, 상세 일정은 텍스트 입력. 더 단순 | |
| Claude 재량 | 한국 기업 출장보고서 표준을 참고해서 판단 | |

**User's choice:** 날짜별 테이블 (권장)
**Notes:** 없음

### Q2: 경비 내역 테이블 포함 여부

| Option | Description | Selected |
|--------|-------------|----------|
| 포함 (권장) | 교통비/숙박비/식비/기타 항목별 금액 테이블 + 합계. 지출결의서 테이블 패턴 재사용 | ✓ |
| 제외 | 출장 경비는 별도 지출결의서로 처리. 보고서는 일정/결과만 담는다 | |
| Claude 재량 | 학습된 한국 기업 패턴을 바탕으로 판단 | |

**User's choice:** 포함 (권장)
**Notes:** 없음

### Q3: 출장 목적/결과 입력 방식

| Option | Description | Selected |
|--------|-------------|----------|
| Rich Text (Tiptap) | GeneralForm처럼 Tiptap 에디터 사용. 상세한 보고서 작성 가능 | |
| Plain textarea (권장) | 단순 텍스트 영역. 출장보고서는 간결한 요약이 일반적 | ✓ |
| Claude 재량 | 양식 특성에 맞게 판단 | |

**User's choice:** Plain textarea (권장)
**Notes:** 없음

---

## 연장근무신청서 필드 구성

### Q1: 관리자 선택 처리

| Option | Description | Selected |
|--------|-------------|----------|
| 결재선으로 대체 (권장) | MiceSign은 이미 결재선 선택 UI가 있음. 별도 관리자 필드 없이 결재선에 직속상관을 지정하는 방식 | ✓ |
| 별도 관리자 필드 | 양식 내에 조직도 피커로 관리자를 선택하는 필드 추가. 결재선과 별개 | |
| Claude 재량 | 기존 시스템 패턴에 맞게 판단 | |

**User's choice:** 결재선으로 대체 (권장)
**Notes:** 없음

### Q2: 근무시간 입력 방식

| Option | Description | Selected |
|--------|-------------|----------|
| 시작/종료 시간 (권장) | 시작시간/종료시간 입력 → 연장근무 시간 자동계산. 정확한 근무시간 기록 | ✓ |
| 시간 수 직접 입력 | 연장근무 시간을 숫자로 직접 입력 (ex: 3시간). 더 단순 | |
| Claude 재량 | 일반적인 한국 기업 패턴에 맞게 판단 | |

**User's choice:** 시작/종료 시간 (권장)
**Notes:** 없음

### Q3: 연장근무 날짜 입력

| Option | Description | Selected |
|--------|-------------|----------|
| 단일 날짜만 (권장) | 하루씩 신청. 여러 날이면 별도 문서 작성. 단순하고 관리 용이 | ✓ |
| 복수 날짜 지원 | 한 문서에 여러 날짜의 연장근무를 일괄 신청 가능 | |
| Claude 재량 | 한국 기업 패턴에 맞게 판단 | |

**User's choice:** 단일 날짜만 (권장)
**Notes:** 없음

---

## 백엔드 Validator 리팩토링

### Q1: Strategy 패턴 전환 여부

| Option | Description | Selected |
|--------|-------------|----------|
| Strategy 패턴 (권장) | FormValidationStrategy 인터페이스 + 템플릿별 구현체. 새 양식 추가 시 클래스만 추가하면 됨. OCP 준수 | ✓ |
| switch/case 유지 | 현재 구조에 3개 case만 추가. 6개면 아직 관리 가능. 단순함 유지 | |
| Claude 재량 | 코드 복잡도와 확장성을 고려해서 판단 | |

**User's choice:** Strategy 패턴 (권장)
**Notes:** 없음

---

## Claude's Discretion

- 각 양식의 세부 UI 레이아웃 및 spacing
- Zod 스키마 세부 유효성 검사 규칙
- 시간 입력 컴포넌트 구현 방식
- 경비 카테고리 목록
- 테이블 공통 컴포넌트 추출 여부

## Deferred Ideas

None — discussion stayed within phase scope

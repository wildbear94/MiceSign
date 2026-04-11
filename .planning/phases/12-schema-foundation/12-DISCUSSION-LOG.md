# Phase 12: Schema Foundation - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-05
**Phase:** 12-schema-foundation
**Areas discussed:** JSON 스키마 포맷 설계, 버전 관리 전략, 백엔드 검증 방식, DB 마이그레이션 설계, Select 필드 옵션 관리

---

## JSON 스키마 포맷 설계

### 필드 ID 체계

| Option | Description | Selected |
|--------|-------------|----------|
| 자동 UUID (추천) | nanoid/UUID 자동 생성. 필드 이동/복사 시 충돌 없음. form_data에서 key로 사용 | ✓ |
| 사용자 지정 슬러그 | Admin이 직접 이름 지정 (e.g., 'total_amount'). 의미 명확하지만 충돌/변경 관리 필요 | |
| 순번 기반 (field_1, field_2) | 단순하지만 필드 삭제/재배치 시 기존 데이터와 매핑이 깨질 수 있음 | |

**User's choice:** 자동 UUID
**Notes:** —

### conditionalRules/calculationRules 포함 범위

| Option | Description | Selected |
|--------|-------------|----------|
| 구조만 예약 (추천) | Phase 12에서는 빈 배열로 자리만 확보. 실제 로직은 Phase 15에서 | ✓ |
| Phase 12에서 구현 | 스키마 정의 + 백엔드 검증까지 함께. 스키마 변경 없이 바로 사용 가능 | |
| Phase 12에서 제외 | 스키마에 해당 필드 자체를 안 넣음. Phase 15에서 스키마 확장 필요 | |

**User's choice:** 구조만 예약
**Notes:** —

### table 필드 칼럼 정의

| Option | Description | Selected |
|--------|-------------|----------|
| 중첩 필드 정의 (추천) | table config 안에 columns 배열, 각 column은 동일한 필드 정의 구조 재사용 | ✓ |
| 단순 문자열 칼럼 | 칼럼은 이름과 타입만 가진 단순 객체. 필드 정의와 분리된 별도 구조 | |

**User's choice:** 중첩 필드 정의
**Notes:** —

### 특수 필드 (staticText, hidden)

| Option | Description | Selected |
|--------|-------------|----------|
| 동일 필드 구조 (추천) | 8개 필드 타입 모두 { id, type, label, config } 구조. type-specific 설정은 config에 | ✓ |
| 별도 카테고리 분리 | inputFields와 displayFields를 분리. 입력 불가능한 필드는 별도 배열 | |

**User's choice:** 동일 필드 구조
**Notes:** —

---

## 버전 관리 전략

### 스키마 버전 저장 방식

| Option | Description | Selected |
|--------|-------------|----------|
| 별도 버전 테이블 (추천) | template_schema_version 테이블에 모�� 버전 이력 보존. approval_template에는 최신만 | ✓ |
| approval_template에 인라인 | 별도 테이블 없이 덮어쓰고 document_content snapshot으로만 이력 보존 | |

**User's choice:** 별도 버전 테이블
**Notes:** —

### 스키마 스냅�� 시점

| Option | Description | Selected |
|--------|-------------|----------|
| 상신(Submit) 시 (추천) | DRAFT에서는 항상 최신 ���키마로 렌더링. 상신 시점에 잠금 | |
| 문서 생성(Draft) 시 | 초안 생성 시점에 스냅샷. 상신 전 스키마 변경에도 초안 경험 보호 | ✓ |

**User's choice:** 문서 생성(Draft) 시
**Notes:** 추천과 다른 선택. 초안 작성 중 스키마가 변경되어도 사용자 경험이 깨지지 않는 것을 우선시

### 스키마 변경 시 확인

| Option | Description | Selected |
|--------|-------------|----------|
| 자동 버전 증가 (추천) | 저장 시 자동 version+1. 추가 확인 없음 | ✓ |
| 확인 다이얼로그 | 기존 문서 수 경고 표시 후 저장 | |

**User's choice:** 자동 버전 증가
**Notes:** —

---

## 백엔드 검증 방식

### 검증 구현 방식

| Option | Description | Selected |
|--------|-------------|----------|
| 순수 Java 필드별 검증 (추천) | fields 배열 순회하며 타입/필수/min/max 직접 검증. 외부 라이브러리 불필요 | ✓ |
| json-schema-validator 라이브러리 | com.networknt:json-schema-validator. 커스텀→Draft 7 변환 레이어 필요 | |

**User's choice:** 순수 Java 필드별 검증
**Notes:** —

### DocumentFormValidator 통합 방식

| Option | Description | Selected |
|--------|-------------|----------|
| Fallback 패턴 (추천) | Strategy Map에 없는 templateCode → DynamicFormValidator로 fallback | ✓ |
| 통합 Strategy | DynamicFormValidator도 FormValidationStrategy 구현, 와일드카드 등록 | |

**User's choice:** Fallback 패턴
**Notes:** —

### 검증 오류 응답 형식

| Option | Description | Selected |
|--------|-------------|----------|
| 필드ID 기반 오류 맵 (추천) | {fieldId: ["오류 메시지"]} 맵. 프론트엔드 인라인 오류 표시 용이 | ✓ |
| 배열 기반 ��류 리스트 | [{field, message}] 형태. 범용적이지만 필드 매칭에 O(n) | |

**User's choice:** 필드ID 기반 오류 맵
**Notes:** —

---

## DB 마이그레이션 설계

### approval_template 확장 범위

| Option | Description | Selected |
|--------|-------------|----------|
| 필수 칼���만 | schema_definition, schema_version, is_custom 3개만 | |
| 리서치 권장 칼럼 전체 | 위 3개 + category, icon, created_by 추가 | ✓ |

**User's choice:** 리서치 권장 칼럼 전체
**Notes:** —

### document_content 확장 범위

| Option | Description | Selected |
|--------|-------------|----------|
| 스냅샷 + 버전 (추천) | schema_definition_snapshot(JSON NULL) + schema_version(INT NULL) | ✓ |
| 버전 번호만 | schema_version만. 렌더링 시 template_schema_version 테이블 JOIN 필요 | |

**User's choice:** 스냅샷 + 버전
**Notes:** —

### 템플릿 CRUD API 권한

| Option | Description | Selected |
|--------|-------------|----------|
| ADMIN + SUPER_ADMIN (추천) | 기존 조직 관리와 동일한 권한 체계 | ✓ |
| SUPER_ADMIN만 | 최고 권한만 접근 가능 | |

**User's choice:** ADMIN + SUPER_ADMIN
**Notes:** —

---

## Select 필드 옵션 관리

### 옵션 저장 위치

| Option | Description | Selected |
|--------|-------------|----------|
| 스키마 인라인 | 필드 config 안에 options 배열로 직접 저장. 단순하고 버전 관리와 통합 | |
| 별도 옵션 테이블 | DB에 option_set + option_item 테이블. 여러 템플릿에서 공유 가능 | ✓ |

**User's choice:** 별도 옵션 테이블
**Notes:** —

### 옵션 테이블 범위

| Option | Description | Selected |
|--------|-------------|----------|
| 공유 옵션 세트 | 독립적 옵션 세트를 여러 템플릿에서 참조 | ✓ |
| 필드별 ���션 저장 | 각 필드에 속한 옵션을 별도 테이블에 저장. 공유 없음 | |

**User's choice:** 공유 옵션 세트
**Notes:** —

### 옵션 변경과 기존 문서

| Option | Description | Selected |
|--------|-------------|----------|
| 영향 없음 (추천) | 스키마 스냅샷에 옵션도 보존. 제출된 문서는 원래 옵션으로 표시 | ✓ |
| 항상 최신 반영 | 문서 조회 시 현재 옵션 테이블에서 label 조회 | |

**User's choice:** 영향 없음
**Notes:** —

---

## Claude's Discretion

- API 엔드포인트 세부 설계
- Flyway 마이그레이션 파일 번호 �� 순서
- DynamicFormValidator 내부 로직
- nanoid 길이 및 생성 방식
- option_set/option_item 테이블 세부 칼럼

## Deferred Ideas

- 옵션 세트 관리 UI — Phase 14(Builder UI)
- leave_type → option_set 마이그레이션 — Phase 16(Template Migration)
- 필드 validation 규칙 확장 (regex 등) — 필요시 별도 phase

# Phase 26: 편의 기능 - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-13
**Phase:** 26-convenience-features
**Areas discussed:** 복제 UX & 중복 처리, JSON export 포맷 & import 검증, 프리셋 템플릿 출처 & 선택 UI, 백엔드 API 전략

---

## 영역 선택

| Option | Description | Selected |
|--------|-------------|----------|
| 복제 UX & 중복 처리 | 복제 버튼 위치, 이름/prefix 규칙, code 중복 회피 | ✓ |
| JSON export 포맷 & import 검증 | 내보내기 범위, 파일명, Zod 검증 방식, 충돌 처리 | ✓ |
| 프리셋 템플릿 출처 & 선택 UI | 저장 위치, 종류, 노출 UI | ✓ |
| 백엔드 API 전략 | 신규 엔드포인트 여부, code 생성 책임 | ✓ |

**사용자 선택:** 4개 영역 모두 선택

---

## 복제 UX & 중복 처리

### 복제 버튼 위치
| Option | Description | Selected |
|--------|-------------|----------|
| 행 액션 아이콘 | TemplateTable 각 행에 Edit 아이콘 옆 Copy 아이콘 추가 | ✓ |
| 드롭다운 메뉴 | 행 꼬리에 ... 메뉴로 복제/내보내기/삭제 통합 | |
| 편집 모달 내부 버튼 | TemplateFormModal 상단에 "복제하여 새 양식" 버튼 | |

**사용자 선택:** 행 액션 아이콘 (추천)

### 복제 시 이름/prefix 처리
| Option | Description | Selected |
|--------|-------------|----------|
| 자동 복제본 이름 + 모달 열기 | name에 "(복사본)" 자동 suffix, prefix 비우고 생성 모달 열기 | ✓ |
| 즉시 복제, 자동 증분 | 모달 없이 바로 복제, prefix 자동 숫자 suffix | |
| 복제 전 이름/prefix prompt | 작은 확인 모달에서 입력 후 바로 생성 | |

**사용자 선택:** 자동 복제본 이름 + 모달 열기 (추천)

---

## JSON Export & Import

### Export JSON 범위
| Option | Description | Selected |
|--------|-------------|----------|
| 메타데이터 포함 | name/description/prefix/category/icon/schemaDefinition/schemaVersion/exportFormatVersion, code/id 제외 | ✓ |
| schema만 (portable) | schemaDefinition + exportFormatVersion만 | |

**사용자 선택:** 메타데이터 포함 (추천)

### Import 검증 방식
| Option | Description | Selected |
|--------|-------------|----------|
| 전용 Zod 스키마 작성 | SchemaDefinition 구조를 검증하는 새 Zod 스키마 작성 | ✓ |
| 백엔드에 맡기기 | FE는 바이트 전송, BE가 record 역직렬화로 검증 | |

**사용자 선택:** 전용 Zod 스키마 작성 (추천)

### Prefix 충돌 처리
| Option | Description | Selected |
|--------|-------------|----------|
| 모달에서 사용자가 수정 | prefix 비운 상태로 모달 열고, 저장 시 백엔드 409 → 인라인 에러 | ✓ |
| 자동 숫자 접미사 | EXP → EXP2, EXP3... 자동 생성 | |

**사용자 선택:** 모달에서 사용자가 수정 (추천)

---

## 프리셋 템플릿

### 프리셋 JSON 저장 위치
| Option | Description | Selected |
|--------|-------------|----------|
| Frontend assets | frontend/src/features/admin/presets/*.json | ✓ |
| Backend seed | DB에 isActive=false 상태로 시드 | |
| Public 정적 파일 | frontend/public/presets/*.json | |

**사용자 선택:** Frontend assets (추천)

### 초기 프리셋 종류 (multi-select)
| Option | Description | Selected |
|--------|-------------|----------|
| 경비신청서 | 경비 항목 + 금액 테이블 + SUM 계산 | ✓ |
| 휴가신청서 | 휴가 종류 select, 시작/종료일, 일수 계산 | ✓ |
| 출장신청서 | 출장지/기간/목적/동행자 테이블 | ✓ |
| 구매신청서 | 구매 품목 테이블 + 금액 자동 계산 | ✓ |

**사용자 선택:** 4종 모두 포함

### 프리셋 선택 UI
| Option | Description | Selected |
|--------|-------------|----------|
| "양식 추가" 클릭 시 선택 모달 | 먼저 빈양식/프리셋/Import 선택, 프리셋 선택 시 카드 갤러리 | ✓ |
| 상단 분리된 버튼 | 페이지 상단에 3개 버튼 나란히 | |
| 드롭다운 버튼 | "양식 추가 ▼" 드롭다운에 3개 옵션 | |

**사용자 선택:** "양식 추가" 클릭 시 선택 모달 (추천)

---

## 백엔드 API 전략

### 복제 API 방식
| Option | Description | Selected |
|--------|-------------|----------|
| 프론트 re-create | GET detail → 모달 프리필 → 기존 POST 재사용 | ✓ |
| 전용 엔드포인트 | POST /admin/templates/{id}/duplicate 추가 | |

**사용자 선택:** 프론트 re-create (추천)

### Export/Import API 방식
| Option | Description | Selected |
|--------|-------------|----------|
| 전적으로 프론트 | Export: GET detail + Blob download. Import: Zod + POST. 백엔드 변경 0 | ✓ |
| Export만 전용 엔드포인트 | GET /admin/templates/{id}/export | |
| 둘 다 전용 엔드포인트 | Export/Import 전용 API 추가 | |

**사용자 선택:** 전적으로 프론트 (추천)

### code 필드 고유성 책임
| Option | Description | Selected |
|--------|-------------|----------|
| 백엔드가 prefix에서 파생 | 기존 create 로직(CUSTOM_<nanoid>) 재사용, FE는 code 관여 안 함 | ✓ |
| 프론트에서 code 생성 후 전송 | prefix + 순번 조합 | |

**사용자 선택:** 백엔드가 파생 (추천). 실제 구현은 prefix 파생이 아닌 `CUSTOM_<nanoid>` (TemplateService.java:179)이지만, "백엔드 책임" 원칙은 동일.

---

## Claude's Discretion

- 아이콘 선택 (lucide 아이콘 셋 내에서)
- 프리셋 4종의 구체적 필드 구성
- 선택 모달 레이아웃 (3카드 그리드 vs 세로 리스트)
- i18n 키 이름 및 영어 번역
- Import 오류 메시지 한국어 문구

## Deferred Ideas

- 양식 버전 관리 / 이력 복원
- 프리셋 마켓플레이스 / 사용자 업로드 공유
- 백엔드 프리셋 seed
- Bulk export (전체 템플릿 ZIP)
- 양식 vs 양식 diff 기능

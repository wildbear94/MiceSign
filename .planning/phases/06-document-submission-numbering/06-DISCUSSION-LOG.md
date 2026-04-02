# Phase 6: Document Submission & Numbering - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-02
**Phase:** 06-document-submission-numbering
**Areas discussed:** 제출 플로우 UX, 문서 잠금 & 불변성, 문서번호 채번 전략, 제출 전 검증 규칙

---

## 제출 플로우 UX

### 제출 버튼 위치

| Option | Description | Selected |
|--------|-------------|----------|
| 편집기 상단 헤더 (추천) | 저장 버튼 옆에 '제출' 버튼 추가. 현재 DocumentEditorPage에 저장 버튼이 있어 일관성 있음 | ✓ |
| 페이지 하단 고정 | 페이지 맨 아래에 제출 버튼을 sticky로 배치 | |
| 저장 후 상세페이지에서 | 임시저장 후 DocumentDetailPage에서 제출 버튼 노출 (DRAFT 상태일 때만) | |

**User's choice:** 편집기 상단 헤더 (추천)
**Notes:** None

### 제출 확인 다이얼로그

| Option | Description | Selected |
|--------|-------------|----------|
| 확인 다이얼로그 (추천) | '제출 후 수정할 수 없습니다' 경고와 함께 확인/취소 선택. 불변성 정책상 실수 방지 중요 | ✓ |
| 확인 없이 즉시 제출 | 버튼 클릭 즉시 제출 처리. 빠르지만 실수 위험 | |
| 2단계 버튼 | 첫 클릭으로 '정말 제출?' 표시, 두 번째 클릭으로 제출 실행 | |

**User's choice:** 확인 다이얼로그 (추천)
**Notes:** None

### 제출 후 이동

| Option | Description | Selected |
|--------|-------------|----------|
| 문서 상세페이지 (추천) | 제출된 문서의 상세페이지로 이동. 채번된 문서번호와 제출 상태 확인 가능 | ✓ |
| 문서 목록으로 | 내 문서 목록 페이지로 돌아가며 성공 메시지 표시 | |
| 성공 메시지 후 선택 | 성공 화면에서 '문서 보기' / '목록으로' 선택지 제공 | |

**User's choice:** 문서 상세페이지 (추천)
**Notes:** None

---

## 문서 잠금 & 불변성

### 잠금 UI 처리

| Option | Description | Selected |
|--------|-------------|----------|
| 읽기전용 뷰 전환 (추천) | Phase 4 D-16 패턴 유지: DRAFT이 아니면 읽기전용 뷰 렌더링. 편집 컴포넌트 자체가 로드되지 않음 | ✓ |
| 편집기 disabled | 편집기는 로드하되 모든 필드를 disabled 처리. 레이아웃은 동일하나 수정 불가 | |
| You decide | Claude 재량으로 구현 방식 결정 | |

**User's choice:** 읽기전용 뷰 전환 (추천)
**Notes:** None

### Drive 폴더 이동

| Option | Description | Selected |
|--------|-------------|----------|
| 제출 시 이동 (추천) | drafts/{docId}/ → MiceSign/{year}/{month}/{docNumber}/ 로 제출 트랜잭션 내에서 이동. Phase 5 설계와 일치 | ✓ |
| 이동 없이 유지 | 파일은 원래 폴더에 그대로 두고 DB 메타데이터만 관리. 더 단순하지만 폴더 구조가 어질러움 | |
| You decide | Claude 재량으로 처리 방식 결정 | |

**User's choice:** 제출 시 이동 (추천)
**Notes:** None

### 수정 차단 응답

| Option | Description | Selected |
|--------|-------------|----------|
| 403 + 에러 메시지 (추천) | '제출된 문서는 수정할 수 없습니다' 에러 코드 반환. 기존 DOC_NOT_DRAFT 패턴 확장 | ✓ |
| 400 Bad Request | 상태 검증 실패로 400 반환 | |
| You decide | Claude 재량으로 에러 코드/상태코드 결정 | |

**User's choice:** 403 + 에러 메시지 (추천)
**Notes:** None

---

## 문서번호 채번 전략

### Prefix 결정 방식

| Option | Description | Selected |
|--------|-------------|----------|
| 템플릿 코드 사용 (추천) | approval_template.prefix 칼럼 활용. 예: GEN-2026-0001, EXP-2026-0001, LEV-2026-0001. PRD 스펙 일치 | ✓ |
| 통합 번호 | 템플릿 무관하게 단일 시퀀스. 예: DOC-2026-0001. 더 단순하지만 템플릿별 구분 불가 | |
| 부서 코드 포함 | 예: DEV-GEN-2026-0001 (부서+템플릿). 더 상세하지만 복잡도 증가 | |

**User's choice:** 템플릿 코드 사용 (추천)
**Notes:** None

### 동시성 제어

| Option | Description | Selected |
|--------|-------------|----------|
| DB 락 (추천) | SELECT FOR UPDATE 또는 DB-level 락으로 doc_sequence 행 잠금. MariaDB에서 안정적이고 ~50명 규모에 충분 | ✓ |
| Optimistic Lock + 재시도 | version 칼럼으로 낙관적 락. 충돌 시 재시도. 성능 좋지만 구현 복잡 | |
| You decide | Claude 재량으로 최적 동시성 제어 방법 결정 | |

**User's choice:** DB 락 (추천)
**Notes:** None

### 번호 표시 위치

| Option | Description | Selected |
|--------|-------------|----------|
| 상세 + 목록 모두 (추천) | 문서 상세페이지 상단에 표시 + 목록 테이블에 칼럼 추가. DRAFT는 '-' 또는 '미발급' 표시 | ✓ |
| 상세페이지만 | 문서 상세페이지에만 표시. 목록은 기존 칼럼 유지 | |
| You decide | Claude 재량으로 표시 위치 결정 | |

**User's choice:** 상세 + 목록 모두 (추천)
**Notes:** None

---

## 제출 전 검증 규칙

### 결재선 요구 여부

| Option | Description | Selected |
|--------|-------------|----------|
| 결재선 없이 제출 허용 (추천) | Phase 6에서는 제출+채번+잠금만 구현. 결재선 검증은 Phase 7에서 추가. 단계적 구현 | ✓ |
| 결재선 필수 검증 | 제출 시 결재선이 없으면 제출 차단. Phase 7 완료 전까지 제출 불가능해짐 | |
| You decide | Claude 재량으로 페이즈 간 의존성 처리 결정 | |

**User's choice:** 결재선 없이 제출 허용 (추천)
**Notes:** None

### 검증 위치

| Option | Description | Selected |
|--------|-------------|----------|
| 프론트 + 백엔드 이중 (추천) | 프론트엔드에서 실시간 검증 + 백엔드에서 최종 검증. Phase 4 D-19 이중 검증 패턴 유지 | ✓ |
| 백엔드만 | 백엔드에서만 검증. 에러 시 프론트에 메시지 표시 | |
| You decide | Claude 재량으로 검증 전략 결정 | |

**User's choice:** 프론트 + 백엔드 이중 (추천)
**Notes:** None

### 실패 안내 방식

| Option | Description | Selected |
|--------|-------------|----------|
| 확인 다이얼로그에 에러 표시 (추천) | 제출 확인 다이얼로그 내에 검증 에러 목록 표시. 수정 후 다시 제출 시도 가능 | ✓ |
| 인라인 메시지 | Phase 4 D-20 패턴처럼 편집기 상단에 에러 메시지 표시 | |
| You decide | Claude 재량으로 에러 표시 방식 결정 | |

**User's choice:** 확인 다이얼로그에 에러 표시 (추천)
**Notes:** None

---

## Claude's Discretion

- Submit API endpoint design (POST vs PATCH)
- DocSequence JPA entity and repository implementation
- Google Drive folder move strategy (copy+delete vs API move)
- Flyway migration details

## Deferred Ideas

None — discussion stayed within phase scope

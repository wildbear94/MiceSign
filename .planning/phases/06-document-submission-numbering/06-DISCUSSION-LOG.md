# Phase 6: Document Submission & Numbering - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-08
**Phase:** 06-document-submission-numbering
**Areas discussed:** 제출 확인 UX, 제출 전 검증 조건, 제출 후 사용자 경험, 문서번호 프리픽스

---

## 제출 확인 UX

| Option | Description | Selected |
|--------|-------------|----------|
| 에디터 상단 헤더 | 돌아가기(←) 옆에 삭제/저장/제출 버튼 배치 | ✓ |
| 에디터 하단 고정 | 페이지 하단에 고정된 액션 바 | |
| Claude에게 위임 | Claude가 최적 위치 결정 | |

**User's choice:** 에디터 상단 헤더
**Notes:** 현재 에디터 헤더 패턴과 일관성 유지

| Option | Description | Selected |
|--------|-------------|----------|
| 간단 경고만 | "제출 후에는 수정할 수 없습니다" 경고 + 확인/취소 | ✓ |
| 요약 표시 + 경고 | 문서 제목, 템플릿 유형, 첨부파일 수 등 요약 + 경고 | |
| Claude에게 위임 | Claude가 적절한 수준 결정 | |

**User's choice:** 간단 경고만
**Notes:** 빠른 제출 흐름 선호

| Option | Description | Selected |
|--------|-------------|----------|
| 강조색 버튼 | primary 색상으로 강조, 저장은 회색 outline | ✓ |
| 동일 스타일 | 저장과 제출 모두 동일한 스타일 | |
| Claude에게 위임 | Claude가 기존 디자인 패턴에 맞춰 결정 | |

**User's choice:** 강조색 버튼
**Notes:** 시각적 계층구조로 제출이 주요 액션임을 명확히

| Option | Description | Selected |
|--------|-------------|----------|
| DRAFT일 때만 표시 | 제출된 문서에서는 제출 버튼 숨김 | ✓ |
| 항상 표시 (disabled) | 제출된 문서에서도 비활성화 상태로 표시 | |

**User's choice:** DRAFT일 때만 표시

| Option | Description | Selected |
|--------|-------------|----------|
| 버튼 로딩 + 비활성화 | 스피너 표시 + 본문 불투명 처리 | ✓ |
| 전체 로딩 오버레이 | 페이지 전체에 로딩 오버레이 | |
| Claude에게 위임 | Claude가 적절한 로딩 UI 결정 | |

**User's choice:** 버튼 로딩 + 비활성화

| Option | Description | Selected |
|--------|-------------|----------|
| "제출" / "취소" | 간결한 레이블 | ✓ |
| "결재 제출" / "돌아가기" | 더 구체적인 레이블 | |

**User's choice:** "제출" / "취소"

---

## 제출 전 검증 조건

| Option | Description | Selected |
|--------|-------------|----------|
| 제목 + 본문/폼데이터 | GENERAL=본문 필수, EXPENSE=항목 1개 이상, LEAVE=날짜/사유 필수 | ✓ |
| 제목만 필수 | 제목만 있으면 제출 가능 | |
| Claude에게 위임 | Claude가 적절한 검증 규칙 결정 | |

**User's choice:** 제목 + 본문/폼데이터
**Notes:** 빈 문서 제출 방지

| Option | Description | Selected |
|--------|-------------|----------|
| 결재선 없이 제출 허용 | Phase 6에서는 결재선 검증 없음 | ✓ |
| 결재선 필수 검증 포함 | 결재선 1명 이상 설정 필요 | |

**User's choice:** 결재선 없이 제출 허용
**Notes:** Phase 7에서 결재선 필수 검증 추가 예정

| Option | Description | Selected |
|--------|-------------|----------|
| 필드별 인라인 에러 | Phase 4 D-19/D-20 패턴 유지 | ✓ |
| 상단 요약 에러 | 누락 항목 목록을 상단에 요약 | |

**User's choice:** 필드별 인라인 에러

| Option | Description | Selected |
|--------|-------------|----------|
| 버튼 활성, 클릭 시 검증 | 항상 활성, 클릭하면 검증 실행 | ✓ |
| 검증 통과 전까지 비활성화 | 모든 필수 필드 채워져야 활성화 | |

**User's choice:** 버튼 활성, 클릭 시 검증

| Option | Description | Selected |
|--------|-------------|----------|
| 이중 검증 | 프론트엔드 + 백엔드 재검증 | ✓ |
| 백엔드는 상태만 확인 | 본문 검증은 프론트엔드에 위임 | |

**User's choice:** 이중 검증 (Phase 4 D-19 패턴)

| Option | Description | Selected |
|--------|-------------|----------|
| 409 Conflict 에러 | "이미 제출된 문서입니다" 메시지 | ✓ |
| 무시 (멱등성) | 이미 제출된 문서면 200 OK 반환 | |

**User's choice:** 409 Conflict 에러

| Option | Description | Selected |
|--------|-------------|----------|
| 자동 저장 후 제출 | 미저장 변경사항 먼저 저장 후 제출 | ✓ |
| 저장 후 제출 안내 | "먼저 저장해주세요" 메시지 표시 | |

**User's choice:** 자동 저장 후 제출

| Option | Description | Selected |
|--------|-------------|----------|
| 업로드 완료 대기 후 제출 | 업로드 중인 파일 완료 후 제출 진행 | ✓ |
| 제출 차단 + 안내 | "완료 후 제출해주세요" 메시지 | |

**User's choice:** 업로드 완료 대기 후 제출

| Option | Description | Selected |
|--------|-------------|----------|
| 제출 차단 | 실패 파일 삭제/재업로드 필요 | ✓ |
| 실패 파일 제외하고 제출 | 실패 파일만 자동 제외 | |

**User's choice:** 제출 차단

| Option | Description | Selected |
|--------|-------------|----------|
| 인라인 에러 메시지 | Phase 4 D-20 패턴 | ✓ |
| 토스트 알림 | 화면 우측 상단 토스트 | |

**User's choice:** 인라인 에러 메시지

| Option | Description | Selected |
|--------|-------------|----------|
| 본인 문서만 제출 | drafter_id == 현재 사용자 | ✓ |
| 본인 + 관리자 대리 제출 | ADMIN/SUPER_ADMIN 대리 제출 가능 | |

**User's choice:** 본인 문서만 제출

---

## 제출 후 사용자 경험

| Option | Description | Selected |
|--------|-------------|----------|
| 문서 상세 페이지 | /documents/:id 읽기 전용으로 이동 | ✓ |
| 내 문서 목록 | /documents/my로 이동 | |
| Claude에게 위임 | Claude가 적절한 위치 결정 | |

**User's choice:** 문서 상세 페이지
**Notes:** 제출된 문서 확인이 자연스러운 흐름

| Option | Description | Selected |
|--------|-------------|----------|
| 인라인 성공 메시지 | "문서가 제출되었습니다 (GEN-2026-0001)" | ✓ |
| 토스트 알림 | 화면 우측 상단 토스트 | |

**User's choice:** 인라인 성공 메시지 (Phase 4 D-20 패턴)

| Option | Description | Selected |
|--------|-------------|----------|
| 제목 옆에 표시 | "LEV-2026-0003 | 제출됨" 형식 | ✓ |
| 별도 정보 영역 | 문서번호, 제출일 등 메타데이터 별도 표시 | |

**User's choice:** 제목 옆에 표시

| Option | Description | Selected |
|--------|-------------|----------|
| 번호 칼럼 추가 | 문서 목록 테이블에 문서번호 칼럼 추가 | ✓ |
| 제목에 병합 | "제목 (GEN-2026-0001)" 형식 | |

**User's choice:** 번호 칼럼 추가

| Option | Description | Selected |
|--------|-------------|----------|
| 현재 디자인 유지 | 기존 DocumentStatusBadge 컴포넌트 그대로 사용 | ✓ |
| 아이콘 추가 | 각 상태에 아이콘 추가 | |
| 디자인 변경 | 다른 스타일로 변경 | |

**User's choice:** 현재 디자인 유지

| Option | Description | Selected |
|--------|-------------|----------|
| 5초 후 자동 사라짐 | fade out + X 버튼 수동 닫기 가능 | ✓ |
| 수동 닫기만 | X 버튼을 눌러야만 사라짐 | |

**User's choice:** 5초 후 자동 사라짐

---

## 문서번호 프리픽스

| Option | Description | Selected |
|--------|-------------|----------|
| GEN / EXP / LEV | 영문 3글자 약어 | ✓ |
| 한글 프리픽스 | 일반/지출/휴가 | |
| 직접 입력 | 다른 프리픽스 | |

**User's choice:** GEN / EXP / LEV

| Option | Description | Selected |
|--------|-------------|----------|
| approval_template 테이블 | doc_number_prefix 칼럼 추가 | ✓ |
| 코드 상수 | 백엔드 코드에 하드코딩 | |

**User's choice:** approval_template 테이블

| Option | Description | Selected |
|--------|-------------|----------|
| 4자리 (0001-9999) | PRD 사양대로, 초과 시 자동 확장 | ✓ |
| 5자리 (00001-99999) | 더 여유 있는 번호 체계 | |

**User's choice:** 4자리 (0001-9999)

| Option | Description | Selected |
|--------|-------------|----------|
| 템플릿별 + 연도별 독립 | doc_sequence(template_code, year) 기준 | ✓ |
| 연도별 통합 | 모든 템플릿이 하나의 시퀀스 공유 | |

**User's choice:** 템플릿별 + 연도별 독립

---

## Claude's Discretion

- 동시성 제어 방식 (pessimistic locking, optimistic locking, DB-level sequence)
- 제출 API 엔드포인트 설계
- 트랜잭션 범위 및 롤백 전략
- 프론트엔드 submit mutation 구현 세부사항

## Deferred Ideas

None — discussion stayed within phase scope

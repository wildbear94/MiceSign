# Phase 4: Document Core & Templates - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-02
**Phase:** 04-document-core-templates
**Areas discussed:** Rich Text Editor, Expense Report UX, Document List/Detail, Form Data Storage, Document Creation Flow, Leave Request Details, Draft Auto-Save, Document Deletion, Document Edit Routing, Error Handling/Feedback

---

## Rich Text Editor

| Option | Description | Selected |
|--------|-------------|----------|
| Tiptap (권장) | ProseMirror 기반, React 연동 우수, 확장성 높음 | ✓ |
| React Quill | React 18 호환성 이슈 있음 | |
| Toast UI Editor | 한국 개발, 마크다운/WYSIWYG 듀얼 | |
| Claude 판단에 맡김 | | |

**User's choice:** Tiptap

| Option | Description | Selected |
|--------|-------------|----------|
| 기본만 (권장) | 굵기, 기울임, 밑줄, 목록, 제목 | |
| 테이블 포함 | 기본 + 테이블 삽입/편집 | |
| 풀 기능 | 기본 + 테이블 + 이미지 + 인용문 | ✓ |

**User's choice:** 풀 기능

---

## Expense Report UX

| Option | Description | Selected |
|--------|-------------|----------|
| 인라인 테이블 (권장) | 테이블 행에서 직접 입력, 스프레드시트 느낌 | ✓ |
| 모달 팝업 | 각 항목을 모달로 입력 | |

**User's choice:** 인라인 테이블

| Option | Description | Selected |
|--------|-------------|----------|
| 원화 (₩) + 콤마 (권장) | ₩10,000 형식 | ✓ |
| 숫자만 | 포맷팅 없이 | |

**User's choice:** 원화 + 콤마

---

## Document List/Detail

| Option | Description | Selected |
|--------|-------------|----------|
| 테이블 (권장) | Phase 3 패턴과 동일 | ✓ |
| 카드 목록 | 시각적이지만 정보 밀도 낮음 | |

**User's choice:** 테이블

| Option | Description | Selected |
|--------|-------------|----------|
| 전용 페이지 (권장) | /documents/:id 별도 라우트 | ✓ |
| 사이드 패널 | 목록에서 클릭 시 오른쪽 패널 | |

**User's choice:** 전용 페이지

---

## Form Data Storage

| Option | Description | Selected |
|--------|-------------|----------|
| 양식별 고정 구조 (권장) | template_code별 정해진 JSON 스키마 | ✓ |
| 범용 key-value | {fields: [{key, value, type}]} | |

**User's choice:** 양식별 고정 구조

| Option | Description | Selected |
|--------|-------------|----------|
| 실시간 + 저장 시 (권장) | 입력 중 실시간 + 저장 전 전체 검증 | ✓ |
| 저장 시만 | API 호출 시점에만 검증 | |

**User's choice:** 실시간 + 저장 시

---

## Document Creation Flow

| Option | Description | Selected |
|--------|-------------|----------|
| 모달 팝업 (권장) | "새 문서" → 양식 카드 모달 → 작성 페이지 | ✓ |
| 전용 선택 페이지 | /documents/new에서 양식 선택 | |

**User's choice:** 모달 팝업

| Option | Description | Selected |
|--------|-------------|----------|
| /documents/new/:templateCode (권장) | 양식별 URL 분리 | ✓ |
| /documents/new?template=CODE | 쿼리 파라미터 방식 | |

**User's choice:** /documents/new/:templateCode

---

## Leave Request Details

| Option | Description | Selected |
|--------|-------------|----------|
| PRD 그대로 (권장) | 연차, 반차, 병가, 경조 — 4가지 고정 | |
| 확장 가능 | DB 테이블로 관리, 추후 추가 가능 | ✓ |

**User's choice:** 확장 가능

| Option | Description | Selected |
|--------|-------------|----------|
| 0.5일로 고정 (권장) | 반차 = 0.5일 | |
| 시간 기반 | 시작/종료 시간으로 소수점 일수 계산 | ✓ |

**User's choice:** 시간 기반

| Option | Description | Selected |
|--------|-------------|----------|
| 백엔드 enum + 시드 (권장) | V5 migration으로 leave_type 테이블 + 4개 기본 시드 | ✓ |
| 프론트엔드 enum만 | Phase 4는 하드코딩, 후속에 DB 전환 | |

**User's choice:** 백엔드 enum + 시드

---

## Draft Auto-Save

| Option | Description | Selected |
|--------|-------------|----------|
| Debounce 30초 (권장) | 마지막 입력 후 30초 경과 시 자동 저장 | ✓ |
| 수동 저장만 | 사용자가 직접 저장 버튼 클릭 | |

**User's choice:** Debounce 30초

---

## Document Deletion

| Option | Description | Selected |
|--------|-------------|----------|
| 물리 삭제 (권장) | DB에서 완전 삭제 | ✓ |
| 소프트 삭제 | is_deleted 플래그 | |

**User's choice:** 물리 삭제

---

## Document Edit Routing

| Option | Description | Selected |
|--------|-------------|----------|
| 동일 URL + 모드 전환 (권장) | /documents/:id — 상태에 따라 편집/읽기 자동 전환 | ✓ |
| 별도 URL | /documents/:id (조회) vs /documents/:id/edit (편집) | |

**User's choice:** 동일 URL + 모드 전환

---

## Error Handling / User Feedback

| Option | Description | Selected |
|--------|-------------|----------|
| Toast 알림 (권장) | 우측 상단 toast 표시 | |
| 인라인 메시지 | 폼 위/아래에 성공/에러 메시지 표시 | ✓ |

**User's choice:** 인라인 메시지

---

## Claude's Discretion

None — user made explicit choices for all areas.

## Deferred Ideas

None — discussion stayed within phase scope.

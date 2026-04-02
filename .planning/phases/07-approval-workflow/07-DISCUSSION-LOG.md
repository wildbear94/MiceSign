# Phase 7: Approval Workflow - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-02
**Phase:** 07-approval-workflow
**Areas discussed:** 결재선 편집기 UI, 결재 처리 UX, 회수 및 재기안 흐름, 결재 상태 표시

---

## 결재선 편집기 UI

### 결재자 선택 방식

| Option | Description | Selected |
|--------|-------------|----------|
| 조직 트리 탐색 (추천) | 부서 트리를 펼쳐 사용자를 선택. 기존 DepartmentTree 컴포넌트 재사용 가능 | ✓ |
| 검색 기반 선택 | 이름/부서로 검색하여 선택. 간결하지만 부서 구조 파악이 어려움 | |
| 트리 + 검색 병행 | 조직 트리와 검색 모두 제공. 더 유연하지만 개발 복잡도 증가 | |

**User's choice:** 조직 트리 탐색
**Notes:** DepartmentTree 컴포넌트 재사용 가능, 50명 규모에 적합

### 유형 지정 방식

| Option | Description | Selected |
|--------|-------------|----------|
| 추가 시 선택 (추천) | 사람을 선택하면 유형 선택 드롭다운이 나타남 (승인/합의/참조) | ✓ |
| 영역별 배치 | 승인자 영역, 합의자 영역, 참조자 영역이 분리되어 있고 해당 영역에 드래그 | |
| 드래그로 이동 | 사람을 결재선 영역으로 드래그하고, 이후 유형을 변경 가능 | |

**User's choice:** 추가 시 선택

### 편집기 배치

| Option | Description | Selected |
|--------|-------------|----------|
| 문서 작성 페이지 내 (추천) | 문서 작성 페이지 하단에 결재선 섹션이 있음. 첨부파일 아래에 배치 | ✓ |
| 별도 모달/페이지 | 상신 전에 별도 모달이나 페이지에서 결재선 구성 | |

**User's choice:** 문서 작성 페이지 내

### 순서 변경 방식

| Option | Description | Selected |
|--------|-------------|----------|
| 드래그로 재정렬 (추천) | 추가된 결재자를 드래그하여 순서 변경 가능 | ✓ |
| 위/아래 버튼 | 간단한 화살표 버튼으로 순서 변경 | |

**User's choice:** 드래그로 재정렬

### 인원 제한

| Option | Description | Selected |
|--------|-------------|----------|
| 최소 1명 승인자 필수 (추천) | 상신 시 최소 1명의 APPROVE 유형 결재자 필수. 최대 제한 없음 | ✓ |
| 제한 없음 | 결재선 없이도 상신 가능 | |
| 최소/최대 모두 설정 | 최소 1명 + 최대 N명 제한 | |

**User's choice:** 최소 1명 승인자 필수

### 자기 결재

| Option | Description | Selected |
|--------|-------------|----------|
| 불가 (추천) | 기안자 본인을 결재선에 추가할 수 없음 | ✓ |
| 허용 | 기안자가 자기 자신을 참조자 등으로 추가 가능 | |

**User's choice:** 불가

### 중복 방지

| Option | Description | Selected |
|--------|-------------|----------|
| 중복 불가 (추천) | 같은 사람을 여러 번 추가할 수 없음 | ✓ |
| 다른 유형으로 허용 | 같은 사람을 승인+참조 등 다른 유형으로 추가 가능 | |

**User's choice:** 중복 불가

### REFERENCE step_order

| Option | Description | Selected |
|--------|-------------|----------|
| step_order 0 고정 (추천) | DB 스키마대로 REFERENCE는 step_order=0. 순서와 무관하게 상신 즉시 열람 가능 | ✓ |
| 별도 영역 분리 | 결재선 UI에서 APPROVE/AGREE와 REFERENCE를 분리된 영역으로 표시 | |

**User's choice:** step_order 0 고정

### 편집 시점

| Option | Description | Selected |
|--------|-------------|----------|
| DRAFT에서만 (추천) | DRAFT 상태에서 자유롭게 편집. 상신 후에는 결재선 수정 불가 | ✓ |
| 상신 전까지 | 저장 후에도 상신 전까지 수정 가능 | |

**User's choice:** DRAFT에서만

### 유형 안내

| Option | Description | Selected |
|--------|-------------|----------|
| 툴팁으로 설명 (추천) | 각 유형 선택 시 툴팁으로 간단한 설명 표시 | ✓ |
| 상단 안내 텍스트 | 결재선 섹션 상단에 3가지 유형 설명이 항상 표시 | |
| Claude 재량 | 구현 시 적절한 방식으로 결정 | |

**User's choice:** 툴팁으로 설명

### 저장 시점

| Option | Description | Selected |
|--------|-------------|----------|
| 문서와 함께 저장 (추천) | 문서 저장 API 호출 시 결재선도 함께 전송되어 저장 | ✓ |
| 별도 API로 저장 | 결재선은 별도 엔드포인트로 관리 | |

**User's choice:** 문서와 함께 저장

---

## 결재 처리 UX

### 의견 입력 방식

| Option | Description | Selected |
|--------|-------------|----------|
| 확인 다이얼로그 내 (추천) | 승인/반려 버튼 클릭 시 확인 다이얼로그가 뜨고, 선택적 의견 입력란 포함 | ✓ |
| 문서 상세 페이지 내 | 문서 상세 페이지 하단에 의견 입력란과 승인/반려 버튼이 있음 | |
| Claude 재량 | 구현 시 적절한 방식으로 결정 | |

**User's choice:** 확인 다이얼로그 내

### 반려 의견

| Option | Description | Selected |
|--------|-------------|----------|
| 필수 (추천) | 반려 시 반드시 사유를 입력해야 함 | ✓ |
| 선택 | 반려 시에도 의견은 선택사항 | |

**User's choice:** 필수

### 버튼 위치

| Option | Description | Selected |
|--------|-------------|----------|
| 문서 상세 상단 (추천) | 문서 제목 옆 또는 상단에 승인/반려 버튼. 스크롤 없이 바로 접근 가능 | ✓ |
| 결재선 영역 옆 | 결재선 표시 영역 옆에 버튼 배치 | |
| 하단 고정 | 페이지 하단에 sticky로 고정 | |

**User's choice:** 문서 상세 상단

### 열람 범위

| Option | Description | Selected |
|--------|-------------|----------|
| 결재선에 포함된 사람만 (추천) | 기안자 + 결재선에 있는 사람만 문서 열람 가능 | ✓ |
| 같은 부서원 포함 | 결재선 + 같은 부서원도 열람 가능 | |

**User's choice:** 결재선에 포함된 사람만

### 합의 반려

| Option | Description | Selected |
|--------|-------------|----------|
| 합의도 반려 가능 (추천) | AGREE 유형도 APPROVE와 동일하게 승인/반려 가능. 반려 시 문서 즉시 REJECTED | ✓ |
| 합의는 승인만 | AGREE 유형은 승인만 가능, 반려는 APPROVE 유형만 | |

**User's choice:** 합의도 반려 가능

### 알림 방식

| Option | Description | Selected |
|--------|-------------|----------|
| 대시보드에서 확인 (추천) | Phase 8에서 만드는 대시보드에 대기 문서 목록 표시. 이메일 알림은 Phase 1-B | ✓ |
| 문서 목록에 필터 | 기존 문서 목록에서 '결재 대기' 필터로 확인 | |

**User's choice:** 대시보드에서 확인

### 완료 문서 확인

| Option | Description | Selected |
|--------|-------------|----------|
| 기안자 문서 목록 (추천) | 기존 '내 문서' 목록에서 상태 배지(APPROVED)로 확인 | |
| 별도 완료 문서 목록 | 승인 완료된 문서만 보여주는 별도 페이지 | ✓ |

**User's choice:** 별도 완료 문서 목록
**Notes:** 내가 기안한 완료 문서만 표시하는 별도 페이지

### 대기 문서 목록 시점

| Option | Description | Selected |
|--------|-------------|----------|
| Phase 7에서 기본 목록 (추천) | 결재 처리를 위해 '결재 대기 문서' 목록 페이지가 필수 | ✓ |
| Phase 8에서 만들기 | Phase 7에서는 문서 상세에서만 결재 처리. 목록은 Phase 8의 대시보드에서 | |

**User's choice:** Phase 7에서 기본 목록

### 첨부 접근

| Option | Description | Selected |
|--------|-------------|----------|
| 다운로드 가능 (추천) | 결재선에 포함된 사람은 첨부파일 다운로드 가능 | ✓ |
| 열람만 가능 | 첨부파일은 다운로드 없이 이름/크기만 확인 | |

**User's choice:** 다운로드 가능

---

## 회수 및 재기안 흐름

### 회수 버튼 위치

| Option | Description | Selected |
|--------|-------------|----------|
| 문서 상세 상단 (추천) | 상신된 문서의 상세 페이지 상단에 '회수' 버튼 표시 | ✓ |
| 문서 목록에서 | 문서 목록의 각 행에 회수 버튼/메뉴 제공 | |

**User's choice:** 문서 상세 상단

### 회수 확인

| Option | Description | Selected |
|--------|-------------|----------|
| 확인 다이얼로그 필수 (추천) | 회수 클릭 시 확인 다이얼로그 표시. 실수 방지 | ✓ |
| 바로 회수 | 버튼 클릭 시 즉시 회수 처리 | |

**User's choice:** 확인 다이얼로그 필수

### 재기안 복사 범위

| Option | Description | Selected |
|--------|-------------|----------|
| 문서 내용 + 결재선 (추천) | 제목, 본문, 양식 데이터, 결재선을 모두 복사. 첨부파일은 제외 (새로 업로드) | ✓ |
| 문서 내용만 | 제목, 본문, 양식 데이터만 복사. 결재선은 새로 구성 | |
| 전부 복사 | 내용 + 결재선 + 첨부파일 모두 복사 | |

**User's choice:** 문서 내용 + 결재선

### 원본 추적

| Option | Description | Selected |
|--------|-------------|----------|
| source_doc_id 로 연결 (추천) | DB에 이미 source_doc_id 필드 존재. 재기안 문서에서 원본 문서 링크 표시 | ✓ |
| 추적 불필요 | 재기안은 완전히 새 문서로 취급 | |

**User's choice:** source_doc_id 로 연결

### 재기안 버튼 위치

| Option | Description | Selected |
|--------|-------------|----------|
| 반려/회수 문서 상세 (추천) | REJECTED 또는 WITHDRAWN 상태 문서의 상세 페이지에 '재기안' 버튼 표시 | ✓ |
| 문서 목록에서 | 문서 목록에서 반려/회수 문서 행에 재기안 버튼 | |

**User's choice:** 반려/회수 문서 상세

### 회수 상태

| Option | Description | Selected |
|--------|-------------|----------|
| WITHDRAWN (추천) | DocumentStatus.WITHDRAWN으로 변경. completed_at 설정. 기존 enum에 이미 정의됨 | ✓ |
| DRAFT로 복귀 | 회수하면 다시 DRAFT 상태로 돌아가서 수정 가능 | |

**User's choice:** WITHDRAWN

### 회수 결재선 처리

| Option | Description | Selected |
|--------|-------------|----------|
| 결재선 유지 (추천) | 결재선 데이터는 그대로 유지 (PENDING 상태들은 SKIPPED로 변경). 문서 불변성 원칙 유지 | ✓ |
| 결재선 삭제 | 회수 시 결재선 데이터 삭제 | |

**User's choice:** 결재선 유지

---

## 결재 상태 표시

### 진행 표시 방식

| Option | Description | Selected |
|--------|-------------|----------|
| 단계별 세로 목록 (추천) | 결재자 목록을 순서대로 세로 표시. 각 단계별 상태 아이콘(대기/승인/반려) | ✓ |
| 가로 스텝 표시 | 가로 단계 표시로 진행 상황 시각화 | |
| Claude 재량 | 구현 시 적절한 방식으로 결정 | |

**User's choice:** 단계별 세로 목록

### 목록 표시

| Option | Description | Selected |
|--------|-------------|----------|
| 상태 배지만 (추천) | 기존 DocumentStatusBadge 컴포넌트 사용 | ✓ |
| 상태 + 단계 요약 | 상태 배지 + '2/3 승인' 같은 진행률 표시 | |
| 프로그레스 바 | 미니 프로그레스 바로 시각적 진행률 표시 | |

**User's choice:** 상태 배지만

### 의견 표시

| Option | Description | Selected |
|--------|-------------|----------|
| 결재자 옆에 표시 (추천) | 각 결재자의 상태 옆에 의견 텍스트와 처리 시간 표시 | ✓ |
| 별도 의견 섹션 | 결재선 아래에 별도로 의견 목록 섹션 | |

**User's choice:** 결재자 옆에 표시

### 참조자 표시

| Option | Description | Selected |
|--------|-------------|----------|
| 결재선 아래 분리 (추천) | APPROVE/AGREE 결재선과 구분선 아래에 참조자 별도 표시 | ✓ |
| 함께 표시 | 결재자와 참조자를 한 목록에 표시 (step_order 순) | |

**User's choice:** 결재선 아래 분리

### 완료 시간

| Option | Description | Selected |
|--------|-------------|----------|
| 표시 (추천) | 문서 상세에 completed_at 표시. 각 결재자의 acted_at도 함께 표시 | ✓ |
| Claude 재량 | 구현 시 적절히 결정 | |

**User's choice:** 표시

---

## Claude's Discretion

- Drag-and-drop library choice
- Tooltip implementation approach
- API endpoint structure for approval actions
- Approval line data structure in document save payload
- Pending approvals list page URL and routing

## Deferred Ideas

None — discussion stayed within phase scope

# Phase 5: File Attachments - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-02
**Phase:** 05-file-attachments
**Areas discussed:** Upload UX, File Validation & Limits, Attachment Display, Download & Access Control

---

## Upload UX

### Q1: 파일 업로드 방식

| Option | Description | Selected |
|--------|-------------|----------|
| 드래그앤드롭 + 버튼 (추천) | 파일을 드래그해서 놓거나 클릭으로 선택. 표준 패턴 | ✓ |
| 버튼만 | 클릭으로 파일 선택 버튼만 제공. 더 단순 | |
| 폼 영역 내 드롭존 | 폼 하단에 점선 영역으로 드래그앤드롭 존 표시 | |

**User's choice:** 드래그앤드롭 + 버튼
**Notes:** None

### Q2: 업로드 진행 상태 표시

| Option | Description | Selected |
|--------|-------------|----------|
| 개별 프로그레스 바 (추천) | 각 파일마다 업로드 진행률 바 표시 | ✓ |
| 전체 진행률만 | 모든 파일의 전체 진행률 하나만 표시 | |
| 스피너만 | 업로드 중 스피너 애니메이션만 표시 | |

**User's choice:** 개별 프로그레스 바
**Notes:** None

### Q3: 다중 파일 선택 시 동작

| Option | Description | Selected |
|--------|-------------|----------|
| 누적 추가 (추천) | 새 파일 선택하면 기존 목록에 추가 | ✓ |
| 교체 | 새 파일 선택하면 기존 목록 교체 | |

**User's choice:** 누적 추가
**Notes:** None

---

## File Validation & Limits

### Q4: 파일 제한 초과 시 UX

| Option | Description | Selected |
|--------|-------------|----------|
| 선택 전 차단 (추천) | 파일 선택 시점에 크기/확장자/개수 검증 후 즉시 차단 | ✓ |
| 선택 후 경고 | 일단 목록에 추가하고 경고 표시. 업로드 버튼 비활성화 | |
| 프론트+백엔드 이중 | 프론트에서 1차 차단 + 백엔드에서 최종 검증 | |

**User's choice:** 선택 전 차단
**Notes:** None

### Q5: 차단할 파일 확장자 정책

| Option | Description | Selected |
|--------|-------------|----------|
| 블랙리스트 (추천) | 실행파일만 차단. 나머지 허용 | ✓ |
| 화이트리스트 | 허용된 확장자만 업로드 가능 | |
| Claude 재량 | Claude가 적절히 결정 | |

**User's choice:** 블랙리스트
**Notes:** None

### Q6: 남은 용량/개수 UI 표시

| Option | Description | Selected |
|--------|-------------|----------|
| 항상 표시 (추천) | "파일 3/10개, 45MB/200MB 사용 중" 상태 표시줄 항상 노출 | ✓ |
| 제한 접근 시만 | 80% 이상 사용 시에만 경고 표시 | |
| 표시 안 함 | 제한 초과 시에만 오류 메시지 | |

**User's choice:** 항상 표시
**Notes:** None

---

## Attachment Display

### Q7: 첨부된 파일 목록 표시 방식

| Option | Description | Selected |
|--------|-------------|----------|
| 파일명 + 아이콘 + 크기 (추천) | 확장자별 파일타입 아이콘, 파일명, 파일 크기 표시. 칩/카드 형태 | ✓ |
| 단순 리스트 | 파일명과 크기만 텍스트 리스트로 표시 | |
| 썸네일 미리보기 | 이미지는 썸네일, 문서는 아이콘. 구현 복잡 | |

**User's choice:** 파일명 + 아이콘 + 크기
**Notes:** None

### Q8: 드래프트 상태에서 첨부파일 삭제 방식

| Option | Description | Selected |
|--------|-------------|----------|
| X 버튼 + 확인 없음 (추천) | 각 파일 열의 X 버튼으로 즉시 삭제. 드래프트라 복구 불필요 | ✓ |
| X 버튼 + 확인 대화상자 | 삭제 전 확인 대화상자 표시 | |
| 체크박스 선택 + 일괄삭제 | 여러 파일 선택 후 일괄 삭제 | |

**User's choice:** X 버튼 + 확인 없음
**Notes:** None

---

## Download & Access Control

### Q9: 파일 다운로드 방식

| Option | Description | Selected |
|--------|-------------|----------|
| 백엔드 프록시 (추천) | 백엔드가 Google Drive에서 파일을 받아 프론트에 전달. Drive URL 노출 없음 | ✓ |
| Drive 직접 링크 | Google Drive 다운로드 URL을 직접 제공 | |

**User's choice:** 백엔드 프록시
**Notes:** None

### Q10: 권한 없는 사용자의 접근 처리

| Option | Description | Selected |
|--------|-------------|----------|
| 다운로드 버튼 숨김 (추천) | 문서 접근권이 없으면 첨부파일 영역 자체가 보이지 않음 | ✓ |
| 버튼 비활성화 + 메시지 | 파일 목록은 보이지만 다운로드 버튼 비활성화 | |
| 403 오류 응답 | 다운로드 시도 시 백엔드에서 403 반환 | |

**User's choice:** 다운로드 버튼 숨김
**Notes:** None

### Q11: 일괄 다운로드 기능

| Option | Description | Selected |
|--------|-------------|----------|
| 필요 없음 (추천) | MVP에서는 개별 다운로드만 지원. 파일 10개 제한이라 일괄 필요성 낮음 | ✓ |
| ZIP 압축 다운로드 | 모든 첨부파일을 ZIP으로 압축해서 일괄 다운로드 | |

**User's choice:** 필요 없음
**Notes:** None

---

## Claude's Discretion

- Backend Google Drive service implementation details (retry logic, error handling, folder creation strategy)
- Frontend component structure for attachment area
- Upload chunking or streaming strategy for large files

## Deferred Ideas

None — discussion stayed within phase scope

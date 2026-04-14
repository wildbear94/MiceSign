---
status: complete
phase: 22-split-layout-live-preview
source: [22-VERIFICATION.md]
started: 2026-04-12T12:00:00Z
updated: 2026-04-14T12:00:00+09:00
---

## Current Test

[complete — all items passed by user verification 2026-04-14]

## Tests

### 1. Near-fullscreen 분할 레이아웃 시각 확인
expected: 모달이 95vw/95vh 크기로 열리고 좌우 50:50 분할이 표시됨
result: pass

### 2. 실시간 미리보기 업데이트
expected: 필드 추가/수정/삭제 시 우측 미리보기에 즉시 반영됨
result: pass

### 3. 전체화면 미리보기 포탈 + ESC 처리
expected: Maximize2 클릭 시 z-[60] 포탈 표시, ESC로 전체화면만 닫히고 모달 유지
result: pass

### 4. 미리보기 토글
expected: EyeOff로 숨기면 편집 영역 전체 확장, Eye로 복원 시 50:50 복원
result: pass

### 5. 기존 기능 회귀 테스트
expected: 양식 생성/수정/저장이 기존과 동일하게 작동
result: pass

## Summary

total: 5
passed: 5
issues: 0
pending: 0
skipped: 0
blocked: 0

## Gaps

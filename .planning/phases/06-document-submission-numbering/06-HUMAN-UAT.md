---
status: partial
phase: 06-document-submission-numbering
source: [06-VERIFICATION.md]
started: 2026-04-09T15:30:00+09:00
updated: 2026-04-09T15:30:00+09:00
---

## Current Test

[awaiting human testing]

## Tests

### 1. 제출 전체 흐름 (확인 다이얼로그 → 성공 배너)
expected: 제출 버튼 클릭 → 확인 다이얼로그 → 확인 클릭 → 스피너 → 상세 페이지 리다이렉트 → 녹색 배너 "문서가 제출되었습니다 (GEN-2026-NNNN)" → 5초 후 자동 소멸
result: [pending]

### 2. SUBMITTED 문서 읽기 전용 뷰
expected: 제출된 문서 상세 페이지에서 편집/삭제 버튼 없음, 문서번호 표시됨
result: [pending]

### 3. 업로드 중 제출 차단
expected: 파일 업로드 진행 중 제출 버튼 클릭 시 차단 메시지 표시
result: [pending]

## Summary

total: 3
passed: 0
issues: 0
pending: 3
skipped: 0
blocked: 0

## Gaps

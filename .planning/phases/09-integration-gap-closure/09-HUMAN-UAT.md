---
status: partial
phase: 09-integration-gap-closure
source: [09-VERIFICATION.md]
started: 2026-04-10T15:30:00+09:00
updated: 2026-04-10T15:30:00+09:00
---

## Current Test

[awaiting human testing]

## Tests

### 1. OrgTreePickerModal as USER role
expected: USER 역할로 로그인 후 결재선 편집 시 조직도 모달이 403 없이 정상 로드됨
result: [pending]

### 2. Pending approvals page date/department rendering
expected: 결재 대기 목록에서 날짜가 정상 표시되고 부서명이 빈칸 없이 표시됨
result: [pending]

### 3. Dashboard pending list rendering
expected: 대시보드 결재 대기 목록에서 동일하게 날짜/부서가 정상 렌더링됨
result: [pending]

### 4. DOC_REWRITE audit trail
expected: 문서 재작성 시 감사 로그에 DOC_REWRITE 항목이 기록됨
result: [pending]

### 5. Navbar links and navigation
expected: 네비게이션 바에 "결재 대기"와 "완료된 문서" 링크가 표시되고 클릭 시 해당 페이지로 이동
result: [pending]

### 6. ApprovalLineEditor UI in DocumentEditorPage
expected: 문서 작성 페이지에서 결재선 편집기가 렌더링되고 OrgTreePickerModal이 정상 동작
result: [pending]

## Summary

total: 6
passed: 0
issues: 0
pending: 6
skipped: 0
blocked: 0

## Gaps

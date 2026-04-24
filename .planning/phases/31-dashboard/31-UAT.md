---
status: complete
phase: 31-dashboard
source: [31-HUMAN-UAT.md, 31-01-SUMMARY.md, 31-02-SUMMARY.md, 31-03-SUMMARY.md, 31-04-SUMMARY.md, 31-05-SUMMARY.md, 31-06-SUMMARY.md]
started: 2026-04-24
updated: 2026-04-25
---

## Current Test

[testing complete]

## Tests

### 1. USER 4 카드 가시성 + 라벨/아이콘/순서
expected: |
  USER 계정으로 로그인 → 대시보드 상단에 정확히 4개 카운트 카드가 한 줄(또는 반응형 그리드)로 노출.
  - drafts 카드는 표시되지 않음 (D-A3 회귀 방어)
  - 순서 좌→우: 결재 대기 → 진행 중 → 승인 완료 → 반려
  - 아이콘: Clock(파랑) / Hourglass(회색) / CheckCircle2(녹색) / XCircle(빨강)
  - "승인 완료" 라벨이 "완료" 가 아니어야 함
  - 카운트 숫자는 본인 기안 문서 기준
result: pass

### 2. ADMIN 부서 계층 카운트 + role-based URL
expected: |
  ADMIN 계정(팀장급)으로 로그인 → 4 카드 라벨 동일, 카운트 숫자가 본인 + 부서(계층 재귀) 사용자 기준으로 USER 보다 많거나 같음.
  - "진행 중" 카드 클릭 시 URL 이 `/documents?tab=search&status=SUBMITTED` (USER 는 `/documents/my?status=SUBMITTED` 였음)
result: pass

### 3. SUPER_ADMIN 전사 스코프 + URL
expected: |
  SUPER_ADMIN(seed 기본 관리자)으로 로그인 → 4 카드 라벨 동일, 카운트 숫자가 전사 범위로 USER/ADMIN 보다 크거나 같음.
  - 카드 클릭 시 URL `/documents?tab=search&status=...` 로 이동
result: pass

### 4. 승인 mutation 실시간 갱신 (DASH-05)
expected: |
  대시보드 탭을 띄운 상태에서 다른 사용자가 상신한 문서에 대한 결재 승인 수행 → 대시보드로 복귀.
  - "결재 대기" 카운트 `-1`
  - "진행 중" 또는 "승인 완료" 카운트 변화
  - 화면 새로고침 없이 자동 반영 (페이지 전환 없이)
result: pass

### 5. 반려 mutation 실시간 갱신 (DASH-05)
expected: |
  결재 반려 수행 → 대시보드 카운트 변화:
  - 기안자 시점에서 "결재 대기" `-1`, "반려" `+1`
  - 페이지 이동 없이 반영
result: pass

### 6. 상신 mutation 실시간 갱신 (DASH-05)
expected: |
  본인 draft 문서를 상신 → 대시보드 카운트 변화:
  - 본인 기안자 시점에서 "진행 중" `+1`
result: pass

### 7. 회수 mutation 실시간 갱신 (DASH-05)
expected: |
  본인이 상신한 문서를 회수 → 대시보드 카운트 변화:
  - "진행 중" `-1`
result: pass

### 8. 갱신 지연/skeleton 플래시 없음
expected: |
  각 mutation 후 최대 2초 이내 카운트 변화 반영, 중간에 skeleton 플래시가 보이지 않음 (placeholderData 효과, D-B7).
result: pass

### 9. Skeleton 로딩 동기화 (DASH-03, DASH-04)
expected: |
  대시보드 최초 진입 시 (또는 강제 새로고침 Cmd+Shift+R) 4 카드 + 2 리스트 모두 skeleton (gray shimmer) 표시.
  - 4 카드 skeleton 이 동시에 해제됨 (따로따로 깜빡이지 않음 — D-C5 단일 훅 동기화)
  - skeleton 해제 후 실제 데이터 노출까지 부드럽게 전환
result: pass

### 10. Empty State (DASH-04)
expected: |
  신규 계정(데이터 없음)으로 로그인하거나 데이터가 없는 조건:
  - PendingList: ClipboardCheck 아이콘 + "대기 중인 결재가 없습니다" + "결재 요청이 들어오면 여기에 표시됩니다." 문구
  - RecentDocumentsList: FileText 아이콘 + "최근 문서가 없습니다" + "문서를 작성하면 여기에 표시됩니다." 문구
  - 4 카드 숫자는 empty placeholder 가 아니라 "0" 텍스트
result: pass

### 11. Error State (DASH-04)
expected: |
  DevTools Network 탭에서 Offline 설정 후 대시보드 새로고침:
  - 4 카드 + 2 리스트 모두 AlertTriangle (amber) + "일시적인 오류가 발생했습니다" + "다시 시도" 버튼 표시
  - 3 위젯 동일 에러 UI 패턴 (D-C2)
  - Offline 해제 후 "다시 시도" 클릭 → 정상 데이터 로딩 (에러 UI 해제)
  - 버튼 클릭 중 disabled + Loader2 spinner 표시
result: pass

### 12. 반응형 레이아웃 (UI-SPEC §14)
expected: |
  - 데스크톱 1024px+ 에서 4 카드 한 줄 (lg:grid-cols-4)
  - 태블릿 768-1023px 에서 2×2 그리드
  - 모바일 <768px 에서 1열 수직
result: pass

### 13. Dark mode + keyboard a11y (UI-SPEC §14)
expected: |
  - Dark mode 토글 시 4 카드 / 리스트 / ErrorState 모두 dark 색상 매핑 정상
  - Keyboard Tab 순회: "새 문서 작성" CTA → 4 카드 (좌→우) → "전체 보기" 링크 → 리스트 행
  - Focus-visible ring (파랑) 이 4 카드 / 리스트 row / "다시 시도" 버튼 모두 표시됨
result: pass

### 14. 회귀 — CTA / 카드 클릭 / cache pollution
expected: |
  - "새 문서 작성" CTA 클릭 → TemplateSelectionModal 오픈 → 양식 선택 → `/documents/new/{templateCode}` 이동 (기존 동작 유지)
  - 결재 대기 카드 클릭 → `/approvals/pending` 이동 (role 불문)
  - 로그아웃 후 재로그인 시 대시보드 카운트가 재로그인 사용자 기준으로 정확히 표시 (cache pollution 없음)
result: pass

## Summary

total: 14
passed: 14
issues: 0
pending: 0
skipped: 0
blocked: 0

## Gaps

[none yet]

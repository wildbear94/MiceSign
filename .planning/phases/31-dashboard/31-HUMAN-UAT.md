---
phase: 31-dashboard
document: HUMAN-UAT
status: complete
tester: park sang young
tested_at: "2026-04-25"
superseded_by: 31-UAT.md
note: "본 체크리스트는 정적 markdown 형태이며, 실제 검증은 conversational UAT (31-UAT.md, 14/14 PASS, 2026-04-25 sign-off) 에서 완료됨. 31-VERIFICATION.md 의 human_verification 5 항목 모두 31-UAT.md Test 1-3, 7-10, 11-13 로 cross-check 통과. 메타데이터 정합성을 위해 2026-04-28 status 를 complete 로 갱신."
---

# Phase 31 — Human UAT Checklist

> 대시보드 고도화 (DASH-01~05) 수동 검증. D-D3 locked 5 핵심 항목 + UI-SPEC §14 Visual QA.
> 테스터는 브라우저에서 `npm run dev` 후 로그인하여 각 항목을 눈으로/손으로 확인한다.

## 사전 준비

1. `cd backend && ./gradlew bootRun` (application-local 프로필)
2. `cd frontend && npm run dev` — 기본 5173
3. 테스트 계정 3종 준비:
   - USER (본인 스코프 검증용, 예: 일반 사원)
   - ADMIN (부서 계층 확장 검증용, 예: 팀장급)
   - SUPER_ADMIN (전사 스코프 검증용, seed 기본 관리자)

---

## 1. 4카드 가시성 × 3 Role (DASH-01)

### 1.1 USER 로 로그인
- [ ] 대시보드 상단에 **4개** 카운트 카드가 표시됨 (결재 대기 / 진행 중 / 승인 완료 / 반려)
- [ ] **drafts 카드는 표시되지 않음** (D-A3 회귀 방어)
- [ ] 카드 순서 좌→우: 결재 대기 → 진행 중 → 승인 완료 → 반려
- [ ] 아이콘: Clock(파랑) / Hourglass(회색) / CheckCircle2(녹색) / XCircle(빨강)
- [ ] 카운트 숫자가 **본인 기안** 문서 기준으로 집계됨
- [ ] "승인 완료" 카드 라벨이 "완료" 가 아닌 "승인 완료" 로 표시

### 1.2 ADMIN 으로 로그인
- [ ] 4개 카드 라벨 동일
- [ ] 카운트 숫자가 **본인 + 부서(계층 재귀) 사용자** 문서 기준으로 증가한다 (USER 보다 많거나 같음)
- [ ] "진행 중" 카드 클릭 시 URL 이 `/documents?tab=search&status=SUBMITTED` 로 이동 (USER 는 `/documents/my?status=SUBMITTED` 였음)

### 1.3 SUPER_ADMIN 으로 로그인
- [ ] 4개 카드 라벨 동일
- [ ] 카운트 숫자가 **전사** 범위로 가장 큼
- [ ] 카드 클릭 시 URL `/documents?tab=search&status=...` 로 이동

---

## 2. Mutation 실시간 갱신 (DASH-05)

**사전**: 대시보드 탭을 띄워둔 채 별도 탭 또는 같은 탭에서 액션 수행 후 대시보드로 복귀.

### 2.1 승인 (useApprove)
- [ ] 다른 사용자가 상신한 문서에 대한 결재 승인 수행
- [ ] 대시보드로 돌아오면 "결재 대기" 카운트가 `-1`, "진행 중" 또는 "승인 완료" 카운트 변화
- [ ] 화면 새로고침 없이 자동 반영 (페이지 전환 없이)

### 2.2 반려 (useReject)
- [ ] 결재 반려 수행
- [ ] "결재 대기" `-1`, "반려" `+1` (기안자 시점에서)

### 2.3 상신 (useSubmitDocument)
- [ ] 본인 draft 문서를 상신
- [ ] "진행 중" 카운트 `+1` (본인 기안자 시점)

### 2.4 회수 (useWithdrawDocument)
- [ ] 본인 상신한 문서를 회수
- [ ] "진행 중" 카운트 `-1`

### 2.5 갱신 지연 없음
- [ ] 각 mutation 후 최대 2초 이내 카운트 변화가 반영됨
- [ ] 중간에 skeleton 플래시가 보이지 않음 (placeholderData 효과, D-B7)

---

## 3. Skeleton 로딩 (DASH-03, DASH-04)

- [ ] 대시보드 최초 진입 시 (또는 강제 새로고침 Cmd+Shift+R) 4 카드 + 2 리스트 모두 skeleton (gray shimmer) 표시
- [ ] 4 카드 skeleton 이 **동시에** 해제됨 (따로따로 깜빡이지 않음 — D-C5 단일 훅 동기화)
- [ ] skeleton 해제 후 실제 데이터 노출까지 부드럽게 전환

---

## 4. Empty State (DASH-04)

**사전**: 신규 계정 (데이터 없음) 으로 로그인 — 또는 기존 계정으로 필터 조건상 데이터가 없음을 확인.

- [ ] PendingList (결재 대기 문서): ClipboardCheck 아이콘 + "대기 중인 결재가 없습니다" + "결재 요청이 들어오면 여기에 표시됩니다." 문구
- [ ] RecentDocumentsList (최근 문서): FileText 아이콘 + "최근 문서가 없습니다" + "문서를 작성하면 여기에 표시됩니다." 문구
- [ ] 4 카드의 숫자는 "0" 으로 표시 (empty placeholder 가 아닌 0 텍스트)

---

## 5. Error State (DASH-04)

**사전**: DevTools 의 Network 탭에서 Offline 설정.

- [ ] 대시보드 새로고침 → 4 카드 + 2 리스트 모두 **AlertTriangle (amber)** + "일시적인 오류가 발생했습니다" + "다시 시도" 버튼 표시
- [ ] 모든 위젯이 동일 에러 UI 패턴 (3위젯 통일, D-C2)
- [ ] Network Offline 해제 후 "다시 시도" 버튼 클릭 → 정상 데이터 로딩 (에러 UI 해제)
- [ ] 버튼 클릭 중 disabled + Loader2 spinner 표시

---

## 추가 Visual QA (UI-SPEC §14)

- [ ] 데스크톱 1024px+ 에서 4 카드 한 줄 (lg:grid-cols-4)
- [ ] 태블릿 768-1023px 에서 2×2 그리드
- [ ] 모바일 <768px 에서 1열 수직
- [ ] Dark mode 토글 시 4 카드 / 리스트 / ErrorState 모두 dark 색상 매핑 정상
- [ ] Keyboard Tab 순회: "새 문서 작성" CTA → 4 카드 (좌→우) → "전체 보기" 링크 → 리스트 행
- [ ] Focus-visible ring (파랑) 이 4 카드 / 리스트 row / "다시 시도" 버튼 모두 표시됨

---

## 회귀 확인

- [ ] "새 문서 작성" CTA 클릭 → TemplateSelectionModal 오픈 → 양식 선택 → `/documents/new/{templateCode}` 이동 (기존 동작 유지)
- [ ] 결재 대기 카드 클릭 → `/approvals/pending` 이동 (role 불문)
- [ ] 로그아웃 후 재로그인 시 대시보드 카운트가 재로그인 사용자 기준으로 정확히 표시 (cache pollution 없음)

---

## Sign-off

- [ ] 모든 항목 통과 (실패 항목 없음 또는 별도 이슈 기록)
- [ ] 테스터 서명: ______________________
- [ ] 테스트 일자: ______________________
- [ ] 발견된 이슈: (있으면 이슈 트래커에 기록)

---

*Phase: 31-dashboard*
*UAT draft: 2026-04-24*
*Source: 31-CONTEXT.md D-D3, 31-UI-SPEC.md §14, 31-VALIDATION.md Manual-Only*

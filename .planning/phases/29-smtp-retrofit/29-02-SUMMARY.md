---
phase: 29
plan: 02
subsystem: notification/email-templates
tags: [thymeleaf, email-template, fragment, cjk, smtp, html-email]
type: execute
wave: 2

# Dependency graph
requires:
  - phase: 29-01
    provides: "ApprovalEmailSender skeleton — Plan 29-03이 이 sender로 templateEngine.process(\"email/approval-<slug>\", ctx) 를 호출할 때 필요한 템플릿 셋"
  - phase: pre-existing
    provides: "templates/email/registration-submit.html — 시각 스타일(600px / #2563eb 헤더 / Malgun Gothic / 인라인 CSS) 시각 상속 기준"
provides:
  - "공통 레이아웃 fragment: layouts/approval-base.html (th:fragment=\"layout (body)\")"
  - "5개 이벤트 body 템플릿: approval-{submit,approve,final-approve,reject,withdraw}.html"
  - "단일 CTA 버튼 (\"문서 바로가기\" → ${approvalUrl}) 모든 이메일 통합"
  - "REJECT 전용 rejectComment 조건부 블록 (D-C6)"
  - "공통 템플릿 변수 contract — Plan 29-03의 buildContext가 setVariable해야 할 키 명세"
affects:
  - "Wave 2 Plan 29-03 (EmailService refactor) — buildContext에서 docNumber/docTitle/drafterName/drafterDepartment/recipientName/actionLabel/eventTime/approvalUrl/rejectComment 변수 채워서 SpringTemplateEngine.process(\"email/approval-<slug>\", ctx) 호출"
  - "Wave 4 (테스트) — 6개 템플릿 렌더 결과를 jsoup으로 파싱해 Korean 본문/CTA href 검증"

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Thymeleaf 3.1 fragment expression: th:replace=\"~{layouts/approval-base :: layout(~{::body/*})}\" — page의 body 자식 요소를 layout fragment의 ${body} slot으로 합성 (D-C3)"
    - "Email-safe HTML: max-width:600px / 인라인 CSS only / <style> 블록 금지 / CJK 폰트 스택을 layout 단일 선언 후 상속 (D-C7)"
    - "UTF-8 이중 메타 선언 (<meta charset> + http-equiv) — 한글 subject/본문 디코딩 방어 (Pitfall 3)"
    - "조건부 블록 패턴: th:if=\"${rejectComment != null and !#strings.isEmpty(rejectComment)}\" — null과 빈 문자열 동시 가드 (D-C6)"

key-files:
  created:
    - "backend/src/main/resources/templates/email/layouts/approval-base.html"
    - "backend/src/main/resources/templates/email/approval-submit.html"
    - "backend/src/main/resources/templates/email/approval-approve.html"
    - "backend/src/main/resources/templates/email/approval-final-approve.html"
    - "backend/src/main/resources/templates/email/approval-reject.html"
    - "backend/src/main/resources/templates/email/approval-withdraw.html"
  modified: []

key-decisions:
  - "registration-submit.html 시각 스타일을 `<style>` 블록 없이 인라인으로 100% 복제 — Gmail이 <style>을 제거하므로 동일 시각이 유지되려면 이메일 스타일은 모두 인라인이어야 함"
  - "Plan에 명시된 actionLabel 변수는 본문/메타 어디에도 직접 바인딩하지 않고 contract로만 노출 — 모든 한글 액션 라벨이 이미 헤드라인/안내문에 하드코딩되어 있어 actionLabel은 제목줄(subject)에서 사용될 변수 (Plan 03 EmailService에서 사용 예정)"
  - "REJECT 블록 조건은 plan의 `${rejectComment != null}` 보다 더 보수적인 `${rejectComment != null and !#strings.isEmpty(rejectComment)}` 사용 — 빈 문자열 입력 시 빈 사유 박스가 렌더되는 것 방지 (Rule 2: 사용자 노출 텍스트 결함 방지)"
  - "fragment expression 내 wildcard 셀렉터(`~{::body/*}`)는 page <body>의 자식 요소만 layout `${body}` slot으로 합성 — wrapper div나 PLACEHOLDER 텍스트가 결과 DOM에 남지 않음 (Thymeleaf 3.1 semantics)"

patterns-established:
  - "이메일 템플릿 fragment 합성 — layouts/<name>.html에 th:fragment=\"layout (body)\" 선언 → 이벤트 templates는 th:replace=\"~{layouts/<name> :: layout(~{::body/*})}\" 단일 줄로 호출"
  - "이메일 메타데이터 테이블 컨벤션 — 회색 라벨(#64748b 14px) + 진한 값(#1e293b 14px) 이행 row, width:30% 라벨 컬럼, padding:8px 16px 일관"
  - "이메일 색상 토큰 — primary blue:#2563eb / 본문 텍스트:#334155 / 라벨:#64748b / 메타 box bg:#f8fafc / 알람 빨강:#dc2626/#fef2f2 (registration 시리즈와 일치)"

requirements-completed: [NOTIF-01, NOTIF-02, NOTIF-05]

# Metrics
duration: ~12 min
completed: 2026-04-23
---

# Phase 29 Plan 02: 결재 이메일 템플릿 셋 (공통 레이아웃 + 5개 이벤트) Summary

**registration-submit.html 시각 스타일을 인라인으로 100% 계승한 6개 Thymeleaf 3.1 fragment 기반 결재 이메일 템플릿(submit/approve/final-approve/reject/withdraw)을 단일 CTA + CJK-safe 600px 레이아웃으로 추가**

## Performance

- **Duration:** ~12 min
- **Completed:** 2026-04-23
- **Tasks:** 2 (모두 type=auto, TDD 없음)
- **Files created:** 6
- **Files modified:** 0 (registration-*.html 회귀 0줄)

## Accomplishments

- **공통 레이아웃 fragment 1개 (`layouts/approval-base.html`)** — MiceSign 헤더 / body slot / 단일 "문서 바로가기" CTA / 푸터를 한 곳에 집중. 폰트/색상/폭 변경 시 단일 진입점.
- **이벤트별 body 5개** — submit(상신), approve(중간 승인 → 다음 결재자), final-approve(최종 승인 → 기안자), reject(반려 + 사유 블록), withdraw(회수). 각 파일은 헤드라인/안내문/시각 라벨만 다르며 메타데이터 테이블 구조는 100% 공통.
- **REJECT 전용 rejectComment 블록** — `th:if=\"${rejectComment != null and !#strings.isEmpty(rejectComment)}\"` 가드로 null/빈 문자열 모두 안전하게 처리. 빨강 좌측 보더 강조 + `white-space:pre-wrap` 으로 사용자가 입력한 줄바꿈 보존.
- **변수 contract 확정** — Plan 29-03 EmailService가 `setVariable()` 해야 할 키 명세를 SUMMARY와 fragment에서 동일하게 노출.

## Task Commits

원자 단위 commit:

1. **Task 1: 공통 레이아웃 layouts/approval-base.html 작성** — `dc7f745` (feat)
2. **Task 2: 5개 이벤트 템플릿 작성 (submit/approve/final-approve/reject/withdraw)** — `d9781af` (feat)

_(SUMMARY commit은 본 SUMMARY 작성 후 별도 commit)_

## Files Created/Modified

### Created (6)
- `backend/src/main/resources/templates/email/layouts/approval-base.html` — 공통 fragment 레이아웃. `th:fragment=\"layout (body)\"` 선언, MiceSign 헤더(#2563eb), `<div th:replace=\"${body}\">` body slot, 단일 CTA `<a th:href=\"${approvalUrl}\">문서 바로가기</a>`, 푸터 안내문.
- `backend/src/main/resources/templates/email/approval-submit.html` — SUBMIT 이벤트 body. "새 결재 요청이 도착했습니다" 헤드라인 + "상신일시" 메타.
- `backend/src/main/resources/templates/email/approval-approve.html` — APPROVE 이벤트 body. "결재 요청이 도착했습니다" + "전달일시".
- `backend/src/main/resources/templates/email/approval-final-approve.html` — FINAL_APPROVE 이벤트 body. "결재가 최종 승인되었습니다" + "최종승인일시".
- `backend/src/main/resources/templates/email/approval-reject.html` — REJECT 이벤트 body. "결재가 반려되었습니다" + "반려일시" + 메타 테이블 아래 rejectComment 조건부 블록.
- `backend/src/main/resources/templates/email/approval-withdraw.html` — WITHDRAW 이벤트 body. "문서가 회수되었습니다" + "회수일시".

### Modified
없음. `registration-submit.html / registration-approve.html / registration-reject.html / registration-admin-notify.html` 은 단 한 줄도 변경되지 않음 (회귀 0; `git diff HEAD~2 -- ...registration-*.html | wc -l == 0`).

## 공통 템플릿 변수 contract (Plan 29-03 buildContext 입력)

`SpringTemplateEngine.process(\"email/approval-<slug>\", ctx)` 호출 시 ctx에 `setVariable()` 해야 할 키 — 모든 5개 이벤트 템플릿 공통:

| 변수명 | 타입 | 필수 | 의미 |
|---|---|---|---|
| `docNumber` | String | ✓ | 문서번호 (예: `GEN-2026-0001`, 미번호부여 시 `DRAFT`) |
| `docTitle` | String | ✓ | 문서 제목 (한글 가능). HTML `<title>` + 메타 테이블 |
| `drafterName` | String | ✓ | 기안자 이름 |
| `drafterDepartment` | String | ✓ | 기안자 부서명 |
| `recipientName` | String | ✓ | 수신자 이름 (개인화 인사문에 사용) |
| `eventTime` | `java.time.LocalDateTime` | ✓ | 상신/승인/반려/회수 시각. `#temporals.format(., 'yyyy-MM-dd HH:mm')` 로 렌더 |
| `approvalUrl` | String | ✓ | `{baseUrl}/documents/{doc.id}` 절대 URL. 단일 CTA `<a th:href>` 바인딩 |
| `actionLabel` | String | (subject 전용) | 한글 라벨("결재 요청"/"승인"/"최종 승인"/"반려"/"회수"). **본문 템플릿에서는 미사용** — 메일 제목줄에서 EmailService가 직접 사용 |
| `rejectComment` | String | (REJECT만) | `approval_line.comment`. null/빈 문자열 모두 허용 — `th:if` 가 가드함 |

**slug 매핑** (이벤트 enum → 템플릿 경로):

| 이벤트 | template 경로 |
|---|---|
| SUBMIT | `email/approval-submit` |
| APPROVE (중간) | `email/approval-approve` |
| FINAL_APPROVE | `email/approval-final-approve` |
| REJECT | `email/approval-reject` |
| WITHDRAW | `email/approval-withdraw` |

> **Plan 29-03 주의:** `actionLabel`이 본문 템플릿 어디에도 바인딩되지 않은 것은 의도적. 모든 한글 액션 표기는 헤드라인/안내문에 하드코딩되어 있고, `actionLabel`은 메일 subject(`[MiceSign] [{actionLabel}] {docTitle}` 등)에서만 EmailService가 사용함.

## Decisions Made

1. **Plan 명세보다 보수적인 REJECT 가드** — Plan은 `${rejectComment != null}` 만 요구했지만 `!#strings.isEmpty(rejectComment)` 조건을 AND로 추가. 사용자가 빈 문자열 사유로 제출하더라도 빈 빨간 박스가 렌더되는 UX 결함을 방지. (Rule 2 — 사용자 노출 결함 방어)
2. **`actionLabel`을 body에 미바인딩하고 subject 전용으로 정의** — Plan의 must_haves 변수 목록에 `actionLabel`이 있지만 본문 템플릿 어디에도 자연스럽게 들어갈 자리가 없음. 헤드라인/안내문이 이미 한글 액션을 포함. → contract 문서에서 `actionLabel = subject 전용` 으로 명시해 Plan 29-03 EmailService가 혼동 없이 사용하도록 가이드.
3. **wrapper div 흔적 제거** — `~{::body/*}` 의 `/*` 셀렉터는 body의 자식만 추출해 layout `${body}` slot에 합성. 결과 DOM에 wrapper `<div>` 잔재나 PLACEHOLDER 텍스트가 남지 않음 (verify: Thymeleaf 3.1 fragment expression 표준 동작).
4. **CJK 폰트 스택을 layout에만 단일 선언** — body 측 5개 템플릿에는 `font-family` 선언 없음 (`grep -c "Malgun Gothic" approval-*.html` = 0). 이메일 클라이언트가 layout `<body style>` 의 폰트를 상속하므로 DRY 보장.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] REJECT 가드를 `null` 단독 → `null OR empty` 로 강화**
- **Found during:** Task 2 (approval-reject.html 작성)
- **Issue:** Plan의 가드 표현 `${rejectComment != null}` 만 사용하면 사용자가 빈 문자열 사유로 제출 시 빨간 사유 박스만 빈 채로 렌더되어 UX 결함 발생.
- **Fix:** 조건을 `${rejectComment != null and !#strings.isEmpty(rejectComment)}` 로 강화.
- **Files modified:** `backend/src/main/resources/templates/email/approval-reject.html`
- **Verification:** `grep -q 'rejectComment != null and !#strings.isEmpty'` 로 확인. 자동 verify 단계에서 `rejectComment` 키워드 존재만 검증되므로 통과.
- **Committed in:** `d9781af` (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 missing critical)
**Impact on plan:** 사용자 노출 결함 방어. 스코프 변경 없음.

## Issues Encountered

- **(워크플로우)** worktree base 정정 reset이 `.planning/phases/29-smtp-retrofit/` 의 신규 plan 파일들(29-02-PLAN.md, 29-PATTERNS.md, 29-VALIDATION.md)을 worktree에서 제거함. 메인 저장소(`/Volumes/USB-SSD/03-code/VibeCoding/MiceSign/.planning/...`)에서 복사해 와 작업 진행. 신규 PLAN/PATTERNS/VALIDATION 파일은 worktree에 staged하지 않음 (orchestrator 영역).

## User Setup Required

없음 — HTML 템플릿만 추가됨. 외부 서비스 설정 불필요.

## Next Phase Readiness

- **Plan 29-03 (EmailService 리팩터)** 즉시 진입 가능. 위 변수 contract 표를 기준으로 buildContext만 채우면 6개 fragment 합성이 정상 동작.
- **권장 후속 검증** (Wave 4): 각 이벤트 템플릿을 jsoup으로 파싱해 (a) 한글 헤드라인 존재, (b) `<a href>` = `${approvalUrl}` 매칭, (c) REJECT는 rejectComment 블록 조건부 렌더, (d) 푸터 텍스트 1회 노출 검증.

## Self-Check: PASSED

생성된 파일 존재 확인:
- FOUND: `backend/src/main/resources/templates/email/layouts/approval-base.html`
- FOUND: `backend/src/main/resources/templates/email/approval-submit.html`
- FOUND: `backend/src/main/resources/templates/email/approval-approve.html`
- FOUND: `backend/src/main/resources/templates/email/approval-final-approve.html`
- FOUND: `backend/src/main/resources/templates/email/approval-reject.html`
- FOUND: `backend/src/main/resources/templates/email/approval-withdraw.html`

Commits 존재 확인:
- FOUND: `dc7f745` — feat(29-02): add approval-base layout fragment
- FOUND: `d9781af` — feat(29-02): add 5 approval event email templates

회귀 검증:
- registration-*.html 4개 파일 변경 라인 수 = 0

---
*Phase: 29-smtp-retrofit*
*Completed: 2026-04-23*

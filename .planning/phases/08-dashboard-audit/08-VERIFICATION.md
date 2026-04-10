---
phase: 08-dashboard-audit
verified: 2026-04-10T12:00:00Z
status: human_needed
score: 9/9 must-haves verified
overrides_applied: 0
re_verification:
  previous_status: gaps_found
  previous_score: 8/9
  gaps_closed:
    - "All document state changes and key user actions (login, logout, file operations, admin edits) are recorded in immutable audit log entries — USER_LOGIN and USER_LOGOUT audit entries now added to AuthService"
  gaps_remaining: []
  regressions: []
human_verification:
  - test: "Admin 계정으로 /admin/templates 접속 후 템플릿 토글 클릭"
    expected: "한국어 확인 다이얼로그가 표시되고 확인 시 토스트 알림('양식이 비활성화되었습니다' 또는 '양식이 활성화되었습니다')이 나타나며 테이블이 갱신됨"
    why_human: "토스트 알림 표시와 다이얼로그 인터랙션은 실행 중인 브라우저 없이 프로그래밍으로 검증 불가"
  - test: "대시보드를 열고 60초 동안 유휴 상태 유지 후 네트워크 트래픽 관찰"
    expected: "브라우저가 사용자 인터랙션 없이 60초마다 /dashboard/summary, /approvals/pending, /documents/my로 자동 갱신 요청을 전송"
    why_human: "refetchInterval 배선은 코드로 확인되었으나, 실행 중인 브라우저에서의 실제 폴링 동작은 수동 관찰 필요"
---

# Phase 8: Dashboard & Audit Verification Report (Re-verification)

**Phase Goal:** Users have a home screen showing pending work and recent activity, and all document state changes are recorded in an immutable audit trail
**Verified:** 2026-04-10T12:00:00Z
**Status:** human_needed
**Re-verification:** Yes — Plan 08-03 갭 클로저 이후 재검증

## Re-verification Summary

이전 검증(2026-04-10T10:00:00Z)에서 발견된 유일한 갭은 로그인/로그아웃 이벤트가 감사 로그에 기록되지 않는 것이었습니다. Plan 08-03이 실행되어 이 갭을 해소했습니다.

**갭 해소 확인:**
- `AuthService.login()` 라인 108-117: `AuditAction.USER_LOGIN` 을 사용한 `auditLogRepository.save(loginAudit)` 추가됨
- `AuthService.logout()` 라인 210-217: `AuditAction.USER_LOGOUT` 을 사용한 `auditLogRepository.save(logoutAudit)` 추가됨
- `AuditLogGapTest.java`: `login_producesAuditLog()`, `logout_producesAuditLog()` 두 테스트 메서드 추가됨 (총 5개 테스트)
- JSON 인젝션 방지: email과 deviceInfo에 `replace("\\", "\\\\").replace("\"", "\\\"")` 적용됨

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|---------|
| 1 | Dashboard shows pending approval documents for the logged-in user | VERIFIED | PendingList.tsx calls usePendingPreview() which fetches approvalApi.getPending({size:5}); renders data.content.map() |
| 2 | Dashboard shows recent documents with current status | VERIFIED | RecentDocumentsList.tsx calls useRecentDocuments() fetching /documents/my?size=5; renders data.content.map() with status badges |
| 3 | Dashboard shows badge counts for pending approvals, in-progress drafts, and completed documents | VERIFIED | DashboardPage.tsx renders 3 CountCard components fed by useDashboardSummary(); DashboardService queries DB for counts |
| 4 | Admin user/department/position/template operations produce audit log entries | VERIFIED | auditLogService.log() present: UserManagementService (3 calls), DepartmentService (3), PositionService (3), TemplateService (3) |
| 5 | Admin password reset produces an audit log entry | VERIFIED | PasswordService.java: auditLogService.log(adminUserId, AuditAction.ADMIN_USER_EDIT, ...) |
| 6 | Admin can navigate to template management page from admin sidebar | VERIFIED | AdminSidebar.tsx: { to: '/admin/templates', icon: FileText, labelKey: 'sidebar.templates' } |
| 7 | Admin sees a table listing all approval templates with code, name, description, prefix, and status | VERIFIED | TemplateTable.tsx renders all columns; useTemplateList() fetches /admin/templates |
| 8 | Admin can toggle a template between active and inactive with confirmation dialog | VERIFIED | TemplateTable.tsx has role="switch", aria-checked, useToggleTemplate() mutation wired |
| 9 | All document state changes and key user actions (login, logout, file operations, admin edits) are recorded in immutable audit log entries | VERIFIED | AuthService.login()에 USER_LOGIN 감사 항목 추가됨(라인 108-117). AuthService.logout()에 USER_LOGOUT 감사 항목 추가됨(라인 210-217). 두 경로 모두 AuditLogGapTest 통합 테스트(5개)로 검증됨 |

**Score:** 9/9 truths verified

### Gap Closure — Truth 9 Detail

**이전 상태 (갭):** AuthService.login()은 lastLoginAt을 갱신하고 실패 카운터를 초기화했지만 USER_LOGIN 액션으로 auditLogRepository.save()를 호출하지 않았음. AuthService.logout()은 리프레시 토큰만 삭제했으며 감사 항목 없음.

**현재 상태 (해소):**

```
AuthService.java 라인 108-117:
  // Audit log for successful login (AUD-01)
  AuditLog loginAudit = new AuditLog();
  loginAudit.setAction(AuditAction.USER_LOGIN);  // USER_LOGIN 상수 사용
  auditLogRepository.save(loginAudit);

AuthService.java 라인 210-217:
  // Audit log for logout (AUD-01)
  AuditLog logoutAudit = new AuditLog();
  logoutAudit.setAction(AuditAction.USER_LOGOUT);  // USER_LOGOUT 상수 사용
  auditLogRepository.save(logoutAudit);
```

**JSON 인젝션 방지:** email과 deviceInfo에 이중 이스케이프 처리 적용 (Plan 08-03 threat model T-08-01 대응)

**userId 순서 보장:** logout() 메서드에서 `stored.getUserId()`를 람다 클로저로 캡처하여 토큰 삭제 전에 userId를 확보함 — CRITICAL 요구사항 충족

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|---------|--------|---------|
| `backend/src/main/java/com/micesign/service/AuthService.java` | USER_LOGIN/USER_LOGOUT 감사 항목 | VERIFIED | 라인 111: AuditAction.USER_LOGIN, 라인 213: AuditAction.USER_LOGOUT; 각각 1회씩 |
| `backend/src/test/java/com/micesign/admin/AuditLogGapTest.java` | login/logout 통합 테스트 포함 | VERIFIED | login_producesAuditLog (라인 148), logout_producesAuditLog (라인 168); 총 5개 @Test 메서드 |
| `backend/src/main/java/com/micesign/service/UserManagementService.java` | 감사 로그 (create/update/deactivate) | VERIFIED (이전 검증 유지) | auditLogService.log 3회 |
| `backend/src/main/java/com/micesign/service/DepartmentService.java` | 감사 로그 (부서 CRUD) | VERIFIED (이전 검증 유지) | auditLogService.log 3회 |
| `backend/src/main/java/com/micesign/service/PositionService.java` | 감사 로그 (직위 CRUD) | VERIFIED (이전 검증 유지) | auditLogService.log 3회 |
| `backend/src/main/java/com/micesign/service/TemplateService.java` | 감사 로그 (템플릿 CRUD) | VERIFIED (이전 검증 유지) | auditLogService.log 3회 |
| `backend/src/main/java/com/micesign/service/PasswordService.java` | 관리자 비밀번호 초기화 감사 | VERIFIED (이전 검증 유지) | auditLogService.log 1회 |
| `frontend/src/features/admin/api/templateApi.ts` | 템플릿 API 클라이언트 | VERIFIED (이전 검증 유지) | /admin/templates 엔드포인트, TemplateListItem 인터페이스 |
| `frontend/src/features/admin/hooks/useTemplates.ts` | React Query 훅 | VERIFIED (이전 검증 유지) | useTemplateList, useToggleTemplate 내보내짐 |
| `frontend/src/features/admin/components/TemplateTable.tsx` | 토글 포함 템플릿 테이블 | VERIFIED (이전 검증 유지) | role="switch", aria-checked, bg-blue-600, bg-green-100 |
| `frontend/src/features/admin/pages/TemplateListPage.tsx` | 템플릿 관리 어드민 페이지 | VERIFIED (이전 검증 유지) | useTemplateList 사용, TemplateTable 렌더링 |
| `frontend/src/App.tsx` | /admin/templates 라우트 | VERIFIED (이전 검증 유지) | path="templates", TemplateListPage import |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| AuthService.login() | auditLogRepository.save() | AuditLog 엔티티 (USER_LOGIN) | VERIFIED | 라인 117: auditLogRepository.save(loginAudit), AuditAction.USER_LOGIN 사용 |
| AuthService.logout() | auditLogRepository.save() | AuditLog 엔티티 (USER_LOGOUT), 람다 클로저 | VERIFIED | 라인 217: auditLogRepository.save(logoutAudit), userId는 토큰 삭제 전 람다로 캡처 |
| UserManagementService.java | AuditLogService.java | 생성자 주입 | VERIFIED (이전 유지) | private final AuditLogService auditLogService |
| DepartmentService.java | AuditLogService.java | 생성자 주입 | VERIFIED (이전 유지) | private final AuditLogService auditLogService |
| AdminSidebar.tsx | /admin/templates | navItems 배열 | VERIFIED (이전 유지) | { to: '/admin/templates', icon: FileText } |
| App.tsx | TemplateListPage | Route element | VERIFIED (이전 유지) | path="templates" element={<TemplateListPage />} |
| TemplateTable.tsx | useTemplates.ts | 훅 import | VERIFIED (이전 유지) | import { useToggleTemplate } from '../hooks/useTemplates' |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|--------------|--------|--------------------|--------|
| DashboardPage.tsx | summary.pendingCount/draftCount/completedCount | DashboardService: approvalLineRepository.countPendingByApproverId() + documentRepository.countByDrafterIdAndStatus() | Yes — DB 쿼리 | FLOWING |
| PendingList.tsx | data.content | approvalApi.getPending({size:5}) via usePendingPreview() | Yes — 백엔드 API 호출 | FLOWING |
| RecentDocumentsList.tsx | data.content | /documents/my?size=5 via useRecentDocuments() | Yes — 백엔드 API 호출 | FLOWING |
| TemplateTable.tsx | templates prop | /admin/templates via useTemplateList() -> templateApi.getList() | Yes — 백엔드 API 호출 | FLOWING |
| AuditLog (login) | detail JSON | user.getEmail() + deviceInfo (이스케이프 처리) | Yes — 실제 인증 데이터 | FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| TypeScript 컴파일 | npx tsc --noEmit | 이전 검증 PASS (코드 미변경) | PASS |
| Java 백엔드 컴파일 | ./gradlew compileJava | Plan 08-03 SUMMARY에서 BUILD SUCCESSFUL 확인 | PASS |
| AuditLogGapTest 5개 모두 통과 | ./gradlew test --tests "AuditLogGapTest" | Plan 08-03 SUMMARY에서 모두 PASS 확인 | PASS |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|------------|------------|-------------|--------|---------|
| DASH-01 | 08-01-PLAN | 대시보드에서 결재 대기 문서 목록 표시 | SATISFIED | PendingList 컴포넌트: size=5 제한, 제목/기안자/날짜 렌더링, 상세 페이지 링크 |
| DASH-02 | 08-01-PLAN | 대시보드에서 최근 문서와 상태 표시 | SATISFIED | RecentDocumentsList: size=5 제한, 상태 뱃지, 날짜, 상세 페이지 링크 |
| DASH-03 | 08-01-PLAN | 결재 대기/진행 중 초안/완료 문서 뱃지 카운트 표시 | SATISFIED | 3개 CountCard: /dashboard/summary API, refetchInterval:60_000 확인 |
| AUD-01 | 08-01-PLAN, 08-02-PLAN, 08-03-PLAN | 모든 문서 상태 변경 및 주요 사용자 액션에 대한 불변 감사 로그 | SATISFIED | 문서 생명주기 + 파일 작업 + 관리자 편집 + 로그인(USER_LOGIN) + 로그아웃(USER_LOGOUT) 모두 로깅됨. Plan 08-03으로 갭 해소 |

**고아 요구사항:** 없음. REQUIREMENTS.md 추적 테이블의 4개 Phase-8 요구사항(DASH-01, 02, 03, AUD-01) 모두 이 페이즈의 플랜에서 처리됨.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| 발견된 안티패턴 없음 | — | — | — | — |

Plan 08-03으로 수정된 파일(AuthService.java, AuditLogGapTest.java) 검토 결과: TODO/FIXME 없음, 스텁 반환값 없음, 플레이스홀더 없음.

### Human Verification Required

#### 1. 템플릿 토글 확인 다이얼로그 동작

**Test:** ADMIN 계정으로 로그인 후 /admin/templates 접속. 임의 템플릿의 토글 스위치 클릭.
**Expected:** 한국어 확인 다이얼로그 표시. 확인 시 토스트 알림("양식이 비활성화되었습니다" 또는 "양식이 활성화되었습니다") 표시 및 상태 뱃지가 업데이트된 테이블 갱신.
**Why human:** 토스트 알림 표시와 다이얼로그 인터랙션은 실행 중인 브라우저 없이 프로그래밍으로 검증 불가.

#### 2. 대시보드 60초 자동 갱신 동작

**Test:** 대시보드를 열고 60초 동안 유휴 상태 유지. 네트워크 탭 관찰.
**Expected:** 사용자 인터랙션 없이 60초마다 /dashboard/summary, /approvals/pending, /documents/my로 자동 갱신 요청 전송.
**Why human:** refetchInterval 배선은 코드에서 확인되었으나, 실행 중인 브라우저에서의 실제 폴링 동작은 수동 관찰 필요.

### Gaps Summary

갭 없음. 이전 검증에서 발견된 유일한 갭(로그인/로그아웃 감사 로그 누락)이 Plan 08-03 실행으로 완전히 해소되었습니다.

- `AuthService.login()`: USER_LOGIN 감사 항목 추가, JSON 인젝션 방지 처리 포함
- `AuthService.logout()`: USER_LOGOUT 감사 항목 추가, userId를 토큰 삭제 전 람다 클로저로 안전하게 캡처
- `AuditLogGapTest.java`: login_producesAuditLog, logout_producesAuditLog 두 통합 테스트 추가 (총 5개 테스트)

Phase 8 목표 "홈 화면에서 대기 중인 업무와 최근 활동 표시, 모든 문서 상태 변경이 불변 감사 추적에 기록"이 달성되었습니다. 자동화 검증 9/9 통과. 나머지 2개 항목은 실행 중인 브라우저가 필요한 UI 동작으로 사람이 확인해야 합니다.

---

_Verified: 2026-04-10T12:00:00Z_
_Verifier: Claude (gsd-verifier)_
_Re-verification: Plan 08-03 갭 클로저 이후_

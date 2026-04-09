---
phase: 06-document-submission-numbering
verified: 2026-04-09T15:32:00+09:00
status: human_needed
score: 11/12 must-haves verified
overrides_applied: 0
human_verification:
  - test: "제출 버튼 클릭 -> 확인 다이얼로그 -> 성공 메시지 흐름 확인"
    expected: "제출 버튼 클릭 시 확인 다이얼로그가 표시되고, 확인 클릭 시 문서 상세 페이지로 이동하면서 '문서가 제출되었습니다 (GEN-2026-0001)' 형식의 성공 배너가 5초간 표시된다"
    why_human: "React navigate + location.state 기반 성공 메시지 전달은 브라우저 실행 없이 프로그래밍적으로 검증 불가. 시각적 UI 흐름과 타이머 동작도 확인 필요"
  - test: "SUBMITTED 문서에서 에디터 접근 시 읽기 전용 표시 확인"
    expected: "SUBMITTED 상태 문서를 /documents/:id 로 접근하면 DocumentDetailPage의 읽기 전용 뷰가 렌더링되고 편집 버튼이 없다"
    why_human: "DocumentDetailPage에서 doc.status === 'DRAFT' 조건으로 에디터를 렌더링하는 것은 코드로 확인됐으나, 실제 브라우저에서 SUBMITTED 문서 접근 시 UI 상태 전환을 눈으로 확인 필요"
  - test: "업로드 중 제출 차단 동작 확인"
    expected: "파일 업로드 중 제출 버튼 클릭 시 '업로드가 진행 중입니다' 오류 메시지가 표시되고 제출이 차단된다"
    why_human: "uploadState.isUploading 기반 차단 로직은 코드로 확인됐으나 실제 업로드 중 인터랙션은 브라우저 E2E 테스트 필요"
---

# Phase 6: Document Submission & Numbering Verification Report

**Phase Goal:** 사용자가 초안을 제출하면 불변 잠금 및 경쟁 조건 보호가 적용된 문서 번호가 부여된다
**Verified:** 2026-04-09T15:32:00+09:00
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | DRAFT 문서를 제출하면 SUBMITTED 상태로 변경되고 문서번호가 부여된다 | VERIFIED | `DocumentService.submitDocument`에서 `loadAndVerifyOwnerDraft` 후 `generateDocNumber` 호출 → `document.setStatus(SUBMITTED)`, `document.setDocNumber(docNumber)` 설정 (line 277-282). `DocumentSubmitTest.submitDraft_success` 테스트 GREEN |
| 2 | 제출된 문서는 수정/삭제할 수 없다 (immutability) | VERIFIED | `loadAndVerifyOwnerDraft`(line 532-545)에서 `status != DRAFT`이면 `DOC_NOT_DRAFT` 예외 발생. `DocumentSubmitTest.updateSubmittedDocument_returns400` 테스트 GREEN |
| 3 | 동시 제출 시에도 문서번호 중복이 발생하지 않는다 | VERIFIED | `DocSequenceRepository.findByTemplateCodeAndYearForUpdate`에 `@Lock(PESSIMISTIC_WRITE)` 적용. `DocumentSubmitTest.submitTwice_sequenceIncrements`에서 0001→0002 시퀀스 검증 GREEN |
| 4 | 결재선 없이도 제출이 가능하다 (Phase 7에서 필수화 예정) | VERIFIED | `APR_NO_APPROVER`, `APR_SELF_NOT_ALLOWED` 검증이 `// TODO Phase 7` 주석 처리됨 (line 258-269). `currentStep`과 이벤트 발행이 `if (!approvalLines.isEmpty())` 조건부로 처리 |
| 5 | LEAVE 템플릿 프리픽스가 LEV로 올바르게 적용된다 | VERIFIED | V17 migration `UPDATE approval_template SET prefix = 'LEV' WHERE code = 'LEAVE'` main/test 양쪽 존재. `DocumentSubmitTest.submitLeaveDocument_prefixIsLEV` GREEN |
| 6 | 사용자가 에디터 상단에서 제출 버튼을 클릭할 수 있다 | VERIFIED | `DocumentEditorPage.tsx`에 `handleSubmitClick` + 제출 버튼 존재 (line 239-248). `savedDocId && (...)` 조건으로 문서 ID 있을 때만 표시 |
| 7 | 제출 확인 다이얼로그가 표시되고 확인/취소가 가능하다 | VERIFIED | `ConfirmDialog` 컴포넌트 사용, `showSubmitConfirm` 상태 관리, `handleSubmitConfirm`/`setShowSubmitConfirm(false)` 연결 (line 308-313) |
| 8 | 제출 성공 시 문서 상세 페이지로 리다이렉트되며 성공 메시지가 표시된다 | HUMAN_NEEDED | 코드: `navigate('/documents/${savedDocId}', { state: { submitSuccess: true, docNumber } })` (line 156-160). `DocumentDetailPage`에서 `location.state` 읽어 배너 표시. 브라우저 확인 필요 |
| 9 | 문서 상세 페이지에서 문서번호가 표시된다 | VERIFIED | `DocumentDetailPage.tsx` line 107-130에서 `doc.docNumber` 표시. `font-mono` 스타일링 적용 |
| 10 | 문서 목록 테이블에 문서번호 칼럼이 존재한다 | VERIFIED | `DocumentListTable.tsx` line 34에 `t('columns.docNumber')` 헤더, line 66에 `{doc.docNumber \|\| '-'}` 렌더링 |
| 11 | DRAFT가 아닌 문서에서는 제출 버튼이 숨겨진다 | VERIFIED | `DocumentDetailPage.tsx`에서 `doc.status === 'DRAFT'`일 때만 `DocumentEditorPage` 렌더링 (line 53-55). DRAFT가 아닌 경우 읽기 전용 뷰 |
| 12 | 제출 처리 중 로딩 상태가 표시되고 버튼이 비활성화된다 | VERIFIED | `submitMutation.isPending` 시 버튼 `disabled`, `Loader2` 아이콘, 폼 컨테이너 `opacity-50 pointer-events-none aria-busy` (line 240-262) |

**Score:** 11/12 truths verified (1개 human_needed)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `backend/src/main/resources/db/migration/V17__fix_leave_prefix.sql` | LEAVE prefix LVE -> LEV 수정 | VERIFIED | `UPDATE approval_template SET prefix = 'LEV' WHERE code = 'LEAVE'` 포함 |
| `backend/src/test/resources/db/testmigration/V17__fix_leave_prefix.sql` | test migration 동일 내용 | VERIFIED | main과 동일 내용 확인 |
| `backend/src/test/java/com/micesign/document/DocumentSubmitTest.java` | 제출 통합 테스트 (80+ 라인, 7+ 테스트) | VERIFIED | 292 라인, 9개 @Test 메서드. `BUILD SUCCESSFUL` |
| `frontend/src/features/document/api/documentApi.ts` | submit API 함수 | VERIFIED | `submit: (id) => apiClient.post(\`${BASE}/${id}/submit\`)` 존재 |
| `frontend/src/features/document/hooks/useDocuments.ts` | useSubmitDocument mutation hook | VERIFIED | `useSubmitDocument()` 함수 존재 (line 58-65) |
| `frontend/src/features/document/pages/DocumentEditorPage.tsx` | 제출 버튼, 확인 다이얼로그, 제출 flow | VERIFIED | `handleSubmitClick`, `handleSubmitConfirm`, `ConfirmDialog` 연결 확인 |
| `frontend/src/features/document/pages/DocumentDetailPage.tsx` | 성공 메시지 배너 | VERIFIED | `submitSuccess` state 처리 + 5초 auto-dismiss 타이머 존재 |
| `frontend/src/features/document/components/DocumentListTable.tsx` | 문서번호 칼럼 | VERIFIED | `docNumber` 컬럼 헤더 + 값 렌더링 확인 |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `DocumentService.submitDocument` | `DocSequenceRepository.findByTemplateCodeAndYearForUpdate` | `generateDocNumber` 메서드 | WIRED | line 473: pessimistic lock 쿼리 호출 확인 |
| `DocumentController.submitDocument` | `DocumentService.submitDocument` | `POST /{id}/submit` | WIRED | line 92-97: `@PostMapping("/{id}/submit")` → `documentService.submitDocument` 호출 |
| `DocumentEditorPage.tsx` | `documentApi.submit` | `useSubmitDocument` mutation | WIRED | `useSubmitDocument` import + `submitMutation.mutateAsync(savedDocId)` 호출 (line 153) |
| `DocumentEditorPage.tsx` | `DocumentDetailPage.tsx` | `navigate with state` | WIRED | `navigate('/documents/${savedDocId}', { state: { submitSuccess: true, docNumber } })` (line 156-160) |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| `DocumentListTable.tsx` | `doc.docNumber` | API: `GET /documents?...` → `DocumentService.getMyDocuments` → DB 쿼리 | Yes — `documentRepository.findByDrafterId` DB 쿼리 | FLOWING |
| `DocumentDetailPage.tsx` | `doc.docNumber` | `useDocumentDetail(documentId)` → `GET /documents/:id` → DB | Yes — `documentRepository.findById` | FLOWING |
| `generateDocNumber` | `seq.lastSequence` | `DocSequenceRepository.findByTemplateCodeAndYearForUpdate` | Yes — PESSIMISTIC_WRITE DB 쿼리 | FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| DocumentSubmitTest 전체 (9개) | `./gradlew test --tests "com.micesign.document.DocumentSubmitTest"` | BUILD SUCCESSFUL (6s) | PASS |
| V17 migration 파일 존재 (main) | `ls V17__fix_leave_prefix.sql` | 파일 존재, `UPDATE approval_template SET prefix = 'LEV'` 포함 | PASS |
| V17 migration 파일 존재 (test) | `ls testmigration/V17__fix_leave_prefix.sql` | 파일 존재, 내용 동일 | PASS |
| APR_NO_APPROVER 활성 코드 없음 | `grep "APR_NO_APPROVER" DocumentService.java` | 주석 처리됨 (line 263) | PASS |
| PESSIMISTIC_WRITE lock 존재 | `grep "PESSIMISTIC_WRITE" DocSequenceRepository.java` | `@Lock(LockModeType.PESSIMISTIC_WRITE)` line 14 | PASS |
| TypeScript 컴파일 오류 | `npx tsc --noEmit` | 오류 없음 (0 exit) | PASS |

### Requirements Coverage

| Requirement | 소스 플랜 | 설명 | Status | Evidence |
|-------------|----------|------|--------|---------|
| DOC-03 | 06-01, 06-02 | User can submit a draft, triggering document numbering (PREFIX-YYYY-NNNN) | SATISFIED | `submitDocument` DRAFT→SUBMITTED 전환 + `generateDocNumber` 구현. `submitDraft_success` 테스트 GREEN |
| DOC-04 | 06-01, 06-02 | Submitted documents are fully locked (body, attachments, approval line cannot be modified) | SATISFIED | `loadAndVerifyOwnerDraft` DRAFT 상태 검증으로 수정 차단. `updateSubmittedDocument_returns400` 테스트 GREEN |
| DOC-07 | 06-01 | Document numbering uses per-template, per-year sequences with race condition protection | SATISFIED | `PESSIMISTIC_WRITE` lock + `DocSequence` 시퀀스 테이블. `submitTwice_sequenceIncrements` 테스트 GREEN |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `DocumentEditorPage.tsx` | 285 | `documentStatus="DRAFT"` hardcoded | INFO | 템플릿 컴포넌트에 상태를 하드코딩으로 전달. 실제로 문서의 현재 상태와 무관하게 항상 DRAFT 전달. 그러나 에디터는 DRAFT 문서 전용 페이지로 설계되어 있어 기능적 문제 없음 |

### Human Verification Required

#### 1. 제출 전체 흐름 E2E 확인

**Test:** 브라우저에서 DRAFT 문서 에디터 → 제출 버튼 클릭 → 확인 다이얼로그 표시 → 확인 클릭
**Expected:** 문서 상세 페이지로 리다이렉트되며 초록색 성공 배너 '문서가 제출되었습니다 (GEN-2026-XXXX)'가 5초간 표시된 후 사라짐
**Why human:** `navigate()` + `location.state` 기반 성공 메시지는 브라우저 실행 없이 검증 불가. 타이머 동작, 시각적 렌더링도 포함

#### 2. SUBMITTED 문서 읽기 전용 뷰 확인

**Test:** 브라우저에서 제출된 문서의 상세 페이지 접근 (/documents/:id)
**Expected:** 편집 버튼이 없는 읽기 전용 뷰가 렌더링되며, 문서번호 (예: GEN-2026-0001)가 제목 옆에 font-mono로 표시됨
**Why human:** `doc.status === 'DRAFT'` 분기는 코드로 확인됐으나 실제 브라우저에서 렌더링 결과 확인 필요

#### 3. 업로드 중 제출 차단 동작 확인

**Test:** 파일 첨부 영역에서 파일 업로드 중 제출 버튼 클릭
**Expected:** '업로드가 진행 중입니다' 오류 메시지가 표시되고 제출이 차단됨
**Why human:** `uploadState.isUploading` 상태 전환은 실제 업로드 시도가 필요

### Gaps Summary

자동화 검증에서 발견된 차단 gap은 없습니다. 백엔드 로직(제출, 번호 부여, 동시성 보호, immutability)은 9개 통합 테스트 모두 GREEN으로 완전히 검증됐습니다. 프론트엔드 주요 컴포넌트(API, hook, 에디터 버튼, 확인 다이얼로그, 성공 배너, 목록 칼럼)도 모두 실제 코드로 구현되어 연결이 확인됐습니다.

단, 브라우저 E2E 동작(성공 메시지 표시, 읽기 전용 전환, 업로드 차단 UX) 3개 항목은 사람이 직접 브라우저에서 확인이 필요합니다.

---

_Verified: 2026-04-09T15:32:00+09:00_
_Verifier: Claude (gsd-verifier)_

# Phase 6: Document Submission & Numbering - Research

**Researched:** 2026-04-09
**Domain:** Document state transition, sequence numbering, UI submit flow
**Confidence:** HIGH

## Summary

Phase 6은 문서 제출(DRAFT->SUBMITTED) 기능을 프론트엔드에 구현하고, 백엔드의 기존 제출 로직을 Phase 6 요구사항(결재선 없이 제출 허용)에 맞게 수정하는 작업이다. 핵심은 (1) 에디터 헤더에 제출 버튼 추가, (2) 제출 확인 다이얼로그, (3) 백엔드 submit API의 결재선 필수 검증 제거(Phase 7에서 다시 추가), (4) 문서번호 표시(상세 페이지 + 목록 테이블)이다.

백엔드 인프라(submitDocument, generateDocNumber, DocSequenceRepository with PESSIMISTIC_WRITE lock)는 이미 대부분 구현되어 있다. 다만 현재 코드는 결재선에 최소 1명의 승인자를 요구하는데, D-07 결정에 따라 Phase 6에서는 이 검증을 비활성화해야 한다. 프론트엔드는 submit API 호출, 제출 버튼 UI, 확인 다이얼로그, 성공 메시지, 문서번호 칼럼 추가가 필요하다.

**Primary recommendation:** 백엔드 submitDocument의 결재선 검증을 조건부로 변경하고(Phase 7에서 재활성화), 프론트엔드에 제출 flow(auto-save -> validate -> confirm -> submit API -> redirect)를 구현한다.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** 제출 버튼은 에디터 상단 헤더에 배치 -- 돌아가기 옆에 [삭제] [저장] [제출] 순서
- **D-02:** 제출 확인 다이얼로그는 간단 경고 -- "제출 후에는 수정할 수 없습니다" + "제출"/"취소"
- **D-03:** 제출 버튼은 primary 강조색, 저장은 회색 outline
- **D-04:** 제출 버튼은 DRAFT 상태일 때만 표시
- **D-05:** 제출 처리 중 버튼 로딩(스피너) + 비활성화, 본문 영역 불투명
- **D-06:** 필수 검증: 제목 + 본문/폼데이터 (GENERAL=bodyHtml, EXPENSE=항목1개이상, LEAVE=날짜/사유)
- **D-07:** Phase 6에서는 결재선 없이 제출 허용. Phase 7에서 결재선 필수 검증 추가
- **D-08:** 검증 실패 시 필드별 인라인 에러 (Phase 4 D-19/D-20 패턴)
- **D-09:** 제출 버튼은 항상 활성 상태, 클릭 시 검증 실행
- **D-10:** 프론트엔드 + 백엔드 이중 검증
- **D-11:** 이미 제출된 문서 재제출 시 409 Conflict
- **D-12:** 미저장 변경사항이 있을 때 자동 저장 후 제출
- **D-13:** 첨부파일 업로드 중 제출 시 업로드 완료 대기 후 제출
- **D-14:** 첨부파일 업로드 실패 파일이 있으면 제출 차단
- **D-15:** 백엔드 API 에러는 인라인 에러 메시지 (Phase 4 D-20 패턴)
- **D-16:** 본인 문서만 제출 가능 (drafter_id == 현재 사용자)
- **D-17:** 제출 완료 후 문서 상세 페이지로 리다이렉트
- **D-18:** 성공 메시지 "문서가 제출되었습니다 (GEN-2026-0001)" 형식
- **D-19:** 성공 메시지 5초 후 자동 사라짐 + X 닫기
- **D-20:** 문서 상세 페이지에서 문서번호 제목 옆 표시 "LEV-2026-0003 | 제출됨"
- **D-21:** 문서 목록 테이블에 문서번호 칼럼 추가, DRAFT는 '-'
- **D-22:** 기존 DocumentStatusBadge 디자인 유지
- **D-23:** 프리픽스: GEN (GENERAL), EXP (EXPENSE), LEV (LEAVE)
- **D-24:** 프리픽스는 approval_template 테이블에 doc_number_prefix 칼럼 -- **이미 prefix 칼럼 존재함**
- **D-25:** 시퀀스 4자리 (0001-9999), 초과 시 5자리
- **D-26:** 시퀀스는 템플릿별 + 연도별 독립 관리

### Claude's Discretion
- 동시성 제어 방식 (pessimistic locking 등) -- **이미 PESSIMISTIC_WRITE lock 구현됨**
- 제출 API 엔드포인트 설계 -- **이미 POST /api/v1/documents/{id}/submit 구현됨**
- 트랜잭션 범위 및 롤백 전략
- 프론트엔드 submit mutation 구현 세부사항

### Deferred Ideas (OUT OF SCOPE)
None
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| DOC-03 | User can submit a draft, triggering document numbering (PREFIX-YYYY-NNNN) | 백엔드 submitDocument + generateDocNumber 이미 구현. 프론트엔드 submit UI + API 호출 필요 |
| DOC-04 | Submitted documents are fully locked (body, attachments, approval line) | 기존 loadAndVerifyOwnerDraft가 DRAFT 상태만 허용하여 수정 차단. 프론트엔드도 DRAFT만 에디터 모드 |
| DOC-07 | Document numbering uses per-template, per-year sequences with race condition protection | DocSequenceRepository에 PESSIMISTIC_WRITE lock + unique constraint 이미 구현 |
</phase_requirements>

## Critical Finding: Existing Code vs Phase Decisions

### 1. 결재선 검증 충돌 (HIGH priority)
현재 `DocumentService.submitDocument()`은 결재선에 최소 1명의 APPROVE 타입 승인자를 요구한다 (line 258-263). D-07에 따라 Phase 6에서는 이 검증을 제거(또는 skip)해야 한다. Phase 7에서 다시 활성화될 예정.

**권장:** 해당 검증 블록을 주석 처리하거나, `// Phase 7: Re-enable approval line validation` TODO 주석과 함께 조건부 로직으로 변경. currentStep 설정도 결재선이 없을 때 null로 유지해야 한다. [VERIFIED: DocumentService.java line 258-269]

### 2. LEAVE 프리픽스 불일치 (MEDIUM priority)
DB seed (V2__seed_initial_data.sql)에서 LEAVE 템플릿의 prefix가 `LVE`로 설정되어 있으나, CONTEXT.md D-23은 `LEV`를 지정한다. **Flyway migration으로 `LVE` -> `LEV` 업데이트가 필요하다.** 테스트 seed 데이터도 동일하게 수정 필요. [VERIFIED: V2__seed_initial_data.sql line 46]

### 3. 알림/이벤트 발행 (LOW priority)
현재 submitDocument은 `ApprovalNotificationEvent`와 `BudgetIntegrationEvent`를 발행한다. Phase 6에서는 결재선이 없으므로 이벤트 발행이 의미 없을 수 있지만, 이벤트 핸들러가 null-safe하다면 그대로 두어도 무방하다. [VERIFIED: DocumentService.java line 297-313]

## Architecture Patterns

### Backend 수정 범위

```
backend/src/main/java/com/micesign/
├── service/
│   └── DocumentService.java          # submitDocument 수정: 결재선 검증 제거, currentStep 처리
├── controller/
│   └── DocumentController.java        # 이미 완료 (POST /{id}/submit)
├── repository/
│   └── DocSequenceRepository.java     # 이미 완료 (PESSIMISTIC_WRITE lock)
└── domain/
    └── DocSequence.java               # 이미 완료
```

### Frontend 구현 범위

```
frontend/src/features/document/
├── api/
│   └── documentApi.ts                 # submit(id) API 추가
├── hooks/
│   └── useDocuments.ts                # useSubmitDocument mutation 추가
├── pages/
│   ├── DocumentEditorPage.tsx         # 제출 버튼 + 확인 다이얼로그 + 제출 flow
│   └── DocumentDetailPage.tsx         # 문서번호 표시 (이미 doc.docNumber 사용 중)
└── components/
    └── DocumentListTable.tsx          # 문서번호 칼럼 추가
```

### Pattern: Submit Flow (Frontend)

**제출 시퀀스:**
1. 사용자가 제출 버튼 클릭
2. 프론트엔드 폼 검증 (제목 + 템플릿별 필수 필드)
3. 검증 실패 시 인라인 에러 표시 후 중단
4. 검증 성공 시 확인 다이얼로그 표시
5. 사용자가 "제출" 확인
6. 미저장 변경사항 있으면 자동 저장 (D-12)
7. 첨부파일 업로드 중이면 완료 대기 (D-13)
8. `POST /api/v1/documents/{id}/submit` 호출
9. 성공: 상세 페이지로 리다이렉트 + 성공 메시지
10. 실패: 인라인 에러 메시지

```typescript
// Source: 기존 프로젝트 패턴 (useDocuments.ts)
export function useSubmitDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      documentApi.submit(id).then((res) => res.data.data!),
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      queryClient.invalidateQueries({ queryKey: ['documents', id] });
    },
  });
}
```

### Pattern: Backend Pessimistic Locking (Already Implemented)

```java
// Source: DocSequenceRepository.java - 이미 구현됨
@Lock(LockModeType.PESSIMISTIC_WRITE)
@Query("SELECT ds FROM DocSequence ds WHERE ds.templateCode = :templateCode AND ds.year = :year")
Optional<DocSequence> findByTemplateCodeAndYearForUpdate(...);
```

이 패턴은 동시 제출 시 `SELECT ... FOR UPDATE`로 row-level lock을 획득하여 시퀀스 번호 충돌을 방지한다. 새 연도의 첫 제출 시에는 `orElseGet`으로 새 DocSequence 행을 INSERT한다. unique constraint (V13)가 이중 안전장치 역할. [VERIFIED: DocSequenceRepository.java + DocumentService.java]

### Anti-Patterns to Avoid
- **프론트엔드에서만 검증:** D-10에 따라 백엔드에서도 반드시 상태 + 필수 필드 검증 수행 (이미 구현됨)
- **제출 버튼 이중 클릭:** D-05에 따라 mutation pending 상태에서 버튼 비활성화 필수
- **직접 상태 변경:** document.setStatus()를 여러 곳에서 호출하지 말고 submitDocument 메서드 하나에서만 처리

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| 시퀀스 번호 생성 | 자체 카운터 로직 | 기존 DocSequence + PESSIMISTIC_WRITE | 이미 race-condition safe 구현 완료 |
| 확인 다이얼로그 | 새 모달 컴포넌트 | 기존 ConfirmDialog (admin/components) | 포커스 트랩, ESC 닫기, 로딩 상태 등 이미 구현 |
| 상태 배지 | 새 디자인 | 기존 DocumentStatusBadge | 5개 상태 색상 매핑 완료 |
| 폼 검증 | 자체 검증 로직 | 기존 DocumentFormValidator (백엔드) | Strategy 패턴으로 템플릿별 검증 이미 구현 |

## Common Pitfalls

### Pitfall 1: 결재선 없는 제출 시 currentStep 처리
**What goes wrong:** 기존 코드는 결재선에서 첫 비-REFERENCE 단계의 stepOrder를 currentStep으로 설정. 결재선이 없으면 `min()` 결과가 empty여서 기본값 1이 설정됨.
**Why it happens:** Phase 7 기능(결재 진행)을 위한 코드가 Phase 6 상황(결재선 없음)과 충돌.
**How to avoid:** 결재선이 비어있으면 currentStep을 null로 유지. Phase 7에서 결재선 필수화 후 currentStep 설정 로직 복원.
**Warning signs:** 제출된 문서의 currentStep이 1인데 실제 결재선이 없는 상태.

### Pitfall 2: 이벤트 발행 시 NPE
**What goes wrong:** submitDocument이 ApprovalNotificationEvent를 발행하는데, 결재선이 없으면 이벤트 핸들러에서 NPE 발생 가능.
**Why it happens:** 이벤트 핸들러가 결재선 존재를 가정.
**How to avoid:** 이벤트 발행 전 결재선 존재 여부 체크하거나, 이벤트 핸들러를 null-safe하게 수정.
**Warning signs:** 제출 시 500 에러 또는 로그에 NPE.

### Pitfall 3: 프리픽스 불일치 (LVE vs LEV)
**What goes wrong:** DB에 `LVE`로 저장되어 있어 실제 문서번호가 `LVE-2026-0001`로 생성됨.
**Why it happens:** 초기 seed 데이터와 후속 결정이 불일치.
**How to avoid:** Flyway migration으로 prefix 업데이트. 테스트 seed도 동기화.
**Warning signs:** 문서번호에 `LEV` 대신 `LVE` 표시.

### Pitfall 4: 자동저장 후 제출 시 race condition
**What goes wrong:** 자동저장과 제출이 거의 동시에 실행되면 낙관적 잠금 충돌 또는 부분 저장 상태에서 제출.
**How to avoid:** D-12에 따라 제출 전 명시적으로 `saveNow()` 호출 후 완료를 await. 자동저장 타이머를 취소하고 수동 저장 실행.
**Warning signs:** 제출 직전 변경사항 누락.

### Pitfall 5: H2 테스트 환경에서 PESSIMISTIC_WRITE 동작 차이
**What goes wrong:** H2 DB에서 `SELECT ... FOR UPDATE`가 MariaDB와 다르게 동작할 수 있음.
**Why it happens:** H2 MariaDB 모드에서도 locking 동작은 완전히 동일하지 않음.
**How to avoid:** 통합 테스트에서는 동시성보다는 기본 flow 테스트에 집중. 동시성 테스트는 MariaDB 환경에서 별도 수행 권장.
**Warning signs:** 테스트는 통과하나 프로덕션에서 중복 번호 발생.

## Code Examples

### 1. Submit API 추가 (documentApi.ts)
```typescript
// Source: 기존 documentApi.ts 패턴 확장
submit: (id: number) =>
  apiClient.post<ApiResponse<DocumentDetailResponse>>(`${BASE}/${id}/submit`),
```

### 2. 에디터 헤더 버튼 배치 (D-01, D-03)
```tsx
// Source: DocumentEditorPage.tsx 기존 패턴 확장
<div className="flex items-center gap-2">
  {savedDocId && (
    <button onClick={() => setShowDeleteConfirm(true)}
      className="h-11 px-4 border border-gray-300 text-gray-700 rounded-lg">
      {t('delete')}
    </button>
  )}
  <button onClick={handleManualSave}
    className="h-11 px-4 border border-gray-300 text-gray-700 rounded-lg">
    {t('save')}
  </button>
  {savedDocId && (
    <button onClick={handleSubmit} disabled={submitMutation.isPending}
      className="h-11 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg">
      {submitMutation.isPending ? <Loader2 className="animate-spin" /> : t('submit')}
    </button>
  )}
</div>
```

### 3. 성공 메시지 (D-18, D-19)
```tsx
// Source: Phase 4 D-20 인라인 메시지 패턴
const [successMsg, setSuccessMsg] = useState<string | null>(null);

useEffect(() => {
  if (!successMsg) return;
  const timer = setTimeout(() => setSuccessMsg(null), 5000);
  return () => clearTimeout(timer);
}, [successMsg]);

// 제출 성공 시:
setSuccessMsg(`문서가 제출되었습니다 (${data.docNumber})`);
navigate(`/documents/${id}`);
```

### 4. submitDocument 수정 (결재선 검증 제거)
```java
// Source: DocumentService.java 수정 필요
// Phase 6: 결재선 없이 제출 허용 (Phase 7에서 재활성화)
// 아래 블록 주석 처리 또는 제거:
// List<ApprovalLine> approvalLines = ...
// boolean hasApprover = ...
// if (!hasApprover) throw ...
// boolean drafterInLine = ...

// currentStep 처리:
List<ApprovalLine> approvalLines = approvalLineRepository.findByDocumentIdOrderByStepOrderAsc(docId);
if (!approvalLines.isEmpty()) {
    int firstStep = approvalLines.stream()
        .filter(line -> line.getLineType() != ApprovalLineType.REFERENCE)
        .mapToInt(ApprovalLine::getStepOrder)
        .min()
        .orElse(1);
    document.setCurrentStep(firstStep);
}
// 결재선이 없으면 currentStep은 null 유지
```

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | JUnit 5 + Spring Boot Test + MockMvc |
| Config file | `backend/src/test/resources/application-test.yml` |
| Quick run command | `cd backend && ./gradlew test --tests "com.micesign.document.*" -x compileQuerydsl` |
| Full suite command | `cd backend && ./gradlew test -x compileQuerydsl` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DOC-03 | Submit draft -> SUBMITTED + docNumber assigned | integration | `./gradlew test --tests "com.micesign.document.DocumentControllerTest"` | Exists but needs submit tests |
| DOC-04 | Cannot modify submitted document | integration | `./gradlew test --tests "com.micesign.document.DocumentControllerTest"` | Needs new test |
| DOC-07 | Unique doc number per template/year | unit | `./gradlew test --tests "com.micesign.document.*DocNumber*"` | Needs new test |

### Wave 0 Gaps
- [ ] `DocumentControllerTest` -- submit 관련 테스트 케이스 추가 필요: (1) 정상 제출, (2) 비DRAFT 제출 시 에러, (3) 타인 문서 제출 시 403, (4) 제목 없는 문서 제출 시 에러
- [ ] DocSequence 번호 생성 테스트 -- generateDocNumber 메서드 단위 테스트
- [ ] 이미 제출된 문서 수정 시도 -> 에러 확인 테스트 (DOC-04 immutability)

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | JWT @AuthenticationPrincipal -- 기존 패턴 |
| V3 Session Management | no | -- |
| V4 Access Control | yes | drafter_id == userId 검증 (D-16) |
| V5 Input Validation | yes | 백엔드 DocumentFormValidator + DRAFT 상태 검증 |
| V6 Cryptography | no | -- |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| 타인 문서 제출 | Elevation of Privilege | loadAndVerifyOwnerDraft에서 drafter_id == userId 검증 |
| 중복 제출 (이중 클릭) | Tampering | 프론트엔드 버튼 비활성화 + 백엔드 DRAFT 상태 검증 |
| 제출 후 수정 시도 | Tampering | loadAndVerifyOwnerDraft에서 status == DRAFT 검증 |
| 시퀀스 번호 탈취 | Spoofing | PESSIMISTIC_WRITE lock + unique constraint |

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | ApprovalNotificationEvent 핸들러가 결재선 없을 때 NPE 발생하지 않음 | Pitfall 2 | 제출 시 500 에러 발생 |
| A2 | moveAttachmentsToPermanentFolder가 첨부파일 없을 때 정상 동작 | Code Analysis | 제출 실패 (이미 empty check 있어 LOW risk) |

## Open Questions

1. **LEAVE 프리픽스 최종 결정: LVE vs LEV**
   - What we know: DB seed는 `LVE`, CONTEXT.md D-23은 `LEV`
   - What's unclear: 사용자의 최종 의도 (D-23이 최신 결정이므로 `LEV`가 우선)
   - Recommendation: D-23을 따라 `LEV`로 Flyway migration 작성. 사용자 확인 권장

2. **이벤트 핸들러 null-safety**
   - What we know: submitDocument이 ApprovalNotificationEvent를 발행
   - What's unclear: 핸들러가 결재선 없는 상황을 처리하는지
   - Recommendation: 결재선이 비어있으면 이벤트 발행을 skip하도록 수정

## Sources

### Primary (HIGH confidence)
- DocumentService.java -- submitDocument, generateDocNumber 메서드 직접 분석
- DocSequenceRepository.java -- PESSIMISTIC_WRITE lock 확인
- DocumentController.java -- POST /{id}/submit 엔드포인트 확인
- V2__seed_initial_data.sql -- 프리픽스 값 확인 (GEN, EXP, LVE)
- V13__add_doc_sequence_unique_constraint.sql -- unique constraint 확인
- DocumentEditorPage.tsx -- 기존 에디터 UI 패턴 확인
- DocumentDetailPage.tsx -- 문서번호 표시 이미 일부 구현 확인
- ConfirmDialog.tsx -- 재사용 가능한 확인 다이얼로그 컴포넌트 확인

### Secondary (MEDIUM confidence)
- CONTEXT.md D-23 (LEV prefix) vs DB seed (LVE) -- 불일치 발견, 사용자 확인 필요

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - 기존 코드 직접 확인, 추가 라이브러리 불필요
- Architecture: HIGH - 기존 패턴 확장, 새로운 아키텍처 결정 없음
- Pitfalls: HIGH - 코드 분석 기반으로 구체적 이슈 식별

**Research date:** 2026-04-09
**Valid until:** 2026-05-09 (안정적인 기존 코드 수정 위주)

# Phase 7: Approval Workflow - Research

**Researched:** 2026-04-09
**Domain:** 전자결재 워크플로 (결재선 편집기, 순차 결재, 철회/재기안, 문서 접근 제어)
**Confidence:** HIGH

## Summary

Phase 7은 MiceSign 전자결재 시스템의 핵심인 결재 워크플로를 구현하는 단계이다. 백엔드의 결재 처리 로직(approve/reject/withdraw/rewrite)과 프론트엔드의 기본 타입/API/훅은 이전 Phase들에서 이미 구현되어 있다. 이 Phase의 주요 작업은 (1) 결재선 편집기 UI (조직도 트리 피커 + 드래그앤드롭 순서 변경), (2) DocumentDetailPage의 결재선 타임라인 + 결재 액션 UI, (3) DocumentEditorPage에 결재선 편집기 통합, (4) 제출 시 결재선 필수 검증 활성화, (5) 철회/재기안 UI, (6) 프론트엔드 API 클라이언트에 withdraw/rewrite 추가이다.

백엔드는 대부분 완성되어 있어 프론트엔드 중심 작업이지만, submitDocument의 결재선 검증 TODO 주석 활성화와 프론트엔드 DocumentDetailResponse 타입에 approvalLines/currentStep 필드 추가가 필요하다. 조직도 트리 피커는 기존 DepartmentTree 컴포넌트와 departmentApi.getTree/getMembers를 재사용하되, 결재자 선택에 맞게 새 컴포넌트로 구성한다.

**Primary recommendation:** 백엔드 변경은 최소화하고(검증 활성화 + withdraw 조건 체크), 프론트엔드 결재선 편집기와 결재 처리 UI 구현에 집중. 기존 `@hello-pangea/dnd` 라이브러리와 DepartmentTree 패턴을 재사용.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** 결재자 선택은 **조직도 트리 피커** -- 부서 트리를 펼쳐 사용자 선택
- **D-02:** 결재선 편집기는 **본문 아래 인라인** 배치
- **D-03:** 결재자 순서 변경은 **드래그 앤 드롭** -- @hello-pangea/dnd 사용
- **D-04:** 결재자 추가 시 **모달 팝업**으로 조직도 트리 표시
- **D-05:** **본인(기안자) 제외** -- 결재선에 기안자 본인 추가 불가
- **D-06:** 결재 유형(APPROVE/AGREE/REFERENCE)은 **추가 시 선택** -- 기본값 APPROVE
- **D-07:** 제출 시 **APPROVE 유형 1명 이상 필수**
- **D-08:** **중복 선택 방지** -- 이미 결재선에 있는 사용자는 비활성화
- **D-09:** 결재선 **최대 10명**
- **D-10:** REFERENCE 유형 결재자는 **별도 섹션**으로 분리 표시
- **D-11:** 승인/반려 버튼은 **결재선 섹션 내** 배치
- **D-12:** **반려 시 코멘트 필수, 승인 시 선택**
- **D-13:** 결재선 상태는 **타임라인 + 배지** 형식
- **D-14:** 결재 차례가 아닌 결재자에게는 **읽기 전용**
- **D-15:** 승인/반려 후 **현재 페이지 유지**
- **D-16:** 대기 결재 목록은 **전용 페이지** (/approvals/pending) -- 이미 구현됨
- **D-17:** **반려만 확인 다이얼로그** 표시
- **D-18:** 철회 버튼은 **상단 헤더** 배치
- **D-19:** 철회 가능 조건 불만족 시 **버튼 숨김**
- **D-20:** 철회 확인은 **간단 경고** -- ConfirmDialog 패턴
- **D-21:** 철회된 문서는 **WITHDRAWN 상태 + 재기안 가능**
- **D-22:** 철회 완료 후 **현재 페이지 유지**
- **D-23:** 재기안 버튼은 **상단 헤더**
- **D-24:** 재기안 시 **본문 + 결재선 복사** -- 첨부파일은 복사하지 않음
- **D-25:** 원본 문서와 **연결 없음** -- 독립 문서 생성
- **D-26:** 재기안 후 **새 DRAFT 에디터로** 바로 이동
- **D-27:** 복사된 결재선은 **수정 가능**
- **D-28:** 상태별 액션 매트릭스
- **D-29:** 현재 네비게이션 메뉴 구성 유지
- **D-30:** **제출 시에만 DB 저장** -- DRAFT 동안은 프론트엔드 상태로만 관리
- **D-31:** **기안자 + 결재선 사용자 + 관리자** 접근 가능
- **D-32:** Phase 7에서는 알림 없음 -- 배지 카운트로 대체
- **D-33:** **인라인 에러 메시지** 패턴

### Claude's Discretion
- 동시성 제어 방식 (기존 findByIdForUpdate pessimistic lock 패턴 유지/보강)
- 테스트 범위 및 전략 (기존 DocumentSubmitTest 패턴 따름)
- 결재선 저장 API 엔드포인트 설계 (제출 API에 포함 vs 별도 엔드포인트)
- 프론트엔드 결재선 상태 관리 구현 세부사항
- 조직도 트리 피커 컴포넌트 구현 세부사항
- 첨부파일 관련 재기안 세부 처리

### Deferred Ideas (OUT OF SCOPE)
None
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| APR-01 | User can build an approval line selecting approvers from org tree (APPROVE, AGREE, REFERENCE types) | 조직도 트리 피커 모달 + 결재선 편집기 인라인 UI. 기존 DepartmentTree/departmentApi.getTree + getMembers 재사용 |
| APR-02 | APPROVE and AGREE types are processed sequentially by step_order; REFERENCE gets immediate read access | 백엔드 ApprovalService.approve()에 이미 구현됨. REFERENCE는 stepOrder=0, 프론트엔드에서 별도 섹션 표시 |
| APR-03 | Approver can approve or reject a document with optional comment | 백엔드 ApprovalController.approve/reject 이미 구현. 프론트엔드 타임라인 UI + 액션 버튼 구현 필요 |
| APR-04 | Rejection by any approver immediately sets document status to REJECTED | 백엔드 ApprovalService.reject()에 구현 완료. 프론트엔드 상태 반영 + 결과 표시 |
| APR-05 | Approval by the last approver sets document status to APPROVED | 백엔드 approve()의 final approval 로직 구현 완료. 프론트엔드 상태 반영 |
| APR-06 | Drafter can withdraw a submitted document if the next approver has not yet acted | 백엔드 DocumentService.withdrawDocument() 및 DocumentController 구현 완료. 프론트엔드 철회 버튼 + API 호출 필요 |
| APR-07 | User can create a new document (resubmission) from a rejected or withdrawn document | 백엔드 DocumentService.rewriteDocument() 및 DocumentController 구현 완료. 프론트엔드 재기안 버튼 + 에디터 이동 필요 |
</phase_requirements>

## Standard Stack

### Core (이미 설치됨)
| Library | Version | Purpose | Status |
|---------|---------|---------|--------|
| @hello-pangea/dnd | ^18.0.1 | 드래그 앤 드롭 (결재선 순서 변경) | 이미 설치됨, PositionTable에서 사용 중 [VERIFIED: package.json] |
| @tanstack/react-query | v5.x | 서버 상태 관리 | 이미 설치됨, 모든 훅에서 사용 중 [VERIFIED: codebase] |
| zustand | 5.x | 클라이언트 상태 관리 | 이미 설치됨 [VERIFIED: codebase] |
| lucide-react | installed | 아이콘 | 이미 설치됨 [VERIFIED: codebase] |

### 추가 설치 불필요
이 Phase에서 새로운 라이브러리 설치는 필요 없다. 모든 필요한 도구가 이미 프로젝트에 존재한다. [VERIFIED: codebase analysis]

## Architecture Patterns

### 신규 컴포넌트 구조
```
frontend/src/features/approval/
├── api/
│   └── approvalApi.ts          (기존 — withdraw/rewrite 추가)
├── components/
│   ├── ApprovalLineEditor.tsx     (결재선 편집기 — DRAFT 모드)
│   ├── ApprovalLineTimeline.tsx   (결재선 타임라인 — 읽기 모드)
│   ├── ApprovalActionPanel.tsx    (승인/반려 버튼 + 코멘트)
│   ├── OrgTreePickerModal.tsx     (조직도 트리 피커 모달)
│   └── OrgTreePickerNode.tsx      (트리 노드 — 부서/사용자)
├── hooks/
│   └── useApprovals.ts          (기존 — withdraw/rewrite mutation 추가)
├── pages/
│   ├── PendingApprovalsPage.tsx  (기존)
│   └── CompletedDocumentsPage.tsx (기존)
└── types/
    └── approval.ts              (기존 — 이미 충분한 타입 정의)
```

### Pattern 1: 결재선 프론트엔드 상태 관리 (D-30)
**What:** DRAFT 동안 결재선은 DB에 저장하지 않고 React 컴포넌트 상태로만 관리. 제출 시 submit API에 결재선 데이터를 함께 전송.
**When to use:** DocumentEditorPage에서 결재선 편집 시
**기존 지원:** CreateDocumentRequest와 UpdateDocumentRequest에 `approvalLines: List<ApprovalLineRequest>` 필드가 이미 존재. DocumentService.saveApprovalLines()도 이미 구현됨. [VERIFIED: codebase]

**구현 방향:**
```typescript
// ApprovalLineEditor 상태 (React useState)
const [approvalLines, setApprovalLines] = useState<ApprovalLineItem[]>([]);

// 제출 시 approvalLines를 submit 전에 save에 포함
// 기존 save 흐름: handleSave → createMutation/updateMutation
// approvalLines를 CreateDocumentRequest/UpdateDocumentRequest에 포함하여 전송
```

**중요:** D-30에 따르면 제출 시에만 DB 저장이지만, 기존 백엔드는 create/update에서도 approvalLines를 처리한다. 가장 간단한 접근: auto-save 시에도 approvalLines를 함께 전송하여 DB에 저장. 이렇게 하면 페이지 새로고침 시에도 결재선이 유지되고, 기존 백엔드 로직을 변경할 필요가 없다. [ASSUMED]

### Pattern 2: 결재 액션 UI (D-11~D-15)
**What:** DocumentDetailPage에서 현재 결재자에게 승인/반려 버튼 표시. 결재선 타임라인 아래에 코멘트 입력 + 액션 버튼 배치.
**When to use:** 문서 상태가 SUBMITTED이고 현재 사용자가 currentStep의 결재자일 때

**구현 방향:**
```typescript
// DocumentDetailPage에서 결재 가능 여부 판단
const currentUserId = useAuthStore(s => s.user?.id);
const myLine = doc.approvalLines?.find(
  line => line.approverId === currentUserId
    && line.status === 'PENDING'
    && line.stepOrder === doc.currentStep
);
const canApprove = doc.status === 'SUBMITTED' && myLine != null;
```

### Pattern 3: 조직도 트리 피커 (D-04, D-08)
**What:** 모달로 부서 트리를 표시하고, 부서를 선택하면 해당 부서의 사용자 목록을 표시. 사용자 옆에 [+] 버튼으로 결재선에 추가.
**When to use:** 결재선 편집기에서 "결재자 추가" 버튼 클릭 시

**기존 자산:**
- `departmentApi.getTree()` — 부서 트리 조회 API [VERIFIED: codebase]
- `departmentApi.getMembers(deptId)` — 부서원 목록 조회 API [VERIFIED: codebase]
- `DepartmentTree`/`DepartmentTreeNode` 컴포넌트 — 트리 렌더링 로직 참고용 [VERIFIED: codebase]
- `DepartmentMember` 타입 — { id, employeeNo, name, positionName, status } [VERIFIED: codebase]

**주의:** 기존 DepartmentTree는 관리자 전용(수정/비활성화 액션). 결재자 선택용으로는 새 컴포넌트를 만들되 트리 구조/확장 로직은 재사용.

### Pattern 4: 드래그 앤 드롭 결재선 순서 변경 (D-03)
**What:** @hello-pangea/dnd를 사용하여 결재선 항목의 순서를 변경
**기존 패턴:** PositionTable.tsx에서 `DragDropContext > Droppable > Draggable` 패턴 사용 중 [VERIFIED: codebase]

```typescript
// PositionTable 패턴 재사용
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
// handleDragEnd에서 items splice 후 새 순서 반영
// REFERENCE 타입은 드래그 대상에서 제외 (별도 섹션이므로)
```

### Pattern 5: 철회/재기안 (D-18~D-27)
**What:** SUBMITTED 문서에 철회 버튼, REJECTED/WITHDRAWN 문서에 재기안 버튼 표시
**기존 자산:**
- 백엔드: `DocumentController.withdrawDocument()`/`rewriteDocument()` 완전 구현 [VERIFIED: codebase]
- 프론트엔드: `documentApi`에 withdraw/rewrite 미등록 — 추가 필요 [VERIFIED: codebase]

### Anti-Patterns to Avoid
- **결재선을 별도 API로 관리하지 말것:** 기존 create/update DTO에 approvalLines 포함됨. 별도 엔드포인트 불필요. [VERIFIED: CreateDocumentRequest, UpdateDocumentRequest]
- **REFERENCE를 순차 결재에 포함하지 말것:** REFERENCE는 stepOrder=0으로 즉시 읽기 권한만 부여. ApprovalService.approve()에서 이미 REFERENCE를 제외하고 다음 단계 탐색. [VERIFIED: ApprovalService line 101]
- **프론트엔드 DocumentDetailResponse 타입 누락 주의:** 현재 프론트엔드 타입에 approvalLines, currentStep, sourceDocId 필드가 없음 — 반드시 추가해야 함 [VERIFIED: frontend document.ts]

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| 드래그 앤 드롭 | HTML5 DnD API 직접 구현 | @hello-pangea/dnd (이미 설치됨) | 접근성, 터치, 키보드 지원 내장 [VERIFIED: package.json] |
| 트리 구조 렌더링 | 재귀 렌더링 from scratch | 기존 DepartmentTree 패턴 참고 | 트리 확장/축소, 키보드 탐색 등 이미 구현됨 [VERIFIED: DepartmentTree.tsx] |
| 확인 다이얼로그 | window.confirm() | 기존 ConfirmDialog 컴포넌트 | 접근성(포커스 트랩, ESC), 스타일 일관성 [VERIFIED: ConfirmDialog.tsx] |
| 상태 배지 | 인라인 스타일 | 기존 DocumentStatusBadge | 모든 상태 색상 매핑 완료 [VERIFIED: codebase context] |

## Common Pitfalls

### Pitfall 1: 프론트엔드 타입 불일치
**What goes wrong:** 백엔드 DocumentDetailResponse는 approvalLines, currentStep, sourceDocId를 포함하지만, 프론트엔드 DocumentDetailResponse 타입에 이 필드들이 누락됨.
**Why it happens:** Phase 6까지는 결재선 데이터를 사용하지 않아 타입 정의를 미루었음.
**How to avoid:** Phase 7 첫 작업으로 프론트엔드 `DocumentDetailResponse` 인터페이스에 `approvalLines`, `currentStep`, `sourceDocId` 필드 추가.
**Warning signs:** TypeScript 에러 없이 undefined 접근이 발생하는 경우.

### Pitfall 2: 결재선 검증 TODO 주석 비활성화 상태
**What goes wrong:** DocumentService.submitDocument()에 결재선 필수 검증 코드가 TODO 주석으로 비활성화되어 있음 (line 258-269). 이를 활성화하지 않으면 결재선 없이 제출 가능.
**Why it happens:** Phase 6에서 결재선 편집기 없이 제출 기능만 먼저 구현했기 때문.
**How to avoid:** 결재선 편집기 구현 완료 후 submitDocument의 주석을 해제하고 검증 로직 활성화.
**Warning signs:** 결재선 없는 문서가 SUBMITTED 상태가 되는 경우.

### Pitfall 3: 결재선 stepOrder 할당 시 REFERENCE 처리
**What goes wrong:** 프론트엔드에서 결재선을 전송할 때 REFERENCE의 stepOrder를 잘못 할당하면 순차 결재 로직이 깨짐.
**Why it happens:** 백엔드 saveApprovalLines()는 REFERENCE에 stepOrder=0, APPROVE/AGREE에 순차 번호를 할당. 프론트엔드가 직접 stepOrder를 보낼 경우 충돌 가능.
**How to avoid:** ApprovalLineRequest DTO를 확인 — stepOrder 필드가 포함되어 있지만, 백엔드 saveApprovalLines()에서 재계산함. 프론트엔드에서는 순서만 보장하면 됨.
**Warning signs:** REFERENCE가 순차 결재 대상에 포함되는 경우.

### Pitfall 4: 철회 조건 체크의 프론트엔드/백엔드 불일치
**What goes wrong:** 프론트엔드에서 철회 버튼을 표시하는 조건과 백엔드의 실제 검증 로직이 일치하지 않을 수 있음.
**Why it happens:** 백엔드는 현재 step의 모든 결재자가 PENDING인지 확인 (line 338-345). 프론트엔드에서도 동일한 로직으로 버튼 표시/숨김을 결정해야 함.
**How to avoid:** 프론트엔드에서 `doc.approvalLines`와 `doc.currentStep`을 사용하여 현재 step의 결재자가 모두 PENDING인지 확인.
**Warning signs:** 철회 버튼이 보이지만 클릭 시 서버 에러 발생.

### Pitfall 5: auto-save와 결재선 상태 동기화
**What goes wrong:** D-30은 "제출 시에만 DB 저장"이라고 명시하지만, 기존 auto-save는 updateDocument를 호출하며 UpdateDocumentRequest에 approvalLines 필드가 있음.
**Why it happens:** auto-save 시 approvalLines를 null로 보내면 기존 결재선이 삭제될 수 있음 (line 179: `if (request.approvalLines() != null) { delete old + save new }`).
**How to avoid:** auto-save 시 approvalLines를 **항상** 현재 편집 중인 전체 결재선으로 포함하거나, null을 보내 기존 결재선을 유지하도록 함. 백엔드 코드를 보면 `approvalLines != null`일 때만 교체하므로, auto-save 시 null을 보내면 기존 결재선이 유지됨.
**Warning signs:** auto-save 후 결재선이 사라지는 현상.

### Pitfall 6: 결재선 편집기 초기 데이터 로딩
**What goes wrong:** 기존 문서를 편집할 때 저장된 결재선을 불러와 편집기에 표시해야 하지만, 현재 DocumentDetailResponse에서 approvalLines를 받아도 프론트엔드 ApprovalLineItem 타입과 매핑이 필요.
**Why it happens:** 백엔드 ApprovalLineResponse(id, approverId, approverName, departmentName, positionName, lineType, stepOrder, status, comment, actedAt)와 프론트엔드 ApprovalLineItem(userId, userName, departmentName, positionName, lineType)의 필드명이 다름.
**How to avoid:** ApprovalLineResponse -> ApprovalLineItem 매핑 유틸리티 함수 작성.

## Code Examples

### 결재 가능 여부 판단 로직
```typescript
// Source: 백엔드 ApprovalService.validateApprovalAction() 기반 프론트엔드 로직
function canUserApprove(
  doc: DocumentDetailResponse,
  userId: number
): { canApprove: boolean; myLineId: number | null } {
  if (doc.status !== 'SUBMITTED') return { canApprove: false, myLineId: null };
  
  const myLine = doc.approvalLines?.find(
    line => line.approverId === userId
      && line.status === 'PENDING'
      && line.stepOrder === doc.currentStep
  );
  
  return {
    canApprove: myLine != null,
    myLineId: myLine?.id ?? null,
  };
}
```

### 철회 가능 여부 판단 로직
```typescript
// Source: 백엔드 DocumentService.withdrawDocument() 기반
function canUserWithdraw(
  doc: DocumentDetailResponse,
  userId: number
): boolean {
  if (doc.status !== 'SUBMITTED') return false;
  if (doc.drafterId !== userId) return false;
  
  // 현재 step의 결재자가 모두 PENDING인지 확인
  const currentStepLines = doc.approvalLines?.filter(
    line => line.stepOrder === doc.currentStep
  ) ?? [];
  
  return currentStepLines.length > 0
    && currentStepLines.every(line => line.status === 'PENDING');
}
```

### 결재선 편집기에서 제출용 데이터 변환
```typescript
// ApprovalLineItem (프론트엔드 상태) -> ApprovalLineRequest (API 전송)
function toApprovalLineRequests(
  items: ApprovalLineItem[]
): ApprovalLineRequest[] {
  // APPROVE/AGREE 순서대로 stepOrder 1, 2, 3...
  // REFERENCE는 stepOrder 0
  let step = 1;
  return items.map(item => ({
    approverId: item.userId,
    lineType: item.lineType,
    stepOrder: item.lineType === 'REFERENCE' ? 0 : step++,
  }));
}
```

### DocumentDetailPage에 추가할 필드 (프론트엔드 타입)
```typescript
// document.ts에 추가 필요
import type { ApprovalLineResponse } from '../../approval/types/approval';

export interface DocumentDetailResponse extends DocumentResponse {
  drafter: DrafterInfo;
  bodyHtml: string | null;
  formData: string | null;
  submittedAt: string | null;
  completedAt: string | null;
  // Phase 7 추가
  approvalLines: ApprovalLineResponse[];
  currentStep: number | null;
  sourceDocId: number | null;
  drafterId: number;  // 이미 백엔드에서 전송 중
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| 결재선 없이 제출 | 결재선 필수 검증 | Phase 7 | submitDocument의 TODO 주석 해제 |
| DocumentDetailPage placeholder | 실제 결재선 타임라인 | Phase 7 | placeholder div 교체 |
| documentApi에 withdraw/rewrite 없음 | API 메서드 추가 | Phase 7 | 프론트엔드 완전한 워크플로 지원 |

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | auto-save 시 approvalLines를 null로 전송하면 기존 결재선 유지됨 | Architecture Patterns - Pattern 1 | auto-save 후 결재선 소실. 백엔드 코드 확인 결과 null 체크 로직 있음 (LOW risk) |
| A2 | D-30 "제출 시에만 DB 저장"을 auto-save에서 approvalLines 포함 전송으로 완화 가능 | Architecture Patterns - Pattern 1 | 사용자 의도와 다를 수 있음. 다만 페이지 새로고침 시 결재선 유지에 필수적 |

## Open Questions

1. **결재선 auto-save 전략**
   - What we know: D-30은 "제출 시에만 DB 저장"이라 명시. 그러나 기존 auto-save가 updateDocument를 호출하며 approvalLines 필드 지원됨.
   - What's unclear: auto-save 시 결재선을 함께 저장할지, 제출 시에만 저장할지
   - Recommendation: auto-save에 approvalLines 포함. 사용자가 페이지를 새로고침해도 결재선이 유지되어야 하고, 백엔드가 이미 이를 지원함. null 전송 시 기존 결재선 유지되므로 안전함.

2. **ApprovalLineRequest의 stepOrder 처리**
   - What we know: 백엔드 saveApprovalLines()는 프론트엔드가 보낸 순서와 관계없이 REFERENCE=0, APPROVE/AGREE=순차번호로 재계산.
   - What's unclear: 프론트엔드에서 stepOrder를 계산해서 보낼지, 백엔드에 맡길지
   - Recommendation: 프론트엔드에서도 stepOrder를 계산하여 보내되, 백엔드에서 최종 결정. ApprovalLineRequest에 stepOrder가 @NotNull이므로 값은 필수. 다만 **saveApprovalLines()를 보면 프론트엔드 stepOrder를 무시하고 자체 계산함** — 프론트엔드는 의미 있는 값(순서 인덱스)을 보내면 됨.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | JUnit 5 + Spring Boot Test + MockMvc |
| Config file | `backend/src/test/resources/application-test.yml` |
| Quick run command | `cd backend && ./gradlew test --tests "com.micesign.document.*" -x compileTestJava --rerun` |
| Full suite command | `cd backend && ./gradlew test` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| APR-01 | 결재선 생성 (APPROVE 유형 1명 이상) | integration | `./gradlew test --tests "com.micesign.document.ApprovalWorkflowTest"` | Wave 0 필요 |
| APR-02 | 순차 결재 처리 | integration | `./gradlew test --tests "com.micesign.document.ApprovalWorkflowTest"` | Wave 0 필요 |
| APR-03 | 승인/반려 + 코멘트 | integration | `./gradlew test --tests "com.micesign.document.ApprovalWorkflowTest"` | Wave 0 필요 |
| APR-04 | 반려 시 문서 REJECTED 상태 | integration | `./gradlew test --tests "com.micesign.document.ApprovalWorkflowTest"` | Wave 0 필요 |
| APR-05 | 최종 승인 시 APPROVED 상태 | integration | `./gradlew test --tests "com.micesign.document.ApprovalWorkflowTest"` | Wave 0 필요 |
| APR-06 | 철회 (다음 결재자 미처리 조건) | integration | `./gradlew test --tests "com.micesign.document.ApprovalWorkflowTest"` | Wave 0 필요 |
| APR-07 | 재기안 (본문+결재선 복사, 독립 문서) | integration | `./gradlew test --tests "com.micesign.document.ApprovalWorkflowTest"` | Wave 0 필요 |

### Sampling Rate
- **Per task commit:** `cd backend && ./gradlew test --tests "com.micesign.document.*"`
- **Per wave merge:** `cd backend && ./gradlew test`
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `backend/src/test/java/com/micesign/document/ApprovalWorkflowTest.java` -- APR-01~APR-07 전체 커버
- [ ] 프론트엔드 결재선 편집기 테스트는 수동 검증 (기존 패턴과 동일)

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | JWT (기존 Phase 2 구현) |
| V3 Session Management | yes | HttpOnly cookie refresh token (기존) |
| V4 Access Control | **yes** | 문서 접근 권한: 기안자 + 결재선 참여자 + 관리자. DocumentService.getDocument() 이미 구현 |
| V5 Input Validation | yes | ApprovalActionRequest, ApprovalLineRequest DTO 검증 |
| V6 Cryptography | no | N/A |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| 타인의 결재선에 무단 승인/반려 | Spoofing | ApprovalService.validateApprovalAction() — userId 검증 [VERIFIED] |
| 결재 순서 우회 (자신의 차례가 아닌데 처리) | Tampering | stepOrder == document.currentStep 검증 [VERIFIED] |
| 이미 처리된 결재 재처리 | Elevation | status != PENDING 검증 [VERIFIED] |
| 결재선에 기안자 자신 추가 | Tampering | saveApprovalLines() drafter ID 체크 [VERIFIED] |
| 권한 없는 문서 조회 | Information Disclosure | getDocument() RBAC 체크 [VERIFIED] |
| 철회 후 재처리 시도 | Tampering | document.status != SUBMITTED 검증 [VERIFIED] |

## Sources

### Primary (HIGH confidence)
- 프로젝트 코드베이스 직접 분석 — ApprovalService.java, ApprovalController.java, DocumentService.java, DocumentController.java, 프론트엔드 approval/, document/ 디렉토리 전체
- 백엔드 DTO — CreateDocumentRequest, UpdateDocumentRequest, ApprovalLineRequest, ApprovalLineResponse, DocumentDetailResponse
- 프론트엔드 타입 — approval.ts, document.ts
- 기존 컴포넌트 — DepartmentTree, PositionTable (@hello-pangea/dnd), ConfirmDialog

### Secondary (MEDIUM confidence)
- Phase 6 CONTEXT.md — D-07 (결재선 없이 제출 허용 -> Phase 7에서 필수 검증 추가)
- Phase 4 CONTEXT.md — D-19 듀얼 검증, D-20 인라인 메시지 패턴

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — 새 라이브러리 불필요, 모든 도구 이미 설치됨
- Architecture: HIGH — 백엔드 90% 구현 완료, 프론트엔드 패턴 명확
- Pitfalls: HIGH — 코드베이스 직접 분석으로 구체적 위험 식별

**Research date:** 2026-04-09
**Valid until:** 2026-05-09 (안정적인 내부 프로젝트)

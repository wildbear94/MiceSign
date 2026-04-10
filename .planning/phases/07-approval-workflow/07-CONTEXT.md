# Phase 7: Approval Workflow - Context

**Gathered:** 2026-04-09
**Status:** Ready for planning

<domain>
## Phase Boundary

Users can build approval lines, process approvals sequentially, and handle rejections, withdrawals, and resubmissions. This phase covers: approval line editor UI (org tree picker), sequential approval processing (approve/reject), withdrawal by drafter, resubmission from rejected/withdrawn documents, pending approvals page, and document access control. Notifications (SMTP) are deferred to Phase 1-B. Dashboard is Phase 8.

</domain>

<decisions>
## Implementation Decisions

### 결재선 편집기 UX
- **D-01:** 결재자 선택은 **조직도 트리 피커** — 부서 트리를 펼쳐 사용자 선택. 50명 규모에 적합
- **D-02:** 결재선 편집기는 **본문 아래 인라인** 배치 — 문서 에디터 페이지에서 본문 + 첨부파일 아래 결재선 섹션
- **D-03:** 결재자 순서 변경은 **드래그 앤 드롭** — Phase 3 직위 정렬과 동일한 패턴
- **D-04:** 결재자 추가 시 **모달 팝업**으로 조직도 트리 표시 — 화면 전환 없이 선택
- **D-05:** **본인(기안자) 제외** — 결재선에 기안자 본인 추가 불가
- **D-06:** 결재 유형(APPROVE/AGREE/REFERENCE)은 **추가 시 선택** — 조직도에서 사용자 선택 후 바로 유형 지정, 기본값 APPROVE
- **D-07:** 제출 시 **APPROVE 유형 1명 이상 필수** — AGREE/REFERENCE만으로는 제출 불가
- **D-08:** **중복 선택 방지** — 이미 결재선에 있는 사용자는 조직도에서 [+] 버튼 비활성화 + 회색 처리
- **D-09:** 결재선 **최대 10명** — 초과 시 "최대 10명까지 추가 가능" 안내
- **D-10:** REFERENCE 유형 결재자는 **별도 섹션**으로 분리 표시 — 순차 결재(APPROVE/AGREE)와 참조를 시각적으로 구분

### 결재 처리 화면
- **D-11:** 승인/반려 버튼은 **결재선 섹션 내** 배치 — 결재 타임라인 아래에 [코멘트 입력] + [승인] [반려] 버튼
- **D-12:** **반려 시 코멘트 필수, 승인 시 선택** — 백엔드 로직과 일치
- **D-13:** 결재선 상태는 **타임라인 + 배지** 형식 — 순서대로 결재자 정보(이름, 부서, 직위) + 유형 + 상태 배지(대기/승인/반려) + 처리일시 + 코멘트 표시
- **D-14:** 결재 차례가 아닌 결재자에게는 **읽기 전용** — 문서 본문 + 결재선 조회 가능, 결재 버튼 비활성화 + "결재 순서가 아닙니다" 안내
- **D-15:** 승인/반려 후 **현재 페이지 유지** — 결재 결과가 타임라인에 반영된 것을 확인 가능
- **D-16:** 대기 결재 목록은 **전용 페이지** (/approvals/pending) — 기존 네비게이션 메뉴 "결재 대기" 활용
- **D-17:** **반려만 확인 다이얼로그** 표시 — 승인은 바로 처리, 반려는 "문서를 반려하시겠습니까?" 확인 후 처리

### 철회(Withdrawal) UX
- **D-18:** 철회 버튼은 **상단 헤더** 배치 — 문서 상세 페이지 헤더에 [철회] 버튼. Phase 6 에디터 헤더 패턴과 유사
- **D-19:** 철회 가능 조건 불만족 시 **버튼 숨김** — 다음 결재자가 이미 처리했으면 철회 버튼 자체를 숨김
- **D-20:** 철회 확인은 **간단 경고** — "철회 시 결재 진행이 취소됩니다" + [철회]/[취소]. Phase 6 제출 확인 패턴
- **D-21:** 철회된 문서는 **WITHDRAWN 상태 + 재기안 가능** — WITHDRAWN 상태 배지 표시, 재기안 버튼으로 새 문서 생성
- **D-22:** 철회 완료 후 **현재 페이지 유지** — WITHDRAWN 상태 확인 + 재기안 버튼 표시

### 재기안(Resubmission) 흐름
- **D-23:** 재기안 버튼은 **상단 헤더** — REJECTED/WITHDRAWN 문서 상세페이지 헤더에 [재기안] 버튼
- **D-24:** 재기안 시 **본문 + 결재선 복사** — 제목, 본문(bodyHtml/formData), 결재선을 새 DRAFT에 복사. 첨부파일은 복사하지 않음(새로 첨부)
- **D-25:** 원본 문서와 **연결 없음** — 새 문서는 독립적인 문서. parent_document_id 없음. PRD 사양 준수
- **D-26:** 재기안 후 **새 DRAFT 에디터로** 바로 이동 — 본문/결재선이 복사된 상태에서 수정 가능
- **D-27:** 복사된 결재선은 **수정 가능** — DRAFT 상태이므로 결재선 자유롭게 수정/삭제/추가 가능

### 문서 상태별 허용 액션
- **D-28:** 상태별 액션 매트릭스:
  - DRAFT: 편집, 삭제, 제출
  - SUBMITTED: 철회(기안자, 다음 결재자 미처리 조건), 승인/반려(현재 결재자)
  - APPROVED: 읽기전용
  - REJECTED: 읽기전용, 재기안(기안자)
  - WITHDRAWN: 읽기전용, 재기안(기안자)

### 네비게이션 메뉴
- **D-29:** **현재 구성 유지** — [대시보드] [내 문서] [결재 대기(배지)] [완료된 문서] [관리]. 추가 메뉴 불필요

### 결재선 저장 시점
- **D-30:** **제출 시에만 DB 저장** — DRAFT 동안은 프론트엔드 상태로만 관리. 제출 API 호출 시 결재선을 함께 전송하여 DB 저장

### 문서 접근 권한
- **D-31:** **기안자 + 결재선 사용자** — 문서 조회 가능: 기안자, 결재선에 포함된 모든 사용자(APPROVE/AGREE/REFERENCE). 관리자(SUPER_ADMIN/ADMIN)는 모든 문서 조회 가능

### 알림
- **D-32:** **Phase 7에서는 알림 없음** — 결재 요청/결과 알림은 Phase 1-B(SMTP)에서 처리. 네비 배지 카운트로 대체

### 에러 처리
- **D-33:** **인라인 에러 메시지** — Phase 4/6 패턴과 동일. 결재선 섹션 내에 에러 메시지 표시

### Claude's Discretion
- 동시성 제어 방식 (기존 findByIdForUpdate pessimistic lock 패턴 유지/보강)
- 테스트 범위 및 전략 (기존 DocumentSubmitTest 패턴 따름)
- 결재선 저장 API 엔드포인트 설계 (제출 API에 포함 vs 별도 엔드포인트)
- 프론트엔드 결재선 상태 관리 구현 세부사항
- 조직도 트리 피커 컴포넌트 구현 세부사항
- 첨부파일 관련 재기안 세부 처리

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Product Requirements
- `docs/PRD_MiceSign_v2.0.md` — Full product requirements with DB schema DDL, approval workflow specifications
- `docs/FSD_MiceSign_v1.0.md` — Functional specs with API contracts, error codes, business rules for approval flow

### Architecture & Prior Decisions
- `.planning/phases/06-document-submission-numbering/06-CONTEXT.md` — Phase 6 decisions: submit flow, document immutability, numbering, D-07 (결재선 없이 제출 허용 → Phase 7에서 필수 검증 추가)
- `.planning/phases/04-document-core-templates/04-CONTEXT.md` — Phase 4 decisions: editor patterns, validation (D-19 dual validation, D-20 inline messages), auto-save, document creation flow
- `.planning/REQUIREMENTS.md` — APR-01~APR-07 requirements for approval workflow

### Existing Implementation
- `backend/src/main/java/com/micesign/service/ApprovalService.java` — Backend approve/reject logic already implemented
- `backend/src/main/java/com/micesign/controller/ApprovalController.java` — API endpoints for approve/reject/pending/completed
- `backend/src/main/java/com/micesign/domain/ApprovalLine.java` — JPA entity with document, approver, lineType, stepOrder, status, comment, actedAt
- `frontend/src/features/approval/` — Types, API client, hooks for approval features
- `frontend/src/features/document/pages/DocumentDetailPage.tsx` — Line 159: approval line placeholder to be replaced

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **ApprovalService** (approve/reject): Backend logic fully implemented with pessimistic locking, sequential processing, audit logging
- **ApprovalController**: REST endpoints for approve, reject, pending list, completed list
- **ApprovalLine entity**: JPA entity with all necessary fields (document, approver, lineType, stepOrder, status, comment, actedAt)
- **Frontend approval types**: ApprovalLineType, ApprovalLineStatus, ApprovalLineResponse, ApprovalLineRequest, ApprovalActionRequest, PendingApprovalResponse, ApprovalLineItem (for editor)
- **Frontend approval API**: approvalApi with approve, reject, getPending, getCompleted methods
- **MainNavbar**: "결재 대기" 메뉴 + pending count 배지 이미 구현됨
- **DocumentStatusBadge**: 모든 상태(DRAFT/SUBMITTED/APPROVED/REJECTED/WITHDRAWN) 색상 매핑 완료
- **DocumentDetailPage**: approval line placeholder ready for replacement

### Established Patterns
- **인라인 메시지 패턴**: Phase 4 D-20, Phase 6 D-18 — 성공/에러 메시지 인라인 표시
- **듀얼 검증 패턴**: Phase 4 D-19, Phase 6 D-10 — 프론트엔드 + 백엔드 이중 검증
- **에디터 헤더 버튼**: Phase 6 D-01 — [←] [삭제] [저장] [제출] 순서 배치
- **확인 다이얼로그**: Phase 6 D-02 — 간단 경고 + 확인/취소 패턴
- **모달 팝업**: Phase 4 D-14 — 템플릿 선택 모달 패턴
- **드래그 앤 드롭**: Phase 3 — 직위 정렬 패턴
- **Pessimistic locking**: findByIdForUpdate for concurrent safety
- **AuditLogService**: 결재 액션 audit log 기록

### Integration Points
- **DocumentEditorPage**: 결재선 편집기를 본문/첨부 아래에 추가
- **DocumentDetailPage**: approval line placeholder를 타임라인 + 결재 액션 UI로 교체
- **DocumentService.submitDocument**: 결재선 필수 검증 추가 (APPROVE 1명 이상)
- **App.tsx routing**: /approvals/pending, /approvals/completed 페이지 라우팅
- **MainNavbar**: 이미 결재 관련 메뉴 구성 완료

</code_context>

<specifics>
## Specific Ideas

- 결재선 타임라인은 단계별로 결재자 정보(이름, 부서/직위) + 결재 유형 + 상태 배지 + 처리일시 + 코멘트를 표시
- REFERENCE 섹션은 결재선 아래 별도로 분리하여 순차 결재와 구분
- 철회 버튼은 SUBMITTED 상태 + 다음 결재자 미처리 조건일 때만 표시 (조건 불만족 시 숨김)
- 재기안은 새 독립 문서 생성 (원본 참조 없음) — PRD "Resubmission always creates a new document" 준수

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 07-approval-workflow*
*Context gathered: 2026-04-09*

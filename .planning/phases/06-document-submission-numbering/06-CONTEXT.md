# Phase 6: Document Submission & Numbering - Context

**Gathered:** 2026-04-08
**Status:** Ready for planning

<domain>
## Phase Boundary

Users can submit draft documents, triggering immutable locking and document number assignment with race-condition protection. This phase covers the submit API endpoint, document numbering (PREFIX-YYYY-NNNN), frontend submit button + confirmation dialog, immutability enforcement on submitted documents, and document number display. Approval line editor belongs to Phase 7; this phase allows submission without an approval line.

</domain>

<decisions>
## Implementation Decisions

### 제출 확인 UX
- **D-01:** 제출 버튼은 **에디터 상단 헤더**에 배치 — 돌아가기(←) 옆에 [삭제] [저장] [제출] 순서로 배치. 기존 에디터 헤더 패턴과 일관성 유지
- **D-02:** 제출 확인 다이얼로그는 **간단 경고** — "제출 후에는 수정할 수 없습니다" 경고 + "제출" / "취소" 버튼. 문서 요약 표시 없이 간결하게
- **D-03:** 제출 버튼은 **primary 강조색** 버튼, 저장 버튼은 회색 outline. 시각적 계층구조로 제출이 주요 액션임을 명확히
- **D-04:** 제출 버튼은 **DRAFT 상태일 때만 표시**. 제출된 문서 상세 페이지에서는 제출 버튼 숨김 (편집 모드에서만 노출)
- **D-05:** 제출 처리 중 **버튼 로딩(스피너) + 비활성화**. 본문 영역 불투명 처리로 중복 제출 방지

### 제출 전 검증 조건
- **D-06:** 필수 검증: **제목 + 본문/폼데이터** — GENERAL=본문(bodyHtml) 필수, EXPENSE=항목 1개 이상 필수, LEAVE=날짜/사유 필수. 빈 문서 제출 방지
- **D-07:** Phase 6에서는 **결재선 없이 제출 허용**. Phase 7에서 결재선 필수 검증 추가 예정
- **D-08:** 검증 실패 시 **필드별 인라인 에러** 표시 (Phase 4 D-19/D-20 패턴 유지)
- **D-09:** 제출 버튼은 **항상 활성 상태**, 클릭 시 검증 실행 후 실패 시 에러 표시
- **D-10:** **프론트엔드 + 백엔드 이중 검증** (Phase 4 D-19 듀얼 검증 패턴 유지). 백엔드에서도 DRAFT 상태 확인 + 필수 필드 검증
- **D-11:** 이미 제출된 문서 재제출 시도 시 **409 Conflict** 에러 + "이미 제출된 문서입니다" 메시지
- **D-12:** 미저장 변경사항이 있을 때 **자동 저장 후 제출** 진행. 데이터 손실 방지
- **D-13:** 첨부파일 업로드 중 제출 시 **업로드 완료 대기 후 제출** 진행
- **D-14:** 첨부파일 업로드 실패 상태인 파일이 있으면 **제출 차단** — 실패 파일 삭제/재업로드 필요
- **D-15:** 백엔드 API 에러는 **인라인 에러 메시지**로 표시 (Phase 4 D-20 패턴)
- **D-16:** **본인 문서만 제출 가능** (drafter_id == 현재 로그인 사용자). 관리자 대리 제출 없음

### 제출 후 사용자 경험
- **D-17:** 제출 완료 후 **문서 상세 페이지**(/documents/:id)로 리다이렉트. 읽기 전용 모드로 문서번호, 제출 상태 확인 가능
- **D-18:** 성공 메시지는 **인라인 메시지** — "문서가 제출되었습니다 (GEN-2026-0001)" 형식. Phase 4 D-20 패턴 유지
- **D-19:** 성공 메시지는 **5초 후 자동 사라짐** + X 버튼으로 수동 닫기 가능
- **D-20:** 문서 상세 페이지에서 문서번호는 **제목 옆에 표시** — "LEV-2026-0003 | 제출됨" 형식. DRAFT에서는 번호 미표시
- **D-21:** 문서 목록 테이블에 **문서번호 칼럼 추가**. DRAFT 문서는 '-' 표시
- **D-22:** 기존 **DocumentStatusBadge 컴포넌트 디자인 유지** — 이미 모든 상태(DRAFT/SUBMITTED/APPROVED/REJECTED/WITHDRAWN) 색상 매핑 완료

### 문서번호 프리픽스
- **D-23:** 프리픽스: **GEN** (GENERAL), **EXP** (EXPENSE), **LEV** (LEAVE). 영문 3글자 약어
- **D-24:** 프리픽스는 **approval_template 테이블에 doc_number_prefix 칼럼 추가**하여 DB 기반 관리. Flyway migration으로 기존 템플릿 데이터에 프리픽스 값 설정
- **D-25:** 시퀀스 번호 **4자리** (0001-9999). 초과 시 5자리로 자동 확장
- **D-26:** 시퀀스는 **템플릿별 + 연도별 독립 관리**. PRD 사양대로 doc_sequence(template_code, year) 기준. 이미 DB unique constraint 존재 (V13)

### Claude's Discretion
- 동시성 제어 방식 (pessimistic locking, optimistic locking, DB-level sequence 등)
- 제출 API 엔드포인트 설계 (POST /api/documents/{id}/submit 등)
- 트랜잭션 범위 및 롤백 전략
- 프론트엔드 submit mutation 구현 세부사항

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Product Requirements
- `docs/PRD_MiceSign_v2.0.md` — Full PRD with document submission specs, numbering format (PREFIX-YYYY-NNNN), doc_sequence table DDL, immutability rules
- `docs/FSD_MiceSign_v1.0.md` — Functional spec with submission API contracts, error codes, business rules for document state transitions

### Database Schema
- `backend/src/main/resources/db/migration/V1__create_schema.sql` — Tables: document (docNumber, status, submittedAt), doc_sequence (template_code, year, last_sequence), document_content, approval_template
- `backend/src/main/resources/db/migration/V13__add_doc_sequence_unique_constraint.sql` — Unique constraint on doc_sequence(template_code, year)

### Existing Code (Integration Points)
- `backend/src/main/java/com/micesign/domain/Document.java` — Document entity with docNumber, status, submittedAt fields
- `backend/src/main/java/com/micesign/domain/DocSequence.java` — DocSequence entity for numbering
- `backend/src/main/java/com/micesign/domain/enums/DocumentStatus.java` — DRAFT/SUBMITTED/APPROVED/REJECTED/WITHDRAWN enum
- `backend/src/main/java/com/micesign/service/DocumentService.java` — Existing document service to extend with submit logic
- `backend/src/main/java/com/micesign/controller/DocumentController.java` — Add submit endpoint
- `frontend/src/features/document/pages/DocumentEditorPage.tsx` — Add submit button to header
- `frontend/src/features/document/pages/DocumentDetailPage.tsx` — Add document number display, success message
- `frontend/src/features/document/components/DocumentStatusBadge.tsx` — Already implemented for all statuses
- `frontend/src/features/document/hooks/useDocuments.ts` — Add submit mutation
- `frontend/src/features/document/types/document.ts` — DocumentStatus type already defined

### Prior Phase Context
- `.planning/phases/04-document-core-templates/04-CONTEXT.md` — D-16 (DRAFT=edit, others=read-only), D-19 (dual validation), D-20 (inline messages)
- `.planning/phases/05-file-attachments/05-CONTEXT.md` — D-09 (no delete on submitted docs), D-10 (backend proxy download)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `DocumentStatus` enum: All 5 states already defined — no changes needed
- `DocSequence` entity: Ready for numbering logic, unique constraint in place
- `Document.docNumber` field: Column exists, nullable for DRAFT state
- `DocumentStatusBadge` component: All status colors already mapped
- `useAutoSave` hook: Can be leveraged for auto-save-before-submit flow
- Axios client with JWT interceptors: Use for submit API call

### Established Patterns
- Phase 4 D-19: Dual validation (frontend Zod + backend) — apply same pattern to submit validation
- Phase 4 D-20: Inline messages for feedback — apply to submit success/error messages
- Phase 4 D-16: Route-based edit/view mode (DRAFT=edit, others=read-only) — submit changes mode
- ConfirmDialog component exists in admin features — can reuse or adapt for submit confirmation

### Integration Points
- DocumentEditorPage header: Add submit button alongside existing save/delete buttons
- DocumentDetailPage: Add document number display in header area
- Document list table: Add document number column
- approval_template table: Add doc_number_prefix column via Flyway migration

</code_context>

<specifics>
## Specific Ideas

- 문서번호 형식: `GEN-2026-0001`, `EXP-2026-0001`, `LEV-2026-0001`
- 제출 버튼은 저장 버튼보다 시각적으로 눈에 띄어야 함 (primary 색상)
- 제출 확인 다이얼로그는 최소한으로 — 불필요한 정보 나열 없이 경고 + 확인만

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 06-document-submission-numbering*
*Context gathered: 2026-04-08*

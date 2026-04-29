# Phase 34: 양식 기안자 정보 헤더 자동 채움 - Context

**Gathered:** 2026-04-29
**Status:** Ready for planning
**Source:** Inline shortcut from `/gsd-plan-phase 34` Q&A (replaces `/gsd-discuss-phase` for this phase)

<domain>
## Phase Boundary

모든 결재 양식의 최상단에 기안자의 **부서 / 직위·직책 / 기안자명 / 기안일** 4개 항목을 자동 표시하는 always-on 헤더 컴포넌트(`DrafterInfoHeader`)를 추가한다. 백엔드는 `DocumentService.submit()` 경로에서 user → department + position 을 조인 조회해 `document_content.body` JSON 에 `drafterSnapshot` 키로 박제한다 (Flyway 마이그레이션 무). 프론트엔드는 신규 컴포넌트 1개 + 모든 양식 컴포넌트(built-in 3종 + CUSTOM 동적 렌더러 1종 = 4 통합 지점, 단 CUSTOM 1지점이 preset 4종 + 사용자 정의 CUSTOM 양식 모두 처리하므로 실효 커버리지 = 8 양식)에 헤더 끼워넣기.

requirements: phase-local 만 — REQUIREMENTS.md 신규 REQ-ID 부여 안 함 (사용자 결정 2026-04-29). v1.2 ship-ready 이후 추가된 보강 phase.

scope-out: 새로운 필드 타입 / 빌더에서 헤더 on-off 토글 / 사번·이메일·전화번호 표시 / 직위와 직책 분리 모델 도입 / 기존 문서 일괄 backfill / 영문 i18n / 결재선(승인자) 정보 헤더 포함
</domain>

<decisions>
## Implementation Decisions

### A. 표시 항목 & 데이터 시점 (Q1~Q4 사용자 확정)

- **D-A1:** 표시 4개만 — 부서, 직위·직책, 기안자명, 기안일. 추가/삭제 불가.
- **D-A2:** "직위/직책" = 단일 `Position.name` 값 (시스템 데이터 모델 한계 — 직위·직책 분리 없음). UI 라벨은 "직위·직책" 으로 표시. 향후 분리 모델은 별도 phase.
- **D-A3:** Snapshot 시점 = `DocumentService.submit()` 에서 상태가 `DRAFT → SUBMITTED` 로 전환되는 순간. `Document.submittedAt` 과 동일 시점.
- **D-A4:** 기안일 = `submittedAt` (문서번호 부여 시점과 동일).
- **D-A5:** Snapshot 은 영구 박제. 기안자가 제출 후 부서이동·승진해도 옛 부서/직위 보존. (사용자 Q3=A 확정)

### B. 적용 범위 (Q1=a 확정)

- **D-B1:** Always-on 헤더 — 모든 양식 최상단에 자동 표시. 빌더에서 끄거나 위치를 옮길 수 없음.
- **D-B2:** 통합 대상 4 코드 지점:
  - Built-in: `templates/GeneralForm.tsx`, `templates/ExpenseForm.tsx`, `templates/LeaveForm.tsx`
  - Dynamic: `dynamic/DynamicCustomForm.tsx` — preset 4종(meeting/proposal/purchase/trip) + 사용자 정의 CUSTOM 양식 모두 단일 지점
- **D-B3:** 위치 = 양식 본문 필드 위 (양식 컴포넌트 내부 최상단). 양식 외부 영역(제목, 결재선, 액션 버튼) 은 본 phase 미터치 — UI-SPEC 단계에서 정확한 박스 정렬/간격 결정.

### C. 백엔드 — Snapshot 캡처

- **D-C1:** `document_content.body` JSON 에 새 키 `drafterSnapshot` 추가. shape:
  ```json
  {
    "drafterSnapshot": {
      "departmentName": "개발1팀",
      "positionName": "팀장",
      "drafterName": "홍길동",
      "draftedAt": "2026-04-29T10:30:00"
    }
  }
  ```
- **D-C2:** 캡처 위치 = `DocumentService.submit()` (현재 `setStatus(SUBMITTED)` 와 `submittedAt` 세팅 부근, L295 인근) — 동일 트랜잭션. drafter 의 department/position 은 entity lazy join 으로 접근.
- **D-C3:** Flyway 마이그레이션 무 — `document_content.body` 가 이미 JSON 컬럼, 키 추가만으로 충분. `document` 테이블 컬럼 변경 없음.
- **D-C4:** Position null 허용 — `User.positionId` 가 nullable. null 시 `positionName: null` 또는 키 omit (Jackson `JsonInclude.Include.NON_NULL` 기존 컨벤션 따름 — Discretion).
- **D-C5:** Snapshot 은 immutable — 한 번 박제 후 어떤 경로(승인/반려/회수)로도 갱신 안 함. RESUBMIT 시 새 document 가 생성되므로 자연스럽게 새 snapshot.
- **D-C6:** 기존 SUBMITTED 문서(snapshot 없음) 일괄 backfill **안 함** — D-D4 fallback 으로 처리.

### D. 프론트엔드 — DrafterInfoHeader 컴포넌트

- **D-D1:** 단일 컴포넌트 `DrafterInfoHeader.tsx` 신규. props:
  ```ts
  type DrafterSnapshot = {
    departmentName: string;
    positionName: string | null;
    drafterName: string;
    draftedAt: string; // ISO
  };
  type Props =
    | { mode: 'draft' }
    | { mode: 'submitted'; snapshot: DrafterSnapshot | null /* legacy */; drafter: { name: string; departmentName: string; positionName: string | null } };
  ```
  draft 모드는 Zustand auth store (`frontend/src/stores/authStore.ts`) 의 current user 정보 사용. submitted 모드는 snapshot 우선, 없으면 drafter 라이브 정보 fallback (D-D4).
- **D-D2:** DRAFT 모드 (`mode='draft'`) — 부서/직위·직책/기안자명 = 현재 user (live). 기안일 = "—" placeholder. (사용자 확정)
- **D-D3:** SUBMITTED 이후 모드 — snapshot 4개 그대로 표시.
- **D-D4:** **Backward-compat fallback (사용자 확정 default):** legacy 문서 (snapshot 없음) → drafter 의 **현재** user 정보로 live 조회. UI 우측에 작은 "(현재 정보)" 배지 표시해 snapshot 아닌 라이브임을 시각화. 백엔드 응답에 drafter 의 라이브 부서/직위가 이미 직렬화되어 있으면 그대로 사용 (DocumentResponse 구조 RESEARCH 단계에서 확인).
- **D-D5:** **레이아웃 (default — UI-SPEC 가능):** 한 줄 4-column grid `부서 | 직위·직책 | 기안자 | 기안일` (md+), 모바일 2x2 (sm). 라벨 작게(text-xs), 값 보통(text-sm).
- **D-D6:** 4 코드 지점 모두 `<DrafterInfoHeader mode={...} {...} />` 단순 삽입. CUSTOM 1지점이 7 양식 자동 처리. 양식별 분기 로직 도입 안 함.
- **D-D7:** 날짜 포맷 — 기존 프로젝트 컨벤션 따름 (`YYYY-MM-DD` 예상, RESEARCH 단계에서 기존 dateFormat 유틸 확인).

### E. 검증

- **D-E1:** 백엔드 단위 테스트 — `DocumentServiceTest.submit_capturesDrafterSnapshot` (positionId null/non-null 2케이스, snapshot JSON 직렬화 단언)
- **D-E2:** 프론트엔드 컴포넌트 테스트 — `DrafterInfoHeader.test.tsx` (draft mode / submitted mode / legacy fallback "현재 정보" 배지 3 케이스)
- **D-E3:** UAT — 4 통합 지점 수동 체크 (built-in 3 + CUSTOM 1) × DRAFT/SUBMITTED 2 = 8 시나리오
- **D-E4:** 회귀 — 기존 양식의 다른 필드/결재선/첨부 정상 동작. Phase 32 의 양식 빌더 인프라 무영향. `tsc --noEmit` + `vite build` PASS.

### Claude's Discretion

- DrafterInfoHeader 의 정확한 Tailwind 클래스 / 색상 / 구분선 — UI-SPEC 단계
- positionId null 시 직렬화: 키 omit vs `null` 명시 — Jackson 기존 컨벤션 따름
- DrafterInfoHeader i18n key 위치 (`templates.drafterInfo.*` vs `documents.drafterInfo.*`) — 기존 i18n 구조에 맞게 RESEARCH 단계 결정
- "(현재 정보)" 배지의 정확한 wording / 색상 — UI-SPEC
</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### 백엔드 — 제출 경로 + Document 모델

- `backend/src/main/java/com/micesign/domain/Document.java` — `drafter` ManyToOne, `submittedAt`, status enum
- `backend/src/main/java/com/micesign/domain/DocumentContent.java` — `body` JSON 컬럼 (snapshot 박제 위치)
- `backend/src/main/java/com/micesign/service/DocumentService.java` (L295 부근 `submit()`) — 상태 전이 + snapshot 캡처 지점
- `backend/src/main/java/com/micesign/domain/User.java` — `departmentId` (NN) + `positionId` (nullable) + Department/Position lazy join
- `backend/src/main/java/com/micesign/domain/Department.java` — name (계층 구조이지만 본 phase 는 leaf name 만 사용)
- `backend/src/main/java/com/micesign/domain/Position.java` — name (단일 필드)

### 프론트엔드 — 양식 통합 지점 (4 코드 지점)

- `frontend/src/features/document/components/templates/GeneralForm.tsx`
- `frontend/src/features/document/components/templates/ExpenseForm.tsx`
- `frontend/src/features/document/components/templates/LeaveForm.tsx`
- `frontend/src/features/document/components/dynamic/DynamicCustomForm.tsx` — CUSTOM + preset 4종 통합 처리
- `frontend/src/stores/authStore.ts` — DRAFT 모드의 current user info source

### 기존 패턴 참조

- `frontend/src/features/document/types/document.ts` — DocumentBody JSON 타입 (`drafterSnapshot` 추가 지점)
- `frontend/src/features/document/types/dynamicForm.ts` — CUSTOM 동적 폼 타입 (헤더는 schema field 로 만들지 않음, 컴포넌트 직접 삽입)
- `.planning/phases/32-custom/32-CONTEXT.md` — preset 인프라 SoT (이번 phase 가 그 위에 헤더 얹음)
- `.planning/phases/29-smtp-retrofit/29-CONTEXT.md` — `@TransactionalEventListener` 패턴 (snapshot 도 동일 트랜잭션 내 캡처)
</canonical_refs>

<specifics>
## Specific Ideas

- 사용자 표현 원문: "양식에 부서, 직위/직책, 기안지명 및 기안일이 자동으로 들어가는 컴포넌트"
- "기안지명" → "기안자명" 으로 해석 (오타 추정)
- 기존 SchemaFieldEditor 의 `staticText` / `hidden` 필드 타입과 별개 — 새 필드 타입 도입 안 함, 단일 컴포넌트 직접 삽입
- 4 통합 지점 × 단순 props drilling — 양식별 분기 / 조건부 렌더 / 새로운 hook 도입 안 함
</specifics>

<deferred>
## Deferred Ideas

- 직위와 직책 분리 모델 (Position 분리, 사용자별 직책 별도 칼럼) — v2 또는 별도 phase
- 결재선(승인자) 정보를 헤더에 함께 표시 — 별도 phase
- 사번/이메일/전화번호 등 추가 항목 — 별도 phase
- 영문 i18n — 한국어 only 정책 유지 (v1.x 까지)
- legacy 문서 일괄 backfill (마이그레이션 스크립트) — D-D4 fallback 으로 충분, 운영 결정 후 별도 phase
- 헤더 on-off 토글 / 위치 이동 — always-on 결정 (D-B1) 이지만 향후 요구 시 빌더에 옵션 추가 가능
- 부서 계층 표시 ("개발본부 > 개발1팀") — 본 phase 는 leaf name 만
</deferred>

---

*Phase: 34-drafter-info-header*
*Context gathered: 2026-04-29 via inline shortcut from /gsd-plan-phase Q&A (replaces /gsd-discuss-phase)*

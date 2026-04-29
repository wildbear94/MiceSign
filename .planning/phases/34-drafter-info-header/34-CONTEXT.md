# Phase 34: 양식 기안자 정보 헤더 자동 채움 - Context

**Gathered:** 2026-04-29
**Status:** Ready for planning
**Source:** Inline shortcut from `/gsd-plan-phase 34` Q&A (replaces `/gsd-discuss-phase` for this phase)

<domain>
## Phase Boundary

모든 결재 양식의 최상단에 기안자의 **부서 / 직위·직책 / 기안자명 / 기안일** 4개 항목을 자동 표시하는 always-on 헤더 컴포넌트(`DrafterInfoHeader`)를 추가한다. 백엔드는 `DocumentService.submit()` 경로에서 user → department + position 을 조인 조회해 `document_content.form_data` JSON 에 `drafterSnapshot` 키로 박제한다 (Flyway 마이그레이션 무). 프론트엔드는 신규 컴포넌트 1개 + 모든 양식 컴포넌트(built-in Edit 6 + ReadOnly 6 + DynamicCustomForm/ReadOnly 2 = **14 통합 지점**)에 헤더 끼워넣기. 추가로 Q1=A 결정으로 `UserProfile` 확장(부서명/직위명 추가)과 Q3=A 결정으로 latent bug `DocumentDetailResponse.drafter` nested type 정정을 같은 phase 에 포함.

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
- **D-B2:** 통합 대상 **14 코드 지점** (RESEARCH 가 정정 — 초기 CONTEXT 의 "4 지점" 은 잘못된 추정이었음):
  - Built-in Edit 6: `templates/GeneralForm.tsx`, `ExpenseForm.tsx`, `LeaveForm.tsx`, `PurchaseForm.tsx`, `BusinessTripForm.tsx`, `OvertimeForm.tsx`
  - Built-in ReadOnly 6: `templates/GeneralReadOnly.tsx`, `ExpenseReadOnly.tsx`, `LeaveReadOnly.tsx`, `PurchaseReadOnly.tsx`, `BusinessTripReadOnly.tsx`, `OvertimeReadOnly.tsx`
  - Dynamic 2: `dynamic/DynamicCustomForm.tsx`, `dynamic/DynamicCustomReadOnly.tsx`
  - 헤더 컴포넌트 자체는 양식별 분기 없음 (단순 props drilling). 양식별 ~3줄 변경.
- **D-B3:** 위치 = 양식 본문 필드 위 (양식 컴포넌트 내부 최상단). 양식 외부 영역(제목, 결재선, 액션 버튼) 은 본 phase 미터치 — UI-SPEC 단계에서 정확한 박스 정렬/간격 결정.

### C. 백엔드 — Snapshot 캡처

- **D-C1:** `document_content.form_data` JSON 에 새 키 `drafterSnapshot` 추가 (RESEARCH 정정 — `body` 컬럼은 존재하지 않음. 실제 컬럼은 `body_html (LONGTEXT)` 와 `form_data (JSON)`). 클라이언트가 `JSON.stringify(...)` 로 String 화한 form_data 를 backend 에서 keys-merge 하여 `drafterSnapshot` 키 주입. 기존에는 backend 가 form_data 를 패스스루 했으므로 **본 phase 가 처음으로 keys-merge 책임을 가짐**. ObjectMapper 는 `DocumentService.objectMapper` (L60) 재사용.

  shape:
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
- **D-C3:** Flyway 마이그레이션 무 — `document_content.form_data` 가 이미 JSON 컬럼, 키 머지만으로 충분. `document` 테이블 컬럼 변경 없음.
- **D-C4:** Position null 허용 — `User.positionId` 가 nullable. null 시 `positionName: null` 또는 키 omit (Jackson `JsonInclude.Include.NON_NULL` 기존 컨벤션 따름 — Discretion).
- **D-C5:** Snapshot 은 immutable — 한 번 박제 후 어떤 경로(승인/반려/회수)로도 갱신 안 함. RESUBMIT 시 새 document 가 생성되므로 자연스럽게 새 snapshot.
- **D-C6:** 기존 SUBMITTED 문서(snapshot 없음) 일괄 backfill **안 함** — D-D4 fallback 으로 처리.
- **D-C7:** **Snapshot 캡처 실패 시 트랜잭션 전체 롤백** (Q2=A 사용자 결정, 2026-04-29). `ObjectMapper.writeValueAsString()` / `readValue` 가 throw 하면 RuntimeException 으로 re-throw → submit 트랜잭션 롤백 → 사용자에게 에러 응답. 데이터 일관성 우선 — RESEARCH 권고였던 "swallow + WARN" (옵션 B) 를 거절. submit 흐름 차단을 감수하더라도 snapshot 누락된 문서 생성을 방지.

### D. 프론트엔드 — DrafterInfoHeader 컴포넌트

- **D-D1:** 단일 컴포넌트 `DrafterInfoHeader.tsx` 신규. props:
  ```ts
  type DrafterSnapshot = {
    departmentName: string;
    positionName: string | null;
    drafterName: string;
    draftedAt: string; // ISO
  };
  type DrafterLive = {
    drafterName: string;
    departmentName: string;
    positionName: string | null;
  };
  type Props =
    | { mode: 'draft'; live: DrafterLive }
    | { mode: 'submitted'; snapshot: DrafterSnapshot | null /* legacy */; live: DrafterLive };
  ```
  - draft 모드: 신규 작성 시 `UserProfile`(D-F1 확장 후) 의 부서명/직위명 사용. 임시저장 후 재진입 시 `existingDoc.drafterName/departmentName/positionName` (DocumentDetailResponse flat 필드) 사용 — 둘 모두 `live` prop 으로 정규화해 컴포넌트는 source 무지.
  - submitted 모드: snapshot 우선, 없으면 (legacy) `live` 로 fallback + "(현재 정보)" 배지.
- **D-D2:** DRAFT 모드 (`mode='draft'`) — 부서/직위·직책/기안자명 = current user (live). 기안일 = "—" placeholder. 데이터 source = D-F (UserProfile 확장) 또는 임시저장된 doc 의 flat 필드.
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

### F. UserProfile 확장 (Q1=A 사용자 결정, 2026-04-29)

**컨텍스트:** 신규 작성 화면에서는 `documentId=null` → `existingDoc=undefined`. 또한 Zustand `authStore.UserProfile` 은 `id, name, email, role, departmentId, mustChangePassword` 만 보유 — `departmentName`/`positionName` 없음. DRAFT 헤더 데이터 source 가 부재했음. RESEARCH 권고 옵션 A 채택.

- **D-F1:** `UserProfile` 인터페이스에 `departmentName: string` + `positionName: string | null` 2 필드 추가 (`frontend/src/stores/authStore.ts` 또는 동등 type 위치).
- **D-F2:** Backend `LoginResponse.user` 와 `RefreshResponse.user` (또는 동등 record) 에 동일 2 필드 추가. `AuthService` 의 user 직렬화 로직에서 `user.getDepartment().getName()` 과 `user.getPosition() == null ? null : user.getPosition().getName()` null-safe 추출.
- **D-F3:** Breaking change 없음 — 기존 클라이언트는 신규 필드 무시하고도 동작. token TTL 만료 후 자연스럽게 refresh 흐름에서 새 필드 수신.
- **D-F4:** RESEARCH 가 식별한 영향 파일: `AuthService.java`, `LoginResponse.java`/`RefreshResponse.java` (또는 통합 record), `UserProfile.ts` 또는 `authStore.ts`. 정확한 파일 경로는 PLAN 단계 RESEARCH `## Files to Modify` 섹션 참조.
- **D-F5:** AuthController/Login flow 의 다른 책임(JWT 발급, 비밀번호 검증, 세션 관리) 무수정. user 직렬화 부분만 확장.

### G. Latent bug fix — DocumentDetailResponse type (Q3=A 사용자 결정, 2026-04-29)

**컨텍스트:** RESEARCH (Pitfall 6) 가 발견한 latent bug — FE `DocumentDetailResponse.drafter: DrafterInfo` (nested) 와 backend flat 필드 (`drafterName, departmentName, positionName`) **타입 mismatch**. `DocumentDetailPage.tsx` L228 의 `doc.drafter.name` 이 runtime undefined access. Phase 34 의 fallback 경로가 같은 데이터를 쓰므로 같은 phase 에 정정 포함 (옵션 A 채택).

- **D-G1:** `frontend/src/features/document/types/document.ts` L22~23 의 `DocumentDetailResponse.drafter: DrafterInfo` 제거 + `drafterName: string`, `departmentName: string`, `positionName: string | null` 3 필드 추가 (backend 응답과 정합).
- **D-G2:** `frontend/src/features/document/pages/DocumentDetailPage.tsx` L228 의 `doc.drafter.name` → `doc.drafterName` 정정. 다른 `doc.drafter.*` 참조 grep 으로 일괄 점검.
- **D-G3:** `DrafterInfo` 타입 자체가 다른 곳에서 미사용 시 제거. 사용 중이면 보존.
- **D-G4:** Latent bug fix 단독 commit 으로 분리 (atomic) — Phase 34 PLAN 의 첫 task 또는 Wave 0 으로 배치. RESEARCH 의 Pitfall 6 은 production runtime undefined access 이므로 먼저 정정해야 헤더 통합 task 가 깨끗하게 진행 가능.

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
- `backend/src/main/java/com/micesign/domain/DocumentContent.java` — `form_data` JSON 컬럼 (snapshot 박제 위치). 별도 `body_html (LONGTEXT)` 컬럼은 본 phase 무관
- `backend/src/main/java/com/micesign/service/DocumentService.java` (L295 부근 `submit()` + L60 `objectMapper`) — 상태 전이 + snapshot 캡처 지점, ObjectMapper 재사용
- `backend/src/main/java/com/micesign/domain/User.java` — `departmentId` (NN) + `positionId` (nullable) + Department/Position lazy join
- `backend/src/main/java/com/micesign/domain/Department.java` — name (계층 구조이지만 본 phase 는 leaf name 만 사용)
- `backend/src/main/java/com/micesign/domain/Position.java` — name (단일 필드)
- `backend/src/main/java/com/micesign/dto/document/DocumentMapper.java` (L21~24, L33~36) — `getDrafter().getDepartment().getName()` null-safe 추출 패턴 (D-D4 fallback 가 의존하는 라이브 직렬화)
- `backend/src/main/java/com/micesign/dto/document/DocumentDetailResponse.java` — flat `drafterName/departmentName/positionName` 필드 (FE type 정정 D-G1 의 정합 기준)
- `backend/src/main/java/com/micesign/service/AuthService.java` 또는 동등 (D-F2 영향) — login/refresh 응답에 부서명/직위명 추가
- `backend/src/main/java/com/micesign/dto/auth/LoginResponse.java` 와 `RefreshResponse.java` (또는 통합 record) — D-F2 영향
- `backend/src/test/java/com/micesign/document/DocumentSubmitTest.java` — 통합 테스트 메서드 추가 위치 (RESEARCH 정정 — `DocumentServiceTest` 가 아닌 `DocumentSubmitTest`)

### 프론트엔드 — 양식 통합 지점 (14 코드 지점)

**Edit 6 (사용자 작성 화면):**
- `frontend/src/features/document/components/templates/GeneralForm.tsx`
- `frontend/src/features/document/components/templates/ExpenseForm.tsx`
- `frontend/src/features/document/components/templates/LeaveForm.tsx`
- `frontend/src/features/document/components/templates/PurchaseForm.tsx`
- `frontend/src/features/document/components/templates/BusinessTripForm.tsx`
- `frontend/src/features/document/components/templates/OvertimeForm.tsx`

**ReadOnly 6 (조회 전용):**
- `frontend/src/features/document/components/templates/GeneralReadOnly.tsx`
- `frontend/src/features/document/components/templates/ExpenseReadOnly.tsx`
- `frontend/src/features/document/components/templates/LeaveReadOnly.tsx`
- `frontend/src/features/document/components/templates/PurchaseReadOnly.tsx`
- `frontend/src/features/document/components/templates/BusinessTripReadOnly.tsx`
- `frontend/src/features/document/components/templates/OvertimeReadOnly.tsx`

**Dynamic 2 (CUSTOM + preset 4종 처리):**
- `frontend/src/features/document/components/dynamic/DynamicCustomForm.tsx`
- `frontend/src/features/document/components/dynamic/DynamicCustomReadOnly.tsx`

### 프론트엔드 — 인프라 지원 파일

- `frontend/src/features/document/components/templates/templateRegistry.ts` (L17~36) — `TemplateEditProps` / `TemplateReadOnlyProps` 에 drafter live + snapshot props 추가
- `frontend/src/features/document/types/document.ts` (L22~23) — `DocumentDetailResponse` 타입 정정 (D-G1: nested drafter 제거 + flat 3 필드)
- `frontend/src/features/document/pages/DocumentEditorPage.tsx` (L315~330) — EditComponent 에 drafter live props 전달
- `frontend/src/features/document/pages/DocumentDetailPage.tsx` (L228 + L250~256) — D-G2 latent bug fix + ReadOnlyComponent props 전달
- `frontend/src/stores/authStore.ts` — DRAFT 모드 데이터 source (D-F1 확장 후)
- `frontend/public/locales/ko/document.json` — `drafterInfo.*` 6 i18n 키 (RESEARCH 검증된 namespace = `'document'`)

### 기존 패턴 참조

- `frontend/src/features/document/types/dynamicForm.ts` — CUSTOM 동적 폼 타입 (헤더는 schema field 로 만들지 않음, 컴포넌트 직접 삽입)
- `.planning/phases/32-custom/32-CONTEXT.md` — preset 인프라 SoT (이번 phase 가 그 위에 헤더 얹음)
- `.planning/phases/29-smtp-retrofit/29-CONTEXT.md` — `@TransactionalEventListener` 패턴 (snapshot 도 동일 트랜잭션 내 캡처)
- `.planning/phases/34-drafter-info-header/34-RESEARCH.md` — Files to Modify 표 + Code Examples + Pitfalls (PLAN 의 직접 입력)
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
- 날짜 포맷 중앙 유틸 추출 — 6곳 인라인 `toLocaleDateString('ko-KR', ...)` 패턴 통합 리팩토링은 별도 phase
</deferred>

---

*Phase: 34-drafter-info-header*
*Context gathered: 2026-04-29 via inline shortcut from /gsd-plan-phase Q&A (replaces /gsd-discuss-phase)*

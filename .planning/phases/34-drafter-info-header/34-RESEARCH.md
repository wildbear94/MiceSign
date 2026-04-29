# Phase 34: 양식 기안자 정보 헤더 자동 채움 - Research

**Researched:** 2026-04-29
**Domain:** 결재 양식 헤더 + 백엔드 snapshot 박제 (composition-only)
**Confidence:** HIGH (전 항목 코드 grep 으로 검증, 외부 라이브러리 의존 추가 0건)

## Summary

본 phase 는 **신규 라이브러리 / 신규 패턴 도입 0건**의 composition-only 작업이다. 백엔드는 `DocumentService.submit()` 의 기존 `setStatus(SUBMITTED)` + `setSubmittedAt(...)` 블록(L294~296) 옆에 `DocumentContent.formData` JSON 머지 한 블록을 추가하면 끝난다. 프론트엔드는 신규 컴포넌트 1개(`DrafterInfoHeader.tsx`) 를 만들고 Edit 컴포넌트 4 + ReadOnly 컴포넌트 6 (built-in 5 + dynamic 1) 의 양식 본문 최상단에 끼워넣는다.

**리서치 단계에서 발견한 중대 사실 3건:**

1. **CONTEXT.md 의 "document_content.body" 표현은 부정확** — 실제 컬럼은 `body_html (LONGTEXT)` 와 `form_data (JSON)` 두 개. snapshot 의 박제 위치는 `form_data` 이며 새 키 `drafterSnapshot` 을 머지하는 형태가 된다.
2. **CONTEXT.md 의 "built-in 3 + dynamic 1 = 4 통합 지점" 도 부정확** — Edit 양식은 6개 (`GENERAL/EXPENSE/LEAVE/PURCHASE/BUSINESS_TRIP/OVERTIME`) + `DynamicCustomForm`, ReadOnly 양식은 6개 + `DynamicCustomReadOnly`. 즉 통합 지점은 **14개** (Edit 7 + ReadOnly 7). 다만 동일 컴포넌트 + 동일 props 이므로 노력은 14× 동일하다.
3. **`UserProfile` (Zustand authStore.user) 에는 `departmentName`/`positionName` 이 없다** — `id, name, email, role, departmentId, mustChangePassword` 만 보유. 따라서 D-D2 의 "DRAFT 모드에서 Zustand authStore 의 current user 정보 사용" 결정은 그대로는 작동하지 않는다. 이미 백엔드 `DocumentDetailResponse` 가 라이브 부서/직위를 직렬화해 주므로, **DRAFT 모드도 `DocumentDetailResponse` 의 `departmentName`/`positionName` 사용** 이 가장 간단한 해법.

**Primary recommendation:**
- 백엔드: `DocumentService.submit()` L294~296 직후에 `formData` JSON 을 ObjectMapper 로 read → `drafterSnapshot` 키 put → write back. drafter.getDepartment()/getPosition() 은 LAZY 이지만 `@Transactional` 컨텍스트 내이므로 안전.
- 프론트엔드: 단일 `DrafterInfoHeader` 컴포넌트 + Edit/ReadOnly 14 지점 단순 삽입. props 는 백엔드 `DocumentDetailResponse` 의 flat 필드(`departmentName/positionName/drafterName/submittedAt`) + `formData` 에 박제된 `drafterSnapshot` (있으면 우선).
- **Side-effect fix 1건 동반 권장**: `frontend/src/features/document/types/document.ts` 의 `DocumentDetailResponse.drafter: DrafterInfo` (nested) 가 백엔드 flat 응답과 mismatch — 사실은 이미 latent 버그 (DocumentDetailPage L228 의 `doc.drafter.name` 은 runtime 에 undefined 접근). Phase 34 가 동일 필드를 쓰므로 같은 commit 으로 flat 으로 정정 (ASSUMED-A1 — 사용자 확인 필요).

## User Constraints (from CONTEXT.md)

### Locked Decisions

**A. 표시 항목 & 데이터 시점:**
- D-A1: 표시 4개만 — 부서, 직위·직책, 기안자명, 기안일. 추가/삭제 불가
- D-A2: "직위/직책" = 단일 `Position.name` 값. UI 라벨은 "직위·직책" 으로 표시
- D-A3: Snapshot 시점 = `DocumentService.submit()` 의 `DRAFT → SUBMITTED` 전환 순간
- D-A4: 기안일 = `submittedAt`
- D-A5: Snapshot 영구 박제. 기안자가 제출 후 부서이동·승진해도 옛 부서/직위 보존

**B. 적용 범위:**
- D-B1: Always-on 헤더 (모든 양식 최상단). 빌더 토글 불가
- D-B2: 통합 대상 (CONTEXT 표기 4개 + 본 RESEARCH 가 정정한 실효치 14개 — 아래 Files to Modify 참조)
- D-B3: 위치 = 양식 본문 필드 위 (양식 컴포넌트 내부 최상단). 외부 영역(제목/결재선/액션) 미터치

**C. 백엔드:**
- D-C1: `document_content.formData` JSON 에 `drafterSnapshot` 키 추가 (CONTEXT 의 "body" 는 정확히는 `formData` 컬럼 — Open Question 2 참조)
  ```json
  { "drafterSnapshot": { "departmentName": "개발1팀", "positionName": "팀장", "drafterName": "홍길동", "draftedAt": "2026-04-29T10:30:00" } }
  ```
- D-C2: 캡처 위치 = `DocumentService.submit()` (L294~296 인근) — 동일 트랜잭션
- D-C3: Flyway 마이그레이션 무
- D-C4: Position null 허용 — Jackson 기존 컨벤션 따름 (Open Question 3 답변 — `null` 명시)
- D-C5: Snapshot immutable — 이후 갱신 안 함
- D-C6: 기존 SUBMITTED 문서 backfill 안 함

**D. 프론트엔드:**
- D-D1: 단일 컴포넌트 `DrafterInfoHeader.tsx` 신규
- D-D2: DRAFT 모드 — current user 정보 (Open Question 7 답변: authStore 만으로는 불가, `DocumentDetailResponse` 의 flat 필드 사용 권장)
- D-D3: SUBMITTED 모드 — snapshot 4개 그대로 표시
- D-D4: Backward-compat fallback — legacy 문서 (snapshot 없음) → drafter 라이브 정보 + "(현재 정보)" 배지
- D-D5: 4-column grid (md+), 2x2 (sm)
- D-D6: 14 통합 지점 모두 동일 컴포넌트 단순 삽입 (양식별 분기 없음)
- D-D7: 날짜 포맷 — 기존 컨벤션 (Open Question 4 답변: `toLocaleDateString('ko-KR', { year, month, day })` 인라인 패턴)

**E. 검증:**
- D-E1: 백엔드 통합 테스트 — `DocumentSubmitTest` 에 snapshot 단언 케이스 추가 (Open Question 6 답변: 기존 테스트가 모두 MockMvc 통합 테스트 — 신규 단위 테스트 파일 X)
- D-E2: 프론트엔드 컴포넌트 테스트 — `DrafterInfoHeader.test.tsx` 신규
- D-E3: UAT — 14 통합 지점 (or 7 양식 + Edit/ReadOnly 2 모드) × DRAFT/SUBMITTED 시나리오
- D-E4: 회귀 — 기존 양식 무영향, `tsc --noEmit` + `vite build` PASS

### Claude's Discretion (RESEARCH 단계 결정 권고)

| 항목 | RESEARCH 권고 | 근거 |
|------|--------------|------|
| Tailwind 클래스 / 색상 | UI-SPEC 단계로 이관 | scope 외 |
| positionId null 직렬화 | `null` 명시 (key omit X) | 기존 document/* DTO 가 `@JsonInclude` 미적용 — null 직렬화 default. snapshot JSON 도 동일하게 `null` 명시이 일관 |
| i18n key 위치 | `document.json` (singular) — `document.drafterInfo.*` 경로 | DocumentForm 들이 `useTranslation('document')` 사용. `documents.json` 파일 자체 X |
| "(현재 정보)" 배지 wording | UI-SPEC 단계로 이관 | scope 외 |

### Deferred Ideas (OUT OF SCOPE — 무시)

- 직위와 직책 분리 모델 / 결재선 정보 헤더 / 사번·이메일·전화번호 / 영문 i18n / legacy backfill / 헤더 토글 / 부서 계층 표시

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| (phase-local) | REQUIREMENTS.md 신규 ID 부여 안 함 (CONTEXT 사용자 결정 2026-04-29) | RESEARCH 도 REQ-ID 매핑 표 없음 — phase-local 만 |

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Drafter snapshot 박제 (immutable) | API/Backend (`DocumentService.submit`) | Database (`document_content.form_data`) | 트랜잭션 일관성 + 라이브 user/department/position 조인 권한이 backend 에만 |
| Drafter snapshot 직렬화 | API/Backend (Jackson ObjectMapper → JSON 컬럼) | — | DB 는 JSON 컬럼 보관만, 직렬화 책임은 service layer |
| Snapshot 표시 (SUBMITTED) | Browser/Client (`DrafterInfoHeader.tsx`) | API (snapshot 직렬화 응답 — 단, 본 phase 는 `formData` 패스스루) | 표시 logic 은 client; backend 는 raw JSON 만 |
| Live drafter 정보 fallback (legacy) | API/Backend (`DocumentMapper` 가 이미 flat 필드 직렬화) | Browser (배지 표시) | 기존 mapper 가 `drafterName/departmentName/positionName` 을 이미 응답에 포함 — 추가 endpoint 불필요 |
| Live drafter 정보 (DRAFT 모드) | API/Backend (`DocumentDetailResponse` 의 flat 필드) | Browser | authStore 의 `UserProfile` 에 `departmentName/positionName` 이 없으므로 backend 응답이 SoT |
| 날짜 포맷팅 | Browser (`toLocaleDateString('ko-KR', ...)`) | — | 기존 코드 컨벤션. 중앙 util 없음 |
| i18n 라벨 | Browser (`react-i18next` + `public/locales/ko/document.json`) | — | 기존 컨벤션 — `useTranslation('document')` |

## Domain Patterns

### Pattern 1: DocumentService.submit 의 상태 전이 + 동일 트랜잭션 부수 작업

**위치:** `backend/src/main/java/com/micesign/service/DocumentService.java` L264~338 (`submitDocument`)

**현재 구조:**
```java
public DocumentDetailResponse submitDocument(Long docId, Long userId) {
    Document document = loadAndVerifyOwnerDraft(docId, userId);
    // 1. 검증 (title, approval lines, form validator)
    // 2. 문서번호 부여 (generateDocNumber)
    // 3. 상태 전이
    document.setDocNumber(docNumber);
    document.setStatus(DocumentStatus.SUBMITTED);
    document.setSubmittedAt(LocalDateTime.now());          // ← L296
    // ※ Phase 34 의 snapshot 캡처는 여기 직후
    // 4. currentStep / approval lines / 첨부 이동 / audit / event
    documentRepository.save(document);                      // ← L309
    moveAttachmentsToPermanentFolder(...);
    auditLogService.log(...);
    eventPublisher.publishEvent(new ApprovalNotificationEvent(...));
    ...
    return buildDetailResponse(document);
}
```

**클래스 레벨 `@Transactional` (L56)** — `submit()` 전체가 단일 트랜잭션. drafter.getDepartment().getName() / drafter.getPosition().getName() 의 LAZY join 도 이 컨텍스트에서 안전.

**Phase 34 가 추가하는 코드 (대략 15~25줄):**
- `DocumentContent content` 는 이미 L286~287 에서 로드됨 — 재사용
- `formData` (String JSON) 를 `objectMapper.readTree()` 또는 `Map<String,Object>` 로 파싱
- `drafterSnapshot` 키 머지
- 다시 `objectMapper.writeValueAsString()` → `content.setFormData(...)` → `documentContentRepository.save(content)` (또는 동일 트랜잭션의 더티체크에 의존)

**기존 ObjectMapper 인스턴스:** L60 `private static final ObjectMapper objectMapper = new ObjectMapper();` — 그대로 재사용.

### Pattern 2: drafter → department/position null-safe 접근

**기존 코드 (인용):** `DashboardService.java` L121~122
```java
doc.getDrafter().getDepartment() != null
    ? doc.getDrafter().getDepartment().getName() : null
```
같은 패턴 4곳 발견 (`ApprovalService` L184, `DepartmentService` L58, `RegistrationService` L122, `UserSearchService` L40). Phase 34 도 동일 패턴 답습.

**`DocumentMapper.java` L21~24** 도 같은 null-safe 패턴 사용 — 사실 이 mapper 가 이미 `DocumentDetailResponse` 에 `departmentName`/`positionName` 직렬화. **즉, Phase 34 의 fallback 데이터 소스가 이미 응답에 들어 있다**.

### Pattern 3: DocumentContent.formData JSON 직렬화

**컬럼 정의 (DocumentContent.java L21~22):**
```java
@Column(name = "form_data", columnDefinition = "JSON")
private String formData;
```
타입은 `String` (raw JSON 문자열 보관). MariaDB JSON 컬럼이지만 JPA 는 String 으로 다룸. 직렬화/역직렬화 책임은 service/mapper 가 진다.

**기존 사용 패턴:**
- `DocumentService.createDocument()` L134: `content.setFormData(request.formData())` — controller 에서 받은 JSON 문자열을 그대로 저장
- 프론트엔드 (`DynamicCustomForm.tsx` L203): `JSON.stringify(cleanedFields)` 로 직렬화해 backend 로 전송
- 백엔드는 JSON 의 key 구조를 들여다 보지 않고 String 그대로 패스스루 — 단 `DocumentFormValidator` 만 예외 (built-in 양식의 schema-driven 검증)

**Phase 34 의 새 책임:** backend 가 처음으로 `formData` JSON 의 **key 를 머지**하는 작업. 패턴이 새롭지만 ObjectMapper read/write 표준 사용.

### Pattern 4: 프론트엔드 양식 컴포넌트 anatomy

**Edit 양식 (예: `GeneralForm.tsx`):**
- props: `TemplateEditProps { documentId, initialData, onSave, readOnly }` — `drafter` 나 `submittedAt` 정보 없음
- 최상단 element: `<form id="document-form" ...>` 안의 `<div>` (template label / 제목 input / Tiptap / 첨부)
- **Phase 34 삽입 지점:** `<form>` 의 첫 번째 child 로 `<DrafterInfoHeader />` — 단, `documentId === null` (신규) 또는 `documentId !== null` (저장된 DRAFT) 분기 필요

**ReadOnly 양식:**
- props: `TemplateReadOnlyProps { title, bodyHtml, formData, schemaSnapshot }` — drafter 정보 없음
- ReadOnly 컴포넌트는 양식 본문만 그리며, drafter 정보는 **상위 페이지** (`DocumentDetailPage` L216~245) 가 별도 grid 로 그린다
- **Phase 34 의 ReadOnly 통합 전략 옵션:**
  - **옵션 A (CONTEXT 의 D-B3 대로):** ReadOnly 컴포넌트 내부 최상단에 헤더 삽입. 단 ReadOnly 의 props 에는 drafter 정보 없으므로 props 추가 필요
  - **옵션 B (대안):** ReadOnly 컴포넌트는 미터치, 상위 `DocumentDetailPage` 의 기존 drafter grid (L216~245) 를 `DrafterInfoHeader` 로 대체. 단 D-B3 ("양식 컴포넌트 내부 최상단") 를 어김

CONTEXT.md D-B3 가 "양식 본문 필드 위 (양식 컴포넌트 내부 최상단)" 으로 명시했으므로 **옵션 A 채택**. ReadOnly 컴포넌트의 props 시그니처에 drafter 4정보 + snapshot 추가가 필요.

### Pattern 5: 프론트엔드 i18n 호출

**기존 컨벤션 (`GeneralForm.tsx` L16):**
```ts
const { t } = useTranslation('document');
// ...
{t('template.GENERAL')}
```
- namespace = `'document'` (singular). config 에서 `ns: ['common', 'auth', 'admin', 'document', 'approval', 'dashboard']` 로 등록 (i18n/config.ts L14).
- 파일: `frontend/public/locales/ko/document.json` 와 `frontend/public/locales/en/document.json`. `dist/locales/...` 는 빌드 산출물 — 수정 금지.
- 영문 키 추가 의무? CONTEXT 의 deferred 에 "영문 i18n" 명시 → ko 만 추가, en 미수정 (Phase 32 와 동일 패턴 — STATE.md 의 "[Phase 32-04 ... en/admin.json 무수정 (D-E2 한국어 only)]" 참조).

**Phase 34 권고 키 (`document.json`):**
```json
"drafterInfo": {
  "departmentLabel": "부서",
  "positionLabel": "직위·직책",
  "drafterLabel": "기안자",
  "draftedAtLabel": "기안일",
  "draftedAtPlaceholder": "—",
  "currentInfoBadge": "(현재 정보)"
}
```

### Pattern 6: 프론트엔드 날짜 포맷

**중앙 유틸 X.** 6곳에서 인라인 패턴 반복:
- `DocumentDetailPage.tsx` L125~127: `new Date(s).toLocaleDateString('ko-KR', { year:'numeric', month:'long', day:'numeric' })` → "2026년 4월 29일"
- `DocumentListTable.tsx` L17~18: 동일 패턴 → "2026년 4월 29일"
- `dashboard/PendingList.tsx` L102: `new Date(s).toLocaleDateString('ko-KR')` (옵션 없음) → "2026. 4. 29."

**Phase 34 권고:** `DocumentDetailPage` 와 동일한 long-form ("2026년 4월 29일") 사용. Date util 신설은 scope 외 (deferred — 본 phase 가 7번째 호출자가 되므로 향후 util 추출 후보).

### Pattern 7: 백엔드 통합 테스트 작성

**기존 컨벤션:** `DocumentSubmitTest.java` 형태 — `@SpringBootTest` + `MockMvc` + `JdbcTemplate` cleanup + H2 in-memory DB (`@ActiveProfiles("test")`). 순수 Mockito unit test 는 backend 도메인 코드에는 사실상 없음 (`document/` 17개 테스트 모두 통합 테스트).

**Phase 34 권고:** `DocumentSubmitTest.java` 에 새 메서드 2개 추가 — `submitDraft_capturesDrafterSnapshot` (positionId 보유 케이스), `submitDraft_capturesDrafterSnapshot_nullPosition` (positionId null). MvcResult 의 `formData` JSON 을 파싱해 `drafterSnapshot.*` 필드 단언.

### Pattern 8: 프론트엔드 컴포넌트 테스트 작성

**기존 컨벤션:** `DrafterCombo.test.tsx` 형태 — `vitest` + `@testing-library/react` + `vi.mock(...)` + render/screen/fireEvent 패턴.

**Phase 34 권고:** `DrafterInfoHeader.test.tsx` 신규 — 3 케이스:
1. `mode='draft'` — 부서/직위·직책/기안자명 표시 + 기안일 = "—"
2. `mode='submitted'` + snapshot 존재 — snapshot 4 필드 표시
3. `mode='submitted'` + snapshot null + drafter live — live 4 필드 + "(현재 정보)" 배지 표시

## System Architecture Diagram

```
┌──────────────────────────────────────────────────────────────────────┐
│ FRONTEND (Browser)                                                    │
│                                                                       │
│  DocumentEditorPage / DocumentDetailPage                              │
│         │                                                             │
│         │ initialData (existingDoc): DocumentDetailResponse           │
│         │   ├─ drafterName, departmentName, positionName (live)       │
│         │   ├─ submittedAt (null when DRAFT)                          │
│         │   └─ formData (JSON string — has drafterSnapshot if SUBMIT) │
│         ▼                                                             │
│  TEMPLATE_REGISTRY[code] OR DYNAMIC_CUSTOM_*                          │
│         │                                                             │
│         ▼                                                             │
│  GeneralForm / ExpenseForm / LeaveForm / PurchaseForm /               │
│  BusinessTripForm / OvertimeForm / DynamicCustomForm  (Edit  ×7)      │
│  GeneralReadOnly / .../ DynamicCustomReadOnly         (Read  ×7)      │
│         │                                                             │
│         │ <DrafterInfoHeader mode={...} {...} />   ← Phase 34 신규    │
│         ▼                                                             │
│  ┌─────────────────────────────────────────────────────────┐         │
│  │ DrafterInfoHeader (4-column grid)                       │         │
│  │  · DRAFT      → live drafter from response              │         │
│  │  · SUBMITTED  → parsed formData.drafterSnapshot         │         │
│  │  · LEGACY     → live drafter + "(현재 정보)" 배지       │         │
│  └─────────────────────────────────────────────────────────┘         │
└──────────────────────────────────────────────────────────────────────┘
                                    ▲
                                    │ HTTP /api/v1/documents/{id}/submit
                                    │ (DocumentDetailResponse — flat fields)
                                    │
┌──────────────────────────────────────────────────────────────────────┐
│ BACKEND (Spring Boot 3.5)                                             │
│                                                                       │
│  DocumentController.submitDocument                                    │
│         │                                                             │
│         ▼                                                             │
│  DocumentService.submitDocument  (@Transactional)                     │
│    ├─ loadAndVerifyOwnerDraft (drafter LAZY ManyToOne)                │
│    ├─ validate title / approval lines / form                          │
│    ├─ generateDocNumber                                               │
│    ├─ document.setStatus(SUBMITTED) + setSubmittedAt(now)             │
│    │                                                                  │
│    ├─ ★ Phase 34 신규 블록:                                          │
│    │     content = documentContentRepository.findByDocumentId(...)    │
│    │     Map<String,Object> body = parseFormData(content.formData)    │
│    │     body.put("drafterSnapshot", Map.of(                          │
│    │         "departmentName", drafter.getDepartment()?.getName(),    │
│    │         "positionName",   drafter.getPosition()?.getName(),      │
│    │         "drafterName",    drafter.getName(),                     │
│    │         "draftedAt",      document.getSubmittedAt().toString()))  │
│    │     content.setFormData(objectMapper.writeValueAsString(body))   │
│    │     // (save 는 dirty checking 으로 자동 OR 명시적 호출)         │
│    │                                                                  │
│    ├─ documentRepository.save(document)                               │
│    ├─ moveAttachmentsToPermanentFolder                                │
│    ├─ auditLogService.log(SUBMIT)                                     │
│    └─ eventPublisher.publishEvent(SUBMIT)                             │
│         │                                                             │
│         ▼                                                             │
│  DocumentMapper.toDetailResponse                                      │
│    → DocumentDetailResponse (flat: drafterName/departmentName/positionName) │
│                                                                       │
│  DocumentContent  ─────[document_content table]──── MariaDB           │
│    body_html  : LONGTEXT                                              │
│    form_data  : JSON  ← snapshot 박제 위치                            │
│    schema_definition_snapshot : LONGTEXT                              │
└──────────────────────────────────────────────────────────────────────┘
```

## Standard Stack

본 phase 는 신규 의존성 0건. 기존 스택 재사용만.

### Core (변경 없음)

| Library | Version | Purpose | Already used |
|---------|---------|---------|--------------|
| Spring Boot | 3.5.13 | Web/JPA/Tx | yes (build.gradle.kts L4) |
| Jackson `ObjectMapper` | (Spring auto) | JSON read/write | yes (DocumentService L60) |
| JPA / Hibernate 6 | (Spring auto) | Entity persistence | yes |
| react-i18next | 17.0.2 | i18n | yes |
| react | 18.3.1 | UI | yes |
| vitest | (devDep) | FE test | yes |
| @testing-library/react | 16.3.2 | FE component test | yes |

### Alternatives Considered (모두 거절)

| Instead of | Could Use | Why rejected |
|------------|-----------|--------------|
| 인라인 toLocaleDateString | `date-fns` (이미 deps 에 있음 — 4.1.0) | 기존 코드 6곳이 모두 인라인. 일관성 우선. util 추출은 별도 phase |
| ObjectMapper 직접 사용 | jakarta `JsonbBuilder`, Gson | 프로젝트 컨벤션 = Jackson |
| @JsonInclude(NON_NULL) | 기본 (null 직렬화) | document/* DTO 가 모두 NON_NULL 미적용 — 컨벤션 일관 |
| 신규 컬럼 (snapshot 전용) | document.drafter_snapshot LONGTEXT 등 | D-C3 명시: Flyway 무, formData JSON 키 머지로 충분 |

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| JSON 머지 | 직접 정규식 / 문자열 조작 | `objectMapper.readValue(s, Map.class)` → put → `writeValueAsString` | edge case (null, 이스케이프, UTF-8) 다수 |
| 날짜 포맷 | `${year}-${month}-${day}` 직접 조립 | `new Date(s).toLocaleDateString('ko-KR', ...)` | 기존 6곳 컨벤션, locale 처리 |
| current user 정보 | 신규 `/users/me` endpoint | 기존 `DocumentDetailResponse` 의 flat 필드 (live join 으로 이미 직렬화됨) | DOC-05 응답에 이미 포함 — 추가 endpoint 불필요 |
| 영문 i18n | en/document.json 추가 | (안 함) | CONTEXT deferred + Phase 32 컨벤션 — 한국어 only |
| 새 unit test 파일 (DocumentServiceTest) | mockito-only test | `DocumentSubmitTest` 에 케이스 추가 | 기존 17 테스트 모두 통합 — 컨벤션 |

## Common Pitfalls

### Pitfall 1: LAZY join NPE
**What goes wrong:** `drafter.getDepartment().getName()` 가 트랜잭션 밖에서 호출되면 LazyInitializationException
**Why it happens:** `User.department` 가 `FetchType.LAZY` (User.java L31)
**How to avoid:** Phase 34 의 snapshot 캡처는 `submitDocument()` 메서드 내부 — 클래스 레벨 `@Transactional` 보호
**Warning signs:** "could not initialize proxy" 에러 로그
**Mitigation already proven:** DashboardService/ApprovalService/DepartmentService 등 4 서비스가 동일 패턴으로 안정 작동 중

### Pitfall 2: DocumentContent 더티체크 누락
**What goes wrong:** `content.setFormData(...)` 후 명시적 `save()` 안 부르면 트랜잭션 끝에 DB 반영 안 될 수 있음
**Why it happens:** 동일 트랜잭션 내에서 영속 엔티티가 `setter` 호출되면 dirty checking 자동 동작 — 단 일부 JPA provider 설정에서는 명시적 save 필요
**How to avoid:** Phase 34 는 명시적으로 `documentContentRepository.save(content)` 호출 (기존 createDocument L144 / updateDocument L189 도 동일 명시 패턴)
**Warning signs:** 통합 테스트에서 단언 fail — DB 의 `form_data` 에 snapshot 미반영

### Pitfall 3: formData 가 null/empty 인 경우
**What goes wrong:** `objectMapper.readValue(null, Map.class)` 또는 `readValue("", ...)` 가 NPE / IOException
**Why it happens:** `GENERAL` 양식은 `bodyHtml` 만 사용 — `formData` 가 null 인 경우 다수 (CreateDocumentRequest L134 의 `request.formData()` 가 null 일 수 있음)
**How to avoid:** snapshot 캡처 시 `formData == null || formData.isBlank()` 면 빈 `LinkedHashMap<>` 으로 시작 → drafterSnapshot 만 포함하는 새 JSON 생성
**Warning signs:** GENERAL 양식 제출 시 NPE — `submitDraft_success` 테스트 fail

### Pitfall 4: ReadOnly props 누락
**What goes wrong:** `DynamicCustomReadOnly` 는 `formData` 만 받음 — drafter 4정보가 없어 fallback 불가
**Why it happens:** 기존 `TemplateReadOnlyProps` 시그니처 (templateRegistry.ts L30~36) 가 `{title, bodyHtml, formData, schemaSnapshot}` 만
**How to avoid:** `TemplateReadOnlyProps` 에 `drafter: { name, departmentName, positionName, submittedAt }` 옵션 props 추가 (또는 별도 `drafterSnapshot` props) — 14 통합 지점 중 ReadOnly 7개 모두 영향
**Warning signs:** `tsc --noEmit` 에러 또는 `DocumentDetailPage` 에서 props 전달 누락 시 헤더 빈 데이터

### Pitfall 5: legacy 문서의 snapshot 누락 판정
**What goes wrong:** `formData.drafterSnapshot` 이 undefined 인 SUBMITTED 문서 → 빈 헤더 또는 throw
**Why it happens:** Phase 34 이전 SUBMITTED 문서는 snapshot 없음 (D-C6: backfill 안 함)
**How to avoid:** `mode='submitted'` props 의 `snapshot` 을 nullable 로 정의 → snapshot null 이면 D-D4 fallback (drafter live + 배지)
**Warning signs:** legacy 문서 조회 시 헤더가 비어있음

### Pitfall 6: FE DocumentDetailResponse type mismatch (latent bug 발견)
**What goes wrong:** `frontend/src/features/document/types/document.ts` L22~23 가 `drafter: DrafterInfo` (nested) 로 선언했지만 backend 는 flat (`drafterName/departmentName/positionName`) 반환 → `doc.drafter.name` 은 runtime undefined access
**Why it happens:** Phase 4 작성 시점의 design 과 mapper 구현이 발산
**Evidence:** `DocumentDetailPage.tsx` L228 `{doc.drafter.name} ({doc.drafter.departmentName})` 가 production 에서 작동한다고 주장하기 어려움 (`tsc` 통과는 하지만 runtime crash)
**How to avoid:** Phase 34 가 flat 필드를 사용하므로 같은 commit 으로 type 을 flat 으로 정정 + DocumentDetailPage L228 도 정정. 단 이는 SCOPE EXPANSION — 사용자 확인 필요 (Open Question 9 참조)
**Warning signs:** Browser console 에 `Cannot read properties of undefined (reading 'name')` — 이미 발생 중일 가능성

### Pitfall 7: 14 지점 일괄 수정의 휴먼 에러
**What goes wrong:** 7 양식 × 2 모드 = 14 파일 수정에서 1~2 파일 누락
**Why it happens:** Edit 양식은 6 + dynamic 1 = 7 (CONTEXT 가 3 으로 표기), ReadOnly 도 6 + 1 = 7
**How to avoid:** PLAN 단계에서 14 파일 명시적 체크리스트 + 통합 테스트 단계에서 7 양식 × 2 모드 grep 검증
**Warning signs:** 누락된 양식의 헤더가 안 보임 — UAT D-E3 에서 발견

## Code Examples

### Example 1: 백엔드 snapshot 캡처 (DocumentService.submit 추가 코드)

```java
// L296 (document.setSubmittedAt(LocalDateTime.now())) 직후, L309 (documentRepository.save) 직전.
// content 변수는 이미 L286~287 에서 로드됨 — 재사용.

// drafter live join (LAZY 안전 — @Transactional 보호)
User drafter = document.getDrafter();
String departmentName = drafter.getDepartment() != null
        ? drafter.getDepartment().getName() : null;
String positionName = drafter.getPosition() != null
        ? drafter.getPosition().getName() : null;

// formData JSON 머지
java.util.Map<String, Object> body;
try {
    if (content.getFormData() == null || content.getFormData().isBlank()) {
        body = new java.util.LinkedHashMap<>();
    } else {
        body = objectMapper.readValue(content.getFormData(),
                new com.fasterxml.jackson.core.type.TypeReference<java.util.LinkedHashMap<String, Object>>() {});
    }
    java.util.Map<String, Object> snapshot = new java.util.LinkedHashMap<>();
    snapshot.put("departmentName", departmentName);
    snapshot.put("positionName", positionName);  // null 허용
    snapshot.put("drafterName", drafter.getName());
    snapshot.put("draftedAt", document.getSubmittedAt().toString()); // ISO LocalDateTime
    body.put("drafterSnapshot", snapshot);
    content.setFormData(objectMapper.writeValueAsString(body));
    documentContentRepository.save(content);
} catch (com.fasterxml.jackson.core.JsonProcessingException e) {
    log.warn("Failed to serialize drafterSnapshot for document {}: {}",
            document.getId(), e.getMessage());
    // CONTEXT 결정 필요: snapshot 실패 시 throw vs swallow
    // 권고: swallow + log warning (D-C5 immutable + submit 흐름 차단 회피)
}
```

### Example 2: 프론트엔드 DrafterInfoHeader props 시그니처

```typescript
// frontend/src/features/document/components/DrafterInfoHeader.tsx
import { useTranslation } from 'react-i18next';

export type DrafterSnapshot = {
  departmentName: string | null;
  positionName: string | null;
  drafterName: string;
  draftedAt: string; // ISO
};

export type DrafterLive = {
  drafterName: string;
  departmentName: string | null;
  positionName: string | null;
};

export type DrafterInfoHeaderProps =
  | { mode: 'draft'; live: DrafterLive }
  | { mode: 'submitted'; snapshot: DrafterSnapshot | null; live: DrafterLive };

export default function DrafterInfoHeader(props: DrafterInfoHeaderProps) {
  const { t } = useTranslation('document');
  // mode='draft' → live + draftedAt='—'
  // mode='submitted' & snapshot 존재 → snapshot 그대로
  // mode='submitted' & snapshot null → live + 배지
  // 4-column grid (md+) / 2x2 (sm)
  // formatDate(iso): new Date(iso).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })
  // ...UI 구현은 UI-SPEC 단계
}
```

### Example 3: 프론트엔드 통합 (Edit 양식 — GeneralForm 예)

```tsx
// GeneralForm.tsx 의 <form id="document-form" ...> 내부 첫 번째 child 로 삽입
<form id="document-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
  <DrafterInfoHeader
    mode="draft"
    live={{ drafterName, departmentName, positionName }}
  />
  {/* 기존 template label / 제목 / Tiptap / 첨부 ... */}
</form>
```
DRAFT 모드의 live 정보는 `DocumentEditorPage` 가 `existingDoc` (DocumentDetailResponse) 에서 추출해 prop drilling — 단, 신규 작성 (`existingDoc=undefined`) 시에는 어디서 오는가? **이 케이스가 D-D2 의 핵심 미해결 지점**.

신규 작성 흐름:
- `DocumentEditorPage` 의 `existingDoc` 은 `useDocumentDetail(documentId)` — `documentId=null` 일 때 query disabled → `existingDoc=undefined`
- 따라서 신규 작성 화면에서 헤더에 표시할 부서/직위 데이터의 SoT 가 **없음** (authStore 의 UserProfile 도 부서명 없음)

**Open Question 1 (아래) 의 답이 이 갭을 결정한다.**

## Runtime State Inventory

본 phase 는 rename/refactor/migration 이 아닌 신기능 phase. 단, 한 가지 확인 필요:

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | 기존 SUBMITTED `document_content.form_data` JSON 에 `drafterSnapshot` 키 없음 | None (D-C6 — backfill 안 함, fallback 으로 처리) |
| Live service config | 없음 | None |
| OS-registered state | 없음 | None |
| Secrets/env vars | 없음 | None |
| Build artifacts / installed packages | 없음 | None |

기존 SUBMITTED 문서 backfill 은 D-C6 에 의해 명시적으로 제외 — D-D4 fallback 로 처리. RESEARCH 가 추가 작업 없음을 확인.

## Common Pitfalls (보강 — 시나리오 검증)

### 시나리오 1: 새 GENERAL 문서 제출
1. user 가 `DocumentEditorPage` 에서 GENERAL 양식 작성 (formData=null)
2. 임시저장 → DRAFT 생성 (formData=null)
3. 제출 클릭 → submit() 진입
4. snapshot 캡처: `formData=null` → 빈 Map 시작 → `drafterSnapshot` 만 포함하는 JSON 생성
5. content.formData = `{"drafterSnapshot":{"departmentName":"개발1팀","positionName":"팀장","drafterName":"홍길동","draftedAt":"2026-04-29T10:30:00"}}`

### 시나리오 2: 새 EXPENSE 문서 제출 (formData 이미 있음)
1. formData = `{"items":[...],"totalAmount":15000}`
2. snapshot 캡처: 기존 키 보존 + `drafterSnapshot` 머지
3. content.formData = `{"items":[...],"totalAmount":15000,"drafterSnapshot":{...}}`
4. **검증:** 기존 EXPENSE ReadOnly 가 `JSON.parse(formData).items` 로 접근 — `drafterSnapshot` 키 추가는 무영향

### 시나리오 3: legacy SUBMITTED (snapshot 없음) 조회
1. DocumentDetailPage → existingDoc 받음
2. snapshot = `JSON.parse(formData)?.drafterSnapshot` → undefined
3. DrafterInfoHeader: `mode='submitted'` + `snapshot=null` → live (drafter*) + 배지 fallback

## Files to Modify

### 백엔드 (정확한 라인 추정)

| File | Lines | Change |
|------|-------|--------|
| `backend/src/main/java/com/micesign/service/DocumentService.java` | L296 직후 ~ L309 직전, ~25줄 추가 | snapshot 캡처 블록 (Example 1) |
| `backend/src/test/java/com/micesign/document/DocumentSubmitTest.java` | ~80줄 추가 (테스트 메서드 2개) | `submitDraft_capturesDrafterSnapshot` (positionId 보유), `submitDraft_capturesDrafterSnapshot_nullPosition` |

### 프론트엔드 — 신규 파일

| File | Lines | Change |
|------|-------|--------|
| `frontend/src/features/document/components/DrafterInfoHeader.tsx` | ~80~120줄 | 신규 컴포넌트 |
| `frontend/src/features/document/components/__tests__/DrafterInfoHeader.test.tsx` | ~80줄 | 신규 컴포넌트 테스트 (3 케이스) |

### 프론트엔드 — Edit 양식 통합 (7개)

| File | Lines | Change |
|------|-------|--------|
| `frontend/src/features/document/components/templates/GeneralForm.tsx` | L50 직후, ~3줄 | `<DrafterInfoHeader />` 삽입 |
| `frontend/src/features/document/components/templates/ExpenseForm.tsx` | (동등 위치) | 동일 |
| `frontend/src/features/document/components/templates/LeaveForm.tsx` | 동등 | 동일 |
| `frontend/src/features/document/components/templates/PurchaseForm.tsx` | 동등 | 동일 |
| `frontend/src/features/document/components/templates/BusinessTripForm.tsx` | 동등 | 동일 |
| `frontend/src/features/document/components/templates/OvertimeForm.tsx` | 동등 | 동일 |
| `frontend/src/features/document/components/dynamic/DynamicCustomForm.tsx` | L208 (`<form ...>` 직후), ~3줄 | 동일 |

### 프론트엔드 — ReadOnly 양식 통합 (7개)

| File | Lines | Change |
|------|-------|--------|
| `frontend/src/features/document/components/templates/GeneralReadOnly.tsx` | 본문 최상단, ~3줄 | `<DrafterInfoHeader />` 삽입 + props 전달 |
| `frontend/src/features/document/components/templates/ExpenseReadOnly.tsx` | 동등 | 동일 |
| `frontend/src/features/document/components/templates/LeaveReadOnly.tsx` | 동등 | 동일 |
| `frontend/src/features/document/components/templates/PurchaseReadOnly.tsx` | 동등 | 동일 |
| `frontend/src/features/document/components/templates/BusinessTripReadOnly.tsx` | 동등 | 동일 |
| `frontend/src/features/document/components/templates/OvertimeReadOnly.tsx` | 동등 | 동일 |
| `frontend/src/features/document/components/dynamic/DynamicCustomReadOnly.tsx` | 본문 최상단 | 동일 |

### 프론트엔드 — 인프라 수정

| File | Lines | Change |
|------|-------|--------|
| `frontend/src/features/document/components/templates/templateRegistry.ts` | L17~36 | `TemplateEditProps` / `TemplateReadOnlyProps` 에 drafter live + snapshot 전달 props 추가 |
| `frontend/src/features/document/types/document.ts` | L22~23 (DocumentDetailResponse) | `drafter: DrafterInfo` 제거 + flat `drafterName/departmentName/positionName` 추가 (Pitfall 6 — SCOPE EXPANSION 권고) |
| `frontend/src/features/document/pages/DocumentEditorPage.tsx` | L315~330 | EditComponent 에 drafter live props 전달 |
| `frontend/src/features/document/pages/DocumentDetailPage.tsx` | L228 + L250~256 | (1) `doc.drafter.name` → `doc.drafterName` (Pitfall 6 fix), (2) ReadOnlyComponent 에 drafter live + snapshot props 전달 |
| `frontend/public/locales/ko/document.json` | 추가 ~7줄 | `drafterInfo.*` 6 키 |

### 변경 안 함 (명시)

- `frontend/public/locales/en/document.json` — 한국어 only (CONTEXT deferred + Phase 32 컨벤션)
- Flyway migration — 없음 (D-C3)
- `Document` / `DocumentContent` / `User` / `Department` / `Position` 엔티티 — 컬럼 변경 없음
- `DocumentMapper` / `DocumentDetailResponse` / `DocumentResponse` 백엔드 DTO — 변경 없음 (snapshot 은 `formData` JSON 내부에 들어감)
- 결재선 / 첨부 / 알림 / audit 로직 — 무영향
- Phase 32 의 양식 빌더 인프라 — 무영향

**총 영향 파일 수:** 백엔드 2 + 프론트엔드 18 = **20 파일** (+ locale 1)

## Open Questions Resolved

리서치가 답한 것 (CONTEXT.md Discretion / focused_lookups 8건):

1. **DocumentResponse / DocumentDetailResponse JSON 직렬화 구조**
   - **답:** 두 record 모두 `drafterName, departmentName, positionName` (flat) 직접 필드로 직렬화. `DocumentMapper` (L21~24, L33~36) 가 `document.getDrafter().getDepartment().getName()` 을 null-safe 로 추출. **D-D4 fallback 에서 frontend 가 별도 API 호출 없이 표시 가능** ✓
   - 단, FE `DocumentDetailResponse` 타입은 nested `drafter: DrafterInfo` 로 잘못 선언 — Pitfall 6 참조

2. **document_content.body JSON 직렬화 패턴**
   - **답:** `body` 라는 컬럼은 없음. 실제 컬럼은 `body_html (LONGTEXT)` 와 `form_data (JSON, String 으로 매핑)`. snapshot 의 박제 위치는 **`form_data`** (변경: CONTEXT.md 의 "body" 표기를 RESEARCH 가 정정).
   - 직렬화 패턴: 클라이언트가 `JSON.stringify(...)` 로 String 화 → backend 가 controller→service 로 String 그대로 패스스루 → DB JSON 컬럼에 저장. backend 는 keys 를 들여다 보지 않음 — Phase 34 가 처음으로 키 머지 책임을 가짐.
   - ObjectMapper: `DocumentService.objectMapper` (L60) 재사용.

3. **Jackson `JsonInclude` 컨벤션**
   - **답:** 일관 컨벤션 X. `dto/template/*` 3개 record 가 `@JsonInclude(NON_NULL)`, `dto/document/*` records 는 미적용 (default = include null). snapshot JSON 은 ObjectMapper 직접 직렬화 — default 동작 (null 명시). **D-C4 권고: positionName null 시 `null` 명시 (key omit X)** — document/* 컨벤션 일치.

4. **기존 날짜 포맷 유틸 위치**
   - **답:** **중앙 유틸 X.** 6곳에서 `new Date(s).toLocaleDateString('ko-KR', ...)` 인라인 패턴 반복 (Pattern 6 참조). Phase 34 도 동일 인라인 패턴 사용. 향후 util 추출은 별도 phase.

5. **i18n key 컨벤션**
   - **답:** namespace = **`'document'`** (singular). 파일 = `frontend/public/locales/ko/document.json`. 키 권고 = `drafterInfo.{departmentLabel,positionLabel,drafterLabel,draftedAtLabel,draftedAtPlaceholder,currentInfoBadge}`. `documents.json` 파일은 존재하지 않음.

6. **DocumentService 단위 테스트 기존 패턴**
   - **답:** 순수 unit test (Mockito) 패턴은 backend `document/` 패키지에 사실상 없음. 17개 테스트 모두 `@SpringBootTest + MockMvc + JdbcTemplate cleanup + H2 (@ActiveProfiles("test"))`. **DocumentSubmitTest.java 에 통합 테스트 메서드 2개 추가** 권고 (CONTEXT 의 "DocumentServiceTest" 라는 파일명은 실재 X — DocumentSubmitTest 가 정확).

7. **DRAFT 모드 current user 정보 source**
   - **답:** **authStore 단독 불가.** `UserProfile` 은 `id, name, email, role, departmentId, mustChangePassword` 만 보유 — `departmentName`/`positionName` 없음. 해법 옵션:
     - **권고:** 신규 작성/저장된 DRAFT 모두 backend `DocumentDetailResponse` 의 flat 필드 사용 (live join 으로 직렬화됨). 단 신규 작성 시 documentId=null → `useDocumentDetail` disabled → existingDoc=undefined. 이 갭이 Open Question 1 (아래).
   - 이슈는 미해결 — discuss/plan 단계 결정 필요.

8. **Validation Architecture 섹션** — Nyquist enabled (config.json `nyquist_validation: true`) ✓ — 아래 Validation Architecture 섹션 포함.

## Open Questions

### Q1: 신규 작성 화면 (documentId=null) 의 DRAFT 헤더 데이터 SoT (HIGH PRIORITY)

**상황:**
- `DocumentEditorPage` 의 `existingDoc` 은 `useDocumentDetail(null)` → undefined.
- authStore 의 `UserProfile` 에 `departmentName`/`positionName` 없음.
- 따라서 신규 작성 시 헤더의 부서/직위 데이터 source 가 없음.

**옵션:**
- **A.** authStore 의 `UserProfile` 에 `departmentName, positionName` 추가 — backend `LoginResponse.user` 와 `RefreshResponse.user` 에 두 필드 추가, FE `UserProfile` 인터페이스 확장. 변경 파일: AuthService.java, UserProfile.ts. (~4 파일, 안정적)
- **B.** 신규 작성 화면 진입 시 `/api/v1/users/{currentId}` 로 query — endpoint 신설 또는 기존 `UserListResponse` 재사용. (~3 파일, 추가 endpoint)
- **C.** 임시저장 후 (savedDocId 가 생긴 시점부터) 만 헤더 표시. 신규 작성 시점에는 헤더 hidden 또는 placeholder. (UX 변경 — D-B1 always-on 와 충돌)
- **D.** 첫 임시저장 시 useCreateDocument 의 응답으로 받은 DocumentDetailResponse 의 flat 필드 사용. 신규 작성 즉시 (savedDocId=null) 단계에서는 placeholder.

**RESEARCH 권고:** **옵션 A** — `UserProfile` 확장이 가장 깨끗. login/refresh 응답에 두 필드만 추가, breaking change 없음. 단 사용자 결정 필요.

### Q2: 백엔드 snapshot 캡처 실패 시 동작

**상황:** `objectMapper.writeValueAsString()` 또는 `readValue` 가 throw 하면?
- **A.** Submit 트랜잭션 전체 롤백 — RuntimeException re-throw
- **B.** Snapshot 만 누락 + WARN 로그 — submit 정상 진행 (legacy fallback 으로 표시)

**RESEARCH 권고:** **옵션 B** — D-C5 (immutable, 향후 갱신 안 함) 의도와 정합. submit 흐름 차단보다는 부수적 정보 누락이 안전.

### Q3: SCOPE EXPANSION — DocumentDetailResponse type fix (Pitfall 6)

**상황:** FE `DocumentDetailResponse.drafter: DrafterInfo` (nested) ↔ backend flat 필드 mismatch 가 Phase 34 의 fallback 경로에 직접 영향.

**옵션:**
- **A.** Phase 34 가 같은 commit 으로 정정 (FE type → flat, DocumentDetailPage L228 정정)
- **B.** Phase 34 는 새 컴포넌트가 자체적으로 backend 의 raw flat 필드 (any-cast) 접근 — type 정정은 별도 phase

**RESEARCH 권고:** **옵션 A** — latent bug 가 이미 production 에 있고 Phase 34 가 동일 데이터를 재사용하므로 함께 정정이 자연스럽다. 단 사용자 결정 필요.

## Environment Availability

본 phase 는 외부 도구/서비스/CLI 의존성 추가 없음. 기존 빌드 도구 (Gradle/npm) 와 기존 테스트 인프라 (JUnit 5 + MockMvc + H2 / vitest + jsdom) 만 사용. SKIPPED 가 아닌, "no new external dependencies — uses existing project toolchain only".

## Validation Architecture

(`workflow.nyquist_validation: true` — 본 섹션 필수)

### Test Framework

| Property | Backend | Frontend |
|----------|---------|----------|
| Framework | JUnit 5 (`spring-boot-starter-test`) + MockMvc | vitest 3.x + @testing-library/react |
| Config file | `backend/build.gradle.kts` (auto via Spring Boot) | `frontend/vitest.config.ts` |
| Quick run | `./gradlew test --tests com.micesign.document.DocumentSubmitTest` | `cd frontend && npm test -- DrafterInfoHeader` |
| Full suite | `./gradlew test` | `cd frontend && npm test` |
| Compile gate | (gradle build 일부) | `cd frontend && npx tsc --noEmit && npm run build` |

### Phase Requirements → Test Map

본 phase 는 phase-local 만 — 정식 REQ-ID 없음. 대신 Decision IDs 로 매핑:

| Decision ID | Behavior | Test Type | Automated Command | File Exists? |
|-------------|----------|-----------|-------------------|-------------|
| D-A3 / D-A4 / D-C2 | submit 시점에 drafter snapshot 4 필드를 form_data 에 박제 | integration (BE) | `./gradlew test --tests *.DocumentSubmitTest.submitDraft_capturesDrafterSnapshot` | ❌ Wave 0 |
| D-C4 | positionId null 시 `positionName: null` 명시 (key omit X) | integration (BE) | `./gradlew test --tests *.DocumentSubmitTest.submitDraft_capturesDrafterSnapshot_nullPosition` | ❌ Wave 0 |
| D-C5 | snapshot 박제 후 status 갱신/회수에서 변경 안 됨 | integration (BE) | `./gradlew test --tests *.DocumentSubmitTest.snapshotImmutableAfterStatusChange` (선택) | ❌ Wave 0 (선택) |
| D-D2 | DRAFT 모드 — 기안일 = "—" placeholder, 부서/직위/이름 = live | unit (FE component) | `npm test -- DrafterInfoHeader.test.tsx -t "draft mode"` | ❌ Wave 0 |
| D-D3 | SUBMITTED 모드 + snapshot 존재 — 4 필드 그대로 | unit (FE component) | `npm test -- DrafterInfoHeader.test.tsx -t "submitted mode with snapshot"` | ❌ Wave 0 |
| D-D4 | legacy fallback — live + 배지 | unit (FE component) | `npm test -- DrafterInfoHeader.test.tsx -t "legacy fallback"` | ❌ Wave 0 |
| D-D5 | 4-column grid (md+) / 2x2 (sm) | UAT (manual) | (수동) | n/a |
| D-D6 | 14 통합 지점 모두 헤더 표시 | UAT (manual) — 7 양식 × 2 모드 | (수동) | n/a |
| D-E4 | 기존 양식 회귀 무영향 | regression (FE) | `cd frontend && npx tsc --noEmit && npm run build` | ✅ |

### Sampling Rate

- **Per task commit:** 해당 task 가 건드린 영역에 따라 — BE task: `./gradlew test --tests com.micesign.document.*`; FE task: `npm test -- <changed-file-pattern>`
- **Per wave merge:** `./gradlew test` (BE 전체) + `cd frontend && npm test && npx tsc --noEmit && npm run build` (FE 전체)
- **Phase gate:** 두 풀 스위트 green + 14 지점 UAT (D-D6) sign-off + Q1/Q2/Q3 사용자 결정 추적 가능

### Wave 0 Gaps

- [ ] `backend/src/test/java/com/micesign/document/DocumentSubmitTest.java` — 신규 메서드 2개 추가 (snapshot capture 케이스). **새 파일 X** — 기존 파일 확장.
- [ ] `frontend/src/features/document/components/__tests__/DrafterInfoHeader.test.tsx` — 신규 파일 (3 케이스).
- [ ] (선택) Snapshot immutability 통합 테스트 — D-C5 검증용. 권고 yes (low cost, high signal). 결정은 PLAN 단계.

기존 인프라 추가 설치 0건 (vitest, JUnit, MockMvc, H2 모두 보유).

## Security Domain

본 phase 는 신규 인증/세션/접근제어 책임 추가 없음. 기존 보안 분석:

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no (기존 JWT 흐름 무수정) | n/a |
| V3 Session Management | no | n/a |
| V4 Access Control | **partial** — snapshot 박제 시 drafter 의 부서/직위 정보가 응답 본문에 노출되지만 기존 `DocumentDetailResponse.departmentName/positionName` 도 이미 동일 정보 노출 → 신규 노출 0건. 접근 권한은 `DocumentService.getDocument` 의 4중 체크 (drafter / 결재참여자 / 같은부서 ADMIN / SUPER_ADMIN) 그대로 작동 | 기존 `getDocument` 권한체크 |
| V5 Input Validation | yes | snapshot 데이터는 backend 가 ObjectMapper 로 String→JSON 직렬화 — 사용자 입력이 아닌 DB 조회 결과. injection risk 없음. 단 `formData` raw String 머지 시 ObjectMapper 의 `readValue` 가 malformed JSON 거부 — 기존 createDocument 의 controller-side validation 통과를 전제 |
| V6 Cryptography | no | n/a |

### Known Threat Patterns for {stack}

| Pattern | STRIDE | Mitigation |
|---------|--------|-----------|
| 부서/직위 정보 부적절 노출 | Information Disclosure | 권한체크가 mapper 보다 상위 (`getDocument` L213~223) 에서 차단 — Phase 34 무영향 |
| JSON injection (formData merge) | Tampering | ObjectMapper readValue 가 malformed JSON throw — 기존 컨트롤러 validation 후 통과한 데이터만 머지. snapshot 자체는 backend 가 만들어 넣음 — 외부 입력 미혼합 |
| 트랜잭션 race (concurrent submit) | Tampering | `loadAndVerifyOwnerDraft` 가 status=DRAFT 검증 + 동일 트랜잭션 내 status=SUBMITTED 전환 → 중복 호출 시 두 번째는 `DOC_NOT_DRAFT` 에러. 기존 mechanism, Phase 34 무영향 |

## Pitfalls / Anti-patterns

### Anti-pattern 1: snapshot 을 entity/DTO 의 별도 컬럼으로 만들기
**왜 안 됨:** D-C3 명시 (Flyway 무 + `document` 테이블 컬럼 변경 없음). formData JSON 머지가 정답.

### Anti-pattern 2: snapshot 직렬화를 DocumentMapper 의 매핑 expression 으로 옮기기
**왜 안 됨:** snapshot 박제는 **submit 시점 1회만** 일어나는 mutation 이지, 응답 매핑마다 일어나는 read 가 아님. mapper 위치는 잘못된 책임 분배.

### Anti-pattern 3: useDocumentDetail 의 result 가 도착하기 전에 Default 값으로 헤더 렌더
**왜 안 됨:** 깜빡임/플리커. EditComponent / ReadOnlyComponent 자체가 existingDoc 도착 후에만 마운트되는 기존 패턴 (DocumentEditorPage L315~330, DocumentDetailPage L250~256) 그대로 따라가면 자연스럽게 OK.

### Anti-pattern 4: i18n 의 영문 키를 placeholder 로 추가
**왜 안 됨:** Phase 32 컨벤션 (한국어 only) — STATE.md `[Phase 32-04 ... en/admin.json 무수정]`. 빈 영문 키는 fallbackLng=ko 동작과 충돌.

### Anti-pattern 5: ReadOnly 양식의 props 시그니처를 6개 파일에서 각자 다르게 변경
**왜 안 됨:** `TemplateReadOnlyProps` 가 `templateRegistry.ts` 의 단일 SoT (L30~36). 7 ReadOnly 컴포넌트는 모두 이 타입을 import — 하나만 수정하고 7곳에서 동일 props 받음. 분기 X.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `frontend/src/features/document/types/document.ts` 의 `DocumentDetailResponse.drafter: DrafterInfo` (nested) 는 latent bug — production 에서 `doc.drafter.name` 이 runtime undefined 접근. Phase 34 가 같은 commit 으로 정정해야 함 (Open Question 3) | Pitfall 6 | 사용자가 "이미 다른 phase 에서 정정 예정" 또는 "이 phase scope 외" 로 결정 시 — 본 phase 는 type 정정 없이 컴포넌트 내부에서 backend raw response 를 any-cast 로 받아야 함 (덜 깨끗하지만 가능) |
| A2 | `UserProfile` 확장 (옵션 A in Open Question 1) 이 가장 깔끔한 해법 | Open Question 1 / Pattern 4 | 옵션 B (신규 endpoint) 채택 시 — controller / service / DTO 신설 작업 +3~4 파일 추가. 옵션 D 채택 시 — 임시저장 전 헤더 placeholder 정책 결정 |
| A3 | snapshot 직렬화 실패 시 swallow + WARN (옵션 B in Open Question 2) 가 D-C5 의도에 더 정합 | Open Question 2 / Code Example 1 | re-throw 채택 시 — submit 흐름이 ObjectMapper 예외에 의존, 운영 안정성 저하 |
| A4 | `documentContentRepository.save(content)` 명시 호출이 dirty checking 의존보다 안전 | Pattern 1 / Pitfall 2 | dirty checking 만 의존 시 — 일부 JPA 설정 / cascade 패턴에서 미반영 가능. 명시적 save 가 무비용 안전 |
| A5 | `DocumentSubmitTest.java` 에 케이스 추가가 신규 `DocumentServiceTest.java` 신설보다 컨벤션에 부합 | Pattern 7 / Open Questions Q6 | 사용자가 unit test 신설을 선호 시 — Mockito 기반 새 파일 작성 (테스트 픽스처 재구성 작업 ~30분) |

**위 5건 전부 Open Question 형태로 PLAN/discuss-phase 에 인계** — 각 결정이 plan task 의 scope 와 commit 경계를 바꾸므로 lock 권고.

## Sources

### Primary (HIGH confidence)

- `backend/src/main/java/com/micesign/service/DocumentService.java` (L56, L60, L264~338, L575~595) — submit 흐름 / ObjectMapper / `@Transactional` 클래스 적용 / buildDetailResponse
- `backend/src/main/java/com/micesign/domain/DocumentContent.java` (L18~28) — `body_html` LONGTEXT, `form_data` JSON, `schema_*` 컬럼
- `backend/src/main/java/com/micesign/domain/Document.java` (L27~29, L38~39) — drafter ManyToOne LAZY, submittedAt
- `backend/src/main/java/com/micesign/domain/User.java` (L31~40) — department/position FetchType.LAZY + position nullable
- `backend/src/main/java/com/micesign/dto/document/DocumentDetailResponse.java` (L6~28) — flat record (drafterName, departmentName, positionName, formData)
- `backend/src/main/java/com/micesign/mapper/DocumentMapper.java` (L19~50) — null-safe drafter join 매핑 + flat 직렬화
- `backend/src/test/java/com/micesign/document/DocumentSubmitTest.java` (전체 323줄) — 통합 테스트 컨벤션
- `backend/build.gradle.kts` (L1~80) — 스택 + 의존성 검증
- `frontend/src/features/document/components/templates/templateRegistry.ts` (전체 120줄) — 6 built-in + dynamic, TemplateEditProps/TemplateReadOnlyProps SoT
- `frontend/src/features/document/components/templates/GeneralForm.tsx` (전체 102줄) — Edit 양식 anatomy
- `frontend/src/features/document/components/dynamic/DynamicCustomForm.tsx` (전체 261줄) — dynamic Edit
- `frontend/src/features/document/components/dynamic/DynamicCustomReadOnly.tsx` (L1~50) — dynamic ReadOnly props
- `frontend/src/features/document/types/document.ts` (전체 181줄) — DocumentDetailResponse.drafter mismatch 발견 위치
- `frontend/src/stores/authStore.ts` (전체 25줄) — UserProfile 한정 (departmentId only)
- `frontend/src/types/auth.ts` (전체) — UserProfile/LoginResponse 시그니처
- `frontend/src/features/document/pages/DocumentEditorPage.tsx` (L1~100, L280~370) — 통합 지점 흐름
- `frontend/src/features/document/pages/DocumentDetailPage.tsx` (L200~280) — `doc.drafter.name` 호출 latent bug
- `frontend/src/features/document/api/documentApi.ts` (전체 51줄) — adapter 없음 확인
- `frontend/public/locales/ko/document.json` — i18n SoT 확인
- `frontend/src/i18n/config.ts` — namespace 등록
- `frontend/vitest.config.ts` — FE test infra
- `frontend/package.json` (L1~50) — vitest / @testing-library / date-fns / react-i18next 보유 확인
- `.planning/config.json` — `nyquist_validation: true`, `commit_docs: true`
- `.planning/phases/34-drafter-info-header/34-CONTEXT.md` (전체) — 결정 SoT
- `.planning/REQUIREMENTS.md` — REQ-ID 미부여 정책 확인
- `.planning/STATE.md` (Phase 32-04, Phase 34 인서트 참조) — 한국어 only / 컨벤션

### Secondary (MEDIUM confidence)

- `backend/src/main/java/com/micesign/service/DashboardService.java` (L121~122) — drafter null-safe join 동일 패턴
- `backend/src/main/java/com/micesign/service/ApprovalService.java` (L184~185) — 동일 패턴
- `frontend/src/features/document/components/DocumentListTable.tsx` (L17~18), `DashboardPage` 등 — toLocaleDateString 인라인 사용 패턴 6곳
- `frontend/src/features/document/components/__tests__/DrafterCombo.test.tsx` (L1~60) — FE 컴포넌트 테스트 컨벤션 reference

### Tertiary (LOW confidence — none)

본 RESEARCH 의 모든 claim 은 코드 grep / 직접 read 로 검증됨. 외부 라이브러리 문서 의존 0건.

## Project Constraints (from CLAUDE.md)

| Constraint | Phase 34 적용 |
|------------|--------------|
| Java 17 + Spring Boot 3.x | yes (3.5.13 — build.gradle.kts) |
| utf8mb4 charset | snapshot JSON 한글 (`"개발1팀"`) 보관 — 기존 `form_data` 컬럼이 utf8mb4 |
| 한국어 documentation/UI | i18n 한국어 only (en 미수정) |
| GSD workflow | 본 RESEARCH 가 GSD `/gsd-research-phase` 산출물 |
| Hardcoded React components per template | 본 phase 가 동일 패턴 — 14 파일 단순 삽입 |
| 제출 시점 immutability (SUBMITTED → 본문/첨부/결재선 잠김) | snapshot 도 immutable — D-C5 정합 |
| 문서 상태 흐름 DRAFT → SUBMITTED → ... | snapshot 캡처는 DRAFT→SUBMITTED 전환에 결합 |
| Document numbering: at submission | snapshot 도 동일 시점 — `submittedAt` = `draftedAt` |

CLAUDE.md 의 직접 충돌 / forbidden pattern / 추가 의존성 제약 없음.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — 신규 의존성 0, 기존 build.gradle.kts/package.json 확인
- Architecture: HIGH — submit 흐름 라인까지 직접 read, 14 통합 지점 grep 으로 확정
- Pitfalls: HIGH — 6/7 항목이 코드 read 로 검증 (LAZY join 패턴 4곳, formData null pattern 등)
- Open Questions: MEDIUM — 3 Open Question 의 옵션은 명확하나, 각각 사용자 결정 필요 (특히 Q1, Q3 는 plan scope 에 영향)
- Side-effect fix (Pitfall 6): MEDIUM — 명백한 type/runtime mismatch 이지만 production 영향도가 RESEARCH 단계에서 100% 검증 불가 (browser console 확인 필요)

**Research date:** 2026-04-29
**Valid until:** 2026-05-29 (30일 — 코드/스택 변경 없는 안정 상태)

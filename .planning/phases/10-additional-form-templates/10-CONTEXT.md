# Phase 10: Additional Form Templates - Context

**Gathered:** 2026-04-03
**Status:** Ready for planning

<domain>
## Phase Boundary

Users can draft documents using three new form templates: purchase request (구매요청서), business trip report (출장보고서), and overtime request (연장근무신청서). Each template follows the existing hardcoded React component pattern (EditForm + ReadOnly) registered in `TEMPLATE_REGISTRY`. Backend validation is refactored from switch/case to Strategy pattern to cleanly support 6+ template types.

</domain>

<decisions>
## Implementation Decisions

### 구매요청서 (Purchase Request — PURCHASE)
- **D-01:** 품목 테이블은 지출결의서보다 **확장 구조** — 품목명/수량/단가/금액 + **규격/사양** 컬럼 추가
- **D-02:** 추가 필드: 납품업체명(text), 희망 납품일(date picker), 결제조건/결제방법(select), 구매 사유/용도(textarea)
- **D-03:** 합계 자동계산은 지출결의서와 동일한 패턴 (기존 `formatCurrency` 유틸 재사용)
- **D-04:** form_data JSON 구조: `{supplier, deliveryDate, paymentMethod, purchaseReason, items: [{name, spec, quantity, unitPrice, amount}], totalAmount}`

### 출장보고서 (Business Trip Report — BUSINESS_TRIP)
- **D-05:** **날짜별 일정 테이블** — 행 추가/삭제 가능한 테이블 (날짜/장소/일정내용 컬럼)
- **D-06:** **경비 내역 테이블 포함** — 교통비/숙박비/식비/기타 항목별 금액 + 합계. 지출결의서 테이블 패턴 재사용
- **D-07:** 출장 목적 및 결과는 **Plain textarea** (Rich Text 아님)
- **D-08:** 추가 필드: 출장지(text), 출장 기간(시작일~종료일 date range picker)
- **D-09:** form_data JSON 구조: `{destination, startDate, endDate, purpose, result, itinerary: [{date, location, description}], expenses: [{category, description, amount}], totalExpense}`

### 연장근무신청서 (Overtime Request — OVERTIME)
- **D-10:** 관리자 선택은 **결재선으로 대체** — 양식 내 별도 관리자 선택 필드 없음. 기존 결재선 UI로 직속상관 지정
- **D-11:** 근무시간은 **시작시간/종료시간 입력** → 연장근무 시간 자동계산
- **D-12:** **단일 날짜만 지원** — 여러 날 연장근무는 별도 문서로 작성
- **D-13:** 추가 필드: 연장근무 날짜(date), 시작시간(time), 종료시간(time), 계산된 시간(auto), 사유(textarea)
- **D-14:** form_data JSON 구조: `{workDate, startTime, endTime, hours, reason}`

### 백엔드 Validator 리팩토링
- **D-15:** `DocumentFormValidator`의 switch/case를 **Strategy 패턴**으로 전환
- **D-16:** `FormValidationStrategy` 인터페이스 + 템플릿별 구현체 (GeneralFormValidator, ExpenseFormValidator, LeaveFormValidator, PurchaseFormValidator, BusinessTripFormValidator, OvertimeFormValidator)
- **D-17:** 새 양식 추가 시 Strategy 구현체만 추가하면 됨 (OCP 준수)

### DB & 시드 데이터
- **D-18:** Flyway 마이그레이션으로 `approval_template` 테이블에 3개 신규 템플릿 시드 추가 (PURCHASE/PUR, BUSINESS_TRIP/BTR, OVERTIME/OVT)

### Claude's Discretion
- 각 양식의 세부 UI 레이아웃 및 spacing
- Zod 스키마 세부 유효성 검사 규칙 (필수/선택, 최대길이 등)
- 시간 입력 컴포넌트 구현 방식 (native time input vs custom)
- 경비 카테고리 목록 (교통비/숙박비/식비/기타 외 추가 여부)
- 테이블 공통 컴포넌트 추출 여부 (ExpenseForm과 공유할 부분)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Product Requirements
- `docs/PRD_MiceSign_v2.0.md` — 전체 PRD, 양식 레지스트리 구조 (5.1~5.2절), 문서 채번 규칙 (5.3절)
- `docs/PRD_MiceSign_v2.0.md` §5.4 — MVP 양식 필드 정의 (기존 3종 참고)

### Requirements
- `.planning/REQUIREMENTS.md` — TPL-04 (구매요청서), TPL-05 (출장보고서), TPL-06 (연장근무신청서) 요구사항

### Phase 4 Context (기존 템플릿 구현 패턴)
- `.planning/phases/04-document-core-templates/04-CONTEXT.md` — 기존 3종 양식 구현 결정사항 (Rich Text, 테이블 패턴, JSON 스키마, 유효성 검사 등)

### Existing Template Code (패턴 참고)
- `frontend/src/features/document/components/templates/templateRegistry.ts` — TemplateEntry 인터페이스, TEMPLATE_REGISTRY 구조
- `frontend/src/features/document/components/templates/ExpenseForm.tsx` — 인라인 편집 테이블 + 자동합계 패턴 (구매요청서/출장보고서 참고)
- `frontend/src/features/document/components/templates/LeaveForm.tsx` — 날짜/시간 입력 패턴 (연장근무 참고)
- `frontend/src/features/document/validations/expenseSchema.ts` — Zod 유효성 검사 스키마 패턴
- `backend/src/main/java/com/micesign/service/DocumentFormValidator.java` — 현재 switch/case 구조 (리팩토링 대상)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `TEMPLATE_REGISTRY` (templateRegistry.ts): TemplateEntry 인터페이스로 editComponent + readOnlyComponent + label/description/icon 등록 — 동일 패턴으로 3개 추가
- `ExpenseForm.tsx`: useFieldArray + 인라인 편집 테이블 + formatCurrency + auto-sum — 구매요청서/출장보고서 경비 테이블에 직접 재사용 가능
- `LeaveForm.tsx`: date picker + time input + 자동계산 패턴 — 연장근무신청서에 참고
- `formatCurrency` / `parseNumericInput` (currency.ts): 통화 포맷 유틸리티 — 모든 금액 필드에 재사용
- `FileAttachmentArea` 컴포넌트: 첨부파일 영역 — 구매요청서/출장보고서에 재사용
- `expenseSchema.ts` / `leaveSchema.ts`: Zod 스키마 패턴 — 신규 양식 스키마 작성 시 참고
- MapStruct mappers: DTO 변환 패턴 — 백엔드 신규 validator 매핑에 참고

### Established Patterns
- Feature-based folder: `features/document/components/templates/` 하위에 양식 컴포넌트 배치
- React Hook Form + Zod + zodResolver 조합으로 프론트엔드 유효성 검사
- `document_content.form_data`에 JSON 문자열로 양식 데이터 저장
- 백엔드 `DocumentFormValidator`에서 template_code별 JSON 구조 검증
- i18n: `public/locales/{lang}/document.json` 네임스페이스에 양식 관련 번역 키
- ReadOnly 컴포넌트: 각 양식별 별도 ReadOnly 컴포넌트 (GeneralReadOnly, ExpenseReadOnly, LeaveReadOnly)

### Integration Points
- `templateRegistry.ts`: 3개 신규 TemplateEntry 등록
- `DocumentFormValidator.java`: Strategy 패턴 리팩토링 후 6개 validator 등록
- Flyway migration: `approval_template` 테이블에 PURCHASE, BUSINESS_TRIP, OVERTIME 시드 데이터
- `document_content.form_data`: 3개 신규 JSON 스키마 저장/검증
- 문서 생성 모달: 신규 템플릿 카드 3개 추가 표시

</code_context>

<specifics>
## Specific Ideas

- 구매요청서 품목 테이블은 지출결의서보다 확장 (규격/사양 추가) — 공통 테이블 컴포넌트 추출 가능성 검토
- 출장보고서는 2개 테이블(일정 + 경비) 복합 양식 — 가장 복잡한 양식이 될 것
- 연장근무신청서는 가장 단순한 양식 — LeaveForm과 유사한 구조
- 경비 테이블 패턴(품목/금액/합계)이 3개 양식에서 반복됨 — 연구 시 공통화 가능성 확인

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 10-additional-form-templates*
*Context gathered: 2026-04-03*

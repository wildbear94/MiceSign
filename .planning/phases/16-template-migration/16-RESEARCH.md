# Phase 16: Template Migration - Research

**Researched:** 2026-04-06
**Domain:** JSON 스키마 마이그레이션, 듀얼 렌더링 전환
**Confidence:** HIGH

## Summary

Phase 16은 6개 기존 폼 템플릿을 JSON 스키마로 변환하여 동적 렌더러가 신규 문서를 처리하도록 전환하는 작업이다. 핵심 발견사항은 다음과 같다:

1. **실제 하드코딩 컴포넌트는 3개뿐이다 (GENERAL, EXPENSE, LEAVE).** PURCHASE, BUSINESS_TRIP, OVERTIME은 DB에 템플릿 레코드만 존재하고 프론트엔드 컴포넌트와 백엔드 밸리데이터가 없다. 즉, 후자 3개는 "마이그레이션"이 아니라 "새로운 스키마 생성"이다.
2. **듀얼 렌더링 인프라는 이미 작동 중이다.** `DocumentEditorPage`에서 `TEMPLATE_REGISTRY`에 없는 템플릿은 자동으로 `DynamicForm`을 사용한다. Flyway로 `schema_definition`만 채워주면 동적 렌더러가 즉시 활성화된다.
3. **두 가지 백엔드 갭이 존재한다:** (a) `DocumentContent` JPA 엔티티에 `schema_version`, `schema_definition_snapshot` 필드 매핑이 누락되어 있고, (b) `DocumentFormValidator`가 PURCHASE/BUSINESS_TRIP/OVERTIME에 대해 `TPL_UNKNOWN` 예외를 던진다.

**Primary recommendation:** Flyway 시드 마이그레이션으로 6개 스키마를 생성하고, 백엔드 갭(DocumentContent 스냅샷 매핑 + DocumentFormValidator 동적 폴백)을 채우는 것이 핵심 작업이다.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** 듀얼 렌더링 유지 -- 하드코딩 컴포넌트를 삭제하지 않고 그대로 유지. 기존 문서(schema_definition IS NULL)는 하드코딩 렌더러로, 신규 문서(schema_definition non-null)는 동적 렌더러로 표시. `DocumentEditorPage.tsx`의 기존 분기 로직(`templateEntry ? hardcoded : DynamicForm`) 유지.
- **D-02:** 기존 문서의 form_data 변환 없음 -- 기존 문서의 form_data 구조를 일절 변경하지 않음. 하드코딩 렌더러가 그대로 처리. 데이터 손실 위험 제로.
- **D-03:** Flyway 시드 마이그레이션으로 6개 템플릿의 schema_definition 생성 -- `V12__seed_legacy_template_schemas.sql` 같은 Flyway 스크립트로 각 템플릿의 schema_definition 컬럼을 UPDATE. 재현 가능하고 배포 자동화에 포함됨.
- **D-04:** 각 스키마는 하드코딩 폼의 필드 구조를 정확히 재현해야 함 -- 필드 수, 타입, 라벨, required 속성, config 옵션이 하드코딩 컴포넌트와 일치.
- **D-05:** 필드 구조 자동 테스트 + 렌더링 수동 비교 -- 각 폼의 필드 수/타입/라벨이 하드코딩과 일치하는지 자동 테스트. 실제 렌더링 결과는 수동으로 비교하여 UI 차이를 확인.

### Claude's Discretion
- 스키마 내 필드 ID 명명 규칙 (하드코딩 formData 키와 일치하지 않아도 됨 -- 신규 문서용)
- 각 Flyway 마이그레이션 파일 번호 배정
- 검증 테스트의 구체적인 assertion 패턴

### Deferred Ideas (OUT OF SCOPE)
없음 -- 논의 범위 내에서만 진행
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| MIGR-01 | JSON schema equivalents exist for all 6 hardcoded forms with matching field structure | 6개 폼의 필드 구조 분석 완료. General/Expense/Leave는 하드코딩 컴포넌트 + Zod 스키마에서 추출. Purchase/BusinessTrip/Overtime은 PRD/FSD 사양에서 추출 필요 (하드코딩 소스 없음) |
| MIGR-02 | System uses dual rendering: old documents with hardcoded, new documents with dynamic | 듀얼 렌더링 분기 로직이 DocumentEditorPage에 이미 존재. DocumentDetailPage에는 DynamicReadOnly 통합이 필요. 백엔드 schema_definition_snapshot 매핑도 필요 |
| MIGR-03 | All existing documents display correctly after migration without data modification | D-02 결정으로 데이터 변경 없음. 하드코딩 렌더러 유지로 기존 문서 영향 제로. 단, DocumentFormValidator 폴백 로직 수정 필요 |
</phase_requirements>

## Critical Codebase Findings

### 실제 하드코딩 상태 분석

| 템플릿 | DB 레코드 | 프론트 컴포넌트 | 백엔드 밸리데이터 | Registry 등록 | 실제 상태 |
|--------|----------|----------------|------------------|--------------|----------|
| GENERAL | V2 seed | GeneralForm + GeneralReadOnly | validateGeneralFormData | TEMPLATE_REGISTRY | 완전한 하드코딩 |
| EXPENSE | V2 seed | ExpenseForm + ExpenseReadOnly | validateExpenseFormData | TEMPLATE_REGISTRY | 완전한 하드코딩 |
| LEAVE | V2 seed | LeaveForm + LeaveReadOnly | validateLeaveFormData | TEMPLATE_REGISTRY | 완전한 하드코딩 |
| PURCHASE | V7 seed | **없음** | **없음 (TPL_UNKNOWN)** | **없음** | DB 레코드만 |
| BUSINESS_TRIP | V7 seed | **없음** | **없음 (TPL_UNKNOWN)** | **없음** | DB 레코드만 |
| OVERTIME | V7 seed | **없음** | **없음 (TPL_UNKNOWN)** | **없음** | DB 레코드만 |

[VERIFIED: codebase grep -- templateRegistry.ts에는 GENERAL/EXPENSE/LEAVE만 등록, PurchaseForm/BusinessTripForm/OvertimeForm 파일 미존재, DocumentFormValidator switch문에 3개만 처리]

### 백엔드 갭

1. **DocumentContent 엔티티 누락 필드:** `schema_version`과 `schema_definition_snapshot` 컬럼은 V8 마이그레이션으로 DB에 존재하나, `DocumentContent.java` JPA 엔티티에 매핑되지 않음. 동적 템플릿으로 생성된 문서의 읽기 전용 렌더링에 스냅샷이 필요함. [VERIFIED: DocumentContent.java 소스 코드]

2. **DocumentFormValidator 폴백 없음:** PURCHASE/BUSINESS_TRIP/OVERTIME 코드로 문서 생성 시 `TPL_UNKNOWN` 예외 발생. 스키마가 존재하는 템플릿은 DynamicFormValidator를 사용해야 하나, 그 클래스 자체가 존재하지 않음. [VERIFIED: DocumentFormValidator.java switch문]

3. **DocumentService 스냅샷 저장 안 함:** `createDocument`에서 `DocumentContent` 생성 시 `schema_definition_snapshot`을 설정하지 않음. 동적 템플릿 문서의 읽기 전용 렌더링이 불완전할 수 있음. [VERIFIED: DocumentService.java:49-76]

### 프론트엔드 갭

1. **DocumentDetailPage DynamicReadOnly 미통합:** 읽기 전용 뷰에서 `TEMPLATE_REGISTRY`에 없는 템플릿은 "알 수 없는 양식입니다" 텍스트만 표시. `DynamicReadOnly` 컴포넌트로의 폴백이 없음. [VERIFIED: DocumentDetailPage.tsx:108-110]

2. **DocumentDetailResponse에 schemaDefinitionSnapshot 필드 없음:** 프론트엔드 타입과 백엔드 DTO 모두 이 필드를 포함하지 않음. [VERIFIED: document.ts 타입 정의, grep 결과]

## Architecture Patterns

### 스키마 구조 패턴 (SchemaDefinition 포맷)

V11 시드 마이그레이션에서 확인된 JSON 스키마 포맷: [VERIFIED: V11__seed_dynamic_template.sql]

```json
{
  "version": 1,
  "fields": [
    {
      "id": "fieldId",
      "type": "text|textarea|number|date|select|table|staticText|hidden|section",
      "label": "필드 라벨",
      "required": true,
      "config": {
        "placeholder": "...",
        "maxLength": 100,
        "min": 0,
        "max": 999999,
        "unit": "원",
        "options": [{"value": "A", "label": "라벨", "sortOrder": 1}],
        "minRows": 1,
        "maxRows": 10,
        "columns": [{"id": "col", "type": "text", "label": "열", "required": true}]
      }
    }
  ],
  "conditionalRules": [],
  "calculationRules": []
}
```

### 듀얼 렌더링 분기 패턴 (현재)

**편집 모드 (DocumentEditorPage.tsx:115-206):**
```typescript
const templateEntry = TEMPLATE_REGISTRY[resolvedTemplateCode];
const isDynamicTemplate = !templateEntry;

// 분기:
// templateEntry 존재 → EditComponent (하드코딩)
// templateEntry 없음 → DynamicForm (동적)
```
[VERIFIED: DocumentEditorPage.tsx]

**읽기 전용 모드 (DocumentDetailPage.tsx:38-110):**
```typescript
const templateEntry = TEMPLATE_REGISTRY[doc.templateCode];
const ReadOnlyComponent = templateEntry?.readOnlyComponent;

// templateEntry 존재 → ReadOnlyComponent (하드코딩)
// templateEntry 없음 → "알 수 없는 양식입니다" (갭!)
```
[VERIFIED: DocumentDetailPage.tsx]

### 기존 문서 렌더링 핵심 인사이트

**마이그레이션 후 렌더링 경로 (D-01 결정 기반):**
- GENERAL/EXPENSE/LEAVE 기존 문서 → `TEMPLATE_REGISTRY`에 등록된 하드코딩 컴포넌트 → 변경 없음
- GENERAL/EXPENSE/LEAVE 신규 문서 → `TEMPLATE_REGISTRY` 체크 → **여전히 하드코딩으로 렌더링됨** (registry에서 삭제하지 않으므로)

**중요 설계 결정:** 신규 문서도 동적 렌더러를 사용하려면, 편집 모드에서 "스키마가 존재하면 동적 우선" 로직이 필요하다. 현재 분기 로직은 registry 등록 여부만 확인하므로, GENERAL/EXPENSE/LEAVE는 스키마가 추가되어도 여전히 하드코딩 컴포넌트를 사용한다.

**권장 접근:** D-01 결정대로 하드코딩 컴포넌트를 삭제하지 않으므로, 분기 로직을 변경하여 "스키마 존재 + 신규 문서 = 동적, 기존 문서(schemaDefinitionSnapshot IS NULL) = 하드코딩" 패턴을 적용해야 한다. [ASSUMED]

### Anti-Patterns to Avoid
- **기존 form_data 구조 변경:** D-02에 의해 절대 금지. 마이그레이션 스크립트에서 document_content 테이블 UPDATE 하지 않을 것
- **TEMPLATE_REGISTRY에서 컴포넌트 삭제:** D-01에 의해 하드코딩 컴포넌트 유지
- **스키마 필드 ID를 기존 formData 키와 강제 일치:** 신규 문서는 동적 렌더러의 자체 formData 구조를 사용 (Claude's Discretion)

## 6개 템플릿 스키마 설계 분석

### GENERAL (일반 업무 기안)

**소스:** GeneralForm.tsx + generalSchema.ts [VERIFIED]

| 필드 | 타입 | 스키마 FieldType | Required | Config |
|------|------|-----------------|----------|--------|
| title | text input | text | Yes | maxLength: 300 |
| bodyHtml | Tiptap rich text | textarea | Yes | - |

**특이사항:** GeneralForm은 `bodyHtml`을 별도 필드로 사용 (formData가 아닌 document.bodyHtml). 동적 스키마에서는 textarea 필드로 매핑하되, 리치 텍스트 편집은 DynamicForm의 textarea가 Tiptap을 사용하지 않으므로 기능 격차가 발생한다. [VERIFIED: DynamicFieldRenderer에 textarea는 <textarea> HTML 요소 사용]

### EXPENSE (지출 결의서)

**소스:** ExpenseForm.tsx + expenseSchema.ts + ExpenseFormData 타입 [VERIFIED]

| 필드 | 타입 | 스키마 FieldType | Required | Config |
|------|------|-----------------|----------|--------|
| items | table | table | Yes | minRows: 1, maxRows: 무제한, columns: [name(text), quantity(number), unitPrice(number), amount(number)] |
| totalAmount | auto-sum | number | Yes | calculationType: SUM, sourceFields 설정 필요 |
| paymentMethod | text | text | No | placeholder |
| accountInfo | text | text | No | placeholder |

**특이사항:** `items` 테이블의 `amount` 컬럼은 자동 계산 (quantity * unitPrice). 동적 스키마의 테이블 컬럼은 calculationType을 지원하는지 확인 필요. `totalAmount`는 CalculationRule로 구현 가능. [ASSUMED -- DynamicForm의 테이블 내 계산 필드 지원 여부 미확인]

### LEAVE (휴가 신청서)

**소스:** LeaveForm.tsx + leaveSchema.ts + LeaveFormData 타입 [VERIFIED]

| 필드 | 타입 | 스키마 FieldType | Required | Config |
|------|------|-----------------|----------|--------|
| leaveTypeId | select (API 호출) | select | Yes | options: 연차/반차/병가/경조 등 |
| startDate | date | date | Yes | - |
| endDate | date | date | No (반차 시) | - |
| startTime | time | text | No (반차 시) | - |
| endTime | time | text | No (반차 시) | - |
| days | auto-calc | number | Yes | 자동 계산 |
| reason | textarea | textarea | Yes | - |
| emergencyContact | text | text | No | - |

**특이사항:** 
- 휴가 유형에 따라 필드 표시/숨기기 (반차일 때 시간 필드 표시, 종료일 숨김) → ConditionalRule 필요
- 휴가 일수 자동 계산은 현재 `calculateLeaveDays` 유틸리티 사용 → CalculationRule로는 직접 구현 불가 (날짜 차이 계산은 expr-eval이 지원하지 않음)
- leaveTypes는 API에서 동적으로 로드 → 동적 스키마의 select options로는 정적 목록만 가능, optionSetId로 서버 옵션 참조 가능하나 구현 여부 미확인 [ASSUMED]

### PURCHASE (구매 요청서)

**소스:** DB 레코드만 존재 (V7 마이그레이션). 프론트/백엔드 구현 없음. [VERIFIED]

PRD/FSD 기반 예상 필드 구조: [ASSUMED -- PRD 참조 필요]
| 필드 | 타입 | 스키마 FieldType | Required | Config |
|------|------|-----------------|----------|--------|
| items | table | table | Yes | columns: [name, spec, quantity, unitPrice, amount] |
| totalAmount | auto-sum | number | Yes | calculationType: SUM |
| deliveryDate | date | date | No | 희망 납품일 |
| supplier | text | text | No | 공급업체 |
| purpose | textarea | textarea | Yes | 구매 목적 |

### BUSINESS_TRIP (출장 보고서)

**소스:** DB 레코드만 존재. [VERIFIED]

PRD/FSD 기반 예상 필드 구조: [ASSUMED]
| 필드 | 타입 | 스키마 FieldType | Required | Config |
|------|------|-----------------|----------|--------|
| destination | text | text | Yes | 출장지 |
| startDate | date | date | Yes | 출발일 |
| endDate | date | date | Yes | 도착일 |
| purpose | textarea | textarea | Yes | 출장 목적 |
| itinerary | table | table | No | columns: [date, location, activity] |
| expenses | table | table | No | columns: [item, amount] |
| totalExpense | auto-sum | number | No | 총 경비 |
| report | textarea | textarea | No | 출장 결과 |

### OVERTIME (연장 근무 신청서)

**소스:** DB 레코드만 존재. [VERIFIED]

PRD/FSD 기반 예상 필드 구조: [ASSUMED]
| 필드 | 타입 | 스키마 FieldType | Required | Config |
|------|------|-----------------|----------|--------|
| workDate | date | date | Yes | 근무일 |
| startTime | text | text | Yes | 시작 시간 (HH:mm) |
| endTime | text | text | Yes | 종료 시간 (HH:mm) |
| hours | number | number | Yes | 연장 시간 |
| reason | textarea | textarea | Yes | 사유 |
| managerName | text | text | No | 담당 관리자 |

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| JSON 스키마 밸리데이션 | 커스텀 JSON 파서 | 기존 DynamicForm + schemaToZod | Phase 12-15에서 이미 구현된 인프라 |
| 폼 렌더링 | 새 렌더러 컴포넌트 | 기존 DynamicForm / DynamicReadOnly | 모든 8개 필드 타입 + 조건부/계산 로직 이미 지원 |
| 듀얼 렌더링 분기 | 새 라우팅 시스템 | 기존 DocumentEditorPage/DetailPage 분기 로직 확장 | 핵심 패턴 이미 존재, 갭만 채우면 됨 |

## Common Pitfalls

### Pitfall 1: General 폼의 Tiptap → textarea 기능 격차
**What goes wrong:** General 폼은 Tiptap 리치 텍스트 에디터를 사용하지만, 동적 렌더러의 textarea 필드는 plain text만 지원. 신규 General 문서가 서식 없는 텍스트로 전환됨.
**Why it happens:** `bodyHtml` 필드는 document 레벨 필드이지 formData가 아님. DynamicForm은 formData만 처리.
**How to avoid:** General 스키마에서 본문 필드를 textarea로 매핑하되, 이 기능 차이를 수용하거나, DynamicFieldRenderer에 `richText` 타입을 추가해야 함. 또는 General은 하드코딩 유지하고 마이그레이션하지 않는 방안 검토.
**Warning signs:** 사용자가 서식이 필요한 General 문서를 작성할 때 리치 텍스트 기능이 사라짐.

### Pitfall 2: Leave 폼의 동적 옵션 + 날짜 계산 제약
**What goes wrong:** 휴가 유형이 API에서 동적으로 로드되고, 일수 계산이 커스텀 로직 (calculateLeaveDays)에 의존. 동적 스키마의 select/calculation으로는 이 동작을 완전히 재현할 수 없음.
**Why it happens:** CalculationRule은 SUM/MULTIPLY/ADD/COUNT만 지원. 날짜 차이 계산은 범위 밖.
**How to avoid:** Leave 폼도 완전한 동적 전환이 어려울 수 있음. 조건부 규칙으로 반차/연차 분기는 가능하나, 일수 자동 계산은 제약됨.
**Warning signs:** 동적 Leave 폼에서 일수가 자동 계산되지 않음.

### Pitfall 3: Expense 테이블 행 내 자동 계산
**What goes wrong:** Expense 폼의 각 행에서 amount = quantity * unitPrice 자동 계산이 필요하지만, DynamicForm의 테이블 필드에서 행 내(intra-row) 계산을 지원하는지 불확실.
**Why it happens:** CalculationRule의 sourceFields는 최상위 필드 ID만 참조. 테이블 행 내 컬럼 간 계산은 다른 메커니즘이 필요할 수 있음.
**How to avoid:** DynamicForm의 테이블 필드 구현을 확인하여 행 내 계산 지원 여부를 파악해야 함.
**Warning signs:** 지출 항목의 금액이 자동 계산되지 않음.

### Pitfall 4: PURCHASE/BUSINESS_TRIP/OVERTIME 필드 사양 부재
**What goes wrong:** 이 3개 템플릿은 하드코딩 구현이 없어서 "정확히 재현"할 소스가 없음. PRD/FSD에서 필드 사양을 추출해야 함.
**Why it happens:** Phase 10 계획에서는 이 3개 폼의 프론트엔드 구현이 누락된 것으로 보임.
**How to avoid:** PRD/FSD의 각 폼 사양을 정확히 확인하고, 스키마 설계에 반영.
**Warning signs:** 스키마 필드가 PRD 사양과 불일치.

### Pitfall 5: 분기 로직 변경 시 기존 문서 깨짐
**What goes wrong:** 편집 모드 분기 로직을 "스키마 존재 여부"로 변경하면, GENERAL/EXPENSE/LEAVE 기존 DRAFT 문서를 편집할 때 동적 렌더러로 전환되어 기존 formData 구조와 호환되지 않을 수 있음.
**Why it happens:** 기존 DRAFT 문서의 formData는 하드코딩 폼의 키 구조를 따르지만, 동적 폼은 스키마 필드 ID 기반의 다른 구조를 기대.
**How to avoid:** 기존 DRAFT 문서는 반드시 하드코딩 렌더러로 계속 처리해야 함. 분기 기준을 "문서에 schemaDefinitionSnapshot이 있는가?"로 설정하면 안전.

## Code Examples

### Flyway 스키마 시드 마이그레이션 패턴

```sql
-- Source: V11__seed_dynamic_template.sql 패턴 참고 [VERIFIED]
UPDATE approval_template
SET schema_definition = '{"version":1,"fields":[...],"conditionalRules":[],"calculationRules":[]}',
    schema_version = 1
WHERE code = 'GENERAL';
```

### DocumentContent 스냅샷 매핑 추가 패턴

```java
// Source: DocumentContent.java 확장 [VERIFIED: 기존 V8 DDL에 컬럼 존재]
@Column(name = "schema_version")
private Integer schemaVersion;

@Column(name = "schema_definition_snapshot", columnDefinition = "LONGTEXT")
private String schemaDefinitionSnapshot;
```

### DocumentDetailPage DynamicReadOnly 통합 패턴

```typescript
// Source: DocumentDetailPage.tsx 수정 [VERIFIED: 기존 분기 로직]
import DynamicReadOnly from '../components/templates/DynamicReadOnly';

// 읽기 전용 분기:
{ReadOnlyComponent ? (
  <ReadOnlyComponent title={doc.title} bodyHtml={doc.bodyHtml} formData={doc.formData} />
) : doc.schemaDefinitionSnapshot ? (
  <DynamicReadOnly formData={doc.formData} schemaDefinitionSnapshot={doc.schemaDefinitionSnapshot} />
) : (
  <p>알 수 없는 양식입니다.</p>
)}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| 하드코딩 컴포넌트만 | 듀얼 렌더링 (하드코딩 + 동적) | Phase 13 (2026-04-05) | 동적 템플릿 렌더링 가능 |
| DocumentFormValidator switch | DynamicFormValidator 폴백 필요 | Phase 16 (현재) | 신규 동적 템플릿 문서 저장 가능 |

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | JUnit 5 (backend) + Vitest (frontend) |
| Config file | backend: standard Spring Boot test, frontend: vitest.config.* (확인 필요) |
| Quick run command | `cd backend && ./gradlew test --tests "*DocumentFormValidator*"` |
| Full suite command | `cd backend && ./gradlew test` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| MIGR-01 | 6개 스키마 필드 구조 일치 | unit | Backend: `./gradlew test --tests "*TemplateSchemaTest*"` | Wave 0 |
| MIGR-02 | 듀얼 렌더링 분기 동작 | manual | 브라우저에서 기존/신규 문서 렌더링 비교 | N/A |
| MIGR-03 | 기존 문서 정상 표시 | integration | Backend integration test + 수동 확인 | Wave 0 |

### Wave 0 Gaps
- [ ] 스키마 필드 구조 검증 테스트 (각 템플릿의 field 수/타입/라벨 assertion)
- [ ] DocumentFormValidator 동적 폴백 테스트

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | General 폼의 bodyHtml을 동적 textarea로 매핑 시 리치 텍스트 기능 손실 | Pitfall 1 | 사용자 UX 저하 -- 서식 있는 문서 작성 불가 |
| A2 | DynamicForm 테이블 필드에서 행 내 계산(amount = qty * price) 미지원 | Pitfall 3 | Expense 스키마 설계 변경 필요 |
| A3 | CalculationRule이 날짜 차이 계산을 지원하지 않음 | Pitfall 2 | Leave 폼 일수 자동 계산 불가능 |
| A4 | PURCHASE/BUSINESS_TRIP/OVERTIME 필드 구조는 PRD/FSD에서 추출 필요 | 스키마 분석 | 필드 사양이 부정확할 수 있음 |
| A5 | 신규 GENERAL/EXPENSE/LEAVE 문서를 동적 렌더러로 전환하려면 분기 로직 변경 필요 | Architecture | 현재 registry 기반 분기로는 하드코딩 컴포넌트가 항상 우선 |

## Open Questions (RESOLVED)

1. **General 폼의 리치 텍스트 처리 방안** -- RESOLVED
   - What we know: General은 bodyHtml (Tiptap)을 사용. DynamicForm textarea는 plain text
   - What's unclear: 신규 General 문서에서 리치 텍스트 지원이 필수인지
   - Recommendation: General은 스키마만 생성하되, 실제 동적 전환은 DynamicFieldRenderer에 richText 타입 추가 후로 미루거나, textarea로 수용
   - **Resolution:** Plan 16-01 Task 2에서 General 스키마를 bodyText=textarea로 생성. 기능 격차(Tiptap -> plain textarea)는 수용. 기존 General 문서는 D-01에 따라 하드코딩 렌더러 유지.

2. **Leave 폼의 동적 옵션 및 일수 계산** -- RESOLVED
   - What we know: leaveTypes는 API에서 로드, 일수 계산은 calculateLeaveDays 유틸
   - What's unclear: DynamicForm의 select가 서버 옵션을 로드하는지, 날짜 차이 계산이 가능한지
   - Recommendation: 조건부 규칙으로 반차/연차 필드 분기는 구현 가능. 일수 계산은 hidden 필드 + 프론트엔드 커스텀 로직으로 보완하거나, 수동 입력으로 전환
   - **Resolution:** Plan 16-01 Task 2에서 Leave 스키마를 정적 select options로 생성 (연차/반차/병가/경조). 일수는 수동 입력 number 필드로 처리. conditionalRules로 반차/연차 필드 분기 설정.

3. **분기 로직 변경 범위** -- RESOLVED
   - What we know: 현재 registry 기반 분기. D-01은 하드코딩 유지
   - What's unclear: 신규 문서만 동적으로 전환하려면 어떤 기준으로 분기할지
   - Recommendation: 가장 안전한 방법은 "문서 생성 시 schema_definition이 존재하면 schemaDefinitionSnapshot을 저장"하고, "snapshot 존재 여부"로 읽기 전용 분기. 편집 모드는 "template에 schema 존재 + registry에도 등록" 경우 선택 기준 필요
   - **Resolution:** Plan 16-01 Task 3에서 DocumentService가 schema_definition 존재 시 snapshot 저장. Plan 16-02 Task 1에서 편집 모드 분기를 "기존 DRAFT(snapshot 없음) = 하드코딩, 신규 문서 = 동적" 패턴으로 구현. 읽기 전용은 snapshot 존재 여부로 분기.

4. **DocumentFormValidator 동적 폴백 구현 방식** -- RESOLVED
   - What we know: 현재 switch문에 3개만 처리. DynamicFormValidator 클래스 미존재
   - What's unclear: 동적 스키마 기반 백엔드 밸리데이션을 어디까지 구현할지
   - Recommendation: switch default에서 template의 schema_definition이 존재하면 스키마 기반 밸리데이션, 없으면 예외
   - **Resolution:** Plan 16-01 Task 3에서 DocumentFormValidator의 validate 메서드에 schemaDefinition 파라미터 추가. default 케이스에서 schemaDefinition != null이면 required 필드 존재 + table minRows 검증, null이면 TPL_UNKNOWN 예외 유지.

## Project Constraints (from CLAUDE.md)

- **Tech Stack:** Java 17 + Spring Boot 3.x + JPA/Hibernate + MariaDB (backend), React 18 + TypeScript + Zustand + TanStack Query (frontend)
- **Flyway:** 모든 스키마 변경은 Flyway 마이그레이션으로 -- V12부터 배정 가능 (V11까지 사용 중)
- **Form Templates:** 하드코딩 React 컴포넌트 per template type (TEMPLATE_REGISTRY)
- **Document Immutability:** 제출 후 변경 불가
- **GSD Workflow:** 모든 코드 변경은 GSD 워크플로우를 통해야 함

## Sources

### Primary (HIGH confidence)
- **templateRegistry.ts** -- GENERAL/EXPENSE/LEAVE 하드코딩 컴포넌트 등록 확인
- **DocumentEditorPage.tsx** -- 듀얼 렌더링 분기 로직 확인
- **DocumentDetailPage.tsx** -- 읽기 전용 렌더링 갭 확인
- **DocumentFormValidator.java** -- switch문 3개 템플릿만 처리 확인
- **DocumentContent.java** -- schema_version/snapshot 매핑 누락 확인
- **V8__add_template_schema_support.sql** -- DB 컬럼 존재 확인
- **V11__seed_dynamic_template.sql** -- 스키마 JSON 포맷 확인
- **dynamicForm.ts** -- SchemaDefinition/FieldDefinition 타입 정의

### Secondary (MEDIUM confidence)
- **GeneralForm.tsx, ExpenseForm.tsx, LeaveForm.tsx** -- 각 폼 필드 구조 분석
- **generalSchema.ts, expenseSchema.ts, leaveSchema.ts** -- Zod 밸리데이션 스키마 분석

### Tertiary (LOW confidence)
- PURCHASE/BUSINESS_TRIP/OVERTIME 필드 구조 -- PRD/FSD 참조 필요, 검증되지 않은 추정

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- 기존 코드베이스 인프라 완전 검증됨
- Architecture: HIGH -- 듀얼 렌더링 패턴, 스키마 포맷 모두 코드에서 확인
- Pitfalls: MEDIUM -- 일부 동적 렌더러 기능 제약은 추정 (A1~A3)

**Research date:** 2026-04-06
**Valid until:** 2026-05-06 (안정적 코드베이스, 변경 적음)

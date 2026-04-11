# Phase 10: Additional Form Templates - Research

**Researched:** 2026-04-03
**Domain:** React form templates (hardcoded components), Spring Boot backend validation refactor
**Confidence:** HIGH

## Summary

Phase 10 adds three new approval form templates (Purchase Request, Business Trip Report, Overtime Request) to MiceSign's existing template registry. The project already has a well-established pattern from Phase 4's three MVP templates (GENERAL, EXPENSE, LEAVE) — each consisting of an EditForm component, a ReadOnly component, a Zod validation schema, TypeScript form data types, and i18n keys. The new templates follow this exact same pattern with no architectural novelty.

The backend refactor from switch/case to Strategy pattern in `DocumentFormValidator` is the only structural change. This is a standard OOP refactor that introduces a `FormValidationStrategy` interface with per-template implementations, replacing the growing switch statement. Spring's dependency injection makes this straightforward.

**Primary recommendation:** Follow existing patterns exactly. The ExpenseForm (useFieldArray + auto-sum table) is the direct reference for PurchaseForm and BusinessTripForm expense tables. The LeaveForm (date/time inputs + auto-calculation) is the direct reference for OvertimeForm. No new libraries are needed.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- D-01: Purchase request item table extends expense table with spec/description columns (품목명/수량/단가/금액 + 규격/사양)
- D-02: Purchase request additional fields: supplier name, desired delivery date, payment method (select), purchase reason (textarea)
- D-03: Auto-sum reuses existing `formatCurrency` utility from expense form
- D-04: Purchase form_data JSON: `{supplier, deliveryDate, paymentMethod, purchaseReason, items: [{name, spec, quantity, unitPrice, amount}], totalAmount}`
- D-05: Business trip itinerary as date-based table with add/remove rows (date/location/description columns)
- D-06: Business trip expense table included, reusing expense table pattern (transport/lodging/meals/other categories + total)
- D-07: Trip purpose and result are plain textarea (no Rich Text)
- D-08: Business trip additional fields: destination (text), trip period (start~end date range picker)
- D-09: Business trip form_data JSON: `{destination, startDate, endDate, purpose, result, itinerary: [{date, location, description}], expenses: [{category, description, amount}], totalExpense}`
- D-10: Overtime manager selection handled via approval line (no separate manager field in form)
- D-11: Overtime uses start time / end time inputs with auto-calculated hours
- D-12: Single date only per overtime request
- D-13: Overtime additional fields: work date (date), start time (time), end time (time), calculated hours (auto), reason (textarea)
- D-14: Overtime form_data JSON: `{workDate, startTime, endTime, hours, reason}`
- D-15: DocumentFormValidator switch/case refactored to Strategy pattern
- D-16: FormValidationStrategy interface + 6 per-template implementations
- D-17: Adding new form requires only adding a Strategy implementation (OCP)
- D-18: Flyway migration seeds 3 new templates: PURCHASE/PUR, BUSINESS_TRIP/BTR, OVERTIME/OVT

### Claude's Discretion
- UI layout and spacing for each form
- Zod schema validation rules (required/optional, max lengths)
- Time input component implementation (native time input vs custom)
- Expense category list (beyond transport/lodging/meals/other)
- Whether to extract a shared table component from ExpenseForm

### Deferred Ideas (OUT OF SCOPE)
None
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| TPL-04 | Purchase request form (구매 요청서) with item table, auto-sum, and evidence attachments | Extend ExpenseForm pattern: useFieldArray for item table with added spec column, formatCurrency for auto-sum, FileAttachmentArea for attachments. Backend PurchaseFormValidator validates items array + supplier + deliveryDate. |
| TPL-05 | Business trip report form (출장 보고서) with itinerary, expense breakdown, and attachments | Two useFieldArray instances (itinerary + expenses). Itinerary table is new pattern (date/location/description). Expense table reuses ExpenseForm pattern with category-based rows. FileAttachmentArea for attachments. |
| TPL-06 | Overtime request form (연장 근무 신청서) with date, hours, reason, and manager selection | Simplest form. Date input + two time inputs + auto-calculated hours (endTime - startTime). Manager selection via existing approval line UI (D-10). No table needed. |
</phase_requirements>

## Standard Stack

No new libraries needed. All functionality is covered by existing dependencies.

### Core (Already Installed)
| Library | Purpose | Usage in This Phase |
|---------|---------|---------------------|
| react-hook-form | Form state management | useForm + useFieldArray for all 3 templates |
| zod | Schema validation | 3 new schemas (purchaseSchema, businessTripSchema, overtimeSchema) |
| @hookform/resolvers | Zod-RHF bridge | zodResolver for all 3 forms |
| react-i18next | Internationalization | New i18n keys for 3 templates |
| lucide-react | Icons | Icons for template registry entries |

### Backend (Already Installed)
| Library | Purpose | Usage in This Phase |
|---------|---------|---------------------|
| Jackson (ObjectMapper) | JSON validation | Parse form_data JSON in 6 strategy validators |
| Flyway | DB migration | V7 migration to seed 3 new templates |
| Spring DI | Strategy pattern | Auto-inject Map<String, FormValidationStrategy> |

## Architecture Patterns

### Frontend: Per-Template Component Set (Established Pattern)

Each template requires exactly 4 artifacts:
```
frontend/src/features/document/
  components/templates/
    PurchaseForm.tsx          # Edit component
    PurchaseReadOnly.tsx      # Read-only component
    BusinessTripForm.tsx      # Edit component
    BusinessTripReadOnly.tsx  # Read-only component
    OvertimeForm.tsx          # Edit component
    OvertimeReadOnly.tsx      # Read-only component
    templateRegistry.ts       # +3 entries
  validations/
    purchaseSchema.ts         # Zod schema
    businessTripSchema.ts     # Zod schema
    overtimeSchema.ts         # Zod schema
  types/
    document.ts               # +3 FormData interfaces
```

### Backend: Strategy Pattern for Validation

**Current (switch/case):**
```java
// DocumentFormValidator.java — current
public void validate(String templateCode, String bodyHtml, String formDataJson) {
    switch (templateCode) {
        case "GENERAL" -> validateGeneralFormData(bodyHtml);
        case "EXPENSE" -> validateExpenseFormData(formDataJson);
        case "LEAVE" -> validateLeaveFormData(formDataJson);
        default -> throw new BusinessException("TPL_UNKNOWN", "...");
    }
}
```

**Target (Strategy):**
```java
// FormValidationStrategy.java — new interface
public interface FormValidationStrategy {
    String getTemplateCode();
    void validate(String bodyHtml, String formDataJson);
}

// DocumentFormValidator.java — refactored
@Component
public class DocumentFormValidator {
    private final Map<String, FormValidationStrategy> strategies;
    
    public DocumentFormValidator(List<FormValidationStrategy> strategyList) {
        this.strategies = strategyList.stream()
            .collect(Collectors.toMap(
                FormValidationStrategy::getTemplateCode,
                Function.identity()
            ));
    }
    
    public void validate(String templateCode, String bodyHtml, String formDataJson) {
        FormValidationStrategy strategy = strategies.get(templateCode);
        if (strategy == null) {
            throw new BusinessException("TPL_UNKNOWN", "알 수 없는 양식 코드입니다: " + templateCode);
        }
        strategy.validate(bodyHtml, formDataJson);
    }
}
```

Spring automatically collects all `FormValidationStrategy` beans into the `List<FormValidationStrategy>` constructor parameter. Each strategy is a `@Component` with `getTemplateCode()` returning its code (e.g., "PURCHASE").

### Pattern: Editable Table with Auto-Sum (Reused from ExpenseForm)

The ExpenseForm establishes this pattern:
1. `useFieldArray({ control, name: 'items' })` for dynamic rows
2. `watch('items')` + `useEffect` for auto-calculating per-row amounts and total
3. `formatCurrency()` for display
4. Add row button with `append()`, remove with `remove(index)`
5. Footer row shows total

PurchaseForm and BusinessTripForm expense table both reuse this exact pattern.

### Pattern: Time Auto-Calculation (For OvertimeForm)

```typescript
// Auto-calculate overtime hours from startTime and endTime
useEffect(() => {
  if (startTime && endTime) {
    const [sh, sm] = startTime.split(':').map(Number);
    const [eh, em] = endTime.split(':').map(Number);
    const startMinutes = sh * 60 + sm;
    const endMinutes = eh * 60 + em;
    const diff = endMinutes - startMinutes;
    setValue('hours', diff > 0 ? Math.round(diff / 30) * 0.5 : 0); // round to 0.5h
  }
}, [startTime, endTime, setValue]);
```

### Anti-Patterns to Avoid
- **Shared editable table component too early:** The expense/purchase/trip tables have different columns. Extracting a generic `EditableTable` component adds complexity without enough payoff for 3 uses. Keep each form self-contained. If a future v1.2 adds more tables, refactor then.
- **Rich text for trip report:** D-07 explicitly requires plain textarea. Do not use TipTap/TinyMCE.
- **Separate manager field in overtime form:** D-10 says use the approval line. Do not add a manager selector.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Dynamic array forms | Manual state management for table rows | `useFieldArray` from react-hook-form | Handles add/remove/reorder, integrates with validation |
| Currency formatting | Custom formatter | Existing `formatCurrency` / `parseNumericInput` from `currency.ts` | Already handles Korean won formatting |
| Date range validation | Manual date comparison | Zod `.refine()` on schema | Keeps validation co-located |
| Strategy bean collection | Manual Map<String, Strategy> construction | Spring `List<T>` constructor injection | Auto-discovers all @Component strategies |

## Common Pitfalls

### Pitfall 1: useFieldArray Re-render Performance
**What goes wrong:** Watching all field array items causes excessive re-renders with many rows
**Why it happens:** `watch('items')` re-renders on every keystroke in any row
**How to avoid:** For tables under ~20 rows (typical for these forms), this is acceptable. If performance issues arise, use `useWatch` at the row level instead.
**Warning signs:** Noticeable input lag when typing in table cells

### Pitfall 2: Time Calculation Edge Cases (Overtime)
**What goes wrong:** Overnight work (e.g., 22:00-02:00) gives negative hours
**Why it happens:** Simple subtraction doesn't handle day boundary
**How to avoid:** D-12 states single date only. If endTime < startTime, treat as crossing midnight: add 24 hours to endMinutes. Alternatively, show a validation warning.
**Warning signs:** Negative or zero calculated hours with valid-looking times

### Pitfall 3: Flyway Migration Version Collision
**What goes wrong:** Migration fails because version number already used
**Why it happens:** Other phases may have added migrations concurrently
**How to avoid:** Check latest migration file number before creating new one. Current latest is V6. Next should be V7.
**Warning signs:** Flyway `MigrationChecksumMismatch` or `MigrationAlreadyApplied` error

### Pitfall 4: Template Registry Import Bloat
**What goes wrong:** All 6 template components are loaded upfront even if user only uses 1
**Why it happens:** Static imports in templateRegistry.ts
**How to avoid:** Use `React.lazy()` for template components. This is an optimization that can be deferred but is worth noting.
**Warning signs:** Large initial bundle size

### Pitfall 5: Backend Strategy Pattern — ObjectMapper Not Injected
**What goes wrong:** Each strategy implementation needs ObjectMapper for JSON parsing
**Why it happens:** Extract validation methods from DocumentFormValidator but forget to inject ObjectMapper into each strategy
**How to avoid:** Each strategy @Component gets ObjectMapper via constructor injection (or provide it as a parameter in the validate method signature)

## Code Examples

### Example 1: Template Registry Entry (New)
```typescript
// In templateRegistry.ts — add 3 entries
import PurchaseForm from './PurchaseForm';
import PurchaseReadOnly from './PurchaseReadOnly';
import BusinessTripForm from './BusinessTripForm';
import BusinessTripReadOnly from './BusinessTripReadOnly';
import OvertimeForm from './OvertimeForm';
import OvertimeReadOnly from './OvertimeReadOnly';

// Add to TEMPLATE_REGISTRY:
PURCHASE: {
  editComponent: PurchaseForm,
  readOnlyComponent: PurchaseReadOnly,
  label: '구매 요청서',
  description: '물품 구매를 요청합니다.',
  icon: 'ShoppingCart',
},
BUSINESS_TRIP: {
  editComponent: BusinessTripForm,
  readOnlyComponent: BusinessTripReadOnly,
  label: '출장 보고서',
  description: '출장 결과를 보고합니다.',
  icon: 'Plane',
},
OVERTIME: {
  editComponent: OvertimeForm,
  readOnlyComponent: OvertimeReadOnly,
  label: '연장 근무 신청서',
  description: '연장 근무를 신청합니다.',
  icon: 'Clock',
},
```

### Example 2: Purchase Form Data Type
```typescript
// In document.ts — add interfaces
export interface PurchaseItem {
  name: string;
  spec: string;      // 규격/사양 — extends ExpenseItem
  quantity: number;
  unitPrice: number;
  amount: number;
}

export interface PurchaseFormData {
  supplier: string;
  deliveryDate: string;
  paymentMethod: string;
  purchaseReason: string;
  items: PurchaseItem[];
  totalAmount: number;
}

export interface ItineraryItem {
  date: string;
  location: string;
  description: string;
}

export interface TripExpenseItem {
  category: string;   // 교통비, 숙박비, 식비, 기타
  description: string;
  amount: number;
}

export interface BusinessTripFormData {
  destination: string;
  startDate: string;
  endDate: string;
  purpose: string;
  result: string;
  itinerary: ItineraryItem[];
  expenses: TripExpenseItem[];
  totalExpense: number;
}

export interface OvertimeFormData {
  workDate: string;
  startTime: string;
  endTime: string;
  hours: number;
  reason: string;
}
```

### Example 3: Zod Schema for Overtime (Simplest)
```typescript
// overtimeSchema.ts
import { z } from 'zod';

export const overtimeFormSchema = z.object({
  title: z.string().min(1, { error: '제목을 입력해주세요' }).max(300),
  workDate: z.string().min(1, { error: '근무 날짜를 선택해주세요' }),
  startTime: z.string().min(1, { error: '시작 시간을 입력해주세요' }),
  endTime: z.string().min(1, { error: '종료 시간을 입력해주세요' }),
  hours: z.number().min(0.5, { error: '근무 시간이 올바르지 않습니다' }),
  reason: z.string().min(1, { error: '사유를 입력해주세요' }),
});

export type OvertimeFormValues = z.infer<typeof overtimeFormSchema>;
```

### Example 4: Flyway Migration for New Templates
```sql
-- V7__add_additional_templates.sql
INSERT INTO approval_template (code, name, description, prefix, is_active, sort_order) VALUES
('PURCHASE', '구매 요청서', '물품 구매 요청 양식', 'PUR', TRUE, 4),
('BUSINESS_TRIP', '출장 보고서', '출장 결과 보고 양식', 'BTR', TRUE, 5),
('OVERTIME', '연장 근무 신청서', '연장 근무 신청 양식', 'OVT', TRUE, 6);
```

### Example 5: Strategy Implementation (Purchase)
```java
@Component
public class PurchaseFormValidator implements FormValidationStrategy {
    private final ObjectMapper objectMapper;
    
    public PurchaseFormValidator(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }
    
    @Override
    public String getTemplateCode() { return "PURCHASE"; }
    
    @Override
    public void validate(String bodyHtml, String formDataJson) {
        if (!StringUtils.hasText(formDataJson)) {
            throw new BusinessException("DOC_INVALID_FORM_DATA", "구매 요청서는 양식 데이터가 필요합니다.");
        }
        JsonNode root = parseJson(formDataJson);
        validateRequiredText(root, "supplier", "납품업체명");
        validateRequiredText(root, "deliveryDate", "희망 납품일");
        validateRequiredText(root, "purchaseReason", "구매 사유");
        validateItemsArray(root);
        validateTotalAmount(root);
    }
}
```

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | JUnit 5 + Spring Boot Test (backend), Vitest (frontend — if configured) |
| Config file | `backend/build.gradle` (JUnit), `frontend/vitest.config.ts` (if exists) |
| Quick run command | `cd backend && ./gradlew test --tests '*FormValidator*'` |
| Full suite command | `cd backend && ./gradlew test` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| TPL-04 | Purchase form validates item table + supplier + total | unit | `./gradlew test --tests '*PurchaseFormValidator*'` | Wave 0 |
| TPL-05 | Business trip validates itinerary + expenses + dates | unit | `./gradlew test --tests '*BusinessTripFormValidator*'` | Wave 0 |
| TPL-06 | Overtime validates date/time/hours/reason | unit | `./gradlew test --tests '*OvertimeFormValidator*'` | Wave 0 |
| ALL | Strategy pattern routes to correct validator | unit | `./gradlew test --tests '*DocumentFormValidator*'` | Wave 0 |
| ALL | Full document lifecycle (draft/submit/approve) with new templates | integration | Manual E2E verification | Manual |

### Sampling Rate
- **Per task commit:** `cd backend && ./gradlew test --tests '*FormValidator*' -x`
- **Per wave merge:** `cd backend && ./gradlew test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `backend/src/test/java/com/micesign/service/PurchaseFormValidatorTest.java` — covers TPL-04 backend validation
- [ ] `backend/src/test/java/com/micesign/service/BusinessTripFormValidatorTest.java` — covers TPL-05 backend validation
- [ ] `backend/src/test/java/com/micesign/service/OvertimeFormValidatorTest.java` — covers TPL-06 backend validation
- [ ] `backend/src/test/java/com/micesign/service/DocumentFormValidatorTest.java` — covers strategy routing (may already exist, verify)

## i18n Keys Required

New keys to add under `document.json`:

```json
{
  "template": {
    "PURCHASE": "구매 요청서",
    "BUSINESS_TRIP": "출장 보고서",
    "OVERTIME": "연장 근무 신청서"
  },
  "purchase": {
    "supplier": "납품업체명",
    "deliveryDate": "희망 납품일",
    "paymentMethod": "결제 방법",
    "purchaseReason": "구매 사유/용도",
    "addRow": "품목 추가",
    "total": "합계",
    "columns": {
      "name": "품목명",
      "spec": "규격/사양",
      "quantity": "수량",
      "unitPrice": "단가",
      "amount": "금액"
    }
  },
  "businessTrip": {
    "destination": "출장지",
    "startDate": "출장 시작일",
    "endDate": "출장 종료일",
    "purpose": "출장 목적",
    "result": "출장 결과",
    "itinerary": "일정",
    "expenses": "경비 내역",
    "addItinerary": "일정 추가",
    "addExpense": "경비 추가",
    "totalExpense": "경비 합계",
    "itineraryColumns": {
      "date": "날짜",
      "location": "장소",
      "description": "일정 내용"
    },
    "expenseColumns": {
      "category": "분류",
      "description": "내용",
      "amount": "금액"
    },
    "expenseCategories": {
      "transport": "교통비",
      "lodging": "숙박비",
      "meals": "식비",
      "other": "기타"
    }
  },
  "overtime": {
    "workDate": "근무 날짜",
    "startTime": "시작 시간",
    "endTime": "종료 시간",
    "hours": "연장 근무 시간",
    "hoursFormat": "{{n}}시간",
    "reason": "사유"
  }
}
```

## Complexity Assessment

| Template | Complexity | Reason | Estimated Effort |
|----------|-----------|--------|------------------|
| OvertimeForm | LOW | Simple fields (date, 2x time, textarea), auto-calc only | Smallest — similar to LeaveForm |
| PurchaseForm | MEDIUM | Item table (extended ExpenseForm) + extra fields, but well-known pattern | Moderate — ExpenseForm clone + extensions |
| BusinessTripForm | HIGH | Two separate useFieldArray tables (itinerary + expenses) + multiple fields | Most complex — dual tables in one form |

## Open Questions

1. **Expense category list for Business Trip**
   - What we know: D-06 mentions 교통비/숙박비/식비/기타 as categories
   - What's unclear: Whether categories should be a hardcoded select or free-text input
   - Recommendation: Use a select dropdown with the 4 fixed categories. This is simpler and produces consistent data for potential future reporting.

2. **Overtime hours rounding**
   - What we know: D-11 says auto-calculate from start/end time
   - What's unclear: Whether to round to nearest 0.5h, 1h, or show exact minutes
   - Recommendation: Round to nearest 0.5 hours. Korean corporate overtime is typically counted in half-hour increments.

3. **Payment method options for Purchase Request**
   - What we know: D-02 says "select" type
   - What's unclear: Exact option list
   - Recommendation: Hardcode common options: 법인카드, 계좌이체, 현금, 기타. Can be extended later.

## Sources

### Primary (HIGH confidence)
- Existing codebase: `templateRegistry.ts`, `ExpenseForm.tsx`, `LeaveForm.tsx`, `DocumentFormValidator.java` — direct pattern references
- Existing codebase: `expenseSchema.ts`, `leaveSchema.ts` — Zod schema patterns
- Existing codebase: `document.ts` — TypeScript form data type patterns
- Existing codebase: `V2__seed_initial_data.sql` — Flyway seed data pattern

### Secondary (MEDIUM confidence)
- Spring Framework: Constructor-based List injection for strategy pattern — well-documented Spring DI feature
- react-hook-form: useFieldArray API — used successfully in ExpenseForm already

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new libraries, all existing
- Architecture: HIGH — extending established patterns, strategy pattern is textbook
- Pitfalls: HIGH — based on direct codebase analysis and known React Hook Form behavior

**Research date:** 2026-04-03
**Valid until:** 2026-05-03 (stable — no library changes expected)

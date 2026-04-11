# Phase 12: Schema Foundation - Research

**Researched:** 2026-04-05
**Domain:** JSON schema format design, DB migration, template CRUD API, backend validation, versioning infrastructure
**Confidence:** HIGH

## Summary

Phase 12는 MiceSign v1.2 Custom Template Builder의 기반을 구축하는 단계다. 핵심 과제는 (1) 커스텀 JSON 스키마 포맷 설계 및 확정, (2) Flyway 마이그레이션으로 approval_template/document_content 테이블 확장 + 신규 테이블 생성, (3) 템플릿 CRUD API 구현, (4) DynamicFormValidator를 통한 동적 검증 인프라 구축이다.

기존 코드베이스 분석 결과, 현재 TemplateService/TemplateController는 단순 목록 조회만 제공하며 TemplateMapper는 MapStruct 인터페이스다. DocumentFormValidator는 Strategy 패턴으로 6개 양식별 검증기를 Map으로 관리하고 있어, fallback 분기 추가만으로 동적 검증 통합이 가능하다. ApprovalTemplate 엔티티는 code, name, description, prefix, is_active, sort_order 필드를 가지고 있으며, schema_definition 등 nullable 칼럼 추가가 필요하다.

이 단계에서 가장 중요한 것은 JSON 스키마 포맷의 확정이다. Phase 13(Dynamic Rendering), 14(Builder UI), 15(Advanced Logic) 모두 이 포맷에 의존하므로, 변경 비용이 가장 높은 결정이다. CONTEXT.md에서 discriminated union 패턴 (`{ id, type, label, required, config }`)과 필드 ID 자동 생성(nanoid), 커스텀 포맷(JSON Schema Draft 7 아님) 등이 이미 확정되었다.

**Primary recommendation:** Flyway V8 마이그레이션으로 테이블 확장/생성 후, 커스텀 스키마 포맷 기반의 순수 Java 필드별 검증기와 템플릿 CRUD API를 구현한다. 기존 6개 하드코딩 양식은 절대 수정하지 않는다.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** 필드 ID는 자동 UUID(nanoid) 생성. 필드 이동/복사 시 충돌 없음. form_data에서 key로 사용
- **D-02:** 커스텀 JSON 포맷 사용 (JSON Schema Draft 7 아님). 루트 구조: `{ version, fields[], conditionalRules[], calculationRules[] }`
- **D-03:** conditionalRules와 calculationRules는 Phase 12에서 빈 배열로 자리만 예약. 실제 로직은 Phase 15에서 구현
- **D-04:** 8개 필드 타입 모두 동일한 `{ id, type, label, required, config }` 구조. staticText는 `config.content`, hidden은 `config.defaultValue` 사용
- **D-05:** table 필드의 columns는 동일한 필드 정의 구조를 중첩 재사용. `config.columns[]` 배열에 `{ id, type, label, required, config }` 형태로 정의. `config.minRows`, `config.maxRows` 지원
- **D-06:** select 옵션은 별도 DB 테이블(option_set + option_item)로 관리. 여러 템플릿에서 동일한 옵션 세트를 공유 가능
- **D-07:** 옵션은 value(영문 코드) + label(한글 표시) 분리. form_data에는 value만 저장
- **D-08:** 옵션 변경은 기존 문서에 영향 없음. 스키마 스냅샷에 옵션 정보도 함께 보존하여 제출된 문서는 원래 옵션으로 표시
- **D-09:** 별도 `template_schema_version` 테이블에 append-only로 모든 버전 이력 보존. `approval_template`에는 최신 버전만 유지
- **D-10:** 스키마 스냅샷은 문서 생성(Draft) 시점에 `document_content.schema_definition_snapshot`에 저장. 초안 작성 중 스키마 변경 시에도 사용자 경험 보호
- **D-11:** 스키마 변경 시 자동 버전 증가 (version+1). 별도 확인 다이얼로그 없이 바로 저장
- **D-12:** 순수 Java 필드별 검증. JSON 스키마의 fields 배열을 순회하며 타입/필수값/min/max 직접 검증. 외부 라이브러리(json-schema-validator) 불필요
- **D-13:** 기존 DocumentFormValidator와 Fallback 패턴으로 통합. Strategy Map에 없는 templateCode일 때 DynamicFormValidator로 fallback. 기존 6개 양식 코드 수정 없음
- **D-14:** 검증 오류는 `{ fieldId: ["오류 메시지"] }` 맵 형태로 반환. 프론트엔드에서 필드별 인라인 오류 표시 용이
- **D-15:** `approval_template` 확장: schema_definition(JSON NULL), schema_version(INT DEFAULT 0), is_custom(BOOLEAN DEFAULT FALSE), category(VARCHAR NULL), icon(VARCHAR NULL), created_by(BIGINT NULL FK)
- **D-16:** `document_content` 확장: schema_version(INT NULL), schema_definition_snapshot(JSON NULL) 추가. NULL이면 하드코딩 양식
- **D-17:** 새 테이블 `template_schema_version`: id, template_id(FK), version(INT), schema_definition(JSON), created_at. append-only 이력
- **D-18:** 새 테이블 `option_set` + `option_item`: 공유 옵션 세트 관리용
- **D-19:** 템플릿 CRUD API는 ADMIN + SUPER_ADMIN 모두 접근 가능

### Claude's Discretion
- API 엔드포인트 세부 설계 (URL 구조, 페이지네이션 방식)
- Flyway 마이그레이션 파일 번호 및 순서
- DynamicFormValidator 내부 검증 로직 세부 구현
- nanoid 길이 및 생성 방식
- option_set/option_item 테이블 세부 칼럼 구성

### Deferred Ideas (OUT OF SCOPE)
- 옵션 세트 관리 UI — Phase 14(Builder UI)에서 함께 구현
- 기존 leave_type 테이블을 option_set으로 마이그레이션 — Phase 16(Template Migration)에서 검토
- 필드 validation 규칙 확장 (regex, 커스텀 검증) — 필요시 별도 phase
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| SCHM-01 | Admin can define form template schema as JSON (field definitions, order, validation rules) | D-02, D-04, D-05의 JSON 포맷 설계 + 템플릿 CRUD API (create/update) + 8개 필드 타입 구조 |
| SCHM-02 | System stores template schema versions immutably (schema changes create new version, existing documents retain original version) | D-09 template_schema_version 테이블 + D-10 document_content 스냅샷 + D-11 자동 버전 증가 |
| SCHM-03 | Backend validates submitted form_data against template's JSON schema before persisting | D-12 순수 Java 필드별 검증 + D-13 DocumentFormValidator fallback 패턴 + D-14 오류 맵 반환 |
| SCHM-04 | Template schema supports 8 field types: text, textarea, number, date, select, table, staticText, hidden | D-04 공통 구조 + D-05 table 중첩 + D-06 select 옵션 DB 관리 |
</phase_requirements>

## Project Constraints (from CLAUDE.md)

- **Tech stack:** Java 17, Spring Boot 3.x, Spring Security + JWT, JPA/Hibernate, QueryDSL, Gradle Kotlin DSL, MapStruct, Flyway
- **DB:** MariaDB 10.11+ (utf8mb4/utf8mb4_unicode_ci)
- **Auth:** Stateless JWT, `@PreAuthorize` for RBAC
- **Approval templates:** Hardcoded React components per type (existing), NOT dynamic form builder (for existing 6 templates)
- **DTO pattern:** Java record classes
- **Mapper:** MapStruct (`@Mapper(componentModel = "spring")`)
- **Test:** JUnit 5 + AssertJ + H2 in-memory DB
- **No Lombok** — Java 17 records handle most use cases
- **Flyway** must be included from Phase 1 setup — all schema changes through migration files

## Standard Stack

### Core (Already Installed)
| Library | Version | Purpose | Notes |
|---------|---------|---------|-------|
| Spring Boot | 3.5.13 | Framework | 현재 설치됨 |
| Spring Data JPA | (Boot managed) | ORM + Repository | 엔티티 확장, 신규 Repository 추가 |
| Flyway | (Boot managed) | DB 마이그레이션 | V8부터 추가 |
| MapStruct | 1.6.3 | DTO-Entity 매핑 | 기존 패턴 그대로 |
| Jackson | (Boot managed) | JSON 파싱/직렬화 | schema_definition JSON 처리 |
| Spring Validation | (Boot managed) | DTO 입력 검증 | @Valid, @NotBlank 등 |

### New Dependency
| Library | Version | Purpose | Why |
|---------|---------|---------|-----|
| jnanoid | 2.0.0 | 필드 ID 생성 | D-01 결정사항. 21자 URL-friendly ID. UUID(36자)보다 짧고 충돌 확률 동등 |

**jnanoid는 필수가 아님** — `java.util.UUID.randomUUID().toString().replace("-", "").substring(0, 12)` 등으로 대체 가능. 하지만 D-01에서 nanoid로 결정되었으므로 jnanoid 사용. Maven Central에서 `com.aventrix.jnanoid:jnanoid:2.0.0` 사용.

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| jnanoid | UUID.randomUUID() | UUID는 36자로 길지만 표준 라이브러리. nanoid는 21자로 짧고 URL-friendly |
| 순수 Java 검증 | networknt json-schema-validator | D-12에서 순수 Java로 결정됨. 커스텀 포맷이므로 표준 JSON Schema 라이브러리는 오히려 불편 |

**Installation (build.gradle.kts 추가):**
```kotlin
implementation("com.aventrix.jnanoid:jnanoid:2.0.0")
```

## Architecture Patterns

### Recommended Project Structure (신규/변경 파일)
```
backend/src/main/
├── java/com/micesign/
│   ├── domain/
│   │   ├── ApprovalTemplate.java        # MODIFIED: 6개 필드 추가
│   │   ├── DocumentContent.java         # MODIFIED: 2개 필드 추가
│   │   ├── TemplateSchemaVersion.java   # NEW: 스키마 버전 이력 엔티티
│   │   ├── OptionSet.java               # NEW: 공유 옵션 세트 엔티티
│   │   └── OptionItem.java              # NEW: 옵션 항목 엔티티
│   ├── repository/
│   │   ├── TemplateSchemaVersionRepository.java  # NEW
│   │   ├── OptionSetRepository.java              # NEW
│   │   └── OptionItemRepository.java             # NEW
│   ├── dto/template/
│   │   ├── TemplateResponse.java        # MODIFIED: 신규 필드 추가
│   │   ├── CreateTemplateRequest.java   # NEW
│   │   ├── UpdateTemplateRequest.java   # NEW
│   │   ├── TemplateDetailResponse.java  # NEW: 스키마 포함 상세 응답
│   │   └── SchemaDefinition.java        # NEW: JSON 스키마 Java 모델
│   ├── dto/option/
│   │   ├── OptionSetResponse.java       # NEW
│   │   └── CreateOptionSetRequest.java  # NEW
│   ├── service/
│   │   ├── TemplateService.java         # MODIFIED: CRUD 메서드 추가
│   │   ├── TemplateSchemaService.java   # NEW: 스키마 버전 관리 로직
│   │   ├── OptionSetService.java        # NEW: 옵션 세트 관리
│   │   ├── DocumentFormValidator.java   # MODIFIED: fallback 분기 추가
│   │   └── DocumentService.java         # MODIFIED: 스냅샷 저장 로직
│   ├── service/validation/
│   │   └── DynamicFormValidator.java    # NEW: 동적 스키마 검증기
│   ├── controller/
│   │   ├── TemplateController.java      # MODIFIED: CRUD 엔드포인트 추가
│   │   └── OptionSetController.java     # NEW
│   └── mapper/
│       ├── TemplateMapper.java          # MODIFIED: 신규 매핑 추가
│       └── OptionSetMapper.java         # NEW
├── resources/db/migration/
│   ├── V8__add_template_schema_support.sql        # NEW
│   ├── V9__create_template_schema_version.sql     # NEW
│   └── V10__create_option_tables.sql              # NEW
```

### Pattern 1: DocumentFormValidator Fallback 패턴
**What:** 기존 Strategy Map에서 templateCode를 찾지 못할 때 DynamicFormValidator로 위임
**When to use:** is_custom=true인 동적 템플릿의 form_data 검증 시
**Example:**
```java
// DocumentFormValidator.java (MODIFIED)
@Component
public class DocumentFormValidator {
    private final Map<String, FormValidationStrategy> strategies;
    private final DynamicFormValidator dynamicFormValidator;

    public DocumentFormValidator(List<FormValidationStrategy> strategyList,
                                 DynamicFormValidator dynamicFormValidator) {
        this.strategies = strategyList.stream()
            .collect(Collectors.toMap(
                FormValidationStrategy::getTemplateCode,
                Function.identity()
            ));
        this.dynamicFormValidator = dynamicFormValidator;
    }

    public void validate(String templateCode, String bodyHtml, String formDataJson) {
        FormValidationStrategy strategy = strategies.get(templateCode);
        if (strategy != null) {
            // 기존 6개 하드코딩 양식: 기존 검증 그대로 사용
            strategy.validate(bodyHtml, formDataJson);
        } else {
            // 동적 템플릿: DynamicFormValidator로 fallback
            dynamicFormValidator.validate(templateCode, formDataJson);
        }
    }
}
```

### Pattern 2: 스키마 버전 자동 증가 (Append-Only)
**What:** 템플릿 스키마 수정 시 template_schema_version에 새 행 추가 + approval_template.schema_version 증가
**When to use:** 템플릿 update API 호출 시 스키마가 변경된 경우
**Example:**
```java
// TemplateSchemaService.java
@Transactional
public void updateSchema(ApprovalTemplate template, String newSchemaJson) {
    int newVersion = template.getSchemaVersion() + 1;

    // 1. Append new version to history
    TemplateSchemaVersion version = new TemplateSchemaVersion();
    version.setTemplate(template);
    version.setVersion(newVersion);
    version.setSchemaDefinition(newSchemaJson);
    schemaVersionRepository.save(version);

    // 2. Update template's current schema + version
    template.setSchemaDefinition(newSchemaJson);
    template.setSchemaVersion(newVersion);
    templateRepository.save(template);
}
```

### Pattern 3: Document 생성 시 스키마 스냅샷 저장
**What:** 동적 템플릿 문서 생성 시 document_content에 현재 스키마 스냅샷을 기록
**When to use:** DocumentService.createDocument()에서 is_custom=true 템플릿일 때
**Example:**
```java
// DocumentService.java (MODIFIED - createDocument 내부)
DocumentContent content = new DocumentContent();
content.setDocument(document);
content.setBodyHtml(req.bodyHtml());
content.setFormData(req.formData());

// 동적 템플릿인 경우 스키마 스냅샷 저장
if (template.getSchemaDefinition() != null) {
    content.setSchemaVersion(template.getSchemaVersion());
    // 옵션 정보를 포함한 resolved 스냅샷 저장 (D-08)
    String resolvedSchema = templateSchemaService.resolveSchemaWithOptions(
        template.getSchemaDefinition());
    content.setSchemaDefinitionSnapshot(resolvedSchema);
}
documentContentRepository.save(content);
```

### Pattern 4: DynamicFormValidator 필드별 검증
**What:** 스키마의 fields 배열을 순회하며 각 필드의 타입/필수/min/max를 Java로 직접 검증
**When to use:** 동적 템플릿의 form_data 제출 시
**Example:**
```java
// DynamicFormValidator.java
@Component
public class DynamicFormValidator {
    private final ApprovalTemplateRepository templateRepository;
    private final ObjectMapper objectMapper;

    public Map<String, List<String>> validate(String templateCode, String formDataJson) {
        ApprovalTemplate template = templateRepository.findByCode(templateCode)
            .orElseThrow(() -> new BusinessException("TPL_NOT_FOUND", "양식을 찾을 수 없습니다."));

        if (template.getSchemaDefinition() == null) {
            throw new BusinessException("TPL_NOT_DYNAMIC", "동적 양식이 아닙니다.");
        }

        JsonNode schema = objectMapper.readTree(template.getSchemaDefinition());
        JsonNode formData = objectMapper.readTree(formDataJson);
        Map<String, List<String>> errors = new LinkedHashMap<>();

        for (JsonNode field : schema.get("fields")) {
            String fieldId = field.get("id").asText();
            String type = field.get("type").asText();
            boolean required = field.has("required") && field.get("required").asBoolean();
            JsonNode value = formData.get(fieldId);

            validateField(fieldId, type, required, field.get("config"), value, errors);
        }

        if (!errors.isEmpty()) {
            throw new FormValidationException(errors);
        }
        return errors;
    }

    private void validateField(String fieldId, String type, boolean required,
                               JsonNode config, JsonNode value,
                               Map<String, List<String>> errors) {
        // 필수값 체크
        if (required && (value == null || value.isNull() || value.asText().isBlank())) {
            errors.computeIfAbsent(fieldId, k -> new ArrayList<>())
                .add("필수 입력 항목입니다.");
            return;
        }
        if (value == null || value.isNull()) return;

        // 타입별 검증
        switch (type) {
            case "number" -> validateNumber(fieldId, config, value, errors);
            case "date" -> validateDate(fieldId, config, value, errors);
            case "select" -> validateSelect(fieldId, config, value, errors);
            case "table" -> validateTable(fieldId, config, value, errors);
            // text, textarea, staticText, hidden은 별도 타입 검증 불필요
        }
    }
}
```

### Anti-Patterns to Avoid
- **기존 FormValidationStrategy 수정:** 6개 기존 검증기(GeneralFormValidator 등)의 코드를 절대 변경하지 않는다. 새로운 검증기만 추가.
- **approval_template의 기존 행 데이터 변경:** 기존 6개 하드코딩 템플릿의 schema_definition은 NULL로 유지. 절대 채우지 않는다.
- **document_content의 기존 행 변경:** 기존 문서의 schema_version/schema_definition_snapshot은 NULL로 유지. NULL = 하드코딩 양식이라는 판별 기준.
- **template code 직접 입력 허용:** 동적 템플릿의 code는 시스템 자동 생성 (`CUSTOM_{id}`). prefix도 중복 검증 필수.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| 필드 ID 생성 | Custom random string generator | jnanoid 2.0.0 | 충돌 확률 수학적으로 검증됨, 21자 URL-friendly |
| JSON 파싱 | Manual string parsing | Jackson ObjectMapper | Spring Boot에 이미 포함, tree model로 동적 JSON 처리 |
| DTO-Entity 매핑 | Manual getter/setter 호출 | MapStruct | 프로젝트 기존 패턴, 컴파일타임 타입 안전성 |
| DB 마이그레이션 | JPA auto-ddl | Flyway | 프로젝트 기존 패턴, V1~V7 이미 존재 |

**Key insight:** 이 phase는 신규 외부 라이브러리가 거의 필요 없다. Jackson과 Spring의 기존 도구로 모든 것을 처리할 수 있으며, 유일한 새 의존성은 nanoid 생성용 jnanoid뿐이다.

## Common Pitfalls

### Pitfall 1: Flyway 마이그레이션에서 기존 데이터 깨뜨림
**What goes wrong:** 새 칼럼을 NOT NULL DEFAULT로 추가하거나, 기존 행의 의미를 변경하는 마이그레이션 작성
**Why it happens:** 새 칼럼이 "반드시 있어야 한다"고 생각하고 NOT NULL로 만듦
**How to avoid:** 모든 새 칼럼은 NULL 허용 (schema_definition, schema_version, category, icon, created_by, schema_definition_snapshot). 기존 6개 템플릿은 새 칼럼 모두 NULL 유지. `is_custom BOOLEAN DEFAULT FALSE`만 NOT NULL 가능 (기존 행은 FALSE로 안전)
**Warning signs:** 마이그레이션 실행 후 기존 API 응답이 달라지거나, 기존 문서 조회 시 에러 발생

### Pitfall 2: Template code/prefix 충돌
**What goes wrong:** 커스텀 템플릿 생성 시 기존 하드코딩 코드(GENERAL, EXPENSE 등)나 prefix(GEN, EXP 등)와 충돌
**Why it happens:** 관리자가 직접 code/prefix를 입력할 수 있게 함
**How to avoid:** code는 `CUSTOM_{id}` 자동 생성. prefix는 사용자 입력이되 기존 prefix(GEN, EXP, LV, PUR, BT, OT) 예약 목록과 중복 검증. doc_sequence 테이블에서 template_code + year unique key 확인
**Warning signs:** 문서 채번 시 중복 번호 생성, "unique constraint violation" 에러

### Pitfall 3: 스키마 스냅샷에 옵션 정보 누락
**What goes wrong:** document_content.schema_definition_snapshot에 스키마만 저장하고 select 필드의 옵션 목록을 포함하지 않음. 나중에 옵션이 변경되면 기존 문서의 select 값을 표시할 수 없음
**Why it happens:** 옵션은 option_set 테이블에 있으므로 스키마 JSON에 포함하지 않음
**How to avoid:** D-08에 따라 스냅샷 저장 시 option_set의 현재 옵션 목록을 resolve하여 스키마에 인라인 포함. `config.optionSetId` 참조 대신 `config.options: [{value, label}]`로 펼쳐서 저장
**Warning signs:** 옵션 수정 후 기존 문서의 select 필드에 값만 보이고 라벨이 안 보임

### Pitfall 4: DocumentFormValidator fallback에서 FormValidationException 미통합
**What goes wrong:** DynamicFormValidator가 `Map<String, List<String>>` 형태로 에러를 반환하는데, 기존 DocumentFormValidator는 BusinessException을 throw. 에러 형식 불일치
**Why it happens:** 기존 검증기는 단일 메시지 BusinessException, 동적 검증기는 필드별 다중 에러
**How to avoid:** 새 FormValidationException 클래스를 만들어 `Map<String, List<String>> fieldErrors`를 담고, GlobalExceptionHandler에서 필드별 에러 맵으로 응답. 기존 BusinessException 처리는 그대로 유지
**Warning signs:** 동적 양식 검증 실패 시 프론트엔드에서 에러 메시지를 파싱할 수 없음

### Pitfall 5: H2 테스트 DB에서 JSON 칼럼 호환성 문제
**What goes wrong:** Flyway 마이그레이션에서 `JSON` 타입을 사용하는데 H2 DB가 MariaDB의 JSON 타입과 호환되지 않음
**Why it happens:** MariaDB에서 JSON은 LONGTEXT의 alias. H2에서는 별도 JSON 타입 지원
**How to avoid:** 마이그레이션 SQL에서 `JSON` 대신 `LONGTEXT`를 사용하거나, H2용 별도 마이그레이션 작성. 또는 H2의 MariaDB 호환 모드 사용 (`MODE=MariaDB`)
**Warning signs:** 테스트 실행 시 Flyway 마이그레이션 실패, "Unknown data type: JSON" 에러

## Code Examples

### JSON 스키마 포맷 (확정된 구조)
```json
{
  "version": 1,
  "fields": [
    {
      "id": "f_abc123",
      "type": "text",
      "label": "제목",
      "required": true,
      "config": {
        "placeholder": "제목을 입력하세요",
        "maxLength": 200
      }
    },
    {
      "id": "f_def456",
      "type": "number",
      "label": "금액",
      "required": true,
      "config": {
        "min": 0,
        "max": 100000000,
        "unit": "원"
      }
    },
    {
      "id": "f_ghi789",
      "type": "select",
      "label": "구분",
      "required": true,
      "config": {
        "optionSetId": 1,
        "placeholder": "선택하세요"
      }
    },
    {
      "id": "f_jkl012",
      "type": "table",
      "label": "항목 목록",
      "required": false,
      "config": {
        "minRows": 1,
        "maxRows": 20,
        "columns": [
          {
            "id": "c_col01",
            "type": "text",
            "label": "품목",
            "required": true,
            "config": { "maxLength": 100 }
          },
          {
            "id": "c_col02",
            "type": "number",
            "label": "수량",
            "required": true,
            "config": { "min": 1 }
          }
        ]
      }
    },
    {
      "id": "f_mno345",
      "type": "staticText",
      "label": "안내사항",
      "required": false,
      "config": {
        "content": "* 제출 후 수정이 불가합니다."
      }
    },
    {
      "id": "f_pqr678",
      "type": "hidden",
      "label": "부서코드",
      "required": false,
      "config": {
        "defaultValue": "AUTO"
      }
    }
  ],
  "conditionalRules": [],
  "calculationRules": []
}
```

### Flyway V8 마이그레이션 (핵심)
```sql
-- V8__add_template_schema_support.sql
-- approval_template 확장
ALTER TABLE approval_template
    ADD COLUMN schema_definition JSON NULL COMMENT '동적 양식 JSON 스키마 정의',
    ADD COLUMN schema_version INT NOT NULL DEFAULT 0 COMMENT '현재 스키마 버전 (0=하드코딩)',
    ADD COLUMN is_custom BOOLEAN NOT NULL DEFAULT FALSE COMMENT '커스텀 양식 여부',
    ADD COLUMN category VARCHAR(50) NULL COMMENT '양식 분류',
    ADD COLUMN icon VARCHAR(50) NULL COMMENT '양식 아이콘',
    ADD COLUMN created_by BIGINT NULL COMMENT '양식 생성자';

ALTER TABLE approval_template
    ADD CONSTRAINT fk_template_created_by
    FOREIGN KEY (created_by) REFERENCES user(id);

-- document_content 확장
ALTER TABLE document_content
    ADD COLUMN schema_version INT NULL COMMENT '문서 생성 시점의 스키마 버전 (NULL=하드코딩)',
    ADD COLUMN schema_definition_snapshot JSON NULL COMMENT '문서 생성 시점의 스키마 스냅샷';
```

### Flyway V9 마이그레이션 (스키마 버전 이력)
```sql
-- V9__create_template_schema_version.sql
CREATE TABLE template_schema_version (
    id                  BIGINT AUTO_INCREMENT PRIMARY KEY,
    template_id         BIGINT NOT NULL,
    version             INT NOT NULL,
    schema_definition   JSON NOT NULL COMMENT '해당 버전의 스키마 정의',
    change_summary      VARCHAR(500) NULL COMMENT '변경 요약',
    created_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by          BIGINT NULL,
    UNIQUE KEY uk_template_version (template_id, version),
    FOREIGN KEY (template_id) REFERENCES approval_template(id),
    FOREIGN KEY (created_by) REFERENCES user(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='양식 스키마 버전 이력 (append-only)';
```

### Flyway V10 마이그레이션 (옵션 테이블)
```sql
-- V10__create_option_tables.sql
CREATE TABLE option_set (
    id          BIGINT AUTO_INCREMENT PRIMARY KEY,
    name        VARCHAR(100) NOT NULL COMMENT '옵션 세트 이름 (관리용)',
    code        VARCHAR(50) NOT NULL UNIQUE COMMENT '옵션 세트 코드',
    description VARCHAR(500) NULL,
    is_active   BOOLEAN NOT NULL DEFAULT TRUE,
    created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='공유 옵션 세트';

CREATE TABLE option_item (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,
    option_set_id   BIGINT NOT NULL,
    value           VARCHAR(100) NOT NULL COMMENT '저장되는 값 (영문 코드)',
    label           VARCHAR(200) NOT NULL COMMENT '표시 라벨 (한글)',
    sort_order      INT NOT NULL DEFAULT 0,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uk_option_set_value (option_set_id, value),
    FOREIGN KEY (option_set_id) REFERENCES option_set(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='옵션 항목';
```

### 템플릿 CRUD API 엔드포인트 설계 (권장)
```
GET    /api/v1/templates                     # 기존: 활성 양식 목록 (일반 사용자용)
GET    /api/v1/admin/templates               # NEW: 전체 양식 목록 (관리자용, 비활성 포함)
GET    /api/v1/admin/templates/{id}          # NEW: 양식 상세 (스키마 포함)
POST   /api/v1/admin/templates               # NEW: 커스텀 양식 생성
PUT    /api/v1/admin/templates/{id}          # NEW: 양식 수정 (스키마 변경 시 자동 버전 증가)
PATCH  /api/v1/admin/templates/{id}/activate # NEW: 양식 활성화/비활성화
GET    /api/v1/admin/templates/{id}/versions # NEW: 스키마 버전 이력 조회

GET    /api/v1/admin/option-sets             # NEW: 옵션 세트 목록
POST   /api/v1/admin/option-sets             # NEW: 옵션 세트 생성
PUT    /api/v1/admin/option-sets/{id}        # NEW: 옵션 세트 수정
```

### nanoid 필드 ID 생성
```java
import com.aventrix.jnanoid.jnanoid.NanoIdUtils;

public class FieldIdGenerator {
    private static final char[] ALPHABET =
        "0123456789abcdefghijklmnopqrstuvwxyz".toCharArray();
    private static final int ID_LENGTH = 12;

    public static String generate() {
        return "f_" + NanoIdUtils.randomNanoId(
            NanoIdUtils.DEFAULT_NUMBER_GENERATOR, ALPHABET, ID_LENGTH);
    }

    public static String generateColumnId() {
        return "c_" + NanoIdUtils.randomNanoId(
            NanoIdUtils.DEFAULT_NUMBER_GENERATOR, ALPHABET, ID_LENGTH);
    }
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| JSON Schema Draft 7 validator | 커스텀 포맷 + 순수 Java 검증 | D-12 결정 | 외부 라이브러리 불필요, 커스텀 타입 지원 용이 |
| 단일 테이블 스키마 저장 | append-only 버전 테이블 분리 | D-09 결정 | 기존 문서 무결성 보장, 버전별 롤백 가능 |
| 하드코딩 옵션 | option_set/option_item 테이블 | D-06 결정 | 옵션 재사용, 관리 편의성 |

## Open Questions

1. **H2 테스트에서 JSON 칼럼 처리 방식**
   - What we know: MariaDB에서 JSON은 LONGTEXT alias. H2는 자체 JSON 타입 지원
   - What's unclear: 기존 테스트 설정에서 H2 모드가 무엇인지 (MODE=MariaDB인지)
   - Recommendation: 마이그레이션에서 JSON 대신 LONGTEXT 사용하거나, 기존 테스트 설정 확인 후 H2 호환 처리

2. **schema_version DEFAULT 0 vs NULL**
   - What we know: D-15에서 `schema_version INT DEFAULT 0` 결정. 하드코딩 양식은 0
   - What's unclear: document_content에서는 D-16에서 `schema_version INT NULL` (NULL=하드코딩)로 다른 convention
   - Recommendation: approval_template은 0=하드코딩, document_content은 NULL=하드코딩으로 구분. 혼동 방지를 위해 코드 주석으로 명확화

3. **jnanoid Maven Central 가용성**
   - What we know: GitHub에서 2.0.0 존재 확인
   - What's unclear: Maven Central에 정확한 최신 릴리즈 확인 필요
   - Recommendation: 구현 시점에 `com.aventrix.jnanoid:jnanoid` Maven Central 검색. 없으면 직접 nanoid 함수 작성 (20줄 이하)

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | JUnit 5 + AssertJ (Spring Boot Test) |
| Config file | `backend/build.gradle.kts` (JUnitPlatform 설정) |
| Quick run command | `cd backend && ./gradlew test --tests "com.micesign.template.*" -x bootJar` |
| Full suite command | `cd backend && ./gradlew test -x bootJar` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SCHM-01 | Admin can create template via API with JSON schema | integration | `./gradlew test --tests "com.micesign.template.TemplateControllerTest" -x bootJar` | Wave 0 |
| SCHM-02 | Schema version auto-increments, documents retain original version | unit + integration | `./gradlew test --tests "com.micesign.template.TemplateSchemaServiceTest" -x bootJar` | Wave 0 |
| SCHM-03 | Backend rejects invalid form_data | unit | `./gradlew test --tests "com.micesign.template.DynamicFormValidatorTest" -x bootJar` | Wave 0 |
| SCHM-04 | 8 field types supported in schema | unit | `./gradlew test --tests "com.micesign.template.DynamicFormValidatorTest" -x bootJar` | Wave 0 |

### Sampling Rate
- **Per task commit:** `cd backend && ./gradlew test --tests "com.micesign.template.*" -x bootJar`
- **Per wave merge:** `cd backend && ./gradlew test -x bootJar`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `backend/src/test/java/com/micesign/template/DynamicFormValidatorTest.java` -- covers SCHM-03, SCHM-04
- [ ] `backend/src/test/java/com/micesign/template/TemplateSchemaServiceTest.java` -- covers SCHM-02
- [ ] `backend/src/test/java/com/micesign/template/TemplateControllerTest.java` -- covers SCHM-01 (integration)
- [ ] `backend/src/test/java/com/micesign/document/DocumentFormValidatorTest.java` -- EXISTING, fallback 테스트 추가 필요

## Sources

### Primary (HIGH confidence)
- 직접 코드 검사: `ApprovalTemplate.java`, `DocumentContent.java`, `DocumentFormValidator.java`, `FormValidationStrategy.java`, `GeneralFormValidator.java`, `TemplateService.java`, `TemplateController.java`, `TemplateMapper.java`, `TemplateResponse.java`, `ApprovalTemplateRepository.java`, `build.gradle.kts`, `V1__create_schema.sql`
- 기존 테스트 패턴: `DocumentFormValidatorTest.java` (JUnit 5 + AssertJ)
- 프로젝트 리서치: `.planning/research/SUMMARY.md`, `.planning/research/PITFALLS.md`

### Secondary (MEDIUM confidence)
- [MariaDB JSON Data Type](https://mariadb.com/docs/server/reference/data-types/string-data-types/json) -- JSON은 LONGTEXT alias, ALTER TABLE ADD COLUMN JSON 지원 확인
- [JNanoID GitHub](https://github.com/aventrix/jnanoid) -- Java nanoid 구현, 2.0.0
- [nanoid-java GitHub](https://github.com/albahrani/nanoid-java) -- 대안 구현

### Tertiary (LOW confidence)
- jnanoid Maven Central 가용성 -- 구현 시점에 확인 필요

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- 기존 프로젝트 스택 분석 완료, 새 의존성 최소화
- Architecture: HIGH -- 기존 코드 패턴(Strategy, MapStruct, Flyway) 검증 완료, fallback 패턴 설계 명확
- Pitfalls: HIGH -- PITFALLS.md 기반 + 실제 코드 검사로 확인

**Research date:** 2026-04-05
**Valid until:** 2026-05-05 (안정적 도메인, 외부 의존성 최소)

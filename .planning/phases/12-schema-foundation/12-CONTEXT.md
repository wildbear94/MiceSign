# Phase 12: Schema Foundation - Context

**Gathered:** 2026-04-05
**Status:** Ready for planning

<domain>
## Phase Boundary

JSON 스키마 포맷 설계, DB 마이그레이션, 템플릿 CRUD API, 백엔드 검증, 버전 관리 인프라 구축. UI 없이 API 레벨까지만 — 동적 양식의 기반을 만드는 단계.

</domain>

<decisions>
## Implementation Decisions

### JSON 스키마 포맷 설계
- **D-01:** 필드 ID는 자동 UUID(nanoid) 생성. 필드 이동/복사 시 충돌 없음. form_data에서 key로 사용
- **D-02:** 커스텀 JSON 포맷 사용 (JSON Schema Draft 7 아님). 루트 구조: `{ version, fields[], conditionalRules[], calculationRules[] }`
- **D-03:** conditionalRules와 calculationRules는 Phase 12에서 빈 배열로 자리만 예약. 실제 로직은 Phase 15에서 구현
- **D-04:** 8개 필드 타입 모두 동일한 `{ id, type, label, required, config }` 구조. staticText는 `config.content`, hidden은 `config.defaultValue` 사용
- **D-05:** table 필드의 columns는 동일한 필드 정의 구조를 중첩 재사용. `config.columns[]` 배열에 `{ id, type, label, required, config }` 형태로 정의. `config.minRows`, `config.maxRows` 지원

### Select 필드 옵션 관리
- **D-06:** select 옵션은 별도 DB 테이블(option_set + option_item)로 관리. 여러 템플릿에서 동일한 옵션 세트를 공유 가능
- **D-07:** 옵션은 value(영문 코드) + label(한글 표시) 분리. form_data에는 value만 저장
- **D-08:** ���션 변경은 기존 문서에 영향 없음. 스키마 스냅샷에 옵션 정보도 함께 보존하여 제출된 문서는 원래 옵션으로 표시

### 버전 관리 전략
- **D-09:** 별도 `template_schema_version` 테이블에 append-only로 모든 버전 이력 보존. `approval_template`에는 최신 버전만 유지
- **D-10:** 스키마 스냅샷은 문서 생성(Draft) 시점에 `document_content.schema_definition_snapshot`에 저장. 초안 작성 중 스키마 변경 시에도 사용자 경험 보호
- **D-11:** 스키마 변경 시 자동 버전 증가 (version+1). 별도 확인 다이얼로그 없이 바로 저장

### 백엔드 검증 방식
- **D-12:** 순수 Java 필드별 검증. JSON 스키마의 fields 배열을 순회하며 타입/필수값/min/max 직접 검증. 외부 라이브러리(json-schema-validator) 불필요
- **D-13:** 기존 DocumentFormValidator와 Fallback 패턴으로 통합. Strategy Map에 없는 templateCode일 때 DynamicFormValidator로 fallback. 기존 6개 양식 코드 수정 없음
- **D-14:** 검증 오류는 `{ fieldId: ["오류 메시지"] }` 맵 형태로 반환. 프론트엔드에서 필드별 인라인 오��� 표시 용이

### DB 마이그레이션 설계
- **D-15:** `approval_template` 확장: schema_definition(JSON NULL), schema_version(INT DEFAULT 0), is_custom(BOOLEAN DEFAULT FALSE), category(VARCHAR NULL), icon(VARCHAR NULL), created_by(BIGINT NULL FK) — 리서치 권장 칼럼 전체 추가
- **D-16:** `document_content` 확장: schema_version(INT NULL), schema_definition_snapshot(JSON NULL) 추가. NULL이면 하드코딩 양식
- **D-17:** 새 테이블 `template_schema_version`: id, template_id(FK), version(INT), schema_definition(JSON), created_at. append-only 이력
- **D-18:** 새 테이블 `option_set` + `option_item`: 공유 옵션 세트 관리용

### API 권한
- **D-19:** 템플릿 CRUD API는 ADMIN + SUPER_ADMIN 모두 접근 가능. 기존 조직 관리와 동일한 권한 체계

### Claude's Discretion
- API 엔드포인트 세부 설계 (URL 구조, 페이지네이션 방식)
- Flyway 마이그레이션 파일 번호 및 순서
- DynamicFormValidator 내부 검증 로직 세부 구현
- nanoid 길이 및 생성 방식
- option_set/option_item 테이블 세부 칼럼 구성

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### 제품 요구사항
- `docs/PRD_MiceSign_v2.0.md` — DB 스키마 DDL, 기술 스택, ���키텍처 결정사항
- `docs/FSD_MiceSign_v1.0.md` — API 계약, 비즈니스 규칙, 에러 코드

### 리서치
- `.planning/research/SUMMARY.md` — v1.2 리서��� 요약 (스택, 아키텍처, 듀얼 렌더링 경로, 피해야 할 기술)
- `.planning/research/ARCHITECTURE.md` — 아키텍처 접근 방식 상세
- `.planning/research/PITFALLS.md` — 핵심 함정 5가지 (스키마 마이그레이션, 듀얼 렌더링, eval 금지 등)

### 기존 코드 (변경 대상)
- `backend/src/main/java/com/micesign/domain/ApprovalTemplate.java` — 현재 approval_template 엔티티 (확장 대상)
- `backend/src/main/java/com/micesign/domain/DocumentContent.java` — 현재 document_content 엔티티 (확장 대상)
- `backend/src/main/java/com/micesign/service/DocumentFormValidator.java` — Fallback 패턴 적용 대상
- `backend/src/main/java/com/micesign/service/validation/FormValidationStrategy.java` — 기존 검증 인터페이스

### DB 마이그레이션
- `backend/src/main/resources/db/migration/V1__create_schema.sql` — 현재 스키마 (approval_template, document_content 테이블 구조 확인용)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `DocumentFormValidator` + `FormValidationStrategy` 패턴: 6개 양식별 검증 전략이 이미 Strategy 패턴으로 구현됨. DynamicFormValidator를 fallback으로 추가하면 기존 코드 변경 없이 통합 가능
- `ApprovalTemplate` 엔티티: code, name, prefix, is_active 등 기본 필드 보유. schema_definition 등 칼럼 추가만 필요
- `DocumentContent` 엔티티: body_html + form_data(JSON) 이미 지원. schema 관련 칼럼 추가만 필요
- Flyway 마이그레이션: V1~V7까지 기존 마이그레이션 존재. V8부터 추가

### Established Patterns
- Strategy 패턴 (FormValidationStrategy): 양식별 검증 로직 분리 — 동적 검증도 동일 패턴 사용
- JPA 엔티티 + Repository: 기존 도메인 모델 패턴 그대로 따름
- `@PreAuthorize` 어노테이션: RBAC 권한 체크 (ADMIN/SUPER_ADMIN)
- DTO record 클래스: 요청/응답 DTO로 Java record 사용

### Integration Points
- `DocumentService.createDocument()`: 문��� 생성 시 schema_definition_snapshot 저장 로직 추가 필요
- `DocumentFormValidator.validate()`: fallback 분기 추가
- `TemplateService` / `TemplateController`: 기존 조회 API 확장 + 새 CRUD API 추가

</code_context>

<specifics>
## Specific Ideas

- 듀얼 렌더링 경로: `schema_definition IS NULL` → 하드코딩 양식, non-null → 동적 양식. 이 판별 기준은 프로젝트 전체에서 일관 적용
- 기존 6개 하드코딩 양식(GENERAL, EXPENSE, LEAVE, PURCHASE, BUSINESS_TRIP, OVERTIME)의 FormValidationStrategy와 React 컴포넌트는 절대 수정하지 않음
- 공유 옵션 세트: 기존 leave_type 테이블이 이미 존재 — 향후 option_set으로 통합하거나 참조 가능

</specifics>

<deferred>
## Deferred Ideas

- 옵션 세트 관리 UI — Phase 14(Builder UI)에서 함께 구현
- 기존 leave_type 테이블을 option_set으로 마이그레이션 — Phase 16(Template Migration)에서 검토
- 필드 validation 규칙 확장 (regex, 커스텀 검증) — 필요시 별도 phase

None — discussion stayed within phase scope

</deferred>

---

*Phase: 12-schema-foundation*
*Context gathered: 2026-04-05*

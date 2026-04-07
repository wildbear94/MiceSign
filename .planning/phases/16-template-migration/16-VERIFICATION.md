---
phase: 16-template-migration
verified: 2026-04-06T09:45:00Z
status: gaps_found
score: 2/3 must-haves verified
gaps:
  - truth: "백엔드 빌드가 성공하고 모든 테스트가 통과한다"
    status: failed
    reason: "AdminTemplateService.java 삭제 시 AdminTemplateController.java를 함께 제거하지 않아 컴파일 에러 발생. ./gradlew test 실행 불가."
    artifacts:
      - path: "backend/src/main/java/com/micesign/controller/AdminTemplateController.java"
        issue: "삭제된 AdminTemplateService를 import/사용 중 -- 컴파일 에러 3건"
    missing:
      - "AdminTemplateController.java 삭제 또는 AdminTemplateService.java 복원 (컴파일 에러 해소)"
human_verification:
  - test: "기존 DRAFT 문서를 열어 하드코딩 Tiptap 에디터가 표시되는지 확인"
    expected: "마이그레이션 전 생성된 GENERAL DRAFT 문서가 하드코딩 편집기로 열림"
    why_human: "렌더링 분기 로직의 실제 동작은 브라우저에서만 확인 가능"
  - test: "기존 SUBMITTED 문서(GENERAL/EXPENSE/LEAVE) 상세 페이지에서 하드코딩 ReadOnly 컴포넌트 표시 확인"
    expected: "schemaDefinitionSnapshot이 없는 기존 문서가 하드코딩 ReadOnly로 정상 렌더링"
    why_human: "하드코딩 vs 동적 렌더러 차이를 시각적으로 확인 필요"
  - test: "신규 GENERAL 문서 생성 시 DynamicForm(textarea) 렌더링 확인"
    expected: "Tiptap 에디터가 아닌 textarea 기반 동적 폼이 표시"
    why_human: "렌더링 결과 시각적 확인 필요"
  - test: "신규 PURCHASE 문서 생성/저장 후 상세 페이지에서 DynamicReadOnly 표시 확인"
    expected: "동적 스키마 기반 읽기 전용 렌더링이 정상 동작"
    why_human: "동적 문서 전체 라이프사이클(생성->저장->읽기) 브라우저 검증 필요"
---

# Phase 16: Template Migration Verification Report

**Phase Goal:** 6개 하드코딩 폼 템플릿을 JSON 스키마로 변환하고, 듀얼 렌더링 모드로 기존 문서와 신규 문서가 모두 정상 표시되도록 한다.
**Verified:** 2026-04-06T09:45:00Z
**Status:** gaps_found
**Re-verification:** No -- initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | 6개 템플릿(GENERAL, EXPENSE, LEAVE, PURCHASE, BUSINESS_TRIP, OVERTIME)의 JSON schema_definition이 DB에 존재한다 (MIGR-01) | VERIFIED (코드 기준) | V9__seed_legacy_template_schemas.sql에 6개 UPDATE 문 존재. TemplateSchemaTest.java에 6개 템플릿 필드 수/타입/라벨 검증 테스트 존재. 단, 컴파일 에러로 테스트 실행 불가. |
| 2 | 듀얼 렌더링: 기존 문서는 하드코딩, 신규 문서는 동적 렌더러 사용 (MIGR-02) | VERIFIED (코드 기준) | DocumentEditorPage.tsx L120-122: `useHardcodedEditor` 분기 로직 구현됨. DocumentDetailPage.tsx L104-117: `schemaDefinitionSnapshot` 기반 DynamicReadOnly 분기 존재. 백엔드 파이프라인(DocumentService 스냅샷 저장, DocumentFormValidator 동적 폴백, DTO/Mapper 확장) 모두 구현됨. |
| 3 | 기존 문서(drafts/submitted)가 마이그레이션 후 데이터 변경 없이 정상 표시된다 (MIGR-03) | VERIFIED (코드 기준) | V9 마이그레이션에 document_content 테이블 UPDATE/ALTER 없음. 하드코딩 밸리데이터(GENERAL/EXPENSE/LEAVE) 변경 없이 유지. 프론트엔드 분기에서 `schemaDefinitionSnapshot` 없는 문서는 하드코딩 렌더러로 처리. |

**Score:** 2/3 truths verified (Truth 1, 2, 3 모두 코드 수준에서 구현 확인되나, 컴파일 에러로 인해 테스트 실행 검증 불가)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `backend/src/test/java/com/micesign/template/TemplateSchemaTest.java` | 6개 템플릿 스키마 필드 구조 검증 | VERIFIED | 167줄. 6개 테스트 메서드, assertField 헬퍼 포함. |
| `backend/src/main/resources/db/migration/V9__seed_legacy_template_schemas.sql` | 6개 레거시 템플릿 JSON 스키마 시드 | VERIFIED | 6개 UPDATE 문. GENERAL(2), EXPENSE(4+calcRules), LEAVE(8+conditionalRules), PURCHASE(5+calcRules), BUSINESS_TRIP(8+calcRules), OVERTIME(6). |
| `backend/src/main/java/com/micesign/domain/DocumentContent.java` | schemaVersion, schemaDefinitionSnapshot JPA 매핑 | VERIFIED | L24-28: schemaVersion(Integer), schemaDefinitionSnapshot(String LONGTEXT) 필드 및 getter/setter 존재. |
| `backend/src/main/java/com/micesign/service/DocumentFormValidator.java` | 동적 스키마 기반 폴백 밸리데이션 | VERIFIED | L18: 4-parameter validate 메서드. L23-26: default 케이스에 schemaDefinition null 체크 + 동적 밸리데이션. L33-86: validateDynamicFormData 구현(required 필드 검증, table 타입 minRows 검증). |
| `backend/src/main/java/com/micesign/service/DocumentService.java` | 스냅샷 저장 + validate 호출 수정 | VERIFIED | L55: validate 4-parameter 호출. L76-79: schemaDefinition != null일 때 스냅샷 저장. L90-92: updateDocument에서도 schemaDefinition 전달. |
| `backend/src/main/java/com/micesign/dto/document/DocumentDetailResponse.java` | schemaDefinitionSnapshot 필드 | VERIFIED | L15: `String schemaDefinitionSnapshot` record 파라미터. |
| `backend/src/main/java/com/micesign/mapper/DocumentMapper.java` | schemaDefinitionSnapshot 매핑 | VERIFIED | L21: `@Mapping(target = "schemaDefinitionSnapshot", source = "content.schemaDefinitionSnapshot")` |
| `frontend/src/features/document/types/document.ts` | schemaDefinitionSnapshot 타입 | VERIFIED | L24: `schemaDefinitionSnapshot: string \| null` |
| `frontend/src/features/document/pages/DocumentEditorPage.tsx` | 듀얼 렌더링 분기 로직 | VERIFIED | L120-122: useHardcodedEditor 분기. L208-223: DynamicForm 렌더링 분기. |
| `frontend/src/features/document/pages/DocumentDetailPage.tsx` | DynamicReadOnly 폴백 통합 | VERIFIED | L7: DynamicReadOnly import. L104-117: 3-way 분기(하드코딩+스냅샷없음, 스냅샷있음, 둘다없음). |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| DocumentService.createDocument | DocumentContent.schemaDefinitionSnapshot | template.getSchemaDefinition() 스냅샷 저장 | WIRED | L76-79: `content.setSchemaDefinitionSnapshot(template.getSchemaDefinition())` |
| DocumentFormValidator.validate | ApprovalTemplate.schemaDefinition | 동적 폴백 밸리데이션 | WIRED | L18: 4th parameter로 schemaDefinition 수신. L24: null이 아니면 validateDynamicFormData 호출. |
| DocumentEditorPage.tsx | DynamicForm | template schemaDefinition 존재 여부로 분기 | WIRED | L120-122: `useHardcodedEditor` 로직. L208-223: DynamicForm 렌더링. |
| DocumentDetailPage.tsx | DynamicReadOnly | schemaDefinitionSnapshot 존재 여부로 폴백 | WIRED | L104-117: `doc.schemaDefinitionSnapshot` 조건 분기. |
| DocumentMapper | DocumentContent.schemaDefinitionSnapshot | MapStruct @Mapping | WIRED | L21: source/target 매핑 명시적 선언. |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| DocumentDetailPage.tsx | doc.schemaDefinitionSnapshot | useDocumentDetail -> API /api/v1/documents/{id} | DocumentMapper.toDetailResponse에서 content.schemaDefinitionSnapshot 매핑 | FLOWING |
| DocumentEditorPage.tsx | existingDoc.schemaDefinitionSnapshot | useDocumentDetail -> API | 동일 API 경로 | FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| 백엔드 컴파일 | `./gradlew compileJava` | AdminTemplateController 컴파일 에러 3건 | FAIL |
| 프론트엔드 타입체크 | `npx tsc --noEmit` | 에러 없음 (출력 없음) | PASS |
| TemplateSchemaTest 실행 | `./gradlew test --tests "*TemplateSchema*"` | 컴파일 에러로 실행 불가 | FAIL |
| V9 마이그레이션 6개 UPDATE | `grep -c "UPDATE approval_template" V9*.sql` | 6 | PASS |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-----------|-------------|--------|----------|
| MIGR-01 | 16-01 | 6개 하드코딩 폼의 JSON 스키마 등가물 생성 | VERIFIED (코드) | V9 마이그레이션 6개 UPDATE + TemplateSchemaTest 6개 메서드 |
| MIGR-02 | 16-01, 16-02 | 듀얼 렌더링 모드 | VERIFIED (코드) | 백엔드 파이프라인(DocumentContent, Validator, Service, DTO, Mapper) + 프론트엔드 분기 로직 |
| MIGR-03 | 16-01, 16-02 | 기존 문서 데이터 무변경 | VERIFIED (코드) | V9에 document_content 변경 없음 + 하드코딩 밸리데이터 유지 + 프론트엔드 레거시 분기 |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `backend/src/main/java/com/micesign/controller/AdminTemplateController.java` | 8, 18, 20 | 삭제된 AdminTemplateService 참조 -- 컴파일 에러 | BLOCKER | 전체 백엔드 빌드 실패. 모든 테스트 실행 불가. |

### Human Verification Required

### 1. 기존 DRAFT 문서 하드코딩 에디터 확인

**Test:** 마이그레이션 전 생성된 GENERAL DRAFT 문서를 열어 편집
**Expected:** 하드코딩 Tiptap 에디터가 표시됨 (textarea가 아님)
**Why human:** 렌더링 분기 로직의 실제 동작은 브라우저에서만 확인 가능

### 2. 기존 SUBMITTED 문서 하드코딩 ReadOnly 확인

**Test:** 기존 SUBMITTED 문서(GENERAL/EXPENSE/LEAVE) 상세 페이지 확인
**Expected:** schemaDefinitionSnapshot이 없는 기존 문서가 하드코딩 ReadOnly로 정상 렌더링
**Why human:** 하드코딩 vs 동적 렌더러 차이를 시각적으로 확인 필요

### 3. 신규 GENERAL 문서 동적 렌더러 확인

**Test:** 새 문서 만들기 -> GENERAL 템플릿 선택
**Expected:** Tiptap 에디터가 아닌 textarea 기반 동적 폼(DynamicForm)이 표시
**Why human:** 렌더링 결과 시각적 확인 필요

### 4. 신규 PURCHASE 문서 전체 라이프사이클

**Test:** PURCHASE 템플릿으로 신규 문서 생성 -> 저장 -> 상세 페이지 확인
**Expected:** 동적 스키마 기반 DynamicReadOnly 렌더링이 정상 동작
**Why human:** 동적 문서 전체 라이프사이클(생성->저장->읽기) 브라우저 검증 필요

### Gaps Summary

**1개 블로커 갭 발견:**

Phase 16 Plan 01 실행 중 `AdminTemplateService.java`를 삭제했지만 (이전 phase에서 revert된 잔존 파일 정리), 이를 참조하는 `AdminTemplateController.java`를 함께 제거하지 않았다. 이로 인해 백엔드 전체가 컴파일되지 않으며, TemplateSchemaTest를 포함한 모든 백엔드 테스트를 실행할 수 없다.

**수정 방법:** `AdminTemplateController.java`를 삭제하면 컴파일 에러가 해소되고, TemplateSchemaTest 6개 테스트 실행이 가능해진다.

코드 수준에서는 Phase 16의 모든 구현(스키마 시드, 백엔드 파이프라인, 프론트엔드 듀얼 렌더링)이 올바르게 완성되어 있으나, 빌드 실패로 인해 자동화 검증(테스트 통과)을 확인할 수 없는 상태이다.

---

_Verified: 2026-04-06T09:45:00Z_
_Verifier: Claude (gsd-verifier)_

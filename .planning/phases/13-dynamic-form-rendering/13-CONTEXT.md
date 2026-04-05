# Phase 13: Dynamic Form Rendering - Context

**Gathered:** 2026-04-05
**Status:** Ready for planning

<domain>
## Phase Boundary

JSON 스키마 기반으로 동적 양식을 편집 모드와 읽기 전용 모드로 렌더링. 8개 필드 타입 모두 기능 동작, 런타임 Zod 검증, table 필드 동적 행 지원. 하드코딩 양식과 동일한 품질의 UX 제공.

</domain>

<decisions>
## Implementation Decisions

### 동적 폼 통합 방식
- **D-01:** Registry fallback 패턴 — `TEMPLATE_REGISTRY[code]`에 없는 templateCode일 때 `DynamicForm`/`DynamicReadOnly` 컴포넌트를 자동 렌더링. 기존 EditorPage/DetailPage 최소 변경
- **D-02:** 기존 제목(title) 필드는 DocumentEditorPage가 관리 유지 — DynamicForm은 스키마 필드만 렌더링. 하드코딩 양식과 동일한 UX
- **D-03:** TemplateSelectionModal에서 하드코딩 6개 + 동적 템플릿을 통합 리스트로 표시. API에서 동적 템플릿 가져와 하단에 추가. 사용자 입장에서 구분 없음

### 필드 컴포넌트 UX
- **D-04:** select 필드는 Headless UI Combobox 사용 — 검색 가능한 드롭다운으로 옵션이 많을 때도 편리
- **D-05:** date 필드는 react-day-picker 라이브러리 사용 — 일관된 커스텀 캘린더 UI, 브라우저 무관
- **D-06:** table 필드는 하단 "+ 행 추가" 버튼 + 행별 X 삭제 버튼. 기존 ExpenseForm과 동일한 패턴으로 일관성 유지
- **D-07:** 단일 칼럼 스택 레이아웃 — 모든 필드가 세로로 한 칸씩 쌓임. 라벨은 필드 위, 필수는 라벨 옆 * 표시. 기존 하드코딩 양식과 동일한 패턴

### Zod 런타임 생성 전략
- **D-08:** 폼 마운트 시 useMemo로 Zod 스키마 한 번 생성 → react-hook-form zodResolver로 전달. 실시간 인라인 검증 지원
- **D-09:** 한국어 에러 메시지 직접 생성 — schemaToZod 변환 시 필드 label 활용하여 "제목을 입력해주세요" 같은 한국어 메시지 생성. 기존 양식과 동일한 언어 경험
- **D-10:** table 필드 Zod는 중첩 자동 변환 — columns를 재귀적으로 z.object 변환, z.array(...).min(minRows).max(maxRows)로 행 수 제한. 셀별 검증 자동 지원

### 읽기 전용 렌더링
- **D-11:** 편집 모드와 동일한 폼 구조 유지 — 라벨-값 레이아웃으로 표시, input 대신 텍스트 렌더링. 기존 GeneralReadOnly와 동일한 패턴
- **D-12:** 빈 필드는 라벨 + "—" (em dash) 표시 — 폼 구조가 일관되어 어떤 필드가 있는지 확인 가능

### Claude's Discretion
- DynamicForm/DynamicReadOnly 컴포넌트 내부 구조 및 파일 분리 방식
- schemaToZod 유틸리티 함수 구조 및 위치
- checkbox/radio 필드의 세부 스타일링
- staticText/hidden 필드의 렌더링 처리
- number 필드의 string→number coerce 처리 방식
- Headless UI / react-day-picker 세부 설정 및 스타일링

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### 제품 요구사항
- `docs/PRD_MiceSign_v2.0.md` — DB 스키마 DDL, 기술 스택, 아키텍처 결정사항
- `docs/FSD_MiceSign_v1.0.md` — API 계약, 비즈니스 규칙, 에러 코드

### Phase 12 컨텍스트 (스키마 기반)
- `.planning/phases/12-schema-foundation/12-CONTEXT.md` — JSON 스키마 포맷 설계 결정 (D-01~D-19), 필드 구조, 옵션 관리, 버전 관리 전략
- `.planning/phases/12-schema-foundation/12-01-SUMMARY.md` — 엔티티/DTO/Repository 구현 내역
- `.planning/phases/12-schema-foundation/12-02-SUMMARY.md` — 템플릿 CRUD API, 스키마 버전 관리 내역
- `.planning/phases/12-schema-foundation/12-03-SUMMARY.md` — DynamicFormValidator, 스키마 스냅샷 구현 내역

### 리서치
- `.planning/research/SUMMARY.md` — v1.2 리서치 요약 (듀얼 렌더링 경로, 피해야 할 기술)
- `.planning/research/ARCHITECTURE.md` — 아키텍처 접근 방식 상세

### 기존 코드 (통합 대상)
- `frontend/src/features/document/components/templates/templateRegistry.ts` — TEMPLATE_REGISTRY, TemplateEditProps/TemplateReadOnlyProps 인터페이스 (fallback 지점)
- `frontend/src/features/document/pages/DocumentEditorPage.tsx` — 편집 페이지 (DynamicForm fallback 추가 지점)
- `frontend/src/features/document/pages/DocumentDetailPage.tsx` — 상세 페이지 (DynamicReadOnly fallback 추가 지점)
- `frontend/src/features/document/components/TemplateSelectionModal.tsx` — 템플릿 선택 모달 (동적 템플릿 추가 지점)
- `frontend/src/features/document/components/templates/GeneralForm.tsx` — 기존 하드코딩 양식 패턴 참고 (react-hook-form + Zod 사용)
- `frontend/src/features/document/components/templates/GeneralReadOnly.tsx` — 기존 읽기 전용 패턴 참고
- `frontend/src/features/document/components/templates/ExpenseForm.tsx` — 테이블 행 추가/삭제 패턴 참고
- `frontend/src/features/document/api/templateApi.ts` — 템플릿 API 클라이언트

### 백엔드 (Phase 12에서 구현 완료)
- `backend/src/main/java/com/micesign/dto/template/SchemaDefinition.java` — JSON 스키마 DTO (프론트엔드 타입 정의 참고)
- `backend/src/main/java/com/micesign/dto/template/FieldDefinition.java` — 필드 정의 DTO
- `backend/src/main/java/com/micesign/dto/template/FieldConfig.java` — 필드 설정 DTO (8개 필드 타입별 config)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `templateRegistry.ts`: `TemplateEditProps`/`TemplateReadOnlyProps` 인터페이스 — DynamicForm/DynamicReadOnly도 동일 인터페이스 구현 가능
- `GeneralForm.tsx`: react-hook-form + zodResolver 패턴 — 동적 폼도 동일 패턴으로 런타임 Zod 적용
- `ExpenseForm.tsx`: useFieldArray로 테이블 행 추가/삭제 — table 필드 구현 시 동일 패턴 활용
- `templateApi.ts`: 기존 템플릿 API 클라이언트 — 동적 템플릿 조회 API 추가
- `TiptapEditor` 컴포넌트: 기존 리치 텍스트 에디터 — textarea 필드와는 별도 (bodyHtml용)

### Established Patterns
- react-hook-form + Zod: 모든 기존 양식에서 사용 — 동적 폼도 동일하게 zodResolver 적용
- TailwindCSS 스타일링: 모든 UI 컴포넌트에서 사용 — 동적 필드 컴포넌트도 Tailwind 클래스
- i18next: 기존 양식 라벨/에러에 사용 — 동적 폼의 에러 메시지는 스키마에서 직접 생성 (i18n 키 불필요)
- Feature-based 디렉토리 구조: `features/document/components/` — 동적 폼 컴포넌트도 동일 위치

### Integration Points
- `DocumentEditorPage.tsx:196`: `TEMPLATE_REGISTRY[resolvedTemplateCode]` — fallback 분기 추가 지점
- `DocumentDetailPage.tsx:43-44`: `TEMPLATE_REGISTRY[doc.templateCode]` — 읽기 모드 fallback 추가 지점
- `TemplateSelectionModal.tsx`: 동적 템플릿 API 호출 추가 필요
- `templateApi.ts`: 동적 템플릿 목록/상세 API 엔드포인트 추가

</code_context>

<specifics>
## Specific Ideas

- 듀얼 렌더링 경로 판별: `schema_definition IS NULL` → 하드코딩 양식, non-null → 동적 양식. Phase 12에서 결정된 기준을 프론트엔드에서도 일관 적용
- 기존 6개 하드코딩 양식 컴포넌트는 절대 수정하지 않음 — 새 DynamicForm/DynamicReadOnly는 별도 컴포넌트
- select 옵션은 스키마 스냅샷에 포함되어 있으므로, 읽기 전용 시 value→label 매핑을 스냅샷에서 resolve
- Headless UI Combobox와 react-day-picker는 새 의존성 추가 필요 (package.json)

</specifics>

<deferred>
## Deferred Ideas

- 필드 width 설정 (full/half) — Phase 14 Builder UI에서 스키마에 width 속성 추가 시 지원
- 조건부 필드 표시/숨김 — Phase 15 Advanced Logic에서 구현
- 계산 필드 자동 계산 — Phase 15 Advanced Logic에서 구현
- 옵션 세트 관리 UI — Phase 14 Builder UI에서 함께 구현
- PDF 출력용 레이아웃 — 별도 phase에서 검토

None — discussion stayed within phase scope

</deferred>

---

*Phase: 13-dynamic-form-rendering*
*Context gathered: 2026-04-05*

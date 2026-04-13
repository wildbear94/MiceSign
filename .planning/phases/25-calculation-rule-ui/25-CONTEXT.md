# Phase 25: 계산 규칙 UI — Context

**Gathered:** 2026-04-13
**Status:** Ready for planning

<domain>
## Phase Boundary

관리자가 number 필드에 자동 계산 공식을 설정하고, 설정한 공식의 오류(순환 의존성, 참조 오류 등)를 사전에 방지할 수 있는 편집 UI를 구축한다. 공식 실행(`executeCalculations`)과 순환 감지(`detectCircularDeps`)는 Phase 24.1 까지 이미 완성되어 있으므로, Phase 25 는 **100% admin 편집 UI 작업** 이다. 미리보기 실시간 실행은 Phase 22 split layout 의 FormPreview interactive mode 위에 얹히며, 동일한 유틸리티를 공유한다.

</domain>

<decisions>
## Implementation Decisions

### Phase 24 패턴에서 상속된 결정 (ConditionalRule UI 와 동일)

- **D-01:** FieldConfigEditor 내부에 접기/펼치기 '계산 규칙' 섹션으로 배치 — 기본 설정 아래, 조건 규칙 섹션 옆/아래. Phase 24 D-01 과 동일 패턴
- **D-02:** 필드당 계산 규칙 1개만 허용 — `SchemaDefinition.calculationRules[]` 중 해당 `targetFieldId` 에 대해 유일
- **D-03:** 빈 상태(규칙 없음)는 '계산 규칙이 없습니다' 안내 문구 + '계산 추가' 버튼 표시
- **D-04:** 규칙 삭제는 즉시 삭제 — 확인 다이얼로그 없이 즉시 제거. select 옵션 삭제와 동일 패턴 (저장 전까지 언도 가능)
- **D-05:** 데이터 관리는 중앙 배열 유지 — `SchemaDefinition.calculationRules[]` 중앙 관리, UI 에서는 `targetFieldId` 로 필터링
- **D-06:** 필드 삭제 시 관련 계산 규칙 자동 제거 + 토스트 ('계산 규칙 N개가 자동 제거되었습니다')
- **D-07:** 양방향 정리 — 삭제/변경된 필드가 타겟이든 `dependsOn` 소스든 관련 규칙 모두 제거
- **D-08:** 필드 타입 변경 시 해당 규칙 자동 제거 + 토스트 — 타겟이 number→다른 타입이 되거나, 소스가 number→다른 타입이 되면 공식이 무효화되므로 안전하게 제거
- **D-09:** 필드 라벨 변경은 규칙에 영향 없음 — 규칙은 필드 ID 기반
- **D-10:** 유효성 검사는 프론트엔드 전용 — 저장 시 존재하지 않는 필드 ID, 파싱 실패 등 체크. 백엔드는 `schemaDefinition` JSON 을 그대로 저장
- **D-11:** 유효성 검증 실패 시 에러 토스트 + 저장 버튼 disabled — 기존 양식 저장 검증 패턴
- **D-12:** i18n 키 — `admin.templates.calculation.*` 네임스페이스 (`templates.calculation.presets.sum`, `templates.calculation.noRule`, `templates.calculation.errors.circularDependency` 등)
- **D-13:** 타입 재사용 — `frontend/src/features/document/types/dynamicForm.ts` 의 `CalculationRule { targetFieldId, formula, dependsOn[] }` 재사용. 편집 UI 전용 helper 타입(`PresetType`, `PresetConfig` 등)만 `SchemaFieldEditor/types.ts` 에 추가

### Phase 25 특정 결정

#### 공식 입력 UX

- **D-14:** 하이브리드 입력 UX — 프리셋 버튼 + 고급 자유입력 모드 — 대부분 사용자는 프리셋으로 끝나고, 파워유저는 `고급 모드 ▼` 토글을 열어 자유 텍스트로 공식을 직접 입력. 내부 파서/실행기는 둘 다 동일하게 처리.
- **D-15:** 프리셋 기본 노출 4종 — (1) `SUM(테이블 컬럼)` 예: `SUM(items.price)` (2) `SUM(컬럼×컬럼)` 예: `SUM(items.price * items.qty)` (3) `필드합` 예: `A + B + C` (4) `비율` 예: `A / B * 100` . '차(A−B)' 와 '곱(A×B)' 은 고급 모드에서 자유입력으로 커버하거나 향후 프리셋 추가 여지로 남김
- **D-16:** 프리셋 선택 UI — 프리셋 종류 라디오/탭 → 프리셋별 파라미터 드롭다운(필드/컬럼 선택) → 공식 문자열 자동 생성 → 미리보기 영역에 1줄로 렌더. 사용자는 드롭다운만 건드려도 완성된 공식을 얻음
- **D-17:** 고급 모드 자유입력 — `single-line input` + 입력값이 executeCalculations 가 이해하는 포맷(`SUM(items.price * items.qty) * 1.1` 등)이면 그대로 저장. blur 시 파서가 검증
- **D-18:** 프리셋 ↔ 고급 모드 전환 시 — 프리셋에서 생성된 공식은 고급 모드로 전환해도 그대로 보존(편집 가능). 고급 모드에서 프리셋으로 돌아가면 현재 공식이 프리셋 포맷과 일치할 때만 프리셋 상태 복원, 아니면 `커스텀` 표시

#### 타겟 필드 허용 타입

- **D-19:** 타겟 필드는 number 타입만 — roadmap success criteria '관리자가 숫자 필드에 자동 계산 공식을 설정' 엄격 해석. table 내부 number 컬럼은 타겟에서 제외(row별 소계는 Phase 25 스코프 밖 — D-30 참조)
- **D-20:** 소스(참조) 필드는 두 종류 허용 — (a) 루트 레벨 number 필드, (b) table 필드의 number 타입 컬럼(`items.price` 형식). 다른 타입(text/textarea/date/select)은 소스에서 제외 — 숫자 연산이 의미 없음
- **D-21:** 자기참조 차단 — 타겟 필드를 소스로 참조할 수 없음 (드롭다운 제외)

#### dependsOn 추출

- **D-22:** `dependsOn[]` 는 공식에서 자동 추출 — 사용자는 공식만 작성/선택, 저장 시점에 파서가 필드/컬럼 레퍼런스를 정규식 기반으로 추출. UI 에 `dependsOn` 개념 노출하지 않음. 용도는 **순환 감지(`detectCircularDeps`)** 와 **실시간 재계산 트리거 종속성** 2가지
- **D-23:** 추출 규칙 — 식별자 패턴 `[a-zA-Z_]\w*(?:\.[a-zA-Z_]\w*)*` 매칭 + 예약어(`SUM`) 제거 + 숫자 리터럴 제거. `executeCalculations.ts` 의 `evaluateArithmetic` 가 이미 동일 정규식을 사용하므로 공통 util 로 추출 권장

#### 순환 의존성 경고

- **D-24:** 실시간 순환 감지 + 인라인 배너 + 저장 차단 — 공식 변경 시마다(프리셋 선택 완료 / 고급 모드 blur 시) `detectCircularDeps(allRules)` 호출. 순환 감지 시:
  - 해당 규칙 카드 하단에 빨간 인라인 배너 표시: `⚠ 순환 감지: A → B → A`
  - 사이클에 포함된 다른 규칙 카드에도 동일 배너 표시(양방향)
  - 전체 SchemaFieldEditor 저장 버튼 disabled + hover tooltip '계산 규칙에 순환 의존성이 있습니다'
  - 저장 시도 시 toast 에러 (이중 차단)

#### 필드 카드 배지 / 공식 미리보기

- **D-25:** 규칙 설정된 number 필드 카드 헤더에 **Σ 배지 아이콘** + **공식 1줄 미리보기** — Phase 24 의 ⚡ 배지 패턴 확장. 접힌 상태에서도 사용자는 공식을 빠르게 확인 가능. 포맷: `= SUM(items.price × items.qty)` (기호는 `*` 대신 `×` 로 렌더, `/` 대신 `÷` 등 한국어 친화적 렌더 — 내부 저장은 `*`/`/` 유지)

#### 공식 파싱 에러 표시

- **D-26:** blur 시 + 저장 시 2단계 에러 표시 — 입력 중(onChange)에는 에러 표시 안 함(noisy 방지)
  - blur 시: 고급 모드 input 에 빨간 테두리 + 하단 도움말 문구 (예: `존재하지 않는 필드 참조: xyz`, `닫히지 않은 괄호`, `숫자 아닌 리터럴: abc`)
  - 저장 시: 전체 규칙 재검증, 실패 시 toast 에러 + 저장 차단
- **D-27:** 에러 메시지 분류 (i18n 키) — `unknownField`, `unknownColumn`, `syntaxError`, `emptyFormula`, `invalidOperator`, `circularDependency`

#### 미리보기 실시간 계산

- **D-28:** Phase 22 split layout 의 FormPreview interactive mode 에 계산 기능 통합 — 사용자가 미리보기에서 소스 필드 값을 입력하면 즉시 `executeCalculations(rules, formValues)` 호출 → 타겟 number 필드에 계산 결과 반영. Phase 24.1 `DynamicCustomForm` 과 **동일한 executeCalculations 호출 로직**을 admin FormPreview 에도 적용(coordinating hook 공유 권장)
- **D-29:** 미리보기에서 계산 결과 필드는 disabled — 직접 입력 불가, 값은 계산 결과만 표시. Phase 24.1 `DynamicFieldRenderer` 의 `disabled` prop 패턴 재사용

#### 스코프 경계 (Phase 25 밖)

- **D-30:** table 내 row별 소계 표시 Phase 25 스코프 밖 — `SUM(items.price * items.qty)` 의 **row별 소계 컬럼** 자동 추가는 별도 feature. 현재는 전체 SUM 결과만 타겟 number 필드에 표시. Phase 26 (편의 기능) 이후 백로그 후보
- **D-31:** 저장 버튼 실패 상태의 fine-grained UX 는 Phase 24 저장 버튼 스타일과 동일하게 — disabled 버튼 + 상단 에러 요약 배너

### Claude's Discretion

- 프리셋 버튼의 정확한 Tailwind 스타일 / 아이콘 선택
- 고급 모드 토글 UI (토글 스위치 vs 텍스트 링크)
- Σ 배지의 정확한 lucide-react 아이콘 (Sigma / Calculator / FunctionSquare 등)
- 공식 1줄 미리보기의 truncation 길이
- 파서 에러 메시지의 정확한 한국어 문구
- 프리셋 파라미터 드롭다운의 배치(가로 / 세로)
- '고급 모드' 토글 레이블

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### 기존 타입 정의
- `frontend/src/features/document/types/dynamicForm.ts` — `CalculationRule { targetFieldId, formula, dependsOn[] }`, `SchemaDefinition.calculationRules?[]`
- `frontend/src/features/admin/components/SchemaFieldEditor/types.ts` — `SchemaField`, `SchemaFieldConfig`, `SchemaFieldType` 편집 UI 타입

### 계산 실행/순환 감지 로직 (이미 구현됨 — 재사용)
- `frontend/src/features/document/utils/executeCalculations.ts` — `executeCalculations()` 함수. SUM 패턴 + 사칙연산 + 컬럼 참조(`items.price`) + 체이닝 완전 구현. Phase 24.1 `DynamicCustomForm` 에서 사용 중
- `frontend/src/features/document/utils/detectCircularDeps.ts` — `detectCircularDeps(rules)` DFS 기반 사이클 반환. 실시간 호출 가능 (O(V+E))

### Phase 24 패턴 (레퍼런스)
- `frontend/src/features/admin/components/SchemaFieldEditor/ConditionalRuleEditor.tsx` — 필드당 1개 규칙 편집 UI 의 레퍼런스 패턴(빈 상태, 드롭다운 조합, 즉시 삭제)
- `frontend/src/features/admin/components/SchemaFieldEditor/conditionalRuleUtils.ts` — `getAvailableSourceFields`, 자기참조 차단 패턴
- `frontend/src/features/admin/components/SchemaFieldEditor/constants.ts` — `OPERATORS_BY_TYPE`, `ACTION_OPTIONS` 상수 패턴 (Phase 25 는 `PRESET_OPTIONS` 추가)
- `.planning/phases/24-ui/24-CONTEXT.md` — D-01~D-29 (조건 규칙 UI 결정사항 — Phase 25 가 D-01~D-13 으로 상속)

### Phase 22 split layout / 미리보기 인프라
- `frontend/src/features/admin/components/FormPreview/FormPreview.tsx` — interactive mode 미리보기 프레임워크
- `frontend/src/features/admin/components/FormPreview/PreviewFieldRenderer.tsx` — Phase 24.1 에서 `DynamicFieldRenderer` 위임으로 리팩터링됨. 계산 결과 필드 disabled 표시는 이 경로 통해야 함

### 편집기 루트
- `frontend/src/features/admin/components/SchemaFieldEditor/FieldConfigEditor.tsx` — '계산 규칙' 섹션 추가 지점
- `frontend/src/features/admin/components/SchemaFieldEditor/SchemaFieldEditor.tsx` — 전체 저장 버튼 disabled 제어 지점

</canonical_refs>

<deferred_ideas>
## Deferred Ideas

Phase 25 스코프 밖으로 결정되었으나 기록이 필요한 아이디어:

- **Table row별 소계 컬럼 자동 추가** — `SUM(items.price * items.qty)` 타겟에 row별 소계 컬럼 노출. executeCalculations 확장 필요(row-level expression 지원). Phase 26 이후 백로그.
- **추가 프리셋** — '차(A−B)', '곱(A×B)', '평균 AVG(col)', '최댓값 MAX(col)' 등. 현재 4종으로 시작 후 사용자 피드백에 따라 추가.
- **계산 결과 포맷팅** — 소수점 자릿수, 천단위 구분자, 통화 단위. 현재는 `executeCalculations` 가 `number` 만 반환, 포맷은 필드의 `config.unit` 에 맡김. 포맷 옵션 별도 저장 여부는 미결.
- **조건부 계산** — IF(조건) THEN 공식A ELSE 공식B 형태. executeCalculations 문법 대폭 확장 필요. 장기 로드맵.
- **공식 에러 즉시 피드백(실시간)** — G7 에서 noisy 우려로 blur 로 결정. 만약 사용자 피드백에서 '타이핑 중 힌트' 요청 시 debounce 기반 실시간 모드 추가 검토.

</deferred_ideas>

<next_steps>
## Next Steps

1. **Research phase:** `/gsd-plan-phase 25` 가 자동으로 `gsd-phase-researcher` 를 호출 (connfig 상 `research: true`)
   - Researcher 는 이 CONTEXT.md + canonical_refs 의 파일들을 실제로 읽어 구현 접근법, 재사용 가능한 코드 패턴, 리스크를 RESEARCH.md 에 정리
2. **Plan phase:** researcher 완료 후 `gsd-planner` 가 PLAN.md 작성 — 예상 plan 구조:
   - `25-01-PLAN.md`: 타입/상수/유틸 — `CalculationRule` 재사용 + `PRESET_OPTIONS` 상수 + `extractDependencies` util + i18n 키
   - `25-02-PLAN.md`: `CalculationRuleEditor.tsx` 컴포넌트 (프리셋 + 고급 모드 + 인라인 순환 배너) + FieldConfigEditor 통합
   - `25-03-PLAN.md`: 미리보기 실시간 계산 통합 (Phase 24.1 `DynamicCustomForm` 패턴을 admin FormPreview 에 이식) + 필드 카드 Σ 배지 + 저장 시 순환/파싱 검증 + 수동 UAT
3. **사용자 개입 필요 시점:** plan-phase 에서 plan-checker 가 gray area 를 감지하면 재질문. 본 CONTEXT 의 결정 31건이 충분히 dense 하면 재질문 없이 실행 단계로 직행.

</next_steps>

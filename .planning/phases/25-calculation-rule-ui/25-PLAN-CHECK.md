# Phase 25: 계산 규칙 UI — Plan Check Report

**Checked:** 2026-04-13
**Plans verified:** 25-01-PLAN.md, 25-02-PLAN.md, 25-03-PLAN.md
**Verdict:** PASS
**Issues:** 0 blocker / 1 warning / 2 info

---

## Overall Result

3개 plan 모두 Phase 25 Goal(CAL-01, CAL-02, 3개 성공 기준)을 달성하는 구조로 작성됨. `/gsd-execute-phase 25` 실행 가능.

---

## Check 1: Goal-Backward Coverage

| 성공 기준 | 담당 Plan/Task | 상태 |
|-----------|----------------|------|
| SC-1: 관리자가 숫자 필드 계산 탭에서 공식 설정 (SUM, 사칙연산, 테이블 컬럼 참조) | 25-02 Task 1 (CalculationRuleEditor 4종 프리셋), 25-02 Task 2 (FieldCard 통합), 25-01 Task 1 (i18n) | COVERED |
| SC-2: 미리보기 패널에서 실시간 계산 결과 표시 | 25-03 Task 1 (FormPreview useEffect + executeCalculations 통합) | COVERED |
| SC-3: 순환 의존성 실시간 경고 + 저장 차단 | 25-02 Task 2 (cycles useMemo, FieldCard 배너 양방향), 25-02 Task 3 (저장 차단) | COVERED |

---

## Check 2: CAL-01 / CAL-02 Requirement 매핑

| Plan | frontmatter requirements | CAL-01 구현 | CAL-02 구현 |
|------|--------------------------|-------------|-------------|
| 25-01 | CAL-01, CAL-02 | 타입/유틸 기반 | extractDependencies + validateFormula |
| 25-02 | CAL-01, CAL-02 | CalculationRuleEditor + FieldCard 통합 | cycles useMemo + 저장 검증 |
| 25-03 | CAL-01, CAL-02 | 미리보기 실시간 계산 | UAT Section 3 |

**NOTE:** REQUIREMENTS.md에 CAL-01/CAL-02 ID 미정의 → [I-01] Info 참조.

---

## Check 3: D-01 ~ D-31 Coverage

모든 31개 결정사항이 plan 내 task 또는 구조적 설계에 반영됨.

| 결정 범위 | 반영 상태 |
|-----------|-----------|
| D-01 ~ D-13 (Phase 24 상속) | 25-01 types/constants/i18n, 25-02 컴포넌트 구조 | COVERED |
| D-14 ~ D-18 (공식 입력 UX) | 25-02 Task 1 하이브리드 모드 | COVERED |
| D-19 ~ D-21 (타겟/소스 허용 타입) | 25-01 getAvailableCalcSources, 25-02 FieldCard number 조건 | COVERED |
| D-22 ~ D-23 (dependsOn 자동 추출) | 25-01 extractDependencies + FIELD_REF_PATTERN | COVERED |
| D-24 (순환 감지 + 배너 + 저장 차단) | 25-02 Task 2/3 cycles useMemo + 배너 + 저장 disabled | COVERED |
| D-25 (Σ 배지 + 1줄 미리보기) | 25-01 renderFormulaFriendly, 25-02 FieldCard 헤더 | COVERED |
| D-26 ~ D-27 (에러 표시 2단계) | 25-02 Task 1 blur, Task 3 저장 / 25-01 i18n errors.* | COVERED |
| D-28 ~ D-29 (미리보기 통합 + disabled) | 25-03 Task 1 | COVERED |
| D-30 (table row 소계 스코프 밖) | deferred_ideas로 올바르게 제외 | PASS |
| D-31 (저장 실패 UX Phase 24 동일) | 25-02 Task 3 disabled + tooltip | COVERED |

---

## Check 4: Pitfall 1~7 반영

| Pitfall | 반영 위치 | 상태 |
|---------|-----------|------|
| P-1: TemplateFormModal 하드코딩 손실 | 25-02 Task 3 + acceptance_criteria 부정 검사 | MITIGATED |
| P-2: FormPreview useEffect 무한 루프 | 25-03 Task 1 `changed` flag + 주석 명시 | MITIGATED |
| P-3: table 컬럼 타입 변경 cascade 누락 | 25-02 Task 2 `oldField.type==='table'` 분기 | MITIGATED |
| P-4: schemaToZod required 충돌 (admin 미리보기 외) | admin FormPreview는 useForm 없음으로 스코프 외 처리 | INFO — [I-02] |
| P-5: FormPreview useState 기반 (RHF 이식 불가) | 25-03 Task 1 옵션 A 채택 + 명시적 주석 | MITIGATED |
| P-6: 프리셋 ↔ 고급 모드 유령 상태 | 25-01 parseFormulaToPreset, 25-02 useMemo 파생 상태 | MITIGATED |
| P-7: 자기참조 고급 모드 우회 | 25-01 validateFormula selfReference + 25-02 handleAdvancedBlur | MITIGATED |

---

## Check 5: Wave / depends_on 체인

| Plan | wave | depends_on | 유효성 |
|------|------|------------|--------|
| 25-01 | 1 | [] | VALID |
| 25-02 | 2 | ["25-01"] | VALID |
| 25-03 | 3 | ["25-02"] | VALID |

순환 없음. 순차 체인 정확히 구성됨.

---

## Check 6: Runtime 불변성

| 파일 | 어느 plan에서도 files_modified 에 포함? | acceptance_criteria 명시? |
|------|----------------------------------------|--------------------------|
| executeCalculations.ts | 미포함 | 25-01 Task 2, 25-03 Task 1 |
| detectCircularDeps.ts | 미포함 | 25-03 Task 1 |
| DynamicCustomForm.tsx | 미포함 | 25-03 Task 1 |
| dynamicForm.ts | 미포함 | — (수정 불필요, 재사용만) |

**PASS** — 런타임 불변성 완전 보장됨.

---

## Check 7: 25-03 휴먼 게이트

- `autonomous: false` ✓
- `<task type="checkpoint:human-verify" gate="blocking">` ✓
- resume-signal: "approved" ✓

**PASS**

---

## Check 8: Task Atomicity

| Plan | Task | 파일 수 | 판정 |
|------|------|--------|------|
| 25-01 | Task 1 | 4 | 허용 (i18n 2개 + types/constants는 묶음 단위) |
| 25-01 | Task 2 | 1 | GOOD |
| 25-02 | Task 1 | 2 | GOOD |
| 25-02 | Task 2 | 3 | GOOD |
| 25-02 | Task 3 | 1 | GOOD |
| 25-03 | Task 1 | 4 | WARNING [W-01] |
| 25-03 | Task 2 | 1 | GOOD |

---

## Check 9: Acceptance Criteria 구체성

모든 task의 acceptance_criteria가 `grep` 가능한 코드 요소, `npx tsc --noEmit` exit 0, `npm run build` 성공, `git diff --stat` empty 검사 등 구체적 기준으로 작성됨. 모호한 기준 없음. **PASS**

---

## Issues

### Warnings

```yaml
issue:
  plan: "25-03"
  dimension: scope_sanity
  severity: warning
  description: "Task 1 파일 수 4개 — 임계치(3) 초과. TemplateFormModal.tsx가 25-02에 이어 재수정됨"
  task: 1
  files:
    - FormPreview.tsx
    - PreviewFieldRenderer.tsx
    - FullscreenPreviewPortal.tsx
    - TemplateFormModal.tsx
  fix_hint: |
    25-02 Task 3 (i)에서 'FormPreview 호출부는 25-03에서 추가 (옵션 A)' 로 이미 명시적 분리.
    의도적 설계이므로 수용 가능하나, executor는 25-02 Task 3 완료 후
    TemplateFormModal을 재확인해야 함을 유념할 것.
    대안: 25-03 Task 1을 (1a) FormPreview 3파일 수정 + (1b) TemplateFormModal prop 연결로 분리.
```

### Info

```yaml
issue:
  plan: null
  dimension: requirement_coverage
  severity: info
  description: "REQUIREMENTS.md에 CAL-01/CAL-02 ID 미정의. ROADMAP.md에만 기재됨"
  fix_hint: |
    phase 완료 후 REQUIREMENTS.md에 '### Calculation (Phase 25)' 섹션과
    CAL-01, CAL-02 항목 추가 권장. 기능적 GAP 아님 — RESEARCH.md의
    CALC-01~CALC-05 내부 분해가 커버함.
```

```yaml
issue:
  plan: "25-03"
  dimension: task_completeness
  severity: info
  description: "Pitfall 4 (schemaToZod required 충돌) — 사용자측 DynamicCustomForm 검증 항목이 UAT에 없음"
  task: 2
  fix_hint: |
    25-UAT.md Section 10 이후에 다음 항목 추가 권장:
    "사용자측에서 계산 결과 필드(total 등)가 포함된 양식으로 문서 제출 시
     required 에러가 발생하지 않는지 확인 (Phase 24.1 resolver 처리 회귀 검증)"
```

---

## Recommendation

Blocker 없음. Warning 1건은 executor가 파일 수정 순서를 인지하면 회피 가능.
`/gsd-execute-phase 25` 실행 가능.

# Phase 21: SchemaFieldEditor 리팩토링 - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-11
**Phase:** 21-SchemaFieldEditor 리팩토링
**Areas discussed:** 파일 분리 전략, 디렉토리 구조, 타입/상수 배치, FieldConfigEditor 분할 깊이, helper 함수 배치, import 경로 유지, 드래그&드롭 준비, 테스트 전략

---

## 파일 분리 전략

| Option | Description | Selected |
|--------|-------------|----------|
| 컴포넌트별 1파일 | FieldCard, FieldConfigEditor, TypeBadge, SchemaFieldEditor 각각 별도 파일 | ✓ |
| 기능 그룹별 분리 | editor.tsx (FieldCard + FieldConfigEditor), display.tsx (TypeBadge), main.tsx | |
| 최소 분리 | 타입/상수만 types.ts로 분리, 컴포넌트는 한 파일 유지 | |

**User's choice:** 컴포넌트별 1파일
**Notes:** 책임이 명확하고 Phase 22-25에서 개별 수정 시 영향 범위 최소화

---

## 디렉토리 구조

| Option | Description | Selected |
|--------|-------------|----------|
| SchemaFieldEditor/ 폴더 | 복합 컴포넌트만 폴더로 분리, index.tsx re-export | ✓ |
| schema-editor/ 폴더 | 기능명으로 폴더 이름 지정 (소문자+하이픈) | |
| 클로드 결정 | 폴더명은 구현 시 판단 | |

**User's choice:** SchemaFieldEditor/ 폴더
**Notes:** 기존 admin/components/ 패턴과 다르지만 복합 컴포넌트 분리에 적합

---

## 타입/상수 배치

| Option | Description | Selected |
|--------|-------------|----------|
| SchemaFieldEditor/types.ts | 컴포넌트 폴더 내부에 배치, 외부에서 import | ✓ |
| features/admin/types/ 공유 폴더 | admin 기능 전체 공유 타입 폴더 생성 | |
| 클로드 결정 | 구현 시 판단 | |

**User's choice:** SchemaFieldEditor/types.ts
**Notes:** 현재 범위에서 가장 간단하고, 추후 필요 시 상위로 이동 가능

---

## FieldConfigEditor 분할 깊이

| Option | Description | Selected |
|--------|-------------|----------|
| 파일만 분리 | FieldConfigEditor.tsx로 파일 분리, switch문 유지 | ✓ |
| 타입별 컴포넌트로 분할 | TextFieldConfig, NumberFieldConfig 등 개별 파일 | |
| 클로드 결정 | 200줄 기준에 맞춰 판단 | |

**User's choice:** 파일만 분리
**Notes:** 200줄 기준 근접하고, Phase 25 확장 시 추가 분할 가능

---

## helper 함수 배치

| Option | Description | Selected |
|--------|-------------|----------|
| utils.ts (폴더 내) | SchemaFieldEditor/utils.ts로 분리 | ✓ |
| 사용하는 컴포넌트 내부 | toFieldId를 FieldCard.tsx 내부에 배치 | |
| 클로드 결정 | 구현 시 판단 | |

**User's choice:** utils.ts (폴더 내)
**Notes:** Phase 22 등에서 재사용 가능하고 독립 테스트 가능

---

## import 경로 유지

| Option | Description | Selected |
|--------|-------------|----------|
| index.tsx barrel export | 기존 './SchemaFieldEditor' 경로 그대로 동작 | ✓ |
| 모든 import 경로 직접 수정 | barrel export 없이 각 파일 직접 import | |

**User's choice:** index.tsx barrel export
**Notes:** 기존 TemplateFormModal의 import 경로 변경 불필요

---

## 드래그&드롭 준비

| Option | Description | Selected |
|--------|-------------|----------|
| 지금은 준비 안 함 | 현재 버튼 방식 유지, YAGNI 원칙 | ✓ |
| moveField 콜백 추상화 | onReorder 콜백으로 추상화해두기 | |
| 클로드 결정 | 구현 시 판단 | |

**User's choice:** 지금은 준비 안 함
**Notes:** 드래그&드롭은 Phase 22+ 스코프

---

## 테스트 전략

| Option | Description | Selected |
|--------|-------------|----------|
| 수동 QA | 브라우저에서 직접 필드 CRUD 확인 | ✓ |
| 컴포넌트 테스트 추가 | Vitest + React Testing Library | |
| TypeScript 컴파일만 확인 | 타입 오류 없이 빌드되면 OK | |

**User's choice:** 수동 QA
**Notes:** 현재 테스트 인프라 없음, 기능 변경 없는 순수 리팩토링이므로 수동 QA 충분

---

## Claude's Discretion

- import 정리 순서
- re-export 시 default/named export 선택

## Deferred Ideas

- 드래그&드롭 필드 순서 변경 (Phase 22+)
- FieldConfigEditor 타입별 분할 (Phase 25 계산 규칙 확장 시)
- 타입 파일 상위 레벨 이동 (공유 필요성 증가 시)

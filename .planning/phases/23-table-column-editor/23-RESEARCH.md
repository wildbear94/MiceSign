# Phase 23: 테이블 컬럼 편집기 - Research

**Researched:** 2026-04-12
**Domain:** React 컴포넌트 (드래그&드롭 정렬, 인라인 편집, 타입별 설정 패널)
**Confidence:** HIGH

## Summary

Phase 23은 관리자가 table 타입 필드의 컬럼 구조를 시각적으로 설계할 수 있는 UI를 구축하는 프론트엔드 전용 작업이다. 핵심은 (1) 컬럼 추가/삭제/순서변경 목록, (2) 각 컬럼의 타입별 세부 설정 패널, (3) 미리보기 테이블 실시간 반영 3가지로 구성된다.

기존 코드베이스에 select 타입의 옵션 편집 패턴(추가/삭제/인라인 편집)과 FieldCard의 접기/펼치기 패턴이 잘 정립되어 있어, 이를 그대로 재활용하면 된다. 새로 도입하는 외부 라이브러리는 @dnd-kit/core + @dnd-kit/sortable 뿐이며, 나머지는 기존 스택(Tailwind, Lucide, i18next)으로 충분하다.

타입 시스템은 admin 측 SchemaFieldEditor/types.ts의 `SchemaFieldConfig`에 `columns`, `minRows`, `maxRows` 속성을 추가하고, `TableColumn` 인터페이스를 신규 정의해야 한다. document 측 dynamicForm.ts에는 이미 `ColumnDefinition`과 `FieldConfig.columns/minRows/maxRows`가 존재하므로 양쪽 타입의 호환성을 확인해야 한다.

**Primary recommendation:** @dnd-kit/core@6.3.1 + @dnd-kit/sortable@10.0.0 설치 후, TableColumnEditor와 ColumnConfigPanel 2개 신규 컴포넌트를 생성하고, FieldConfigEditor에 case 'table' 추가, PreviewFieldRenderer의 table 케이스를 실제 테이블로 교체한다.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** FieldConfigEditor 내부에 인라인 배치 — switch문에 case 'table' 추가
- **D-02:** 각 컬럼은 접기/펼치기 방식 — FieldCard 패턴과 동일
- **D-03:** 컬럼 삭제는 확인 없이 즉시 삭제
- **D-04:** 7가지 컬럼 타입 지원 — text, number, date, select, textarea, checkbox, staticText
- **D-05:** 각 타입별 세부 설정은 기존 FieldConfigEditor의 해당 타입 설정을 재활용
- **D-06:** checkbox 타입은 신규 추가 — boolean 값 입력용
- **D-07:** 드래그 & 드롭으로 컬럼 순서 변경 — @dnd-kit/core 라이브러리 사용
- **D-08:** @dnd-kit/core + @dnd-kit/sortable 패키지 설치 필요
- **D-09:** 새 table 필드 추가 시 컬럼 0개(빈 상태)로 시작
- **D-10:** 최소 1개 컬럼 필요 — 저장 시 밸리데이션. 최대 20개 컬럼 제한
- **D-11:** types.ts에 TableColumn 인터페이스 신규 생성
- **D-12:** SchemaFieldConfig에 columns?: TableColumn[] 속성 추가
- **D-13:** 컬럼 편집 UI 아래에 minRows/maxRows 설정 필드 포함
- **D-14:** SchemaFieldConfig에 minRows?: number, maxRows?: number 속성 추가
- **D-15:** PreviewFieldRenderer의 table 케이스를 컬럼 헤더 + 빈 샘플 행 2개 테이블로 교체
- **D-16:** 미리보기 테이블에 [+ 행 추가] 버튼 표시 (비활성 상태)

### Claude's Discretion
- 컬럼 편집 UI의 정확한 Tailwind 스타일링
- 접기/펼치기 애니메이션 여부
- 드래그 핸들 아이콘 선택 (GripVertical 등)
- 빈 상태(컬럼 0개) 안내 메시지 문구
- TableColumn 타입에서 지원하는 컬럼 타입 목록의 타입 정의 방식

### Deferred Ideas (OUT OF SCOPE)
None
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| TBL-01 | 관리자가 table 타입 필드에 컬럼을 추가/삭제/순서변경할 수 있다 | TableColumnEditor 컴포넌트 + @dnd-kit sortable 패턴 + 추가/삭제 버튼 |
| TBL-02 | 관리자가 각 컬럼의 타입(text/number/date/select), 라벨, 필수여부를 설정할 수 있다 | ColumnConfigPanel 컴포넌트 + 접기/펼치기 패턴 + 기존 FieldConfigEditor 설정 재활용 |
</phase_requirements>

## Standard Stack

### Core (신규 설치)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @dnd-kit/core | 6.3.1 | DnD 프레임워크 코어 | 유저 결정 D-07. React 18 호환, 접근성 내장 |
| @dnd-kit/sortable | 10.0.0 | 정렬 가능 목록 프리셋 | 유저 결정 D-08. @dnd-kit/core@^6.3.0 peer dep 충족 |

[VERIFIED: npm registry — `npm view @dnd-kit/core version` → 6.3.1, `npm view @dnd-kit/sortable version` → 10.0.0, peer dep `@dnd-kit/core: ^6.3.0`]

### 기존 스택 (이미 설치됨)
| Library | Version | Purpose | 이 Phase에서의 역할 |
|---------|---------|---------|---------------------|
| React | 18.3.x | UI 프레임워크 | 컴포넌트 작성 |
| Lucide React | ^1.7.0 | 아이콘 | GripVertical, Plus, Trash2, ChevronRight |
| i18next + react-i18next | ^26.0.3 / ^17.0.2 | 국제화 | 컬럼 편집 UI 라벨 |
| TailwindCSS | 3.4 | 스타일링 | 모든 UI |

[VERIFIED: package.json 직접 확인]

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| @dnd-kit/sortable | @hello-pangea/dnd (이미 설치됨) | @hello-pangea/dnd는 이미 프로젝트에 있지만, 유저 결정 D-07/D-08이 @dnd-kit을 명시. @dnd-kit가 더 가볍고 모듈화됨 |
| @dnd-kit/core + sortable | @dnd-kit/react (신규 통합 패키지) | 2026년 출시된 신규 패키지지만 유저 결정이 core+sortable을 지정. 안정성 검증 필요 |

**Installation:**
```bash
cd frontend && npm install @dnd-kit/core@6.3.1 @dnd-kit/sortable@10.0.0
```

## Architecture Patterns

### 수정/생성 대상 파일 구조
```
frontend/src/features/admin/components/
├── SchemaFieldEditor/
│   ├── types.ts                    # [수정] TableColumn 인터페이스 추가, SchemaFieldConfig 확장
│   ├── FieldConfigEditor.tsx       # [수정] case 'table' 추가
│   ├── TableColumnEditor.tsx       # [신규] 컬럼 목록 관리 + DnD + 행 설정
│   ├── ColumnConfigPanel.tsx       # [신규] 타입별 컬럼 세부 설정
│   ├── FieldCard.tsx               # [참조] 접기/펼치기 패턴
│   ├── constants.ts                # [참조] FIELD_TYPE_META, SMALL_INPUT_CLASS
│   ├── utils.ts                    # [참조] toFieldId 재활용
│   └── ...
├── FormPreview/
│   └── PreviewFieldRenderer.tsx    # [수정] table 케이스 실제 테이블로 교체
```

### Pattern 1: TableColumn 타입 구조 (D-11, D-12, D-14)
**What:** SchemaFieldEditor의 types.ts에 TableColumn 인터페이스와 SchemaFieldConfig 확장
**When to use:** 컬럼 데이터 모델링
**Example:**
```typescript
// Source: CONTEXT.md D-11, D-12, D-14 + dynamicForm.ts ColumnDefinition 호환
export type TableColumnType =
  | 'text'
  | 'textarea'
  | 'number'
  | 'date'
  | 'select'
  | 'checkbox'
  | 'staticText';

export interface TableColumn {
  id: string;
  type: TableColumnType;
  label: string;
  required: boolean;
  config: SchemaFieldConfig;  // 기존 config 재활용
}

export interface SchemaFieldConfig {
  // ... 기존 속성들 ...
  columns?: TableColumn[];
  minRows?: number;
  maxRows?: number;
}
```

[VERIFIED: dynamicForm.ts의 ColumnDefinition 구조와 대조 확인 — id, type, label, required, config 필드 일치]

### Pattern 2: @dnd-kit Sortable 리스트 (D-07, D-08)
**What:** DndContext + SortableContext + useSortable 훅 조합
**When to use:** 컬럼 순서 변경
**Example:**
```typescript
// Source: @dnd-kit 공식 문서 (docs.dndkit.com/presets/sortable)
import { DndContext, closestCenter, PointerSensor, KeyboardSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';

function TableColumnEditor({ columns, onColumnsChange }) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor)
  );

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = columns.findIndex(c => c.id === active.id);
      const newIndex = columns.findIndex(c => c.id === over.id);
      onColumnsChange(arrayMove(columns, oldIndex, newIndex));
    }
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={columns.map(c => c.id)} strategy={verticalListSortingStrategy}>
        {columns.map(col => <SortableColumnRow key={col.id} column={col} />)}
      </SortableContext>
    </DndContext>
  );
}
```

[CITED: docs.dndkit.com/presets/sortable]

### Pattern 3: 접기/펼치기 컬럼 행 (D-02)
**What:** FieldCard와 동일한 패턴 — 헤더 클릭 시 세부 설정 토글
**When to use:** 각 컬럼 행
**Example:**
```typescript
// Source: FieldCard.tsx 패턴 참조
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
// NOTE: @dnd-kit/utilities 별도 설치 불필요 — @dnd-kit/sortable이 CSS.Transform 내장

function SortableColumnRow({ column, expanded, onToggle, onUpdate, onDelete }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: column.id });
  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <div ref={setNodeRef} style={style}>
      {/* 드래그 핸들 */}
      <div {...attributes} {...listeners}>
        <GripVertical className="w-4 h-4 text-gray-400" />
      </div>
      {/* 접기/펼치기 헤더 */}
      <div onClick={onToggle}>
        <ChevronRight className={`w-4 h-4 ${expanded ? 'rotate-90' : ''}`} />
        <TypeBadge type={column.type} />
        <span>{column.label}</span>
        <button onClick={onDelete}><Trash2 /></button>
      </div>
      {/* 펼침 시 세부 설정 */}
      {expanded && <ColumnConfigPanel column={column} onUpdate={onUpdate} />}
    </div>
  );
}
```

### Pattern 4: ColumnConfigPanel — 기존 설정 재활용 (D-05)
**What:** FieldConfigEditor의 타입별 설정 로직을 컬럼 레벨에서 재사용
**When to use:** 컬럼 타입별 세부 설정 (text → placeholder/maxLength, number → min/max/unit, select → options)
**Strategy:** ColumnConfigPanel 내부에서 동일한 switch 구조 사용하되, checkbox와 staticText에 대한 간소화된 설정 제공

### Anti-Patterns to Avoid
- **FieldConfigEditor 직접 호출 금지:** FieldConfigEditor는 SchemaField를 받으므로 TableColumn을 직접 넘길 수 없음. 대신 동일한 패턴의 별도 컴포넌트(ColumnConfigPanel) 생성
- **컬럼 ID를 index로 사용 금지:** DnD 정렬 시 index가 변경됨. 반드시 고유 ID(nanoid 등) 사용
- **DndContext를 SortableContext 밖에 중첩 금지:** DndContext는 한 번만 감싸야 함

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| 드래그&드롭 정렬 | 커스텀 마우스 이벤트 핸들링 | @dnd-kit/sortable | 키보드 접근성, 터치 지원, 부드러운 애니메이션 자동 처리 |
| 고유 ID 생성 | Math.random 기반 | crypto.randomUUID() 또는 Date.now().toString(36) | 충돌 방지, 브라우저 내장 |
| CSS Transform 변환 | 직접 style 문자열 조합 | @dnd-kit의 CSS.Transform.toString() | sortable 라이브러리가 제공하는 유틸리티 |

## Common Pitfalls

### Pitfall 1: admin types.ts와 document dynamicForm.ts 타입 불일치
**What goes wrong:** admin 측 TableColumn과 document 측 ColumnDefinition의 구조가 다르면 저장/로드 시 데이터가 손실됨
**Why it happens:** 두 타입이 별도 파일에 정의되어 동기화가 안 됨
**How to avoid:** TableColumn 정의 시 ColumnDefinition과 동일한 필드명 사용 (id, type, label, required, config). 필요하면 admin types에서 dynamicForm의 ColumnDefinition을 re-export하는 것도 고려
**Warning signs:** schemaToZod.ts에서 config?.columns 접근 시 타입 에러

### Pitfall 2: @dnd-kit SortableContext items 배열 불일치
**What goes wrong:** SortableContext에 전달하는 items 배열의 순서와 실제 렌더링 순서가 다르면 DnD가 오작동
**Why it happens:** items에 객체 배열 전달 시 발생. 반드시 ID 문자열 배열 전달 필요
**How to avoid:** `items={columns.map(c => c.id)}` 형태로 전달. columns 배열 자체를 전달하지 않기
**Warning signs:** 드래그 시 아이템이 이상한 위치로 점프

### Pitfall 3: checkbox 타입 — 기존 코드에 없는 신규 타입 (D-06)
**What goes wrong:** checkbox는 기존 SchemaFieldType에 없으므로 타입 정의 누락 시 컴파일 에러 발생
**Why it happens:** D-04에서 7가지 타입을 정의했는데 checkbox는 컬럼 전용 타입
**How to avoid:** TableColumnType을 SchemaFieldType과 별도로 정의하거나, SchemaFieldType에 'checkbox'를 추가. 컬럼 전용이므로 별도 타입이 더 깔끔함
**Warning signs:** TypeBadge에서 checkbox 아이콘/색상 미등록

### Pitfall 4: 컬럼 config의 중첩 업데이트
**What goes wrong:** 컬럼의 config를 업데이트할 때 얕은 복사로 인해 이전 config가 유지됨
**Why it happens:** `{ ...column, config: { ...column.config, ...partial } }` 누락
**How to avoid:** updateColumnConfig 헬퍼 함수 작성하여 일관된 불변 업데이트 보장

### Pitfall 5: FIELD_TYPES 상수에 table 미포함
**What goes wrong:** constants.ts의 FIELD_TYPES 배열에 'table'이 없음 — 필드 추가 드롭다운에 table이 안 나타날 수 있음
**Why it happens:** Phase 21 리팩토링 시 FIELD_TYPE_META에는 table을 추가했지만 FIELD_TYPES 배열에는 미포함
**How to avoid:** 이 Phase에서 FIELD_TYPES에 'table' 추가 여부 확인 필요. 단, 이미 table 타입이 필드 추가에서 선택 가능한지 기존 코드 확인 필요

[VERIFIED: constants.ts 직접 확인 — FIELD_TYPES 배열에 'table' 미포함, FIELD_TYPE_META에는 table 존재]

## Code Examples

### 컬럼 추가 (D-09: 빈 상태에서 시작)
```typescript
// Source: CONTEXT.md D-09 + utils.ts toFieldId 패턴
const addColumn = () => {
  const newColumn: TableColumn = {
    id: `col_${Date.now().toString(36)}`,
    type: 'text',
    label: '',
    required: false,
    config: {},
  };
  onColumnsChange([...columns, newColumn]);
};
```

### 컬럼 삭제 (D-03: 확인 없이 즉시)
```typescript
// Source: CONTEXT.md D-03 + select 옵션 삭제 패턴 (FieldConfigEditor.tsx line 153)
const deleteColumn = (columnId: string) => {
  onColumnsChange(columns.filter(c => c.id !== columnId));
};
```

### 미리보기 테이블 (D-15, D-16)
```typescript
// Source: CONTEXT.md D-15, D-16 + PreviewFieldRenderer.tsx 기존 패턴
case 'table': {
  const columns = field.config.columns || [];
  if (columns.length === 0) {
    return (
      <div className="border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden">
        <div className="bg-gray-50 dark:bg-gray-700 px-3 py-2 text-xs text-gray-500">
          {t('templates.columnEmpty')}
        </div>
      </div>
    );
  }
  return (
    <div className="border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50 dark:bg-gray-700">
            {columns.map(col => (
              <th key={col.id} className="px-3 py-2 text-left text-xs font-medium text-gray-600 dark:text-gray-400">
                {col.label || '(라벨 없음)'}
                {col.required && <span className="text-red-500 ml-1">*</span>}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {[0, 1].map(rowIdx => (
            <tr key={rowIdx} className="border-t border-gray-200 dark:border-gray-700">
              {columns.map(col => (
                <td key={col.id} className="px-3 py-2">
                  {/* 타입별 disabled input */}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <button disabled className="w-full py-2 text-sm text-gray-400 border-t border-dashed border-gray-300 dark:border-gray-600">
        + {t('templates.addRow')}
      </button>
    </div>
  );
}
```

### i18n 키 추가 (UI-SPEC Copywriting Contract)
```json
{
  "templates": {
    "columnList": "컬럼 목록",
    "addColumn": "컬럼 추가",
    "removeColumn": "컬럼 삭제",
    "columnLabel": "컬럼 라벨",
    "columnId": "컬럼 ID",
    "columnType": "컬럼 타입",
    "columnEmpty": "컬럼을 추가하여 테이블 구조를 설계하세요",
    "rowSettings": "행 설정",
    "minRows": "최소 행 수",
    "maxRows": "최대 행 수",
    "addRow": "행 추가",
    "columnMinError": "테이블에 최소 1개의 컬럼이 필요합니다",
    "columnMaxError": "컬럼은 최대 20개까지 추가할 수 있습니다",
    "columnTypeText": "텍스트",
    "columnTypeNumber": "숫자",
    "columnTypeDate": "날짜",
    "columnTypeSelect": "선택",
    "columnTypeTextarea": "장문 텍스트",
    "columnTypeCheckbox": "체크박스",
    "columnTypeStaticText": "고정 텍스트"
  }
}
```

[VERIFIED: 기존 admin.json 키 구조 직접 확인 — templates 네임스페이스 하위에 추가]

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| @hello-pangea/dnd (react-beautiful-dnd fork) | @dnd-kit/core + sortable | 2023+ | @dnd-kit가 더 가볍고, 센서/충돌감지 커스터마이징 유연. 프로젝트에 @hello-pangea/dnd 이미 존재하지만 D-07이 @dnd-kit 지정 |
| @dnd-kit/core + sortable (별도 패키지) | @dnd-kit/react (통합 패키지) | 2025-2026 | 신규 통합 API 존재하지만 유저 결정 D-07/D-08이 기존 패키지 지정 |

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | @dnd-kit/utilities 별도 설치 불필요 — CSS.Transform이 @dnd-kit/sortable에 포함 | Architecture Patterns | CSS transform 변환 불가 시 별도 설치 필요 (npm install @dnd-kit/utilities) |
| A2 | crypto.randomUUID()가 모든 대상 브라우저에서 사용 가능 | Don't Hand-Roll | 미지원 시 Date.now().toString(36) 폴백 사용 |

## Open Questions

1. **FIELD_TYPES 배열에 'table' 추가 여부**
   - What we know: FIELD_TYPE_META에는 table이 있으나 FIELD_TYPES에는 없음
   - What's unclear: 필드 추가 드롭다운이 FIELD_TYPES를 참조하는지, FIELD_TYPE_META 키를 참조하는지
   - Recommendation: SchemaFieldEditor.tsx의 필드 추가 로직 확인 후 결정. 이 Phase에서 table을 FIELD_TYPES에 추가해야 할 가능성 높음

2. **admin types.ts와 dynamicForm.ts 타입 통합 여부**
   - What we know: 양쪽에 유사한 타입이 별도 정의됨 (SchemaFieldConfig vs FieldConfig, 신규 TableColumn vs 기존 ColumnDefinition)
   - What's unclear: re-export로 통합할지, 별도 유지할지
   - Recommendation: 이 Phase에서는 admin types.ts에 별도 정의 후, dynamicForm.ts의 ColumnDefinition과 구조적 호환성만 보장. 타입 통합은 별도 리팩토링 scope

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| @dnd-kit/core | 컬럼 DnD (D-07) | 미설치 | 6.3.1 (npm) | 설치 필요 |
| @dnd-kit/sortable | 컬럼 정렬 (D-08) | 미설치 | 10.0.0 (npm) | 설치 필요 |
| Node.js + npm | 패키지 설치 | 확인됨 | - | - |

**Missing dependencies with no fallback:**
- @dnd-kit/core, @dnd-kit/sortable — npm install로 해결 (Plan Wave 0에서 처리)

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | 미확인 — package.json에 test 스크립트 없음 |
| Config file | 없음 |
| Quick run command | N/A |
| Full suite command | `npm run build` (TypeScript 컴파일 검증) |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| TBL-01 | 컬럼 추가/삭제/순서변경 | manual | 브라우저에서 table 필드 선택 후 컬럼 조작 | N/A |
| TBL-02 | 컬럼 타입/라벨/필수 설정 | manual | 브라우저에서 컬럼 펼쳐서 설정 변경 확인 | N/A |

### Sampling Rate
- **Per task commit:** `npm run build` (TypeScript 에러 없음 확인)
- **Per wave merge:** `npm run build` + 브라우저 수동 테스트
- **Phase gate:** 빌드 성공 + Success Criteria 3개 항목 수동 확인

### Wave 0 Gaps
- 테스트 프레임워크 미설치 — 이 Phase에서는 TypeScript 컴파일 + 수동 테스트로 검증

## Security Domain

이 Phase는 프론트엔드 전용 UI 컴포넌트 작업으로, 보안 위협 표면이 제한적이다.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | N/A |
| V3 Session Management | no | N/A |
| V4 Access Control | no | 기존 admin 권한 체크로 충분 |
| V5 Input Validation | yes | 컬럼 수 제한(max 20), minRows/maxRows 범위 검증 — 프론트엔드 밸리데이션 |
| V6 Cryptography | no | N/A |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| 과도한 컬럼 수 입력 | DoS (경미) | 프론트엔드에서 max 20 제한 (D-10) |

## Sources

### Primary (HIGH confidence)
- `frontend/package.json` — 기존 의존성 버전 확인
- `frontend/src/features/admin/components/SchemaFieldEditor/types.ts` — 현재 타입 구조
- `frontend/src/features/admin/components/SchemaFieldEditor/FieldConfigEditor.tsx` — 기존 switch 패턴
- `frontend/src/features/admin/components/SchemaFieldEditor/FieldCard.tsx` — 접기/펼치기 패턴
- `frontend/src/features/admin/components/SchemaFieldEditor/constants.ts` — FIELD_TYPES, FIELD_TYPE_META
- `frontend/src/features/document/types/dynamicForm.ts` — ColumnDefinition 구조
- `frontend/src/features/document/utils/schemaToZod.ts` — table 타입 밸리데이션 기존 코드
- `frontend/src/features/admin/components/FormPreview/PreviewFieldRenderer.tsx` — 현재 table 플레이스홀더
- npm registry — @dnd-kit/core@6.3.1, @dnd-kit/sortable@10.0.0 버전 및 peer dep 확인

### Secondary (MEDIUM confidence)
- [docs.dndkit.com/presets/sortable](https://docs.dndkit.com/presets/sortable) — @dnd-kit sortable 공식 문서

### Tertiary (LOW confidence)
- None

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — npm registry 직접 확인, 유저 결정으로 라이브러리 확정
- Architecture: HIGH — 기존 코드베이스 패턴 직접 분석, UI-SPEC 존재
- Pitfalls: HIGH — 타입 시스템과 코드 구조 직접 대조 확인

**Research date:** 2026-04-12
**Valid until:** 2026-05-12 (안정적인 프론트엔드 UI 작업)

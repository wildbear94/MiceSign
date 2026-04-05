# Phase 14: Builder UI - Research

**Researched:** 2026-04-05
**Domain:** React drag-and-drop form builder UI (admin tool)
**Confidence:** HIGH

## Summary

Phase 14는 관리자가 코드 없이 드래그 앤 드롭으로 폼 템플릿을 생성/편집할 수 있는 빌더 UI를 구현한다. 3패널 레이아웃(필드 팔레트, 캔버스, 속성 패널), 라이브 프리뷰, 템플릿 관리 목록 페이지가 핵심 구성 요소다.

기존 프로젝트 스택과 코드 자산이 매우 충실하다. @hello-pangea/dnd(이미 설치됨, PositionTable에서 사용 중)로 팔레트→캔버스 드래그와 캔버스 내 재정렬을 모두 처리할 수 있다. Phase 13에서 구현된 DynamicForm/DynamicReadOnly 컴포넌트를 라이브 프리뷰에 그대로 재사용한다. 백엔드 CRUD API(TemplateController)가 이미 완성되어 있어 프론트엔드 API 클라이언트 확장만 필요하다.

**Primary recommendation:** 기존 @hello-pangea/dnd 패턴(PositionTable)을 확장하여 multi-droppable(palette→canvas) 구현. nanoid 설치하여 필드 ID 생성. DynamicForm을 프리뷰에 직접 재사용. 빌더 상태는 useReducer로 관리(복잡한 상태 변이가 많음).

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** 고정 3패널 레이아웃 — 좌측 필드 팔레트(200px 고정), 중앙 캔버스(유동), 우측 속성 패널(300px 고정). 패널 리사이즈 불필요
- **D-02:** 라이브 프리뷰는 캔버스 상단 '편집/프리뷰' 토글 버튼으로 전환. 프리뷰 모드에서 Phase 13의 DynamicForm을 읽기 전용으로 렌더링
- **D-03:** 데스크톱 전용 (min-width: 1024px). 모바일/태블릿에서는 '데스크톱에서 사용해주세요' 안내 메시지 표시
- **D-04:** 필드 추가는 드래그 + 클릭 병행 — @hello-pangea/dnd 라이브러리 사용 (이미 설치됨)
- **D-05:** 캔버스 내 필드 재정렬은 드래그로 수행
- **D-06:** 필드 선택은 클릭으로 — 클릭 시 해당 필드 highlight + 우측 속성 패널에 해당 필드 설정 표시. 필드 툴바에 복제/삭제 버튼
- **D-07:** 팔레트→캔버스 드래그 시 파란선 인디케이터로 드롭 위치 표시. 반투명 복사본(ghost)
- **D-08:** 캔버스 필드의 드래그 핸들은 좌측 GripVertical 아이콘. hover 시 cursor: grab
- **D-09:** 필드 복제 지원 — 새 nanoid 생성, 라벨에 '(복사본)' 접미사 추가
- **D-10:** 필드 타입 변경은 미지원
- **D-11:** 속성 패널은 탭 그룹화 — 기본/검증/고급 탭
- **D-12:** select 필드 옵션은 인라인 직접 입력 + option_set 불러오기 버튼
- **D-13:** table 필드 칼럼 설정은 속성 패널 내 칼럼 리스트
- **D-14:** 필드 미선택 시 속성 패널에는 템플릿 전체 설정 표시
- **D-15:** 필드 너비 설정(full/half) Phase 14에 포함. DynamicForm/DynamicReadOnly에도 width 속성 지원 추가 필요
- **D-16:** 스키마에 필드별 config.width 속성 추가 — "full"(기본값) 또는 "half"
- **D-17:** 테이블 목록 UI — 기존 Admin 페이지와 일관된 테이블 패턴
- **D-18:** 템플릿 생성 플로우: 목록에서 '새 템플릿' 버튼 → 이름/코드/설명 입력 모달 → 빌더 페이지로 이동
- **D-19:** Admin 사이드바에 '양식 관리' 항목 추가
- **D-20:** 템플릿 비활성화 시 확인 대화상자 표시
- **D-21:** 즉시 저장 방식 — 저장 버튼 클릭 시 바로 API 호출
- **D-22:** 빌더 페이지 상단에 저장 버튼 + 프리뷰 토글 + 뒤로가기 버튼
- **D-23:** 빈 캔버스 — 안내 텍스트 + 점선 영역 표시
- **D-24:** 저장 실패 시 토스트 메시지로 에러 표시
- **D-25:** JSON 내보내기 + 가져오기 모두 지원
- **D-26:** 가져오기 시 스키마 검증 → 미리보기 → 확인 후 적용

### Claude's Discretion
- 캔버스 필드 카드의 세부 스타일링 (테두리, 그림자, 선택 상태 색상)
- 팔레트 필드 타입별 아이콘 선택 (lucide-react)
- 속성 패널 탭 내부 폼 필드 세부 배치
- 저장/프리뷰 상태 관리 (Zustand vs 로컬 state)
- 빌더 페이지 라우팅 URL 구조
- 에러 토스트 컴포넌트 구현 방식

### Deferred Ideas (OUT OF SCOPE)
- 옵션 세트 전용 관리 페이지
- 템플릿 복제 기능
- 템플릿 카테고리별 필터링
- 멀티 필드 선택/일괄 삭제
- 조건부 로직 UI (Phase 15)
- 계산 필드 UI (Phase 15)
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| BLDR-01 | Admin can build forms using 3-panel layout (field palette, canvas, property panel) | 고정 3패널 레이아웃(200px/유동/300px), AdminLayout Outlet 내부 배치, min-width: 1024px |
| BLDR-02 | Admin can add fields via drag & drop from palette to canvas or click-to-append | @hello-pangea/dnd multi-droppable 패턴, palette Droppable(isDropDisabled) + canvas Droppable, click handler로 append |
| BLDR-03 | Admin can reorder fields by dragging within canvas | @hello-pangea/dnd Draggable + onDragEnd 핸들러, PositionTable 패턴 재사용 |
| BLDR-04 | Admin can configure field properties (label, required, placeholder, options, etc.) in property panel | 속성 패널 3탭(기본/검증/고급), react-hook-form으로 속성 입력, option_set API 연동 |
| BLDR-05 | Admin can preview the form as end-users will see it (live preview toggle) | DynamicForm 컴포넌트를 schemaDefinition prop으로 직접 재사용, 편집/프리뷰 토글 |
| BLDR-06 | Admin can create, edit, deactivate, and list templates in template management page | 백엔드 API 완성됨(GET/POST/PUT/DELETE /admin/templates), 프론트엔드 API 클라이언트 + 목록/빌더 페이지 구현 |
</phase_requirements>

## Project Constraints (from CLAUDE.md)

- **Tech stack:** React 18 + Vite + TypeScript + Zustand + TanStack Query v5 + TailwindCSS
- **Form management:** React Hook Form + Zod
- **Form templates:** Hardcoded React components per template type (기존 6개), 동적 템플릿은 JSON schema 기반
- **RBAC:** Admin 기능은 ADMIN + SUPER_ADMIN만 접근
- **i18n:** react-i18next 사용, Korean 우선, public/locales/{lng}/admin.json에 번역 키 추가
- **GSD Workflow:** Edit/Write 전에 GSD command로 작업 시작

## Standard Stack

### Core (이미 설치됨)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @hello-pangea/dnd | 18.0.1 | 드래그 앤 드롭 (팔레트→캔버스, 캔버스 재정렬) | 이미 PositionTable에서 사용 중, multi-droppable 지원 |
| react-hook-form | ^7.72.0 | 속성 패널 폼 입력 관리 | 프로젝트 전체 폼 표준 |
| zod | ^4.3.6 | 속성 패널 입력 검증, JSON 가져오기 검증 | 프로젝트 전체 검증 표준 |
| @tanstack/react-query | ^5.95.2 | 템플릿 CRUD API 서버 상태 관리 | 프로젝트 서버 상태 표준 |
| lucide-react | ^1.7.0 | 필드 타입 아이콘, UI 아이콘 | 프로젝트 아이콘 표준 |
| @headlessui/react | ^2.2.9 | Combobox, Tab 컴포넌트 | Phase 13에서 이미 사용 중 |
| react-router | ^7.13.2 | 빌더/목록 페이지 라우팅 | 프로젝트 라우팅 표준 |

### 추가 필요
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| nanoid | ^5.1.7 | 필드 ID 생성 (D-01: 자동 UUID) | 필드 추가/복제 시 고유 ID 생성 |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| @hello-pangea/dnd | dnd-kit | dnd-kit이 더 모던하지만 이미 hello-pangea 설치 + 사용 중. 일관성 우선 |
| useReducer (빌더 상태) | Zustand store | 빌더 상태는 페이지 로컬이라 전역 스토어 불필요. useReducer가 복잡한 상태 변이에 적합 |

**Installation:**
```bash
cd frontend && npm install nanoid
```

**Version verification:** nanoid 최신 stable은 5.1.7 (npm view 확인 완료). @hello-pangea/dnd 18.0.1은 이미 설치된 최신 버전.

## Architecture Patterns

### Recommended Project Structure
```
frontend/src/features/admin/
├── api/
│   └── adminTemplateApi.ts     # Admin 템플릿 CRUD API 클라이언트
├── components/
│   ├── builder/
│   │   ├── BuilderLayout.tsx       # 3패널 컨테이너 (데스크톱 전용 가드 포함)
│   │   ├── FieldPalette.tsx        # 좌측 필드 팔레트 (8개 필드 타입)
│   │   ├── BuilderCanvas.tsx       # 중앙 캔버스 (Droppable + 필드 카드 목록)
│   │   ├── FieldCard.tsx           # 캔버스 내 개별 필드 카드 (Draggable)
│   │   ├── PropertyPanel.tsx       # 우측 속성 패널 (탭: 기본/검증/고급)
│   │   ├── PropertyBasicTab.tsx    # 기본 속성 탭
│   │   ├── PropertyValidationTab.tsx # 검증 속성 탭
│   │   ├── PropertyAdvancedTab.tsx # 고급 속성 탭 (width 포함)
│   │   ├── TemplateSettingsPanel.tsx # 필드 미선택 시 템플릿 전체 설정
│   │   ├── SelectOptionsEditor.tsx # select 필드 옵션 인라인 편집기
│   │   ├── TableColumnsEditor.tsx  # table 필드 칼럼 편집기
│   │   ├── BuilderToolbar.tsx      # 상단 툴바 (저장/프리뷰/뒤로가기)
│   │   ├── BuilderPreview.tsx      # 프리뷰 모드 (DynamicForm 래퍼)
│   │   ├── JsonImportModal.tsx     # JSON 가져오기 모달
│   │   └── useBuilderReducer.ts   # 빌더 상태 관리 (useReducer)
│   ├── TemplateListTable.tsx       # 템플릿 관리 테이블
│   └── TemplateCreateModal.tsx     # 새 템플릿 생성 모달
├── hooks/
│   └── useAdminTemplates.ts       # TanStack Query hooks (목록, 상세, CRUD)
├── pages/
│   ├── TemplateListPage.tsx       # 템플릿 관리 목록 페이지
│   └── TemplateBuilderPage.tsx    # 빌더 페이지
└── types/
    └── builder.ts                 # 빌더 전용 타입 정의
```

### Pattern 1: Multi-Droppable DnD (팔레트 → 캔버스)
**What:** @hello-pangea/dnd의 DragDropContext 하나에 palette(Droppable) + canvas(Droppable) 두 영역 배치. palette는 `isDropDisabled={true}`로 설정하여 드롭 불가, canvas만 드롭 허용.
**When to use:** 팔레트에서 캔버스로 필드 추가 + 캔버스 내 재정렬
**Example:**
```typescript
// Source: @hello-pangea/dnd docs + PositionTable 패턴
const handleDragEnd = (result: DropResult) => {
  const { source, destination } = result;
  if (!destination) return;

  if (source.droppableId === 'palette' && destination.droppableId === 'canvas') {
    // 팔레트에서 캔버스로 새 필드 추가
    const fieldType = PALETTE_ITEMS[source.index].type;
    dispatch({ type: 'ADD_FIELD', fieldType, insertIndex: destination.index });
  } else if (source.droppableId === 'canvas' && destination.droppableId === 'canvas') {
    // 캔버스 내 재정렬
    dispatch({ type: 'REORDER_FIELD', fromIndex: source.index, toIndex: destination.index });
  }
};
```

### Pattern 2: useReducer 빌더 상태 관리
**What:** 복잡한 빌더 상태(fields 배열, selectedFieldId, isDirty 등)를 useReducer로 관리. 액션 기반으로 상태 변이를 명확하게 추적.
**When to use:** 필드 추가/삭제/복제/재정렬/속성 변경 등 다양한 상태 변이가 필요할 때
**Example:**
```typescript
type BuilderAction =
  | { type: 'INIT_SCHEMA'; schema: SchemaDefinition }
  | { type: 'ADD_FIELD'; fieldType: FieldType; insertIndex: number }
  | { type: 'REMOVE_FIELD'; fieldId: string }
  | { type: 'DUPLICATE_FIELD'; fieldId: string }
  | { type: 'REORDER_FIELD'; fromIndex: number; toIndex: number }
  | { type: 'SELECT_FIELD'; fieldId: string | null }
  | { type: 'UPDATE_FIELD'; fieldId: string; changes: Partial<FieldDefinition> }
  | { type: 'UPDATE_FIELD_CONFIG'; fieldId: string; config: Partial<FieldConfig> }
  | { type: 'UPDATE_TEMPLATE_SETTINGS'; changes: Partial<TemplateSettings> }
  | { type: 'IMPORT_SCHEMA'; schema: SchemaDefinition }
  | { type: 'MARK_SAVED' };

interface BuilderState {
  fields: FieldDefinition[];
  selectedFieldId: string | null;
  templateSettings: TemplateSettings;
  isDirty: boolean;
  schemaVersion: number;
}
```

### Pattern 3: 속성 패널 ↔ 캔버스 동기화
**What:** 속성 패널에서 필드 속성 변경 시 reducer dispatch로 즉시 캔버스에 반영. react-hook-form의 watch + useEffect 패턴으로 debounced sync.
**When to use:** 속성 패널 입력 → 캔버스 필드 카드 레이블/타입 표시 업데이트
**Example:**
```typescript
// PropertyPanel 내부
const formValues = watch();
useEffect(() => {
  if (!selectedFieldId) return;
  dispatch({
    type: 'UPDATE_FIELD',
    fieldId: selectedFieldId,
    changes: { label: formValues.label, required: formValues.required },
  });
}, [formValues.label, formValues.required]);
```

### Pattern 4: 라이브 프리뷰 (DynamicForm 재사용)
**What:** 프리뷰 모드에서 현재 빌더 상태를 SchemaDefinition으로 변환하여 DynamicForm에 전달
**When to use:** 편집/프리뷰 토글 시
**Example:**
```typescript
// BuilderPreview.tsx
const currentSchema: SchemaDefinition = {
  version: state.schemaVersion,
  fields: state.fields,
  conditionalRules: [],
  calculationRules: [],
};
return <DynamicForm
  templateCode={templateCode}
  schemaDefinition={currentSchema}
  initialData={{ title: '', formData: '{}' }}
  onSave={async () => {}} // 프리뷰에서는 저장 비활성화
/>;
```

### Anti-Patterns to Avoid
- **빌더 상태를 Zustand 전역 스토어에 넣지 말 것:** 빌더는 단일 페이지 로컬 상태. 전역 스토어는 페이지 간 공유가 필요한 auth/user 정보에만 사용
- **속성 패널에서 직접 fields 배열을 mutate하지 말 것:** 반드시 reducer dispatch를 통해 불변 업데이트
- **DynamicForm을 fork하여 프리뷰용 별도 컴포넌트 만들지 말 것:** 기존 DynamicForm에 schemaDefinition prop을 전달하면 API 호출 없이 직접 렌더링됨 (이미 지원)
- **palette에서 canvas로 드래그 시 실제 필드를 이동하지 말 것:** palette는 항상 고정. 드래그 완료 시 새 필드를 생성하여 canvas에 삽입

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| 드래그 앤 드롭 | 커스텀 DnD 로직 (mousedown/mousemove) | @hello-pangea/dnd | 키보드 접근성, 자동 스크롤, 터치 지원 등 edge case 처리 |
| 필드 고유 ID 생성 | Math.random() 기반 ID | nanoid | 충돌 방지, URL-safe, 짧은 ID |
| 탭 UI | 커스텀 탭 컴포넌트 | @headlessui/react Tab | 키보드 네비게이션, ARIA 속성 자동 처리 |
| JSON 스키마 검증 | 수동 if/else 검증 | Zod schema parse | 타입 안전, 상세 에러 메시지 |
| 파일 다운로드 | 커스텀 blob/URL 처리 | Blob + URL.createObjectURL | JSON 내보내기에 표준 브라우저 API 사용 |

**Key insight:** 이 프로젝트는 이미 충분한 라이브러리 스택을 갖추고 있어 새로운 의존성을 최소화해야 한다. nanoid 하나만 추가하면 된다.

## Common Pitfalls

### Pitfall 1: @hello-pangea/dnd에서 palette 아이템이 드래그 후 사라짐
**What goes wrong:** palette Droppable에서 canvas로 드래그하면 palette의 원본 아이템이 DOM에서 제거됨
**Why it happens:** 기본적으로 DnD는 source에서 아이템을 제거하고 destination에 추가하는 "이동" 동작
**How to avoid:** palette의 `isDropDisabled={true}` 설정 + onDragEnd에서 source가 palette일 때 새 필드 객체를 생성하여 canvas에 삽입. palette 아이템은 절대 수정하지 않음
**Warning signs:** 드래그 후 palette 필드 타입이 줄어듦

### Pitfall 2: 속성 패널 ↔ reducer 상태 무한 루프
**What goes wrong:** 속성 패널의 react-hook-form watch()가 변경을 감지하여 dispatch → 상태 변경 → 속성 패널 re-render → watch 트리거 → 무한 루프
**Why it happens:** 속성 패널 폼의 defaultValues가 reducer 상태에서 오는데, dispatch가 상태를 변경하면 다시 폼 값이 바뀜
**How to avoid:** 필드 선택이 변경될 때만 `reset(fieldData)`로 폼 초기화. 폼 값 변경 시에는 onChange 이벤트에서만 dispatch. watch를 직접 useEffect 의존성에 넣지 말고 onBlur 또는 debounced onChange 사용
**Warning signs:** 브라우저 프리즈, 콘솔에 "Maximum update depth exceeded" 에러

### Pitfall 3: 필드 너비(half) 캔버스 미리보기에서 깨짐
**What goes wrong:** half 너비 필드 2개가 같은 행에 표시되지 않거나 레이아웃이 깨짐
**Why it happens:** flex/grid 레이아웃에서 half 필드와 full 필드가 혼재할 때 줄바꿈 로직이 복잡
**How to avoid:** 캔버스에서는 단순 미리보기(필드 카드에 width 배지 표시)로 처리하고, 실제 2칼럼 배치는 프리뷰 모드(DynamicForm)에서만 구현. DynamicForm/DynamicReadOnly에 flex-wrap 기반 width 지원 추가
**Warning signs:** full 필드 다음에 half 필드 1개만 있을 때 빈 공간

### Pitfall 4: JSON 가져오기 시 악성/잘못된 스키마로 빌더 크래시
**What goes wrong:** 유효하지 않은 JSON 구조가 빌더 상태에 로드되어 런타임 에러 발생
**Why it happens:** 사용자가 수동 편집한 JSON이나 다른 시스템의 JSON을 가져올 때
**How to avoid:** Zod 스키마로 엄격하게 검증한 후에만 빌더 상태에 로드. 필드 타입이 8개 타입 중 하나인지 확인. 각 필드에 id가 존재하고 고유한지 확인. 검증 실패 시 구체적 에러 메시지 표시
**Warning signs:** TypeError: Cannot read properties of undefined

### Pitfall 5: 저장 시 빌더 상태와 API 페이로드 불일치
**What goes wrong:** 빌더에서 관리하는 상태 구조와 백엔드 UpdateTemplateRequest의 SchemaDefinition 포맷이 다름
**Why it happens:** 프론트엔드에서 추가 상태(selectedFieldId, isDirty 등)를 섞어서 보내거나, FieldConfig에 빈 필드를 null 대신 빈 문자열로 보내는 경우
**How to avoid:** 저장 시 빌더 상태에서 SchemaDefinition만 추출하는 변환 함수를 별도로 작성. 빈 optional 필드는 제거하여 백엔드 FieldConfig의 @JsonInclude(NON_NULL)과 일치시킴
**Warning signs:** 400 Bad Request 또는 저장은 되지만 다시 로드 시 속성이 누락됨

## Code Examples

### 기존 코드 참고: PositionTable DnD 패턴
```typescript
// Source: frontend/src/features/admin/components/PositionTable.tsx
// 이 패턴을 확장하여 multi-droppable 빌더 구현
<DragDropContext onDragEnd={handleDragEnd}>
  <Droppable droppableId="positions" type="POSITION">
    {(provided) => (
      <tbody ref={provided.innerRef} {...provided.droppableProps}>
        {items.map((item, index) => (
          <Draggable key={item.id} draggableId={String(item.id)} index={index}>
            {(provided, snapshot) => (
              <tr ref={provided.innerRef} {...provided.draggableProps}>
                <td><span {...provided.dragHandleProps}><GripVertical /></span></td>
                ...
              </tr>
            )}
          </Draggable>
        ))}
        {provided.placeholder}
      </tbody>
    )}
  </Droppable>
</DragDropContext>
```

### 기존 API 패턴: 백엔드 Admin Template API
```typescript
// Source: backend TemplateController.java — 이미 구현된 엔드포인트
// GET  /api/v1/admin/templates         — 전체 목록 (활성+비활성)
// GET  /api/v1/admin/templates/{id}    — 상세 (SchemaDefinition 포함)
// POST /api/v1/admin/templates         — 생성 (name, prefix, description, category, icon, schemaDefinition)
// PUT  /api/v1/admin/templates/{id}    — 수정 (name, description, category, icon, schemaDefinition)
// DELETE /api/v1/admin/templates/{id}  — 비활성화
// GET  /api/v1/admin/option-sets       — 옵션 세트 목록
// GET  /api/v1/admin/option-sets/{id}  — 옵션 세트 상세
```

### 기존 타입: SchemaDefinition / FieldDefinition
```typescript
// Source: frontend/src/features/document/types/dynamicForm.ts
export interface FieldDefinition {
  id: string;           // nanoid 생성
  type: FieldType;      // 'text' | 'textarea' | 'number' | 'date' | 'select' | 'table' | 'staticText' | 'hidden'
  label: string;
  required: boolean;
  config?: FieldConfig;  // 타입별 설정 (placeholder, min, max, options, columns 등)
}

export interface SchemaDefinition {
  version: number;
  fields: FieldDefinition[];
  conditionalRules: unknown[];
  calculationRules: unknown[];
}
```

### 기존 DynamicForm 프리뷰 재사용
```typescript
// Source: frontend/src/features/document/components/templates/DynamicForm.tsx
// schemaDefinition prop을 전달하면 API 호출 없이 직접 렌더링
<DynamicForm
  templateCode={templateCode}
  schemaDefinition={currentSchema}  // 빌더 상태에서 변환
  initialData={{ title: '', formData: '{}' }}
  onSave={async () => {}}
/>
```

### AdminSidebar navItems 확장
```typescript
// Source: frontend/src/features/admin/components/AdminSidebar.tsx
// navItems 배열 끝에 추가
const navItems = [
  // ... 기존 5개 항목
  { to: '/admin/templates', icon: LayoutTemplate, labelKey: 'sidebar.templates' },
] as const;
```

### Admin 라우트 확장
```typescript
// Source: frontend/src/App.tsx
// AdminRoute 내부에 추가
<Route path="templates" element={<TemplateListPage />} />
<Route path="templates/:id/builder" element={<TemplateBuilderPage />} />
```

### 필드 너비 지원 (DynamicForm 확장)
```typescript
// DynamicForm/DynamicReadOnly에 추가할 width 지원 패턴
// fields를 순회하며 width="half" 연속 2개를 같은 row에 배치
<div className="flex flex-wrap gap-4">
  {schema.fields.map((field) => (
    <div
      key={field.id}
      className={field.config?.width === 'half' ? 'w-[calc(50%-0.5rem)]' : 'w-full'}
    >
      <DynamicFieldRenderer ... />
    </div>
  ))}
</div>
```

### JSON 내보내기 패턴
```typescript
function exportSchemaAsJson(schema: SchemaDefinition, templateName: string) {
  const blob = new Blob([JSON.stringify(schema, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${templateName}-schema.json`;
  a.click();
  URL.revokeObjectURL(url);
}
```

### JSON 가져오기 검증 Zod 스키마
```typescript
import { z } from 'zod';

const fieldTypeSchema = z.enum(['text', 'textarea', 'number', 'date', 'select', 'table', 'staticText', 'hidden']);

const fieldDefinitionSchema: z.ZodType<FieldDefinition> = z.object({
  id: z.string().min(1),
  type: fieldTypeSchema,
  label: z.string().min(1),
  required: z.boolean(),
  config: z.object({}).passthrough().optional(),
});

const schemaDefinitionSchema = z.object({
  version: z.number().int().positive(),
  fields: z.array(fieldDefinitionSchema).min(1),
  conditionalRules: z.array(z.unknown()).default([]),
  calculationRules: z.array(z.unknown()).default([]),
});
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| react-beautiful-dnd | @hello-pangea/dnd | 2023 (fork) | 프로젝트에서 이미 hello-pangea 사용 중. 동일 API |
| dnd-kit | @hello-pangea/dnd | N/A | 프로젝트 일관성을 위해 hello-pangea 유지 |
| Redux 빌더 상태 | useReducer 로컬 상태 | N/A | 단일 페이지 상태에 전역 스토어 불필요 |

## Open Questions

1. **TemplateResponse에 isActive, schemaVersion, updatedAt 없음**
   - What we know: 백엔드 `TemplateDetailResponse`에는 있지만, 프론트엔드 `TemplateResponse` 타입에 없음
   - What's unclear: 기존 `TemplateResponse`를 확장할지, Admin 전용 응답 타입을 새로 만들지
   - Recommendation: Admin 목록 API(`GET /admin/templates`)가 `TemplateResponse`를 반환하고 있으므로, 백엔드에서 Admin용으로 isActive/schemaVersion/updatedAt를 포함하는 별도 응답 DTO를 만들거나, 기존 `TemplateResponse`를 확장. 프론트엔드에서는 `AdminTemplateResponse` 타입을 별도 정의하는 것이 깔끔.

2. **FieldConfig에 width 속성 추가 필요 (D-15, D-16)**
   - What we know: 현재 백엔드 FieldConfig에 width 필드가 없음
   - What's unclear: 백엔드 DTO 변경이 Phase 14 범위인지
   - Recommendation: 프론트엔드 FieldConfig 타입에 `width?: 'full' | 'half'` 추가. 백엔드 FieldConfig에도 `String width` 추가. Jackson의 @JsonInclude(NON_NULL)로 기존 스키마에 영향 없음

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | 프론트엔드 테스트 프레임워크 미설치 |
| Config file | none |
| Quick run command | `cd frontend && npx tsc --noEmit` (타입 체크만) |
| Full suite command | `cd frontend && npx tsc --noEmit` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| BLDR-01 | 3패널 레이아웃 렌더링 | manual-only | 브라우저 확인 | N/A |
| BLDR-02 | DnD 필드 추가 | manual-only | 브라우저 확인 | N/A |
| BLDR-03 | 필드 재정렬 | manual-only | 브라우저 확인 | N/A |
| BLDR-04 | 속성 패널 편집 | manual-only | 브라우저 확인 | N/A |
| BLDR-05 | 라이브 프리뷰 | manual-only | 브라우저 확인 | N/A |
| BLDR-06 | 템플릿 CRUD | manual-only | 브라우저 확인 | N/A |

### Sampling Rate
- **Per task commit:** `cd frontend && npx tsc --noEmit` (타입 체크)
- **Per wave merge:** `cd frontend && npx tsc --noEmit && cd ../backend && ./gradlew compileJava`
- **Phase gate:** 타입 체크 통과 + 브라우저 수동 확인

### Wave 0 Gaps
- 프론트엔드 단위 테스트 프레임워크 미설치 (vitest/jest 없음)
- DnD 인터랙션은 E2E 테스트 없이 수동 검증 필요
- 이 Phase에서 테스트 프레임워크 설치는 범위 밖 — 타입 체크로 대체

## Sources

### Primary (HIGH confidence)
- 프로젝트 코드 직접 확인: AdminSidebar.tsx, PositionTable.tsx, TemplateController.java, DynamicForm.tsx, templateApi.ts, dynamicForm.ts, ConfirmDialog.tsx
- @hello-pangea/dnd GitHub docs — multi-droppable, Droppable API
- npm registry — nanoid 5.1.7, @hello-pangea/dnd 18.0.1

### Secondary (MEDIUM confidence)
- @hello-pangea/dnd multi-container drag patterns (web search verified with GitHub docs)

### Tertiary (LOW confidence)
- None

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - 모든 라이브러리가 이미 설치되었거나 npm 확인 완료. nanoid만 추가 필요
- Architecture: HIGH - 기존 코드 패턴(PositionTable DnD, AdminLayout, templateApi) 직접 확인. 확장 방식 명확
- Pitfalls: HIGH - @hello-pangea/dnd multi-droppable 패턴과 react-hook-form 동기화 이슈는 잘 문서화된 문제

**Research date:** 2026-04-05
**Valid until:** 2026-05-05 (안정적인 라이브러리 스택, 30일 유효)

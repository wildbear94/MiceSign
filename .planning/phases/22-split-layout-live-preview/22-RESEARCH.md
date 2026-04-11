# Phase 22: 분할 레이아웃 + 라이브 미리보기 - Research

**Researched:** 2026-04-11
**Domain:** React UI 레이아웃, 실시간 미리보기, React Portal
**Confidence:** HIGH

## Summary

이 페이즈는 순수 프론트엔드 UI 작업으로, 기존 `TemplateFormModal.tsx` (334줄)를 near-fullscreen 분할 레이아웃으로 확장하고 새로운 `FormPreview` 컴포넌트를 만드는 것이 핵심이다. 백엔드 변경 없음, 새 라이브러리 설치 없음 -- 기존 스택(React 18, Tailwind CSS, Lucide icons, i18next)만으로 구현 가능하다.

핵심 기술 포인트: (1) 모달 크기를 `95vh/95vw`로 확장하고 flex 레이아웃으로 좌우 분할, (2) `schemaFields` 상태를 FormPreview에 props로 전달하여 React의 자연스러운 리렌더링으로 실시간 반영, (3) `createPortal`을 사용한 전체화면 미리보기 오버레이, (4) useState 기반 토글로 미리보기 패널 표시/숨김.

**Primary recommendation:** TemplateFormModal의 레이아웃만 변경하고 비즈니스 로직은 유지. FormPreview는 SchemaField[] props를 받아 읽기 전용 폼 모양을 렌더링하는 경량 컴포넌트로 신규 생성.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** 모달 크기를 near-fullscreen (95vh/95vw)으로 확장. 배경 딤 뒤로 기존 페이지가 살짝 보이는 빌더 도구 느낌
- **D-02:** 좌우 50:50 균등 분할. 리사이즈 불가, 고정 비율
- **D-03:** 기존 info/fields 탭 구조를 좌측 패널에 그대로 유지. 우측은 오직 미리보기 패널
- **D-04:** 전용 FormPreview 컴포넌트 신규 생성. Phase 13 DynamicForm과는 별도 -- 미리보기에 필요한 최소한만 구현하는 경량 컴포넌트
- **D-05:** 종이 문서 느낌 스타일링 -- 회색 배경(gray-100/gray-900) 위에 흰색 종이 카드 + 그림자
- **D-06:** 실시간 반영 -- schemaFields 상태가 변경될 때마다 FormPreview가 즉시 리렌더링. 별도 debounce 없이 React 상태 연동
- **D-07:** 포탈 오버레이 방식 -- 편집 모달 위에 새 포탈 모달이 뜸. 편집 상태 유지된 채 폼만 크게 표시. X 버튼으로 닫으면 편집 모달로 복귀
- **D-08:** 전체화면 미리보기 버튼은 우측 미리보기 패널 헤더에 배치
- **D-09:** 즉각 전환 -- 애니메이션 없이 즉시 토글. 미리보기 숨기면 편집 영역이 100% 너비로 확장
- **D-10:** 토글 버튼은 미리보기 패널 헤더에 배치. 전체화면 버튼 옆에 위치

### Claude's Discretion
- FormPreview 내부 필드 렌더링 구조 및 컴포넌트 분리 방식
- 미리보기 패널 헤더의 정확한 아이콘 선택 (Expand, EyeOff 등)
- 포탈 모달의 정확한 크기 및 패딩
- 필드가 없을 때 미리보기 패널의 빈 상태 UI
- 미리보기 패널 내부 스크롤 처리 방식

### Deferred Ideas (OUT OF SCOPE)
None
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| RFT-02 | TemplateFormModal을 near-fullscreen 분할 레이아웃으로 확장 (좌: 편집, 우: 프리뷰) | 모달 CSS 변경 + flex 분할 패턴 문서화 |
| PRV-01 | 관리자가 필드 구성 변경 시 오른쪽 패널에 실시간 폼 미리보기를 볼 수 있다 | FormPreview 컴포넌트 설계 + SchemaField[] props 연동 |
| PRV-02 | 관리자가 전체화면 미리보기 버튼으로 완성된 폼을 포탈 모달로 볼 수 있다 | React createPortal 패턴 문서화 |
| PRV-03 | 관리자가 프리뷰 패널 표시/숨김을 토글할 수 있다 | useState 토글 + 조건부 렌더링 패턴 |
</phase_requirements>

## Project Constraints (from CLAUDE.md)

- **프론트엔드 스택:** React 18 + Vite 5 + TypeScript + Zustand + TanStack Query v5 + TailwindCSS
- **양식 템플릿:** 하드코딩된 React 컴포넌트 (동적 폼 빌더 아님)
- **i18n:** i18next 사용, `admin` 네임스페이스
- **UI 라이브러리:** Lucide icons
- **언어:** UI 텍스트, 에러 메시지는 한국어

## Standard Stack

### Core (이미 설치됨 -- 추가 설치 불필요)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React | ^18.3.1 | 컴포넌트 렌더링, createPortal | 프로젝트 기존 스택 [VERIFIED: package.json] |
| TailwindCSS | (설치됨) | 모든 스타일링 | 프로젝트 기존 스택 [VERIFIED: 코드베이스 전체 사용] |
| Lucide React | ^1.7.0 | 아이콘 (Expand, EyeOff, Eye, X 등) | 프로젝트 기존 스택 [VERIFIED: package.json] |
| i18next | (설치됨) | 다국어 지원 | 프로젝트 기존 스택 [VERIFIED: i18n/config.ts] |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Tailwind flex 분할 | CSS Grid | 50:50 고정 비율이므로 flex로 충분, grid는 과도함 |
| createPortal | Dialog element | Portal이 더 유연하고 z-index 제어 용이 |
| React 상태 직접 전달 | Zustand store | 모달 내부 로컬 상태이므로 props drilling이 적절 |

**Installation:** 추가 설치 불필요

## Architecture Patterns

### 변경/추가 파일 구조
```
frontend/src/features/admin/components/
├── TemplateFormModal.tsx              # 수정: 레이아웃 변경 (near-fullscreen + 분할)
├── FormPreview/                       # 신규 폴더
│   ├── index.ts                       # export
│   ├── FormPreview.tsx                # 메인 미리보기 컴포넌트
│   ├── PreviewFieldRenderer.tsx       # 필드 타입별 렌더러
│   └── FullscreenPreviewPortal.tsx    # 전체화면 포탈 모달
└── SchemaFieldEditor/                 # 기존 유지 (변경 없음)
```

### Pattern 1: Near-Fullscreen 분할 레이아웃
**What:** 모달을 95vh/95vw로 확장하고 좌우 flex 분할
**When to use:** D-01, D-02, D-03 구현 시

```typescript
// TemplateFormModal.tsx 레이아웃 변경
// 기존: max-w-4xl max-h-[90vh] overflow-y-auto
// 변경: w-[95vw] h-[95vh] overflow-hidden + 내부 flex 분할
<div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 w-[95vw] h-[95vh] overflow-hidden flex flex-col">
  {/* Header: 제목 + 닫기 버튼 */}
  <div className="flex-shrink-0 px-6 py-4 border-b ...">
    <h2>...</h2>
    <button onClick={onClose}>...</button>
  </div>

  {/* Body: 좌우 분할 */}
  <div className="flex-1 flex min-h-0">
    {/* 좌측: 편집 영역 */}
    <div className={`${showPreview ? 'w-1/2' : 'w-full'} overflow-y-auto p-6`}>
      {/* 기존 탭 + 폼 + 액션 버튼 */}
    </div>

    {/* 우측: 미리보기 패널 (토글 가능) */}
    {showPreview && (
      <div className="w-1/2 border-l border-gray-200 dark:border-gray-700 flex flex-col">
        {/* 미리보기 헤더 */}
        <div className="flex-shrink-0 px-4 py-3 border-b flex items-center justify-between">
          <span>미리보기</span>
          <div className="flex gap-1">
            <button onClick={() => setFullscreen(true)}>
              <Maximize2 className="w-4 h-4" />
            </button>
            <button onClick={() => setShowPreview(false)}>
              <EyeOff className="w-4 h-4" />
            </button>
          </div>
        </div>
        {/* 미리보기 본문 */}
        <div className="flex-1 overflow-y-auto p-6 bg-gray-100 dark:bg-gray-900">
          <FormPreview fields={schemaFields} templateName={watchedName} />
        </div>
      </div>
    )}
  </div>
</div>
```
[VERIFIED: 기존 TemplateFormModal.tsx 구조 분석 기반]

### Pattern 2: FormPreview 컴포넌트
**What:** SchemaField[] 배열을 받아 종이 문서 느낌의 읽기 전용 폼 렌더링
**When to use:** D-04, D-05, D-06 구현 시

```typescript
// FormPreview.tsx
interface FormPreviewProps {
  fields: SchemaField[];
  templateName?: string;
}

export default function FormPreview({ fields, templateName }: FormPreviewProps) {
  if (fields.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400">
        {/* 빈 상태 UI */}
        <p>필드를 추가하면 미리보기가 표시됩니다</p>
      </div>
    );
  }

  return (
    // 종이 문서 느낌: 흰색 카드 + 그림자
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8 max-w-2xl mx-auto">
      {templateName && (
        <h3 className="text-lg font-semibold text-center mb-6 border-b pb-4">
          {templateName}
        </h3>
      )}
      <div className="space-y-4">
        {fields
          .filter(f => f.type !== 'hidden')
          .map(field => (
            <PreviewFieldRenderer key={field.id} field={field} />
          ))}
      </div>
    </div>
  );
}
```
[ASSUMED: 코드 패턴은 프로젝트 컨벤션과 D-04/D-05 결정 기반]

### Pattern 3: React createPortal for 전체화면 미리보기
**What:** 편집 모달 위에 포탈로 전체화면 미리보기 오버레이
**When to use:** D-07, D-08 구현 시

```typescript
// FullscreenPreviewPortal.tsx
import { createPortal } from 'react-dom';

interface FullscreenPreviewPortalProps {
  fields: SchemaField[];
  templateName?: string;
  onClose: () => void;
}

export default function FullscreenPreviewPortal({
  fields, templateName, onClose
}: FullscreenPreviewPortalProps) {
  // z-60: 기존 모달(z-50) 위에 표시
  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative bg-gray-100 dark:bg-gray-900 rounded-xl w-[90vw] h-[90vh] overflow-y-auto p-8">
        <button onClick={onClose} className="absolute top-4 right-4 ...">
          <X className="w-5 h-5" />
        </button>
        <FormPreview fields={fields} templateName={templateName} />
      </div>
    </div>,
    document.body
  );
}
```
[VERIFIED: React 18 createPortal API -- react-dom 내장 기능]

### Pattern 4: 미리보기 토글 (미리보기 숨김 시 토글 버튼 배치)
**What:** 미리보기 패널 표시/숨김 토글
**When to use:** D-09, D-10 구현 시

```typescript
// TemplateFormModal 내부
const [showPreview, setShowPreview] = useState(true);

// 미리보기가 숨겨졌을 때 편집 영역 하단이나 헤더에 "미리보기 표시" 버튼 필요
// 좌측 패널 헤더에 Eye 아이콘 버튼 배치
{!showPreview && (
  <button onClick={() => setShowPreview(true)} title="미리보기 표시">
    <Eye className="w-4 h-4" />
  </button>
)}
```
[ASSUMED: 토글 복원 버튼 위치는 Claude 재량]

### Anti-Patterns to Avoid
- **모달 내부 overflow-y-auto를 최상위에 유지:** 분할 레이아웃에서는 각 패널이 독립적으로 스크롤해야 함. 최상위에 overflow-y-auto를 유지하면 한쪽이 길 때 양쪽이 함께 스크롤됨
- **FormPreview에서 react-hook-form 사용:** 미리보기는 폼 제출이 불필요하므로 순수 렌더링만. RHF를 쓰면 불필요한 복잡도 추가
- **schemaFields를 별도 store에 저장:** 모달 내부 로컬 상태이므로 Zustand나 Context 불필요. props로 직접 전달이 가장 단순

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Portal 구현 | 커스텀 z-index 관리 | `createPortal(jsx, document.body)` | React 내장, 이벤트 버블링 자동 처리 [VERIFIED: React 18 API] |
| 아이콘 | SVG 직접 작성 | Lucide React icons | 프로젝트 표준 [VERIFIED: 코드베이스] |
| 다국어 | 하드코딩 한국어 | i18next `t()` 함수 | 프로젝트 표준 [VERIFIED: i18n/config.ts] |

## Common Pitfalls

### Pitfall 1: 모달 높이 overflow 처리 실수
**What goes wrong:** `h-[95vh]`로 고정했지만 내부 콘텐츠가 넘칠 때 레이아웃 깨짐
**Why it happens:** flex 컨테이너에서 `min-h-0`을 빠뜨리면 자식이 고유 크기를 유지하여 overflow가 작동하지 않음
**How to avoid:** flex-1 자식에 반드시 `min-h-0` 추가. 각 패널에 독립 `overflow-y-auto` 적용
**Warning signs:** 편집 영역이나 미리보기가 모달 밖으로 넘침

### Pitfall 2: 포탈 z-index 충돌
**What goes wrong:** 전체화면 미리보기가 기존 모달 뒤에 표시됨
**Why it happens:** 기존 모달이 z-50, 포탈도 z-50이면 DOM 순서에 따라 뒤에 갈 수 있음
**How to avoid:** 전체화면 포탈은 z-[60] 이상 사용. 기존 모달은 z-50
**Warning signs:** 전체화면 버튼 클릭해도 아무 변화 없음

### Pitfall 3: ESC 키 핸들링 충돌
**What goes wrong:** 전체화면 미리보기에서 ESC를 누르면 전체화면과 편집 모달이 동시에 닫힘
**Why it happens:** 기존 TemplateFormModal의 ESC 핸들러가 전체화면 포탈이 열려있을 때도 작동
**How to avoid:** ESC 핸들러에서 전체화면 상태 확인 -- 전체화면이 열려있으면 전체화면만 닫고 이벤트 전파 중단
**Warning signs:** ESC 키로 전체화면 닫을 때 편집 모달도 함께 사라짐

### Pitfall 4: 폼 액션 버튼 위치
**What goes wrong:** 기존 액션 버튼(닫기/저장)이 좌측 편집 패널 하단에 위치해야 하는데 스크롤 영역 안에 들어가 안 보임
**Why it happens:** 분할 레이아웃 전환 시 폼 구조 변경으로 버튼 위치가 모호해짐
**How to avoid:** 액션 버튼은 좌측 패널의 스크롤 영역 안에 배치하되, 충분한 padding-bottom 확보. 또는 좌측 패널 하단에 고정
**Warning signs:** 스크롤하지 않으면 저장 버튼이 보이지 않음

### Pitfall 5: 토글 복원 버튼 접근성
**What goes wrong:** 미리보기를 숨긴 후 다시 표시하는 방법을 찾지 못함
**Why it happens:** 미리보기 패널 헤더에 토글 버튼이 있었는데 패널을 숨기면 버튼도 사라짐
**How to avoid:** 미리보기 숨김 시 좌측 패널 헤더 또는 모달 헤더에 "미리보기 표시" 버튼 추가
**Warning signs:** 미리보기 숨긴 후 다시 켤 수 없음

## Code Examples

### 필드 타입별 미리보기 렌더러
```typescript
// PreviewFieldRenderer.tsx
// Source: 프로젝트 SchemaField 타입 + 기존 폼 패턴 참고
import type { SchemaField } from '../SchemaFieldEditor/types';

interface PreviewFieldRendererProps {
  field: SchemaField;
}

export default function PreviewFieldRenderer({ field }: PreviewFieldRendererProps) {
  const renderInput = () => {
    switch (field.type) {
      case 'text':
        return (
          <input
            type="text"
            disabled
            placeholder={field.config.placeholder || ''}
            className="w-full h-10 px-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-400 text-sm"
          />
        );
      case 'textarea':
        return (
          <textarea
            disabled
            rows={3}
            placeholder={field.config.placeholder || ''}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-400 text-sm resize-none"
          />
        );
      case 'number':
        return (
          <div className="flex items-center gap-2">
            <input
              type="number"
              disabled
              placeholder={field.config.placeholder || '0'}
              className="w-full h-10 px-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-400 text-sm"
            />
            {field.config.unit && (
              <span className="text-sm text-gray-500 flex-shrink-0">{field.config.unit}</span>
            )}
          </div>
        );
      case 'date':
        return (
          <input
            type="date"
            disabled
            className="w-full h-10 px-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-400 text-sm"
          />
        );
      case 'select':
        return (
          <select
            disabled
            className="w-full h-10 px-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-400 text-sm"
          >
            <option>선택하세요</option>
            {field.config.options?.map(opt => (
              <option key={opt.value}>{opt.label || opt.value}</option>
            ))}
          </select>
        );
      case 'staticText':
        return (
          <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
            {field.config.content || '(고정 텍스트)'}
          </p>
        );
      case 'table':
        return (
          <div className="border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden">
            <div className="bg-gray-50 dark:bg-gray-700 px-3 py-2 text-xs text-gray-500">
              표 필드 (컬럼 설정은 Phase 23에서 구현)
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
        {field.label || '(라벨 없음)'}
        {field.required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {renderInput()}
    </div>
  );
}
```
[VERIFIED: SchemaField 타입 정의(types.ts)와 기존 폼 컴포넌트(GeneralForm.tsx) 스타일 참고]

### i18n 키 추가 패턴
```json
// frontend/public/locales/ko/admin.json - templates 섹션에 추가
{
  "templates": {
    "preview": "미리보기",
    "previewEmpty": "필드를 추가하면 미리보기가 표시됩니다",
    "previewShow": "미리보기 표시",
    "previewHide": "미리보기 숨김",
    "previewFullscreen": "전체화면 미리보기",
    "previewClose": "미리보기 닫기"
  }
}
```
[VERIFIED: 기존 admin.json 구조 및 i18n 사용 패턴 확인]

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| 모달 내 단일 스크롤 | 패널별 독립 스크롤 | 이번 페이즈 | 좌우 패널 독립 탐색 가능 |
| createPortal 미사용 | createPortal 최초 도입 | 이번 페이즈 | 향후 다른 오버레이에 패턴 재사용 가능 |

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | FormPreview 폴더를 admin/components/ 하위에 생성 | Architecture Patterns | 낮음 -- 위치만 변경하면 됨 |
| A2 | 미리보기 숨김 시 복원 버튼을 모달 헤더에 배치 | Common Pitfalls | 낮음 -- UX 취향 차이 |
| A3 | table 타입 필드는 placeholder만 표시 (Phase 23에서 완성) | Code Examples | 낮음 -- Phase 23 범위 |

## Open Questions

1. **미리보기 상태 초기값**
   - What we know: `showPreview` 초기값이 `true`면 모달 열자마자 분할 뷰 표시
   - What's unclear: info 탭에서도 미리보기를 보여줄지, fields 탭에서만 보여줄지
   - Recommendation: fields 탭과 info 탭 모두에서 미리보기 표시 (D-03에 따라 우측은 항상 미리보기 패널). 미리보기 내용은 현재 schemaFields 상태 기준으로 렌더링

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | 미설정 (vitest 없음, jest 없음) |
| Config file | 없음 |
| Quick run command | N/A |
| Full suite command | N/A |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| RFT-02 | 모달 95vh/95vw + 좌우 분할 | manual-only | 시각적 확인 필요 | N/A |
| PRV-01 | 필드 변경 시 실시간 미리보기 | manual-only | 시각적 확인 필요 | N/A |
| PRV-02 | 전체화면 미리보기 포탈 | manual-only | 시각적 확인 필요 | N/A |
| PRV-03 | 미리보기 토글 | manual-only | 시각적 확인 필요 | N/A |

**Manual-only justification:** 모든 요구사항이 시각적 UI 레이아웃/렌더링 확인이 핵심. 테스트 프레임워크도 미설정 상태.

### Sampling Rate
- **Per task commit:** `npm run build` (TypeScript 컴파일 + Vite 빌드 성공 확인)
- **Per wave merge:** 수동 브라우저 테스트
- **Phase gate:** 4개 Success Criteria 수동 확인

### Wave 0 Gaps
None -- 테스트 프레임워크 설치는 이 페이즈 범위 밖

## Security Domain

이 페이즈는 순수 프론트엔드 UI 레이아웃 변경이며 인증/데이터/API 관련 변경 없음.

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | -- |
| V3 Session Management | no | -- |
| V4 Access Control | no | -- |
| V5 Input Validation | no | FormPreview는 읽기 전용 렌더링, 입력 받지 않음 |
| V6 Cryptography | no | -- |

## Sources

### Primary (HIGH confidence)
- `frontend/src/features/admin/components/TemplateFormModal.tsx` -- 현재 모달 구조 (334줄) 분석
- `frontend/src/features/admin/components/SchemaFieldEditor/types.ts` -- SchemaField, SchemaFieldType 타입 정의
- `frontend/src/features/admin/components/SchemaFieldEditor/constants.ts` -- FIELD_TYPE_META 메타데이터
- `frontend/public/locales/ko/admin.json` -- 기존 i18n 키 구조
- `frontend/package.json` -- React 18.3.1, Lucide React 1.7.0 확인

### Secondary (MEDIUM confidence)
- `frontend/src/features/document/components/templates/GeneralForm.tsx` -- 폼 렌더링 패턴 참고
- `frontend/src/i18n/config.ts` -- i18n 설정, admin 네임스페이스 확인

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- 추가 라이브러리 불필요, 기존 스택 확인 완료
- Architecture: HIGH -- 기존 코드 구조 분석 완료, 변경 범위 명확
- Pitfalls: HIGH -- 모달 레이아웃/포탈 관련 일반적인 React 패턴 기반

**Research date:** 2026-04-11
**Valid until:** 2026-05-11 (프론트엔드 UI 패턴, 변동 적음)

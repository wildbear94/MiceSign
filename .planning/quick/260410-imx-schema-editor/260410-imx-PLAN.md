---
phase: quick
plan: 260410-imx
type: execute
wave: 1
depends_on: []
files_modified:
  - frontend/src/features/admin/components/SchemaFieldEditor.tsx
  - frontend/src/features/admin/components/TemplateFormModal.tsx
  - frontend/src/features/admin/api/templateApi.ts
  - frontend/src/features/admin/hooks/useTemplates.ts
  - frontend/public/locales/ko/admin.json
  - frontend/public/locales/en/admin.json
autonomous: true
requirements: []
must_haves:
  truths:
    - "Admin can add fields of each type (text, textarea, number, date, select, staticText, hidden) to a template schema"
    - "Admin can edit field label, id, required flag, and type-specific config for each field"
    - "Admin can reorder fields via up/down buttons and delete fields with confirmation"
    - "Schema definition is saved to backend as JSON string on template create/update"
    - "Editing an existing template loads its current schemaDefinition into the editor"
  artifacts:
    - path: "frontend/src/features/admin/components/SchemaFieldEditor.tsx"
      provides: "Schema field builder component with add/edit/delete/reorder"
    - path: "frontend/src/features/admin/components/TemplateFormModal.tsx"
      provides: "Updated modal integrating SchemaFieldEditor, wider layout"
    - path: "frontend/src/features/admin/api/templateApi.ts"
      provides: "Updated Create/UpdateTemplateData with schemaDefinition field"
  key_links:
    - from: "TemplateFormModal.tsx"
      to: "SchemaFieldEditor.tsx"
      via: "fields state + onChange callback"
    - from: "TemplateFormModal.tsx"
      to: "templateApi.ts"
      via: "JSON.stringify(schemaDefinition) in submit handler"
    - from: "TemplateFormModal.tsx"
      to: "useTemplateDetail"
      via: "parse schemaDefinition on edit load"
---

<objective>
Add a schema field editor UI to the template create/edit modal in the admin section.
Admins can visually build form schemas by adding, configuring, reordering, and removing
fields. The schema is serialized as JSON and sent to the existing backend API.

Purpose: Enable admins to define custom form field layouts for approval templates without
editing code. This replaces manual JSON editing with a visual builder.

Output: SchemaFieldEditor component, updated TemplateFormModal, updated API types, i18n keys.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@frontend/src/features/admin/components/TemplateFormModal.tsx
@frontend/src/features/admin/api/templateApi.ts
@frontend/src/features/admin/hooks/useTemplates.ts
@frontend/public/locales/ko/admin.json
</context>

<tasks>

<task type="auto">
  <name>Task 1: Create SchemaFieldEditor component and update API types</name>
  <files>
    frontend/src/features/admin/components/SchemaFieldEditor.tsx,
    frontend/src/features/admin/api/templateApi.ts,
    frontend/public/locales/ko/admin.json,
    frontend/public/locales/en/admin.json
  </files>
  <action>
**1. Update API types** in `templateApi.ts`:
- Add `schemaDefinition?: string` to both `CreateTemplateData` and `UpdateTemplateData` interfaces. No other changes to this file.

**2. Add i18n keys** to `frontend/public/locales/ko/admin.json` inside the `templates` section:
```json
"schemaEditor": "필드 구성",
"addField": "필드 추가",
"fieldLabel": "필드 라벨",
"fieldId": "필드 ID",
"fieldRequired": "필수",
"fieldType": "필드 유형",
"fieldPlaceholder": "플레이스홀더",
"fieldMaxLength": "최대 길이",
"fieldMin": "최소값",
"fieldMax": "최대값",
"fieldUnit": "단위",
"fieldContent": "내용",
"fieldDefaultValue": "기본값",
"fieldOptions": "선택 옵션",
"fieldWidth": "너비",
"optionValue": "값",
"optionLabel": "라벨",
"addOption": "옵션 추가",
"removeOption": "옵션 삭제",
"removeField": "필드 삭제",
"confirmRemoveField": "이 필드를 삭제하시겠습니까?",
"noFields": "추가된 필드가 없습니다. '필드 추가' 버튼으로 필드를 추가하세요.",
"fieldTypes": {
  "text": "텍스트",
  "textarea": "텍스트(여러줄)",
  "number": "숫자",
  "date": "날짜",
  "select": "선택",
  "staticText": "고정 텍스트",
  "hidden": "숨김 필드"
}
```
Add equivalent English keys in `en/admin.json`.

**3. Create `SchemaFieldEditor.tsx`** — a self-contained component:

**TypeScript types** (define at top of file):
```typescript
export type SchemaFieldType = 'text' | 'textarea' | 'number' | 'date' | 'select' | 'staticText' | 'hidden';

export interface SchemaFieldConfig {
  placeholder?: string;
  maxLength?: number;
  min?: number;
  max?: number;
  unit?: string;
  options?: { value: string; label: string }[];
  content?: string;
  defaultValue?: string;
  width?: string;
}

export interface SchemaField {
  id: string;
  type: SchemaFieldType;
  label: string;
  required: boolean;
  config: SchemaFieldConfig;
}
```

**Props interface:**
```typescript
interface SchemaFieldEditorProps {
  fields: SchemaField[];
  onChange: (fields: SchemaField[]) => void;
}
```

**Component behavior:**
- Renders a section with header "필드 구성" (via i18n `templates.schemaEditor`) and an "필드 추가" button.
- The "필드 추가" button opens a dropdown/popover listing all 7 field types with Korean labels and type-appropriate icons from lucide-react:
  - text: `Type` icon, textarea: `AlignLeft`, number: `Hash`, date: `Calendar`, select: `List`, staticText: `FileText`, hidden: `EyeOff`
- When a type is selected, a new field is appended with:
  - `id`: auto-generated as `field_{timestamp}` (user can edit)
  - `label`: empty string (user fills in)
  - `required`: false
  - `config`: empty object `{}`
  - The new field is auto-expanded for editing
- Each field renders as a collapsible card:
  - **Collapsed:** Type badge (colored, e.g., blue for text, green for number, purple for select), label text (or "새 필드" placeholder if empty), required indicator star, up/down/delete buttons
  - **Expanded:** All editable properties:
    - `label` (text input, required)
    - `id` (text input, auto-slugified from label on first edit via simple mapping: strip spaces, camelCase or snake_case)
    - `required` (checkbox)
    - Type-specific config fields:
      - **text**: placeholder (text), maxLength (number)
      - **textarea**: placeholder (text), maxLength (number)
      - **number**: min (number), max (number), unit (text), placeholder (text)
      - **date**: (no config fields, show "이 유형은 추가 설정이 없습니다." message)
      - **select**: options list — each option has value + label inputs, with remove button per option, and "옵션 추가" button at bottom
      - **staticText**: content (textarea)
      - **hidden**: defaultValue (text)
- **Reorder:** Up/down arrow buttons (`ChevronUp`, `ChevronDown` from lucide). Disabled at boundaries (first item can't go up, last can't go down). Calls `onChange` with reordered array.
- **Delete:** Trash2 icon button. Shows `window.confirm()` with i18n `templates.confirmRemoveField` text. On confirm, removes field and calls `onChange`.
- **Empty state:** When no fields, show a dashed-border placeholder with "추가된 필드가 없습니다" message.

**Styling:**
- Use TailwindCSS matching existing admin patterns (gray borders, rounded-lg, dark mode support).
- Field cards: `border border-gray-200 dark:border-gray-700 rounded-lg` with hover states.
- Type badges: small colored pill badges using distinct colors per type.
- Add field dropdown: positioned below button, with `border shadow-lg rounded-lg bg-white dark:bg-gray-800`.
- Use `transition-all` for expand/collapse.
- Ensure all inputs use the same style pattern as TemplateFormModal (h-11, px-4, rounded-lg, focus ring).
  </action>
  <verify>
    <automated>cd /Volumes/USB-SSD/03-code/VibeCoding/MiceSign/frontend && npx tsc --noEmit 2>&1 | head -30</automated>
  </verify>
  <done>
    - SchemaFieldEditor.tsx exists with all 7 field types supported
    - Each field type has its specific config editor
    - Add/edit/delete/reorder all functional
    - API types updated with schemaDefinition field
    - i18n keys added in both ko and en
    - TypeScript compiles without errors
  </done>
</task>

<task type="auto">
  <name>Task 2: Integrate SchemaFieldEditor into TemplateFormModal</name>
  <files>
    frontend/src/features/admin/components/TemplateFormModal.tsx,
    frontend/src/features/admin/hooks/useTemplates.ts
  </files>
  <action>
**1. Update TemplateFormModal.tsx:**

- **Widen modal:** Change `max-w-[480px]` to `max-w-4xl`. Add `max-h-[90vh] overflow-y-auto` to the dialog content div so it scrolls when schema is large.
- **Add schema field state:** Add `useState` for schema fields:
  ```typescript
  const [schemaFields, setSchemaFields] = useState<SchemaField[]>([]);
  ```
  Import `SchemaField` type from `SchemaFieldEditor.tsx`.

- **Load existing schema on edit:** In the `useEffect` that resets form on open:
  - When `editingTemplate` is set, call `useTemplateDetail(editingTemplate.id)` to get full detail including `schemaDefinition`.
  - Parse `schemaDefinition` JSON string: extract `fields` array from the `SchemaDefinition` structure (`{ version, fields, conditionalRules, calculationRules }`), map to `SchemaField[]`, and set into `schemaFields` state.
  - When creating new template, reset `schemaFields` to `[]`.
  - Note: `useTemplateDetail` already exists in `useTemplates.ts`. Use the `editingTemplate?.id` as the parameter. The hook returns `data?.schemaDefinition` as a JSON string or null.

- **Add useTemplateDetail hook call** in the modal component:
  ```typescript
  const detailQuery = useTemplateDetail(editingTemplate?.id ?? null);
  ```
  In the reset useEffect, when `detailQuery.data?.schemaDefinition` is available, parse it:
  ```typescript
  if (detailQuery.data?.schemaDefinition) {
    try {
      const schema = JSON.parse(detailQuery.data.schemaDefinition);
      setSchemaFields(schema.fields || []);
    } catch { setSchemaFields([]); }
  } else {
    setSchemaFields([]);
  }
  ```

- **Embed SchemaFieldEditor:** After the existing form fields (after the icon field), add a horizontal divider (`<hr>`) and render:
  ```tsx
  <SchemaFieldEditor fields={schemaFields} onChange={setSchemaFields} />
  ```

- **Update onSubmit handler:** Before calling create/update mutation, serialize schema:
  ```typescript
  const schemaDefinition = JSON.stringify({
    version: 1,
    fields: schemaFields,
    conditionalRules: [],
    calculationRules: [],
  });
  ```
  Include `schemaDefinition` in both create and update mutation data objects.

**2. Ensure useTemplates.ts mutations pass schemaDefinition:**
- The `useCreateTemplate` and `useUpdateTemplate` hooks already pass the full data objects to the API. Since we added `schemaDefinition` to `CreateTemplateData` and `UpdateTemplateData` in Task 1, no hook changes are needed. Verify this is the case; if the hooks filter fields, add `schemaDefinition` to the passed-through data.

**Key details:**
- Do NOT break existing form behavior. All current fields (name, description, prefix, category, icon) must continue to work exactly as before.
- The schema editor section should have a clear visual separation (divider + section header) from the basic template info fields.
- When schemaFields is empty and user is creating, the schemaDefinition should still be sent as `{"version":1,"fields":[],"conditionalRules":[],"calculationRules":[]}` (valid empty schema).
- Loading state: while `detailQuery` is loading on edit, show a small spinner or skeleton in the schema editor area. Use the existing `Loader2` icon pattern.
  </action>
  <verify>
    <automated>cd /Volumes/USB-SSD/03-code/VibeCoding/MiceSign/frontend && npx tsc --noEmit 2>&1 | head -30</automated>
  </verify>
  <done>
    - TemplateFormModal renders SchemaFieldEditor below existing fields
    - Modal is wider (max-w-4xl) with scrollable content
    - Creating a template sends schemaDefinition JSON to API
    - Editing a template loads existing schemaDefinition into field editor
    - All existing template form functionality preserved (name, description, prefix, category, icon)
    - TypeScript compiles without errors
  </done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <what-built>Schema field editor integrated into template create/edit modal. Supports 7 field types with type-specific config, reorder, delete, and serialization to backend API.</what-built>
  <how-to-verify>
    1. Navigate to admin template management page
    2. Click "양식 추가" to open create modal — modal should be wider now
    3. Fill in basic info (name, prefix, etc.)
    4. In the "필드 구성" section, click "필드 추가" and add one of each type:
       - 텍스트: verify placeholder and maxLength config inputs appear
       - 숫자: verify min, max, unit config inputs appear
       - 선택: verify option list with add/remove buttons works
       - 날짜: verify "추가 설정 없음" message shows
       - 고정 텍스트: verify content textarea appears
       - 숨김 필드: verify defaultValue input appears
    5. Reorder fields using up/down buttons
    6. Delete a field (confirm dialog should appear)
    7. Submit the template — check browser DevTools network tab that schemaDefinition JSON is included in the POST body
    8. Open an existing template for edit — verify its existing schema fields load into the editor
    9. Modify schema and save — verify PUT request includes updated schemaDefinition
  </how-to-verify>
  <resume-signal>Type "approved" or describe issues</resume-signal>
</task>

</tasks>

<verification>
- `cd frontend && npx tsc --noEmit` passes
- SchemaFieldEditor component renders without runtime errors
- Template create/update API calls include schemaDefinition field
- Existing template form fields still work correctly
</verification>

<success_criteria>
- Admin can visually build form schemas with 7 field types
- Schema is properly serialized and sent to backend on create/update
- Existing schema loads correctly when editing a template
- No regression in existing template CRUD functionality
</success_criteria>

<output>
After completion, update `.planning/quick/260410-imx-schema-editor/260410-imx-SUMMARY.md`
</output>

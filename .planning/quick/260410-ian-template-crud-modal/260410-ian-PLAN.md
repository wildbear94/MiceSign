---
phase: quick
plan: 260410-ian
type: execute
wave: 1
depends_on: []
files_modified:
  - frontend/src/features/admin/api/templateApi.ts
  - frontend/src/features/admin/hooks/useTemplates.ts
  - frontend/src/features/admin/components/TemplateFormModal.tsx
  - frontend/src/features/admin/components/TemplateTable.tsx
  - frontend/src/features/admin/pages/TemplateListPage.tsx
  - frontend/public/locales/ko/admin.json
autonomous: true
must_haves:
  truths:
    - "Admin can click '양식 추가' button on template list page to open create modal"
    - "Admin can fill name, description, prefix, category, icon and submit to create a new template"
    - "Admin can click edit button on any template row to open edit modal with pre-filled data"
    - "Admin can modify template fields (except prefix) and save changes"
    - "Form validation prevents submission with empty required fields"
    - "Success/error toasts appear after create/update operations"
  artifacts:
    - path: "frontend/src/features/admin/components/TemplateFormModal.tsx"
      provides: "Create/edit modal for approval templates"
    - path: "frontend/src/features/admin/api/templateApi.ts"
      provides: "API methods for create, update, getDetail"
    - path: "frontend/src/features/admin/hooks/useTemplates.ts"
      provides: "TanStack Query hooks for create, update, detail"
  key_links:
    - from: "TemplateListPage.tsx"
      to: "TemplateFormModal.tsx"
      via: "showCreateModal/editingTemplate state"
    - from: "TemplateFormModal.tsx"
      to: "useCreateTemplate/useUpdateTemplate hooks"
      via: "mutateAsync on form submit"
    - from: "useTemplates.ts hooks"
      to: "templateApi.ts"
      via: "mutationFn calling API methods"
---

<objective>
Add create and edit modal to the template management page, following the established PositionFormModal pattern.

Purpose: Allow admins to register new approval templates and edit existing ones through a modal form UI, completing the CRUD functionality for template management.
Output: Working create/edit modal with API integration, form validation, i18n, and toast feedback.
</objective>

<execution_context>
@.claude/get-shit-done/workflows/execute-plan.md
@.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@frontend/src/features/admin/components/PositionFormModal.tsx (reference pattern)
@frontend/src/features/admin/pages/PositionPage.tsx (page integration pattern)
@frontend/src/features/admin/api/templateApi.ts (extend)
@frontend/src/features/admin/hooks/useTemplates.ts (extend)
@frontend/src/features/admin/components/TemplateTable.tsx (add edit button)
@frontend/src/features/admin/pages/TemplateListPage.tsx (add create button + modal)
@frontend/public/locales/ko/admin.json (add i18n keys)

<interfaces>
<!-- Backend API contracts (already exist, no backend changes needed) -->

POST /api/v1/admin/templates
  Request: { name: string, description?: string, prefix: string, schemaDefinition?: string, category?: string, icon?: string }
  Response: ApiResponse<AdminTemplateDetailResponse>

PUT /api/v1/admin/templates/{id}
  Request: { name?: string, description?: string, schemaDefinition?: string, isActive?: boolean, sortOrder?: number, category?: string, icon?: string, budgetEnabled?: boolean }
  Response: ApiResponse<AdminTemplateDetailResponse>

GET /api/v1/admin/templates/{id}
  Response: ApiResponse<AdminTemplateDetailResponse>
  AdminTemplateDetailResponse: { id, code, name, description, prefix, isActive, sortOrder, schemaDefinition, schemaVersion, isCustom, category, icon, createdBy, budgetEnabled, versionHistory, createdAt, updatedAt }

<!-- Existing frontend types from templateApi.ts -->
export interface TemplateListItem {
  id: number; code: string; name: string; description: string; prefix: string;
  isActive: boolean; sortOrder: number; isCustom: boolean; category: string;
  icon: string; budgetEnabled: boolean;
}
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: API layer + hooks for create/update/getDetail</name>
  <files>
    frontend/src/features/admin/api/templateApi.ts
    frontend/src/features/admin/hooks/useTemplates.ts
  </files>
  <action>
1. In templateApi.ts, add types and methods:

```typescript
export interface TemplateDetailItem {
  id: number;
  code: string;
  name: string;
  description: string;
  prefix: string;
  isActive: boolean;
  sortOrder: number;
  schemaDefinition: string | null;
  schemaVersion: number;
  isCustom: boolean;
  category: string;
  icon: string;
  createdBy: string;
  budgetEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTemplateData {
  name: string;
  description?: string;
  prefix: string;
  category?: string;
  icon?: string;
}

export interface UpdateTemplateData {
  name?: string;
  description?: string;
  category?: string;
  icon?: string;
}
```

Add to templateApi object:
- `getDetail: (id: number) => apiClient.get<ApiResponse<TemplateDetailItem>>(\`${BASE}/${id}\`)`
- `create: (data: CreateTemplateData) => apiClient.post<ApiResponse<TemplateDetailItem>>(BASE, data)`
- `updateTemplate: (id: number, data: UpdateTemplateData) => apiClient.put<ApiResponse<TemplateDetailItem>>(\`${BASE}/${id}\`, data)`

Keep existing `update` method (used for toggle) as-is. Name the new one `updateTemplate` to avoid collision.

2. In useTemplates.ts, add three hooks following the existing pattern:

- `useTemplateDetail(id: number | null)` — useQuery with queryKey ['admin', 'templates', id], enabled only when id is not null. Returns detail for pre-filling edit form.
- `useCreateTemplate()` — useMutation calling templateApi.create, invalidates ['admin', 'templates'] on success.
- `useUpdateTemplate()` — useMutation calling templateApi.updateTemplate with {id, data} parameter shape, invalidates ['admin', 'templates'] on success.
  </action>
  <verify>
    <automated>cd /Volumes/USB-SSD/03-code/VibeCoding/MiceSign/frontend && npx tsc --noEmit 2>&1 | head -30</automated>
  </verify>
  <done>templateApi.ts exports create/updateTemplate/getDetail methods with proper types. useTemplates.ts exports useCreateTemplate, useUpdateTemplate, useTemplateDetail hooks. TypeScript compiles without errors.</done>
</task>

<task type="auto">
  <name>Task 2: TemplateFormModal + page/table integration + i18n</name>
  <files>
    frontend/src/features/admin/components/TemplateFormModal.tsx
    frontend/src/features/admin/pages/TemplateListPage.tsx
    frontend/src/features/admin/components/TemplateTable.tsx
    frontend/public/locales/ko/admin.json
  </files>
  <action>
1. Create TemplateFormModal.tsx following PositionFormModal pattern exactly:

Props interface:
```typescript
interface TemplateFormModalProps {
  open: boolean;
  onClose: () => void;
  editingTemplate: TemplateListItem | null;  // null = create mode
  onSuccess?: () => void;
}
```

Zod schema:
```typescript
const templateSchema = z.object({
  name: z.string().min(1, '양식 이름을 입력해주세요.').max(100),
  description: z.string().max(500).optional().or(z.literal('')),
  prefix: z.string().min(1, '접두어를 입력해주세요.').max(10),
  category: z.string().max(50).optional().or(z.literal('')),
  icon: z.string().max(50).optional().or(z.literal('')),
});
```

Key behaviors:
- Create mode: all fields editable. prefix field shown.
- Edit mode: prefix field hidden (immutable after creation). Pre-fill from editingTemplate prop (name, description, category, icon from TemplateListItem — no need to fetch detail since list already has these fields).
- useEffect resets form when open/editingTemplate changes (same as PositionFormModal pattern).
- Focus trap + Escape key handling (copy from PositionFormModal).
- On submit: call useCreateTemplate or useUpdateTemplate mutateAsync.
- Error handling: AxiosError catch with setFormError on name field (same pattern as PositionFormModal).
- Loading state from isPending on both mutations.
- Modal max-width: max-w-[480px] (slightly wider than Position modal for more fields).

Form layout (vertical stack, same styling as PositionFormModal):
- name (required) — label: t('templates.templateName')
- description (optional, textarea 3 rows) — label: t('templates.templateDescription')
- prefix (required, create-only) — label: t('templates.templatePrefix')
- category (optional) — label: t('templates.templateCategory')
- icon (optional) — label: t('templates.templateIcon')
- Action buttons: cancel + submit (same layout as PositionFormModal)

2. Update TemplateListPage.tsx — follow PositionPage pattern:
- Import useState, Plus icon, TemplateFormModal, TemplateListItem type.
- Add state: `showCreateModal` (boolean), `editingTemplate` (TemplateListItem | null).
- Add header with title + "양식 추가" button (Plus icon + t('templates.addTemplate')).
- Render TemplateFormModal with open={showCreateModal || !!editingTemplate}, onClose resets both states.
- Pass onEdit callback to TemplateTable: `onEdit={(t) => setEditingTemplate(t)}`.

3. Update TemplateTable.tsx:
- Add `onEdit` prop: `onEdit?: (template: TemplateListItem) => void`.
- Add a new "관리" column header after status column.
- Add edit button (Pencil icon from lucide-react) per row in new column. Styling: text-gray-400 hover:text-blue-600 p-1 rounded. onClick calls onEdit.

4. Add i18n keys to admin.json templates section:
```json
"addTemplate": "양식 추가",
"editTemplate": "양식 수정",
"templateName": "양식 이름",
"templateDescription": "설명",
"templatePrefix": "문서번호 접두어",
"templateCategory": "카테고리",
"templateIcon": "아이콘",
"createSuccess": "양식이 추가되었습니다",
"updateSuccess": "양식 정보가 수정되었습니다"
```

Also add to toast section:
```json
"templateCreated": "양식이 추가되었습니다.",
"templateUpdated": "양식 정보가 수정되었습니다."
```
  </action>
  <verify>
    <automated>cd /Volumes/USB-SSD/03-code/VibeCoding/MiceSign/frontend && npx tsc --noEmit 2>&1 | head -30</automated>
  </verify>
  <done>
- TemplateFormModal renders with all 5 fields in create mode, 4 fields (no prefix) in edit mode.
- TemplateListPage shows "양식 추가" button that opens create modal.
- TemplateTable rows have edit button that opens edit modal with pre-filled data.
- Form validation blocks empty name/prefix submission.
- Successful create/update shows toast and closes modal.
- All UI text uses i18n keys from admin.json.
- TypeScript compiles without errors.
  </done>
</task>

</tasks>

<verification>
1. TypeScript compilation: `cd frontend && npx tsc --noEmit` passes
2. Dev server: `cd frontend && npm run dev` starts without errors
3. Manual check: Navigate to admin template management page, verify create button appears, modal opens/closes, edit buttons appear per row
</verification>

<success_criteria>
- Template list page has "양식 추가" button in header
- Clicking "양식 추가" opens modal with name, description, prefix, category, icon fields
- Clicking edit (pencil) on a row opens modal pre-filled with that template's data, prefix field hidden
- Create submits POST /api/v1/admin/templates, shows success toast, refreshes list
- Edit submits PUT /api/v1/admin/templates/{id}, shows success toast, refreshes list
- Validation errors display inline below fields
- All text is i18n-ized in Korean
</success_criteria>

<output>
After completion, create `.planning/quick/260410-ian-template-crud-modal/260410-ian-SUMMARY.md`
</output>

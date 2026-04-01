---
status: draft
phase: 3
phase_name: Organization Management
design_system: manual (TailwindCSS + Pretendard)
created: 2026-04-01
---

# UI-SPEC: Phase 3 — Organization Management

## 1. Design Tokens

### 1.1 Spacing

8-point scale with 4px half-step for tight elements.

| Token | Value | Usage |
|-------|-------|-------|
| `space-1` | 4px (`p-1`) | Icon-to-text gap inside compact elements |
| `space-2` | 8px (`p-2`, `gap-2`) | Inline element gaps, tree node padding |
| `space-3` | 12px (`p-3`, `gap-3`) | Card inner padding (compact), button gaps |
| `space-4` | 16px (`p-4`, `gap-4`) | Section padding, form field spacing, sidebar item padding |
| `space-6` | 24px (`p-6`, `gap-6`) | Modal inner padding, page section gaps |
| `space-8` | 32px (`p-8`) | Page top/bottom padding |
| `space-12` | 48px (`p-12`) | Not used in this phase |

**Touch targets:** All interactive elements minimum 44px (`h-11`) height. Established in Phase 2 login form inputs and buttons.

**Tree indentation:** 16px (`ml-4`) per depth level, matching D-09 max 3 levels = max 48px indent.

### 1.2 Typography

Font family: `Pretendard Variable` (established in `tailwind.config.js`).

| Role | Size | Weight | Line Height | Tailwind Classes |
|------|------|--------|-------------|-----------------|
| Page heading | 20px | 600 (semibold) | 1.2 | `text-xl font-semibold leading-tight` |
| Section heading / Modal title | 18px | 600 (semibold) | 1.2 | `text-lg font-semibold` |
| Body / Table cells / Form labels | 14px | 400 (regular) | 1.5 | `text-sm` |
| Body bold / Column headers / Labels | 14px | 600 (semibold) | 1.5 | `text-sm font-semibold` |
| Caption / Badges / Helper text | 12px | 400 (regular) | 1.5 | `text-xs` |

**Weights used:** 400 (regular) and 600 (semibold) only. Matches Phase 2 pattern.

### 1.3 Color

60/30/10 split applied to admin layout.

| Role | Color | Tailwind | Usage |
|------|-------|----------|-------|
| **Dominant (60%)** | White / gray-900 | `bg-white dark:bg-gray-900` | Page background, content area |
| **Secondary (30%)** | gray-50 / gray-800 | `bg-gray-50 dark:bg-gray-800` | Sidebar background, card surfaces, table header, detail panel |
| **Accent (10%)** | blue-600 | `bg-blue-600 text-white` | Primary action buttons, selected tree node highlight, active sidebar item, focus rings |

**Accent reserved for:** Primary CTA buttons (추가, 저장), selected/active state indicators (sidebar nav item, selected tree node `bg-blue-50 text-blue-700`), focus ring (`focus:ring-blue-600`).

**Semantic colors:**

| Semantic | Light | Dark | Usage |
|----------|-------|------|-------|
| Destructive | `text-red-600` / `bg-red-600` | `text-red-400` / `bg-red-600` | Deactivate button, validation errors |
| Success | `text-green-700` / `bg-green-50` | `text-green-400` / `bg-green-900/20` | Success toasts (from Phase 2 pattern) |
| Warning | `text-amber-700` / `bg-amber-50` | `text-amber-400` / `bg-amber-900/20` | Confirmation prompts |
| Inactive | `opacity-50` + `bg-gray-200` badge | Same | Deactivated departments/positions/users |

### 1.4 Border & Shadow

| Element | Border | Radius | Shadow |
|---------|--------|--------|--------|
| Modal card | `border border-gray-200 dark:border-gray-700` | `rounded-xl` | `shadow-lg` |
| Table | `border border-gray-200 dark:border-gray-700` | `rounded-lg` | none |
| Input fields | `border border-gray-300 dark:border-gray-600` | `rounded-lg` | none |
| Sidebar | `border-r border-gray-200 dark:border-gray-700` | none | none |
| Detail panel | `border-l border-gray-200 dark:border-gray-700` | none | none |
| Badges | none | `rounded` (4px) | none |
| Dragging row | none | none | `shadow-lg` |

All values match Phase 2 established patterns from `AdminPasswordResetModal` and `LoginForm`.

### 1.5 Icons

Library: `lucide-react` (already installed, v1.7.0).

| Context | Icon | Size |
|---------|------|------|
| Sidebar nav: departments | `Building2` | `w-5 h-5` |
| Sidebar nav: positions | `Award` | `w-5 h-5` |
| Sidebar nav: users | `Users` | `w-5 h-5` |
| Tree expand/collapse | `ChevronRight` (rotate-90 when expanded) | `w-4 h-4` |
| Add / Create button | `Plus` | `w-4 h-4` |
| Edit action | `Pencil` | `w-4 h-4` |
| Drag handle | `GripVertical` | `w-4 h-4` |
| Search input | `Search` | `w-4 h-4` |
| Filter clear | `X` | `w-4 h-4` |
| Loading spinner | `Loader2` (animate-spin) | `w-4 h-4` |
| Modal close | `X` | `w-5 h-5` |
| Sort ascending | `ChevronUp` | `w-4 h-4` |
| Sort descending | `ChevronDown` | `w-4 h-4` |
| Empty state | `FolderOpen` (departments) / `UserX` (users) | `w-12 h-12` |

## 2. Component Inventory

### 2.1 Layout Components

#### AdminLayout
- **Structure:** Fixed left sidebar (240px / `w-60`) + scrollable content area
- **Sidebar:** `bg-gray-50 dark:bg-gray-800` with `border-r border-gray-200 dark:border-gray-700`, full viewport height
- **Content:** `flex-1 overflow-auto`, padded with `p-6 sm:p-8`
- **Responsive:** Sidebar collapses to icon-only (`w-16`) below 1024px breakpoint, or hidden below 768px with hamburger toggle

#### AdminSidebar
- **Nav items:** Vertical list, each item `px-4 py-3 flex items-center gap-3 rounded-lg text-sm`
- **Active item:** `bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400 font-semibold`
- **Inactive item:** `text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700`
- **Sections:** 부서 관리, 직급 관리, 사용자 관리 (D-01)
- **Visibility:** Only renders when `user.role !== 'USER'` (D-02)

### 2.2 Department Management Components

#### DepartmentPage
- **Layout:** Two-column split — left panel (tree, ~40% width `w-2/5`) + right panel (detail, ~60% width `w-3/5`)
- **Header:** Page title `text-xl font-semibold` + "부서 추가" primary button (top-right)
- **Filter bar:** Text input with `Search` icon above tree, and toggle checkbox "비활성 부서 표시" (D-12, D-14)

#### DepartmentTree
- **Root:** `div` with recursive `DepartmentTreeNode` children
- **Empty state:** Centered `FolderOpen` icon (gray-300) + "부서가 없습니다. 첫 부서를 추가해주세요." text + "부서 추가" button (D-17)

#### DepartmentTreeNode
- **Container:** `flex items-center gap-1 px-2 py-1.5 rounded cursor-pointer`
- **Hover:** `hover:bg-gray-100 dark:hover:bg-gray-700`
- **Selected:** `bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400`
- **Inactive:** `opacity-50` with `text-xs bg-gray-200 dark:bg-gray-600 px-1 rounded` badge "비활성" (D-14)
- **Member count:** `text-xs text-gray-400 ml-1` showing `(N)` (D-11)
- **Expand/collapse:** `ChevronRight` with `transition-transform duration-150` + `rotate-90` when expanded
- **Children indentation:** `ml-4` (16px per level)
- **Default state:** All nodes expanded on initial load

#### DepartmentDetailPanel
- **Trigger:** Clicking a tree node populates this panel (D-13)
- **Header:** Department name as `text-lg font-semibold` + "수정" icon button
- **Member list:** Simple list of members with name, position name, status badge
- **Empty member state:** "소속 직원이 없습니다." centered text
- **Border:** `border-l border-gray-200 dark:border-gray-700`

#### DepartmentFormModal
- **Trigger:** "부서 추가" button or "수정" button on tree node / detail panel
- **Fields:** 부서명 (text input, required), 상위 부서 (dropdown, optional — D-15), 정렬 순서 (number input)
- **Parent dropdown:** Excludes self and own descendants when editing (prevents circular ref)
- **Validation:** Name required, globally unique (D-10)
- **Modal style:** Matches Phase 2 `AdminPasswordResetModal` pattern — `max-w-[400px]`, `rounded-xl`, `shadow-lg`, `p-6`
- **Buttons:** "취소" (secondary) + "저장" (primary blue)

### 2.3 Position Management Components

#### PositionPage
- **Layout:** Single-column centered table, max-width `max-w-3xl mx-auto`
- **Header:** Page title + "직급 추가" primary button
- **Table columns:** 직급명, 순서, 상태, 액션 (D-37)

#### PositionTable
- **Drag-and-drop:** `@hello-pangea/dnd` wrapping table body (D-39)
- **Drag handle:** `GripVertical` icon on the left of each row, `cursor-grab` / `cursor-grabbing`
- **Dragging state:** Row gets `bg-blue-50 shadow-lg` (visual lift feedback)
- **Table style:** `w-full border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden`
- **Header row:** `bg-gray-50 dark:bg-gray-800 text-sm font-semibold text-gray-600 dark:text-gray-400`
- **Body rows:** `text-sm text-gray-900 dark:text-gray-50 border-t border-gray-100 dark:border-gray-700`
- **Actions column:** "수정" text button (`text-blue-600 hover:text-blue-700`) + "비활성화" text button (`text-red-600 hover:text-red-700`)
- **Inactive rows:** `opacity-50` with "비활성" badge

#### PositionFormModal
- **Fields:** 직급명 (text input, required, globally unique — D-41), 정렬 순서 (auto-assigned for new, shown as info for edit)
- **Modal style:** Same as `DepartmentFormModal`

### 2.4 User Management Components

#### UserListPage
- **Layout:** Full-width with filter bar above table
- **Header:** Page title + "사용자 추가" primary button

#### UserFilterBar
- **Layout:** `flex flex-wrap gap-3 items-end` (D-19)
- **Filters:**
  - 부서: dropdown (`select` element), shows all active departments as flat list
  - 역할: dropdown with options SUPER_ADMIN / ADMIN / USER
  - 상태: dropdown with options 활성 / 비활성 / 퇴직
  - 검색: text input with `Search` icon, placeholder "이름, 이메일, 사번 검색"
- **Each filter:** `h-9 text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-3`
- **Clear all:** "초기화" text button to reset filters

#### UserTable
- **Columns:** 사번, 이름, 이메일, 부서, 직급, 역할, 상태 (D-18)
- **Sortable columns:** Click header to toggle sort. Active sort shows `ChevronUp` or `ChevronDown` icon. Sort backed by Pageable (D-30)
- **Header style:** `bg-gray-50 dark:bg-gray-800 text-sm font-semibold text-gray-600 dark:text-gray-400 cursor-pointer hover:text-gray-900 dark:hover:text-gray-200`
- **Row hover:** `hover:bg-gray-50 dark:hover:bg-gray-800/50`
- **Row click:** Navigates to user detail page (D-23) — `cursor-pointer`
- **Role badge colors:**
  - SUPER_ADMIN: `bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400`
  - ADMIN: `bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400`
  - USER: `bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300`
- **Status badge colors:**
  - ACTIVE: `bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400`
  - INACTIVE: `bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400`
  - RETIRED: `bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400`
- **Pagination:** Below table, showing "N건 중 X-Y" + page navigation buttons. Default 20 items per page.
- **Empty state:** "등록된 사용자가 없습니다." centered in table body

#### UserFormModal (Create)
- **Fields (D-20):**
  - 사번 (text, required, unique — D-28)
  - 이름 (text, required)
  - 이메일 (email, required, unique)
  - 부서 (dropdown, required)
  - 직급 (dropdown, required)
  - 역할 (dropdown: USER / ADMIN / SUPER_ADMIN — constrained by D-32)
  - 전화번호 (text, optional)
  - 초기 비밀번호 (password with toggle, required — D-21)
- **Role dropdown:** If current user is ADMIN, only USER option available. SUPER_ADMIN sees all roles (D-32)
- **Modal size:** `max-w-[500px]` (wider than dept/position modals due to more fields)
- **Layout:** Single-column form, fields stacked vertically with `space-y-4`
- **Buttons:** "취소" (secondary) + "생성" (primary blue)

#### UserDetailPage
- **Layout:** Full-width card with profile information grid
- **Default mode:** Read-only display of all fields in a 2-column grid (`grid grid-cols-2 gap-4`) (D-24)
- **Fields displayed:** 사번, 이름, 이메일, 부서, 직급, 역할, 상태, 전화번호, 마지막 로그인, 계정 생성일 (D-29)
- **Edit mode:** Toggle via "수정" button — fields become editable inputs, "저장" + "취소" buttons appear (D-24)
- **Action buttons (top-right):**
  - "수정" (`Pencil` icon + text, blue)
  - "비밀번호 초기화" — opens `AdminPasswordResetModal` (D-25)
  - "계정 잠금 해제" — renders `AdminUnlockButton` (D-25, shown only if account is locked)
  - "비활성화" (red text, shown only if user is ACTIVE and not self — D-33)
- **Back navigation:** "< 사용자 목록" breadcrumb link at top

### 2.5 Shared Components

#### ConfirmDialog
- **Purpose:** Reusable confirmation modal for destructive actions (D-06, D-26)
- **Structure:** Overlay + centered card (`max-w-[360px]`)
- **Content:** Warning icon (amber) + title + description message + two buttons
- **Buttons:** "취소" (secondary) + action button (red for destructive: "비활성화")
- **Variants:**
  - Department deactivation: "이 부서에 N명의 직원이 소속되어 있습니다. 비활성화하시겠습니까?" (D-06)
  - Department move: "N명의 직원이 영향을 받습니다. 상위 부서를 변경하시겠습니까?" (D-16)
  - Position deactivation blocked: "이 직급에 N명의 직원이 소속되어 있습니다. 먼저 직원의 직급을 변경해주세요." (D-40, info only — single "확인" button)
  - User deactivation: "이 사용자를 비활성화하시겠습니까?" (D-26)

#### Pagination
- **Layout:** `flex items-center justify-between` below table
- **Left:** Total count: "전체 N건"
- **Right:** Page buttons — Previous (`<`), page numbers, Next (`>`)
- **Active page:** `bg-blue-600 text-white rounded`
- **Inactive page:** `text-gray-600 hover:bg-gray-100 rounded`
- **Disabled nav:** `text-gray-300 cursor-not-allowed`

## 3. Interaction Patterns

### 3.1 Tree Node Selection
1. User clicks a department node in tree
2. Node gets selected style (`bg-blue-50 text-blue-700`)
3. Right detail panel loads members for that department via `GET /api/v1/admin/departments/{id}/members`
4. Loading state: skeleton lines in detail panel during fetch

### 3.2 Tree Expand/Collapse
1. User clicks `ChevronRight` icon on a node with children
2. Icon rotates 90 degrees (`transition-transform duration-150`)
3. Children slide into view (simple `block/hidden` toggle — no animation needed for 3-level tree)

### 3.3 Department Filter
1. User types in search input above tree
2. Tree filters client-side (already loaded all departments) to show matching nodes + their ancestors
3. Non-matching nodes hidden; matching nodes highlighted
4. Clearing input restores full tree

### 3.4 Position Drag-and-Drop
1. User grabs `GripVertical` handle on a position row
2. Row lifts with `shadow-lg` + `bg-blue-50`
3. Placeholder gap shows where item will drop
4. On drop: optimistic UI reorder + `PUT /api/v1/admin/positions/reorder` with full ordered ID list
5. On API error: revert to previous order + show error toast

### 3.5 User Table Sort
1. User clicks a sortable column header
2. First click: ascending (show `ChevronUp`)
3. Second click: descending (show `ChevronDown`)
4. Third click: remove sort (no icon)
5. API call with `sort=fieldName,asc|desc` param
6. Table shows loading indicator during fetch

### 3.6 User Detail Edit Mode
1. User clicks "수정" button on detail page
2. Read-only text fields transition to editable inputs
3. "수정" button replaced by "저장" + "취소" buttons
4. "취소" reverts all changes and returns to read-only mode
5. "저장" submits `PUT /api/v1/admin/users/{id}`, returns to read-only on success

### 3.7 Modal Form Flow
1. User clicks create/edit button
2. Modal overlay appears (`bg-black/50`)
3. Modal card fades in centered
4. User fills form, clicks primary button
5. Button shows `Loader2` spinner during API call
6. On success: modal closes, list/tree refreshes (TanStack Query invalidation)
7. On error: error message appears below relevant field or as banner

### 3.8 Loading States
- **Tree loading:** 3-4 skeleton bars (`bg-gray-200 dark:bg-gray-700 rounded animate-pulse h-6 w-3/4`)
- **Table loading:** Skeleton rows matching column layout
- **Detail panel loading:** Skeleton lines for member list
- **Button loading:** `Loader2` icon replaces button text (Phase 2 pattern)

### 3.9 Error States
- **Field validation:** Red border on input (`border-red-500`) + error text below (`text-sm text-red-600`)
- **API error in modal:** Error banner above form fields (`bg-red-50 border border-red-200 rounded-lg p-3`)
- **API error on page:** Toast notification (top-right, auto-dismiss after 5 seconds)
- **403 Forbidden:** Redirect to home page with toast "접근 권한이 없습니다."

## 4. Copywriting Contract

All UI text goes through i18n (`react-i18next`). Namespace: `admin`.

### 4.1 Page Titles
| Key | Korean | English |
|-----|--------|---------|
| `admin.departments.title` | 부서 관리 | Department Management |
| `admin.positions.title` | 직급 관리 | Position Management |
| `admin.users.title` | 사용자 관리 | User Management |
| `admin.users.detail` | 사용자 상세 | User Detail |

### 4.2 Primary CTAs
| Context | Korean | English |
|---------|--------|---------|
| Create department | 부서 추가 | Add Department |
| Create position | 직급 추가 | Add Position |
| Create user | 사용자 추가 | Add User |
| Save changes | 저장 | Save |
| Edit | 수정 | Edit |
| Cancel | 취소 | Cancel |
| Create (modal submit) | 생성 | Create |
| Deactivate | 비활성화 | Deactivate |
| Confirm | 확인 | Confirm |

### 4.3 Empty States
| Context | Korean |
|---------|--------|
| No departments | 부서가 없습니다. 첫 부서를 추가해주세요. (D-17) |
| No positions | 등록된 직급이 없습니다. 직급을 추가해주세요. |
| No users (filtered) | 검색 조건에 맞는 사용자가 없습니다. |
| No users (total) | 등록된 사용자가 없습니다. |
| No department members | 소속 직원이 없습니다. |

### 4.4 Error Messages
| Code | Korean (from RESEARCH.md) |
|------|---------------------------|
| ORG_DUPLICATE_NAME | 이미 존재하는 이름입니다. |
| ORG_HAS_ACTIVE_USERS | 활성 사용자가 있어 비활성화할 수 없습니다. |
| ORG_HAS_ACTIVE_CHILDREN | 활성 하위 부서가 있어 비활성화할 수 없습니다. |
| ORG_CIRCULAR_REF | 순환 참조가 발생합니다. |
| ORG_DEPTH_EXCEEDED | 부서 계층은 최대 3단계까지 가능합니다. |
| ORG_LAST_SUPER_ADMIN | 최소 1명의 최고 관리자가 필요합니다. (D-35) |
| ORG_SELF_DEACTIVATION | 자기 자신을 비활성화할 수 없습니다. (D-33) |
| AUTH_FORBIDDEN | 접근 권한이 없습니다. |
| ORG_NOT_FOUND | 대상을 찾을 수 없습니다. |
| Generic network error | 네트워크 오류가 발생했습니다. 다시 시도해주세요. |

### 4.5 Confirmation Dialogs
| Action | Title | Body |
|--------|-------|------|
| Deactivate department | 부서 비활성화 | 이 부서에 N명의 직원이 소속되어 있습니다. 비활성화하시겠습니까? (D-06) |
| Move department | 상위 부서 변경 | N명의 직원이 영향을 받습니다. 상위 부서를 변경하시겠습니까? (D-16) |
| Deactivate position (blocked) | 비활성화 불가 | 이 직급에 N명의 직원이 소속되어 있습니다. 먼저 직원의 직급을 변경해주세요. (D-40) |
| Deactivate user | 사용자 비활성화 | 이 사용자를 비활성화하시겠습니까? (D-26) |

### 4.6 Success Messages (Toast)
| Action | Korean |
|--------|--------|
| Department created | 부서가 추가되었습니다. |
| Department updated | 부서 정보가 수정되었습니다. |
| Department deactivated | 부서가 비활성화되었습니다. |
| Position created | 직급이 추가되었습니다. |
| Position updated | 직급 정보가 수정되었습니다. |
| Position reordered | 직급 순서가 변경되었습니다. |
| User created | 사용자가 추가되었습니다. |
| User updated | 사용자 정보가 수정되었습니다. |
| User deactivated | 사용자가 비활성화되었습니다. |

## 5. Responsive Behavior

| Breakpoint | Admin Sidebar | Content Layout |
|------------|--------------|----------------|
| >= 1280px (`xl`) | Full sidebar (240px) with text labels | Department page: side-by-side tree + detail panel |
| 1024-1279px (`lg`) | Icon-only sidebar (64px) with tooltips | Department page: side-by-side (narrower) |
| 768-1023px (`md`) | Hidden, hamburger toggle | Department page: stacked (tree above, detail below) |
| < 768px (`sm`) | Hidden, hamburger toggle | Single column, horizontal scroll on user table |

**User table on mobile:** Horizontal scroll with `overflow-x-auto` wrapper. Minimum column widths preserved.

## 6. Accessibility

| Concern | Implementation |
|---------|---------------|
| Tree keyboard navigation | Arrow keys to navigate nodes, Enter to select, Space to expand/collapse |
| Tree ARIA roles | `role="tree"` on container, `role="treeitem"` on nodes, `aria-expanded` on expandable nodes |
| Drag-and-drop | `@hello-pangea/dnd` provides keyboard DnD (Space to lift, arrows to move, Space to drop) |
| Modal focus trap | Focus trapped inside modal while open; focus returns to trigger on close |
| Sort column | `aria-sort="ascending|descending|none"` on `th` elements |
| Form validation | `aria-describedby` linking inputs to error messages (Phase 2 pattern) |
| Color contrast | All text meets WCAG 2.1 AA (gray-600 on white = 5.74:1, gray-400 on gray-900 = 5.57:1) |

## 7. Dark Mode

Dark mode follows `darkMode: 'media'` (established in `tailwind.config.js`). All color specifications in this document include dark variants using `dark:` prefix classes. Key mappings:

| Light | Dark |
|-------|------|
| `bg-white` | `dark:bg-gray-900` |
| `bg-gray-50` | `dark:bg-gray-800` |
| `text-gray-900` | `dark:text-gray-50` |
| `text-gray-600` | `dark:text-gray-400` |
| `border-gray-200` | `dark:border-gray-700` |
| `border-gray-300` | `dark:border-gray-600` |
| `hover:bg-gray-100` | `dark:hover:bg-gray-700` |

## 8. Registry

**Tool:** None (no shadcn). All components are custom Tailwind-styled React components.

**Third-party registries:** None.

**New dependency:** `@hello-pangea/dnd@18.0.1` for position drag-and-drop only (D-39). No registry vetting needed — installed via npm.

## 9. Component-to-Requirement Mapping

| Requirement | Components | Key Interactions |
|-------------|-----------|-----------------|
| ORG-01 | DepartmentTree, DepartmentTreeNode, DepartmentDetailPanel, DepartmentFormModal, ConfirmDialog | Tree selection, expand/collapse, create/edit modal, deactivation confirm |
| ORG-02 | PositionTable, PositionFormModal, ConfirmDialog | Drag-and-drop reorder, create/edit modal, deactivation block dialog |
| ORG-03 | UserTable, UserFilterBar, UserFormModal, UserDetailPage, Pagination | Filter/sort table, row click navigation, create modal, detail edit mode |
| ORG-04 | AdminRoute, AdminSidebar, role-conditional UI | Sidebar visibility, role dropdown constraint, SUPER_ADMIN-only actions |

---

*Generated: 2026-04-01*
*Sources: 03-CONTEXT.md (41 decisions), 03-RESEARCH.md (standard stack + patterns), Phase 2 codebase (established visual tokens)*

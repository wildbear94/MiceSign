# Phase 3: Organization Management - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-01
**Phase:** 03-organization-management
**Areas discussed:** Department management UI, User management UI, RBAC enforcement scope, Position management

---

## Department Management UI

### Department hierarchy display

| Option | Description | Selected |
|--------|-------------|----------|
| Expandable tree view | Collapsible tree with indent levels showing parent-child relationships | ✓ |
| Flat list with parent column | Simple table with '상위 부서' column | |

**User's choice:** Expandable tree view
**Notes:** Natural fit for hierarchical data

### Department creation and editing

| Option | Description | Selected |
|--------|-------------|----------|
| Modal dialog | Click 'Add department' → modal with name, parent selector, sort order | ✓ |
| Inline editing | Click row to edit fields directly in tree | |
| Separate form page | Navigate to dedicated create/edit page | |

**User's choice:** Modal dialog
**Notes:** None

### Deactivation confirmation

| Option | Description | Selected |
|--------|-------------|----------|
| Confirm with user count | Show affected user count before deactivating | ✓ |
| Simple confirm | Just confirm without showing impact | |

**User's choice:** Confirm with user count
**Notes:** None

### Drag-and-drop reordering

| Option | Description | Selected |
|--------|-------------|----------|
| No drag-and-drop | Use sort_order in modal | ✓ |
| Drag-and-drop | Full drag-and-drop in tree view | |

**User's choice:** No drag-and-drop
**Notes:** Overkill for ~10-15 departments

### Child department deactivation cascade

| Option | Description | Selected |
|--------|-------------|----------|
| Block if children active | Must deactivate bottom-up | ✓ |
| Cascade deactivation | Parent deactivation cascades to all children | |

**User's choice:** Block if children active
**Notes:** None

### Admin page navigation

| Option | Description | Selected |
|--------|-------------|----------|
| Sidebar navigation | Left sidebar with 부서/직급/사용자 관리 links | ✓ |
| Top tabs | Horizontal tab bar at top | |

**User's choice:** Sidebar navigation
**Notes:** Standard admin pattern, scales well

### Deactivated department visibility

| Option | Description | Selected |
|--------|-------------|----------|
| Show with visual indicator | Grayed out with '비활성' badge, filterable | ✓ |
| Hidden by default | Hidden, toggle to show | |
| Always visible | No filtering | |

**User's choice:** Show with visual indicator
**Notes:** None

### Parent selection requirement

| Option | Description | Selected |
|--------|-------------|----------|
| Optional — no parent = top-level | Matches DB schema (parent_id NULL) | ✓ |
| Required after initial setup | Force all new depts under existing parent | |

**User's choice:** Optional
**Notes:** None

### Hierarchy depth limit

| Option | Description | Selected |
|--------|-------------|----------|
| Max 3 levels | Sufficient for ~50 person company | ✓ |
| Unlimited depth | No restriction | |

**User's choice:** Max 3 levels
**Notes:** None

### Department name uniqueness

| Option | Description | Selected |
|--------|-------------|----------|
| Globally unique | No duplicates anywhere in tree | ✓ |
| Unique within parent | Same name allowed under different parents | |

**User's choice:** Globally unique
**Notes:** None

### Member count display

| Option | Description | Selected |
|--------|-------------|----------|
| Show member count | Display e.g. '경영지원부 (5)' | ✓ |
| No count | Just department names | |

**User's choice:** Show member count
**Notes:** None

### Department tree search

| Option | Description | Selected |
|--------|-------------|----------|
| Simple text filter | Search box above tree | ✓ |
| No search | Browse without search | |

**User's choice:** Simple text filter
**Notes:** None

### Department detail panel

| Option | Description | Selected |
|--------|-------------|----------|
| Side panel with member list | Right-side panel listing members with name, position, status | ✓ |
| No detail panel | Members viewed on user management page only | |

**User's choice:** Side panel with member list
**Notes:** None

### Department parent change (moving)

| Option | Description | Selected |
|--------|-------------|----------|
| Allow with confirmation | Show affected count and child departments | ✓ |
| Not allowed | Parent fixed once created | |

**User's choice:** Allow with confirmation
**Notes:** None

### Empty state

| Option | Description | Selected |
|--------|-------------|----------|
| Prompt to create first department | Illustration + create button | ✓ |

**User's choice:** Prompt to create first department
**Notes:** None

---

## User Management UI

### User list display

| Option | Description | Selected |
|--------|-------------|----------|
| Paginated table | Standard data table with columns: 사번, 이름, 이메일, 부서, 직급, 역할, 상태 | ✓ |
| Card grid | User cards in grid with profile photos | |

**User's choice:** Paginated table
**Notes:** None

### Filtering approach

| Option | Description | Selected |
|--------|-------------|----------|
| Dropdown filters + search | Department/role/status dropdowns + text search | ✓ |
| Search only | Single search bar across all fields | |

**User's choice:** Dropdown filters + search
**Notes:** None

### User creation method

| Option | Description | Selected |
|--------|-------------|----------|
| Modal form | Modal with all required fields | ✓ |
| Separate page | Dedicated creation page | |

**User's choice:** Modal form
**Notes:** None

### User editing approach

| Option | Description | Selected |
|--------|-------------|----------|
| Detail page | Navigate to user detail page with all info + action buttons | ✓ |
| Same modal as creation | Edit in modal | |

**User's choice:** Detail page
**Notes:** Integrates Phase 2 admin components (password reset, unlock)

### Detail page editing mode

| Option | Description | Selected |
|--------|-------------|----------|
| Edit button → editable form | Read-only by default, click 수정 to enter edit mode | ✓ |
| Always editable | Fields always editable | |

**User's choice:** Edit button → editable form
**Notes:** None

### User deactivation confirmation

| Option | Description | Selected |
|--------|-------------|----------|
| Confirmation only | Simple confirm dialog, no reason field | ✓ |
| Require reason | Mandatory reason field | |

**User's choice:** Confirmation only
**Notes:** Audit log records the action anyway

### Employee number entry

| Option | Description | Selected |
|--------|-------------|----------|
| Manual entry | Admin types employee number, validated unique | ✓ |
| Auto-generated | System generates sequential numbers | |

**User's choice:** Manual entry
**Notes:** Korean companies have their own numbering systems

### Bulk actions

| Option | Description | Selected |
|--------|-------------|----------|
| No bulk actions | Individual management for ~50 employees | ✓ |
| Basic bulk actions | Checkboxes + bulk deactivate/dept change | |

**User's choice:** No bulk actions
**Notes:** None

### Initial password setting

| Option | Description | Selected |
|--------|-------------|----------|
| Admin sets password | Admin types initial password in creation form | ✓ |
| System generates | Random temporary password shown once | |

**User's choice:** Admin sets password
**Notes:** Aligns with Phase 2 D-29

### Welcome notification

| Option | Description | Selected |
|--------|-------------|----------|
| Silent creation | No email notification | ✓ |

**User's choice:** Silent creation
**Notes:** SMTP deferred to Phase 1-B

### User activity display

| Option | Description | Selected |
|--------|-------------|----------|
| Show basic info | Last login time and creation date from User entity fields | ✓ |
| No activity info | Just profile fields | |

**User's choice:** Show basic info
**Notes:** None

### Column sorting

| Option | Description | Selected |
|--------|-------------|----------|
| Sortable columns | Click headers to sort, backed by Spring Data Pageable Sort | ✓ |
| Fixed default sort | Always sorted by employee number | |

**User's choice:** Sortable columns
**Notes:** None

---

## RBAC Enforcement Scope

### ADMIN department scope

| Option | Description | Selected |
|--------|-------------|----------|
| All departments | ADMIN manages all users/depts/positions | ✓ |
| Own department only | ADMIN restricted to own department | |

**User's choice:** All departments
**Notes:** ORG-04 'own dept docs' applies to document access only, not org management

### SUPER_ADMIN vs ADMIN difference

| Option | Description | Selected |
|--------|-------------|----------|
| SUPER_ADMIN can manage other ADMINs | Only SUPER_ADMIN creates/edits ADMIN-role users | ✓ |
| No practical difference yet | Identical capabilities in Phase 3 | |

**User's choice:** SUPER_ADMIN can manage other ADMINs
**Notes:** Privilege escalation prevention

### USER role admin visibility

| Option | Description | Selected |
|--------|-------------|----------|
| Hidden completely | Admin sidebar not rendered for USER role | ✓ |
| Visible but disabled | Show greyed out admin menu | |

**User's choice:** Hidden completely
**Notes:** None

### Self-deactivation

| Option | Description | Selected |
|--------|-------------|----------|
| No self-deactivation | Cannot deactivate own account | ✓ |
| Allow with warning | Allow but show strong warning | |

**User's choice:** No self-deactivation
**Notes:** Prevents accidental lockout

### Multiple SUPER_ADMINs

| Option | Description | Selected |
|--------|-------------|----------|
| Multiple allowed | No restriction on SUPER_ADMIN count | ✓ |
| Single SUPER_ADMIN only | Only one at a time | |

**User's choice:** Multiple allowed
**Notes:** Practical for backup

### Last SUPER_ADMIN protection

| Option | Description | Selected |
|--------|-------------|----------|
| Protected | Prevent demotion/deactivation of last SUPER_ADMIN | ✓ |
| No protection | Allow even if last | |

**User's choice:** Protected
**Notes:** Critical safety rail

---

## Position Management

### Position list layout

| Option | Description | Selected |
|--------|-------------|----------|
| Simple ordered list in admin sidebar | Flat table sorted by sort_order | ✓ |

**User's choice:** Simple ordered list
**Notes:** None

### Sort order editing

| Option | Description | Selected |
|--------|-------------|----------|
| Drag-and-drop reorder | Drag rows, sort_order updates automatically | ✓ |
| Manual number entry | Edit sort_order in modal | |

**User's choice:** Drag-and-drop reorder
**Notes:** Practical for ~7-10 positions

### Position deactivation

| Option | Description | Selected |
|--------|-------------|----------|
| Block if users assigned | Show error with assigned user count | ✓ |
| Allow with warning | Allow but warn about orphaned assignments | |

**User's choice:** Block if users assigned
**Notes:** None

### Position name uniqueness

| Option | Description | Selected |
|--------|-------------|----------|
| Globally unique | No duplicate names | ✓ |

**User's choice:** Globally unique
**Notes:** None

---

## Claude's Discretion

- Exact Tailwind styling for admin sidebar, tree view, tables, modals
- Tree view component implementation approach
- Drag-and-drop library choice for position reordering
- Animation details for tree expand/collapse and panel slide-in
- API endpoint naming conventions
- JPA entity relationship design
- DTO structures
- Backend validation logic

## Deferred Ideas

- "Logout all devices" button on user management page
- Org chart visualization (graphical org tree)
- User import from CSV/Excel
- Department move history / audit trail

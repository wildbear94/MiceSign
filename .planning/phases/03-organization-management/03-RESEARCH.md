# Phase 3: Organization Management - Research

**Researched:** 2026-04-01
**Domain:** Spring Boot CRUD admin + React admin UI (tree view, tables, modals, drag-and-drop)
**Confidence:** HIGH

## Summary

Phase 3 adds admin CRUD pages for departments (hierarchical tree), positions (flat ranked list with drag-and-drop reorder), and user accounts (paginated sortable/filterable table with detail page). The backend needs three new controllers under `/api/v1/admin/`, two new JPA entities (Department, Position), and the User entity updated with `@ManyToOne` relationships. The frontend needs a new admin layout with sidebar navigation, three feature pages, and integration of Phase 2 standalone components (AdminPasswordResetModal, AdminUnlockButton).

The database schema already exists in V1 migration with `department`, `position`, and `user` tables fully defined. No schema migration is needed for the core tables. However, V4 migration may be needed if CONTEXT.md decision D-10 (globally unique department names) differs from FSD FN-ORG-002 (unique within same parent level) -- the CONTEXT decision overrides, requiring a unique constraint on `department.name`. The User entity currently uses `departmentId`/`positionId` as plain Long fields; these need `@ManyToOne` JPA relationships for proper join queries (department name, position name in user lists).

**Primary recommendation:** Build backend entities and repositories first (Department, Position, update User with relationships), then controllers/services with business rule validation, then frontend admin pages. Use `@hello-pangea/dnd` for position drag-and-drop reordering. Build the department tree view as a custom recursive React component (no library needed for a 3-level tree). Use Spring Data `JpaSpecificationExecutor` for user list filtering.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- D-01: Left sidebar navigation for admin area with sections: 부서 관리, 직급 관리, 사용자 관리
- D-02: Admin sidebar only renders for ADMIN/SUPER_ADMIN roles -- completely hidden from USER role
- D-03: Backend returns 403 if USER role attempts admin API endpoints (already configured in SecurityConfig)
- D-04: Expandable tree view displaying hierarchical departments with collapsible parent-child relationships
- D-05: Modal dialog for creating and editing departments (fields: name, parent department dropdown, sort order)
- D-06: Deactivation requires confirmation dialog showing affected user count
- D-07: Cannot deactivate a department that has active child departments -- must deactivate bottom-up
- D-08: No drag-and-drop reordering for departments -- sort_order edited in the modal
- D-09: Maximum 3 levels of hierarchy depth
- D-10: Department names must be globally unique (no duplicates anywhere in the tree)
- D-11: Member count displayed next to each department name in the tree
- D-12: Simple text filter/search above the tree to find departments by name
- D-13: Clicking a department shows a right-side detail panel listing members
- D-14: Deactivated departments shown grayed out with badge; admin can toggle filter
- D-15: Parent selection is optional -- no parent = top-level department
- D-16: Changing a department's parent (moving) is allowed via edit modal with confirmation
- D-17: Empty state shows illustration + create button
- D-18: Paginated user table with sortable columns (사번, 이름, 이메일, 부서, 직급, 역할, 상태)
- D-19: Filter bar with department dropdown, role dropdown, status dropdown, and text search
- D-20: User creation via modal form with all required fields
- D-21: Admin sets initial password manually; user must change on first login
- D-22: Silent account creation -- no email notification
- D-23: Clicking a user row navigates to user detail page
- D-24: User detail page: read-only by default, click edit button to enter edit mode
- D-25: User detail page integrates Phase 2 AdminPasswordResetModal and AdminUnlockButton
- D-26: User deactivation: simple confirmation dialog only
- D-27: No bulk actions
- D-28: Employee number manually entered by admin
- D-29: User detail page shows last login time and creation date
- D-30: Column sorting backed by Spring Data Pageable Sort parameter
- D-31: ADMIN manages all departments (not restricted to own department)
- D-32: Only SUPER_ADMIN can create/edit ADMIN-role users
- D-33: No self-deactivation
- D-34: Multiple SUPER_ADMIN accounts allowed
- D-35: Last SUPER_ADMIN account protected from demotion or deactivation
- D-36: @PreAuthorize annotations for fine-grained role checks
- D-37: Simple position table sorted by sort_order
- D-38: Modal dialog for creating/editing positions
- D-39: Drag-and-drop reordering of position rows
- D-40: Deactivation blocked if users are assigned to the position
- D-41: Position names must be globally unique

### Claude's Discretion
- Exact Tailwind styling for admin sidebar, tree view, tables, modals
- Tree view component implementation approach (custom vs library)
- Drag-and-drop library choice for position reordering
- Department tree expand/collapse animation details
- Table pagination component design
- Detail panel slide-in animation
- Filter bar responsive layout
- API endpoint naming within /api/v1/admin/* pattern
- JPA entity relationship design for Department and Position
- DTO structure for department tree API responses
- Backend validation logic implementation details

### Deferred Ideas (OUT OF SCOPE)
- "Logout all devices" button on user management page
- Org chart visualization (graphical org tree)
- User import from CSV/Excel
- Department move history / audit trail
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| ORG-01 | Admin can create, edit, and deactivate departments (hierarchical structure) | Department entity with self-referential @ManyToOne for parent_id, DepartmentService with circular reference check, tree DTO builder, frontend tree view component |
| ORG-02 | Admin can create, edit, and deactivate positions (with sort order) | Position entity, PositionService with bulk sort_order update for drag-and-drop, @hello-pangea/dnd for frontend reorder |
| ORG-03 | Admin can create and manage user accounts | User entity updated with @ManyToOne to Department/Position, UserManagementService, paginated list with JpaSpecificationExecutor, user detail page with edit mode |
| ORG-04 | System enforces RBAC with three roles | @PreAuthorize on controller methods, ADMIN cannot manage ADMIN-role users (only SUPER_ADMIN), last SUPER_ADMIN protection, SecurityConfig already gates /api/v1/admin/** |
</phase_requirements>

## Standard Stack

### Core (already in project)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Spring Boot | 3.5.13 | Backend framework | Already configured |
| Spring Data JPA | (via Boot) | Repository layer | Already in use for UserRepository |
| Spring Security | (via Boot) | `@PreAuthorize` RBAC | `@EnableMethodSecurity` already active |
| MapStruct | 1.6.3 | Entity-to-DTO mapping | Already in build.gradle.kts |
| Spring Validation | (via Boot) | `@Valid` request DTOs | Already in dependencies |
| React 18 | 18.3.1 | Frontend framework | Already installed |
| TanStack Query | 5.95.2 | Server state (API caching, mutations) | Already installed |
| React Router | 7.13.2 | Client-side routing | Already installed |
| Zustand | 5.0.12 | Client state (auth store role check) | Already installed |
| TailwindCSS | 3.4.x | Styling | Already installed |
| lucide-react | 1.7.0 | Icons | Already in use |
| react-i18next | 17.0.2 | i18n | Already in use |
| react-hook-form + zod | 7.72.0 / 4.3.6 | Form validation | Already installed |

### New Dependencies
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @hello-pangea/dnd | 18.0.1 | Drag-and-drop list reorder | Position table row reordering (D-39) |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| @hello-pangea/dnd | @dnd-kit/sortable 10.0.0 | dnd-kit is more modular but more boilerplate for a simple vertical list. hello-pangea is simpler for this exact use case (single vertical list of ~7 items) |
| Custom tree component | react-arborist or similar | Custom is sufficient for 3-level max depth with ~20 nodes. A library is overkill |
| JpaSpecificationExecutor | QueryDSL | Specification API is simpler for filtering by known fields. QueryDSL available if needed later for complex queries |

**Installation:**
```bash
cd frontend && npm install @hello-pangea/dnd
```

## Architecture Patterns

### Recommended Project Structure

```
backend/src/main/java/com/micesign/
├── domain/
│   ├── Department.java          # NEW: JPA entity with self-ref @ManyToOne
│   ├── Position.java            # NEW: JPA entity
│   └── User.java                # MODIFY: add @ManyToOne to Department, Position
├── repository/
│   ├── DepartmentRepository.java  # NEW
│   ├── PositionRepository.java    # NEW
│   └── UserRepository.java        # MODIFY: add filtered queries
├── controller/
│   ├── DepartmentController.java  # NEW: /api/v1/admin/departments
│   ├── PositionController.java    # NEW: /api/v1/admin/positions
│   └── UserManagementController.java  # NEW: /api/v1/admin/users
├── service/
│   ├── DepartmentService.java     # NEW
│   ├── PositionService.java       # NEW
│   └── UserManagementService.java # NEW (separate from AuthService)
├── dto/
│   ├── department/
│   │   ├── DepartmentTreeResponse.java  # Recursive tree DTO
│   │   ├── CreateDepartmentRequest.java
│   │   └── UpdateDepartmentRequest.java
│   ├── position/
│   │   ├── PositionResponse.java
│   │   ├── CreatePositionRequest.java
│   │   ├── UpdatePositionRequest.java
│   │   └── ReorderPositionsRequest.java
│   └── user/
│       ├── UserListResponse.java
│       ├── UserDetailResponse.java
│       ├── CreateUserRequest.java
│       └── UpdateUserRequest.java
└── mapper/
    ├── DepartmentMapper.java  # MapStruct
    ├── PositionMapper.java
    └── UserMapper.java

frontend/src/
├── features/
│   └── admin/
│       ├── components/
│       │   ├── AdminLayout.tsx          # Sidebar + content area
│       │   ├── AdminSidebar.tsx         # Left nav (부서/직급/사용자)
│       │   ├── DepartmentTree.tsx       # Recursive tree component
│       │   ├── DepartmentTreeNode.tsx   # Single tree node
│       │   ├── DepartmentDetailPanel.tsx # Right-side member list
│       │   ├── DepartmentFormModal.tsx  # Create/edit modal
│       │   ├── PositionTable.tsx        # Draggable position list
│       │   ├── PositionFormModal.tsx    # Create/edit modal
│       │   ├── UserTable.tsx           # Paginated/sortable table
│       │   ├── UserFilterBar.tsx       # Filter dropdowns + search
│       │   ├── UserFormModal.tsx        # Create user modal
│       │   └── ConfirmDialog.tsx       # Reusable confirmation modal
│       ├── hooks/
│       │   ├── useDepartments.ts       # TanStack Query hooks
│       │   ├── usePositions.ts
│       │   └── useUsers.ts
│       ├── pages/
│       │   ├── DepartmentPage.tsx
│       │   ├── PositionPage.tsx
│       │   ├── UserListPage.tsx
│       │   └── UserDetailPage.tsx
│       └── api/
│           ├── departmentApi.ts
│           ├── positionApi.ts
│           └── userApi.ts
├── components/
│   └── AdminRoute.tsx              # Route guard for ADMIN/SUPER_ADMIN
└── types/
    └── admin.ts                    # Department, Position, User admin types
```

### Pattern 1: Department Tree DTO (Recursive)
**What:** Flat DB rows converted to nested tree structure on the backend
**When to use:** Department list API response
**Example:**
```java
public record DepartmentTreeResponse(
    Long id,
    String name,
    Long parentId,
    int sortOrder,
    boolean isActive,
    int memberCount,
    List<DepartmentTreeResponse> children
) {}

// Service method to build tree
public List<DepartmentTreeResponse> getDepartmentTree(boolean includeInactive) {
    List<Department> departments = includeInactive
        ? departmentRepository.findAll()
        : departmentRepository.findByIsActiveTrue();

    Map<Long, List<Department>> childrenMap = departments.stream()
        .filter(d -> d.getParentId() != null)
        .collect(Collectors.groupingBy(Department::getParentId));

    return departments.stream()
        .filter(d -> d.getParentId() == null)
        .sorted(Comparator.comparingInt(Department::getSortOrder))
        .map(d -> buildTreeNode(d, childrenMap, memberCountMap))
        .toList();
}
```

### Pattern 2: Circular Reference Prevention
**What:** When moving a department (changing parentId), prevent self-referencing loops
**When to use:** Department update with parentId change
**Example:**
```java
private void validateNoCircularReference(Long departmentId, Long newParentId) {
    if (departmentId.equals(newParentId)) {
        throw new BusinessException("ORG_CIRCULAR_REF", "자기 자신을 상위 부서로 지정할 수 없습니다.");
    }
    // Walk up the tree from newParentId; if we reach departmentId, it's circular
    Long currentId = newParentId;
    while (currentId != null) {
        Department current = departmentRepository.findById(currentId)
            .orElseThrow();
        if (departmentId.equals(current.getParentId())) {
            throw new BusinessException("ORG_CIRCULAR_REF", "하위 부서를 상위 부서로 지정할 수 없습니다.");
        }
        currentId = current.getParentId();
    }
}
```

### Pattern 3: Hierarchy Depth Validation (D-09)
**What:** Enforce max 3 levels of department nesting
**When to use:** Department create/move
**Example:**
```java
private void validateDepthLimit(Long parentId, int maxDepth) {
    int parentDepth = calculateDepth(parentId); // 0 for root
    if (parentDepth >= maxDepth - 1) { // maxDepth=3 means levels 0,1,2
        throw new BusinessException("ORG_DEPTH_EXCEEDED", "부서 계층은 최대 3단계까지 가능합니다.");
    }
}
```

### Pattern 4: Last SUPER_ADMIN Protection (D-35)
**What:** Prevent demotion/deactivation of the last SUPER_ADMIN
**When to use:** User update (role change or status change)
**Example:**
```java
private void validateSuperAdminProtection(User user, UserRole newRole, UserStatus newStatus) {
    if (user.getRole() == UserRole.SUPER_ADMIN) {
        boolean beingDemoted = newRole != UserRole.SUPER_ADMIN;
        boolean beingDeactivated = newStatus != UserStatus.ACTIVE;
        if (beingDemoted || beingDeactivated) {
            long superAdminCount = userRepository.countByRoleAndStatus(
                UserRole.SUPER_ADMIN, UserStatus.ACTIVE);
            if (superAdminCount <= 1) {
                throw new BusinessException("ORG_LAST_SUPER_ADMIN",
                    "최소 1명의 최고 관리자가 필요합니다.");
            }
        }
    }
}
```

### Pattern 5: RBAC Privilege Escalation Check (D-32)
**What:** ADMIN cannot create/edit ADMIN or SUPER_ADMIN role users
**When to use:** User create and update
**Example:**
```java
@PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN')")
public UserDetailResponse createUser(CreateUserRequest request, CustomUserDetails currentUser) {
    if (currentUser.getRole() == UserRole.ADMIN) {
        if (request.role() != UserRole.USER) {
            throw new BusinessException("AUTH_FORBIDDEN",
                "관리자는 일반 사용자만 생성할 수 있습니다.");
        }
    }
    // ... create user
}
```

### Pattern 6: Spring Data Pageable with Sort (D-30)
**What:** Use Spring Data Pageable for paginated, sorted, filtered user lists
**When to use:** User list API
**Example:**
```java
@GetMapping
public ApiResponse<Page<UserListResponse>> getUsers(
    @RequestParam(required = false) String keyword,
    @RequestParam(required = false) Long departmentId,
    @RequestParam(required = false) UserRole role,
    @RequestParam(required = false) UserStatus status,
    Pageable pageable  // Spring auto-binds ?page=0&size=20&sort=name,asc
) {
    // Use Specification for dynamic filtering
    Specification<User> spec = UserSpecification.withFilters(keyword, departmentId, role, status);
    Page<User> users = userRepository.findAll(spec, pageable);
    return ApiResponse.ok(users.map(userMapper::toListResponse));
}
```

### Pattern 7: TanStack Query Mutations with Cache Invalidation
**What:** Mutate data and invalidate relevant caches
**When to use:** All create/update/delete operations
**Example:**
```typescript
// useDepartments.ts
export function useCreateDepartment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateDepartmentRequest) =>
      departmentApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments'] });
    },
  });
}
```

### Anti-Patterns to Avoid
- **Loading all users eagerly in tree nodes:** Department tree should show member COUNT, not load all members. Members only loaded on click (D-13).
- **Fetching department tree on every user list page load:** Tree data should be cached in TanStack Query with a reasonable stale time (~5 minutes for admin data).
- **Mixing auth controllers with admin controllers:** Keep UserManagementController separate from AuthController. Different responsibilities, different security contexts.
- **Using `@ManyToOne(fetch = FetchType.EAGER)` on User->Department:** Use LAZY fetch and explicit fetch joins in queries that need department/position names.
- **Building sort_order update endpoint that updates one at a time:** Position reorder should accept the full ordered list and batch-update in one transaction.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Drag-and-drop reordering | Custom onDrag/onDrop handlers | @hello-pangea/dnd | Accessibility (keyboard, screen reader), smooth animations, mobile touch support |
| Paginated API with sort | Custom offset/limit logic | Spring Data Pageable | Handles page/size/sort params, returns total count, integrates with JPA |
| Dynamic query filtering | Concatenated JPQL strings | JpaSpecificationExecutor | Type-safe, composable predicates, no SQL injection risk |
| Entity-DTO mapping | Manual mapping in each service | MapStruct | Compile-time generation, no runtime reflection, already in project |
| Form validation (frontend) | Custom validation logic | react-hook-form + zod | Already in project, handles all validation patterns needed |
| Tree structure in DB | Nested set model or materialized path | Adjacency list (parent_id) | Already defined in schema, max 3 levels makes adjacency list optimal |

**Key insight:** The adjacency list model (`parent_id` foreign key) is the right choice for this hierarchy. With max 3 levels and ~20 departments, the recursive tree building is trivial. Nested set or materialized path would be over-engineering.

## Common Pitfalls

### Pitfall 1: Circular Reference in Department Hierarchy
**What goes wrong:** Admin moves department A under department B, but B is already a child of A, creating an infinite loop.
**Why it happens:** Simple parent_id update without walking the ancestor chain.
**How to avoid:** Before updating parentId, traverse up from the new parent to root. If the department being moved appears anywhere in that chain, reject.
**Warning signs:** Stack overflow in tree-building code, infinite loading on department page.

### Pitfall 2: Stale Member Count in Department Tree
**What goes wrong:** Department shows wrong member count after user department change.
**Why it happens:** Member count cached or computed at wrong time.
**How to avoid:** Compute member count on every tree fetch (it is a simple `GROUP BY department_id` count). With ~50 users, this is negligible performance cost. Alternatively, invalidate department query cache on user mutations.
**Warning signs:** Count mismatch between tree view and detail panel.

### Pitfall 3: Race Condition on Position Sort Order
**What goes wrong:** Two admins reorder positions simultaneously, resulting in duplicate or missing sort_order values.
**Why it happens:** Non-atomic read-modify-write on sort_order.
**How to avoid:** The reorder endpoint receives the complete ordered list of position IDs. Overwrite all sort_order values in a single transaction. `@Transactional` + batch update.
**Warning signs:** Positions appearing out of order or disappearing from the list.

### Pitfall 4: ADMIN Escalating to SUPER_ADMIN
**What goes wrong:** ADMIN creates another ADMIN or promotes a USER to ADMIN.
**Why it happens:** Missing role check in service layer (relying only on `@PreAuthorize` which allows both ADMIN and SUPER_ADMIN).
**How to avoid:** Service-level check: if current user is ADMIN, the target user's role must be USER. Only SUPER_ADMIN can set role to ADMIN or SUPER_ADMIN.
**Warning signs:** Unauthorized ADMIN accounts appearing.

### Pitfall 5: Self-Deactivation Lock-out
**What goes wrong:** Admin deactivates their own account and gets locked out immediately.
**Why it happens:** No check comparing target user ID with current user ID.
**How to avoid:** Explicit check: `if (targetUser.getId().equals(currentUser.getId())) throw ...`
**Warning signs:** Admin locked out after user management action.

### Pitfall 6: H2 vs MariaDB Enum Compatibility in Tests
**What goes wrong:** Tests pass on H2 but fail on MariaDB because H2 MODE=MariaDB does not fully support `ENUM` column types in all edge cases.
**Why it happens:** H2 MariaDB compatibility mode has gaps, especially with ENUM used in WHERE clauses or JPA criteria queries.
**How to avoid:** Test migrations use VARCHAR instead of ENUM. Ensure test migration files mirror production schema with H2-compatible types. This pattern is already established in the project.
**Warning signs:** `JdbcSQLSyntaxErrorException` on test runs involving new queries.

### Pitfall 7: Department Name Uniqueness Scope Mismatch
**What goes wrong:** FSD says unique within same parent level. CONTEXT.md D-10 says globally unique. Code implements wrong one.
**Why it happens:** Conflicting requirements across documents.
**How to avoid:** Follow CONTEXT.md D-10 (globally unique) as the authoritative decision. The backend validation must check `departmentRepository.existsByName(name)` across all departments, not just siblings.
**Warning signs:** Duplicate department names allowed when they shouldn't be, or vice versa.

## Code Examples

### Backend: Department Entity with Self-Referential Relationship
```java
@Entity
@Table(name = "department")
public class Department {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(name = "parent_id")
    private Long parentId;

    @Column(name = "sort_order", nullable = false)
    private int sortOrder;

    @Column(name = "is_active", nullable = false)
    private boolean isActive = true;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }

    // Getters and setters...
}
```

Note: Keep `parentId` as a plain Long (not `@ManyToOne`) to match the existing User entity pattern and simplify tree-building. The tree is built in the service layer, not via JPA entity graph.

### Backend: User Entity Update (Add Relationships for Join Queries)
```java
// Add to User.java -- keep departmentId/positionId for backward compat
@ManyToOne(fetch = FetchType.LAZY)
@JoinColumn(name = "department_id", insertable = false, updatable = false)
private Department department;

@ManyToOne(fetch = FetchType.LAZY)
@JoinColumn(name = "position_id", insertable = false, updatable = false)
private Position position;
```

This pattern keeps the existing `departmentId`/`positionId` Long fields for writes, while adding read-only `@ManyToOne` for join queries (to get department name, position name in user list).

### Backend: UserRepository Extended with Specification Support
```java
public interface UserRepository extends JpaRepository<User, Long>, JpaSpecificationExecutor<User> {
    Optional<User> findByEmail(String email);
    Optional<User> findByEmployeeNo(String employeeNo);
    boolean existsByEmail(String email);
    boolean existsByEmployeeNo(String employeeNo);
    long countByDepartmentIdAndStatus(Long departmentId, UserStatus status);
    long countByPositionIdAndStatus(Long positionId, UserStatus status);
    long countByRoleAndStatus(UserRole role, UserStatus status);
    List<User> findByDepartmentIdAndStatus(Long departmentId, UserStatus status);
}
```

### Frontend: Admin Route Guard
```typescript
// components/AdminRoute.tsx
import { Navigate, Outlet } from 'react-router';
import { useAuthStore } from '../stores/authStore';

export default function AdminRoute() {
  const { user } = useAuthStore();
  if (!user || user.role === 'USER') {
    return <Navigate to="/" replace />;
  }
  return <Outlet />;
}
```

### Frontend: Department Tree Node Component
```typescript
interface DepartmentTreeNodeProps {
  department: DepartmentTree;
  selectedId: number | null;
  onSelect: (id: number) => void;
}

function DepartmentTreeNode({ department, selectedId, onSelect }: DepartmentTreeNodeProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const hasChildren = department.children.length > 0;

  return (
    <div>
      <div
        className={`flex items-center gap-1 px-2 py-1.5 rounded cursor-pointer hover:bg-gray-100 ${
          selectedId === department.id ? 'bg-blue-50 text-blue-700' : ''
        } ${!department.isActive ? 'opacity-50' : ''}`}
        onClick={() => onSelect(department.id)}
      >
        {hasChildren && (
          <button onClick={(e) => { e.stopPropagation(); setIsExpanded(!isExpanded); }}>
            <ChevronRight className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
          </button>
        )}
        <span>{department.name}</span>
        <span className="text-xs text-gray-400 ml-1">({department.memberCount})</span>
        {!department.isActive && <span className="text-xs bg-gray-200 px-1 rounded">비활성</span>}
      </div>
      {isExpanded && hasChildren && (
        <div className="ml-4">
          {department.children.map(child => (
            <DepartmentTreeNode key={child.id} department={child} selectedId={selectedId} onSelect={onSelect} />
          ))}
        </div>
      )}
    </div>
  );
}
```

### Frontend: Position Drag-and-Drop with @hello-pangea/dnd
```typescript
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';

function PositionTable({ positions, onReorder }: Props) {
  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    const reordered = Array.from(positions);
    const [removed] = reordered.splice(result.source.index, 1);
    reordered.splice(result.destination.index, 0, removed);
    onReorder(reordered.map((p, i) => ({ id: p.id, sortOrder: i + 1 })));
  };

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <Droppable droppableId="positions">
        {(provided) => (
          <tbody ref={provided.innerRef} {...provided.droppableProps}>
            {positions.map((pos, index) => (
              <Draggable key={pos.id} draggableId={String(pos.id)} index={index}>
                {(provided, snapshot) => (
                  <tr ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps}
                    className={snapshot.isDragging ? 'bg-blue-50 shadow-lg' : ''}>
                    <td>{pos.name}</td>
                    <td>{pos.sortOrder}</td>
                    <td>{pos.isActive ? '활성' : '비활성'}</td>
                  </tr>
                )}
              </Draggable>
            ))}
            {provided.placeholder}
          </tbody>
        )}
      </Droppable>
    </DragDropContext>
  );
}
```

## API Endpoints (from FSD + CONTEXT.md)

| Method | Path | Purpose | Auth |
|--------|------|---------|------|
| GET | /api/v1/departments/tree | Department tree (all users for approval line) | ALL |
| POST | /api/v1/admin/departments | Create department | ADMIN+ |
| PUT | /api/v1/admin/departments/{id} | Update department | ADMIN+ |
| GET | /api/v1/admin/departments/{id}/members | Department members list | ADMIN+ |
| GET | /api/v1/positions | Position list (all users) | ALL |
| POST | /api/v1/admin/positions | Create position | ADMIN+ |
| PUT | /api/v1/admin/positions/{id} | Update position | ADMIN+ |
| PUT | /api/v1/admin/positions/reorder | Batch reorder positions | ADMIN+ |
| GET | /api/v1/admin/users | User list with filters + pagination | ADMIN+ |
| POST | /api/v1/admin/users | Create user | ADMIN+ |
| GET | /api/v1/admin/users/{id} | User detail | ADMIN+ |
| PUT | /api/v1/admin/users/{id} | Update user | ADMIN+ |

Note: The FSD defines `GET /api/departments/tree` and `GET /api/positions` as public (ALL users) since they are needed by the approval line editor in future phases. The admin CRUD endpoints are under `/api/v1/admin/`.

## Error Codes

| Code | Message | When |
|------|---------|------|
| ORG_DUPLICATE_NAME | 이미 존재하는 이름입니다. | Department/position name already exists |
| ORG_HAS_ACTIVE_USERS | 활성 사용자가 있어 비활성화할 수 없습니다. | Deactivating dept/position with active users |
| ORG_HAS_ACTIVE_CHILDREN | 활성 하위 부서가 있어 비활성화할 수 없습니다. | Deactivating dept with active children (D-07) |
| ORG_CIRCULAR_REF | 순환 참조가 발생합니다. | Moving dept creates circular reference |
| ORG_DEPTH_EXCEEDED | 부서 계층은 최대 3단계까지 가능합니다. | Exceeding max depth (D-09) |
| ORG_LAST_SUPER_ADMIN | 최소 1명의 최고 관리자가 필요합니다. | Demoting/deactivating last SA (D-35) |
| ORG_SELF_DEACTIVATION | 자기 자신을 비활성화할 수 없습니다. | Admin trying to deactivate own account (D-33) |
| AUTH_FORBIDDEN | 접근 권한이 없습니다. | ADMIN trying to manage ADMIN-role user (D-32) |
| ORG_NOT_FOUND | 대상을 찾을 수 없습니다. | Department/position/user not found |

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| @ManyToOne with entity graph for tree | Plain parentId + service-layer tree building | Preference | Simpler, avoids N+1 with small datasets |
| react-beautiful-dnd (archived) | @hello-pangea/dnd (maintained fork) | 2023 | Must use hello-pangea, not the archived original |
| Manual pagination with offset/limit | Spring Data Pageable + Page response | Standard | Built-in total count, page metadata |

**Deprecated/outdated:**
- `react-beautiful-dnd`: Archived by Atlassian. Use `@hello-pangea/dnd` which is the actively maintained community fork.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | JUnit 5 + Spring Boot Test (via spring-boot-starter-test) |
| Config file | `backend/src/test/resources/application-test.yml` |
| Quick run command | `cd backend && ./gradlew test --tests "com.micesign.admin.*" -x check` |
| Full suite command | `cd backend && ./gradlew test` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| ORG-01 | Department CRUD + hierarchy rules | integration | `./gradlew test --tests "com.micesign.admin.DepartmentControllerTest"` | Wave 0 |
| ORG-01 | Circular reference prevention | unit | `./gradlew test --tests "com.micesign.admin.DepartmentServiceTest"` | Wave 0 |
| ORG-02 | Position CRUD + reorder | integration | `./gradlew test --tests "com.micesign.admin.PositionControllerTest"` | Wave 0 |
| ORG-03 | User CRUD + pagination/filter | integration | `./gradlew test --tests "com.micesign.admin.UserManagementControllerTest"` | Wave 0 |
| ORG-04 | RBAC enforcement (ADMIN vs SA) | integration | `./gradlew test --tests "com.micesign.admin.RbacEnforcementTest"` | Wave 0 |
| ORG-04 | Last SUPER_ADMIN protection | unit | `./gradlew test --tests "com.micesign.admin.UserManagementServiceTest"` | Wave 0 |

### Sampling Rate
- **Per task commit:** `cd backend && ./gradlew test --tests "com.micesign.admin.*"`
- **Per wave merge:** `cd backend && ./gradlew test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `backend/src/test/java/com/micesign/admin/DepartmentControllerTest.java` -- covers ORG-01
- [ ] `backend/src/test/java/com/micesign/admin/DepartmentServiceTest.java` -- covers ORG-01 business rules
- [ ] `backend/src/test/java/com/micesign/admin/PositionControllerTest.java` -- covers ORG-02
- [ ] `backend/src/test/java/com/micesign/admin/UserManagementControllerTest.java` -- covers ORG-03
- [ ] `backend/src/test/java/com/micesign/admin/UserManagementServiceTest.java` -- covers ORG-04 business rules
- [ ] `backend/src/test/java/com/micesign/admin/RbacEnforcementTest.java` -- covers ORG-04 role enforcement
- [ ] Test migration V4 if schema changes needed: `backend/src/test/resources/db/testmigration/`

## Open Questions

1. **FSD vs CONTEXT.md Discrepancy on Department Name Uniqueness**
   - What we know: FSD FN-ORG-002 says "동일 레벨에서 중복 불가" (unique within same parent). CONTEXT.md D-10 says "globally unique".
   - What's unclear: Nothing -- CONTEXT.md is the authoritative source.
   - Recommendation: Implement globally unique department names per D-10. This is simpler to implement and validate.

2. **FSD FN-ORG-005 Position Authority Scope**
   - What we know: FSD says positions are managed by `SA` only. CONTEXT.md D-37-D-41 doesn't restrict to SA specifically.
   - What's unclear: Whether ADMIN can manage positions.
   - Recommendation: Follow the same pattern as departments -- ADMIN+ can manage positions. Use `@PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN')")`.

3. **User Password on Creation**
   - What we know: FSD FN-ORG-007 says "초기 비밀번호 자동 생성". CONTEXT.md D-20/D-21 says "admin enters initial password manually".
   - What's unclear: Nothing -- CONTEXT.md overrides FSD.
   - Recommendation: Admin enters password in the create user form. Set `mustChangePassword = true` to trigger Phase 2's force-change flow on first login.

4. **Schema Change for Global Department Name Uniqueness**
   - What we know: Current schema has no unique constraint on `department.name`. D-10 requires global uniqueness.
   - Recommendation: Add V4 migration with `ALTER TABLE department ADD UNIQUE INDEX uk_department_name (name)`. Enforce in both database and application layer.

## Project Constraints (from CLAUDE.md)

- **Tech stack locked:** Java 17 + Spring Boot 3.x + Spring Security + JWT + JPA/Hibernate + QueryDSL + Gradle (backend), React 18 + Vite + TypeScript + Zustand + TanStack Query v5 + TailwindCSS (frontend)
- **Flyway required:** All schema changes through migration files -- V4+ for this phase
- **MapStruct for DTO mapping:** Already in build.gradle.kts
- **API envelope:** `{"success": true, "data": {...}, "error": null}` via `ApiResponse<T>` record
- **Form templates are hardcoded React components** (not relevant to this phase but noted)
- **RBAC via @PreAuthorize:** `@EnableMethodSecurity` already active
- **H2 MariaDB mode for tests:** Test migrations in `src/test/resources/db/testmigration/`
- **i18n via react-i18next:** All UI text in translation files
- **Feature-folder frontend structure:** Use `src/features/admin/` for admin pages
- **Layer-first backend:** controllers -> services -> repositories -> domain entities
- **Spring Data Pageable:** page=0, size=20 default (established in Phase 1)

## Sources

### Primary (HIGH confidence)
- Project codebase: `backend/build.gradle.kts`, `SecurityConfig.java`, `User.java`, `V1__create_schema.sql` -- verified existing setup
- `docs/FSD_MiceSign_v1.0.md` FN-ORG-001 through FN-ORG-008 -- API contracts, business rules, error codes
- `03-CONTEXT.md` -- 41 locked decisions from user discussion session
- npm registry: `@hello-pangea/dnd@18.0.1`, `@dnd-kit/sortable@10.0.0`, `@tanstack/react-table@8.21.3` -- verified current versions

### Secondary (MEDIUM confidence)
- [Puck Blog: Top 5 Drag-and-Drop Libraries for React](https://puckeditor.com/blog/top-5-drag-and-drop-libraries-for-react) -- hello-pangea/dnd recommendation for list-based DnD
- [hello-pangea/dnd GitHub](https://github.com/hello-pangea/dnd) -- maintained fork of react-beautiful-dnd

### Tertiary (LOW confidence)
- None

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all libraries already in project or verified via npm registry
- Architecture: HIGH -- follows established project patterns from Phase 1 and 2
- Pitfalls: HIGH -- derived from FSD business rules and concrete codebase analysis
- Frontend patterns: MEDIUM -- custom tree component recommendation based on training data; verified hello-pangea/dnd via npm

**Research date:** 2026-04-01
**Valid until:** 2026-05-01 (stable stack, no fast-moving dependencies)

// Department
export interface DepartmentTreeNode {
  id: number;
  name: string;
  parentId: number | null;
  sortOrder: number;
  isActive: boolean;
  memberCount: number;
  children: DepartmentTreeNode[];
}

export interface DepartmentMember {
  id: number;
  employeeNo: string;
  name: string;
  positionName: string | null;
  status: string;
}

export interface CreateDepartmentRequest {
  name: string;
  parentId: number | null;
  sortOrder: number;
}

export interface UpdateDepartmentRequest {
  name: string;
  parentId: number | null;
  sortOrder: number;
}

// Position
export interface PositionItem {
  id: number;
  name: string;
  sortOrder: number;
  isActive: boolean;
  userCount: number;
}

export interface CreatePositionRequest {
  name: string;
}

export interface UpdatePositionRequest {
  name: string;
}

export interface ReorderPositionsRequest {
  orderedIds: number[];
}

// User
export interface UserListItem {
  id: number;
  employeeNo: string;
  name: string;
  email: string;
  departmentName: string;
  positionName: string | null;
  role: 'SUPER_ADMIN' | 'ADMIN' | 'USER';
  status: 'ACTIVE' | 'INACTIVE' | 'RETIRED';
}

export interface UserDetail {
  id: number;
  employeeNo: string;
  name: string;
  email: string;
  departmentId: number;
  departmentName: string;
  positionId: number | null;
  positionName: string | null;
  role: 'SUPER_ADMIN' | 'ADMIN' | 'USER';
  status: 'ACTIVE' | 'INACTIVE' | 'RETIRED';
  phone: string | null;
  lastLoginAt: string | null;
  createdAt: string;
  isLocked: boolean;
  mustChangePassword: boolean;
}

export interface CreateUserRequest {
  employeeNo: string;
  name: string;
  email: string;
  departmentId: number;
  positionId: number | null;
  role: 'SUPER_ADMIN' | 'ADMIN' | 'USER';
  phone: string;
  password: string;
}

export interface UpdateUserRequest {
  name: string;
  email: string;
  departmentId: number;
  positionId: number | null;
  role: 'SUPER_ADMIN' | 'ADMIN' | 'USER';
  status: 'ACTIVE' | 'INACTIVE' | 'RETIRED';
  phone: string;
}

// Filter params
export interface UserFilterParams {
  keyword?: string;
  departmentId?: number;
  role?: 'SUPER_ADMIN' | 'ADMIN' | 'USER';
  status?: 'ACTIVE' | 'INACTIVE' | 'RETIRED';
  page?: number;
  size?: number;
  sort?: string;
}

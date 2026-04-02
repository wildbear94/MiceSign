import apiClient from '../../../api/client';
import type { ApiResponse } from '../../../types/api';
import type {
  DepartmentTreeNode,
  DepartmentMember,
  CreateDepartmentRequest,
  UpdateDepartmentRequest,
} from '../../../types/admin';

const BASE = '/admin/departments';

export const departmentApi = {
  getTree: (includeInactive = false) =>
    apiClient.get<ApiResponse<DepartmentTreeNode[]>>(BASE, {
      params: { includeInactive },
    }),

  getMembers: (id: number) =>
    apiClient.get<ApiResponse<DepartmentMember[]>>(`${BASE}/${id}/members`),

  getUserCount: (id: number) =>
    apiClient.get<ApiResponse<{ count: number }>>(`${BASE}/${id}/user-count`),

  create: (data: CreateDepartmentRequest) =>
    apiClient.post<ApiResponse<DepartmentTreeNode>>(BASE, data),

  update: (id: number, data: UpdateDepartmentRequest) =>
    apiClient.put<ApiResponse<DepartmentTreeNode>>(`${BASE}/${id}`, data),

  deactivate: (id: number) =>
    apiClient.patch<ApiResponse<void>>(`${BASE}/${id}/deactivate`),
};

import apiClient from '../../../api/client';
import type { ApiResponse } from '../../../types/api';
import type { DepartmentTreeNode, DepartmentMember } from '../../../types/admin';

const BASE = '/organization';

export const organizationApi = {
  getTree: () =>
    apiClient.get<ApiResponse<DepartmentTreeNode[]>>(`${BASE}/departments`),

  getMembers: (id: number) =>
    apiClient.get<ApiResponse<DepartmentMember[]>>(`${BASE}/departments/${id}/members`),
};

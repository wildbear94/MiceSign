import apiClient from '../../../api/client';
import type { ApiResponse, PageResponse } from '../../../types/api';
import type {
  UserListItem,
  UserDetail,
  CreateUserRequest,
  UpdateUserRequest,
  UserFilterParams,
} from '../../../types/admin';

const BASE = '/admin/users';

export const userApi = {
  getList: (params: UserFilterParams) =>
    apiClient.get<ApiResponse<PageResponse<UserListItem>>>(BASE, { params }),

  getById: (id: number) =>
    apiClient.get<ApiResponse<UserDetail>>(`${BASE}/${id}`),

  create: (data: CreateUserRequest) =>
    apiClient.post<ApiResponse<UserDetail>>(BASE, data),

  update: (id: number, data: UpdateUserRequest) =>
    apiClient.put<ApiResponse<UserDetail>>(`${BASE}/${id}`, data),

  deactivate: (id: number) =>
    apiClient.patch<ApiResponse<void>>(`${BASE}/${id}/deactivate`),
};

import apiClient from '../../../api/client';
import type { ApiResponse, PageResponse } from '../../../types/api';
import type {
  RegistrationListItem,
  RegistrationFilterParams,
  ApproveRegistrationRequest,
  RejectRegistrationRequest,
} from '../../../types/admin';

const BASE = '/admin/registrations';

export const registrationApi = {
  getList: (params: RegistrationFilterParams) =>
    apiClient.get<ApiResponse<PageResponse<RegistrationListItem>>>(BASE, { params }),

  approve: (id: number, data: ApproveRegistrationRequest) =>
    apiClient.post<ApiResponse<void>>(`${BASE}/${id}/approve`, data),

  reject: (id: number, data: RejectRegistrationRequest) =>
    apiClient.post<ApiResponse<void>>(`${BASE}/${id}/reject`, data),
};

import apiClient from '../../../api/client';
import type { ApiResponse } from '../../../types/api';
import type {
  AdminTemplate,
  AdminTemplateDetail,
  CreateTemplateRequest,
  UpdateTemplateRequest,
} from '../types/builder';

const BASE = '/admin/templates';

export const adminTemplateApi = {
  list: () =>
    apiClient.get<ApiResponse<AdminTemplate[]>>(BASE).then(r => r.data.data!),

  getById: (id: number) =>
    apiClient.get<ApiResponse<AdminTemplateDetail>>(`${BASE}/${id}`).then(r => r.data.data!),

  create: (req: CreateTemplateRequest) =>
    apiClient.post<ApiResponse<AdminTemplateDetail>>(BASE, req).then(r => r.data.data!),

  update: (id: number, req: UpdateTemplateRequest) =>
    apiClient.put<ApiResponse<AdminTemplateDetail>>(`${BASE}/${id}`, req).then(r => r.data.data!),

  deactivate: (id: number) =>
    apiClient.delete(`${BASE}/${id}`),
};

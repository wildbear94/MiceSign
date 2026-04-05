import apiClient from '../../../api/client';
import type { ApiResponse } from '../../../types/api';
import type {
  AdminTemplateResponse,
  AdminTemplateDetailResponse,
  CreateTemplateRequest,
  UpdateTemplateRequest,
  OptionSetResponse,
} from '../types/builder';

export const adminTemplateApi = {
  getTemplates: () =>
    apiClient.get<ApiResponse<AdminTemplateResponse[]>>('/admin/templates'),

  getTemplate: (id: number) =>
    apiClient.get<ApiResponse<AdminTemplateDetailResponse>>(`/admin/templates/${id}`),

  createTemplate: (data: CreateTemplateRequest) =>
    apiClient.post<ApiResponse<AdminTemplateDetailResponse>>('/admin/templates', data),

  updateTemplate: (id: number, data: UpdateTemplateRequest) =>
    apiClient.put<ApiResponse<AdminTemplateDetailResponse>>(`/admin/templates/${id}`, data),

  deactivateTemplate: (id: number) =>
    apiClient.delete<ApiResponse<void>>(`/admin/templates/${id}`),

  getOptionSets: () =>
    apiClient.get<ApiResponse<OptionSetResponse[]>>('/admin/option-sets'),

  getOptionSet: (id: number) =>
    apiClient.get<ApiResponse<OptionSetResponse>>(`/admin/option-sets/${id}`),
};

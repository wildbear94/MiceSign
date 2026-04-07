import apiClient from '../../../api/client';
import type { ApiResponse } from '../../../types/api';
import type { Template, TemplateDetail } from '../types/document';

export const templateApi = {
  listActive: () =>
    apiClient.get<ApiResponse<Template[]>>('/templates').then(r => r.data.data!),

  getByCode: (code: string) =>
    apiClient.get<ApiResponse<TemplateDetail>>(`/templates/${code}`).then(r => r.data.data!),

  getSchema: (code: string, version?: number) =>
    apiClient.get<ApiResponse<string>>(`/templates/${code}/schema`, { params: { version } }).then(r => r.data.data!),
};

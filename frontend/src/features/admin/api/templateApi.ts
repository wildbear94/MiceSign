import apiClient from '../../../api/client';
import type { ApiResponse } from '../../../types/api';

export interface TemplateListItem {
  id: number;
  code: string;
  name: string;
  description: string;
  prefix: string;
  isActive: boolean;
  sortOrder: number;
  isCustom: boolean;
  category: string;
  icon: string;
  budgetEnabled: boolean;
}

const BASE = '/admin/templates';

export const templateApi = {
  getList: () =>
    apiClient.get<ApiResponse<TemplateListItem[]>>(BASE),

  update: (id: number, data: { isActive: boolean }) =>
    apiClient.put<ApiResponse<unknown>>(`${BASE}/${id}`, data),

  deactivate: (id: number) =>
    apiClient.delete<ApiResponse<void>>(`${BASE}/${id}`),
};

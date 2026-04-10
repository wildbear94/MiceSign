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

export interface TemplateDetailItem {
  id: number;
  code: string;
  name: string;
  description: string;
  prefix: string;
  isActive: boolean;
  sortOrder: number;
  schemaDefinition: string | null;
  schemaVersion: number;
  isCustom: boolean;
  category: string;
  icon: string;
  createdBy: string;
  budgetEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTemplateData {
  name: string;
  description?: string;
  prefix: string;
  category?: string;
  icon?: string;
}

export interface UpdateTemplateData {
  name?: string;
  description?: string;
  category?: string;
  icon?: string;
}

const BASE = '/admin/templates';

export const templateApi = {
  getList: () =>
    apiClient.get<ApiResponse<TemplateListItem[]>>(BASE),

  getDetail: (id: number) =>
    apiClient.get<ApiResponse<TemplateDetailItem>>(`${BASE}/${id}`),

  create: (data: CreateTemplateData) =>
    apiClient.post<ApiResponse<TemplateDetailItem>>(BASE, data),

  update: (id: number, data: { isActive: boolean }) =>
    apiClient.put<ApiResponse<unknown>>(`${BASE}/${id}`, data),

  updateTemplate: (id: number, data: UpdateTemplateData) =>
    apiClient.put<ApiResponse<TemplateDetailItem>>(`${BASE}/${id}`, data),

  deactivate: (id: number) =>
    apiClient.delete<ApiResponse<void>>(`${BASE}/${id}`),
};

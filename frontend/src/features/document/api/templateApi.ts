import apiClient from '../../../api/client';
import type { ApiResponse } from '../../../types/api';
import type { TemplateResponse } from '../types/document';

export const templateApi = {
  getActiveTemplates: () =>
    apiClient.get<ApiResponse<TemplateResponse[]>>('/templates'),
};

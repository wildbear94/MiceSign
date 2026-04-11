import apiClient from '../../../api/client';
import type { ApiResponse } from '../../../types/api';
import type { TemplateResponse } from '../types/document';
import type { SchemaDefinition } from '../types/dynamicForm';

export const templateApi = {
  getActiveTemplates: () =>
    apiClient.get<ApiResponse<TemplateResponse[]>>('/templates'),

  getTemplateSchema: (code: string) =>
    apiClient
      .get<ApiResponse<SchemaDefinition>>(`/templates/${code}/schema`)
      .then((res) => res.data.data as SchemaDefinition),
};

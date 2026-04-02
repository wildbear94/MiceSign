import apiClient from '../../../api/client';
import type { ApiResponse, PageResponse } from '../../../types/api';
import type {
  DocumentResponse,
  DocumentDetailResponse,
  CreateDocumentRequest,
  UpdateDocumentRequest,
  MyDocumentParams,
} from '../types/document';

const BASE = '/documents';

export const documentApi = {
  getMyDocuments: (params: MyDocumentParams) =>
    apiClient.get<ApiResponse<PageResponse<DocumentResponse>>>(`${BASE}/my`, { params }),

  getById: (id: number) =>
    apiClient.get<ApiResponse<DocumentDetailResponse>>(`${BASE}/${id}`),

  create: (data: CreateDocumentRequest) =>
    apiClient.post<ApiResponse<DocumentResponse>>(BASE, data),

  update: (id: number, data: UpdateDocumentRequest) =>
    apiClient.put<ApiResponse<DocumentResponse>>(`${BASE}/${id}`, data),

  delete: (id: number) =>
    apiClient.delete<ApiResponse<void>>(`${BASE}/${id}`),

  submit: (id: number) =>
    apiClient.post<ApiResponse<DocumentResponse>>(`${BASE}/${id}/submit`),
};

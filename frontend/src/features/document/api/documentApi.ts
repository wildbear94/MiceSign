import apiClient from '../../../api/client';
import type { ApiResponse, PageResponse } from '../../../types/api';
import type {
  DocumentDetail,
  DocumentListItem,
  CreateDocumentRequest,
  UpdateDocumentRequest,
  DocumentSearchParams,
} from '../types/document';

export const documentApi = {
  create: (req: CreateDocumentRequest) =>
    apiClient.post<ApiResponse<DocumentDetail>>('/documents', req).then(r => r.data.data!),

  update: (id: number, req: UpdateDocumentRequest) =>
    apiClient.put<ApiResponse<DocumentDetail>>(`/documents/${id}`, req).then(r => r.data.data!),

  getById: (id: number) =>
    apiClient.get<ApiResponse<DocumentDetail>>(`/documents/${id}`).then(r => r.data.data!),

  delete: (id: number) =>
    apiClient.delete(`/documents/${id}`),

  submit: (id: number) =>
    apiClient.post<ApiResponse<DocumentDetail>>(`/documents/${id}/submit`).then(r => r.data.data!),

  withdraw: (id: number) =>
    apiClient.post<ApiResponse<DocumentDetail>>(`/documents/${id}/withdraw`).then(r => r.data.data!),

  rewrite: (id: number) =>
    apiClient.post<ApiResponse<DocumentDetail>>(`/documents/${id}/rewrite`).then(r => r.data.data!),

  search: (params: DocumentSearchParams) =>
    apiClient.get<ApiResponse<PageResponse<DocumentListItem>>>('/documents/search', { params }).then(r => r.data.data!),
};

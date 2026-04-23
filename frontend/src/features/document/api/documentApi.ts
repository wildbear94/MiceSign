import apiClient from '../../../api/client';
import type { ApiResponse, PageResponse } from '../../../types/api';
import type {
  DocumentResponse,
  DocumentDetailResponse,
  CreateDocumentRequest,
  UpdateDocumentRequest,
  MyDocumentParams,
  DocumentSearchParams,
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
    apiClient.post<ApiResponse<DocumentDetailResponse>>(`${BASE}/${id}/submit`),

  withdraw: (id: number) =>
    apiClient.post<ApiResponse<DocumentDetailResponse>>(`${BASE}/${id}/withdraw`),

  rewrite: (id: number) =>
    apiClient.post<ApiResponse<DocumentDetailResponse>>(`${BASE}/${id}/rewrite`),

  searchDocuments: (params: DocumentSearchParams) => {
    // D-C5: 프론트 tab='search' → 백엔드 tab='all'
    // D-B1: statuses 배열 → 백엔드 status 반복 파라미터 (paramsSerializer 가 repeat 포맷 적용)
    const { statuses, tab, ...rest } = params;
    const serverTab = tab === 'search' ? 'all' : tab;
    const apiParams: Record<string, unknown> = { ...rest };
    if (statuses && statuses.length > 0) apiParams.status = statuses;
    if (serverTab) apiParams.tab = serverTab;
    return apiClient.get<ApiResponse<PageResponse<DocumentResponse>>>(`${BASE}/search`, {
      params: apiParams,
    });
  },
};

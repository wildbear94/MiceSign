import apiClient from '../../../api/client';
import type { ApiResponse } from '../../../types/api';
import type {
  PositionItem,
  CreatePositionRequest,
  UpdatePositionRequest,
  ReorderPositionsRequest,
} from '../../../types/admin';

const BASE = '/admin/positions';

export const positionApi = {
  getAll: () =>
    apiClient.get<ApiResponse<PositionItem[]>>(BASE),

  create: (data: CreatePositionRequest) =>
    apiClient.post<ApiResponse<PositionItem>>(BASE, data),

  update: (id: number, data: UpdatePositionRequest) =>
    apiClient.put<ApiResponse<PositionItem>>(`${BASE}/${id}`, data),

  reorder: (data: ReorderPositionsRequest) =>
    apiClient.put<ApiResponse<void>>(`${BASE}/reorder`, data),

  deactivate: (id: number) =>
    apiClient.patch<ApiResponse<void>>(`${BASE}/${id}/deactivate`),
};

import apiClient from '../../../api/client';
import type { ApiResponse, PageResponse } from '../../../types/api';
import type { PendingApprovalResponse, ApprovalActionRequest } from '../types/approval';
import type { DocumentResponse } from '../../document/types/document';

const BASE = '/approvals';

export const approvalApi = {
  approve: (lineId: number, data?: ApprovalActionRequest) =>
    apiClient.post<ApiResponse<void>>(`${BASE}/${lineId}/approve`, data ?? {}),

  reject: (lineId: number, data: ApprovalActionRequest) =>
    apiClient.post<ApiResponse<void>>(`${BASE}/${lineId}/reject`, data),

  getPending: (params: { page?: number; size?: number }) =>
    apiClient.get<ApiResponse<PageResponse<PendingApprovalResponse>>>(`${BASE}/pending`, { params }),

  getCompleted: (params: { page?: number; size?: number }) =>
    apiClient.get<ApiResponse<PageResponse<DocumentResponse>>>(`${BASE}/completed`, { params }),
};

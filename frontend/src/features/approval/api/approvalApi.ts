import apiClient from '../../../api/client';
import type { ApiResponse, PageResponse } from '../../../types/api';
import type { DocumentDetail, DocumentListItem, PendingApproval, ApprovalActionRequest } from '../../document/types/document';

export const approvalApi = {
  approve: (lineId: number, req?: ApprovalActionRequest) =>
    apiClient.post<ApiResponse<DocumentDetail>>(`/approvals/${lineId}/approve`, req || {}).then(r => r.data.data!),

  reject: (lineId: number, req: ApprovalActionRequest) =>
    apiClient.post<ApiResponse<DocumentDetail>>(`/approvals/${lineId}/reject`, req).then(r => r.data.data!),

  getPending: (page = 0, size = 20) =>
    apiClient.get<ApiResponse<PageResponse<PendingApproval>>>('/approvals/pending', { params: { page, size } }).then(r => r.data.data!),

  getCompleted: (page = 0, size = 20) =>
    apiClient.get<ApiResponse<PageResponse<DocumentListItem>>>('/approvals/completed', { params: { page, size } }).then(r => r.data.data!),
};

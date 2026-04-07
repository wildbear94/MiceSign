import apiClient from '../../../api/client';
import type { ApiResponse, PageResponse } from '../../../types/api';
import type { AuditLogEntry, AuditLogSearchParams } from '../types/audit';

export const auditApi = {
  search: (params: AuditLogSearchParams) =>
    apiClient.get<ApiResponse<PageResponse<AuditLogEntry>>>('/admin/audit-logs', { params }).then(r => r.data.data!),
};

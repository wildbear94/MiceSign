import apiClient from '../../../api/client';
import type { ApiResponse, PageResponse } from '../../../types/api';
import type { AuditLogResponse, AuditLogFilter } from '../types/audit';

export const auditApi = {
  getLogs: (filter: AuditLogFilter, page = 0, size = 20) =>
    apiClient.get<ApiResponse<PageResponse<AuditLogResponse>>>('/admin/audit-logs', {
      params: { ...filter, page, size },
    }),
};

import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { auditApi } from '../api/auditApi';
import type { AuditLogSearchParams } from '../types/audit';

export function useAuditLogs(params: AuditLogSearchParams = {}) {
  return useQuery({
    queryKey: ['audit-logs', params],
    queryFn: () => auditApi.search(params),
    placeholderData: keepPreviousData,
  });
}

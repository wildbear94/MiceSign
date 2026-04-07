import { useQuery } from '@tanstack/react-query';
import { auditApi } from '../api/auditApi';
import type { AuditLogFilter } from '../types/audit';

export function useAuditLogs(filter: AuditLogFilter, page = 0, size = 20) {
  return useQuery({
    queryKey: ['audit-logs', filter, page, size],
    queryFn: () => auditApi.getLogs(filter, page, size).then((res) => res.data.data!),
  });
}

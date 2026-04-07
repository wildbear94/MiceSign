import { useState, useCallback } from 'react';
import { useAuthStore } from '../../../stores/authStore';
import AuditLogFilters from '../components/AuditLogFilters';
import AuditLogTable from '../components/AuditLogTable';
import Pagination from '../../admin/components/Pagination';
import { useAuditLogs } from '../hooks/useAuditLogs';
import type { AuditLogFilter } from '../types/audit';

export default function AuditLogPage() {
  const { user } = useAuthStore();
  const [filter, setFilter] = useState<AuditLogFilter>({});
  const [page, setPage] = useState(0);

  const { data, isLoading, isError } = useAuditLogs(filter, page, 20);

  // SUPER_ADMIN only restriction
  if (!user || user.role !== 'SUPER_ADMIN') {
    return (
      <div className="text-center py-12 text-gray-500 dark:text-gray-400">
        접근 권한이 없습니다.
      </div>
    );
  }

  const handleFilterChange = useCallback((newFilter: AuditLogFilter) => {
    setFilter(newFilter);
    setPage(0);
  }, []);

  const handlePageChange = useCallback((newPage: number) => {
    setPage(newPage);
  }, []);

  return (
    <div>
      <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-50 mb-6">
        감사 로그
      </h1>

      <AuditLogFilters filter={filter} onFilterChange={handleFilterChange} />

      {isError && (
        <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-400">
          데이터를 불러오는 데 실패했습니다. 잠시 후 다시 시도해 주세요.
        </div>
      )}

      <AuditLogTable data={data} isLoading={isLoading} />

      {data && (
        <Pagination
          currentPage={data.number}
          totalPages={data.totalPages}
          totalElements={data.totalElements}
          onPageChange={handlePageChange}
        />
      )}
    </div>
  );
}

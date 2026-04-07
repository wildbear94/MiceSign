import { useState, useCallback } from 'react';
import { useAuthStore } from '../../../stores/authStore';
import NotificationLogFilters from '../components/NotificationLogFilters';
import NotificationLogTable from '../components/NotificationLogTable';
import Pagination from '../../admin/components/Pagination';
import { useNotificationLogs, useResendNotification } from '../hooks/useNotificationLogs';
import type { NotificationLogFilter } from '../types/notification';

export default function NotificationLogPage() {
  const { user } = useAuthStore();
  const [filter, setFilter] = useState<NotificationLogFilter>({});
  const [page, setPage] = useState(0);
  const { data, isLoading, isError } = useNotificationLogs(filter, page, 20);
  const { mutate: resend, isPending: isResending } = useResendNotification();

  if (!user || user.role !== 'SUPER_ADMIN') {
    return (
      <div className="text-center py-12 text-gray-500 dark:text-gray-400">
        접근 권한이 없습니다.
      </div>
    );
  }

  const handleFilterChange = useCallback((newFilter: NotificationLogFilter) => {
    setFilter(newFilter);
    setPage(0);
  }, []);

  const handleResend = useCallback(
    (id: number) => {
      resend(id);
    },
    [resend],
  );

  const handlePageChange = useCallback((newPage: number) => {
    setPage(newPage);
  }, []);

  return (
    <div>
      <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-50 mb-6">알림 이력</h1>

      <NotificationLogFilters filter={filter} onFilterChange={handleFilterChange} />

      {isError && (
        <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-400">
          데이터를 불러오는 데 실패했습니다. 잠시 후 다시 시도해 주세요.
        </div>
      )}

      <NotificationLogTable
        data={data}
        isLoading={isLoading}
        onResend={handleResend}
        isResending={isResending}
      />

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

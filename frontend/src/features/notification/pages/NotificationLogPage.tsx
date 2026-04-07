import { useState, useCallback } from 'react';
import { ShieldAlert } from 'lucide-react';
import { useAuthStore } from '../../../stores/authStore';
import NotificationLogFilters from '../components/NotificationLogFilters';
import NotificationLogTable from '../components/NotificationLogTable';
import Pagination from '../../admin/components/Pagination';
import { useNotificationLogs, useResendNotification } from '../hooks/useNotificationLogs';
import type { NotificationLogSearchParams } from '../types/notification';

export default function NotificationLogPage() {
  const user = useAuthStore((s) => s.user);
  const [params, setParams] = useState<NotificationLogSearchParams>({});
  const [page, setPage] = useState(0);

  const { data, isLoading, isError } = useNotificationLogs({ ...params, page, size: 20 });
  const resendMutation = useResendNotification();

  const handleFilterChange = useCallback((newParams: NotificationLogSearchParams) => {
    setParams(newParams);
    setPage(0);
  }, []);

  const handlePageChange = useCallback((p: number) => setPage(p), []);

  const handleResend = useCallback(
    (id: number) => {
      resendMutation.mutate(id);
    },
    [resendMutation],
  );

  // Access control: SUPER_ADMIN only
  if (user?.role !== 'SUPER_ADMIN') {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-400 dark:text-gray-500">
        <ShieldAlert className="h-12 w-12 mb-3" />
        <p className="text-base font-medium">접근 권한이 없습니다</p>
        <p className="text-sm mt-1">이 페이지는 최고 관리자만 사용할 수 있습니다.</p>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold leading-tight text-gray-900 dark:text-gray-50">
          알림 로그
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          이메일 알림 발송 내역을 확인하고 실패한 알림을 재발송합니다.
        </p>
      </div>

      {/* Filters */}
      <NotificationLogFilters filter={params} onFilterChange={handleFilterChange} />

      {/* Error state */}
      {isError && (
        <div className="rounded-lg border border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800 p-4 text-sm text-red-700 dark:text-red-300 mb-4">
          알림 로그를 불러오는데 실패했습니다.
        </div>
      )}

      {/* Table */}
      <NotificationLogTable
        data={data}
        isLoading={isLoading}
        onResend={handleResend}
        isResending={resendMutation.isPending}
      />

      {/* Pagination */}
      {data && data.totalPages > 1 && (
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

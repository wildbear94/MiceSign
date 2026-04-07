import { AUDIT_ACTIONS } from '../types/audit';
import type { AuditLogResponse } from '../types/audit';
import type { PageResponse } from '../../../types/api';

interface AuditLogTableProps {
  data: PageResponse<AuditLogResponse> | undefined;
  isLoading: boolean;
}

function getActionLabel(action: string): string {
  const found = AUDIT_ACTIONS.find((a) => a.value === action);
  return found ? found.label : action;
}

function formatTimestamp(iso: string): string {
  // Format to YYYY-MM-DD HH:mm:ss
  const d = new Date(iso);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  const ss = String(d.getSeconds()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd} ${hh}:${mi}:${ss}`;
}

function truncate(text: string | null, max: number): string {
  if (!text) return '-';
  return text.length > max ? text.slice(0, max) + '...' : text;
}

export default function AuditLogTable({ data, isLoading }: AuditLogTableProps) {
  if (isLoading) {
    return (
      <div className="space-y-3" aria-hidden="true">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="h-12 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (!data || data.content.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500 dark:text-gray-400">
        조건에 맞는 로그가 없습니다.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full">
        <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
          <tr>
            <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              액션
            </th>
            <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              사용자
            </th>
            <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              대상
            </th>
            <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              상세
            </th>
            <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              IP 주소
            </th>
            <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              일시
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
          {data.content.map((log) => (
            <tr key={log.id}>
              <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                {getActionLabel(log.action)}
              </td>
              <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                {log.userName ?? '시스템'}
              </td>
              <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                {log.targetType && log.targetId != null
                  ? `${log.targetType}:${log.targetId}`
                  : '-'}
              </td>
              <td
                className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400 max-w-xs"
                title={log.detail ?? undefined}
              >
                {truncate(log.detail, 50)}
              </td>
              <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                {log.ipAddress ?? '-'}
              </td>
              <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">
                {formatTimestamp(log.createdAt)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

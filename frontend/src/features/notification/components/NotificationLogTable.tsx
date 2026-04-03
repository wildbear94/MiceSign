import { NOTIFICATION_EVENT_TYPES } from '../types/notification';
import type { NotificationLogResponse } from '../types/notification';
import type { PageResponse } from '../../../types/api';
import NotificationStatusBadge from './NotificationStatusBadge';

interface NotificationLogTableProps {
  data: PageResponse<NotificationLogResponse> | undefined;
  isLoading: boolean;
  onResend: (id: number) => void;
  isResending: boolean;
}

function getEventLabel(eventType: string): string {
  const found = NOTIFICATION_EVENT_TYPES.find((e) => e.value === eventType);
  return found ? found.label : eventType;
}

function formatTimestamp(iso: string): string {
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

export default function NotificationLogTable({
  data,
  isLoading,
  onResend,
  isResending,
}: NotificationLogTableProps) {
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
      <div className="text-center py-12">
        <h3 className="text-gray-500 dark:text-gray-400 font-medium">
          알림 이력이 없습니다
        </h3>
        <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
          결재 이벤트가 발생하면 발송된 알림이 여기에 표시됩니다.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full">
        <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
          <tr>
            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              수신자
            </th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              이벤트
            </th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              문서
            </th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              상태
            </th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              재시도
            </th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              발송일시
            </th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              액션
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
          {data.content.map((row) => (
            <tr key={row.id} className="text-sm text-gray-900 dark:text-gray-50">
              <td className="px-4 py-3">
                {row.recipientName || row.recipientEmail}
              </td>
              <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                {getEventLabel(row.eventType)}
              </td>
              <td className="px-4 py-3">
                {row.documentTitle ? (
                  <div>
                    <div title={row.documentTitle}>{truncate(row.documentTitle, 30)}</div>
                    {row.documentId != null && (
                      <div className="text-xs text-gray-400 dark:text-gray-500">
                        #{row.documentId}
                      </div>
                    )}
                  </div>
                ) : (
                  '-'
                )}
              </td>
              <td className="px-4 py-3">
                <NotificationStatusBadge status={row.status} />
              </td>
              <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                {row.retryCount}
              </td>
              <td className="px-4 py-3 text-gray-600 dark:text-gray-400 whitespace-nowrap">
                {formatTimestamp(row.sentAt || row.createdAt)}
              </td>
              <td className="px-4 py-3">
                {row.status === 'FAILED' && (
                  <button
                    type="button"
                    onClick={() => onResend(row.id)}
                    disabled={isResending}
                    className={`text-blue-600 hover:text-blue-700 dark:text-blue-400 text-sm font-semibold ${
                      isResending ? 'opacity-50 pointer-events-none' : ''
                    }`}
                  >
                    {isResending ? '발송 중...' : '재발송'}
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

interface Props {
  status: string;
}

export default function NotificationStatusBadge({ status }: Props) {
  const styles: Record<string, string> = {
    SUCCESS: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    FAILED: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    PENDING: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    RETRY: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  };

  const labels: Record<string, string> = {
    SUCCESS: '성공',
    FAILED: '실패',
    PENDING: '대기',
    RETRY: '재시도',
  };

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${styles[status] || ''}`}
    >
      {labels[status] || status}
    </span>
  );
}

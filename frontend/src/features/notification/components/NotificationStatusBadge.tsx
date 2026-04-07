interface NotificationStatusBadgeProps {
  status: string;
}

const STATUS_CONFIG: Record<string, { className: string; label: string }> = {
  SENT: {
    className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    label: '발송완료',
  },
  PENDING: {
    className: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    label: '대기중',
  },
  FAILED: {
    className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    label: '실패',
  },
};

export default function NotificationStatusBadge({ status }: NotificationStatusBadgeProps) {
  const config = STATUS_CONFIG[status] ?? {
    className: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
    label: status,
  };

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${config.className}`}
    >
      {config.label}
    </span>
  );
}

import type { LucideIcon } from 'lucide-react';
import ErrorState from './ErrorState';

interface CountCardProps {
  icon: LucideIcon;
  count: number;
  label: string;
  onClick: () => void;
  isLoading?: boolean;
  isError?: boolean;        // Phase 31 D-C2 신규
  iconColor?: string;
}

export default function CountCard({
  icon: Icon,
  count,
  label,
  onClick,
  isLoading = false,
  isError = false,
  iconColor = 'text-gray-400',
}: CountCardProps) {
  if (isLoading) {
    return (
      <div
        className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6"
        aria-hidden="true"
      >
        <div className="animate-pulse">
          <div className="h-10 w-10 bg-gray-200 dark:bg-gray-700 rounded mb-3" />
          <div className="h-7 w-16 bg-gray-200 dark:bg-gray-700 rounded mb-2" />
          <div className="h-4 w-20 bg-gray-200 dark:bg-gray-700 rounded" />
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div
        role="alert"
        aria-live="polite"
        className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 min-h-[152px]"
      >
        <ErrorState variant="card" />
      </div>
    );
  }

  return (
    <a
      role="link"
      tabIndex={0}
      aria-label={`${label}: ${count}건`}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
      className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 cursor-pointer hover:shadow-md transition-shadow block focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:outline-none"
    >
      <Icon className={`h-10 w-10 ${iconColor}`} />
      <div className="text-2xl font-semibold text-gray-900 dark:text-gray-50 mt-3">
        {count}
      </div>
      <div className="text-sm font-normal text-gray-500 dark:text-gray-400 mt-1">
        {label}
      </div>
    </a>
  );
}

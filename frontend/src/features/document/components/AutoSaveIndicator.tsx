import { Loader2, Check, AlertCircle } from 'lucide-react';

interface AutoSaveIndicatorProps {
  status: 'idle' | 'saving' | 'saved' | 'error';
  lastSavedAt?: Date;
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
}

export default function AutoSaveIndicator({ status, lastSavedAt }: AutoSaveIndicatorProps) {
  if (status === 'idle') return null;

  return (
    <div className="flex items-center gap-1.5 text-sm">
      {status === 'saving' && (
        <>
          <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
          <span className="text-blue-600 dark:text-blue-400">저장 중...</span>
        </>
      )}
      {status === 'saved' && (
        <>
          <Check className="h-4 w-4 text-green-500" />
          <span className="text-gray-500 dark:text-gray-400">
            저장됨{lastSavedAt ? ` (${formatTime(lastSavedAt)})` : ''}
          </span>
        </>
      )}
      {status === 'error' && (
        <>
          <AlertCircle className="h-4 w-4 text-red-500" />
          <span className="text-red-600 dark:text-red-400">저장 실패</span>
        </>
      )}
    </div>
  );
}

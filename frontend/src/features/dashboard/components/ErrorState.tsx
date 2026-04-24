import { AlertTriangle, Loader2 } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useState } from 'react';

interface Props {
  variant?: 'card' | 'list';
}

/**
 * Phase 31 D-C2 — 3위젯 공통 에러 UI (CountCard row + PendingList + RecentDocumentsList).
 *
 * variant='card': 카드 내부용 (heading + button 만, body 생략)
 * variant='list': 리스트 위젯용 (heading + body + button)
 *
 * 클릭 시 ['dashboard'] prefix 쿼리들을 refetchQueries (invalidate 아님 — 즉시 네트워크 호출).
 */
export default function ErrorState({ variant = 'list' }: Props) {
  const { t } = useTranslation('dashboard');
  const qc = useQueryClient();
  const [retrying, setRetrying] = useState(false);

  const handleRetry = async () => {
    setRetrying(true);
    try {
      await qc.refetchQueries({ queryKey: ['dashboard'] });
    } finally {
      setRetrying(false);
    }
  };

  const iconSize = variant === 'card' ? 'h-8 w-8' : 'h-10 w-10';

  return (
    <div
      role="alert"
      aria-live="polite"
      className="flex flex-col items-center justify-center py-6 text-center"
    >
      <AlertTriangle
        className={`${iconSize} text-amber-500 dark:text-amber-400 mb-3`}
        aria-hidden="true"
      />
      <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
        {t('error')}
      </p>
      {variant !== 'card' && (
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          {t('errorDesc')}
        </p>
      )}
      <button
        type="button"
        onClick={handleRetry}
        disabled={retrying}
        aria-busy={retrying}
        aria-label={t('retry')}
        className="mt-4 h-10 px-4 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:outline-none disabled:opacity-60"
      >
        {retrying && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
        {t('retry')}
      </button>
    </div>
  );
}

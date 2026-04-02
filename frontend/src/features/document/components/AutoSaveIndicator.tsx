import { Loader2, Check, AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { SaveStatus } from '../hooks/useAutoSave';

interface AutoSaveIndicatorProps {
  status: SaveStatus;
}

export default function AutoSaveIndicator({ status }: AutoSaveIndicatorProps) {
  const { t } = useTranslation('document');

  if (status === 'idle') return null;

  return (
    <div className="flex items-center gap-1 text-sm">
      {status === 'saving' && (
        <>
          <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
          <span className="text-blue-600">{t('autoSave.saving')}</span>
        </>
      )}
      {status === 'saved' && (
        <>
          <Check className="h-4 w-4 text-gray-500" />
          <span className="text-gray-500">{t('autoSave.saved')}</span>
        </>
      )}
      {status === 'error' && (
        <>
          <AlertCircle className="h-4 w-4 text-red-600" />
          <span className="text-red-600">{t('autoSave.failed')}</span>
        </>
      )}
    </div>
  );
}

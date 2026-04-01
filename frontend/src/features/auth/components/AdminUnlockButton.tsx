import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2 } from 'lucide-react';
import apiClient from '../../../api/client';
import type { ApiResponse } from '../../../types/api';

interface AdminUnlockButtonProps {
  userId: number;
  userName: string;
  onSuccess: () => void;
}

export default function AdminUnlockButton({ userId, userName, onSuccess }: AdminUnlockButtonProps) {
  const { t } = useTranslation('auth');
  const [isLoading, setIsLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleClick = async () => {
    if (!showConfirm) {
      setShowConfirm(true);
      return;
    }

    setIsLoading(true);

    try {
      await apiClient.post<ApiResponse<null>>(`/admin/users/${userId}/unlock`);
      setSuccessMessage(t('admin.unlockSuccess'));
      setShowConfirm(false);
      setTimeout(() => {
        setSuccessMessage(null);
        onSuccess();
      }, 1500);
    } catch (err) {
      // Reset confirmation state on error
      setShowConfirm(false);
    } finally {
      setIsLoading(false);
    }
  };

  if (successMessage) {
    return (
      <span className="text-sm text-green-600 dark:text-green-400">{successMessage}</span>
    );
  }

  return (
    <div className="inline-flex items-center gap-2">
      {showConfirm && (
        <>
          <span className="text-sm text-amber-700 dark:text-amber-400">
            {t('admin.unlockConfirm', { name: userName })}
          </span>
          <button
            type="button"
            onClick={() => setShowConfirm(false)}
            className="text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
          >
            {'\uCDE8\uC18C'}
          </button>
        </>
      )}
      <button
        type="button"
        onClick={handleClick}
        disabled={isLoading}
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold rounded-lg transition-colors duration-150 ${
          isLoading
            ? 'bg-blue-300 text-white cursor-not-allowed'
            : showConfirm
              ? 'bg-amber-600 hover:bg-amber-700 text-white'
              : 'bg-blue-600 hover:bg-blue-700 text-white'
        }`}
      >
        {isLoading ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : showConfirm ? (
          '\uD655\uC778'
        ) : (
          t('admin.unlockAccount')
        )}
      </button>
    </div>
  );
}

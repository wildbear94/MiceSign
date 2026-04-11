import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Eye, EyeOff, Loader2, X } from 'lucide-react';
import { AxiosError } from 'axios';
import apiClient from '../../../api/client';
import type { ApiResponse } from '../../../types/api';

interface AdminPasswordResetModalProps {
  userId: number;
  userName: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AdminPasswordResetModal({
  userId,
  userName,
  isOpen,
  onClose,
  onSuccess,
}: AdminPasswordResetModalProps) {
  const { t } = useTranslation('auth');
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    if (!showConfirm) {
      setShowConfirm(true);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await apiClient.post<ApiResponse<null>>(`/admin/users/${userId}/reset-password`, {
        newPassword,
      });
      setSuccessMessage(t('admin.resetSuccess', { name: userName }));
      setTimeout(() => {
        setNewPassword('');
        setShowConfirm(false);
        setSuccessMessage(null);
        onSuccess();
        onClose();
      }, 1500);
    } catch (err) {
      const axiosError = err as AxiosError<ApiResponse<null>>;
      setError(axiosError.response?.data?.error?.message ?? '오류가 발생했습니다');
      setShowConfirm(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setNewPassword('');
    setShowPassword(false);
    setError(null);
    setShowConfirm(false);
    setSuccessMessage(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/50" onClick={handleClose} />

      {/* Modal card */}
      <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6 w-full max-w-[400px] mx-4">
        {/* Close button */}
        <button
          type="button"
          onClick={handleClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          aria-label="닫기"
        >
          <X className="w-5 h-5" />
        </button>

        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-50 mb-4">
          {t('admin.resetPassword')}
        </h2>

        {/* Success message */}
        {successMessage && (
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 mb-4">
            <p className="text-sm text-green-700 dark:text-green-400">{successMessage}</p>
          </div>
        )}

        {/* Confirmation dialog */}
        {showConfirm && !successMessage && (
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 mb-4">
            <p className="text-sm text-amber-700 dark:text-amber-400">
              {t('admin.resetConfirm')}
            </p>
          </div>
        )}

        {!successMessage && (
          <>
            {/* Password input */}
            <div>
              <label
                htmlFor="tempPassword"
                className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1"
              >
                {t('admin.tempPassword')}
              </label>
              <div className="relative">
                <input
                  id="tempPassword"
                  type={showPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full h-11 px-4 pr-12 text-base border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-50 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? '\uBE44\uBC00\uBC88\uD638 \uC228\uAE30\uAE30' : '\uBE44\uBC00\uBC88\uD638 \uD45C\uC2DC'}
                  className="absolute right-0 top-0 h-11 w-11 flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <p className="text-sm text-red-600 dark:text-red-400 mt-2">{error}</p>
            )}

            {/* Action buttons */}
            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={handleClose}
                className="flex-1 h-11 text-base font-semibold rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                {showConfirm ? '\uCDE8\uC18C' : '\uB2EB\uAE30'}
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isLoading || newPassword.length === 0}
                className={`flex-1 h-11 text-base font-semibold rounded-lg transition-colors duration-150 flex items-center justify-center ${
                  isLoading || newPassword.length === 0
                    ? 'bg-blue-300 text-white cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : showConfirm ? (
                  '\uD655\uC778'
                ) : (
                  t('admin.resetPassword')
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

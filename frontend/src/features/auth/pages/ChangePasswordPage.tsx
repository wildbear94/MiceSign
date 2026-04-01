import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import AuthLayout from '../../../layouts/AuthLayout';
import { useAuthStore } from '../../../stores/authStore';
import { passwordChangeSchema } from '../schemas/passwordSchema';
import type { PasswordChangeFormData } from '../schemas/passwordSchema';
import { usePasswordChange } from '../hooks/usePasswordChange';
import PasswordStrengthBar from '../components/PasswordStrengthBar';
import PasswordRequirements from '../components/PasswordRequirements';

export default function ChangePasswordPage() {
  const { t } = useTranslation('auth');
  const user = useAuthStore((state) => state.user);
  const { changePassword, isLoading, isSuccess } = usePasswordChange();

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<PasswordChangeFormData>({
    resolver: zodResolver(passwordChangeSchema),
    mode: 'onBlur',
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  });

  const newPasswordValue = watch('newPassword');

  const onSubmit = async (data: PasswordChangeFormData) => {
    setServerError(null);
    const error = await changePassword(data);
    if (error) {
      setServerError(error);
    }
  };

  return (
    <AuthLayout>
      {/* Card heading */}
      <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-50 text-center mb-6">
        {t('passwordChange.title')}
      </h1>

      {/* Force change notice (D-30) */}
      {user?.mustChangePassword && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-4">
          <p className="text-sm text-blue-700 dark:text-blue-400">
            {t('passwordChange.forceChange')}
          </p>
        </div>
      )}

      {/* Success banner (D-35) */}
      {isSuccess && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 mb-4 animate-fade-in">
          <p className="text-sm text-green-700 dark:text-green-400">
            {t('passwordChange.success')}
          </p>
        </div>
      )}

      {!isSuccess && (
        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          {/* Current password field */}
          <div>
            <label
              htmlFor="currentPassword"
              className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1"
            >
              {t('passwordChange.currentPassword')}
            </label>
            <div className="relative">
              <input
                id="currentPassword"
                type={showCurrentPassword ? 'text' : 'password'}
                autoFocus
                autoComplete="current-password"
                aria-describedby={errors.currentPassword ? 'currentPassword-error' : undefined}
                className={`w-full h-11 px-4 pr-12 text-base border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-50 placeholder-gray-400 focus:outline-none focus:ring-2 focus:border-transparent transition-colors ${
                  errors.currentPassword || serverError === 'passwordChange.wrongCurrent'
                    ? 'border-red-500 focus:ring-red-500'
                    : 'border-gray-300 dark:border-gray-600 focus:ring-blue-600'
                }`}
                {...register('currentPassword')}
              />
              <button
                type="button"
                onClick={() => setShowCurrentPassword((prev) => !prev)}
                aria-label={showCurrentPassword ? '\uBE44\uBC00\uBC88\uD638 \uC228\uAE30\uAE30' : '\uBE44\uBC00\uBC88\uD638 \uD45C\uC2DC'}
                className="absolute right-0 top-0 h-11 w-11 flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              >
                {showCurrentPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            {errors.currentPassword && (
              <p id="currentPassword-error" className="text-sm text-red-600 dark:text-red-400 mt-1">
                {t(errors.currentPassword.message ?? '')}
              </p>
            )}
            {serverError === 'passwordChange.wrongCurrent' && !errors.currentPassword && (
              <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                {t('passwordChange.wrongCurrent')}
              </p>
            )}
          </div>

          {/* New password field */}
          <div className="mt-4">
            <label
              htmlFor="newPassword"
              className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1"
            >
              {t('passwordChange.newPassword')}
            </label>
            <div className="relative">
              <input
                id="newPassword"
                type={showNewPassword ? 'text' : 'password'}
                autoComplete="new-password"
                aria-describedby={errors.newPassword ? 'newPassword-error' : undefined}
                className={`w-full h-11 px-4 pr-12 text-base border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-50 placeholder-gray-400 focus:outline-none focus:ring-2 focus:border-transparent transition-colors ${
                  errors.newPassword
                    ? 'border-red-500 focus:ring-red-500'
                    : 'border-gray-300 dark:border-gray-600 focus:ring-blue-600'
                }`}
                {...register('newPassword')}
              />
              <button
                type="button"
                onClick={() => setShowNewPassword((prev) => !prev)}
                aria-label={showNewPassword ? '\uBE44\uBC00\uBC88\uD638 \uC228\uAE30\uAE30' : '\uBE44\uBC00\uBC88\uD638 \uD45C\uC2DC'}
                className="absolute right-0 top-0 h-11 w-11 flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              >
                {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            {errors.newPassword && (
              <p id="newPassword-error" className="text-sm text-red-600 dark:text-red-400 mt-1">
                {t(errors.newPassword.message ?? '')}
              </p>
            )}
            {serverError === 'passwordChange.ruleNotMet' && !errors.newPassword && (
              <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                {t('passwordChange.ruleNotMet')}
              </p>
            )}

            {/* Password strength bar */}
            <PasswordStrengthBar password={newPasswordValue ?? ''} />

            {/* Password requirements checklist */}
            <PasswordRequirements password={newPasswordValue ?? ''} />
          </div>

          {/* Confirm password field */}
          <div className="mt-4">
            <label
              htmlFor="confirmPassword"
              className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1"
            >
              {t('passwordChange.confirmPassword')}
            </label>
            <div className="relative">
              <input
                id="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                autoComplete="new-password"
                aria-describedby={errors.confirmPassword ? 'confirmPassword-error' : undefined}
                className={`w-full h-11 px-4 pr-12 text-base border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-50 placeholder-gray-400 focus:outline-none focus:ring-2 focus:border-transparent transition-colors ${
                  errors.confirmPassword
                    ? 'border-red-500 focus:ring-red-500'
                    : 'border-gray-300 dark:border-gray-600 focus:ring-blue-600'
                }`}
                {...register('confirmPassword')}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword((prev) => !prev)}
                aria-label={showConfirmPassword ? '\uBE44\uBC00\uBC88\uD638 \uC228\uAE30\uAE30' : '\uBE44\uBC00\uBC88\uD638 \uD45C\uC2DC'}
                className="absolute right-0 top-0 h-11 w-11 flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              >
                {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            {errors.confirmPassword && (
              <p id="confirmPassword-error" className="text-sm text-red-600 dark:text-red-400 mt-1">
                {t(errors.confirmPassword.message ?? '')}
              </p>
            )}
          </div>

          {/* Submit button */}
          <button
            type="submit"
            disabled={isLoading}
            aria-disabled={isLoading}
            className={`mt-6 w-full h-11 text-base font-semibold rounded-lg transition-colors duration-150 flex items-center justify-center ${
              isLoading
                ? 'bg-blue-300 text-white cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                {t('passwordChange.loading')}
              </>
            ) : (
              t('passwordChange.button')
            )}
          </button>
        </form>
      )}
    </AuthLayout>
  );
}

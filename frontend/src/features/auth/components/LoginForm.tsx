import { useState, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { loginSchema } from '../schemas/loginSchema';
import type { LoginFormData } from '../schemas/loginSchema';
import { useLogin } from '../hooks/useAuth';
import type { AuthError } from '../hooks/useAuth';
import AuthErrorBanner from './AuthErrorBanner';

export default function LoginForm() {
  const { t } = useTranslation('auth');
  const { login } = useLogin();
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [authError, setAuthError] = useState<AuthError | null>(null);
  const [isLockedOut, setIsLockedOut] = useState(false);
  const [lockoutCountdown, setLockoutCountdown] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    mode: 'onBlur',
    defaultValues: {
      email: '',
      password: '',
      rememberMe: false,
    },
  });

  const onSubmit = useCallback(
    async (data: LoginFormData) => {
      setIsSubmitting(true);
      setAuthError(null);

      const error = await login({
        email: data.email,
        password: data.password,
        rememberMe: data.rememberMe,
      });

      setIsSubmitting(false);

      if (error) {
        setAuthError(error);
        if (error.type === 'locked') {
          setIsLockedOut(true);
        }
      }
    },
    [login],
  );

  const handleLockoutExpired = useCallback(() => {
    setAuthError(null);
    setIsLockedOut(false);
    setLockoutCountdown(null);
  }, []);

  // Compute lockout countdown for button text
  const getLockoutButtonText = useCallback(() => {
    if (!isLockedOut || !authError?.lockedUntil) return null;
    const diff = Math.max(
      0,
      Math.ceil((new Date(authError.lockedUntil).getTime() - Date.now()) / 1000),
    );
    const mm = String(Math.floor(diff / 60)).padStart(2, '0');
    const ss = String(diff % 60).padStart(2, '0');
    return `${mm}:${ss}`;
  }, [isLockedOut, authError?.lockedUntil]);

  // Update lockout button text via interval
  useState(() => {
    if (!isLockedOut || !authError?.lockedUntil) return;
    const interval = setInterval(() => {
      const text = getLockoutButtonText();
      setLockoutCountdown(text);
      if (text === '00:00') {
        clearInterval(interval);
        handleLockoutExpired();
      }
    }, 1000);
    return () => clearInterval(interval);
  });

  const isDisabled = isSubmitting || isLockedOut;

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      {/* Email field */}
      <div>
        <label
          htmlFor="email"
          className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1"
        >
          {t('login.emailLabel')}
        </label>
        <input
          id="email"
          type="email"
          autoFocus
          autoComplete="email"
          placeholder={t('login.emailPlaceholder')}
          aria-describedby={errors.email ? 'email-error' : undefined}
          className={`w-full h-11 px-4 text-base border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-50 placeholder-gray-400 focus:outline-none focus:ring-2 focus:border-transparent transition-colors ${
            errors.email
              ? 'border-red-500 focus:ring-red-500'
              : 'border-gray-300 dark:border-gray-600 focus:ring-blue-600'
          }`}
          {...register('email')}
        />
        {errors.email && (
          <p id="email-error" className="text-sm text-red-600 dark:text-red-400 mt-1">
            {t(errors.email.message ?? '')}
          </p>
        )}
      </div>

      {/* Password field */}
      <div className="mt-4">
        <label
          htmlFor="password"
          className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1"
        >
          {t('login.passwordLabel')}
        </label>
        <div className="relative">
          <input
            id="password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="current-password"
            aria-describedby={errors.password ? 'password-error' : undefined}
            className={`w-full h-11 px-4 pr-12 text-base border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-50 placeholder-gray-400 focus:outline-none focus:ring-2 focus:border-transparent transition-colors ${
              errors.password
                ? 'border-red-500 focus:ring-red-500'
                : 'border-gray-300 dark:border-gray-600 focus:ring-blue-600'
            }`}
            {...register('password')}
          />
          <button
            type="button"
            onClick={() => setShowPassword((prev) => !prev)}
            aria-label={showPassword ? '비밀번호 숨기기' : '비밀번호 표시'}
            className="absolute right-0 top-0 h-11 w-11 flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            {showPassword ? (
              <EyeOff className="w-5 h-5" />
            ) : (
              <Eye className="w-5 h-5" />
            )}
          </button>
        </div>
        {errors.password && (
          <p id="password-error" className="text-sm text-red-600 dark:text-red-400 mt-1">
            {t(errors.password.message ?? '')}
          </p>
        )}
      </div>

      {/* Remember me checkbox */}
      <div className="mt-4 flex items-center gap-2">
        <input
          id="rememberMe"
          type="checkbox"
          className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-600"
          {...register('rememberMe')}
        />
        <label htmlFor="rememberMe" className="text-sm text-gray-600 dark:text-gray-400">
          {t('login.rememberMe')}
        </label>
      </div>

      {/* Auth error banner */}
      {authError && (authError.type === 'credentials' || authError.type === 'locked') && (
        <div className="mt-4">
          <AuthErrorBanner
            type={authError.type}
            remainingAttempts={authError.remainingAttempts}
            lockedUntil={authError.lockedUntil}
            onLockoutExpired={handleLockoutExpired}
          />
        </div>
      )}

      {/* Login button */}
      <button
        type="submit"
        disabled={isDisabled}
        aria-disabled={isDisabled}
        className={`mt-6 w-full h-11 text-base font-semibold rounded-lg transition-colors duration-150 flex items-center justify-center ${
          isLockedOut
            ? 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
            : isSubmitting
              ? 'bg-blue-300 text-white cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700 text-white'
        }`}
      >
        {isLockedOut && lockoutCountdown ? (
          lockoutCountdown
        ) : isSubmitting ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
            {t('login.loading')}
          </>
        ) : (
          t('login.button')
        )}
      </button>
    </form>
  );
}

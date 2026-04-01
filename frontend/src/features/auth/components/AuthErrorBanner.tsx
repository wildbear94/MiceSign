import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertCircle, Lock } from 'lucide-react';

interface AuthErrorBannerProps {
  type: 'credentials' | 'locked';
  remainingAttempts?: number;
  lockedUntil?: string;
  onLockoutExpired?: () => void;
}

function formatCountdown(totalSeconds: number): { mm: string; ss: string } {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return {
    mm: String(minutes).padStart(2, '0'),
    ss: String(seconds).padStart(2, '0'),
  };
}

export default function AuthErrorBanner({
  type,
  remainingAttempts,
  lockedUntil,
  onLockoutExpired,
}: AuthErrorBannerProps) {
  const { t } = useTranslation('auth');
  const [secondsLeft, setSecondsLeft] = useState<number>(0);

  // Countdown timer for lockout
  useEffect(() => {
    if (type !== 'locked' || !lockedUntil) return;

    const computeRemaining = () => {
      const diff = Math.max(0, Math.ceil((new Date(lockedUntil).getTime() - Date.now()) / 1000));
      return diff;
    };

    setSecondsLeft(computeRemaining());

    const interval = setInterval(() => {
      const remaining = computeRemaining();
      setSecondsLeft(remaining);

      if (remaining <= 0) {
        clearInterval(interval);
        onLockoutExpired?.();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [type, lockedUntil, onLockoutExpired]);

  if (type === 'locked') {
    const { mm, ss } = formatCountdown(secondsLeft);

    return (
      <div
        role="alert"
        aria-live="polite"
        className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 transition-opacity duration-200 ease-out"
      >
        <div className="flex items-start gap-2">
          <Lock className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
          <p className="text-sm text-amber-700 dark:text-amber-400">
            {t('error.accountLocked', { mm, ss })}
          </p>
        </div>
      </div>
    );
  }

  // Credentials error
  return (
    <div
      role="alert"
      className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 transition-opacity duration-200 ease-out"
    >
      <div className="flex items-start gap-2">
        <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />
        <div className="text-sm text-red-700 dark:text-red-400">
          <p>{t('error.invalidCredentials')}</p>
          {remainingAttempts !== undefined && (
            <p className="mt-1">
              {t('error.remainingAttempts', { n: remainingAttempts })}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

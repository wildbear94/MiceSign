import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

interface PasswordStrengthBarProps {
  password: string;
}

type Strength = 'weak' | 'medium' | 'strong';

function calculateStrength(password: string): Strength {
  if (password.length === 0) return 'weak';

  const categories = [
    /[A-Z]/.test(password),
    /[a-z]/.test(password),
    /[0-9]/.test(password),
    /[!@#$%^&*()_+\-=\[\]{}|;:'",.<>?/~`]/.test(password),
  ].filter(Boolean).length;

  if (password.length < 8 || categories === 0) return 'weak';
  if (categories <= 2) return 'medium';
  return 'strong';
}

const strengthConfig: Record<Strength, { width: string; bg: string; text: string }> = {
  weak: { width: 'w-1/3', bg: 'bg-red-500', text: 'text-red-500' },
  medium: { width: 'w-2/3', bg: 'bg-amber-500', text: 'text-amber-500' },
  strong: { width: 'w-full', bg: 'bg-green-500', text: 'text-green-500' },
};

export default function PasswordStrengthBar({ password }: PasswordStrengthBarProps) {
  const { t } = useTranslation('auth');
  const strength = useMemo(() => calculateStrength(password), [password]);
  const config = strengthConfig[strength];

  if (password.length === 0) return null;

  return (
    <div className="mt-2">
      {/* Strength bar track */}
      <div className="h-1 w-full bg-gray-200 dark:bg-gray-600 rounded-sm overflow-hidden">
        <div
          className={`h-full rounded-sm transition-all duration-300 ease-in-out ${config.width} ${config.bg}`}
        />
      </div>
      {/* Strength label */}
      <p className={`text-sm mt-1 ${config.text}`}>
        {t(`strength.${strength}`)}
      </p>
    </div>
  );
}

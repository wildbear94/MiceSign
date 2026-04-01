import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, X } from 'lucide-react';

interface PasswordRequirementsProps {
  password: string;
}

interface Requirement {
  key: string;
  test: (password: string) => boolean;
}

const requirements: Requirement[] = [
  { key: 'requirements.minLength', test: (p) => p.length >= 8 },
  { key: 'requirements.uppercase', test: (p) => /[A-Z]/.test(p) },
  { key: 'requirements.lowercase', test: (p) => /[a-z]/.test(p) },
  { key: 'requirements.number', test: (p) => /[0-9]/.test(p) },
  { key: 'requirements.special', test: (p) => /[!@#$%^&*()_+\-=\[\]{}|;:'",.<>?/~`]/.test(p) },
];

export default function PasswordRequirements({ password }: PasswordRequirementsProps) {
  const { t } = useTranslation('auth');

  const results = useMemo(
    () => requirements.map((req) => ({ ...req, met: req.test(password) })),
    [password],
  );

  if (password.length === 0) return null;

  return (
    <ul className="mt-2 space-y-1">
      {results.map((req) => (
        <li
          key={req.key}
          className={`flex items-center gap-1.5 text-sm ${
            req.met ? 'text-green-600' : 'text-gray-400'
          }`}
        >
          {req.met ? (
            <Check className="w-3.5 h-3.5 flex-shrink-0" />
          ) : (
            <X className="w-3.5 h-3.5 flex-shrink-0" />
          )}
          <span>{t(req.key)}</span>
        </li>
      ))}
    </ul>
  );
}

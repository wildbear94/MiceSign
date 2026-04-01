import { useTranslation } from 'react-i18next';
import AuthLayout from '../../../layouts/AuthLayout';
import LoginForm from '../components/LoginForm';

export default function LoginPage() {
  const { t } = useTranslation('common');

  return (
    <AuthLayout>
      {/* Logo area */}
      <div className="text-center mb-8">
        <h1 className="text-2xl font-semibold leading-tight text-gray-900 dark:text-gray-50">
          {t('app.name')}
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          {t('app.subtitle')}
        </p>
      </div>

      {/* Login form */}
      <LoginForm />
    </AuthLayout>
  );
}

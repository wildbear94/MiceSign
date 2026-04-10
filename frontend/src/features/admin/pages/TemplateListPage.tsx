import { useTranslation } from 'react-i18next';
import { useTemplateList } from '../hooks/useTemplates';
import TemplateTable from '../components/TemplateTable';

export default function TemplateListPage() {
  const { t } = useTranslation('admin');
  const { data: templates, isLoading } = useTemplateList();

  return (
    <div>
      <h1 className="text-2xl font-semibold leading-tight text-gray-900 dark:text-gray-50 mb-6">
        {t('templates.title')}
      </h1>
      <TemplateTable templates={templates ?? []} isLoading={isLoading} />
    </div>
  );
}

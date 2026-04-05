import { useTranslation } from 'react-i18next';

interface TemplateBadgeProps {
  templateCode: string;
}

const TEMPLATE_CLASSES: Record<string, string> = {
  GENERAL: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  EXPENSE: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  LEAVE: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400',
};

export default function TemplateBadge({ templateCode }: TemplateBadgeProps) {
  const { t } = useTranslation('document');

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
        TEMPLATE_CLASSES[templateCode] ?? 'bg-gray-100 text-gray-700'
      }`}
    >
      {t(`template.${templateCode}`)}
    </span>
  );
}

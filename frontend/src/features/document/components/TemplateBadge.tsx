import { useTranslation } from 'react-i18next';

interface TemplateBadgeProps {
  templateCode: string;
}

const TEMPLATE_CLASSES: Record<string, string> = {
  GENERAL: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  EXPENSE: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  LEAVE: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400',
  PURCHASE: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  BUSINESS_TRIP: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400',
  OVERTIME: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400',
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

interface TemplateBadgeProps {
  code: string;
  name?: string;
}

const TEMPLATE_CLASSES: Record<string, string> = {
  GENERAL: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  EXPENSE: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  LEAVE: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  PURCHASE: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  BUSINESS_TRIP: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400',
  OVERTIME: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400',
};

const TEMPLATE_LABELS: Record<string, string> = {
  GENERAL: '일반',
  EXPENSE: '지출',
  LEAVE: '휴가',
  PURCHASE: '구매',
  BUSINESS_TRIP: '출장',
  OVERTIME: '야근',
};

export default function TemplateBadge({ code, name }: TemplateBadgeProps) {
  const label = name ?? TEMPLATE_LABELS[code] ?? code;

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
        TEMPLATE_CLASSES[code] ?? 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
      }`}
    >
      {label}
    </span>
  );
}

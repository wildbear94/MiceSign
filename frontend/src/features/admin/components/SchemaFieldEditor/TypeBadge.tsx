import { useTranslation } from 'react-i18next';
import type { SchemaFieldType } from './types';
import { FIELD_TYPE_META, FALLBACK_TYPE_META } from './constants';

export function TypeBadge({ type }: { type: SchemaFieldType }) {
  const { t } = useTranslation('admin');
  const meta = FIELD_TYPE_META[type] || FALLBACK_TYPE_META;
  const Icon = meta.icon;
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full ${meta.bgColor} ${meta.color}`}
    >
      <Icon className="w-3 h-3" />
      {t(`templates.fieldTypes.${type}`)}
    </span>
  );
}

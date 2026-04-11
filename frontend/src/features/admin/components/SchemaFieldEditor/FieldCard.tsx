import { useState } from 'react';
import { ChevronRight, ChevronUp, ChevronDown, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { SchemaField } from './types';
import { INPUT_CLASS } from './constants';
import { toFieldId } from './utils';
import { TypeBadge } from './TypeBadge';
import { FieldConfigEditor } from './FieldConfigEditor';

export function FieldCard({
  field,
  index,
  total,
  expanded,
  onToggle,
  onUpdate,
  onMove,
  onDelete,
}: {
  field: SchemaField;
  index: number;
  total: number;
  expanded: boolean;
  onToggle: () => void;
  onUpdate: (updated: SchemaField) => void;
  onMove: (direction: 'up' | 'down') => void;
  onDelete: () => void;
}) {
  const { t } = useTranslation('admin');
  const [labelEdited, setLabelEdited] = useState(false);

  const handleLabelChange = (newLabel: string) => {
    const updated = { ...field, label: newLabel };
    // Auto-generate ID from label on first edit only
    if (!labelEdited && newLabel.trim()) {
      updated.id = toFieldId(newLabel);
    }
    if (newLabel.trim()) {
      setLabelEdited(true);
    }
    onUpdate(updated);
  };

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg hover:border-gray-300 dark:hover:border-gray-600 transition-colors">
      {/* Collapsed header */}
      <div
        className="flex items-center gap-3 px-4 py-3 cursor-pointer select-none"
        onClick={onToggle}
      >
        <ChevronRight
          className={`w-4 h-4 text-gray-400 transition-transform ${expanded ? 'rotate-90' : ''}`}
        />
        <TypeBadge type={field.type} />
        <span className="text-sm font-medium text-gray-900 dark:text-gray-50 truncate flex-1">
          {field.label || (
            <span className="text-gray-400 dark:text-gray-500 italic">
              {t('templates.fieldLabel')}
            </span>
          )}
        </span>
        {field.required && (
          <span className="text-red-500 text-sm font-bold" title={t('templates.fieldRequired')}>
            *
          </span>
        )}
        {/* Action buttons */}
        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            disabled={index === 0}
            onClick={() => onMove('up')}
            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-30 disabled:cursor-not-allowed rounded transition-colors"
            title="위로 이동"
          >
            <ChevronUp className="w-4 h-4" />
          </button>
          <button
            type="button"
            disabled={index === total - 1}
            onClick={() => onMove('down')}
            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-30 disabled:cursor-not-allowed rounded transition-colors"
            title="아래로 이동"
          >
            <ChevronDown className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="p-1 text-gray-400 hover:text-red-600 dark:hover:text-red-400 rounded transition-colors"
            title={t('templates.removeField')}
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Expanded editor */}
      {expanded && (
        <div className="px-4 pb-4 pt-1 border-t border-gray-100 dark:border-gray-700 space-y-3">
          {/* Label + ID row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                {t('templates.fieldLabel')}
              </label>
              <input
                type="text"
                value={field.label}
                onChange={(e) => handleLabelChange(e.target.value)}
                className={INPUT_CLASS}
                placeholder={t('templates.fieldLabel')}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                {t('templates.fieldId')}
              </label>
              <input
                type="text"
                value={field.id}
                onChange={(e) => onUpdate({ ...field, id: e.target.value })}
                className={INPUT_CLASS}
                placeholder={t('templates.fieldId')}
              />
            </div>
          </div>

          {/* Required checkbox */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={field.required}
              onChange={(e) => onUpdate({ ...field, required: e.target.checked })}
              className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-600"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">
              {t('templates.fieldRequired')}
            </span>
          </label>

          {/* Type-specific config */}
          <FieldConfigEditor
            field={field}
            onConfigChange={(config) => onUpdate({ ...field, config })}
          />
        </div>
      )}
    </div>
  );
}

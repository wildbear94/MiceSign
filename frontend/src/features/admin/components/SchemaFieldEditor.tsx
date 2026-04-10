import { useState, useRef, useEffect } from 'react';
import {
  Type,
  AlignLeft,
  Hash,
  Calendar,
  List,
  FileText,
  EyeOff,
  ChevronUp,
  ChevronDown,
  Trash2,
  Plus,
  ChevronRight,
  Table,
  HelpCircle,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

// --- Types ---

export type SchemaFieldType =
  | 'text'
  | 'textarea'
  | 'number'
  | 'date'
  | 'select'
  | 'staticText'
  | 'hidden'
  | 'table';

export interface SchemaFieldConfig {
  placeholder?: string;
  maxLength?: number;
  min?: number;
  max?: number;
  unit?: string;
  options?: { value: string; label: string }[];
  content?: string;
  defaultValue?: string;
  width?: string;
}

export interface SchemaField {
  id: string;
  type: SchemaFieldType;
  label: string;
  required: boolean;
  config: SchemaFieldConfig;
}

interface SchemaFieldEditorProps {
  fields: SchemaField[];
  onChange: (fields: SchemaField[]) => void;
}

// --- Constants ---

const FIELD_TYPE_META: Record<
  SchemaFieldType,
  { icon: React.ElementType; color: string; bgColor: string }
> = {
  text: { icon: Type, color: 'text-blue-700 dark:text-blue-300', bgColor: 'bg-blue-100 dark:bg-blue-900/40' },
  textarea: { icon: AlignLeft, color: 'text-indigo-700 dark:text-indigo-300', bgColor: 'bg-indigo-100 dark:bg-indigo-900/40' },
  number: { icon: Hash, color: 'text-green-700 dark:text-green-300', bgColor: 'bg-green-100 dark:bg-green-900/40' },
  date: { icon: Calendar, color: 'text-orange-700 dark:text-orange-300', bgColor: 'bg-orange-100 dark:bg-orange-900/40' },
  select: { icon: List, color: 'text-purple-700 dark:text-purple-300', bgColor: 'bg-purple-100 dark:bg-purple-900/40' },
  staticText: { icon: FileText, color: 'text-gray-700 dark:text-gray-300', bgColor: 'bg-gray-100 dark:bg-gray-700' },
  hidden: { icon: EyeOff, color: 'text-rose-700 dark:text-rose-300', bgColor: 'bg-rose-100 dark:bg-rose-900/40' },
  table: { icon: Table, color: 'text-teal-700 dark:text-teal-300', bgColor: 'bg-teal-100 dark:bg-teal-900/40' },
};

const FALLBACK_TYPE_META = { icon: HelpCircle, color: 'text-gray-700 dark:text-gray-300', bgColor: 'bg-gray-100 dark:bg-gray-700' };

const FIELD_TYPES: SchemaFieldType[] = [
  'text',
  'textarea',
  'number',
  'date',
  'select',
  'staticText',
  'hidden',
];

// --- Helpers ---

function toFieldId(label: string): string {
  return label
    .trim()
    .replace(/[^a-zA-Z0-9가-힣\s]/g, '')
    .replace(/\s+(.)/g, (_, c: string) => c.toUpperCase())
    .replace(/\s/g, '')
    .replace(/^(.)/, (_, c: string) => c.toLowerCase());
}

// --- Sub-components ---

function TypeBadge({ type }: { type: SchemaFieldType }) {
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

const INPUT_CLASS =
  'w-full h-11 px-4 text-sm border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-50 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-colors border-gray-300 dark:border-gray-600';

const SMALL_INPUT_CLASS =
  'w-full h-9 px-3 text-sm border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-50 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-colors border-gray-300 dark:border-gray-600';

function FieldConfigEditor({
  field,
  onConfigChange,
}: {
  field: SchemaField;
  onConfigChange: (config: SchemaFieldConfig) => void;
}) {
  const { t } = useTranslation('admin');
  const config = field.config;

  const updateConfig = (partial: Partial<SchemaFieldConfig>) => {
    onConfigChange({ ...config, ...partial });
  };

  switch (field.type) {
    case 'text':
    case 'textarea':
      return (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
              {t('templates.fieldPlaceholder')}
            </label>
            <input
              type="text"
              value={config.placeholder || ''}
              onChange={(e) => updateConfig({ placeholder: e.target.value })}
              className={SMALL_INPUT_CLASS}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
              {t('templates.fieldMaxLength')}
            </label>
            <input
              type="number"
              value={config.maxLength ?? ''}
              onChange={(e) =>
                updateConfig({
                  maxLength: e.target.value ? parseInt(e.target.value, 10) : undefined,
                })
              }
              className={SMALL_INPUT_CLASS}
              min={0}
            />
          </div>
        </div>
      );

    case 'number':
      return (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
              {t('templates.fieldMin')}
            </label>
            <input
              type="number"
              value={config.min ?? ''}
              onChange={(e) =>
                updateConfig({
                  min: e.target.value ? parseFloat(e.target.value) : undefined,
                })
              }
              className={SMALL_INPUT_CLASS}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
              {t('templates.fieldMax')}
            </label>
            <input
              type="number"
              value={config.max ?? ''}
              onChange={(e) =>
                updateConfig({
                  max: e.target.value ? parseFloat(e.target.value) : undefined,
                })
              }
              className={SMALL_INPUT_CLASS}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
              {t('templates.fieldUnit')}
            </label>
            <input
              type="text"
              value={config.unit || ''}
              onChange={(e) => updateConfig({ unit: e.target.value })}
              className={SMALL_INPUT_CLASS}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
              {t('templates.fieldPlaceholder')}
            </label>
            <input
              type="text"
              value={config.placeholder || ''}
              onChange={(e) => updateConfig({ placeholder: e.target.value })}
              className={SMALL_INPUT_CLASS}
            />
          </div>
        </div>
      );

    case 'date':
      return (
        <p className="text-sm text-gray-500 dark:text-gray-400 italic">
          {t('templates.noConfig')}
        </p>
      );

    case 'select': {
      const options = config.options || [];
      return (
        <div className="space-y-2">
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400">
            {t('templates.fieldOptions')}
          </label>
          {options.map((opt, idx) => (
            <div key={idx} className="flex gap-2 items-center">
              <input
                type="text"
                placeholder={t('templates.optionValue')}
                value={opt.value}
                onChange={(e) => {
                  const newOpts = [...options];
                  newOpts[idx] = { ...newOpts[idx], value: e.target.value };
                  updateConfig({ options: newOpts });
                }}
                className={SMALL_INPUT_CLASS}
              />
              <input
                type="text"
                placeholder={t('templates.optionLabel')}
                value={opt.label}
                onChange={(e) => {
                  const newOpts = [...options];
                  newOpts[idx] = { ...newOpts[idx], label: e.target.value };
                  updateConfig({ options: newOpts });
                }}
                className={SMALL_INPUT_CLASS}
              />
              <button
                type="button"
                onClick={() => {
                  const newOpts = options.filter((_, i) => i !== idx);
                  updateConfig({ options: newOpts });
                }}
                className="shrink-0 p-1.5 text-red-500 hover:text-red-700 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                title={t('templates.removeOption')}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() =>
              updateConfig({ options: [...options, { value: '', label: '' }] })
            }
            className="inline-flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            {t('templates.addOption')}
          </button>
        </div>
      );
    }

    case 'staticText':
      return (
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
            {t('templates.fieldContent')}
          </label>
          <textarea
            rows={3}
            value={config.content || ''}
            onChange={(e) => updateConfig({ content: e.target.value })}
            className={`w-full px-3 py-2 text-sm border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-50 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-colors resize-none border-gray-300 dark:border-gray-600`}
          />
        </div>
      );

    case 'hidden':
      return (
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
            {t('templates.fieldDefaultValue')}
          </label>
          <input
            type="text"
            value={config.defaultValue || ''}
            onChange={(e) => updateConfig({ defaultValue: e.target.value })}
            className={SMALL_INPUT_CLASS}
          />
        </div>
      );

    default:
      return null;
  }
}

// --- FieldCard ---

function FieldCard({
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
            title="Move up"
          >
            <ChevronUp className="w-4 h-4" />
          </button>
          <button
            type="button"
            disabled={index === total - 1}
            onClick={() => onMove('down')}
            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-30 disabled:cursor-not-allowed rounded transition-colors"
            title="Move down"
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

// --- Main Component ---

export default function SchemaFieldEditor({ fields, onChange }: SchemaFieldEditorProps) {
  const { t } = useTranslation('admin');
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    if (!dropdownOpen) return;
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [dropdownOpen]);

  const addField = (type: SchemaFieldType) => {
    const newField: SchemaField = {
      id: `field_${Date.now()}`,
      type,
      label: '',
      required: false,
      config: type === 'select' ? { options: [{ value: '', label: '' }] } : {},
    };
    const updated = [...fields, newField];
    onChange(updated);
    setExpandedIndex(updated.length - 1);
    setDropdownOpen(false);
  };

  const updateField = (index: number, updated: SchemaField) => {
    const newFields = [...fields];
    newFields[index] = updated;
    onChange(newFields);
  };

  const moveField = (index: number, direction: 'up' | 'down') => {
    const newFields = [...fields];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newFields.length) return;
    [newFields[index], newFields[targetIndex]] = [newFields[targetIndex], newFields[index]];
    onChange(newFields);
    setExpandedIndex(targetIndex);
  };

  const deleteField = (index: number) => {
    if (!window.confirm(t('templates.confirmRemoveField'))) return;
    const newFields = fields.filter((_, i) => i !== index);
    onChange(newFields);
    if (expandedIndex === index) {
      setExpandedIndex(null);
    } else if (expandedIndex !== null && expandedIndex > index) {
      setExpandedIndex(expandedIndex - 1);
    }
  };

  return (
    <div className="space-y-3">
      {/* Section header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
          {t('templates.schemaEditor')}
        </h3>
        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            {t('templates.addField')}
          </button>
          {dropdownOpen && (
            <div className="absolute right-0 top-full mt-1 z-10 w-56 border border-gray-200 dark:border-gray-700 shadow-lg rounded-lg bg-white dark:bg-gray-800 py-1">
              {FIELD_TYPES.map((type) => {
                const meta = FIELD_TYPE_META[type] || FALLBACK_TYPE_META;
                const Icon = meta.icon;
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => addField(type)}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    <Icon className={`w-4 h-4 ${meta.color}`} />
                    {t(`templates.fieldTypes.${type}`)}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Field list or empty state */}
      {fields.length === 0 ? (
        <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {t('templates.noFields')}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {fields.map((field, index) => (
            <FieldCard
              key={field.id}
              field={field}
              index={index}
              total={fields.length}
              expanded={expandedIndex === index}
              onToggle={() =>
                setExpandedIndex(expandedIndex === index ? null : index)
              }
              onUpdate={(updated) => updateField(index, updated)}
              onMove={(dir) => moveField(index, dir)}
              onDelete={() => deleteField(index)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

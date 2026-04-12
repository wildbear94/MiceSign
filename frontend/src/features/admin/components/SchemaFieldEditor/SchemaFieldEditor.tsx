import { useState, useRef, useEffect } from 'react';
import { Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import type { ConditionalRule } from '../../../document/types/dynamicForm';
import type { SchemaField, SchemaFieldType, SchemaFieldEditorProps } from './types';
import { FIELD_TYPE_META, FALLBACK_TYPE_META, FIELD_TYPES } from './constants';
import { FieldCard } from './FieldCard';
import { cleanupRulesForDeletedField, cleanupRulesForTypeChange } from './conditionalRuleUtils';

export default function SchemaFieldEditor({
  fields,
  onChange,
  conditionalRules = [],
  onConditionalRulesChange,
}: SchemaFieldEditorProps & {
  conditionalRules?: ConditionalRule[];
  onConditionalRulesChange?: (rules: ConditionalRule[]) => void;
}) {
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
    const oldField = fields[index];
    const newFields = [...fields];
    newFields[index] = updated;
    onChange(newFields);

    // D-25: Cleanup rules when field type changes
    if (oldField.type !== updated.type && onConditionalRulesChange) {
      const [cleanedRules, removedCount] = cleanupRulesForTypeChange(updated.id, updated.type, conditionalRules);
      if (removedCount > 0) {
        toast(t('templates.condition.rulesAutoRemoved', { count: removedCount }));
        onConditionalRulesChange(cleanedRules);
      }
    }
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
    const deletedFieldId = fields[index].id;
    const newFields = fields.filter((_, i) => i !== index);
    onChange(newFields);

    // D-21, D-22: Cleanup rules referencing the deleted field
    if (onConditionalRulesChange) {
      const [cleanedRules, removedCount] = cleanupRulesForDeletedField(deletedFieldId, conditionalRules);
      if (removedCount > 0) {
        toast(t('templates.condition.rulesAutoRemoved', { count: removedCount }));
      }
      onConditionalRulesChange(cleanedRules);
    }

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
              conditionalRules={conditionalRules}
              allFields={fields}
              onAddRule={(rule) => onConditionalRulesChange?.([...conditionalRules, rule])}
              onUpdateRule={(rule) => onConditionalRulesChange?.(
                conditionalRules.map(r => r.targetFieldId === rule.targetFieldId ? rule : r)
              )}
              onDeleteRule={(targetFieldId) => onConditionalRulesChange?.(
                conditionalRules.filter(r => r.targetFieldId !== targetFieldId)
              )}
            />
          ))}
        </div>
      )}
    </div>
  );
}

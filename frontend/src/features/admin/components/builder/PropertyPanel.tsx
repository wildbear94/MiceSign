import { useState, type Dispatch } from 'react';
import type { FieldDefinition } from '../../../document/types/dynamicForm';
import type { BuilderAction } from './useBuilderReducer';
import PropertyBasicTab from './PropertyBasicTab';
import PropertyValidationTab from './PropertyValidationTab';
import PropertyConditionsTab from './PropertyConditionsTab';

interface PropertyPanelProps {
  field: FieldDefinition;
  allFields: FieldDefinition[];
  dispatch: Dispatch<BuilderAction>;
}

const TABS = ['기본', '검증', '조건'] as const;
type TabName = (typeof TABS)[number];

export default function PropertyPanel({
  field,
  allFields,
  dispatch,
}: PropertyPanelProps) {
  const [activeTab, setActiveTab] = useState<TabName>('기본');

  function handleUpdate(updates: Partial<FieldDefinition>) {
    dispatch({ type: 'UPDATE_FIELD', fieldId: field.id, updates });
  }

  return (
    <div className="p-4">
      <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-50 mb-1">
        {field.label}
      </h3>
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
        {field.type} 필드 설정
      </p>

      {/* Tab bar */}
      <div className="flex border-b border-gray-200 dark:border-gray-700 mb-4">
        {TABS.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-2 text-xs font-medium border-b-2 transition-colors outline-none ${
              activeTab === tab
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === '기본' && (
        <PropertyBasicTab field={field} onUpdate={handleUpdate} />
      )}
      {activeTab === '검증' && (
        <PropertyValidationTab field={field} onUpdate={handleUpdate} />
      )}
      {activeTab === '조건' && (
        <PropertyConditionsTab
          field={field}
          allFields={allFields}
          onUpdate={handleUpdate}
        />
      )}
    </div>
  );
}

import { Tab, TabGroup, TabList, TabPanel, TabPanels } from '@headlessui/react';
import { useTranslation } from 'react-i18next';
import type {
  FieldDefinition,
  FieldConfig,
  TemplateSettings,
  BuilderAction,
} from '../../types/builder';
import type { ConditionalRule, CalculationRule } from '../../../document/types/dynamicForm';
import PropertyBasicTab from './PropertyBasicTab';
import PropertyValidationTab from './PropertyValidationTab';
import PropertyAdvancedTab from './PropertyAdvancedTab';
import PropertyConditionsTab from './PropertyConditionsTab';
import TemplateSettingsPanel from './TemplateSettingsPanel';
import SelectOptionsEditor from './SelectOptionsEditor';
import TableColumnsEditor from './TableColumnsEditor';

const FIELD_TYPE_BADGES: Record<string, string> = {
  text: 'text',
  textarea: 'textarea',
  number: 'number',
  date: 'date',
  select: 'select',
  table: 'table',
  staticText: 'static',
  hidden: 'hidden',
  section: 'section',
};

interface PropertyPanelProps {
  selectedField: FieldDefinition | null;
  allFields: FieldDefinition[];
  templateSettings: TemplateSettings;
  conditionalRules: ConditionalRule[];
  calculationRules: CalculationRule[];
  onUpdateField: (
    fieldId: string,
    changes: Partial<FieldDefinition>,
  ) => void;
  onUpdateFieldConfig: (
    fieldId: string,
    config: Partial<FieldConfig>,
  ) => void;
  onUpdateTemplateSettings: (changes: Partial<TemplateSettings>) => void;
  onDispatch: (action: BuilderAction) => void;
}

export default function PropertyPanel({
  selectedField,
  allFields,
  templateSettings,
  conditionalRules,
  calculationRules,
  onUpdateField,
  onUpdateFieldConfig,
  onUpdateTemplateSettings,
  onDispatch,
}: PropertyPanelProps) {
  const { t } = useTranslation('admin');

  if (selectedField === null) {
    return (
      <div className="p-4">
        <TemplateSettingsPanel
          settings={templateSettings}
          onUpdate={onUpdateTemplateSettings}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Field header */}
      <div className="px-4 pt-4 pb-2 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
            {FIELD_TYPE_BADGES[selectedField.type] ?? selectedField.type}
          </span>
          <span className="text-sm font-semibold text-gray-700 dark:text-gray-300 truncate">
            {selectedField.label}
          </span>
        </div>
      </div>

      {/* Tabs */}
      <TabGroup>
        <TabList className="flex border-b border-gray-200 dark:border-gray-700">
          <Tab
            className={({ selected }) =>
              `px-4 py-2 text-sm font-semibold border-b-2 outline-none ${
                selected
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
              }`
            }
          >
            {t('templates.tabBasic', '기본')}
          </Tab>
          <Tab
            className={({ selected }) =>
              `px-4 py-2 text-sm font-semibold border-b-2 outline-none ${
                selected
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
              }`
            }
          >
            {t('templates.tabValidation', '검증')}
          </Tab>
          <Tab
            className={({ selected }) =>
              `px-4 py-2 text-sm font-semibold border-b-2 outline-none ${
                selected
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
              }`
            }
          >
            {t('templates.tabAdvanced', '고급')}
          </Tab>
          <Tab
            className={({ selected }) =>
              `px-4 py-2 text-sm font-semibold border-b-2 outline-none ${
                selected
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
              }`
            }
          >
            {t('templates.tabConditions', '조건')}
          </Tab>
        </TabList>
        <TabPanels className="p-4 flex-1 overflow-y-auto">
          <TabPanel>
            <PropertyBasicTab
              field={selectedField}
              onUpdateField={onUpdateField}
              onUpdateFieldConfig={onUpdateFieldConfig}
            />
          </TabPanel>
          <TabPanel>
            <PropertyValidationTab
              field={selectedField}
              onUpdateFieldConfig={onUpdateFieldConfig}
            />
          </TabPanel>
          <TabPanel>
            <PropertyAdvancedTab
              field={selectedField}
              allFields={allFields}
              calculationRules={calculationRules}
              onUpdateFieldConfig={onUpdateFieldConfig}
              onDispatch={onDispatch}
            />
          </TabPanel>
          <TabPanel>
            <PropertyConditionsTab
              field={selectedField}
              allFields={allFields}
              conditionalRules={conditionalRules}
              onDispatch={onDispatch}
            />
          </TabPanel>
        </TabPanels>
      </TabGroup>

      {/* Type-specific editors below tabs */}
      {selectedField.type === 'select' && (
        <div className="px-4 pb-4 border-t border-gray-200 dark:border-gray-700 pt-4">
          <SelectOptionsEditor
            field={selectedField}
            onUpdateFieldConfig={onUpdateFieldConfig}
          />
        </div>
      )}

      {selectedField.type === 'table' && (
        <div className="px-4 pb-4 border-t border-gray-200 dark:border-gray-700 pt-4">
          <TableColumnsEditor
            field={selectedField}
            onUpdateFieldConfig={onUpdateFieldConfig}
          />
        </div>
      )}
    </div>
  );
}

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import { useTemplateList } from '../hooks/useTemplates';
import TemplateTable from '../components/TemplateTable';
import TemplateFormModal from '../components/TemplateFormModal';
import TemplateCreateChoiceModal from '../components/TemplateCreateChoiceModal';
import PresetGallery from '../components/PresetGallery';
import ImportTemplateModal from '../components/ImportTemplateModal';
import { templateApi, type TemplateListItem } from '../api/templateApi';
import { downloadTemplateJson } from '../utils/templateExport';
import type { TemplateImportData } from '../validations/templateImportSchema';
import type { SchemaField } from '../components/SchemaFieldEditor';
import type { ConditionalRule, CalculationRule } from '../../document/types/dynamicForm';

/**
 * Phase 26 Plan 02 — TemplateListPage state machine (D-16, D-17, CNV-01~04)
 *
 * Replaces the simple `showCreateModal` boolean with a createFlow state
 * machine that routes the "양식 추가" entry point through 3 options
 * (blank / preset / import) into a single TemplateFormModal instance with
 * `initialValues`. Row-level Copy/Download buttons also funnel into the
 * same form (duplicate) or trigger a direct browser download (export).
 */

type InitialValues = {
  name?: string;
  description?: string;
  prefix?: string;
  category?: string;
  icon?: string;
  schemaFields?: SchemaField[];
  conditionalRules?: ConditionalRule[];
  calculationRules?: CalculationRule[];
};

type CreateFlow =
  | { kind: 'closed' }
  | { kind: 'choice' }
  | { kind: 'preset' }
  | { kind: 'import' }
  | { kind: 'form'; initialValues: InitialValues | null };

/** Build initialValues from a validated TemplateImportData (preset/import). */
function importToInitialValues(parsed: TemplateImportData): InitialValues {
  return {
    name: parsed.name,
    description: parsed.description,
    prefix: '', // D-10: force fresh prefix
    category: parsed.category,
    icon: parsed.icon,
    schemaFields: (parsed.schemaDefinition.fields as SchemaField[]) ?? [],
    conditionalRules: (parsed.schemaDefinition.conditionalRules as ConditionalRule[]) ?? [],
    calculationRules: (parsed.schemaDefinition.calculationRules as CalculationRule[]) ?? [],
  };
}

export default function TemplateListPage() {
  const { t } = useTranslation('admin');
  const { data: templates, isLoading } = useTemplateList();

  const [createFlow, setCreateFlow] = useState<CreateFlow>({ kind: 'closed' });
  const [editingTemplate, setEditingTemplate] = useState<TemplateListItem | null>(null);

  const handleCloseCreateFlow = () => setCreateFlow({ kind: 'closed' });

  const handleSelectBlank = () => setCreateFlow({ kind: 'form', initialValues: null });
  const handleSelectPreset = () => setCreateFlow({ kind: 'preset' });
  const handleSelectImport = () => setCreateFlow({ kind: 'import' });

  const handlePresetSelected = (preset: TemplateImportData) => {
    setCreateFlow({ kind: 'form', initialValues: importToInitialValues(preset) });
  };

  const handleImportValid = (parsed: TemplateImportData) => {
    setCreateFlow({ kind: 'form', initialValues: importToInitialValues(parsed) });
  };

  const handleDuplicate = async (tpl: TemplateListItem) => {
    try {
      const response = await templateApi.getDetail(tpl.id);
      const detail = response.data.data!;
      const schema = detail.schemaDefinition
        ? JSON.parse(detail.schemaDefinition)
        : { fields: [], conditionalRules: [], calculationRules: [] };
      setCreateFlow({
        kind: 'form',
        initialValues: {
          name: `${detail.name}${t('templates.duplicateSuffix')}`,
          description: detail.description ?? '',
          prefix: '', // D-03: force fresh prefix
          category: detail.category ?? '',
          icon: detail.icon ?? '',
          schemaFields: schema.fields ?? [],
          conditionalRules: schema.conditionalRules ?? [],
          calculationRules: schema.calculationRules ?? [],
        },
      });
      toast.success(t('templates.duplicateReady'));
    } catch {
      toast.error(t('templates.duplicateFailure'));
    }
  };

  const handleExport = async (tpl: TemplateListItem) => {
    try {
      const response = await templateApi.getDetail(tpl.id);
      const detail = response.data.data!;
      downloadTemplateJson(detail);
      toast.success(t('templates.exportSuccess', { name: detail.name }));
    } catch {
      toast.error(t('templates.exportFailure'));
    }
  };

  const formOpen = createFlow.kind === 'form' || editingTemplate !== null;
  const formInitialValues = createFlow.kind === 'form' ? createFlow.initialValues : null;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold leading-tight text-gray-900 dark:text-gray-50">
          {t('templates.title')}
        </h1>
        <button
          type="button"
          onClick={() => setCreateFlow({ kind: 'choice' })}
          className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 h-11 flex items-center gap-1 text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          {t('templates.addTemplate')}
        </button>
      </div>

      <TemplateTable
        templates={templates ?? []}
        isLoading={isLoading}
        onEdit={(tpl) => setEditingTemplate(tpl)}
        onDuplicate={handleDuplicate}
        onExport={handleExport}
      />

      {/* Phase 26: choice router */}
      <TemplateCreateChoiceModal
        open={createFlow.kind === 'choice'}
        onClose={handleCloseCreateFlow}
        onSelectBlank={handleSelectBlank}
        onSelectPreset={handleSelectPreset}
        onSelectImport={handleSelectImport}
      />

      {/* Phase 26: preset gallery — Esc returns to choice step */}
      <PresetGallery
        open={createFlow.kind === 'preset'}
        onClose={() => setCreateFlow({ kind: 'choice' })}
        onSelect={handlePresetSelected}
      />

      {/* Phase 26: import — Esc returns to choice step */}
      <ImportTemplateModal
        open={createFlow.kind === 'import'}
        onClose={() => setCreateFlow({ kind: 'choice' })}
        onValid={handleImportValid}
      />

      {/* Create/Edit Modal — single instance shared across all entry points */}
      <TemplateFormModal
        open={formOpen}
        onClose={() => {
          handleCloseCreateFlow();
          setEditingTemplate(null);
        }}
        editingTemplate={editingTemplate}
        initialValues={formInitialValues}
        onSuccess={() => {
          handleCloseCreateFlow();
          setEditingTemplate(null);
        }}
      />
    </div>
  );
}

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus } from 'lucide-react';
import { useTemplateList } from '../hooks/useTemplates';
import TemplateTable from '../components/TemplateTable';
import TemplateFormModal from '../components/TemplateFormModal';
import type { TemplateListItem } from '../api/templateApi';

export default function TemplateListPage() {
  const { t } = useTranslation('admin');
  const { data: templates, isLoading } = useTemplateList();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<TemplateListItem | null>(null);

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold leading-tight text-gray-900 dark:text-gray-50">
          {t('templates.title')}
        </h1>
        <button
          type="button"
          onClick={() => setShowCreateModal(true)}
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
      />

      {/* Create/Edit Modal */}
      <TemplateFormModal
        open={showCreateModal || !!editingTemplate}
        onClose={() => {
          setShowCreateModal(false);
          setEditingTemplate(null);
        }}
        editingTemplate={editingTemplate}
      />
    </div>
  );
}

import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { Plus, Loader2, RefreshCw } from 'lucide-react';
import TemplateListTable from '../components/TemplateListTable';
import TemplateCreateModal from '../components/TemplateCreateModal';
import ConfirmDialog from '../components/ConfirmDialog';
import { useAdminTemplates, useDeactivateTemplate } from '../hooks/useAdminTemplates';
import type { AdminTemplateResponse } from '../types/builder';

export default function TemplateListPage() {
  const { t } = useTranslation('admin');
  const navigate = useNavigate();

  const { templates, isLoading, error, refetch } = useAdminTemplates();
  const deactivateMutation = useDeactivateTemplate();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [deactivateTarget, setDeactivateTarget] = useState<AdminTemplateResponse | null>(null);

  const handleCreated = (id: number) => {
    setIsCreateOpen(false);
    navigate(`/admin/templates/${id}/builder`);
  };

  const handleEdit = (id: number) => {
    navigate(`/admin/templates/${id}/builder`);
  };

  const handleDeactivate = (id: number) => {
    const target = templates.find((t) => t.id === id);
    if (target) {
      setDeactivateTarget(target);
    }
  };

  const confirmDeactivate = async () => {
    if (!deactivateTarget) return;
    try {
      await deactivateMutation.mutateAsync(deactivateTarget.id);
      setDeactivateTarget(null);
    } catch {
      // Error handled by mutation
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold leading-tight text-gray-900 dark:text-gray-50">
          {t('templates.title')}
        </h1>
        <button
          type="button"
          onClick={() => setIsCreateOpen(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          {t('templates.newTemplate')}
        </button>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
        </div>
      )}

      {/* Error state */}
      {error && !isLoading && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <p className="text-sm text-red-500 mb-4">
            {t('common.loadError', '데이터를 불러오는 중 오류가 발생했습니다.')}
          </p>
          <button
            type="button"
            onClick={() => refetch()}
            className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700"
          >
            <RefreshCw className="w-4 h-4" />
            {t('common.retry', '다시 시도')}
          </button>
        </div>
      )}

      {/* Template table */}
      {!isLoading && !error && (
        <TemplateListTable
          templates={templates}
          onEdit={handleEdit}
          onDeactivate={handleDeactivate}
        />
      )}

      {/* Create modal */}
      <TemplateCreateModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onCreated={handleCreated}
      />

      {/* Deactivate confirm dialog */}
      {deactivateTarget && (
        <ConfirmDialog
          open={true}
          onClose={() => setDeactivateTarget(null)}
          onConfirm={confirmDeactivate}
          title={t('templates.confirmDeactivate')}
          message={t('templates.confirmDeactivateDesc')}
          confirmLabel={t('templates.deactivate')}
          confirmVariant="danger"
          isLoading={deactivateMutation.isPending}
        />
      )}
    </div>
  );
}

import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router';
import { Plus, Loader2, FileText } from 'lucide-react';
import {
  useAdminTemplates,
  useCreateTemplate,
  useDeactivateTemplate,
} from '../hooks/useAdminTemplates';
import TemplateListTable from '../components/TemplateListTable';
import TemplateCreateModal from '../components/TemplateCreateModal';
import ConfirmDialog from '../components/ConfirmDialog';
import type { CreateTemplateRequest } from '../types/builder';

export default function TemplateListPage() {
  const navigate = useNavigate();
  const { data: templates, isLoading, isError } = useAdminTemplates();
  const createMutation = useCreateTemplate();
  const deactivateMutation = useDeactivateTemplate();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [deactivateTarget, setDeactivateTarget] = useState<number | null>(null);

  const handleEdit = useCallback(
    (id: number) => {
      navigate(`/admin/templates/${id}/builder`);
    },
    [navigate],
  );

  const handleCreate = useCallback(
    (data: CreateTemplateRequest) => {
      createMutation.mutate(data, {
        onSuccess: (created) => {
          setShowCreateModal(false);
          navigate(`/admin/templates/${created.id}/builder`);
        },
      });
    },
    [createMutation, navigate],
  );

  const handleDeactivateConfirm = useCallback(() => {
    if (deactivateTarget === null) return;
    deactivateMutation.mutate(deactivateTarget, {
      onSuccess: () => setDeactivateTarget(null),
    });
  }, [deactivateTarget, deactivateMutation]);

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold leading-tight text-gray-900 dark:text-gray-50">
            양식 관리
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            결재 문서 양식을 관리합니다. 새 양식을 만들거나 기존 양식을 편집할 수 있습니다.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center gap-2 h-11 px-4 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          새 양식 만들기
        </button>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      )}

      {/* Error */}
      {isError && (
        <div className="rounded-lg border border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800 p-4 text-sm text-red-700 dark:text-red-300">
          양식 목록을 불러오는데 실패했습니다. 잠시 후 다시 시도해주세요.
        </div>
      )}

      {/* Empty */}
      {!isLoading && !isError && templates && templates.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400 dark:text-gray-500">
          <FileText className="h-12 w-12 mb-3" />
          <p className="text-lg font-medium mb-1">등록된 양식이 없습니다</p>
          <p className="text-sm">새 양식을 만들어 시작하세요.</p>
        </div>
      )}

      {/* Table */}
      {!isLoading && templates && templates.length > 0 && (
        <TemplateListTable
          templates={templates}
          onEdit={handleEdit}
          onDeactivate={setDeactivateTarget}
        />
      )}

      {/* Create Modal */}
      <TemplateCreateModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreate={handleCreate}
        isPending={createMutation.isPending}
        isError={createMutation.isError}
      />

      {/* Deactivate Confirm */}
      <ConfirmDialog
        open={deactivateTarget !== null}
        onClose={() => setDeactivateTarget(null)}
        onConfirm={handleDeactivateConfirm}
        title="양식 비활성화"
        message="이 양식을 비활성화하면 더 이상 새 문서를 작성할 수 없습니다. 기존 문서는 영향 받지 않습니다."
        confirmLabel="비활성화"
        confirmVariant="danger"
        isLoading={deactivateMutation.isPending}
      />
    </div>
  );
}

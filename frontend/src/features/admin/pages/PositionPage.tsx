import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus } from 'lucide-react';
import PositionTable from '../components/PositionTable';
import PositionFormModal from '../components/PositionFormModal';
import ConfirmDialog from '../components/ConfirmDialog';
import {
  usePositions,
  useReorderPositions,
  useDeactivatePosition,
} from '../hooks/usePositions';
import type { PositionItem } from '../../../types/admin';

export default function PositionPage() {
  const { t } = useTranslation('admin');

  // Data
  const { data: positions = [], isLoading } = usePositions();
  const reorderMutation = useReorderPositions();
  const deactivateMutation = useDeactivatePosition();

  // Modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingPosition, setEditingPosition] = useState<PositionItem | null>(null);
  const [deactivatingPosition, setDeactivatingPosition] = useState<PositionItem | null>(null);

  const handleReorder = (orderedIds: number[]) => {
    reorderMutation.mutate({ orderedIds });
  };

  const handleDeactivate = (position: PositionItem) => {
    setDeactivatingPosition(position);
  };

  const confirmDeactivate = async () => {
    if (!deactivatingPosition) return;
    try {
      await deactivateMutation.mutateAsync(deactivatingPosition.id);
      setDeactivatingPosition(null);
    } catch {
      // Error handled by mutation
    }
  };

  // Determine if deactivation is blocked (has users)
  const isDeactivationBlocked = deactivatingPosition && deactivatingPosition.userCount > 0;

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold leading-tight text-gray-900 dark:text-gray-50">
          {t('positions.title')}
        </h1>
        <button
          type="button"
          onClick={() => setShowCreateModal(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 h-11 flex items-center gap-1 text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          {t('positions.addPosition')}
        </button>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
          <div className="bg-gray-50 dark:bg-gray-800 h-10" />
          {[1, 2, 3].map((i) => (
            <div key={i} className="border-t border-gray-100 dark:border-gray-700 p-4">
              <div className="bg-gray-200 dark:bg-gray-700 rounded animate-pulse h-6 w-1/2" />
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && positions.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            등록된 직급이 없습니다. 직급을 추가해주세요.
          </p>
          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 h-11 flex items-center gap-1 text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            {t('positions.addPosition')}
          </button>
        </div>
      )}

      {/* Position table */}
      {!isLoading && positions.length > 0 && (
        <PositionTable
          positions={positions}
          onEdit={(pos) => setEditingPosition(pos)}
          onDeactivate={handleDeactivate}
          onReorder={handleReorder}
        />
      )}

      {/* Drag hint */}
      {!isLoading && positions.length > 1 && (
        <p className="text-xs text-gray-400 mt-2">
          {t('positions.dragToReorder')}
        </p>
      )}

      {/* Create/Edit Modal */}
      <PositionFormModal
        open={showCreateModal || !!editingPosition}
        onClose={() => {
          setShowCreateModal(false);
          setEditingPosition(null);
        }}
        editingPosition={editingPosition}
      />

      {/* Deactivation blocked (has users) */}
      {isDeactivationBlocked && deactivatingPosition && (
        <ConfirmDialog
          open={true}
          onClose={() => setDeactivatingPosition(null)}
          onConfirm={() => setDeactivatingPosition(null)}
          title="비활성화 불가"
          message={`이 직급에 ${deactivatingPosition.userCount}명의 직원이 소속되어 있습니다. 먼저 직원의 직급을 변경해주세요.`}
          confirmLabel={t('common.confirm')}
          confirmVariant="primary"
          showCancel={false}
        />
      )}

      {/* Deactivation confirm (no users) */}
      {!isDeactivationBlocked && deactivatingPosition && (
        <ConfirmDialog
          open={true}
          onClose={() => setDeactivatingPosition(null)}
          onConfirm={confirmDeactivate}
          title="직급 비활성화"
          message={t('positions.confirmDeactivate', { name: deactivatingPosition.name })}
          confirmLabel={t('common.deactivate')}
          confirmVariant="danger"
          isLoading={deactivateMutation.isPending}
        />
      )}
    </div>
  );
}

import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router';
import { Clock, FileEdit, CheckCircle2, Plus } from 'lucide-react';
import { useDashboardSummary } from '../hooks/useDashboard';
import { useActiveTemplates } from '../../document/hooks/useTemplates';
import CountCard from '../components/CountCard';
import PendingList from '../components/PendingList';
import RecentDocumentsList from '../components/RecentDocumentsList';
import TemplateSelectionModal from '../../document/components/TemplateSelectionModal';
import type { Template } from '../../document/types/document';

export default function DashboardPage() {
  const navigate = useNavigate();
  const { data: summary, isLoading } = useDashboardSummary();
  const { data: templates } = useActiveTemplates();
  const [showTemplateModal, setShowTemplateModal] = useState(false);

  const handleNavigate = useCallback(
    (path: string) => () => navigate(path),
    [navigate],
  );

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold leading-tight text-gray-900 dark:text-gray-50">
          대시보드
        </h1>
        <button
          type="button"
          onClick={() => setShowTemplateModal(true)}
          className="inline-flex items-center gap-2 h-11 px-4 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg"
        >
          <Plus className="w-4 h-4" />
          새 문서
        </button>
      </div>

      {/* Count Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <CountCard
          icon={Clock}
          count={summary?.pendingCount ?? 0}
          label="결재 대기"
          onClick={handleNavigate('/approvals/pending')}
          isLoading={isLoading}
          iconColor="bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
        />
        <CountCard
          icon={FileEdit}
          count={summary?.draftCount ?? 0}
          label="임시저장"
          onClick={handleNavigate('/documents/my?status=DRAFT')}
          isLoading={isLoading}
          iconColor="bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400"
        />
        <CountCard
          icon={CheckCircle2}
          count={summary?.completedCount ?? 0}
          label="처리 완료"
          onClick={handleNavigate('/approvals/completed')}
          isLoading={isLoading}
          iconColor="bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400"
        />
      </div>

      {/* Lists */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <PendingList />
        <RecentDocumentsList />
      </div>

      {/* Template Selection Modal */}
      <TemplateSelectionModal
        isOpen={showTemplateModal}
        onClose={() => setShowTemplateModal(false)}
        templates={templates ?? []}
        onSelect={(template: Template) => {
          setShowTemplateModal(false);
          navigate(`/documents/new/${template.code}`);
        }}
      />
    </div>
  );
}

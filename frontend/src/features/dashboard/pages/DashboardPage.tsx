import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Clock, FileEdit, CheckCircle2, Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useDashboardSummary } from '../hooks/useDashboard';
import CountCard from '../components/CountCard';
import PendingList from '../components/PendingList';
import RecentDocumentsList from '../components/RecentDocumentsList';
import TemplateSelectionModal from '../../document/components/TemplateSelectionModal';

export default function DashboardPage() {
  const navigate = useNavigate();
  const { t } = useTranslation('dashboard');
  const { data: summary, isLoading, isError } = useDashboardSummary();
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);

  const pendingCount = isError ? '-' : (summary?.pendingCount ?? 0);
  const draftCount = isError ? '-' : (summary?.draftCount ?? 0);
  const completedCount = isError ? '-' : (summary?.completedCount ?? 0);

  return (
    <div>
      {/* Header row */}
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-50">
          {t('title')}
        </h1>
        <button
          onClick={() => setIsTemplateModalOpen(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 text-sm font-medium"
        >
          <Plus className="h-4 w-4" />
          {t('newDocument')}
        </button>
      </div>

      {/* Count cards row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <CountCard
          icon={Clock}
          count={typeof pendingCount === 'number' ? pendingCount : 0}
          label={t('pending')}
          onClick={() => navigate('/approvals/pending')}
          isLoading={isLoading}
          iconColor="text-blue-500"
        />
        <CountCard
          icon={FileEdit}
          count={typeof draftCount === 'number' ? draftCount : 0}
          label={t('drafts')}
          onClick={() => navigate('/documents/my?status=DRAFT')}
          isLoading={isLoading}
          iconColor="text-gray-400"
        />
        <CountCard
          icon={CheckCircle2}
          count={typeof completedCount === 'number' ? completedCount : 0}
          label={t('completed')}
          onClick={() => navigate('/approvals/completed')}
          isLoading={isLoading}
          iconColor="text-green-500"
        />
      </div>

      {/* Error silent degradation: show "-" via count values above */}

      {/* Lists row */}
      <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <PendingList />
        <RecentDocumentsList />
      </div>

      {/* Template selection modal */}
      <TemplateSelectionModal
        isOpen={isTemplateModalOpen}
        onClose={() => setIsTemplateModalOpen(false)}
        onSelect={(templateCode) => navigate(`/documents/new/${templateCode}`)}
      />
    </div>
  );
}

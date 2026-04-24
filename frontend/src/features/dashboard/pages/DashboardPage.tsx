import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Clock, Hourglass, CheckCircle2, XCircle, Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useDashboardSummary } from '../hooks/useDashboard';
import CountCard from '../components/CountCard';
import PendingList from '../components/PendingList';
import RecentDocumentsList from '../components/RecentDocumentsList';
import TemplateSelectionModal from '../../document/components/TemplateSelectionModal';
import { useAuthStore } from '../../../stores/authStore';

/**
 * Phase 31 Dashboard - 4 카드 + role-based navigation + props drill.
 *
 * D-A1: 4 카드 좌→우 (결재 대기 / 진행 중 / 승인 완료 / 반려)
 * D-A3: drafts 카드 완전 제거 - 최근 문서 리스트의 status badge 로 자연 노출
 * D-A8: role-based navigation
 *   - USER       → 본인 문서함의 status 필터 라우트
 *   - ADMIN/SUPER_ADMIN → 통합 검색 탭 + status 필터 라우트
 *   - 결재 대기 카드는 role 불문 결재 대기함으로 이동
 * D-B2: 단일 useDashboardSummary 훅 호출 → recentPending/recentDocuments props drill
 * D-C2/C3: skeleton/empty/error 통일 - isLoading/isError props 모든 위젯에 전파
 */
export default function DashboardPage() {
  const navigate = useNavigate();
  const { t } = useTranslation('dashboard');
  const { data: summary, isLoading, isError } = useDashboardSummary();
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);

  const role = useAuthStore((s) => s.user?.role);
  const isAdmin = role === 'ADMIN' || role === 'SUPER_ADMIN';
  const statusPath = (status: string) =>
    isAdmin
      ? `/documents?tab=search&status=${status}`
      : `/documents/my?status=${status}`;

  return (
    <div>
      {/* Header row */}
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-50">
          {t('title')}
        </h1>
        <button
          onClick={() => setIsTemplateModalOpen(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 text-sm font-medium focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:outline-none"
        >
          <Plus className="h-4 w-4" />
          {t('newDocument')}
        </button>
      </div>

      {/* 4 Count cards row — D-A1, D-C3, D-C4 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <CountCard
          icon={Clock}
          count={summary?.pendingCount ?? 0}
          label={t('pending')}
          onClick={() => navigate('/approvals/pending')}
          isLoading={isLoading}
          isError={isError}
          iconColor="text-blue-500 dark:text-blue-400"
        />
        <CountCard
          icon={Hourglass}
          count={summary?.submittedCount ?? 0}
          label={t('submitted')}
          onClick={() => navigate(statusPath('SUBMITTED'))}
          isLoading={isLoading}
          isError={isError}
          iconColor="text-gray-500 dark:text-gray-400"
        />
        <CountCard
          icon={CheckCircle2}
          count={summary?.completedCount ?? 0}
          label={t('completed')}
          onClick={() => navigate(statusPath('APPROVED'))}
          isLoading={isLoading}
          isError={isError}
          iconColor="text-green-500 dark:text-green-400"
        />
        <CountCard
          icon={XCircle}
          count={summary?.rejectedCount ?? 0}
          label={t('rejected')}
          onClick={() => navigate(statusPath('REJECTED'))}
          isLoading={isLoading}
          isError={isError}
          iconColor="text-red-500 dark:text-red-400"
        />
      </div>

      {/* Lists row — D-B2 props drill */}
      <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <PendingList
          data={summary?.recentPending}
          isLoading={isLoading}
          isError={isError}
        />
        <RecentDocumentsList
          data={summary?.recentDocuments}
          isLoading={isLoading}
          isError={isError}
        />
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

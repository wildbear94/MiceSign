import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router';
import DashboardPage from '../DashboardPage';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}));

vi.mock('../../hooks/useDashboard', () => ({
  useDashboardSummary: () => ({
    data: {
      pendingCount: 3,
      draftCount: 1,
      submittedCount: 5,
      completedCount: 10,
      rejectedCount: 2,
      recentPending: [],
      recentDocuments: [],
    },
    isLoading: false,
    isError: false,
  }),
}));

vi.mock('../../../../stores/authStore', () => ({
  useAuthStore: (
    selector: (state: { user: { role: string; departmentId: number } | null }) => unknown,
  ) => selector({ user: { role: 'USER', departmentId: 1 } }),
}));

vi.mock('../../../document/components/TemplateSelectionModal', () => ({
  default: () => null,
}));

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('DashboardPage — Phase 31 4 카운트 카드 smoke', () => {
  it('4 카운트 카드 모두 렌더 (pending=3, submitted=5, completed=10, rejected=2)', () => {
    renderPage();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('10')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('drafts 카드가 노출되지 않는다 (D-A3)', () => {
    renderPage();
    // useTranslation('dashboard') + 모의 t = (k)=>k 이므로 라벨로 'drafts' 가 렌더되지 않음
    expect(screen.queryByText('drafts')).not.toBeInTheDocument();
  });

  it('i18n 라벨이 pending/submitted/completed/rejected 로 표시', () => {
    renderPage();
    expect(screen.getByText('pending')).toBeInTheDocument();
    expect(screen.getByText('submitted')).toBeInTheDocument();
    expect(screen.getByText('completed')).toBeInTheDocument();
    expect(screen.getByText('rejected')).toBeInTheDocument();
  });
});

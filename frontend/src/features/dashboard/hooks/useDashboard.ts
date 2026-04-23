import { useQuery } from '@tanstack/react-query';
import { dashboardApi } from '../api/dashboardApi';

/**
 * Phase 31 D-B1/B2/B4/B7 — 대시보드 단일 훅.
 *
 * - queryKey ['dashboard','summary'] (prefix match 로 mutation invalidate 대상)
 * - placeholderData 이전 데이터 유지하여 invalidate/refetch 직후 skeleton 플래시 방지
 * - refetchInterval 60s safety net (다른 탭/외부 변경 반영 fallback)
 *
 * 이전에 분리돼 있던 pending preview, recent preview 훅 2개는 제거됐다 —
 * 단일 /dashboard/summary endpoint 가 recentPending 과 recentDocuments 를
 * 함께 반환하므로 3위젯을 1훅으로 통합한다 (D-B2).
 */
export function useDashboardSummary() {
  return useQuery({
    queryKey: ['dashboard', 'summary'],
    queryFn: () => dashboardApi.getSummary().then((res) => res.data.data!),
    refetchInterval: 60_000,
    placeholderData: (previousData) => previousData,
  });
}

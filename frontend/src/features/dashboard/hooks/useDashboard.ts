import { useQuery } from '@tanstack/react-query';
import { dashboardApi } from '../api/dashboardApi';
import { approvalApi } from '../../approval/api/approvalApi';
import apiClient from '../../../api/client';
import type { ApiResponse, PageResponse } from '../../../types/api';
import type { DocumentResponse } from '../../document/types/document';

export function useDashboardSummary() {
  return useQuery({
    queryKey: ['dashboard', 'summary'],
    queryFn: () => dashboardApi.getSummary().then(res => res.data.data!),
    refetchInterval: 60_000,
  });
}

export function usePendingPreview() {
  return useQuery({
    queryKey: ['approvals', 'pending', 0, 5],
    queryFn: () => approvalApi.getPending({ page: 0, size: 5 }).then(res => res.data.data!),
    refetchInterval: 60_000,
  });
}

export function useRecentDocuments() {
  return useQuery({
    queryKey: ['documents', 'my', 0, 5],
    queryFn: () =>
      apiClient
        .get<ApiResponse<PageResponse<DocumentResponse>>>('/documents/my', {
          params: { page: 0, size: 5 },
        })
        .then(res => res.data.data!),
    refetchInterval: 60_000,
  });
}

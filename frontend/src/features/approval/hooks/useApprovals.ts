import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { approvalApi } from '../api/approvalApi';

export function usePendingApprovals(page = 0, size = 20) {
  return useQuery({
    queryKey: ['approvals', 'pending', page, size],
    queryFn: () => approvalApi.getPending({ page, size }).then(res => res.data.data!),
  });
}

export function useCompletedDocuments(page = 0, size = 20) {
  return useQuery({
    queryKey: ['approvals', 'completed', page, size],
    queryFn: () => approvalApi.getCompleted({ page, size }).then(res => res.data.data!),
  });
}

export function useApprove() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ lineId, comment }: { lineId: number; comment?: string }) =>
      approvalApi.approve(lineId, comment ? { comment } : undefined),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['approvals'] });
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });  // Phase 31 D-B3
    },
  });
}

export function useReject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ lineId, comment }: { lineId: number; comment: string }) =>
      approvalApi.reject(lineId, { comment }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['approvals'] });
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });  // Phase 31 D-B3
    },
  });
}

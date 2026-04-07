import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { approvalApi } from '../api/approvalApi';
import type { ApprovalActionRequest } from '../../document/types/document';

export function usePendingApprovals(page = 0, size = 20) {
  return useQuery({
    queryKey: ['approvals', 'pending', page, size],
    queryFn: () => approvalApi.getPending(page, size),
    placeholderData: keepPreviousData,
  });
}

export function useCompletedApprovals(page = 0, size = 20) {
  return useQuery({
    queryKey: ['approvals', 'completed', page, size],
    queryFn: () => approvalApi.getCompleted(page, size),
    placeholderData: keepPreviousData,
  });
}

export function useApprove() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ lineId, req }: { lineId: number; req?: ApprovalActionRequest }) =>
      approvalApi.approve(lineId, req),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['approvals'] });
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useReject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ lineId, req }: { lineId: number; req: ApprovalActionRequest }) =>
      approvalApi.reject(lineId, req),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['approvals'] });
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { registrationApi } from '../api/registrationApi';
import type {
  RegistrationFilterParams,
  ApproveRegistrationRequest,
  RejectRegistrationRequest,
} from '../../../types/admin';

export function useRegistrationList(params: RegistrationFilterParams) {
  return useQuery({
    queryKey: ['registrations', params],
    queryFn: () => registrationApi.getList(params).then((res) => res.data.data!),
    placeholderData: (previousData) => previousData,
  });
}

export function usePendingRegistrationCount() {
  return useQuery({
    queryKey: ['registrations', 'pendingCount'],
    queryFn: () =>
      registrationApi
        .getList({ status: 'PENDING', size: 1 })
        .then((res) => res.data.data!.totalElements),
    staleTime: 30_000,
  });
}

export function useApproveRegistration() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: ApproveRegistrationRequest }) =>
      registrationApi.approve(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['registrations'] });
    },
  });
}

export function useRejectRegistration() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: RejectRegistrationRequest }) =>
      registrationApi.reject(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['registrations'] });
    },
  });
}

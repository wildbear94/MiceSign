import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { departmentApi } from '../api/departmentApi';
import type { CreateDepartmentRequest, UpdateDepartmentRequest } from '../../../types/admin';

export function useDepartmentTree(includeInactive = false) {
  return useQuery({
    queryKey: ['departments', { includeInactive }],
    queryFn: () => departmentApi.getTree(includeInactive).then((res) => res.data.data!),
    staleTime: 5 * 60 * 1000,
  });
}

export function useDepartmentMembers(departmentId: number | null) {
  return useQuery({
    queryKey: ['departments', departmentId, 'members'],
    queryFn: () => departmentApi.getMembers(departmentId!).then((res) => res.data.data!),
    enabled: !!departmentId,
  });
}

export function useCreateDepartment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateDepartmentRequest) =>
      departmentApi.create(data).then((res) => res.data.data!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments'] });
    },
  });
}

export function useUpdateDepartment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateDepartmentRequest }) =>
      departmentApi.update(id, data).then((res) => res.data.data!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments'] });
    },
  });
}

export function useDeactivateDepartment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => departmentApi.deactivate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments'] });
    },
  });
}

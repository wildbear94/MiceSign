import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { userApi } from '../api/userApi';
import type {
  CreateUserRequest,
  UpdateUserRequest,
  UserFilterParams,
} from '../../../types/admin';

export function useUserList(params: UserFilterParams) {
  return useQuery({
    queryKey: ['users', params],
    queryFn: () => userApi.getList(params).then((res) => res.data.data!),
    placeholderData: (previousData) => previousData,
  });
}

export function useUserDetail(id: number) {
  return useQuery({
    queryKey: ['users', id],
    queryFn: () => userApi.getById(id).then((res) => res.data.data!),
    enabled: id > 0,
  });
}

export function useCreateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateUserRequest) =>
      userApi.create(data).then((res) => res.data.data!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}

export function useUpdateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateUserRequest }) =>
      userApi.update(id, data).then((res) => res.data.data!),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['users', variables.id] });
    },
  });
}

export function useDeactivateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => userApi.deactivate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}

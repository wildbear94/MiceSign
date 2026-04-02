import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { positionApi } from '../api/positionApi';
import type {
  CreatePositionRequest,
  UpdatePositionRequest,
  ReorderPositionsRequest,
} from '../../../types/admin';

export function usePositions() {
  return useQuery({
    queryKey: ['positions'],
    queryFn: () => positionApi.getAll().then((res) => res.data.data!),
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreatePosition() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreatePositionRequest) =>
      positionApi.create(data).then((res) => res.data.data!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['positions'] });
    },
  });
}

export function useUpdatePosition() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdatePositionRequest }) =>
      positionApi.update(id, data).then((res) => res.data.data!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['positions'] });
    },
  });
}

export function useReorderPositions() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: ReorderPositionsRequest) => positionApi.reorder(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['positions'] });
    },
  });
}

export function useDeactivatePosition() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => positionApi.deactivate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['positions'] });
    },
  });
}

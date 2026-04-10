import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { templateApi } from '../api/templateApi';
import type { CreateTemplateData, UpdateTemplateData } from '../api/templateApi';

export function useTemplateList() {
  return useQuery({
    queryKey: ['admin', 'templates'],
    queryFn: () => templateApi.getList().then(res => res.data.data!),
  });
}

export function useTemplateDetail(id: number | null) {
  return useQuery({
    queryKey: ['admin', 'templates', id],
    queryFn: () => templateApi.getDetail(id!).then(res => res.data.data!),
    enabled: id !== null,
  });
}

export function useCreateTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateTemplateData) => templateApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'templates'] });
    },
  });
}

export function useUpdateTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateTemplateData }) =>
      templateApi.updateTemplate(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'templates'] });
    },
  });
}

export function useToggleTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, activate }: { id: number; activate: boolean }) =>
      activate
        ? templateApi.update(id, { isActive: true })
        : templateApi.deactivate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'templates'] });
    },
  });
}

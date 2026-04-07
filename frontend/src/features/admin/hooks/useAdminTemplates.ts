import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminTemplateApi } from '../api/adminTemplateApi';
import type { CreateTemplateRequest, UpdateTemplateRequest } from '../types/builder';

export function useAdminTemplates() {
  return useQuery({
    queryKey: ['admin', 'templates'],
    queryFn: () => adminTemplateApi.list(),
  });
}

export function useAdminTemplate(id: number | null) {
  return useQuery({
    queryKey: ['admin', 'templates', id],
    queryFn: () => adminTemplateApi.getById(id!),
    enabled: id !== null,
  });
}

export function useCreateTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (req: CreateTemplateRequest) => adminTemplateApi.create(req),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'templates'] });
      queryClient.invalidateQueries({ queryKey: ['templates'] });
    },
  });
}

export function useUpdateTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, req }: { id: number; req: UpdateTemplateRequest }) =>
      adminTemplateApi.update(id, req),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'templates'] });
      queryClient.invalidateQueries({ queryKey: ['templates'] });
    },
  });
}

export function useDeactivateTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => adminTemplateApi.deactivate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'templates'] });
      queryClient.invalidateQueries({ queryKey: ['templates'] });
    },
  });
}

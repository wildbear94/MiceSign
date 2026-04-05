import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminTemplateApi } from '../api/adminTemplateApi';
import type { CreateTemplateRequest, UpdateTemplateRequest } from '../types/builder';

export function useAdminTemplates() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['admin', 'templates'],
    queryFn: () => adminTemplateApi.getTemplates().then((res) => res.data.data!),
  });

  return { templates: data, isLoading, error, refetch };
}

export function useAdminTemplate(id: number) {
  return useQuery({
    queryKey: ['admin', 'templates', id],
    queryFn: () => adminTemplateApi.getTemplate(id).then((res) => res.data.data!),
    enabled: !!id,
  });
}

export function useCreateTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateTemplateRequest) =>
      adminTemplateApi.createTemplate(data).then((res) => res.data.data!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'templates'] });
    },
  });
}

export function useUpdateTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateTemplateRequest }) =>
      adminTemplateApi.updateTemplate(id, data).then((res) => res.data.data!),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'templates'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'templates', variables.id] });
    },
  });
}

export function useDeactivateTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => adminTemplateApi.deactivateTemplate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'templates'] });
    },
  });
}

export function useOptionSets() {
  return useQuery({
    queryKey: ['admin', 'option-sets'],
    queryFn: () => adminTemplateApi.getOptionSets().then((res) => res.data.data!),
  });
}

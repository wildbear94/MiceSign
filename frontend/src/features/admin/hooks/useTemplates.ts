import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { templateApi } from '../api/templateApi';

export function useTemplateList() {
  return useQuery({
    queryKey: ['admin', 'templates'],
    queryFn: () => templateApi.getList().then(res => res.data.data!),
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

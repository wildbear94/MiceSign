import { useQuery } from '@tanstack/react-query';
import { templateApi } from '../api/templateApi';

export function useActiveTemplates() {
  return useQuery({
    queryKey: ['templates'],
    queryFn: () => templateApi.listActive(),
    staleTime: 5 * 60 * 1000,
  });
}

export function useTemplateByCode(code: string | null) {
  return useQuery({
    queryKey: ['templates', code],
    queryFn: () => templateApi.getByCode(code!),
    enabled: !!code,
    staleTime: 5 * 60 * 1000,
  });
}

export function useTemplateSchema(code: string | null, version?: number) {
  return useQuery({
    queryKey: ['templates', code, 'schema', version],
    queryFn: () => templateApi.getSchema(code!, version),
    enabled: !!code,
    staleTime: 5 * 60 * 1000,
  });
}

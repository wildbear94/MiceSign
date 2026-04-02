import { useQuery } from '@tanstack/react-query';
import { templateApi } from '../api/templateApi';

export function useTemplates() {
  return useQuery({
    queryKey: ['templates'],
    queryFn: () => templateApi.getActiveTemplates().then((res) => res.data.data!),
    staleTime: 5 * 60 * 1000,
  });
}

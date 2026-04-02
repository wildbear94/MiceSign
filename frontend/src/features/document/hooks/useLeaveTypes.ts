import { useQuery } from '@tanstack/react-query';
import { leaveTypeApi } from '../api/leaveTypeApi';

export function useLeaveTypes() {
  return useQuery({
    queryKey: ['leave-types'],
    queryFn: () => leaveTypeApi.getActiveTypes().then((res) => res.data.data!),
    staleTime: 5 * 60 * 1000,
  });
}

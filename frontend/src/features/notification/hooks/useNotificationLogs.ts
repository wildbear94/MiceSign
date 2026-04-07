import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { notificationApi } from '../api/notificationApi';
import type { NotificationLogSearchParams } from '../types/notification';

export function useNotificationLogs(params: NotificationLogSearchParams = {}) {
  return useQuery({
    queryKey: ['notifications', params],
    queryFn: () => notificationApi.search(params),
    placeholderData: keepPreviousData,
  });
}

export function useResendNotification() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => notificationApi.resend(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

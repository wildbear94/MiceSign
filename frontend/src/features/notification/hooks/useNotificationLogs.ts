import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notificationApi } from '../api/notificationApi';
import type { NotificationLogFilter } from '../types/notification';

export function useNotificationLogs(filter: NotificationLogFilter, page = 0, size = 20) {
  return useQuery({
    queryKey: ['notification-logs', filter, page, size],
    queryFn: () => notificationApi.getLogs(filter, page, size).then((res) => res.data.data!),
  });
}

export function useResendNotification() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => notificationApi.resend(id).then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-logs'] });
    },
  });
}

import apiClient from '../../../api/client';
import type { ApiResponse, PageResponse } from '../../../types/api';
import type { NotificationLogEntry, NotificationLogSearchParams } from '../types/notification';

export const notificationApi = {
  search: (params: NotificationLogSearchParams) =>
    apiClient.get<ApiResponse<PageResponse<NotificationLogEntry>>>('/admin/notifications', { params }).then(r => r.data.data!),

  resend: (id: number) =>
    apiClient.post(`/admin/notifications/${id}/resend`),
};

import apiClient from '../../../api/client';
import type { ApiResponse, PageResponse } from '../../../types/api';
import type { NotificationLogResponse, NotificationLogFilter } from '../types/notification';

export const notificationApi = {
  getLogs: (filter: NotificationLogFilter, page = 0, size = 20) =>
    apiClient.get<ApiResponse<PageResponse<NotificationLogResponse>>>('/admin/notifications', {
      params: { ...filter, page, size },
    }),
  resend: (id: number) =>
    apiClient.post<ApiResponse<void>>(`/admin/notifications/${id}/resend`),
};

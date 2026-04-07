import apiClient from '../../../api/client';
import type { ApiResponse } from '../../../types/api';
import type { DashboardSummary } from '../types/dashboard';

export const dashboardApi = {
  getSummary: () =>
    apiClient.get<ApiResponse<DashboardSummary>>('/dashboard'),
};

import apiClient from '../../../api/client';
import type { ApiResponse } from '../../../types/api';
import type { LeaveTypeResponse } from '../types/document';

export const leaveTypeApi = {
  getActiveTypes: () =>
    apiClient.get<ApiResponse<LeaveTypeResponse[]>>('/leave-types'),
};

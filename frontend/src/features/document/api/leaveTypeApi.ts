import apiClient from '../../../api/client';
import type { ApiResponse } from '../../../types/api';

export interface LeaveType {
  id: number;
  code: string;
  name: string;
  isHalfDay: boolean;
}

export const leaveTypeApi = {
  list: () =>
    apiClient.get<ApiResponse<LeaveType[]>>('/leave-types').then(r => r.data.data!),
};

import apiClient from '../../../api/client';
import type { ApiResponse } from '../../../types/api';

export interface UserSearchItem {
  id: number;
  name: string;
  departmentName: string | null;
}

const BASE = '/users';

export const userSearchApi = {
  search: (q: string, size: number = 20) =>
    apiClient.get<ApiResponse<UserSearchItem[]>>(`${BASE}/search`, {
      params: { q, size },
    }),
};

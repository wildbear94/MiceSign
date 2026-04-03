import axios from 'axios';
import type { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '../stores/authStore';
import type { ApiResponse, ErrorDetail } from '../types/api';
import type { RefreshResponse } from '../types/auth';

const apiClient = axios.create({
  baseURL: '/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// Decode JWT exp claim (base64 decode middle segment)
function getTokenExpiry(token: string): number | null {
  try {
    const payload = token.split('.')[1];
    if (!payload) return null;
    const decoded = JSON.parse(atob(payload));
    return decoded.exp ?? null;
  } catch {
    return null;
  }
}

// Queue pattern for concurrent 401 handling
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value: InternalAxiosRequestConfig) => void;
  reject: (reason: unknown) => void;
  config: InternalAxiosRequestConfig;
}> = [];

function processQueue(error: unknown, token: string | null = null): void {
  failedQueue.forEach(({ resolve, reject, config }) => {
    if (error) {
      reject(error);
    } else if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      resolve(config);
    }
  });
  failedQueue = [];
}

// Request interceptor: attach JWT and proactive refresh
apiClient.interceptors.request.use(
  async (config) => {
    // Let browser set correct Content-Type with boundary for FormData
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type'];
    }

    const { accessToken } = useAuthStore.getState();

    if (accessToken) {
      // Proactive refresh: if token expires within 5 minutes, refresh in background
      const exp = getTokenExpiry(accessToken);
      const now = Math.floor(Date.now() / 1000);
      if (exp && exp - now < 5 * 60 && !isRefreshing) {
        // Fire-and-forget background refresh
        isRefreshing = true;
        apiClient
          .post<ApiResponse<RefreshResponse>>('/auth/refresh')
          .then((res) => {
            if (res.data.success && res.data.data) {
              useAuthStore.getState().setAuth(res.data.data.accessToken, res.data.data.user);
            }
          })
          .catch(() => {
            // Proactive refresh failure is non-blocking; will be handled by 401 interceptor
          })
          .finally(() => {
            isRefreshing = false;
          });
      }

      config.headers.Authorization = `Bearer ${accessToken}`;
    }

    return config;
  },
  (error) => Promise.reject(error),
);

// Response interceptor: 401 queue pattern for token refresh
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<ApiResponse<null>>) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (!originalRequest) {
      return Promise.reject(error);
    }

    // Only handle 401 errors, not already retried, and not the refresh endpoint itself
    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !originalRequest.url?.includes('/auth/refresh')
    ) {
      if (isRefreshing) {
        // Queue the request while refresh is in progress
        return new Promise<InternalAxiosRequestConfig>((resolve, reject) => {
          failedQueue.push({ resolve, reject, config: originalRequest });
        }).then((config) => apiClient(config));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const response = await apiClient.post<ApiResponse<RefreshResponse>>('/auth/refresh');

        if (response.data.success && response.data.data) {
          const { accessToken, user } = response.data.data;
          useAuthStore.getState().setAuth(accessToken, user);
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          processQueue(null, accessToken);
          return apiClient(originalRequest);
        } else {
          throw new Error('Refresh failed');
        }
      } catch (refreshError) {
        processQueue(refreshError, null);
        useAuthStore.getState().clearAuth();
        // Redirect to login silently per D-16
        window.location.href = '/login';
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  },
);

export default apiClient;

// Re-export for type usage
export type { ErrorDetail };

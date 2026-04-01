import { useCallback } from 'react';
import { useNavigate } from 'react-router';
import apiClient from '../../../api/client';
import { useAuthStore } from '../../../stores/authStore';
import type { ApiResponse } from '../../../types/api';
import type { LoginRequest, LoginResponse, RefreshResponse, AuthErrorData } from '../../../types/auth';

export interface AuthError {
  type: 'credentials' | 'locked' | 'network';
  remainingAttempts?: number;
  lockedUntil?: string;
  message?: string;
}

function parseAuthError(error: unknown): AuthError {
  if (typeof error === 'object' && error !== null && 'response' in error) {
    const axiosError = error as { response?: { data?: ApiResponse<AuthErrorData>; status?: number } };
    const data = axiosError.response?.data;

    if (data && !data.success && data.error) {
      const errorCode = data.error.code;
      // Extract additional data from the error response
      // The backend returns remainingAttempts and lockedUntil in the data field
      const errorData = data.data as AuthErrorData | null;

      if (errorCode === 'AUTH_ACCOUNT_LOCKED') {
        return {
          type: 'locked',
          lockedUntil: errorData?.lockedUntil,
          message: data.error.message,
        };
      }

      if (errorCode === 'AUTH_INVALID_CREDENTIALS') {
        return {
          type: 'credentials',
          remainingAttempts: errorData?.remainingAttempts,
          message: data.error.message,
        };
      }
    }
  }

  return { type: 'network' };
}

export function useLogin() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);

  const login = useCallback(
    async (request: LoginRequest): Promise<AuthError | null> => {
      try {
        const response = await apiClient.post<ApiResponse<LoginResponse>>(
          '/auth/login',
          request,
        );

        if (response.data.success && response.data.data) {
          const { accessToken, user } = response.data.data;
          setAuth(accessToken, user);
          navigate('/', { replace: true });
          return null;
        }

        return { type: 'network' };
      } catch (error: unknown) {
        return parseAuthError(error);
      }
    },
    [navigate, setAuth],
  );

  return { login };
}

export function useLogout() {
  const navigate = useNavigate();
  const clearAuth = useAuthStore((s) => s.clearAuth);

  const logout = useCallback(async () => {
    try {
      await apiClient.post('/auth/logout');
    } catch {
      // Ignore logout errors — clear client state regardless
    } finally {
      clearAuth();
      navigate('/login', { replace: true });
    }
  }, [navigate, clearAuth]);

  return { logout };
}

export function useInitAuth() {
  const setAuth = useAuthStore((s) => s.setAuth);
  const clearAuth = useAuthStore((s) => s.clearAuth);

  const initAuth = useCallback(async () => {
    try {
      const response = await apiClient.post<ApiResponse<RefreshResponse>>('/auth/refresh');
      if (response.data.success && response.data.data) {
        setAuth(response.data.data.accessToken, response.data.data.user);
      } else {
        clearAuth();
      }
    } catch {
      // Silent failure per D-16
      clearAuth();
    }
  }, [setAuth, clearAuth]);

  return { initAuth };
}

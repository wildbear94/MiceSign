import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router';
import { AxiosError } from 'axios';
import apiClient from '../../../api/client';
import { useAuthStore } from '../../../stores/authStore';
import type { ApiResponse } from '../../../types/api';

interface PasswordChangeRequest {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

interface UsePasswordChangeReturn {
  changePassword: (data: PasswordChangeRequest) => Promise<string | null>;
  isLoading: boolean;
  isSuccess: boolean;
}

export function usePasswordChange(): UsePasswordChangeReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const setAuth = useAuthStore((state) => state.setAuth);
  const accessToken = useAuthStore((state) => state.accessToken);

  const changePassword = useCallback(
    async (data: PasswordChangeRequest): Promise<string | null> => {
      setIsLoading(true);

      try {
        await apiClient.put<ApiResponse<null>>('/auth/password', data);

        // Update mustChangePassword in auth store
        if (user && accessToken) {
          setAuth(accessToken, { ...user, mustChangePassword: false });
        }

        setIsSuccess(true);

        // D-35: redirect to dashboard after 1.5s
        setTimeout(() => {
          navigate('/', { replace: true });
        }, 1500);

        return null;
      } catch (error) {
        const axiosError = error as AxiosError<ApiResponse<null>>;
        const errorCode = axiosError.response?.data?.error?.code;

        if (errorCode === 'AUTH_WRONG_PASSWORD') {
          return 'passwordChange.wrongCurrent';
        }
        if (errorCode === 'AUTH_WEAK_PASSWORD') {
          return 'passwordChange.ruleNotMet';
        }

        // Generic error fallback
        return 'passwordChange.ruleNotMet';
      } finally {
        setIsLoading(false);
      }
    },
    [navigate, user, accessToken, setAuth],
  );

  return { changePassword, isLoading, isSuccess };
}
